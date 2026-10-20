"""Exporta el modelo SK-575 (cad/sk575/modelo.py, build123d) a un GLB por componente en assets/source/.

Uso (entorno build123d, ver cad/sk575/README.md):
    python cad/sk575/exportar.py            # todos los componentes
    python cad/sk575/exportar.py sk575_bop  # uno solo

Contrato gltf-pipeline: nodo raíz = Component.id, mallas `<id>_<rol>` (una por material: menos draw calls), materiales
`<id>_<rol>`, metros, Y arriba, origen = boca de pozo a nivel de terreno. CAD (x, y, z) → glTF (x − WXP, z, −y).
"""
import json
import pathlib
import runpy
import sys
from math import cos, radians
from collections import defaultdict

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

AQUI = pathlib.Path(__file__).resolve().parent
ROOT = AQUI.parents[1]
OUT = ROOT / "assets" / "source"

# color, metalness, roughness, emisivo (mismos valores que el visor CAD de referencia)
MATS = {
    "acero": ("#9ea3aa", 1.0, 0.26), "acero_oscuro": ("#5f646b", 1.0, 0.38), "aluminio": ("#c4c8cc", 1.0, 0.3),
    "rojo": ("#b3261e", 0.3, 0.45), "amarillo": ("#e0a400", 0.3, 0.45), "blanco": ("#f2f2f2", 0.0, 0.5),
    "azul": ("#2f7f95", 0.4, 0.4), "azul_bomba": ("#1c4ea0", 0.1, 0.42), "grating": ("#8d9196", 0.8, 0.55), "cable": ("#3a3d42", 1.0, 0.5),
    "goma": ("#1d1d1d", 0.0, 0.9), "vidrio": ("#1b2630", 0.2, 0.05), "hormigon": ("#8a8780", 0.0, 0.9),
    "luz": ("#ffd9a0", 0.0, 0.4, True),
}
# Tolerancias de teselado: piezas finas (cables, barandas) más gruesas para no inflar triángulos.
TOL = {"cable": (0.02, 0.6), "goma": (0.02, 0.48)}
TOL_DEF = (0.006, 0.3)

# Qué representa cada componente y con qué confianza de geometría (A/B/C). Detalle de cotas y fuentes en el informe.
INFO = {
    "sk575_mastil": ("C", "Mástil SK 104-330 inclinado 3,5°, corona centrada sobre el reticulado (pozo a 76\" del pie, C6), piso de enganche a 68'"),
    "sk575_carrier": ("C", "Carrier SK-575: bastidor 40 ft, 5 ejes, cabina, motor, tanques, gatos y T-sill"),
    "sk575_cuadro": ("C", "Cuadro de maniobras DWA575-01: tambores 42×12 y 42×8, discos, embragues, consola"),
    "sk575_izaje": ("B", "Cilindros de izaje HYCO 50162-813-13150 (3 etapas, 60\" → 191,5\")"),
    "sk575_aparejo": ("C", "Aparejo-gancho, 8 líneas, amelas 150 t y elevador de cierre central"),
    "sk575_bop": ("B", "Stack BOP estándar 7-1/16\" 10 ksi del plano 8127-1110-004: alturas rotuladas (A); anchos, bonetes y líneas medidos sobre el plano (C)"),
    "sk575_llave": ("C", "Llave hidráulica de tubing colgada"),
    "sk575_piso": ("B", "Piso pulling 2600 × 3304 a 3606 mm, subestructura, escaleras a 45°"),
    "sk575_planchada": ("C", "Planchada 12 m, rampa de la V, caballetes y línea de alta presión"),
    "sk575_tiros": ("C", "Tiros dobles de tubing en estiba (ilustrativo)"),
    "sk575_vientos": ("C", "Vientos, anclajes y pirosalva (posiciones del layout de locación)"),
    "sk575_pozo_vecino": ("C", "Árbol de navidad de pozo vecino (ilustrativo)"),
    "sk575_piletas": ("C", "Piletas de circulación, preparación y ensayo + trip tank"),
    "sk575_manifold": ("C", "Manifold de ahogo M1–M12 y líneas de choke/ahogo"),
    "sk575_bomba": ("C", "Bomba triplex sobre patín: power end, fluid end de 3 cilindros, múltiples, amortiguador y válvula de seguridad (referencia fotográfica genérica; modelo, camisas, carrera y presión del equipo PENDIENTES)"),
    "sk575_acumulador": ("C", "Acumulador del BOP: huella 8 × 2,4 m (layout WS10), 5 botellones 3.000 psi (folleto); botellones, "
                             "válvulas, reguladoras, bombas y depósito según la unidad de referencia CPC S/N 4650 "
                             "(src-ref-rigmfg-4650, genérica: no es el equipo instalado)"),
}


