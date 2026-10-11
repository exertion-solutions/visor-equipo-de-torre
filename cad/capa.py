"""Exporta la CAPA CAD del visor V2: geometría verificada (carrier, piso, layout) y las barras del mástil, en el marco del V2.

Salida: src/data/cad/capa-cad.json -> motor nativo (el V2 ya no la dibuja: el SK-575 es su único equipo).
Marco: CAD (x mástil, y lateral, z arriba) -> V2 (x, y arriba, z) = (x, z, −y). Unidades: metros. Todo es confianza C, no as-built.
"""
import json

from lib.tk10 import ROOT
from components import carrier_huella, layout_tkr10, mastil, piso_trabajo

DEST = ROOT / "src" / "data" / "cad" / "capa-cad.json"


def _v2(p):
    return (p[0], p[2], -p[1])


def _malla(wp, dx=0.0, dy=0.0, tol=0.005):
    pos, idx = [], []
    for s in wp.val().Solids():
        verts, tris = s.tessellate(tol, 0.2)
        base = len(pos) // 3
        for v in verts:
            x, y, z = _v2((v.x + dx, v.y + dy, v.z))
            pos += [round(x, 3), round(y, 3), round(z, 3)]
        for t in tris:
            idx += [base + t[0], base + t[1], base + t[2]]
    return pos, idx


def generar(spec, P_mastil, P_piso, P_carrier):
    items = []

    huella, _, _ = carrier_huella.build(spec, P_carrier)
    pos, idx = _malla(huella)
    items.append(dict(
        id="carrier_huella", nombre="Carrier SK-575 (huella 18 × 4 m)", ancla="mundo", color="#e0504f",
        fuente="folleto + LAYOUT TKR-10 (1,3 m a la boca)", estado="REF_OEM",
        tris=[dict(p=pos, i=idx)],
    ))

    partes = layout_tkr10.build(spec)[0]
    colores = {"acumulador": "#3e7896", "bomba": "#d36b6b", "pileta": "#9aa1a8", "planchada": "#f2b632"}
    tris = []
    for nombre, wp in partes.items():
        pos, idx = _malla(wp)
        tris.append(dict(p=pos, i=idx, color=colores[nombre], nombre=nombre))
    items.append(dict(
        id="layout_tkr10", nombre="Layout TKR-10 (acumulador, bomba, pileta, planchada)", ancla="mundo", color="#9aa1a8",
        fuente="LAYOUT TKR-10: tamaños y 5 m / 3 m / 1,3 m rotulados; posiciones medidas del vector (C)", estado="REF_OEM",
        tris=tris,
    ))

    placa, _, q = piso_trabajo.build(spec, P_piso)
    cx, cy = layout_tkr10.centro_piso()
    pos, idx = _malla(placa, cx, cy)
    items.append(dict(
        id="piso_trabajo", nombre="Piso de trabajo (2,6 × 3,3 m a %.1f m)" % q["h"], ancla="mundo", color="#f2b632",
        fuente="folleto (tamaño y altura); posición medida del layout (C). Conflicto: el V2 lo dibuja a 2,30 m", estado="REF_OEM",
        tris=[dict(p=pos, i=idx)],
    ))

    q2 = mastil.ecuaciones(P_mastil, spec)
    nodos, barras, _ = mastil.nodos_y_barras(q2)
    segs = {"pata": [], "trav": [], "diag": []}
    for tipo, a, b in barras:
        for n in (a, b):
            segs[tipo] += [round(c, 3) for c in _v2(nodos[n])]
    items.append(dict(
        id="mastil", nombre="Mástil SK104-330 (celosía ILUSTRATIVA, 31,6992 m)", ancla="mastil", color="#c8c2ae",
        fuente="altura y tramos: folleto; ancho, paneles y diámetros: ILUSTRATIVOS (PENDIENTE)", estado="ILUSTRATIVO",
        lineas=[dict(color="#c8c2ae", p=segs["pata"]), dict(color="#dad6c6", p=segs["trav"]), dict(color="#e0504f", p=segs["diag"])],
    ))

    data = dict(
        version=1, unidades="m", marco="V2: +X hacia el mástil, Z lateral, Y arriba", confianza="C",
        aviso="Referencia dimensional verificada contra technical-spec.js y LAYOUT TKR-10. No es as-built ni apta para fabricación.",
        items=items,
    )
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return DEST, sum(len(t["p"]) // 3 for i in items for t in i.get("tris", [])), sum(len(l["p"]) // 6 for i in items for l in i.get("lineas", []))
