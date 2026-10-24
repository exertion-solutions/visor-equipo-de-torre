"""Piso de trabajo telescópico: PLACA dimensional a altura regulable.
Marco: origen bajo el centro en el terreno, X = largo (2,6), Y = ancho (3,3), Z = altura."""
import cadquery as cq
from lib.equipo import Arbol, dato, export_glb, bbox

ID = "piso_trabajo"


def ecuaciones(spec, P):
    q = dict(P)
    w = spec["workFloor"]
    q["hmin"], q["hmax"], q["hmod"] = w["minHeightM"], w["maxHeightM"], w["modelHeightM"]
    assert q["hmin"] <= q["h"] <= q["hmax"], "altura %s fuera del rango documentado %s–%s m" % (q["h"], q["hmin"], q["hmax"])
    return q


def build(spec, P):
    q = ecuaciones(spec, P)
    A = Arbol()
    placa = A.op(
        "Base-Extruir placa",
        cq.Workplane("XY").workplane(offset=q["h"] - q["esp"]).rect(q["largo"], q["ancho"]).extrude(q["esp"]),
        "+",
    )
    return placa, A, q


def main(spec, P, sfx=""):
    placa, A, q = build(spec, P)
    meta = dict(
        id=ID, family="workfloor", confidence="C", units="m", up="Y",
        frame="origen bajo el centro de la placa, a nivel de terreno",
        scope="Placa maciza a la altura del modelo. Sin barandas, telescopio, gatos ni escaleras. No es as-built.",
        data=[
            dato("sizeM", [q["largo"], q["ancho"]], "m", "confirmed"),
            dato("heightRangeM", [q["hmin"], q["hmax"]], "m", "confirmed"),
            dato("modelHeightM", q["hmod"], "m", "confirmed"),
            dato("espesor", q["esp"], "m", "pending", note="espesor no documentado (placeholder)"),
        ],
        conflicts=[
            dict(
                key="modelHeightM", spec=q["hmod"], legacy=2.30,
                note="technical-spec.js dice 3 m; el visor legacy (30-carrier.js) mantiene 2,30 m. Fuente en conflicto: no se elige en silencio (default = spec).",
            )
        ],
        configurations={"h%g" % v: v for v in (q["hmin"], q["hmod"], q["hmax"])},
        tree=A.filas,
    )
    return export_glb(ID, {"placa": (placa, "main", "#F2B632")}, meta, name=ID + sfx), bbox(placa), q
