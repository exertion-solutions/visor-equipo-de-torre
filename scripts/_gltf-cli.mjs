// Helper compartido: ejecuta el CLI local de @gltf-transform (devDependency, sin instalación global).
import { spawnSync } from 'node:child_process'
import path from 'node:path'

export const projectRoot = path.resolve(import.meta.dirname, '..')
// `exports` del paquete no expone package.json: se apunta directo al bin local.
const cliPath = path.join(projectRoot, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js')
export const sourceDir = path.join(projectRoot, 'assets', 'source')
export const outputDir = path.join(projectRoot, 'public', 'models', 'rig10')

export function runGltfTransform(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
