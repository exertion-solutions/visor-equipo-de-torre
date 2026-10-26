// E2E del visor V2 con el modelo SK-575 (Chrome instalado + playwright-core, igual que scripts/snap.mjs).
//
//   npm run test:e2e                         → public/legacy/Digital_Rig_V2.html (copia de trabajo)
//   E2E_URL=https://…/Digital_Rig_V2.html npm run test:e2e   → el sitio publicado
//
// Una sola página para todas las pruebas (cargar el V2 con render por software tarda). `afterEach` deja el estado de
// partida aunque una prueba falle (sin fallas en cascada). Capturas en .tmp/e2e/. Se omite si no hay Chrome (en CI
// ubuntu-latest sí lo hay). No va en `npm test` (tarda minutos): corre en CI como paso aparte.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { after, afterEach, before, test } from 'node:test'
import { chromium } from 'playwright-core'

const root = path.resolve(import.meta.dirname, '..')
const pub = path.join(root, 'public')
const V2 = '/legacy/Digital_Rig_V2.html'
const shots = path.join(root, '.tmp', 'e2e')
let browser, page, server, url
let ortho0 // proyección con la que arranca el V2 (hoy ortográfica)
let skip = false
const LANZAR = {
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}
const problemas = []

const vigilar = (p) => {
  p.on('console', (m) => {
    if (m.type() === 'error') problemas.push(m.text())
  })
  p.on('pageerror', (e) => problemas.push(e.message))
}
const abrir = async (viewport) => {
  const p = await browser.newPage({ viewport })
  vigilar(p)
  await p.goto(url, { waitUntil: 'load', timeout: 120_000 })
  await p.waitForFunction(() => window.__rigSk575 && window.__rigSk575.ready(), null, {
    timeout: 120_000,
  })
  await p.evaluate(() => window.__rigSk575.ready())
  return p
}

before(async () => {
  url = process.env.E2E_URL
  if (!url) {
    // http local efímero que sirve public/ como Pages (el V2 usa módulos y blobs que file:// no permite en headless):
    // /legacy/… el HTML y su respaldo sk575-glb.js, /models/rig10/… los GLB que baja con fetch. Sin cabeceras CORS:
    // /host.html lo embebe en un iframe sandbox (origen opaco, como la app) → el fetch falla y entra el respaldo base64.
    const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' }
    server = http.createServer((req, res) => {
      const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      if (ruta === '/host.html')
        return void res
          .writeHead(200, { 'content-type': tipos['.html'] })
          .end(
            `<iframe sandbox="allow-scripts" src="${V2}" style="width:800px;height:500px"></iframe>`,
          )
      const f = path.join(pub, ruta)
      if (!f.startsWith(pub) || !fs.existsSync(f) || fs.statSync(f).isDirectory())
        return void res.writeHead(404).end()
      res.writeHead(200, { 'content-type': tipos[path.extname(f)] ?? 'application/octet-stream' })
      fs.createReadStream(f).pipe(res)
    })
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    url = `http://127.0.0.1:${server.address().port}${V2}`
  }
  try {
    browser = await chromium.launch(LANZAR)
  } catch {
    skip = 'Chrome no disponible'
    return
  }
  page = await abrir({ width: 1440, height: 900 })
  ortho0 = await page.evaluate(() => !!window.__rig.view.ortho)
  fs.mkdirSync(shots, { recursive: true })
})

after(async () => {
  await browser?.close()
  server?.close()
})

// Estado de partida: sin Vista CAD, secuencia cerrada, mástil montado, sin despiece, bloque a 14 m, proyección inicial, modo explorar.
afterEach(async () => {
  if (skip || !page) return
  await page.evaluate((ortho0) => {
    const R = window.__rig
    window.__rigVistaCad?.off()
    window.__rigSeq?.close()
    window.__rigErect?.pause()
    window.__rigErect?.set(1)
    R.setExplode(0)
    const h = document.getElementById('hoist')
    if (h && Number(h.value) !== 14) {
      h.value = 14
      h.dispatchEvent(new Event('input'))
    }
    R.selectComponent(null)
    if (!!R.view.ortho !== ortho0) document.getElementById('c-ortho').click()
    const explorar = document.querySelector('#v2-modebar button[data-m="explore"]')
    if (explorar) explorar.click()
    else window.__rigPresets.apply('explore')
  }, ortho0)
})

/** Fuerza un render y espera a que salga (dos rAF): la visibilidad SK se sincroniza en onBeforeRender. */
const cuadro = () =>
  page.evaluate(
    () =>
      new Promise((r) => {
        window.__rig.invalidate?.()
        requestAnimationFrame(() => requestAnimationFrame(r))
      }),
  )

const snap = (name) => page.screenshot({ path: path.join(shots, name + '.png') })

/** Espera a que `fn` (en la página) sea verdadera, forzando render: la visibilidad SK se sincroniza en onBeforeRender. */
const hasta = (fn, arg) =>
  page.waitForFunction(
    ([src, a]) => {
      window.__rig.invalidate?.()
      return new Function('a', `return (${src})(a)`)(a)
    },
    [fn.toString(), arg],
    { timeout: 20_000, polling: 100 },
  )

test('el equipo es el SK-575: 16 componentes integrados, nada procedural a la vista, ni Capa CAD', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const sk = R.pickables.filter((m) => m.material?.name?.startsWith('sk575_'))
    const ids = new Set(sk.map((m) => m.material.name.split('_').slice(0, 2).join('_')))
    // piezas que 81-izamiento-mastil.js dibuja solo durante la animación (siguen procedurales a propósito)
    const ANIM = new Set([
      'pistones_izaje_dinamicos',
      'soporte_traslado',
      'piston_extension_2do_tramo',
      'vientos_dinamicos',
    ])
    const deAnimacion = (o) => {
      for (let p = o; p; p = p.parent) if (ANIM.has(p.name)) return true
      return false
    }
    let procVisibles = 0
    for (const G of Object.values(R.groups))
      G.traverse((o) => {
        const sk = o.material?.name?.startsWith('sk575_')
        if (o.isMesh && !sk && o.layers.mask === 1 && !deAnimacion(o)) procVisibles++
      })
    return {
      comps: ids.size,
      procVisibles,
      capaCad: !!window.__rigCad || !!R.scene.getObjectByName('capa_cad'),
    }
  })
  assert.equal(r.comps, 16)
  assert.equal(r.procVisibles, 0)
  assert.equal(r.capaCad, false)
  await snap('01-equipo')
})

