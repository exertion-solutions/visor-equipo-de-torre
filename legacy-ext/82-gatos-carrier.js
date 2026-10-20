/*
 * 82-gatos-carrier.js — GATOS de nivelación del carrier (estabilizadores), ILUSTRATIVOS.
 *
 * El V2 no tenía gatos en el carrier (solo las 4 patas PT-5 bajo el piso de trabajo). Por indicación del usuario y por las imágenes de
 * referencia (equipos similares, otras marcas) el carrier apoya sobre gatos hidráulicos que se bajan al terreno antes de izar el mástil:
 * 3 por lado (delantero, medio y trasero), cada uno con un brazo lateral, un cilindro vertical, vástago y zapata.
 *
 * Cantidad, posición y medidas son una lectura del modelo (`pendingValidation`), no cotas documentadas. Los gatos son hijos de `camion`
 * (siguen su visibilidad y su selección). En el montaje se bajan en el paso 4 ("posicionamiento y nivelación") y en la animación del
 * izamiento se bajan primero (81-izamiento-mastil.js). No se modelan cargas ni nivelación real.
 *
 * API: `window.__rigGatos = { set(d), get(), posiciones }` con d en [0, 1] (0 = recogidos, 1 = apoyados en el terreno).
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const camion = R.groups && R.groups.camion
  if (!T || !camion) return

  // x de los gatos (mundo, carrier hacia −X): delantero, medio y trasero. Libres de la escalera SUB-2 (x −8,35…−7,45), de la cabina
  // desmontable (x −6,2…−2,5, lado +Z) y de la escalera PT-1 (x −1,28…−0,27).
  const XS = [-15.2, -9.8, -1.9]
  const Z_CHASIS = 1.95 // borde exterior del chasis
  const Z_GATO = 2.85 // eje del cilindro
  const Y_BRAZO = 0.95 // altura del brazo
  const CAMISA_BAJO = 0.45 // parte baja de la camisa
  const ZAPATA = 0.05 // alto de la zapata
  const RECOGIDO = 0.5 // altura de la zapata con el gato recogido

  const matRojo = new T.MeshStandardMaterial({ color: '#A72A32', roughness: 0.5, metalness: 0.3 })
  const matAcero = new T.MeshStandardMaterial({ color: '#A9B1B7', roughness: 0.35, metalness: 0.7 })
  const matOscuro = new T.MeshStandardMaterial({ color: '#2B2F35', roughness: 0.6, metalness: 0.4 })
  const caja = (sx, sy, sz, mat) => {
    const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), mat)
    m.castShadow = true
    return m
  }
  const cil = (r, mat) => {
    const m = new T.Mesh(new T.CylinderGeometry(r, r, 1, 14), mat)
    m.castShadow = true
    return m
  }

  const raiz = new T.Group()
  raiz.name = 'gatos_nivelacion'
  const gatos = []
  const posiciones = []
  for (const x of XS) {
    for (const lado of [-1, 1]) {
      const z = lado * Z_GATO
      // brazo lateral desde el chasis
      const brazo = caja(0.16, 0.16, Z_GATO - Z_CHASIS + 0.15, matRojo)
      brazo.position.set(x, Y_BRAZO, (lado * (Z_CHASIS + Z_GATO)) / 2)
      // camisa del cilindro (fija al brazo)
      const camisa = cil(0.09, matRojo)
      camisa.scale.y = Y_BRAZO + 0.1 - CAMISA_BAJO
      camisa.position.set(x, (Y_BRAZO + 0.1 + CAMISA_BAJO) / 2, z)
      // vástago y zapata (móviles)
      const vastago = cil(0.055, matAcero)
      const zapata = caja(0.5, ZAPATA, 0.5, matOscuro)
      raiz.add(brazo, camisa, vastago, zapata)
      gatos.push({ x, z, vastago, zapata })
      posiciones.push([x, z])
    }
  }
  camion.add(raiz)

  let d = 1
  function set(value) {
    d = Math.max(0, Math.min(1, Number(value)))
    for (const g of gatos) {
      // altura de la zapata: recogido (RECOGIDO) → apoyado en el terreno (ZAPATA/2)
      const yZapata = RECOGIDO + (ZAPATA / 2 - RECOGIDO) * d
      g.zapata.position.set(g.x, yZapata, g.z)
      const top = CAMISA_BAJO + 0.05 // el vástago sale del fondo de la camisa
      const bottom = yZapata + ZAPATA / 2
      const largo = Math.max(top - bottom, 0.02)
      g.vastago.scale.y = largo
      g.vastago.position.set(g.x, bottom + largo / 2, g.z)
    }
    if (R.perf && R.perf.invalidateShadows) R.perf.invalidateShadows()
    if (R.invalidate) R.invalidate()
  }
  set(1)

  // Montaje: los gatos bajan recién en el paso 4 (nivelación). Antes (paso 3: descarga) están recogidos.
  document.addEventListener('rig:seq-step', (e) => {
    const k = Number(e.detail)
    set(k === 3 ? 0 : 1)
  })

  window.__rigGatos = { set, get: () => d, posiciones }
})
