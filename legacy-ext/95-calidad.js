/*
 * 95-calidad.js · perfiles de calidad y bucle de animación compartido.
 *
 *  - Perfiles: Celular (pixel ratio 1, sin sombras, efectos mínimos) · PC (pixel ratio ≤ 1,5, sombra 2048) ·
 *    Presentación (pixel ratio ≤ 2, sombra 4096, todos los efectos). "Auto" mide los cuadros por segundo al arrancar
 *    (hasta 40 cuadros forzados o 1,5 s) y elige Celular por debajo de 30 FPS o en pantallas táctiles chicas; si no, PC.
 *    El perfil elegido se guarda en el almacén de campo (`campo:calidad`).
 *  - window.__rigFx: { perfil(), onPerfil(cb), anim(nombre, on) }. `anim` mantiene un bucle de render continuo mientras
 *    algún efecto animado esté activo (el visor renderiza a demanda: sin efectos animados no gasta GPU).
 * El perfil es presentación visual: no cambia geometría, cotas ni datos.
 */
window.__rigExt.onPost((R) => {
  const ren = R.renderer
  if (!ren) return
  const KV = window.__rigKv
  const PERFILES = {
    movil: { nombre: 'Celular', pr: 1, sombras: false, mapa: 1024, efectos: 'min' },
    pc: {
      nombre: 'PC',
      pr: Math.min(window.devicePixelRatio || 1, 1.5),
      sombras: true,
      mapa: 2048,
      efectos: 'medio',
    },
    presentacion: {
      nombre: 'Presentación',
      pr: Math.min(window.devicePixelRatio || 1, 2),
      sombras: true,
      mapa: 4096,
      efectos: 'max',
    },
  }
  let actual = null
  let eleccion = 'auto'
  const subs = []

  const luzSombra = () => {
    let l = null
    R.scene.traverse((o) => {
      if (!l && o.isDirectionalLight && o.castShadow) l = o
    })
    return l
  }

  function aplicar(id) {
    const P = PERFILES[id]
    if (!P) return
    const cambioSombra = ren.shadowMap.enabled !== P.sombras
    ren.setPixelRatio(P.pr)
    ren.shadowMap.enabled = P.sombras
    const L = luzSombra()
    if (L && L.shadow.mapSize.x !== P.mapa) {
      L.shadow.mapSize.set(P.mapa, P.mapa)
      if (L.shadow.map) {
        L.shadow.map.dispose()
        L.shadow.map = null
      }
    }
    if (cambioSombra)
      R.scene.traverse((o) => {
        if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true
      })
    ren.shadowMap.needsUpdate = true
    actual = id
    document.body.dataset.calidad = id
    for (const cb of subs) {
      try {
        cb(id, P)
      } catch (e) {
        console.error('[95-calidad]', e)
      }
    }
    if (R.invalidate) R.invalidate()
    if (sel) sel.value = eleccion
  }

  // ───────── bucle compartido ─────────
  const activos = new Set()
  let raf = 0
  const tick = () => {
    raf = activos.size ? requestAnimationFrame(tick) : 0
    if (raf && R.invalidate) R.invalidate()
  }
  function anim(nombre, on) {
    if (on) activos.add(nombre)
    else activos.delete(nombre)
    if (activos.size && !raf) raf = requestAnimationFrame(tick)
  }

  function medir() {
    return new Promise((res) => {
      let n = 0
      const t0 = performance.now()
      const paso = () => {
        R.renderer.render(R.scene, R.camera())
        // hasta 40 cuadros o 1,5 s: en equipos lentos la medición no debe demorar el arranque
        if (++n < 40 && (n < 3 || performance.now() - t0 < 1500)) requestAnimationFrame(paso)
        else res((n * 1000) / (performance.now() - t0))
      }
      requestAnimationFrame(paso)
    })
  }

  async function auto() {
    const tactilChico =
      matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 900
    if (tactilChico) return 'movil'
    const fps = await medir()
    window.__rigFxFps = Math.round(fps)
    return fps < 30 ? 'movil' : 'pc'
  }

  async function elegir(v) {
    eleccion = PERFILES[v] ? v : 'auto'
    if (KV) KV.set('campo:calidad', eleccion)
    aplicar(eleccion === 'auto' ? await auto() : eleccion)
  }

  // ───────── UI (menú Vista) ─────────
  const sel = document.createElement('select')
  sel.id = 'c-calidad'
  sel.setAttribute('aria-label', 'Calidad gráfica')
  sel.innerHTML =
    '<option value="auto">Calidad: Auto</option><option value="movil">Calidad: Celular</option><option value="pc">Calidad: PC</option><option value="presentacion">Calidad: Presentación</option>'
  sel.style.cssText =
    'width:100%;height:32px;font:inherit;font-size:12px;color:#DDE3EC;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:0 8px'
  sel.addEventListener('change', () => elegir(sel.value))
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('vista', sel)

  window.__rigFx = {
    perfil: () => actual,
    datos: () => (actual ? PERFILES[actual] : null),
    onPerfil(cb) {
      subs.push(cb)
      if (actual) cb(actual, PERFILES[actual])
    },
    anim,
    elegir,
  }

  const arrancar = async () => {
    if (KV) await KV.ready
    const g = KV ? KV.get('campo:calidad', 'auto') : 'auto'
    await elegir(typeof g === 'string' ? g : 'auto')
  }
  if (window.__rigBooted) setTimeout(arrancar, 300)
  else document.addEventListener('rig:boot', () => setTimeout(arrancar, 300), { once: true })
})