// Hallazgo 1 de la revisión: motor/cabina/enganche quedaban con 0 mallas visibles. Espera el fix en 84 (`sinPieza()` o no
// ocultar lo que no tiene reemplazo SK).
test('cada componente del árbol tiene al menos 1 malla visible o se declara sin pieza SK', async (t) => {
  if (skip) return t.skip(skip)
  const vacios = await page.evaluate(() => {
    const R = window.__rig
    const sin = new Set([...(window.__rigSk575.sinPieza?.() ?? [])])
    const out = []
    for (const [id, G] of Object.entries(R.groups)) {
      if (sin.has(id)) continue
      let n = 0
      G.traverse((o) => {
        if (!o.isMesh || !(o.layers.mask & 1)) return
        for (let p = o; p && p !== G.parent; p = p.parent) if (!p.visible) return
        n++
      })
      if (!n) out.push(id)
    }
    return out
  })
  assert.deepEqual(vacios, [], `componentes sin nada que mostrar: ${vacios.join(', ')}`)
})

test('despiece: los componentes SK se separan y vuelven', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const v = new R.three.Vector3()
    const n = R.groups.camion.getObjectByName('sk575_carrier_rojo')
    n.getWorldPosition(v)
    const x0 = v.x
    R.setExplode(1)
    R.scene.updateMatrixWorld(true)
    n.getWorldPosition(v)
    return { x0, x1: v.x }
  })
  assert.ok(Math.abs(r.x1 - r.x0) > 1, `carrier sin desplazar: ${r.x0} → ${r.x1}`)
  await snap('02-despiece')
})

test('selección: resalta las piezas SK del componente', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const brillo = () =>
      R.materials.malacate
        .filter((m) => m.name.startsWith('sk575_cuadro'))
        .some((m) => m.emissive.r > 0)
    R.selectComponent('malacate')
    const on = brillo()
    R.selectComponent(null)
    return { on, off: brillo() }
  })
  assert.deepEqual(r, { on: true, off: false })
})

test('aparejo: el bloque SK sigue al deslizador y vuelve a 14 m', async (t) => {
  if (skip) return t.skip(skip)
  // el handler de #hoist es sincrónico: no hace falta esperar
  const alto = (v) =>
    page.evaluate((v) => {
      const h = document.getElementById('hoist')
      h.value = v
      h.dispatchEvent(new Event('input'))
      const R = window.__rig
      R.scene.updateMatrixWorld(true)
      const p = new R.three.Vector3()
      R.groups.aparejo.getObjectByName('sk575_aparejo_amarillo').getWorldPosition(p)
      return p.y
    }, v)
  // el origen del nodo lo fija la cuantización del GLB (centro de la malla): se mide el desplazamiento, no la altura absoluta
  const reposo = await alto(14)
  assert.ok(Math.abs((await alto(20)) - reposo - 6) < 0.05)
  await snap('03-aparejo-20m')
  assert.ok(Math.abs((await alto(14)) - reposo) < 0.05)
})

test('izamiento: el 1.er tramo gira, el 2.º telescopa, los cilindros SK se animan y el ciclo restaura la pose', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(async () => {
    const R = window.__rig
    const E = window.__rigErect
    const M = R.groups.mastil
    const pivote = M.children.find((c) => c.name === 'mastil_pivote')
    const tramoSup = pivote.children.find((c) => c.name === 'mastil_tramo_superior')
    const tieneMastil = pivote.children.some((c) => c.name.startsWith('sk575_mastil_'))
    const sup = tramoSup.children.filter((c) => /^sk575_mastil_.*_sup$/.test(c.name))
    const primero = pivote.children.find(
      (c) => c.name.startsWith('sk575_mastil_') && !c.name.endsWith('_sup'),
    )
    const cil = ['camisa', 'etapa1', 'etapa2', 'vastago'].map((k) =>
      M.getObjectByName('sk575_izaje_cil1_' + k),
    )
    const camisaRojo = M.getObjectByName('sk575_izaje_cil1_camisa_rojo')
    const piezas = [...sup, primero, ...cil].filter(Boolean)
    const pose = () => {
      R.scene.updateMatrixWorld(true)
      return piezas.map((o) => o.getWorldPosition(new R.three.Vector3()).toArray())
    }
    const ver = (o) => {
      for (let p = o; p; p = p.parent) if (!p.visible) return false
      return !!(o.layers.mask & 1)
    }
    const antes = pose()
    const rot0 = pivote.rotation.z
    const q0 = cil[0].quaternion.clone()
    E.set(0.35)
    const embutido = tramoSup.position.y < -1
    const giro = Math.abs(pivote.rotation.z - rot0)
    const camisaGira = cil[0].quaternion.angleTo(q0)
    const largo035 = E.largos()[0]
    const dinamicos = M.getObjectByName('pistones_izaje_dinamicos').visible
    const visible035 = ver(camisaRojo)
    E.set(1)
    const despues = pose()
    const desvio = Math.max(
      0,
      ...antes.flatMap((a, i) => a.map((v, k) => Math.abs(v - despues[i][k]))),
    )
    return {
      tieneMastil,
      nSup: sup.length,
      hayPrimero: !!primero,
      hayCil: cil.every(Boolean) && !!camisaRojo,
      giro,
      camisaGira,
      largo035,
      dinamicos,
      visible035,
      embutido,
      desvio,
      rotFinal: Math.abs(pivote.rotation.z - rot0),
      supY: tramoSup.position.y,
    }
  })
  assert.ok(r.tieneMastil, 'el mástil SK no cuelga de mastil_pivote')
  assert.ok(r.nSup > 0, 'el 2.º tramo SK no cuelga de mastil_tramo_superior')
  assert.ok(r.hayPrimero, 'no hay pieza SK del 1.er tramo en mastil_pivote')
  assert.ok(r.hayCil, 'faltan los nodos sk575_izaje_cil1_{camisa,etapa1,etapa2,vastago}')
  assert.ok(r.giro > 0.3, `el pivote no giró: ${r.giro}`)
  assert.ok(r.camisaGira > 0.05, `la camisa SK no gira en su pivote: ${r.camisaGira} rad`)
  assert.ok(
    r.largo035 < 4.8641 - 0.5,
    `el cilindro no se retrae con el mástil bajo: ${r.largo035} m`,
  )
  assert.ok(r.visible035, 'los cilindros SK deben verse durante el izamiento')
  assert.equal(r.dinamicos, false, 'con cilindros SK no se dibujan los pistones procedurales')
  assert.ok(r.embutido, 'el 2.º tramo no está embutido durante el izamiento')
  assert.ok(r.desvio < 1e-3, `las piezas SK no vuelven a su lugar: desvío ${r.desvio} m`)
  assert.ok(r.rotFinal < 1e-6, `el pivote no vuelve a su ángulo: ${r.rotFinal}`)
  assert.equal(r.supY, 0)
  for (const p of [0, 0.35, 0.65, 1]) {
    await page.evaluate((p) => window.__rigErect.set(p), p)
    await cuadro()
    await snap('04-izamiento-' + String(Math.round(p * 100)).padStart(3, '0'))
  }
})

