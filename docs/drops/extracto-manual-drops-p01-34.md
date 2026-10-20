# Extracto: Manual DROPS "Retención Confiable" Rev. 04 (ES), páginas PDF 1 a 34

Archivo: `docs/fuentes/drops\Manual Drops Rev. 04 en Español.pdf` (67 págs. PDF).
Cobertura de este extracto: págs. PDF 1-34 (otro agente cubre 35-67).

## 0. Convención de páginas (leer primero)

El PDF está maquetado en pliegos: **cada página PDF contiene 2 páginas impresas** (formato apaisado 595x420 pt). Relación: página PDF N = páginas impresas (2N-2) y (2N-1), para N >= 2. Ejemplo: PDF 14 = impresas 24-25; PDF 33 = impresas 62-63. Este documento cita `PDF n (impr. a-b)`.

Las remisiones internas del manual usan la numeración impresa y hay una inconsistencia: PDF 19 dice "(páginas 46-53)" para herramientas (correcto, = PDF 25-28), pero PDF 25 y 26 dicen "registro... (consulte la página 54)" y el formulario de registro de herramientas está en impr. 50-51 (PDF 27), no en la 54 (PDF 29 trata "Protección de equipos y piezas").

Método: texto extraído con pypdf; figuras vistas como imagen renderizada (PyMuPDF) en PDF 1, 5, 14, 17, 19, 20, 33. Las demás figuras no se inspeccionaron visualmente (marcado en cada caso).

## 1. Portada y metadatos

| Dato | Valor | Fuente |
|---|---|---|
| Título | "Retención Confiable - Concientización y Prevención de Objetos Caídos - Recomendaciones de mejores prácticas para el aseguramiento de equipos y herramientas en el lugar de trabajo" (inglés: DROPS Reliable Securing) | PDF 1 |
| Revisión | "REVISION 04" (cubierta); pie "DROPS Reliable Securing / Revision 4" | PDF 1, 2 |
| Fecha | "September 2017" (firma del prefacio) | PDF 2 (impr. 1) |
| Autor/organización | "DROPS Reliable Securing Workgroup"; contacto admin@dropsonline.org; www.dropsonline.org | PDF 1, 2 |
| Tipo de documento | **Estándar genérico de la industria (consenso DROPS)**, NO de una empresa ni de un cliente. Cita: "el contenido de este manual expresa el consenso de opinión de una amplia sección representativa de los miembros globales de DROPS, incluidos los fabricantes y las autoridades técnicas" | PDF 2 |
| Alcance | "Se aplica a todo el personal, las herramientas, los equipos y las estructuras asociadas con las actividades de diseño, suministro, transporte, instalación, mantenimiento, operación y desmantelamiento en toda la industria." Prefacio: "relevante y adaptable a todos los sectores" | PDF 4, 2 |
| Carácter normativo | Son recomendaciones, no requisitos legales: "Si bien puede ser impracticable adherirse a todas las recomendaciones, el contenido establece un estándar al que deberíamos aspirar." Además: "no afectan, reemplazan ni anulan los códigos, estándares, aprobaciones de tipo o recomendaciones de OEM aplicables" | PDF 4 |
| Aprobación | **No figura** quién lo aprueba (solo el grupo de trabajo como autor). No hay firmas ni control de versiones | (ausente) |
| No es catálogo | "Este folleto no es un catálogo de productos. Las imágenes de ejemplo se muestran solo con fines de orientación." | PDF 2 |
| Origen sectorial | Lenguaje muy orientado a offshore / petróleo y gas (cubierta, heliplataforma, movimiento del mar, "por la borda", subsea). Pulling/workover terrestre no se menciona | PDF 13, 14, 16, 20 |

Nota de traducción: el español es traducción (translator no identificado) con errores visibles ("Reliable Seuring", "Dropped Objects se encuentran presentando", tuercas "corona" = castellated nut, no "corona" del mástil, "pasteca de arrastre" = snatch block). PDF 20 conserva párrafos en inglés sin traducir.

