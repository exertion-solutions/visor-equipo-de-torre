# Puntos de control DROPS en el equipo de torre — síntesis

Fecha: 2026-09-25. Síntesis de los 9 PDF de `docs/fuentes/drops/`. Detalle, citas y páginas en los 5 extractos de esta carpeta
(`extracto-*.md`). Regla del proyecto: **no se inventan alturas, radios, pesos ni requisitos**; lo inferido va marcado.

## 1. Qué dice cada documento y cuánto pesa

| Documento (`docs/fuentes/drops/`)                          | Qué es                                                                    | Aporta a "dónde están los puntos" | Clasificación QHSE sugerida\*     |
| --------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| **Libro DROPS 2024**                   | RCCO Rev.03 (04/01/24), logo de la empresa, 25 págs.: 66 puntos en 11 secciones | **Sí, es la fuente principal**    | `procedure` (ver §5, duda 1)      |
| **POWSG020 Caída de Objetos desde Altura 02** | Procedimiento PO-WSG-020 rev.02 (11/07/22), SGI de la empresa                    | Reglas, roles, frecuencia         | `procedure`                       |
| **POWSG020-A1** Check List                    | 14 ítems, "previo a cada montaje y desmontaje"                            | Lista de verificación             | `procedure`                       |
| **POWSG020-A2** Layout                        | Planta con 3 anillos de riesgo Alto/Medio/Bajo                            | **Zonificación por área**         | `procedure` (sin cotas)           |
| **POWSG020-A3** RCCO                          | Formulario mensual: 64 ítems, 44 de "Riesgo Alto"                         | Ítems por zona                    | `procedure`                       |
| **TK10 DROPS 05102023**                       | Inspección fotográfica del equipo 10 (36 fotos, 05/10/23)                 | Estado real del TK10              | evidencia de inspección           |
| Manual Drops Rev.04 (67 págs.)                | DROPS Reliable Securing, © 2017, guía genérica de la industria, offshore  | Método, no ubicaciones            | `goodPractice`                    |
| Taller de Aseguramiento (YPF)                 | 25 págs.: uniones atornilladas confiables / no confiables                 | Método, no ubicaciones            | `goodPractice`                    |
| YPF Advertencia — Caída de giratorio de winche| SIGEO INC18068, 07/10/2024                                                | Incidente real                    | evidencia de incidente            |

\* Es una propuesta mía; la decisión de estatus es tuya (ver §5).

## 2. La respuesta: dónde están los puntos de control

**Zonificación por riesgo (POWSG020-A2, planta de la locación).** Tres anillos concéntricos alrededor de la boca de pozo, **sin ningún radio ni cota**:

- **Riesgo ALTO:** corona; entre corona y piso de enganche; piso de enganche; entre piso de enganche y sección de mástil.
- **Riesgo MEDIO:** área de boca de pozo; subestructura y carrier; casilla del maquinista; plano inclinado y planchada.
- **Riesgo BAJO:** pileta, bomba, generador, campamento, depósito.

**Puntos concretos (Libro DROPS 2024, RCCO Rev.03), de arriba hacia abajo:**

