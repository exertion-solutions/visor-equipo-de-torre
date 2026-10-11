/*
 * 84-modelo-sk575.js — MODELO SK-575 (CAD build123d) en el visor V2, con el aspecto del visor CAD de referencia
 * (~/cad/visor.py, skill `equipo-3d`): materiales PBR por pieza, mapa de entorno tipo "room", aristas a 28° y desgaste.
 *
 * Datos: los 16 GLB `public/models/tacker10/sk575_*.glb` (cad/sk575/modelo.py → exportar.py → gltf:optimize) incrustados por
 * scripts/build-legacy.mjs en `window.__TACKER_SK575_GLB` (base64) + el decodificador meshopt (`window.__MeshoptDecoder`).
 * El V2 no trae GLTFLoader: este lector cubre solo el contrato de esos GLB (nodos TRS, primitivas con POSITION/NORMAL/índices,
 * EXT_meshopt_compression, KHR_mesh_quantization, PBR metallic-roughness).
 *
 * Marco = el del V2: origen en la boca de pozo a nivel de terreno, carrier hacia −X, Y arriba, metros. NO es as-built
 * (confianza B/C por componente, docs/pdf-review/informe-sk575-2026-10-09.md). Desgaste y entorno son EFECTOS VISUALES.
 *
 * Es EL equipo del V2: cada componente SK-575 se integra en su grupo procedural (despiece, selección, aislado, corte, malla, modos,
 * secuencia de montaje, izamiento y aparejo animado) y la geometría procedural pasa a una capa invisible. Solo la casilla del
 * maquinista (`cabina`) sigue siendo procedural. API para pruebas: `window.__tackerSk575 = { ready, isOn }`.
 */