// Sin saltos: la pose dinámica a p = 0,999 empalma con la final (cilindros SK y vientos con los extremos de la meta).
test('izamiento sin saltos: cilindros y vientos a p = 0,999 coinciden con la pose final (< 0,05 m)', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const E = window.__rigErect
    const M = R.groups.mastil
    const V = R.three.Vector3
    const META = window.__RIG_SK575_META
    const topes = () => {
      R.scene.updateMatrixWorld(true)
      return META.izaje.flatMap((c) =>
        [c.nodos.camisa, ...c.nodos.etapas].map((n) =>
          M.getObjectByName(n).getWorldPosition(new V()),
        ),
      )
    }
    const lineas = () =>
      M.getObjectByName('vientos_dinamicos').children.map((l) => {
        const a = l.geometry.attributes.position
        l.updateMatrixWorld(true)
        return [0, a.count - 1].map((k) =>
          new V().fromBufferAttribute(a, k).applyMatrix4(l.matrixWorld),
        )
      })
    E.set(0.999)
    const cil999 = topes()
    const v999 = lineas()
    E.set(1)
    const cil1 = topes()
    // vientos SK armados: extremos de la meta (sin despiece, marco del grupo = mundo)
    const sk = META.vientos.map((c) => [
      new V().fromArray(c.extremo_tierra || c.extremo_carrier),
      new V().fromArray(c.extremo_mastil),
    ])
    return {
      cil: Math.max(...cil999.map((v, i) => v.distanceTo(cil1[i]))),
      vientos: Math.max(
        ...v999.map(([a, b], i) => Math.max(a.distanceTo(sk[i][0]), b.distanceTo(sk[i][1]))),
      ),
      nVientos: v999.length,
      nSk: sk.length,
    }
  })
  assert.equal(r.nVientos, r.nSk, 'un viento dinámico por cable SK')
  assert.ok(r.cil < 0.05, `salto de los cilindros al llegar a p = 1: ${r.cil} m`)
  assert.ok(r.vientos < 0.05, `salto de los vientos al llegar a p = 1: ${r.vientos} m`)
})

// Sub-nodos del GLB con grupo propio: cabina (de manejo) y motor en el carrier, piso de enganche en el mástil.
test('cabina, motor y enganche: piezas SK propias, visibles y con resaltado que no enciende al carrier', async (t) => {
  if (skip) return t.skip(skip)
  const ids = { cabina: 'sk575_cabina', motor: 'sk575_motor', enganche: 'sk575_enganche' }
  for (const [id, nodo] of Object.entries(ids)) {
    const r = await page.evaluate(
      ([id, nodo]) => {
        const R = window.__rig
        const n = R.groups[id].getObjectByName(nodo)
        let mallas = 0
        n?.traverse((o) => o.isMesh && o.layers.mask & 1 && o.userData.id === id && mallas++)
        // solo piezas SK: las lentes procedurales del mástil son emisivas siempre
        const brilla = (lista) =>
          lista.some((m) => m.name.startsWith('sk575_') && m.emissive && m.emissive.r > 0)
        R.selectComponent(id)
        return {
          enGrupo: !!n,
          mallas,
          pick: R.pickables.filter((o) => o.userData.id === id).length,
          propio: brilla(R.materials[id]),
          carrier: brilla(R.materials.camion),
          mastil: brilla(R.materials.mastil),
          sinPieza: window.__rigSk575.sinPieza(),
        }
      },
      [id, nodo],
    )
    await cuadro()
    await snap('08-seleccion-' + id)
    assert.ok(r.enGrupo, `${nodo} no cuelga del grupo ${id}`)
    assert.ok(r.mallas > 0 && r.pick > 0, `${id}: sin mallas SK visibles/seleccionables`)
    assert.ok(r.propio, `${id}: seleccionar no resalta su pieza SK`)
    assert.ok(!r.carrier && !r.mastil, `${id}: el resaltado se filtra al carrier o al mástil`)
    assert.deepEqual(r.sinPieza, [])
  }
  const fila = await page.evaluate(
    () => document.querySelector('.item[data-id="cabina"] .sk-nota')?.textContent ?? '',
  )
  assert.match(fila, /cabina de manejo/)
  // el piso de enganche sigue al 2.º tramo: en la fase 3 (el mástil todavía gira) se mueve con él
  const despegue = await page.evaluate(async () => {
    const R = window.__rig
    const E = window.__rigErect
    const V = R.three.Vector3
    const n = R.groups.enganche.getObjectByName('sk575_enganche')
    const sup = R.groups.mastil.getObjectByName('mastil_tramo_superior')
    const render = () =>
      new Promise((ok) => {
        R.invalidate()
        requestAnimationFrame(() => requestAnimationFrame(ok))
      })
    // posición del piso en el marco del 2.º tramo: constante si lo acompaña
    const rel = () => {
      R.scene.updateMatrixWorld(true)
      return sup.worldToLocal(n.getWorldPosition(new V()))
    }
    const r1 = rel()
    E.set(0.85)
    await render()
    const r085 = rel()
    E.set(1)
    await render()
    return r1.distanceTo(r085)
  })
  assert.ok(despegue < 0.01, `el piso de enganche se despega del 2.º tramo: ${despegue} m`)
})

