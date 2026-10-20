# Extracto POWSG020 - Prevención de Caídas de Objetos desde Altura (DROPS)

Fuente: `docs/fuentes/drops\POWSG020*.pdf` (4 archivos). Páginas = página del PDF (1-based). Las citas son textuales del documento (incluyen sus errores de tipeo). Todo lo marcado **[INFERENCIA]** o **[DUDOSO]** no está dicho expresamente por el documento.

Método: texto con pypdf y PyMuPDF; A2 y páginas de figuras renderizadas como imagen (200-300 dpi) y revisadas visualmente; A3 revisado en texto completo y como imagen en págs. 1, 16 y 20 (el resto: solo texto, sin ver las fotos).

---

## 1. Procedimiento PO-WSG-020 rev. 02 (7 págs)

Archivo: `POWSG020 Caída de Objetos desde Altura 02.pdf`

### 1.1 Metadatos (pág. 1 y encabezados págs. 2-7)

| Campo | Valor | Fuente |
|---|---|---|
| Código | "PO-WSG-020" (en anexos y referencias se escribe también "POWSG020") | pág. 1-7 |
| Título | "PREVENCION DE CAIDAS DE OBJETOS DESDE ALTURA" | pág. 1 |
| Sistema | "SISTEMA DE GESTIÓN INTEGRADO – SGI" | pág. 1 |
| Revisión vigente | 02, "Cambios generales", 11/07/22; Elabora GDP, Revisa HA, Aprueba PC | pág. 1 |
| Rev. 01 | "Cambios generales" 04/07/21; HA / EV / DF | pág. 1 |
| Rev. 00 | "Para Distribución" 01/07/15; GER / HHA / ERV | pág. 1 |
| Aviso | "LA REPRODUCCION PARCIAL O TOTAL DEL PRESENTE DOCUMENTO, SERÁ SOLO A TÍTULO INFORMATIVO SI CARECE DEL SELLO QUE ACREDITE LA CONDICIÓN DE ORIGINAL O COPIA CONTROLADA" | pág. 1 |

- Elabora/Revisa/Aprueba figuran **solo con iniciales** (GDP, HA, PC). No hay nombres ni cargos. **[DUDOSO]** No se puede saber quién es quién por el documento.
- La pág. 1 dice "Página 1 de 4" pero el resto dice "de 7" y el archivo tiene 7 págs. Error de la portada.
- No se ve sello de "copia controlada" en la copia que tenemos (PDF).
- **Clasificación como `procedure`**: es un procedimiento del SGI de la empresa, con revisión y firmantes (por iniciales) y aplica a "todas las Operaciones realizadas en la empresa". Puede tratarse como procedimiento corporativo aprobado (rev. 02). Salvedad: no es específico del equipo 10 (ver 1.3) y las aprobaciones son solo iniciales.

### 1.2 Objetivo, alcance, documentos, definiciones (pág. 2)

- Objetivo: "Establecer lineamientos y parámetros seguros para la Prevención de Caída de Objetos desde Altura teniendo en cuenta la planeación y ejecución de las Operaciones adoptando medidas de prevención y de protección aplicables a la Industria."
- Alcance: "Este documento es aplicable a todas las Operaciones realizadas en la empresa." No menciona equipos, torres ni áreas concretas.
- Documentos asociados: "No posee". Registro (pág. 7): "No posee." (aunque más adelante exige planillas; ver 1.7).
- Única definición: "Programa de Protección Contra Caídas de Altura". No define "DROPS", "objeto caído" ni "altura".

### 1.3 Responsabilidades (págs. 2-3)

| Rol | Qué hace (textual resumido) |
|---|---|
| Gerente Well Service | "Solicita y administra los recursos requeridos" |
| Gerencia QHSE | "Controla y verifica la aplicación del presente procedimiento." |
| Jefe de Campo | "Verifica y controla el cumplimiento"; "Realiza el seguimiento a las observaciones relevantes en las Inspecciones" |
| Jefe de Equipo | "Cumple y hace cumplir"; "Verifica y controla la ejecución de las Inspecciones"; "Programa inspecciones para el control y aseguramientos del equipamiento ante caídas de objetos desde altura." |
| Encargado de Turno | "Debe confeccionar la planilla de inspección de Reporte de Control de Caídas de Objetos." |
| Personal Operativo | "Realiza Inspecciones planeadas y diarias al Sistema orientadas a la prevención de caídas de objetos desde altura."; "Comunica y detiene la operación en caso de ser necesaria ante observaciones relevantes" |
| Técnico CMASySO | "Verifica que la información relevante y pertinente ... sea comunicada a Jefe de Equipo, Jefe de Campo, y personal Operativo." |

### 1.4 Principios y frecuencia de inspecciones (págs. 3-4)

- 6.1 (pág. 3): requerimientos básicos: eliminación y sustitución; protección física contra caída de cuerpos; restricción; detención activa; controles administrativos.
- 6.2 (pág. 3): "Se realizaran chequeos e inspecciones en la zona de trabajo asegurando que los elementos en altura se encuentren fijos y asegurados. Los elementos que no estén adecuadamente protegidos, se identificaran como potenciales caídas de objetos. Se deben implementar acciones adecuadas de mitigación para éstos elementos identificados."
- **Frecuencia A1 (pág. 3)**: "Las Inspecciones de caída de objetos de todas las áreas expuestas a trabajos en altura serán realizadas Previo a cada Montaje y Desmontaje mediante la planilla POWSG020-A1 'Check List de Caídas de Objetos Pre Montaje y desmontaje'." (El título del anexo A1 real es "Check List de Caídas de Objetos"; ver 2.)
- **Hallazgos (pág. 3)**: "Todas las deficiencias deben ser reportadas en el formato de POSGI011-A1 'Tarjetas de Observaciones CMASySO' y corregidas inmediatamente." (sin plazo numérico, solo "inmediatamente").
- **Frecuencia RCCO (pág. 3)**: "Las Inspecciones de Caídas de Objetos desde Altura MENSUALMENTE se confeccionan en el POWSG020-A3 'Reporte de Control de Caídas de Objetos' RCCO donde el personal operativo ejecutara de manera minuciosa el control y aseguramiento de todos los componentes del equipos que están sometidos a posibles caídas desde altura."
- Capacitación (pág. 3): quienes inspeccionan "deben recibir la información y orientación apropiada acerca de la manera de identificar, categorizar y mitigar el potencial de caída de los objetos." (sin contenido ni duración).
- Terceros (pág. 4): "Se deben inspeccionar o solicitar la inspección de todos los equipamientos/accesorios de terceras compañías ... Todas las operaciones con cargas elevadas deben ser reportadas al ingreso al momento de iniciar operación."
- Diaria: solo el rol "Personal Operativo" (pág. 2) habla de "Inspecciones planeadas y diarias", sin formato ni contenido definido. **[DUDOSO]** No hay planilla diaria en los anexos.

