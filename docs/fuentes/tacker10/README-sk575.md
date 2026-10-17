# Fuentes SK-575 no versionadas (TACKER 10)

> **No subir estos documentos al repo.** Son propiedad de TACKER / Service King (varios con "reproducción prohibida")
> y el repo es **público**. Se citan por código, revisión y ruta; ni PDFs ni capturas de sus páginas.

Uso de cada fuente y confianza: [`docs/pdf-review/informe-sk575-2026-10-09.md`](../../pdf-review/informe-sk575-2026-10-09.md).
`X:\` = unidad de red de Mantenimiento WS (TACKER). `…\COC` = `X:\Mantenimiento WS\Inspecciones No Destructivas\.TACKER\COC's - Trazabilidad\Equipos\Rig TKR-10\COC`.

| sourceId             | Documento / código                                                                        | Revisión / fecha         | Ruta                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-placa-api`      | Placa de certificación mástil SK DKA104-330-08 S/N DK-3033 (API 4F)                       | —                        | `…\COC\Placa identificadora Rig TKR-10.pdf` + Engineering Report p19                                                                                              |
| `src-sk575-spec`     | Service King SK-575 Specification Sheet + folleto SK 575                                  | Dec-14                   | `…\COC\SK-575-SpecificationSheet_Dec-14.pdf`; `Service King Manufacturing - SK 575.pdf`                                                                           |
| `src-plano-8123`     | Plano TACKER 8123-1002-2611 "Equipo Tacker TKR10"                                         | rev 1, 26/11/2020        | `…\COC\SK_Tacker-10_EngineeringReport.pdf` p4 (Engineering Report 9-ago-2021)                                                                                     |
| `src-planos-piso`    | Planos piso pulling TKR10 8114-1006-0200 / -0201 / -0210 / -0212                          | —                        | `X:\Mantenimiento WS\Planos Tecnicos\TKR-10\`                                                                                                                     |
| `src-plano-escalera` | Plano Escalera Pulling (TKR11, mismo diseño)                                              | —                        | `X:\Mantenimiento WS\Planos Tecnicos\TKR-10\EscaleraPisoPulling.pdf`                                                                                              |
| `src-plano-hyco`     | HYCO 50162-813 "CYL, SATEL W/LAST STAGE DA" (SK DK50162)                                  | —                        | `X:\Mantenimiento WS\Manuales\CD ServiceKingManufacturing\Operations Manual SK 575\06 - HYDRAULICS INFORMATION\PISTON TKR 10 - IZAJE.pdf`                        |
| `src-manual-derrick` | Operations Manual SK 575 — 08 Derrick Information 3 (hoja de cargas DKA104-330-08)        | —                        | `…\Operations Manual SK 575\08 - DERRICKS INFORMATION\DERRICK INFORMATION 3.pdf` p5-6, p59-61                                                                     |
| `src-manual-rigup`   | Operations Manual SK 575 — 02 Rig Up Information                                          | —                        | `…\Operations Manual SK 575\02 - RIG UP PROCEDURES\RIG UP INFORMATION - WARNING, CAUTIONS, AND NOTES.pdf` p2-6                                                     |
| `src-parts-sk575`    | SK575 Parts & Service Manual — dwg 03.06.01.01 (p23), 03.02.01.01 (p19)                   | —                        | `X:\Mantenimiento WS\Manuales\CD ServiceKingManufacturing\SK575 PARTS & SERVICE MANUAL.pdf`                                                                       |
| `src-insp-sop1110`   | Planillas de inspección SOP 1110 (API RP 8B / 8C): amelas 150 t y elevador                | 2026-10-09               | Imágenes provistas por el usuario (sin ruta de archivo)                                                                                                           |
| `src-layout-ws10`    | LAYOUT-WS10-0001 "Layout Equipo TACKER TKR 10 RN119"                                      | rev 1, 15/04/2019        | `C:\Users\jcastro\cad\Layout Equipo TACKER TKR 10  RN119.pdf`                                                                                                     |
| `src-plano-piletas`  | Plano "Pileta TACKER 1-2-3"                                                               | —                        | `X:\Mantenimiento WS\Planos Tecnicos\Piletas\Pileta TACKER 1-2-3.dwg.pdf`                                                                                         |
| `src-choke-b20`      | Thrubore B20-9908 choke manifold 3-1/16" 15M (TKR-08) — **solo escala**                   | —                        | `X:\…\TACKER EQUIPOS NUBE (desafectado)\Equipo TKR-08\IMPORTACIONES TKR 08\CHOKE MANIFOLD\PLANO-Ck-Manifold_15-Valve_Dwg_B20-9908.PDF`                            |
| `src-esquema-ahogo`  | Esquemas manifold de ahogo M1–M12 y conjunto BOP/válvulas                                 | 2026-10-09               | Imágenes provistas por el usuario; documento de origen sin identificar                                                                                            |
| `src-manual-bop-11`  | Manuales BOP RAM / ANNULAR 11" 5000 PSI (Xinde 2FZ28-35II / FH28-35I) — aplicabilidad no confirmada | —              | `C:\Users\jcastro\cad\BOP RAM  Operation Manual 11''5000PSI.pdf`; `BOP ANNULAR Operational Manual 11''5000PSI.pdf`                                               |
| `src-plano-bop-8127` | Plano TACKER 8127-1110-004 "Esquema típico stack BOP estándar 7-1/16" 10 KSI" (Well Service, estándar de flota) | rev 4, 30/09/2026 | `C:\Users\jcastro\cad\8127-0011 EnsamblajeBOP STACK WS STD 30092026.PDF` |

| `src-ref-rigmfg-4650` | Manual O&M unidad de cierre CPC (Consolidated Pressure Control) S/N 4650, 6 estaciones, API 16D, para Applied Machinery — **referencia genérica, no es el acumulador del TKR-10** (`verified: false`) | Design Book Rev 1 - 010211; fabricada 07/2011 | Web: `http://rigmanufacturing.com/drillog/Closing%20Unit/Closing%20Unit%204650%20O&M%20Manual%20Part1.pdf` (Part 1, 127 p; la tabla "Bottle Dimensions" p138 está en el Part 2, no relevado) |

