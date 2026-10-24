"""Cinemática del izamiento del mástil (skill `diseno-cad-solidworks`: parametrizar, verificar con números, no inventar).

Entradas (medidas del V2, no inventadas): `cad/data/v2_corredor_mastil.json` (perfil superior del equipo en el corredor del mástil, generado por
`scripts/dump-corredor-mastil.mjs`) y la pose final/pivote del mástil del V2. Decisiones de diseño tomadas de las imágenes de referencia
(equipos similares de otras marcas; `pendingValidation`):
  - el mástil viaja acostado sobre el carrier hacia la cabina y pivota por atrás con pistones en la base;
  - en transporte se apoya en un SOPORTE DE TRASLADO sobre la cabina.

Como el equipo del carrier del V2 queda bajo la trayectoria del mástil, una posición totalmente horizontal (0°) lo atravesaría: se calcula el
ángulo mínimo de transporte (elevación sobre la horizontal) con el que la cara inferior del mástil libra el perfil con un margen, y se
dimensiona el soporte de traslado (CadQuery, sólidos válidos). Salida: src/data/cad/izamiento.json -> window.__RIG_IZAMIENTO.
Unidades: m y grados. Marco del V2: +X hacia el mástil, carrier hacia −X, Y arriba.
"""
import json
import math

import cadquery as cq

from lib.equipo import ROOT

PERFIL = ROOT / "cad" / "data" / "v2_corredor_mastil.json"
DEST = ROOT / "src" / "data" / "cad" / "izamiento.json"

MARGEN = 0.15  # m libres entre la cara inferior del mástil y el equipo (ilustrativo)
MEDIO_ESPESOR = 0.8  # m: semiancho del reticulado inferior del V2 (truss hw = 0,8)
LARGO_TRANSPORTE = 17.0  # m: tramo inferior + corona con el 2.º tramo embutido (16 + 1,7 − 14 + margen, en m del mundo)
ZONA_PIVOTE = 3.0  # m desde el pivote que se ignoran (subestructura / base del mástil)
B0 = (-5.0, 1.45)  # fijación del cuerpo de los pistones al chasis (la del V2)
T_ATAQUE = 5.0  # t (m locales) sobre el eje donde empujan los pistones (el del V2)
X_ATAQUE = -0.5  # m hacia la boca de pozo respecto del eje (el del V2)


def cargar():
    d = json.loads(PERFIL.read_text(encoding="utf-8"))
    return d["x0"], d["dx"], d["top"], d["pivote"]


def libre(eps_deg, x0, dx, top, piv):
    """¿La cara inferior del mástil, acostado a `eps_deg` sobre la horizontal y apuntando a −X, libra el perfil? Devuelve el margen mínimo (m)."""
    e = math.radians(eps_deg)
    minimo = 1e9
    for i, y_top in enumerate(top):
        x = x0 + (i + 0.5) * dx
        s = (piv["bx"] - x) / math.cos(e)  # distancia sobre el eje
        if s < ZONA_PIVOTE or s > LARGO_TRANSPORTE or y_top <= 0.0:
            continue
        y_eje = piv["by"] + (piv["bx"] - x) * math.tan(e)
        y_cara_inf = y_eje - MEDIO_ESPESOR / math.cos(e)
        minimo = min(minimo, y_cara_inf - y_top)
    return minimo


def angulo_transporte(x0, dx, top, piv):
    for e10 in range(0, 600):
        e = e10 / 10
        if libre(e, x0, dx, top, piv) >= MARGEN:
            return e
    raise AssertionError("no hay ángulo de transporte que libre el equipo")


def punto_ataque(theta_deg_vertical, piv):
    """Punto del mástil donde empujan los pistones (mismo del V2). theta: ángulo del eje respecto de la vertical, + hacia la boca de pozo."""
    th = math.radians(theta_deg_vertical)
    S = piv["scale"]
    return (
        piv["bx"] + T_ATAQUE * S * math.sin(th) + X_ATAQUE * math.cos(th),
        piv["by"] + T_ATAQUE * S * math.cos(th) - X_ATAQUE * math.sin(th),
    )