/** Encuadra la cámara (perspectiva) en `pos` mirando a `target`, renderiza y captura; deja la cámara como estaba. */
async function vista(nombre, pos, target) {
  const ortho = await page.evaluate(() => !!window.__rig.view.ortho)
  if (ortho) {
    await page.evaluate(() => document.getElementById('c-ortho').click())
    await hasta(() => window.__rig.camera().type === 'PerspectiveCamera')
  }
  const previa = await page.evaluate(
    ([p, t]) => {
      const R = window.__rig
      const cam = R.camera()
      const ctl = R.controls()
      const antes = [cam.position.toArray(), ctl.target.toArray()]
      cam.position.fromArray(p)
      ctl.target.fromArray(t)
      ctl.update()
      return antes
    },
    [pos, target],
  )
  await cuadro()
  await snap(nombre)
  await page.evaluate(([p, t]) => {
    const R = window.__rig
    R.camera().position.fromArray(p)
    R.controls().target.fromArray(t)
    R.controls().update()
  }, previa)
}

// Corona centrada (pozo a 76" del pie del mástil, informe C6): sobre la huella del tope del reticulado y poleas a plomo del pozo.
test('corona: centrada sobre el tope del reticulado y poleas a plomo del pozo (pose montada)', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const V = R.three.Vector3
    R.scene.updateMatrixWorld(true)
    /** Caja (mundo) de los vértices de las mallas SK del mástil con material `mat` y altura en [y0, y1]. */
    const caja = (mat, y0, y1) => {
      const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, n: 0 }
      const v = new V()
      R.groups.mastil.traverse((o) => {
        if (!o.isMesh || o.material.name !== 'sk575_mastil_' + mat) return
        const pos = o.geometry.attributes.position
        const idx = o.geometry.index ? o.geometry.index.array : null
        const n = idx ? idx.length : pos.count
        for (let k = 0; k < n; k++) {
          v.fromBufferAttribute(pos, idx ? idx[k] : k).applyMatrix4(o.matrixWorld)
          if (v.y < y0 || v.y > y1) continue
          b.x0 = Math.min(b.x0, v.x)
          b.x1 = Math.max(b.x1, v.x)
          b.z0 = Math.min(b.z0, v.z)
          b.z1 = Math.max(b.z1, v.z)
          b.n++
        }
      })
      return { ...b, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 }
    }
    // tope del reticulado (2.º tramo, amarillo): último medio metro bajo su punto más alto
    let ymax = -Infinity
    R.groups.mastil.traverse((o) => {
      if (!o.isMesh || o.material.name !== 'sk575_mastil_amarillo') return
      o.geometry.computeBoundingBox()
      ymax = Math.max(
        ymax,
        new R.three.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).max.y,
      )
    })
    const reticulado = caja('amarillo', ymax - 0.5, ymax)
    const corona = caja('rojo', 25, Infinity) // el rojo del mástil por encima de 25 m es solo la corona
    const poleas = caja('acero_oscuro', ymax + 0.2, Infinity) // poleas (las luminarias quedan bajo los 30,3 m)
    const blk = R.groups.aparejo.getObjectByName('bloque_viajero')
    return {
      bloqueX: blk && blk.getWorldPosition(new V()).x,
      reticulado,
      corona,
      poleas,
      desvio: Math.hypot(corona.cx - reticulado.cx, corona.cz - reticulado.cz),
    }
  })
  assert.ok(
    r.reticulado.n > 0 && r.corona.n > 0 && r.poleas.n > 0,
    'faltan vértices del tope, la corona o las poleas',
  )
  assert.ok(
    r.desvio < 0.15,
    `la corona no está centrada sobre el reticulado: ${r.desvio.toFixed(3)} m`,
  )
  const cxPoleas = (r.poleas.x0 + r.poleas.x1) / 2
  assert.ok(
    Math.abs(cxPoleas) < 0.15,
    `las poleas no están a plomo del pozo: x = ${cxPoleas.toFixed(3)} m`,
  )
  const c = [r.reticulado.cx, 32, r.reticulado.cz]
  await vista('09-corona-superior', [c[0], 46, c[2] + 0.02], c)
  await vista('09-corona-lateral', [c[0], 32.5, c[2] + 9], c)
})

