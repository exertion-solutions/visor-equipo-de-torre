# cad/sk575 — modelo de referencia Service King SK-575 (TACKER 10)

Modelo CAD (build123d) del TACKER 10 completo en locación: mástil, carrier, cuadro de maniobras, izaje, aparejo,
BOP, piso, planchada, vientos, piletas, manifold, bomba y acumulador. **No es as-built**: confianza por componente
B/C; cotas, fuentes y conflictos en [`docs/pdf-review/informe-sk575-2026-10-09.md`](../../docs/pdf-review/informe-sk575-2026-10-09.md).

| Archivo            | Qué hace                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `modelo.py`        | Geometría. `comp(id)` etiqueta las piezas que siguen con el `Component.id` del visor; `add(material, …)`. |
| `exportar.py`      | Verifica 13 cotas contra `technical-spec.js` → `TACKER_10.sk575` y exporta un GLB por componente.         |
| `requirements.txt` | Dependencias del entorno propio (abajo).                                                                  |

## Entorno (aparte del `cad-env`)

build123d 0.13 depende de **cadquery-ocp 8.x**; el `cad-env` del repo (`cad/requirements.txt`) usa **CadQuery 2.8 / OCP 7.9**.
Los dos OCP no conviven en un mismo venv, por eso este modelo tiene su propio entorno.

Dependencias revisadas (regla "revisar antes de instalar"): `build123d` (gumyr, PyPI, Apache-2.0), `trimesh` (MIT), `numpy`.

```powershell
python -m venv $env:USERPROFILE\.cad-venv
& $env:USERPROFILE\.cad-venv\Scripts\pip install -r cad/sk575/requirements.txt
```

## Regenerar

```powershell
# todos los componentes (exit 1 si una cota no cierra contra technical-spec.js); requiere node en el PATH
C:\Users\jcastro\.cad-venv\Scripts\python.exe cad/sk575/exportar.py
# uno solo
C:\Users\jcastro\.cad-venv\Scripts\python.exe cad/sk575/exportar.py sk575_bop
# revisar y optimizar (meshopt) → public/models/tacker10/
npm run gltf:inspect -- assets/source/sk575_mastil.glb
npm run gltf:optimize -- sk575_mastil.glb
```

Salida en `assets/source/` (ignorada por git): `<id>.glb` + `<id>.meta.json` (confianza, alcance, triángulos,
materiales, `as_built: false`, enlace al informe). Optimizado: ~23 MB → **1,6 MB** total con meshopt.

## Contrato del GLB

- Nodo raíz = `Component.id` (`sk575_mastil`, `sk575_carrier`, …); una malla por material `<id>_<material>`, material
  PBR con el mismo nombre. ~1 draw call por material por componente (≈ 100 en total).
- Metros, glTF Y arriba, **origen = boca de pozo a nivel de terreno**, carrier hacia −X (igual que el repo).
  CAD (x, y, z) → glTF (x − WXP, z, −y).
- Teselado más grueso para `cable` y `goma` (`TOL` en `exportar.py`) para no inflar triángulos.

## Componentes

| componentId         | Familia      | Conf. geom. | Triángulos | Qué es                                                          |
| ------------------- | ------------ | ----------- | ---------- | --------------------------------------------------------------- |
| `sk575_mastil`      | mast         | C           | 46.924     | Mástil inclinado 3,5°, corona en voladizo, piso de enganche 68' |
| `sk575_carrier`     | carrier      | C           | 298.842    | Bastidor 40 ft, 5 ejes, cabina, motor, tanques, gatos, T-sill   |
| `sk575_cuadro`      | hoisting     | C           | ~90.000    | Tambores, discos, embragues, consola, líneas a la corona        |
| `sk575_izaje`       | mast         | B           | 62.392     | Cilindros HYCO 50162-813-13150                                  |
| `sk575_aparejo`     | hoisting     | C           | 37.740     | Aparejo-gancho, 8 líneas, amelas, elevador                      |
| `sk575_bop`         | well-control | C           | 106.556    | Carretel + doble ram + anular + KL/CL (diámetro en conflicto)   |
| `sk575_llave`       | workfloor    | C           | 4.636      | Llave hidráulica                                                |
| `sk575_piso`        | workfloor    | B           | 26.752     | Piso pulling, subestructura, escaleras                          |
| `sk575_planchada`   | auxiliary    | C           | 89.964     | Planchada, rampa, caballetes, línea HP                          |
| `sk575_tiros`       | auxiliary    | C           | 2.296      | Tiros de tubing (ilustrativo)                                   |
| `sk575_vientos`     | anchoring    | C           | 23.908     | Vientos, anclajes, pirosalva                                    |
| `sk575_pozo_vecino` | well-control | C           | 13.680     | Árbol de navidad vecino (ilustrativo)                           |
| `sk575_piletas`     | circulation  | C           | 46.228     | 3 piletas + trip tank                                           |
| `sk575_manifold`    | well-control | C           | 152.392    | Manifold M1–M12 + líneas                                        |
| `sk575_bomba`       | circulation  | C           | 11.290     | Bomba triplex                                                   |
| `sk575_acumulador`  | well-control | C           | 37.772     | Acumulador BOP                                                  |

Total ≈ 1,09 M triángulos (presupuesto nativo < 1,5 M tris, < 300 draw calls).

## Reglas

- Una cota documentada nueva se agrega primero a `technical-spec.js` (`TACKER_10.sk575`) y a `verificar()`; nunca solo en `modelo.py`.
- Conflictos de fuente (líneas 6/8, BOP 7-1/16"/11", anclajes) se rotulan en el informe y en el `alcance`, no se eligen en silencio.
- Los documentos fuente no se versionan (repo público): índice en [`docs/fuentes/tacker10/README-sk575.md`](../../docs/fuentes/tacker10/README-sk575.md).