def soporte_traslado(eps, x0, dx, top, piv):
    """Soporte de traslado sobre la cabina: dos postes y una cuna bajo el mástil, a 2/3 del largo de transporte."""
    e = math.radians(eps)
    s = LARGO_TRANSPORTE * 0.78
    x = piv["bx"] - s * math.cos(e)
    y_eje = piv["by"] + s * math.sin(e)
    y_cara_inf = y_eje - MEDIO_ESPESOR / math.cos(e)
    i = max(0, min(len(top) - 1, int((x - x0) / dx)))
    y_base = max(top[max(0, i - 3) : i + 4])  # techo del equipo bajo el soporte
    alto = y_cara_inf - y_base
    assert alto > 0.3, f"soporte sin altura ({alto:.2f} m)"
    poste = cq.Workplane("XY").box(0.18, 0.18, alto, centered=(True, True, False)).translate((x, 0.0, y_base))
    cuna = cq.Workplane("XY").box(1.0, 1.6, 0.14, centered=(True, True, False)).translate((x, 0.0, y_cara_inf - 0.14))
    pieza = poste.union(cuna)
    assert pieza.val().isValid(), "soporte inválido"
    return dict(x=round(x, 2), y0=round(y_base, 2), y1=round(y_cara_inf, 2), alto=round(alto, 2), valido=True)


def generar():
    x0, dx, top, piv = cargar()
    eps = angulo_transporte(x0, dx, top, piv)
    a_final = math.degrees(piv["a"])
    # cinemática de los pistones: θ va de −(90 − eps) (acostado) a la pose final del V2
    th0, th1 = -(90.0 - eps), a_final
    tabla = []
    n = 24
    for k in range(n + 1):
        th = th0 + (th1 - th0) * k / n
        mx, my = punto_ataque(th, piv)
        ll = [math.hypot(mx - B0[0], my - B0[1])]
        tabla.append(dict(elevacion=round(90 + th, 2), longitud=round(ll[0], 3)))
    largos = [t["longitud"] for t in tabla]
    lmin, lmax = min(largos), max(largos)
    assert all(largos[i] <= largos[i + 1] + 1e-6 for i in range(len(largos) - 1)), "el pistón debe extenderse de forma monótona"
    sop = soporte_traslado(eps, x0, dx, top, piv)
    # verificación final: margen real en el ángulo elegido
    margen = libre(eps, x0, dx, top, piv)
    assert margen >= MARGEN - 1e-9
    data = dict(
        version=1, estado="pendingValidation", unidades="m, grados",
        fuente="secuencia y cinemática: usuario + imágenes de referencia de equipos similares (otras marcas); posiciones: medidas del V2",
        elevacion_transporte=round(eps, 1), elevacion_final=round(90 + a_final, 2), margen_libre=round(margen, 2),
        pistones=dict(
            fijacion_chasis=B0, largo_min=round(lmin, 3), largo_max=round(lmax, 3), carrera=round(lmax - lmin, 3),
            relacion=round(lmax / lmin, 2), largo_camisa=round(min(lmin, 3.0), 3), tabla=tabla,
        ),
        soporte_traslado=sop,
        notas=[
            "0° (mástil horizontal) no es posible en el V2: el motor y el malacate quedan bajo el mástil acostado; se parte del ángulo mínimo que libra el equipo",
            "el pistón del 2.º tramo es interno al mástil y sus medidas son ilustrativas",
        ],
    )
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return data


if __name__ == "__main__":
    d = generar()
    print(json.dumps({k: v for k, v in d.items() if k not in ("pistones", "notas")}, ensure_ascii=False))
    p = d["pistones"]
    print("pistón: largo %.2f–%.2f m, carrera %.2f m, relación %.2f" % (p["largo_min"], p["largo_max"], p["carrera"], p["relacion"]))
