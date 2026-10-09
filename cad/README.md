# cad/ — modelado paramétrico (CadQuery) de TACKER DIGITAL RIG

Flujo estilo SolidWorks (variables → ecuaciones → operaciones → verificación → export) con la skill
`diseno-cad-solidworks`. Las cotas salen de `reference/v2-previo/src/technical-spec.js` (fuente única,
se leen con `node`); no se duplican en Python.

```
python -m venv %USERPROFILE%\cad-env && %USERPROFILE%\cad-env\Scripts\pip install -r cad/requirements.txt
%USERPROFILE%\cad-env\Scripts\python cad/build.py      # genera y verifica; exit 1 si una cota no cierra
npm run gltf:inspect -- assets/source/mastil.glb        # revisar antes de optimizar
npm run gltf:optimize -- mastil.glb                     # → public/models/tacker10/ (decisión aparte)
```

## Convenciones

- **1 unidad = 1 m**. CAD: Z arriba, +X hacia el mástil, Y lateral. El export pasa a glTF Y-arriba.
- Contrato `gltf-pipeline`: nodo raíz = id del componente, mallas `<id>_<parte>`, materiales `<id>_<rol>`.
- Salida en `assets/source/` (ignorada por git) junto a `<id>.meta.json`: confianza, alcance, datos con
  `status` (`confirmed` con `sourceId` / `pending`) y conflictos de fuente.
- Cada operación pasa por `Arbol` (cambia el volumen y deja un sólido válido). `build.py` verifica las
  cotas contra el spec, regenera las configuraciones y comprueba los nombres del GLB.

## Parámetros, presets y overrides (skill `diseno-cad-solidworks`)

Cada componente tiene su JSON en `cad/parametros/<equipo>.json` (`base`, `rangos`, `presets`). Precedencia: **base < preset < `--set`**.
Los valores documentados se leen de `technical-spec.js` con `"@spec:mast.heightM"` (fuente única). Nunca se inventan datos:

```
python cad/build.py                                         # genera y verifica todo
python cad/cli.py mastil --set n_pan_inf=10 --set Db=1.8    # otras medidas (salida mastil_mod.glb)
python cad/cli.py piso_trabajo minimo                       # preset (h = 1 m)
python cad/cli.py mastil tacker10                           # falla: PENDIENTE (falta plano del fabricante)
```

`cad/catalogo.json` guarda la procedencia por dato (`REF_OEM`, `REPRESENTATIVO`, `DERIVADO`, `PENDIENTE`) y `catalogo.dato()` falla ante un
PENDIENTE. `build.py` comprueba que los presets con `null`, los parámetros desconocidos y los valores fuera de rango fallen como corresponde.

## Componentes actuales (confianza C — envolventes, no as-built)

| Componente       | Qué es                                          | Dato documentado                                              | Pendiente                                                                        |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `mastil`         | 2 tramos macizos                                | 31,6992 m = 16,4 + 15,2992                                    | secciones transversales (placeholder), reticulado                                |
| `piso_trabajo`   | placa a altura regulable                        | 2,6 × 3,3 m, rango 1–4 m                                      | espesor (placeholder); **conflicto**: 3,606 m (plano 8123) / 3 m / legacy 2,30 m |
| `carrier_huella` | huella en planta                                | 18 × 4 m, 5 ejes (dato)                                       | altura, ejes, posición vs boca de pozo (layout TKR-10)                           |
| `layout_tkr10`   | huellas de acumulador, bomba, pileta, planchada | tamaños y cotas rotuladas del layout TKR-10 (5 m, 3 m, 1,3 m) | posiciones no acotadas (medidas del vector del PDF, C); signo lateral            |

Estos GLB **no reemplazan** al visor legacy (más detallado): sirven de envolvente dimensional verificable
y de base para auditar las cotas del legacy. No se registran en `Component.model` hasta validarlos.

## SK-575 completo (`cad/sk575/`, build123d)

Modelo de referencia del TACKER 10 entero (Service King SK-575 en locación, 16 componentes `sk575_*`, ≈ 1,09 M tris,
1,6 MB optimizado). Entorno **aparte** (build123d 0.13 / OCP 8, incompatible con este `cad-env`), verificación de 13
cotas contra `technical-spec.js` → `TACKER_10.sk575` y un GLB por componente. Ver [`sk575/README.md`](sk575/README.md)
y el informe [`docs/pdf-review/informe-sk575-2026-10-09.md`](../docs/pdf-review/informe-sk575-2026-10-09.md).
Confianza de geometría B (izaje, piso) o C (resto); **no es as-built**.

## Ejemplos

`examples/choke_manifold_ilustrativo/`: choke manifold genérico reconstruido de una imagen de proveedor.
**No es Tacker 10**, escala PENDIENTE (unidades = px), IoU 0,58. Solo ilustrativo; no usar en el visor.

## Próximos candidatos (necesitan dato fuente)

Cubiertos en forma ilustrativa (C) por `cad/sk575/`: BOP, acumulador, piletas, bomba, manifold. Siguen faltando datos fuente:
diámetro nominal del BOP instalado (conflicto 7-1/16" vs 11"), choke manifold real de Tacker 10 (el B20-9908 es del TKR-08,
solo escala), secciones y reticulado del mástil (el manual SK no trae planos de arreglo general).
