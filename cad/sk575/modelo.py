"""Equipo 10 (Service King SK-575, pulling/workover) — modelo CAD de referencia (build123d). NO es as-built.
Generado desde ~/cad/rig10/rig10.py; cada pieza se etiqueta con `comp()` = Component.id del visor.
Lo exporta cad/sk575/exportar.py (un GLB por componente, origen en la boca de pozo). Confianza por cota en
docs/pdf-review/informe-sk575-2026-10-09.md.
Documentado: mástil 31,7 m (tramo inferior 16,4 + superior 15,3).
Carrier y cuadro de maniobras: SK575 Parts & Service Manual (vista lateral p23, bastidor p19: 40 ft, 5 ejes) + spec sheet.
Plano LAYOUT-WS10-0001 (Layout Equipo TKR 10 RN119): carrier 18 m, subestructura 5 m, planchada 12 m,
anclajes de vientos a 27,4 m (lado carrier) / 24,4 m (lado planchada) y ±26,8 m laterales. Resto estimado por foto.
Manuales: BOP doble ram 11" 5M (Xinde 2FZ28-35II) + anular 11" 5M (FH28-35I); llave Gill 500; tubing 2-7/8" R2 (Tenaris);
línea 2" HM (planos L602); corona/aparejo/cuñas (presentaciones API 8A/8B); vientos, anclajes y pirosalva (Módulo Transporte y Montaje YPF).
Equipo = Service King SK-575, mástil SK 104-330-08 S/N DK-3033 (placa API 4F: 104', 8 líneas, 325.725 lb a 3,5° de la
vertical, base a 4'-0"; vientos A 3/4" / B 5/8" EEIPS). Corona: 4 poleas 24" + 30" línea rápida (spec sheet SK-575).
Plano 8123-1002-2611 (Equipo TKR10): piso 3606 [12'], piso de enganche 20629 [68'], mástil 31710 [104'].
Piso pulling: planos 8114-1006-0200/0201/0210/0212 (2600 × 3304, abertura 730 × 700). Escalera: EscaleraPisoPulling (45°, C 180).
Fuente: X:\\Mantenimiento WS\\Planos Tecnicos\\TKR-10 y ...\\COC's - Trazabilidad\\Equipos\\Rig TKR-10\\COC.
CAD: metros, X a lo largo del carrier (+X hacia el pozo), Y lateral, Z arriba. Salida: un GLB por material + STEP."""
from math import cos, pi, sin

from build123d import *

parts: dict[tuple, list] = {}


COMP = ["sk575_mastil"]                                                # componente activo (nodo raíz del GLB)
ORIGEN: dict[str, tuple] = {}            # sub-nodo → punto CAD que el export usa como origen del nodo (pivote de animación)
IZAJE: list[dict] = []                   # anclajes de los cilindros de izaje (CAD), para el meta.json
VIENTOS: list[dict] = []                 # extremos de cada cable de sk575_vientos (CAD), para el meta.json


def comp(cid, origen=None):
    """Las piezas que siguen pertenecen al componente `cid` (una unidad seleccionable del visor).
    `raiz/sub` = sub-nodo con nombre `sub` dentro del GLB `raiz` (misma geometría, otra partición); `origen` = su pivote."""
    COMP[0] = cid
    if origen is not None:
        ORIGEN[cid.split("/")[-1]] = tuple(origen)


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
# eje del pozo: 76" (1,9304 m) del PIE del mástil = eje de la bisagra/pivote MX (SK DKA104-330-08, Derrick Info 3 p5).
# Interpretación (informe C6, 2026-10-11): medidos desde la cara delantera del reticulado (MX + 0,87) la corona quedaba en
# voladizo ~0,9 m para llegar a plomo del pozo; con 3,5° y ~30,5 m de mástil la punta se corre ≈ 1,86 m (≈ 73"), casi
# exactamente 76": medidos desde el pie/bisagra, la corona queda centrada sobre el reticulado y las poleas a plomo del pozo.
WXP = MX + 76 * 0.0254
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

# corona centrada sobre el tope del 2.º tramo: con el mástil inclinado, el centro de poleas queda a plomo sobre WXP (≈ MX)
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


# piso de enganche (monkey board) del lado +X, con cartel: sub-nodo propio (va con el 2.º tramo del mástil)
# Bisagra en el borde interior (cara del mástil), eje lateral Y: origen del nodo = bisagra (el visor lo pliega contra el mástil
# en transporte e izado y lo baja al telescopar el 2.º tramo; ilustrativo). Se nivela con el mástil inclinado (estético, C).
comp("sk575_mastil/sk575_enganche")
ZM, XF = 20.629, MX + 0.68     # piso de enganche a 68' (plano 8123-1002-2611 / Engineering Report SK 2021)
add("grating", box(XF, XF + 1.9, -1.2, 1.2, ZM, ZM + 0.08, f=0.02))
for k in range(9):
    y = -1.0 + k * 0.25
    add("acero", bar((XF + 0.5, y, ZM + 0.08), (XF + 1.8, y, ZM + 0.08), 0.02))
railing([(XF, -1.2, ZM + 0.08), (XF + 1.9, -1.2, ZM + 0.08), (XF + 1.9, 1.2, ZM + 0.08), (XF, 1.2, ZM + 0.08)],
        h=1.1, step=0.95, mat="acero")
add("rojo", box(XF, XF + 2.2, -1.30, -1.25, ZM + 0.2, ZM + 1.15, f=0.01))
txt = extrude(Text("EQUIPO 10", font_size=0.5, font_style=FontStyle.BOLD), amount=0.02)
add("blanco", Pos(XF + 1.1, -1.30, ZM + 0.67) * Rot(90, 0, 0) * txt)
for k, v in parts.items():     # contra-rotación sobre la bisagra: con el mástil a 3,5° el piso queda horizontal
    if k[0] == "sk575_mastil/sk575_enganche":
        v[:] = [Pos(XF, 0, ZM) * Rot(0, -LEAN, 0) * Pos(-XF, 0, -ZM) * s for s in v]
comp("sk575_mastil")

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


ORIGEN["sk575_enganche"] = M(XF, 0, ZM)                 # bisagra del piso de enganche (pivote del plegado)

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

# media cabina (one-man cab) X 0–60, H 55–114, ancho 33" lado conductor (−Y): sub-nodo sk575_cabina (cabina de manejo)
comp("sk575_carrier/sk575_cabina")
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
for y in (YC0 + 0.2, YC1 - 0.2):
    add("luz", Pos(xc(10), y, 114 * IN + 0.025) * Box(0.08, 0.12, 0.05))
comp("sk575_carrier")
for y in (YC0 + 0.15, YC1 - 0.15):                                                     # faros en el bastidor
    add("acero_oscuro", box(FR - 0.02, FR + 0.06, y - 0.12, y + 0.12, 1.5, 1.7, f=0.02))
    add("luz", Pos(FR - 0.025, y, 1.6) * Rot(0, 90, 0) * Cylinder(0.075, 0.02))
# filtro de aire Donaldson (motor) y caja de baterías al lado de la cabina (+Y)
comp("sk575_carrier/sk575_motor")
add("acero_oscuro", Pos(xc(30), 0.8, 1.4) * fillet(Cylinder(0.2, 0.9, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.04))
comp("sk575_carrier")
add("rojo", box(xc(5), xc(25), 0.2, 1.2, 1.15, 1.55, f=0.02))

# apoyo del mástil (headache rack) X 64, tope a 121"
for y in (-1.05, 1.05):
    add("rojo", bar((xc(64), y, ZK - 0.2), (xc(64), y, 121 * IN), 0.07, sq=True))
    add("rojo", bar((xc(64), y, 2.2), (xc(80), y * 0.8, ZK), 0.035, sq=True))
add("rojo", box(xc(64) - 0.12, xc(64) + 0.12, -1.15, 1.15, 121 * IN - 0.15, 121 * IN, f=0.02))
for s_ in (-1, 1):
    add("goma", Plane(origin=(xc(64), s_ * 0.35, 121 * IN + 0.06), x_dir=(0, 1, 0), z_dir=(0, -s_ * 0.6, 0.8)) * Box(0.6, 0.25, 0.04))
# radiador X 65–88 con rejilla y motor Detroit S60 bajo capot X 85–156 (tope 114"): sub-nodo sk575_motor (con escape y
# transmisión hasta las crucetas del cardán; la caja angular queda en el carrier)
comp("sk575_carrier/sk575_motor")
add("acero_oscuro", box(xc(66), xc(72), -0.65, 0.65, ZK, 2.75, f=0.02))
for k in range(12):
    add("acero", box(xc(65.5), xc(66), -0.6, 0.6, ZK + 0.1 + k * 0.11, ZK + 0.14 + k * 0.11))
gabinete(xc(85), xc(156), 114 * IN, z0=ZK, hw=1.15)
txt = extrude(Text("EQUIPO 10", font_size=0.3, font_style=FontStyle.BOLD), amount=0.015)
add("blanco", Pos((xc(85) + xc(156)) / 2, -1.165, 2.2) * Rot(90, 0, 0) * txt)
add("acero", bar((xc(150), 0.85, 114 * IN), (xc(150), 0.85, 3.9), 0.065))                 # escape con mata-chispas
add("acero_oscuro", Pos(xc(150), 0.85, 3.2) * (Cylinder(0.16, 0.9) - Cylinder(0.145, 1.0)))
add("acero_oscuro", Pos(xc(150), 0.85, 3.9) * Cylinder(0.085, 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)))
# transmisión Allison 4500 OFS (X 134–156) → cardán → caja angular 2,47:1 (salida X 235, H 61) bajo el tanque hidráulico
add("acero_oscuro", Pos(xc(160), 0, 1.5) * Rot(0, 90, 0) * fillet(Cylinder(0.28, 0.25).edges(), 0.04))
add("acero_oscuro", bar((xc(165), 0, 1.5), (xc(212), 0, 1.55), 0.045))
for x in (xc(165), xc(212)):
    add("acero", Pos(x, 0, 1.5) * Rot(0, 90, 0) * Cylinder(0.08, 0.05))                  # crucetas
comp("sk575_carrier")
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
for x, z in ((XD, ZD), (XS, ZS)):                                                         # palancas de freno (lado maquinista −Y)
    add("acero_oscuro", bar((x - 0.15, -1.12, z - 0.5), (x + 0.55, -1.15, z + 0.55), 0.025))
    add("goma", Pos(x + 0.58, -1.15, z + 0.6) * Sphere(0.045))
# consola del maquinista junto al mástil (lado −Y)
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


HYCO_EXT, HYCO_CARRERAS = 191.5, (42.82, 44.07, 44.62)   # entre pernos extendido / carrera por etapa, pulgadas (src-plano-hyco)


def izaje(base, top, k):
    """Cilindro k: sub-nodos sk575_izaje_cil<k>_camisa (origen = perno del pie, en el carrier) y _etapa1, _etapa2,
    _vastago (origen = perno superior, en el mástil). Modelado extendido (mástil armado)."""
    pre = "sk575_izaje/sk575_izaje_cil%d_" % k
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

    comp(pre + "camisa", base)
    ojo(0, "acero_oscuro")
    seg(1.75, 2.25, 4.0, "acero_oscuro")
    seg(2.25, 4.5, 10.0, "acero_oscuro")                                # tapa de base
    seg(4.5, 54.6, 9.42, "rojo")                                        # camisa
    seg(54.6, 56.88, 10.0, "acero_oscuro")                              # glándula de la camisa
    z = 56.88
    for (d, dg), c, nom in zip(((8.12, 8.62), (7.00, 7.5), (4.00, None)), HYCO_CARRERAS, ("etapa1", "etapa2", "vastago")):
        comp(pre + nom, top)                                            # etapas cromadas + glándulas
        seg(z - 2, z + c - (1.5 if dg else 0), d, "acero")
        if dg:
            seg(z + c - 1.5, z + c, dg, "acero_oscuro")
        z += c
    seg(z, HYCO_EXT - 1.75, 3.69, "acero_oscuro")                       # cabezal del émbolo
    ojo(HYCO_EXT, "acero_oscuro")
    for zp, tipo in ((6.8, "ext"), (z + 0.8, "ret")):                   # puertos 1/2" NPTF con codo y manguera
        comp(pre + ("camisa" if tipo == "ext" else "vastago"))
        r = (9.42 if tipo == "ext" else 3.69) / 2 * IN
        add("acero", L * Pos(0, -r - 0.02, zp * IN) * Rot(90, 0, 0) * Cylinder(0.018, 0.04))
        if tipo == "ext":
            p0 = L * Pos(0, -r - 0.04, zp * IN)
            p0 = p0.position
            manguera(tuple(p0), (p0.X - 0.3, p0.Y, ZK + 0.15), (p0.X - 0.7, p0.Y, ZK + 0.03), r=0.014, n=6)
    comp(pre + "camisa")
    add("acero", L * Pos(0.0, 9.42 / 2 * IN + 0.01, 52.0 * IN) * Rot(-90, 0, 0) * Cylinder(0.008, 0.03))   # purga 1/8" NPT


# Pernos: superior M(-1,85; ±0,6; 6,4) en el mástil y dirección hacia (-4,6; ±0,6; 1,7) estimados por foto (C); el pie queda
# a 191,5" (extendido, src-plano-hyco) del perno superior.
for k, y in enumerate((-0.6, 0.6), 1):
    top = Vector(*M(-1.85, y, 6.4))
    u = (top - Vector(-4.6, y, 1.7)).normalized()
    pie = top - u * (HYCO_EXT * IN)
    comp("sk575_izaje/sk575_izaje_orejas_carrier")
    for dy in (-1.2, 1.2):                                              # orejas del pedestal a ambos lados del ojo
        add("rojo", box(pie.X - 0.1, pie.X + 0.1, y + dy * IN - 0.01, y + dy * IN + 0.01, ZK, pie.Z + 0.06, f=0.004))
    add("rojo", box(pie.X - 0.16, pie.X + 0.16, y - 0.09, y + 0.09, ZK, ZK + 0.04))
    comp("sk575_izaje/sk575_izaje_orejas_mastil")
    for dy in (-1.2, 1.2):                                              # orejas en el mástil
        add("amarillo", Pos(top + Vector(0, dy * IN, 0)) * Box(0.14, 0.02, 0.14))
    izaje(pie, top, k)
    IZAJE.append(dict(cil=k, pie=tuple(pie), top=tuple(top)))

comp("sk575_aparejo")
# ───────────────────────── aparejo y cables ─────────────────────────
ZA = 14.0
# aparejo-gancho unitizado (6 CORONAS Y APAREJOS p48-52; aspecto según fotos de catálogo de aparejos-gancho, referencia C):
# guarda facetada amarilla con franjas de seguridad negras, ranuras de ventilación, poleas visibles por la ranura superior,
# cuello del giratorio con aros, gancho macizo con orejas laterales para las amelas, traba y seguro.
GY = 0.27                                                                       # semiespesor de la guarda (C)
perfil = make_face(Polyline((-0.2, -0.05), (0.2, -0.05), (0.42, 0.35), (0.42, 0.8), (0.16, 1.0), (-0.16, 1.0), (-0.42, 0.8),
                            (-0.42, 0.35), close=True))
guarda = Pos(WXP, 0, ZA) * (Plane.XZ * extrude(perfil, GY, both=True))
guarda -= box(WXP - 0.09, WXP + 0.09, -GY + 0.03, GY - 0.03, ZA + 0.62, ZA + 1.1)          # ranura de entrada de las líneas
add("amarillo", fillet(guarda.edges().filter_by(Axis.Y), 0.03))
for y in (-0.18, -0.06, 0.06, 0.18):                                           # 4 poleas: 8 líneas (placa 104-330-08)
    add("acero_oscuro", Pos(WXP, y, ZA + 0.55) * Rot(90, 0, 0) * Cylinder(0.33, 0.08))
    add("acero", Pos(WXP, y, ZA + 0.55) * Rot(90, 0, 0) * Cylinder(0.06, 0.1))
add("acero", Pos(WXP, 0, ZA + 0.55) * Rot(90, 0, 0) * Cylinder(0.05, 2 * GY + 0.04))       # eje de poleas
for s_ in (-1, 1):
    cara = Pos(WXP, 0, ZA) * (Plane.XZ * extrude(perfil, 0.004, both=True))
    for k in range(3):                                                          # franjas diagonales negras
        franja = Pos(WXP - 0.3 + 0.27 * k, 0, ZA + 0.55) * Rot(0, 45, 0) * Box(0.09, 0.02, 1.4)
        add("goma", Pos(0, s_ * (GY + 0.004), 0) * (cara & franja))
    add("acero", Pos(WXP, s_ * (GY + 0.006), ZA + 0.25) * box(-0.06, 0.06, -0.003, 0.003, -0.04, 0.04))   # chapa de identificación
    for x_ in (-0.24, 0.24):                                                    # tapas abulonadas del eje
        add("amarillo", Pos(WXP + x_, s_ * (GY + 0.008), ZA + 0.12) * Rot(90, 0, 0) * Cylinder(0.045, 0.012))
    for k in range(5):                                                          # ranuras de ventilación laterales
        add("goma", box(WXP + s_ * 0.425 - 0.004, WXP + s_ * 0.425 + 0.004, -0.2 + 0.1 * k - 0.02, -0.2 + 0.1 * k + 0.02,
                        ZA + 0.45, ZA + 0.72))
