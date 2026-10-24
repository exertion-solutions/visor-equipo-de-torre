"""Genera los GLB de referencia y verifica sus cotas contra technical-spec.js.
Uso: python cad/build.py   (exit 1 si algo no cierra). Otras medidas: python cad/cli.py mastil --set n_pan_inf=10."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import catalogo  # noqa: E402
import params  # noqa: E402
from lib.equipo import OUT, load_spec  # noqa: E402
from components import carrier_huella, layout_locacion, mastil, piso_trabajo  # noqa: E402

TOL = 1e-6
spec = load_spec()
fallas = []


def check(nombre, obtenido, esperado, tol=TOL):
    ok = abs(obtenido - esperado) < tol
    print("  [%s] %s: %.4f vs %.4f" % ("OK" if ok else "FALLA", nombre, obtenido, esperado))
    if not ok:
        fallas.append(nombre)


def debe_fallar(nombre, fn, excepcion, contiene):
    try:
        fn()
    except excepcion as e:
        ok = contiene in str(e)
        print("  [%s] %s: %s" % ("OK" if ok else "FALLA", nombre, str(e)[:110]))
        if not ok:
            fallas.append(nombre)
        return
    print("  [FALLA] %s: no falló" % nombre)
    fallas.append(nombre)


def parametros(equipo, preset=None, sets=()):
    return params.resolver(equipo, preset, sets, spec=spec)[:2]


# ───────── mástil (celosía de barras) ─────────
P, sfx = parametros("mastil")
path, bb, q, v = mastil.main(spec, P, sfx)
print("mastil ->", path.name, "| barras %d, componentes %d, barra más corta %.2f m" % (v["barras"], v["componentes"], v["mas_corta"]))
check("altura total = documentada", bb["z"], spec["mast"]["heightM"])
check("tramo inf + sup", q["h_inf"] + q["h_sup"], spec["mast"]["heightM"])
check("celosía conexa (1 componente)", v["componentes"], 1)
print("  [OK] barra más corta %.3f m > %.1f m" % (v["mas_corta"], mastil.MIN_BARRA))
# otras medidas: --set regenera y sigue conexa
P2, sfx2 = parametros("mastil", None, ["n_pan_inf=6", "n_pan_sup=8", "Db=1.8"])
_, bb2, _, v2 = mastil.main(spec, P2, sfx2)
check("con --set: altura sigue siendo la documentada", bb2["z"], spec["mast"]["heightM"])
check("con --set: sigue conexa", v2["componentes"], 1)
print("  [OK] sufijo de salida con overrides: %r (barras %d)" % (sfx2, v2["barras"]))
# preset rig10: faltan datos del fabricante -> PENDIENTE, sin inventar
debe_fallar("preset rig10 del mástil", lambda: parametros("mastil", "rig10"), KeyError, "PENDIENTE")
debe_fallar("parámetro desconocido", lambda: parametros("mastil", None, ["zzz=1"]), KeyError, "desconocido")
debe_fallar("valor fuera de rango", lambda: parametros("mastil", None, ["n_pan_inf=99"]), ValueError, "fuera del rango")
debe_fallar("catálogo: dato PENDIENTE", lambda: catalogo.dato("RIG10-mastil", "Db", spec), KeyError, "PENDIENTE")
val, uni, est, _ = catalogo.dato("RIG10-mastil", "heightM", spec)
check("catálogo: altura REF_OEM (%s)" % est, val, spec["mast"]["heightM"])
print("  pendientes del mástil (catálogo):", catalogo.pendientes("RIG10-mastil"))

# ───────── piso de trabajo ─────────
P, sfx = parametros("piso_trabajo")
path, bb, q = piso_trabajo.main(spec, P, sfx)
print("piso_trabajo ->", path.name)
check("largo (x)", bb["x"], spec["workFloor"]["sizeM"][0])
check("ancho (y)", bb["y"], spec["workFloor"]["sizeM"][1])
check("cara superior = altura del modelo", bb["zmin"] + bb["z"], spec["workFloor"]["modelHeightM"])
for preset in ("minimo", "maximo"):  # configuraciones
    Pp, _ = parametros("piso_trabajo", preset)
    piso_trabajo.build(spec, Pp)
    print("  [OK] configuración '%s' (h=%s m) regenera" % (preset, Pp["h"]))
debe_fallar("altura fuera del rango documentado", lambda: piso_trabajo.build(spec, dict(P, h=4.5)), AssertionError, "fuera del rango")
debe_fallar("preset rig10 del piso (espesor)", lambda: parametros("piso_trabajo", "rig10"), KeyError, "PENDIENTE")

# ───────── carrier ─────────
P, sfx = parametros("carrier_huella")
path, bb, q = carrier_huella.main(spec, P, sfx)
print("carrier_huella ->", path.name)
check("largo operativo", bb["x"], spec["carrier"]["operatingLengthM"])
check("ancho", bb["y"], spec["carrier"]["widthM"])
check("carrier termina a 1,3 m de la boca", bb["xmin"] + bb["x"], -1.3)

# ───────── layout ─────────
path, bb, m = layout_locacion.main(spec)  # las ecuaciones asertan tamaños y cotas rotuladas (5 m, 3 m, 1,3 m)
print("layout_locacion ->", path.name, {k: [round(v, 2) for v in vals] for k, vals in m.items()})

import capa  # noqa: E402
import izamiento  # noqa: E402

# ───────── capa CAD para el visor V2 ─────────
dest, n_tris, n_segs = capa.generar(
    spec, parametros("mastil")[0], parametros("piso_trabajo")[0], parametros("carrier_huella")[0]
)
print("capa CAD ->", dest.relative_to(dest.parents[3]), "| %d vértices de malla, %d barras de línea, %d KB" % (n_tris, n_segs, dest.stat().st_size // 1024))
if dest.stat().st_size > 400_000:
    fallas.append("capa CAD demasiado pesada")

# ───────── cinemática del izamiento del mástil ─────────
if izamiento.PERFIL.exists():
    iz = izamiento.generar()
    pi = iz["pistones"]
    print("izamiento -> transporte a %.1f° (margen %.2f m), pistón %.2f–%.2f m (carrera %.2f m, relación %.2f), soporte de traslado %.2f m de alto" % (
        iz["elevacion_transporte"], iz["margen_libre"], pi["largo_min"], pi["largo_max"], pi["carrera"], pi["relacion"], iz["soporte_traslado"]["alto"]))
    check("margen libre >= %.2f m" % izamiento.MARGEN, min(iz["margen_libre"], izamiento.MARGEN), izamiento.MARGEN, 0.02)
    check("pose final del V2 = 90° + inclinación", iz["elevacion_final"], 94.24, 0.05)
else:
    print("izamiento: falta cad/data/v2_corredor_mastil.json (node scripts/dump-corredor-mastil.mjs)")

import trimesh  # noqa: E402

for cid in ("mastil", "piso_trabajo", "carrier_huella", "layout_locacion"):
    sc = trimesh.load(OUT / (cid + ".glb"))
    nombres = [n for n in sc.graph.nodes if n.startswith(cid)]
    ok = cid in nombres and len(nombres) > 1
    print("  [%s] %s.glb nodos: %s" % ("OK" if ok else "FALLA", cid, nombres))
    if not ok:
        fallas.append(cid + " nombres")

print("RESULTADO:", ("FALLAS " + str(fallas)) if fallas else "todo OK")
sys.exit(1 if fallas else 0)
