"""Catálogo con procedencia: `dato(equipo, clave)` -> (valor, unidad, estado, nota). Falla con PENDIENTE: no inventa."""
import json
import pathlib

from lib.equipo import load_spec

_RUTA = pathlib.Path(__file__).parent / "catalogo.json"


def _catalogo():
    return json.loads(_RUTA.read_text(encoding="utf-8"))


def _valor(v, spec):
    if isinstance(v, str) and v.startswith("@spec:"):
        cur = spec
        for part in v[len("@spec:") :].split("."):
            cur = cur[int(part)] if isinstance(cur, list) else cur[part]
        return cur
    return v


def dato(equipo, clave, spec=None):
    cat = _catalogo()
    if equipo not in cat or equipo.startswith("_"):
        raise KeyError(f"equipo desconocido '{equipo}'. Válidos: {[k for k in cat if not k.startswith('_')]}")
    datos = cat[equipo]["datos"]
    if clave not in datos:
        raise KeyError(f"'{clave}' no está en {equipo}. Válidos: {sorted(datos)}")
    d = datos[clave]
    if d["estado"] == "PENDIENTE" or d["valor"] is None:
        raise KeyError(f"PENDIENTE: {equipo}.{clave} ({d.get('nota', '')}) — no se inventa")
    return _valor(d["valor"], spec or load_spec()), d["unidad"], d["estado"], d.get("nota", "")


def pendientes(equipo):
    cat = _catalogo()
    return sorted(k for k, d in cat[equipo]["datos"].items() if d["estado"] == "PENDIENTE")


def aplica_a_rig10(equipo):
    return bool(_catalogo()[equipo].get("aplica_a_rig10"))
