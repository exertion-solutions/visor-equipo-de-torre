# reference/legacy — base del visor V2

`Digital_Rig_V2.base.html` es la base del visor V2 autocontenido (HTML + three.js embebido) ya saneada para el sitio público:
sin marca, sin foto del equipo real y sin secciones de fuentes internas. No se edita salvo decisión documentada.

- `npm run build:legacy` (`scripts/build-legacy.mjs`) parte de esta base, le aplica los parches de `scripts/patches/` y le
  inyecta los módulos `legacy-ext/` y los datos DROPS → `public/legacy/Digital_Rig_V2.html` (generado, no se edita a mano).
- `SHA256SUMS.txt` guarda el hash de la base; `tests/build-legacy.test.mjs` lo verifica.

```
cd reference/legacy
sha256sum -c SHA256SUMS.txt
```
