import {
  Material,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
} from 'three'

/*
 * Efectos de presentación del visor CAD de referencia (~/cad/visor.py, skill de usuario `equipo-3d`): `desgaste` (suciedad
 * cerca del suelo + variación de brillo) y `noche` (luminarias como luces reales). Son EFECTOS VISUALES: no son datos del
 * equipo, ni una condición QHSE, ni un diseño de iluminación. Reversibles: apagarlos deja los materiales como venían.
 */

const NOISE = `varying vec3 vW;
float h3(vec3 p){return fract(sin(dot(p,vec3(12.99,78.23,37.72)))*43758.55);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`

/** Shader de desgaste de visor.py, en coordenadas de mundo (Y arriba, suelo en y = 0), sin texturas. */
export function wearShader(sh: Pick<WebGLProgramParametersWithUniforms, 'vertexShader' | 'fragmentShader'>): void {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
    .replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;',
    )
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>\n${NOISE}`)
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

const baseCompile = Material.prototype.onBeforeCompile
const baseKey = Material.prototype.customProgramCacheKey
const wearKey = () => 'tacker-wear'

function materials(root: Object3D): MeshStandardMaterial[] {
  const out = new Set<MeshStandardMaterial>()
  root.traverse((o) => {
    const m = (o as Mesh).material as MeshStandardMaterial | MeshStandardMaterial[] | undefined
    for (const mat of Array.isArray(m) ? m : m ? [m] : []) if (mat.isMeshStandardMaterial) out.add(mat)
  })
  return [...out]
}

const isEmissive = (m: MeshStandardMaterial) => m.emissive.r + m.emissive.g + m.emissive.b > 0

/** Activa/desactiva el desgaste en los materiales PBR no emisivos del árbol (recompila solo si cambia). */
export function setWear(root: Object3D, on: boolean): void {
  for (const m of materials(root)) {
    if (isEmissive(m) || (m.onBeforeCompile === wearShader) === on) continue
    m.onBeforeCompile = on ? wearShader : baseCompile
    m.customProgramCacheKey = on ? wearKey : baseKey
    m.needsUpdate = true
  }
}

/** Noche: las luminarias (materiales emisivos) brillan más, como en visor.py (3 → 4 sobre el factor del GLB). */
export function setNightGlow(root: Object3D, on: boolean): void {
  for (const m of materials(root)) if (isEmissive(m)) m.emissiveIntensity = on ? 4 : 1
}

// ponytail: tope fijo de luces puntuales por GLB (forward rendering: cada luz cuesta en cada fragmento); subirlo o usar
// luces agrupadas por zona si una vista nocturna lo necesita.
export const MAX_NIGHT_LIGHTS = 8

/**
 * Posiciones (mundo) de las luminarias: vértices de las mallas emisivas agrupados en una grilla de 1 m, como visor.py.
 * Lee con fromBufferAttribute (respeta la cuantización KHR_mesh_quantization) y aplica matrixWorld.
 */
export function lightSpots(root: Object3D, max = MAX_NIGHT_LIGHTS): Vector3[] {
  root.updateMatrixWorld(true)
  const spots = new Map<string, Vector3>()
  const v = new Vector3()
  root.traverse((o) => {
    const mesh = o as Mesh
    const m = mesh.material as MeshStandardMaterial | undefined
    if (!mesh.isMesh || !m?.isMeshStandardMaterial || !isEmissive(m)) return
    const pos = mesh.geometry.attributes.position
    if (!pos) return
    for (let i = 0; i < pos.count && spots.size < max; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      const k = `${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z)}`
      if (!spots.has(k)) spots.set(k, v.clone())
    }
  })
  return [...spots.values()]
}
