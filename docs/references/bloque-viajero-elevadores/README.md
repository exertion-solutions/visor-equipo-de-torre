# Bloque viajero, gancho, amelas y elevadores · referencias visuales y estado de los datos

Componente 04 del visor V2: **Aparejo, amelas y elevadores** (`legacy-ext/41-aparejo.js`, invocado desde `wrapAparejo` en `legacy-ext/40-wellsite.js`;
textos en `scripts/patches/04-aparejo.mjs`; ficha en `legacy-ext/41-meta-aparejo.js`; parámetros `APAREJO_COLOR`, `ROD_ELEVATOR`).

## Imágenes de referencia (unidades genéricas)

**No son el equipo 10.** Sirven para la tipología y el nivel de detalle, nunca como cota as-built. Origen y licencia sin verificar (fotos de
catálogo de terceros): no se embeben en el HTML ni se versionan (copia local convertida a PNG en `.tmp/refs-png/`). **Ninguna capacidad estampada en las
fotos (75 t, 42 t, TH 250…) se transcribió**: son de otras unidades.

| Archivo                                                                | Qué muestra                                                                               | Se usó para                                                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `bloque-viajero/products_bloq01.png`                                   | Bloque con carcasa lateral, franjas amarillo/negro de advertencia y ventanas laterales    | Franjas de advertencia en la parte baja de las placas                                               |
| `bloque-viajero/travelling-block-and-hook1.png`                        | Cuatro tamaños de bloque con gancho: carcasa en "bala" con ranuras superiores y giratorio | Contorno de las placas (cúpula + faldón), ranuras de ventilación radiales, giratorio bajo el bloque |
| `bloque-viajero/20210316101839_412.png`                                | Bloque amarillo con placas atornilladas, giratorio y gancho con pestillo                  | Bulones de armado, guarda del eje, pestillo y giratorio visibles                                    |
| `bloque-viajero/API-8c-Drilling-Rig-Traveling-Hook-Block.png`          | Bloque-gancho rojo y amarillo, gancho forjado con boca y oreja                            | Perfil del gancho (arco ~300° más grueso abajo), oreja del pasador de las amelas                    |
| `elevadores/Y-Series-Type-Tubing-Elevator-…` (2 copias)                | Elevador de tubing articulado tipo Y: cuerpo en dos mitades, inserto azul, traba, orejas  | Dos mitades con bisagra y puerta, inserto de "cuñas" (bronce), traba con bulones, orejas, asas      |
| `elevadores/Suckerod-Elevator.png`, `Elev-Varillas-1.png`, `R.png`     | Elevador de varillas: bloque corto con ranura y cuñas de bronce + asa larga en U          | Elevador de varillas nuevo (bloque con ranura, cuñas, asa en U con tornillos de giro)               |
| `elevadores/Oil-Field-Elevator-Link-for-Oil-Drilling-Operations.png`   | Eslabón plano largo con ojal grande arriba y ojal chico abajo                             | Amelas: eslabones planos con ojo superior/inferior y vástago afinado                                |

## Jerarquía y nombres estables

```
aparejo
├─ bloque_viajero                 (animado por el visor: wh; slider #hoist y #c-play)
│  ├─ drops_BP-3 {dropsId: BP-3}
│  │  ├─ bloque                   bloque_viajero_pintura · bloque_viajero_acero  (placas biseladas, cúpula, poleas de garganta, eje, guardas)
│  │  └─ gancho                   gancho_pintura · gancho_acero                  (giratorio, vástago, gancho forjado, pasador)
│  │     └─ pestillo              pestillo_acero                                 (Object3D con pivote)
│  ├─ amelas                      amelas_pintura                                 (2 eslabones)
│  ├─ elevador                    elevador_tubing_pintura · elevador_tubing_acero
│  │  └─ puerta                   elevador_puerta_pintura · elevador_puerta_acero (Object3D con pivote en la bisagra)
│  └─ aparejo_letrero ×2          (decal de 40-wellsite.js: placa de datos "IDECO 110 t · 6 líneas")
├─ ramal_visual ×6                (estado interno del visor: se reestiran con la altura; NO se tocaron)
└─ elevador_varillas              elevador_varillas_pintura · elevador_varillas_acero (fuera del aparejo animado)
```

