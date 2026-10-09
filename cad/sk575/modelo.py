"""TACKER 10 (Service King SK-575, pulling/workover) — modelo CAD de referencia (build123d). NO es as-built.
Generado desde ~/cad/tacker10/tacker10.py; cada pieza se etiqueta con `comp()` = Component.id del visor.
Lo exporta cad/sk575/exportar.py (un GLB por componente, origen en la boca de pozo). Confianza por cota en
docs/pdf-review/informe-sk575-2026-10-09.md.
Documentado: mástil 31,7 m (tramo inferior 16,4 + superior 15,3).
Carrier y cuadro de maniobras: SK575 Parts & Service Manual (vista lateral p23, bastidor p19: 40 ft, 5 ejes) + spec sheet.
Plano LAYOUT-WS10-0001 (Layout Equipo TACKER TKR 10 RN119): carrier 18 m, subestructura 5 m, planchada 12 m,
anclajes de vientos a 27,4 m (lado carrier) / 24,4 m (lado planchada) y ±26,8 m laterales. Resto estimado por foto.
Manuales: BOP doble ram 11" 5M (Xinde 2FZ28-35II) + anular 11" 5M (FH28-35I); llave Gill 500; tubing 2-7/8" R2 (Tenaris);
línea 2" HM (planos L602); corona/aparejo/cuñas (presentaciones API 8A/8B); vientos, anclajes y pirosalva (Módulo Transporte y Montaje YPF).
Equipo = Service King SK-575, mástil SK 104-330-08 S/N DK-3033 (placa API 4F: 104', 8 líneas, 325.725 lb a 3,5° de la
vertical, base a 4'-0"; vientos A 3/4" / B 5/8" EEIPS). Corona: 4 poleas 24" + 30" línea rápida (spec sheet SK-575).
Plano TACKER 8123-1002-2611 (Equipo TKR10): piso 3606 [12'], piso de enganche 20629 [68'], mástil 31710 [104'].
Piso pulling: planos 8114-1006-0200/0201/0210/0212 (2600 × 3304, abertura 730 × 700). Escalera: EscaleraPisoPulling (45°, C 180).
Fuente: X:\\Mantenimiento WS\\Planos Tecnicos\\TKR-10 y ...\\COC's - Trazabilidad\\Equipos\\Rig TKR-10\\COC.
CAD: metros, X a lo largo del carrier (+X hacia el pozo), Y lateral, Z arriba. Salida: un GLB por material + STEP."""
from math import cos, pi, sin

from build123d import *

parts: dict[tuple, list] = {}


COMP = ["sk575_mastil"]                                                # componente activo (nodo raíz del GLB)


def comp(cid):
    """Las piezas que siguen pertenecen al componente `cid` (una unidad seleccionable del visor)."""
    COMP[0] = cid


def add(mat, *shapes):
    parts.setdefault((COMP[0], mat), []).extend(shapes)


def bar(a, b, r, sq=False, ang=None):
    """Barra entre dos puntos: tubo redondo (r = radio), cuadrado (r = medio lado) o ángulo L de ala 2r
    (ang = dirección hacia donde abren las alas; el vértice del L queda sobre el eje a→b)."""
    a, b = Vector(*a), Vector(*b)
    d = b - a
    al = (Align.CENTER, Align.CENTER, Align.MIN)
    if ang is None:
        s = Box(2 * r, 2 * r, d.length, align=al) if sq else Cylinder(r, d.length, align=al)
        return Plane(origin=a, z_dir=d) * s
    t = max(0.008, r * 0.18)                               # espesor del ala
    z = d.normalized()
    x = Vector(*ang) - z * Vector(*ang).dot(z)
    L = Pos(r, t / 2) * Rectangle(2 * r, t) + Pos(t / 2, r) * Rectangle(t, 2 * r)
    return Plane(origin=a, x_dir=x, z_dir=d) * extrude(L, d.length)


def manguera(a, b, c, r=0.035, n=12):
    """Manguera colgante: curva de Bézier cuadrática a→c con control b, en tramos con rótulas esféricas."""
    a, b, c = Vector(*a), Vector(*b), Vector(*c)
    pts = [a * (1 - t) ** 2 + b * 2 * t * (1 - t) + c * t * t for t in (i / n for i in range(n + 1))]
    for p, q in zip(pts, pts[1:]):
        add("goma", bar(p, q, r), Pos(q) * Sphere(r))


def box(x0, x1, y0, y1, z0, z1, f=0.0):
    b = Pos((x0 + x1) / 2, (y0 + y1) / 2, z0) * Box(x1 - x0, y1 - y0, z1 - z0, align=(Align.CENTER, Align.CENTER, Align.MIN))
    return fillet(b.edges(), f) if f else b


def railing(pts, h=1.1, step=1.2, mat="amarillo"):
    """Baranda: postes cada `step` + pasamanos a h y h/2 sobre una polilínea de puntos (x, y, z)."""
    for p, q in zip(pts, pts[1:]):
        p, q = Vector(*p), Vector(*q)
        n = max(1, round((q - p).length / step))
        for i in range(n + 1):
            c = p + (q - p) * (i / n)
            add(mat, bar(c, c + Vector(0, 0, h), 0.025))
        for k in (h, h / 2):
            add(mat, bar(p + Vector(0, 0, k), q + Vector(0, 0, k), 0.022))


def upn(a, b, abre, h=0.1, bw=0.05, t=0.0085):
    """Perfil C (UPN) de a a b; alma de alto h, alas de ancho bw hacia `abre` (vector ⟂ a a→b)."""
    a, b = Vector(*a), Vector(*b)
    sk = Rectangle(t, h) + Pos(bw / 2, (h - t) / 2) * Rectangle(bw, t) + Pos(bw / 2, -(h - t) / 2) * Rectangle(bw, t)
    return Plane(origin=a, x_dir=abre, z_dir=b - a) * extrude(sk, (b - a).length)


def stair(top, bottom, width, mat_str="rojo", paso=0.22):
    """Escalera recta entre top (x, y, z) y bottom (x, y, z) a lo largo de X; ancho en Y.
    Largueros C 180×50×4,76 (plano EscaleraPisoPulling), escalones de rejilla cada `paso` de alzada."""
    (xt, y, zt), (xb, _, zb) = top, bottom
    for dy in (-width / 2, width / 2):
        add(mat_str, upn((xt, y + dy, zt), (xb, y + dy, zb), (0, -1 if dy > 0 else 1, 0), h=0.18, t=0.00476))
    n = int((zt - zb) / paso)
    for i in range(1, n):
        t = i / n
        x, z = xt + (xb - xt) * t, zt + (zb - zt) * t
        add("grating", box(x - 0.13, x + 0.13, y - width / 2, y + width / 2, z, z + 0.04))
    for dy in (-width / 2, width / 2):
        railing([(xt, y + dy, zt), (xb, y + dy, zb)], h=0.95, step=1.4)


comp("sk575_mastil")
# ───────────────────────── mástil ─────────────────────────
MX = -1.0                      # centro del mástil en X
LEAN, ZB = 3.5, 48 * 0.0254            # placa API: 3,5° desde la vertical; base montada 4'-0" sobre el suelo
WXP = MX + 0.87 + 76 * 0.0254   # eje del pozo: 76" del pie delantero (SK DKA104-330-08, Derrick Info 3 p5)
ZP = 3.606                     # altura del piso de trabajo: 3606 [12'] (plano 8123-1002-2611)
H_INF, H_SUP, SOLAPE = 16.4, 15.2992, 1.0
H = H_INF + H_SUP


CARAS = (("Y",), ("Y", "X"), ("X", "Y"), ("Y",))        # caras cerradas que toca cada esquina


def tramo(z0, z1, w0, w1, n, r_pata, color_bajo=None, z_rojo=0.0):
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    sig = [(1, 1), (-1, 1), (-1, -1), (1, -1)]           # esquinas; cara +X (0-3) abierta
    nod = [[(MX + sx * (w0 + (w1 - w0) * (z - z0) / (z1 - z0)) / 2,
             sy * (w0 + (w1 - w0) * (z - z0) / (z1 - z0)) / 2, z) for sx, sy in sig] for z in zs]
    for i in range(n):
        mat = color_bajo if color_bajo and zs[i + 1] <= z_rojo + 0.01 else "amarillo"
        for c, (sx, sy) in enumerate(sig):
            # vértice del L en la esquina exterior, alas hacia adentro
            add(mat, bar(nod[i][c], nod[i + 1][c], r_pata, ang=(-sx, 0, 0) if sx * sy > 0 else (0, -sy, 0)))
        for a, b in ((0, 1), (1, 2), (2, 3)):            # 3 caras cerradas
            add(mat, bar(nod[i + 1][a], nod[i + 1][b], 0.04, ang=(0, 0, -1)))
            p, q = (a, b) if i % 2 else (b, a)
            add(mat, bar(nod[i][p], nod[i + 1][q], 0.035, ang=(0, 0, 1)))
        for c, caras in enumerate(CARAS):                # chapas de nudo
            x, y, z = nod[i + 1][c]
            for cara in caras:
                add(mat, Pos(x, y, z) * (Box(0.34, 0.012, 0.3) if cara == "Y" else Box(0.012, 0.34, 0.3)))
    add("amarillo", bar(nod[n][0], nod[n][3], 0.035))    # cierre arriba de la cara abierta
    return nod


inf = tramo(0, H_INF, 1.74, 1.50, 10, 0.075, "rojo", z_rojo=4.0)
sup = tramo(H_INF - SOLAPE, H, 1.30, 1.10, 9, 0.06)
for c in range(4):                                       # guías del telescópico
    add("amarillo", bar(inf[10][c], sup[0][c], 0.05, sq=True))

# corona en voladizo hacia el pozo: con el mástil inclinado, el centro de poleas queda a plomo sobre WXP (CG corona 76")
MC = MX + (WXP - MX - (H + 0.75 - ZB) * sin(LEAN * pi / 180)) / cos(LEAN * pi / 180)
add("rojo", box(MC - 0.9, MC + 0.9, -0.9, 0.9, H, H + 0.15, f=0.03))
for sx in (-0.7, 0.7):
    for sy in (-0.7, 0.7):
        add("rojo", bar((MC + sx, sy, H + 0.15), (MC + sx, sy, H + 1.7), 0.05, sq=True))
railing([(MC - 0.7, -0.7, H + 0.15), (MC + 0.7, -0.7, H + 0.15), (MC + 0.7, 0.7, H + 0.15),
         (MC - 0.7, 0.7, H + 0.15), (MC - 0.7, -0.7, H + 0.15)], h=1.5, step=0.7, mat="rojo")
def polea(x, y, z, r, e=0.09):
    """Polea con garganta (revolución) sobre eje Y."""
    pf = Pos(r * 0.55, 0) * Rectangle(r * 0.9, e)
    pf -= Pos(r, 0) * Circle(0.016)                                              # garganta ~1,33 d para cable 7/8"
    add("acero_oscuro", Pos(x, y, z) * Rot(-90, 0, 0) * revolve(fillet(pf.vertices().filter_by(lambda v: v.X < r * 0.95), 0.008), axis=Axis.Y))


for i, r in enumerate((0.305, 0.305, 0.305, 0.305, 0.381)):                    # SK-575: 24" ×4, 30" línea rápida
    polea(MC, -0.48 + 0.22 * i, H + 0.75, r)
add("acero", Pos(MC, 0, H + 0.75) * Rot(90, 0, 0) * Cylinder(0.05, 1.3))      # eje
for y in (-0.62, 0.62):                                                          # bancadas
    add("rojo", box(MC - 0.25, MC + 0.25, y - 0.05, y + 0.05, H + 0.15, H + 0.95, f=0.02))

for sy in (-0.5, 0.5):                                                         # ménsulas del voladizo
    add("rojo", bar((MX + 0.55, sy, H - 1.6), (MC + 0.85, sy, H), 0.05, sq=True))
    add("rojo", bar((MX + 0.55, sy, H), (MC + 0.85, sy, H), 0.06, sq=True))