### 1.5 Control del riesgo (pág. 4)

Tres niveles definidos por probabilidad + presencia de personal + exposición (no por altura):

| Nivel | Definición textual | Ejemplos citados |
|---|---|---|
| 6.3.1 Riesgo Alto | "todo elemento de un equipo que tiene una alta probabilidad de estar involucrado en una Caída de Objeto, ubicado en un área donde existe personal regularmente presente." | "método de sujeción malo o inadecuado"; "exposición continúa a condiciones climáticas o a una vibración significativa"; "exposición continúa al contacto con maquinaria en movimiento, por ejemplo, dentro del radio de las operaciones de guinche o grúa" |
| 6.3.2 Riesgo Medio | "probabilidad media ... personal presente en forma intermitente." | sujeción "menos que satisfactorio"; exposición a clima/vibración; "exposición ocasional" a maquinaria |
| 6.3.3 Riesgo Bajo | "baja probabilidad ... personal presente sólo en forma poco frecuente." | sujeción "optimo, que puede incluir una barrera adicional"; sin exposición a clima/vibración/maquinaria |

Además: "Los riesgos han sido jerarquizados, y las actividades o cambios en la estructura pueden causar que cierta clasificación de riesgos varié. Esta variación debe ser mitigada".

### 1.6 Medidas de prevención 6.3.4 (págs. 4-5) - lista de verificación de elementos

Introducción: "Se deben verificar la implementación de los siguientes elementos, componentes y accesorios de prevención de caídas de objetos de altura:" (obligatorio, "Se deben"). Ítems textuales:

1. "Verificar eslingas de seguridad en: (Piso de enganche, trampolín, peines, artefactos luminarias, T5, etc.)"
2. "Verificar que las roldanas posean un sistema de protección por corte del eje (Bolsillo contenedor) y eslinga de seguridad a las colgadas en los perfiles."
3. "Eslingas de Seguridad en pisos rebatibles."
4. "Estado de los accesorios de Izaje (eslingas, fajas sintéticas, grilletes, ganchos, etc.)"
5. "Pernos con sus chaveta de seguridad (partidas) y Tornillos con tuercas auto frenantes (elementos de 4 puntos)"
6. "Control de dispositivos para transportar herramientas manuales en altura (mecánicos, electricistas y personal de Equipo."
7. "Condiciones de los rodapié en barandas de subestructuras / piletas."
8. "En equipos convencionales revisar el punto de fijación de la bancada de la palanca de frenos del aparejo"
9. "Verificar pruebas del freno de emergencia (límites de descenso superiores e inferiores)"
10. "Verificar que la des habilitación del freno de emergencia no sea una práctica común."
11. "Verificar el estado de las barandas en plataformas de trabajo, sub estructura, o cualquier área de trabajo que conlleve este elemento de protección. En caso de remoción, o extracción por cualquier motivo fuese se deberá instalar cadenas de seguridad, cartel indicativo, advertencias de seguridad, para informar y comunicar a todo el personal sobre el cambio que sufrió la zona de trabajo."

### 1.7 Inspecciones 6.3.5 (pág. 5) - cuándo, según nivel de riesgo

- "La inspección de caída de objetos de todas las áreas designadas será realizada durante operaciones normales, antes del bajar y/o levantar la torre del equipo o izaje de sub estructura. Todas las deficiencias deben ser reportadas y corregidas inmediatamente. Según Riesgo Alto."
- "La inspección de la torre debe ser completada después de operaciones de tijera o de martilleo. Todas las deficiencias deben ser reportadas y corregidas inmediatamente. Según Riesgo Medio."
- "La inspección de piletas, bombas, acumuladores, carrier, deben realizarse de manera minuciosa para garantizar que objetos se encuentren debidamente asegurados. Según Riesgo Bajo."
- "Todos los equipos de terceras compañías ... deberán ser inspeccionadas por el Responsable de las Instalaciones (Jefe de Equipo – Encargado de Turno) antes de ser montados."

Ambigüedades **[DUDOSO]**: (a) asigna "la torre" al riesgo Medio y "piletas... carrier" al Bajo, lo que no coincide con el layout A2 (corona/piso de enganche/mástil = Alto; sub estructura y carrier = Medio; ver 3.3); (b) "operaciones de tijera o de martilleo" no está definido (no se sabe si se refiere a maniobras de tijera del mástil o a golpeo en el pozo); (c) no hay frecuencia en tiempo (diaria/semanal) para la torre, solo eventos disparadores.

### 1.8 Consecuencias y calculadora DROPS (págs. 3-4, 5-6)

