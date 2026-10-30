"""Plano del carrier del Equipo 10 (SK-575) con el mástil abatido (posición de montaje): elevación + planta, A3, 1:60.

Solo stdlib. Cotas A/B de `reference/v2-previo/src/technical-spec.js` (RIG_10.sk575) y de `modelo.py`; la pose del mástil va en
naranja punteado = C. No está documentada: se toma de fotos de referencia de una unidad similar (mástil horizontal, cara inferior
apenas sobre el techo de cabina, espesor ≈ 1,25 m medido sobre la foto, ±0,1 m). Parámetros: --prof (espesor) y --luz (cara inferior
sobre el techo de cabina).

    python3 cad/sk575/plano_montaje.py [--prof 1.25] [--luz 0.10] [--out docs/planos/equipo10-carrier-mastil-abatido.svg]
"""
import argparse
import os

IN = 0.0254
# ── cotas (m) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
FRAME_IN, WIDTH_IN, ZK = 480, 102, 53 * IN                    # bastidor 40 ft, ancho 102", cubierta a 53" (A)
FR = -2.0 - FRAME_IN * IN                                      # cara delantera del bastidor; la trasera queda en −2,0
HW = WIDTH_IN / 2 * IN
MX = -1.0                                                      # pie del mástil abatido: X del modelo (B)
WELL = MX + 76 * IN                                            # eje del pozo: 76" (1,9304 m) del pie del mástil (A)
TSILL = WELL - 72 * IN                                         # T-sill a 6 ft del pozo (A)
AXLES_IN = (74.7, 124.6, 327.9, 381.9, 435.6)                  # desde la cara delantera (A)
H_INF = 16.4                                                   # 1.er tramo del mástil (A)
W0, W1 = 1.74, 1.50                                            # ancho del 1.er tramo en planta, pie y cabeza (B)
CROWN_H, CROWN_W = 1.7, 1.8                                    # corona sobre el tope del tramo (C)
ROAD_H, ROAD_L = 4.2926, 20.7264                               # envolvente de ruta documentada (A)
CAB_ROOF = 114 * IN                                            # techo de cabina y capot (B)
CAB = (FR, FR + 60 * IN)                                       # cabina X 0–60"
HOOD = (FR + 85 * IN, FR + 156 * IN)                           # capot/motor X 85–156"


def fmt(v, n=2):
    return f"{v:.{n}f}".replace(".", ",")


def checks(prof, luz):
    z0 = CAB_ROOF + luz
    return {"cabina": luz, "capot": luz, "alto": z0 + prof, "xmin": MX - H_INF - CROWN_H, "xmax": MX}