# piso de enganche (monkey board) del lado +X, con cartel
ZM, XF = 20.629, MX + 0.68     # piso de enganche a 68' (plano 8123-1002-2611 / Engineering Report SK 2021)
add("grating", box(XF, XF + 1.9, -1.2, 1.2, ZM, ZM + 0.08, f=0.02))
for k in range(9):
    y = -1.0 + k * 0.25
    add("acero", bar((XF + 0.5, y, ZM + 0.08), (XF + 1.8, y, ZM + 0.08), 0.02))
railing([(XF, -1.2, ZM + 0.08), (XF + 1.9, -1.2, ZM + 0.08), (XF + 1.9, 1.2, ZM + 0.08), (XF, 1.2, ZM + 0.08)],
        h=1.1, step=0.95, mat="acero")
add("rojo", box(XF, XF + 2.2, -1.30, -1.25, ZM + 0.2, ZM + 1.15, f=0.01))
txt = extrude(Text("TACKER 10", font_size=0.5, font_style=FontStyle.BOLD), amount=0.02)
add("blanco", Pos(XF + 1.1, -1.30, ZM + 0.67) * Rot(90, 0, 0) * txt)

# luminarias: 5 debajo y 7 encima del piso de enganche (Libro DROPS)
for z in [7 + 2.4 * i for i in range(5)] + [ZM + 1.5 + 1.35 * i for i in range(7)]:
    w = 1.74 + (1.1 - 1.74) * z / H
    add("luz", Pos(MX + w / 2 - 0.25, -w / 2 + 0.15, z) * Cylinder(0.06, 0.8))
    add("acero_oscuro", Pos(MX + w / 2 - 0.25, -w / 2 + 0.15, z + 0.42) * Box(0.16, 0.16, 0.06))

# tablero rojo con cartelería en la base
add("rojo", box(MX - 0.6, MX + 0.6, -1.35, -0.9, 4.2, 6.3, f=0.03))
for z in (4.5, 5.2, 5.9):
    add("blanco", box(MX - 0.25, MX + 0.25, -1.37, -1.35, z, z + 0.45))

# inclinación del mástil hacia el pozo (placa API: 3,5° desde la vertical; base montada 4'-0" sobre el suelo).
# Todo lo agregado hasta acá es mástil: se rota en bloque; los puntos de mástil usados más abajo pasan por M().
for v in parts.values():
    v[:] = [Pos(MX, 0, ZB) * Rot(0, LEAN, 0) * Pos(-MX, 0, -ZB) * s for s in v]


def M(x, y, z):
    """Punto del mástil vertical → mástil inclinado."""
    a = LEAN * pi / 180
    return (MX + (x - MX) * cos(a) + (z - ZB) * sin(a), y, ZB - (x - MX) * sin(a) + (z - ZB) * cos(a))

comp("sk575_carrier")
# ───────────────────────── carrier ─────────────────────────
def perfil_c(x0, x1, y, z, h=0.3, b=0.08, t=0.012, abre=1):
    """Larguero en perfil C a lo largo de X; alas hacia `abre` (±1 en Y)."""
    sk = Rectangle(t, h) + Pos(abre * b / 2, (h - t) / 2) * Rectangle(b, t) + Pos(abre * b / 2, -(h - t) / 2) * Rectangle(b, t)
    return Plane(origin=(x0, y, z), x_dir=(0, 1, 0), z_dir=(1, 0, 0)) * extrude(sk, x1 - x0)


def rueda(w=0.42, re=0.55):
    """Neumático (revolución con flancos y surcos) + llanta con disco, aro y 10 tuercas. Eje = Y, cara exterior +Y.
    w = ancho de sección, re = radio exterior (385/65R22.5: 0,385 / 0,536; 11R22.5: 0,279 / 0,527)."""
    k = w / 0.42
    perfil = Pos(re - 0.105, 0) * Rectangle(0.21, w)
    neu = revolve(fillet(perfil.vertices(), 0.07 * min(1, k + 0.2)), axis=Axis.Y)
    for y in (-0.12, -0.04, 0.04, 0.12):                                  # surcos de la banda
        neu -= revolve(Pos(re, y * k) * Rectangle(0.03, 0.022), axis=Axis.Y)
    llanta = revolve(make_face(Polyline((0.07, 0.10 * k), (0.34, 0.10 * k), (0.34, 0.19 * k), (0.315, 0.19 * k), (0.315, 0.13 * k),
                                        (0.20, 0.13 * k), (0.13, 0.17 * k), (0.07, 0.17 * k), close=True)), axis=Axis.Y)
    tuercas = [Pos(0.14 * cos(a), 0.17 * k, 0.14 * sin(a)) * Rot(-90, 0, 0) * extrude(RegularPolygon(0.022, 6), 0.025)
               for a in (j * 2 * pi / 10 for j in range(10))]
    tapa = Pos(0, 0.17 * k, 0) * Rot(-90, 0, 0) * fillet(
        Cylinder(0.065, 0.05, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().filter_by(GeomType.CIRCLE), 0.015)
    return neu, [llanta, tapa] + tuercas


def gabinete(x0, x1, z1, rejillas=True, z0=1.62, hw=1.15):
    """Gabinete de chapa con juntas de paneles, rejillas de ventilación, bisagras, manijas y cáncamos."""
    g = box(x0, x1, -hw, hw, z0, z1, f=0.05)
    n = max(2, round((x1 - x0) / 0.8))
    for k in range(1, n):                                                 # juntas entre puertas
        x = x0 + (x1 - x0) * k / n
        for y in (-hw, hw):
            g -= box(x - 0.006, x + 0.006, y - 0.012, y + 0.012, z0 + 0.08, z1 - 0.08)
    if rejillas:
        for k in range(n):
            xc = x0 + (x1 - x0) * (k + 0.5) / n
            for j in range(6):
                for y in (-hw, hw):
                    g -= Pos(xc, y, z1 - 0.35 - j * 0.09) * Rot(35 * (1 if y > 0 else -1), 0, 0) * Box((x1 - x0) / n * 0.6, 0.06, 0.03)
    add("rojo", g)
    for k in range(n):
        xa = x0 + (x1 - x0) * k / n + 0.05
        xm = x0 + (x1 - x0) * (k + 1) / n - 0.12
        zm = (z0 + z1) / 2
        for y in (-hw - 0.015, hw + 0.015):
            for z in (z0 + 0.18, z1 - 0.25):
                add("acero_oscuro", Pos(xa, y, z) * Cylinder(0.018, 0.12))           # bisagras
            add("acero", bar((xm, y, zm - 0.12), (xm, y, zm + 0.12), 0.012))       # manija
    for x in (x0 + 0.15, x1 - 0.15):
        for y in (-0.9, 0.9):
            add("acero_oscuro", Pos(x, y, z1) * Rot(90, 0, 0) * Torus(0.05, 0.012))    # cáncamos


# Cotas del Parts & Service Manual SK575 (vista lateral dwg 03.06.01.01 p23, planta del bastidor 03.02.01.01 p19), medidas en
# pulgadas desde la cara delantera del bastidor (X) y sobre el suelo (H). Bastidor 480" (40 ft), ancho 102", cubierta a 53".
IN = 0.0254
FR = -2.0 - 480 * IN                                                   # cara delantera del bastidor (la trasera queda en −2,0)


def xc(xin):
    return FR + xin * IN


ZK = 53 * IN                                                           # cubierta
HW = 51 * IN                                                           # medio ancho
# bastidor: largueros C 13,2" (exterior 34") + travesaños C
for y, a in ((-0.39, 1), (0.39, -1)):
    add("acero_oscuro", perfil_c(FR, -2.0, y, ZK - 0.045 - 0.168, h=0.335, b=0.09, abre=a))
for k in range(12):
    x = FR + 0.3 + k * (480 * IN - 0.6) / 11
    add("acero_oscuro", Plane(origin=(x, -0.38, ZK - 0.213), x_dir=(1, 0, 0), z_dir=(0, 1, 0)) * extrude(
        Rectangle(0.012, 0.25) + Pos(0.04, 0.119) * Rectangle(0.08, 0.012) + Pos(0.04, -0.119) * Rectangle(0.08, 0.012), 0.76))
# cubierta antideslizante con borde en L, detrás de la cabina
add("acero", box(xc(60), -2.0, -HW, HW, ZK - 0.045, ZK))
for y in (-HW, HW):
    add("acero_oscuro", bar((xc(60), y, ZK), (-2.0, y, ZK), 0.04, ang=(0, -1 if y > 0 else 1, -1)))
# paragolpes con ganchos y planchuelas de remolque
add("acero_oscuro", box(FR - 0.25, FR, -1.2, 1.2, 0.72, 1.08, f=0.04))
for y in (-0.7, 0.7):
    add("acero", Pos(FR - 0.28, y, 0.9) * Rot(0, 90, 0) * Torus(0.07, 0.02))
    add("acero_oscuro", box(FR - 0.45, FR - 0.25, y - 0.03, y + 0.03, 0.8, 1.0))

# media cabina (one-man cab) X 0–60, H 55–114, ancho 33" lado conductor (−Y)
YC0, YC1 = -HW, -HW + 33 * IN
cab = extrude(Plane.XZ * make_face(Polyline((xc(0), 55 * IN), (xc(60), 55 * IN), (xc(60), 114 * IN), (xc(8), 114 * IN),
                                            (xc(0), 98 * IN), close=True)), amount=YC1 - YC0)
cab = Pos(0, YC1, 0) * cab
cab = fillet(cab.edges(), 0.06)
cab -= box(xc(22), xc(52), YC0 - 0.03, YC0 + 0.03, 2.05, 2.75, f=0.01)                    # ventana de la puerta
cab -= box(xc(22), xc(52), YC1 - 0.03, YC1 + 0.03, 2.05, 2.75, f=0.01)
cab -= box(xc(60) - 0.03, xc(60) + 0.03, YC0 + 0.12, YC1 - 0.12, 2.1, 2.75, f=0.01)        # luneta
for x0_, x1_, z0_, z1_ in ((xc(20), xc(55), 1.47, 1.485), (xc(20), xc(55), 2.85, 2.865), (xc(20), xc(20) + 0.015, 1.47, 2.86),
                           (xc(55) - 0.015, xc(55), 1.47, 2.86)):
    cab -= box(x0_, x1_, YC0 - 0.015, YC0 + 0.015, z0_, z1_)                              # junta de puerta
add("rojo", cab)
for y in (YC0 + 0.005, YC1 - 0.025):
    add("vidrio", box(xc(22.3), xc(51.7), y, y + 0.02, 2.06, 2.74, f=0.006))
add("vidrio", box(xc(60) - 0.02, xc(60), YC0 + 0.13, YC1 - 0.13, 2.11, 2.74))
n_ws = Vector(-16, 0, 8).normalized()                                                  # parabrisas sobre el plano inclinado
add("vidrio", Plane(origin=(xc(4) + n_ws.X * 0.012, (YC0 + YC1) / 2, 106 * IN), x_dir=(0, 1, 0), z_dir=n_ws)
    * fillet(Box(0.7, 0.36, 0.02).edges(), 0.008))
add("acero", bar((xc(48), YC0 - 0.02, 1.95), (xc(52), YC0 - 0.02, 1.95), 0.014))        # manija
add("acero_oscuro", bar((xc(4), YC0, 2.6), (xc(-6), YC0 - 0.3, 2.6), 0.02))               # espejo California
add("acero_oscuro", Pos(xc(-6), YC0 - 0.32, 2.4) * fillet(Box(0.07, 0.2, 0.45).edges(), 0.025))
for z in (0.62, 0.95, 1.25):                                                           # escalones de la cabina
    add("grating", box(xc(30), xc(46), YC0 - 0.12, YC0 + 0.1, z, z + 0.035, f=0.01))
for y in (YC0 + 0.15, YC1 - 0.15):
    add("acero_oscuro", box(FR - 0.02, FR + 0.06, y - 0.12, y + 0.12, 1.5, 1.7, f=0.02))
    add("luz", Pos(FR - 0.025, y, 1.6) * Rot(0, 90, 0) * Cylinder(0.075, 0.02))
for y in (YC0 + 0.2, YC1 - 0.2):
    add("luz", Pos(xc(10), y, 114 * IN + 0.025) * Box(0.08, 0.12, 0.05))
# filtro de aire Donaldson y caja de baterías al lado de la cabina (+Y)
add("acero_oscuro", Pos(xc(30), 0.8, 1.4) * fillet(Cylinder(0.2, 0.9, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.04))
add("rojo", box(xc(5), xc(25), 0.2, 1.2, 1.15, 1.55, f=0.02))

# apoyo del mástil (headache rack) X 64, tope a 121"
for y in (-1.05, 1.05):
    add("rojo", bar((xc(64), y, ZK - 0.2), (xc(64), y, 121 * IN), 0.07, sq=True))
    add("rojo", bar((xc(64), y, 2.2), (xc(80), y * 0.8, ZK), 0.035, sq=True))
add("rojo", box(xc(64) - 0.12, xc(64) + 0.12, -1.15, 1.15, 121 * IN - 0.15, 121 * IN, f=0.02))
for s_ in (-1, 1):
    add("goma", Plane(origin=(xc(64), s_ * 0.35, 121 * IN + 0.06), x_dir=(0, 1, 0), z_dir=(0, -s_ * 0.6, 0.8)) * Box(0.6, 0.25, 0.04))
# radiador X 65–88 con rejilla y motor Detroit S60 bajo capot X 85–156 (tope 114")
add("acero_oscuro", box(xc(66), xc(72), -0.65, 0.65, ZK, 2.75, f=0.02))
for k in range(12):
    add("acero", box(xc(65.5), xc(66), -0.6, 0.6, ZK + 0.1 + k * 0.11, ZK + 0.14 + k * 0.11))
gabinete(xc(85), xc(156), 114 * IN, z0=ZK, hw=1.15)
txt = extrude(Text("TACKER 10", font_size=0.3, font_style=FontStyle.BOLD), amount=0.015)
add("blanco", Pos((xc(85) + xc(156)) / 2, -1.165, 2.2) * Rot(90, 0, 0) * txt)
add("acero", bar((xc(150), 0.85, 114 * IN), (xc(150), 0.85, 3.9), 0.065))                 # escape con mata-chispas
add("acero_oscuro", Pos(xc(150), 0.85, 3.2) * (Cylinder(0.16, 0.9) - Cylinder(0.145, 1.0)))
add("acero_oscuro", Pos(xc(150), 0.85, 3.9) * Cylinder(0.085, 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)))
# transmisión Allison 4500 OFS (X 134–156) → cardán → caja angular 2,47:1 (salida X 235, H 61) bajo el tanque hidráulico
add("acero_oscuro", Pos(xc(160), 0, 1.5) * Rot(0, 90, 0) * fillet(Cylinder(0.28, 0.25).edges(), 0.04))
add("acero_oscuro", bar((xc(165), 0, 1.5), (xc(212), 0, 1.55), 0.045))
for x in (xc(165), xc(212)):
    add("acero", Pos(x, 0, 1.5) * Rot(0, 90, 0) * Cylinder(0.08, 0.05))                  # crucetas
add("azul", box(xc(212), xc(240), -0.42, 0.42, ZK, 1.95, f=0.04))                       # caja angular
add("azul", Pos(xc(235), 0.5, 61 * IN) * Rot(90, 0, 0) * Cylinder(0.12, 0.16))
# tanque hidráulico X 204–243, H 80–109, sobre patas
add("rojo", box(xc(204), xc(243), -0.85, 0.15, 80 * IN, 109 * IN, f=0.03))
for x in (xc(206), xc(241)):
    for y in (-0.8, 0.1):
        add("rojo", bar((x, y, ZK), (x, y, 80 * IN), 0.03, sq=True))
add("vidrio", box(xc(208), xc(209), -0.865, -0.85, 2.15, 2.65))                        # visor de nivel
add("acero", Pos(xc(238), -0.4, 109 * IN) * Cylinder(0.08, 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)))
# tanques de combustible bajo la cubierta X 195–239, H 29–47 (uno por lado) con zunchos
for s in (-1, 1):
    add("aluminio", Pos((xc(195) + xc(239)) / 2, s * 1.0, 38 * IN) * Rot(0, 90, 0) * fillet(Cylinder(9 * IN, 44 * IN).edges(), 0.06))
    for x in (xc(202), xc(232)):
        add("acero_oscuro", Pos(x, s * 1.0, 38 * IN) * Rot(0, 90, 0) * (Cylinder(9 * IN + 0.012, 0.05) - Cylinder(9 * IN, 0.1)))
