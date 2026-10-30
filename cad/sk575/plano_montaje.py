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


# ── equipos del carrier (posición en pulgadas desde la cara delantera del bastidor: manual de partes; forma esquemática) ──────
DRUM_Z = 84 * IN                                               # centros de ambos tambores a H 84" (B)
DRUMS = (("principal", 332, 42, 12, 16, 38.75), ("pistoneo", 273, 42, 8, 16, 43.75))   # nombre, X", Ø brida, freno, Ø barril, largo barril (B)
DISC_D = 48.5 * IN                                             # disco de freno asistido (B)
PTO_IN, PTO_Z = 235, 61 * IN                                   # eje de fuerza (B)
PIV = (-5.1046, 2.3582)                                        # pie de los cilindros de izaje sobre el carrier (C)
HYCO_CLOSED, CYL_D = 1.524, 9.42 * IN                          # cilindro HYCO: largo cerrado y camisa (A)
AUX = (-2.6, ZK + 0.25)                                        # malacate auxiliar 12.000 lb (C: solo posición)


def xc(xin):
    return FR + xin * IN


def fmt(v, n=2):
    return f"{v:.{n}f}".replace(".", ",")


def cyl_pin(zs):
    """Cilindro de izaje recogido (largo cerrado A) entre el pedestal (C) y la cara inferior del mástil a altura zs."""
    return (PIV[0] - (HYCO_CLOSED ** 2 - (zs - PIV[1]) ** 2) ** 0.5, zs)


