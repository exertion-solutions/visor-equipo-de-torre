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
 * Botón "Modelo SK-575" en el menú Capas: muestra el modelo y oculta los 13 componentes procedurales del V2 (los restaura al
 * apagarlo). API para pruebas: `window.__tackerSk575 = { on, off, toggle, isOn, ready }`.
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

  // ───────── carga diferida + UI ─────────
  const root = new T.Group()
  root.name = 'modelo_sk575'
  root.visible = false
  root.userData = { role: 'HELPER' } // fuera de los 13 componentes: ni seleccionable ni en R.pickables
  R.scene.add(root)
  let carga = null
  function cargar() {
    if (carga) return carga
    const env = entorno()
    carga = Promise.all(
      Object.keys(B64)
        .sort()
        .map((id) =>
          leerGlb(B64[id], env).then((g) => {
            g.name = id
            g.traverse((o) => o.isMesh && o.add(aristas(o)))
            root.add(g)
          }),
        ),
    ).then(() => {
      invalidate()
      return root
    })
    carga.catch((e) => console.error('[modelo SK-575]', e))
    return carga
  }

  const card = document.createElement('aside')
  card.id = 'sk575-card'
  card.hidden = true
  card.setAttribute('aria-label', 'Aviso del modelo SK-575')
  card.style.cssText =
    'position:fixed;right:16px;bottom:44px;z-index:19;width:min(320px,calc(100vw - 32px));padding:10px 12px;border-radius:12px;' +
    'background:rgba(20,27,38,.95);border:1px solid #303B4B;color:#DDE3EC;font-size:12px;line-height:1.4'
  card.innerHTML =
    '<b style="color:#DDBB65">Modelo SK-575 · referencia CAD</b><br>Service King SK-575 (TACKER 10), build123d. ' +
    'Confianza B/C por componente, <b>no es as-built</b> ni apto para fabricación. Desgaste, aristas y reflejos son efectos ' +
    'visuales. Cotas y conflictos de fuente: informe SK-575 del 2026-10-09.'
  document.body.appendChild(card)
  const hideStyle = document.createElement('style')
  hideStyle.textContent = 'body.opts-hidden #sk575-card{display:none}'
  document.head.appendChild(hideStyle)

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-sk575'
  btn.type = 'button'
  btn.textContent = 'Modelo SK-575'
  btn.title =
    'Muestra el modelo CAD SK-575 (materiales reales, aristas) en lugar del equipo procedural del V2'
  btn.setAttribute('aria-pressed', 'false')
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('capas', btn)
  else document.querySelector('header')?.appendChild(btn)

  const previos = new Map() // visibilidad de los grupos procedurales antes de encender
  function set(on) {
    on = !!on
    if (on === root.visible) return Promise.resolve(root)
    root.visible = on
    for (const [id, g] of Object.entries(R.groups || {})) {
      if (on) {
        previos.set(id, g.visible)
        g.visible = false
      } else if (previos.has(id)) g.visible = previos.get(id)
    }
    card.hidden = !on
    btn.setAttribute('aria-pressed', String(on))
    btn.classList.toggle('on', on)
    invalidate()
    return on ? cargar() : Promise.resolve(root)
  }
  btn.addEventListener('click', () => set(!root.visible))

  window.__tackerSk575 = {
    on: () => set(true),
    off: () => set(false),
    toggle: () => set(!root.visible),
    isOn: () => root.visible,
    ready: () => carga,
  }
})
