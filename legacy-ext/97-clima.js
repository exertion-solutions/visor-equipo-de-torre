/*
 * 97-clima.js · clima ilustrativo de la locación (menú Capas → "Clima").
 *
 *  - Condición: Despejado · Viento con polvo · Lluvia · Nieve. Partículas en un solo draw call: cuadritos orientados a
 *    cámara en el vertex shader, posición = semilla + (viento + caída) · t, envueltas en una caja de 90 × 40 × 70 m
 *    alrededor del pozo. La GPU anima todo; el bucle continuo (95-calidad) corre solo mientras hay clima activo.
 *  - Viento: deslizador 0–100 km/h desde el oeste (dirección fija, ilustrativa). Por encima de 40 km/h el panel muestra
 *    "Consultar el procedimiento aplicable para maniobras con viento": el visor NO fija umbrales ni suspende tareas.
 *  - Celular: un cuarto de las partículas.
 * Es una representación visual: no simula clima, cargas de viento sobre el mástil ni visibilidad real.
 * API para pruebas: window.__rigClima = { set(cond, kmh), estado() }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const sc = R.scene
  if (!T || !T.ShaderMaterial || !T.BufferAttribute) return
  const FX = window.__rigFx
  const N = 6000
  const CAJA = [90, 40, 70]
  const CENTRO = [-6, 20, 0]

  const COND = {
    despejado: null,
    polvo: { color: [0.78, 0.68, 0.52], tam: 0.12, caida: 0.15, alfa: 0.35, n: 1, vientoMin: 25 },
    lluvia: { color: [0.75, 0.82, 0.92], tam: 0.03, caida: 9, alfa: 0.45, n: 1, estirar: 14 },
    nieve: { color: [0.97, 0.98, 1.0], tam: 0.11, caida: 1.1, alfa: 0.85, n: 0.8 },
  }

  // geometría: N cuadritos (4 vértices) con semilla y esquina
  const seed = new Float32Array(N * 4 * 3)
  const corner = new Float32Array(N * 4 * 2)
  const idx = new Uint32Array(N * 6)
  let s = 12345
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < N; i++) {
    const sx = (rnd() - 0.5) * CAJA[0]
    const sy = rnd() * CAJA[1]
    const sz = (rnd() - 0.5) * CAJA[2]
    const cs = [-1, -1, 1, -1, 1, 1, -1, 1]
    for (let k = 0; k < 4; k++) {
      seed.set([sx, sy, sz], (i * 4 + k) * 3)
      corner.set([cs[k * 2], cs[k * 2 + 1]], (i * 4 + k) * 2)
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6)
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.BufferAttribute(seed, 3))
  geo.setAttribute('corner', new T.BufferAttribute(corner, 2))
  geo.setIndex(new T.BufferAttribute(idx, 1))
  const mat = new T.ShaderMaterial({
    uniforms: {
      t: { value: 0 },
      viento: { value: new T.Vector3(0, 0, 0) },
      caida: { value: 1 },
      tam: { value: 0.05 },
      estirar: { value: 0 },
      color: { value: new T.Color(1, 1, 1) },
      alfa: { value: 0.5 },
      caja: { value: new T.Vector3(...CAJA) },
      centro: { value: new T.Vector3(...CENTRO) },
    },
    vertexShader: `
      attribute vec2 corner;
      uniform float t, caida, tam, estirar; uniform vec3 viento, caja, centro;
      varying vec2 vC;
      void main(){
        vec3 p = position + (viento + vec3(0.0, -caida, 0.0)) * t;
        p.x += sin(t * 0.7 + position.y) * 0.3 * (1.0 - step(5.0, caida));
        p = mod(p + caja * 0.5, caja) - caja * 0.5;
        p.y += caja.y * 0.5;
        p += centro - vec3(0.0, caja.y * 0.5, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec2 c = corner * tam;
        c.y *= 1.0 + estirar;
        mv.xy += c;
        vC = corner;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float alfa; varying vec2 vC;
      void main(){ float d = length(vC); if (d > 1.0) discard; gl_FragColor = vec4(color, alfa * (1.0 - d * d)); }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  })
  const mesh = new T.Mesh(geo, mat)
  mesh.name = 'clima_particulas'
  mesh.frustumCulled = false
  mesh.renderOrder = 60
  mesh.visible = false
  mesh.raycast = () => {}
  sc.add(mesh)

  let cond = 'despejado'
  let kmh = 0
  let t0 = performance.now()
  mesh.onBeforeRender = () => {
    mat.uniforms.t.value = ((performance.now() - t0) / 1000) % 3600
  }

  function aplicar() {
    const C = COND[cond]
    const ms = kmh / 3.6
    mat.uniforms.viento.value.set(ms, 0, ms * 0.25) // del oeste, levemente al sur (ilustrativo)
    if (C) {
      const movil = window.__rigFx && window.__rigFx.perfil() === 'movil'
      const usar = Math.round(N * C.n * (movil ? 0.25 : 1))
      geo.setDrawRange(0, usar * 6)
      mat.uniforms.caida.value = C.caida
      mat.uniforms.tam.value = C.tam
      mat.uniforms.estirar.value = C.estirar || 0
      mat.uniforms.color.value.setRGB(...C.color)
      mat.uniforms.alfa.value = C.alfa
    }
    mesh.visible = !!C
    if (FX) FX.anim('clima', !!C)
    aviso.hidden = kmh <= 40
    salida.textContent = `${kmh} km/h`
    if (R.invalidate) R.invalidate()
  }

  function set(c, v) {
    if (Object.prototype.hasOwnProperty.call(COND, c)) cond = c
    if (typeof v === 'number' && isFinite(v)) kmh = Math.max(0, Math.min(100, Math.round(v)))
    if (cond === 'polvo' && kmh < COND.polvo.vientoMin) kmh = COND.polvo.vientoMin
    sel.value = cond
    rango.value = String(kmh)
    t0 = performance.now()
    aplicar()
  }

  // ───────── UI (menú Capas) ─────────
  const box = document.createElement('div')
  box.id = 'clima-ctl'
  box.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:4px;font-size:12px'
  box.innerHTML =
    '<select aria-label="Clima" style="height:32px;font:inherit;color:#DDE3EC;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:0 8px">' +
    '<option value="despejado">Clima: Despejado</option><option value="polvo">Clima: Viento con polvo</option><option value="lluvia">Clima: Lluvia</option><option value="nieve">Clima: Nieve</option></select>' +
    '<label style="display:flex;align-items:center;gap:6px">Viento <input type="range" min="0" max="100" step="5" value="0" style="flex:1" aria-label="Velocidad del viento (ilustrativa)"><output>0 km/h</output></label>' +
    '<div data-aviso hidden style="color:#E8C978;font-size:11px">Viento fuerte: consultar el procedimiento aplicable para maniobras con viento (el visor no fija umbrales).</div>' +
    '<div style="opacity:.6;font-size:10.5px">Clima ilustrativo: no simula cargas de viento ni visibilidad.</div>'
  const sel = box.querySelector('select')
  const rango = box.querySelector('input')
  const salida = box.querySelector('output')
  const aviso = box.querySelector('[data-aviso]')
  sel.addEventListener('change', () => set(sel.value))
  rango.addEventListener('input', () => set(cond, Number(rango.value)))
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('capas', box)

  if (FX) FX.onPerfil(() => aplicar())
  window.__rigClima = { set, estado: () => ({ cond, kmh, visible: mesh.visible }) }
})
