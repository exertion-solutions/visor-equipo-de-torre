// Completa la URL de envío del sitio en el HTML del visor ya construido (dist/), a partir de RIG_WEBHOOK_URL.
// Uso: RIG_WEBHOOK_URL=https://... node scripts/inject-webhook.mjs dist/legacy/Digital_Rig_V2.html
// Exige https y exactamente un placeholder; la URL va dentro de un literal JS entre comillas simples.
import fs from 'node:fs'

const file = process.argv[2]
const url = (process.env.RIG_WEBHOOK_URL || '').trim()
if (!file) throw new Error('falta la ruta del HTML')
if (!/^https:\/\/[^\s'"\\<>]+$/.test(url))
  throw new Error('RIG_WEBHOOK_URL debe ser https y sin comillas, espacios ni barras invertidas')
const html = fs.readFileSync(file, 'utf8')
const n = html.split('%%RIG_WEBHOOK_URL%%').length - 1
if (n !== 1) throw new Error(`placeholder encontrado ${n} veces (se esperaba 1)`)
fs.writeFileSync(
  file,
  html.replace('%%RIG_WEBHOOK_URL%%', () => url),
)
console.log('URL de envío del sitio aplicada en', file)
