/*
 * 79-cabina-desmontable.js — la casilla del maquinista es DESMONTABLE: en operación va montada FUERA del carrier, entre las dos
 * escaleras laterales (la de tránsito SUB-2, x ≈ −8 m, y la lateral de la subestructura PT-1, x ≈ −1 m), sobre ménsulas del chasis.
 *
 * Dato aportado por el usuario (experto de equipo); la posición exacta (lado +Z, separación) es una lectura del modelo, no una
 * cota documentada: `pendingValidation`. El módulo NO cambia la geometría de `cabina` (30-carrier.js): la traslada como conjunto
 * (los puntos DROPS CAS-1/2/3 van con ella) y le agrega dos ménsulas al chasis y dos apoyos al terreno, hijos de `cabina`
 * para que sigan su visibilidad y su selección.
 *
 * Marco: origen = boca de pozo, +X hacia el mástil, carrier hacia −X, Z lateral. La cabina queda en el lado +Z, el de la escalera PT-1.
 */
window.__rigExt.onPost((R) => {
  const cab = R.groups && R.groups.cabina
  const T = R.three
  if (!cab || !T) return

  /** Desplazamiento respecto de la posición sobre el carrier (la cabina estaba en z ±1,25, x −6,55…−3,27). */
  const DZ = 3.45 // borde interior de la cabina a 2,20 m del eje: justo fuera del ancho del carrier (±2,15 m)
  const DX = 0.4 // la aleja de SUB-2 (x −8,35…−7,45) y la deja lejos de PT-1 (x −1,28…−0,27)
  const Y_PISO = 1.3 // nivel de la plataforma del carrier (bajo el piso de la cabina)

  cab.position.set(DX, 0, DZ)

  // Soportes en coordenadas de `cabina` (local = mundo − posición del grupo).
  const mat = new T.MeshStandardMaterial({ color: '#2B2F36', roughness: 0.6, metalness: 0.4 })
  const soportes = new T.Group()
  soportes.name = 'cabina_soportes'
  const box = (sx, sy, sz, x, y, z) => {
    const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), mat)
    m.position.set(x, y, z)
    soportes.add(m)
  }
  const zIn = -DZ + 2.0 // borde exterior del chasis (z mundo 2,0) en coordenadas locales
  const zOut = 1.25 // borde exterior de la cabina
  for (const xw of [-5.6, -3.6]) {
    const x = xw - DX
    // ménsula: viga horizontal del chasis a la cabina, bajo el piso
    box(0.14, 0.16, zOut - zIn, x, Y_PISO - 0.1, (zIn + zOut) / 2)
    // apoyo al terreno en el borde exterior
    box(0.14, Y_PISO - 0.18, 0.14, x, (Y_PISO - 0.18) / 2, zOut - 0.12)
    box(0.4, 0.05, 0.4, x, 0.025, zOut - 0.12) // base de apoyo
  }
  cab.add(soportes)

  if (R.invalidate) R.invalidate()
  window.__rigCabina = { DX, DZ, lado: '+Z', estado: 'pendingValidation' }
})
