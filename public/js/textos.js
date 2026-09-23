/*
 * Todos los textos que ven los invitados, en un solo lugar.
 *
 * - Se editan desde Ajustes → Textos (no hace falta tocar el código).
 * - Lo que se guarda en los ajustes reemplaza al texto de fábrica; si se deja
 *   vacío, vuelve el de fábrica.
 * - Algunos textos aceptan comodines entre llaves, por ejemplo {n}, {total},
 *   {segundos}, {evento} o {marca}: se cambian solos por el valor real.
 *
 *   t('finalTitulo')                       -> '¡Quedó increíble!'
 *   t('capturaContador', { n: 2, total: 4 }) -> 'Foto 2 de 4'
 */

/** Grupos que arman la pestaña "Textos" de los ajustes. */
export const GRUPOS_TEXTOS = [
  {
    titulo: 'Pantalla de inicio',
    claves: [
      ['inicioBoton', 'Botón para comenzar', 'Toca para comenzar'],
    ],
  },
  {
    titulo: 'Elegir qué crear',
    claves: [
      ['modoTitulo', 'Título', '¿Qué quieres crear?'],
      ['modoFoto', 'Fotos · nombre', 'Fotos'],
      ['modoFotoDetalle', 'Fotos · descripción', 'Tu tira o postal impresa'],
      ['modoGif', 'GIF · nombre', 'GIF'],
      ['modoGifDetalle', 'GIF · descripción', 'Varias fotos animadas'],
      ['modoBoomerang', 'Boomerang · nombre', 'Boomerang'],
      ['modoBoomerangDetalle', 'Boomerang · descripción', 'Un momento que va y viene'],
      ['modoVideo', 'Video · nombre', 'Video'],
      ['modoVideoDetalle', 'Video · descripción', 'Deja un mensaje en video'],
    ],
  },
  {
    titulo: 'Diseño y estilo',
    claves: [
      ['plantillaTitulo', 'Título de los diseños', 'Elige tu diseño'],
      ['filtroTitulo', 'Título de los filtros', 'Elige un estilo'],
      ['filtroBoton', 'Botón para empezar a posar', '¡Listo, a posar!'],
    ],
  },
  {
    titulo: 'Durante las fotos',
    claves: [
      ['capturaPreparense', 'Aviso antes de la primera foto', '¡Prepárense!'],
      ['capturaSonrian', 'Aviso justo antes del disparo', '¡Sonrían!'],
      ['capturaContador', 'Contador de fotos ({n} y {total})', 'Foto {n} de {total}'],
      ['capturaUnaFoto', 'Cuando es una sola foto', 'Tu foto'],
      ['capturaBoomerang', 'Título en boomerang', 'Boomerang'],
      ['capturaBoomerangAviso', 'Aviso en boomerang', '¡Hagan un movimiento divertido!'],
      ['capturaVideo', 'Título en video', 'Video mensaje'],
      ['capturaVideoAviso', 'Aviso en video', '¡Deja tu mensaje!'],
      ['capturaDetener', 'Botón para detener el video', 'Detener'],
    ],
  },
  {
    titulo: 'Revisar y decorar',
    claves: [
      ['revisionTitulo', 'Título', '¿Qué tal quedaron?'],
      ['revisionSubtitulo', 'Subtítulo', 'Toca una foto para repetirla'],
      ['revisionEtiqueta', 'Etiqueta sobre cada foto', '↺ Repetir'],
      ['revisionRepetirTodas', 'Botón repetir todas', '↺ Repetir todas'],
      ['revisionListo', 'Botón para continuar', '¡Me encantan!'],
      ['stickersTitulo', 'Stickers · título', 'Decora tu foto'],
      ['stickersSubtitulo', 'Stickers · subtítulo', 'Toca un sticker para agregarlo, arrástralo y ajusta su tamaño'],
      ['stickersOmitir', 'Stickers · botón omitir', 'Sin stickers'],
      ['stickersListo', 'Stickers · botón continuar', '¡Listo!'],
    ],
  },
  {
    titulo: 'Mientras se procesa',
    claves: [
      ['procesandoFoto', 'Armando la impresión', 'Preparando tu impresión…'],
      ['procesandoGif', 'Creando el GIF', 'Creando tu GIF…'],
      ['procesandoGifExtra', 'GIF adicional en modo Fotos', 'Creando también tu GIF…'],
      ['procesandoBoomerang', 'Creando el boomerang', 'Creando tu boomerang…'],
      ['procesandoVideo', 'Guardando el video', 'Guardando tu video…'],
      ['procesandoGuardando', 'Guardando en la computadora', 'Guardando…'],
      ['procesandoSubiendo', 'Subiendo a internet', 'Subiendo tu recuerdo a internet…'],
    ],
  },
  {
    titulo: 'Pantalla final',
    claves: [
      ['finalTitulo', 'Título', '¡Quedó increíble!'],
      ['finalImprimir', 'Botón imprimir', 'Imprimir'],
      ['finalImprimiendo', 'Botón ya pulsado', '¡Imprimiendo!'],
      ['finalCopia', 'Una copia', 'copia'],
      ['finalCopias', 'Varias copias', 'copias'],
      ['finalHoja', 'Tamaño de la hoja ({ancho} y {alto})', 'Hoja de {ancho} × {alto} cm'],
      ['finalQr', 'Texto del código QR', 'Escanea con tu celular para descargar'],
      ['finalQrAyuda', 'Ayuda debajo del QR (red local)', '(conéctate al Wi-Fi del evento)'],
      ['finalQrAyudaNube', 'Ayuda debajo del QR (por internet)', '(funciona con tus datos móviles)'],
      ['finalQrAyudaPermanente', 'Ayuda debajo del QR (fotos guardadas en internet)', '(funciona siempre, también con datos móviles)'],
      ['finalDescargar', 'Botón descargar (versión web)', 'Descargar mi recuerdo'],
      ['finalTerminar', 'Botón terminar', 'Terminar'],
      ['finalRegreso', 'Cuenta para volver al inicio ({segundos})', 'Volviendo al inicio en {segundos} s'],
      ['avisoImprimiendoUna', 'Aviso al imprimir una copia', '🖨️ Tu foto se está imprimiendo'],
      ['avisoImprimiendoVarias', 'Aviso al imprimir varias ({n})', '🖨️ Se están imprimiendo {n} copias'],
    ],
  },
  {
    titulo: 'Voz del asistente',
    claves: [
      ['vozPreparense', 'Antes de la primera foto', '¡Prepárense!'],
      ['vozSonrian', 'Antes del disparo', '¡Sonrían!'],
      ['vozBoomerang', 'En boomerang', '¡Hagan un movimiento divertido!'],
      ['vozVideo', 'En video', '¡Prepárense para grabar su mensaje!'],
      ['vozImprimiendo', 'Al imprimir', 'Tu foto se está imprimiendo'],
    ],
  },
  {
    titulo: 'Marca de agua de GIF y video',
    claves: [
      ['marcaAgua', 'Texto ({evento} y {marca})', '{evento}  ·  {marca}'],
    ],
  },
];