add("rojo", Pos(WXP, -0.2, ZA - 0.2) * Rot(90, 0, 0) * Cylinder(0.035, 0.02))               # indicador rojo del cuello
# giratorio: cuello con aros (resorte interno, 6 CORONAS Y APAREJOS)
add("amarillo", Pos(WXP, 0, ZA - 0.75) * fillet(Cylinder(0.17, 0.7, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.04))
for z_ in (ZA - 0.6, ZA - 0.3):
    add("amarillo", Pos(WXP, 0, z_) * Cylinder(0.185, 0.03))
# gancho macizo de placa con garganta, punta y traba; orejas laterales para las amelas
perfil_g = Circle(0.22) - Pos(0.03, 0, 0) * Circle(0.1) - Pos(0.2, 0.08, 0) * Rectangle(0.22, 0.12)
gancho = Pos(WXP, 0, ZA - 1.24) * (Plane.XZ * extrude(perfil_g, 0.07, both=True))
gancho += box(WXP - 0.12, WXP + 0.12, -0.11, 0.11, ZA - 1.08, ZA - 0.75, f=0.03)            # cuerpo del gancho
add("amarillo", gancho)
add("acero", Pos(WXP + 0.16, 0, ZA - 1.08) * Rot(0, 20, 0) * box(-0.01, 0.01, -0.05, 0.05, -0.22, 0))   # traba (latch)
add("rojo", Pos(WXP + 0.12, 0.08, ZA - 1.0) * Rot(90, 0, 0) * Cylinder(0.025, 0.04))         # seguro de la traba
for s_ in (-1, 1):                                                              # orejas (asas) para las amelas
    add("amarillo", box(WXP - 0.07, WXP + 0.07, min(s_ * 0.11, s_ * 0.17), max(s_ * 0.11, s_ * 0.17), ZA - 1.08, ZA - 0.86, f=0.015))
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
# elevador de cierre central (paso 3-7/32", asas Ø 2-7/8", perno 2-23/32": planilla SOP 1110, A). Forma y color según fotos de
# catálogo de elevadores de cierre central (referencia C): cuerpo de dos mitades redondeado, orejas laterales abiertas con
# pestillo para los ojos de las amelas, puerta con traba, pasador de seguridad y cadena.
cuerpo = Pos(WXP, 0, ZEL - 0.32) * Cylinder(0.2, 0.3, align=(Align.CENTER, Align.CENTER, Align.MIN))
cuerpo += box(WXP - 0.13, WXP + 0.13, -0.27, 0.27, ZEL - 0.3, ZEL - 0.04)
cuerpo = fillet(cuerpo.edges().filter_by(Axis.Z), 0.03)
cuerpo -= Pos(WXP, 0, ZEL - 0.5) * Cylinder(3.219 / 2 * 0.0254, 1.0)               # paso 3-7/32"
cuerpo -= Pos(WXP, 0, ZEL - 0.02) * Cone(0.041, 0.09, 0.08, align=(Align.CENTER, Align.CENTER, Align.MAX))   # bisel de entrada
cuerpo -= box(WXP - 0.21, WXP + 0.21, -0.003, 0.003, ZEL - 0.33, ZEL - 0.06)       # junta de las dos mitades
add("rojo", cuerpo)
for s_ in (-1, 1):                                                              # orejas abiertas (Ø 2-7/8") con pestillo
    oreja = Pos(WXP, s_ * 0.29, ZEL) * Rot(0, 90, 0) * Torus(0.05, 0.026)
    oreja -= box(WXP - 0.05, WXP + 0.05, min(s_ * 0.29, s_ * 0.4), max(s_ * 0.29, s_ * 0.4), ZEL + 0.01, ZEL + 0.1)   # boca de la oreja
    add("rojo", oreja)
    add("rojo", Pos(WXP + 0.045, s_ * 0.29, ZEL + 0.035) * Rot(90, 0, 0) * Cylinder(0.018, 0.08))    # pestillo
    add("acero", Pos(WXP + 0.07, s_ * 0.29, ZEL) * Rot(0, 90, 0) * Cylinder(0.008, 0.06))
add("acero", Pos(WXP + 0.2, 0.1, ZEL - 0.17) * Cylinder(0.019, 0.32))                  # perno principal 2-23/32"
add("rojo", Plane(origin=(WXP + 0.22, -0.05, ZEL - 0.17), x_dir=(0, 1, 0), z_dir=(1, 0, 0)) * fillet(Box(0.22, 0.05, 0.04).edges(), 0.012))   # traba
add("rojo", box(WXP + 0.2, WXP + 0.24, -0.12, 0.02, ZEL - 0.29, ZEL - 0.08, f=0.008))  # puerta de la traba
add("acero", bar((WXP + 0.22, -0.1, ZEL - 0.17), (WXP + 0.38, -0.2, ZEL - 0.12), 0.012))   # lengüeta de cierre
add("acero", bar((WXP + 0.25, 0.04, ZEL - 0.06), (WXP + 0.25, 0.04, ZEL - 0.3), 0.007))   # pasador de seguridad
for k in range(6):                                                              # cadena del pasador
    add("acero_oscuro", Pos(WXP + 0.26, 0.06 + 0.012 * k, ZEL - 0.32 - 0.028 * k) * Rot(90 * (k % 2), 0, 0) * Torus(0.012, 0.003))
for k in range(8):                                                              # 8 líneas, cable 1"
    y = -0.42 + 0.12 * k
    add("cable", bar(M(MC + 0.3, y, H + 0.75), (WXP, y * 0.5, ZA + 0.85), 0.0127))

comp("sk575_bop")
# Orientación del stack (decisión del usuario 2026-10-17): volantes y bonetes de los rams hacia los LATERALES de la
# subestructura (±Y), no hacia el carrier ni bajo el plano inclinado. El stack se dibuja con los bonetes en X y se gira
# BOP_ROT alrededor del eje del pozo al final del bloque: choke hacia la puerta en V (+X), kill hacia el mástil (−X).
BOP_ROT = -90
_n0_bop = {k: len(v) for k, v in parts.items() if k[0] == "sk575_bop"}


def rot_bop(x, y, z):
    """Punto del stack (marco sin girar) → marco del modelo (giro BOP_ROT = −90°: (dx, dy) → (dy, −dx))."""
    return (WXP + y, -(x - WXP), z)


# ───────────────────────── Stack BOP estándar WS 7-1/16" 10 ksi (plano 8127-1110-004 rev 4) ─────────────────────────
# Plano "ESQUEMA TÍPICO STACK BOP ESTÁNDAR - 7 1/16" 10 KSI" (DJLeyria, 30/09/2026, 1:30; src-plano-bop-8127, no se versiona).
# Cotas rotuladas (A), de abajo hacia arriba: 792 ram simple [1] + carretel [2] · 760 cruz con salidas (sin número en la
# lista: "13" falta) · 1232 doble ram + shear [6] · 127 carretel 10k→5k [7] · 815 anular 5k [8]. Las parciales suman 3,726 m;
# el total rotulado dice 3,731 (5 mm): se usan las parciales. Anchos, alturas internas, bonetes y líneas: medidos sobre el plano
# (render a 1:30, 3,53 mm/px, contrastado con las 5 cotas y con la brida 7-1/16" 10k ≈ 0,48 m) → confianza C.
# Base del stack a nivel de terreno (cabezal en sótano) y choke hacia las piletas (+Y), kill hacia −Y, bonetes a lo largo del
# carrier (X): decisiones del usuario 2026-10-17, interpretación pendiente de relevar en el equipo (C12).
# Lo que el plano dibuja sobre el anular (adaptador con válvula de palanca) no figura en la lista de ítems: no se modela.
BOP_H = (0.792, 0.760, 1.232, 0.127, 0.815)                                          # parciales rotuladas (m)
BOP_Z = [0.0]
for h_ in BOP_H:
    BOP_Z.append(BOP_Z[-1] + h_)
Z1, Z2, Z3, Z4, Z5 = BOP_Z[1:]                                                        # 0,792 · 1,552 · 2,784 · 2,911 · 3,726
D10, D5 = 0.48, 0.41                                                                  # bridas 7-1/16" 10k / 5k (medidas, C)
ZKL = 0.44                                                                             # eje de la línea de kill frente al ram [1]
ZCH = 1.165                                                                           # eje de las salidas de la cruz
YK = -0.54                                                                            # T de kill [10]/[14] (lado −Y)


def brida(z, d=0.585, e=0.07, n=12, r_b=0.2413, mat="azul"):
    """Brida API con bulones (n espárragos con tuerca hexagonal en ambas caras)."""
    add(mat, Pos(WXP, 0, z) * fillet(Cylinder(d / 2, e, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.006))
    for k in range(n):
        a = 2 * pi * (k + 0.5) / n
        x, y = WXP + r_b * cos(a), r_b * sin(a)
        add("acero", Pos(x, y, z - 0.03) * Cylinder(0.019, e + 0.06, align=(Align.CENTER, Align.CENTER, Align.MIN)))
        for zz in (z - 0.03, z + e):
            add("acero_oscuro", Pos(x, y, zz) * extrude(RegularPolygon(0.034, 6), 0.03))


def cuello(z0, z1, r):
    add("rojo", Pos(WXP, 0, z0) * Cylinder(r, z1 - z0, align=(Align.CENTER, Align.CENTER, Align.MIN)))


def eje(p, d, r, L, mat="rojo"):
    """Cilindro de radio r y largo L desde el punto p en la dirección d ('x+', 'x-', 'y+', 'y-', 'z+', 'z-')."""
    s_ = 1 if d[1] == "+" else -1
    q = list(p)
    q["xyz".index(d[0])] += s_ * L
    add(mat, bar(p, tuple(q), r))


def ram(zc, x_bon, r_bon, x_cil, r_cil, x_vas, r_vas, booster=False):
    """Par de bonetes de una cavidad a lo largo de X: bonete, cilindro de operación y vástago de traba con volante."""
    for s_ in (-1, 1):
        eje((WXP + s_ * 0.49, 0, zc), "x" + "+-"[s_ < 0], r_bon, x_bon - 0.49)
        eje((WXP + s_ * x_bon, 0, zc), "x" + "+-"[s_ < 0], r_cil, x_cil - x_bon)
        if booster:                                                                   # anillos del cilindro del shear
            for xr in (x_bon + 0.02, x_cil - 0.03):
                add("rojo", Pos(WXP + s_ * xr, 0, zc) * Rot(0, 90, 0) * Cylinder(r_bon, 0.04))
        eje((WXP + s_ * x_cil, 0, zc), "x" + "+-"[s_ < 0], r_vas, x_vas - x_cil, "acero")
        add("acero_oscuro", Pos(WXP + s_ * x_vas, 0, zc) * Rot(0, 90, 0) * Torus(0.07, 0.01))
    for s_ in (-1, 1):                                                                # salidas laterales ciegas (vistas de frente)
        add("rojo", Pos(WXP, s_ * 0.255, zc) * Rot(90, 0, 0) * Cylinder(0.1, 0.03))


def compuerta(p, d, L, r=0.07, volante="z", rv=0.2, lado=1):
    """Válvula esclava manual en línea (dirección d desde p, largo L): cuerpo, bridas y volante sobre su vástago."""
    s_ = 1 if d[1] == "+" else -1
    i = "xyz".index(d[0])
    c = list(p)
    c[i] += s_ * L / 2
    dims = [0.22, 0.22, 0.26]
    dims[i] = L * 0.45
    add("rojo", Pos(*c) * fillet(Box(*dims).edges(), 0.02))
    for f_ in (-1, 1):
        q = list(c)
        q[i] += f_ * L * 0.4
        add("rojo", Pos(*q) * (Rot(0, 90, 0), Rot(90, 0, 0), Rot(0, 0, 0))[i] * Cylinder(r * 1.9, 0.05))
    j = "xyz".index(volante)
    t = list(c)
    t[j] += lado * (0.13 + 0.2)
    add("acero", bar(tuple(c), tuple(t), 0.018))
    rot = {"x": Rot(0, 90, 0), "y": Rot(90, 0, 0), "z": Rot(0, 0, 0)}[volante]
    add("acero_oscuro", Pos(*t) * rot * Torus(rv, 0.016))
    for a in (0, 120, 240):
        add("acero_oscuro", Pos(*t) * rot * Rot(0, 0, a) * Pos(rv / 2, 0, 0) * Box(rv, 0.025, 0.02))


def check(p, d, L, r=0.07):
    """Válvula de retención: cuerpo con domo de tapa."""
    s_ = 1 if d[1] == "+" else -1
    i = "xyz".index(d[0])
    c = list(p)
    c[i] += s_ * L / 2
    eje(p, d, r * 1.6, L)
    add("rojo", Pos(c[0], c[1], c[2] + r * 1.6) * Cylinder(r * 1.1, 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)))


# cabezal de pozo en sótano (interpretación del usuario): bajo el terreno, sin cota
add("azul", Pos(WXP, 0, -0.6) * Cylinder(0.4, 0.35, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("azul", Pos(WXP, 0, -0.25) * Cylinder(0.2, 0.25, align=(Align.CENTER, Align.CENTER, Align.MIN)))

# [1] ram simple 7-1/16" 10k + [2] carretel (tramo 792)
brida(0.0, d=D10, e=0.12, r_b=0.2, mat="rojo")
cuello(0.12, 0.2, 0.17)
add("rojo", box(WXP - 0.49, WXP + 0.49, -0.255, 0.255, 0.2, 0.6, f=0.025))
ram(0.4, 0.67, 0.14, 0.865, 0.09, 1.04, 0.035)
cuello(0.6, 0.64, 0.17)
brida(0.64, d=D10, e=0.07, r_b=0.2, mat="rojo")
cuello(0.71, Z1 - 0.07, 0.17)
brida(Z1 - 0.07, d=D10, e=0.07, r_b=0.2, mat="rojo")
# cruz con salidas 4-1/16" (tramo 760)
brida(Z1, d=D10, e=0.068, r_b=0.2, mat="rojo")
cuello(Z1 + 0.068, 0.988, 0.17)
add("rojo", box(WXP - 0.24, WXP + 0.24, -0.18, 0.18, 0.988, 1.341, f=0.02))
cuello(1.341, Z2 - 0.087, 0.17)
brida(Z2 - 0.087, d=D10, e=0.087, r_b=0.2, mat="rojo")
# choke (+Y): [3] cross-over 4-1/16"→3-1/16" · [4] HCR 3-1/16" 10k · [5] compuerta manual 3-1/16" 10k
eje((WXP, 0.18, ZCH), "y+", 0.08, 0.07)
add("rojo", Pos(WXP, 0.29, ZCH) * Rot(90, 0, 0) * Cylinder(0.15, 0.09))                                   # [3]
eje((WXP, 0.335, ZCH), "y+", 0.06, 0.3)
add("rojo", Pos(WXP, 0.74, ZCH) * fillet(Box(0.26, 0.28, 0.3).edges(), 0.03))                              # [4] cuerpo
add("rojo", Pos(WXP, 0.74, ZCH + 0.15) * fillet(Cylinder(0.095, 0.47, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.02))
add("acero", bar((WXP, 0.74, ZCH - 0.15), (WXP, 0.74, ZCH - 0.31), 0.02))                                # indicador
eje((WXP, 0.88, ZCH), "y+", 0.06, 0.12)
compuerta((WXP, 1.0, ZCH), "y+", 0.66, volante="z", rv=0.24)                                               # [5]
# kill (−Y): [9] cross-over 4-1/16"→2-1/16" · [10] T con [11] brida ciega · [12] compuerta hacia abajo · [14] T con [15] ciega
eje((WXP, -0.18, ZCH), "y-", 0.08, 0.07)
add("rojo", Pos(WXP, -0.3, ZCH) * Rot(90, 0, 0) * Cylinder(0.13, 0.08))                                    # [9]
eje((WXP, -0.34, ZCH), "y-", 0.045, 0.1)
add("rojo", Pos(WXP, YK, ZCH) * fillet(Box(0.21, 0.23, 0.21).edges(), 0.015))                              # [10]
add("rojo", Pos(WXP, YK - 0.14, ZCH) * Rot(90, 0, 0) * Cylinder(0.1, 0.05))                                # [11]
compuerta((WXP, YK, ZCH - 0.105), "z-", ZCH - 0.105 - ZKL - 0.1, volante="y", rv=0.2, lado=-1)             # [12]
add("rojo", Pos(WXP, YK, ZKL) * fillet(Box(0.2, 0.32, 0.2).edges(), 0.015))                                 # [14]
add("rojo", Pos(WXP, YK, ZKL - 0.12) * Cylinder(0.1, 0.05))                                                 # [15]
# línea de kill frente al ram [1] a lo largo de X: [16]/[19] compuertas · [17]/[20] retenciones · [18] WECO 1502 / [21] WECO 602
for s_, tags in ((1, ("16", "17", "18")), (-1, ("19", "20", "21"))):
    d_ = "x" + ("+" if s_ > 0 else "-")
    compuerta((WXP + s_ * 0.1, YK, ZKL), d_, 0.56, r=0.05, volante="y", rv=0.21, lado=-1)
    check((WXP + s_ * 0.66, YK, ZKL), d_, 0.26, r=0.05)
    eje((WXP + s_ * 0.92, YK, ZKL), d_, 0.05, 0.12)
    add("rojo", Pos(WXP + s_ * 1.06, YK, ZKL) * Rot(0, 90, 0) * Cylinder(0.075, 0.07))                     # unión WECO
    eje((WXP + s_ * 1.095, YK, ZKL), d_, 0.04, 0.05, "acero")
# [6] doble ram + shear 7-1/16" 10k (tramo 1232): shear abajo (cilindros con booster), pipe ram arriba
brida(Z2, d=D10, e=0.088, r_b=0.2, mat="rojo")
cuello(Z2 + 0.088, 1.765, 0.14)
add("rojo", box(WXP - 0.49, WXP + 0.49, -0.255, 0.255, 1.765, 2.584, f=0.025))
ram(1.955, 0.70, 0.16, 0.99, 0.12, 1.37, 0.045, booster=True)
ram(2.37, 0.67, 0.14, 0.865, 0.09, 1.04, 0.035)
cuello(2.584, Z3 - 0.084, 0.14)
brida(Z3 - 0.084, d=D10, e=0.084, r_b=0.2, mat="rojo")
# [7] carretel 7-1/16" 10k → 5k (tramo 127)
brida(Z3, d=D10, e=0.07, r_b=0.2, mat="rojo")
add("rojo", Pos(WXP, 0, Z3 + 0.07) * Cylinder(D10 / 2 - 0.02, Z4 - Z3 - 0.07, align=(Align.CENTER, Align.CENTER, Align.MIN)))
# [8] anular 7-1/16" 5k (tramo 815): brida, cuello, cuerpo Ø0,66, cabeza troncocónica, brida superior y orejas
brida(Z4, d=D5, e=0.1, r_b=0.17, mat="rojo")
cuello(Z4 + 0.1, 3.106, 0.115)
an = Pos(WXP, 0, 3.106) * fillet(Cylinder(0.33, 0.459, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.05)
an += Pos(WXP, 0, 3.565) * Cone(0.29, 0.24, 0.115, align=(Align.CENTER, Align.CENTER, Align.MIN))
an -= Pos(WXP, 0, Z4) * Cylinder(0.09, 2)
add("rojo", an)
add("rojo", Pos(WXP, 0, 3.68) * (Cylinder(0.24, Z5 - 3.68, align=(Align.CENTER, Align.CENTER, Align.MIN)) - Cylinder(0.09, 1)))
for s_ in (-1, 1):
    add("rojo", Pos(WXP + s_ * 0.27, 0, 3.66) * box(-0.04, 0.04, -0.012, 0.012, -0.05, 0.05))                 # orejas de izaje
    add("acero", Pos(WXP - 0.34, s_ * 0.08, 3.37) * Rot(0, 90, 0) * Cylinder(0.025, 0.06))                 # puertos hidráulicos

# mesa-cuña neumática (spider) para tubing 2-3/8"–3-1/2", apoyada sobre el piso o sobre la brida superior del anular
ZSB = max(ZP + 0.03, Z5)
add("acero_oscuro", Pos(WXP, 0, ZSB) * (fillet(Cylinder(0.32, 0.28, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.03)
                                              - Cylinder(0.11, 1)))
for k in range(3):
    a = 2 * pi * k / 3
    add("acero", Pos(WXP + 0.13 * cos(a), 0.13 * sin(a), ZSB + 0.28) * Rot(0, 0, a * 180 / pi) * box(-0.04, 0.04, -0.06, 0.06, 0, 0.305 * 0.5, f=0.01))
add("rojo", Pos(WXP + 0.38, 0, ZSB + 0.15) * Rot(0, 90, 0) * fillet(Cylinder(0.07, 0.25).edges(), 0.01))   # actuador neumático

for k, v in parts.items():                                                       # giro del stack (ver BOP_ROT)
    if k[0] == "sk575_bop":
        v[_n0_bop.get(k, 0):] = [Pos(WXP, 0, 0) * Rot(0, 0, BOP_ROT) * Pos(-WXP, 0, 0) * sh for sh in v[_n0_bop.get(k, 0):]]

comp("sk575_llave")
# ───────────────────────── llave hidráulica colgada (Gill Model 500) ─────────────────────────
# Cotas del manual Gill Model 500 (p6-7, A): largo 51" (1,295 m), espacio sobre el caño 9-1/2" (0,241) / 16-1/2" con backup
# (0,419), rango 1-5/16"–7", cilindro de izaje con 6 ft de carrera, colgada ~3 ft sobre la boca. Forma (cabeza de garganta
# abierta, cuerpo que se angosta, caja de engranajes elevada atrás con motor y válvulas, backup bajo la cabeza): proporciones
# medidas sobre la ilustración del manual (C). Nivel de detalle (válvulas con palancas, manómetro de torque, mangueras, bulones)
# según una foto de catálogo de otra llave (referencia visual, decisión del usuario 2026-10-17); color real PENDIENTE.
ZL = ZP + 0.9
LL_Z0, LL_Z1 = ZL + 0.178, ZL + 0.419                                            # cuerpo de la llave: 9-1/2" sobre el caño
RH, RB, LL_R = 0.26, 0.105, 1.295 - 0.26                                         # radio de cabeza (C), paso de 7" + mordazas, cola
LL_TOP = LL_Z1 + 0.18                                                            # tapa de la caja de engranajes (C)


def planta(r_cab, cola, w0, w1, z0, h):
    """Planta de la llave: cabeza circular en el pozo + cuerpo trapezoidal hacia +X, con paso y garganta abiertos hacia −X."""
    cuerpo = Pos(WXP, 0, z0) * Cylinder(r_cab, h, align=(Align.CENTER, Align.CENTER, Align.MIN))
    pl = make_face(Polyline((0, -w0), (cola, -w1), (cola, w1), (0, w0), close=True))
    cuerpo += Pos(WXP, 0, z0) * extrude(pl, h)
    cuerpo -= Pos(WXP, 0, z0 - 0.1) * Cylinder(RB, h + 0.2, align=(Align.CENTER, Align.CENTER, Align.MIN))
    cuerpo -= box(WXP - r_cab - 0.1, WXP, -RB, RB, z0 - 0.1, z0 + h + 0.1)                    # garganta abierta
    return cuerpo


add("rojo", planta(RH, LL_R, 0.24, 0.19, LL_Z0, LL_Z1 - LL_Z0))
# caja de engranajes elevada atrás + tapas abulonadas
add("rojo", box(WXP + 0.62, WXP + LL_R, -0.19, 0.19, LL_Z1, LL_TOP, f=0.02))
for x0_, x1_, z0_, z1_ in ((WXP + 0.30, WXP + 0.58, LL_Z0 + 0.04, LL_Z1 - 0.04), (WXP + 0.66, WXP + 0.98, LL_Z1 + 0.03, LL_TOP - 0.03)):
    for s_ in (-1, 1):
        y_ = s_ * (0.215 if x1_ < WXP + 0.6 else 0.19)
        add("rojo", box(x0_, x1_, y_ - 0.006, y_ + 0.006, z0_, z1_))
        for xb in (x0_ + 0.025, x1_ - 0.025):
            for zb in (z0_ + 0.022, z1_ - 0.022):
                add("acero_oscuro", Pos(xb, y_ + s_ * 0.008, zb) * Rot(90, 0, 0) * extrude(RegularPolygon(0.009, 6), 0.008))
# anillo guía partido sobre la cabeza ("spit guide ring") y jaula rotativa con mordazas
guia = Pos(WXP, 0, LL_Z1) * (Cylinder(0.235, 0.025, align=(Align.CENTER, Align.CENTER, Align.MIN))
                             - Cylinder(0.13, 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("acero", guia - box(WXP - 0.4, WXP, -RB - 0.01, RB + 0.01, LL_Z1 - 0.1, LL_Z1 + 0.1))
jaula = Pos(WXP, 0, LL_Z0 - 0.01) * (Cylinder(0.13, LL_Z1 - LL_Z0 + 0.04, align=(Align.CENTER, Align.CENTER, Align.MIN))
                                     - Cylinder(RB, 1, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("acero_oscuro", jaula - box(WXP - 0.4, WXP, -RB, RB, LL_Z0 - 0.1, LL_Z1 + 0.1))
for s_ in (-1, 1):                                                               # mordazas con insertos
    add("acero_oscuro", box(WXP + 0.02, WXP + 0.1, s_ * 0.052 - 0.03, s_ * 0.052 + 0.03, LL_Z0 + 0.05, LL_Z1 - 0.05, f=0.006))
    add("acero", Pos(WXP - RH - 0.01, s_ * (RB + 0.03), LL_Z1 + 0.012) * Cylinder(0.018, 0.05))              # pernos de la garganta
# backup bajo la cabeza (16-1/2" con backup): cuerpo, columnas guía y cilindros de agarre
add("acero_oscuro", planta(0.25, 0.45, 0.22, 0.18, ZL, 0.15))
for k in range(4):                                                               # columnas llave–backup
    add("acero", bar((WXP + 0.32 + 0.12 * (k % 2), -0.16 + 0.32 * (k // 2), ZL + 0.15), (WXP + 0.32 + 0.12 * (k % 2), -0.16 + 0.32 * (k // 2), LL_Z0), 0.018))
for s_ in (-1, 1):
    add("rojo", Pos(WXP + 0.33, s_ * 0.2, ZL + 0.075) * Rot(0, 90, 0) * fillet(Cylinder(0.045, 0.26).edges(), 0.008))
    add("acero", bar((WXP + 0.2, s_ * 0.2, ZL + 0.075), (WXP + 0.08, s_ * 0.2, ZL + 0.075), 0.018))
# motor hidráulico, banco de válvulas con palancas, válvula de alivio y manómetro de torque
add("acero_oscuro", Pos(WXP + 0.86, 0.06, LL_TOP) * fillet(Cylinder(0.085, 0.2, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.012))
add("acero", Pos(WXP + 0.86, 0.06, LL_TOP) * Cylinder(0.1, 0.02, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("azul", box(WXP + 0.64, WXP + 0.79, -0.18, -0.02, LL_TOP, LL_TOP + 0.13, f=0.008))
for k, y_ in enumerate((-0.14, -0.06)):                                          # palancas de rotación / cambio
    p0 = (WXP + 0.715, y_, LL_TOP + 0.13)
    p1 = (WXP + 0.6, y_, LL_TOP + 0.33)
    add("acero", bar(p0, p1, 0.009))
    add("rojo", Pos(*p1) * Sphere(0.022))
add("acero", Pos(WXP + 0.79, -0.1, LL_TOP + 0.08) * Rot(0, 90, 0) * Cylinder(0.018, 0.08))                # alivio
add("acero_oscuro", Pos(WXP + 0.84, -0.1, LL_TOP + 0.08) * Rot(0, 90, 0) * Torus(0.03, 0.006))
add("acero", bar((WXP + 0.98, 0.14, LL_TOP), (WXP + 0.98, 0.14, LL_TOP + 0.22), 0.012))
add("rojo", Pos(WXP + 0.98, 0.14, LL_TOP + 0.28) * Rot(0, 90, 0) * fillet(Cylinder(0.065, 0.04).edges(), 0.006))   # manómetro
add("blanco", Pos(WXP + 0.958, 0.14, LL_TOP + 0.28) * Rot(0, 90, 0) * Cylinder(0.055, 0.004))
add("acero_oscuro", bar((WXP + 0.955, 0.14, LL_TOP + 0.28), (WXP + 0.955, 0.17, LL_TOP + 0.31), 0.003))       # aguja
manguera((WXP + 0.79, -0.05, LL_TOP + 0.05), (WXP + 0.84, -0.02, LL_TOP + 0.02), (WXP + 0.86, 0.0, LL_TOP + 0.12), r=0.014, n=6)
manguera((WXP + 0.66, -0.1, LL_TOP + 0.06), (WXP + 0.5, -0.25, LL_TOP + 0.3), (WXP + 1.1, -0.15, ZL + 0.6), r=0.02, n=10)
# orejas traseras del brazo de torque
for s_ in (-1, 1):
    oreja = box(WXP + LL_R, WXP + LL_R + 0.09, s_ * 0.05 - 0.01, s_ * 0.05 + 0.01, ZL + 0.24, ZL + 0.38, f=0.004)
    add("rojo", oreja - Pos(WXP + LL_R + 0.055, s_ * 0.05, ZL + 0.31) * Rot(90, 0, 0) * Cylinder(0.018, 0.1))
add("acero", Pos(WXP + LL_R + 0.055, 0, ZL + 0.31) * Rot(90, 0, 0) * Cylinder(0.014, 0.14))
# estribo de colgar y cilindro de izaje con amortiguación (carrera 6 ft)
ZEST = LL_TOP + 0.35
for s_ in (-1, 1):
    add("rojo", bar((WXP + 0.5, s_ * 0.2, LL_Z1), (WXP + 0.7, s_ * 0.03, ZEST), 0.022, sq=True))
add("acero", Pos(WXP + 0.7, 0, ZEST + 0.05) * Rot(90, 0, 0) * Torus(0.05, 0.014))
add("acero", bar((WXP + 0.7, 0, ZEST + 0.1), (WXP + 0.7, 0, ZEST + 0.7), 0.025))                          # vástago
add("rojo", Pos(WXP + 0.7, 0, ZEST + 0.7) * fillet(Cylinder(0.055, ZL + 2.25 - ZEST - 0.7, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.01))
add("cable", bar((WXP + 0.7, 0, ZL + 2.25), M(MX + 0.7, -0.4, 13.0), 0.01))

# resortes de amortiguación del cilindro de izaje (detalle según la foto Westco 58-93R, misma especificación que la Gill 500; C)
add("rojo", box(WXP + 0.62, WXP + 0.78, -0.1, 0.1, ZL + 2.25, ZL + 2.29, f=0.005))
for s_ in (-1, 1):
    add("acero", bar((WXP + 0.7, s_ * 0.06, ZL + 2.29), (WXP + 0.7, s_ * 0.06, ZL + 2.46), 0.008))
    for k in range(7):
        add("acero_oscuro", Pos(WXP + 0.7, s_ * 0.06, ZL + 2.31 + 0.022 * k) * Torus(0.022, 0.005))
add("rojo", box(WXP + 0.62, WXP + 0.78, -0.1, 0.1, ZL + 2.46, ZL + 2.5, f=0.005))

# ───────── llave manual tipo B estacionada, con colgador en L (forma según fotos de catálogo; C, sin modelo identificado) ─────────
ZM0, YM = ZP + 0.95, 0.9
cab = Pos(WXP, YM, ZM0 - 0.045) * Cylinder(0.17, 0.09, align=(Align.CENTER, Align.CENTER, Align.MIN))
cab -= Pos(WXP, YM, ZM0 - 0.1) * Cylinder(0.065, 0.3, align=(Align.CENTER, Align.CENTER, Align.MIN))
cab -= box(WXP - 0.3, WXP - 0.03, YM - 0.05, YM + 0.05, ZM0 - 0.1, ZM0 + 0.1)              # boca de la mandíbula
add("rojo", cab)
for k in range(4):                                                               # juntas de las mordazas articuladas
    a = 2 * pi * (k + 0.5) / 4 + pi / 4
    add("goma", Pos(WXP + 0.12 * cos(a), YM + 0.12 * sin(a), ZM0) * Rot(0, 0, a * 180 / pi) * box(-0.05, 0.05, -0.003, 0.003, -0.046, 0.046))
    add("acero_oscuro", Pos(WXP + 0.12 * cos(a), YM + 0.12 * sin(a), ZM0 + 0.045) * Cylinder(0.02, 0.025, align=(Align.CENTER, Align.CENTER, Align.MIN)))
add("rojo", box(WXP + 0.15, WXP + 1.1, YM - 0.035, YM + 0.035, ZM0 - 0.03, ZM0 + 0.03, f=0.01))   # palanca
add("rojo", Pos(WXP + 1.1, YM, ZM0) * Rot(0, 90, 0) * fillet(Cylinder(0.045, 0.16).edges(), 0.015))  # empuñadura
add("rojo", box(WXP + 0.55, WXP + 0.63, YM - 0.06, YM + 0.06, ZM0 - 0.04, ZM0 + 0.04, f=0.008))    # soporte del colgador
add("rojo", bar((WXP + 0.59, YM, ZM0 + 0.04), (WXP + 0.59, YM, ZM0 + 1.05), 0.025))
add("rojo", bar((WXP + 0.59, YM, ZM0 + 1.05), (WXP + 0.3, YM, ZM0 + 1.05), 0.025))
add("acero_oscuro", Pos(WXP + 0.3, YM, ZM0 + 1.1) * Rot(90, 0, 0) * Torus(0.04, 0.01))         # ojo del colgador
add("rojo", box(WXP + 0.66, WXP + 0.72, YM - 0.1, YM + 0.1, ZM0 + 0.35, ZM0 + 0.37))           # manija del colgador
add("cable", bar((WXP + 0.3, YM, ZM0 + 1.14), M(MX + 0.7, 0.6, 13.0), 0.008))

# ───────── grampa de seguridad AOT A-MP-S (2-7/8"–4-1/8": 7 eslabones, 8 mordazas, 128 lb; catálogo Access Oil Tools p57,
# referencia: no es equipo relevado del TKR-10) apoyada en el piso. Paso de eslabón y alturas: C.
GX, GYC = WXP - 0.7, -0.8
for k in range(7):
    a = 2 * pi * k / 8
    cx, cy = GX + 0.14 * cos(a), GYC + 0.14 * sin(a)
    add("rojo", Pos(cx, cy, ZP) * Rot(0, 0, a * 180 / pi) * box(-0.035, 0.035, -0.045, 0.045, 0, 0.11, f=0.008))
    add("acero_oscuro", Pos(GX + 0.1 * cos(a), GYC + 0.1 * sin(a), ZP + 0.015) * Rot(0, 0, a * 180 / pi) * box(-0.006, 0.006, -0.03, 0.03, 0, 0.08))
    add("rojo", Pos(cx, cy, ZP + 0.11) * Cylinder(0.022, 0.03, align=(Align.CENTER, Align.CENTER, Align.MIN)))   # tuerca de bisagra
a7 = 2 * pi * 7 / 8
add("acero", bar((GX + 0.2 * cos(a7 - 0.3), GYC + 0.2 * sin(a7 - 0.3), ZP + 0.055), (GX + 0.2 * cos(0.3), GYC + 0.2 * sin(0.3), ZP + 0.055), 0.015))   # tornillo de cierre
add("rojo", Pos(GX + 0.21 * cos(a7), GYC + 0.21 * sin(a7), ZP + 0.055) * Rot(0, 0, a7 * 180 / pi) * Rot(0, 90, 0) * Cylinder(0.035, 0.09))
for k in (2, 5):                                                                 # manijas triangulares
    a = 2 * pi * k / 8
    p0 = (GX + 0.18 * cos(a - 0.15), GYC + 0.18 * sin(a - 0.15), ZP + 0.08)
    p1 = (GX + 0.18 * cos(a + 0.15), GYC + 0.18 * sin(a + 0.15), ZP + 0.08)
    pm = (GX + 0.34 * cos(a), GYC + 0.34 * sin(a), ZP + 0.08)
    for u, v in ((p0, pm), (pm, p1)):
        add("rojo", bar(u, v, 0.012))

comp("sk575_piso")
# ───────────────────────── piso de trabajo (planos 8114-1006-0200/0201/0210/0212) ─────────────────────────
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
add("acero_oscuro", bar((WXP + LL_R + 0.055, 0, ZL + 0.31), (X1, 1.55, ZP + 1.1), 0.03))  # brazo de torque a la baranda
manguera((WXP + 1.1, -0.15, ZL + 0.6), (WXP + 1.4, -1.2, ZP + 0.2), (X1 - 0.2, -1.5, ZP + 0.05), r=0.022)

comp("sk575_carrier")
# ───────────────────────── mangueras hidráulicas carrier → piso ─────────────────────────
for y in (-0.35, 0.0, 0.35):
    manguera((-2.3, y, ZKL + 0.05), (-1.6, y * 1.6, 0.4), (X0 + 0.1, y * 2, ZP - 0.2))
comp("sk575_planchada")
# planchada de 12 m (pipe rack) + rampa a la puerta en V. Posición respecto del pozo medida del vector de LAYOUT-WS10-0001
# (4,66 pt/m calibrado con los anclajes 27,4 + 24,4 m): planchada a 4,96…16,96 m del pozo; caballetes transversales a 7,45 y
# 14,4 m (cota "7" rotulada) con 6 m a cada lado del eje (cota "6" rotulada). Posiciones no rotuladas: confianza C.
XP0 = WXP + 4.96                                                                 # extremo de la planchada lado pozo
XCB = (WXP + 7.45, WXP + 14.4)                                                   # caballetes (WS10)
add("grating", box(XP0, XP0 + 12.0, -1.0, 1.0, 1.0, 1.05, f=0.01))
for y in (-1.0, 1.0):
    add("rojo", perfil_c(XP0, XP0 + 12.0, y, 0.85, abre=-1 if y > 0 else 1))
    for x in (0.4, 3.4, 6.4, 9.4, 11.8):
        add("rojo", bar((XP0 + x, y, 0), (XP0 + x, y, 0.7), 0.06, sq=True))
def tubo(x0, y, z, L=9.4):
    """Tramo de tubing 2-7/8" (OD 73) con cupla NU (OD 88,9 × 0,16 m) en el extremo +X."""
    add("acero_oscuro", Pos(x0 + L / 2, y, z) * Rot(0, 90, 0) * Cylinder(0.0365, L))
    add("acero", Pos(x0 + L + 0.08, y, z) * Rot(0, 90, 0) * fillet(Cylinder(0.0445, 0.16).edges(), 0.006))


tubo(XP0 + 0.8, 0.0, 1.05 + 0.0365)                                              # tramo sobre la planchada
for x in XCB:                                                                    # caballetes a ambos lados (1ª hilera ≥ 0,46 m)
    for s_ in (-1, 1):
        for y in (1.3, 4.0, 6.76):
            add("acero_oscuro", bar((x, s_ * y, 0), (x, s_ * y, 0.5), 0.05, sq=True))
        add("acero_oscuro", bar((x, s_ * 1.3, 0.5), (x, s_ * 6.76, 0.5), 0.06, ang=(0, 0, -1)))
XT = (XCB[0] + XCB[1]) / 2 - 4.7                                                 # tiros de 9,4 m centrados entre caballetes
for fila in range(3):                                                            # 3 hileras con listones separadores
    z = 0.56 + 0.0365 + fila * 0.1
    for k in range(10):
        tubo(XT + (k % 2) * 0.12, 2.25 + k * 0.19 + (fila % 2) * 0.09, z)
    if fila < 2:
        for x in XCB:
            add("grating", box(x - 0.025, x + 0.025, 2.1, 4.1, z + 0.037, z + 0.063))
ra, rb = Vector(X1, 0, ZP), Vector(XP0 + 2.0, 0, 1.07)                                 # rampa de la V a la planchada
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
    for z, w, r, nom in ((29.5, 1.12, 0.0095, "A"), (19.0, 1.3, 0.0079, "B")):  # placa API: A 3/4" EEIPS, B 5/8"
        cx, cy = MX + (w / 2 if ax > WXP else -w / 2), (w / 2 if ay > 0 else -w / 2)
        add("cable", bar(M(cx, cy, z), (ax, ay, 1.05), r))
        VIENTOS.append(dict(id="%s_%s_%s" % (nom, "v" if ax > WXP else "carrier", "-z" if ay > 0 else "+z"), tipo="viento " + nom,
                            diametro_in=0.75 if nom == "A" else 0.625, mastil=M(cx, cy, z), tierra=(ax, ay, 1.05)))
# vientos de plataforma 9/16" cruzados a los anclajes delanteros + vientos internos 2 × 1" de la corona al apoyo (Rig Up p3)
for s_ in (-1, 1):
    add("cable", bar(M(XF + 1.9, s_ * 1.2, ZM + 0.08), (WXP + 24.4, -s_ * 26.8, 1.05), 0.0071))
    add("cable", bar(M(MC - 0.9, s_ * 0.9, H), (xc(64), s_ * 0.9, 121 * IN), 0.0127))
    VIENTOS.append(dict(id="plataforma_%s" % ("-z" if s_ > 0 else "+z"), tipo="viento de plataforma", diametro_in=0.5625,
                        mastil=M(XF + 1.9, s_ * 1.2, ZM + 0.08), tierra=(WXP + 24.4, -s_ * 26.8, 1.05)))
    VIENTOS.append(dict(id="interno_%s" % ("-z" if s_ > 0 else "+z"), tipo="viento interno corona → apoyo del carrier",
                        diametro_in=1.0, mastil=M(MC - 0.9, s_ * 0.9, H), carrier=(xc(64), s_ * 0.9, 121 * IN)))
# pirosalva (línea de escape) desde el piso de enganche al anclaje en el eje del equipo, lado planchada, a 45 m del pozo
# (LAYOUT-WS10-0001, cota "45" rotulada). Fuente en conflicto: LAYOUT TKR-10 (2025) lo pone a 30 m y el Módulo Transporte y
# Montaje YPF pide ~35°; con 45 m la línea queda a ≈ 26° de la horizontal. El modelo dibuja WS10.
pz = ZM + 1.1
P0 = M(XF + 1.9, 1.2, pz)
PA = (WXP + 45.0, 0.0, 0.5)
add("cable", bar(P0, PA, 0.0143))
VIENTOS.append(dict(id="pirosalva", tipo="línea de escape (pirosalva) desde el piso de enganche", diametro_in=1.125,
                    mastil=P0, tierra=PA))
add("hormigon", box(PA[0] - 0.4, PA[0] + 0.4, -0.4, 0.4, 0, 0.5, f=0.03))

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
# Piletas: plano "Pileta 1-2-3" (golpeador / zaranda / preparadora): patín 12000 × 2400, cuba 11000 × 2300,
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

def pernos(c, d, R, n, rb=0.014, h=0.022, mat="acero"):
    """Anillo de `n` cabezas de perno (cilindros cortos) sobre un disco con normal `d`, centrado en `c`."""
    pl = Plane(origin=Vector(*c), z_dir=Vector(*d))
    for k in range(n):
        a = 2 * pi * k / n
        add(mat, pl * Pos(R * cos(a), R * sin(a), 0) * Cylinder(rb, h, align=(Align.CENTER, Align.CENTER, Align.MIN)))


def brida_c(c, d, R, e, n, Rp, mat="azul_bomba", rb=0.013):
    """Brida (disco de espesor `e` hacia `d`) con `n` pernos en el radio `Rp`."""
    d = Vector(*d).normalized()
    add(mat, bar(c, Vector(*c) + d * e, R))
    pernos(Vector(*c) + d * e, d, Rp, n, rb)


# trip tank (huella ≈ 2,1 × 2,3, C) — detalle por REFERENCIA FOTOGRÁFICA GENÉRICA de un trip tank de campo: cuerpo de chapa con nervaduras
# verticales, escalera de acceso, baranda amarilla con tapa de aforo, tubo de rebose con acople rápido, orejas de izaje, regla de nivel
# y bomba centrífuga con motor eléctrico en el patín. Capacidad, caudal y potencia del equipo instalado: PENDIENTES. Confianza C.
TX0, TX1, TY0, TY1 = WXP + 0.4, WXP + 2.5, 10.6, 12.9
TYC = (TY0 + TY1) / 2
add("acero_oscuro", box(WXP + 0.3, WXP + 2.6, 10.5, 14.1, 0, 0.15))                       # patín (incluye la bomba)
for yy in (10.5, 14.1):
    add("acero_oscuro", bar((WXP + 0.3, yy, 0.07), (WXP + 2.6, yy, 0.07), 0.07))          # largueros tubulares
add("blanco", box(TX0, TX1, TY0, TY1, 0.15, 2.6, f=0.02))                                    # cuerpo
for k in range(5):                                                                          # nervaduras verticales caras ±Y
    x = TX0 + 0.2 + k * (TX1 - TX0 - 0.4) / 4
    for yy, sg in ((TY0, -1), (TY1, 1)):
        add("blanco", box(x - 0.04, x + 0.04, yy + (-0.05 if sg < 0 else 0), yy + (0 if sg < 0 else 0.05), 0.2, 2.5))
for k in range(4):                                                                          # nervaduras caras ±X
    y = TY0 + 0.25 + k * (TY1 - TY0 - 0.5) / 3
    for xx, sg in ((TX0, -1), (TX1, 1)):
        add("blanco", box(xx + (-0.05 if sg < 0 else 0), xx + (0 if sg < 0 else 0.05), y - 0.04, y + 0.04, 0.2, 2.5))
add("blanco", box(TX0 - 0.03, TX1 + 0.03, TY0 - 0.03, TY1 + 0.03, 2.5, 2.6))                # cinta superior
# cubierta: parrilla antideslizante, tapa de aforo abulonada y venteo con cuello de ganso
add("grating", box(TX0, TX1, TY0, TY1, 2.6, 2.64))
add("acero_oscuro", Pos((TX0 + TX1) / 2 + 0.2, TYC, 2.64) * Cylinder(0.26, 0.05, align=(Align.CENTER, Align.CENTER, Align.MIN)))
pernos(((TX0 + TX1) / 2 + 0.2, TYC, 2.69), (0, 0, 1), 0.21, 10, 0.014)
add("acero", bar((TX1 - 0.2, TYC + 0.6, 2.64), (TX1 - 0.2, TYC + 0.6, 3.1), 0.045))
add("acero", Pos(TX1 - 0.28, TYC + 0.6, 3.1) * Rot(90, 0, 0) * Torus(0.08, 0.045) & box(-99, 99, -99, 99, 3.1, 99))
railing([(TX0, TY0, 2.6), (TX1, TY0, 2.6), (TX1, TY1, 2.6), (TX0, TY1, 2.6)], h=1.0, step=1.05)
# tubo de rebose blanco por el borde superior y bajada hasta un acople rápido (cara −X)
add("blanco", bar((TX0 - 0.1, TY1 - 0.3, 2.72), (TX1 + 0.1, TY1 - 0.3, 2.72), 0.055))
add("acero_oscuro", bar((TX0 - 0.1, TY1 - 0.3, 2.72), (TX0 - 0.1, TY1 - 0.3, 0.55), 0.045))
for zz in (1.0, 1.9):
    add("acero", bar((TX0 - 0.06, TY1 - 0.3, zz), (TX0 + 0.0, TY1 - 0.3, zz), 0.03))        # abrazaderas
add("acero", bar((TX0 - 0.1, TY1 - 0.3, 0.55), (TX0 - 0.1, TY1 - 0.3, 0.42), 0.075))      # acople rápido (cuerpo)
add("acero", bar((TX0 - 0.1, TY1 - 0.3, 0.42), (TX0 - 0.1, TY1 - 0.3 - 0.12, 0.42), 0.03))   # palanca
# orejas de izaje (chapa con ojal) en las 4 esquinas altas
for xx in (TX0 + 0.25, TX1 - 0.25):
    for yy, sg in ((TY0, -1), (TY1, 1)):
        add("acero_oscuro", box(xx - 0.06, xx + 0.06, yy + (-0.1 if sg < 0 else 0), yy + (0 if sg < 0 else 0.1), 2.25, 2.4))
        add("acero", Pos(xx, yy + sg * 0.05, 2.38) * Rot(90, 0, 0) * Torus(0.04, 0.012))
# regla de nivel (cara +X): visor de vidrio con marco y marcas cada 0,2 m
add("acero", box(TX1 + 0.05, TX1 + 0.09, TYC - 0.1, TYC + 0.1, 0.35, 2.45))
add("vidrio", box(TX1 + 0.09, TX1 + 0.1, TYC - 0.05, TYC + 0.05, 0.4, 2.4))
for k in range(11):
    add("acero_oscuro", box(TX1 + 0.09, TX1 + 0.11, TYC + 0.07, TYC + 0.13, 0.4 + k * 0.2 - 0.005, 0.4 + k * 0.2 + 0.005))
# escalera de acceso a la cubierta (cara −X), largueros C y escalones de chapa perforada
stair((TX0, TYC, 2.6), (TX0 - 2.6, TYC, 0.0), 0.7, mat_str="blanco", paso=0.24)
# boca de salida inferior (cara +Y) con manguito de goma y brida
add("blanco", bar((TX1 - 0.35, TY1, 0.45), (TX1 - 0.35, TY1 + 0.05, 0.45), 0.1))
add("goma", bar((TX1 - 0.35, TY1 + 0.05, 0.45), (TX1 - 0.35, TY1 + 0.22, 0.45), 0.075))

# bomba centrífuga con motor eléctrico sobre el patín (lado +Y): motor con aletas y tapa de ventilador, protector de acople (amarillo),
# soporte de rodamientos, voluta, succión desde la boca de salida y descarga a una entrada superior del tanque con válvula
PY, PZ = TY1 + 0.65, 0.5
add("acero_oscuro", box(WXP + 0.45, WXP + 2.4, PY - 0.3, PY + 0.3, 0.15, 0.28))               # bancada
add("acero", Pos(WXP + 0.85, PY, PZ) * Rot(0, 90, 0) * Cylinder(0.17, 0.6))                    # motor
for k in range(7):
    add("acero", Pos(WXP + 0.6 + k * 0.08, PY, PZ) * Rot(0, 90, 0) * Cylinder(0.185, 0.02))     # aletas
add("acero_oscuro", Pos(WXP + 0.5, PY, PZ) * Rot(0, 90, 0) * Cylinder(0.2, 0.1))               # tapa del ventilador
add("acero_oscuro", box(WXP + 0.8, WXP + 1.0, PY - 0.08, PY + 0.08, PZ + 0.17, PZ + 0.3))        # caja de bornes
add("acero_oscuro", box(WXP + 0.65, WXP + 1.05, PY - 0.2, PY + 0.2, 0.28, PZ - 0.14))            # patas del motor
add("amarillo", box(WXP + 1.15, WXP + 1.45, PY - 0.14, PY + 0.14, PZ - 0.14, PZ + 0.14, f=0.02))   # protector del acople
add("acero_oscuro", box(WXP + 1.45, WXP + 1.65, PY - 0.14, PY + 0.14, 0.28, PZ + 0.14))          # soporte de rodamientos
add("acero", Pos(WXP + 1.8, PY, PZ) * Rot(0, 90, 0) * Cylinder(0.26, 0.2))                       # voluta
add("acero", Pos(WXP + 2.0, PY, PZ) * Rot(0, 90, 0) * Cone(0.12, 0.2, 0.2))                       # cono de succión
add("acero", bar((WXP + 1.8, PY, PZ + 0.2), (WXP + 1.8, PY, 1.1), 0.06))                          # descarga
add("acero", bar((WXP + 1.8, PY, 1.1), (WXP + 1.8, TY1 + 0.02, 1.1), 0.06))
brida_c((WXP + 1.8, TY1 + 0.02, 1.1), (0, -1, 0), 0.1, 0.03, 6, 0.08, mat="acero")
add("azul_bomba", Pos(WXP + 1.8, TY1 + 0.3, 1.1) * fillet(Box(0.2, 0.22, 0.22).edges(), 0.02))      # válvula de descarga
add("acero_oscuro", bar((WXP + 1.8, TY1 + 0.3, 1.2), (WXP + 1.8, TY1 + 0.3, 1.38), 0.012))
add("acero_oscuro", Pos(WXP + 1.8, TY1 + 0.3, 1.38) * Torus(0.1, 0.012))
add("acero", bar((TX1 - 0.35, TY1 + 0.22, 0.45), (TX1 - 0.35, PY, 0.45), 0.055))                  # succión
add("acero", bar((TX1 - 0.35, PY, 0.45), (WXP + 2.1, PY, 0.45), 0.055))
add("acero", bar((WXP + 2.1, PY, 0.45), (WXP + 2.1, PY, PZ), 0.055))

comp("sk575_manifold")
# manifold de ahogo (esquema de la empresa M1–M12) con la escala del choke Thrubore B20-9908: columnas a 64,03", filas a 62,18".
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

comp("sk575_manifold")
# línea de choke desde la compuerta [5] (plano 8127, girada con el stack) hasta M9 (a ras del suelo) y línea de ahogo desde la bomba triplex hasta la
# unión WECO 1502 [18] de la línea de kill del stack
fl = [rot_bop(WXP, 1.68, ZCH), (WXP + 2.0, 0, ZCH), (WXP + 2.0, 0, 0.15), (WXP + 2.0, 6.0, 0.15), (CX, 6.0, 0.15), (CX, CY - 0.75, 0.15), (CX, CY - 0.75, CZ),
      (CX, CY - 0.62, CZ)]
BX, BY = WXP - 19.2, 14.3                                                   # bomba triplex (ver abajo)
kl = [rot_bop(WXP + 1.15, YK, ZKL), rot_bop(WXP + 1.4, YK, ZKL), rot_bop(WXP + 1.4, YK, 0.1), (WXP + 4.0, -1.4, 0.1), (WXP + 4.0, 13.4, 0.1),
      (BX + 5.15, 13.4, 0.1), (BX + 5.15, BY + 0.1, 0.1), (BX + 5.15, BY + 0.1, 1.15), (BX + 5.15, BY + 0.6, 1.15)]
for path, r in ((fl, 0.045), (kl, 0.03)):
    for p, q in zip(path, path[1:]):
        add("azul", bar(p, q, r), Pos(*q) * Sphere(r * 1.3))

comp("sk575_bomba")
# bomba triplex sobre patín (6 × 2,4, layout WS10 = A). Detalle por REFERENCIA FOTOGRÁFICA GENÉRICA de una bomba de lodo triplex de catálogo
# (power end con tapas y eje de piñón, fluid end de 3 cilindros con tapas abulonadas, múltiple de succión inferior, múltiple de descarga
# superior con amortiguador de pulsaciones rojo y válvula de seguridad). Marca, modelo, camisas, carrera, presión y caudal del equipo
# instalado: PENDIENTES (no se inventan); motor y cardán ilustrativos. Confianza C, no as-built.
BX, BY = WXP - 19.2, 14.3
YC = BY + 1.2                                                                   # eje longitudinal de la bomba
CIL = (YC - 0.45, YC, YC + 0.45)                                                # ejes de los 3 cilindros (paso 0,45 m, C)
ZE = 0.95                                                                       # altura del eje de los cilindros


# patín: viga principal tubular con punta de trineo redondeada y travesaños (acero_oscuro) + puntas rojas
add("acero_oscuro", box(BX, BX + 6, BY + 0.2, BY + 2.2, 0.0, 0.2))
for yy in (BY + 0.2, BY + 2.2):
    add("azul_bomba", bar((BX + 0.1, yy, 0.12), (BX + 5.9, yy, 0.12), 0.12))
    for xx in (BX + 0.1, BX + 5.9):
        add("rojo", Pos(xx, yy, 0.12) * Sphere(0.14))
for k in range(7):
    add("azul_bomba", box(BX + 0.2 + k * 0.9, BX + 0.3 + k * 0.9, BY + 0.2, BY + 2.2, 0.2, 0.3))
add("acero_oscuro", box(BX + 0.05, BX + 5.95, BY + 0.3, BY + 2.1, 0.2, 0.26))          # piso de chapa

# motor (ilustrativo): gabinete rojo con radiador, tapa de valvulas y escape
gabinete_ = box(BX + 0.3, BX + 3.0, BY + 0.3, BY + 2.1, 0.26, 2.0, f=0.05)
add("rojo", gabinete_)
add("acero_oscuro", box(BX + 0.25, BX + 0.3, BY + 0.4, BY + 2.0, 0.6, 1.9))   # radiador
add("acero", bar((BX + 2.2, BY + 1.5, 2.0), (BX + 2.2, BY + 1.5, 2.7), 0.06))
add("acero_oscuro", bar((BX + 2.2, BY + 1.5, 2.2), (BX + 2.2, BY + 1.5, 2.55), 0.1))    # silenciador

# cardán y protector de transmisión (amarillo)
add("acero", bar((BX + 3.0, YC, ZE), (BX + 3.5, YC, ZE), 0.07))
add("amarillo", box(BX + 3.05, BX + 3.45, YC - 0.3, YC + 0.3, 0.3, 1.25, f=0.04))

# power end (caja de cigüeñal): bloque azul con costillas, tapa de acceso oval, tapas redondas de rodamiento y ojales de izaje
add("azul_bomba", box(BX + 3.5, BX + 4.95, BY + 0.35, BY + 2.05, 0.26, 1.7, f=0.06))
add("azul_bomba", box(BX + 3.55, BX + 4.9, BY + 0.55, BY + 1.85, 1.7, 1.78, f=0.02))   # tapa superior
for xx in (BX + 3.85, BX + 4.25, BX + 4.6):
    for sy in (-1, 1):
        add("azul_bomba", box(xx - 0.03, xx + 0.03, YC + sy * 0.86 - (0.0 if sy < 0 else 0.03), YC + sy * 0.86 + (0.03 if sy < 0 else 0.0), 0.35, 1.62))  # costillas
for sy in (-1, 1):
    c = (BX + 4.25, YC + sy * 0.86, 1.0)
    add("acero", Pos(*c) * Rot(90, 0, 0) * Pos(0, 0, 0 if sy > 0 else -0.04) * Cylinder(0.2, 0.04))     # tapa oval (aprox. disco)
    pernos((c[0], c[1] + sy * 0.02, c[2]), (0, sy, 0), 0.23, 10, 0.012)
    add("azul_bomba", Pos(BX + 4.25, YC + sy * 0.9, 1.0) * Rot(90, 0, 0) * Cylinder(0.3, 0.02))        # chapa de nombre / zona de rotulación
c = (BX + 3.5, YC + 0.45, 1.05)
add("azul_bomba", bar((BX + 3.5, YC, 1.0), (BX + 3.5 - 0.07, YC, 1.0), 0.45))                            # tapa circular de rodamiento (lado motor)
pernos((BX + 3.43, YC, 1.0), (-1, 0, 0), 0.4, 16, 0.016)
add("acero", bar((BX + 3.43, YC, 1.0), (BX + 3.2, YC, 1.0), 0.1))                                          # extremo del eje de piñón
for sy in (-1, 1):                                                                                          # ojales de izaje
    add("acero", Pos(BX + 4.25, YC + sy * 0.45, 1.8) * Rot(90, 0, 0) * Torus(0.09, 0.02))

# extensiones de cruceta (3 tubos con brida) y vástagos de émbolo hacia el fluid end
for yy in CIL:
    add("azul_bomba", bar((BX + 4.9, yy, ZE), (BX + 5.2, yy, ZE), 0.15))
    brida_c((BX + 4.95, yy, ZE), (1, 0, 0), 0.2, 0.05, 8, 0.17)
    add("acero", bar((BX + 5.05, yy, ZE), (BX + 5.3, yy, ZE), 0.05))                                       # vástago

# fluid end (bloque con 3 cilindros): cuerpo, tapas de camisa abulonadas, tapas de válvula arriba
add("azul_bomba", box(BX + 5.2, BX + 5.7, YC - 0.75, YC + 0.75, 0.45, 1.5, f=0.05))
for yy in CIL:
    add("azul_bomba", bar((BX + 5.7, yy, ZE), (BX + 5.78, yy, ZE), 0.2))                                    # tapa de camisa
    pernos((BX + 5.78, yy, ZE), (1, 0, 0), 0.16, 8, 0.016)
    add("acero", bar((BX + 5.78, yy, ZE), (BX + 5.84, yy, ZE), 0.07))                                       # tapón central
    add("azul_bomba", bar((BX + 5.45, yy, 1.5), (BX + 5.45, yy, 1.64), 0.13))                               # tapa de válvula de descarga
    pernos((BX + 5.45, yy, 1.64), (0, 0, 1), 0.1, 6, 0.012)
    add("azul_bomba", bar((BX + 5.45, yy, 0.45), (BX + 5.45, yy, 0.36), 0.12))                              # tapa de válvula de succión

# múltiple de succión (inferior): tubo transversal con bridas, brida ciega y boca de entrada 6"
add("azul_bomba", bar((BX + 5.45, YC - 1.0, 0.34), (BX + 5.45, YC + 1.0, 0.34), 0.12))
brida_c((BX + 5.45, YC + 1.0, 0.34), (0, 1, 0), 0.19, 0.05, 12, 0.15)
brida_c((BX + 5.45, YC - 1.0, 0.34), (0, -1, 0), 0.19, 0.05, 12, 0.15)
add("acero_oscuro", bar((BX + 5.45, YC + 1.05, 0.34), (BX + 5.45, YC + 1.12, 0.34), 0.1))                # brida ciega

# múltiple de descarga (superior) + amortiguador de pulsaciones rojo con cuello abulonado, manómetro y tapa
add("azul_bomba", bar((BX + 5.45, YC - 0.9, 1.78), (BX + 5.45, YC + 0.9, 1.78), 0.1))
for yy in CIL:
    add("azul_bomba", bar((BX + 5.45, yy, 1.64), (BX + 5.45, yy, 1.78), 0.07))
brida_c((BX + 5.45, YC + 0.9, 1.78), (0, 1, 0), 0.15, 0.04, 8, 0.12)
brida_c((BX + 5.45, YC - 0.9, 1.78), (0, -1, 0), 0.15, 0.04, 8, 0.12)
add("azul_bomba", bar((BX + 5.45, YC, 1.78), (BX + 5.45, YC, 2.0), 0.09))
brida_c((BX + 5.45, YC, 2.0), (0, 0, 1), 0.13, 0.04, 8, 0.1, mat="rojo")
add("rojo", Pos(BX + 5.45, YC, 2.5) * Sphere(0.3))                                                          # cuerpo esférico del amortiguador
add("rojo", bar((BX + 5.45, YC, 2.05), (BX + 5.45, YC, 2.25), 0.12))                                       # cuello
brida_c((BX + 5.45, YC, 2.74), (0, 0, 1), 0.12, 0.05, 12, 0.09, mat="rojo")                                  # tapa superior abulonada
add("acero", Pos(BX + 5.45, YC - 0.3, 2.6) * Rot(0, 90, 0) * Cylinder(0.07, 0.03))                          # manómetro (bisel)
add("blanco", Pos(BX + 5.45, YC - 0.325, 2.6) * Rot(90, 0, 0) * Cylinder(0.055, 0.01))
add("acero", bar((BX + 5.45, YC - 0.3, 2.5), (BX + 5.45, YC - 0.3, 2.6), 0.012))

# válvula de seguridad / alivio (roja) sobre el múltiple de descarga: brida, cuerpo, cabeza y salida lateral
add("azul_bomba", bar((BX + 5.45, YC - 0.55, 1.78), (BX + 5.45, YC - 0.55, 2.05), 0.06))
brida_c((BX + 5.45, YC - 0.55, 2.05), (0, 0, 1), 0.1, 0.04, 6, 0.08)
add("rojo", bar((BX + 5.45, YC - 0.55, 2.09), (BX + 5.45, YC - 0.55, 2.35), 0.09))
add("rojo", Pos(BX + 5.45, YC - 0.55, 2.38) * Sphere(0.1))
add("rojo", bar((BX + 5.45, YC - 0.55, 2.3), (BX + 5.45 - 0.2, YC - 0.55, 2.3), 0.06))

comp("sk575_acumulador")
# ───────────────────────── acumulador del BOP (unidad de cierre API 16D) ─────────────────────────
"""Acumulador del BOP sobre la huella del layout (8 × 2,4 m, src-layout-ws10) con 5 botellones a 3.000 psi (src-folleto).
El resto es REFERENCIA GENÉRICA (confianza C, no es el equipo instalado): manual O&M de la unidad de cierre CPC S/N 4650
(Rig Manufacturing / Consolidated Pressure Control, API 16D, 07/2011; fuente src-ref-rigmfg-4650):
  · botellón 11 gal 3.000 psi de vejiga, carga superior, prueba 4.500 psi, precarga 1.000 psi ........ p33 §2.3, p23 §5.1.3
  · válvula de purga individual por botellón ......................................................... p23 §5.1.3.4
  · válvula de carga de N2 arriba con protector (se retira para cargar) .............................. p98
  · Ø y largo del botellón: DERIVADOS de 11 gal (p7/p33) + relación largo/Ø ≈ 5,5 medida en el plano p17
    (sin cotas; la tabla "Bottle Dimensions" p138 está en el Part 2, no relevado) → BOT_D, BOT_L (C)
  · manifold de botellones de tubo 4" maquinado, 6 bocas, 5.000 psi; aislación esférica 1"; purga aguja 1/2" p33 §2.2
  · válvula de alivio 3/4" tarada a 3.300 psi ........................................................ p33 §2.4
  · selectoras 1" de 4 vías / 3 posiciones, rotativas de sello de corte, acero inoxidable, 3.000 psi .. p34 §3.0 C-D
  · válvula de 3 vías del by-pass (presión regulada / 3.000 psi), palanca LP/HP ...................... p34 §3.0 E, p95 P
  · reguladora anular serie 3100 1" (motor neumático + ajuste manual, manija en T) ..................... p33 §3.0 A, p94 K
  · reguladora del manifold serie 2100 1" (manual, salida 1.500 psi) ................................. p33 §3.0 B
  · 3 manómetros de 6" con glicerina: acumulador 0-6.000, manifold 0-6.000, anular 0-3.000 psi ........ p34 §3.0 F
  · cañería 1" Sch 160 + filtro en T ................................................................... p34 §3.0 H
  · bomba triplex eléctrica con correa dentada + motor XP; bombas neumáticas 40:1 ....................... p34-35 §4-5
  · depósito de acero con bafles, boca de inspección/llenado 4" ........................................ p33 §2.1, p98
Cantidad de selectoras = funciones del stack modelado (anular, 2 rams, HCR de choke CL2 y de ahogo KL2: src-esquema-ahogo);
2 bombas neumáticas (la unidad 4650 tiene 3). Dimensiones de válvulas, reguladoras, bombas y depósito: proporciones de las
fotos p94-95 y de la página CAMTOP (src-ref-rigmfg-4650 / referencia), confianza C. Ilustrativo: no es cálculo."""
AX, AY = WXP - 24.6, -5.9                     # esquina del patín (layout WS10)
ACUM_L, ACUM_W = 8.0, 2.4                     # huella del layout (src-layout-ws10) — NO cambiar
N_BOT = 5                                     # botellones (src-folleto) — NO cambiar
BOT_GAL = 11                                  # volumen nominal por botellón (ref. p33)
BOT_LD = 5.5                                  # largo/Ø de la envolvente medido en el plano p17 (C)
BOT_T = 0.055                                 # espesor de pared / Ø (estimado para 3.000 psi, C)


def _vol_interno(D):
    """Volumen interno (m3) de una envolvente cilíndrica con casquetes semiesféricos, Ø exterior D y largo BOT_LD·D."""
    ri, Li = D / 2 * (1 - 2 * BOT_T), BOT_LD * D - D * 2 * BOT_T
    return pi * ri * ri * (Li - 2 * ri) + 4 / 3 * pi * ri ** 3


_D = 0.2
for _ in range(60):                            # Ø exterior que da 11 gal internos (bisección por punto fijo)
    _D *= (BOT_GAL * 0.00378541 / _vol_interno(_D)) ** (1 / 3)
BOT_D, BOT_L = round(_D, 3), round(BOT_LD * _D, 3)   # ≈ 0,236 m × 1,30 m (C, derivado)
assert abs(_vol_interno(_D) - BOT_GAL * 0.00378541) < 1e-6
BOT_P = 0.34                                  # paso entre botellones (C)
ZPAT = 0.21                                   # cara superior del piso del patín
MAN_D, MAN_Z = 4.5 * IN, 0.36                 # manifold de botellones: tubo 4" (OD 4,5" estimado) y altura de su eje
BOT_Z0 = MAN_Z + MAN_D / 2 + 0.07             # base de la envolvente (niple + adaptador sobre la boca del manifold)
YB_ = AY + 0.62                               # fila de botellones
XB0 = AX + 0.42                               # primer botellón
TQ = (AX + 2.3, AX + 3.7, AY + 0.45, AY + 1.85, ZPAT, 0.86)   # depósito x0, x1, y0, y1, z0, z1 (C)
HDR_Y, HDR_Z = AY + 1.98, 1.06                # bloque de válvulas (frente hacia +Y, lado del equipo)
N_SEL = 5                                     # selectoras 4 vías: anular, ram sup., ram inf., HCR CL2, HCR KL2
SEL_P = 0.19                                  # paso entre selectoras (C)
GAUGE_D = 6 * IN                              # manómetros de 6" (p34)


def codo(p, u1, u2, r, rc):
    """Codo a 90° de radio de curvatura rc en la esquina p (entra en dirección u1, sale en u2)."""
    u1, u2 = Vector(*u1).normalized(), Vector(*u2).normalized()
    c = Vector(*p) - u1 * rc + u2 * rc
    return Plane(origin=c, x_dir=-u2, z_dir=(-u2).cross(u1)) * toro(rc, r, 90)


def toro(R, r, ang=360, n=14):
    """Toro facetado (sección de n lados, < 28° entre caras → sin aristas): mucho más liviano que Torus al teselar."""
    return revolve(Pos(R, 0, 0) * (Plane.XZ * RegularPolygon(r, n)), Axis.Z, ang)


def caneria(mat, pts, r, rc=None, uniones=()):
    """Cañería por puntos con codos de radio rc en cada quiebre a 90° y uniones hexagonales en los tramos indicados."""
    rc = rc or 2.5 * r
    pts = [Vector(*p) for p in pts]
    ini = pts[0]
    for i in range(1, len(pts)):
        a, p = pts[i - 1], pts[i]
        u1 = (p - a).normalized()
        fin = p
        if i < len(pts) - 1:
            u2 = (pts[i + 1] - p).normalized()
            if abs(u1.dot(u2)) < 1e-6:
                fin = p - u1 * rc
                add(mat, codo(p, u1, u2, r, rc))
        add(mat, bar(ini, fin, r))
        if i - 1 in uniones:                              # unión doble (tuerca hexagonal) a mitad del tramo
            m = (ini + fin) * 0.5
            add(mat, Plane(origin=m, z_dir=u1) * extrude(RegularPolygon(r * 1.9, 6), r * 1.6, both=True))
        ini = p + (pts[i + 1] - p).normalized() * rc if fin != p else p


def hexa(mat, p, eje, s, h):
    """Prisma hexagonal (tuerca, adaptador) de entre-caras s y alto h sobre el eje dado."""
    add(mat, Plane(origin=p, z_dir=eje) * chamfer(extrude(RegularPolygon(s / 3 ** 0.5, 6, major_radius=True), h).edges().group_by(Axis.Z)[-1], s * 0.08))


def botellon(k):
    """Botellón de vejiga (ref. p33/p23/p98): envolvente con casquetes semiesféricos, boca de gas con válvula y protector,
    boca de fluido con adaptador hexagonal, niple a la boca del manifold y válvula de purga individual."""
    x, y = XB0 + k * BOT_P, YB_
    comp("sk575_acumulador/sk575_acum_botellon_%d" % (k + 1), (x, y, BOT_Z0))
    R, L = BOT_D / 2, BOT_L
    with BuildSketch(Plane.XZ) as pf:                     # perfil (r, z) revolucionado
        with BuildLine():
            Polyline((0, 0), (0.05, 0), (0.05, 0.035))
            ThreePointArc((0.05, 0.035), (R * 0.72, R * 0.33), (R, R))
            Line((R, R), (R, L - R))
            ThreePointArc((R, L - R), (R * 0.72, L - R * 0.33), (0.035, L - 0.02))
            Polyline((0.035, L - 0.02), (0.035, L + 0.025), (0, L + 0.025), (0, 0))
        make_face()
    add("rojo", Pos(x, y, BOT_Z0) * revolve(pf.sketch, axis=Axis.Z))
    # boca de gas: válvula de carga (hex) + protector roscado (p98)
    hexa("acero", Vector(x, y, BOT_Z0 + L + 0.025), (0, 0, 1), 0.045, 0.03)
    add("acero_oscuro", Pos(x, y, BOT_Z0 + L + 0.055) * chamfer(Cylinder(0.026, 0.065, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().group_by(Axis.Z)[-1], 0.008))
    # boca de fluido: adaptador hexagonal + niple a la boca del manifold
    hexa("acero", Vector(x, y, BOT_Z0 - 0.045), (0, 0, 1), 0.075, 0.045)
    add("acero", bar((x, y, MAN_Z), (x, y, BOT_Z0 - 0.045), 0.021))
    # válvula de purga individual (p23 §5.1.3.4): cuerpo + vástago con manija en T hacia el frente (−Y)
    add("acero", Pos(x, y - 0.06, BOT_Z0 - 0.022) * chamfer(Box(0.04, 0.04, 0.04).edges(), 0.005))
    add("acero", bar((x, y - 0.08, BOT_Z0 - 0.022), (x, y - 0.13, BOT_Z0 - 0.022), 0.006))
    add("acero_oscuro", bar((x - 0.035, y - 0.13, BOT_Z0 - 0.022), (x + 0.035, y - 0.13, BOT_Z0 - 0.022), 0.006))


def rack():
    """Bastidor de botellones: parantes C, abrazaderas de banda con orejas y bulón, travesaños delantero y trasero."""
    comp("sk575_acumulador/sk575_acum_rack", (XB0, YB_, ZPAT))
    x0, x1 = XB0 - BOT_P * 0.62, XB0 + (N_BOT - 1) * BOT_P + BOT_P * 0.62
    R = BOT_D / 2
    for x in (x0, x1):
        for s in (-1, 1):
            add("rojo", upn((x, YB_ + s * (R + 0.04), ZPAT), (x, YB_ + s * (R + 0.04), BOT_Z0 + BOT_L - 0.25), (-1 if x == x1 else 1, 0, 0), h=0.08, bw=0.04, t=0.006))
    for z in (BOT_Z0 + 0.35, BOT_Z0 + BOT_L - 0.32):
        for s in (-1, 1):                                 # travesaños de ángulo L
            add("rojo", bar((x0, YB_ + s * (R + 0.04), z), (x1, YB_ + s * (R + 0.04), z), 0.025, ang=(0, -s, -1)))
        for k in range(N_BOT):
            x = XB0 + k * BOT_P
            band = Pos(x, YB_, z) * (Cylinder(R + 0.006, 0.045) - Cylinder(R + 0.0005, 0.06))
            add("acero_oscuro", band)
            for s in (-1, 1):                             # orejas atornilladas al travesaño
                add("acero_oscuro", Pos(x + s * (R * 0.55), YB_ + s * 0 + (R + 0.02) * (1 if s > 0 else -1), z) * Box(0.03, 0.035, 0.045))
                hexa("acero", Vector(x + s * (R * 0.55), YB_ + (R + 0.0375) * (1 if s > 0 else -1), z), (0, 1 if s > 0 else -1, 0), 0.019, 0.012)
    # cabezal superior (guarda de las válvulas de gas)
    zt = BOT_Z0 + BOT_L + 0.16
    for s in (-1, 1):
        add("rojo", bar((x0, YB_ + s * (R + 0.04), BOT_Z0 + BOT_L - 0.25), (x0, YB_ + s * (R + 0.04), zt), 0.022))
        add("rojo", bar((x1, YB_ + s * (R + 0.04), BOT_Z0 + BOT_L - 0.25), (x1, YB_ + s * (R + 0.04), zt), 0.022))
        add("rojo", bar((x0, YB_ + s * (R + 0.04), zt), (x1, YB_ + s * (R + 0.04), zt), 0.022))
    for x in (x0, x1):
        add("rojo", bar((x, YB_ - R - 0.04, zt), (x, YB_ + R + 0.04, zt), 0.022))


def manifold_botellones():
    """Manifold de botellones 4" de 6 bocas (5 botellones + salida), aislación esférica 1", manómetro de banco con su válvula
    de aislación, purga aguja 1/2" y válvula de alivio 3/4" tarada a 3.300 psi (ref. p33, p94 G-J, p95 X-Z)."""
    comp("sk575_acumulador/sk575_acum_manifold", (XB0, YB_, MAN_Z))
    x1r = XB0 + (N_BOT - 1) * BOT_P + BOT_P * 0.62           # parante del rack (lado depósito)
    xa, xb = XB0 - 0.2, x1r + 0.17
    tubo = Pos((xa + xb) / 2, YB_, MAN_Z) * Rot(0, 90, 0) * Cylinder(MAN_D / 2, xb - xa)
    add("acero", tubo)
    for x in (xa, xb):                                    # tapas maquinadas con chaflán
        add("acero", Pos(x, YB_, MAN_Z) * Rot(0, 90, 0) * chamfer(Cylinder(MAN_D / 2 + 0.008, 0.025).edges(), 0.006))
    for k in range(N_BOT + 1):                            # bocas (boss) de 6 puertos
        x = XB0 + k * BOT_P if k < N_BOT else x1r + 0.1
        add("acero", Pos(x, YB_, MAN_Z + MAN_D / 2 - 0.005) * Cylinder(0.032, 0.03, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    for x in (xa + 0.12, xb - 0.2):                       # cunas de apoyo
        add("rojo", Pos(x, YB_, ZPAT) * Box(0.08, 0.16, MAN_Z - MAN_D / 2 - ZPAT, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    # salida (6.ª boca) → esférica de aislación 1" → al bloque de válvulas
    xo = x1r + 0.1                                        # salida entre el rack y el depósito
    zo = MAN_Z + MAN_D / 2 + 0.06
    add("acero", Pos(xo, YB_, zo) * chamfer(Box(0.07, 0.07, 0.07).edges(), 0.01))           # esférica (cuerpo)
    add("rojo", bar((xo, YB_, zo + 0.035), (xo, YB_, zo + 0.06), 0.008))
    add("rojo", Pos(xo, YB_ + 0.08, zo + 0.065) * Box(0.025, 0.18, 0.012))                    # palanca
    caneria("acero", [(xo, YB_, zo + 0.035), (xo, YB_, HDR_Z), (xo, HDR_Y, HDR_Z), (TQ[0] - 0.05, HDR_Y, HDR_Z)], 0.0167, uniones=(0, 1))
    # manómetro del banco (J) con válvula de aislación (G) y purga aguja (H) en el extremo
    add("acero", bar((xa, YB_, MAN_Z), (xa - 0.12, YB_, MAN_Z), 0.011))
    add("acero", Pos(xa - 0.12, YB_, MAN_Z) * chamfer(Box(0.04, 0.04, 0.04).edges(), 0.005))
    add("acero_oscuro", bar((xa - 0.12, YB_ - 0.02, MAN_Z), (xa - 0.12, YB_ - 0.08, MAN_Z), 0.005))
    add("acero_oscuro", Pos(xa - 0.12, YB_ - 0.08, MAN_Z) * Cylinder(0.018, 0.008, rotation=(90, 0, 0)))   # volantito aguja
    add("acero", bar((xa - 0.12, YB_, MAN_Z + 0.02), (xa - 0.12, YB_, MAN_Z + 0.2), 0.007))
    manometro(Vector(xa - 0.12, YB_, MAN_Z + 0.2 + 0.0635 / 2 + 0.02), (-1, 0, 0), 2.5 * IN)
    # entrada para bomba alternativa: válvula 1" de paso total con tapón (p33 §2.6)
    xq = XB0 - 0.12
    add("acero", bar((xq, YB_ + MAN_D / 2 - 0.01, MAN_Z), (xq, YB_ + 0.2, MAN_Z), 0.0167))
    bola((xq, YB_ + 0.13, MAN_Z), (0, 1, 0), r=0.02, palanca=(-1, 0, 0))
    hexa("acero_oscuro", Vector(xq, YB_ + 0.2, MAN_Z), (0, 1, 0), 0.04, 0.025)
    # válvula de alivio 3/4" (3.300 psi) con descarga al depósito
    xp = XB0 + 0.5 * BOT_P
    yp = YB_ + MAN_D / 2 + 0.07                               # cuerpo fuera de los parantes del rack
    add("acero", Pos(xp, yp - 0.03, MAN_Z) * Rot(90, 0, 0) * Cylinder(0.016, 0.14))
    bola((xp, yp + 0.0, MAN_Z), (0, 1, 0), r=0.014, palanca=(1, 0, 0))          # aislación del PRV (fig. 2 ítem X)
    hexa("acero", Vector(xp, yp + 0.04, MAN_Z), (0, 1, 0), 0.05, 0.035)
    add("acero", Pos(xp, yp + 0.1, MAN_Z) * chamfer(Box(0.05, 0.05, 0.06).edges(), 0.006))
    add("amarillo", Pos(xp, yp + 0.1, MAN_Z + 0.03) * Cylinder(0.02, 0.12, align=(Align.CENTER, Align.CENTER, Align.MIN)))   # bonete tarado
    add("amarillo", Pos(xp, yp + 0.1, MAN_Z + 0.15) * chamfer(Cylinder(0.024, 0.03, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().group_by(Axis.Z)[-1], 0.006))
    caneria("acero", [(xp + 0.025, yp + 0.1, MAN_Z), (TQ[0] - 0.25, yp + 0.1, MAN_Z), (TQ[0] - 0.25, yp + 0.1, TQ[5] + 0.05),
                      (TQ[0] + 0.1, yp + 0.1, TQ[5] + 0.05), (TQ[0] + 0.1, yp + 0.1, TQ[5])], 0.0133)


def manometro(c, n, d):
    """Manómetro de cara d (caja inoxidable, bisel, dial blanco, aguja) con la cara hacia n."""
    n = Vector(*n).normalized()
    pl = Plane(origin=c, z_dir=n, x_dir=Vector(0, 0, 1).cross(n) if abs(n.Z) < 0.9 else Vector(1, 0, 0))
    r = d / 2
    add("acero", pl * Pos(0, 0, -0.045) * Cylinder(r + 0.004, 0.045, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero", pl * (Cylinder(r + 0.007, 0.012, align=(Align.CENTER, Align.CENTER, Align.MIN)) - Cylinder(r - 0.004, 0.03)))   # bisel
    add("blanco", pl * Pos(0, 0, 0.003) * Cylinder(r - 0.004, 0.004, align=(Align.CENTER, Align.CENTER, Align.MAX)))
    add("acero_oscuro", pl * Pos(0.25 * r, 0.25 * r, 0.0045) * Rot(0, 0, 45) * Box(0.75 * r, 0.006, 0.003))
    add("acero_oscuro", pl * Pos(0, 0, 0.005) * Cylinder(0.008, 0.004))


def selectora(i, x, tipo="4vias"):
    """Selectora 1" rotativa de sello de corte (ref. p34): placa base atornillada al bloque, cuerpo inoxidable con eje hacia
    el operador (+Y), cubo, palanca de 3 posiciones (neutro = vertical) con empuñadura y sector indicador."""
    nm = "sk575_acum_valvula_%s_%s" % (tipo, i)
    y0, z = HDR_Y + 0.045, HDR_Z
    comp("sk575_acumulador/" + nm, (x, y0, z))
    add("acero", Pos(x, y0, z) * Box(0.13, 0.02, 0.13, align=(Align.CENTER, Align.MIN, Align.CENTER)))     # placa base
    for sx in (-1, 1):
        for sz in (-1, 1):
            hexa("acero", Vector(x + sx * 0.048, y0 + 0.02, z + sz * 0.048), (0, 1, 0), 0.014, 0.009)
    cuerpo = Pos(x, y0 + 0.02, z) * Rot(-90, 0, 0) * Cylinder(0.052, 0.085, align=(Align.CENTER, Align.CENTER, Align.MIN))
    add("acero", chamfer(cuerpo.edges().sort_by(Axis.Y)[-1], 0.008))
    add("acero", Pos(x, y0 + 0.105, z) * Rot(-90, 0, 0) * Cylinder(0.024, 0.04, align=(Align.CENTER, Align.CENTER, Align.MIN)))   # cubo
    yh = y0 + 0.135
    ang = {"4vias": 0, "3vias": -35}[tipo]
    pl = Plane(origin=(x, yh, z), x_dir=(-1, 0, 0), z_dir=(0, 1, 0))
    palanca = pl * Rot(0, 0, ang) * Pos(0, 0.13, 0.006) * Box(0.026, 0.27, 0.012)
    add("acero_oscuro", palanca)
    add("acero_oscuro", pl * Rot(0, 0, ang) * Pos(0, 0.26, 0.006) * Rot(90, 0, 0) * chamfer(Cylinder(0.016, 0.09).edges(), 0.006))
    # sector indicador (abre / neutro / cierra) detrás de la palanca
    sector = (Circle(0.088) - Circle(0.036)) & Pos(0, 0.1) * Rectangle(0.3, 0.2)
    add("blanco", Plane(origin=(x, y0 + 0.1, z), x_dir=(-1, 0, 0), z_dir=(0, 1, 0)) * extrude(sector, 0.004))
    for a in (-50, 0, 50):                                # marcas de posición
        add("acero_oscuro", Plane(origin=(x, y0 + 0.104, z), x_dir=(-1, 0, 0), z_dir=(0, 1, 0)) * Rot(0, 0, a) * Pos(0, 0.075, 0) * Box(0.006, 0.02, 0.002))
    if tipo == "4vias":                                   # interruptores de posición (fig. 2 ítem T, p95) para el remoto
        add("acero_oscuro", Pos(x, y0 + 0.06, z + 0.075) * chamfer(Box(0.07, 0.05, 0.045).edges(), 0.005))
        add("acero", bar((x + 0.035, y0 + 0.06, z + 0.075), (x + 0.07, y0 + 0.06, z + 0.06), 0.004))
    # salidas A (abre) y B (cierra): 1" Sch 160 hacia abajo hasta el riel de conexiones del patín (p97)
    for dx in (-0.035, 0.035):
        caneria("acero", [(x + dx, y0 - 0.03, z - 0.065), (x + dx, y0 - 0.03, 0.32), (x + dx, AY + ACUM_W - 0.095, 0.32)], 0.0167, uniones=(0,))


def reguladora(tipo, x):
    """Reguladora 1" montada en placa: cuerpo, bonete con resorte y ajuste. 3100 (anular): motor neumático lateral con caja de
    engranajes + manija en T alta (ref. p33 A, p94 K). 2100 (manifold): volante manual (ref. p33 B)."""
    comp("sk575_acumulador/sk575_acum_reguladora_%s" % tipo, (x, HDR_Y, HDR_Z))
    y, z = HDR_Y - 0.1, HDR_Z + 0.06
    add("acero", Pos(x, y, z) * chamfer(Box(0.12, 0.12, 0.14, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.01))
    for sx in (-1, 1):
        for sy in (-1, 1):
            hexa("acero", Vector(x + sx * 0.045, y + sy * 0.045, z + 0.14), (0, 0, 1), 0.016, 0.01)
    add("acero", Pos(x, y, z + 0.14) * Cylinder(0.045, 0.06, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("rojo", Pos(x, y, z + 0.2) * chamfer(Cylinder(0.038, 0.16, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().group_by(Axis.Z)[-1], 0.01))
    if tipo == "anular":
        add("acero", bar((x, y, z + 0.36), (x, y, z + 0.62), 0.012))                         # vástago de ajuste
        add("acero_oscuro", bar((x - 0.1, y, z + 0.62), (x + 0.1, y, z + 0.62), 0.011))       # manija en T
        for s in (-1, 1):
            add("acero_oscuro", Pos(x + s * 0.1, y, z + 0.62) * Rot(0, 90, 0) * chamfer(Cylinder(0.016, 0.06).edges(), 0.006))
        add("acero", Pos(x, y, z + 0.4) * chamfer(Box(0.1, 0.08, 0.08).edges(), 0.008))      # caja de engranajes
        add("aluminio", Pos(x + 0.1, y, z + 0.4) * Rot(0, 90, 0) * chamfer(Cylinder(0.04, 0.1).edges(), 0.008))   # motor neumático
        caneria("acero", [(x + 0.15, y, z + 0.4), (x + 0.2, y, z + 0.4), (x + 0.2, y, z + 0.1)], 0.005)
    else:
        add("acero", bar((x, y, z + 0.36), (x, y, z + 0.44), 0.01))
        add("acero_oscuro", Pos(x, y, z + 0.44) * toro(0.08, 0.009, n=10))
        for a in range(0, 360, 120):
            add("acero_oscuro", bar((x, y, z + 0.44), (x + 0.08 * cos(a * pi / 180), y + 0.08 * sin(a * pi / 180), z + 0.44), 0.006))
    caneria("acero", [(x, y, z), (x, y, HDR_Z - 0.04), (x, HDR_Y - 0.04, HDR_Z - 0.04)], 0.0167)


def deposito():
    """Depósito de fluido de acero con bafles (internos, no modelados), boca de inspección/llenado 4" con tapa, tapa de
    inspección abulonada, visor de nivel y purga (ref. p33 §2.1, p94 D-F, p98). Medidas C."""
    x0, x1, y0, y1, z0, z1 = TQ
    comp("sk575_acumulador/sk575_acum_deposito", ((x0 + x1) / 2, (y0 + y1) / 2, z0))
    t = box(x0, x1, y0, y1, z0, z1, f=0.02)
    add("rojo", t)
    add("rojo", box(x0 - 0.015, x1 + 0.015, y0 - 0.015, y1 + 0.015, z1 - 0.012, z1 + 0.004))      # pestaña de tapa
    xc, yc = x0 + 0.3, y0 + 0.3                                                                   # boca 4" (D)
    add("rojo", Pos(xc, yc, z1) * Cylinder(0.065, 0.06, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero_oscuro", Pos(xc, yc, z1 + 0.06) * chamfer(Cylinder(0.075, 0.03, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().group_by(Axis.Z)[-1], 0.01))
    for a in (0, 90):
        add("acero_oscuro", Pos(xc, yc, z1 + 0.095) * Rot(0, 0, a) * Box(0.12, 0.016, 0.012))
    # tapa de inspección abulonada en el lateral −Y
    pc, w, h = Vector((x0 + x1) / 2, y0, (z0 + z1) / 2), 0.55, 0.36
    add("rojo", Pos(pc.X, y0 - 0.006, pc.Z) * chamfer(Box(w, 0.012, h).edges().filter_by(Axis.Y), 0.03))
    for i in range(6):
        for zz in (-h / 2 + 0.03, h / 2 - 0.03):
            hexa("acero", Vector(pc.X - w / 2 + 0.04 + i * (w - 0.08) / 5, y0 - 0.012, pc.Z + zz), (0, -1, 0), 0.014, 0.008)
    for zz in (-0.06, 0.06):
        for xx in (-w / 2 + 0.03, w / 2 - 0.03):
            hexa("acero", Vector(pc.X + xx, y0 - 0.012, pc.Z + zz), (0, -1, 0), 0.014, 0.008)
    # visor de nivel en el lateral +X
    add("acero", Pos(x1 + 0.025, y0 + 0.2, (z0 + z1) / 2) * Box(0.025, 0.04, 0.42))
    add("vidrio", Pos(x1 + 0.038, y0 + 0.2, (z0 + z1) / 2) * Box(0.004, 0.018, 0.36))
    # purga inferior + succión de bombas
    caneria("acero", [(x1, y0 + 0.5, z0 + 0.07), (x1 + 0.2, y0 + 0.5, z0 + 0.07)], 0.024)
    add("acero", Pos(x1 + 0.2, y0 + 0.5, z0 + 0.07) * chamfer(Box(0.07, 0.07, 0.07).edges(), 0.01))
    add("rojo", bar((x1 + 0.2, y0 + 0.5, z0 + 0.105), (x1 + 0.2, y0 + 0.5, z0 + 0.13), 0.008))
    add("rojo", Pos(x1 + 0.2, y0 + 0.4, z0 + 0.135) * Box(0.02, 0.2, 0.01))


def bloque_valvulas():
    """Bloque de válvulas (manifold de control) sobre el depósito, panel de 3 manómetros de 6" y soportes."""
    comp("sk575_acumulador/sk575_acum_bloque_valvulas", ((TQ[0] + TQ[1]) / 2, HDR_Y, HDR_Z))
    xa, xb = TQ[0] + 0.05, TQ[1] - 0.05
    add("acero", Pos((xa + xb) / 2, HDR_Y, HDR_Z) * chamfer(Box(xb - xa, 0.09, 0.09).edges().filter_by(Axis.X), 0.006))
    for x in (TQ[0] + 0.21, TQ[0] + 1.33):                                            # ménsulas sobre el depósito
        add("rojo", upn((x, HDR_Y, TQ[5]), (x, HDR_Y, HDR_Z - 0.045), (0, 1, 0), h=0.09, bw=0.04, t=0.006))
    # panel de manómetros detrás del bloque
    pz0, pz1 = HDR_Z + 0.2, HDR_Z + 0.6
    px0, px1 = TQ[0] + 0.45, TQ[0] + 1.05
    add("rojo", box(px0, px1, HDR_Y - 0.36, HDR_Y - 0.35, pz0, pz1))
    for x in (px0 + 0.04, px1 - 0.04):
        add("rojo", upn((x, HDR_Y - 0.37, TQ[5]), (x, HDR_Y - 0.37, pz1), (0, -1, 0), h=0.06, bw=0.03, t=0.005))
    for i in range(3):                                                                # acumulador / manifold / anular
        manometro(Vector(px0 + 0.1 + i * 0.2, HDR_Y - 0.345 + 0.05, (pz0 + pz1) / 2), (0, 1, 0), GAUGE_D)
    for i in range(3):                                                                # tubing de los manómetros
        x = px0 + 0.1 + i * 0.2
        caneria("acero", [(x, HDR_Y - 0.37, (pz0 + pz1) / 2), (x, HDR_Y - 0.42, (pz0 + pz1) / 2), (x, HDR_Y - 0.42, HDR_Z), (x, HDR_Y - 0.045, HDR_Z)], 0.005)
    # purga del bloque al depósito (fig. 1 ítem L; 6.000 psi, p34 G): aguja con manija en T y retorno
    xl = xb - 0.17
    add("acero", Pos(xl, HDR_Y - 0.02, HDR_Z + 0.045) * Cylinder(0.018, 0.06, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero", bar((xl, HDR_Y - 0.02, HDR_Z + 0.105), (xl, HDR_Y - 0.02, HDR_Z + 0.16), 0.005))
    add("acero_oscuro", bar((xl - 0.04, HDR_Y - 0.02, HDR_Z + 0.16), (xl + 0.04, HDR_Y - 0.02, HDR_Z + 0.16), 0.005))
    caneria("acero", [(xl, HDR_Y - 0.045, HDR_Z - 0.02), (xl, HDR_Y - 0.15, HDR_Z - 0.02), (xl, HDR_Y - 0.15, TQ[5])], 0.006)
    # acumulador del by-pass (fig. 2 ítem O): botellón chico sobre el extremo del bloque (medidas C)
    xo_, zo_ = xb - 0.01, HDR_Z + 0.045
    add("acero", Pos(xo_, HDR_Y, zo_) * Cylinder(0.02, 0.05, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("rojo", Pos(xo_, HDR_Y, zo_ + 0.05) * chamfer(Cylinder(0.05, 0.3, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.02))
    hexa("acero", Vector(xo_, HDR_Y, zo_ + 0.35), (0, 0, 1), 0.03, 0.03)
    # filtro en T 1" 5.000 psi a la entrada del bloque (p34 H)
    add("acero", Pos(xa - 0.06, HDR_Y, HDR_Z) * Rot(0, 90, 0) * Cylinder(0.035, 0.1))
    add("acero", Pos(xa - 0.06, HDR_Y, HDR_Z - 0.035) * Cylinder(0.03, 0.09, align=(Align.CENTER, Align.CENTER, Align.MAX)))
    hexa("acero", Vector(xa - 0.06, HDR_Y, HDR_Z - 0.125), (0, 0, -1), 0.05, 0.025)


def bomba_electrica():
    """Bomba triplex eléctrica (ref. p34 §4.1: émbolos 1-1/4", correa dentada; p35 §4.2 motor XP) con guarda de correa,
    motor con aletas, base de perfiles y descarga con válvula de retención. Medidas C."""
    x0, y0 = AX + 3.95, AY + 1.35
    comp("sk575_acumulador/sk575_acum_bomba_electrica", (x0 + 0.6, y0 + 0.35, ZPAT))
    zb = ZPAT + 0.112
    for yy in (y0, y0 + 0.62):                                                     # base de perfiles + chapa
        add("rojo", box(x0, x0 + 1.25, yy, yy + 0.08, ZPAT, zb - 0.012))
    add("rojo", box(x0, x0 + 1.25, y0, y0 + 0.7, zb - 0.012, zb))
    # motor XP (eje Y): carcasa con aletas, tapas, cubreventilador, patas y caja de bornes
    mx, my, mz = x0 + 0.95, y0 + 0.33, zb + 0.2
    add("acero_oscuro", Pos(mx, my, mz) * Rot(90, 0, 0) * Cylinder(0.15, 0.42))
    for i in range(7):
        add("acero_oscuro", Pos(mx, my - 0.18 + i * 0.06, mz) * Rot(90, 0, 0) * Cylinder(0.165, 0.012))
    for s in (-1, 1):
        add("acero_oscuro", Pos(mx, my + s * 0.225, mz) * Rot(90, 0, 0) * chamfer(Cylinder(0.14, 0.03).edges(), 0.01))
    add("acero_oscuro", Pos(mx, my - 0.3, mz) * Rot(90, 0, 0) * chamfer(Cylinder(0.145, 0.13).edges().group_by(Axis.Z)[-1], 0.03))
    add("acero_oscuro", Pos(mx, my, zb) * Box(0.3, 0.36, 0.06, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero_oscuro", Pos(mx + 0.17, my, mz + 0.05) * chamfer(Box(0.06, 0.14, 0.12).edges(), 0.008))
    # triplex (cigüeñal eje Y): cárter, extremo de fluido con 3 émbolos y tapas de válvula, guarda de correa entre poleas
    tx, ty = x0 + 0.4, y0 + 0.33
    add("rojo", Pos(tx, ty, zb) * chamfer(Box(0.32, 0.36, 0.26, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.02))
    zf = zb + 0.13
    add("acero", Pos(tx - 0.29, ty, zf) * chamfer(Box(0.14, 0.34, 0.16).edges(), 0.01))
    for k in (-1, 0, 1):
        add("acero", bar((tx - 0.16, ty + k * 0.1, zf), (tx - 0.22, ty + k * 0.1, zf), 0.016))
        hexa("acero", Vector(tx - 0.29, ty + k * 0.1, zf + 0.08), (0, 0, 1), 0.05, 0.03)
    zt = zb + 0.13
    sk = (Pos(tx, zt) * Circle(0.16) + Pos(mx, mz) * Circle(0.11)
          + Polygon((tx, zt + 0.16), (mx, mz + 0.11), (mx, mz - 0.11), (tx, zt - 0.16), align=None))
    add("rojo", Plane(origin=(0, y0 + 0.72, 0), x_dir=(1, 0, 0), z_dir=(0, -1, 0)) * extrude(sk, 0.12))
    for x, z in ((tx, zt), (mx, mz)):
        add("acero", Pos(x, y0 + 0.555, z) * Rot(90, 0, 0) * Cylinder(0.025, 0.06))   # ejes hasta la guarda
    # descarga con retención 1" 5.000 psi (p35 §4.6) al extremo del bloque de válvulas
    xd = tx - 0.42
    caneria("acero", [(tx - 0.36, ty, zf), (xd, ty, zf), (xd, ty, HDR_Z), (xd, HDR_Y, HDR_Z), (TQ[1] - 0.05, HDR_Y, HDR_Z)], 0.0167, uniones=(1, 3))
    add("acero", Pos(xd, ty, zf + 0.3) * chamfer(Box(0.06, 0.06, 0.09).edges(), 0.008))


def bomba_neumatica(i, x):
    """Bomba neumática 40:1 (ref. p35 §5.1): motor de aire con tapas y tirantes, sección de fluido inferior, válvula de aire
    y silenciador. Medidas C."""
    y = AY + 1.05
    comp("sk575_acumulador/sk575_acum_bomba_neumatica_%d" % i, (x, y, ZPAT))
    add("rojo", Pos(x, y, ZPAT) * Box(0.26, 0.26, 0.02, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero", Pos(x, y, ZPAT + 0.02) * Cylinder(0.045, 0.32, align=(Align.CENTER, Align.CENTER, Align.MIN)))  # sección de fluido
    hexa("acero", Vector(x, y, ZPAT + 0.12), (0, 0, 1), 0.1, 0.04)
    za = ZPAT + 0.34
    for zz in (za, za + 0.2):
        add("aluminio", Pos(x, y, zz) * chamfer(Box(0.24, 0.24, 0.035, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().filter_by(Axis.Z), 0.02))
    add("aluminio", Pos(x, y, za + 0.035) * Cylinder(0.1, 0.165, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            add("acero", bar((x + sx * 0.095, y + sy * 0.095, za), (x + sx * 0.095, y + sy * 0.095, za + 0.25), 0.007))
    add("acero", Pos(x, y, za + 0.235) * Cylinder(0.03, 0.05, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero_oscuro", Pos(x + 0.14, y, za + 0.1) * Rot(0, 90, 0) * chamfer(Cylinder(0.025, 0.08).edges(), 0.008))   # silenciador
    caneria("acero", [(x, y - 0.12, za + 0.15), (x, AY + 0.28, za + 0.15), (x, AY + 0.28, ZPAT + 0.08)], 0.012)   # aire
    caneria("acero", [(x, y + 0.045, ZPAT + 0.25), (x, y + 0.2, ZPAT + 0.25)], 0.009)                          # descarga


def neumatica_frl():
    """Filtro y lubricador de aire de las bombas neumáticas (ref. p94 E) + colector de aire con entrada 1-1/2" NPT (p97)."""
    x, y = AX + 3.85, AY + 0.28
    comp("sk575_acumulador/sk575_acum_bomba_neumatica_1")
    caneria("acero", [(x - 0.1, y, ZPAT + 0.08), (AX + 4.75, y, ZPAT + 0.08)], 0.02)
    for k, dx in enumerate((-0.14, 0.0, 0.14)):                   # trampa de agua, filtro y lubricador (p35 §5.3, p94 E)
        add("acero", Pos(x + dx, y, ZPAT + 0.55) * Box(0.08, 0.08, 0.06))
        add("acero_oscuro", Pos(x + dx, y, ZPAT + 0.52) * Cylinder(0.03, 0.14, align=(Align.CENTER, Align.CENTER, Align.MAX)))
    caneria("acero", [(x - 0.2, y, ZPAT + 0.55), (x + 0.2, y, ZPAT + 0.55), (x + 0.2, y, ZPAT + 0.08)], 0.012)
    add("rojo", bar((x - 0.24, y, ZPAT), (x - 0.24, y, ZPAT + 0.7), 0.02, sq=True))


def esclusa(mat, p, eje, r=0.024, k=1.0):
    """Válvula esclusa (gate) roscada: cuerpo, bonete hacia +Z y volante. eje = dirección del flujo."""
    p = Vector(*p)
    add(mat, Plane(origin=p, z_dir=eje) * extrude(RegularPolygon(r * 1.7, 6), r * 1.6, both=True))
    add(mat, Pos(p) * Cylinder(r * 1.25, r * 3.4 * k, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("acero", bar(p + Vector(0, 0, r * 3.4 * k), p + Vector(0, 0, r * 5 * k), r * 0.25))
    add("rojo", Pos(p + Vector(0, 0, r * 5 * k)) * toro(r * 2.2, r * 0.3, n=10))
    for a in (0, 120, 240):
        add("rojo", bar(p + Vector(0, 0, r * 5 * k), p + Vector(r * 2.2 * cos(a * pi / 180), r * 2.2 * sin(a * pi / 180), r * 5 * k), r * 0.2))


def bola(p, eje, r=0.018, palanca=(0, 0, 1)):
    """Válvula esférica roscada: cuerpo hexagonal, bonete y palanca plana hacia `palanca`."""
    p, u = Vector(*p), Vector(*palanca)
    add("acero", Plane(origin=p, z_dir=eje) * extrude(RegularPolygon(r * 1.9, 6), r * 1.8, both=True))
    add("acero", Pos(p) * Cylinder(r * 0.9, r * 2.6, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    t = p + Vector(0, 0, r * 2.9)
    add("rojo", bar(t, t + u * r * 8, r * 0.4, sq=True))


def filtro_y(p, eje, r=0.024):
    """Filtro en Y roscado: cuerpo sobre el eje del flujo y pierna a 45° hacia abajo con tapón hexagonal (ref. p94 A, p95 W)."""
    p, u = Vector(*p), Vector(*eje).normalized()
    add("acero", Plane(origin=p, z_dir=u) * Cylinder(r * 1.5, r * 5))
    d = (u * 0.7071 + Vector(0, 0, -0.7071)).normalized()
    add("acero", bar(p, p + d * r * 4.5, r * 1.2))
    hexa("acero", p + d * r * 4.5, d, r * 2.2, r * 1.2)


def succion_y_descarga():
    """Succión y descarga de las bombas (ref. p35 §4.5-4.6 y §5.3; p94 A-C; p95 W, AB): triplex con válvula de succión 1-1/2" y
    filtro en Y de malla 20; bombas neumáticas con colector de succión, válvula de la línea de succión, esclusa de by-pass,
    esclusa de aislación y filtro en Y por bomba; descarga de cada neumática con retención 5.000 psi al colector de descarga."""
    x1 = TQ[1]
    comp("sk575_acumulador/sk575_acum_succion_descarga", (x1, AY + 1.2, 0.3))
    # triplex: salida del depósito → esclusa 1-1/2" (AB) → filtro en Y (W) → entrada del extremo de fluido
    tyy, xf = AY + 1.68, AX + 3.95 + 0.4 - 0.29
    caneria("acero", [(x1, tyy, 0.3), (xf, tyy, 0.3), (xf, tyy, 0.37)], 0.024)
    esclusa("acero", (x1 + 0.07, tyy, 0.3), (1, 0, 0), r=0.024, k=0.8)
    filtro_y((x1 + 0.2, tyy, 0.3), (1, 0, 0))
    # neumáticas: colector de succión con válvula de línea (B) + esclusa de by-pass, ramal por bomba con aislación (C) y filtro (A)
    ys, zs = AY + 0.82, 0.3
    caneria("acero", [(x1, ys, zs), (AX + 4.7, ys, zs)], 0.02)
    esclusa("acero", (x1 + 0.08, ys, zs), (1, 0, 0), r=0.02, k=0.8)                                # línea de succión (B)
    esclusa("acero", (AX + 4.7, ys, zs), (1, 0, 0), r=0.02, k=0.8)                                  # by-pass (p35 §5.3)
    for x in (AX + 4.1, AX + 4.55):
        caneria("acero", [(x - 0.12, ys, zs), (x - 0.12, AY + 1.05, zs), (x - 0.045, AY + 1.05, zs)], 0.012)
        esclusa("acero", (x - 0.12, ys + 0.07, zs), (0, 1, 0), r=0.012, k=1.2)                         # aislación (C)
        filtro_y((x - 0.12, ys + 0.16, zs), (0, 1, 0), r=0.014)                                         # filtro en Y (A)
    # descarga de las neumáticas: retención 5.000 psi por bomba y colector al vertical de descarga de la triplex
    xd, zc = AX + 3.95 + 0.4 - 0.42, 0.95
    for x in (AX + 4.1, AX + 4.55):
        caneria("acero", [(x, AY + 1.25, ZPAT + 0.25), (x, AY + 1.25, zc)], 0.009)
        add("acero", Pos(x, AY + 1.25, ZPAT + 0.5) * chamfer(Box(0.04, 0.04, 0.07).edges(), 0.006))      # retención
        add("acero", Pos(x, AY + 1.25, ZPAT + 0.5) * Box(0.05, 0.012, 0.012))                            # flecha de flujo
    caneria("acero", [(AX + 4.55, AY + 1.25, zc), (xd, AY + 1.25, zc), (xd, AY + 1.68, zc)], 0.012)


def caja_xp(p, w, d, h, n_bul=3, eje=(-1, 0, 0)):
    """Caja a prueba de explosión: cuerpo con tapa de brida abulonada hacia `eje` (−X por defecto)."""
    p = Vector(*p)
    add("rojo", Pos(p) * chamfer(Box(w, d, h).edges(), 0.012))
    add("rojo", Pos(p + Vector(-w / 2 - 0.012, 0, 0)) * Box(0.024, d + 0.03, h + 0.03))
    for zz in [h / 2 + 0.005 - i * (h + 0.01) / (n_bul - 1) for i in range(n_bul)]:
        for yy in (-(d + 0.01) / 2, (d + 0.01) / 2):
            hexa("acero", p + Vector(-w / 2 - 0.024, yy, zz), (-1, 0, 0), 0.016, 0.01)


def electrico_y_alarmas():
    """Eléctrico y alarmas (ref. p35 §4.3-4.4, p36 §8.1, p94 N, p95 S, plano eléctrico p14): arrancador NEMA 7 con luz de
    "bomba en marcha", caja eléctrica (PLC Siemens S7-222 y fuente PULS SL5.300 adentro, no modeladas), presostatos
    hidroeléctrico (triplex) e hidroneumático (neumáticas), panel de alarma local con 3 pilotos (baja presión de acumulador,
    bajo nivel, bajo aire) y pulsador de silencio, baliza Div 2 y bocina XP en mástil, interruptor de flotante N/C en el
    depósito y transmisor de presión XP en el manifold de botellones. Medidas C."""
    comp("sk575_acumulador/sk575_acum_electrico", (AX + 5.12, AY + 0.7, ZPAT))
    x = AX + 5.12
    for y in (AY + 0.4, AY + 1.0):                                                   # postes
        add("rojo", bar((x, y, ZPAT), (x, y, 1.75), 0.03, sq=True))
    add("rojo", bar((x, AY + 0.4, 1.0), (x, AY + 1.0, 1.0), 0.02, sq=True))
    caja_xp((x - 0.09, AY + 0.4, 1.12), 0.12, 0.34, 0.4)                             # arrancador (N)
    add("luz", Pos(x - 0.17, AY + 0.4, 1.38) * Rot(0, 90, 0) * Cylinder(0.022, 0.03))  # "pump running"
    add("acero", Pos(x - 0.17, AY + 0.4, 1.38) * Rot(0, 90, 0) * (Cylinder(0.03, 0.015) - Cylinder(0.022, 0.02)))
    caja_xp((x - 0.1, AY + 1.0, 1.25), 0.14, 0.42, 0.6, n_bul=4)                    # caja eléctrica (S)
    add("acero", bar((x - 0.1, AY + 1.0, 0.95), (x - 0.1, AY + 1.0, ZPAT + 0.05), 0.016))   # conducto
    # panel de alarma local: 3 pilotos + pulsador de silencio
    caja_xp((x - 0.09, AY + 0.7, 1.55), 0.1, 0.24, 0.2, n_bul=2)
    for i, yy in enumerate((-0.07, 0.0, 0.07)):
        add("luz", Pos(x - 0.17, AY + 0.7 + yy, 1.6) * Rot(0, 90, 0) * Cylinder(0.014, 0.02))
    add("acero_oscuro", Pos(x - 0.165, AY + 0.7, 1.5) * Rot(0, 90, 0) * Cylinder(0.018, 0.02))
    # baliza Div 2 y bocina XP arriba de los postes
    add("acero_oscuro", Pos(x, AY + 0.4, 1.75) * Cylinder(0.05, 0.04, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("rojo", Pos(x, AY + 0.4, 1.79) * chamfer(Cylinder(0.04, 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges().group_by(Axis.Z)[-1], 0.015))
    for a in (0, 90):
        add("acero_oscuro", Pos(x, AY + 0.4, 1.84) * Rot(0, 0, a) * Box(0.09, 0.006, 0.1))   # jaula
    add("acero_oscuro", Pos(x, AY + 1.0, 1.82) * Rot(0, 90, 0) * Cylinder(0.045, 0.1))
    add("acero_oscuro", Pos(x - 0.09, AY + 1.0, 1.82) * Rot(0, -90, 0) * Cone(0.03, 0.075, 0.08))   # bocina
    # presostatos: hidroeléctrico (triplex, 2.750-3.150 psi) e hidroneumático (neumáticas), con tubing al bloque
    for k, yy in enumerate((HDR_Y - 0.28, HDR_Y - 0.5)):
        xp = TQ[1] - 0.09
        add("acero", Pos(xp, yy, TQ[5]) * Box(0.05, 0.05, 0.22, align=(Align.CENTER, Align.CENTER, Align.MIN)))
        caja_xp((xp, yy, TQ[5] + 0.3), 0.1, 0.1, 0.14, n_bul=2, eje=(-1, 0, 0))
        caneria("acero", [(xp, yy, TQ[5] + 0.23), (xp, yy, TQ[5] + 0.1), (xp, HDR_Y - 0.045, TQ[5] + 0.1)], 0.004)
    # interruptor de flotante N/C sobre el depósito y transmisor XP en el manifold de botellones
    add("acero", Pos(TQ[0] + 0.25, TQ[3] - 0.25, TQ[5]) * Cylinder(0.04, 0.06, align=(Align.CENTER, Align.CENTER, Align.MIN)))
    add("rojo", Pos(TQ[0] + 0.25, TQ[3] - 0.25, TQ[5] + 0.06) * chamfer(Box(0.09, 0.09, 0.08, align=(Align.CENTER, Align.CENTER, Align.MIN)).edges(), 0.008))
    xt = XB0 + 2.5 * BOT_P
    add("acero", bar((xt, YB_ + MAN_D / 2 + 0.02, MAN_Z), (xt, YB_ + 0.2, MAN_Z), 0.008))
    add("acero", Pos(xt, YB_ + 0.24, MAN_Z) * Rot(90, 0, 0) * Cylinder(0.03, 0.08))
    add("rojo", Pos(xt, YB_ + 0.24, MAN_Z + 0.06) * Rot(90, 0, 0) * Cylinder(0.04, 0.06))


def puertos():
    """Riel de conexiones (ref. p97): salidas 1" NPT de las funciones sobre el lateral del patín y toma de aire 1-1/2" NPT."""
    comp("sk575_acumulador/sk575_acum_puertos", ((TQ[0] + TQ[1]) / 2, AY + ACUM_W - 0.1, 0.3))
    y = AY + ACUM_W - 0.095
    add("rojo", bar((TQ[0] + 0.15, y, 0.24), (TQ[1] + 0.05, y, 0.24), 0.04, ang=(0, -1, 1)))
    add("rojo", box(TQ[0] + 0.15, TQ[1] + 0.05, y - 0.006, y + 0.004, 0.24, 0.4))
    for x in _xs[1:N_SEL + 1]:
        for dx in (-0.035, 0.035):
            hexa("acero", Vector(x + dx, y + 0.004, 0.32), (0, 1, 0), 0.04, 0.035)          # cupla 1" NPT
            hexa("acero_oscuro", Vector(x + dx, y + 0.039, 0.32), (0, 1, 0), 0.03, 0.015)   # tapón
    # toma de aire 1-1/2" NPT (rotulada "AIR") al colector del filtro/lubricador
    caneria("acero", [(AX + 4.75, AY + 0.28, ZPAT + 0.08), (AX + 4.75, AY + 0.1, ZPAT + 0.08)], 0.024)
    hexa("acero", Vector(AX + 4.75, AY + 0.1, ZPAT + 0.08), (0, -1, 0), 0.06, 0.04)


def patin():
    """Patín de caño (fig. 2, p95): largueros de caño con extremos curvados, travesaños, piso de chapa, orejas de izaje."""
    comp("sk575_acumulador")
    for y in (AY + 0.12, AY + ACUM_W - 0.12):
        add("rojo", bar((AX + 0.1, y, 0.11), (AX + ACUM_L - 0.1, y, 0.11), 0.084))
        for x in (AX + 0.1, AX + ACUM_L - 0.1):          # tapas de los largueros
            add("rojo", Pos(x, y, 0.11) * Rot(0, 90, 0) * chamfer(Cylinder(0.084, 0.02).edges(), 0.008))
    for i in range(9):
        x = AX + 0.25 + i * (ACUM_L - 0.5) / 8
        add("rojo", upn((x, AY + 0.12, 0.13), (x, AY + ACUM_W - 0.12, 0.13), (1, 0, 0), h=0.15, bw=0.05))
    add("acero_oscuro", box(AX + 0.15, AX + 5.25, AY + 0.15, AY + ACUM_W - 0.15, ZPAT - 0.006, ZPAT))
    for x in (AX + 0.6, AX + ACUM_L - 0.6):
        for y in (AY + 0.12, AY + ACUM_W - 0.12):
            oreja = (Box(0.12, 0.02, 0.07) + Pos(0, 0, 0.035) * Rot(90, 0, 0) * Cylinder(0.06, 0.02)
                     - Pos(0, 0, 0.035) * Rot(90, 0, 0) * Cylinder(0.028, 0.05))
            add("rojo", Pos(x, y, 0.235) * oreja)                                              # oreja de izaje
    # canasto de herramientas (último tramo de la huella)
    railing([(AX + 5.3, AY, ZPAT), (AX + ACUM_L, AY, ZPAT), (AX + ACUM_L, AY + ACUM_W, ZPAT), (AX + 5.3, AY + ACUM_W, ZPAT)], h=1.2, step=0.9)
    add("grating", box(AX + 5.3, AX + ACUM_L - 0.05, AY + 0.15, AY + ACUM_W - 0.15, ZPAT - 0.006, ZPAT))


patin()
rack()
for _k in range(N_BOT):
    botellon(_k)
manifold_botellones()
deposito()
bloque_valvulas()
_xs = [TQ[0] + 0.3 + i * SEL_P for i in range(N_SEL + 1)]
reguladora("anular", TQ[0] + 0.12)
for _i, _x in enumerate(_xs[1:N_SEL + 1]):
    selectora(_i + 1, _x)
selectora("bypass", _xs[0], tipo="3vias")
reguladora("manifold", TQ[1] - 0.2)
bomba_electrica()
for _i, _x in enumerate((AX + 4.1, AX + 4.55)):
    bomba_neumatica(_i + 1, _x)
neumatica_frl()
succion_y_descarga()
electrico_y_alarmas()
puertos()
comp("sk575_acumulador")