- Pág. 3-4: "La Planilla POWSG020-A4 'Calculadora de Caída de Objetos' DROPS ... proporciona un punto de referencia común en la clasificación de las posibles consecuencias de un objeto caído ... trazar la masa de un objeto caído contra la distancia que cae." **El anexo A4 no está entre los archivos entregados** (falta).
- Pág. 5: "En cada etapa/fase del trabajo se deben identificar y evaluar por su consecuencia los Objetos caídos desde altura. Para ello se recurre a una 'Calculadora de Consecuencia sobre Objeto Caído' ... toma la altura del objeto, además de su peso, y clasifica las consecuencias en términos de riesgo, ya sea de Primeros Auxilios, Tareas Restringidas, Tiempo Perdido o la Fatalidad."
- Categorías (págs. 5-6): 6.4.1 Primeros Auxilios "(color verde)"; 6.4.2 Tareas Restringidas ("incidentes graves"); 6.4.3 Tiempo Perdido; 6.4.4 Fatalidad.
- Pág. 6, figura 6.4.5 "Consecuencia de Objetos Caídos": eje X Peso (kg) 1,0 a 10,0; eje Y Altura (m) 0 a 15; bandas de color: verde (Primeros Auxilios), amarillo (Restringible), naranja (Pérdida Tiempo), rojo (Fatalidad). Ejemplo cargado en la figura: Altura 4,56 m, Peso 1 kg, Consecuencia "P Aux", "44,688 Joule" (es solo un ejemplo de la herramienta, no un umbral). **Los umbrales exactos (altura/peso para cada banda) NO están tabulados**; solo se pueden leer aproximadamente de la curva (imagen). No usarlos como umbral normativo. La leyenda de la figura repite el naranja para "Primeros Auxilios" y "Perdida Tiempo" **[DUDOSO]**.
- Supuestos físicos (pág. 6): energía potencial = cinética; gravedad constante a nivel del mar; "Toda la energía se asume que es absorbida por el individuo y su equipo de protección personal"; fatalidad = fuerza para romper casco y cráneo; tiempo perdido = romper hueso de hombro o parte superior del pie; registrable = laceración con puntos de sutura. Sin valores en joules ni en kg/m.
- 6.4.6 (pág. 6): "El equipo y/o los procesos nuevos deben ser evaluados para introducir el riesgo de caída de objetos, y se deben reducir los riesgos tanto como sea posible." Cambios de proceso/equipo: seguir POWSG019 "Modificaciones del Equipamiento" + "SDC Solicitud de Cambio de Diseño".

### 1.9 Actividades con caída potencial 6.5 (pág. 7)

- Operaciones de elevación: "se debe considerar la integridad de la carga y el equipo de elevación".
- Trabajo en altura: "los equipos o herramientas que se usan para este tipo de trabajo deben ser considerados como objetos con potencial de caída."
- Equipo temporario: "debe estar sujeto al mismo grado de control y supervisión que el equipo fijo."

### 1.10 6.6 Clasificación de Áreas (pág. 7)

Solo reproduce como imagen el layout de A2 (ver sección 3). Sin texto propio. Anexos listados (pág. 7): A1 Check List; A2 "Clasificación de Áreas sobre Caídas de Objetos"; A3 RCCO; A4 Calculadora.

---

## 2. Anexo A1 - Check List de Caídas de Objetos (1 pág)

Archivo: `POWSG020-A1 Check List de Caídas de Objetos.pdf`. Código en el formulario: "PO-WSG-020-A1-1". Título: "CHECK LIST DE CAÍDAS DE OBJETOS". Encabezado: FECHA / EQUIPO / POZO. Columnas: Inspección Caída de Objetos | Si | No | Observaciones. Pie: "Nota: Completar los ítem de la Inspección de Caída de Objetos con un tilde (x) y en caso de observaciones relevantes aclarar e informar." Firmas: "Firma y Aclaración Jefe de Equipo" y "Firma y Aclaración Encargado de Turno".

### 2.1 Transcripción íntegra (pág. 1)

1. Verificar el aseguramiento de la Baliza del Equipo. Encendido y/o intermitencia de la baliza?
2. Chequear los pernos y seguros varios del Aparejo del Equipo, aseguramiento correcto?
3. Verificar planilla de Inspección de Elementos para Trabajos y Rescate en Altura POSGI015-A1-0?
4. Verificar ojales, pernos y seguros inferior y superior de pistón principal?
5. Verificar el estado de los peines en el Piso de Enganche y su aseguramiento?
6. Chequear todos los grilletes, pasadores y seguros de las eslingas del Piso de Enganche?
7. Verificar el estado de la compuerta y triangulo del aseguramiento del Pirosalva?
8. Estado de cable, guardacabo, seguro y gancho del guinche del equipo, aseguramiento correcto?
9. Verificar la correcta colocación de todos los pernos, tuercas y seguros en la corona?
10. Chequear la colocación de los seguros (alfiler-chaveta) de elevadores y ámelas en el aparejo?
11. Verificar que todos las luminarias en la Torre estén aseguradas correctamente (eslinga)?
12. Chequear el estado de las eslingas y grampas colocadas en la linea del stand pipe y manguerote?
13. Verificar que seguros, y pernos estén colocados en la cabeza de circulación o power swivel?
14. Control visual de poleas, eslingas y cabrestantes montados sobre la corona?

Total: 14 ítems, opciones Si/No solamente (sin N/A ni foto). Sin criterio de aceptación numérico; el procedimiento pide corregir "inmediatamente" (pág. 3). Sin campo de altura, peso ni riesgo.

Notas: el ítem 10 dice "ámelas" (probablemente "amelas"/"ámelas" = elemento del aparejo; **[DUDOSO]**, no interpretar); "Pirosalva" aparece como nombre del piso de enganche/escape en A3 (ver 4). El ítem 3 remite a otro formulario (POSGI015-A1-0), no incluido.

---

## 3. Anexo A2 - Layout / Clasificación de Áreas (1 pág.)