def _hex(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def cargar():
    return runpy.run_path(str(AQUI / "modelo.py"), run_name="sk575_modelo")


def spec_sk575():
    """Cotas documentadas (fuente única: reference/v2-previo/src/technical-spec.js → TACKER_10.sk575)."""
    import subprocess
    js = (ROOT / "reference" / "v2-previo" / "src" / "technical-spec.js").as_uri()
    out = subprocess.check_output(["node", "-e", "import(%s).then(m=>console.log(JSON.stringify(m.TACKER_10)))" % json.dumps(js)], text=True)
    return json.loads(out)


def verificar(g, spec):
    """Las constantes del modelo deben coincidir con las cotas documentadas; si no, el export falla (exit 1)."""
    s, IN = spec["sk575"], 0.0254
    checks = [
        ("altura del mástil (folleto, 104 ft)", g["H"], spec["mast"]["heightM"], 0.01),
        ("inclinación del mástil (placa API)", g["LEAN"], s["mast"]["leanDeg"], 1e-9),
        ("base del mástil 4'-0\"", g["ZB"], s["mast"]["baseHeightM"], 0.001),
        ("piso de enganche 68'", g["ZM"], s["mast"]["rackingBoardM"], 0.002),
        ("pozo a 76\" del pie del mástil (eje de la bisagra MX, C6)", g["WXP"] - g["MX"], s["mast"]["wellFromFrontLegM"], 1e-6),
        ("corona centrada sobre el reticulado |MC - MX| (< 0,15 m)", abs(g["MC"] - g["MX"]), 0.0, 0.15),
        ("altura del piso de trabajo", g["ZP"], s["workFloor"]["heightM"], 1e-9),
        ("largo del piso", g["X1"] - g["X0"], s["workFloor"]["sizeM"][0], 1e-9),
        ("ancho del piso con laterales", 2 * g["YL"], s["workFloor"]["sizeM"][1], 1e-9),
        ("bastidor del carrier", -2.0 - g["FR"], s["carrier"]["frameLengthM"], 1e-6),
        ("cubierta del carrier", g["ZK"], s["carrier"]["deckHeightM"], 1e-4),
        ("eje delantero 1", (g["XF1"] - g["FR"]) / IN, s["carrier"]["axlesFromFrontIn"][0], 1e-6),
        ("eje tag", (g["XE"] - g["FR"]) / IN, s["carrier"]["axlesFromFrontIn"][4], 1e-6),
        ("T-sill a 6 ft del pozo", g["WXP"] - g["XTS"], s["carrier"]["tSillFromWellM"], 1e-9),
        ("cilindro HYCO extendido", g["HYCO_EXT"], s["raisingCylinder"]["extendedIn"], 1e-9),
        ("carrera HYCO (3 etapas; el plano suma 131,51)", sum(g["HYCO_CARRERAS"]), s["raisingCylinder"]["strokeIn"], 0.011),
        ("cilindro HYCO cerrado", g["HYCO_EXT"] - sum(g["HYCO_CARRERAS"]), s["raisingCylinder"]["closedIn"], 0.011),
    ] + [
        ("stack BOP tramo %d (plano 8127)" % (i + 1), g["BOP_H"][i], s["bopStack"]["sectionsM"][i], 1e-9) for i in range(5)
    ] + [
        ("stack BOP total (parciales 3,726 vs rotulado 3,731)", g["Z5"], s["bopStack"]["totalM"], 0.006),
    ]
    fallas = []
    for nombre, obt, esp, tol in checks:
        ok = abs(obt - esp) <= tol
        print("  [%s] %s: %.4f vs %.4f" % ("OK" if ok else "FALLA", nombre, obt, esp))
        if not ok:
            fallas.append(nombre)
    if fallas:
        sys.exit("Cotas que no cierran: %s" % ", ".join(fallas))


COS_ARISTA = cos(radians(28))   # mismo umbral que aristas() de legacy-ext/84-modelo-sk575.js (EdgesGeometry / visor.py)
SIN_ARISTAS = {"luz", "vidrio"}  # emisivas y vidrio: sin contorno (revisión 3D #11)


def aristas(V, F):
    """Aristas de rasgo como en aristas() de 84-modelo-sk575.js: suelda por posición (1e-4 m), marca el filo si el ángulo
    entre las caras vecinas supera 28° y conserva los bordes libres. Devuelve segmentos (n, 2, 3)."""
    _, primero, inv = np.unique(np.round(V * 1e4).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    rep = primero[inv.ravel()]
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    n = np.cross(b - a, c - a)
    largo = np.linalg.norm(n, axis=1)
    ok = largo > 0                                                    # triángulos degenerados fuera
    n = n[ok] / largo[ok, None]
    T = rep[F[ok]]
    E = T[:, [0, 1, 1, 2, 2, 0]].reshape(-1, 2)
    cara = np.repeat(np.arange(len(T)), 3)
    E.sort(axis=1)
    sana = E[:, 0] != E[:, 1]
    E, cara = E[sana], cara[sana]
    clave = E[:, 0] * len(V) + E[:, 1]
    orden = np.argsort(clave, kind="stable")
    clave, E, cara = clave[orden], E[orden], cara[orden]
    ini = np.r_[0, np.flatnonzero(np.diff(clave)) + 1]
    cuenta = np.diff(np.r_[ini, len(clave)])
    par = ini[cuenta == 2]
    filo = par[np.einsum("ij,ij->i", n[cara[par]], n[cara[par + 1]]) <= COS_ARISTA]
    sel = np.r_[filo, ini[cuenta != 2]]                               # filos + bordes libres (y no-variedades)
    return np.stack([V[E[sel, 0]], V[E[sel, 1]]], axis=1)


def gl(p, wxp):
    """CAD (x, y, z) → glTF (x − WXP, z, −y), redondeado a mm."""
    return [round(p[0] - wxp, 4), round(p[2], 4), round(-p[1], 4)]


def malla(shapes, mat, o, wxp):
    """Vértices en el marco del nodo: CAD → glTF del pozo (x − WXP, z, −y) menos el origen `o` del nodo (ya en ese marco)."""
    tol, ang = TOL.get(mat, TOL_DEF)
    V, F = [], []
    for sh in shapes:
        for so in sh.solids() if hasattr(sh, "solids") else [sh]:
            assert so.is_valid, "sólido inválido en %s" % mat
            vs, ts = so.tessellate(tol, ang)
            base = len(V)
            V += [(v.X - wxp - o[0], v.Z - o[1], -v.Y - o[2]) for v in vs]
            F += [(base + a, base + b, base + c) for a, b, c in ts]
    return np.array(V, dtype=float), np.array(F, dtype=np.int64)


def exportar(solo=None):
    g = cargar()
    spec = spec_sk575()
    verificar(g, spec)
    parts, wxp = g["parts"], g["WXP"]
    # (raíz, nodo) → {material: sólidos}; `raiz/sub` en modelo.py = sub-nodo con nombre dentro del GLB de la raíz
    por_comp = defaultdict(lambda: defaultdict(dict))
    for (cid, mat), shapes in parts.items():
        raiz, _, sub = cid.partition("/")
        por_comp[raiz][sub or raiz][mat] = shapes
    OUT.mkdir(parents=True, exist_ok=True)
    resumen = {}
    for cid, nodos in por_comp.items():
        if solo and cid not in solo:
            continue
        assert cid in INFO, "componente sin INFO: %s" % cid
        scene = trimesh.Scene()
        scene.graph.update(frame_to=cid, frame_from="world")
        tris_total, segs_total, meta_nodos, mats_comp = 0, 0, [], set()
        # primero las mallas de la raíz (84-modelo-sk575.js toma el primer hijo `sk575_carrier_*` como malla ancla)
        for nodo in sorted(nodos, key=lambda n: (n != cid, n)):
            mats = nodos[nodo]
            o = gl(g["ORIGEN"][nodo], wxp) if nodo in g["ORIGEN"] else [0.0, 0.0, 0.0]
            if nodo != cid:
                scene.graph.update(frame_to=nodo, frame_from=cid, matrix=trimesh.transformations.translation_matrix(o))
            segs, tris_nodo = [], 0
            for mat, shapes in sorted(mats.items()):
                V, F = malla(shapes, mat, o, wxp)
                if not len(F):
                    continue
                # process=False: sin soldar vértices entre caras B-rep → normales suaves dentro de cada cara y filo entre
                # caras (como export_gltf de build123d / visor.py). Soldar aplanaba los filos al recalcular normales.
                m = trimesh.Trimesh(vertices=V, faces=F, process=False)
                col, met, rough, *emi = MATS[mat]
                # material `<id>_<rol>` de la raíz (contrato), compartido por los sub-nodos
                pbr = PBRMaterial(name="%s_%s" % (cid, mat), baseColorFactor=_hex(col) + [1.0],
                                  metallicFactor=met, roughnessFactor=rough,
                                  emissiveFactor=_hex(col) if emi else None)
                m.visual = trimesh.visual.TextureVisuals(material=pbr)
                nm = "%s_%s" % (nodo, mat)
                scene.add_geometry(m, node_name=nm, geom_name=nm, parent_node_name=nodo)
                tris_nodo += len(F)
                mats_comp.add(mat)
                if mat not in SIN_ARISTAS:
                    segs.append(aristas(V, F))
            if segs and sum(map(len, segs)):
                S = np.concatenate(segs)
                nm = nodo + "_aristas"                                # una primitiva LINES por nodo (sigue a su nodo)
                scene.add_geometry(trimesh.load_path(S), node_name=nm, geom_name=nm, parent_node_name=nodo)
                segs_total += len(S)
            tris_total += tris_nodo
            if nodo != cid:
                meta_nodos.append(dict(nombre=nodo, origen=o, triangulos=tris_nodo, alcance=SUBNODOS.get(nodo, "")))
        conf, alcance = INFO[cid]
        # trimesh exporta las LINES con su material por defecto: se le da nombre `<id>_arista` (contrato <id>_<rol>)
        trimesh.exchange.gltf._default_material = dict(name=cid + "_arista", pbrMetallicRoughness=dict(
            baseColorFactor=_hex("#0b0d10") + [1.0], metallicFactor=0.0, roughnessFactor=1.0))
        (OUT / (cid + ".glb")).write_bytes(scene.export(file_type="glb", include_normals=True))
        meta = dict(id=cid, confianza=conf, alcance=alcance, triangulos=tris_total, materiales=sorted(mats_comp),
                    marco="glTF Y arriba; origen = boca de pozo a nivel de terreno; carrier hacia −X (CLAUDE.md)",
                    fuentes="docs/pdf-review/informe-sk575-2026-10-09.md", as_built=False,
                    aristas=dict(segmentos=segs_total, nodo="<nodo>_aristas (primitiva LINES, mode 1)",
                                 umbral_grados=28, excluye=sorted(SIN_ARISTAS)))
        if meta_nodos:
            meta["nodos"] = meta_nodos
        if cid == "sk575_izaje":
            meta["cilindros"] = meta_izaje(g, wxp, spec["sk575"]["raisingCylinder"])
        if cid == "sk575_vientos":
            meta.update(meta_vientos(g, wxp))
        (OUT / (cid + ".meta.json")).write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        resumen[cid] = tris_total
        print("%-20s %8d tris %7d aristas  %s" % (cid, tris_total, segs_total, ", ".join(n for n in sorted(nodos) if n != cid)))
    print("TOTAL", sum(resumen.values()), "triángulos en", len(resumen), "componentes")
    return resumen


SUBNODOS = {
    "sk575_cabina": "Cabina de manejo (one-man cab), vidrios, espejo, escalones y luces de techo (geometría C)",
    "sk575_motor": "Motor Detroit S60 bajo capot, radiador, filtro de aire, escape, transmisión Allison y cardán (C)",
    "sk575_enganche": "Piso de enganche a 68' (20,629 m, plano 8123-1002-2611) con peines, baranda y cartel; origen = bisagra del borde "
                      "interior (eje lateral, pivote del plegado ilustrativo del visor); va con el 2.º "
                      "tramo del mástil (geometría C)",
    "sk575_izaje_orejas_carrier": "Pedestales de los cilindros en el carrier (fijos)",
    "sk575_izaje_orejas_mastil": "Orejas de los cilindros en el mástil (giran con el mástil)",
}
_REF = " — referencia CPC S/N 4650 (src-ref-rigmfg-4650), genérica, C"
SUBNODOS.update({
    "sk575_acum_rack": "Bastidor de botellones: parantes C, travesaños L, abrazaderas de banda y cabezal" + _REF,
    "sk575_acum_manifold": "Manifold de botellones 4\" de 6 bocas 5.000 psi, aislación esférica 1\", manómetro de banco con "
                           "aislación y purga aguja, alivio 3/4\" a 3.300 psi (p33 §2.2-2.4)" + _REF,
    "sk575_acum_deposito": "Depósito con boca de llenado 4\", tapa de inspección, visor de nivel y purga (p33 §2.1, p98); "
                           "medidas C" + _REF,
    "sk575_acum_bloque_valvulas": "Bloque de válvulas, filtro en T 1\" y panel de 3 manómetros de 6\" (p34 §3.0 F, H)" + _REF,
    "sk575_acum_reguladora_anular": "Reguladora anular serie 3100 1\" con motor neumático y manija en T (p33 §3.0 A, p94 K)" + _REF,
    "sk575_acum_reguladora_manifold": "Reguladora del manifold serie 2100 1\" con volante, salida 1.500 psi (p33 §3.0 B)" + _REF,
    "sk575_acum_valvula_3vias_bypass": "Selectora 1\" de 3 vías del by-pass LP/HP (p34 §3.0 E, p95 P)" + _REF,
    "sk575_acum_succion_descarga": "Succión de bombas: esclusa 1-1/2\" y filtro en Y (triplex), colector con válvula de línea, "
                                   "by-pass, aislación y filtro en Y por neumática; retenciones 5.000 psi y colector de "
                                   "descarga (p35 §4.5-4.6, §5.3; p94 A-C; p95 W, AB)" + _REF,
    "sk575_acum_electrico": "Arrancador NEMA 7 con luz de marcha, caja eléctrica (PLC S7-222 y fuente PULS adentro, no "
                            "modelados), presostatos hidroeléctrico e hidroneumático, alarma local con 3 pilotos y silencio, "
                            "baliza, bocina XP, flotante N/C y transmisor XP (p14, p35 §4.3-4.4, p36 §8.1, p94 N, p95 S)" + _REF,
    "sk575_acum_puertos": "Riel de conexiones 1\" NPT de las funciones y toma de aire 1-1/2\" NPT (p97)" + _REF,
    "sk575_acum_bomba_electrica":"Bomba triplex con motor XP y guarda de correa dentada, descarga con retención (p34-35 §4)" + _REF,
})
for _k in range(1, 6):
    SUBNODOS["sk575_acum_botellon_%d" % _k] = ("Botellón %d: vejiga 11 gal 3.000 psi, carga superior, válvula de gas con protector, "
                                                "purga individual (p23, p33, p98); Ø 0,236 × 1,30 m derivado de 11 gal + plano p17. "
                                                "Cantidad 5 y 3.000 psi: src-folleto" % _k + _REF)
    SUBNODOS["sk575_acum_valvula_4vias_%d" % _k] = ("Selectora %d: 1\" 4 vías / 3 posiciones, sello de corte rotativo, 3.000 psi, "
                                                     "con sector indicador (p34 §3.0 C-D); funciones = anular, 2 rams, HCR CL2, HCR KL2 "
                                                     "(src-esquema-ahogo)" % _k + _REF)
for _k in (1, 2):
    SUBNODOS["sk575_acum_bomba_neumatica_%d" % _k] = "Bomba neumática %d 40:1 (p35 §5.1; la unidad de referencia tiene 3)" % _k + _REF
for _k in (1, 2):
    SUBNODOS["sk575_izaje_cil%d_camisa" % _k] = "Cilindro %d: camisa, ojo del pie, puerto de extensión y manguera" % _k
    SUBNODOS["sk575_izaje_cil%d_etapa1" % _k] = "Cilindro %d: etapa Ø8,12\" (carrera 42,82\")" % _k
    SUBNODOS["sk575_izaje_cil%d_etapa2" % _k] = "Cilindro %d: etapa Ø7,00\" (carrera 44,07\")" % _k
    SUBNODOS["sk575_izaje_cil%d_vastago" % _k] = "Cilindro %d: última etapa Ø4,00\" (carrera 44,62\"), cabezal y ojo superior" % _k


def meta_izaje(g, wxp, hyco):
    IN = 0.0254
    carreras = [round(c * IN, 5) for c in g["HYCO_CARRERAS"]]
    out = []
    for c in g["IZAJE"]:
        pie, top = np.array(gl(c["pie"], wxp)), np.array(gl(c["top"], wxp))
        k = c["cil"]
        out.append(dict(
            id="cil%d" % k,
            nodos=dict(camisa="sk575_izaje_cil%d_camisa" % k,
                       etapas=["sk575_izaje_cil%d_%s" % (k, n) for n in ("etapa1", "etapa2", "vastago")]),
            pivote_carrier=pie.round(4).tolist(), empuje_mastil=top.round(4).tolist(),
            eje_unitario=((top - pie) / np.linalg.norm(top - pie)).round(6).tolist(),
            largo_modelado_m=round(float(np.linalg.norm(top - pie)), 4),
            largo_cerrado_m=round(hyco["closedIn"] * IN, 4), largo_extendido_m=round(hyco["extendedIn"] * IN, 4),
            carrera_m=round(hyco["strokeIn"] * IN, 4), carrera_etapas_m=carreras,
            nota_carreras="las 3 carreras del plano suman 131,51\" contra 131,5\" de carrera total (redondeo del plano)",
            fuente_largos="src-plano-hyco", confianza_largos="A",
            confianza_pivotes="C (coordenadas de montaje de los cilindros no documentadas: informe §5; perno superior y "
                              "dirección estimados por foto)",
        ))
    return dict(
        estado_modelado="extendido (mástil armado): las etapas están a carrera completa",
        origen_nodos="camisa: origen = pivote_carrier (perno del pie); etapa1, etapa2 y vastago: origen = empuje_mastil "
                     "(perno superior, con el cilindro extendido)",
        animacion="Con L = |empuje − pivote| (entre largo_cerrado_m y largo_extendido_m): la camisa gira sobre su origen hasta "
                  "apuntar al empuje; e = L − largo_cerrado_m se reparte en orden etapa1 → etapa2 → vastago "
                  "(ext_j = clamp(e − Σ carreras previas, 0, carrera_j)); con u = eje actual, todos los nodos rotan eje_unitario → u "
                  "y el origen de la etapa k queda en pivote + u·(largo_extendido_m − Σ_{j≤k}(carrera_j − ext_j)). "
                  "Ilustrativo: no es cálculo ni simulación.",
        lista=out,
    )


def meta_vientos(g, wxp):
    lista = []
    for v in g["VIENTOS"]:
        d = dict(id=v["id"], tipo=v["tipo"], diametro_in=v["diametro_in"], extremo_mastil=gl(v["mastil"], wxp))
        if "tierra" in v:
            d["extremo_tierra"] = gl(v["tierra"], wxp)
        else:
            d["extremo_carrier"] = gl(v["carrier"], wxp)
        lista.append(d)
    return dict(
        ids="<viento>_<lado>_<signo de z glTF>: lado carrier = −X, lado v = +X (planchada); marco glTF del GLB",
        cables=lista,
        anclajes=dict(
            fuente="src-layout-ws10 (LAYOUT-WS10-0001: 27,4 m lado carrier / 24,4 m lado V desde el pozo, ± 26,8 m laterales)",
            confianza="B",
            conflicto="C4 · Fuente en conflicto: folleto 20 m · spec 25 ± 3 m · layout WS10 27,4 / 24,4 ± 3 m (± 26,8 lat.) · "
                      "placa 94' (28,7 m) / 82' (25 m), 68' lat. El modelo dibuja WS10; no es diseño de anclaje ni distancia "
                      "de exclusión.",
        ),
        extremos_mastil="Con el mástil armado (inclinado 3,5°). Alturas de amarre (A 29,5 m, B 19,0 m), plataforma, corona y "
                        "pirosalva: C (no documentadas, informe §5). Diámetros A 3/4\" y B 5/8\": src-placa-api; plataforma "
                        "9/16\" e internos 1\": Rig Up p3; pirosalva: anclaje en el eje a 45 m del pozo (src-layout-ws10; fuente en conflicto: LAYOUT TKR-10 2025 = 30 m, YPF ~35°), amarre C.",
    )


if __name__ == "__main__":
    exportar(set(sys.argv[1:]) or None)
