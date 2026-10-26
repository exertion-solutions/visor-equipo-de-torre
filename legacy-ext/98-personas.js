/*
 * 98-personas.js · operarios genéricos con EPP como referencia de escala (menú Capas → "Personas").
 *
 * Figuras simples propias (casco, mameluco, chaleco reflectivo, botines), 1,75 m de alto, apoyadas sobre la superficie
 * real del modelo (rayo vertical contra la geometría visible). Puestos ilustrativos: boca de pozo (2), enganchador en el
 * piso de enganche, maquinista en el cuadro de maniobras y ayudante en la planchada. Si el rayo no encuentra la superficie
 * esperada, esa figura no se dibuja (no se inventa una altura).
 * NO representan puestos de trabajo definidos por procedimiento ni distancias de seguridad.
 * Encendidas por defecto en Entrenamiento. API para pruebas: window.__rigPersonas = { set(on), lista() }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const sc = R.scene
  if (!T || !R.raycaster) return

  // [id, rol, x, z, cota esperada de apoyo (m), tolerancia, rumbo (rad; null = mirando a la boca de pozo), color de casco]
  const PUESTOS = [
    ['boca-1', 'Boca de pozo', 0.95, 0.75, 3.61, 0.45, null, '#f4f4f0'],
    ['boca-2', 'Boca de pozo', -0.55, -1.15, 3.61, 0.45, null, '#f4f4f0'],
    ['enganche', 'Enganchador', 1.25, 0.2, 20.63, 0.6, Math.PI * 1.5, '#f4f4f0'],
    ['maquinista', 'Maquinista', -6.3, -1.75, 0, 0.6, 0, '#2f6fd6'],
    ['planchada', 'Ayudante', 8.2, -2.6, 0, 0.6, Math.PI * 0.85, '#f2c230'],
  ]

  const M = (c, extra = {}) =>
    new T.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, ...extra })
  const mat = {
    mameluco: M('#1f3a63'),
    chaleco: M('#ff7a1a', { emissive: new T.Color('#ff7a1a'), emissiveIntensity: 0.15 }),
    franja: M('#e8eef2', {
      emissive: new T.Color('#9aa4ab'),
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.3,
    }),
    piel: M('#c99b7c'),
    botin: M('#2b2118'),
    guante: M('#d6c25a'),
  }
  const G = {
    pierna: new T.CylinderGeometry(0.075, 0.065, 0.82, 10),
    torso: new T.BoxGeometry(0.42, 0.56, 0.24),
    franja: new T.BoxGeometry(0.43, 0.04, 0.245),
    brazo: new T.CylinderGeometry(0.055, 0.05, 0.62, 8),
    cabeza: new T.SphereGeometry(0.11, 14, 10),
    casco: new T.SphereGeometry(0.135, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    ala: new T.CylinderGeometry(0.16, 0.16, 0.015, 18),
    botin: new T.BoxGeometry(0.12, 0.09, 0.26),
    mano: new T.SphereGeometry(0.05, 8, 6),
  }

  function figura(colorCasco) {
    const g = new T.Group()
    const add = (geo, m, x, y, z, rx = 0, rz = 0) => {
      const o = new T.Mesh(geo, m)
      o.position.set(x, y, z)
      o.rotation.set(rx, 0, rz)
      o.castShadow = true
      o.receiveShadow = true
      g.add(o)
      return o
    }
    for (const sx of [-0.1, 0.1]) {
      add(G.pierna, mat.mameluco, sx, 0.5, 0)
      add(G.botin, mat.botin, sx, 0.045, 0.03)
    }
    add(G.torso, mat.chaleco, 0, 1.19, 0)
    for (const y of [1.06, 1.24]) add(G.franja, mat.franja, 0, y, 0)
    for (const sx of [-0.27, 0.27]) {
      add(G.brazo, mat.mameluco, sx, 1.16, 0.02, 0, sx > 0 ? 0.12 : -0.12)
      add(G.mano, mat.guante, sx * 1.13, 0.83, 0.03)
    }
    add(G.cabeza, mat.piel, 0, 1.58, 0)
    const casco = M(colorCasco)
    add(G.casco, casco, 0, 1.62, 0)
    add(G.ala, casco, 0, 1.625, 0.02)
    g.traverse((o) => (o.raycast = () => {}))
    return g
  }

  const grupo = new T.Group()
  grupo.name = 'personas_epp'
  grupo.visible = false
  sc.add(grupo)
  const colocadas = []

  function apoyo(x, z, cota, tol) {
    const cam = R.camera()
    const ray = R.raycaster
    const capas = ray.layers.mask
    ray.layers.mask = cam.layers.mask
    ray.set(new T.Vector3(x, cota + 2.5, z), new T.Vector3(0, -1, 0))
    ray.far = 6
    const vis = (o) => {
      let q = o
      while (q) {
        if (!q.visible) return false
        q = q.parent
      }
      return true
    }
    const hits = ray
      .intersectObjects(sc.children, true)
      .filter((h) => h.object.isMesh && vis(h.object) && !grupo.children.includes(h.object))
    ray.layers.mask = capas
    ray.far = Infinity
    const h = hits.find((h) => Math.abs(h.point.y - cota) <= tol)
    return h ? h.point.y : null
  }

  function armar() {
    grupo.clear()
    colocadas.length = 0
    sc.updateMatrixWorld(true)
    for (const [id, rol, x, z, cota, tol, rumbo, casco] of PUESTOS) {
      const y = cota === 0 ? 0 : apoyo(x, z, cota, tol)
      if (y === null) continue
      const f = figura(casco)
      f.position.set(x, y, z)
      f.rotation.y = rumbo === null ? Math.atan2(-x, -z) : rumbo
      f.name = 'persona_' + id
      f.userData.rol = rol
      grupo.add(f)
      colocadas.push({ id, rol, y: +y.toFixed(2) })
    }
  }

  let armado = false
  function set(on) {
    if (on && !armado) {
      armar()
      armado = true
    }
    grupo.visible = !!on
    btn.setAttribute('aria-pressed', String(!!on))
    if (R.renderer) R.renderer.shadowMap.needsUpdate = true
    if (R.invalidate) R.invalidate()
  }

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-personas'
  btn.type = 'button'
  btn.textContent = 'Personas (escala)'
  btn.title =
    'Operarios genéricos con EPP como referencia de escala; no son puestos definidos por procedimiento'
  btn.setAttribute('aria-pressed', 'false')
  btn.addEventListener('click', () => set(!grupo.visible))
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('capas', btn)

  document.addEventListener('rig:mode', (e) => {
    if (e.detail === 'training') set(true)
  })

  window.__rigPersonas = { set, lista: () => colocadas.slice() }
})
