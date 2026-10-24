"""Mástil Service King SK104-330: CELOSÍA de barras entre nodos (ILUSTRATIVA, no as-built).

Técnica de la skill: nodos primero, barras después (tubo hueco = cilindro exterior − interior), sin booleanas entre barras.
Documentado: altura 31,6992 m = tramo inferior 16,4 + superior 15,2992 (folleto). ILUSTRATIVOS (sin plano): ancho de base/tope,
cantidad de paneles y diámetros. Marco local: base centrada en el origen, eje = Z (CAD) / Y (glTF); +X = cara abierta.
Unidades: metros (convención del proyecto)."""
import cadquery as cq

from lib.equipo import Arbol, bbox_malla, dato, export_glb

ID = "mastil"
MIN_BARRA = 0.1  # m: barra más corta admitida (verificación de la skill: > 100 mm)


def ecuaciones(P, spec):
    q = dict(P)
    q["h_tot"] = q["h_inf"] + q["h_sup"]
    assert abs(q["h_tot"] - spec["mast"]["heightM"]) < 1e-6, "tramos no suman la altura documentada"
    assert q["Dt"] < q["Db"], "el tope debe ser más angosto que la base (telescópico)"
    assert q["cara_abierta"] in ("+X", "-X", "+Y", "-Y"), "cara_abierta: +X, -X, +Y o -Y"
    assert q["d_pata"] > q["d_trav"] >= q["d_diag"] > 0
    return q


def _niveles(q):
    zs = [q["h_inf"] * i / q["n_pan_inf"] for i in range(q["n_pan_inf"] + 1)]
    zs += [q["h_inf"] + q["h_sup"] * i / q["n_pan_sup"] for i in range(1, q["n_pan_sup"] + 1)]
    return zs


def nodos_y_barras(q):
    """nodos[(nivel, esquina)] = (x, y, z); barras = [(tipo, nodo_a, nodo_b)]. Esquinas 0..3 = (+,+) (−,+) (−,−) (+,−)."""
    zs = _niveles(q)
    H = q["h_tot"]
    signos = [(1, 1), (-1, 1), (-1, -1), (1, -1)]
    nodos = {}
    for i, z in enumerate(zs):
        semi = (q["Db"] + (q["Dt"] - q["Db"]) * z / H) / 2
        for c, (sx, sy) in enumerate(signos):
            nodos[(i, c)] = (sx * semi, sy * semi, z)
    # caras: (esquina a, esquina b, vector normal hacia afuera)
    caras = {"+X": (3, 0), "+Y": (0, 1), "-X": (1, 2), "-Y": (2, 3)}
    abierta = caras[q["cara_abierta"]]
    barras = []
    for i in range(len(zs) - 1):
        for c in range(4):
            barras.append(("pata", (i, c), (i + 1, c)))
    for i in range(len(zs)):
        for a, b in caras.values():
            if (a, b) != abierta:
                barras.append(("trav", (i, a), (i, b)))
    for i in range(len(zs) - 1):
        for k, (a, b) in enumerate(caras.values()):
            if (a, b) == abierta:
                continue
            if (i + k) % 2 == 0:
                barras.append(("diag", (i, a), (i + 1, b)))
            else:
                barras.append(("diag", (i, b), (i + 1, a)))
    return nodos, barras, zs


def _tubo(p0, p1, d, pared):
    """Tubo hueco entre dos puntos (m)."""
    a, b = cq.Vector(*p0), cq.Vector(*p1)
    L = (b - a).Length
    d_ext = d / 2
    d_int = d_ext * (1 - pared)
    ext = cq.Solid.makeCylinder(d_ext, L, a, (b - a).normalized())
    hueco = cq.Solid.makeCylinder(d_int, L, a, (b - a).normalized())
    return ext.cut(hueco)


def conectividad(nodos, barras):
    padre = {k: k for k in nodos}

    def f(x):
        while padre[x] != x:
            padre[x] = padre[padre[x]]
            x = padre[x]
        return x

    for _, a, b in barras:
        padre[f(a)] = f(b)
    return len({f(k) for k in nodos})