| Sección del Libro                                    | Puntos | Ejemplos (con su método de sujeción)                                                                                                             |
| ---------------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Corona                                               |     11 | poleas de pistón / viajera / punto muerto / líneas de aparejo (3 topes guía); 4 pastecas del guinche; placa T-5; baliza; banderas; retráctil T5 |
| Debajo de corona / encima del piso de enganche       |      9 | luminarias ×7 y reflector led con eslinga 3 mm; depósito de purga; **vientos** con grilletes de 4 elementos; poleas superiores del piso          |
| Piso de enganche                                     |     13 | caran block; pirosalva (7 bulones); rejilla; trampolín; peines; puerta; cable de seguridad con 4 grampas; poleas de deslizamiento               |
| Debajo del piso de enganche / sobre 1.ª sección      |      9 | luminarias ×5, reflectores ×3; caja de conexión; soporte de stand pipe; manguerote de cuello de cisne; pulmón del indicador de peso              |
| Boca de pozo                                         |      4 | guinche (cable 9/16"); **power swivel = "NA"**; aparejo (8 líneas de 1 1/8"); eslinga de anclaje                                                 |
| Subestructura y carrier                              |      4 | pistones y tensores (6); escaleras y plataformas; barandas y rodapié; iluminación                                                                |
| Casilla de maquinista                                |      3 | mangueras y comandos; soporte; escaleras                                                                                                         |
| Plano inclinado                                      |      2 | (fila PLA-1 incompleta en el original: "BANDEJA HCA.")                                                                                           |
| Piletas y otros                                      |      2 |                                                                                                                                                  |
| Piso de trabajo                                      |      6 |                                                                                                                                                  |
| Poste de retenida de llave hidráulica                |      3 |                                                                                                                                                  |
| **Total**                                            | **66** |                                                                                                                                                  |

Cada punto lleva: sujeción primaria (bulón con tuerca autofrenante o chaveta partida, arandela Norlock, grillete de 4 elementos, perno con seguro, cadena) y **retención secundaria** (eslinga de 3, 4, 6 mm, 3/8" o 1/2", cadena o cable) o "No requerida". Las fotos del Libro marcan con círculos amarillos el punto exacto.

**Estado real del equipo 10 (inspección 05/10/2023):** 36 fotos, 26 "CORRECTO" y 10 con hallazgo: poleas y pastecas sin "bolsillo" antichaída (fotos 4, 8, 21), plancha con bisagra sin retención secundaria (19), falta un tornillo en el deslizador del pirosalva (22), faltan bulones en un reflector led (30), grampas cepo sin retención del tornillo (32, 33), eslinga de manguera hidráulica mal colocada o ausente (34, 35).

**Incidente de referencia (YPF, 07/10/2024):** se desprendió el seguro del **giratorio del cable del winche** y cayó "desde una altura de 5,3 mts" sobre un operario en boca de pozo. La alerta no da causa. Confirma que el punto "guinche/giratorio" (Libro BP-1) es crítico.

## 3. Cómo mapea a los 13 componentes del visor

Inferencia mía (los documentos no usan los ids del visor); a validar antes de cargar datos.

| Componente del visor | Puntos del Libro / zona A2                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `mastil`             | Corona (11), debajo de corona (9), debajo del piso de enganche (9) — zona ALTA     |
| `enganche`           | Piso de enganche (13) — zona ALTA                                                  |
| `vientos`            | Vientos y grilletes (DCO-4 a 8, PE-10, PE-13, DPE-4)                              |
| `aparejo`            | Poleas de corona, aparejo 8 líneas (BP-3)                                          |
| `malacate`           | Guinche y giratorio (BP-1, BP-2)                                                   |
| `subestructura`      | Subestructura y carrier (4), piso de trabajo (6) — zona MEDIA                      |
| `cabina`             | Casilla de maquinista (3) — zona MEDIA                                             |
| `llave`              | Poste de retenida de llave hidráulica (3)                                          |
| `caballetes`         | Plano inclinado y planchada (2) — zona MEDIA                                       |
| `circulacion`        | Piletas y otros (2) — zona BAJA                                                    |

## 4. Lo que los documentos NO dan (no inventar)

- **Ninguna distancia ni radio de exclusión**: los anillos del A2 no tienen cotas (las cotas de 2,4 a 20 m son huellas de equipos, no distancias de seguridad).
- **Ninguna altura** de corona ni de piso de enganche, ni peso de los elementos. La altura solo es cualitativa (corona → piso de enganche → 1.ª sección → boca de pozo).
- La calculadora DROPS (anexo A4 del procedimiento) **no está en los archivos**; el gráfico del procedimiento no permite leer umbrales. El único dato numérico es un ejemplo (4,56 m / 1 kg / 44,688 J = Primeros Auxilios), que no es un umbral.
- Frecuencia: A1 "previo a cada montaje y desmontaje"; RCCO "mensualmente" (Encargado de Turno); corrección "inmediatamente", sin plazo numérico.

