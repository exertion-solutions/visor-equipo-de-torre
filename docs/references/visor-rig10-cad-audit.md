# Auditoría de `Visor_Torre_Pulling_RIG10_CAD.html`

Fecha de revisión: 2026-09-25.

## Naturaleza del archivo

El archivo es un visor Three.js r184 autónomo con geometría procedural. No contiene un sólido CAD B-Rep, STEP ni un modelo de fabricación. Incluye una fotografía JPEG embebida, materiales, mallas generadas por JavaScript y exportación del ensamblado a GLB. El propio visor identifica la geometría como aproximada y no apta para cálculo de capacidad o fabricación.

## Datos técnicos explícitos reutilizables

- Carrier Service King SK-575, cinco ejes.
- Mástil Service King SK104-330, 104 ft o 31,6992 m.
- Aparejo IDECO de 110 t con seis líneas.
- Dos amelas BJ de 150 t.
- Elevador BJ de 100 t.
- Piso de trabajo de 2,6 × 3,3 m, regulable entre 1 y 4 m.
- Motor Detroit Serie 60 de 475 HP.
- Layout más reciente: anclajes a 25 ±3 m por eje; diagonal nominal 35,4 m.
- Envolventes: móvil 18 × 4 m, acumulador 8 × 2,4 m, bomba 6 × 2,4 m y pileta 12 × 2,4 m.
- Recorrido didáctico configurado para el bloque: 7–25 m, con posición inicial de 14 m.

El archivo señala una discrepancia documental: el folleto 2024 usa 20 m para los anclajes, mientras que el layout del 11/07/2025 usa 25 ±3 m. Se conserva el dato más reciente sin considerarlo una validación operativa.

## Funciones útiles para integrar al V2

1. Cámara ortográfica y perspectiva.
2. Cotas nominales superpuestas.
3. Medición aproximada entre dos superficies.
4. Modo wireframe.
5. Aislamiento del componente seleccionado.
6. Plano de corte visual X, sin tapas.
7. Animación del bloque viajero.
8. Vista nocturna.
9. Exportación GLB del ensamblado.
10. Captura PNG con identificación de alcance.
11. Renderizado bajo demanda para reducir consumo.

## Geometría aprovechable como referencia

La implementación añade perfiles con alma y alas, pasarelas con dos niveles de baranda, escaleras laterales, cables curvos mediante curvas 3D, reeving móvil, poleas más segmentadas y materiales físicos de acero pintado. Es una buena referencia de construcción procedural, pero no aporta nuevas cotas certificadas para las formas detalladas.

## Fuentes externas mencionadas dentro del visor

El archivo menciona documentos de UTN-FRSR y UFASTA como fuentes descriptivas complementarias. No están incluidos como anexos verificables en este archivo y sus dimensiones no deben trasladarse al equipo 10. También separa correctamente los planos 11 de los datos del equipo 10.

## Decisión de integración

Los datos explícitos se incorporaron a `reference/v2-previo/src/technical-spec.js`. Las herramientas de inspección se consideran el siguiente bloque de trabajo. La geometría del archivo se utiliza como referencia visual, no como autoridad dimensional.