Archivo: `POWSG020-A2 Layout Equipo Caida Objetos.pdf`. Página apaisada. Rótulo: "Layout - Caída de Objetos de Altura - POWSG020-A2-0". Título de la imagen: "Clasificación Areas Caídas de Objeto" (idéntico a la figura de 6.6, pág. 7 del procedimiento).

### 3.1 Qué es el dibujo (observado en la imagen)

- **Vista en planta (cenital) del sitio/locación**, no un alzado del mástil. Es el típico plano de disposición de equipos de pozo con rótulos en inglés (Power plant, Laboratory, Pump, Tank Nº1, Tank Nº2, Tank, Staff, Pressure accumulator, Tools container, Board, Retractile bridge for tubing, Subtructure, Rig) y **acotaciones en metros**. Se ve la subestructura/rig en el centro (rojo/violeta/azul) y el "Board" (rampa/plano inclinado, en color arena) hacia la derecha.
- Sobre el centro (subestructura/boca de pozo) se superponen **3 anillos concéntricos difusos**: rojo interior con el texto "ALTO", naranja/amarillo intermedio con "MEDIO", verde exterior con "BAJO". Son óvalos dibujados encima; **no tienen radio ni cota** [dato ausente].
- Líneas verdes discontinuas: una horizontal (eje del rig/board), una vertical (por el centro) y otra horizontal superior, más una inferior cerca del borde de la imagen; parecen marcar ejes/límites del layout. **[INFERENCIA]** No hay leyenda que los explique.
- Línea discontinua azul en zigzag alrededor del board y el retractile bridge, con puntos negros en los extremos: sin leyenda (posiblemente guías/vientos, "4 guidelines per API" al pie; **[DUDOSO]**).
- Rótulo pequeño "Punto de Reunión" junto al retractile bridge (lado derecho, inferior). Es el único rótulo en español dentro del dibujo aparte de BAJO/MEDIO/ALTO.
- Texto al pie derecho: "4 guidelines per API".

### 3.2 Cotas legibles (m, "mts") - tal como aparecen, sin interpretar más de lo visible

| Cota | Elemento acotado (lo que muestra el dibujo) |
|---|---|
| 2,5 mts | ancho del bloque Power plant/Laboratory (arriba a la izquierda) |
| 12 mts | alto del grupo Tank/Tank (izquierda) |
| 8 mts | ancho del Pump |
| 12 mts | ancho del Tank Nº1 (arriba) |
| 2,4 mts | alto del Tank Nº1 |
| 11 mts | largo del Rig (desde el extremo izquierdo, acotación parcialmente tapada por los anillos; también hay un "4 ... g" tapado) |
| 2,5 mts | ancho del Rig |
| 12 mts | largo Pressure accumulator + Tools container |
| 10 mts | largo hasta el extremo derecho del Board (acotación superior) |
| 3 mts | tramo a la derecha de la subestructura (parcialmente tapado; texto "3 [?] mts") |
| 1,5 mts | ancho del Board |
| 6 mts / 6 mts | mitades superior e inferior del retractile bridge respecto del eje |
| 20 mts (derecha) | cota vertical total del lado derecho |
| 20 mts (abajo) | cota horizontal inferior, junto a "4 guidelines per API" |
| "1? mts" | cota vertical tapada por el anillo, junto a la línea superior: **ilegible [DUDOSO]** |

**Importante:** son cotas del *layout de equipos en locación* (huellas y separaciones). **El documento no dice que sean radios de zona DROPS ni distancias de exclusión**. No usarlas como tal. Tampoco hay alturas (eje Z) en el A2. Las cotas 12/11/20 m no se pueden asociar a ningún anillo con certeza.

### 3.3 Leyenda de clasificación (pie de la imagen; lectura textual)

| Nivel (color del rótulo) | Áreas listadas con "*" |
|---|---|
| **RIESGO ALTO** (rojo) | Corona de equipo; Entre Corona y Piso de enganche; Piso de enganche; Entre Piso de enganche y Sección de mastil |
| **RIESGO MEDIO** (naranja) | Área boca de pozo; Sub estructura y Carrier; Casilla de Maquinista; Plano inclinado y Planchada |
| **RIESGO BAJO** (verde) | Pileta; Bomba; Generador; Campamento; Depósito |

Lectura espacial: rojo = eje vertical del equipo (torre de corona a base del mástil), naranja = boca de pozo y estructuras adyacentes (subestructura, casilla, rampa/planchada), verde = equipos periféricos. **[INFERENCIA]** Los anillos representan zonas de planta en torno al pozo; el documento no da la equivalencia dimensional.

Discrepancia clave: **"Área boca de pozo" es Riesgo Medio en A2 pero los 4 ítems de "Área de Boca de Pozo" en el RCCO (guinche, power swivel, aparejo, eslinga de sujeción) están marcados "Riesgo Alto"** (A3 págs. 15-16). Además el 6.3.5 (pág. 5) ubica "piletas, bombas, acumuladores, carrier" en Bajo mientras A2 pone "Sub estructura y Carrier" en Medio. Hay que decidir qué prevalece; el procedimiento no lo resuelve.

---

## 4. Anexo A3 - Reporte de Control de Caídas de Objetos, RCCO (25 págs)

Archivo: `POWSG020-A3 Reporte de Control de Caidas de Objetos RCCO.pdf`. Código en el formulario: "POWSG020-A3-2" (el procedimiento lo llama "POWSG020-A3"). Es un **formulario de inspección ya cargado con los componentes del equipo tipo** (con foto de cada elemento y círculos amarillos que señalan el punto a controlar, visto en págs. 1, 16, 20), no un formulario en blanco.

### 4.1 Estructura