// Piso de enganche: rebatido contra el mástil en transporte e izado del 1.er tramo; horizontal al terminar (ilustrativo).
test('piso de enganche: plegado (> 60°) a p = 0,35 y horizontal (< 2°) a p = 1', async (t) => {
  if (skip) return t.skip(skip)
  const medir = (p) =>
    page.evaluate(async (p) => {
      const R = window.__rig
      const n = R.groups.enganche.getObjectByName('sk575_enganche')
      const Q = n.quaternion.constructor
      const sup = R.groups.mastil.getObjectByName('mastil_tramo_superior')
      window.__rigErect.set(p)
      await new Promise((ok) => {
        R.invalidate()
        requestAnimationFrame(() => requestAnimationFrame(ok))
      })
      R.scene.updateMatrixWorld(true)
      const qn = n.getWorldQuaternion(new Q())
      // giro del piso respecto del 2.º tramo (al que va abisagrado) e inclinación de su eje X respecto de la horizontal
      const rel = sup.getWorldQuaternion(new Q()).invert().multiply(qn)
      const eje = new R.three.Vector3(1, 0, 0).applyQuaternion(qn)
      let visible = true
      for (let o = n; o; o = o.parent) if (!o.visible) visible = false
      return {
        rel: rel.toArray(),
        horizontal: (Math.asin(Math.abs(eje.y)) * 180) / Math.PI,
        visible,
      }
    }, p)
  const m1 = await medir(1)
  const m035 = await medir(0.35)
  const dot = Math.abs(m1.rel.reduce((s, v, i) => s + v * m035.rel[i], 0))
  const plegado = (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI
  assert.ok(m035.visible, 'el piso de enganche debe verse plegado durante el izamiento')
  assert.ok(
    plegado > 60,
    `a p = 0,35 el piso no está rebatido contra el mástil: ${plegado.toFixed(1)}°`,
  )
  assert.ok(m1.horizontal < 2, `a p = 1 el piso no queda horizontal: ${m1.horizontal.toFixed(2)}°`)
  for (const p of [0.35, 0.7, 0.9, 1]) {
    await page.evaluate((p) => window.__rigErect.set(p), p)
    await cuadro()
    await snap('10-enganche-izamiento-' + String(Math.round(p * 100)).padStart(3, '0'))
  }
  await page.evaluate(() => window.__rigErect.set(1))
})

// Hallazgos 2 (3d-perf #7 y código #2). Espera el fix en 84 (`sincronizarIzamiento`): cables del cuadro y de la llave atados
// a la visibilidad del mástil, y tiros SK atados al mástil y al avance del izamiento (no a la casilla del aparejo).
test('montaje paso 5: sin mástil no se ven cables colgando y los tiros siguen al izamiento', async (t) => {
  if (skip) return t.skip(skip)
  const visibles = () => {
    const R = window.__rig
    const ver = (o) => {
      if (!(o.layers.mask & 1)) return false
      for (let p = o; p; p = p.parent) if (!p.visible) return false
      return true
    }
    const por = (re) => {
      const out = []
      R.scene.traverse((o) => re.test(o.name) && out.push(ver(o)))
      return out
    }
    return {
      mastil: R.groups.mastil.visible,
      cables: por(/^sk575_(cuadro_cable|llave_cable)/),
      tiros: por(/^sk575_tiros_/),
    }
  }
  const leer = () => page.evaluate(`(${visibles})()`)
  await page.evaluate(() => window.__rigSeq.go(5))
  await cuadro()
  const p5 = await leer()
  await snap('05-montaje-paso5')
  assert.equal(p5.mastil, false, 'el paso 5 no debería mostrar el mástil')
  assert.ok(p5.cables.length > 0, 'no se encontraron cables sk575_cuadro_cable*/sk575_llave_cable*')
  assert.ok(!p5.cables.some(Boolean), `cables visibles sin mástil: ${JSON.stringify(p5.cables)}`)
  // los tiros se apoyan en el piso de enganche: sin mástil no se ven, aunque los caballetes sí
  assert.ok(p5.tiros.length > 0, 'no se encontraron piezas sk575_tiros_*')
  assert.ok(!p5.tiros.some(Boolean), 'tiros visibles sin mástil')

  await page.evaluate(() => {
    window.__rigSeq.close()
    window.__rigErect.set(0.35)
  })
  await cuadro()
  const p035 = await leer()
  assert.ok(!p035.tiros.some(Boolean), 'con el mástil acostado los tiros SK no deberían verse')
  await page.evaluate(() => window.__rigErect.set(1))
  await cuadro()
  const p1 = await leer()
  assert.ok(p1.tiros.every(Boolean), 'al terminar el izamiento los tiros vuelven')
})

test('DROPS: la capa se enciende con marcadores y sin errores de consola', async (t) => {
  if (skip) return t.skip(skip)
  const errores0 = problemas.length
  await page.evaluate(() => window.__rigLayers.set('drops', true))
  await hasta(() => !!window.__rig.drops?.isActive())
  const r = await page.evaluate(() => ({
    capas: window.__rigLayers.get(),
    marcadores: document.querySelectorAll('#drops-markers > *').length,
  }))
  await snap('06-drops')
  assert.ok(r.capas.includes('drops'), r.capas.join())
  assert.ok(r.marcadores > 0, 'sin marcadores DROPS')
  // la sección piso de enganche se ancla a la pieza SK (centro de su caja) y sigue rotulada aproximada
  const pe = await page.evaluate(() => {
    const R = window.__rig
    const n = R.groups.enganche.getObjectByName('sk575_enganche')
    R.scene.updateMatrixWorld(true)
    const c = new R.three.Box3().setFromObject(n).getCenter(new R.three.Vector3()).toArray()
    const a = R.drops.anclajes().find((m) => m.sec === 'piso-enganche')
    return { c, tag: n.userData.dropsId, a }
  })
  assert.equal(pe.tag, 'piso-enganche')
  assert.ok(pe.a && pe.a.approx, 'el marcador del piso de enganche debe rotularse aproximado')
  const d = Math.hypot(...pe.a.anchor.map((v, i) => v - pe.c[i]))
  assert.ok(d < 1e-3, `el marcador del piso de enganche no está sobre la pieza SK: ${d} m`)
  assert.deepEqual(problemas.slice(errores0), [])
})

test('Vista CAD: desde ortográfica pasa a perspectiva, noche y sin entorno; al apagar restaura', async (t) => {
  if (skip) return t.skip(skip)
  const estado = () =>
    page.evaluate(() => ({
      cam: window.__rig.camera().type,
      noche: !!window.__rig.view.night,
      entorno: window.__rig.scene.getObjectByName('locacion_entorno').visible,
    }))
  // R.camera() cambia de tipo recién en el cuadro siguiente al click
  const camara = (tipo) => hasta((t) => window.__rig.camera().type === t, tipo)
  await page.evaluate(() => window.__rig.view.ortho || document.getElementById('c-ortho').click())
  await camara('OrthographicCamera')
  const antes = await estado()
  assert.equal(antes.cam, 'OrthographicCamera')
  await page.evaluate(() => window.__rigVistaCad.on())
  await camara('PerspectiveCamera')
  assert.deepEqual(await estado(), { cam: 'PerspectiveCamera', noche: true, entorno: false })
  await cuadro()
  await snap('04-vista-cad')
  await page.evaluate(() => window.__rigVistaCad.off())
  await camara('OrthographicCamera')
  assert.deepEqual(await estado(), antes)
})

// Hallazgo 3: con Vista CAD encendida, un cambio a QHSE se perdía al apagarla (capas → []). Espera el fix en 85.
test('modo QHSE y Vista CAD: al apagarla quedan las capas del modo (en ambos órdenes)', async (t) => {
  if (skip) return t.skip(skip)
  const modo = (m) =>
    page.evaluate((m) => document.querySelector(`#v2-modebar button[data-m="${m}"]`).click(), m)
  const capas = () => page.evaluate(() => window.__rigLayers.get())
  const delModo = (c) => c.includes('zonas') && c.includes('drops')

  await modo('qhse')
  await page.evaluate(() => window.__rigVistaCad.on())
  await page.evaluate(() => window.__rigVistaCad.off())
  const a = await capas()
  assert.ok(delModo(a), `QHSE → Vista CAD on/off: ${a.join()}`)

  await modo('explore')
  await page.evaluate(() => window.__rigVistaCad.on())
  await modo('qhse')
  await page.evaluate(() => window.__rigVistaCad.off())
  const b = await capas()
  assert.ok(delModo(b), `Vista CAD on → QHSE → off: ${b.join()}`)
})

test('modos: los cuatro presets aplican y operación aísla aparejo + malacate', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const P = window.__rigPresets
    const G = window.__rig.groups
    const out = {}
    for (const m of ['operation', 'qhse', 'training', 'explore']) {
      out[m] = { ok: P.apply(m), carrier: G.camion.visible, aparejo: G.aparejo.visible }
      if (m === 'qhse') out.qhseCapas = window.__rigLayers.get()
    }
    return out
  })
  for (const m of ['operation', 'qhse', 'training', 'explore']) assert.ok(r[m].ok, m)
  assert.deepEqual(
    { carrier: r.operation.carrier, aparejo: r.operation.aparejo },
    { carrier: false, aparejo: true },
  )
  assert.ok(r.qhseCapas.includes('zonas') && r.qhseCapas.includes('drops'), r.qhseCapas.join())
  assert.equal(r.explore.carrier, true)
})

