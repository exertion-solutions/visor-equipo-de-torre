# cad/sk575 — modelo de referencia Service King SK-575 (TACKER 10)

Modelo CAD (build123d) del TACKER 10 completo en locación: mástil, carrier, cuadro de maniobras, izaje, aparejo,
BOP, piso, planchada, vientos, piletas, manifold, bomba y acumulador. **No es as-built**: confianza por componente
B/C; cotas, fuentes y conflictos en [`docs/pdf-review/informe-sk575-2026-10-09.md`](../../docs/pdf-review/informe-sk575-2026-10-09.md).

| Archivo            | Qué hace                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `modelo.py`        | Geometría. `comp(id)` etiqueta las piezas que siguen con el `Component.id` del visor; `add(material, …)`.               |
| `exportar.py`      | Verifica 16 cotas (incl. cilindro HYCO) contra `technical-spec.js` → `TACKER_10.sk575` y exporta un GLB por componente. |
| `publicar.mjs`     | `gltf:optimize` con simplify declarado + `public/models/tacker10/<id>.meta.json` con tris origen/publicados.            |
| `requirements.txt` | Dependencias del entorno propio (abajo).                                                                                |

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
# revisar y publicar (gltf:optimize con simplify declarado + meta.json publicado) → public/models/tacker10/
npm run gltf:inspect -- assets/source/sk575_mastil.glb
node cad/sk575/publicar.mjs                 # todos; o: node cad/sk575/publicar.mjs sk575_mastil
node cad/sk575/publicar.mjs --contar public/models/tacker10/sk575_*.glb   # solo contar tris/aristas
```

Salida en `assets/source/` (ignorada por git): `<id>.glb` + `<id>.meta.json` (confianza, alcance, triángulos,
materiales, `as_built: false`, enlace al informe, sub-nodos, aristas). `publicar.mjs` corre
`npm run gltf:optimize -- <id>.glb --simplify true --simplify-error 0.0001 --simplify-ratio 0` (el default del CLI 4.5,
ahora **declarado**) y copia el meta a `public/models/tacker10/<id>.meta.json` (versionado) con
`publicado.triangulos_origen` / `triangulos_publicados` / `segmentos_aristas`.

## Contrato del GLB

- Nodo raíz = `Component.id` (`sk575_mastil`, `sk575_carrier`, …); una malla por material y nodo `<nodo>_<material>`;
  materiales PBR `<id>_<material>` de la raíz (compartidos con los sub-nodos; las aristas usan `<id>_arista`). Las mallas de la raíz van primero (84-modelo-sk575.js toma el primer `sk575_carrier_*`).
- **Sub-nodos con nombre** (misma geometría, otra partición; `comp("raiz/sub", origen)` en `modelo.py`):
  - `sk575_carrier` → `sk575_cabina` (cabina de manejo) y `sk575_motor` (motor, radiador, filtro, escape, transmisión).
  - `sk575_mastil` → `sk575_enganche` (piso de enganche a 68'; va con el 2.º tramo del mástil).
  - `sk575_izaje` → `sk575_izaje_cil{1,2}_camisa` (origen = perno del pie en el carrier), `_etapa1`, `_etapa2`,
    `_vastago` (origen = perno superior en el mástil), `sk575_izaje_orejas_carrier`, `sk575_izaje_orejas_mastil`.
    Anclajes, largos HYCO (1,524 / 4,864 m, A) y regla de animación en `sk575_izaje.meta.json` → `cilindros`.
- **Aristas de rasgo** horneadas: cada nodo con mallas tiene un hijo `<nodo>_aristas` con una primitiva `LINES`
  (mode 1): ángulo entre caras > 28° (mismo criterio que `aristas()` de `legacy-ext/84-modelo-sk575.js`) + bordes libres,
  sin `_luz` ni `_vidrio`. simplify de gltf-transform no toca LINES. El V2 actual las ignora (lee solo mode 4).
- `sk575_vientos.meta.json` → `cables`: extremo en el mástil (armado) y ancla en tierra de cada cable (anclajes WS10,
  **fuente en conflicto C4**).
- Metros, glTF Y arriba, **origen = boca de pozo a nivel de terreno**, carrier hacia −X (igual que el repo).
  CAD (x, y, z) → glTF (x − WXP, z, −y).
- Teselado más grueso para `cable` y `goma` (`TOL` en `exportar.py`) para no inflar triángulos. `goma` (0,02 m; 0,48 rad):
  el ángulo queda bajo los 28° de las aristas (0,6 rad facetaba el neumático y le dibujaba aristas en la banda).
- Ojo: OpenCascade reutiliza la triangulación de un sólido ya teselado; el `TOL` de un material vale para la primera
  teselación de cada sólido.

## Componentes

| componentId         | Familia      | Conf. geom. | Tris origen | Publicados | Qué es                                                                                  |
| ------------------- | ------------ | ----------- | ----------- | ---------- | --------------------------------------------------------------------------------------- |
| `sk575_mastil`      | mast         | C           | 46.924      | 28.004     | Mástil inclinado 3,5°, corona en voladizo; sub-nodo `sk575_enganche` (piso 68')         |
| `sk575_carrier`     | carrier      | C           | 268.082     | 121.008    | Bastidor 40 ft, 5 ejes, tanques, gatos, T-sill; sub-nodos `sk575_cabina`, `sk575_motor` |
| `sk575_cuadro`      | hoisting     | C           | 122.202     | 40.482     | Tambores, discos, embragues, consola, líneas a la corona                                |
| `sk575_izaje`       | mast         | B           | 56.704      | 40.554     | Cilindros HYCO 50162-813-13150 (camisa / etapas / vástago)                              |
| `sk575_aparejo`     | hoisting     | C           | 37.740      | 25.630     | Aparejo-gancho, 8 líneas, amelas, elevador                                              |
| `sk575_bop`         | well-control | C           | 106.556     | 64.924     | Carretel + doble ram + anular + KL/CL (diámetro en conflicto)                           |
| `sk575_llave`       | workfloor    | C           | 4.636       | 4.132      | Llave hidráulica                                                                        |
| `sk575_piso`        | workfloor    | B           | 21.064      | 15.870     | Piso pulling, subestructura, escaleras                                                  |
| `sk575_planchada`   | auxiliary    | C           | 89.964      | 27.792     | Planchada, rampa, caballetes, línea HP                                                  |
| `sk575_tiros`       | auxiliary    | C           | 2.296       | 712        | Tiros de tubing (ilustrativo)                                                           |
| `sk575_vientos`     | anchoring    | C           | 23.908      | 5.432      | Vientos, anclajes, pirosalva (extremos en el meta.json)                                 |
| `sk575_pozo_vecino` | well-control | C           | 13.680      | 12.272     | Árbol de navidad vecino (ilustrativo)                                                   |
| `sk575_piletas`     | circulation  | C           | 46.228      | 20.890     | 3 piletas + trip tank                                                                   |
| `sk575_manifold`    | well-control | C           | 152.392     | 68.068     | Manifold M1–M12 + líneas                                                                |
| `sk575_bomba`       | circulation  | C           | 11.290      | 8.906      | Bomba triplex                                                                           |
| `sk575_acumulador`  | well-control | C           | 37.772      | 32.006     | Acumulador BOP                                                                          |

Total 1.041.438 tris de origen → **516.682 publicados** + 111.158 segmentos de aristas (presupuesto nativo < 1,5 M tris,
< 300 draw calls). Antes de la partición y las aristas: 1.085.884 → 505.828 (el error de simplify es relativo a cada
malla: los sub-nodos simplifican menos).

## Reglas

- Una cota documentada nueva se agrega primero a `technical-spec.js` (`TACKER_10.sk575`) y a `verificar()`; nunca solo en `modelo.py`.
- Conflictos de fuente (líneas 6/8, BOP 7-1/16"/11", anclajes) se rotulan en el informe y en el `alcance`, no se eligen en silencio.
- Los documentos fuente no se versionan (repo público): índice en [`docs/fuentes/tacker10/README-sk575.md`](../../docs/fuentes/tacker10/README-sk575.md).
