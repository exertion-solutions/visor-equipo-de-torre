import type { Component, Rig } from '@/types'

/** Componentes del modelo de referencia SK-575 (cad/sk575, un GLB por id en el marco de la boca de pozo). */
export const SK575_EQUIPO_IDS = [
  'sk575_mastil',
  'sk575_carrier',
  'sk575_cuadro',
  'sk575_izaje',
  'sk575_aparejo',
  'sk575_bop',
  'sk575_llave',
  'sk575_piso',
] as const
export const SK575_LOCACION_IDS = [
  'sk575_planchada',
  'sk575_tiros',
  'sk575_vientos',
  'sk575_pozo_vecino',
  'sk575_piletas',
  'sk575_manifold',
  'sk575_bomba',
  'sk575_acumulador',
] as const
export const SK575_IDS = [...SK575_EQUIPO_IDS, ...SK575_LOCACION_IDS] as const

const NO_AS_BUILT = 'Modelo de referencia, no as-built ni apto para fabricación o cálculo.'

type Spec = Component['specifications'][number]
const spec = (
  key: string,
  label: string,
  value: Spec['value'],
  confidence: Spec['confidence'],
  sourceId: string,
  unit?: string,
): Spec =>
  unit === undefined
    ? { key, label, value, confidence, sourceId }
    : { key, label, value, unit, confidence, sourceId }

const sk575 = (
  id: (typeof SK575_IDS)[number],
  name: string,
  family: Component['family'],
  sourceIds: string[],
  scope: string,
  specifications: Spec[],
): Component => ({
  id,
  rigId: 'RIG-10',
  name,
  family,
  // Geometría siempre C (modelo de referencia); la confianza de cada dato va en su especificación.
  confidence: 'C',
  sourceIds: [...sourceIds, 'src-modelo-sk575'],
  scope: `${NO_AS_BUILT} ${scope}`,
  model: `/models/rig10/${id}.glb`,
  specifications,
})

/** Cilindro de izaje del Parts & Service Manual SK575 (p233-251): conflicto registrado, no usado (C11). */
const cilManual = (value: string | number) => ({
  sourceId: 'src-parts-sk575',
  value,
  note: 'Parts & Service Manual SK575 p233-251 (Mast): plano de otro mástil/variante del manual; manda src-plano-hyco por decisión del usuario 2026-10-11',
})

