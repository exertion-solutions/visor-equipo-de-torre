/*
 * 88-fosa-quema.js — FOSA DE QUEMA (foso para quemar gas) con dos líneas y llamas animadas. Módulo de presentación del V2.
 *
 *   · Línea 1 → sale de la línea de venteo al campo del choke manifold (sk575_manifold, extremo x 6,15 / z −19,98).
 *   · Línea 2 → sale del desgasificador ("golpeador") de la pileta de ensayo (sk575_piletas, x 21,7 / z −28,9).
 *   Las dos corren sobre el terreno apoyadas en tacos de hormigón y terminan en la fosa, a la derecha de la pileta de ensayo,
 *   como en el esquema aportado por el usuario.
 *
 * ESTADO: ilustrativo (pendingValidation). La POSICIÓN, la distancia al pozo, las dimensiones de la fosa, el diámetro de las
 * líneas y el ruteo vienen de un esquema sin cotas: NO son distancias de seguridad ni requisitos, y no hay documento de la
 * locación que las confirme. Las llamas y el humo son un EFECTO VISUAL: no representan caudal, altura de llama, radiación
 * térmica ni ninguna simulación; se apagan con el botón "Llamas de la fosa" del menú Capas.
 *
 * Marco: origen = boca de pozo, +X hacia el mástil, carrier hacia −X, Z lateral. 1 unidad = 1 m.
 * Geometría: `R.three` solo expone unas pocas clases, así que las llamas son mallas de vértices con color RGBA animadas por CPU
 * (mezcla aditiva, sin textura ni shader); el humo son esferas translúcidas. Render bajo demanda: mientras la fosa está en
 * cuadro y las llamas encendidas, un temporizador de ~24 cuadros/s pide un frame; fuera de cuadro o con la pestaña oculta no pide nada.
 * API para pruebas: `window.__tackerFosa = { pos, lineas, estado, llamas(on?), activo() }`.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  if (!R.scene || !T || !T.BufferGeometry || !T.CylinderGeometry || !T.MeshBasicMaterial) return
  const V3 = T.Vector3

  // ───────────────────────── datos (ilustrativos) ─────────────────────────
  const PIT = { cx: 44.5, cz: -27.5, L: 8, W: 5 } // centro y tamaño de la fosa (m), esquema sin cotas
  const TIP_X = 44.9 // extremo de las dos líneas dentro de la fosa
  const Y_G = 0.28 // eje de las líneas apoyadas en el terreno
  const R_PIPE = 0.09
  const LINEAS = {
    choke: {
      nombre: 'Línea desde el choke manifold (venteo al campo)',
      z: -26.1,
      alto: 4.6,
      pts: [
        [6.15, 0.15, -19.98], // extremo de la línea de venteo del modelo SK-575
        [6.15, 0.75, -19.98], // cruce aéreo sobre la línea al golpeador (x 7,78)
        [8.6, 0.75, -19.98],
        [8.6, Y_G, -19.98],
        [30, Y_G, -19.98],
        [30, Y_G, -26.1],
        [TIP_X, Y_G, -26.1],
      ],
    },
    golpeador: {
      nombre: 'Línea desde el golpeador (desgasificador de la pileta de ensayo)',
      z: -28.9,
      alto: 3.4,
      pts: [
        [21.7, 4.1, -28.9], // codo de venteo del desgasificador
        [23.6, 4.1, -28.9],
        [23.6, Y_G, -28.9],
        [TIP_X, Y_G, -28.9],
      ],
    },
  }

  const Z_MED = (LINEAS.choke.z + LINEAS.golpeador.z) / 2 // eje medio de las dos líneas

  const g = new T.Group()
  g.name = 'fosa_quema'
  g.userData = {
    estado: 'pendingValidation',
    nota: 'Posición y dimensiones ilustrativas (esquema sin cotas); llamas = efecto visual',
  }
  R.scene.add(g)

  const std = (color, roughness = 0.9, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness })
  const M = {
    tierra: std('#7B6247', 1),
    ceniza: std('#141517', 1),
    acero: std('#7E858B', 0.5, 0.6),
    tapa: std('#2B2F36', 0.6, 0.5),
    taco: std('#8C8F89', 0.95),
    hollin: new T.MeshBasicMaterial({
      color: '#0D0D0E',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  }
  const put = (geo, mat, x, y, z) => {
    const m = new T.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.castShadow = false
    m.receiveShadow = false
    g.add(m)
    return m
  }
  const rod = (a, b, r, mat) => {
    const d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const len = d.length()
    if (len < 1e-6) return
    const m = put(
      new T.CylinderGeometry(r, r, len, 10, 1),
      mat,
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      (a[2] + b[2]) / 2,
    )
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize())
  }

  // ───────────────────────── fosa: piso de ceniza, hollín y terraplenes en 3 lados (abierta hacia −X) ─────────────────────────
  put(new T.BoxGeometry(PIT.L, 0.04, PIT.W), M.ceniza, PIT.cx, 0.02, PIT.cz)
  const hollin = (rx, rz, x, z) => {
    const geo = new T.CircleGeometry(1, 28)
    geo.rotateX(-Math.PI / 2)
    const m = put(geo, M.hollin, x, 0.012, z)
    m.scale.set(rx, 1, rz)
  }
  hollin(PIT.L * 0.75, PIT.W * 0.95, PIT.cx - 0.6, PIT.cz) // quemado del terreno alrededor de la fosa
  hollin(3.2, 1.3, PIT.cx - 5.2, Z_MED) // huella de la entrada de las líneas
  // terraplén: tronco de pirámide de 4 caras (CylinderGeometry de 4 lados girada 45°, lado √2 abajo y √2/2 arriba)
  const berm = (cx, cz, sx, sz, h) => {
    const geo = new T.CylinderGeometry(0.5, 1, 1, 4, 1)
    geo.rotateY(Math.PI / 4)
    const m = put(geo, M.tierra, cx, h / 2, cz)
    m.scale.set(sx / Math.SQRT2, h, sz / Math.SQRT2)
  }
  const BH = 1.15
  berm(PIT.cx + PIT.L / 2 + 0.9, PIT.cz, 2.4, PIT.W + 4.6, BH) // fondo (+X)
  berm(PIT.cx + 0.2, PIT.cz + PIT.W / 2 + 0.9, PIT.L + 2.6, 2.4, BH) // lado +Z
  berm(PIT.cx + 0.2, PIT.cz - PIT.W / 2 - 0.9, PIT.L + 2.6, 2.4, BH) // lado −Z

  // ───────────────────────── líneas: caño, uniones y tacos de hormigón ─────────────────────────
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  for (const L of Object.values(LINEAS)) {
    const p = L.pts
    for (let i = 1; i < p.length; i++) {
      rod(p[i - 1], p[i], R_PIPE, M.acero)
      if (i < p.length - 1)
        put(new T.SphereGeometry(R_PIPE * 1.25, 8, 6), M.acero, p[i][0], p[i][1], p[i][2]) // codo
      // tacos de apoyo cada ~4,5 m en los tramos sobre el terreno
      if (p[i][1] === Y_G && p[i - 1][1] === Y_G) {
        const n = Math.max(1, Math.floor(dist(p[i - 1], p[i]) / 6))
        for (let k = 0; k <= n; k++) {
          const t = k / n
          put(
            new T.BoxGeometry(0.45, Y_G - R_PIPE - 0.01, 0.45),
            M.taco,
            p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t,
            (Y_G - R_PIPE - 0.01) / 2,
            p[i - 1][2] + (p[i][2] - p[i - 1][2]) * t,
          )
        }
      }
    }
    // extremo: campana abierta (deflector) y dos soportes en A
    const z = L.z
    const hood = put(
      new T.CylinderGeometry(0.17, 0.17, 0.5, 12, 1, true),
      M.tapa,
      TIP_X + 0.25,
      Y_G,
      z,
    )
    hood.rotation.z = Math.PI / 2
    hood.material.side = T.DoubleSide
    for (const dx of [-1.2, -2.6])
      for (const s of [-1, 1])
        rod([TIP_X + dx, 0, z + s * 0.28], [TIP_X + dx, Y_G - R_PIPE, z], 0.025, M.acero)
  }
  // bajante del desgasificador: abrazaderas cada ~1,2 m
  for (let y = 0.9; y < 4.0; y += 1.2)
    put(new T.BoxGeometry(0.06, 0.05, 0.3), M.tapa, 23.6, y, -28.9)

  // ───────────────────────── llamas: mallas de vértices con color RGBA, mezcla aditiva ─────────────────────────
  const Attr = new T.BoxGeometry(1, 1, 1).attributes.position.constructor
  const N = 14 // anillos
  const S = 10 // lados
  const lerpRamp = (ramp, t) => {
    for (let i = 1; i < ramp.length; i++)
      if (t <= ramp[i][0]) {
        const [t0, c0] = ramp[i - 1]
        const [t1, c1] = ramp[i]
        const k = (t - t0) / (t1 - t0 || 1)
        return c0.map((v, j) => v + (c1[j] - v) * k)
      }
    return ramp[ramp.length - 1][1]
  }
  const RAMP_OUT = [
    [0, [1, 0.62, 0.18, 0.55]],
    [0.18, [1, 0.55, 0.13, 0.5]],
    [0.5, [1, 0.36, 0.05, 0.4]],
    [0.8, [0.85, 0.2, 0.03, 0.26]],
    [1, [0.5, 0.08, 0, 0]],
  ]
  const RAMP_CORE = [
    [0, [1, 0.9, 0.6, 0.6]],
    [0.4, [1, 0.78, 0.35, 0.45]],
    [1, [1, 0.6, 0.15, 0]],
  ]
  const llamaMat = new T.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: 2, // THREE.AdditiveBlending
    fog: false,
  })
  const grupoLlamas = new T.Group()
  grupoLlamas.name = 'fosa_quema_llamas'
  g.add(grupoLlamas)

  function llama({ x, y, z, H, R0, lean, phase, ramp }) {
    const nv = (N + 1) * S
    const pos = new Float32Array(nv * 3)
    const col = new Float32Array(nv * 4)
    const idx = []
    for (let i = 0; i <= N; i++) {
      const c = lerpRamp(ramp, i / N)
      for (let j = 0; j < S; j++) col.set(c, (i * S + j) * 4)
    }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < S; j++) {
        const a = i * S + j
        const b = i * S + ((j + 1) % S)
        const c = (i + 1) * S + j
        const d = (i + 1) * S + ((j + 1) % S)
        idx.push(a, c, b, b, c, d)
      }
    const geo = new T.BufferGeometry()
    const aPos = new Attr(pos, 3)
    const arr = aPos.array // el atributo copia el array recibido: se escribe sobre su propia copia
    geo.setAttribute('position', aPos)
    geo.setAttribute('color', new Attr(col, 4))
    geo.setIndex(idx)
    const mesh = new T.Mesh(geo, llamaMat)
    mesh.position.set(x, y, z)
    mesh.frustumCulled = false
    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.renderOrder = 6
    grupoLlamas.add(mesh)
    return (t) => {
      for (let i = 0; i <= N; i++) {
        const tt = i / N
        const prof =
          R0 *
          (Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + 0.9 * tt)), 0.9) *
            Math.pow(1 - tt, 0.55) +
            0.05)
        const w = tt * tt
        const cx =
          lean * H * Math.pow(tt, 1.7) +
          w *
            0.16 *
            H *
            (0.6 * Math.sin(t * 5.1 + phase + tt * 5) +
              0.4 * Math.sin(t * 8.7 + phase * 1.7 + tt * 9))
        const cz = w * 0.12 * H * Math.sin(t * 4.3 + phase * 0.7 + tt * 6)
        const yy = tt * H * (1 + 0.06 * Math.sin(t * 11 + phase))
        for (let j = 0; j < S; j++) {
          const a = (2 * Math.PI * j) / S
          const r = prof * (1 + 0.14 * Math.sin(t * 13 + j * 1.9 + i * 0.8 + phase))
          const o = (i * S + j) * 3
          arr[o] = cx + r * Math.cos(a)
          arr[o + 1] = yy
          arr[o + 2] = cz + r * Math.sin(a)
        }
      }
      aPos.needsUpdate = true
    }
  }

  const actualizar = []
  for (const [k, L] of Object.entries(LINEAS)) {
    const ph = k === 'choke' ? 0 : 2.3
    const base = { x: TIP_X + 0.55, y: Y_G + 0.1, z: L.z, lean: 0.28 }
    actualizar.push(llama({ ...base, H: L.alto, R0: 0.62, phase: ph, ramp: RAMP_OUT }))
    actualizar.push(llama({ ...base, H: L.alto * 0.62, R0: 0.3, phase: ph + 1.1, ramp: RAMP_CORE }))
    actualizar.push(
      llama({
        ...base,
        x: base.x + 0.15,
        z: L.z + 0.18,
        H: L.alto * 0.8,
        R0: 0.2,
        phase: ph + 2.7,
        ramp: RAMP_OUT,
      }),
    )
    actualizar.push(
      llama({
        ...base,
        x: base.x - 0.1,
        z: L.z - 0.2,
        H: L.alto * 0.7,
        R0: 0.18,
        phase: ph + 4.1,
        ramp: RAMP_OUT,
      }),
    )
  }

  // resplandor sobre el terreno (disco aditivo con alfa radial), pulsa con la llama
  const discoGeo = (() => {
    const K = 28
    const p = new Float32Array((K + 1) * 3)
    const c = new Float32Array((K + 1) * 4)
    const idx = []
    c.set([1, 0.55, 0.18, 0.5], 0)
    for (let k = 0; k < K; k++) {
      const a = (2 * Math.PI * k) / K
      p.set([Math.cos(a), 0, Math.sin(a)], (k + 1) * 3)
      c.set([1, 0.4, 0.08, 0], (k + 1) * 4)
      idx.push(0, k + 1, ((k + 1) % K) + 1)
    }
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new Attr(p, 3))
    geo.setAttribute('color', new Attr(c, 4))
    geo.setIndex(idx)
    return geo
  })()
  const resplandor = new T.Mesh(discoGeo, llamaMat)
  resplandor.position.set(TIP_X + 1.0, 0.06, Z_MED)
  resplandor.frustumCulled = false
  resplandor.renderOrder = 5
  grupoLlamas.add(resplandor)

  // humo: esferas oscuras translúcidas que suben y se corren con el viento (+X); cada una con su opacidad
  const humoGeo = new T.SphereGeometry(1, 7, 5)
  const humo = []
  for (const L of Object.values(LINEAS))
    for (let k = 0; k < 6; k++) {
      const mat = new T.MeshBasicMaterial({
        color: '#2A2A2B',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const m = new T.Mesh(humoGeo, mat)
      m.frustumCulled = false
      m.castShadow = false
      m.renderOrder = 7
      grupoLlamas.add(m)
      humo.push({ m, mat, z: L.z, h: L.alto, off: k / 6, life: 4.2 })
    }

  function actualizarEfectos(t) {
    for (const f of actualizar) f(t)
    const pulso = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 3.7 + 1)
    resplandor.scale.set(7 * pulso, 1, 5.2 * pulso)
    llamaMat.opacity = 0.92 + 0.08 * Math.sin(t * 17)
    for (const s of humo) {
      const age = (((t / s.life + s.off) % 1) + 1) % 1 // 0..1
      const a = age * s.life
      s.m.position.set(
        TIP_X + 0.6 + a * 1.1 + Math.sin(t * 0.8 + s.off * 9) * 0.25,
        Y_G + s.h * 0.75 + a * 1.5,
        s.z + Math.sin(a * 1.3 + s.off * 7) * 0.35,
      )
      const e = 0.5 + age * 1.4
      s.m.scale.set(e, e, e)
      s.mat.opacity = 0.24 * Math.sin(Math.PI * Math.min(1, age * 1.15)) * (1 - age * 0.35)
    }
  }

  // ───────────────────────── interruptor y bucle de animación ─────────────────────────
  let on = true
  let timer = 0
  const v = new V3()
  const enCuadro = () => {
    v.set(PIT.cx, 2, PIT.cz).project(R.camera())
    return Math.abs(v.x) < 1.25 && Math.abs(v.y) < 1.25 && v.z > -1 && v.z < 1
  }
  const tick = () => {
    if (!on || document.hidden || !enCuadro()) return
    actualizarEfectos(performance.now() / 1000)
    R.invalidate()
  }
  function llamas(next) {
    if (typeof next === 'boolean' && next !== on) {
      on = next
      grupoLlamas.visible = on
      btn.classList.toggle('on', on)
      btn.setAttribute('aria-pressed', String(on))
      if (on) actualizarEfectos(performance.now() / 1000)
      const msg = document.getElementById('cad-message')
      if (msg)
        msg.textContent = on
          ? 'Fosa de quema · llamas y humo = efecto visual, no simulación. Posición y dimensiones ilustrativas (pendientes de validación).'
          : 'Llamas de la fosa de quema apagadas.'
      R.invalidate()
    }
    return on
  }

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn on'
  btn.id = 'c-fosa'
  btn.textContent = 'Llamas de la fosa'
  btn.title =
    'Efecto visual de la fosa de quema (no es simulación). Posición ilustrativa, pendiente de validación.'
  btn.setAttribute('aria-pressed', 'true')
  btn.addEventListener('click', () => llamas(!on))
  if (window.__rigToolbar && window.__rigToolbar.add) window.__rigToolbar.add('capas', btn)
  else document.body.appendChild(btn)

  actualizarEfectos(performance.now() / 1000)
  timer = setInterval(tick, 42)
  window.addEventListener('pagehide', () => clearInterval(timer))

  R.invalidate()
  window.__tackerFosa = {
    pos: { ...PIT, tipX: TIP_X },
    lineas: Object.fromEntries(
      Object.entries(LINEAS).map(([k, L]) => [k, { nombre: L.nombre, pts: L.pts }]),
    ),
    estado: 'pendingValidation',
    llamas,
    activo: () => on,
  }
})
