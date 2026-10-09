"""Exporta el modelo SK-575 (cad/sk575/modelo.py, build123d) a un GLB por componente en assets/source/.

Uso (entorno build123d, ver cad/sk575/README.md):
    python cad/sk575/exportar.py            # todos los componentes
    python cad/sk575/exportar.py sk575_bop  # uno solo

Contrato gltf-pipeline: nodo raíz = Component.id, mallas `<id>_<rol>` (una por material: menos draw calls), materiales
`<id>_<rol>`, metros, Y arriba, origen = boca de pozo a nivel de terreno. CAD (x, y, z) → glTF (x − WXP, z, −y).
"""
import json
import pathlib
import runpy
import sys
from collections import defaultdict

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

AQUI = pathlib.Path(__file__).resolve().parent
ROOT = AQUI.parents[1]
OUT = ROOT / "assets" / "source"

# color, metalness, roughness, emisivo (mismos valores que el visor CAD de referencia)
MATS = {
    "acero": ("#9ea3aa", 1.0, 0.26), "acero_oscuro": ("#5f646b", 1.0, 0.38), "aluminio": ("#c4c8cc", 1.0, 0.3),
    "rojo": ("#b3261e", 0.3, 0.45), "amarillo": ("#e0a400", 0.3, 0.45), "blanco": ("#f2f2f2", 0.0, 0.5),
    "azul": ("#2f7f95", 0.4, 0.4), "grating": ("#8d9196", 0.8, 0.55), "cable": ("#3a3d42", 1.0, 0.5),
    "goma": ("#1d1d1d", 0.0, 0.9), "vidrio": ("#1b2630", 0.2, 0.05), "hormigon": ("#8a8780", 0.0, 0.9),
    "luz": ("#ffd9a0", 0.0, 0.4, True),
}
# Tolerancias de teselado: piezas finas (cables, barandas) más gruesas para no inflar triángulos.
TOL = {"cable": (0.02, 0.6), "goma": (0.01, 0.4)}
TOL_DEF = (0.006, 0.3)

# Qué representa cada componente y con qué confianza de geometría (A/B/C). Detalle de cotas y fuentes en el informe.
INFO = {
    "sk575_mastil": ("C", "Mástil SK 104-330 inclinado 3,5°, corona en voladizo, piso de enganche a 68'"),
    "sk575_carrier": ("C", "Carrier SK-575: bastidor 40 ft, 5 ejes, cabina, motor, tanques, gatos y T-sill"),
    "sk575_cuadro": ("C", "Cuadro de maniobras DWA575-01: tambores 42×12 y 42×8, discos, embragues, consola"),
    "sk575_izaje": ("B", "Cilindros de izaje HYCO 50162-813-13150 (3 etapas, 60\" → 191,5\")"),
    "sk575_aparejo": ("C", "Aparejo-gancho, 8 líneas, amelas 150 t y elevador de cierre central"),
    "sk575_bop": ("C", "Stack BOP (carretel + doble ram + anular) con válvulas KL/CL; diámetro en conflicto"),
    "sk575_llave": ("C", "Llave hidráulica de tubing colgada"),
    "sk575_piso": ("B", "Piso pulling 2600 × 3304 a 3606 mm, subestructura, escaleras a 45°"),
    "sk575_planchada": ("C", "Planchada 12 m, rampa de la V, caballetes y línea de alta presión"),
    "sk575_tiros": ("C", "Tiros dobles de tubing en estiba (ilustrativo)"),
    "sk575_vientos": ("C", "Vientos, anclajes y pirosalva (posiciones del layout de locación)"),
    "sk575_pozo_vecino": ("C", "Árbol de navidad de pozo vecino (ilustrativo)"),
    "sk575_piletas": ("C", "Piletas de circulación, preparación y ensayo + trip tank"),
    "sk575_manifold": ("C", "Manifold de ahogo M1–M12 y líneas de choke/ahogo"),
    "sk575_bomba": ("C", "Bomba triplex sobre patín"),
    "sk575_acumulador": ("C", "Acumulador del BOP"),
}