- Encabezado: Fecha / Lugar/Pozo / Equipo.
- Columnas: Art. | Descripción (con foto) | Clasificación según Riesgo | Sujeciones primarias y secundarias | Retención de Seguridad | Observaciones/Comentarios | Estado de Verificación (Bien-Mal-No Corresponde).
- **La columna Estado de Verificación está vacía** en todo el documento (formulario base; sin datos de inspección real). La columna "Observaciones/Comentarios" contiene el criterio de verificación estándar de cada ítem.
- Firmas al final (pág. 25): "Firma y Aclaración Jefe de Equipo" y "Firma y Aclaración Encargado de Turno".
- Estados: Bien / Mal / No Corresponde (no hay REGULAR ni obligación explícita de foto/comentario de hallazgo dentro del formulario; el procedimiento remite a la Tarjeta de Observaciones POSGI011-A1, pág. 3).
- Criterio de aceptación numérico: no hay. El criterio es visual: "Verificar visualmente que los elementos estén correctamente colocados, ya sea tuerca auto frenante o tuerca común con chaveta partida" (se repite en la mayoría de los ítems).

### 4.2 Ítems por sección (64 ítems)

Columnas: Sección (pág.) | N.º y descripción | Riesgo declarado | Sujeción primaria/secundaria | Retención seguridad. "NR" = "No Requerida/No requerida". Datos numéricos: los del propio formulario.

**A. Corona (págs. 1-3), 9 ítems, todos Riesgo Alto**

1. Polea de pistón - "3 topes guía cable con bulones tuercas auto frenantes o tuercas con chaveta partida" - NR (pág. 1)
2. Polea viajera - ídem, 3 topes - NR (pág. 1)
3. Polea de punto muerto - ídem, 3 topes - NR (pág. 1)
4. Polea de líneas 1, 2 y 3 de aparejo - 3 topes - NR (pág. 2)
5. Poleas de izaje de cable de guinche - "4 pastecas de pasaje 5/8 9/16 sujetas con bulones tuercas auto frenantes" - NR (pág. 2)
6. Placa certificada de sujeción para T-5 - "Placa soldada sujetas con 4 bulones tuercas auto frenantes"; verificar soldaduras - NR (pág. 2)
7. Baliza de la corona - "roscada y sujeta con eslinga de seguridad" - Eslinga de seguridad 3 mm (pág. 3)
8. Banderas en cajón de corona - grampas con bulones, tuercas autofrenantes, prisioneros y eslingas - Eslinga 3 mm (pág. 3)
9. Dispositivo retráctil T5 - "sujeto con Grillete y eslinga" - Eslinga de seguridad (pág. 3)

**B. Espacio entre Corona y Piso de Enganche (págs. 4-6), 9 ítems, todos Riesgo Alto**

1. Luminarias/artefactos en mástil x 7 unidades - grampas, bulones, tuercas autofrenantes y eslingas - Eslinga 3 mm (pág. 4)
2. Reflector led - ídem - Eslinga 3 mm (pág. 4)
3. Depósito de purga - "grampa laterales sujetos a la estructura del mástil ... bulones, tuercas auto frénate y eslingas de seguridad" - Eslinga 3 mm (pág. 4)
4. Vientos posteriores del segundo tramo - "2 grilletes de 4 elementos certificados ... en cáncamos de bloque de corona" - NR (pág. 5)
5. Vientos de carga - "2 grilletes de 4 elementos certificados ... en chasis" - NR (pág. 5)
6. Vientos carga trasero - grilletes a cáncamos soldados; grillete 4 elementos con perno, tuerca y chaveta partida - NR (pág. 6)
7. Viento de anclaje terrestre trasero - 2 grilletes 4 elementos en chasis; verificar soldadura - NR (pág. 6)
8. Viento frontales de segundo tramo - "2 Cáncamos certificados con perno y chaveta" con grilletes de 4 elementos - NR (pág. 6)
9. Poleas superiores de piso de enganche - "2 poleas"; verificar soldadura de pastecas y condición de grampas - NR (pág. 7)

**C. Piso de Enganche (Pirosalva) (págs. 7-11), 13 ítems, todos Riesgo Alto**

1. Caran block Enganchador - cáncamo con grillete - NR (pág. 7) **[DUDOSO: "Caran block" tal como figura]**
2. Sujeción del cable del pirosalva - cáncamos y grilletes de cuatro elementos - NR (pág. 8)
3. Pirosalva - "abulanado con 7 bulones" - NR (pág. 8)
4. Rejilla de material desplegable - abulonada con seguros y tuerca autofrenante o chaveta partida - NR (pág. 8)
5. Trampolín - tuercas autofrenantes y cables de seguridad - "Eslinga de seguridad de 3/8" con 4 eslabones engrampados" (pág. 9)
6. Peines de piso de enganche - tuercas autofrenantes/chaveta - "Eslinga de seguridad 3/8"" (pág. 9)
7. Puerta de ingreso a piso de enganche - bisagras soldadas - cadenas soldadas (pág. 9)
8. Sujeción de piso de enganche - cáncamo soldado - NR (pág. 10)
9. Cable de sujeción de seguridad de piso enganche - "Cable certificado ... con grillete a cáncamos ... con 4 grampas de sujeción" - Cable de seguridad (pág. 10)
10. Viento de anclaje inferior - grilletes a cáncamos soldados - NR (pág. 10)
11. Puerta de ingreso pirosalva - bisagras soldadas, perno pasador con cadena soldada - Cadenas soldadas (pág. 10)
12. Poleas de deslizamiento de piso de enganche - "2 poleas viajeras abulonados con tuercas autofrenantes" - NR (pág. 11)
13. Vientos de sujeción superior - "2 vientos sujetas con grilletes a cáncamos soldados" - cadena de seguridad (pág. 11)

**D. Entre Piso de Enganche y Primer Sección del Mástil (págs. 12-14), 9 ítems, todos Riesgo Alto**