test('móvil 390×844: sin tarjeta del SK-575 ni "Referencia del conjunto"; la barra de modos se ve', async (t) => {
  if (skip) return t.skip(skip)
  // misma página redimensionada: una segunda carga del V2 con render por software no llega a 'load' a tiempo
  await page.setViewportSize({ width: 390, height: 844 })
  try {
    await cuadro()
    const r = await page.evaluate(() => {
      const caja = (id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const b = el.getBoundingClientRect()
        return b.width && b.height ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null
      }
      return {
        card: caja('sk575-card'),
        inspector: caja('cad-inspector'),
        barra: caja('v2-modebar'),
      }
    })
    await snap('07-movil')
    assert.equal(r.card, null, 'la tarjeta del SK-575 fue retirada')
    assert.equal(r.inspector, null, 'la tarjeta "Referencia del conjunto" fue retirada')
    assert.ok(r.barra, 'la barra de modos debe verse')
  } finally {
    await page.setViewportSize({ width: 1440, height: 900 })
  }
})

test('GLB del SK-575: servido por http se bajan con fetch (el HTML no trae el base64)', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => ({
    fuente: window.__rigSk575.stats.fuente,
    b64: !!window.__RIG_SK575_GLB,
    glb: window.__RIG_SK575_FILES.length,
  }))
  assert.deepEqual(r, { fuente: 'fetch', b64: false, glb: 16 })
})

test('GLB del SK-575: en un iframe sandbox sin CORS entra el respaldo base64 (sk575-glb.js)', async (t) => {
  if (skip) return t.skip(skip)
  if (!server) return t.skip('solo con el servidor local (E2E_URL no sirve /host.html)')
  // Navegador aparte (con la sesión principal abierta, una segunda carga por software no llega a tiempo) y sin vigilar la
  // consola: el fetch bloqueado por CORS deja errores de red (es lo esperado).
  const b = await chromium.launch(LANZAR)
  const p = await b.newPage({ viewport: { width: 900, height: 600 } })
  try {
    await p.goto(url.replace(V2, '/host.html'), { waitUntil: 'commit', timeout: 120_000 })
    let f
    while (!(f = p.frames().find((x) => x !== p.mainFrame()))) await p.waitForTimeout(100)
    await f.waitForFunction(() => window.__rigSk575 && window.__rigSk575.ready(), null, {
      timeout: 120_000,
    })
    const r = await f.evaluate(async () => {
      await window.__rigSk575.ready()
      const ids = new Set(
        window.__rig.pickables
          .filter((m) => m.material?.name?.startsWith('sk575_'))
          .map((m) => m.material.name.split('_').slice(0, 2).join('_')),
      )
      return { fuente: window.__rigSk575.stats.fuente, origen: self.origin, comps: ids.size }
    })
    assert.deepEqual(r, { fuente: 'base64', origen: 'null', comps: 16 })
  } finally {
    await b.close()
  }
})

test('QHSE: un único panel lateral; "SIN VALIDAR" y el aviso del A2 siguen visibles con todo plegado', async (t) => {
  if (skip) return t.skip(skip)
  await page.evaluate(() => document.querySelector('#v2-modebar button[data-m="qhse"]').click())
  await hasta(
    () => !!window.__rig.drops?.isActive() && !!document.querySelector('#qp-drops #drops-legend'),
  )
  await snap('08-qhse-panel')
  const leer = () =>
    page.evaluate(() => {
      const $ = (id) => document.getElementById(id)
      const panel = $('qhse-panel')
      const ve = (el) => {
        if (!el) return false
        const b = el.getBoundingClientRect()
        return (
          getComputedStyle(el).display !== 'none' &&
          b.width > 0 &&
          b.height > 0 &&
          b.top >= 0 &&
          b.bottom <= innerHeight
        )
      }
      const legend = $('legend')
      const warn = document.querySelector('.dl-warn')
      return {
        paneles: document.querySelectorAll('#qhse-panel').length,
        panel: ve(panel),
        dentro: ['v2-qhse', 'drops-legend', 'legend'].filter((id) => panel.contains($(id))),
        sueltas: [...$('stage').children].filter((el) =>
          /^(v2-qhse|drops-legend|legend)$/.test(el.id),
        ).length,
        legend: ve(legend) && /SIN VALIDAR/.test(legend.textContent) && !legend.closest('details'),
        warn:
          ve(warn) &&
          /no define radios ni distancias/.test(warn.textContent) &&
          !warn.closest('details'),
        fuentes: new Set(
          [...panel.querySelectorAll('*')].map((e) => getComputedStyle(e).fontFamily),
        ).size,
      }
    })
  const abierto = await leer()
  await page.evaluate(() =>
    document.querySelectorAll('#qhse-panel details').forEach((d) => (d.open = false)),
  )
  const plegado = await leer()
  await snap('09-qhse-plegado')
  await page.evaluate(() =>
    document.querySelectorAll('#qhse-panel details').forEach((d) => (d.open = true)),
  )
  const esperado = {
    paneles: 1,
    panel: true,
    dentro: ['v2-qhse', 'drops-legend', 'legend'],
    sueltas: 0,
    legend: true,
    warn: true,
    fuentes: 1,
  }
  assert.deepEqual(abierto, esperado)
  assert.deepEqual(plegado, esperado)
})

