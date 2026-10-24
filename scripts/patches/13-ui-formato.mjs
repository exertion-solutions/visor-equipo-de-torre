// Ajustes de UI del original: formato decimal es-AR (coma) en las cotas dinámicas y rótulo fijo del interruptor de vista nocturna.
// Los escapes \\u2248 y \\xB7 están literales en el bundle (por eso van con doble barra).
// El resto de las cotas del visor ya usa coma ("3,30 m · piso"); estas tres salían con punto ("39.89 m", "14.00 m", "31.7 m").
export default [
  {
    name: 'medición 2 puntos con coma decimal',
    find: `ps.textContent="\\u2248 "+a.toFixed(2)+" m \\xB7 modelo"`,
    replace: `ps.textContent="\\u2248 "+a.toFixed(2).replace(".",",")+" m \\xB7 modelo"`,
  },
  {
    name: 'altura del aparejo con coma decimal',
    find: `document.getElementById("hoist-out").textContent="\\u2248 "+i.toFixed(2)+" m"`,
    replace: `document.getElementById("hoist-out").textContent="\\u2248 "+i.toFixed(2).replace(".",",")+" m"`,
  },
  {
    name: 'cota del mástil con coma decimal',
    find: `"\\u2248 "+vt.mastHeight.toFixed(1)+" m \\xB7 nominal (104 ft)"`,
    replace: `"\\u2248 "+vt.mastHeight.toFixed(1).replace(".",",")+" m \\xB7 nominal (104 ft)"`,
  },
  {
    // En el menú Vista el botón es un interruptor con estado visible: si el rótulo pasa a "Luz de estudio" al encenderlo,
    // el usuario lee la acción contraria. Se deja el rótulo fijo; el estado lo indica el interruptor (aria-pressed).
    name: 'vista nocturna: rótulo fijo (el estado lo muestra el interruptor)',
    find: 'document.getElementById("c-night").textContent=i?"Luz de estudio":"Vista nocturna",',
    replace: '',
  },
]
