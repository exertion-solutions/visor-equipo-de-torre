// Componente 04 (aparejo, amelas y elevadores): textos del panel de detalle. El bundle escapa los no-ASCII (`ó`, `í`),
// por eso las cadenas a buscar con acentos usan String.raw. Cada `find` debe tener EXACTAMENTE 1 coincidencia.
export default [
  {
    name: 'componente 04: nombre "Aparejo, amelas y elevadores"',
    find: 'at.aparejo.name="Aparejo, amelas y elevador";',
    replace: 'at.aparejo.name="Aparejo, amelas y elevadores";',
  },
  {
    name: 'componente 04: descripción con gancho, elevador de tubing y elevador de varillas (detalle aproximado, ubicación pendiente)',
    find: String.raw`Se representan tres poleas m\xF3viles y seis ramales.`,
    replace:
      'Se representan tres poleas móviles con garganta, seis ramales, gancho con pestillo, dos amelas y un elevador de tubing articulado ' +
      '(detalle aproximado a partir de fotos de unidades genéricas de catálogo; no es el equipo as-built). ' +
      'Se agrega un elevador de varillas (sucker rod) apoyado en el piso de trabajo: su existencia y su ubicación en el equipo 10 están pendientes de confirmar.',
  },
  {
    name: 'componente 04: peligros de referencia de elevadores y amelas (pendientes de validación, no son requisitos)',
    find: String.raw`"Ca\xEDda de la carga por traba del gancho abierta"]`,
    replace:
      String.raw`"Ca\xEDda de la carga por traba del gancho abierta",` +
      '"Atrapamiento de manos en la bisagra o la traba del elevador (referencia, pendiente de validación)",' +
      '"Elevador de varillas mal asentado o sin cerrar (referencia, pendiente de validación)",' +
      '"Desgaste o fisura en los ojos de las amelas y en los pasadores (referencia, pendiente de validación)"]',
  },
]
