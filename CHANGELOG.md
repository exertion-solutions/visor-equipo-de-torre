# Novedades

Cambios visibles del visor, de lo más nuevo a lo más viejo. El detalle de cada función y su verificación está en
[`docs/FEATURE_PARITY.md`](docs/FEATURE_PARITY.md). Todo lo del motor **R3F nativo** convive con el visor **V2**, que sigue siendo
el motor por defecto hasta que todas las funciones críticas estén verificadas.

## Próxima versión · Teclado y recorridos en el nativo

- **Teclado**: el lienzo recibe foco con Tab; ← → giran 7,5°, ↑ ↓ inclinan 5°, Mayús + flechas desplazan, + y − hacen zoom, `?` o `H` abren la ayuda de atajos (también el botón "Atajos") y Esc la cierra. La inclinación ya no cruza la vertical.
- **Recorridos**: panel "Ir a equipo" con los 14 sectores (vuelo de ~1,8 s en primera persona, ojos a 1,70 m del piso, ficha del sector, "Volver a vista general"); doble clic sobre un equipo va a su sector; recorrido guiado en Entrenamiento (Anterior / Reproducir / Siguiente) y **modo caminata** (W A S D o flechas, 1,4 m/s, colisión con los equipos, dentro del vallado, Esc sale). Herramienta visual: las vistas no son puestos de trabajo ni distancias de seguridad; las fichas son referencia genérica pendiente de validación.

## 2026-10-30 · El motor nativo, operativo y a la vista

- **El selector de motor ya se ve en el sitio publicado** ("V2 compatible" / "R3F nativo"). Antes solo aparecía con `?dev=1`.
- **Enlaces profundos**: `?engine=native` abre el nativo; `&comp=<id>` selecciona y encuadra un componente; `&view=<iso|front|side|top|well>`
  va a una vista estándar. Botón **Copiar enlace**.
- **Captura PNG** con una franja "referencia digital, no as-built" y el sitio, para que el aviso viaje con la imagen.
- **Exportar GLB**: todo el equipo armado, un nodo por componente, con el aviso dentro del archivo.
- **Animación del aparejo**: el bloque sube y baja entre 7 y 25 m con las líneas estiradas. Didáctica, sin validar: no es una simulación dinámica.
- **Malla** (wireframe) reversible sobre todos los componentes.
- **Cortes X, Y y Z** combinables (superficies abiertas, sin tapas ni sólidos CAD).
- **Medir ángulo** (tres puntos) con desnivel y distancia horizontal, siempre aproximados; la ayuda de las herramientas pasó a una nota flotante
  para que la barra de estado no cambie de alto.
- **Despiece** animado (solo visual: oculta etiquetas, cotas, zonas y DROPS, y no se mide).
- **Capa DROPS** (66 puntos del Libro, clasificación cualitativa A2 sin radios ni distancias) y **zonas QHSE** ilustrativas, "sin validar".
- Cotas con su nivel A/B/C, medición de distancia, etiquetas numeradas, vistas estándar, aislamiento, ficha por componente y árbol.
- README con el estado real y capturas, y [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md): cómo leer A/B/C y qué no hace el visor.
- Corrección: `separateLabels` podía dejar dos marcadores DROPS pisados por un error de redondeo.

Sigue siendo una **referencia digital, no as-built**: geometría aproximada, no apta para fabricación, cálculo ni validación de seguridad.

## Pendiente para la próxima versión

Secuencia de montaje, izamiento del mástil, maniobra, clima, VR, perfiles de calidad, el parámetro
`vp` de los enlaces, el detalle de puntos DROPS en la geometría y, al final, retirar `public/legacy/`. Prueba en celular real e inglés.