# tanques de aire, cajas de herramientas (2) y caja de baterías bajo la cubierta
for y in (-0.15, 0.15):
    add("acero", Pos(xc(270), y, 0.82) * Rot(0, 90, 0) * fillet(Cylinder(0.13, 1.1).edges().filter_by(GeomType.CIRCLE), 0.05))
for s in (-1, 1):
    tb = box(xc(244), xc(282), min(s * 0.62, s * HW), max(s * 0.62, s * HW), 0.75, ZK - 0.06, f=0.02)
    tb -= box(xc(245), xc(281), s * HW - 0.006, s * HW + 0.006, ZK - 0.16, ZK - 0.155)
    add("rojo", tb)
    add("acero", bar((xc(258), s * (HW + 0.01), 1.05), (xc(268), s * (HW + 0.01), 1.05), 0.012))
add("rojo", box(xc(170), xc(190), 0.55, HW, 0.8, ZK - 0.06, f=0.02))                   # baterías

# pasarelas X 194–480 con baranda a 42" de la cubierta; escalera de acceso
railing([(xc(194), -HW, ZK), (xc(220), -HW, ZK)], h=42 * IN, step=1.2)
railing([(xc(194), HW, ZK), (-2.4, HW, ZK)], h=42 * IN, step=1.3)
stair((xc(194), -1.65, ZK), (xc(194) - ZK, -1.65, 0.0), 0.7, paso=0.2)

# ───────────────────────── tren rodante: 5 ejes (Parts Manual p23) ─────────────────────────
# Direccionales X 74,7 / 124,6 (Ø ext. 44,7", trocha 79,8"), tándem trasero X 327,9 / 381,9 con walking beam,
# eje tag X 435,6 (25.000 lb, bolsas de aire). Neumáticos 385/65R22.5 adelante, 11R22.5 duales atrás.
XF1, XF2, XR1, XR2, XE = xc(74.7), xc(124.6), xc(327.9), xc(381.9), xc(435.6)
XT = (XR1 + XR2) / 2
REF, RET = 44.7 / 2 * IN, 0.52
neu_d, met_d = rueda(0.385, REF)
neu_t, met_t = rueda(0.279, RET)
for x, (neu, met), ys, ze in ((XF1, (neu_d, met_d), (79.8 / 2 * IN,), REF), (XF2, (neu_d, met_d), (79.8 / 2 * IN,), REF),
                              *[(x, (neu_t, met_t), (0.82, 1.13), RET) for x in (XR1, XR2, XE)]):
    for s in (-1, 1):
        lado = Rot(0, 0, 180) if s < 0 else Rot(0, 0, 0)
        for y in ys:
            add("goma", Pos(x, s * y, ze) * lado * neu)
            add("acero", *[Pos(x, s * y, ze) * lado * m for m in met])
    if len(ys) == 1:                                                  # eje delantero (viga I) + elásticos + guardabarros
        add("acero_oscuro", bar((x, -0.85, ze), (x, 0.85, ze), 0.06, sq=True))
        for s in (-1, 1):
            for j in range(6):
                L = 1.3 - j * 0.16
                add("acero_oscuro", box(x - L / 2, x + L / 2, s * 0.39 - 0.045, s * 0.39 + 0.045,
                                        ze + 0.12 + j * 0.022, ze + 0.14 + j * 0.022, f=0.004))
            for dx in (-0.65, 0.65):
                add("acero", Pos(x + dx, s * 0.39, ze + 0.13) * Rot(90, 0, 0) * Cylinder(0.035, 0.1))
                add("acero_oscuro", bar((x + dx, s * 0.39, ze + 0.13), (x + dx * 1.05, s * 0.39, ZK - 0.3), 0.025))
            add("rojo", Pos(x, s * 1.01, ze) * fillet(((Rot(90, 0, 0) * Cylinder(REF + 0.13, 0.48) - Rot(90, 0, 0) * Cylinder(REF + 0.09, 0.6))
                                                     & Pos(0, 0, 0.5) * Box(2, 1, 1)).edges(), 0.012))
    else:
        add("acero_oscuro", bar((x, -1.0, ze), (x, 1.0, ze), 0.065))
        if x != XE:
            add("acero_oscuro", Pos(x, 0.12, ze) * Sphere(0.23))
add("acero_oscuro", bar((xc(240), 0.12, 1.2), (XR1, 0.12, RET), 0.05))                 # cardán a los traseros
add("acero_oscuro", bar((XR1, 0.12, RET), (XR2, 0.12, RET), 0.045))
for s in (-1, 1):
    wb = box(XR1 - 0.18, XR2 + 0.18, s * 0.52 - 0.07, s * 0.52 + 0.07, RET - 0.14, RET + 0.14, f=0.04)   # walking beam
    add("acero_oscuro", wb - Pos(XT, s * 0.52, RET) * Rot(90, 0, 0) * Cylinder(0.07, 0.3))
    add("acero", Pos(XT, s * 0.52, RET) * Rot(90, 0, 0) * Cylinder(0.065, 0.24))
    add("acero_oscuro", box(XT - 0.2, XT + 0.2, s * 0.45 - 0.1, s * 0.45 + 0.1, RET + 0.06, ZK - 0.38, f=0.02))
    for x in (XE - 0.15, XE + 0.15):                                    # bolsas de aire del eje tag
        add("goma", Pos(x, s * 0.52, RET + 0.08) * fillet(Cylinder(0.13, 0.26, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.05))
    add("goma", box(XR1 - 0.75, XR1 - 0.73, s * 0.97 - 0.3, s * 0.97 + 0.3, 0.25, ZK - 0.1))  # barrero

# gatos de nivelación hidráulicos 4" × 18": X 163 (89,7" entre ejes) y X 479 (94,2"); T-sill bajo el pie del mástil
for x, y in ((xc(163), 44.85 * IN), (xc(163), -44.85 * IN), (xc(475), 47.1 * IN), (xc(475), -47.1 * IN)):
    add("rojo", box(x - 0.12, x + 0.12, min(0.39 * y / abs(y), y * 1.08), max(0.39 * y / abs(y), y * 1.08), ZK - 0.4, ZK - 0.08))
    add("acero_oscuro", bar((x, y, ZK - 0.4), (x, y, 0.5), 0.09))
    add("acero", bar((x, y, 0.5), (x, y, 0.1), 0.055))
    add("acero_oscuro", fillet(box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, 0.05, 0.1).edges(), 0.01))
XTS = WXP - 72 * IN                                                       # zapatas a 6 ft del pozo (Rig Up p2)
add("rojo", fillet(box(XTS - 0.18, XTS + 0.18, -1.22, 1.22, 0, 0.3).edges(), 0.02))
for y in (-0.87, 0.87):
    add("acero_oscuro", box(XTS - 0.25, XTS + 0.25, y - 0.25, y + 0.25, 0.3, 0.34))
    add("acero", bar((XTS, y, 0.34), M(XTS, y, ZB), 0.089))                                # gato de tornillo Ø7"
    add("acero_oscuro", Pos(XTS, y, 0.75) * Box(0.3, 0.3, 0.05))