// Recorrido en primera persona (87-recorridos.js): cada viewpoint, volver, caminata con colisión, doble clic y recorrido guiado.
test('recorridos: cada viewpoint ubica la cámara, resalta el equipo y muestra la ficha; volver restaura', async (t) => {
  if (skip) return t.skip(skip)
  const antes = await page.evaluate(() => ({
    pos: window.__rig.camera().position.toArray(),
    ortho: !!window.__rig.view.ortho,
  }))
  try {
    const r = await page.evaluate(() => {
      const VP = window.__rigVp
      return VP.list().map((v) => {
        VP.go(v.id, { instant: true })
        const cam = window.__rig.camera()
        let velos = 0
        window.__rig.scene.traverse((o) => o.userData.vpVelo && velos++)
        return {
          id: v.id,
          err: cam.position.distanceTo(new window.__rig.three.Vector3(...v.camPos)),
          persp: cam.isPerspectiveCamera,
          velos,
          pide: v.objeto3D.length > 0,
          ficha:
            !document.getElementById('vp-ficha').hidden &&
            document.getElementById('vp-nombre').textContent === v.nombre,
        }
      })
    })
    assert.equal(r.length, 14)
    for (const v of r) {
      assert.ok(v.err < 0.05, `${v.id}: cámara a ${v.err.toFixed(3)} m del viewpoint`)
      assert.ok(v.persp && v.ficha, v.id)
      assert.equal(v.velos > 0, v.pide, `${v.id}: resaltado`)
    }
    await page.evaluate(() => {
      document.getElementById('vp-toggle').click()
      window.__rigVp.go('acumulador', { instant: true })
    })
    await cuadro()
    await snap('11-viewpoint-acumulador')
  } finally {
    await page.evaluate(() => {
      window.__rigVp.back({ instant: true })
      document.getElementById('vp-panel').classList.add('collapsed')
    })
  }
  const despues = await page.evaluate(() => {
    let velos = 0
    window.__rig.scene.traverse((o) => o.userData.vpVelo && velos++)
    return {
      pos: window.__rig.camera().position.toArray(),
      ortho: !!window.__rig.view.ortho,
      velos,
    }
  })
  assert.equal(despues.ortho, antes.ortho)
  assert.equal(despues.velos, 0)
  assert.ok(
    Math.hypot(...despues.pos.map((v, i) => v - antes.pos[i])) < 0.05,
    'volver restaura la cámara',
  )
})

test('recorridos: doble clic sobre el manifold resuelve su viewpoint', async (t) => {
  if (skip) return t.skip(skip)
  try {
    const id = await page.evaluate(async () => {
      const VP = window.__rigVp
      VP.go('manifold', { instant: true })
      await new Promise((r) => requestAnimationFrame(r))
      const R = window.__rig
      const p = new R.three.Vector3(6.2, 0.7, -11.2).project(R.camera())
      const b = R.renderer.domElement.getBoundingClientRect()
      return VP.pick(b.left + ((p.x + 1) / 2) * b.width, b.top + ((1 - p.y) / 2) * b.height)?.id
    })
    assert.equal(id, 'manifold')
  } finally {
    await page.evaluate(() => window.__rigVp.back({ instant: true }))
  }
})

test('recorridos: caminata a 1,70 m y ~1,4 m/s, choca con la bomba, ESC vuelve a OrbitControls', async (t) => {
  if (skip) return t.skip(skip)
  try {
    const andar = (ms) =>
      page.evaluate(async (ms) => {
        const VP = window.__rigVp
        const c = window.__rig.camera()
        const a = c.position.clone()
        VP.keys.add('KeyW')
        await new Promise((r) => setTimeout(r, ms))
        VP.keys.delete('KeyW')
        return { d: a.distanceTo(c.position), y: c.position.y, z: c.position.z }
      }, ms)
    await page.evaluate(() => {
      const VP = window.__rigVp
      // headless concede el Pointer Lock y lo suelta enseguida (= ESC): se camina con teclado, ESC por keydown
      window.__rig.renderer.domElement.requestPointerLock = () =>
        Promise.reject(new Error('sin lock'))
      VP.go('bomba', { instant: true }) // mira hacia −Z, a la bomba
      VP.walk(true)
    })
    // colisión sin depender de los FPS: pasos de 2,3 cm (1,4 m/s a 60 FPS) desde el viewpoint, que queda sobre el canto del gabinete
    const rozando = await page.evaluate(() => {
      const VP = window.__rigVp
      const c = window.__rig.camera()
      let { x, z } = c.position
      for (let i = 0; i < 300 && VP.libre(x, z, 0, -0.023); i++) z -= 0.023
      return z
    })
    assert.ok(rozando > -14.5, `rozando el canto atravesó la bomba: z = ${rozando.toFixed(2)}`)
    // 1,5 s: el headless puede dar ~2 cuadros/s y el paso está topado a 0,25 s por cuadro; con 0,5 s podía no llegar ningún cuadro
    const corto = await andar(1500)
    assert.ok(Math.abs(corto.y - 1.7) < 1e-6, `altura ${corto.y}`)
    assert.ok(
      corto.d > 0.05 && corto.d <= 1.4 * 1.5 + 0.05,
      `≤ 1,4 m/s: ${corto.d.toFixed(2)} m en 1,5 s`,
    )
    const largo = await andar(3500) // la bomba está a ~3 m: sin colisión la atravesaría
    assert.ok(largo.z > -14.5, `atravesó la bomba: z = ${largo.z.toFixed(2)}`)
    await snap('12-caminata-bomba')
    await page.keyboard.press('Escape')
    const r = await page.evaluate(() => ({
      walking: window.__rigVp.walking(),
      orbit: window.__rig.controls().enabled,
    }))
    assert.deepEqual(r, { walking: false, orbit: true })
  } finally {
    await page.evaluate(() => {
      window.__rigVp.walk(false)
      window.__rigVp.back({ instant: true })
    })
  }
})

