// Renombrado a nombres genéricos: quita la marca del repo y del visor. Una sola tabla de reglas, determinista y local (cada regla mira
// solo el texto vecino), para que se aplique igual a los archivos del repo y, en `scripts/build-legacy.mjs`, al original inmutable de
// `reference/legacy/` (evidencia que nunca se edita) antes de parchearlo. Este archivo es el único lugar donde la marca puede aparecer.
//
//   texto: "TACKER DIGITAL RIG" → "DIGITAL RIG" · "TACKER 10" → "Equipo 10" · menciones sueltas → "la empresa"
//   código: tacker10 → rig10 · TACKER_X → RIG_X · __tackerX → __rigX · tacker:x → rig:x · TACKER10_Digital_Rig_V2 → Digital_Rig_V2
const B = '(?:TACKER|Tacker)'
const NOLETRA = '(?![A-Za-z0-9_\\-])'

/** [patrón, reemplazo]: el orden importa (de lo más específico a lo más general). */
export const REGLAS = [
  // producto y archivos
  [/TACKER DIGITAL RIG/g, 'DIGITAL RIG'],
  [/Tacker Digital Rig/g, 'Digital Rig'],
  [/ABRIR_TACKER10_DIGITAL_RIG/g, 'ABRIR_DIGITAL_RIG'],
  [/TACKER10_DIGITAL_RIG/g, 'DIGITAL_RIG'],
  [/TACKER10_Digital_Rig_V2/g, 'Digital_Rig_V2'],
  [/TACKER_Digital_Rig/g, 'Digital_Rig'],
  [/Visor_Torre_Pulling_TACKER10_CAD/g, 'Visor_Torre_Pulling_RIG10_CAD'],
  // títulos de documentos fuente y planos: se quita la marca, queda el número que los identifica
  [new RegExp(`\\b(DROPS) ${B} (\\d{4})`, 'g'), '$1 $2'],
  [new RegExp(`\\b([Pp]lanos?) ${B} (?=\\d|Escalera|piso)`, 'g'), '$1 '],
  [new RegExp(`\\b([Pp]lanos?) ${B}${NOLETRA}`, 'g'), '$1 de la empresa'],
  [new RegExp(`\\bPileta ${B} `, 'g'), 'Pileta '],
  [new RegExp(`\\b(Equipo|Rig) ${B} (?=TKR)`, 'g'), '$1 '],
  [new RegExp(`${B} EQUIPOS NUBE`, 'g'), 'EQUIPOS NUBE'],
  [/\bTACKER SRL\b/g, 'la empresa'],
  [/\blogo_TACKER\b/g, 'logo_EMPRESA'],
  [new RegExp(`\\bpropiedad ${B}${NOLETRA}`, 'g'), 'propiedad de la empresa'],
  // casos que la regla suelta dejaría torpes
  [new RegExp(`${B} (?=<span[^>]*>\\d)`, 'g'), 'Equipo '],
  [new RegExp(`\\bvarios ${B}${NOLETRA}`, 'g'), 'varios equipos'],
  [new RegExp(`\\brojo ${B}${NOLETRA}`, 'g'), 'rojo corporativo'],
  [new RegExp(`Logo "${B} solutions"`, 'g'), 'Logo de la empresa'],
  [new RegExp(`fillText\\('${B}'`, 'g'), "fillText('EQUIPO'"],
  [/Tacker-10/g, 'Rig-10'],
  [new RegExp(`\\b(equipos?) (?:de|del) ${B} (\\d)`, 'g'), '$1 $2'],
  // "TACKER 10" y similares
  [new RegExp(`\\b([Vv]isor) ${B} 10 V2`, 'g'), '$1 Digital Rig V2'],
  [new RegExp(`\\b([Vv]isor) ${B} 10 Digital`, 'g'), '$1 Digital'],
  [new RegExp(`\\b([Ee]quipo|EQUIPO) ${B} (\\d)`, 'g'), '$1 $2'],
  [new RegExp(`\\b(del|de) ${B} (\\d)`, 'g'), 'del equipo $2'],
  [
    new RegExp(`\\b(el|al|en|con|por|para|sobre|un|y|a|este|ese|no|ni|solo|Solo) ${B} (\\d)`, 'g'),
    '$1 equipo $2',
  ],
  [new RegExp(`${B} (\\d)`, 'g'), 'Equipo $1'],
  // identificadores (nombres de archivos, globales, eventos, claves)
  [/TACKER10/g, 'RIG10'],
  [/Tacker10/g, 'Rig10'],
  [/tacker10/g, 'rig10'],
  [/TACKER_10/g, 'RIG_10'],
  [/TACKER-10/g, 'RIG-10'],
  [/tacker-10/g, 'rig-10'],
  [/TACKER_/g, 'RIG_'],
  [/tacker_/g, 'rig_'],
  [/tacker:/g, 'rig:'],
  [/tacker-/g, 'rig-'],
  [/-tacker/g, '-rig'],
  [/tacker([A-Z])/g, 'rig$1'],
  // menciones sueltas a la empresa
  [
    new RegExp(
      `\\b(equipos?|[Ll]ogo|piso|torre|esquema|SGI|piso/subestructura) ${B}${NOLETRA}`,
      'g',
    ),
    '$1 de la empresa',
  ],
  [new RegExp(`\\b(de|por|en|con|y|a|para|ni|que|solo) ${B}${NOLETRA}`, 'g'), '$1 la empresa'],
  [new RegExp(`(?<![A-Za-z])${B}${NOLETRA}`, 'g'), 'la empresa'],
  [/(?<![A-Za-z])tacker(?![A-Za-z0-9])/g, 'rig'],
]

/** Aplica las reglas a un texto. */
export function genericizar(texto) {
  let t = texto
  for (const [re, por] of REGLAS) t = t.replace(re, por)
  return t
}

const BLOB = /(data:[A-Za-z0-9.+\-/]+;base64,[A-Za-z0-9+/=]+)/

/** Igual que `genericizar` pero sin tocar los blobs base64 incrustados (imágenes, GLB): una coincidencia casual los corrompería. */
export function genericizarHtml(html) {
  return html
    .split(BLOB)
    .map((parte, i) => (i % 2 ? parte : genericizar(parte)))
    .join('')
}

/** Renombrado de rutas de archivos. */
export const genericizarRuta = genericizar