comp("sk575_cuadro")
# ───────────────────────── cuadro de maniobras DWA575-01 (X 226–376, hasta H 110") ─────────────────────────
# Principal 42 × 12 (barril 16" × 38,75", eje 6,6", embrague Wichita ATD-324-H, 2 discos Kobelt 48" a aire),
# pistoneo 42 × 8 (barril 16" × 43,75", eje 5,9", ATD-224-H, cable 9/16"). Doble cadena 140-2: caja angular →
# eje de fuerza (X 235, H 61) → pistoneo (X 273) → principal (X 332), centros a H 84.
XD, ZD = xc(332), 84 * IN
XS, ZS = xc(273), 84 * IN
XPW, ZPW = xc(235), 61 * IN


def tambor(x, z, barril, freno, eje, vueltas, cab_r):
    rb, rf = 8 * IN, 21 * IN
    add("acero_oscuro", Pos(x, 0, z) * Rot(90, 0, 0) * Cylinder(rb, barril * IN))
    for s in (-1, 1):
        yc = s * (barril + freno) / 2 * IN
        llanta = Rot(90, 0, 0) * (Cylinder(rf, freno * IN) - Cylinder(rf - 0.05, freno * IN + 0.1))
        llanta += Rot(90, 0, 0) * Pos(0, 0, -s * (freno * IN / 2 - 0.02)) * Cylinder(rf, 0.04)
        add("acero", Pos(x, yc, z) * fillet(llanta.edges().filter_by(GeomType.CIRCLE), 0.006))
        banda = Rot(90, 0, 0) * (Cylinder(rf + 0.018, freno * IN * 0.9) - Cylinder(rf + 0.003, 1))
        add("acero_oscuro", Pos(x, yc, z) * (banda - Pos(0, 0, -rf) * Box(0.25, 1, 0.3)))
        add("acero_oscuro", Pos(x - 0.13, yc, z - rf - 0.06) * Box(0.08, freno * IN * 0.8, 0.1))
        add("acero", bar((x - 0.13, yc, z - rf - 0.06), (x - 0.13, yc, z - rf - 0.2), 0.012))          # spray de agua
    n = int(barril * IN / (2 * cab_r))
    for j in range(vueltas):                                            # capa de cable + vuelta marcada cada 4 (liviano)
        rr = rb + cab_r + j * 2 * cab_r * 0.87
        add("cable", Pos(x, 0, z) * Rot(90, 0, 0) * Cylinder(rr + cab_r * 0.6, barril * IN - 2 * cab_r))
        for k in range(0, n, 4):
            add("cable", Pos(x, (-barril * IN / 2 + cab_r + k * 2 * cab_r), z) * Rot(90, 0, 0) * Torus(rr, cab_r))
    add("acero", Pos(x, 0, z) * Rot(90, 0, 0) * Cylinder(eje * IN / 2, 1.9))
    for s in (-1, 1):
        add("acero_oscuro", Pos(x, s * 0.88, z) * fillet(box(-0.17, 0.17, -0.06, 0.06, -0.14, 0.12).edges(), 0.015))


tambor(XD, ZD, 38.75, 12, 6.6, 2, 0.0127)
tambor(XS, ZS, 43.75, 8, 5.9, 3, 0.0071)
add("acero", Pos(XPW, 0, ZPW) * Rot(90, 0, 0) * Cylinder(0.05, 1.8))                       # eje de fuerza
for s in (-1, 1):                                                         # laterales con alivianamientos
    lat = box(xc(226), xc(376), s * 0.83 - 0.02, s * 0.83 + 0.02, ZK, 110 * IN, f=0.015)
    for x, z in ((xc(302), 1.75), (xc(302), 2.5), (xc(358), 1.72), (xc(248), 2.45)):
        lat -= Pos(x, s * 0.83, z) * Rot(90, 0, 0) * Cylinder(0.1, 0.2)
    add("rojo", lat)
add("rojo", box(xc(374), xc(376), -0.83, 0.83, ZK, 1.9))
for y in (-0.93, -1.0):                                                   # 2 discos Kobelt 48" + calipers
    add("acero", Pos(XD, y, ZD) * Rot(90, 0, 0) * (Cylinder(24 * IN, 0.025) - Cylinder(0.1, 0.1)))
    for a in (60, 120):
        add("rojo", Pos(XD + 24 * IN * cos(a * pi / 180), y, ZD + 24 * IN * sin(a * pi / 180)) * Box(0.16, 0.06, 0.12))
add("acero_oscuro", Pos(XD, -0.965, ZD) * Rot(90, 0, 0) * Cylinder(0.14, 0.11))
cc = box(xc(226), xc(350), 0.86, 1.02, ZK + 0.05, 2.75, f=0.05)                           # cárter de cadena (baño de aceite)
for x, z in ((XD, ZD), (XS, ZS)):
    cc -= Pos(x, 1.03, z) * Rot(90, 0, 0) * Cylinder(0.1, 0.04)
add("rojo", cc)
for x, z, w in ((XD, ZD, 0.18), (XS, ZS, 0.14)):                                          # embragues neumáticos 24"
    add("acero_oscuro", Pos(x, 1.04 + w / 2, z) * Rot(90, 0, 0) * fillet(Cylinder(12 * IN, w).edges(), 0.02))
    add("goma", Pos(x, 1.04 + w + 0.02, z) * Rot(90, 0, 0) * Cylinder(0.09, 0.04))
for x, z in ((XD, ZD), (XS, ZS)):                                                         # palancas de freno (lado perforador −Y)
    add("acero_oscuro", bar((x - 0.15, -1.12, z - 0.5), (x + 0.55, -1.15, z + 0.55), 0.025))
    add("goma", Pos(x + 0.58, -1.15, z + 0.6) * Sphere(0.045))
