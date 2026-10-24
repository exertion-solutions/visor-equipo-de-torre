# Auditoría dimensional del visor V2

Generada por `scripts/audit-dimensional.mjs` (2026-09-30). Compara cajas envolventes del V2 (metros) con
las cotas documentadas y con el layout de locación (`cad/data/layout_locacion.json`, medido del vector del PDF). "documentado" = rotulado en el plano;
"medido (C)" = tomado de la geometría del PDF, confianza C.

| Elemento | Medida | V2 | Referencia | Tol. | Estado | Fuente | Nota |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| Acumulador | largo (X) | 8.04 | 8.01 | ±0.3 | OK | documentado |  |
| Acumulador | ancho (Z) | 2.46 | 2.39 | ±0.3 | OK | documentado |  |
| Acumulador | X mín | -21.22 | -21.21 | ±0.5 | OK | medido (C) |  |
| Acumulador | Z mín | 2.97 | 3.00 | ±0.5 | OK | medido (C) |  |
| Bomba triplex | largo (X) | 6.02 | 6.01 | ±0.3 | OK | documentado |  |
| Bomba triplex | ancho (Z) | 2.45 | 2.40 | ±0.3 | OK | documentado |  |
| Bomba triplex | X mín | -19.02 | -19.32 | ±0.5 | OK | medido (C) |  |
| Bomba triplex | Z mín | -15.93 | -15.90 | ±0.5 | OK | medido (C) |  |
| Pileta | X mín | -8.61 | -8.31 | ±0.5 | OK | medido (C) | la caja incluye brida de succión y escalera |
| Pileta | Z mín | -16.67 | -15.90 | ±0.8 | OK | medido (C) | incluye golpeador/cubicador |
| Planchada | X mín | 3.00 | 2.83 | ±0.5 | OK | medido (C) |  |
| Planchada | X máx | 15.00 | 14.83 | ±0.5 | OK | medido (C) |  |
| Bomba–pileta | separación en X | 4.39 | 5.00 | ±0.7 | OK | documentado | cota rotulada 5 m; la caja de la pileta incluye la brida de succión (~0,6 m) |
| Acumulador | distancia al eje del pozo (Z mín) | 2.97 | 3.00 | ±0.3 | OK | documentado |  |
| Carrier | extremo hacia la boca de pozo (X máx) | -1.63 | -1.30 | ±0.5 | OK | documentado (1,3 m) |  |
| Carrier | largo del cuerpo | 16.04 | 18.00 | ±2.5 | OK | documentado | folleto: cuerpo 15,5 m; layout: envolvente 18 m (fuentes en conflicto, el V2 dibuja ~16 m) |
| Vientos | anclaje a ±X | 25.33 | 25.00 | ±3 | OK | documentado | 25 ± 3 m (equipo 10) vs 20 m (folleto): fuente en conflicto |

Resultado: 17/17 dentro de tolerancia.