## 2. Definiciones y clasificación

### 2.1 Términos DROPS (PDF 13 y 4)

- **Objeto caído (Dropped Object)**: "Cualquier artículo que se caiga o se caiga de su posición anterior que tenga el potencial de causar lesiones, muerte o daños al equipo/medio ambiente." (PDF 13, impr. 22-23)
- **Caída de objeto estático**: cae "por su propio peso debido a las fuerzas gravitatorias (es decir, sin ninguna fuerza aplicada)"; ej. corrosión o fijaciones inadecuadas. (PDF 13)
- **Caída de objeto dinámico**: cae "debido a la aplicación de una fuerza"; ej. impactos con equipos o cargas en movimiento, enganches, corrientes descendentes de helicópteros, clima severo. (PDF 13)
- **Fijación primaria (Primary Fixing)**: método principal de montaje (tornillos, pasadores, soldaduras...). **Retención secundaria (Secondary Retention)**: asegura la fijación primaria contra pérdida de fuerza de sujeción (arandelas de seguridad, alambre de seguridad, chavetas). **Aseguramiento de la seguridad (Safety Securing)**: mecanismo adicional al principal, "para evitar que el artículo o sus componentes caigan en caso de que falle la fijación principal" (redes, eslingas, cadenas, cables). (PDF 4)
- **Nota**: "NO se recomiendan las tuercas de seguridad dobles o las tuercas dobles como método confiable para retener cargas en pernos tensados." (PDF 4; repetido PDF 7 y PDF 15)
- **WLL** (límite de carga de trabajo) reemplaza a SWL; "siempre lo especifica el fabricante". (PDF 32, impr. 61)

### 2.2 Umbrales de energía / peso / altura: lo que el manual da y NO da

