/*
 * 80-perf.js — rendimiento del visor V2 SIN cambiar su aspecto. Se carga al final: corre después de los demás módulos.
 *
 *  1. Relación de píxeles: el visor usa min(devicePixelRatio, 2); se limita a 1,5 (−44 % de píxeles en pantallas 2×).
 *     La captura PNG (#c-png) sube un instante a min(devicePixelRatio, 2) para conservar la resolución de exportación.
 *  2. Sombras bajo demanda: el mapa de sombras (2048², ~340 casters) solo se vuelve a renderizar cuando algo que lo
 *     afecta cambió (visibilidad/transformaciones de casters y luces, versión de geometrías dinámicas, wireframe…).
 *     Un detector de firma barato envuelve `renderer.render`. Red de seguridad: como mucho cada `perf.safetyMs` (2 s).
 *  3. Fusión de mallas estáticas: solo el grupo `vientos` (ver STATIC_MERGE) — el resto ya viene fusionado por
 *     material y componente, y los grupos `drops_*` NO se fusionan entre sí (la capa DROPS los localiza por userData).
 *  4. Bucle `refresh` del producto (boot del HTML): polling eterno de `R.state.selected`; se "estaciona" y corre una
 *     vez por frame renderizado (la selección siempre pasa por At() → render), sin bucle rAF permanente.
 *
 * El visor renderiza bajo demanda (At() → rAF; Cl/ty solo re-piden frame si anima/amortigua). Expone `R.perf`.
 */
