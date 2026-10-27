/*
 * 84-modelo-sk575.js — MODELO SK-575 (CAD build123d) en el visor V2, con el aspecto del visor CAD de referencia
 * (~/cad/visor.py, skill `equipo-3d`): materiales PBR por pieza, mapa de entorno tipo "room", aristas a 28° y desgaste.
 *
 * Datos: los 16 GLB `public/models/rig10/sk575_*.glb` (cad/sk575/modelo.py → exportar.py → gltf:optimize), cargados con
 * fetch desde ../models/rig10/ (respaldo base64 `window.__RIG_SK575_GLB` en sk575-glb.js, ver scripts/build-legacy.mjs)
 * + el decodificador meshopt (`window.__MeshoptDecoder`).
 * El V2 no trae GLTFLoader: este lector cubre solo el contrato de esos GLB (nodos TRS, primitivas con POSITION/NORMAL/índices,
 * EXT_meshopt_compression, KHR_mesh_quantization, PBR metallic-roughness) y las aristas horneadas `<nodo>_aristas` (LINES,
 * umbral 28°, exportar.py): el navegador ya no las calcula.
 *
 * Marco = el del V2: origen en la boca de pozo a nivel de terreno, carrier hacia −X, Y arriba, metros. NO es as-built
 * (confianza B/C por componente, informe técnico interno (no publicado)). Desgaste y entorno son EFECTOS VISUALES.
 *
 * Es EL equipo del V2: cada componente SK-575 se integra en su grupo procedural (despiece, selección, aislado, corte, malla, modos,
 * secuencia de montaje, izamiento y aparejo animado) y TODA la geometría procedural pasa a una capa invisible (también la casilla
 * del maquinista, que el SK-575 no modela). Sub-nodos del GLB con grupo propio: cabina y motor (dentro del carrier) y piso de
 * enganche (dentro del mástil, sigue al 2.º tramo). API para pruebas: `window.__rigSk575 = { ready, isOn, sinPieza, stats }`.
 */
