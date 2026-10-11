# Catálogo de referencia (fabricantes y manuales genéricos)

Relevamiento del 2026-10-11. Son fuentes de **referencia genérica**, no del TACKER 10 (Service King SK-575, mástil
DKA104-330-08). **No alteran cotas ni capacidades del equipo**. Ningún valor de acá se carga en `src/data/rigs/tacker10.ts`
sin una fuente propia del equipo (placa, plano, planilla de inspección). Todas llevan `verified: false`. Las transcripciones
de tablas en imagen las hizo un agente y no se revisaron contra el original.

Los documentos **no se versionan** (son de terceros y el repo es público). Se citan por URL y página. El catálogo
transcripto (197 ítems, `{categoria, fabricante, modelo, capacidad, cotas, fuente_url, pagina, nota, incierto}`) queda
fuera del repo, en el scratchpad de la sesión (`catalogo/catalogo.json`).

## 1. Fuentes (ids propuestos)

| id propuesto              | type         | verified | Documento                                                                                                                     | Qué cubre                                                                                                                                               | Límites                                                                                                                                                  |
| ------------------------- | ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-ref-fet-hoisting`    | manufacturer | false    | FET (Forum Energy Technologies), página web "Hoisting Equipment" — https://f-e-t.com/drilling/pipe-handling-equipment/hoisting-equipment/ | Familias de elevadores (hidráulicos, manuales center latch / side door / slip type / single joint, neumáticos, riser), amelas, conectores, extensiones, beckets: rangos de capacidad, tubulares y largos | **Sin cotas dimensionales.** El "Handling Tools Catalog" exige formulario de contacto (no se completó). Orientado a perforación (top drive)              |
| `src-ref-nov-mobile-rigs` | manufacturer | false    | NOV "Mobile Rigs" brochure, © 2012, 0001-0399-64 Rev. K (12 p., PDF escaneado sin texto) — https://assets.nov.com/NCP4N68N/at/6b5bvbcx499g2r3vq4mqj/Mobile_Rigs_Brochure.pdf | Equipos móviles de pulling/workover (C-Series 3C–7C y líneas Cabot, Cardwell, Cooper, Franks, IDECO, Kremco, Skytop Brewster, Wilson): capacidad, malacate, motor, designación de mástil; tablas de malacates (tambor, freno, embrague, cap. de pistoneo); mástiles de reemplazo; power swivels S-85 / S-120 | Sin Service King. Sin geometría de mástil, carrier ni aparejo. Algunas cifras impresas son inconsistentes (marcadas `incierto`)                         |
| `src-ref-iadc-manual`     | manual       | false    | IADC Drilling Manual, 11.ª ed., eBook V.11 (© 2000 IADC), 1.463 p. — Google Drive del usuario (id `0B-yrhDrVd4xjNnhJWTJVNlVDR1k`) | Cap. E5: radios de contacto API (Tabla E5-1, por rango de capacidad), desgaste de amelas forjadas (Fig. E5-2), desgaste de orejas de ganchos Web Wilson / BJ / bloques-gancho National (E5-3/4/5). Cap. L: ratings de mástiles (IRI/IDECO Full View, Kwik-Lift, Dualift; Dreco; Woolslayer; Pyramid) | Manual de **perforación**, edición 2000 (las normas API citadas, p. ej. 8A, ya no están vigentes). Tablas en imagen de baja resolución: fracciones en pulgadas dudosas (38 de 63 ítems `incierto`). Cap. H y M no transcriptos |
| `src-ref-cbi-period-one`  | manufacturer | false    | CBI Manufacturing, página "Oilfield" — https://cbi-mfg.com/cbi-oilfield#products/oilfield/period-one-double-service-rig | Service rig Period 1 Double (carrier, mástil 105 ft / 200 klb en 6 líneas, corona, aparejo, guinches, malacate); Truck Mounted Single TMS69-120; malacate FAST450 / FAST450DB (tambores, frenos, pesos, envolvente) | Página comercial sin plano ni brochure PDF enlazado. Peso del aparejo "2,200" sin unidad. Equipo canadiense ("Period One Legal"), no comparable en carga con el SK-575 |

Si alguna de estas fuentes se incorpora a `rig.sources`, va con `type` de referencia, `verified: false` y `ref` con URL +
página, y solo para datos de **otros** equipos o rangos de norma, nunca como cota del TACKER 10.

## 2. Cruce con TACKER 10

Criterio: "posible correspondencia" solo si coinciden fabricante/modelo **y** capacidad. Ningún ítem del catálogo
llega a eso. Todo lo de abajo es referencia genérica.

| Pieza TACKER 10 (dato del repo)                                  | Mejor referencia en el catálogo                                                                                                                                         | Tipo de coincidencia                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Aparejo IDECO 110 t (`src-folleto`)                              | Ninguno IDECO. Capacidad cercana: gancho Web Wilson 100 t (IADC p.427), bloque-gancho National 30G100 (IADC p.429), bloque McKissick 100 ton (CBI)                       | Solo capacidad; IDECO en NOV/IADC es malacate/mástil, no aparejo |
| Amelas 150 t, Ø 3", largo útil 73" (`src-insp-sop1110`)         | Amela forjada "1-3/4" - 150 Ton" (IADC p.426, ojo sup. 3-1/2", inf. 1-3/4" nuevas); FET links 150–1750 t, 72–660"; radios API rango 101–150 t (IADC p.422)             | Capacidad. **Observación:** el nominal IADC 1-3/4" no coincide con "Ø 3""; puede ser otra cota (ojo/cuerpo). No se resuelve: medir/confirmar en la planilla |
| Elevador de cierre central 100 t, tubing 2-7/8" (`src-insp-sop1110`, `src-folleto`) | FET manual center latch A (90°) / G (18°) 65–350 t, 1–6-5/8"; FET slip type BVC/BVT/Y 75–200 t (tubing upset)                                                      | Familia (center latch) y rango; sin modelo ni cotas      |
| Mástil DKA104-330-08, 104 ft, 330.000 lb designación             | NOV "104'-250" (C-Series 5C; Cooper LTO 550); Dreco telescópico M10209-337T 102 ft / 337 klb (IADC p.746); IRI Kwik-Lift KM-103/105 (IADC p.750); CBI Period 1 105 ft / 200 klb | Misma convención "altura ft - capacidad klb" y tipología; ninguna SK |
| Poleas de corona 4 × 24" + 30" (`src-sk575-spec`, B)            | CBI Period 1: 4 × 24" + 1 × 22"; CBI TMS69-120: 3 × 24" + 1 × 22"                                                                                                       | Tipología; la polea de línea rápida difiere              |
| Tambor principal 42 × 12, barril 16" (`src-sk575-spec`)         | Cooper L350 / L550: tambor 16", freno 42 × 12 (NOV p.10)                                                                                                                | Mismas cotas nominales, otro fabricante                  |
| Tambor de pistoneo 42 × 8, barril 16", 14.400' de 9/16"         | Skytop 35D2 16" / 38 × 8; Cooper L550 cap. de pistoneo 14.400' × 9/16" (NOV p.10–11)                                                                                    | Cotas parciales, otro fabricante                          |
| Motor 475 HP / Allison 4500 OFS                                  | Kremco K80/K100/K125/K136 475 HP (NOV p.9); CBI Allison 4700 OFS                                                                                                        | Potencia o familia de transmisión                         |
| Carrier 5 ejes                                                   | CBI Period 1 "Tandem Steer / Tri Drive"                                                                                                                                 | Configuración                                             |
| Llave hidráulica, cuñas                                          | Sin datos en estas fuentes                                                                                                                                              | —                                                         |

## 3. Modelos útiles para detallar el 3D del SK-575

Uso permitido: **forma y proporciones** de piezas cuya geometría del TACKER 10 es C (ilustrativa), rotulada
"referencia genérica, no as-built". Las cotas del equipo (cuando existan) mandan.

| Pieza SK-575 a detallar                       | Referencia                                         | Cotas disponibles                                                                                       | Fuente / página           |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------- |
| Ojos de amelas y oreja del gancho              | Radios API Tabla E5-1, rango 101–150 t             | Radios A1/A2 (bloque/bail), B1/B2, C1/C2 (amela/oreja), D1/D2… por rango (fracciones dudosas)            | IADC PDF p.422–425 (E-31 a E-34) |
| Amelas 150 t                                   | Forged link 1-3/4" – 150 Ton                       | Ojo sup. 3-1/2", ojo inf. 1-3/4" (nuevas) + escalones de desgaste; largo 73" ya documentado en el repo   | IADC PDF p.426 (E-35)     |
| Gancho del aparejo                             | Web Wilson 100 / 150 t; BJ 150 TON; National 30G100 | Profundidad de oreja (Dim A) vs capacidad; sin envolvente                                                | IADC PDF p.427–429        |
| Malacate (tambor principal y de pistoneo)      | Cooper L550, Skytop 35D2, FAST450                  | Tambor 16", freno 42 × 12 / 38 × 8; FAST450: tambor 18 × 36", pistoneo 12-3/4 × 36", envolvente 127-3/4 × 105 × 60-3/4" | NOV PDF p.10–11; CBI "Drawworks" |
| Corona                                         | CBI Period 1 / TMS69-120                           | 4 × 24" + 1 × 22" / 3 × 24" + 1 × 22"                                                                   | CBI "Period 1 Double", "Truck Mounted Single" |
| Peine y canasto de varillas                    | CBI TMS69-120                                       | Peine 27' (8,23 m), canasto 54-3/4' (16,69 m), separación de pozos 5' (solo para otro mástil de 69 ft) | CBI "Truck Mounted Single" |
| Mástil telescópico (sección y base)            | Dreco M10209-337T; IRI Kwik-Lift                    | Base cuadrada 9 ft (Dreco); ancho de transporte 8'–9'6" (Kwik-Lift)                                       | IADC PDF p.746, p.750     |

## 4. Pendiente

- Catálogo FET de handling tools (PDF tras formulario): lo tiene que descargar el usuario si lo quiere.
- IADC Cap. E2 (cuñas), Cap. H (swivels) y Cap. M (cable/poleas): no transcriptos.
- Revisar contra el original las fracciones marcadas `incierto` antes de usarlas incluso como forma.
