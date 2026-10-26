/*
 * 96-ambiente.js · presentación de la escena (sin tocar geometría ni datos):
 *
 *  1. Cielo: domo con degradé (Día / Atardecer) o fondo liso original. Se oculta en vista nocturna y en Vista CAD.
 *  2. Sombra de contacto: manchas suaves bajo las piezas apoyadas en el terreno (carrier, piletas, acumulador, BOP…),
 *     calculadas con la caja de cada componente SK-575. Es el "asentado" que da la oclusión ambiental, sin post-proceso.
 *  3. Halos de noche: resplandor aditivo en los proyectores de las torres de iluminación y las luces del equipo, solo con
 *     Vista nocturna. Es un efecto de imagen: no representa niveles de iluminación (lux) ni zonas iluminadas reales.
 * Respeta el perfil de 95-calidad.js (Celular: sin halos ni sombra de contacto).
 * API para pruebas: window.__rigAmbiente = { cielo(preset), estado() }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const sc = R.scene
  if (!T || !T.ShaderMaterial || !sc) return
  const KV = window.__rigKv
  const $ = (id) => document.getElementById(id)
  const on = (id) => $(id) && $(id).getAttribute('aria-pressed') === 'true'
  const nocheActiva = () => !!(R.view && R.view.night)
  const cadActiva = () => on('c-vista-cad')

  // ───────── 1. cielo ─────────
  const PRESETS = {
    dia: { cenit: '#3d6fa8', horizonte: '#c9d9e6', suelo: '#8d8578' },
    atardecer: { cenit: '#34466f', horizonte: '#d9a982', suelo: '#5d4a3e' },
  }
  const skyMat = new T.ShaderMaterial({
    uniforms: {
      cenit: { value: new T.Color(PRESETS.dia.cenit) },
      horizonte: { value: new T.Color(PRESETS.dia.horizonte) },
      suelo: { value: new T.Color(PRESETS.dia.suelo) },
    },
    vertexShader:
      'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 cenit; uniform vec3 horizonte; uniform vec3 suelo; varying vec3 vDir;',
      'void main(){',
      '  float h = vDir.y;',
      '  vec3 c = h > 0.0 ? mix(horizonte, cenit, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizonte, suelo, clamp(-h * 4.0, 0.0, 1.0));',
      '  gl_FragColor = vec4(c, 1.0);',
      '  #include <colorspace_fragment>',
      '}',
    ].join('\n'),
    side: T.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  })
  const sky = new T.Mesh(new T.SphereGeometry(450, 32, 16), skyMat)
  sky.name = 'cielo_domo'
  sky.renderOrder = -1000
  sky.frustumCulled = false
  sky.raycast = () => {}
  sky.onBeforeRender = (r, s, cam) => sky.position.copy(cam.position)
  sc.add(sky)
  let preset = 'dia'
  let fondo0 = null

  function cielo(p) {
    preset = PRESETS[p] ? p : 'liso'
    if (PRESETS[preset]) {
      const c = PRESETS[preset]
      skyMat.uniforms.cenit.value.set(c.cenit)
      skyMat.uniforms.horizonte.value.set(c.horizonte)
      skyMat.uniforms.suelo.value.set(c.suelo)
    }
    if (KV) KV.set('campo:cielo', preset)
    if (selCielo) selCielo.value = preset
    sync()
  }

  // ───────── 2. sombra de contacto ─────────
  const soft = (() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 128
    const g = cv.getContext('2d')
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64)
    grd.addColorStop(0, 'rgba(0,0,0,1)')
    grd.addColorStop(0.55, 'rgba(0,0,0,.75)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    return new T.CanvasTexture(cv)
  })()
  const aoMat = new T.MeshBasicMaterial({
    map: soft,
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  })
  const ao = new T.Group()
  ao.name = 'sombra_contacto'
  sc.add(ao)
  function quad(cx, cz, w, d) {
    const g = new T.BufferGeometry()
    const x0 = -w / 2
    const x1 = w / 2
    const z0 = -d / 2
    const z1 = d / 2
    g.setAttribute(
      'position',
      new T.BufferAttribute(new Float32Array([x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1]), 3),
    )
    g.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
    g.setIndex([0, 2, 1, 0, 3, 2])
    const m = new T.Mesh(g, aoMat)
    m.position.set(cx, 0.02, cz)
    m.renderOrder = -10
    m.raycast = () => {}
    return m
  }
  function armarAo() {
    while (ao.children.length) {
      const c = ao.children.pop()
      c.geometry.dispose()
    }
    const cam = R.camera()
    const vis = (o) => {
      let q = o
      while (q) {
        if (!q.visible) return false
        q = q.parent
      }
      return o.layers.test(cam.layers)
    }
    sc.updateMatrixWorld(true)
    const porComp = new Map()
    const b = new T.Box3()
    sc.traverse((o) => {
      if (!o.isMesh || !/^sk575_[a-z]+/.test(o.name) || !vis(o)) return
      if (/aristas|cable|lineas|vientos|tiros/.test(o.name)) return
      b.setFromObject(o)
      if (b.min.y > 0.6 || b.isEmpty()) return
      const k = o.name.match(/^sk575_([a-z]+)/)[1]
      if (!porComp.has(k)) porComp.set(k, new T.Box3())
      porComp.get(k).union(b)
    })
    for (const [k, bb] of porComp) {
      const w = bb.max.x - bb.min.x
      const d = bb.max.z - bb.min.z
      if (w * d < 0.8 || w > 30 || d > 30 || k === 'mastil') continue
      ao.add(quad((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2, w + 1.2, d + 1.2))
    }
  }

  // ───────── 3. halos de noche ─────────
  const glow = (() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 128
    const g = cv.getContext('2d')
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,244,214,1)')
    grd.addColorStop(0.2, 'rgba(255,226,160,.55)')
    grd.addColorStop(0.55, 'rgba(255,200,120,.12)')
    grd.addColorStop(1, 'rgba(255,200,120,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    return new T.CanvasTexture(cv)
  })()
  const haloMat = new T.MeshBasicMaterial({
    map: glow,
    transparent: true,
    blending: 2, // AdditiveBlending
    depthWrite: false,
    fog: false,
  })
  const halos = new T.Group()
  halos.name = 'halos_noche'
  sc.add(halos)
  const disco = new T.CircleGeometry(1, 24)
  function halo(p, r) {
    const m = new T.Mesh(disco, haloMat)
    m.position.copy(p)
    m.scale.setScalar(r)
    m.renderOrder = 50
    m.raycast = () => {}
    m.onBeforeRender = (rr, s, cam) => m.quaternion.copy(cam.quaternion)
    halos.add(m)
  }
  function armarHalos() {
    halos.clear()
    const lentes = sc.getObjectByName('torres_lentes_on')
    if (lentes && lentes.geometry) {
      lentes.updateMatrixWorld(true)
      const pos = lentes.geometry.attributes.position
      const v = new T.Vector3()
      const grupos = new Map()
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(lentes.matrixWorld)
        const k = Math.round(v.x / 3) + ':' + Math.round(v.z / 3)
        if (!grupos.has(k)) grupos.set(k, { s: new T.Vector3(), n: 0 })
        const gr = grupos.get(k)
        gr.s.add(v)
        gr.n++
      }
      for (const gr of grupos.values()) halo(gr.s.divideScalar(gr.n), 3.2)
    }
    const b = new T.Box3()
    const c = new T.Vector3()
    sc.traverse((o) => {
      if (!o.isMesh || !/_luz$/.test(o.name) || /mastil/.test(o.name)) return
      b.setFromObject(o).getCenter(c)
      halo(c.clone(), 0.9)
    })
  }

  // ───────── sincronía con modo noche / CAD / perfil ─────────
  let perfil = 'pc'
  let armado = false
  function sync() {
    if (!armado) return
    const noche = nocheActiva()
    const cad = cadActiva()
    sky.visible = !noche && !cad && preset !== 'liso'
    // la niebla de distancia toma el color del horizonte para que el terreno se funda con el cielo
    if (sc.fog && sc.fog.color) {
      if (fondo0 === null) fondo0 = sc.fog.color.getHex()
      if (sky.visible) sc.fog.color.copy(skyMat.uniforms.horizonte.value)
      else if (!noche && !cad) sc.fog.color.setHex(fondo0)
    }
    halos.visible = noche && perfil !== 'movil'
    ao.visible = perfil !== 'movil' && !cad
    if (R.invalidate) R.invalidate()
  }

  const selCielo = document.createElement('select')
  selCielo.id = 'c-cielo'
  selCielo.setAttribute('aria-label', 'Cielo')
  selCielo.innerHTML =
    '<option value="dia">Cielo: Día</option><option value="atardecer">Cielo: Atardecer</option><option value="liso">Cielo: Liso</option>'
  selCielo.style.cssText =
    'width:100%;height:32px;margin-top:4px;font:inherit;font-size:12px;color:#DDE3EC;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:0 8px'
  selCielo.addEventListener('change', () => cielo(selCielo.value))
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('vista', selCielo)

  for (const id of ['c-night', 'c-vista-cad'])
    $(id)?.addEventListener('click', () => setTimeout(sync, 0))
  document.addEventListener('rig:mode', () => setTimeout(sync, 0))

  const arrancar = async () => {
    armarAo()
    armarHalos()
    armado = true
    if (window.__rigFx) window.__rigFx.onPerfil((p) => ((perfil = p), sync()))
    if (KV) await KV.ready
    const g = KV ? KV.get('campo:cielo', 'dia') : 'dia'
    cielo(typeof g === 'string' ? g : 'dia')
  }
  const listo = () =>
    window.__rigSk575 && window.__rigSk575.ready ? window.__rigSk575.ready() : Promise.resolve()
  const go = () =>
    Promise.resolve(listo())
      .then(arrancar)
      .catch((e) => console.error('[96-ambiente]', e))
  if (window.__rigBooted) go()
  else document.addEventListener('rig:boot', go, { once: true })

  window.__rigAmbiente = {
    cielo,
    estado: () => ({
      preset,
      cielo: sky.visible,
      halos: halos.visible ? halos.children.length : 0,
      ao: ao.visible ? ao.children.length : 0,
    }),
  }
})