def _hex(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def cargar():
    return runpy.run_path(str(AQUI / "modelo.py"), run_name="sk575_modelo")


def spec_sk575():
    """Cotas documentadas (fuente única: reference/v2-previo/src/technical-spec.js → TACKER_10.sk575)."""
    import subprocess
    js = (ROOT / "reference" / "v2-previo" / "src" / "technical-spec.js").as_uri()
    out = subprocess.check_output(["node", "-e", "import(%s).then(m=>console.log(JSON.stringify(m.TACKER_10)))" % json.dumps(js)], text=True)
    return json.loads(out)


def verificar(g, spec):
    """Las constantes del modelo deben coincidir con las cotas documentadas; si no, el export falla (exit 1)."""
    s, IN = spec["sk575"], 0.0254
    checks = [
        ("altura del mástil (folleto, 104 ft)", g["H"], spec["mast"]["heightM"], 0.01),
        ("inclinación del mástil (placa API)", g["LEAN"], s["mast"]["leanDeg"], 1e-9),
        ("base del mástil 4'-0\"", g["ZB"], s["mast"]["baseHeightM"], 0.001),
        ("piso de enganche 68'", g["ZM"], s["mast"]["rackingBoardM"], 0.002),
        ("pozo a 76\" del pie delantero", g["WXP"] - (g["MX"] + 0.87), s["mast"]["wellFromFrontLegM"], 1e-6),
        ("altura del piso de trabajo", g["ZP"], s["workFloor"]["heightM"], 1e-9),
        ("largo del piso", g["X1"] - g["X0"], s["workFloor"]["sizeM"][0], 1e-9),
        ("ancho del piso con laterales", 2 * g["YL"], s["workFloor"]["sizeM"][1], 1e-9),
        ("bastidor del carrier", -2.0 - g["FR"], s["carrier"]["frameLengthM"], 1e-6),
        ("cubierta del carrier", g["ZK"], s["carrier"]["deckHeightM"], 1e-4),
        ("eje delantero 1", (g["XF1"] - g["FR"]) / IN, s["carrier"]["axlesFromFrontIn"][0], 1e-6),
        ("eje tag", (g["XE"] - g["FR"]) / IN, s["carrier"]["axlesFromFrontIn"][4], 1e-6),
        ("T-sill a 6 ft del pozo", g["WXP"] - g["XTS"], s["carrier"]["tSillFromWellM"], 1e-9),
    ]
    fallas = []
    for nombre, obt, esp, tol in checks:
        ok = abs(obt - esp) <= tol
        print("  [%s] %s: %.4f vs %.4f" % ("OK" if ok else "FALLA", nombre, obt, esp))
        if not ok:
            fallas.append(nombre)
    if fallas:
        sys.exit("Cotas que no cierran: %s" % ", ".join(fallas))


def exportar(solo=None):
    g = cargar()
    verificar(g, spec_sk575())
    parts, wxp = g["parts"], g["WXP"]
    por_comp = defaultdict(dict)
    for (cid, mat), shapes in parts.items():
        por_comp[cid][mat] = shapes
    OUT.mkdir(parents=True, exist_ok=True)
    resumen = {}
    for cid, mats in por_comp.items():
        if solo and cid not in solo:
            continue
        assert cid in INFO, "componente sin INFO: %s" % cid
        scene = trimesh.Scene()
        scene.graph.update(frame_to=cid, frame_from="world")
        tris_total = 0
        for mat, shapes in sorted(mats.items()):
            tol, ang = TOL.get(mat, TOL_DEF)
            V, F = [], []
            for sh in shapes:
                for so in sh.solids() if hasattr(sh, "solids") else [sh]:
                    assert so.is_valid, "sólido inválido en %s/%s" % (cid, mat)
                    vs, ts = so.tessellate(tol, ang)
                    base = len(V)
                    V += [(v.X - wxp, v.Z, -v.Y) for v in vs]
                    F += [(base + a, base + b, base + c) for a, b, c in ts]
            if not F:
                continue
            m = trimesh.Trimesh(vertices=np.array(V), faces=np.array(F), process=True)
            col, met, rough, *emi = MATS[mat]
            pbr = PBRMaterial(name="%s_%s" % (cid, mat), baseColorFactor=_hex(col) + [1.0],
                              metallicFactor=met, roughnessFactor=rough,
                              emissiveFactor=_hex(col) if emi else None)
            m.visual = trimesh.visual.TextureVisuals(material=pbr)
            node = "%s_%s" % (cid, mat)
            scene.add_geometry(m, node_name=node, geom_name=node, parent_node_name=cid)
            tris_total += len(m.faces)
        conf, alcance = INFO[cid]
        (OUT / (cid + ".glb")).write_bytes(scene.export(file_type="glb"))
        meta = dict(id=cid, confianza=conf, alcance=alcance, triangulos=tris_total, materiales=sorted(mats),
                    marco="glTF Y arriba; origen = boca de pozo a nivel de terreno; carrier hacia −X (CLAUDE.md)",
                    fuentes="docs/pdf-review/informe-sk575-2026-10-09.md", as_built=False)
        (OUT / (cid + ".meta.json")).write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
        resumen[cid] = tris_total
        print("%-20s %8d tris  %s" % (cid, tris_total, ", ".join(sorted(mats))))
    print("TOTAL", sum(resumen.values()), "triángulos en", len(resumen), "componentes")
    return resumen


if __name__ == "__main__":
    exportar(set(sys.argv[1:]) or None)
