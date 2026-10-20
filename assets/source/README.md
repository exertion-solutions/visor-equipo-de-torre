# assets/source

Modelos 3D **originales** (GLB/glTF, texturas fuente). Solo lectura: ninguna herramienta del proyecto
los modifica. Están ignorados por git (ver `.gitignore`); versionar solo los optimizados en
`public/models/`.

```
npm run gltf:inspect -- assets/source/<archivo>.glb
npm run gltf:optimize -- <archivo>.glb      # → public/models/rig10/<archivo>.glb
```

Detalle en `.claude/skills/gltf-pipeline/SKILL.md`.