def build(prof, luz):
    K = 1000 / 60                                              # mm por m (1:60)
    XMIN, X0 = -19.5, 38.0                                     # X (m) en el borde izquierdo / mm en la hoja
    GY = 118.0                                                 # y (mm) del terreno en la elevación
    PY = 190.0                                                 # y (mm) del eje de la planta
    ZS = CAB_ROOF + luz                                        # cara inferior del mástil
    ZC = ZS + prof / 2                                         # eje del mástil

    def ex(x):
        return X0 + (x - XMIN) * K

    def ez(z):
        return GY - z * K

    def py(y):
        return PY - y * K

    s = []
    add = s.append

    def line(x1, y1, x2, y2, w=0.25, c="#111", dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{c}" stroke-width="{w}"{d}/>')

    def poly(pts, fill="none", w=0.25, c="#111", dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in pts)}" fill="{fill}" stroke="{c}" stroke-width="{w}"{d}/>')

    def rect(x0, y0, x1, y1, fill="none", w=0.25, c="#111", dash=None):
        poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill, w, c, dash)

    def text(x, y, t, size=2.6, anchor="start", c="#111", weight="normal"):
        add(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" text-anchor="{anchor}" fill="{c}" font-weight="{weight}">{t}</text>')

    ORG, GRY = "#d35400", "#d6d6d6"
    CD = "1.6 0.9"                                             # punteado de los elementos C

    # hoja
    rect(5, 5, 415, 292, w=0.5)
    text(12, 14, "DIGITAL RIG · Equipo 10 (SK-575) · Carrier con mástil abatido (posición de montaje)", 4.2, weight="bold")
    text(12, 19.5, "Referencia digital: NO es as-built, no es apto para fabricación ni certifica nada. Pose del mástil ilustrativa (C).", 2.6, c=ORG)

    # ── ELEVACIÓN ────────────────────────────────────────────────────────────────────────────────────────────────────────
    text(12, 27, "VISTA LATERAL (lado conductor)  ·  escala 1:60  ·  cotas en m", 3, weight="bold")
    line(ex(XMIN), ez(0), ex(0.9), ez(0), 0.6)
    for i in range(int((0.9 - XMIN) / 0.4)):
        x = ex(XMIN + i * 0.4)
        line(x, ez(0), x - 1.2, ez(0) + 1.4, 0.15, "#888")

    # bastidor, cubierta, cabina, capot, escape, paragolpes
    rect(ex(FR), ez(ZK - 0.045), ex(-2.0), ez(ZK - 0.045 - 0.335), GRY)            # largueros C
    rect(ex(FR + 60 * IN), ez(ZK), ex(-2.0), ez(ZK - 0.045), "#9a9a9a")            # cubierta
    poly([(ex(FR), ez(55 * IN)), (ex(FR + 60 * IN), ez(55 * IN)), (ex(FR + 60 * IN), ez(CAB_ROOF)),
          (ex(FR + 8 * IN), ez(CAB_ROOF)), (ex(FR), ez(98 * IN))], "#bdbdbd")      # cabina
    rect(ex(HOOD[0]), ez(CAB_ROOF), ex(HOOD[1]), ez(ZK), "#c8c8c8")                 # capot
    rect(ex(FR + 66 * IN), ez(2.75), ex(FR + 72 * IN), ez(ZK), "#9a9a9a")           # radiador
    rect(ex(FR + 150 * IN - 0.065), ez(4.0), ex(FR + 150 * IN + 0.065), ez(CAB_ROOF), "#888")   # escape
    rect(ex(FR - 0.25), ez(1.08), ex(FR), ez(0.72), "#9a9a9a")                      # paragolpes
    # ruedas
    for i, xin in enumerate(AXLES_IN):
        r = 44.7 / 2 * IN if i < 2 else 0.52
        add(f'<circle cx="{ex(FR + xin * IN):.2f}" cy="{ez(r):.2f}" r="{r * K:.2f}" fill="#555" stroke="#111" stroke-width="0.25"/>')
        add(f'<circle cx="{ex(FR + xin * IN):.2f}" cy="{ez(r):.2f}" r="{(r - 0.2) * K:.2f}" fill="#bbb" stroke="#111" stroke-width="0.15"/>')
    # gatos de nivelación (como en el modelo, desplegados) y T-sill
    for xin in (163, 475):
        x = ex(FR + xin * IN)
        rect(x - 0.12 * K, ez(ZK - 0.08), x + 0.12 * K, ez(ZK - 0.4), "#a33")
        line(x, ez(ZK - 0.4), x, ez(0.1), 1.2, "#555")
        rect(x - 0.2 * K, ez(0.05), x + 0.2 * K, ez(0.1), "#555")
    rect(ex(TSILL - 0.18), ez(0.3), ex(TSILL + 0.18), ez(0), "#a33")

    # mástil abatido (C): 1.er tramo horizontal con el 2.º embutido, y corona
    x0, x1 = MX, MX - H_INF
    rect(ex(x1), ez(ZS + prof), ex(x0), ez(ZS), "#fbe9dc", 0.45, ORG, CD)
    n = 10
    for i in range(n):
        xa, xb = x0 - i * H_INF / n, x0 - (i + 1) * H_INF / n
        za, zb = (ZS, ZS + prof) if i % 2 else (ZS + prof, ZS)
        line(ex(xa), ez(za), ex(xb), ez(zb), 0.2, ORG)
        line(ex(xb), ez(ZS), ex(xb), ez(ZS + prof), 0.2, ORG)
    xc = x1 - CROWN_H
    rect(ex(x1) - 0.15 * K, ez(ZC + 0.7), ex(x1), ez(ZC - 0.7), "#fbe9dc", 0.35, ORG, CD)
    rect(ex(xc), ez(ZC + 0.7), ex(x1) - 0.15 * K, ez(ZC - 0.7), "none", 0.35, ORG, CD)
    line(ex(x0), ez(ZC), ex(xc), ez(ZC), 0.15, ORG, "4 1 0.6 1")

    # eje del pozo y envolvente de ruta
    line(ex(WELL), ez(0), ex(WELL), ez(6.2), 0.2, "#111", "5 1 1 1")
    text(ex(WELL) - 1, ez(6.2) - 1, "eje del pozo", 2.4, anchor="end")
    line(ex(XMIN), ez(ROAD_H), ex(0.9), ez(ROAD_H), 0.25, "#0a58ca", "3 1.5")
    text(ex(XMIN) + 1, ez(ROAD_H) + 3.2, f"altura máx. de ruta documentada {fmt(ROAD_H, 4)} m (A)", 2.4, c="#0a58ca")

    # cotas
    def vdim(x_m, z0, z1, label):
        x = ex(x_m)
        line(x, ez(z0), x, ez(z1), 0.2)
        for z in (z0, z1):
            line(x - 1.2, ez(z), x + 1.2, ez(z), 0.2)
        text(x + 1.8, (ez(z0) + ez(z1)) / 2 + 1, label, 2.3)

    vdim(-14.9, 0, CAB_ROOF, f"{fmt(CAB_ROOF, 3)} (B)")
    vdim(-2.5, 0, ZK, f"{fmt(ZK, 4)} (A)")
    vdim(MX + 0.5, 0, ZS, f"{fmt(ZS, 2)} (C)")
    yb = ez(0) + 7
    line(ex(FR), yb, ex(-2.0), yb, 0.25)
    for x in [FR, -2.0] + [FR + a * IN for a in AXLES_IN]:
        line(ex(x), yb - 1.5, ex(x), yb + 1.5, 0.2)
    for a in AXLES_IN:
        text(ex(FR + a * IN), yb + 5, f"{fmt(a * IN)}", 2.2, anchor="middle")
    text(ex(FR + 6 * IN), yb + 8.5, "ejes 1 … 5 desde la cara delantera del bastidor (A)", 2.2)
    text(ex((FR - 2.0) / 2), yb - 2, f"bastidor {fmt(FRAME_IN * IN, 3)} (A)", 2.5, anchor="middle")
    yb2 = yb + 13
    line(ex(MX), yb2, ex(WELL), yb2, 0.25)
    for x in (MX, WELL):
        line(ex(x), yb2 - 1.5, ex(x), yb2 + 1.5, 0.2)
    text(ex((MX + WELL) / 2), yb2 + 4.2, f"{fmt(76 * IN, 4)} (A)", 2.3, anchor="middle")
    line(ex(TSILL), yb2 - 6, ex(TSILL), yb2 + 1.5, 0.15, "#888", "1 1")
    text(ex(TSILL), yb2 + 7.5, "T-sill", 2.2, anchor="end")

    # rótulos
    text(ex(FR + 0.5), ez(CAB_ROOF) + 4.5, "cabina", 2.3)
    text(ex(HOOD[0]) + 1, ez(ZK) - 2, "capot / motor", 2.3)
    text(ex(-12.5), ez(ZS + prof) - 4.5, f"mástil abatido, horizontal (C, ilustrativo)  ·  espesor {fmt(prof)} m  ·  luz sobre techo de cabina {fmt(luz)} m", 2.6, c=ORG, weight="bold")
    text(ex(-12.5), ez(ZS + prof) - 1.2, "1.er tramo con 2.º tramo embutido y corona (supuestos C)", 2.2, c=ORG)
    text(ex(MX) + 1.5, ez(ZS + prof) + 1, "pie del mástil", 2.2, c=ORG)
    text(ex(MX) + 1.5, ez(ZS + prof) + 4, "(apoyo y bisagra sin dato)", 2.2, c=ORG)

    # ── PLANTA ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    text(12, 140, "PLANTA  ·  escala 1:60", 3, weight="bold")
    line(ex(XMIN), PY, ex(0.9), PY, 0.15, "#888", "5 1 1 1")
    rect(ex(FR + 60 * IN), py(HW), ex(-2.0), py(-HW), "#e4e4e4", 0.4)               # cubierta 102"
    for y in (-0.39, 0.39):
        line(ex(FR), py(y), ex(-2.0), py(y), 0.5, "#777")
    rect(ex(FR), py(-HW + 33 * IN), ex(FR + 60 * IN), py(-HW), "#bdbdbd")            # cabina (lado conductor)
    rect(ex(HOOD[0]), py(1.15), ex(HOOD[1]), py(-1.15), "#c8c8c8")
    rect(ex(FR + 66 * IN), py(0.65), ex(FR + 72 * IN), py(-0.65), "#9a9a9a")
    for i, xin in enumerate(AXLES_IN):
        r = 44.7 / 2 * IN if i < 2 else 0.52
        ys = ((79.8 / 2 * IN, 0.385),) if i < 2 else ((0.82, 0.279), (1.13, 0.279))
        for y, w in ys:
            for sg in (-1, 1):
                rect(ex(FR + xin * IN - r), py(sg * y + w / 2), ex(FR + xin * IN + r), py(sg * y - w / 2), "#555", 0.2)
    for xin, y in ((163, 44.85 * IN), (475, 47.1 * IN)):
        for sg in (-1, 1):
            rect(ex(FR + xin * IN - 0.2), py(sg * y + 0.2), ex(FR + xin * IN + 0.2), py(sg * y - 0.2), "#a33", 0.2)
    rect(ex(TSILL - 0.18), py(1.22), ex(TSILL + 0.18), py(-1.22), "none", 0.4, "#a33")
    top = [(ex(MX - H_INF * i / 100), py((W0 + (W1 - W0) * i / 100) / 2)) for i in range(101)]
    bot = [(ex(MX - H_INF * i / 100), py(-(W0 + (W1 - W0) * i / 100) / 2)) for i in range(100, -1, -1)]
    poly(top + bot, "#fbe9dc", 0.45, ORG, CD)                                        # ancho en planta: modelo (B)
    rect(ex(x1) - 0.15 * K, py(CROWN_W / 2), ex(x1), py(-CROWN_W / 2), "#fbe9dc", 0.35, ORG, CD)
    line(ex(x1), py(0.7), ex(xc), py(0.7), 0.35, ORG, CD)
    line(ex(x1), py(-0.7), ex(xc), py(-0.7), 0.35, ORG, CD)
    line(ex(WELL), py(1.9), ex(WELL), py(-1.9), 0.2, "#111", "5 1 1 1")
    text(ex(WELL) - 1, py(1.9) - 1, "eje del pozo", 2.4, anchor="end")
    xw = ex(-2.9)
    line(xw, py(HW), xw, py(-HW), 0.2)
    for y in (HW, -HW):
        line(xw - 1.2, py(y), xw + 1.2, py(y), 0.2)
    text(xw - 2, py(0) + 1, f"{fmt(WIDTH_IN * IN, 4)} (A)", 2.3, anchor="end")

    # ── CUADRO DE VERIFICACIÓN Y NOTAS ───────────────────────────────────────────────────────────────────────────────────
    ck = checks(prof, luz)
    y0 = 228
    text(12, y0, "VERIFICACIÓN DE LA POSE ABATIDA (cotas A/B + pose C tomada de foto de referencia)", 3, weight="bold")

    def row(i, t, bad=False):
        text(12, y0 + 5.5 + i * 4.6, t, 2.6, c="#b00020" if bad else "#111")

    row(0, f"Cara inferior del mástil a {fmt(ZS, 3)} m: {fmt(luz)} m sobre el techo de cabina y capot ({fmt(CAB_ROOF, 3)} m, B)  " + ("→ INTERFERENCIA" if luz < 0 else "→ libra"), luz < 0)
    row(1, f"Altura máxima del conjunto: {fmt(ck['alto'], 3)} m  vs  {fmt(ROAD_H, 4)} m de ruta (A)  " + ("→ EXCEDE" if ck["alto"] > ROAD_H else "→ cumple"), ck["alto"] > ROAD_H)
    row(2, f"Extensión X de la pose: {fmt(ck['xmin'], 2)} … {fmt(ck['xmax'], 2)} m = {fmt(ck['xmax'] - ck['xmin'], 2)} m (ruta documentada: largo {fmt(ROAD_L, 4)} m; no se define sobre esta pose).")
    row(3, "El espesor del mástil (≈ 1,25 m) se midió sobre la foto: ±0,1 m. El modelo usa 1,50–1,74 m, que con esta pose excedería la altura de ruta.")

    xn = 215
    text(xn, y0, "NOTAS Y FUENTES", 3, weight="bold")
    notes = [
        "Trazo continuo = dato A/B (ficha del fabricante, manual de partes, plano del mástil, manual de rig-up).",
        "Naranja punteado = C aproximado/ilustrativo: pose, espesor, 2.º tramo embutido y corona.",
        "Pose tomada de fotos de referencia de una unidad similar; no confirma la del Equipo 10. Ángulo del visor V2 (22°): descartado.",
        "No se dibujan: cilindros de izaje (no visibles, sin dato en esta pose), casilla del maquinista, piso de enganche plegado.",
        "Pivote de armado a 1,2192 m (A) no corresponde a esta pose: bisagra y apoyo del pie sin dato.",
        "Gatos de nivelación dibujados desplegados, como en el modelo (B). Techo de cabina/capot 114\" = 2,896 m (B).",
    ]
    for i, t in enumerate(notes):
        text(xn, y0 + 5.5 + i * 4.6, t, 2.4)

    rect(275, 270, 410, 288, w=0.4)
    text(278, 276, "Equipo 10 · carrier + mástil abatido", 3, weight="bold")
    text(278, 281, "Hoja A3 · 1:60 · generado: cad/sk575/plano_montaje.py", 2.3)
    text(278, 285.5, "Estado: borrador de referencia · pose C pendiente de validación", 2.3, c=ORG)

    return ('<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" '
            'font-family="Arial, Helvetica, sans-serif"><rect width="420" height="297" fill="#fff"/>' + "".join(s) + "</svg>"), ck


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--prof", type=float, default=1.25, help="espesor visible del mástil abatido (m), medido sobre foto")
    ap.add_argument("--luz", type=float, default=0.10, help="cara inferior del mástil sobre el techo de cabina (m)")
    ap.add_argument("--out", default="docs/planos/equipo10-carrier-mastil-abatido.svg")
    a = ap.parse_args()
    svg, ck = build(a.prof, a.luz)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(svg)
    print(" ".join(f"{k}={v:.3f}" for k, v in ck.items()) + f" → {a.out}")
