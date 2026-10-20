# Contrato de mensajes app ⇄ visor V2 embebido

La app React embebe `public/legacy/Digital_Rig_V2.html?embedded` en un `<iframe
sandbox="allow-scripts allow-downloads">` **sin `allow-same-origin`**: el visor corre en origen opaco.
Toda la comunicación es por `window.postMessage`. Este contrato es el mismo que deberá cumplir el motor
R3F nativo cuando alcance paridad, por lo que sirve también para **medir la paridad** (ver
`docs/FEATURE_PARITY.md`).

- Tipos y validadores (lado app): `src/lib/legacyBridge.ts` (`parseLegacyMessage`, guardas por id).
- Lado visor: `legacy-ext/10-layers.js` (capas), `legacy-ext/70-bridge.js` (mensajes),
  `legacy-ext/75-mode-presets.js` (presets de modo).
- Reglas de seguridad: la app solo acepta mensajes con `event.source === iframe.contentWindow`; el visor
  solo acepta `event.source === window.parent`. Como el origen es opaco, se responde con `targetOrigin '*'`;
  los mensajes **no llevan datos sensibles**. Todo valor se valida contra listas blancas; lo desconocido se
  ignora.

## Mensajes app → visor

| `type`             | Payload                                                     | Efecto                                                                                    |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `rig:setMode`   | `mode`: `explore` \| `operation` \| `qhse` \| `training`    | Aplica el preset de capas del modo (ver abajo).                                           |
| `rig:setView`   | `view`: `iso` \| `front` \| `side` \| `top` \| `well`       | Mueve la cámara a la vista estándar.                                                      |
| `rig:setLayers` | `layers`: `LayerId[]`                                       | Conjunto **exacto** de capas activas (las demás se apagan). Se aplica después del preset. |
| `rig:ping`      | —                                                           | El visor responde otra vez `ready` + `state` (útil si la app montó después del visor).    |

`LayerId`: `zonas` (zonas de riesgo ilustrativas) · `cotas` · `etiquetas` · `malla` · `despiece` · `drops`.

## Mensajes visor → app

| `type`          | Payload                                                                                                | Cuándo                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `rig:ready`  | `version: 1`                                                                                           | Al terminar de arrancar (`window.__rig` listo) y en respuesta a `ping`.      |
| `rig:state`  | `mode`, `view`, `layers`                                                                               | Al arrancar y cada vez que cambia modo, vista o alguna capa.                 |
| `rig:select` | `id`, `name`, `grade` (`A`\|`B`\|`C`), `status` — o `id: null` al deseleccionar                        | Al cambiar el componente seleccionado. Origen: tabla `META` del visor.       |
| `rig:visitas` | `value` (entero ≥ 0) | Total del contador de visitas (`legacy-ext/89-visitas.js`, servicio externo). Solo en sitios http(s) no locales; se reenvía ante `rig:ping`. La app lo muestra en su barra de estado. |

`grade` es la confiabilidad geométrica de `CLAUDE.md`: **A confirmado · B parcial · C aproximado**
(lo pendiente de relevamiento se trata como aproximado). Referencia digital, nunca as-built.

## Secuencia de arranque

1. La app monta el iframe y muestra "Cargando visor 3D…".
2. El visor envía `rig:ready` (+ `rig:state`). La app oculta el cartel.
3. La app envía `rig:setMode` con el modo actual (`modeStore` es la fuente de verdad del modo).
4. Si la URL traía `view` y/o `layers`, la app los envía **una sola vez** (`setView`, `setLayers`), después
   del modo: lo explícito de la URL gana sobre el preset.
5. Desde ahí, vista/capas/selección fluyen visor → app (`state`, `select`) y se reflejan en la URL y en la
   barra de estado. **El modo no se lee del visor**: evita que el estado inicial del visor pise el modo de la URL.

Si `ready` no llega en 45 s (copia en caché sin el puente), el cartel de carga se retira igual.

## Estado en la URL

`?mode=qhse&view=front&layers=zonas,cotas` (+ `dev=1` habilita el motor R3F nativo). Solo se escribe lo
que difiere del valor por defecto (`explore`, `iso`, sin capas); `layers=` vacío fuera de EXPLORE conserva
"todas las capas apagadas". La URL se actualiza con `history.replaceState` (no ensucia el historial).
Implementación: `src/lib/urlState.ts` (puro, con tests) y `src/app/urlSync.ts`.

## Presets de modo

Son presets **visuales** sobre capas existentes; no son cálculos, requisitos ni controles operativos.
Cada preset define el conjunto completo de capas (estado determinista) y limpia lo del modo anterior
(aislamiento, selección, medición).

| Modo        | Preset                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| `explore`   | Vista limpia: sin capas, nada aislado.                                      |
| `operation` | Aparejo y malacate aislados + `cotas`.                                      |
| `qhse`      | `zonas` (ilustrativas, con leyenda "sin validar") + `drops`.                |
| `training`  | `etiquetas` + `despiece`.                                                   |

## Cambio de motor

El iframe **no se desmonta** al pasar a R3F (solo se oculta): se conservan cámara, capas y mediciones y no
se vuelve a bajar el HTML. El motor nativo solo se ofrece en desarrollo o con `?dev=1`.
