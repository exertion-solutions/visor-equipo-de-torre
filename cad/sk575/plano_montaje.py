"""Plano del carrier del Equipo 10 (SK-575) con el mástil abatido (posición de montaje): elevación + planta, A3, 1:60.

Solo stdlib. Cotas A/B de `reference/v2-previo/src/technical-spec.js` (RIG_10.sk575) y de `modelo.py`; todo lo demás va en
naranja punteado = C (ilustrativo). La pose abatida NO está documentada: el ángulo es un parámetro (--eps). Por defecto es el que
deja los cilindros de izaje en su largo cerrado (1,524 m, A) con los pivotes estimados (C).

    python3 cad/sk575/plano_montaje.py [--eps 10.8] [--out docs/planos/equipo10-carrier-mastil-abatido.svg]
"""
import argparse
from math import atan2, cos, hypot, pi, radians, sin

IN = 0.0254
# ── cotas (m) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
FRAME_IN, WIDTH_IN, ZK = 480, 102, 53 * IN                    # bastidor 40 ft, ancho 102", cubierta a 53" (A)
FR = -2.0 - FRAME_IN * IN                                      # cara delantera del bastidor; la trasera queda en −2,0
HW = WIDTH_IN / 2 * IN
MX, ZB = -1.0, 48 * IN                                         # pivote del mástil: X del modelo (B), 4'-0" sobre el suelo (A)
WELL = MX + 76 * IN                                            # eje del pozo: 76" (1,9304 m) del pie del mástil (A)
TSILL = WELL - 72 * IN                                         # T-sill a 6 ft del pozo (A)
AXLES_IN = (74.7, 124.6, 327.9, 381.9, 435.6)                  # desde la cara delantera (A)
H_INF, H_SUP = 16.4, 15.2992                                   # tramos del mástil (A)
W0, W1 = 1.74, 1.50                                            # ancho del 1.er tramo, pie y cabeza (B)
CROWN_H, CROWN_W = 1.7, 1.8                                    # corona sobre el tope del tramo (C)
ROAD_H, ROAD_L = 4.2926, 20.7264                               # envolvente de ruta documentada (A)
HYCO_CLOSED, HYCO_EXT = 1.524, 4.8641                          # cilindro de izaje (A)
PIV = (-5.1046, 2.3582)                                        # pie del cilindro sobre el carrier (C)
PIN_S, PIN_D = 6.4 - ZB, 1.85 - 1.0                            # perno superior: s a lo largo del eje, d hacia la cara trasera (C)
CAB_ROOF = 114 * IN                                            # techo de cabina y capot (B)
CAB = (FR, FR + 60 * IN)                                       # cabina X 0–60"
HOOD = (FR + 85 * IN, FR + 156 * IN)                           # capot/motor X 85–156"


def fmt(v, n=2):
    return f"{v:.{n}f}".replace(".", ",")


def pose(eps):
    e = radians(eps)
    a = (-cos(e), sin(e))                                      # eje del mástil abatido hacia la cabina (−X)
    nrm = (sin(e), cos(e))                                     # normal "arriba"
    return e, a, nrm


def halfw(s):
    return (W0 + (W1 - W0) * min(s, H_INF) / H_INF) / 2


def at(eps, s, off):
    """Punto del mástil abatido: s a lo largo del eje desde el pivote, off sobre la normal (+ = arriba)."""
    _, a, n = pose(eps)
    return (MX + s * a[0] + off * n[0], ZB + s * a[1] + off * n[1])


def pin(eps):
    return at(eps, PIN_S, -PIN_D)                              # cara trasera del mástil = abajo al abatir


def solve_closed():
    lo, hi = 0.0, 30.0
    for _ in range(60):                                        # largo del cilindro decrece con eps en [0, ~24°]
        mid = (lo + hi) / 2
        p = pin(mid)
        if hypot(p[0] - PIV[0], p[1] - PIV[1]) > HYCO_CLOSED:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def checks(eps):
    out = {}
    p = pin(eps)
    out["cil"] = hypot(p[0] - PIV[0], p[1] - PIV[1])
    gaps = {"cabina": (CAB, CAB_ROOF), "capot": (HOOD, CAB_ROOF)}
    for k, ((x0, x1), roof) in gaps.items():
        g = min(at(eps, i * 0.02, -halfw(i * 0.02))[1] - roof
                for i in range(int(H_INF / 0.02) + 1) if x0 <= at(eps, i * 0.02, -halfw(i * 0.02))[0] <= x1)
        out[k] = g
    top = max(at(eps, H_INF + CROWN_H, CROWN_W / 2)[1], at(eps, H_INF + CROWN_H, -CROWN_W / 2)[1])
    out["alto"] = top
    out["xmin"] = min(at(eps, H_INF + CROWN_H, o)[0] for o in (CROWN_W / 2, -CROWN_W / 2))
    out["xmax"] = max(at(eps, 0, o)[0] for o in (halfw(0), -halfw(0)))
    return out