window.__rigExt.onPost((R) => {
  const r = R.renderer
  const T = R.three
  const sm = r.shadowMap
  const perf = (R.perf = {
    // red de seguridad: ante un cambio no previsto la sombra queda desactualizada como mucho `safetyMs`
    safetyMs: 2000,
    stats: { renders: 0, shadowPasses: 0, sigMs: 0, mergedMeshes: 0 },
    invalidateShadows: () => {
      forceShadows = true
      R.invalidate()
    },
  })
  let forceShadows = true // primer render siempre con sombras

  // ───────────── 3. fusión de mallas estáticas ─────────────
  /**
   * Grupos PROBADAMENTE estáticos cuyas mallas hermanas (mismo padre, mismo material) pueden fusionarse.
   *  - `vientos`: cables y anclajes. El despiece solo mueve el grupo entero (position), el aparejo (wl) solo toca
   *    el bloque viajero, los ramales y la polea del grupo `aparejo`; nada anima mallas sueltas de `vientos`.
   * No entran: `aparejo` (ramales con geometría dinámica, bloque viajero móvil), `mastil`/`subestructura`/`enganche`/
   * `camion`/… (sus mallas ya son 1 por material y sub-grupo `drops_*`; fusionar entre sub-grupos rompería
   * `userData.dropsId` y los anclajes de la capa DROPS).
   */
  const STATIC_MERGE = ['vientos']

  const mergeSiblings = (id) => {
    const group = R.groups[id]
    if (!group || !T.BufferGeometry || !T.Mesh) return 0
    const buckets = new Map()
    for (const m of group.children) {
      const g = m.geometry
      if (
        !m.isMesh ||
        m.isInstancedMesh ||
        m.isSkinnedMesh ||
        m.children.length ||
        Array.isArray(m.material) ||
        !m.matrixAutoUpdate ||
        !g ||
        !g.attributes.position ||
        g.morphAttributes.position || // (g.groups se ignora: con un solo material se dibuja la geometría completa)
        (m.name && m.name !== `${id}_parte`) ||
        Object.keys(m.userData).some((k) => k !== 'id')
      )
        continue
      const attrs = Object.keys(g.attributes)
        .sort()
        .map((k) => `${k}:${g.attributes[k].itemSize}:${g.attributes[k].array.constructor.name}`)
      const key = [
        m.material.uuid,
        m.castShadow,
        m.receiveShadow,
        m.visible,
        m.frustumCulled,
        m.renderOrder,
        !!g.index,
        attrs.join(','),
      ].join('|')
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(m)
    }
    let saved = 0
    for (const list of buckets.values()) {
      if (list.length < 2) continue
      const first = list[0]
      const names = Object.keys(first.geometry.attributes)
      const out = {}
      let vertexCount = 0
      let indexCount = 0
      for (const m of list) {
        vertexCount += m.geometry.attributes.position.count
        indexCount += m.geometry.index ? m.geometry.index.count : 0
      }
      for (const n of names) {
        const a = first.geometry.attributes[n]
        out[n] = new a.array.constructor(vertexCount * a.itemSize)
      }
      const idx = first.geometry.index ? new Uint32Array(indexCount) : null
      const v = new T.Vector3()
      let vOff = 0
      let iOff = 0
      let triSrc = 0
      for (const m of list) {
        m.updateMatrix()
        const nm = m.matrix.clone().invert().transpose() // matriz normal (inversa traspuesta)
        const g = m.geometry
        const count = g.attributes.position.count
        for (const n of names) {
          const a = g.attributes[n]
          const dst = out[n]
          for (let i = 0; i < count; i++) {
            if (n === 'position' || n === 'normal') {
              v.fromBufferAttribute(a, i)
              if (n === 'position') v.applyMatrix4(m.matrix)
              else v.transformDirection(nm)
              dst[(vOff + i) * 3] = v.x
              dst[(vOff + i) * 3 + 1] = v.y
              dst[(vOff + i) * 3 + 2] = v.z
            } else {
              for (let c = 0; c < a.itemSize; c++)
                dst[(vOff + i) * a.itemSize + c] = a.array[i * a.itemSize + c]
            }
          }
        }
        if (idx) {
          for (let i = 0; i < g.index.count; i++) idx[iOff + i] = g.index.array[i] + vOff
          iOff += g.index.count
          triSrc += g.index.count / 3
        } else triSrc += count / 3
        vOff += count
      }
      const geo = new T.BufferGeometry()
      for (const n of names) {
        const a = first.geometry.attributes[n]
        geo.setAttribute(n, new a.constructor(out[n], a.itemSize, a.normalized))
      }
      if (idx) geo.setIndex(new first.geometry.index.constructor(idx, 1))
      const triDst = (geo.index ? geo.index.count : vertexCount) / 3
      if (triDst !== triSrc) continue // los triángulos deben coincidir exactamente: si no, no se toca nada
      const merged = new T.Mesh(geo, first.material)
      merged.name = first.name
      merged.userData = { ...first.userData }
      merged.castShadow = first.castShadow
      merged.receiveShadow = first.receiveShadow
      merged.visible = first.visible
      merged.frustumCulled = first.frustumCulled
      merged.renderOrder = first.renderOrder
      group.add(merged)
      const pk = R.pickables
      for (const m of list) {
        group.remove(m)
        m.geometry.dispose()
        const at = pk.indexOf(m)
        if (at >= 0) pk.splice(at, 1)
      }
      pk.push(merged) // el mismo componente (userData.id) que las originales
      saved += list.length - 1
    }
    return saved
  }
  for (const id of STATIC_MERGE) perf.stats.mergedMeshes += mergeSiblings(id)

  // ───────────── 1. relación de píxeles ─────────────
  const PR_CAP = 1.5
  const PR_EXPORT_CAP = 2 // el original usaba min(dpr, 2): la exportación PNG lo conserva
  const wantPR = () => Math.min(window.devicePixelRatio || 1, PR_CAP)
  const applyPR = () => {
    const pr = wantPR()
    if (r.getPixelRatio() === pr) return
    r.setPixelRatio(pr) // redimensiona el canvas (setSize(w,h,false)); picking y etiquetas usan px CSS
    R.invalidate()
  }
  applyPR()
  window.addEventListener('resize', applyPR) // cambio de monitor / zoom del navegador

  const png = document.getElementById('c-png')
  if (png) {
    let raised = false
    // El handler original (onclick) renderiza y copia el canvas en el mismo tick: se sube el PR justo antes…
    png.addEventListener(
      'click',
      () => {
        const hi = Math.min(window.devicePixelRatio || 1, PR_EXPORT_CAP)
        if (hi > r.getPixelRatio()) {
          r.setPixelRatio(hi)
          raised = true
        }
      },
      true,
    )
    // …y se restaura justo después (renderizando en el acto para que no se vea el canvas vacío).
    png.addEventListener('click', () => {
      if (!raised) return
      raised = false
      r.setPixelRatio(wantPR())
      r.render(R.scene, R.camera())
    })
  }

  // ───────────── 2. sombras bajo demanda ─────────────
  let cur = new Float64Array(8192)
  let prev = new Float64Array(8192)
  let curN = 0
  let prevN = -1
  let lastShadow = 0
  const push = (x) => {
    if (curN === cur.length) {
      const bigger = new Float64Array(cur.length * 2)
      bigger.set(cur)
      cur = bigger
      prev = new Float64Array(bigger.length)
      prevN = -1
    }
    cur[curN++] = x
  }
  const pushShadowLight = (l) => {
    push(l.visible ? 1 : 0)
    push(l.castShadow ? 1 : 0)
    if (!l.castShadow) return
    push(l.intensity > 0 ? 1 : 0)
    push(l.position.x)
    push(l.position.y)
    push(l.position.z)
    if (l.target) (push(l.target.position.x), push(l.target.position.y), push(l.target.position.z))
    const s = l.shadow
    if (s) {
      ;(push(s.mapSize.x), push(s.mapSize.y), push(s.bias), push(s.normalBias), push(s.radius))
      const c = s.camera
      if (c) (push(c.left), push(c.right), push(c.top), push(c.bottom), push(c.near), push(c.far))
    }
  }
  const walk = (o) => {
    if (o.isLight) return pushShadowLight(o)
    if (o.isLine || o.isPoints || o.isSprite) return // no proyectan sombra
    if (o.layers.mask === 2 ** 31) return // capa oculta (procedural reemplazado por el SK-575, 84): ni se dibuja ni da sombra
    const isMesh = o.isMesh
    if (isMesh && !o.castShadow && !o.children.length) return // solo recibe: no altera el mapa
    push(o.visible ? 1 : 0)
    if (!o.visible) return
    const p = o.position
    const q = o.quaternion
    const s = o.scale
    ;(push(p.x), push(p.y), push(p.z))
    ;(push(q.x), push(q.y), push(q.z), push(q.w))
    ;(push(s.x), push(s.y), push(s.z))
    if (!o.matrixAutoUpdate) for (let i = 0; i < 16; i++) push(o.matrix.elements[i])
    if (isMesh && o.castShadow) {
      const g = o.geometry
      const pos = g && g.attributes && g.attributes.position
      push(g ? g.id : 0)
      push(pos ? pos.version : 0) // cables del aparejo: geometría que cambia con la altura del gancho
      push(g && g.index ? g.index.version : 0)
      const m = o.material
      const list = Array.isArray(m) ? m : [m]
      for (const mm of list) {
        // wireframe / alphaTest / lado / visibilidad del material se copian al material de profundidad
        push(mm.wireframe ? 1 : 0)
        push(mm.alphaTest || 0)
        push(mm.side)
        push(mm.visible ? 1 : 0)
        push(mm.opacity < 1 && mm.transparent ? mm.opacity : 1)
      }
    }
    for (let i = 0; i < o.children.length; i++) walk(o.children[i])
  }
  const shadowSignatureChanged = () => {
    curN = 0
    walk(R.scene)
    const cp = r.clippingPlanes
    push(cp ? cp.length : 0)
    if (cp) for (const pl of cp) push(pl.constant)
    const view = R.view
    if (view) (push(view.height), push(view.night ? 1 : 0), push(view.wire ? 1 : 0))
    push(R.state ? R.state.explode : 0)
    let changed = curN !== prevN
    if (!changed) {
      for (let i = 0; i < curN; i++)
        if (cur[i] !== prev[i]) {
          changed = true
          break
        }
    }
    const t = prev
    prev = cur
    cur = t
    prevN = curN
    return changed
  }

  sm.autoUpdate = false
  sm.needsUpdate = true

  // ───────────── 4. bucle `refresh` del producto ─────────────
  // boot() (script del producto) hace requestAnimationFrame(refresh) eternamente solo para detectar cambios de
  // R.state.selected. Cualquier cambio de selección pasa por selectComponent → At() → render: basta correrlo tras cada render.
  const nativeRAF = window.requestAnimationFrame.bind(window)
  let parked = null
  const isRefreshLoop = (cb) =>
    typeof cb === 'function' &&
    cb.name === 'refresh' &&
    cb.length === 0 &&
    Function.prototype.toString.call(cb).includes('R.state?.selected')
  window.requestAnimationFrame = (cb) => {
    if (isRefreshLoop(cb)) {
      parked = cb
      return 0
    }
    return nativeRAF(cb)
  }

  // ───────────── wrapper de render (sombras + refresh) ─────────────
  const origRender = r.render
  r.render = function (scene, camera) {
    const st = perf.stats
    if (scene === R.scene) {
      const t0 = performance.now()
      const changed = shadowSignatureChanged()
      st.sigMs += performance.now() - t0
      if (changed || forceShadows || t0 - lastShadow > perf.safetyMs) {
        sm.needsUpdate = true
        forceShadows = false
        lastShadow = t0
        st.shadowPasses++
      }
      st.renders++
    }
    origRender.call(this, scene, camera)
    if (scene === R.scene && parked) parked() // re-estaciona vía requestAnimationFrame (envuelto arriba)
  }
  perf.origRender = origRender
  perf.signatureChanged = shadowSignatureChanged // diagnóstico / medición
})
