"""Parámetros por equipo: JSON (`cad/parametros/<equipo>.json`) + presets + overrides.

Precedencia: base < preset < `--set K=V`. Nunca inventa valores:
- un preset con `null` falla con `KeyError: PENDIENTE ...` listando lo que falta;
- `--set` con un nombre desconocido falla listando los válidos;
- cada valor se valida contra `rangos`.
Un valor `"@spec:mast.heightM"` se lee de reference/v2-previo/src/technical-spec.js (fuente única de las cotas documentadas).
"""
import argparse
import json
import pathlib

from lib.equipo import load_spec

DIR = pathlib.Path(__file__).parent / "parametros"


def _spec_value(ref, spec):
    cur = spec
    for part in ref.split("."):
        cur = cur[int(part)] if isinstance(cur, list) else cur[part]
    return cur


def _resolve_refs(d, spec):
    out = {}
    for k, v in d.items():
        out[k] = _spec_value(v[len("@spec:") :], spec) if isinstance(v, str) and v.startswith("@spec:") else v
    return out


def cargar(equipo):
    return json.loads((DIR / f"{equipo}.json").read_text(encoding="utf-8"))


def _cast(valor_txt, ejemplo):
    if isinstance(ejemplo, bool):
        return valor_txt.lower() in ("1", "true", "si", "sí")
    if isinstance(ejemplo, int):
        return int(valor_txt)
    if isinstance(ejemplo, float):
        return float(valor_txt)
    if isinstance(ejemplo, list):
        return json.loads(valor_txt)
    return valor_txt


def resolver(equipo, preset=None, sets=(), modulo=None, spec=None):
    """Devuelve (P, sufijo, cambios, procedencia)."""
    spec = spec or load_spec()
    cfg = cargar(equipo)
    P = _resolve_refs(cfg["base"], spec)
    cambios, procedencia, sfx = [], {}, ""

    if preset:
        pres = cfg.get("presets", {})
        if preset not in pres:
            raise KeyError(f"preset desconocido '{preset}'. Válidos: {sorted(pres)}")
        pr = pres[preset]
        if isinstance(pr, str):  # "catalogo: ... -> perfil_referencia()"
            if modulo is None or not hasattr(modulo, "perfil_referencia"):
                raise KeyError(f"PENDIENTE: el preset '{preset}' pide perfil_referencia() y el generador no lo implementa")
            vals, procedencia = modulo.perfil_referencia()
        else:
            pr = _resolve_refs(pr, spec)
            faltan = sorted(k for k, v in pr.items() if v is None)
            if faltan:
                raise KeyError(f"PENDIENTE en el preset '{preset}': {faltan} (falta dato del fabricante; no se inventa)")
            vals = pr
        for k, v in vals.items():
            if k not in P:
                raise KeyError(f"el preset '{preset}' usa '{k}', que no es un parámetro. Válidos: {sorted(P)}")
            cambios.append((k, P[k], v))
            P[k] = v
        sfx = f"_{preset}"

    for kv in sets:
        if "=" not in kv:
            raise ValueError(f"--set espera K=V, llegó '{kv}'")
        k, txt = kv.split("=", 1)
        if k not in P:
            raise KeyError(f"parámetro desconocido '{k}'. Válidos: {sorted(P)}")
        v = _cast(txt, P[k])
        cambios.append((k, P[k], v))
        P[k] = v
        sfx = sfx + "_mod" if "_mod" not in sfx else sfx

    for k, (lo, hi) in cfg.get("rangos", {}).items():
        if k in P and not (lo <= P[k] <= hi):
            raise ValueError(f"{k}={P[k]} fuera del rango [{lo}, {hi}]")
    return P, sfx, cambios, procedencia


def cli(equipo, modulo=None, argv=None):
    ap = argparse.ArgumentParser(description=f"Parámetros de {equipo}")
    ap.add_argument("preset", nargs="?", default=None, help="preset del JSON (opcional)")
    ap.add_argument("--set", dest="sets", action="append", default=[], metavar="K=V")
    a = ap.parse_args(argv)
    P, sfx, cambios, proc = resolver(equipo, a.preset, a.sets, modulo)
    for k, antes, despues in cambios:
        print(f"  {k}: {antes} -> {despues}")
    return P, sfx
