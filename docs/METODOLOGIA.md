# Metodología: cómo leer los datos de DIGITAL RIG

DIGITAL RIG es una **referencia digital** de equipos de pulling/workover. No es un plano as-built, no es un cálculo de ingeniería y no
valida seguridad. Esta página explica cómo se distingue lo confirmado de lo aproximado.

## Nivel de confianza (A / B / C)

Cada componente y cada dato lleva un nivel y una fuente.

| Nivel | Significa | Cómo se muestra |
| --- | --- | --- |
| **A** · confirmado | Está documentado en una fuente trazable (folleto, plano, placa, manual). | Dato con su fuente. |
| **B** · parcial | Está documentado en parte: falta alguna cota o la fuente es incompleta. | Dato con su fuente y la salvedad. |
| **C** · aproximado | No está documentado: se estimó (fotos, proporciones, piezas equivalentes). | Marcado "Aproximado"; no es as-built. |

Lo que está pendiente de relevamiento se trata como **aproximado**, nunca como confirmado, y no se reemplaza un dato real por una
estimación.

La **geometría 3D** de todo el equipo es nivel **C** (modelo de referencia). El nivel de cada **dato** (altura, capacidad, fecha…) es
propio y puede ser A aunque la geometría sea C.

## Fuentes en conflicto

Cuando dos fuentes dan valores distintos (por ejemplo, el anclaje de los vientos), **se muestran las dos** y se rotula "Fuente en
conflicto". El visor no elige una en silencio.

## Seguridad y QHSE

- Solo `confirmed` y `procedure` se presentan como requisito. `goodPractice` y `pendingValidation` son recomendaciones o pendientes.
- Las **zonas** del visor son envolventes gráficas ilustrativas, siempre rotuladas "sin validar": **no** son exclusiones aprobadas ni
  controles operacionales.
- La **capa DROPS** clasifica cualitativamente (Alto / Medio / Bajo) según el layout A2 del Libro DROPS, **sin radios ni distancias**, y
  es referencia de lo que debe tener cada control, no una verificación ni un checklist.
- Una recomendación genérica nunca se promueve a requisito de empresa, cliente o legal sin evidencia.

## Lo que el visor no hace

- Las animaciones (despiece, izamiento, maniobra) son **visuales**: no son simulación dinámica ni cálculo.
- Las mediciones y cotas son **aproximadas** y del modelo.
- Los cortes muestran superficies abiertas, sin tapas ni sólidos.

## Unidades y marco

1 unidad 3D = 1 metro, eje Y arriba. Origen: la boca de pozo a nivel de terreno; +X hacia el mástil, el carrier hacia −X.

## Reportar un error o un dato

Abrí un issue con el componente, el dato y la fuente. Un dato sin fuente no se incorpora.