Todo lo que cuelga del bloque es hijo de `bloque_viajero`, así acompaña la animación. `80-perf.js` (sombras bajo demanda) mira transformaciones y
visibilidad de todo el árbol: no hizo falta cambiarlo. Los nombres aparecen en el GLB exportado (`#c-glb`).

## Estado de los datos

| Dato                                                                             | Estado       | Fuente / nota                                                                                                            |
| -------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Aparejo IDECO 110 t con 6 líneas                                                 | confirmado   | Folleto Equipo 10 rev. 26/06/2024. El Libro DROPS (BP-3) dice 8 líneas de 1 1/8": **fuente en conflicto**, se mantienen 6 |
| Amelas BJ Tool Pusher 150 t · elevador BJ 100 t                                  | confirmado   | Folleto. Las capacidades pertenecen a cada componente y no se suman                                                      |
| Envolvente: placas 0,90 m de ancho, poleas r≈0,36 m, amelas ≈1,26 m, elevador Ø0,60 m | aproximado   | Tamaños del modelo anterior del visor (esquemático), usados como envolvente                                              |
| Forma del bloque (cúpula, faldón, ranuras), poleas de garganta Ø0,77 m, eje, guardas | aproximado   | Tipología de las fotos; poleas 2,5 cm más grandes que el modelo anterior para que el ramal (x=±0,36) apoye en la garganta |
| Gancho forjado (centro y=−1,40 m, radio medio 0,225 m, espesor 0,13 m), pestillo | aproximado   | Tipología de las fotos                                                                                                   |
| Amelas: eslabón plano de 0,055 m con ojos ovalados, 0,36 m a cada lado del eje   | aproximado   | Foto del eslabón; distancia pasador a pasador 1,275 m (antes 1,26 m)                                                     |
| Elevador de tubing: dos mitades con bisagra, inserto de bronce, traba, asas      | aproximado   | Foto tipo Y-series (unidad genérica); el modelo del elevador BJ del equipo 10 es **pendiente**                            |
| Existencia del elevador de varillas en el equipo                                 | pendiente    | No hay documento que lo confirme                                                                                         |
| Ubicación del elevador de varillas (`ROD_ELEVATOR`: x −0,85 · z −0,95 · y 2,34 m) | pendiente    | Elegida por plausibilidad: de pie sobre el piso de trabajo, esquina −X/−Z. Tamaño ≈0,22 × 0,16 m, asa de 0,46 m: aproximado |
| Color de bloque, gancho, amelas y elevadores                                     | pendiente    | Amarillo/naranja/rojo de las fotos. `APAREJO_COLOR = 'RED'` pinta todo de rojo                                           |
| Cotas as-built, pesos, modelo/serie de cada pieza                                | pendiente    | Requiere ficha del fabricante o relevamiento                                                                             |
| Franjas de advertencia en las placas                                             | aproximado   | De una foto genérica; que el equipo real las lleve es pendiente                                                          |

Peligros nuevos del panel (rotulados "referencia, pendiente de validación", nunca requisitos): atrapamiento de manos en la bisagra/traba del elevador,
elevador de varillas mal asentado o sin cerrar, desgaste o fisura en ojos de amelas y pasadores. La ficha de confiabilidad pasa de A/Documentado a
**B/Parcial** (capacidades del folleto, forma aproximada, elevador de varillas nuevo y sin confirmar).

## Presupuesto de rendimiento

Medido con `renderer.info.render` en el encuadre inicial (1440 × 900, Chrome headless con SwiftShader), estándar y `?embedded`.

| Métrica                              | Antes (HEAD) | Después | Límite  |
| ------------------------------------ | ------------ | ------- | ------- |
| Triángulos de la escena              | 105.254      | 108.558 | +9.000  |
| Draw calls                           | 349          | 337     | +3      |
| Triángulos del grupo `aparejo`       | 5.168        | 8.472   | —       |
| Mallas del grupo `aparejo`           | 32           | 20      | —       |

