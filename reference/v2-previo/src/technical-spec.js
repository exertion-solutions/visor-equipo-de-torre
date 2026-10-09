// Fuente principal: documentación Tacker 10 incluida en la carpeta del proyecto.
// Las cotas se expresan en metros salvo indicación contraria.
export const TACKER_10 = Object.freeze({
  mast: Object.freeze({
    model: 'Service King SK104-330',
    heightM: 31.6992,
    capacityLb: 330000,
    lowerSectionM: 16.4,
    upperSectionM: 15.2992,
  }),
  carrier: Object.freeze({
    model: 'Service King SK-575',
    axles: 5,
    operatingLengthM: 18,
    widthM: 4,
  }),
  workFloor: Object.freeze({
    sizeM: Object.freeze([2.6, 3.3]),
    minHeightM: 1,
    maxHeightM: 4,
    modelHeightM: 3,
  }),
  hoisting: Object.freeze({
    lines: 6,
    travelingBlockCapacityT: 110,
    linksCapacityT: 150,
    elevatorCapacityT: 100,
    blockTravelM: Object.freeze([7, 25]),
    mainCableIn: 1,
  }),
  bop: Object.freeze({
    nominalIn: 7.0625,
    workingPsi: 5000,
    accumulatorBottles: 5,
  }),
  layout: Object.freeze({
    anchorOffsetM: 25,
    anchorToleranceM: 3,
    catwalkM: Object.freeze([12, 2.4]),
    triplexPumpM: Object.freeze([6, 2.4]),
    circulationPitM: Object.freeze([12, 2.4]),
    accumulatorM: Object.freeze([8, 2.4]),
  }),
  // Relevamiento 2026-10-09 (ver docs/pdf-review/informe-sk575-2026-10-09.md). No reemplaza las cotas de arriba:
  // donde difieren, src/data/rigs/tacker10.ts registra el conflicto. `src` = sourceId de cada cota.
  sk575: Object.freeze({
    mast: Object.freeze({
      model: 'SK DKA104-330-08', serial: 'DK-3033', src: 'src-placa-api',
      lines: 8, ratedHookLoadLb: 325725, leanDeg: 3.5, baseHeightM: 1.2192,
      rackingBoardM: 20.629, heightPlanoM: 31.71, srcPlano: 'src-plano-8123',
      wellFromFrontLegM: 1.9304, srcWell: 'src-manual-derrick',
      crownSheavesIn: Object.freeze([24, 24, 24, 24, 30]), srcSheaves: 'src-sk575-spec',
    }),
    workFloor: Object.freeze({
      heightM: 3.606, src: 'src-plano-8123',
      sizeM: Object.freeze([2.6, 3.304]), wellOpeningM: Object.freeze([0.73, 0.7]), srcSize: 'src-planos-piso',
      stairDeg: 45, stairRiseM: 0.18, srcStair: 'src-plano-escalera',
    }),
    carrier: Object.freeze({
      frameLengthM: 12.192, widthIn: 102, deckHeightM: 1.3462, src: 'src-parts-sk575',
      axlesFromFrontIn: Object.freeze([74.7, 124.6, 327.9, 381.9, 435.6]),
      roadM: Object.freeze({ heightM: 4.2926, widthM: 2.8956, lengthM: 20.7264 }), wheelbaseFt: 43, srcRoad: 'src-sk575-spec',
      tSillFromWellM: 1.8288, srcTSill: 'src-manual-rigup',
    }),
    raisingCylinder: Object.freeze({
      model: 'HYCO 50162-813-13150 (SK DK50162)', src: 'src-plano-hyco', count: 2,
      closedIn: 60, extendedIn: 191.5, strokeIn: 131.5, stagesIn: Object.freeze([8.12, 7.0, 4.0]), barrelIn: 9.42,
      extendForceLb: 103697,
    }),
    drawworks: Object.freeze({
      src: 'src-sk575-spec', mainDrumIn: Object.freeze([42, 12]), mainBarrelIn: Object.freeze([16, 38.75]),
      sandDrumIn: Object.freeze([42, 8]), sandBarrelIn: Object.freeze([16, 43.75]), discAssistIn: 48.5,
    }),
    hoisting: Object.freeze({ linksT: 150, linksLengthIn: 73, linksDiaIn: 3, elevatorBoreIn: 3.21875, src: 'src-insp-sop1110' }),
  }),
});
