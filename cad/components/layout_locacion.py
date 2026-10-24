"""Layout de locación (locación): HUELLAS en planta de acumulador, bomba triplex, pileta de circulación y planchada.
Marco: origen = boca de pozo, +X hacia el mástil (carrier hacia −X), Y lateral, Z arriba.

Fuente: docs/fuentes/rig10/Layout de locación.pdf, coordenadas VECTORIALES del PDF (pt), no de una imagen.
Escala calibrada con la cota de anclajes 25 m (215,5 pt) y comprobada con los trailers de 12 m (103,5 pt).
Cotas rotuladas en el plano (confirmadas): tamaños, 5 m bomba-pileta, 3 m acumulador-eje, 1,3 m equipo-boca.
Posiciones no rotuladas: medidas del vector (confianza C).
Asunción de signo lateral (PENDIENTE): este del plano = +Y (CAD). Solo espeja el lado; el largo (X) no depende de ella."""
import json
import cadquery as cq
from lib.equipo import ROOT
from lib.equipo import Arbol, dato, export_glb, bbox

ID = "layout_locacion"
ESPESOR = 0.05  # m — solo visual (no es una altura)

# Coordenadas del PDF (pt): (x0, x1, y0, y1). Boca de pozo = cruce de ejes.
POZO = (692.2, 454.2)
PT_POR_M = 215.5 / 25.0  # anclajes a 25 m
PDF = dict(
    acumulador=(645.7, 666.3, 271.4, 340.4),
    bomba=(808.6, 829.3, 287.7, 339.5),
    pileta=(808.6, 829.3, 382.6, 486.1),
    planchada=(682.1, 702.8, 478.6, 582.0),
    equipo=(670.7, 705.1, 287.8, 443.0),
    piso=(663.5, 687.3, 459.1, 482.9),  # piso de trabajo dibujado (3 × 3 nominal; folleto 2,6 × 3,3)
)


def a_metros(r):
    """PDF (x→este, y→sur) → CAD (x = sur = +X hacia mástil, y = este)."""
    x0, x1, y0, y1 = r
    xw, yw = POZO
    xs = sorted(((y0 - yw) / PT_POR_M, (y1 - yw) / PT_POR_M))
    ys = sorted(((x0 - xw) / PT_POR_M, (x1 - xw) / PT_POR_M))
    return xs[0], xs[1], ys[0], ys[1]


def rect(x0, x1, y0, y1):
    return (
        cq.Workplane("XY").center((x0 + x1) / 2, (y0 + y1) / 2).rect(x1 - x0, y1 - y0).extrude(ESPESOR)
    )


def medidas():
    return {k: a_metros(v) for k, v in PDF.items() if k != "piso"}


def centro_piso():
    """Centro (x, y) CAD del piso de trabajo según el layout (medido del vector, confianza C)."""
    x0, x1, y0, y1 = a_metros(PDF["piso"])
    return (x0 + x1) / 2, (y0 + y1) / 2


def ecuaciones(spec):
    m = medidas()
    L = spec["layout"]
    tam = lambda r: sorted((round(r[1] - r[0], 1), round(r[3] - r[2], 1)), reverse=True)  # noqa: E731
    assert tam(m["acumulador"]) == sorted(L["accumulatorM"], reverse=True), "acumulador 8 × 2,4"
    assert tam(m["bomba"]) == sorted(L["triplexPumpM"], reverse=True), "bomba 6 × 2,4"
    assert tam(m["pileta"]) == sorted(L["circulationPitM"], reverse=True), "pileta 12 × 2,4"
    assert tam(m["planchada"]) == sorted(L["catwalkM"], reverse=True), "planchada 12 × 2,4"
    assert abs((m["pileta"][0] - m["bomba"][1]) - 5.0) < 0.1, "separación bomba-pileta rotulada 5 m"
    assert abs(-m["acumulador"][3] - 3.0) < 0.1, "acumulador a 3 m del eje del pozo"
    assert abs(-m["equipo"][1] - 1.3) < 0.1, "equipo termina a 1,3 m de la boca de pozo"
    return m


def build(spec):
    m = ecuaciones(spec)
    A = Arbol()
    partes = {n: rect(*m[n]) for n in ("acumulador", "bomba", "pileta", "planchada")}
    todo = None  # árbol: volumen acumulado de la unión
    for nombre, wp in partes.items():
        todo = A.op("Saliente " + nombre, wp if todo is None else todo.union(wp), "+")
    return partes, todo, A, m


def main(spec):
    partes, todo, A, m = build(spec)
    meta = dict(
        id=ID, family="auxiliary", confidence="C", units="m", up="Y",
        frame="origen = boca de pozo (cruce de ejes del layout); +X hacia el mástil; signo lateral PENDIENTE",
        scope="Solo huellas en planta de la locación. Sin altura, contenido ni ejes de anclaje. No es as-built.",
        data=[
            dato("accumulatorM", [8, 2.4], "m", "confirmed", note="rotulado en Layout de locación"),
            dato("triplexPumpM", [6, 2.4], "m", "confirmed", note="rotulado"),
            dato("circulationPitM", [12, 2.4], "m", "confirmed", note="rotulado"),
            dato("catwalkM", [12, 2.4], "m", "confirmed", note="rotulado"),
            dato("gap_bomba_pileta", 5.0, "m", "confirmed", note="rotulado"),
            dato("acumulador_a_eje", 3.0, "m", "confirmed", note="rotulado"),
            dato("equipo_a_boca", 1.3, "m", "confirmed", note="rotulado"),
        ]
        + [
            dato("pos_" + k, [round(v, 2) for v in vals], "m", "pending",
                 note="xmin,xmax,ymin,ymax medidos del vector del PDF (C); no acotado")
            for k, vals in m.items()
        ],
        conflicts=[
            dict(key="piso_trabajo_tamano", layout="3 × 3 m nominal (dibujado 2,76 m)", brochure="2,6 × 3,3 m",
                 note="Fuente en conflicto: el modelo usa el folleto (technical-spec.js)."),
            dict(key="anclajes", layout="25 ± 3 m (equipo 10)", brochure="20 m / 25 m (folleto)",
                 note="Ya registrado en el proyecto; no se modelan anclajes."),
        ],
        tree=A.filas,
    )
    # datos para scripts/audit-dimensional.mjs (versionado: la auditoría corre sin Python)
    dest = ROOT / "cad" / "data"
    dest.mkdir(exist_ok=True)
    (dest / "layout_locacion.json").write_text(
        json.dumps({k: [round(v, 2) for v in vals] for k, vals in m.items()}, indent=2), encoding="utf-8"
    )
    colores = {"acumulador": "#3E7896", "bomba": "#A72A32", "pileta": "#6F767C", "planchada": "#F2B632"}
    parts = {k: (v, "main", colores[k]) for k, v in partes.items()}
    return export_glb(ID, parts, meta), bbox(todo), m