test('recorridos: el recorrido guiado vive en Entrenamiento (anterior / siguiente / reproducir / pausa)', async (t) => {
  if (skip) return t.skip(skip)
  try {
    await page.evaluate(() =>
      document.querySelector('#v2-modebar button[data-m="training"]').click(),
    )
    const r = await page.evaluate(() => {
      const VP = window.__rigVp
      const visible = getComputedStyle(document.getElementById('vp-tour')).display !== 'none'
      VP.tour.next()
      const a = VP.current()
      VP.tour.next()
      const b = VP.current()
      VP.tour.prev()
      const c = VP.current()
      VP.tour.play()
      const auto = VP.tour.state().auto
      VP.tour.pause()
      return { visible, a, b, c, auto, pausado: VP.tour.state().auto }
    })
    assert.deepEqual(r, {
      visible: true,
      a: 'acceso',
      b: 'acumulador',
      c: 'acceso',
      auto: true,
      pausado: false,
    })
    const fuera = await page.evaluate(() => {
      document.querySelector('#v2-modebar button[data-m="explore"]').click()
      return getComputedStyle(document.getElementById('vp-tour')).display
    })
    assert.equal(fuera, 'none')
  } finally {
    await page.evaluate(() => window.__rigVp.back({ instant: true }))
  }
})

test('consola sin errores durante toda la sesión', (t) => {
  if (skip) return t.skip(skip)
  assert.deepEqual(problemas, [])
})

// ─────────── efectos y herramientas 3D (74-78, 95-99) + capturas fijas de referencia en .tmp/e2e/vista-*.png ───────────
test('efectos 3D: perfiles, cielo, halos de noche, clima, personas, maniobra, cortes Y/Z y ángulo', async (t) => {
  if (skip) return t.skip(skip)
  await hasta(() => !!(window.__rigFx && window.__rigFx.perfil()))
  try {
    const perfiles = await page.evaluate(async () => {
      const out = {}
      for (const id of ['movil', 'pc', 'presentacion']) {
        await window.__rigFx.elegir(id)
        const R = window.__rig
        let m = 0
        R.scene.traverse((o) => {
          if (o.isDirectionalLight && o.castShadow) m = o.shadow.mapSize.x
        })
        out[id] = [R.renderer.shadowMap.enabled, m]
      }
      return out
    })
    assert.deepEqual(perfiles.movil, [false, 1024])
    assert.deepEqual(perfiles.presentacion, [true, 4096])

    await page.evaluate(() => window.__rigAmbiente.cielo('dia'))
    await cuadro()
    assert.equal((await page.evaluate(() => window.__rigAmbiente.estado())).cielo, true)
    await snap('vista-iso-dia')

    await page.evaluate(() => document.getElementById('c-night').click())
    await cuadro()
    const noche = await page.evaluate(() => window.__rigAmbiente.estado())
    assert.equal(noche.cielo, false, 'sin cielo de día en vista nocturna')
    assert.ok(noche.halos >= 4, `halos en las torres: ${noche.halos}`)
    await snap('vista-iso-noche')
    await page.evaluate(() => document.getElementById('c-night').click())

    const clima = await page.evaluate(
      () => (window.__rigClima.set('lluvia', 60), window.__rigClima.estado()),
    )
    assert.deepEqual([clima.cond, clima.kmh, clima.visible], ['lluvia', 60, true])
    assert.equal(
      await page.evaluate(() => document.querySelector('#clima-ctl [data-aviso]').hidden),
      false,
    )
    await page.evaluate(() => window.__rigClima.set('despejado', 0))

    const personas = await page.evaluate(
      () => (window.__rigPersonas.set(true), window.__rigPersonas.lista()),
    )
    assert.ok(personas.length >= 4, `personas apoyadas: ${personas.length}`)
    for (const p of personas)
      assert.ok(
        [0, 3.61, 20.63].some((c) => Math.abs(p.y - c) < 0.6),
        `${p.id} y=${p.y}`,
      )

    const man = await page.evaluate(() => {
      const M = window.__rigManiobra
      M.lineaFuego(true)
      const fase = (v) => {
        M.set(v)
        const R = window.__rig
        const b = new R.three.Box3().setFromObject(R.scene.getObjectByName('maniobra_tiro'))
        return { min: b.min.y, max: b.max.y, linea: M.estado().linea }
      }
      return { arriba: fase(0.54), estibado: fase(0.9) }
    })
    assert.ok(
      man.arriba.min > 3.5 && man.arriba.min < 4.2,
      `pie del tiro sobre el piso: ${man.arriba.min}`,
    )
    assert.ok(
      Math.abs(man.estibado.max - 21.3) < 0.6,
      `tope del tiro en el peine: ${man.estibado.max}`,
    )
    assert.equal(man.arriba.linea, true)
    await snap('vista-maniobra')
    await page.evaluate(() => window.__rigManiobra.reset())

    const cortes = await page.evaluate(async () => {
      window.__rigCortes.y(true, 6)
      window.__rigCortes.z(true, 0)
      const a = window.__rigCortes.planos()
      window.__rigCortes.y(false)
      window.__rigCortes.z(false)
      return [a, window.__rigCortes.planos()]
    })
    assert.deepEqual(cortes, [2, 0])

    const ang = await page.evaluate(() => {
      const V = window.__rig.three.Vector3
      return window.__rigAngulo.medir(new V(1, 0, 0), new V(0, 0, 0), new V(0, 1, 1))
    })
    assert.ok(Math.abs(ang.ang - 90) < 1e-6 && Math.abs(ang.dy - 1) < 1e-9)
  } finally {
    await page.evaluate(() => {
      window.__rigPersonas?.set(false)
      window.__rigClima?.set('despejado', 0)
      window.__rigManiobra?.reset()
      window.__rigManiobra?.lineaFuego(false)
      window.__rigCortes?.y(false)
      window.__rigCortes?.z(false)
      if (window.__rig.view.night) document.getElementById('c-night').click()
      return window.__rigFx?.elegir('pc')
    })
  }
})