const SK575_COMPONENTS: Component[] = [
  sk575(
    'sk575_mastil',
    'Mástil SK DKA104-330-08 (modelo SK-575)',
    'mast',
    ['src-placa-api', 'src-plano-8123', 'src-manual-derrick', 'src-sk575-spec'],
    'Cotas generales documentadas (altura, piso de enganche, inclinación 3,5°, base a 4 ft, pozo a 76" del pie del mástil); perfiles, paneles, uniones y corona estimados. Los 76" se leen desde el pie/bisagra del mástil (no desde la cara delantera del reticulado): así la corona queda centrada sobre el reticulado y a plomo del pozo (interpretación, informe C6). No verifica la carga de placa.',
    [
      spec('model', 'Modelo', 'SK DKA104-330-08', 'A', 'src-placa-api'),
      spec('serial', 'N.º de serie', 'DK-3033', 'A', 'src-placa-api'),
      spec('designLines', 'Líneas de diseño (placa)', 8, 'A', 'src-placa-api'),
      spec(
        'staticHookLoadLb',
        'Carga estática máx. con vientos (a 3,5°)',
        325725,
        'A',
        'src-placa-api',
        'lb',
      ),
      spec('leanDeg', 'Inclinación de trabajo', 3.5, 'A', 'src-placa-api', '°'),
      spec('baseHeightM', 'Base montada sobre el suelo (4 ft)', 1.2192, 'A', 'src-placa-api', 'm'),
      spec('heightM', 'Altura (104 ft)', 31.71, 'A', 'src-plano-8123', 'm'),
      {
        // B (no A) solo porque el schema no admite A con conflicto; el valor del plano es el documentado.
        ...spec('rackingBoardM', 'Piso de enganche (68 ft)', 20.629, 'B', 'src-plano-8123', 'm'),
        conflicts: [
          {
            sourceId: 'src-legacy-v2',
            value: 18.5,
            note: 'boardHeight del V2 procedural previo (retirado 2026-10-11)',
          },
        ],
      },
      spec(
        'cota18401M',
        'Cota 18.401 mm (60 ft, significado no confirmado)',
        18.401,
        'C',
        'src-plano-8123',
        'm',
      ),
      // Interpretación (informe SK-575, C6, 2026-10-11): 76" desde el pie/bisagra del mástil, no desde la cara delantera.
      spec(
        'wellFromFrontLegM',
        'Pozo desde el pie del mástil (76", eje de la bisagra)',
        1.9304,
        'B',
        'src-manual-derrick',
        'm',
      ),
      spec(
        'crownSheaves',
        'Poleas de corona',
        '4 × 24" + 30" (línea rápida)',
        'B',
        'src-sk575-spec',
      ),
    ],
  ),
  sk575(
    'sk575_carrier',
    'Carrier Service King SK-575',
    'carrier',
    ['src-sk575-spec', 'src-parts-sk575', 'src-manual-rigup', 'src-layout-ws10'],
    'Bastidor, 5 ejes, cabina, motor, tanques, gatos y T-sill a partir de cotas medidas sobre la vista CAD del Parts Manual (sin contrastar); detalles estimados.',
    [
      spec('model', 'Modelo', 'Service King SK-575', 'A', 'src-sk575-spec'),
      spec('axles', 'Ejes', 5, 'A', 'src-sk575-spec'),
      spec('roadHeightM', 'Alto en ruta (14 ft 1")', 4.2926, 'A', 'src-sk575-spec', 'm'),
      spec('roadWidthM', 'Ancho en ruta (9 ft 6")', 2.8956, 'A', 'src-sk575-spec', 'm'),
      spec('roadLengthM', 'Largo en ruta con mástil (68 ft)', 20.7264, 'A', 'src-sk575-spec', 'm'),
      spec('roadWeightLb', 'Peso en ruta', 97000, 'A', 'src-sk575-spec', 'lb'),
      {
        ...spec('wheelbaseFt', 'Distancia entre ejes', 43, 'B', 'src-sk575-spec', 'ft'),
        conflicts: [
          {
            sourceId: 'src-parts-sk575',
            value: '≈ 30 ft entre primer y último eje',
            note: 'Ejes medidos en X 74,7 / 124,6 / 327,9 / 381,9 / 435,6" desde el frente del bastidor',
          },
        ],
      },
      spec('frameLengthM', 'Bastidor (480")', 12.192, 'B', 'src-parts-sk575', 'm'),
      spec('frameWidthIn', 'Ancho del bastidor', 102, 'B', 'src-parts-sk575', 'in'),
      spec('deckHeightM', 'Altura de cubierta (53")', 1.3462, 'C', 'src-parts-sk575', 'm'),
      spec('cabWidthIn', 'Cabina de un solo hombre (ancho)', 33, 'C', 'src-parts-sk575', 'in'),
      spec(
        'levelingJacks',
        'Gatos de nivelación',
        'X 163" y X 479" desde el frente',
        'C',
        'src-parts-sk575',
      ),
      spec('engine', 'Motor', 'Detroit Series 60 475 HP', 'A', 'src-sk575-spec'),
      spec('transmission', 'Transmisión', 'Allison 4500 OFS', 'A', 'src-sk575-spec'),
      spec(
        'tSillFromWellM',
        'T-sill 8 ft: zapatas desde el pozo (6 ft)',
        1.8288,
        'B',
        'src-manual-rigup',
        'm',
      ),
      spec('equipoABocaM', 'Equipo a la boca de pozo', 1.3, 'A', 'src-layout-ws10', 'm'),
    ],
  ),
  sk575(
    'sk575_cuadro',
    'Cuadro de maniobras SK-575',
    'hoisting',
    ['src-sk575-spec', 'src-parts-sk575'],
    'Tambores, discos y embragues con las medidas de la spec sheet; posición medida del Parts Manual (C); consola y líneas a la corona ilustrativas.',
    [
      spec('mainDrum', 'Tambor principal', '42 × 12" (barril 16" × 38,75")', 'A', 'src-sk575-spec'),
      spec(
        'sandDrum',
        'Tambor de pistoneo',
        '42 × 8" (barril 16" × 43,75")',
        'A',
        'src-sk575-spec',
      ),
      spec('discAssistIn', 'Disco asistente doble', 48.5, 'A', 'src-sk575-spec', 'in'),
      spec(
        'clutches',
        'Embragues',
        '24" triple (324) principal · 224 pistoneo',
        'A',
        'src-sk575-spec',
      ),
      spec('shafts', 'Ejes', '6,6" principal · 5,9" pistoneo', 'A', 'src-sk575-spec'),
      spec('sandLine', 'Cable de pistoneo', '14.400 ft de 9/16"', 'A', 'src-sk575-spec'),
      spec('drive', 'Transmisión', 'Doble cadena 140', 'A', 'src-sk575-spec'),
      spec(
        'positions',
        'Posición de tambores',
        'X 332" / 273" desde el frente',
        'C',
        'src-parts-sk575',
      ),
    ],
  ),
  sk575(
    'sk575_izaje',
    'Cilindros de izaje HYCO (×2)',
    'mast',
    ['src-plano-hyco'],
    'Cilindros con las cotas del plano HYCO; puntos de anclaje en carrier y mástil estimados.',
    [
      // B (no A) solo porque el schema no admite A con conflicto: manda el plano HYCO del equipo (decisión del usuario
      // 2026-10-11); el Parts & Service Manual SK575 (p233-251, Mast) muestra otro cilindro (informe SK-575, C11).
      {
        ...spec('model', 'Modelo', 'HYCO 50162-813-13150 (SK DK50162)', 'B', 'src-plano-hyco'),
        conflicts: [cilManual('HYCO 50163-933-177')],
      },
      spec('count', 'Cantidad', 2, 'A', 'src-plano-hyco'),
      {
        ...spec('stagesIn', 'Etapas (Ø)', '8,12 / 7,00 / 4,00"', 'B', 'src-plano-hyco'),
        conflicts: [cilManual('9,38 / 8,12 / 5,00"')],
      },
      spec('barrelIn', 'Camisa (Ø)', 9.42, 'A', 'src-plano-hyco', 'in'),
      {
        ...spec('closedIn', 'Largo cerrado', 60, 'B', 'src-plano-hyco', 'in'),
        conflicts: [cilManual(82.56)],
      },
      {
        ...spec('extendedIn', 'Largo extendido', 191.5, 'B', 'src-plano-hyco', 'in'),
        conflicts: [cilManual(259.68)],
      },
      {
        ...spec('strokeIn', 'Carrera (42,82 + 44,07 + 44,62)', 131.5, 'B', 'src-plano-hyco', 'in'),
        conflicts: [cilManual(177.12)],
      },
      spec('extendForceLb', 'Fuerza a 2.000 psi', 103697, 'A', 'src-plano-hyco', 'lb'),
    ],
  ),
  sk575(
    'sk575_aparejo',
    'Aparejo, amelas y elevador',
    'hoisting',
    ['src-placa-api', 'src-folleto', 'src-insp-sop1110'],
    'Se dibujan 8 líneas (diseño de placa); el enhebrado operativo está en conflicto con el folleto (6). Reeving esquemático. Aspecto del aparejo-gancho (guarda con franjas) y del elevador de cierre central según fotos de catálogo (C); amelas y paso del elevador de la planilla SOP 1110.',
    [
      {
        ...spec('lines', 'Líneas', 8, 'B', 'src-placa-api'),
        conflicts: [
          {
            sourceId: 'src-folleto',
            value: 6,
            note: 'La placa es la capacidad de diseño del mástil; el enhebrado operativo puede ser 6',
          },
        ],
      },
      spec('blockCapacityT', 'Aparejo', 110, 'A', 'src-folleto', 't'),
      spec('links', 'Amelas', '150 t, Ø 3", largo útil 73"', 'A', 'src-insp-sop1110'),
      spec(
        'elevator',
        'Elevador de cierre central',
        'Paso 3-7/32" (tubing 2-7/8"), asas 2-29/32" / 2-7/8"',
        'A',
        'src-insp-sop1110',
      ),
      spec('elevatorCapacityT', 'Elevador (folleto)', 100, 'A', 'src-folleto', 't'),
    ],
  ),
  sk575(
    'sk575_bop',
    'Stack BOP estándar 7-1/16" (ram simple, cruz, doble ram + shear, anular) con líneas de choke y kill',
    'well-control',
    ['src-plano-bop-8127', 'src-folleto', 'src-manual-bop-11'],
    'Alturas de los 5 tramos rotuladas en el plano 8127-1110-004; anchos, bonetes y líneas medidos sobre el plano (C). Base a nivel de terreno con cabezal en sótano; bonetes y volantes de los rams hacia los laterales de la subestructura, choke hacia la puerta en V y kill hacia el mástil: interpretación pendiente de relevar.',
    [
      {
        ...spec(
          'nominalBore',
          'Diámetro nominal / presión',
          '7-1/16" · rams 10.000 psi · anular 5.000 psi',
          'B',
          'src-plano-bop-8127',
        ),
        conflicts: [
          {
            sourceId: 'src-folleto',
            value: '7-1/16" 5.000 psi',
            note: 'Mismo diámetro; el folleto da 5.000 psi para el conjunto. El plano es el estándar de flota WS: confirmar con la placa del BOP instalado',
          },
          {
            sourceId: 'src-manual-bop-11',
            value: '11" 5.000 psi',
            note: 'Manuales de otra unidad; el modelo 3D ya no usa 11" (C2 cerrado por el plano 8127)',
          },
        ],
      },
      spec(
        'stackHeightM',
        'Alto del stack (tramos 0,792 · 0,760 · 1,232 · 0,127 · 0,815; las parciales suman 3,726)',
        3.731,
        'A',
        'src-plano-bop-8127',
        'm',
      ),
      spec('accumulatorBottles', 'Acumulador (botellas)', 5, 'A', 'src-folleto'),
      spec(
        'killChokeLines',
        'Líneas de choke / kill',
        'Choke 3-1/16" 10k (HCR + manual) · Kill 2-1/16" 10k (manuales + retenciones, WECO 1502 / 602)',
        'B',
        'src-plano-bop-8127',
      ),
    ],
  ),
  sk575(
    'sk575_llave',
    'Llave hidráulica Gill Model 500 con backup, llave manual y grampa de seguridad',
    'workfloor',
    ['src-manual-gill-500'],
    'Cotas de envolvente del manual Gill 500 (misma especificación que la Westco 58-93R); forma medida sobre la ilustración del manual y detalle según fotos de catálogo (C). Llave manual tipo B con colgador y grampa AOT A-MP-S (7 eslabones, 2-7/8"–4-1/8") como referencia de catálogo, no relevadas en el TKR-10. Color real pendiente.',
    [
      spec('tongLengthIn', 'Largo de la llave', 51, 'A', 'src-manual-gill-500', 'in'),
      spec(
        'spaceOnPipeIn',
        'Espacio sobre el caño (llave / con backup)',
        '9-1/2 / 16-1/2',
        'A',
        'src-manual-gill-500',
        'in',
      ),
      spec('sizeRange', 'Rango de diámetros', '1-5/16" a 7"', 'A', 'src-manual-gill-500'),
      spec(
        'torqueFtLb',
        'Torque a 2.000 psi (alta / baja)',
        '1.300 / 6.000',
        'A',
        'src-manual-gill-500',
        'ft·lb',
      ),
      spec('liftStrokeFt', 'Carrera del cilindro de izaje', 6, 'A', 'src-manual-gill-500', 'ft'),
    ],
  ),
  sk575(
    'sk575_piso',
    'Piso de pulling, subestructura y escaleras',
    'workfloor',
    ['src-plano-8123', 'src-planos-piso', 'src-plano-escalera', 'src-folleto', 'src-legacy-v2'],
    'Piso y escalera con cotas de los planos de la empresa; subestructura y uniones estimadas.',
    [
      {
        ...spec('floorHeightM', 'Altura del piso (12 ft)', 3.606, 'B', 'src-plano-8123', 'm'),
        conflicts: [
          {
            sourceId: 'src-folleto',
            value: 3,
            note: 'Altura del modelo del folleto (regulable 1 a 4 m)',
          },
          {
            sourceId: 'src-legacy-v2',
            value: 2.3,
            note: 'Valor del V2 procedural previo (retirado 2026-10-11)',
          },
        ],
      },
      spec(
        'sizeMm',
        'Largo × ancho',
        '2.600 × 3.304 mm (2.300 central + 2 × 500 laterales)',
        'A',
        'src-planos-piso',
      ),
      spec('wellOpeningMm', 'Abertura de pozo', '730 × 700 mm', 'A', 'src-planos-piso'),
      spec('rvbPanelMm', 'Panel RVB', '1.100 × 680 mm', 'A', 'src-planos-piso'),
      spec('weightKg', 'Peso del conjunto', 1400, 'A', 'src-planos-piso', 'kg'),
      spec(
        'structure',
        'Estructura',
        'UPN 100 + chapa semilla de melón 3/16"',
        'A',
        'src-planos-piso',
      ),
      spec(
        'stair',
        'Escalera',
        '45°, alzada 180 mm, ancho 800/1000 mm, largueros C 180×50×4,76, 305 kg',
        'A',
        'src-plano-escalera',
      ),
    ],
  ),
  sk575(
    'sk575_planchada',
    'Planchada, rampa y caballetes',
    'auxiliary',
    ['src-layout-ws10', 'src-layout'],
    'Huella del layout WS10; rampa, caballetes y línea HP ilustrativos.',
    [
      {
        ...spec('catwalkM', 'Planchada', '12 × 2 m', 'B', 'src-layout-ws10'),
        conflicts: [{ sourceId: 'src-layout', value: '12 × 2,4 m' }],
      },
    ],
  ),
  sk575(
    'sk575_tiros',
    'Tiros de tubing (ilustrativo)',
    'auxiliary',
    ['src-insp-sop1110'],
    'Ilustrativo: cantidad y disposición no documentadas.',
    [spec('tubingIn', 'Tubing de referencia (elevador)', '2-7/8"', 'B', 'src-insp-sop1110')],
  ),
  sk575(
    'sk575_vientos',
    'Vientos, anclajes y pirosalva',
    'anchoring',
    ['src-placa-api', 'src-layout-ws10', 'src-layout', 'src-folleto'],
    'Anclajes ubicados según el layout WS10; la distancia está en conflicto entre fuentes. No es un diseño de anclaje ni distancia de exclusión.',
    [
      spec(
        'guyLines',
        'Vientos (placa, EEIPS)',
        'A1 3/4", A2 9/16", B1 5/8", B2 9/16", C1 5/8", H 9/16"',
        'A',
        'src-placa-api',
      ),
      {
        ...spec(
          'anchorDistance',
          'Anclajes desde el pozo',
          '27,4 ± 3 m (lado carrier) / 24,4 ± 3 m (lado V)',
          'B',
          'src-layout-ws10',
        ),
        conflicts: [
          { sourceId: 'src-layout', value: '25 ± 3 m' },
          { sourceId: 'src-folleto', value: '20 m' },
          { sourceId: 'src-placa-api', value: '94 ft (28,7 m) / 82 ft (25 m); 68 ft laterales' },
        ],
      },
      spec('anchorLateralM', 'Anclajes laterales', '± 26,8 m', 'A', 'src-layout-ws10'),
      spec('flareM', 'Pirosalva desde el pozo', 45, 'A', 'src-layout-ws10', 'm'),
    ],
  ),
  sk575(
    'sk575_pozo_vecino',
    'Pozo vecino (árbol de navidad, ilustrativo)',
    'well-control',
    ['src-layout-ws10'],
    'Ilustrativo: ubicación y equipo del pozo vecino no documentados.',
    [],
  ),
  sk575(
    'sk575_piletas',
    'Piletas (preparación, circulación, ensayo) y trip tank',
    'circulation',
    ['src-plano-piletas', 'src-layout-ws10'],
    'Piletas con las cotas del plano; accesorios internos y trip tank ilustrativos.',
    [
      spec(
        'count',
        'Piletas',
        '3 (preparación, circulación, ensayo) + trip tank',
        'A',
        'src-layout-ws10',
      ),
      spec('skidMm', 'Patín', '12.000 × 2.400 mm', 'A', 'src-plano-piletas'),
      spec('tankMm', 'Cuba', '11.000 × 2.300 mm', 'A', 'src-plano-piletas'),
      spec('heightMm', 'Alto', 1742, 'A', 'src-plano-piletas', 'mm'),
      spec(
        'compartments',
        'Compartimentos',
        '4.500 / 4.500 / 2.000 mm (15,5 / 15,5 / 7 m³)',
        'A',
        'src-plano-piletas',
      ),
    ],
  ),
  sk575(
    'sk575_manifold',
    'Manifold de ahogo M1–M12 y líneas',
    'well-control',
    ['src-esquema-ahogo', 'src-choke-b20', 'src-layout-ws10'],
    'Disposición según esquema sin identificar; escala tomada de un manifold de otro equipo (TKR-08). No es el manifold del TKR-10.',
    [
      spec('valves', 'Válvulas', 'M1–M12', 'C', 'src-esquema-ahogo'),
      spec(
        'scaleRef',
        'Referencia de escala (NO es el del TKR-10)',
        'Thrubore B20-9908 3-1/16" 15M',
        'C',
        'src-choke-b20',
      ),
      spec('ventM', 'Venteo desde el pozo', 70, 'A', 'src-layout-ws10', 'm'),
    ],
  ),
  sk575(
    'sk575_bomba',
    'Bomba triplex',
    'circulation',
    ['src-layout-ws10'],
    'Huella del layout; bomba y motor ilustrativos.',
    [spec('footprintM', 'Huella', '6 × 2,4 m', 'A', 'src-layout-ws10')],
  ),
  sk575(
    'sk575_acumulador',
    'Acumulador BOP',
    'well-control',
    ['src-layout-ws10', 'src-folleto', 'src-ref-rigmfg-4650'],
    'Huella del layout y 5 botellones a 3.000 psi del folleto. Botellones, selectoras de 4 vías, reguladoras, manómetros, bombas y depósito dibujados según una unidad de cierre API 16D de referencia (CPC S/N 4650): modelo genérico, no el equipo instalado.',
    [
      spec('footprintM', 'Huella', '8 × 2,4 m', 'A', 'src-layout-ws10'),
      spec('bottles', 'Botellas', 5, 'A', 'src-folleto'),
      spec('workingPressurePsi', 'Presión de trabajo', 3000, 'A', 'src-folleto', 'psi'),
      spec(
        'refBottle',
        'Botellón de referencia (NO es el del TKR-10)',
        '11 gal, vejiga, carga superior, 3.000 psi, precarga 1.000 psi',
        'C',
        'src-ref-rigmfg-4650',
      ),
      spec(
        'refBottleSizeM',
        'Ø × largo del botellón dibujado (derivado de 11 gal y del plano p17)',
        '0,236 × 1,30 m',
        'C',
        'src-ref-rigmfg-4650',
      ),
      spec(
        'refSelectorValve',
        'Selectoras de referencia',
        '1" 4 vías / 3 posiciones, sello de corte rotativo, 3.000 psi',
        'C',
        'src-ref-rigmfg-4650',
      ),
      spec(
        'refReliefPsi',
        'Alivio de referencia (tarado)',
        3300,
        'C',
        'src-ref-rigmfg-4650',
        'psi',
      ),
    ],
  ),
]

