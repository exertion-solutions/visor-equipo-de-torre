---
name: qhse-visualization
description: Use when building or editing QHSE features — risks, barriers, exclusion zones, line of fire, dropped objects, pressure, suspended load, emergency routes — or any safety text shown in the UI, or when importing risk/control text from the legacy viewer. Prevents inventing distances/requirements and enforces evidence status.
---

# qhse-visualization

## Regla central

**No inventar distancias, radios ni requisitos.** Una recomendación genérica no es una obligación.

## Estatus (`QhseStatus`, `src/types/qhse.ts`)

| status              | significado                                       | ¿se muestra como requisito?                 |
| ------------------- | ------------------------------------------------- | ------------------------------------------- |
| `confirmed`         | dato verificado en documento del equipo/locación  | sí, con fuente                              |
| `procedure`         | figura en un procedimiento aprobado de la empresa | sí, con fuente                              |
| `goodPractice`      | práctica recomendada, no obligatoria (con fuente) | **no**: etiquetar "Buena práctica"          |
| `pendingValidation` | sin validar / sin fuente                          | **no**: etiquetar "Pendiente de validación" |

`isMandatoryStatus()` (`src/data/qhse/hazards.ts`) decide la redacción ("debe" vs "se recomienda"); no reimplementarlo. El schema exige `sourceId` salvo en `pendingValidation`.

## Geometría de zonas

- `ExclusionZone.shape` es opcional. Sin dato confirmado no se dibuja nada.
- **Zona ilustrativa** (`illustrative: true`, siempre `pendingValidation`): puede dibujarse como envolvente gráfica (p. ej. el círculo de caída de mástil del legacy, radio 1,1 × largo del mástil), pero:
  - la leyenda visible dice **"ZONAS ILUSTRATIVAS — SIN VALIDAR"**;
  - no se muestra su medida como valor ni como requisito;
  - va acompañada del aviso "las distancias del modelo no sustituyen exclusiones aprobadas";
  - el schema rechaza una zona ilustrativa marcada `confirmed`/`procedure`.
- Cotas documentadas de locación (anclajes 25 ± 3 m, planchada 12 × 2,4 m…) vienen del layout de locación; si otra fuente difiere (folleto anterior: 20 m) se muestra "Fuente en conflicto". Las distancias/zonas de API RP 505 y del equipo 11 se citan como referencia y no se trasladan al equipo 10 sin validación.

## Migrar texto del visor legacy

El legacy trae por componente `riesgos` y `epp` ("Controles orientativos · verificar aplicabilidad"), sin fuente y a veces redactados como obligación ("Prueba de presión del BOP antes de iniciar", "Respetar la capacidad nominal…").

- Importarlos como `pendingValidation` (sin `sourceId`) hasta adjuntar procedimiento o documento.
- Mantener el encabezado "Controles orientativos · verificar aplicabilidad" y reescribir en modo recomendación mientras no haya fuente.
- Nunca subirlos a `confirmed`/`procedure` por conveniencia.

## Modelo bow-tie (`src/types/qhse.ts`)

- **Risk = hazard → event → consequence**: qué peligro existe, qué puede pasar y qué produce. `event` y `consequence` no pueden quedar vacíos: sin fuente el riesgo es `pendingValidation` y esos campos pueden llevar el centinela `PENDING_TEXT` ("Pendiente de definición", `src/data/qhse/hazards.ts`) en vez de texto inventado; la UI lo rotula como pendiente. Un riesgo `confirmed`/`procedure`/`goodPractice` con el centinela es inválido.
- **Barrier** cuelga de un riesgo y es `preventive` (evita el evento) o `mitigative` (reduce la consecuencia). Su desempeño se describe en texto libre con fuente; **no inventar desempeño de barreras**, límites de presión ni EPP obligatorios.
- Cada barrera y riesgo lleva un estatus; cada `Source` indica `verified`. Solo `confirmed` y `procedure` se presentan como requisito.
- **Zona ilustrativa ≠ control operacional aprobado**: una envolvente gráfica no es una exclusión aprobada; rotularla así y no mostrarla como barrera.

## Categorías

lineOfFire · droppedObjects · highPressure · suspendedLoad · mobileEquipment · workingAtHeight · pinchPoints · rotatingEquipment · wellControl · chemicals · noise · emergencyRoutes.

## UI

- Toda pieza QHSE muestra badge de estatus + fuente. El color nunca es el único canal (accesibilidad).
- Modo QHSE = capa derivada (zonas + resaltado de componentes críticos: aparejo, malacate, BOP, llave, vientos), reversible al salir; no muta materiales.
- Una visualización no es un cálculo de ingeniería: incluir aviso cuando se muestre una simulación (caída de mástil, trayectorias).

## Validar siempre con fuentes y componentes

Cargar datos QHSE con `makeQhseDatasetSchema(componentIds, indexSources(rig.sources))` (no solo `qhseDatasetSchema`): así se exige que toda `sourceId` exista y que `confirmed`/`procedure` provengan de una fuente `verified` y no `estimate`. Reglas extra del dataset: `zone.hazard === risk.hazard`; barrera y zona no superan el estatus de su riesgo (confirmed = procedure > goodPractice > pendingValidation); una zona con `shape` no ilustrativa exige `confirmed`/`procedure`; un riesgo `confirmed`/`procedure` necesita una barrera no pendiente o una nota explícita.

## Dataset DROPS del equipo 10 (`src/data/qhse/rig10-drops.json`)

- Fuente única: 66 puntos de control del Libro DROPS 2024 (RCCO Rev.03), 3 zonas del layout A2 (Alto/Medio/Bajo), 11 secciones. Los documentos de origen son internos y no se publican.
- Estatus `procedure` por decisión interna; la aplicabilidad del Libro al equipo 10 no la dice el documento. `piso-trabajo` y `poste-llave` no figuran en el A2 → zona `null` ("sin clasificar"), no se les asigna una.
- **El A2 no da radios ni cotas**: la UI clasifica por zona (color + texto ALTO/MEDIO/BAJO) y nunca dibuja ni muestra distancias, alturas o pesos. Las posiciones de los marcadores son del modelo y se rotulan "aproximadas".
- No se publican hallazgos de inspecciones internas.
- Manual Drops Rev.04 y Taller YPF son guías genéricas (`goodPractice`): no generan puntos.
- Barreras derivadas (`toQhseDataset()`) quedan `pendingValidation`: el schema no admite una barrera más fuerte que su riesgo y los documentos no dan evento/consecuencia.
