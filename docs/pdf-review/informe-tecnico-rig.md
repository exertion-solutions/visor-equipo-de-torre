# Informe técnico para el visor 3D

## Equipo objetivo

El modelo principal debe representar el **Equipo 10 Pulling**. Esta
elección se apoya en la fotografía aportada, el folleto técnico Equipo 10 y los
layouts identificados como TKR-10. Los documentos del equipo 11 se conservan
como referencia de layout y seguridad, pero no deben usarse para alterar la
geometría del equipo 10 sin comprobar equivalencia.

## Documentos revisados

| Documento | Contenido útil | Uso recomendado |
| --- | --- | --- |
| `FOLLETO EQUIPO 10 PULLING REVDJL26062024.pdf` | Fotografías del equipo rebatido, ficha técnica, perfil acotado y layout | Fuente principal |
| `LAYOUT - TKR-10.pdf` | Layout operativo actualizado, dimensiones de equipo, planchada, piletas y anclajes | Fuente principal de implantación |
| `20250711_140622.pdf` | Copia anotada del layout Equipo 10 | Referencia secundaria; no usar anotaciones manuscritas como cota técnica |
| `LAYOUT Equipo 11 ZONA DE CONGELAMIENTO REVFA11072025.pdf` | Disposición y zonas de posible congelamiento | Seguridad/layout Equipo 11 |
| `LAYOUT-DUWS11-API RP-505.pdf` | Layout Equipo 11 y clasificación de zonas API RP 505 | Seguridad, distancias y zonificación |

## Especificaciones verificadas del equipo 10

### Portaequipo y potencia

- Chasis autopropulsado Service King SK-575.
- Cinco ejes.
- Motor Detroit Diesel Serie 60, 475 HP a 1900 rpm.
- Transmisión Allison OFS-4500.
- Color observado: estructura roja, barandas amarillas y mástil rojo/blanco.

### Mástil

- Service King SK104-330.
- Altura: **104 ft = 31,699 m**.
- Capacidad nominal: **330.000 lb ≈ 149,7 t**.
- Iluminación antiexplosiva.
- Luminarias APX 2 × 40 W y reflectores APX de 400 W.
- Configuración telescópica de dos tramos visible en las fotografías.

### Piso de trabajo

- Telescópico y deslizante.
- Altura regulable: **1 a 4 m** sobre terreno.
- Dimensiones: **2,6 × 3,3 m**.
- Capacidad: cuatro personas.
- Escalera lateral de acceso.

### Izaje

- Tambor principal con cable de **1 pulgada**, API 9A.
- Aparejo IDECO, capacidad **110 t**, con **seis líneas**.
- Dos amelas BJ Tool Pusher, capacidad **150 t**.
- Tambor de pistoneo con 14.000 ft de capacidad y cable de 9/16 de pulgada.

### Control de pozo

- BOP Cameron: anular y doble, con cierre parcial y total.
- Diámetro nominal: **7 1/16 pulgadas**.
- Presión de trabajo: **5.000 psi**.
- Bridas 7 1/16 pulgadas, clases 5M/10M.
- Acumulador: 3.000 psi y cinco botellones.

### Circulación y auxiliares

- Bomba de inyección triplex, camisas de 5 pulgadas y carrera de 8 pulgadas.
- Presión: 3.000 psi; caudal: 12 bpm.
- Pileta de ensayo: compartimiento de 40 m³ y cubicador de 3,5 m³.
- Tanque gas-oil: 12.465 l.
- Tanque de agua: 8.300 l.
- Caballetes de acero de 2 m; capacidad 4,5 t por unidad.

## Dimensiones de implantación

El folleto 2024 muestra el portaequipo con un cuerpo principal de 15,5 m y un
sector de piso de trabajo de 4,5 m. El layout TKR-10 actualizado muestra una
envolvente longitudinal del equipo de aproximadamente **18 m**, ancho **4 m**,
planchada de **12 × 2,4 m**, acumulador BOP de **8 × 2,4 m**, bomba triplex de
**6 × 2,4 m** y pileta de circulación de **12 × 2,4 m**.

Los cuatro anclajes principales se ubican aproximadamente a **25 ± 3 m** del
centro en ambos ejes. La diagonal indicada es **35,4 m**, consistente con una
planta nominal de 25 × 25 m desde el centro hasta cada anclaje.

Cuando se modele la locación deben mantenerse separadas tres magnitudes:

1. Dimensión física del portaequipo.
2. Envolvente operativa de planchada, caballetes, piletas y acumulador.
3. Área de anclajes, líneas de fuego y caída potencial del mástil.

## Evidencia visual útil

Las fotografías del folleto muestran:

- El mástil completamente rebatido sobre el chasis.
- Dos tramos reticulados, uno rojo y uno blanco.
- Corona, poleas, líneas, tambores y enrollado de mangueras/cables.
- Cinco ejes y distribución general de volúmenes sobre el carrier.
- Barandas amarillas, paneles perforados, depósitos cilíndricos y apoyos
  estabilizadores.
- Plataforma trasera y elementos de elevación del mástil.

Los renders de todas las páginas están disponibles en `docs/pdf-review/pages/`.

## Diferencias encontradas en el visor actual

| Elemento | Visor actual | Evidencia documental | Corrección |
| --- | --- | --- | --- |
| Altura del mástil | 30 m | 31,699 m | Ajustar a 31,7 m |
| Longitud base del carrier | ~15,4 m | Envolvente actualizada ~18 m | Reescalar y redistribuir volúmenes |
| Anclajes de vientos | 13–18 m aproximadamente | 25 ± 3 m por eje | Alejar anclajes y recalcular cables |
| Piso de trabajo | Aproximación de ~4 × 4 m | 2,6 × 3,3 m; altura 1–4 m | Remodelar y parametrizar altura |
| Aparejo | Representación simplificada de cuatro ramales | Seis líneas | Modelar seis ramales funcionales |
| BOP | Cilindros genéricos | Anular + doble, 7 1/16, 5M | Separar cuerpos y conexiones |
| Mástil rebatible | No representado como estado operativo | Fotografías muestran posición rebatida | Añadir modo transporte/armado |
| Iluminación del mástil | Ausente | Luminarias y reflectores antiexplosivos | Añadir luminarias físicas/emisivas |
| Sistema de circulación | Volúmenes genéricos | Bomba 6 × 2,4; pileta 12 × 2,4 | Corregir escala y nomenclatura |

## Orden recomendado de reconstrucción

1. Corregir escala global, mástil, carrier y anclajes.
2. Remodelar piso de trabajo y planchada.
3. Crear el mástil Equipo 10 en estados elevado y rebatido.
4. Modelar tambor principal, tambor de pistoneo y aparejo de seis líneas.
5. Modelar BOP anular + doble y acumulador de cinco botellones.
6. Ajustar bomba, pileta, caballetes y distancias de locación.
7. Incorporar iluminación antiexplosiva y señalización.

## Límites

Los PDF permiten establecer escala y configuración general, pero no incluyen
planos de fabricación del reticulado, secciones de perfiles, pivotes completos
ni cotas detalladas de cada subconjunto. Esos detalles deben aproximarse desde
las fotografías o completarse con manuales del fabricante.
