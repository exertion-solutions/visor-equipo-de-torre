---
name: digital-twin-architecture
description: Use when adding or changing rig data, component hierarchy, confidence levels, source conflicts, modes (EXPLORE/OPERATION/QHSE/TRAINING), stores, or support for a new rig (TACKER 05/06/11); also when migrating data from the legacy HTML viewer. Guards data integrity and traceability of the TACKER DIGITAL RIG model.
---

# digital-twin-architecture

## Modelo (`src/types`, validado por `src/data/schema.ts`)

`Rig → Equipment → Component → Specification`, cada dato con su `Source`.
`GeometryConfidence`: **A** documentado · **B** parcial · **C** aproximado.
Campos que salieron del visor legacy: `Component.scope` (qué NO representa la geometría), `Component.explodeOffset` (despiece autorado, metros), `Specification.conflicts` (otras fuentes con otro valor).

## Reglas

1. Todo `Component` y `Specification` cita un `sourceId` existente (`rig.sources`). Sin fuente no hay dato: dejar el campo fuera o marcarlo pendiente; nunca estimar en silencio.
2. La confianza de la geometría (`Component.confidence`) es independiente de la del dato (`Specification.confidence`).
3. La UI muestra el nivel (A/B/C) **y el `scope`** junto a cualquier cota; **C nunca se rotula as-built**. Lo aproximado se rotula "aproximado" también en mediciones y archivos exportados.
4. **Fuentes en conflicto**: si dos fuentes difieren (p. ej. anclajes de vientos: layout TKR-10 25 ± 3 m vs folleto anterior 20 m) se registran ambas (`value` + `conflicts`), la UI muestra "Fuente en conflicto" y no se elige una en silencio. Precedencia solo por decisión documentada en `docs/`.
5. Un rig nuevo = un archivo en `src/data/rigs/<id>.ts` que pasa `rigSchema`. Sin ramas `if (rig === 'TACKER-10')` en componentes.
6. Cambiar una cota documentada exige actualizar la fuente y dejar nota en `docs/`. Tacker 11 no aporta geometría a Tacker 10 sin comprobar equivalencia.
7. Modos: `src/stores/modeStore.ts` es el único punto de verdad. Los modos son **estado derivado** (qué se muestra/resalta), no mutación de materiales ni de datos; cambiar de modo debe ser reversible.
8. Convención espacial: origen en la boca de pozo, +X hacia el mástil, carrier hacia −X, Z lateral, Y arriba, metros. Todo dato posicional (zonas, anclajes, offsets) usa esa convención.
9. **No reinterpretar el activo como drilling rig**: es un mobile pulling/workover (sin top drive ni mesa rotary). Ningún tipo, dato ni texto nuevo debe asumir un equipo de perforación.
10. **Diseñar para varios TACKER** (05, 06, 11…) sin copiar apps: datos por rig, componentes genéricos, `Rig.service` para el tipo de servicio.
11. **Mantener el legacy hasta paridad verificada**: el visor V2 (`public/legacy/`, iframe) no se retira hasta que las filas críticas de `docs/FEATURE_PARITY.md` estén "verificado". `reference/legacy/` es inmutable.
12. **Flujo bow-tie QHSE**: `Risk` = hazard → event → consequence; `Barrier` preventiva o mitigativa; cada `Source` con `verified`. Ver skill `qhse-visualization`.

## Migración desde el visor legacy

Ver `docs/legacy-audit-2026-09-25.md` (patrones a conservar, inconsistencias, línea base de rendimiento).

- Cotas de Tacker 10: `reference/v2-previo/src/technical-spec.js` → `src/data/rigs/tacker-10.ts` (aún no creado), cada valor con su `Source` (folleto rev. 26/06/2024, layout TKR-10) y página.
- Grados A/B/C del legacy (`META`): punto de partida, revalidar contra el folleto.
- Textos de riesgos/controles del legacy: importar como `pendingValidation` (sin fuente). Ver skill `qhse-visualization`.
- No copiar coordenadas o textos que contradigan los documentos (anclajes 13–18 m, "mástil ~30 m"): registrar como conflicto o corregir.

## Modelos CAD externos (p. ej. `cad/sk575/`)

- Las cotas que usa el modelo viven en `technical-spec.js` (fuente única) y el exportador las verifica antes de generar GLB; una cota que solo está en el `.py` no es dato.
- Contrato GLB `<id>_<rol>` con `<id>` = `Component.id`; un GLB por componente seleccionable; `meta.json` con confianza y `as_built: false`.
- Cotas medidas sobre vistas CAD sin acotar (p. ej. Parts Manual con escala calibrada) → B/C y `verified: false`; transcripciones de agentes también `verified: false` hasta revisar el original.
- Fuente CAD canónica del SK-575: `cad/sk575/modelo.py` (no `~/cad/tacker10/`). Aristas, PBR, noche y desgaste son presentación: no cambian datos ni confianza.
- Documentos de terceros con reproducción prohibida: se citan por código/ruta en `Source.ref`, no se suben (repo público).

## Checklist al agregar datos

- [ ] `npm run test:unit` (validar con `rigSchema`)
- [ ] ids únicos, `parentId` existente, `model` bajo `/models/`
- [ ] fuente con `ref` (documento + página/revisión)
- [ ] conflictos entre fuentes registrados, no resueltos en silencio