def seg_dist(p, a, b):
    ax, az, bx, bz = a[0], a[1], b[0], b[1]
    t = max(0.0, min(1.0, ((p[0] - ax) * (bx - ax) + (p[1] - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)))
    return ((p[0] - ax - t * (bx - ax)) ** 2 + (p[1] - az - t * (bz - az)) ** 2) ** 0.5


def checks(prof, luz):
    z0 = CAB_ROOF + luz
    pin = cyl_pin(z0)
    d = seg_dist((xc(332), DRUM_Z), PIV, pin) - (21 * IN + CYL_D / 2)
    return {"cabina": luz, "capot": luz, "alto": z0 + prof, "xmin": MX - H_INF - CROWN_H, "xmax": MX,
            "cil_x": pin[0], "cil_tambor": d}


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

    def poly(pts, fill="none", w=0.25, c="#111", dash=None, op=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in pts)}" fill="{fill}" fill-opacity="{op}" stroke="{c}" stroke-width="{w}"{d}/>')

    def rect(x0, y0, x1, y1, fill="none", w=0.25, c="#111", dash=None, op=1):
        poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill, w, c, dash, op)

    def circ(x, y, r, fill="none", w=0.3, c="#111", dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{fill}" stroke="{c}" stroke-width="{w}"{d}/>')

    def tag(x, y, n):
        circ(x, y, 1.7, "#fff", 0.25)
        text(x, y + 0.75, str(n), 2.1, anchor="middle", weight="bold")

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

    # equipos del carrier: azul = posición y medida de manual (B), forma esquemática; naranja punteado = C
    BLU, BLF = "#1b4f8a", "#dce8f5"
    rect(ex(xc(226)), ez(110 * IN), ex(xc(376)), ez(ZK), "none", 0.3, BLU, "2 0.8")                    # 6 cuadro de maniobras
    rect(ex(xc(204)), ez(109 * IN), ex(xc(243)), ez(80 * IN), BLF, 0.3, BLU)                           # 4 tanque hidráulico
    rect(ex(xc(195)), ez(47 * IN), ex(xc(239)), ez(29 * IN), BLF, 0.3, BLU)                            # 5 tanques de combustible
    rect(ex(xc(212)), ez(1.95), ex(xc(240)), ez(ZK), BLF, 0.3, BLU)                                    # 3 caja angular
    rect(ex(xc(160) - 0.125), ez(1.78), ex(xc(160) + 0.125), ez(1.22), BLF, 0.3, ORG, CD)              # 2 transmisión (forma C)
    line(ex(xc(165)), ez(1.5), ex(xc(212)), ez(1.55), 0.8, "#555")                                     # cardán
    for nom, xin, dd, frn, db, lb in DRUMS:                                                            # 7 principal, 8 pistoneo
        cx, cz = ex(xc(xin)), ez(DRUM_Z)
        circ(cx, cz, dd / 2 * IN * K, BLF, 0.3, BLU)
        circ(cx, cz, db / 2 * IN * K, "#9db8d6", 0.3, BLU)
    circ(ex(xc(332)), ez(DRUM_Z), DISC_D / 2 * K, "none", 0.25, BLU, "1.2 0.8")   # discos de freno Ø48,5"
    px, pz = ex(xc(PTO_IN)), ez(PTO_Z)
    circ(px, pz, 0.8, "#555", 0.2)                                                                     # 9 eje de fuerza
    for a_, b_ in (((xc(PTO_IN), PTO_Z), (xc(273), DRUM_Z)), ((xc(273), DRUM_Z), (xc(332), DRUM_Z))):   # cadena 140-2 (esquemática)
        line(ex(a_[0]), ez(a_[1]), ex(b_[0]), ez(b_[1]), 0.25, ORG, "3 1 0.6 1")
    circ(ex(AUX[0]), ez(AUX[1]), 0.2 * K, "#f3d9c4", 0.3, ORG, CD)                                      # 10 malacate auxiliar (C)
    tag(ex(xc(120)), ez(CAB_ROOF) + 4.2, 1)
    tag(ex(xc(160)), ez(2.3), 2)
    tag(ex(xc(217)), ez(1.65), 3)
    tag(ex(xc(223.5)), ez(2.4), 4)
    tag(ex(xc(217)), ez(0.965), 5)
    tag(ex(xc(368)), ez(2.62), 6)
    tag(ex(xc(332)), ez(DRUM_Z), 7)
    tag(ex(xc(273)), ez(DRUM_Z), 8)
    tag(ex(xc(PTO_IN)), ez(1.2), 9)
    tag(ex(AUX[0]), ez(1.95), 10)

    # mástil abatido (C): 1.er tramo horizontal con el 2.º embutido, y corona
    x0, x1 = MX, MX - H_INF
    rect(ex(x1), ez(ZS + prof), ex(x0), ez(ZS), "#fbe9dc", 0.45, ORG, CD)
    n = 10
    for i in range(n):
        xa, xb = x0 - i * H_INF / n, x0 - (i + 1) * H_INF / n
        za, zb = (ZS, ZS + prof) if i % 2 else (ZS + prof, ZS)
        line(ex(xa), ez(za), ex(xb), ez(zb), 0.2, ORG)
        line(ex(xb), ez(ZS), ex(xb), ez(ZS + prof), 0.2, ORG)
    xcr = x1 - CROWN_H
    rect(ex(x1) - 0.15 * K, ez(ZC + 0.7), ex(x1), ez(ZC - 0.7), "#fbe9dc", 0.35, ORG, CD)
    rect(ex(xcr), ez(ZC + 0.7), ex(x1) - 0.15 * K, ez(ZC - 0.7), "none", 0.35, ORG, CD)
    line(ex(x0), ez(ZC), ex(xcr), ez(ZC), 0.15, ORG, "4 1 0.6 1")

    # 11 cilindros de izaje recogidos: camisa Ø9,42" (A), largo cerrado 1,524 m (A), pedestal y perno en el mástil (C)
    pin = cyl_pin(ZS)
    ux, uz = (pin[0] - PIV[0]) / HYCO_CLOSED, (pin[1] - PIV[1]) / HYCO_CLOSED
    nx, nz = -uz, ux
    h = CYL_D / 2
    rect(ex(PIV[0] - 0.15), ez(PIV[1]), ex(PIV[0] + 0.15), ez(ZK), "#f3d9c4", 0.3, ORG, CD)
    poly([(ex(PIV[0] + nx * h), ez(PIV[1] + nz * h)), (ex(pin[0] + nx * h), ez(pin[1] + nz * h)),
          (ex(pin[0] - nx * h), ez(pin[1] - nz * h)), (ex(PIV[0] - nx * h), ez(PIV[1] - nz * h))], "#f3d9c4", 0.4, ORG, CD, 0.85)
    tag(ex((PIV[0] + pin[0]) / 2), ez((PIV[1] + pin[1]) / 2) + 5.2, 11)

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
    BLU, BLF = "#1b4f8a", "#dce8f5"
    rect(ex(xc(226)), py(0.83), ex(xc(376)), py(-0.83), "none", 0.3, BLU, "2 0.8")                     # 6 cuadro (laterales)
    rect(ex(xc(204)), py(0.15), ex(xc(243)), py(-0.85), BLF, 0.3, BLU)                                 # 4
    for sg in (-1, 1):                                                                                 # 5 combustible
        rect(ex(xc(195)), py(sg * 1.0 + 9 * IN), ex(xc(239)), py(sg * 1.0 - 9 * IN), BLF, 0.3, BLU)
    rect(ex(xc(212)), py(0.42), ex(xc(240)), py(-0.42), BLF, 0.3, BLU)                                 # 3
    for nom, xin, dd, frn, db, lb in DRUMS:                                                            # 7, 8
        xa = ex(xc(xin))
        rect(xa - db / 2 * IN * K, py(lb / 2 * IN), xa + db / 2 * IN * K, py(-lb / 2 * IN), "#9db8d6", 0.3, BLU)
        for sg in (-1, 1):
            y0_, y1_ = sg * lb / 2 * IN, sg * (lb + 2 * frn) / 2 * IN
            rect(xa - dd / 2 * IN * K, py(max(y0_, y1_)), xa + dd / 2 * IN * K, py(min(y0_, y1_)), BLF, 0.3, BLU)
    rect(ex(AUX[0] - 0.25), py(1.15), ex(AUX[0] + 0.25), py(0.75), "#f3d9c4", 0.3, ORG, CD)           # 10
    for sg in (-1, 1):                                                                                 # 11 cilindros (y ±0,6)
        pin = cyl_pin(ZS)
        rect(ex(pin[0]), py(sg * 0.6 + CYL_D / 2), ex(PIV[0]), py(sg * 0.6 - CYL_D / 2), "#f3d9c4", 0.4, ORG, CD)
    tag(ex(xc(223.5)), py(-0.35), 4)
    tag(ex(xc(217)), py(1.0), 5)
    tag(ex(xc(332)), py(0), 7)
    tag(ex(xc(273)), py(0), 8)
    tag(ex(AUX[0]), py(0.95), 10)
    tag(ex(PIV[0] - 0.7), py(0.6), 11)
    top = [(ex(MX - H_INF * i / 100), py((W0 + (W1 - W0) * i / 100) / 2)) for i in range(101)]
    bot = [(ex(MX - H_INF * i / 100), py(-(W0 + (W1 - W0) * i / 100) / 2)) for i in range(100, -1, -1)]
    poly(top + bot, "#fbe9dc", 0.45, ORG, CD, 0.45)                                  # ancho en planta: modelo (B)
    rect(ex(x1) - 0.15 * K, py(CROWN_W / 2), ex(x1), py(-CROWN_W / 2), "#fbe9dc", 0.35, ORG, CD)
    line(ex(x1), py(0.7), ex(xcr), py(0.7), 0.35, ORG, CD)
    line(ex(x1), py(-0.7), ex(xcr), py(-0.7), 0.35, ORG, CD)
    line(ex(WELL), py(1.9), ex(WELL), py(-1.9), 0.2, "#111", "5 1 1 1")
    text(ex(WELL) - 1, py(1.9) - 1, "eje del pozo", 2.4, anchor="end")
    xw = ex(-2.9)
    line(xw, py(HW), xw, py(-HW), 0.2)
    for y in (HW, -HW):
        line(xw - 1.2, py(y), xw + 1.2, py(y), 0.2)
    text(xw - 2, py(0) + 1, f"{fmt(WIDTH_IN * IN, 4)} (A)", 2.3, anchor="end")

    # ── CUADRO DE VERIFICACIÓN Y NOTAS ───────────────────────────────────────────────────────────────────────────────────
    ck = checks(prof, luz)
    y0 = 224
    text(12, y0, "VERIFICACIÓN DE LA POSE ABATIDA (cotas A/B + pose C tomada de foto de referencia)", 3, weight="bold")

    def row(i, t, bad=False):
        text(12, y0 + 5.2 + i * 4.3, t, 2.5, c="#b00020" if bad else "#111")

    row(0, f"Cara inferior del mástil a {fmt(ZS, 3)} m: {fmt(luz)} m sobre el techo de cabina y capot ({fmt(CAB_ROOF, 3)} m, B)  " + ("→ INTERFERENCIA" if luz < 0 else "→ libra"), luz < 0)
    row(1, f"Altura máxima del conjunto: {fmt(ck['alto'], 3)} m  vs  {fmt(ROAD_H, 4)} m de ruta (A)  " + ("→ EXCEDE" if ck["alto"] > ROAD_H else "→ cumple"), ck["alto"] > ROAD_H)
    row(2, f"Extensión X de la pose: {fmt(ck['xmin'], 2)} … {fmt(ck['xmax'], 2)} m = {fmt(ck['xmax'] - ck['xmin'], 2)} m (ruta documentada: largo {fmt(ROAD_L, 4)} m; no se define sobre esta pose).")
    row(3, f"Cilindros de izaje (11) recogidos: perno en el mástil a X = {fmt(ck['cil_x'], 2)} m (pedestal C). Luz al tambor principal (7): {fmt(ck['cil_tambor'], 2)} m  "
        + ("→ INTERFERENCIA (en planta se superponen en Y)" if ck["cil_tambor"] < 0.02 else "→ libra"), ck["cil_tambor"] < 0.02)
    row(4, "Espesor del mástil ≈ 1,25 m medido sobre foto (±0,1 m); el modelo usa 1,50–1,74 m, que con esta pose excedería la altura de ruta.")

    xn = 215
    text(xn, y0, "NOTAS Y FUENTES", 3, weight="bold")
    notes = [
        "Azul = posición y medida de manual (B), forma esquemática. Naranja punteado = C aproximado/ilustrativo.",
        "Negro = dato A/B del carrier (ficha, manual de partes, plano del mástil, manual de rig-up).",
        "Pose tomada de fotos de referencia de una unidad similar; no confirma la del Equipo 10. V2 (22°): descartado.",
        "No se dibujan: casilla, piso de enganche plegado, luminarias, líneas hidráulicas ni cables de la corona.",
        "Bisagra y apoyo del pie del mástil: sin dato. Pivote de armado 1,2192 m (A) no corresponde a esta pose.",
    ]
    for i, t in enumerate(notes):
        text(xn, y0 + 5.2 + i * 4.3, t, 2.3)

    yl = 252
    text(12, yl, "COMPONENTES (nivel entre paréntesis: A confirmado · B parcial, manual de partes · C aproximado)", 3, weight="bold")
    leg = [
        "1  Motor Detroit S60 bajo capot: X 85–156\", tope 114\" (B); sin cotas internas",
        "2  Transmisión Allison 4500 OFS: X 134–156\"; cardán → caja angular (C, forma)",
        "3  Caja angular 2,47:1: X 212–240\", salida a X 235\", H 61\" (B)",
        "4  Tanque hidráulico: X 204–243\", H 80–109\" (B)",
        "5  Tanques de combustible (2): X 195–239\", H 29–47\" (B)",
        "6  Cuadro de maniobras (malacate): X 226–376\", hasta H 110\" (B)",
        "7  Tambor principal: Ø42\" × 12\" freno; barril Ø16\" × 38,75\"; X 332\", H 84\"; discos Ø48,5\" (B)",
        "8  Tambor de pistoneo: Ø42\" × 8\"; barril Ø16\" × 43,75\"; X 273\", H 84\" (B)",
        "9  Eje de fuerza X 235\", H 61\" (B); doble cadena 140-2 hasta los tambores (C, esquemática)",
        "10 Malacate auxiliar 12.000 lb: solo posición aproximada (C)",
        "11 Cilindros de izaje (2): camisa Ø9,42\", largo cerrado 1,524 m (A); pedestal y perno (C)",
    ]
    for i, t in enumerate(leg):
        col, row_ = divmod(i, 6)
        text(12 + col * 100, yl + 4.6 + row_ * 3.8, t, 2.2)

    rect(275, 270, 410, 288, w=0.4)
    text(278, 276, "Equipo 10 · carrier + mástil abatido", 3, weight="bold")
    text(278, 281, "Hoja A3 · 1:60 · generado: cad/sk575/plano_montaje.py", 2.3)
    text(278, 285.5, "Estado: borrador de referencia · pose C pendiente de validación", 2.3, c=ORG)

    return ('<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" '
            'font-family="Arial, Helvetica, sans-serif"><rect width="420" height="297" fill="#fff"/>' + "".join(s) + "</svg>"), ck


def build_planta(prof, luz):
    """Hoja 2: planta general 1:60 con cotas + detalle 1:30 del cuadro de maniobras."""
    ZS = CAB_ROOF + luz
    BLU, BLF, ORG, GRY, CD = "#1b4f8a", "#dce8f5", "#d35400", "#d6d6d6", "1.6 0.9"
    s = []
    add = s.append

    def line(x1, y1, x2, y2, w=0.25, c="#111", dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{c}" stroke-width="{w}"{d}/>')

    def rect(x0, y0, x1, y1, fill="none", w=0.25, c="#111", dash=None, op=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<rect x="{min(x0, x1):.2f}" y="{min(y0, y1):.2f}" width="{abs(x1 - x0):.2f}" height="{abs(y1 - y0):.2f}" '
            f'fill="{fill}" fill-opacity="{op}" stroke="{c}" stroke-width="{w}"{d}/>')

    def poly(pts, fill="none", w=0.25, c="#111", dash=None, op=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        add(f'<polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in pts)}" fill="{fill}" fill-opacity="{op}" stroke="{c}" stroke-width="{w}"{d}/>')

    def text(x, y, t, size=2.6, anchor="start", c="#111", weight="normal"):
        add(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" text-anchor="{anchor}" fill="{c}" font-weight="{weight}">{t}</text>')

    def tag(x, y, n):
        add(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="1.7" fill="#fff" stroke="#111" stroke-width="0.25"/>')
        text(x, y + 0.75, str(n), 2.1, anchor="middle", weight="bold")

    def hdim(x0, x1, y, label, size=2.3):
        line(x0, y, x1, y, 0.2)
        for x in (x0, x1):
            line(x, y - 1.3, x, y + 1.3, 0.2)
        text((x0 + x1) / 2, y + 3.6, label, size, anchor="middle")

    def vdim(x, y0, y1, label, left=False, size=2.3):
        line(x, y0, x, y1, 0.2)
        for y in (y0, y1):
            line(x - 1.3, y, x + 1.3, y, 0.2)
        text(x + (-1.8 if left else 1.8), (y0 + y1) / 2 + 0.8, label, size, anchor="end" if left else "start")

    def carrier(ex, py, K):
        rect(ex(xc(60)), py(HW), ex(-2.0), py(-HW), "#e4e4e4", 0.4)
        for y in (-0.39, 0.39):
            line(ex(FR), py(y), ex(-2.0), py(y), 0.5, "#777")
        rect(ex(FR), py(-HW + 33 * IN), ex(xc(60)), py(-HW), "#bdbdbd")
        rect(ex(HOOD[0]), py(1.15), ex(HOOD[1]), py(-1.15), "#c8c8c8")
        rect(ex(xc(66)), py(0.65), ex(xc(72)), py(-0.65), "#9a9a9a")
        for i, xin in enumerate(AXLES_IN):
            r = 44.7 / 2 * IN if i < 2 else 0.52
            ys = ((79.8 / 2 * IN, 0.385),) if i < 2 else ((0.82, 0.279), (1.13, 0.279))
            for y, w in ys:
                for sg in (-1, 1):
                    rect(ex(xc(xin) - r), py(sg * y + w / 2), ex(xc(xin) + r), py(sg * y - w / 2), "#555", 0.2)
        for xin, y in ((163, 44.85 * IN), (475, 47.1 * IN)):
            for sg in (-1, 1):
                rect(ex(xc(xin) - 0.2), py(sg * y + 0.2), ex(xc(xin) + 0.2), py(sg * y - 0.2), "#a33", 0.2)
        rect(ex(TSILL - 0.18), py(1.22), ex(TSILL + 0.18), py(-1.22), "none", 0.4, "#a33")

    def equipo(ex, py, K, detalle=False):
        rect(ex(xc(226)), py(0.83), ex(xc(376)), py(-0.83), "none", 0.3, BLU, "2 0.8")                       # 6 laterales del cuadro
        rect(ex(xc(204)), py(0.15), ex(xc(243)), py(-0.85), BLF, 0.3, BLU)                                   # 4
        for sg in (-1, 1):                                                                                   # 5
            rect(ex(xc(195)), py(sg * 1.0 + 9 * IN), ex(xc(239)), py(sg * 1.0 - 9 * IN), BLF, 0.3, BLU)
        rect(ex(xc(212)), py(0.42), ex(xc(240)), py(-0.42), BLF, 0.3, BLU)                                   # 3
        if detalle:
            rect(ex(xc(160) - 0.125), py(0.28), ex(xc(160) + 0.125), py(-0.28), BLF, 0.3, ORG, CD)           # 2
            line(ex(xc(165)), py(0), ex(xc(212)), py(0), 0.8, "#555")                                        # cardán
            rect(ex(xc(226)), py(1.02), ex(xc(350)), py(0.86), "#c9d6e6", 0.3, BLU)                           # cárter de cadena
            rect(ex(xc(PTO_IN) - 0.05), py(0.9), ex(xc(PTO_IN) + 0.05), py(-0.9), "#9db8d6", 0.3, BLU)       # 9 eje de fuerza
            line(ex(xc(PTO_IN)), py(0.94), ex(xc(332)), py(0.94), 0.3, ORG, "3 1 0.6 1")                     # cadena 140-2
        for nom, xin, dd, frn, db, lb in DRUMS:                                                              # 7, 8
            xa = ex(xc(xin))
            rect(xa - db / 2 * IN * K, py(lb / 2 * IN), xa + db / 2 * IN * K, py(-lb / 2 * IN), "#9db8d6", 0.3, BLU)
            for sg in (-1, 1):
                y0_, y1_ = sg * lb / 2 * IN, sg * (lb + 2 * frn) / 2 * IN
                rect(xa - dd / 2 * IN * K, py(max(y0_, y1_)), xa + dd / 2 * IN * K, py(min(y0_, y1_)), BLF, 0.3, BLU)
        if detalle:
            for y in (-0.93, -1.0):                                                                          # discos Kobelt Ø48,5"
                rect(ex(xc(332)) - DISC_D / 2 * K, py(y + 0.0125), ex(xc(332)) + DISC_D / 2 * K, py(y - 0.0125), "#fff", 0.25, ORG, CD)
        rect(ex(AUX[0] - 0.25), py(1.15), ex(AUX[0] + 0.25), py(0.75), "#f3d9c4", 0.3, ORG, CD)             # 10
        pin = cyl_pin(ZS)
        for sg in (-1, 1):                                                                                   # 11
            rect(ex(pin[0]), py(sg * 0.6 + CYL_D / 2), ex(PIV[0]), py(sg * 0.6 - CYL_D / 2), "#f3d9c4", 0.4, ORG, CD)
        for n, x, y in ((4, xc(223.5), -0.35), (5, xc(217), 1.0), (7, xc(332), 0), (8, xc(273), 0), (10, AUX[0], 0.95),
                        (11, PIV[0] - 0.7, 0.6)) + (((3, xc(226), 0.25), (9, xc(PTO_IN), -0.75), (6, xc(370), 0.7)) if detalle else ()):
            tag(ex(x), py(y), n)

    add('<defs><clipPath id="cd"><rect x="10" y="108" width="258" height="150"/></clipPath></defs>')
    add('<rect x="5" y="5" width="410" height="287" fill="none" stroke="#111" stroke-width="0.5"/>')
    text(12, 14, "DIGITAL RIG · Equipo 10 (SK-575) · Vista en planta con mástil abatido", 4.2, weight="bold")
    text(12, 19.5, "Referencia digital: NO es as-built, no es apto para fabricación ni certifica nada. Pose del mástil ilustrativa (C).", 2.6, c=ORG)

    # ── planta general 1:60 ──────────────────────────────────────────────────────────────────────────────────────────────
    K1, X1, PY1 = 1000 / 60, 18.0, 60.0

    def ex1(x):
        return X1 + (x + 19.5) * K1

    def py1(y):
        return PY1 - y * K1

    text(12, 27, "PLANTA GENERAL  ·  escala 1:60  ·  cotas en m", 3, weight="bold")
    line(ex1(-19.5), PY1, ex1(0.9), PY1, 0.15, "#888", "5 1 1 1")
    carrier(ex1, py1, K1)
    equipo(ex1, py1, K1)
    top = [(ex1(MX - H_INF * i / 100), py1((W0 + (W1 - W0) * i / 100) / 2)) for i in range(101)]
    bot = [(ex1(MX - H_INF * i / 100), py1(-(W0 + (W1 - W0) * i / 100) / 2)) for i in range(100, -1, -1)]
    poly(top + bot, "#fbe9dc", 0.45, ORG, CD, 0.45)
    x1_ = MX - H_INF
    rect(ex1(x1_) - 0.15 * K1, py1(CROWN_W / 2), ex1(x1_), py1(-CROWN_W / 2), "#fbe9dc", 0.35, ORG, CD)
    for y in (0.7, -0.7):
        line(ex1(x1_), py1(y), ex1(x1_ - CROWN_H), py1(y), 0.35, ORG, CD)
    line(ex1(WELL), py1(1.9), ex1(WELL), py1(-1.9), 0.2, "#111", "5 1 1 1")
    text(ex1(WELL) - 1, py1(1.9) - 1, "eje del pozo", 2.4, anchor="end")
    text(ex1(-12.6), py1(1.55), "mástil abatido (C), 1.er tramo en planta: ancho 1,74 → 1,50 m (B)", 2.3, c=ORG)
    vdim(ex1(-2.9), py1(HW), py1(-HW), f"{fmt(WIDTH_IN * IN, 4)} (A)", left=True)
    vdim(ex1(FR) - 6, py1(79.8 / 2 * IN), py1(-79.8 / 2 * IN), "trocha 79,8″ (A)", left=True)
    for xin, ya, lab in ((163, 44.85 * IN, "89,7″ (B)"), (475, 47.1 * IN, "94,2″ (B)")):
        vdim(ex1(xc(xin)) + 3.3, py1(ya), py1(-ya), lab)
    vdim(ex1(FR) + 4, py1(-HW + 33 * IN), py1(-HW), "33″", left=False, size=2.0)
    hdim(ex1(FR), ex1(-2.0), py1(-1.55) + 2, f"bastidor {fmt(FRAME_IN * IN, 3)} (A)")
    hdim(ex1(MX), ex1(WELL), py1(-1.55) + 2, f"{fmt(76 * IN, 4)} (A)")

    # ── detalle 1:30 ─────────────────────────────────────────────────────────────────────────────────────────────────────
    K2, X2, PY2 = 1000 / 30, 14.0, 183.0

    def ex2(x):
        return X2 + (x + 9.45) * K2

    def py2(y):
        return PY2 - y * K2

    text(12, 112, "DETALLE A · CUADRO DE MANIOBRAS Y EQUIPOS DEL BASTIDOR  ·  escala 1:30", 3, weight="bold")
    add('<g clip-path="url(#cd)">')
    line(ex2(-9.45), PY2, ex2(-1.9), PY2, 0.15, "#888", "5 1 1 1")
    carrier(ex2, py2, K2)
    equipo(ex2, py2, K2, detalle=True)
    add("</g>")
    yb = py2(-1.45) + 3
    xs = (PTO_IN, 273, 332)
    for a_, b_ in zip(xs, xs[1:]):
        hdim(ex2(xc(a_)), ex2(xc(b_)), yb, f"{b_ - a_}″ ({fmt((b_ - a_) * IN, 3)} m) (B)")
    hdim(ex2(xc(332)), ex2(-2.0), yb + 9, f"{fmt(-2.0 - xc(332), 2)} m al fin del bastidor (derivado)")
    xr = ex2(-2.0) + 6
    vdim(xr, py2(HW), py2(-HW), f"{fmt(WIDTH_IN * IN, 4)} (A)", left=True)
    vdim(ex2(xc(332)) + 21 * IN * K2 + 3.5, py2(31.375 * IN), py2(-31.375 * IN), "1,594 (B)", size=2.2)
    vdim(ex2(xc(273)) + 21 * IN * K2 + 3.5, py2(29.875 * IN), py2(-29.875 * IN), "1,518 (B)", size=2.2)
    vdim(ex2(xc(376)) + 4, py2(0.83), py2(-0.83), "1,66 (B)", size=2.2)
    text(ex2(xc(226)), py2(-1.38), "−Y = lado conductor (cabina)", 2.2)

    # ── lista, verificación y notas (columna derecha) ────────────────────────────────────────────────────────────────────
    xl = 275
    text(xl, 112, "COMPONENTES", 3, weight="bold")
    leg = [
        "1  Motor Detroit S60 bajo capot (B)", "2  Transmisión Allison 4500 OFS (B/C)", "3  Caja angular 2,47:1 (B)",
        "4  Tanque hidráulico (B)", "5  Tanques de combustible ×2 (B)", "6  Cuadro de maniobras: laterales ±0,83 m (B)",
        "7  Tambor principal Ø42″ × 12″ (B)", "8  Tambor de pistoneo Ø42″ × 8″ (B)", "9  Eje de fuerza y cadena 140-2 (B/C)",
        "10 Malacate auxiliar 12.000 lb (C)", "11 Cilindros de izaje ×2, Ø9,42″ (A/C)",
    ]
    for i, t_ in enumerate(leg):
        text(xl, 117.5 + i * 4.1, t_, 2.3)
    ck = checks(prof, luz)
    y1 = 168
    text(xl, y1, "VERIFICACIÓN", 3, weight="bold")
    bad = ck["cil_tambor"] < 0.02
    rows = [
        (f"Cilindros (11) recogidos: perno a X = {fmt(ck['cil_x'], 2)} m (C).", False),
        (f"Luz al tambor principal (7): {fmt(ck['cil_tambor'], 2)} m", bad),
        ("→ INTERFERENCIA: en planta cilindro (y ±0,6 m)" if bad else "→ libra", bad),
        ("y brida del tambor (hasta ±0,80 m) se superponen.", bad),
    ]
    for i, (t_, b_) in enumerate(rows):
        text(xl, y1 + 5 + i * 4.1, t_, 2.3, c="#b00020" if b_ else "#111")
    y2 = 193
    text(xl, y2, "NOTAS Y FUENTES", 3, weight="bold")
    notes = [
        "Azul = posición y medida de manual (B),", "forma esquemática. Naranja punteado = C.",
        "Ejes y gatos: manual de partes (A/B). Ancho 102″", "y bastidor 40 ft: ficha del fabricante (A).",
        "Discos de freno Ø48,5″ y cárter de cadena: forma", "esquemática; posición lateral del modelo (C).",
        "Pose del mástil: foto de unidad similar (C).", "No se dibujan casilla, piso de enganche, líneas",
        "hidráulicas ni cables. Sin cargas ni cálculos.",
    ]
    for i, t_ in enumerate(notes):
        text(xl, y2 + 5 + i * 4.0, t_, 2.2)
    add('<rect x="275" y="270" width="135" height="18" fill="none" stroke="#111" stroke-width="0.4"/>')
    text(278, 276, "Equipo 10 · vista en planta", 3, weight="bold")
    text(278, 281, "Hoja A3 · 1:60 y 1:30 · cad/sk575/plano_montaje.py --hoja planta", 2.1)
    text(278, 285.5, "Estado: borrador de referencia · pose C pendiente", 2.3, c=ORG)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" '
            'font-family="Arial, Helvetica, sans-serif"><rect width="420" height="297" fill="#fff"/>' + "".join(s) + "</svg>"), ck


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--prof", type=float, default=1.25, help="espesor visible del mástil abatido (m), medido sobre foto")
    ap.add_argument("--luz", type=float, default=0.10, help="cara inferior del mástil sobre el techo de cabina (m)")
    ap.add_argument("--hoja", choices=("lateral", "planta"), default="lateral")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    a.out = a.out or ("docs/planos/equipo10-carrier-mastil-abatido.svg" if a.hoja == "lateral" else "docs/planos/equipo10-carrier-planta.svg")
    svg, ck = (build if a.hoja == "lateral" else build_planta)(a.prof, a.luz)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(svg)
    print(" ".join(f"{k}={v:.3f}" for k, v in ck.items()) + f" → {a.out}")
