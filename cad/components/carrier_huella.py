"""Carrier Service King SK-575: HUELLA (footprint) en planta de la envolvente operativa 18 × 4 m.
Marco: origen = boca de pozo, carrier hacia −X."""
import cadquery as cq
from lib.equipo import Arbol, dato, export_glb, bbox

ID = "carrier_huella"


def build(spec, P):
    q = dict(P, ejes=spec["carrier"]["axles"])
    A = Arbol()
    huella = A.op(
        "Base-Extruir huella",
        cq.Workplane("XY").center(q["x_inicio"] - q["largo"] / 2, q["y_centro"]).rect(q["largo"], q["ancho"]).extrude(q["esp"]),
        "+",
    )
    return huella, A, q


def main(spec, P, sfx=""):
    huella, A, q = build(spec, P)
    meta = dict(
        id=ID, family="carrier", confidence="C", units="m", up="Y",
        frame="origen = boca de pozo; carrier hacia −X; posición según Layout de locación",
        scope="Solo huella en planta de la envolvente operativa. Sin ejes, cabina, tanques ni altura. No es as-built.",
        data=[
            dato("operatingLengthM", q["largo"], "m", "confirmed"),
            dato("widthM", q["ancho"], "m", "confirmed"),
            dato("axles", q["ejes"], "u", "confirmed", note="dato; no se modelan los ejes"),
            dato("x_inicio", q["x_inicio"], "m", "confirmed", note="1,3 m a la boca de pozo, rotulado en Layout de locación"),
            dato("y_centro", q["y_centro"], "m", "pending", note="medido del vector del PDF (C), no acotado"),
        ],
        tree=A.filas,
    )
    return export_glb(ID, {"huella": (huella, "main", "#A72A32")}, meta, name=ID + sfx), bbox(huella), q