1. Luminarias de mástil x 5 pax - grampas, bulones, tuercas autofrenantes - Eslinga 3 mm (pág. 12)
2. Reflectores Led - "3 unidades ... en caballete de piboteo de mástil" - Eslinga 3 mm (pág. 12)
3. Interruptor alimentación de luz del segundo tramo - bulones, tuercas autofrenantes - Eslinga 3 mm (pág. 12)
4. Grillete de rienda de carga primer tramo - "2 grilletes de 4 elementos ... en chasis" - NR (pág. 13)
5. Polea de deslizamiento interior de piso de enganche - "2 poleas viajeras abulonados" - NR (pág. 13)
6. Caja de conexión eléctrica de todo el mástil - abulonado al mástil - NR (pág. 13)
7. Soporte de stand pipe - "grampas cepo abulonados a estructura de mástil" - NR (pág. 14)
8. Grampas en manguerote de cuello de cisne - tuercas autofrenantes - grilletes de 4 elementos y eslinga (pág. 14)
9. Pulmón de Indicador de peso Martin Decker - prensado a cable, cadena de seguridad con grampa - Cadena de seguridad (pág. 14)

**E. Área de Boca de Pozo (págs. 15-16), 4 ítems, todos Riesgo Alto (ver discrepancia con A2)**

1. Guinche - "Cable de 9/16" Ojo/Ojo guardacabo sujeto con grillete de 4 cuerpo y giratorio" - NR (pág. 15)
2. Power swivel - Cabeza rotativa - "NA / NA / NA" (pág. 15)
3. Aparejo - "Sostenido por 8 línea de cables 1 1/8" torción derecha"; "Inspección y certificado vigente. Inspeccionar freno de aparejo y cable" - NR (pág. 15)
4. Eslinga de sujeción y anclaje - grillete y eslinga de seguridad 9/16" + eslinga 1/2" - Eslinga de seguridad 1/2" (pág. 16)

**F. Subestructura y Carrier (págs. 17-18), 4 ítems, todos Riesgo Medio**

1. Pistones y tensores - "6 tensores abulonados con seguros y tuerca autofrenante y chaveta partida" (pág. 17)
2. Escaleras y plataformas de tránsito/trabajo - perno y seguro (pág. 17)
3. Barandas y rodapié - baranda en tintero soldado con perno y seguro (pág. 17)
4. Artefactos de iluminación - reflector led con grampas, bulones, tuercas autofrenantes - Eslinga 3 mm (pág. 18)

**G. Casilla de Maquinista (pág. 19), 3 ítems, Riesgo Medio**

1. Mangueras, comandos de izaje - grampas cepo abulonados
2. Soporte y pernos - fijado en tinteros soldados con perno y seguro
3. Escaleras y pasadores

**H. Plano inclinado y Planchada (pág. 20), 2 ítems, Riesgo Medio**

1. Plano inclinado y pernos - solo dice "BANDEJA HCA." (sin criterio de verificación; incompleto **[DUDOSO]**)
2. Barandas - tintero soldado con perno y seguro

**I. Piletas - Bombas - Generador - Depósito - Trailer Campamento (pág. 21), 2 ítems, Riesgo Bajo**

1. Luminarias - soporte abulonado en base soldada, palmeras rebatibles con perno pasante y seguro; eslingas de seguridad doble - Eslinga 3 mm
2. Barandas y rodapié - tintero soldado con perno y seguro

**J. Piso de trabajo - Escalera de acceso (págs. 22-24), 6 ítems**

1. Escaleras y plataformas de tránsito/trabajo - clasificación escrita **"Ligero"** (no es uno de los 3 niveles definidos; **[DUDOSO]**) (pág. 22)
2. Pernos de fijación a piso de trabajo - Riesgo medio (pág. 22)
3. Barandas y rodapié - Riesgo medio (pág. 23)
4. Baranda de plano inclinado - Riesgo medio (pág. 23)
5. Patas de apoyo de piso de trabajo - Riesgo medio (pág. 23)
6. Pasadores de sujeción de aleros (rebatibles) - Riesgo medio (pág. 24)

**K. Poste de retenida de llave hidráulica (págs. 24-25), 3 ítems, Riesgo Medio**

1. Grampa superior de sujeción - "Grampa con 8 por bulones y tuercas autofrenantes" (pág. 24)
2. Grampa inferior de sujeción - ídem (pág. 25)
3. Sujeción de brazo de llave a poste de retenida - perno pasante con cadena soldada y seguro; eslinga con grillete 4 elementos (pág. 25)

### 4.3 Lo que indica el RCCO sobre qué se reporta

- Cada ítem lleva riesgo (Alto/Medio/Bajo), sujeción primaria, retención secundaria y el criterio visual de verificación. Es la base más concreta de "puntos de control" del equipo.
- Se reportan los **componentes fijos del equipo** que pueden desprenderse (poleas, luminarias, vientos, pisos, barandas, etc.). No hay campo de peso ni de altura por ítem (a pesar de la calculadora DROPS del 6.4).
- El RCCO se hace **mensualmente** (procedimiento pág. 3) y lo "confecciona" el Encargado de Turno (pág. 2).
- Mezcla de niveles: las secciones A-E (corona, corona-piso de enganche, piso de enganche, piso de enganche-mástil, boca de pozo) suman 44 ítems, todos "Riesgo Alto"; las secciones F-K suman 20 ítems Medio/Bajo/"Ligero". Recuento propio del extracto (64 en total); verificar contra el original antes de usarlo como cifra oficial.

---

## 5. Tabla de puntos de control DROPS

Ubicación en el equipo según A2 (leyenda) y RCCO (sección). Frecuencia y responsable: los indicados en el procedimiento (no son por punto, son por documento). "A1" = check list pre montaje/desmontaje (cada montaje y desmontaje, Jefe de Equipo + Encargado de Turno firman). "RCCO" = mensual (Encargado de Turno confecciona; Personal Operativo ejecuta; Jefe de Equipo verifica). Diaria: "Personal Operativo... inspecciones planeadas y diarias" (pág. 2) sin formato.