## 5. Inconsistencias y decisiones que necesito de vos

1. **¿El Libro aplica al equipo 10?** No dice a qué equipo aplica (no aparece "TK10"). Y las fotos del TK10 no traen rótulo de ubicación: su correspondencia con puntos del Libro es tentativa.
2. **Conflicto de nivel:** boca de pozo es MEDIO en el A2 pero ALTO en el RCCO; el procedimiento 6.3.5 pone la "torre" en MEDIO y piletas/bombas/acumuladores/carrier en BAJO, lo que no coincide con el A2. ¿Qué prevalece?
3. **Estatus:** ¿los ítems del Libro/RCCO/A1 se cargan como `procedure` (procedimiento aprobado de la empresa)? El PO-WSG-020 figura con elaboró/revisó/aprobó solo con iniciales.
4. **¿Tenés el anexo A4** (calculadora) y los formularios referenciados (POSGI011-A1, POSGI015-A1-0, POWSG019)? No están en `docs/fuentes/drops/`.
5. **Filas dudosas del Libro** (columnas desplazadas, sin número o incompletas): COR-10, "soporte de banderas", PLA-1. La pág. 25 lleva otro encabezado (Rev.01, 18/09/23, "REGISTRO DE CAÍDAS ELEMENTOS EN ALTURA (DROPS)").
6. **¿Se cerraron los hallazgos del TK10?** El Libro es posterior (04/01/24) y no recoge el bolsillo antichaída de poleas ni la retención de grampas cepo.

## 6. Qué se puede construir con esto (sin inventar)

- `src/data/qhse/rig10-drops.ts`: los 66 puntos como datos (`Risk` con `hazard: 'droppedObjects'`, `Barrier` primaria/secundaria), cada uno con `sourceId` = Libro + página; los del A2 como zonificación **cualitativa** (Alto/Medio/Bajo) sin geometría, o como zona `illustrative` con la leyenda "SIN VALIDAR".
- Capa DROPS en modo QHSE: resaltar por zona de riesgo y por sección, con el panel "punto → sujeción primaria → retención secundaria → fuente".
- Hallazgos del TK10 como estado por punto (correcto / hallazgo) con fecha 05/10/2023.

## 7. Aplicado al visor (2026-09-25)

- **Datos**: `src/data/qhse/rig10-drops.json` (fuente única; 66 puntos, 3 zonas, 11 secciones, 10 hallazgos TK10, 9 fuentes)
  con schema zod y tests en `rig10-drops.ts` / `.test.ts`. Estatus `procedure` por decisión del usuario; la aplicabilidad del
  Libro al TK10 la declara el usuario (el documento no nombra el equipo). `COR-11` = fila sin número del Libro.
- **Visor V2**: `legacy-ext/50-drops-layer.js` (capa) y `20-mast`, `30-carrier`, `40-wellsite` (geometría con cada punto marcado
  como `userData.dropsId`; 65 de 66, BP-2 es "NA"). Se genera con `npm run build:legacy`.
- **Qué muestra**: tinte de cada componente por su zona A2 más alta, un marcador por sección con nº de puntos, panel con
  sujeción primaria/retención secundaria/fuente/página, leyenda y resumen TK10 (26/36 correctos, 10 hallazgos).
- **Qué NO hace**: no dibuja radios ni distancias (el A2 no las da); las posiciones de los marcadores son del modelo y se rotulan
  aproximadas; la correspondencia foto TK10 ↔ punto es inferida y así se rotula.
- **Pendiente**: decisiones §5 (aplicabilidad al TK10, conflicto de nivel boca de pozo, estatus de `procedure`); barreras derivadas
  (`toQhseDataset`) quedan `pendingValidation` porque el schema no admite barrera más fuerte que su riesgo y los documentos no
  dan evento/consecuencia como riesgo `procedure`.