window.__rigExt.onPost((R) => {
  const FILES = window.__RIG_SK575_FILES
  const MD = window.__MeshoptDecoder
  if (!FILES || !FILES.length || !MD || !R.scene || !R.three || !R.renderer) return
  const T = R.three
  const BufferAttribute = Object.getPrototypeOf(
    new T.BoxGeometry(1, 1, 1).attributes.position.constructor,
  )
  const invalidate = () => typeof R.invalidate === 'function' && R.invalidate()
  const SIN_SOMBRA = /_(cable|luz|vidrio)$/ // por nombre de material (exportar.py)
  // medición de la carga (window.__rigSk575.stats); fuente = 'fetch' | 'base64'
  const stats = { fuente: '', bytesMs: 0, decodeMs: 0 }
  // aristas horneadas: un solo material para todas (como visor.py); no participan del picking ni proyectan sombra
  const lineaMat = new T.LineBasicMaterial({ color: '#0b0d10', transparent: true, opacity: 0.55 })
  /** LineSegments sin exponer la clase: three dibuja gl.LINES por la marca `isLineSegments`. */
  const segmentos = (geo) => {
    const l = new T.Line(geo, lineaMat)
    l.isLineSegments = true
    l.raycast = () => {}
    return l
  }

  // ───────── entorno tipo RoomEnvironment (solo para estos materiales: el V2 no tiene scene.environment) ─────────
  function entorno() {
    const room = new R.scene.constructor()
    const caja = new T.Mesh(
      new T.BoxGeometry(1, 1, 1),
      new T.MeshStandardMaterial({
        color: '#7f7f7f',
        side: T.BackSide,
        roughness: 1,
        metalness: 0,
      }),
    )
    caja.scale.set(30, 16, 30)
    caja.position.y = 7
    room.add(caja, new T.HemisphereLight('#ffffff', '#444444', 3))
    const panel = (x, y, z, sx, sy, sz, k) => {
      const m = new T.Mesh(
        new T.BoxGeometry(1, 1, 1),
        new T.MeshBasicMaterial({ color: new T.Color().setRGB(k, k, k) }),
      )
      m.position.set(x, y, z)
      m.scale.set(sx, sy, sz)
      room.add(m)
    }
    panel(0, 14.5, 0, 12, 0.2, 6, 6) // techo
    panel(-14.5, 8, 4, 0.2, 5, 8, 4) // laterales
    panel(14.5, 6, -6, 0.2, 4, 6, 3)
    panel(0, 7, -14.5, 10, 4, 0.2, 2.5)
    const pm = new T.PMREMGenerator(R.renderer)
    const tex = pm.fromScene(room, 0.04).texture
    pm.dispose()
    room.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) o.material.dispose()
    })
    return tex
  }

  // ───────── desgaste de visor.py (suciedad cerca del suelo + variación de brillo, coordenadas de mundo) ─────────
  const NOISE = `varying vec3 vW;
float h3(vec3 p){return fract(sin(dot(p,vec3(12.99,78.23,37.72)))*43758.55);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`
  function desgaste(sh) {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;',
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float n=vn(vW*3.)*.6+vn(vW*11.)*.4;float sucio=smoothstep(2.2,0.,vW.y)*(.45+.55*n);
diffuseColor.rgb*=mix(.92+.16*n,.45,sucio*.75);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+(n-.5)*.18+sucio*.35,0.,1.);`,
      )
  }

  // ───────── lector GLB mínimo ─────────
  const CT = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array,
  }
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

  // ───────── bytes de los GLB: fetch por http(s); respaldo base64 (--standalone o sk575-glb.js) ─────────
  // Servido (Pages, iframe de la app): ../models/rig10/<id>.glb, binario, sin el +33 % del base64 ni el atob.
  // file:// no admite fetch y el iframe sandbox (origen opaco) necesita CORS del servidor: si falla cualquier GLB se usa el
  // base64 para todos (un <script> clásico carga también por file:// y sin CORS).
  const desdeB64 = (b64) => {
    const s = atob(b64)
    const bin = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bin[i] = s.charCodeAt(i) // sin callback por byte (×20 más rápido)
    return bin
  }
  const respaldoB64 = () =>
    window.__RIG_SK575_GLB
      ? Promise.resolve(window.__RIG_SK575_GLB)
      : new Promise((ok, mal) => {
          const s = document.createElement('script')
          s.src = 'sk575-glb.js' // junto al HTML (scripts/build-legacy.mjs)
          s.onload = () =>
            window.__RIG_SK575_GLB
              ? ok(window.__RIG_SK575_GLB)
              : mal(new Error('sk575-glb.js sin datos'))
          s.onerror = () => mal(new Error('no se pudo cargar sk575-glb.js'))
          document.head.appendChild(s)
        })
  // Embebido en la app sin conexión: el iframe sandbox (origen opaco) no pasa por el modo sin conexión del sitio
  // (public/sw.js), la app sí. Si el fetch propio falla, se le piden los GLB a la app (rig:glbGet → rig:glbs, con los
  // ArrayBuffer transferidos, sin copia). 8 s de espera; si no responde, sigue el respaldo base64.
  const porApp = () =>
    new Promise((ok, mal) => {
      if (window.parent === window) return mal(new Error('no embebido'))
      const fin = setTimeout(() => {
        removeEventListener('message', oir)
        mal(new Error('la app no respondió'))
      }, 8000)
      function oir(e) {
        const d = e.data
        if (e.source !== window.parent || !d || d.type !== 'rig:glbs' || !d.bufs) return
        clearTimeout(fin)
        removeEventListener('message', oir)
        if (!FILES.every((id) => d.bufs[id] instanceof ArrayBuffer && d.bufs[id].byteLength > 20))
          return mal(new Error('la app no tiene todos los GLB'))
        ok(Object.fromEntries(FILES.map((id) => [id, new Uint8Array(d.bufs[id])])))
      }
      addEventListener('message', oir)
      window.parent.postMessage({ type: 'rig:glbGet', ids: FILES }, '*')
    })
  async function bytesGlb() {
    const t0 = performance.now()
    let out = null
    if (!window.__RIG_SK575_GLB && /^https?:$/.test(location.protocol)) {
      try {
        const bufs = await Promise.all(
          FILES.map((id) =>
            fetch(new URL('../models/rig10/' + id + '.glb', location.href)).then((r) => {
              if (!r.ok) throw new Error(id + ': HTTP ' + r.status)
              return r.arrayBuffer()
            }),
          ),
        )
        out = Object.fromEntries(FILES.map((id, i) => [id, new Uint8Array(bufs[i])]))
        stats.fuente = 'fetch'
      } catch (e) {
        try {
          out = await porApp()
          stats.fuente = 'app'
        } catch (e2) {
          console.warn(
            '[modelo SK-575] fetch de los GLB falló, se usa el respaldo base64:',
            e.message,
            '·',
            e2.message,
          )
        }
      }
    }
    if (!out) {
      const B64 = await respaldoB64()
      const t1 = performance.now()
      out = Object.fromEntries(FILES.map((id) => [id, desdeB64(B64[id])]))
      stats.decodeMs = performance.now() - t1
      stats.fuente = 'base64'
    }
    stats.bytesMs = performance.now() - t0
    return out
  }

  async function leerGlb(bin, envMap) {
    const dv = new DataView(bin.buffer)
    const jl = dv.getUint32(12, true)
    const J = JSON.parse(new TextDecoder().decode(bin.subarray(20, 20 + jl)))
    const BIN = bin.subarray(28 + jl, 28 + jl + dv.getUint32(20 + jl, true))
    await MD.ready
    const views = J.bufferViews.map((bv) => {
      const ext = bv.extensions && bv.extensions.EXT_meshopt_compression
      if (!ext) {
        const o = bv.byteOffset || 0
        return { data: BIN.subarray(o, o + bv.byteLength), stride: bv.byteStride }
      }
      const o = ext.byteOffset || 0
      const out = new Uint8Array(ext.count * ext.byteStride)
      MD.decodeGltfBuffer(
        out,
        ext.count,
        ext.byteStride,
        BIN.subarray(o, o + ext.byteLength),
        ext.mode,
        ext.filter || 'NONE',
      )
      return { data: out, stride: bv.byteStride } // stride del accessor = el de la vista (los índices no lo declaran)
    })
    const acc = (i) => {
      const a = J.accessors[i]
      const v = views[a.bufferView]
      const C = CT[a.componentType]
      const n = NC[a.type]
      const es = n * C.BYTES_PER_ELEMENT
      const stride = v.stride || es
      const ob = new Uint8Array(a.count * es)
      const o = a.byteOffset || 0
      if (stride === es) ob.set(v.data.subarray(o, o + a.count * es))
      else
        for (let k = 0; k < a.count; k++)
          ob.set(v.data.subarray(o + k * stride, o + k * stride + es), k * es)
      return new BufferAttribute(new C(ob.buffer), n, !!a.normalized)
    }
    const mats = (J.materials || []).map((m) => {
      const p = m.pbrMetallicRoughness || {}
      const c = p.baseColorFactor || [1, 1, 1, 1]
      const e = m.emissiveFactor || [0, 0, 0]
      const emisiva = e[0] + e[1] + e[2] > 0
      const mat = new T.MeshStandardMaterial({
        color: new T.Color().setRGB(c[0], c[1], c[2]),
        metalness: p.metallicFactor ?? 1,
        roughness: p.roughnessFactor ?? 1,
        emissive: new T.Color().setRGB(e[0], e[1], e[2]),
        emissiveIntensity: emisiva ? 3 : 1,
        transparent: c[3] < 1,
        opacity: c[3],
        envMap,
        envMapIntensity: 0.9,
      })
      mat.name = m.name || ''
      if (!emisiva) {
        mat.onBeforeCompile = desgaste
        mat.customProgramCacheKey = () => 'rig-sk575-desgaste'
      }
      return mat
    })
    const nodo = (i) => {
      const n = J.nodes[i]
      const g = new T.Group()
      g.name = n.name || ''
      if (n.translation) g.position.fromArray(n.translation)
      if (n.rotation) g.quaternion.fromArray(n.rotation)
      if (n.scale) g.scale.fromArray(n.scale)
      if (n.matrix) {
        g.matrix.fromArray(n.matrix)
        g.matrix.decompose(g.position, g.quaternion, g.scale)
      }
      if (n.mesh !== undefined) {
        for (const pr of J.meshes[n.mesh].primitives) {
          const geo = new T.BufferGeometry()
          geo.setAttribute('position', acc(pr.attributes.POSITION))
          if (pr.mode === 1) {
            // `<nodo>_aristas`: primitiva LINES
            if (pr.indices !== undefined) geo.setIndex(acc(pr.indices))
            const l = segmentos(geo)
            l.name = g.name
            g.add(l)
            continue
          }
          if (pr.mode !== undefined && pr.mode !== 4) continue // solo triángulos
          if (pr.attributes.NORMAL !== undefined)
            geo.setAttribute('normal', acc(pr.attributes.NORMAL))
          if (pr.indices !== undefined) geo.setIndex(acc(pr.indices))
          if (!geo.attributes.normal) geo.computeVertexNormals()
          const mesh = new T.Mesh(geo, mats[pr.material] || mats[0])
          mesh.name = mesh.material.name
          // cables, luces y vidrio no proyectan sombra: cada cuadro animado repetiría el pase de sombras entero por ellos
          mesh.castShadow = !SIN_SOMBRA.test(mesh.name)
          mesh.receiveShadow = true
          g.add(mesh)
        }
      }
      for (const c of n.children || []) g.add(nodo(c))
      return g
    }
    const raiz = new T.Group()
    for (const i of J.scenes[J.scene || 0].nodes) raiz.add(nodo(i))
    return raiz
  }

  // ───────── integración en los componentes del V2 ─────────
  // Cada componente SK-575 entra en el grupo del V2 que representa: así el despiece (posición del grupo), la selección y el
  // resaltado (R.pickables / R.materials), el aislado y la visibilidad por componente, el corte (plano global del renderer), el
  // modo malla, los modos y la secuencia de montaje actúan sobre el SK-575 sin tocar el bundle.
  const DESTINO = {
    sk575_mastil: 'mastil',
    sk575_izaje: 'mastil',
    sk575_carrier: 'camion',
    sk575_cuadro: 'malacate',
    sk575_aparejo: 'aparejo',
    sk575_bop: 'bop',
    sk575_acumulador: 'bop',
    sk575_llave: 'llave',
    sk575_piso: 'subestructura',
    sk575_planchada: 'caballetes',
    sk575_tiros: 'caballetes',
    sk575_vientos: 'vientos',
    sk575_piletas: 'circulacion',
    sk575_manifold: 'circulacion',
    sk575_bomba: 'circulacion',
    sk575_pozo_vecino: 'circulacion',
  }
  // Sub-nodos del GLB que son otro componente del árbol del V2 (cad/sk575/modelo.py: comp("raiz/sub")).
  const SUB = { sk575_cabina: 'cabina', sk575_motor: 'motor', sk575_enganche: 'enganche' }
  const OCULTO = 31 // capa que la cámara no dibuja y el raycaster no toca: ningún módulo puede volver a mostrarlo con .visible
  // Altura del bloque del SK-575 en reposo = valor por defecto del deslizador #hoist (14 m, centro del bloque en modelo.py).
  const BLOQUE_Y = 14

  const v3 = new T.Vector3()
  function integrar(cid, raiz) {
    const id = DESTINO[cid]
    const G = R.groups && R.groups[id]
    if (!G) return console.warn('[modelo SK-575] pieza sin destino en el V2:', cid, '→', id)
    const comp = raiz.getObjectByName(cid) || raiz
    raiz.updateMatrixWorld(true)
    const blk = id === 'aparejo' ? G.getObjectByName('bloque_viajero') : null
    const pivote = id === 'mastil' ? G.children.find((c) => c.name === 'mastil_pivote') : null
    let dy = 0
    if (blk) {
      blk.getWorldPosition(v3)
      dy = v3.y - G.position.y - BLOQUE_Y // si el aparejo ya no está en reposo al cargar
    }
    for (const n of [...comp.children]) {
      if (SUB[n.name]) {
        integrarSub(n, SUB[n.name], pivote)
        continue
      }
      const cable = n.name.endsWith('_cable')
      if (blk && !cable) {
        n.position.y += dy
        n.updateMatrixWorld(true)
        blk.attach(n) // el bloque, amelas y elevador siguen la animación del aparejo (#hoist / #c-play)
      } else if (blk && cable) {
        lineasElasticas(G, blk, n)
      } else if (cid === 'sk575_mastil' && pivote) {
        // 2.º tramo, corona y piso de enganche → el grupo que 81 desliza (telescopado); el 1.er tramo gira con el pivote
        const sup = pivote.children.find((c) => c.name === 'mastil_tramo_superior')
        ;(n.name.endsWith('_sup') && sup ? sup : pivote).attach(n)
      } else if (cid === 'sk575_izaje' && pivote && n.name.endsWith('_orejas_mastil'))
        pivote.attach(n) // las orejas del mástil giran con él; camisas, etapas y vástagos los anima 81
      else G.attach(n)
      n.traverse((o) => {
        if (!o.isMesh) return
        o.userData.id = id
        R.pickables.push(o)
        const m = o.material
        const e = m.emissive
        if (R.materials[id] && !(e && e.r + e.g + e.b > 0)) R.materials[id].push(m) // las luminarias no se resaltan
      })
    }
  }

  /**
   * Sub-nodo con grupo propio (selección, resaltado, aislado, despiece y teñido DROPS por su id). Comparte los materiales de su
   * raíz (`sk575_carrier_*`, `sk575_mastil_*`): se clonan para que resaltar la cabina no encienda todo el carrier.
   */
  function integrarSub(n, id, pivote) {
    const G = R.groups && R.groups[id]
    if (!G) return console.warn('[modelo SK-575] sub-nodo sin destino en el V2:', n.name, '→', id)
    const clon = new Map()
    n.traverse((o) => {
      if (!o.isMesh) return
      if (!clon.has(o.material)) {
        const m = o.material.clone()
        m.onBeforeCompile = o.material.onBeforeCompile
        m.customProgramCacheKey = o.material.customProgramCacheKey
        clon.set(o.material, m)
      }
      o.material = clon.get(o.material)
      o.userData.id = id
      R.pickables.push(o)
      const e = o.material.emissive
      if (R.materials[id] && !(e && e.r + e.g + e.b > 0)) R.materials[id].push(o.material)
    })
    G.attach(n)
    if (id === 'enganche') {
      // marcador DROPS del piso de enganche sobre la pieza SK (sigue siendo aproximado: 50 nunca lo da por as-built)
      n.userData.dropsId = 'piso-enganche'
      seguirTramoSuperior(n, pivote)
    }
  }

  /**
   * El piso de enganche va con el 2.º tramo (ZM = 20,629 m > H_INF): en el izamiento gira con el pivote y telescopa con
   * `mastil_tramo_superior` (81), pero vive en el grupo `enganche`. En cada cuadro se le aplica el movimiento del tramo dentro del
   * grupo `mastil` (el despiece de cada grupo queda aparte).
   */
  function seguirTramoSuperior(n, pivote) {
    const sup = pivote && pivote.children.find((c) => c.name === 'mastil_tramo_superior')
    if (!sup) return
    const mastG = R.groups.mastil
    const M4 = n.matrix.constructor
    R.scene.updateMatrixWorld(true)
    const rel = () => new M4().copy(mastG.matrixWorld).invert().multiply(sup.matrixWorld)
    const base = rel().invert().multiply(n.matrix) // pose armada de n respecto del tramo
    const m = new M4()
    // plegado sobre la bisagra (origen del nodo, eje lateral Z del glTF): lo calcula 81 (`plegado()`, ilustrativo)
    const giro = new M4()
    n.matrixAutoUpdate = false
    const previo = R.scene.onBeforeRender
    R.scene.onBeforeRender = function (...a) {
      giro.makeRotationZ(window.__rigErect?.plegado?.() || 0)
      m.copy(mastG.matrixWorld).invert().multiply(sup.matrixWorld).multiply(base).multiply(giro)
      // tolerancia: el producto con la inversa no repite bits y 80-perf rehace la sombra ante cualquier cambio
      if (m.elements.some((v, i) => Math.abs(v - n.matrix.elements[i]) > 1e-7)) {
        n.matrix.copy(m)
        n.updateMatrixWorld(true)
      }
      return previo.apply(this, a)
    }
  }

  // Corte entre tramos del mástil: el 1.er tramo va de 0 a H_INF = 16,4 m (cad/sk575/modelo.py; se inclina 3,5° en bloque, la
  // diferencia en altura es < 2 cm). Lo que queda por encima (2.º tramo, corona, piso de enganche) telescopa.
  const H_INF = 16.4
  /**
   * Parte cada malla del mástil por el centroide de cada triángulo (y sus aristas por el punto medio de cada segmento): crea
   * `<nodo>_sup` con lo que queda sobre H_INF. El piso de enganche (sub-nodo con grupo propio) no se parte.
   */
  function partirMastil(raiz) {
    raiz.updateMatrixWorld(true)
    const comp = raiz.getObjectByName('sk575_mastil')
    if (!comp) return
    const p = new T.Vector3()
    for (const n of [...comp.children]) {
      const mesh = n.children.find((c) => c.isMesh || c.isLineSegments)
      const geo = mesh && mesh.geometry
      if (!geo || (mesh.isMesh && !geo.index)) continue
      const pos = geo.attributes.position
      const idx = geo.index ? geo.index.array : Array.from({ length: pos.count }, (_, i) => i)
      const k = mesh.isMesh ? 3 : 2 // vértices por triángulo o por segmento
      const alto = (i) => p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).y
      const inf = []
      const sup = []
      for (let t = 0; t < idx.length; t += k) {
        let y = 0
        for (let j = 0; j < k; j++) y += alto(idx[t + j]) / k
        ;(y > H_INF ? sup : inf).push(...idx.slice(t, t + k))
      }
      if (!sup.length) continue
      const parte = (tris) => {
        const g = new T.BufferGeometry()
        for (const [k, v] of Object.entries(geo.attributes)) g.setAttribute(k, v)
        g.setIndex(new BufferAttribute(new Uint32Array(tris), 1))
        // caja y esfera solo con los vértices de ESTA mitad (comparten `position` completo: three usaría todo el mástil)
        g.computeBoundingSphere() // crea la Sphere (R.three no expone la clase); centro y radio se rehacen abajo
        const bb = (g.boundingBox = new T.Box3())
        for (const i of tris) bb.expandByPoint(p.fromBufferAttribute(pos, i))
        const c = bb.getCenter(g.boundingSphere.center)
        let r2 = 0
        for (const i of tris) r2 = Math.max(r2, c.distanceToSquared(p.fromBufferAttribute(pos, i)))
        g.boundingSphere.radius = Math.sqrt(r2)
        return g
      }
      const nodoSup = new T.Group()
      nodoSup.name = n.name + '_sup'
      nodoSup.position.copy(n.position)
      nodoSup.quaternion.copy(n.quaternion)
      nodoSup.scale.copy(n.scale)
      const mSup = mesh.isMesh ? new T.Mesh(parte(sup), mesh.material) : segmentos(parte(sup))
      mSup.name = mesh.name
      mSup.castShadow = mesh.castShadow
      mSup.receiveShadow = true
      nodoSup.add(mSup)
      comp.add(nodoSup)
      if (inf.length) mesh.geometry = parte(inf)
      else n.removeFromParent()
    }
    raiz.updateMatrixWorld(true)
  }

  /** Líneas del aparejo: se estiran desde la corona (fija) hasta el bloque (sigue a `bloque_viajero`). */
  function lineasElasticas(G, blk, n) {
    const caja = new T.Box3().setFromObject(n)
    const top = caja.max.y
    const bot = caja.min.y
    const W = new T.Group()
    W.name = 'sk575_aparejo_lineas'
    G.add(W)
    W.attach(n)
    const ajustar = () => {
      blk.getWorldPosition(v3)
      const yb = v3.y - G.position.y - BLOQUE_Y
      const k = Math.max(0.05, (top - (bot + yb)) / (top - bot))
      if (W.scale.y === k) return
      W.scale.y = k
      W.position.y = top * (1 - k)
      W.updateMatrixWorld(true)
    }
    ajustar()
    n.traverse((o) => {
      if (!o.isMesh) return
      o.frustumCulled = false
      o.onBeforeRender = ajustar // antes de calcular su matriz de vista: sin un cuadro de retraso
    })
  }

  // Piezas del izamiento (81-izamiento-mastil.js) que se dibujan solo durante la animación: siguen siendo procedurales.
  const ANIMACION = new Set([
    'pistones_izaje_dinamicos',
    'soporte_traslado',
    'piston_extension_2do_tramo',
    'vientos_dinamicos',
  ])
  /**
   * Durante el izamiento 81 oculta el cable del malacate a la corona (`malacate_steel`) hasta la fase 3: los cables del cuadro y
   * de la llave y los tiros SK copian esa visibilidad en cada cuadro. Los cilindros SK los anima 81 (siempre visibles).
   */
  function sincronizarIzamiento() {
    const G = R.groups
    const cableMal = G.malacate && G.malacate.children.find((c) => c.name === 'malacate_steel')
    const pares = []
    const buscar = (grupo, pref) =>
      grupo
        ? grupo.children
            .filter((c) => c.name.startsWith(pref))
            .concat(
              grupo.children.flatMap((c) =>
                c.name === 'mastil_pivote' ? c.children.filter((d) => d.name.startsWith(pref)) : [],
              ),
            )
        : []
    // sin mástil (paso 5 de la secuencia de montaje) los cables a la corona no tienen de dónde colgar
    // y durante el izamiento (fases 1-2) tampoco: 81 oculta el cable del malacate hasta la fase 3 y estos lo siguen
    const cablesCorona = () => (!G.mastil || G.mastil.visible) && (!cableMal || cableMal.visible)
    const conMastil = () => !G.mastil || G.mastil.visible
    for (const n of buscar(G.malacate, 'sk575_cuadro_cable')) pares.push([n, cablesCorona])
    for (const n of buscar(G.llave, 'sk575_llave_cable')) pares.push([n, cablesCorona])
    // los tiros (parados contra el piso de enganche) aparecen con el izamiento (fase 3) y solo con el mástil a la vista; no
    // dependen de la casilla del aparejo en el árbol
    const E = window.__rigErect
    for (const n of buscar(G.caballetes, 'sk575_tiros_'))
      pares.push([n, () => conMastil() && (!E || E.progress() >= E.fases.extendEnd)])
    if (!pares.length) return
    // scene.onBeforeRender corre ANTES de armar la lista de dibujo: el cuadro final de la animación ya sale correcto.
    const previo = R.scene.onBeforeRender
    R.scene.onBeforeRender = function (...a) {
      for (const [n, ver] of pares) n.visible = ver()
      return previo.apply(this, a)
    }
  }

  /**
   * La geometría procedural oculta (capa 31) sale de R.pickables y de R.materials (raycast, resaltado, teñido DROPS).
   * NO se libera su geometría: 50-drops-layer ancla marcadores con Box3 sobre `userData.dropsId` y 81 lee nodos por nombre.
   */
  function retirarOcultos() {
    const oculto = (o) => o.layers.mask === 2 ** OCULTO
    const pk = R.pickables.filter((o) => !oculto(o))
    R.pickables.length = 0
    R.pickables.push(...pk)
    const enUso = new Set()
    R.scene.traverse((o) => {
      if (o.material && !oculto(o)) for (const m of [].concat(o.material)) enUso.add(m)
    })
    const soloOcultos = new Set()
    R.scene.traverse((o) => {
      if (o.material && oculto(o))
        for (const m of [].concat(o.material)) if (!enUso.has(m)) soloOcultos.add(m)
    })
    for (const lista of Object.values(R.materials || {})) {
      const q = lista.filter((m) => !soloOcultos.has(m))
      lista.length = 0
      lista.push(...q)
    }
  }

  /** La cabina SK es la de manejo del carrier; la fila `cabina` del V2 es la casilla del maquinista y consola. */
  function rotularCabina() {
    const fila = document.querySelector('.item[data-id="cabina"] .item-name')
    if (!fila || fila.querySelector('.sk-nota')) return
    const s = document.createElement('small')
    s.className = 'sk-nota'
    s.style.cssText = 'display:block;opacity:.65;font-size:11px;line-height:1.25'
    s.textContent = 'SK-575: cabina de manejo del carrier · consola del maquinista sin ubicar'
    fila.appendChild(s)
  }

  let carga = null
  function cargar() {
    if (carga) return carga
    const env = entorno()
    const ocultar = []
    const recorrer = (o) => {
      if (ANIMACION.has(o.name)) return
      if (o.isMesh || o.isLine || o.isPoints || o.isSprite) ocultar.push(o)
      for (const c of o.children) recorrer(c)
    }
    for (const G of Object.values(R.groups || {})) recorrer(G) // el SK-575 es el único equipo a la vista
    // oculto desde el arranque (sin el destello del procedural mientras bajan los GLB); si la carga falla, vuelve
    const capas = []
    for (const o of ocultar)
      o.traverse((x) => {
        capas.push([x, x.layers.mask])
        x.layers.set(OCULTO)
      })
    invalidate()
    carga = bytesGlb()
      .then((BIN) =>
        Promise.all(
          [...FILES].sort().map((cid) =>
            leerGlb(BIN[cid], env).then((g) => {
              if (cid === 'sk575_mastil') partirMastil(g)
              return [cid, g]
            }),
          ),
        ),
      )
      .then((comps) => {
        // attach() conserva la posición de mundo: se integra con el equipo armado (despiece en 0, mástil montado) y se
        // restituye después.
        // 79 corre la casilla procedural (hoy oculta) fuera del carrier; la cabina SK va sobre el carrier: el grupo vuelve al
        // marco común (el despiece del bundle, Fh, también lo pisa con offset × factor)
        if (R.groups.cabina) R.groups.cabina.position.set(0, 0, 0)
        const despiece = Object.values(R.groups).map((G) => [G, G.position.clone()])
        for (const [G] of despiece) G.position.set(0, 0, 0)
        const E = window.__rigErect
        const p0 = E ? E.progress() : 1
        if (E) (E.pause(), E.set(1))
        R.scene.updateMatrixWorld(true)
        for (const [cid, g] of comps) integrar(cid, g)
        for (const [G, p] of despiece) G.position.copy(p)
        if (E && p0 < 1) E.set(p0)
        sincronizarIzamiento()
        retirarOcultos()
        rotularCabina()
        invalidate()
        return R.groups
      })
    carga.catch((e) => {
      console.error('[modelo SK-575]', e)
      for (const [x, m] of capas) x.layers.mask = m
      invalidate()
    })
    return carga
  }

  window.__rigSk575 = {
    ready: () => carga,
    isOn: () => true,
    sinPieza: () => [], // cabina, motor y enganche ya tienen pieza SK propia (sub-nodos del GLB)
    stats,
  }
  cargar()
})