| Punto de control | Ubicación en el equipo | Qué se controla | Frecuencia / responsable | Fuente (doc, pág.) |
|---|---|---|---|---|
| Polea de pistón, viajera, punto muerto, líneas 1-3 | Corona (Alto) | 3 topes guía cable con bulones y tuercas autofrenantes o chaveta partida | RCCO mensual; A1 ítem 9 y 14 | A3 págs. 1-2; A1 pág. 1 |
| Poleas de izaje de cable de guinche | Corona (Alto) | 4 pastecas 5/8-9/16 con tuercas autofrenantes | RCCO mensual; A1 ítem 14 | A3 pág. 2; A1 |
| Placa certificada T-5 y dispositivo retráctil T5 | Corona (Alto) | Soldadura, 4 bulones autofrenantes; grillete y eslinga | RCCO mensual | A3 págs. 2-3 |
| Baliza de la corona | Corona (Alto) | Roscada, eslinga 3 mm; encendido/intermitencia | RCCO mensual; A1 ítem 1 | A3 pág. 3; A1 |
| Banderas en cajón de corona | Corona (Alto) | Grampas, bulones, prisioneros, eslinga 3 mm | RCCO mensual | A3 pág. 3 |
| Luminarias, reflectores, depósito de purga | Mástil entre corona y piso de enganche (Alto) | Grampas, tuercas autofrenantes, eslingas 3 mm | RCCO mensual; A1 ítem 11 (luminarias) | A3 pág. 4; A1 |
| Vientos (riendas/anclajes) traseros, de carga, frontales | Entre corona y piso de enganche; piso de enganche (Alto) | Grilletes 4 elementos, cáncamos, soldaduras, cables de seguridad | RCCO mensual | A3 págs. 5-6, 10-11, 13 |
| Poleas superiores/deslizamiento del piso de enganche | Entre corona/piso de enganche (Alto) | Soldadura de pastecas, grampas, perno de seguridad | RCCO mensual | A3 págs. 7, 11, 13 |
| Piso de enganche (pirosalva), trampolín, peines, puertas, rejilla, cable de sujeción | Piso de enganche (Alto) | Bulones, autofrenantes, eslingas 3/8", cadenas, soldaduras | RCCO mensual; A1 ítems 5, 6, 7 (peines, eslingas del piso, pirosalva); proc. 6.3.4 (eslingas en piso de enganche, trampolín, peines) | A3 págs. 7-11; A1; Proc. págs. 4-5 |
| Luminarias/reflectores/interruptor/caja eléctrica/soporte stand pipe/manguerote/pulmón Martin Decker | Entre piso de enganche y primer sección de mástil (Alto) | Fijaciones, eslingas, grillete 4 elementos, cadena | RCCO mensual; A1 ítems 11, 12 | A3 págs. 12-14; A1 |
| Pistón principal | Mástil / subestructura **[INFERENCIA]** (el documento no lo ubica) | Ojales, pernos y seguros inferior y superior | A1 ítem 4, antes de montaje/desmontaje | A1 pág. 1 |
| Aparejo, elevadores y "ámelas" | Boca de pozo (A3 Alto; A2 Medio) | Pernos, seguros, alfiler-chaveta, certificado y freno | A1 ítems 2, 10; RCCO mensual | A1; A3 págs. 15-16 |
| Guinche, power swivel/cabeza de circulación, eslinga de sujeción y anclaje | Boca de pozo | Cable, guardacabo, gancho, grillete, seguros/pernos | A1 ítems 8, 13; RCCO mensual | A1; A3 págs. 15-16 |
| Freno de emergencia (límites de descenso) | Aparejo/mástil **[INFERENCIA]** | Pruebas y que no se deshabilite habitualmente | "Se deben verificar" (sin frecuencia) | Proc. pág. 5 |
| Subestructura, pistones/tensores, escaleras, barandas, iluminación | Subestructura y carrier (Medio) | 6 tensores, pernos/seguros, tinteros soldados | RCCO mensual; proc. 6.3.5 Medio: tras "tijera o martilleo" | A3 págs. 17-18; Proc. pág. 5 |
| Casilla de maquinista | Casilla (Medio) | Mangueras, soportes, escaleras | RCCO mensual | A3 pág. 19 |
| Plano inclinado y planchada | Rampa/Board (Medio) | Bandeja HCA, barandas | RCCO mensual | A3 pág. 20 |
| Piletas, bombas, generador, depósito, campamento | Periferia (Bajo) | Luminarias, barandas y rodapié | RCCO mensual; proc. 6.3.5 Bajo: "minuciosa" | A3 pág. 21; Proc. pág. 5 |
| Piso de trabajo y escalera de acceso | Piso de trabajo (Medio/"Ligero") | Bujes, pernos, patas, pasadores de aleros | RCCO mensual | A3 págs. 22-24 |
| Poste de retenida de llave hidráulica | Poste (Medio) | 2 grampas con 8 bulones autofrenantes; cadena y grillete | RCCO mensual | A3 págs. 24-25 |
| Equipos de terceros / cargas elevadas | Todo el sitio | Inspección previa al montaje | Jefe de Equipo - Encargado de Turno, antes de montar | Proc. págs. 4-5 |
| Herramientas manuales en altura | Trabajos en altura | Dispositivos para transportarlas | "Se deben verificar" (sin frecuencia) | Proc. pág. 5 |

---

## 6. Números exactos citados por el documento