- **Calculadora DROPS** (PDF 14, impr. 24-25): gráfico "masa de un objeto que se deja caer contra la distancia que cae" para clasificar consecuencias. Lo visto en la imagen (figura rotada 90°): eje de altura de caída con marcas 1 m (3'3"), 10 m (33 ft), 100 m (328 ft); eje de masa con marcas de 0 a 10 kg (0 a 22 lb); cuatro bandas de color rotuladas **FAT (Fatality), LTI (Lost Time Incident), MTC (Medical Treat Case), FA (First Aid)**. **No hay tabla numérica ni valores de energía (J) en el texto**; la frontera entre bandas solo se lee aproximadamente a ojo de la curva. No usar cifras sacadas de ese gráfico sin la herramienta oficial (www.dropsonline.org, versiones métrica, imperial y electrónica).
- Supuestos declarados de la calculadora (PDF 14): objeto contundente (no vidrios/metal que perforen); EPP estándar (casco, botas, protección ocular); "No hay ningún requisito para restar la altura promedio de un individuo"; el cálculo asume que el objeto "golpea suelo sólido"; es guía, "no [es] una predicción precisa"; "incluso un objeto pequeño que cae desde una altura puede ser letal".
- **No hay definición de "altura de trabajo en altura"** (metros mínimos) en las págs. 1-34.
- Umbrales numéricos que SÍ aparecen (todos sobre herramientas/sujeciones):

| Valor | Contexto | Fuente |
|---|---|---|
| 5 kg / 11 lb | Corte entre secciones "Herramientas de sujeción <5kg" y ">5kg" (títulos) | PDF 25 y 26 (impr. 46-49); índice PDF 3 |
| 2 kg / 4,5 lb | "Las herramientas que pesen más de 2 kg / 4,5 lb no deben sujetarse al cuerpo, asegúrelas a la estructura del lugar de trabajo adyacente" (figura en ambas secciones) | PDF 25, 26 |
| 3 tornillos / 150 mm | Alambre de bloqueo: "No se debe unir más de tres tornillos y el espacio entre tornillos no debe exceder los 150 mm" | PDF 10 (impr. 16-17) |
| 6 meses | Equipo anticaída y equipo de evacuación: revisión "al menos cada 6 meses por una persona competente" | PDF 23, 24 |
| 12 meses / 5 años | Poleas, grilletes y cáncamos de elevación: inspección "al menos cada doce meses"; desmontaje de poleas "a petición de la persona competente o... fabricante, y al menos cada cinco años" | PDF 33 |
| WLL 100 / 70 / 50 % | Grilletes con carga lateral: en línea 100 %, 45° 70 %, 90° 50 % (texto de la figura; reducción "siempre consultar al fabricante") | PDF 32 |
| ~30 % / "casi la mitad" | Incidentes por diseño/técnico/mecánico vs factores humanos (Fuente DORIS) | PDF 13 |
| 30/20/12/11/6/5 % | Porcentajes junto a la lista de causas de falla de uniones atornilladas (Source: PSA, 2008). El emparejamiento con cada causa no está explícito (lista: uso/instalación inadecuados, vibración, golpes, sobrecarga, desgaste, corrosión); por orden sería 30/20/12/11/6/5 pero es inferencia | PDF 7 (impr. 10-11) |
| >= 85 estándares | "los pernos se fabrican según al menos 85 estándares industriales diferentes" | PDF 7 |

### 2.3 Categorías de objetos
No hay categorías por tipo de objeto más allá de estático/dinámico. Las 10 causas principales (PDF 13): evaluación de riesgos inadecuada; factores humanos; procedimientos inadecuados; dispositivos y accesorios fallidos (corrosión, vibración, mal diseño/instalación); limpieza deficiente; colisiones y enganches (elevación, equipo de viaje, líneas de etiqueta, bucles de servicio); inspección/mantenimiento inadecuados; herramientas y equipos redundantes/hechos en casa; herramientas y equipos mal almacenados/asegurados; factores ambientales (viento, mar, hielo, nieve).

## 3. Puntos de control / componentes del equipo (págs. 1-34)

Advertencia: en las págs. 1-34 **no hay ninguna sección específica de equipo de torre de pulling/workover** (no aparecen corona, mástil, tramos, plataforma del enganchador, elevadores, aparejo/travelling block ni cuadro de maniobras). Las palabras "corona" (tuerca corona), "torre de perforación" (solo evacuación) y "top drive" (solo un uso de pasador expandible) aparecen por otras razones. El índice (PDF 3) lista secciones posteriores (rejillas, barandas, luminarias, CCTV, cajas de conexiones, antenas, etc.) que caen en PDF 35+ (otro agente). Lo de abajo son puntos de control **genéricos** que el manual aplica a cualquier equipo en altura; su mapeo a piezas de la torre Equipo 10 sería inferencia.

| Punto de control | Ubicación en el equipo | Qué se controla | Frecuencia / responsable | Fuente (PDF pág.; impr.) |
|---|---|---|---|---|
| Uniones atornilladas críticas (tensión) | Cualquier unión estructural/mecánica en altura (el manual no la sitúa en la torre) | Retención secundaria: arandelas Wedge Lock, perfil de rosca con bloqueo, pasador de pivote expandible, tensores multitornillo. Precarga/torque según OEM. No usar doble tuerca | Selección: diseño/OEM/especialista; sin frecuencia dada | 7-8; 10-13 |
| Uniones atornilladas no críticas (corte) | Componentes auxiliares | Tuerca de nailon, tuerca metálica de bloqueo, tuerca corona/ranurada + chaveta, contratuerca, adhesivos. No reutilizar nailon ni contratuercas | Sin frecuencia | 9; 14-15 |
| Alambre de bloqueo / chavetas | Conexiones externas de maquinaria/equipos; grilletes | Máx. 3 tornillos y 150 mm; alambre inox; chavetas de un solo uso, inspeccionar con regularidad y reemplazar; evitar pasadores de clavija/clips R/seguros giratorios en izaje y en altura | "regularidad" sin cifra; personal competente capacitado (alambre) | 10; 16-17 |
| Dispositivos de seguridad (cables, cadenas, conectores) | Equipo instalado en altura sin retención secundaria integrada | Selección por peso, carga de impacto y oscilación; longitud lo más corta posible; AISI 316 (alambre 7x19 IWRC); conectores con cierre de rosca/autobloqueo y ojos cautivos; documentar lote, fabricante, año, fecha de instalación, carga de rotura mínima; no engarzar en sitio; no reutilizar los que sufrieron carga de choque | Documentar compra/instalación/inspección; sin frecuencia | 11; 18-19 |
| Redes y mallas de seguridad | Equipo fijado en altura de alto riesgo | Cierran completamente el equipo; inspección periódica; no comprometer equipo eléctrico ni el acceso de mantenimiento | "periódicamente" (sin cifra) | 12; 20-21 |
| Abrazaderas de cable (perrillos) | Terminaciones de cable de acero en izaje | No usar estilo Bull-dog/perno en U/aro en izaje; tipo de dos superficies de agarre; número y torque según fabricante | Según fabricante | 12; 20-21 |
| Elementos suspendidos y accesorios de izaje | Todo lo suspendido (contrapesos, mangueras, abrazaderas de viga, aparejos de cadena, ganchos de grúa y de aparejo, eslingas) | Registro de equipos de elevación (ID, WLL, fecha de entrada en servicio); certificación; estado (fatiga, corrosión, impacto); dimensionamiento; grilletes con chaveta; autoridad para cargas dejadas suspendidas | "inspeccionarse periódicamente" (sin cifra) | 31; 58-59 |
| Grilletes | Conexión en sistemas suspendidos | Identificables, WLL, inspección actualizada; 4 elementos (tuerca + chaveta inox) en izaje; 2 elementos nunca para suspensión permanente; evitar carga lateral; chavetas de longitud correcta y abiertas | Registro de inspección actualizado; código de color si se usa | 32; 60-61 |
| Poleas y "pasteca de arrastre" (snatch block), permanentes o temporales, en altura | En altura (ubicación exacta no dada; foto de polea con dispositivo de seguridad, impr. 62) | Dos barreras en accesorio de cabeza y eje (fijación primaria + retención secundaria); placas laterales que capturan la polea y la línea; solo grilletes de 4 elementos; marcado de ID y capacidad; tapas/protectores con retención secundaria; eslingas de seguridad a punto de anclaje independiente, certificadas, cortas | Inspección >= cada 12 meses por persona competente; desmontaje >= cada 5 años o a pedido/fabricante; programa de mantenimiento documentado | 33; 62-63 |
| Polea de rodillos (banana/umbilical) | Suspensión de umbilicales/mangueras | Dos barreras; rodillos con tornillo pasante + tuerca de seguridad/almenada + chaveta; no suspender cables con ella; eslingas >= WLL del accesorio de cabeza | Pruebas e inspecciones **anuales** según fabricante | 34; 64-65 |
| Herramientas manuales en altura (<5 kg) | Trabajador/estructura adyacente | Aptas para altura; aseguradas en transporte/uso/almacenaje; bolsa con bucles; anclaje a estructura preferiblemente sobre el nivel de trabajo; >2 kg a estructura, no al cuerpo; puntos de fijación documentados; conectores AISI 316; registro de herramientas | Registro de entrada/salida de herramientas; sin frecuencia | 25; 46-47 |
| Herramientas pesadas (>5 kg) | Estructura sobre el lugar de trabajo | Cables fijos y cortos (no absorbedores de energía que se estiren); anclaje a estructura, no a andamios ni tuberías; mazos de una pieza forjada; equipos de elevación certificados como dispositivo de seguridad | Inspección de cables según fabricante; registro | 26; 48-49 |
| Armarios de herramientas para altura | Área de trabajo | Herramientas aseguradas dentro; inventario certificado; bajo llave; cables, mosquetones con cierre de rosca, cinturones y bolsas | Un responsable designado; registra salidas/retornos con autoridad del Jefe de Área; revisión de contenido y registro **al final de cada turno** | 27; 50-51 |
| Equipos portátiles (radios, detectores de gas, cámaras) | Personal en altura | Bolsas de transporte; mosquetón con doble seguro; sin clips que se suelten al girar 180°; tapas de baterías aseguradas; si no es necesario, no subirlo | Sin frecuencia | 28; 52-53 |
| Piezas, herramientas y desechos en altura | Todo el sector elevado tras reparar o mantener | Inventario de lo llevado a altura; piezas pequeñas en cajas/bolsas; rejillas y huecos de rodapié cubiertos con esteras o redes; conteo final | Al terminar el trabajo | 29; 54-55 |
| Plataformas elevadoras móviles (PEMP) | Plataforma de trabajo elevada móvil | Equipo bajo altura de rodapié y asegurado; pantallas protectoras en rieles; sin equipo más allá de barandillas | Pantallas inspeccionadas antes del uso y al finalizar; conteo de inventario | 30; 56-57 |
| Equipo de evacuación de torre de perforación | Torre (arnés/cinturón, bloques/frenos, línea guía, puntos de fijación, cajas) | Certificados, controlados/etiquetados como anticaída; cajas aseguradas, tapas y pestillos en buen estado, sin objetos sobrantes | Cada 6 meses por persona competente, con fecha de próxima inspección marcada | 24; 44-45 |
| Equipo de detención de caídas del personal | Personal | Certificación, dispositivo antitrauma, verificación de compañero, punto de anclaje calificado (ej. OSHA), formación documentada y de rescate, no trabajar solo | Antes de **cada** uso; >= cada 6 meses por persona competente; fecha de próxima inspección en el equipo | 23; 42-43 |
| Zonas de acceso y barreras físicas | Áreas con riesgo de caída de objetos | Ver sección 4.3 | Definido por permiso de trabajo | 19; 34-35 |
| Aspectos a revisar antes de tarea / clima severo | Área de trabajo, cubierta, techos, cajas de almacenamiento, iluminación, heliplataforma, antenas, mangas de viento, sensores de viento, proyectores, andamios | Sujetadores, pernos, cubiertas, paneles, escotillas, barandas removibles, chavetas, alambre y arandelas de bloqueo; iluminación y accesorios con riesgo de enganche/colisión; tapas de cajas aseguradas; acumulación de agua/hielo | Antes de la tarea; "antes, durante y después" de clima adverso; aprovechar los cambios de turno | 20; 36-37 |

## 4. Métodos de aseguramiento, frecuencias, responsables, señalización

### 4.1 Jerarquía y barreras (PDF 4, 17-18)
- Fijación primaria + retención secundaria + aseguramiento de seguridad (definidos en 2.1). Regla: equipo en altura "debe tener una retención secundaria integrada"; si no es posible o hay riesgo de colisión, "cables o cadenas y conectores... bien sujetos a la estructura principal" (PDF 11, 18).
- Barreras (modelo queso suizo): revisión continua / procesales / técnicas / de personas (figura PDF 17, vista).
- Todo control nuevo (mallas, colchonetas, redes) puede caer y "estará sujeto a los procesos de Gestión de cambios" (PDF 16, impr. 28-29).
- Modificar equipos o métodos, aunque sea más seguro, "estarán sujetas a Gestión de Cambios" (PDF 4).

### 4.2 Inspecciones, encuestas y checklists
- **Encuesta independiente**: "generalmente se llevan a cabo anualmente"; genera Informe por áreas y zonas y un **Libro de inspección** para "inspecciones diarias, semanales y periódicas". "Los períodos de inspección deben determinarse en función de la probabilidad y las posibles consecuencias". Se actualiza con cada cambio; incluye equipo temporal y de terceros. (PDF 17, impr. 30-31). No se fijan intervalos concretos para diaria/semanal.
- **Lista de verificación de colisión**: debe estar "disponible en cada estación de control de equipos"; el operador la revisa antes de mover equipo (ej. grúa). (PDF 18, impr. 33)
- **Limpieza interna / verificación final**: revisión completa antes de iniciar y al finalizar el trabajo, "especialmente en altura"; recuento de inventario; guardar herramientas al final de cada turno. (PDF 19, 22)
- **Técnicas de observación** ("cazadores" de peligros): limitar el área, categorías (material suelto, paneles, iluminación, estructura corroída), hallazgos no rectificables se informan a la "Autoridad del Área" con descripción, consecuencia (Calculadora DROPS), causa y acción sugerida; seguimiento de todo lo informado. (PDF 21, impr. 38-39)
- **Tiempo fuera por seguridad**, reuniones/auditorías periódicas, comités de prevención, puntos focales. (PDF 18)
- **Mantenimiento preventivo**: sin intervalos numéricos. (PDF 18)

### 4.3 Zonas de exclusión y señalización (PDF 19, impr. 34-35; texto y figura vistos)
- **Zona de acceso restringido**: área con potencial de objeto caído, identificada en el permiso de trabajo operativo; entrada limitada al personal necesario; barricadas físicas y señalización.
- **Zona de Prohibición de Entrada**: p. ej. equipo en movimiento o personal trabajando en altura; "no se permite el ingreso de personal mientras el peligro esté presente o activo"; identificada en el permiso de trabajo y diferenciada de la anterior por barricadas y señalización.
- **Zona permanente**: barrera permanente ("Zona roja, Zona DROPS"), solo personal autorizado. **Zona temporal**: barrera temporal (cintas, cadenas de barrera, señalización).
- Aplican a todo el personal, incl. socios de servicio y proveedores. La clasificación se basa en operaciones habituales y puede cambiar temporalmente si cambia la operación. Puntos de acceso marcados; diagramas del sitio publicados en áreas comunes; letreros en inglés y en el idioma predominante local.
- **No define** distancias, radios ni dimensiones de zona; solo pide considerar el "cono de exposición" (trayectoria posible: desvíos, ambiente, factores dinámicos y forma del objeto) sin cifras (PDF 16, impr. 28).

### 4.4 Responsabilidades (PDF 15, impr. 26-27)
Todos: observación e intervención, eliminación, control (elementos bien sujetos), informes, diseño y adquisición, inspección "de todos los elementos de alto riesgo, en particular las cargas antes de levantarlas". Roles nombrados en el texto: Autoridad del Área / Jefe de Área / Líder de Área (PDF 21, 27), responsable del gabinete de herramientas (PDF 27), persona competente (PDF 23, 24, 33), Especialista Independiente de Encuestas (PDF 17), operador de equipo (PDF 18). No define cargos de una empresa concreta.
Prácticas desaconsejadas (PDF 15): equipos de elevación no certificados o caseros; herramientas hechas en casa; varillas de soldar/alambre/precintos en lugar de chavetas; grilletes de dos partes en suspensión permanente; doble tuerca en tornillos tensados; herramientas manuales sin asegurar en altura; eslingas de alambre atadas a vigas; cargas suspendidas sin autorización; andamios para estructuras permanentes; dejar dispositivos anticaída sin retraer.

### 4.5 Factores ambientales (PDF 16, 20)
Temperatura, viento y corrientes descendentes de helicóptero, movimiento del mar, movimiento de carga en transporte, hielo y nieve, lluvia (acumulación de peso en baldes), barro y arena, poca visibilidad. Rutinas de inspección antes/durante/después de clima adverso (PDF 20). Sin umbrales de viento.

## 5. Figuras y diagramas

| PDF pág. (impr.) | Qué muestra | Inspección visual |
|---|---|---|
| 1 | Portada con collage de 15 fotos (perrillos, mosquetones, grilletes, tuerca corona, eslingas, gráfico de calculadora, cables, red de malla, etc.) y logo DROPS | Sí |
| 5 (6-7) | "Oportunidades típicas del ciclo de vida": tablero circular Diseño, Fabricación, Embalaje, Transporte por ruta, Muelle, Transporte por mar, Instalación/puesta en marcha, Operación, Mantenimiento/reparación, Descomponer/desmantelar | Sí |
| 6 (8-9) | Tabla de serie galvánica (metales de grafito/titanio a magnesio) y esquema perno/inox/zinc con ánodo-cátodo | No (solo texto) |
| 7-12 | Fotos de tipos de arandelas, tuercas, chavetas, alambre de bloqueo, red y perrillo de hierro | No (solo texto) |
| 14 (24-25) | Gráfico Calculadora DROPS (masa vs altura; bandas FAT/LTI/MTC/FA) | Sí |
| 17 (30-31) | Modelo queso suizo de barreras; muestra de Informe de encuesta y libro de imágenes (fotos de una torre/instalación con tablas) | Sí (fotos de baja legibilidad) |
| 19 (34-35) | Sin diagrama de zonas; solo cuadros de texto con bordes rojos y foto de herramientas dispersas en "limpieza interna" | Sí |
| 20 (36-37) | Fotos: eslinga de amarre con mosquetones y caja de almacenamiento con tapa asegurada | Sí |
| 23-30 | Fotos de arneses, bolsas, gabinete, formato "REGISTRO DE HERRAMIENTAS EN ALTURA" (columnas: Fecha, Descripción de hta/equipo, Nombre autorizado (Líder de Área), Hs.; bloques "control de herramientas que salen" y "verificación de herramientas de regreso"), manta de seguridad, PEMP | No (solo texto; el formato del registro es del texto extraído en PDF 27) |
| 31 (58-59) | Fotos "MALA SELECCIÓN DE ABRAZADERA" y "DISPOSITIVO DE IZAJE CASERO", suspensión de manguera "no es la mejor práctica" | No (solo texto de leyendas) |
| 32 (60-61) | Esquema de reducción de WLL de grillete: en línea 100 %, 45° 70 %, 90° 50 % | No (solo texto) |
| 33 (62-63) | Foto "Polea con dispositivo de seguridad" (polea colgada en una estructura de rejilla amarilla/roja) | Sí |
| 34 (64-65) | Conjunto de polea de rodillos (foto) | No |

Ninguna figura de las págs. 1-34 muestra un esquema de torre/mástil ni posiciones de puntos de control DROPS sobre un equipo de perforación/pulling.

## 6. Lo que el manual (págs. 1-34) NO define. No inventar

1. Mapa o lista de puntos de control por parte de una torre (corona, mástil/tramos, plataforma del enganchador, aparejo/travelling block, elevadores, cuadro, luminarias específicas). Solo hay reglas genéricas y "poleas y pastecas en altura".
2. Alturas mínimas de "trabajo en altura", distancias de zonas de exclusión, radios del cono de exposición, umbrales de viento.
3. Tabla de energía (J) o umbrales numéricos de severidad; la Calculadora es solo gráfica.
4. Frecuencias de inspección diaria/semanal/mensual de puntos fijos (solo: anual para encuestas y poleas de rodillos, 12 meses poleas/grilletes/cáncamos, 6 meses anticaída/evacuación, cada turno para armarios de herramientas y registro, antes de cada uso para anticaída).
5. Modelo de checklist de inspección de estructura (solo el formato de registro de herramientas y menciones de "libro de inspección" y "lista de colisión").
6. Quién aprueba el documento, nombres de cargos de una empresa concreta, o adopción por la empresa o cliente alguno.
7. Nada específico de pulling/workover terrestre; el marco es genérico y con sesgo offshore.

## 7. Dudas / puntos a verificar

- Los porcentajes 30/20/12/11/6/5 de PDF 7 no se pueden emparejar con certeza a cada causa sin ver la figura (no inspeccionada visualmente).
- Las cifras del gráfico de la Calculadora deben tomarse de la herramienta oficial, no del gráfico impreso.
- Las páginas 35-67 (otro agente) contienen las secciones de barandas, rodapiés, iluminación, cajas, etc., que podrían ser más directas para el visor de la torre.
