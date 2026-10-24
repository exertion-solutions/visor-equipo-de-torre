"""Utilidades comunes del pipeline CAD de DIGITAL RIG.

Convenciones (CLAUDE.md): 1 unidad = 1 metro. En CadQuery: Z arriba, +X hacia el mástil, Y lateral.
Al exportar a glTF se pasa a Y arriba: (x, y, z) -> (x, z, -y).
Las cotas salen de reference/v2-previo/src/technical-spec.js (una sola fuente; no se duplican acá).
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "source"  # ignorado por git; el original nunca se edita a mano
SPEC_JS = ROOT / "reference" / "v2-previo" / "src" / "technical-spec.js"
SOURCE_ID = "src-folleto"  # folleto Equipo 10 rev. 26/06/2024 (ver src/data)


def load_spec():
    js = "import(%s).then(m=>console.log(JSON.stringify(m.RIG_10)))" % json.dumps(SPEC_JS.as_uri())
    return json.loads(subprocess.check_output(["node", "-e", js], text=True))


class Arbol:
    """FeatureManager: cada operación debe cambiar el volumen en el sentido esperado y dejar un sólido válido."""

    def __init__(self):
        self.v = 0.0
        self.filas = []

    def op(self, nombre, wp, esperado):
        vol = wp.val().Volume()
        d = vol - self.v
        ok = d > 1e-9 if esperado == "+" else d < -1e-9
        assert ok, "%s: SIN EFECTO (dV=%s)" % (nombre, d)
        assert wp.val().isValid(), "%s: sólido inválido" % nombre
        self.filas.append((nombre, round(d, 4)))
        self.v = vol
        return wp


def dato(key, value, unit, status, source=SOURCE_ID, note=None):
    """status: confirmed | pending. Todo dato numérico lleva sourceId (regla del proyecto)."""
    d = dict(key=key, value=value, unit=unit, status=status, sourceId=source if status == "confirmed" else None)
    if note:
        d["note"] = note
    return d


def _zup_to_yup(v):  # (x, y, z) -> (x, z, -y)
    return (v.x, v.z, -v.y)


def export_glb(comp_id, parts, meta, name=None):
    """parts: {nombre_parte: (Workplane, rol, '#rrggbb')} -> assets/source/<name>.glb + <name>.meta.json.
    Contrato gltf-pipeline: nodo raíz = comp_id, mallas `<id>_<parte>`, materiales `<id>_<rol>`, metros, Y arriba."""
    import numpy as np
    import trimesh
    from trimesh.visual.material import PBRMaterial

    OUT.mkdir(parents=True, exist_ok=True)
    scene = trimesh.Scene()
    scene.graph.update(frame_to=comp_id, frame_from="world")
    for parte, (wp, rol, hexcol) in parts.items():
        verts, tris = wp.val().tessellate(0.002, 0.1)
        m = trimesh.Trimesh(vertices=np.array([_zup_to_yup(v) for v in verts]), faces=np.array(tris), process=True)
        rgb = [int(hexcol[i : i + 2], 16) / 255 for i in (1, 3, 5)]
        m.visual = trimesh.visual.TextureVisuals(
            material=PBRMaterial(name="%s_%s" % (comp_id, rol), baseColorFactor=rgb + [1.0], metallicFactor=0.3, roughnessFactor=0.55)
        )
        node = "%s_%s" % (comp_id, parte)
        scene.add_geometry(m, node_name=node, geom_name=node, parent_node_name=comp_id)
    name = name or comp_id
    (OUT / (name + ".glb")).write_bytes(scene.export(file_type="glb"))
    (OUT / (name + ".meta.json")).write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return OUT / (name + ".glb")


def bbox(wp):
    b = wp.val().BoundingBox()
    return dict(x=b.xlen, y=b.ylen, z=b.zlen, xmin=b.xmin, ymin=b.ymin, zmin=b.zmin)


def bbox_malla(wp, tol=0.001):
    """Caja envolvente AJUSTADA (de la malla): BoundingBox() de OCC es conservadora en cilindros inclinados."""
    xs, ys, zs = [], [], []
    for s in wp.val().Solids():
        verts, _ = s.tessellate(tol, 0.1)
        for v in verts:
            xs.append(v.x)
            ys.append(v.y)
            zs.append(v.z)
    return dict(x=max(xs) - min(xs), y=max(ys) - min(ys), z=max(zs) - min(zs), xmin=min(xs), ymin=min(ys), zmin=min(zs))