/**
 * Equipo 10 (Pulling): datos del rig para el motor nativo.
 * Las envolventes 3D salen de `cad/` (CadQuery, confianza C): NO son as-built. Cada cota lleva su
 * fuente; lo que no está acotado en el documento queda fuera de `specifications` (ver `cad/*.meta.json`
 * y `cad/README.md` para los pendientes).
 */
export const RIG10_RIG: Rig = {
  id: 'RIG-10',
  name: 'Equipo 10',
  service: 'Pulling',
  sources: [
    {
      id: 'src-folleto',
      kind: 'brochure',
      title: 'Folleto Equipo 10 Pulling',
      ref: 'docs/fuentes/rig10/FOLLETO EQUIPO 10 PULLING REVDJL26062024.pdf, p. 2-3',
      revision: '26/06/2024',
      verified: true,
    },
    {
      id: 'src-layout',
      kind: 'layout',
      title: 'Layout TKR-10',
      ref: 'docs/fuentes/rig10/LAYOUT - TKR-10.pdf (cotas rotuladas y geometría vectorial)',
      verified: true,
    },
    {
      id: 'src-legacy-v2',
      kind: 'estimate',
      title: 'Visor V2 (legacy-ext/30-carrier.js)',
      ref: 'Alturas del piso de trabajo (2,30 m) y del piso de enganche (boardHeight 18,5 m) del modelo procedural, retirado del V2 el 2026-10-11; no es una fuente documental',
      verified: false,
    },
    // Relevamiento 2026-10-09 (Service King SK-575). Los documentos NO se suben al repo (repo público,
    // planos con reproducción prohibida): `ref` cita ruta/código. `verified: false` = transcripción o
    // medición de un agente sin contrastar contra el original.
    {
      id: 'src-placa-api',
      kind: 'manufacturer',
      title: 'Placa de certificación del mástil SK DKA104-330-08 S/N DK-3033 (API 4F)',
      ref: "X:\\Mantenimiento WS\\Inspecciones No Destructivas\\…\\COC's - Trazabilidad\\Equipos\\Rig TKR-10\\COC\\Placa identificadora Rig TKR-10.pdf + Engineering Report p19 (foto de la placa)",
      verified: true,
    },
    {
      id: 'src-sk575-spec',
      kind: 'manufacturer',
      title: 'Service King SK-575 Specification Sheet (Dec-14) + folleto SK 575',
      ref: "X:\\Mantenimiento WS\\Inspecciones No Destructivas\\…\\COC's - Trazabilidad\\Equipos\\Rig TKR-10\\COC\\SK-575-SpecificationSheet_Dec-14.pdf; Service King Manufacturing - SK 575.pdf",
      revision: 'Dec-14',
      verified: true,
    },
    {
      id: 'src-plano-8123',
      kind: 'layout',
      title: 'Plano 8123-1002-2611 "Equipo TKR10" (en SK Engineering Report 9-ago-2021 p4)',
      ref: "X:\\Mantenimiento WS\\Inspecciones No Destructivas\\…\\COC's - Trazabilidad\\Equipos\\Rig TKR-10\\COC\\SK_Rig-10_EngineeringReport.pdf p4",
      revision: 'rev 1, 26/11/2020',
      verified: true,
    },
    {
      id: 'src-planos-piso',
      kind: 'layout',
      title:
        'Planos piso pulling TKR10 8114-1006-0200 (conjunto), -0201 (central), -0210 (lateral ×2), -0212 (panel RVB)',
      ref: 'X:\\Mantenimiento WS\\Planos Tecnicos\\TKR-10\\',
      verified: true,
    },
    {
      id: 'src-plano-escalera',
      kind: 'layout',
      title: 'Plano Escalera Pulling (TKR11, mismo diseño)',
      ref: 'X:\\Mantenimiento WS\\Planos Tecnicos\\TKR-10\\EscaleraPisoPulling.pdf',
      verified: true,
    },
    {
      id: 'src-plano-hyco',
      kind: 'manufacturer',
      title: 'Plano HYCO 50162-813 "CYL, SATEL W/LAST STAGE DA" (Service King DK50162)',
      ref: 'X:\\Mantenimiento WS\\Manuales\\CD ServiceKingManufacturing\\Operations Manual SK 575\\06 - HYDRAULICS INFORMATION\\PISTON TKR 10 - IZAJE.pdf',
      verified: true,
    },
    {
      id: 'src-manual-derrick',
      kind: 'manufacturer',
      title: 'Operations Manual SK 575 — 08 Derrick Information 3 (hoja de cargas DKA104-330-08)',
      ref: 'X:\\Mantenimiento WS\\Manuales\\CD ServiceKingManufacturing\\Operations Manual SK 575\\08 - DERRICKS INFORMATION\\DERRICK INFORMATION 3.pdf p5-6, p59-61',
      verified: false,
    },
    {
      id: 'src-manual-rigup',
      kind: 'manufacturer',
      title: 'Operations Manual SK 575 — 02 Rig Up Information',
      ref: 'X:\\Mantenimiento WS\\Manuales\\CD ServiceKingManufacturing\\Operations Manual SK 575\\02 - RIG UP PROCEDURES\\RIG UP INFORMATION - WARNING, CAUTIONS, AND NOTES.pdf p2-6',
      verified: false,
    },
    {
      id: 'src-parts-sk575',
      kind: 'manufacturer',
      title:
        'SK575 Parts & Service Manual — vista lateral dwg 03.06.01.01 (p23) y bastidor 03.02.01.01 (p19); cotas MEDIDAS sobre la vista CAD (±2" largos, ±4" alturas)',
      ref: 'X:\\Mantenimiento WS\\Manuales\\CD ServiceKingManufacturing\\SK575 PARTS & SERVICE MANUAL.pdf (escala calibrada con ancho 102", baranda 42", brida 42")',
      verified: false,
    },
    {
      id: 'src-insp-sop1110',
      kind: 'procedure',
      title:
        'Planillas de inspección SOP 1110 (API RP 8B / SPEC 8C): amelas 150 t y elevador de cierre central — APROBADA',
      ref: 'Imágenes provistas por el usuario 2026-10-09',
      verified: true,
    },
    {
      id: 'src-manual-gill-500',
      kind: 'manufacturer',
      title:
        'Gill Services Model 500 / 500HT — manual de la llave hidráulica (especificaciones p6-7)',
      ref: 'C:\\Users\\jcastro\\cad\\Gill Model 500 Manual.pdf',
      verified: true,
    },
    {
      id: 'src-plano-bop-8127',
      kind: 'layout',
      title:
        'Plano 8127-1110-004 "Esquema típico stack BOP estándar 7-1/16" 10 KSI" (Well Service, estándar de flota)',
      ref: 'C:\\Users\\jcastro\\cad\\8127-0011 EnsamblajeBOP STACK WS STD 30092026.PDF',
      revision: 'rev 4, 30/09/2026',
      verified: true,
    },
    {
      id: 'src-layout-ws10',
      kind: 'layout',
      title: 'LAYOUT-WS10-0001 "Layout Equipo TKR 10 RN119"',
      ref: 'C:\\Users\\jcastro\\cad\\Layout Equipo TKR 10  RN119.pdf',
      revision: 'rev 1, 15/04/2019',
      verified: true,
    },
    {
      id: 'src-plano-piletas',
      kind: 'layout',
      title: 'Plano "Pileta 1-2-3" (golpeador / zaranda / preparadora)',
      ref: 'X:\\Mantenimiento WS\\Planos Tecnicos\\Piletas\\Pileta 1-2-3.dwg.pdf',
      verified: true,
    },
    {
      id: 'src-choke-b20',
      kind: 'manufacturer',
      title:
        'Thrubore B20-9908 choke manifold 3-1/16" 15M (equipo TKR-08) — SOLO escala, no es el manifold del TKR-10',
      ref: 'X:\\…\\EQUIPOS NUBE (desafectado)\\Equipo TKR-08\\IMPORTACIONES TKR 08\\CHOKE MANIFOLD\\PLANO-Ck-Manifold_15-Valve_Dwg_B20-9908.PDF',
      verified: true,
    },
    {
      id: 'src-esquema-ahogo',
      kind: 'procedure',
      title:
        'Esquemas "manifold de ahogo M1–M12" y "conjunto de BOP y válvulas" (KL1/KL2 2-1/16" 5M, CL1/CL2 4-1/16" 5M)',
      ref: 'Imágenes provistas por el usuario 2026-10-09; documento de origen sin identificar',
      verified: false,
    },
    {
      id: 'src-manual-bop-11',
      kind: 'manufacturer',
      title:
        'Manuales BOP RAM y ANNULAR 11" 5000 PSI (Xinde 2FZ28-35II / FH28-35I) — aplicabilidad al TKR-10 NO confirmada',
      ref: "C:\\Users\\jcastro\\cad\\BOP RAM  Operation Manual 11''5000PSI.pdf / BOP ANNULAR Operational Manual 11''5000PSI.pdf",
      verified: true,
    },
    {
      id: 'src-ref-rigmfg-4650',
      kind: 'manufacturer',
      title:
        'Manual O&M unidad de cierre CPC S/N 4650, 6 estaciones, API 16D (07/2011) — REFERENCIA GENÉRICA, no es el acumulador del TKR-10',
      ref: 'http://rigmanufacturing.com/drillog/Closing%20Unit/Closing%20Unit%204650%20O&M%20Manual%20Part1.pdf, p7, p10, p17, p23, p33-35, p94-95, p98',
      revision: 'Design Book Rev 1 - 010211',
      verified: false,
    },
    {
      id: 'src-modelo-sk575',
      kind: 'estimate',
      title: 'Modelo CAD de referencia SK-575 (geometría no acotada estimada)',
      ref: 'cad/sk575/modelo.py',
      verified: false,
    },
  ],
  equipment: [
    {
      id: 'rig10-carrier-mastil',
      rigId: 'RIG-10',
      name: 'Portaequipo, mástil y piso de trabajo',
      componentIds: ['mastil', 'piso_trabajo', 'carrier_huella'],
    },
    {
      id: 'rig10-locacion',
      rigId: 'RIG-10',
      name: 'Locación (layout TKR-10)',
      componentIds: ['layout_tkr10'],
    },
    {
      id: 'rig10-sk575-equipo',
      rigId: 'RIG-10',
      name: 'Modelo SK-575 de referencia — equipo',
      componentIds: [...SK575_EQUIPO_IDS],
    },
    {
      id: 'rig10-sk575-locacion',
      rigId: 'RIG-10',
      name: 'Modelo SK-575 de referencia — locación',
      componentIds: [...SK575_LOCACION_IDS],
    },
  ],
  components: [
    {
      id: 'mastil',
      rigId: 'RIG-10',
      name: 'Mástil Service King SK104-330',
      family: 'mast',
      confidence: 'C',
      sourceIds: ['src-folleto'],
      scope:
        'Celosía ILUSTRATIVA de barras tubulares (patas, travesaños y diagonales) con la altura y los tramos documentados. Ancho de base/tope, paneles y diámetros sin plano del fabricante (PENDIENTE); sin corona, poleas ni balcón. No se ubica en la escena hasta fijar su base.',
      model: '/models/rig10/mastil.glb',
      specifications: [
        {
          key: 'heightM',
          label: 'Altura (104 ft)',
          value: 31.6992,
          unit: 'm',
          confidence: 'A',
          sourceId: 'src-folleto',
        },
        {
          key: 'lowerSectionM',
          label: 'Tramo inferior',
          value: 16.4,
          unit: 'm',
          confidence: 'B',
          sourceId: 'src-folleto',
        },
        {
          key: 'upperSectionM',
          label: 'Tramo superior',
          value: 15.2992,
          unit: 'm',
          confidence: 'B',
          sourceId: 'src-folleto',
        },
        {
          key: 'capacityLb',
          label: 'Capacidad nominal (designación del modelo, 330k)',
          value: 330000,
          unit: 'lb',
          confidence: 'B',
          sourceId: 'src-folleto',
          conflicts: [
            {
              sourceId: 'src-placa-api',
              value: 325725,
              note: 'Placa del mástil instalado: carga estática máx. con vientos a 3,5°',
            },
          ],
        },
      ],
    },
    {
      id: 'piso_trabajo',
      rigId: 'RIG-10',
      name: 'Piso de trabajo telescópico',
      family: 'workfloor',
      confidence: 'C',
      sourceIds: ['src-folleto', 'src-layout'],
      scope:
        'Placa maciza a la altura del modelo, ubicada según el layout (medida del vector, no acotada). Sin barandas, telescopio ni escalera.',
      model: '/models/rig10/piso_trabajo.glb',
      specifications: [
        {
          key: 'sizeM',
          label: 'Largo × ancho',
          value: '2,6 × 3,3 m',
          confidence: 'B',
          sourceId: 'src-folleto',
          conflicts: [{ sourceId: 'src-layout', value: '3 × 3 m (nominal en el layout)' }],
        },
        {
          key: 'heightRangeM',
          label: 'Altura regulable',
          value: '1 a 4 m',
          confidence: 'A',
          sourceId: 'src-folleto',
        },
        {
          key: 'modelHeightM',
          label: 'Altura del modelo',
          value: 3,
          unit: 'm',
          confidence: 'B',
          sourceId: 'src-folleto',
          conflicts: [
            {
              sourceId: 'src-legacy-v2',
              value: 2.3,
              note: 'Valor del V2 procedural previo (retirado 2026-10-11)',
            },
            {
              sourceId: 'src-plano-8123',
              value: 3.606,
              note: 'Plano 8123-1002-2611: piso a 12 ft (3.606 mm)',
            },
          ],
        },
      ],
    },
    {
      id: 'carrier_huella',
      rigId: 'RIG-10',
      name: 'Carrier Service King SK-575 (huella)',
      family: 'carrier',
      confidence: 'C',
      sourceIds: ['src-folleto', 'src-layout'],
      scope:
        'Solo la huella en planta de la envolvente operativa. Sin ejes, cabina, tanques ni altura. Desplazamiento lateral medido del vector del layout.',
      model: '/models/rig10/carrier_huella.glb',
      specifications: [
        {
          key: 'operatingLengthM',
          label: 'Envolvente operativa (largo)',
          value: 18,
          unit: 'm',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        {
          key: 'widthM',
          label: 'Ancho',
          value: 4,
          unit: 'm',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        { key: 'axles', label: 'Ejes', value: 5, confidence: 'A', sourceId: 'src-folleto' },
        {
          key: 'equipoABocaM',
          label: 'Distancia a la boca de pozo',
          value: 1.3,
          unit: 'm',
          confidence: 'A',
          sourceId: 'src-layout',
        },
      ],
    },
    {
      id: 'layout_tkr10',
      rigId: 'RIG-10',
      name: 'Huellas de locación (acumulador, bomba, pileta, planchada)',
      family: 'auxiliary',
      confidence: 'C',
      sourceIds: ['src-layout'],
      scope:
        'Solo huellas en planta. Tamaños y tres separaciones rotuladas; el resto de las posiciones se midió del vector del PDF. No incluye anclajes (25 ± 3 m en TKR-10 vs 20 m en el folleto: fuente en conflicto).',
      model: '/models/rig10/layout_tkr10.glb',
      specifications: [
        {
          key: 'accumulatorM',
          label: 'Acumulador BOP',
          value: '8 × 2,4 m',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        {
          key: 'triplexPumpM',
          label: 'Bomba triplex',
          value: '6 × 2,4 m',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        {
          key: 'circulationPitM',
          label: 'Pileta de circulación',
          value: '12 × 2,4 m',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        {
          key: 'catwalkM',
          label: 'Planchada',
          value: '12 × 2,4 m',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        {
          key: 'bombaPiletaM',
          label: 'Separación bomba–pileta',
          value: 5,
          unit: 'm',
          confidence: 'A',
          sourceId: 'src-layout',
        },
        {
          key: 'acumuladorEjeM',
          label: 'Acumulador al eje del pozo',
          value: 3,
          unit: 'm',
          confidence: 'A',
          sourceId: 'src-layout',
        },
      ],
    },
    ...SK575_COMPONENTS,
  ],
}

/** Un GLB de la escena nativa. Posición en el marco glTF (m, Y arriba) respecto de la boca de pozo. */
export interface SceneModel {
  componentId: string
  url: string
  position?: readonly [number, number, number]
}

/**
 * Componentes que se dibujan. `carrier_huella` y `layout_tkr10` ya vienen en el marco de la boca de pozo.
 * `piso_trabajo` se centra en el origen del GLB: se ubica con la posición medida del layout (C).
 * `mastil` (envolvente vieja) NO se dibuja: su base no está documentada y no se inventa (ver cad/README.md).
 * Los `sk575_*` (modelo de referencia, C) ya vienen en el marco de la boca de pozo, sin `position`.
 * `sk575_mastil` SÍ se dibuja: su base ahora está documentada (pozo a 76" del pie delantero, manual
 * derrick; inclinación 3,5° y base a 4 ft, placa API).
 */
export const RIG10_SCENE: readonly SceneModel[] = [
  { componentId: 'carrier_huella', url: '/models/rig10/carrier_huella.glb' },
  { componentId: 'layout_tkr10', url: '/models/rig10/layout_tkr10.glb' },
  // CAD (x, y) = (1,95; −1,95) → glTF (x, z, −y): posición medida del layout, confianza C.
  {
    componentId: 'piso_trabajo',
    url: '/models/rig10/piso_trabajo.glb',
    position: [1.95, 0, 1.95],
  },
  ...SK575_IDS.map((id) => ({ componentId: id, url: `/models/rig10/${id}.glb` })),
]