def build(spec, P):
    q = ecuaciones(P, spec)
    nodos, barras, zs = nodos_y_barras(q)
    A = Arbol()
    r_trav = q["d_trav"] / 2
    H = q["h_tot"]
    grupos = {"pata": [], "trav": [], "diag": []}
    mas_corta = 1e9
    for tipo, a, b in barras:
        pa, pb = list(nodos[a]), list(nodos[b])
        if tipo == "trav":  # los travesaños del borde se corren un radio para no pasarse de 0 ni de H
            if pa[2] <= 1e-9:
                pa[2] += r_trav
                pb[2] += r_trav
            elif abs(pa[2] - H) < 1e-9:
                pa[2] -= r_trav
                pb[2] -= r_trav
        d = {"pata": q["d_pata"], "trav": q["d_trav"], "diag": q["d_diag"]}[tipo]
        L = ((pb[0] - pa[0]) ** 2 + (pb[1] - pa[1]) ** 2 + (pb[2] - pa[2]) ** 2) ** 0.5
        mas_corta = min(mas_corta, L)
        tubo = _tubo(pa, pb, d, q["esbeltez_pared"])
        if tipo != "trav" and (min(pa[2], pb[2]) < 1e-9 or max(pa[2], pb[2]) > H - 1e-9):
            # el corte plano de un tubo inclinado (patas con conicidad, diagonales) sobresale del plano del nodo: se recorta a [0, H]
            caja = cq.Solid.makeBox(2 * q["Db"], 2 * q["Db"], H, cq.Vector(-q["Db"], -q["Db"], 0))
            tubo = tubo.intersect(caja)
        grupos[tipo].append(tubo)
    piezas = {}
    for tipo, sol in grupos.items():
        comp = cq.Compound.makeCompound(sol)
        assert all(s.isValid() for s in sol), f"{tipo}: sólidos inválidos"
        piezas[tipo] = cq.Workplane(obj=comp)
        A.filas.append((f"Barras {tipo}", len(sol)))
    verif = dict(
        barras=len(barras),
        invalidos=0,
        componentes=conectividad(nodos, barras),
        mas_corta=mas_corta,
    )
    assert verif["componentes"] == 1, f"la celosía no es conexa ({verif['componentes']} componentes)"
    assert mas_corta > MIN_BARRA, f"barra más corta {mas_corta:.3f} m <= {MIN_BARRA} m"
    return piezas, A, q, verif


def main(spec, P, sfx=""):
    piezas, A, q, verif = build(spec, P)
    todo = cq.Workplane(obj=cq.Compound.makeCompound([w.val() for w in piezas.values()]))
    meta = dict(
        id=ID, family="mast", confidence="C", units="m", up="Y", estado="ILUSTRATIVO",
        frame="local: base centrada, eje del mástil = +Y; cara abierta %s; colocación en escena PENDIENTE" % q["cara_abierta"],
        scope="Celosía ilustrativa de barras tubulares (patas, travesaños, diagonales). Sin corona, poleas, balcón ni interior. No es as-built.",
        data=[
            dato("heightM", q["h_tot"], "m", "confirmed"),
            dato("lowerSectionM", q["h_inf"], "m", "confirmed"),
            dato("upperSectionM", q["h_sup"], "m", "confirmed"),
        ]
        + [
            dato(k, q[k], "m" if k.startswith(("D", "d")) else "u", "pending", note="ILUSTRATIVO: falta plano del fabricante")
            for k in ("Db", "Dt", "n_pan_inf", "n_pan_sup", "d_pata", "d_trav", "d_diag")
        ],
        verificacion=verif,
        tree=A.filas,
    )
    parts = {
        "patas": (piezas["pata"], "main", "#C8C2AE"),
        "travesanos": (piezas["trav"], "light", "#DAD6C6"),
        "diagonales": (piezas["diag"], "accent", "#A72A32"),
    }
    return export_glb(ID, parts, meta, name=ID + sfx), bbox_malla(todo), q, verif