**Acumulador (`sk575_acumulador`).** Del folleto (`src-folleto`) y del layout (`src-layout-ws10`) salen solo la huella
8 × 2,4 m, los 5 botellones y los 3.000 psi; no se cambian. Botellón, selectoras, reguladoras, manómetros, bombas y
depósito se dibujaron según `src-ref-rigmfg-4650` (confianza C): botellón de vejiga 11 gal 3.000 psi (p33), Ø 0,236 ×
1,30 m **derivado** del volumen y de la relación largo/Ø medida en el plano sin cotas p17; selectoras 1" de 4 vías rotativas
(p34); alivio 3/4" a 3.300 psi (p33); manómetros de 6" (p34). Con el folleto no hay valores en choque: 3.000 psi coincide y la
unidad de referencia tiene 24 botellones porque es otra unidad (perforación, 6 estaciones), no un dato del TKR-10.
**Fuente en conflicto (interna del manual de referencia):** depósito 350 gal (p33) / 450 gal (p10) / "Storage 310" (p12);
triplex 12,5 gpm (p34) / 14 gpm (p7). No se usan para dimensionar. Fotos y tabla FKDQ de CAMTOP
(`https://www.camtop-oilfieldtools.com/product/bop-drilling-accumulator-units/`, p. ej. FKDQ125-3: 5 × 25 L, 21 MPa) solo
como referencia visual de proporciones (palancas con sector indicador, motor con guarda de correa); ningún valor del modelo
sale de ahí.

Los "—" en revisión: el documento no la indica o no se registró en el relevamiento (pendiente de completar).