# consola del perforador junto al mástil (lado −Y)
add("rojo", box(-3.4, -3.0, -1.28, -0.85, ZK, 2.35, f=0.03))
pan = Plane(origin=(-3.2, -1.06, 2.55), x_dir=(0, 1, 0), z_dir=(0.6, 0, 0.8))
add("acero_oscuro", pan * Box(0.5, 0.45, 0.05))
for i in range(6):
    add("blanco", pan * Pos(-0.15 + 0.15 * (i % 3), -0.1 + 0.18 * (i // 3), 0.03) * Cylinder(0.055, 0.015))
for j in range(4):
    add("acero", bar((-3.05, -1.2 + 0.12 * j, 2.35), (-2.9, -1.2 + 0.12 * j, 2.6), 0.012))
    add("rojo" if j == 0 else "goma", Pos(-2.9, -1.2 + 0.12 * j, 2.62) * Sphere(0.028))
# malacate auxiliar Braden 12.000 lb
add("acero_oscuro", Pos(-2.6, 0.95, ZK + 0.25) * Rot(90, 0, 0) * Cylinder(0.11, 0.3))
for y in (0.78, 1.12):
    add("rojo", Pos(-2.6, y, ZK + 0.25) * Rot(90, 0, 0) * Cylinder(0.2, 0.03))
add("rojo", box(-2.85, -2.35, 0.75, 1.15, ZK, ZK + 0.06))
add("acero_oscuro", Pos(-2.6, 1.2, ZK + 0.25) * Rot(90, 0, 0) * Cylinder(0.08, 0.12))
# líneas de la corona: rápida (tambor → polea 30"), pistoneo 9/16" y muerta al ancla de la base del mástil
add("cable", bar((XD + 0.24, 0.35, ZD + 0.1), M(MC - 0.381, 0.40, H + 0.75), 0.0127))
add("cable", bar((XS + 0.24, -0.4, ZS + 0.12), M(MC - 0.305, -0.48, H + 0.75), 0.0071))
add("cable", bar(M(MC + 0.305, -0.26, H + 0.75), M(MX + 0.55, -0.55, 3.0), 0.0127))
add("acero_oscuro", Pos(*M(MX + 0.55, -0.55, 2.8)) * Rot(90, 0, 0) * fillet(Cylinder(0.2, 0.12).edges(), 0.02))
comp("sk575_izaje")
# cilindros de izaje HYCO 50162-813-13150 = SK DK50162 (plano PISTON TKR 10 "CYL, SATEL W/LAST STAGE DA", Hydraulics p3):
# camisa Ø9,42" con glándula Ø10,00"; etapas Ø8,12 / 7,00 / 4,00" (último doble efecto) con carreras 42,82 / 44,07 / 44,62"
# (total 131,5"); cerrado 60,00" → extendido 191,50" entre pernos; D 3,12"; ojos con perno Ø1,77", R 1,75", ancho 2,00";
# base 2,25"; cabezal del émbolo Ø3,69"; puertos 1/2" NPTF extender (base) / retraer (cabezal); 2000 psi → 103.697 lb.


def izaje(base, top):
    u = (top - base).normalized()
    L = Plane(origin=base, x_dir=(0, 1, 0), z_dir=u).location               # eje local z = eje del cilindro, perno en x (= Y)

    def seg(a_, b_, d, mat):                                            # tramo cilíndrico entre a_ y b_ pulgadas, Ø d"
        add(mat, L * Pos(0, 0, a_ * IN) * fillet(Cylinder(d / 2 * IN, (b_ - a_) * IN, align=(Align.CENTER, Align.CENTER, Align.MIN))
                                                  .edges(), min(0.004, d / 2 * IN * 0.2)))

    def ojo(z, mat):                                                    # ojo de perno: placa ancho 2,00", R 1,75", agujero Ø1,77"
        o = Rot(0, 90, 0) * (Cylinder(1.75 * IN, 2.0 * IN) - Cylinder(1.77 / 2 * IN, 3 * IN))
        o += Pos(0, 0, (1.75 if z == 0 else -1.75) * IN / 2) * Box(2.0 * IN, 3.5 * IN, 1.75 * IN)
        add(mat, L * Pos(0, 0, z * IN) * o)
        add("acero", L * Pos(0, 0, z * IN) * Rot(0, 90, 0) * Cylinder(1.77 / 2 * IN, 4.5 * IN))   # perno

    ojo(0, "acero_oscuro")
    seg(1.75, 2.25, 4.0, "acero_oscuro")
    seg(2.25, 4.5, 10.0, "acero_oscuro")                                # tapa de base
    seg(4.5, 54.6, 9.42, "rojo")                                        # camisa
    seg(54.6, 56.88, 10.0, "acero_oscuro")                              # glándula de la camisa
    z = 56.88
    for d, c, dg in ((8.12, 42.82, 8.62), (7.00, 44.07, 7.5), (4.00, 44.62, None)):   # etapas cromadas + glándulas
        seg(z - 2, z + c - (1.5 if dg else 0), d, "acero")
        if dg:
            seg(z + c - 1.5, z + c, dg, "acero_oscuro")
        z += c
    seg(z, 191.5 - 1.75, 3.69, "acero_oscuro")                          # cabezal del émbolo
    ojo(191.5, "acero_oscuro")
    for zp, tipo in ((6.8, "ext"), (z + 0.8, "ret")):                   # puertos 1/2" NPTF con codo y manguera
        r = (9.42 if tipo == "ext" else 3.69) / 2 * IN
        add("acero", L * Pos(0, -r - 0.02, zp * IN) * Rot(90, 0, 0) * Cylinder(0.018, 0.04))
        if tipo == "ext":
            p0 = L * Pos(0, -r - 0.04, zp * IN)
            p0 = p0.position
            manguera(tuple(p0), (p0.X - 0.3, p0.Y, ZK + 0.15), (p0.X - 0.7, p0.Y, ZK + 0.03), r=0.014, n=6)
    add("acero", L * Pos(0.0, 9.42 / 2 * IN + 0.01, 52.0 * IN) * Rot(-90, 0, 0) * Cylinder(0.008, 0.03))   # purga 1/8" NPT


for y in (-0.6, 0.6):
    top = Vector(*M(-1.85, y, 6.4))
    u = (top - Vector(-4.6, y, 1.7)).normalized()
    pie = top - u * (191.5 * IN)
    for dy in (-1.2, 1.2):                                              # orejas del pedestal a ambos lados del ojo
        add("rojo", box(pie.X - 0.1, pie.X + 0.1, y + dy * IN - 0.01, y + dy * IN + 0.01, ZK, pie.Z + 0.06, f=0.004))
    add("rojo", box(pie.X - 0.16, pie.X + 0.16, y - 0.09, y + 0.09, ZK, ZK + 0.04))
    for dy in (-1.2, 1.2):                                              # orejas en el mástil
        add("amarillo", Pos(top + Vector(0, dy * IN, 0)) * Box(0.14, 0.02, 0.14))
    izaje(pie, top)

comp("sk575_aparejo")
# ───────────────────────── aparejo y cables ─────────────────────────
ZA = 14.0
# aparejo-gancho unitizado (6 CORONAS Y APAREJOS p48-52): poleas con tapa redondeada, carcasa con resorte, gancho con traba
tapa = Pos(WXP, 0, ZA + 0.55) * Rot(90, 0, 0) * (Cylinder(0.38, 0.5) & Pos(0, -0.4, 0) * Box(1, 1.2, 1))
add("amarillo", fillet(tapa.edges(), 0.04))
add("amarillo", box(WXP - 0.2, WXP + 0.2, -0.26, 0.26, ZA - 0.05, ZA + 0.55, f=0.04))
for y in (-0.18, -0.06, 0.06, 0.18):                                           # 4 poleas: 8 líneas (placa 104-330-08)
    add("acero_oscuro", Pos(WXP, y, ZA + 0.55) * Rot(90, 0, 0) * Cylinder(0.33, 0.08))
add("amarillo", Pos(WXP, 0, ZA - 0.75) * fillet(Cylinder(0.17, 0.7, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.04))   # carcasa gancho
add("acero", bar((WXP, 0, ZA - 0.75), (WXP, 0, ZA - 1.0), 0.07))
gancho = Pos(WXP, 0, ZA - 1.2) * Rot(90, 0, 0) * (Torus(0.17, 0.055) - Pos(0.2, 0, 0) * Box(0.25, 0.3, 0.3))
add("acero_oscuro", gancho)
add("acero", bar((WXP + 0.12, 0, ZA - 1.08), (WXP + 0.05, 0, ZA - 1.33), 0.012))                    # traba (latch)
# asas del gancho + amelas 150 t (Ø 3", largo útil 73", ojo sup. 3-1/2") + elevador de cierre central (paso 3-7/32",
# tubing 2-7/8") — planillas de inspección TKR-10 (API RP 8B / SPEC 8C)
LA, RA = 73 * 0.0254, 1.5 * 0.0254
ZT = ZA - 1.04                                                                  # apoyo del ojo superior en la asa
ZE_ = ZT - LA                                                                   # fondo interior del ojo inferior


def amela(y0, y1):
    """Amela: ojo superior alargado + cuerpo Ø3" + ojo inferior redondo, en el plano XZ (cruza la asa del gancho)."""
    eje = Rot(0, 0, 90) * (SlotCenterToCenter(0.26, 0.09 + 2 * RA) - SlotCenterToCenter(0.26, 0.09))
    add("acero", Pos(WXP, y0, ZT - 0.17) * (Plane.XZ * extrude(eje, RA, both=True)))
    add("acero", bar((WXP, y0, ZT - 0.17 - 0.13 - 0.045 - RA), (WXP, y1, ZE_ + 0.13 + RA), RA))
    add("acero", Pos(WXP, y1, ZE_ + 0.065) * Rot(90, 0, 0) * Torus(0.065 + RA, RA))


for s_ in (-1, 1):
    add("acero_oscuro", Pos(WXP, s_ * 0.2, ZA - 1.0) * Rot(0, 90, 0) * Torus(0.06, 0.02))
    amela(s_ * 0.2, s_ * 0.29)
ZEL = ZE_ - 0.02                                                                # eje de las asas del elevador
cuerpo = fillet(box(WXP - 0.2, WXP + 0.2, -0.24, 0.24, ZEL - 0.32, ZEL - 0.02).edges(), 0.04)
cuerpo -= Pos(WXP, 0, ZEL - 0.5) * Cylinder(3.219 / 2 * 0.0254, 1.0)               # paso 3-7/32"
cuerpo -= Pos(WXP, 0, ZEL - 0.02) * Cone(0.041, 0.09, 0.08, align=(Align.CENTER, Align.CENTER, Align.MAX))   # bisel de entrada
cuerpo -= box(WXP - 0.21, WXP + 0.21, -0.003, 0.003, ZEL - 0.33, ZEL - 0.06)       # junta de las dos mitades
add("acero_oscuro", cuerpo)
for s_ in (-1, 1):                                                              # asas (ojales Ø 2-7/8") con seguro
    add("acero_oscuro", Pos(WXP, s_ * 0.29, ZEL) * Rot(0, 90, 0) * Torus(0.045, 0.022))
    add("acero_oscuro", box(WXP - 0.03, WXP + 0.03, s_ * 0.22 - 0.03, s_ * 0.22 + 0.03, ZEL - 0.1, ZEL - 0.02))
    add("acero", Pos(WXP + 0.07, s_ * 0.29, ZEL) * Rot(0, 90, 0) * Cylinder(0.008, 0.06))
add("acero", Pos(WXP + 0.2, 0.1, ZEL - 0.17) * Cylinder(0.019, 0.32))                  # perno principal 2-23/32"
add("rojo", Plane(origin=(WXP + 0.22, -0.05, ZEL - 0.17), x_dir=(0, 1, 0), z_dir=(1, 0, 0)) * fillet(Box(0.22, 0.05, 0.04).edges(), 0.012))   # traba
add("acero", bar((WXP + 0.22, -0.1, ZEL - 0.17), (WXP + 0.38, -0.2, ZEL - 0.12), 0.012))   # lengüeta de cierre
for k in range(8):                                                              # 8 líneas, cable 1"
    y = -0.42 + 0.12 * k
    add("cable", bar(M(MC + 0.3, y, H + 0.75), (WXP, y * 0.5, ZA + 0.85), 0.0127))

comp("sk575_bop")
# ───────────────────────── BOP bajo el piso (manuales Xinde: 2FZ28-35II / FH28-35I) ─────────────────────────
# Doble ram 11" 5M: alto 1374, largo con vástagos 2830, ancho 817, cilindros Ø241, bridas Ø585 R54, salidas 3-1/8" (p.1/p.10).
# Anular 11" 5M: alto 1056, cuerpo Ø1138, bridas Ø585, cabeza troncocónica con espárragos (p.1/p.7).
def brida(z, d=0.585, e=0.07, n=12, r_b=0.2413):
    """Brida API con bulones (n espárragos con tuerca hexagonal en ambas caras)."""
    add("azul", Pos(WXP, 0, z) * fillet(Cylinder(d / 2, e, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.006))
    for k in range(n):
        a = 2 * pi * (k + 0.5) / n
        x, y = WXP + r_b * cos(a), r_b * sin(a)
        add("acero", Pos(x, y, z - 0.03) * Cylinder(0.024, e + 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)))
        for zz in (z - 0.035, z + e):
            add("acero_oscuro", Pos(x, y, zz) * extrude(RegularPolygon(0.042, 6), 0.035))


# cabezal de pozo / carretel hasta la base del stack
add("azul", Pos(WXP, 0, 0) * Cylinder(0.4, 0.35, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("azul", Pos(WXP, 0, 0.35) * Cylinder(0.2, 0.25, align=(Align.CENTER, Align.CENTER, Align.MIN)))
Z_SP = 0.6                                                                           # carretel de perforación 11" 5M
brida(Z_SP)
add("azul", Pos(WXP, 0, Z_SP + 0.07) * Cylinder(0.22, 0.31, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("azul", Pos(WXP, 0, Z_SP + 0.24) * Rot(90, 0, 0) * Cylinder(0.12, 0.44))
Z_RAM = Z_SP + 0.45
brida(Z_RAM - 0.07)
brida(Z_RAM)
# doble ram: cuerpo + 2 bonetes por lado (uno por cavidad) con cilindro de operación y vástago de traba
cuerpo = box(WXP - 0.408, WXP + 0.408, -0.62, 0.62, Z_RAM + 0.07, Z_RAM + 1.304, f=0.03)
cuerpo -= Pos(WXP, 0, Z_RAM) * Cylinder(0.14, 3)                                     # paso 11"
add("rojo", cuerpo)
for zc in (Z_RAM + 0.38, Z_RAM + 0.99):                                              # cavidades
    for s in (-1, 1):
        add("rojo", Pos(WXP, s * 0.62, zc) * Rot(90, 0, 0) * fillet(Cylinder(0.3, 0.1).edges(), 0.015))   # bonete
        add("rojo", Pos(WXP, s * 0.87, zc) * Rot(90, 0, 0) * fillet(Cylinder(0.1206, 0.42).edges(), 0.012))  # cilindro Ø241
        add("acero", bar((WXP, s * 1.08, zc), (WXP, s * 1.415, zc), 0.028))               # vástago de traba (total 2830)
        add("acero_oscuro", Pos(WXP, s * 1.415, zc) * Rot(90, 0, 0) * Torus(0.09, 0.012))  # volante
    for s in (-1, 1):                                                                # salidas laterales 3-1/8" con brida ciega
        add("rojo", Pos(WXP + s * 0.408, 0, zc) * Rot(0, 90, 0) * Cylinder(0.08, 0.12))
        add("azul", Pos(WXP + s * 0.49, 0, zc) * Rot(0, 90, 0) * Cylinder(0.135, 0.045))
brida(Z_RAM + 1.304)
# anular: carcasa inferior Ø1138 con canto redondeado + cuello a brida, cabeza troncocónica, orejas de izaje
Z_AN = Z_RAM + 1.374
brida(Z_AN)
an = Pos(WXP, 0, Z_AN + 0.07) * Cylinder(0.3, 0.12, align=(Align.CENTER, Align.CENTER, Align.MIN))
an += Pos(WXP, 0, Z_AN + 0.17) * fillet(Cylinder(0.569, 0.5, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.12)
an += Pos(WXP, 0, Z_AN + 0.67) * Cone(0.52, 0.31, 0.32, align=(Align.CENTER, Align.CENTER, Align.MIN))
an -= Pos(WXP, 0, Z_AN) * Cylinder(0.14, 3)
add("rojo", an)
for k in range(16):                                                                  # bulones de unión carcasas
    a = 2 * pi * k / 16
    add("acero_oscuro", Pos(WXP + 0.55 * cos(a), 0.55 * sin(a), Z_AN + 0.6) * Cylinder(0.025, 0.06))
for s in (-1, 1):
    add("acero_oscuro", Pos(WXP, s * 0.5, Z_AN + 0.86) * Rot(0, 90, 0) * Torus(0.07, 0.022))   # orejas de izaje
for s in (-1, 1):                                                                    # puertos hidráulicos 1" NPT
    add("acero", Pos(WXP + 0.58, s * 0.12, Z_AN + 0.42) * Rot(0, 90, 0) * Cylinder(0.025, 0.08))
brida(Z_AN + 1.0, d=0.62, e=0.056)                                                   # cara con espárragos
LN = ZP - 0.02 - (Z_AN + 1.056)                                                      # niple campana hasta el piso
add("acero", Pos(WXP, 0, Z_AN + 1.056) * (Cylinder(0.17, LN, align=(Align.CENTER, Align.CENTER, Align.MIN))
                                         - Cylinder(0.15, LN + 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN))))   # niple campana

# mesa-cuña neumática (spider) para tubing 2-3/8"–3-1/2"
add("acero_oscuro", Pos(WXP, 0, ZP + 0.03) * (fillet(Cylinder(0.32, 0.28, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.03)
                                              - Cylinder(0.11, 1)))
for k in range(3):
    a = 2 * pi * k / 3
    add("acero", Pos(WXP + 0.13 * cos(a), 0.13 * sin(a), ZP + 0.31) * Rot(0, 0, a * 180 / pi) * box(-0.04, 0.04, -0.06, 0.06, 0, 0.305 * 0.5, f=0.01))
add("rojo", Pos(WXP + 0.38, 0, ZP + 0.18) * Rot(0, 90, 0) * fillet(Cylinder(0.07, 0.25).edges(), 0.01))   # actuador neumático

comp("sk575_llave")
# ───────────────────────── llave hidráulica colgada ─────────────────────────
# Gill Model 500 (manual p6-7): largo 1295, alto 241 (419 con backup), colgada ~0,9 m sobre el piso, brazo de torque a ménsula
ZL = ZP + 0.9
llave = box(WXP, WXP + 1.295, -0.3, 0.3, ZL + 0.178, ZL + 0.419, f=0.04)
llave -= Pos(WXP, 0, ZL) * Cylinder(0.1, 1.2) + Pos(WXP - 0.2, 0, ZL + 0.3) * Box(0.4, 0.2, 0.6)   # garganta abierta
add("rojo", llave)
backup = box(WXP, WXP + 0.9, -0.27, 0.27, ZL, ZL + 0.15, f=0.03) - Pos(WXP, 0, ZL) * Cylinder(0.1, 1.2)
add("acero_oscuro", backup)
for k in range(4):                                                               # columnas llave–backup
    add("acero", bar((WXP + 0.35 + 0.15 * (k % 2), -0.22 + 0.44 * (k // 2), ZL + 0.15), (WXP + 0.35 + 0.15 * (k % 2), -0.22 + 0.44 * (k // 2), ZL + 0.178), 0.02))
add("acero_oscuro", Pos(WXP + 1.05, 0, ZL + 0.419) * Cylinder(0.11, 0.25, align=(Align.CENTER, Align.CENTER, Align.MIN)))   # motor hidráulico
add("acero", bar((WXP + 0.7, 0, ZL + 0.42), (WXP + 0.7, 0, ZL + 2.25), 0.04))                    # cilindro de elevación (carrera 1,83)
add("cable", bar((WXP + 0.7, 0, ZL + 2.25), M(MX + 0.7, -0.4, 13.0), 0.01))

comp("sk575_piso")
# ───────────────────────── piso de trabajo (planos TACKER 8114-1006-0200/0201/0210/0212) ─────────────────────────
# Central 2600 × 2300 (UPN 100 + chapa semilla de melón 3/16") + 2 laterales 2500 × 500 × 190 → 2600 × 3304.
# Abertura de pozo 730 × 700 a 770 del borde lado mástil; panel removible (RVB) 1100 × 680 hacia la V.
X0 = WXP - 0.77 - 0.365                                           # borde lado mástil
X1 = X0 + 2.6                                                     # borde lado planchada (V)
YC, YL = 1.15, 1.652                                              # semiancho central / con laterales
ZU = ZP - 0.0048 - 0.05                                           # eje de los UPN 100 bajo la chapa
for y in (-YC, YC):                                               # largueros y travesaños UPN 100
    add("rojo", upn((X0, y, ZU), (X1, y, ZU), (0, -1 if y > 0 else 1, 0)))
for x in (X0, WXP - 0.365, WXP + 0.365, X1):
    add("rojo", upn((x, -YC, ZU), (x, YC, ZU), (1 if x < WXP else -1, 0, 0)))
for y in (-0.35, 0.35):                                           # bordes de la abertura / apoyo del panel
    add("rojo", upn((WXP - 0.365, y, ZU), (X1, y, ZU), (0, 1 if y > 0 else -1, 0)))
for s in (-1, 1):                                                 # diagonales planchuela 4" × 1/4"
    a, b = Vector(X0 + 0.05, s * 0.4, ZU), Vector(WXP - 0.4, s * (YC - 0.05), ZU)
    add("rojo", Plane(origin=a, x_dir=(0, 0, 1), z_dir=b - a) * Box(0.1016, 0.00635, (b - a).length, align=(Align.CENTER, Align.CENTER, Align.MIN)))
chapa = box(X0, X1, -YC, YC, ZP - 0.0048, ZP) - box(WXP - 0.365, X1, -0.35, 0.35, ZP - 1, ZP + 1)
add("acero", chapa)
add("acero", box(WXP + 0.375, X1, -0.34, 0.34, ZP - 0.0048, ZP))                       # panel RVB
for x in (WXP + 0.6, X1 - 0.25):                                                       # manijas del panel
    add("acero_oscuro", Pos(x, 0, ZP) * Rot(90, 0, 0) * (Torus(0.045, 0.008) & box(-1, 1, -1, 1, 0, 1)))
for s in (-1, 1):                                                 # pisos laterales (×2) con 3 ménsulas Ø26
    yi, yo = s * YC, s * YL
    for y in (yi, yo):
        add("rojo", upn((X0 + 0.1, y, ZP - 0.1), (X1, y, ZP - 0.1), (0, -s if y == yo else s, 0), h=0.19))
    for x in (X0 + 0.1, X0 + 0.1 + 0.725, X0 + 0.1 + 1.425, X1):
        add("rojo", upn((x, yi, ZP - 0.1), (x, yo, ZP - 0.1), (1 if x < X1 else -1, 0, 0), h=0.19))
    add("acero", box(X0 + 0.1, X1, min(yi, yo), max(yi, yo), ZP - 0.0048, ZP))
    for x in (X0 + 0.35, X0 + 1.3, X0 + 2.25):
        add("rojo", Pos(x, s * (YC + 0.03), ZP - 0.24) * (Box(0.1, 0.06, 0.1) - Rot(90, 0, 0) * Cylinder(0.013, 1)))
        add("acero", Pos(x, s * (YC + 0.03), ZP - 0.24) * Rot(90, 0, 0) * Cylinder(0.012, 0.11))   # perno
# subestructura (layout: 5 m; altura 12'): columnas, patines y cruces en los laterales
for y in (-1.5, 1.5):
    add("rojo", Pos(0, 0, 0) * fillet(box(X0 - 0.2, X1 + 0.2, y - 0.15, y + 0.15, 0, 0.2).edges().filter_by(Axis.Y), 0.03))   # patín
    for x in (X0 + 0.08, X1 - 0.08):
        add("rojo", bar((x, y, 0.2), (x, y, ZP - 0.2), 0.075, sq=True))
    for z0, z1 in ((0.25, ZP / 2), (ZP / 2, ZP - 0.25)):
        add("rojo", bar((X0 + 0.15, y, z0), (X1 - 0.15, y, z1), 0.04, ang=(0, -y, 0)))
        add("rojo", bar((X1 - 0.15, y, z0), (X0 + 0.15, y, z1), 0.04, ang=(0, -y, 0)))
    add("rojo", bar((X0 + 0.08, y, ZP / 2), (X1 - 0.08, y, ZP / 2), 0.05, ang=(0, 0, -1)))
# pasarela lateral (−Y) que une las dos escaleras
add("acero", box(X0, X1, -2.5, -YL, ZP - 0.0048, ZP))
add("rojo", upn((X0, -2.5, ZU), (X1, -2.5, ZU), (0, 1, 0)))
for x in (X0, X1):
    add("rojo", upn((x, -2.5, ZU), (x, -YL, ZU), (1 if x == X0 else -1, 0, 0)))
    add("rojo", bar((x, -2.45, 0.2), (x, -2.45, ZP - 0.1), 0.05, sq=True))
railing([(X1, 0.6, ZP), (X1, YL, ZP), (X0, YL, ZP), (X0, 0.95, ZP)])
railing([(X1, -0.6, ZP), (X1, -YL, ZP)])
railing([(X0, -2.5, ZP), (X1, -2.5, ZP)])
stair((X1, -2.1, ZP), (X1 + ZP, -2.1, 0.0), 0.8, paso=0.18)                      # 45°, ancho 800 (plano escalera)
add("acero_oscuro", bar((WXP + 1.25, 0.25, ZL + 0.3), (X1, 1.55, ZP + 1.1), 0.03))  # brazo de torque a la baranda
manguera((WXP + 1.1, -0.15, ZL + 0.6), (WXP + 1.4, -1.2, ZP + 0.2), (X1 - 0.2, -1.5, ZP + 0.05), r=0.022)

comp("sk575_carrier")
# ───────────────────────── mangueras hidráulicas carrier → piso ─────────────────────────
for y in (-0.35, 0.0, 0.35):
    manguera((-2.3, y, ZK + 0.05), (-1.6, y * 1.6, 0.4), (X0 + 0.1, y * 2, ZP - 0.2))
comp("sk575_planchada")
# planchada de 12 m (pipe rack) + rampa a la puerta en V
add("grating", box(4.6, 16.6, -1.0, 1.0, 1.0, 1.05, f=0.01))
for y in (-1.0, 1.0):
    add("rojo", perfil_c(4.6, 16.6, y, 0.85, abre=-1 if y > 0 else 1))
    for x in (5.0, 8.0, 11.0, 14.0, 16.4):
        add("rojo", bar((x, y, 0), (x, y, 0.7), 0.06, sq=True))
def tubo(x0, y, z, L=9.4):
    """Tramo de tubing 2-7/8" (OD 73) con cupla NU (OD 88,9 × 0,16 m) en el extremo +X."""
    add("acero_oscuro", Pos(x0 + L / 2, y, z) * Rot(0, 90, 0) * Cylinder(0.0365, L))
    add("acero", Pos(x0 + L + 0.08, y, z) * Rot(0, 90, 0) * fillet(Cylinder(0.0445, 0.16).edges(), 0.006))


tubo(5.4, 0.0, 1.05 + 0.0365)                                                    # tramo sobre la planchada
for x in (6.0, 10.0, 14.0):                                                      # caballetes (1ª hilera ≥ 0,46 m)
    for y in (2.0, 4.2):
        add("acero_oscuro", bar((x, y, 0), (x, y, 0.5), 0.05, sq=True))
    add("acero_oscuro", bar((x, 2.0, 0.5), (x, 4.2, 0.5), 0.06, ang=(0, 0, -1)))
for fila in range(3):                                                            # 3 hileras con listones separadores
    z = 0.56 + 0.0365 + fila * 0.1
    for k in range(10):
        tubo(5.6 + (k % 2) * 0.12, 2.25 + k * 0.19 + (fila % 2) * 0.09, z)
    if fila < 2:
        for x in (6.0, 10.0, 14.0):
            add("grating", box(x - 0.025, x + 0.025, 2.1, 4.1, z + 0.037, z + 0.063))
ra, rb = Vector(X1, 0, ZP), Vector(6.6, 0, 1.07)                                 # rampa de la V a la planchada
rd = rb - ra
add("grating", Plane(origin=(ra + rb) * 0.5, x_dir=rd, z_dir=Vector(-rd.Z, 0, rd.X)) * Box(rd.length, 1.2, 0.04))
for y in (-0.6, 0.6):
    add("rojo", upn(tuple(ra + Vector(0, y, -0.1)), tuple(rb + Vector(0, y, -0.1)), (0, -1 if y > 0 else 1, 0), h=0.16))
stair((X0, -2.1, ZP), (X0 - ZP, -2.1, 0.0), 0.8, paso=0.18)                         # lado carrier, 45°

comp("sk575_tiros")
# tiros dobles de tubing (2 × R2 ≈ 18,8 m) en el piso, entre los peines del piso de enganche
for k in range(14):
    yb, yt = 0.6 + (k % 7) * 0.14, -1.0 + 0.25 * (k % 9) + 0.1 * (k // 7)                 # estiba en el lado +Y del piso
    add("acero_oscuro", bar((X1 - 0.6 + 0.12 * (k // 7), yb, ZP + 0.03), M(XF + 0.8 + 0.12 * (k // 7), yt * 0.9, ZP + 0.03 + 18.8), 0.0365))

comp("sk575_planchada")
# línea de alta presión 2" (planos L602): tramos de 1640 = caño 2" SCH160 1500 + uniones Fig. 602
for k in range(8):
    x0 = 4.6 + k * 1.64
    add("azul", Pos(x0 + 0.82, 2.55, 0.12) * Rot(0, 90, 0) * Cylinder(0.0302, 1.5))
    add("rojo", Pos(x0 + 0.04, 2.55, 0.12) * Rot(0, 90, 0) * fillet(Cylinder(0.055, 0.08).edges(), 0.01))
    for a in (0, 120, 240):                                                      # orejas de la tuerca mariposa
        add("rojo", Pos(x0 + 0.04, 2.55, 0.12) * Rot(a, 0, 0) * Pos(0, 0, 0.075) * Box(0.04, 0.025, 0.05))
add("azul", bar((4.6, 2.55, 0.12), (X1 + 0.1, 1.75, ZP - 0.5), 0.0302))                     # subida al piso / stand pipe

comp("sk575_vientos")
# ───────────────────────── vientos y anclajes ─────────────────────────
for ax, ay in ((WXP - 27.4, -26.8), (WXP - 27.4, 26.8), (WXP + 24.4, -26.8), (WXP + 24.4, 26.8)):   # layout: cotas desde el pozo
    add("hormigon", box(ax - 0.5, ax + 0.5, ay - 0.5, ay + 0.5, 0, 0.08, f=0.02))
    add("acero_oscuro", Pos(ax, ay, 0.08) * Cylinder(0.076, 0.92, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero", Pos(ax, ay, 1.05) * Rot(90, 0, 0) * Torus(0.08, 0.02))
    for z, w, r in ((29.5, 1.12, 0.0095), (19.0, 1.3, 0.0079)):                # placa API: A 3/4" EEIPS, B 5/8"
        cx, cy = MX + (w / 2 if ax > WXP else -w / 2), (w / 2 if ay > 0 else -w / 2)
        add("cable", bar(M(cx, cy, z), (ax, ay, 1.05), r))
# vientos de plataforma 9/16" cruzados a los anclajes delanteros + vientos internos 2 × 1" de la corona al apoyo (Rig Up p3)
for s_ in (-1, 1):
    add("cable", bar(M(XF + 1.9, s_ * 1.2, ZM + 0.08), (WXP + 24.4, -s_ * 26.8, 1.05), 0.0071))
    add("cable", bar(M(MC - 0.9, s_ * 0.9, H), (xc(64), s_ * 0.9, 121 * IN), 0.0127))
pz = ZM + 1.1                                                                    # pirosalva desde el piso de enganche a 35°
P0 = M(XF + 1.9, 1.2, pz)
add("cable", bar(P0, (P0[0] + pz / 0.7002 * 0.8, 1.2 + pz / 0.7002 * 0.6, 0.5), 0.0143))
add("hormigon", box(P0[0] + pz / 0.7002 * 0.8 - 0.4, P0[0] + pz / 0.7002 * 0.8 + 0.4,
                    1.2 + pz / 0.7002 * 0.6 - 0.4, 1.2 + pz / 0.7002 * 0.6 + 0.4, 0, 0.5, f=0.03))

comp("sk575_pozo_vecino")
# ───────────────────────── boca de pozo (árbol de navidad) ─────────────────────────
WX, WY = 12.0, -5.0
for z0, r, h in ((0, 0.4, 0.2), (0.2, 0.22, 0.5), (0.7, 0.33, 0.12), (0.82, 0.2, 0.6), (1.42, 0.33, 0.12), (1.54, 0.18, 0.7), (2.24, 0.26, 0.15)):
    add("azul", Pos(WX, WY, z0) * Cylinder(r, h, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("azul", Pos(WX, WY, 1.1) * box(-0.25, 0.25, -0.25, 0.25, -0.25, 0.25, f=0.03))
for s in (-1, 1):
    add("azul", Pos(WX + s * 0.55, WY, 1.1) * Rot(0, 90, 0) * Cylinder(0.12, 0.6))
    add("rojo", Pos(WX + s * 0.75, WY - 0.4, 1.1) * Rot(90, 0, 0) * Torus(0.22, 0.025))
add("rojo", Pos(WX, WY, 2.7) * Torus(0.22, 0.025))

comp("sk575_piletas")
# ───────────────────────── locación: piletas, choke manifold, bomba, acumulador (LAYOUT-WS10-0001) ─────────────────────────
# Posiciones medidas en el layout respecto al eje del pozo (x a lo largo de la planchada, y hacia las piletas).
# Piletas: plano "Pileta TACKER 1-2-3" (golpeador / zaranda / preparadora): patín 12000 × 2400, cuba 11000 × 2300,
# alto 1742 (2011 con baranda), compartimentos 4500 / 4500 / 2000 (15,5 / 15,5 / 7 m3).
def pileta(x0, y0, tipo):
    """Pileta autotransportable de 12 m a lo largo de X, esquina (x0, y0)."""
    yc = y0 + 1.2
    for y in (y0 + 0.35, y0 + 2.05):                                        # patines con puntas levantadas
        sk = make_face(Polyline((0, 0.05), (0.35, 0), (11.65, 0), (12, 0.05), (12, 0.25), (0, 0.25), close=True))
        add("acero_oscuro", Pos(x0, y + 0.15, 0) * Rot(90, 0, 0) * extrude(sk, 0.3))
    for k in range(7):
        add("acero_oscuro", Pos(x0 + 0.5 + k * 1.83, yc, 0.25) * Box(0.12, 2.3, 0.12))
    cuba = box(x0 + 0.5, x0 + 11.5, y0 + 0.05, y0 + 2.35, 0.31, 1.742 + 0.31)
    cuba -= box(x0 + 0.56, x0 + 11.44, y0 + 0.11, y0 + 2.29, 0.37, 2.2)
    add("rojo", cuba)
    for x in (x0 + 0.5 + 4.5, x0 + 0.5 + 9.0):                              # mamparos
        add("rojo", box(x - 0.03, x + 0.03, y0 + 0.1, y0 + 2.3, 0.37, 1.95))
    for k in range(12):                                                     # refuerzos verticales UPN
        x = x0 + 0.5 + 0.5 + k * 0.91
        for y, s in ((y0 + 0.05, -1), (y0 + 2.35, 1)):
            add("rojo", upn((x, y, 0.31), (x, y, 2.05), (0, s, 0), h=0.1, bw=0.05))
    for x in [x0 + 0.5 + i * 0.92 for i in range(12)]:                      # tapas de rejilla
        add("grating", box(x + 0.02, x + 0.9, y0 + 0.1, y0 + 2.3, 2.02, 2.05))
    railing([(x0 + 0.5, y0 + 0.05, 2.05), (x0 + 11.5, y0 + 0.05, 2.05)], h=1.0, step=1.4)
    railing([(x0 + 0.5, y0 + 2.35, 2.05), (x0 + 11.5, y0 + 2.35, 2.05)], h=1.0, step=1.4)
    stair((x0 + 0.5, y0 + 1.2, 2.05), (x0 - 1.5, y0 + 1.2, 0.0), 0.7, paso=0.22)
    # línea de succión 4" con mariposas por compartimento + línea de entrada
    add("acero", bar((x0 + 0.2, y0 - 0.12, 0.45), (x0 + 11.8, y0 - 0.12, 0.45), 0.057))
    for x in (x0 + 2.75, x0 + 7.25, x0 + 10.5):
        add("acero", bar((x, y0 - 0.12, 0.45), (x, y0 + 0.05, 0.45), 0.057))
        add("rojo", Pos(x, y0 - 0.12, 0.45) * Rot(0, 90, 0) * Cylinder(0.11, 0.06))
        add("acero_oscuro", bar((x, y0 - 0.12, 0.56), (x, y0 - 0.12, 0.8), 0.015))
        add("acero_oscuro", Pos(x, y0 - 0.12, 0.8) * Box(0.3, 0.04, 0.03))                  # palanca
    add("acero", bar((x0 + 0.3, y0 + 2.5, 1.9), (x0 + 11.0, y0 + 2.5, 1.9), 0.045))
    if tipo == "golpeador":                                                 # tanque 3 m3 + desgasificador Ø914 con desfogue Ø168
        add("rojo", box(x0 + 5.5, x0 + 7.5, y0 + 0.5, y0 + 1.8, 2.05, 3.25, f=0.03))
        add("acero", Pos(x0 + 11.0, yc, 0.31) * fillet(Cylinder(0.457, 3.3, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.08))
        add("acero", bar((x0 + 11.0, yc, 3.6), (x0 + 11.0, yc, 3.9), 0.084))
        add("acero", Pos(x0 + 11.0, yc + 0.2, 3.9) * Rot(0, 90, 0) * Torus(0.2, 0.084) & box(-99, 99, -99, 99, 3.9, 99))
        add("acero", bar((x0 + 11.0, yc + 0.4, 3.9), (x0 + 11.0, yc + 0.4, 0.6), 0.084))
    elif tipo == "zaranda":                                                 # zaranda vibratoria + manifold de salida
        add("acero_oscuro", box(x0 + 0.7, x0 + 2.2, y0 + 0.4, y0 + 1.9, 2.05, 2.9, f=0.03))
        add("grating", Plane(origin=(x0 + 1.45, yc, 3.0), z_dir=(0.15, 0, 1)) * Box(1.4, 1.3, 0.03))
        add("azul", Pos(x0 + 2.4, yc, 2.6) * Rot(90, 0, 0) * Cylinder(0.2, 0.5))           # motor vibrador
        for x in (x0 + 8.6, x0 + 9.6):
            for z in (0.7, 1.4):
                add("acero", bar((x, y0 + 2.35, z), (x, y0 + 2.75, z), 0.05))
                add("rojo", Pos(x, y0 + 2.6, z) * Rot(90, 0, 0) * Cylinder(0.12, 0.05))
    else:                                                                   # preparadora: embudo + bomba centrífuga
        add("acero", Pos(x0 + 1.2, yc, 2.05) * Cone(0.05, 0.4, 0.55, align=(Align.CENTER, Align.CENTER, Align.MIN)))
        add("acero_oscuro", box(x0 + 0.6, x0 + 1.6, y0 + 2.4, y0 + 3.0, 0, 0.15))
        add("azul", Pos(x0 + 0.9, y0 + 2.7, 0.45) * Rot(0, 90, 0) * fillet(Cylinder(0.2, 0.5).edges(), 0.03))   # motor
        add("rojo", Pos(x0 + 1.35, y0 + 2.7, 0.45) * Rot(0, 90, 0) * Cylinder(0.25, 0.18))                      # voluta
    txt_ = extrude(Text(tipo.upper(), font_size=0.35, font_style=FontStyle.BOLD), amount=0.015)
    add("blanco", Pos(x0 + 6.0, y0 + 0.04, 1.3) * Rot(90, 0, 0) * txt_)


pileta(WXP - 8.2, 14.3, "zaranda")                                          # pileta de circulación
pileta(WXP - 11.3, 19.5, "preparadora")                                     # pileta de preparación
pileta(WXP + 10.7, 27.7, "golpeador")                                       # pileta de ensayo

# trip tank (≈2,1 × 2,3) con regla de nivel
add("rojo", box(WXP + 0.4, WXP + 2.5, 10.6, 12.9, 0.15, 2.6, f=0.03))
add("acero_oscuro", box(WXP + 0.3, WXP + 2.6, 10.5, 13.0, 0, 0.15))
add("vidrio", box(WXP + 0.38, WXP + 0.4, 11.6, 11.7, 0.4, 2.4))
railing([(WXP + 0.4, 10.6, 2.6), (WXP + 2.5, 10.6, 2.6), (WXP + 2.5, 12.9, 2.6)], h=1.0, step=1.0)

comp("sk575_manifold")
# manifold de ahogo (esquema TACKER M1–M12) con la escala del choke Thrubore B20-9908: columnas a 64,03", filas a 62,18".
# Fila de entrada: choke hidráulico – M4 – M2 – M9 (cruz, entrada "de pozo") – M1 – M3 – choke manual.
# Bajadas al colector: M6 (izq.), M7 + M8 (centro, sigue como línea de venteo al campo), M5 (der.).
# Colector con M10 en el extremo; salidas M12 (reserva / al campo con presión regulada) y M11 (al golpeador).
IN = 0.0254
CX, CY, CZ = WXP + 6.15, 10.4, 0.62                                        # centro de M9; altura de línea
YB = CY + 62.18 * IN                                                        # colector


def valvula(x, y, z, eje, hid=False, d=0.24, k=1.0, tag=None, stem="z"):
    """Válvula esclusa: cuerpo con bridas en `eje` ('x'|'y'), bonete y volante (o actuador hidráulico HCR); k = escala.
    stem = 'z' (vástago arriba) o 'x' (vástago horizontal hacia +X, para válvulas bajo el BOP)."""
    sh = []
    rot = Rot(0, 90, 0) if eje == "x" else Rot(90, 0, 0)
    sh.append(("azul", fillet(Box(0.26 * k, 0.26 * k, 0.3 * k).edges(), 0.02 * k)))
    for s in (-1, 1):
        o = (s * d * k, 0, 0) if eje == "x" else (0, s * d * k, 0)
        sh.append(("azul", Pos(*o) * rot * Cylinder(0.14 * k, 0.07 * k)))
    sh.append(("azul", Pos(0, 0, 0.15 * k) * Cylinder(0.09 * k, 0.3 * k, align=(Align.CENTER, Align.CENTER, Align.MIN))))
    zt = 0.45 * k
    if hid:
        sh.append(("rojo", Pos(0, 0, zt) * fillet(Cylinder(0.14 * k, 0.35 * k, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.02 * k)))
    else:
        sh.append(("acero", bar((0, 0, zt), (0, 0, zt + 0.17 * k), 0.018 * k)))
        zt += 0.17 * k
        sh.append(("acero_oscuro", Pos(0, 0, zt) * Torus(0.2 * k, 0.018 * k)))
        for a in range(0, 360, 120):
            sh.append(("acero_oscuro", bar((0, 0, zt), (0.2 * k * cos(a * pi / 180), 0.2 * k * sin(a * pi / 180), zt), 0.012 * k)))
    if tag:                                                                 # chapa identificadora
        sh.append(("blanco", Pos(0, -0.2 * k, 0.32 * k) * box(-0.12, 0.12, -0.005, 0.005, -0.06, 0.06)))
        t = extrude(Text(tag, font_size=0.09, font_style=FontStyle.BOLD), amount=0.006)
        sh.append(("acero_oscuro", Pos(0, -0.2 * k - 0.006, 0.32 * k) * Rot(90, 0, 0) * t))
    T = Pos(x, y, z) * (Rot(0, 90, 0) if stem == "x" else Rot(0, 0, 0))
    for m, g in sh:
        add(m, T * g)


def choke(x, y, z, hid):
    """Choke ajustable: cuerpo en cruz con vástago horizontal (+Y) y actuador hidráulico o volante."""
    add("azul", Pos(x, y, z) * fillet(Box(0.32, 0.32, 0.32).edges(), 0.02))
    add("azul", Pos(x, y, z + 0.2) * Cylinder(0.12, 0.12))
    if hid:
        add("rojo", Pos(x, y, z + 0.38) * fillet(Cylinder(0.13, 0.3).edges(), 0.02))
    else:
        add("acero", bar((x, y, z + 0.26), (x, y, z + 0.5), 0.02))
        add("acero_oscuro", Pos(x, y, z + 0.5) * Torus(0.14, 0.015))


for s in (-1, 1):                                                           # skid de caño con orejas de izaje
    add("acero_oscuro", bar((CX - 75.12 * IN, CY + 31 * IN + s * 0.75, 0.08), (CX + 75.12 * IN, CY + 31 * IN + s * 0.75, 0.08), 0.08))
    for x in (CX - 75.12 * IN, CX + 75.12 * IN):
        add("acero", Pos(x, CY + 31 * IN + s * 0.75, 0.2) * Rot(0, 90, 0) * Torus(0.07, 0.018))
for x in (CX - 70 * IN, CX - 23 * IN, CX + 23 * IN, CX + 70 * IN):
    add("acero_oscuro", bar((x, CY + 31 * IN - 0.75, 0.08), (x, CY + 31 * IN + 0.75, 0.08), 0.05))
add("grating", box(CX - 73 * IN, CX + 73 * IN, CY + 31 * IN - 0.7, CY + 31 * IN + 0.7, 0.16, 0.19))
# fila de entrada
add("azul", bar((CX - 64.03 * IN, CY, CZ), (CX + 64.03 * IN, CY, CZ), 0.07))
add("azul", Pos(CX, CY, CZ) * fillet(Box(0.38, 0.38, 0.38).edges(), 0.02))                       # M9: cruz de entrada
valvula(CX, CY - 0.4, CZ, "y", tag="M9")
choke(CX - 64.03 * IN, CY, CZ, hid=True)
choke(CX + 64.03 * IN, CY, CZ, hid=False)
for x, t in ((-44, "M4"), (-22, "M2"), (22, "M1"), (44, "M3")):
    valvula(CX + x * IN, CY, CZ, "x", tag=t)
# bajadas al colector
for x in (-64.03, 0, 64.03):
    add("azul", bar((CX + x * IN, CY, CZ), (CX + x * IN, YB, CZ), 0.06))
    add("acero_oscuro", bar((CX + x * IN, CY + 0.9, 0.19), (CX + x * IN, CY + 0.9, CZ - 0.07), 0.05, sq=True))   # pedestal
valvula(CX - 64.03 * IN, CY + 0.9, CZ, "y", tag="M6")
valvula(CX + 64.03 * IN, CY + 0.9, CZ, "y", tag="M5")
valvula(CX, CY + 0.55, CZ, "y", tag="M7")
valvula(CX, CY + 1.15, CZ, "y", tag="M8")
# colector (buffer) con M10 en el extremo y salidas M12 / venteo / M11
add("azul", Pos((CX - 75 * IN + CX + 62 * IN) / 2, YB, CZ) * Rot(0, 90, 0) * fillet(Cylinder(0.13, 137 * IN).edges(), 0.03))
valvula(CX + 70 * IN, YB, CZ, "x", tag="M10")
valvula(CX - 64.03 * IN, YB + 0.45, CZ, "y", tag="M12")
valvula(CX + 64.03 * IN, YB + 0.45, CZ, "y", tag="M11")
for x in (-64.03, 64.03):
    add("azul", bar((CX + x * IN, YB, CZ), (CX + x * IN, YB + 0.9, CZ), 0.05))
# línea de venteo al campo (sigue la bajada central) y línea al golpeador desde M11
vent = [(CX, YB, CZ), (CX, YB + 1.5, CZ), (CX, YB + 1.5, 0.15), (CX, YB + 8.0, 0.15)]
gol = [(CX + 64.03 * IN, YB + 0.9, CZ), (CX + 64.03 * IN, YB + 0.9, 0.15), (CX + 64.03 * IN, 26.9, 0.15),
       (WXP + 11.3, 26.9, 0.15), (WXP + 11.3, 27.55, 0.4)]
for path in (vent, gol):
    for p, q in zip(path, path[1:]):
        add("azul", bar(p, q, 0.045), Pos(*q) * Sphere(0.055))

comp("sk575_bop")
# carretel de perforación bajo los rams con líneas de choke (+Y) y de ahogo (−Y) — esquema "Conjunto de BOP y válvulas"
# CL1 manual + CL2 HCR 4-1/16" 5M hacia el manifold; KL1 manual + KL2 HCR 2-1/16" 5M desde la bomba.
ZC = Z_SP + 0.24                                                            # eje de salidas del carretel
for s, (k, t1, t2) in ((1, (1.15, "CL1", "CL2")), (-1, (0.85, "KL1", "KL2"))):
    add("azul", Pos(WXP, s * 0.3, ZC) * Rot(90, 0, 0) * Cylinder(0.07 * k, 0.2))
    valvula(WXP, s * 0.62, ZC, "y", k=k, tag=t1, stem="x")
    valvula(WXP, s * 1.12, ZC, "y", hid=True, k=k, tag=t2, stem="x")
comp("sk575_manifold")
# línea de choke 3" desde CL2 hasta M9 (a ras del suelo) y línea de ahogo desde la bomba triplex hasta KL2
fl = [(WXP, 1.45, ZC), (WXP, 2.0, ZC), (WXP, 2.0, 0.15), (WXP, 6.0, 0.15), (CX, 6.0, 0.15), (CX, CY - 0.75, 0.15), (CX, CY - 0.75, CZ),
      (CX, CY - 0.62, CZ)]
BX, BY = WXP - 19.2, 14.3                                                   # bomba triplex (ver abajo)
kl = [(WXP, -1.35, ZC), (WXP, -1.7, ZC), (WXP, -1.7, 0.1), (WXP + 4.0, -1.7, 0.1), (WXP + 4.0, 13.4, 0.1),
      (BX + 5.15, 13.4, 0.1), (BX + 5.15, BY + 0.1, 0.1), (BX + 5.15, BY + 0.1, 1.15), (BX + 5.15, BY + 0.6, 1.15)]
for path, r in ((fl, 0.045), (kl, 0.03)):
    for p, q in zip(path, path[1:]):
        add("azul", bar(p, q, r), Pos(*q) * Sphere(r * 1.3))

comp("sk575_bomba")
# bomba triplex sobre patín (6 × 2,4): motor + caja de cigüeñal + cabezal de 3 émbolos + amortiguador
BX, BY = WXP - 19.2, 14.3
add("acero_oscuro", box(BX, BX + 6, BY + 0.2, BY + 2.2, 0, 0.25))
gabinete_ = box(BX + 0.3, BX + 3.0, BY + 0.3, BY + 2.1, 0.25, 2.0, f=0.05)
add("rojo", gabinete_)
add("acero_oscuro", box(BX + 0.25, BX + 0.3, BY + 0.4, BY + 2.0, 0.6, 1.9))   # radiador
add("acero", bar((BX + 2.2, BY + 1.5, 2.0), (BX + 2.2, BY + 1.5, 2.7), 0.06))
add("azul", box(BX + 3.4, BX + 4.8, BY + 0.5, BY + 1.9, 0.25, 1.35, f=0.06))   # cárter
for k in range(3):
    y = BY + 0.75 + k * 0.45
    add("acero", Pos(BX + 5.15, y, 0.85) * Rot(0, 90, 0) * fillet(Cylinder(0.16, 0.7).edges(), 0.02))   # módulos
add("acero", bar((BX + 5.15, BY + 0.6, 1.15), (BX + 5.15, BY + 1.8, 1.15), 0.06))
add("acero_oscuro", Pos(BX + 5.15, BY + 1.95, 1.15) * Sphere(0.22))           # amortiguador de pulsaciones

comp("sk575_acumulador")
# acumulador del BOP (8 × 2,4) con botellas y canasto de herramientas
AX, AY = WXP - 24.6, -5.9
add("acero_oscuro", box(AX, AX + 8, AY, AY + 2.4, 0, 0.2))
for k in range(16):
    x = AX + 0.5 + (k % 8) * 0.38
    y = AY + 0.6 + (k // 8) * 0.4
    add("rojo", Pos(x, y, 0.2) * fillet(Cylinder(0.14, 1.3, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.06))
add("rojo", box(AX + 3.7, AX + 5.0, AY + 0.3, AY + 2.1, 0.2, 1.4, f=0.03))   # depósito + bombas
add("acero_oscuro", box(AX + 3.75, AX + 4.95, AY + 0.25, AY + 0.3, 1.45, 1.9))
for k in range(6):
    add("acero", bar((AX + 3.85 + k * 0.18, AY + 0.25, 1.75), (AX + 3.85 + k * 0.18, AY + 0.05, 1.85), 0.012))   # palancas
railing([(AX + 5.3, AY, 0.2), (AX + 8, AY, 0.2), (AX + 8, AY + 2.4, 0.2), (AX + 5.3, AY + 2.4, 0.2)], h=1.2, step=0.9)