/** Mapa plano clave -> texto de fábrica. */
export const TEXTOS_POR_DEFECTO = Object.fromEntries(
  GRUPOS_TEXTOS.flatMap((g) => g.claves.map(([clave, , valor]) => [clave, valor])),
);

let textos = { ...TEXTOS_POR_DEFECTO };

/** Carga los textos guardados en los ajustes (los vacíos usan el de fábrica). */
export function configurarTextos(guardados = {}) {
  textos = { ...TEXTOS_POR_DEFECTO };
  for (const [clave, valor] of Object.entries(guardados || {})) {
    const texto = String(valor ?? '').trim();
    if (texto && clave in TEXTOS_POR_DEFECTO) textos[clave] = texto;
  }
}

/**
 * Texto listo para mostrar.
 * @param {string} clave
 * @param {Record<string, string|number>} [valores] comodines, p. ej. { n: 2 }
 */
export function t(clave, valores) {
  let texto = textos[clave] ?? TEXTOS_POR_DEFECTO[clave] ?? '';
  if (valores) {
    for (const [nombre, valor] of Object.entries(valores)) {
      texto = texto.split(`{${nombre}}`).join(String(valor));
    }
  }
  return texto;
}

/** Escribe en la página los textos fijos (elementos con data-texto="clave"). */
export function pintarTextosFijos(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-texto]')) {
    const clave = el.dataset.texto;
    if (!(clave in TEXTOS_POR_DEFECTO)) continue;
    // en los botones con icono sólo se cambia el texto, no el icono
    const nodoTexto = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (nodoTexto && el.childNodes.length > 1) nodoTexto.textContent = ` ${t(clave)}`;
    else el.textContent = t(clave);
  }
  // la etiqueta "Repetir" de las fotos se dibuja con CSS
  raiz.documentElement?.style.setProperty('--texto-repetir', `"${t('revisionEtiqueta').replace(/"/g, '\\"')}"`);
}