def build(eps):
    K = 1000 / 60                                              # mm por m (1:60)
    XMIN, X0 = -19.5, 38.0                                     # X (m) en el borde izquierdo / mm en la hoja
    GY = 118.0                                                 # y (mm) del terreno en la elevación
    PY = 190.0                                                 # y (mm) del eje de la planta

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

    def poly(pts, fill="none", w=0.25, c="#111", dash=None, close=True):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        tag = "polygon" if close else "polyline"
        add(f'<{tag} points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in pts)}" fill="{fill}" stroke="{c}" stroke-width="{w}"{d}/>')

    def rect(x0, y0, x1, y1, fill="none", w=0.25, c="#111", dash=None):
        poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill, w, c, dash)

    def text(x, y, t, size=2.6, anchor="start", c="#111", weight="normal", rot=0):
        r = f' transform="rotate({rot} {x:.2f} {y:.2f})"' if rot else ""
        add(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" text-anchor="{anchor}" fill="{c}" font-weight="{weight}"{r}>{t}</text>')

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

    # mástil abatido (C)
    n = 10
    pts = [at(eps, i * H_INF / 200, halfw(i * H_INF / 200)) for i in range(201)] + \
          [at(eps, (200 - i) * H_INF / 200, -halfw((200 - i) * H_INF / 200)) for i in range(201)]
    poly([(ex(x), ez(z)) for x, z in pts], "#fbe9dc", 0.45, ORG, CD)
    for i in range(n):
        s0, s1 = i * H_INF / n, (i + 1) * H_INF / n
        a_, b_ = (at(eps, s0, halfw(s0)), at(eps, s1, -halfw(s1))) if i % 2 else (at(eps, s0, -halfw(s0)), at(eps, s1, halfw(s1)))
        line(ex(a_[0]), ez(a_[1]), ex(b_[0]), ez(b_[1]), 0.2, ORG)
        t0, t1 = at(eps, s1, halfw(s1)), at(eps, s1, -halfw(s1))
        line(ex(t0[0]), ez(t0[1]), ex(t1[0]), ez(t1[1]), 0.2, ORG)
    cp = [at(eps, H_INF, CROWN_W / 2), at(eps, H_INF + 0.15, CROWN_W / 2), at(eps, H_INF + 0.15, -CROWN_W / 2), at(eps, H_INF, -CROWN_W / 2)]
    poly([(ex(x), ez(z)) for x, z in cp], "#fbe9dc", 0.35, ORG, CD)
    for off in (0.7, -0.7):
        a_, b_ = at(eps, H_INF + 0.15, off), at(eps, H_INF + CROWN_H, off)
        line(ex(a_[0]), ez(a_[1]), ex(b_[0]), ez(b_[1]), 0.35, ORG, CD)
    c0, c1 = at(eps, 0, 0), at(eps, H_INF + CROWN_H, 0)
    line(ex(c0[0]), ez(c0[1]), ex(c1[0]), ez(c1[1]), 0.15, ORG, "4 1 0.6 1")
    add(f'<circle cx="{ex(MX):.2f}" cy="{ez(ZB):.2f}" r="1.1" fill="#fff" stroke="#111" stroke-width="0.35"/>')
    text(ex(MX) + 2, ez(ZB) + 6.5, "pivote del mástil", 2.2)

    # cilindros de izaje (C): pedestal, camisa/émbolo recogidos
    p = pin(eps)
    rect(ex(PIV[0] - 0.15), ez(PIV[1]), ex(PIV[0] + 0.15), ez(ZK), "#f3d9c4", 0.3, ORG, CD)
    line(ex(PIV[0]), ez(PIV[1]), ex(p[0]), ez(p[1]), 1.6, ORG, CD)
    for q in (PIV, p):
        add(f'<circle cx="{ex(q[0]):.2f}" cy="{ez(q[1]):.2f}" r="0.8" fill="#fff" stroke="{ORG}" stroke-width="0.3"/>')

    # eje del pozo y envolvente de ruta
    line(ex(WELL), ez(0), ex(WELL), ez(6.2), 0.2, "#111", "5 1 1 1")
    text(ex(WELL) - 1, ez(6.2) - 1, "eje del pozo", 2.4, anchor="end")
    line(ex(XMIN), ez(ROAD_H), ex(0.9), ez(ROAD_H), 0.25, "#0a58ca", "3 1.5")
    text(ex(XMIN) + 1, ez(ROAD_H) - 1, f"altura máx. de ruta documentada {fmt(ROAD_H, 4)} m (A)", 2.4, c="#0a58ca")

    # cotas
    def vdim(x_m, z0, z1, label, dx=0):
        x = ex(x_m) + dx
        line(x, ez(z0), x, ez(z1), 0.2)
        for z in (z0, z1):
            line(x - 1.2, ez(z), x + 1.2, ez(z), 0.2)
        text(x + 1.8, (ez(z0) + ez(z1)) / 2 + 1, label, 2.3)

    vdim(0.55, 0, ZB, f"{fmt(ZB, 4)}", 0)
    vdim(-14.9, 0, CAB_ROOF, f"{fmt(CAB_ROOF, 3)} (B)", 0)
    vdim(-2.5, 0, ZK, f"{fmt(ZK, 4)}", 0)
    yb = ez(0) + 7
    xs = [FR] + [FR + a * IN for a in AXLES_IN]
    line(ex(FR), yb, ex(-2.0), yb, 0.25)
    for x in [FR, -2.0] + xs[1:]:
        line(ex(x), yb - 1.5, ex(x), yb + 1.5, 0.2)
    for i, a in enumerate(AXLES_IN):
        text(ex(FR + a * IN), yb + 5, f"{fmt(a * IN)}", 2.2, anchor="middle")
    text(ex(FR + 6 * IN), yb + 8.5, "eje 1 … 5 desde la cara delantera del bastidor", 2.2)
    text(ex((FR - 2.0) / 2), yb - 2, f"bastidor {fmt(FRAME_IN * IN, 3)} (A)", 2.5, anchor="middle")
    yb2 = yb + 13
    line(ex(MX), yb2, ex(WELL), yb2, 0.25)
    for x in (MX, WELL):
        line(ex(x), yb2 - 1.5, ex(x), yb2 + 1.5, 0.2)
    text(ex((MX + WELL) / 2), yb2 + 4.2, f"{fmt(76 * IN, 4)} (A)", 2.3, anchor="middle")
    line(ex(TSILL), yb2 - 6, ex(TSILL), yb2 + 1.5, 0.15, "#888", "1 1")
    text(ex(TSILL), yb2 + 7.5, "T-sill", 2.2, anchor="end")

    # rótulos de elementos
    text(ex(FR + 0.5), ez(CAB_ROOF) - 2.5, "cabina", 2.3)
    text(ex(HOOD[0]) + 1, ez(CAB_ROOF) - 2.5, "capot / motor", 2.3)
    text(ex(-9.0), ez(4.9), f"mástil abatido ε = {fmt(eps, 1)}°  (C, ilustrativo)", 2.6, c=ORG, weight="bold")
    text(ex(-9.0), ez(4.9) + 3.6, "1.er tramo con 2.º tramo embutido y corona (supuestos C)", 2.2, c=ORG)
    pm = ((PIV[0] + p[0]) / 2, (PIV[1] + p[1]) / 2)
    text(ex(pm[0]) + 4, ez(pm[1]) + 9, "cilindros de izaje recogidos (C)", 2.2, c=ORG)

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
    pts = [at(eps, i * H_INF / 100, 0) for i in range(101)]
    L = []
    R = []
    for i in range(101):
        ss = i * H_INF / 100
        x = at(eps, ss, 0)[0]
        L.append((ex(x), py(halfw(ss))))
        R.append((ex(x), py(-halfw(ss))))
    poly(L + R[::-1], "#fbe9dc", 0.45, ORG, CD)
    xt = at(eps, H_INF, 0)[0]
    xt2 = at(eps, H_INF + CROWN_H, 0)[0]
    rect(ex(xt) - 0.5, py(CROWN_W / 2), ex(xt) + 0.5, py(-CROWN_W / 2), "#fbe9dc", 0.35, ORG, CD)
    line(ex(xt), py(0.7), ex(xt2), py(0.7), 0.35, ORG, CD)
    line(ex(xt), py(-0.7), ex(xt2), py(-0.7), 0.35, ORG, CD)
    for y in (-0.6, 0.6):
        line(ex(PIV[0]), py(y), ex(p[0]), py(y), 1.6, ORG, CD)
    line(ex(WELL), py(1.9), ex(WELL), py(-1.9), 0.2, "#111", "5 1 1 1")
    text(ex(WELL) - 1, py(1.9) - 1, "eje del pozo", 2.4, anchor="end")
    # cota de ancho
    xw = ex(-2.9)
    line(xw, py(HW), xw, py(-HW), 0.2)
    for y in (HW, -HW):
        line(xw - 1.2, py(y), xw + 1.2, py(y), 0.2)
    text(xw - 2, py(0) + 1, f"{fmt(WIDTH_IN * IN, 4)} (A)", 2.3, anchor="end")

    # ── CUADRO DE VERIFICACIÓN Y NOTAS ───────────────────────────────────────────────────────────────────────────────────
    ck = checks(eps)
    y0 = 228
    text(12, y0, "VERIFICACIÓN DE LA POSE ABATIDA (calculada sobre cotas A/B y supuestos C)", 3, weight="bold")

    def row(i, t, bad=False):
        text(12, y0 + 5.5 + i * 4.6, t, 2.6, c="#b00020" if bad else "#111")

    row(0, f"Largo del cilindro de izaje: {fmt(ck['cil'], 3)} m (cerrado {fmt(HYCO_CLOSED, 3)} m, extendido {fmt(HYCO_EXT, 3)} m; A). Pivotes C.")
    row(1, f"Luz entre la cara inferior del mástil y el techo de cabina: {fmt(ck['cabina'], 2)} m  " + ("→ INTERFERENCIA" if ck["cabina"] < 0 else "→ libra"), ck["cabina"] < 0)
    row(2, f"Luz entre la cara inferior del mástil y el capot/motor: {fmt(ck['capot'], 2)} m  " + ("→ INTERFERENCIA" if ck["capot"] < 0 else "→ libra"), ck["capot"] < 0)
    row(3, f"Altura máxima del conjunto en esta pose: {fmt(ck['alto'], 2)} m  vs  {fmt(ROAD_H, 4)} m de ruta (A)  " + ("→ EXCEDE" if ck["alto"] > ROAD_H else "→ cumple"), ck["alto"] > ROAD_H)
    row(4, f"Extensión X de la pose: {fmt(ck['xmin'], 2)} … {fmt(ck['xmax'], 2)} m (ruta documentada: largo {fmt(ROAD_L, 4)} m, no definido para esta pose).")
    text(12, y0 + 5.5 + 5 * 4.6 + 1, "Si hay interferencia o exceso, los datos disponibles no alcanzan para fijar la pose real: falta el ángulo/apoyo del abatido (foto o plano).", 2.5, c="#b00020")

    xn = 215
    text(xn, y0, "NOTAS Y FUENTES", 3, weight="bold")
    notes = [
        "Trazo continuo = dato A/B (ficha del fabricante, manual de partes, plano del mástil, manual de rig-up).",
        "Naranja punteado = C aproximado/ilustrativo: pose, 2.º tramo embutido, corona, cilindros y pivotes.",
        "Ángulo de transporte del visor V2 (22°): origen procedural previo, no recalculado sobre el SK-575; en conflicto con el cilindro HYCO.",
        "No se dibujan: casilla del maquinista (C, sin dato de posición en transporte), piso de enganche plegado, luminarias.",
        "Gatos de nivelación dibujados desplegados, como en el modelo (B). Techo de cabina/capot 114\" = 2,896 m (B).",
        "Fuentes en conflicto (anclajes de vientos 25 ± 3 m vs 20 m) no aplican a esta vista.",
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
    ap.add_argument("--eps", type=float, default=None, help="elevación del mástil sobre la horizontal (°); por defecto, cilindros cerrados")
    ap.add_argument("--out", default="docs/planos/equipo10-carrier-mastil-abatido.svg")
    a = ap.parse_args()
    eps = a.eps if a.eps is not None else round(solve_closed(), 1)
    svg, ck = build(eps)
    import os
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(svg)
    print(f"eps={eps}° " + " ".join(f"{k}={v:.3f}" for k, v in ck.items()) + f" → {a.out}")