Distribución (triángulos): bloque 3.528 (pintura 944 · acero 2.584, de los cuales ~1.800 son las 3 poleas de garganta), gancho 896, amelas 1.400,
elevador de tubing 1.908 (cuerpo 1.060 · puerta 848), elevador de varillas 620, ramales 96 y placa de datos 24. El modelo anterior usaba 12 mallas
sueltas solo para las poleas y 10 para amelas y elevador: por eso los draw calls bajan aunque hay más detalle.

## Decisiones

- **Primitivas propias.** El visor es un HTML autocontenido y no expone `LatheGeometry`/`ExtrudeGeometry`: `41-aparejo.js` implementa a mano extrusión con
  bisel (recorte de orejas), anillo, revolución y esfera sobre `BufferGeometry`, y se fusiona con el `Batch` existente (sin editarlo).
- **Franjas de advertencia como geometría** (polígonos finos de 4 mm recortados a una faja) y no `CanvasTexture`: la clase no está expuesta al construir el
  aparejo y así se exportan al GLB sin texturas.
- **Amelas y pasadores con holgura real:** el pasador del gancho apoya arriba del ojo superior y el del elevador abajo del inferior (los ojos son más largos
  que el pasador); las amelas cuelgan por fuera del gancho (z = ±0,36 m) sin cruzarlo.
- **Acero mecanizado con metalness 0,55** (no 0,8): el visor no tiene mapa de entorno y un metal muy alto se ve casi negro. Propuesta fuera de alcance:
  agregar un PMREM/`scene.environment` para poder usar metalness alta.
- **Ubicación del elevador de varillas en el piso:** en el piso de trabajo (2,34 m), esquina −X/−Z, con distancia mínima ≥ 0,16 m a la llave, a la
  subestructura y al poste; distancia al mástil > 0,06 m contra la caja envolvente (conservadora). Sin colisiones triángulo-caja.
  Consecuencia: `focusOn('aparejo')` calcula la caja del grupo entero y ahora incluye el elevador del piso, así que el encuadre automático se aleja
  (la caja del grupo pasa de 20,2 a 28,7 m de alto). Funciona igual; si molesta, `ROD_ELEVATOR.visible = false` o moverlo al grupo `subestructura`.
- **Pivotes animables sin animar:** `pestillo` (gancho) y `puerta` (elevador de tubing) son `Object3D` con el origen en la articulación; hoy están quietos.
- No se agregó cable nuevo: los 6 ramales (`ramal_visual`) siguen siendo los del visor, con la misma lógica de reestirado.

## Verificación

- `npm run build:legacy`, `npm test` (incluye `tests/aparejo.test.mjs`, que corre la geometría real con three), `npm run typecheck`, `npm run lint`,
  `npm run format:check`.
- Chrome headless, standalone y `?embedded`: sin errores ni advertencias de consola; deslizador `#hoist` (8, 14, 22 m) y `#c-play`: bloque, gancho, amelas y
  elevador de tubing se mueven juntos, los 6 ramales terminan en `altura + 0,28 m` y el elevador de varillas queda quieto; despiece, aislar
  (`#c-isolate`), modos EXPLORE/OPERATION/QHSE/TRAINING, grupo `drops_BP-3` con `dropsId`, exportación GLB con los nombres nuevos, ficha "CONF. B / Parcial"
  y peligros nuevos en el panel.
- Capturas en `docs/preview/07-aparejo-*.png` (antes/después del conjunto, bloque, gancho, elevador y vista frontal; elevador de varillas).

## No verificado

- Rendimiento en GPU real (se midió con SwiftShader: sirve para triángulos y draw calls, no para fps).
- La capa DROPS con marcadores del BP-3 en pantalla (se comprobó el grupo etiquetado y que la capa carga sin errores, no la posición exacta del marcador).
- Ninguna dimensión contra el equipo real: todo es aproximado hasta contar con ficha del fabricante o relevamiento.