| Dato | Valor | Fuente |
|---|---|---|
| Frecuencia A1 | previo a cada montaje y desmontaje | Proc. pág. 3 |
| Frecuencia RCCO | mensual | Proc. pág. 3 |
| Plazo de corrección | "inmediatamente" (sin plazo numérico) | Proc. págs. 3, 5 |
| Ejemplo de calculadora | 4,56 m, 1 kg, 44,688 J = Primeros Auxilios | Proc. pág. 6 (figura) |
| Rango del gráfico | 1-10 kg; 0-15 m | Proc. pág. 6 |
| Eslinga seguridad luminarias/baliza | 3 mm | A3 págs. 3-5, 12, 18, 21 |
| Eslinga trampolín / peines | 3/8" (trampolín con 4 eslabones engrampados) | A3 pág. 9 |
| Eslinga de anclaje | 9/16" + 1/2" | A3 pág. 16 |
| Cables | guinche 9/16"; aparejo 8 líneas de 1 1/8" torsión derecha | A3 pág. 15 |
| Cantidades | 3 topes guía; 4 pastecas; 7 luminarias (corona-piso); 5 luminarias (piso-1º sección); 3 reflectores; 6 tensores; 7 bulones (pirosalva); 8 bulones (grampa poste) | A3 varias |
| Cotas del layout | 2,4; 2,5; 3; 6; 8; 10; 11; 12; 20 m; 1,5 m | A2 / Proc. pág. 7 (ver 3.2, no son radios de zona) |

---

## 7. Requisitos: obligatorios vs. recomendaciones

Obligatorios (redacción "debe/n", "deberá", "serán", "se deben"):

- "Se deben implementar acciones adecuadas de mitigación para éstos elementos identificados." (pág. 3)
- "Las Inspecciones ... serán realizadas Previo a cada Montaje y Desmontaje mediante la planilla POWSG020-A1" (pág. 3)
- "Todas las deficiencias deben ser reportadas en el formato de POSGI011-A1 ... y corregidas inmediatamente." (pág. 3; repetido en pág. 5)
- "Las personas encargadas de realizar la inspección ... deben recibir la información y orientación apropiada" (pág. 3)
- "Se deben inspeccionar o solicitar la inspección de todos los equipamientos/accesorios de terceras compañías" (pág. 4)
- "Todas las operaciones con cargas elevadas deben ser reportadas al ingreso" (pág. 4)
- "Se deben verificar la implementación de los siguientes elementos" (6.3.4, págs. 4-5)
- "se deberá instalar cadenas de seguridad, cartel indicativo, advertencias de seguridad" si se remueve una baranda (pág. 5)
- "En cada etapa/fase del trabajo se deben identificar y evaluar por su consecuencia los Objetos caídos desde altura." (pág. 5)
- "El equipo temporario debe estar sujeto al mismo grado de control y supervisión que el equipo fijo." (pág. 7)
- "Debe confeccionar la planilla ... RCCO" (Encargado de Turno, pág. 2); "Comunica y detiene la operación" (Personal Operativo, pág. 2)
- Inspección de equipos de terceros "deberán ser inspeccionadas ... antes de ser montados" (pág. 5)

Redacción en futuro/indicativo (se toman como exigencias del procedimiento): RCCO "MENSUALMENTE"; "La inspección de la torre debe ser completada después de operaciones de tijera o de martilleo" (pág. 5).

Recomendaciones o redacción blanda: prácticamente no hay. El procedimiento es casi todo imperativo; lo único blando es "Un método de sujeción optimo, que puede incluir una barrera adicional" (Riesgo Bajo, pág. 4).

---

## 8. Lo que el procedimiento NO define

- **Distancias/radios de las zonas Alto/Medio/Bajo**: los anillos del layout no tienen cota; las cotas del dibujo son huellas de equipos.
- **Alturas de referencia** (mínima para considerar "altura", alturas de corona, piso de enganche, mástil): no hay ninguna altura numérica del equipo.
- **Pesos/umbrales**: la calculadora está referida (A4 faltante) y el gráfico solo se puede leer de forma aproximada; no hay valores de joules por categoría ni pesos mínimos de "objeto".
- **Plazo numérico de corrección**: solo "inmediatamente".
- **Frecuencia diaria formal**: se menciona "diarias" solo en el rol del Personal Operativo, sin planilla.
- **Frecuencia para la torre** más allá de eventos ("tijera o martilleo", antes de bajar/levantar la torre).
- **Definiciones**: DROPS, objeto caído, "tijera", "martilleo", "Pirosalva", "ámelas", "Caran block".
- **Equipos concretos**: no menciona "Equipo 10" ni ningún equipo por nombre; el RCCO describe un equipo tipo (mástil con corona, piso de enganche/pirosalva, guinche, power swivel, aparejo de 8 líneas), pero no dice a cuál corresponde.
- **Zona de exclusión (barricada) bajo cargas o punto de reunión**: solo el rótulo "Punto de Reunión" en el layout, sin requisito.
- **A4 Calculadora**, **POSGI011-A1**, **POSGI015-A1-0**, **POWSG019/SDC**: referenciados pero no están en este juego de archivos (no verificados).

---

## 9. Inconsistencias y dudas para el usuario

1. Boca de pozo: Medio en A2 vs Alto en RCCO (págs. 15-16).
2. Torre = Medio en 6.3.5 vs corona/mástil/piso de enganche = Alto en A2 y RCCO.
3. Título de A1 en el procedimiento ("... Pre Montaje y desmontaje") vs título real del formulario ("Check List de Caídas de Objetos"); A1 sin ítems de mástil/barandas de subestructura, etc.
4. "Ligero" y "Riesgo medio" en minúscula en la sección J del RCCO (pág. 22): "Ligero" no es un nivel definido.
5. Plano inclinado del RCCO (pág. 20, ítem 1): fila incompleta ("BANDEJA HCA.").
6. Portada "Página 1 de 4" vs documento de 7 págs.
7. Aprobaciones solo por iniciales (GDP/HA/PC).
8. El layout es una vista en planta con anillos sin dimensión: sirve para clasificar **áreas**, no para ubicar puntos a una altura dentro del mástil. Para un gemelo 3D de la torre, la ubicación vertical de cada punto solo es cualitativa (orden corona -> entre corona y piso de enganche -> piso de enganche -> entre piso de enganche y primer sección -> boca de pozo -> subestructura).