window.__rigExt.onPost((R) => {
  const B64 = window.__TACKER_SK575_GLB
  const MD = window.__MeshoptDecoder
  if (!B64 || !MD || !R.scene || !R.three || !R.renderer) return
  const T = R.three
  const Float32Attr = new T.BoxGeometry(1, 1, 1).attributes.position.constructor
  const BufferAttribute = Object.getPrototypeOf(Float32Attr)
  const invalidate = () => typeof R.invalidate === 'function' && R.invalidate()

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

  async function leerGlb(b64, envMap) {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
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
        mat.customProgramCacheKey = () => 'tacker-sk575-desgaste'
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
          if (pr.mode !== undefined && pr.mode !== 4) continue // solo triángulos
          const geo = new T.BufferGeometry()
          geo.setAttribute('position', acc(pr.attributes.POSITION))
          if (pr.attributes.NORMAL !== undefined)
            geo.setAttribute('normal', acc(pr.attributes.NORMAL))
          if (pr.indices !== undefined) geo.setIndex(acc(pr.indices))
          if (!geo.attributes.normal) geo.computeVertexNormals()
          const mesh = new T.Mesh(geo, mats[pr.material] || mats[0])
          mesh.name = mesh.material.name
          mesh.castShadow = mesh.receiveShadow = true
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

  // ───────── aristas (ángulo entre caras > 28°, como EdgesGeometry / visor.py) ─────────
  const COS = Math.cos((28 * Math.PI) / 180)
  const lineaMat = new T.LineBasicMaterial({ color: '#0b0d10', transparent: true, opacity: 0.55 })
  function aristas(mesh) {
    const pos = mesh.geometry.attributes.position
    const idx = mesh.geometry.index
    const nv = pos.count
    const P = new Float32Array(nv * 3)
    for (let i = 0; i < nv; i++) {
      P[i * 3] = pos.getX(i)
      P[i * 3 + 1] = pos.getY(i)
      P[i * 3 + 2] = pos.getZ(i)
    }
    // soldar por posición (las normales partidas duplican vértices en los filos)
    const id = new Uint32Array(nv)
    const ver = new Map()
    for (let i = 0; i < nv; i++) {
      const k =
        Math.round(P[i * 3] * 1e4) +
        ',' +
        Math.round(P[i * 3 + 1] * 1e4) +
        ',' +
        Math.round(P[i * 3 + 2] * 1e4)
      let v = ver.get(k)
      if (v === undefined) ver.set(k, (v = i))
      id[i] = v
    }
    const tri = idx ? idx.array : null
    const nt = (tri ? tri.length : nv) / 3
    const N = new Float32Array(nt * 3)
    const bordes = new Map()
    const out = []
    for (let t = 0; t < nt; t++) {
      const a = tri ? tri[t * 3] : t * 3
      const b = tri ? tri[t * 3 + 1] : t * 3 + 1
      const c = tri ? tri[t * 3 + 2] : t * 3 + 2
      const ux = P[b * 3] - P[a * 3],
        uy = P[b * 3 + 1] - P[a * 3 + 1],
        uz = P[b * 3 + 2] - P[a * 3 + 2]
      const vx = P[c * 3] - P[a * 3],
        vy = P[c * 3 + 1] - P[a * 3 + 1],
        vz = P[c * 3 + 2] - P[a * 3 + 2]
      let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx
      const l = Math.hypot(nx, ny, nz)
      if (!l) continue // triángulo degenerado
      N[t * 3] = nx /= l
      N[t * 3 + 1] = ny /= l
      N[t * 3 + 2] = nz /= l
      const vs = [id[a], id[b], id[c]]
      for (let e = 0; e < 3; e++) {
        const i = vs[e],
          j = vs[(e + 1) % 3]
        const k = i < j ? i * nv + j : j * nv + i
        const otra = bordes.get(k)
        if (otra === undefined) bordes.set(k, t)
        else {
          bordes.delete(k)
          if (N[otra * 3] * nx + N[otra * 3 + 1] * ny + N[otra * 3 + 2] * nz <= COS)
            out.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], P[j * 3], P[j * 3 + 1], P[j * 3 + 2])
        }
      }
    }
    for (const k of bordes.keys()) {
      const i = Math.floor(k / nv),
        j = k % nv
      out.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], P[j * 3], P[j * 3 + 1], P[j * 3 + 2])
    }
    const g = new T.BufferGeometry()
    g.setAttribute('position', new Float32Attr(new Float32Array(out), 3))
    const l = new T.Line(g, lineaMat)
    l.isLineSegments = true // three elige gl.LINES por esta marca (igual que 77-capa-cad.js)
    l.raycast = () => {}
    return l
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
  // El SK-575 no modela la casilla del maquinista (79-cabina-desmontable.js): esa queda procedural.
  const PROCEDURAL = new Set(['cabina'])
  const OCULTO = 31 // capa que la cámara no dibuja y el raycaster no toca: ningún módulo puede volver a mostrarlo con .visible
  // Altura del bloque del SK-575 en reposo = valor por defecto del deslizador #hoist (14 m, centro del bloque en modelo.py).
  const BLOQUE_Y = 14

  const v3 = new T.Vector3()
  function integrar(cid, raiz) {
    const id = DESTINO[cid]
    const G = R.groups && R.groups[id]
    if (!G) return
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
      const cable = n.name.endsWith('_cable')
      if (blk && !cable) {
        n.position.y += dy
        n.updateMatrixWorld(true)
        blk.attach(n) // el bloque, amelas y elevador siguen la animación del aparejo (#hoist / #c-play)
      } else if (blk && cable) {
        lineasElasticas(G, blk, n)
      } else if (cid === 'sk575_mastil' && pivote)
        pivote.attach(n) // acompaña el izamiento (81-izamiento-mastil.js)
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
   * Durante el izamiento 81 muestra sus pistones dinámicos y oculta los estáticos (`pistones_izaje`) y el cable del malacate a
   * la corona (`malacate_steel`): los cilindros SK, los cables del cuadro y los tiros SK copian esa visibilidad en cada cuadro.
   */
  function sincronizarIzamiento() {
    const G = R.groups
    const estaticos = G.mastil && G.mastil.children.find((c) => c.name === 'pistones_izaje')
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
    for (const n of buscar(G.mastil, 'sk575_izaje_'))
      pares.push([n, () => !estaticos || estaticos.visible])
    for (const n of buscar(G.malacate, 'sk575_cuadro_cable'))
      pares.push([n, () => !cableMal || cableMal.visible])
    for (const n of buscar(G.caballetes, 'sk575_tiros_'))
      pares.push([n, () => !G.aparejo || G.aparejo.visible])
    const ancla = buscar(G.camion, 'sk575_carrier_')[0]
    let malla = null
    ancla?.traverse((o) => (malla = malla || (o.isMesh ? o : null)))
    if (!malla || !pares.length) return
    malla.onBeforeRender = () => {
      for (const [n, ver] of pares) n.visible = ver()
    }
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
    for (const [id, G] of Object.entries(R.groups || {})) if (!PROCEDURAL.has(id)) recorrer(G)
    carga = Promise.all(
      Object.keys(B64)
        .sort()
        .map((cid) =>
          leerGlb(B64[cid], env).then((g) => {
            g.traverse((o) => o.isMesh && o.add(aristas(o)))
            return [cid, g]
          }),
        ),
    ).then((comps) => {
      // attach() conserva la posición de mundo: se integra con el equipo armado (despiece en 0) y se restituye después.
      const despiece = Object.values(R.groups).map((G) => [G, G.position.clone()])
      for (const [G] of despiece) G.position.set(0, 0, 0)
      R.scene.updateMatrixWorld(true)
      for (const [cid, g] of comps) integrar(cid, g)
      for (const [G, p] of despiece) G.position.copy(p)
      sincronizarIzamiento()
      for (const o of ocultar) o.traverse((x) => x.layers.set(OCULTO))
      invalidate()
      return R.groups
    })
    carga.catch((e) => console.error('[modelo SK-575]', e))
    return carga
  }

  const card = document.createElement('details')
  card.id = 'sk575-card'
  card.setAttribute('aria-label', 'Aviso del modelo SK-575')
  card.style.cssText =
    'position:fixed;right:16px;bottom:44px;z-index:19;width:min(320px,calc(100vw - 32px));padding:8px 12px;border-radius:12px;' +
    'background:rgba(20,27,38,.95);border:1px solid #303B4B;color:#DDE3EC;font-size:12px;line-height:1.4'
  card.innerHTML =
    '<summary style="cursor:pointer;color:#DDBB65"><b>Modelo SK-575 · referencia CAD</b> · no as-built</summary>' +
    'Service King SK-575 (TACKER 10), build123d. Confianza B/C por componente, <b>no es as-built</b> ni apto para ' +
    'fabricación. Desgaste, aristas y reflejos son efectos visuales; las animaciones son ilustrativas. La casilla del ' +
    'maquinista sigue siendo la del V2. Cotas y conflictos de fuente: informe SK-575 del 2026-10-09.'
  document.body.appendChild(card)
  const hideStyle = document.createElement('style')
  hideStyle.textContent = 'body.opts-hidden #sk575-card{display:none}'
  document.head.appendChild(hideStyle)

  window.__tackerSk575 = { ready: () => carga, isOn: () => true }
  cargar()
})
