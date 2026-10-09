"""Agrega el modelo SK-575 de referencia (cad/sk575/modelo.py) a la CAPA CAD del visor V2 (src/data/cad/capa-cad.json).

Uso (entorno build123d):  python cad/sk575/capa.py
Conserva los ítems existentes (los genera cad/capa.py) y reemplaza solo los `sk575_*`. Marco V2 = glTF de exportar.py:
CAD (x, y, z) → (x − WXP, z, −y): origen en la boca de pozo, carrier hacia −X, Y arriba. Todo confianza C, no as-built.

Presupuesto: teselado grueso; las piezas esbeltas (barras de celosía, caños, barandas) se dibujan como su eje (una línea)
en vez de malla; las medianas, como su caja orientada; se omiten piezas chicas (bulones, tuercas, detalles) y los materiales cable/luz/vidrio.
"""
import json
import pathlib
import runpy
import sys

import numpy as np
import trimesh

AQUI = pathlib.Path(__file__).resolve().parent
ROOT = AQUI.parents[1]
DEST = ROOT / "src" / "data" / "cad" / "capa-cad.json"
sys.path.insert(0, str(AQUI))
from exportar import INFO  # noqa: E402  (alcance y confianza por componente: una sola fuente)

TOL, ANG = 0.05, 0.7
OMITIR_MAT = {"cable", "luz", "vidrio"}
OMITIR_COMP = {"sk575_vientos", "sk575_tiros"}  # vientos = cables; tiros = ilustrativo y denso
MIN_PIEZA = 0.25  # m: diagonal de caja por debajo de esto no se dibuja
CAJA = 1.0  # m: piezas medianas (diagonal < CAJA) van como su caja orientada (12 triángulos)
ESBELTA = 0.16  # m: si las dos dimensiones menores de la caja orientada son < esto, va como línea
COLOR = {
    "sk575_mastil": "#c8c2ae", "sk575_carrier": "#e0504f", "sk575_cuadro": "#d98c3a", "sk575_izaje": "#b07ad6",
    "sk575_aparejo": "#e6d34a", "sk575_bop": "#3fb37f", "sk575_llave": "#6fc2d0", "sk575_piso": "#f2b632",
    "sk575_planchada": "#8f9bb3", "sk575_pozo_vecino": "#7aa860", "sk575_piletas": "#9aa1a8",
    "sk575_manifold": "#4f8fe0", "sk575_bomba": "#d36b6b", "sk575_acumulador": "#3e7896",
}
FUENTE = ("modelo de referencia cad/sk575 (no as-built): spec sheet SK-575, placa API DKA104-330-08, plano TACKER "
          "8123-1002-2611, planos piso 8114-1006-02xx, plano HYCO 50162-813, LAYOUT-WS10-0001; detalle en "
          "docs/pdf-review/informe-sk575-2026-10-09.md")


def _r(a):
    return [round(float(v), 3) for v in np.asarray(a).ravel()]


def componente(cid, mats, wxp):
    V, F, lineas = [], [], []
    for mat, shapes in mats.items():
        if mat in OMITIR_MAT:
            continue
        for sh in shapes:
            for so in sh.solids() if hasattr(sh, "solids") else [sh]:
                vs, ts = so.tessellate(TOL, ANG)
                if not ts:
                    continue
                v = np.array([(p.X - wxp, p.Z, -p.Y) for p in vs])
                m = trimesh.Trimesh(v, np.array(ts), process=False)
                if np.linalg.norm(m.extents) < MIN_PIEZA:
                    continue
                caja = m.bounding_box_oriented
                obb = caja.primitive
                ext = np.sort(obb.extents)
                if ext[1] < ESBELTA and ext[2] > 3 * ext[1]:
                    k = int(np.argmax(obb.extents))
                    eje = obb.transform[:3, k] * obb.extents[k] / 2
                    c = obb.transform[:3, 3]
                    lineas += _r(c - eje) + _r(c + eje)
                    continue
                if np.linalg.norm(obb.extents) < CAJA and len(ts) > 12:
                    v, ts = caja.vertices, caja.faces
                base = len(V)
                V += np.asarray(v).tolist()
                F += (np.asarray(ts) + base).tolist()
    item = dict(id=cid, nombre="SK-575 · " + INFO[cid][1], ancla="mundo", color=COLOR[cid], fuente=FUENTE,
                estado="REFERENCIA (confianza %s, no as-built)" % INFO[cid][0], grupo="sk575")
    if F:
        m = trimesh.Trimesh(np.round(np.array(V), 3), np.array(F), process=True)  # une vértices repetidos
        item["tris"] = [dict(p=_r(m.vertices), i=m.faces.ravel().tolist(), color=COLOR[cid], nombre=cid)]
    if lineas:
        item["lineas"] = [dict(color=COLOR[cid], p=lineas)]
    return item


def main():
    g = runpy.run_path(str(AQUI / "modelo.py"), run_name="sk575_modelo")
    por_comp = {}
    for (cid, mat), shapes in g["parts"].items():
        por_comp.setdefault(cid, {})[mat] = shapes
    data = json.loads(DEST.read_text(encoding="utf-8"))
    data["items"] = [i for i in data["items"] if not i["id"].startswith("sk575_")]
    for cid in INFO:
        if cid in OMITIR_COMP or cid not in por_comp:
            continue
        it = componente(cid, por_comp[cid], g["WXP"])
        data["items"].append(it)
        nt = sum(len(t["i"]) // 3 for t in it.get("tris", []))
        nl = sum(len(l["p"]) // 6 for l in it.get("lineas", []))
        print("%-20s %7d tris %6d líneas" % (cid, nt, nl))
    DEST.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print("capa-cad.json:", DEST.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
