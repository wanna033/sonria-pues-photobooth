/*
 * Panel de ajustes de la cabina (protegido con PIN).
 * Los campos se generan a partir de la lista SECCIONES.
 */

import { todasLasPlantillas, componer, fotoDeMuestra, cargarImagen, plantillaPorId } from './plantillas.js';
import { FILTROS } from './filtros.js';
import { qrSvg } from './qr.js';
import { GRUPOS_TEXTOS } from './textos.js';
import { EditorDisenos } from './disenos.js';

const SECCIONES = [
  { id: 'estado', titulo: 'Estado', especial: 'estado' },
  {
    id: 'evento',
    titulo: 'Evento y marca',
    campos: [
      { h: 'Evento' },
      { ruta: 'evento.nombre', tipo: 'texto', etiqueta: 'Nombre del evento', ayuda: 'Sale en la pantalla de inicio y en la impresión. Cada evento guarda sus fotos en su propia carpeta.' },
      { ruta: 'evento.textoImpresion', tipo: 'texto', etiqueta: 'Mensaje en la impresión' },
      { ruta: 'evento.fecha', tipo: 'fecha', etiqueta: 'Fecha del evento', ayuda: 'Déjala vacía para usar la fecha del día.' },
      { ruta: 'evento.mostrarFecha', tipo: 'bool', etiqueta: 'Mostrar la fecha en la impresión' },
      { h: 'Tu marca' },
      { ruta: 'marca.nombre', tipo: 'texto', etiqueta: 'Nombre de la cabina' },
      { ruta: 'marca.eslogan', tipo: 'texto', etiqueta: 'Frase de bienvenida' },
      { ruta: 'marca.tema', tipo: 'select', etiqueta: 'Estilo de las pantallas', opciones: [['claro', 'Claro (fondo blanco cálido)'], ['oscuro', 'Oscuro']] },
      { ruta: 'marca.colorPrimario', tipo: 'color', etiqueta: 'Color principal' },
      { ruta: 'marca.colorSecundario', tipo: 'color', etiqueta: 'Color secundario', ayuda: 'En el estilo claro es el color de los botones grandes.' },
      { ruta: 'marca.colorFondo', tipo: 'color', etiqueta: 'Color de fondo' },
      { ruta: 'marca.logo', tipo: 'recurso', recurso: 'logo', etiqueta: 'Logotipo', ayuda: 'De preferencia PNG con fondo transparente. Se usa en el inicio, en las impresiones y en la página de descarga.' },
      { ruta: 'marca.logoClaro', tipo: 'recurso', recurso: 'logo-claro', etiqueta: 'Logotipo para fondos oscuros', ayuda: 'Opcional: versión con letras claras. Se usa sola sobre fondos oscuros.' },
      { ruta: 'marca.mostrarNombre', tipo: 'bool', etiqueta: 'Mostrar el nombre en texto junto al logotipo', ayuda: 'Apágalo si tu logotipo ya incluye el nombre.' },
      { ruta: 'marca.animacionCarga', tipo: 'bool', etiqueta: 'Animación de la marca', ayuda: 'Se reproduce al abrir el programa y mientras se crea cada recuerdo.' },
    ],
  },
  { id: 'disenos', titulo: 'Mis diseños', especial: 'disenos' },
  {
    id: 'camara',
    titulo: 'Cámara',
    campos: [
      { ruta: 'captura.camaraId', tipo: 'camara', etiqueta: 'Cámara', ayuda: 'Para usar una cámara Canon, Nikon, Sony o Fujifilm, instala la utilidad de "webcam" del fabricante y elígela aquí.' },
      { ruta: 'captura.resolucion', tipo: 'select', etiqueta: 'Resolución', opciones: [['1280x720', 'HD · 1280×720'], ['1920x1080', 'Full HD · 1920×1080'], ['3840x2160', '4K · 3840×2160']] },
      { ruta: 'captura.espejoVistaPrevia', tipo: 'bool', etiqueta: 'Vista previa en espejo', ayuda: 'Los invitados se ven como en un espejo (recomendado).' },
      { ruta: 'captura.espejoFotos', tipo: 'bool', etiqueta: 'Guardar las fotos en espejo', ayuda: 'Apagado: los textos del fondo salen legibles en la foto.' },
      { h: 'Tiempos' },
      { ruta: 'captura.cuentaPrimera', tipo: 'numero', min: 1, max: 15, etiqueta: 'Cuenta regresiva de la primera foto (s)' },
      { ruta: 'captura.cuentaRegresiva', tipo: 'numero', min: 1, max: 10, etiqueta: 'Cuenta regresiva de las demás (s)' },
      { ruta: 'captura.pausaEntreFotos', tipo: 'numero', min: 0.5, max: 10, paso: 0.5, etiqueta: 'Pausa entre fotos (s)' },
      { h: 'Experiencia' },
      { ruta: 'captura.flash', tipo: 'bool', etiqueta: 'Destello blanco al disparar' },
      { ruta: 'captura.sonidos', tipo: 'bool', etiqueta: 'Sonidos (pitidos y obturador)' },
      { ruta: 'captura.voz', tipo: 'bool', etiqueta: 'Asistente de voz', ayuda: 'Usa las voces en español instaladas en Windows.' },
      { ruta: 'captura.permitirRepetir', tipo: 'bool', etiqueta: 'Permitir repetir fotos' },
    ],
  },
  {
    id: 'modos',
    titulo: 'Modos',
    campos: [
      { h: 'Modos disponibles para los invitados' },
      { ruta: 'modos.foto', tipo: 'bool', etiqueta: '📸 Fotos (impresión)' },
      { ruta: 'modos.gif', tipo: 'bool', etiqueta: '✨ GIF animado' },
      { ruta: 'modos.boomerang', tipo: 'bool', etiqueta: '🔁 Boomerang' },
      { ruta: 'modos.video', tipo: 'bool', etiqueta: '🎬 Video mensaje' },
      { h: 'GIF' },
      { ruta: 'gif.fotos', tipo: 'numero', min: 2, max: 8, etiqueta: 'Fotos por GIF' },
      { ruta: 'gif.retrasoMs', tipo: 'numero', min: 100, max: 2000, paso: 50, etiqueta: 'Tiempo por cuadro (ms)' },
      { ruta: 'gif.ancho', tipo: 'select', etiqueta: 'Tamaño del GIF', opciones: [['480', 'Chico · 480 px'], ['720', 'Mediano · 720 px'], ['960', 'Grande · 960 px']], numero: true },
      { ruta: 'gif.tambienEnModoFoto', tipo: 'bool', etiqueta: 'Crear también un GIF en el modo Fotos' },
      { h: 'Boomerang' },
      { ruta: 'boomerang.segundos', tipo: 'numero', min: 1, max: 4, paso: 0.5, etiqueta: 'Duración de la grabación (s)' },
      { ruta: 'boomerang.fps', tipo: 'numero', min: 8, max: 20, etiqueta: 'Cuadros por segundo' },
      { ruta: 'boomerang.ancho', tipo: 'select', etiqueta: 'Tamaño', opciones: [['480', 'Chico · 480 px'], ['640', 'Mediano · 640 px'], ['800', 'Grande · 800 px']], numero: true },
      { h: 'Video' },
      { ruta: 'video.segundos', tipo: 'numero', min: 3, max: 60, etiqueta: 'Duración máxima (s)' },
      { ruta: 'video.conAudio', tipo: 'bool', etiqueta: 'Grabar audio' },
    ],
  },
  {
    id: 'diseno',
    titulo: 'Diseño',
    campos: [
      { h: 'Plantillas de impresión' },
      { ruta: 'plantillas.habilitadas', tipo: 'multi', etiqueta: 'Disponibles', opciones: () => todasLasPlantillas().map((p) => [p.id, `${p.nombre} (${p.fotos})`]) },
      { ruta: 'plantillas.porDefecto', tipo: 'select', etiqueta: 'Si sólo hay una', opciones: () => todasLasPlantillas().map((p) => [p.id, p.nombre]) },
      { ruta: 'plantillas.fondo', tipo: 'select', etiqueta: 'Fondo', opciones: [['degradado', 'Degradado con los colores de la marca'], ['oscuro', 'Oscuro'], ['blanco', 'Blanco'], ['imagen', 'Imagen personalizada']] },
      { ruta: 'plantillas.fondoImagen', tipo: 'recurso', recurso: 'fondo', etiqueta: 'Imagen de fondo', ayuda: 'Se usa cuando el fondo es "Imagen personalizada". Tamaño ideal: 1800×1200 o 1200×1800.' },
      { ruta: 'plantillas.fuente', tipo: 'select', etiqueta: 'Tipografía', opciones: [['moderna', 'Moderna'], ['elegante', 'Elegante (manuscrita)'], ['divertida', 'Divertida'], ['clasica', 'Clásica']] },
      { ruta: 'plantillas.marcoFotos', tipo: 'bool', etiqueta: 'Marco blanco en las fotos' },
      { ruta: 'plantillas.esquinasRedondeadas', tipo: 'bool', etiqueta: 'Esquinas redondeadas' },
      { h: 'Filtros' },
      { ruta: 'filtros.mostrarSelector', tipo: 'bool', etiqueta: 'Dejar que el invitado elija el filtro' },
      { ruta: 'filtros.habilitados', tipo: 'multi', etiqueta: 'Disponibles', opciones: FILTROS.map((f) => [f.id, f.nombre]) },
      { ruta: 'filtros.porDefecto', tipo: 'select', etiqueta: 'Filtro predeterminado', opciones: FILTROS.map((f) => [f.id, f.nombre]) },
      { h: 'Stickers' },
      { ruta: 'stickers.habilitados', tipo: 'bool', etiqueta: 'Decorar con stickers antes de imprimir' },
      { ruta: 'stickers.frases', tipo: 'lineas', etiqueta: 'Frases', ayuda: 'Una por línea. Aparecen como globos de texto.' },
      { ruta: 'stickers.emojis', tipo: 'emojis', etiqueta: 'Emojis', ayuda: 'Separados por espacios. Puedes pegar los que quieras; se muestran en ese orden.' },
      { h: 'Marca de agua en GIF y video' },
      { ruta: 'marca.marcaDeAgua', tipo: 'bool', etiqueta: 'Poner la marca de agua', ayuda: 'El texto se edita en la pestaña Textos.' },
    ],
  },
  { id: 'textos', titulo: 'Textos', especial: 'textos' },
  {
    id: 'impresion',
    titulo: 'Impresión y QR',
    campos: [
      { h: 'Impresión' },
      { ruta: 'impresion.habilitada', tipo: 'bool', etiqueta: 'Permitir imprimir' },
      { ruta: 'impresion.copiasMaximas', tipo: 'numero', min: 1, max: 10, etiqueta: 'Copias máximas por sesión' },
      { ruta: 'impresion.copiasPorDefecto', tipo: 'numero', min: 1, max: 10, etiqueta: 'Copias sugeridas' },
      { tipo: 'accion', etiqueta: 'Prueba', boton: '🖨️ Imprimir página de prueba', accion: 'imprimirPrueba', ayuda: 'Imprime la plantilla predeterminada en la impresora predeterminada de Windows. La hoja mide exactamente lo que la plantilla (las integradas, 10×15 cm; las tuyas, lo que indiques en "Mis diseños"). Pon ese mismo tamaño de papel en la impresora y sin bordes.' },
      { h: 'Papel' },
      { ruta: 'impresion.controlarPapel', tipo: 'bool', etiqueta: 'Llevar la cuenta del papel', ayuda: 'Descuenta una hoja por cada copia impresa, avisa en el inicio cuando queda poco y deja de ofrecer la impresión cuando se acaba (el QR sigue funcionando).' },
      { ruta: 'impresion.avisoPapel', tipo: 'numero', min: 0, max: 500, etiqueta: 'Avisar cuando queden (hojas)' },
      { tipo: 'papel' },
      { h: 'Descarga con código QR' },
      { ruta: 'compartir.qr', tipo: 'bool', etiqueta: 'Mostrar código QR' },
      { ruta: 'compartir.internet', tipo: 'bool', etiqueta: 'QR por internet (datos móviles y cualquier Wi-Fi)', ayuda: 'Abre solo un enlace seguro de Cloudflare, gratis y sin cuenta. Por ese enlace sólo se ven las fotos de cada sesión. Si no hay internet, el QR usa el Wi-Fi del evento. Se aplica al pulsar Guardar.' },
      { tipo: 'tunel' },
      { ruta: 'compartir.urlBase', tipo: 'texto', etiqueta: 'Dirección en el Wi-Fi del evento', ayuda: 'Déjala vacía para detectarla sola. Se usa cuando no hay enlace por internet.', marcador: 'red' },
      { tipo: 'red' },
      { h: 'Guardar las fotos en internet (QR que funcionan siempre)' },
      { tipo: 'ayuda-nube' },
      { ruta: 'compartir.nube.activo', tipo: 'bool', etiqueta: 'Guardar cada sesión en internet', ayuda: 'El QR usará un enlace permanente. Las sesiones anteriores se suben desde la pestaña Galería.' },
      { ruta: 'compartir.nube.cloudName', tipo: 'texto', etiqueta: 'Cloud name de Cloudinary', ayuda: 'Aparece arriba en el panel de Cloudinary. No es una clave secreta.' },
      { ruta: 'compartir.nube.preset', tipo: 'texto', etiqueta: 'Upload preset (Unsigned)', ayuda: 'El nombre del preset sin firmar que creaste en Cloudinary.' },
      { ruta: 'compartir.nube.urlGaleria', tipo: 'texto', etiqueta: 'Dirección de tu página de descarga', ayuda: 'Tu página en GitHub, por ejemplo https://wanna033.github.io/sonria-pues-photobooth/g. Si la dejas vacía, el QR abre la foto directamente.' },
      { ruta: 'compartir.nube.subirFotosSueltas', tipo: 'bool', etiqueta: 'Subir también las fotos individuales', ayuda: 'Apagado sube sólo la tira, el GIF y el video: más rápido y códigos QR más sencillos.' },
      { tipo: 'probar-nube' },
      { h: 'Con las fotos guardadas en internet' },
      { ruta: 'impresion.qrEnImpresion', tipo: 'bool', etiqueta: 'Imprimir el código QR en la foto', ayuda: 'Cada tira o postal lleva un QR pequeño (unos 2 cm) para descargar las fotos cuando quieran, incluso días después. Sólo funciona con "Guardar cada sesión en internet".' },
      { ruta: 'impresion.qrPosicion', tipo: 'select', etiqueta: 'Esquina del QR en la foto', opciones: [['abajo-derecha', 'Abajo a la derecha'], ['abajo-izquierda', 'Abajo a la izquierda'], ['arriba-derecha', 'Arriba a la derecha'], ['arriba-izquierda', 'Arriba a la izquierda']] },
      { ruta: 'compartir.qrEventoEnInicio', tipo: 'bool', etiqueta: 'QR de la galería del evento en el inicio', ayuda: 'Una esquina del inicio muestra un QR con TODAS las fotos del evento. Necesita el paso 4 de arriba ("Resource list").' },
    ],
  },
  {
    id: 'general',
    titulo: 'General',
    campos: [
      { ruta: 'general.pin', tipo: 'texto', etiqueta: 'PIN de ajustes', ayuda: 'Sólo números. Déjalo vacío para no pedir PIN (no recomendado en eventos).', patron: '[0-9]*' },
      { ruta: 'general.inactividadSegundos', tipo: 'numero', min: 15, max: 600, etiqueta: 'Volver al inicio tras inactividad (s)' },
      { ruta: 'general.pantallaFinalSegundos', tipo: 'numero', min: 15, max: 600, etiqueta: 'Tiempo en la pantalla final (s)' },
      { ruta: 'general.mostrarRecientes', tipo: 'bool', etiqueta: 'Mostrar fotos recientes en el inicio' },
    ],
  },
  { id: 'galeria', titulo: 'Galería', especial: 'galeria' },
  { id: 'ayuda', titulo: 'Ayuda', especial: 'ayuda' },
];

function leer(obj, ruta) {
  return ruta.split('.').reduce((o, k) => o?.[k], obj);
}

function escribir(obj, ruta, valor) {
  const claves = ruta.split('.');
  const ultima = claves.pop();
  claves.reduce((o, k) => o[k], obj)[ultima] = valor;
}

/** Las opciones pueden ser una lista fija o una función (p. ej. plantillas que cambian con "Mis diseños"). */
function opcionesDe(campo) {
  return typeof campo.opciones === 'function' ? campo.opciones() : campo.opciones;
}

function el(etiqueta, props = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...hijos.flat().filter((h) => h !== null && h !== undefined));
  return e;
}

export class Ajustes {
  constructor({ raiz, pestanas, contenido, botonGuardar, botonCancelar, api, camara, acciones, modoWeb = false }) {
    Object.assign(this, { raiz, pestanas, contenido, api, camara, acciones, modoWeb });
    botonGuardar.addEventListener('click', () => this.guardar());
    botonCancelar.addEventListener('click', () => this.cerrar());
    this.raiz.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cerrar();
    });
  }

  get abierto() {
    return !this.raiz.hidden;
  }

  async abrir(config) {
    this.borrador = structuredClone(config);
    this.red = await this.api('/api/red').catch(() => null);
    this.camaras = await this.camara.listar();
    this.pestanas.replaceChildren(...SECCIONES.map((s) => el('button', {
      'data-seccion': s.id,
      onclick: () => this.mostrar(s.id),
    }, s.titulo)));
    this.raiz.hidden = false;
    this.mostrar('estado');
  }

  cerrar() {
    clearInterval(this.relojEstado);
    this.editorDisenos?.salir();
    this.raiz.querySelector('.visor-sesion')?.remove();
    this.raiz.hidden = true;
    this.contenido.replaceChildren();
    this.acciones.alCerrar?.();
  }

  mostrar(id) {
    const seccion = SECCIONES.find((s) => s.id === id);
    for (const b of this.pestanas.children) b.classList.toggle('activa', b.dataset.seccion === id);
    clearInterval(this.relojEstado);
    this.editorDisenos?.salir();
    this.raiz.querySelector('.visor-sesion')?.remove();
    this.contenido.replaceChildren();
    this.contenido.scrollTop = 0;
    if (seccion.especial === 'estado') return this.mostrarEstado();
    if (seccion.especial === 'textos') return this.mostrarTextos();
    if (seccion.especial === 'disenos') return this.mostrarDisenos();
    if (seccion.especial === 'galeria') return this.mostrarGaleria();
    if (seccion.especial === 'ayuda') return this.mostrarAyuda();
    for (const campo of seccion.campos) this.contenido.append(this.crearCampo(campo));
    if (id === 'diseno') this.mostrarEditorPlantillas();
  }

  /**
   * Pestaña "Estado": revisión rápida antes y durante el evento (cámara,
   * impresora, papel, QR por internet, fotos en la nube y disco).
   */
  async mostrarEstado() {
    const c = this.contenido;
    if (this.modoWeb) {
      c.append(el('h3', {}, 'Estado'), el('p', { class: 'nota' }, 'En la versión web no hay impresora ni servidor: revisa la cámara en su pestaña.'));
      return;
    }
    const tarjetas = el('div', { class: 'estado-tarjetas' }, el('p', { class: 'nota' }, 'Revisando…'));
    const boton = (texto, accion) => el('button', { class: 'boton-secundario', type: 'button', onclick: accion }, texto);
    c.append(
      el('h3', {}, 'Revisión de la cabina'),
      el('p', { class: 'nota' }, 'Revísala antes de abrir la cabina a los invitados. Se actualiza sola cada 5 segundos.'),
      tarjetas,
      el('h3', {}, 'Acciones rápidas'),
      el('div', { class: 'fila-botones' },
        boton('🖨️ Página de prueba', () => this.acciones.imprimirPrueba?.(this.borrador)),
        boton('🔄 Renovar enlace por internet', () => this.renovarTunel()),
        boton('☁️ Reintentar subidas', async () => {
          await this.api('/api/nube/reintentar', { method: 'POST', json: {} }).catch(() => {});
          this.acciones.aviso?.('☁️ Reintentando las subidas pendientes');
        }),
        boton('📦 Exportar evento (ZIP)', () => this.exportarEvento()),
        boton('📂 Abrir carpeta de fotos', () => this.api('/api/abrir-carpeta', { method: 'POST' }))),
      el('h3', {}, 'Papel en la impresora'),
      this.controlPapel(),
    );

    const pintar = async () => {
      let estado;
      try {
        estado = await this.api('/api/estado-sistema');
      } catch (err) {
        tarjetas.replaceChildren(el('p', { class: 'nota' }, `No se pudo leer el estado: ${err.message}`));
        return;
      }
      if (tarjetas.isConnected) tarjetas.replaceChildren(...this.tarjetasEstado(estado));
    };
    await pintar();
    clearInterval(this.relojEstado);
    this.relojEstado = setInterval(() => {
      if (!tarjetas.isConnected) clearInterval(this.relojEstado);
      else pintar();
    }, 5000);
  }

  tarjetasEstado(e) {
    const cfg = this.borrador;
    const tarjeta = (nivel, titulo, ...detalle) => el('div', { class: `estado-tarjeta ${nivel}` },
      el('span', { class: 'estado-icono', 'aria-hidden': 'true' }, { ok: '✅', aviso: '⚠️', mal: '❌', info: 'ℹ️' }[nivel]),
      el('div', {}, el('strong', {}, titulo), el('p', {}, ...detalle)));
    const lista = [];

    // cámara
    lista.push(this.camara.demo
      ? tarjeta('mal', 'Cámara', 'No se encontró cámara: se usa la de demostración. Revisa la pestaña Cámara.')
      : tarjeta('ok', 'Cámara', `${this.camara.nombre} · ${this.camara.ancho}×${this.camara.alto}`));

    // impresora
    if (!cfg.impresion.habilitada) lista.push(tarjeta('info', 'Impresora', 'La impresión está apagada.'));
    else if (!e.impresora) lista.push(tarjeta('aviso', 'Impresora', 'No hay una impresora predeterminada en Windows. Elige tu impresora de fotos como predeterminada.'));
    else {
      const i = e.impresora;
      lista.push(tarjeta(i.problema ? 'mal' : 'ok', 'Impresora',
        `${i.nombre} · ${i.estado}${i.trabajos ? ` · ${i.trabajos} en cola` : ''}`));
    }

    // papel
    if (!cfg.impresion.controlarPapel) {
      lista.push(tarjeta('info', 'Papel', 'Sin cuenta de papel. Actívala en Impresión y QR para recibir avisos.'));
    } else {
      const r = e.papel.restante;
      lista.push(tarjeta(r <= 0 ? 'mal' : r <= cfg.impresion.avisoPapel ? 'aviso' : 'ok', 'Papel',
        r <= 0 ? 'Se acabó el papel: la cabina no ofrece imprimir hasta que cargues más.' : `Quedan ${r} hojas${e.papel.cargado ? ` de ${e.papel.cargado}` : ''}.`));
    }

    // QR por internet mientras el programa está abierto
    const tunel = {
      activo: ['ok', 'Enlace activo y comprobado desde internet.'],
      verificando: ['aviso', 'Comprobando el enlace nuevo… mientras tanto el QR usa el Wi-Fi.'],
      conectando: ['aviso', 'Abriendo el enlace por internet…'],
      reconectando: ['aviso', e.tunel.detalle || 'Sin internet; reintentando. Mientras tanto el QR usa el Wi-Fi.'],
      apagado: ['info', 'Apagado: el QR sólo funciona en el Wi-Fi del evento.'],
      'falta-programa': ['mal', 'Falta cloudflared.exe en la carpeta "herramientas".'],
      error: ['mal', e.tunel.detalle || 'No se pudo abrir el enlace.'],
    }[e.tunel.estado] || ['aviso', 'Estado desconocido.'];
    lista.push(tarjeta(tunel[0], 'QR por internet (en vivo)', tunel[1]));

    // fotos guardadas en internet
    const n = e.nube;
    if (!n.activa) {
      lista.push(tarjeta('aviso', 'Fotos en internet',
        'No se están guardando: los QR dejan de funcionar al cerrar el programa. Configura Cloudinary en Impresión y QR.'));
    } else {
      const partes = [`${n.guardadas} guardadas`];
      if (n.pendientes) partes.push(`${n.pendientes} pendientes${n.subiendo ? ' (subiendo…)' : ''}`);
      if (n.sinSubir) partes.push(`${n.sinSubir} sólo en esta computadora`);
      lista.push(tarjeta(n.conError ? 'aviso' : 'ok', 'Fotos en internet (QR permanentes)',
        partes.join(' · '), n.ultimoError ? el('br') : null, n.ultimoError ? `Último problema: ${n.ultimoError}` : null));
    }

    // disco
    if (e.disco) {
      const gb = e.disco.libre / 1024 ** 3;
      lista.push(tarjeta(gb < 2 ? 'mal' : gb < 10 ? 'aviso' : 'ok', 'Espacio en disco',
        `${gb.toFixed(1)} GB libres${gb < 10 ? ' · libera espacio o exporta y borra eventos viejos' : ''}`));
    }

    lista.push(tarjeta('info', 'Sesiones', `${e.sesiones.evento} en este evento · ${e.sesiones.total} en total`));
    return lista;
  }

  /** Cargar papel: se escribe cuántas hojas se pusieron en la impresora. */
  controlPapel() {
    const entrada = el('input', { type: 'number', min: 0, max: 100000, step: 1, placeholder: 'Ej. 400', 'aria-label': 'Hojas cargadas', style: 'max-width:140px' });
    const nota = el('span', { class: 'nota' });
    this.api('/api/papel').then((p) => { nota.textContent = `Quedan ${p.restante} hojas`; }).catch(() => {});
    return el('div', { class: 'fila-botones' }, entrada,
      el('button', {
        class: 'boton-secundario',
        type: 'button',
        onclick: async () => {
          if (entrada.value === '') return this.acciones.aviso?.('Escribe cuántas hojas cargaste');
          try {
            const papel = await this.api('/api/papel', { method: 'PUT', json: { restante: Number(entrada.value) } });
            nota.textContent = `Quedan ${papel.restante} hojas`;
            entrada.value = '';
            this.acciones.alCambiarPapel?.(papel);
            this.acciones.aviso?.(`🧻 Papel cargado: ${papel.restante} hojas`);
          } catch (err) {
            this.acciones.aviso?.(err.message);
          }
        },
      }, '🧻 Cargué papel'),
      nota);
  }

  async renovarTunel() {
    try {
      await this.api('/api/tunel/reiniciar', { method: 'POST', json: {} });
      this.acciones.aviso?.('🔄 Abriendo un enlace nuevo por internet (tarda unos segundos)');
    } catch (err) {
      this.acciones.aviso?.(err.message);
    }
  }

  async exportarEvento() {
    this.acciones.aviso?.('📦 Preparando el ZIP del evento…', 20000);
    try {
      const r = await this.api('/api/exportar', { method: 'POST', json: {} });
      this.acciones.aviso?.(`📦 Listo: ${r.archivo} (${r.sesiones} sesiones, ${(r.bytes / 1024 ** 2).toFixed(0)} MB). Se abrió la carpeta.`, 9000);
    } catch (err) {
      this.acciones.aviso?.(`No se pudo exportar: ${err.message}`, 7000);
    }
  }

  /** Prueba real de Cloudinary: sube una imagen, revisa que se vea desde internet y la borra. */
  campoProbarNube() {
    const salida = el('div', { class: 'nota resultado-prueba' });
    const boton = el('button', {
      class: 'boton-secundario boton-prueba-nube',
      type: 'button',
      onclick: async () => {
        if (this.modoWeb) return this.acciones.probarNube?.(this.borrador);
        boton.disabled = true;
        salida.replaceChildren('☁️ Probando: se sube una imagen de prueba…');
        try {
          const r = await this.api('/api/nube/probar', { method: 'POST', json: this.borrador.compartir.nube });
          const lineas = r.ok
            ? ['✅ Todo listo: las fotos se suben y se ven desde cualquier celular.',
              r.listaActiva
                ? '✅ La galería de todo el evento también funciona.'
                : 'ℹ️ Para la galería de todo el evento falta el paso 4 (Resource list). Lo demás ya funciona.',
              this.borrador.compartir.nube.activo ? '' : '⚠️ Activa "Guardar cada sesión en internet" y pulsa Guardar.']
            : [`❌ ${r.error}`];
          salida.replaceChildren(...lineas.filter(Boolean).flatMap((l, i) => (i ? [el('br'), l] : [l])));
        } catch (err) {
          salida.replaceChildren(`❌ ${err.message}`);
        } finally {
          boton.disabled = false;
        }
      },
    }, '☁️ Probar la conexión con la nube');
    return el('div', { class: 'campo' }, el('label', {}, 'Prueba'), el('div', {}, boton, salida));
  }

  /** Todo lo que dice la cabina, editable sin tocar el código. */
  mostrarTextos() {
    const c = this.contenido;
    c.append(
      el('p', { class: 'nota' },
        'Cambia cualquier texto que ven los invitados. Si dejas un campo vacío vuelve el texto original. ',
        'Lo que va entre llaves se reemplaza solo: ', el('code', {}, '{n}'), ', ', el('code', {}, '{total}'), ', ',
        el('code', {}, '{segundos}'), ', ', el('code', {}, '{ancho}'), ', ', el('code', {}, '{alto}'), ', ',
        el('code', {}, '{evento}'), ' y ', el('code', {}, '{marca}'), '.'),
      el('div', { class: 'fila-botones' },
        el('button', {
          class: 'boton-secundario',
          type: 'button',
          onclick: () => {
            if (!confirm('¿Devolver todos los textos a como venían?')) return;
            this.borrador.textos = {};
            this.mostrar('textos');
          },
        }, '↺ Restaurar todos los textos')),
    );

    for (const grupo of GRUPOS_TEXTOS) {
      c.append(el('h3', {}, grupo.titulo));
      for (const [clave, etiqueta, porDefecto] of grupo.claves) {
        const id = `texto-${clave}`;
        c.append(el('div', { class: 'campo' },
          el('label', { for: id }, etiqueta),
          el('input', {
            type: 'text', id, value: this.borrador.textos?.[clave] ?? '', placeholder: porDefecto, maxlength: 300,
            oninput: (e) => {
              this.borrador.textos = this.borrador.textos || {};
              const valor = e.target.value.trim();
              if (valor) this.borrador.textos[clave] = valor;
              else delete this.borrador.textos[clave];
            },
          })));
      }
    }
  }

  /** "Mis diseños": tiras y postales hechas en Photoshop/Canva. */
  mostrarDisenos() {
    this.editorDisenos ??= new EditorDisenos({
      contenedor: this.contenido,
      api: this.api,
      aviso: (texto) => this.acciones.aviso?.(texto),
      enUso: () => this.borrador.plantillas.habilitadas,
      alCambiar: (cambio) => this.alCambiarDisenos(cambio),
    });
    this.editorDisenos.mostrarLista();
  }

  /** Al guardar o quitar un diseño se actualizan las plantillas del evento y se guardan los ajustes. */
  async alCambiarDisenos({ id, usarEnEvento = false, eliminado = false }) {
    const p = this.borrador.plantillas;
    if (eliminado) {
      p.habilitadas = p.habilitadas.filter((x) => x !== id);
      if (!p.habilitadas.length) p.habilitadas = ['tira-4'];
      if (!p.habilitadas.includes(p.porDefecto)) p.porDefecto = p.habilitadas[0];
    } else if (usarEnEvento) {
      p.habilitadas = [id];
      p.porDefecto = id;
    } else if (!p.habilitadas.includes(id)) {
      p.habilitadas = [...p.habilitadas, id];
    }
    const guardada = await this.api('/api/config', { method: 'PUT', json: this.borrador });
    this.borrador = structuredClone(guardada);
    await this.acciones.alActualizar?.(guardada);
  }

  /** Editor visual de plantillas: evita configurar el diseño a ciegas. */
  async mostrarEditorPlantillas() {
    const config = this.borrador;
    const bloque = el('div', { class: 'editor-plantillas' });
    bloque.append(
      el('h3', {}, 'Editor visual de plantillas'),
      el('p', { class: 'nota' }, 'Activa las plantillas que verá el invitado y marca una como predeterminada. La vista previa usa el diseño y los colores actuales.'),
    );
    const zona = el('div', { class: 'editor-plantillas-cuerpo' });
    const vista = el('div', { class: 'editor-plantillas-vista' });
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Vista previa de la plantilla');
    vista.append(canvas);
    const lista = el('div', { class: 'editor-plantillas-lista' });
    zona.append(vista, lista);
    bloque.append(zona);
    this.contenido.append(bloque);

    const [logo, fondo] = await Promise.all([
      cargarImagen(config.marca.logo),
      cargarImagen(config.plantillas.fondoImagen),
    ]);
    const recursos = { logo, fondo };
    const muestras = [0, 1, 2, 3].map(fotoDeMuestra);
    const actualizarVista = () => {
      const plantilla = plantillaPorId(config.plantillas.porDefecto);
      componer(canvas, plantilla, muestras, { config, recursos, escala: 0.24 });
    };
    const renderLista = () => {
      lista.replaceChildren(...todasLasPlantillas().map((p) => {
        const activa = config.plantillas.habilitadas.includes(p.id);
        const predeterminada = config.plantillas.porDefecto === p.id;
        const tarjeta = el('div', {
          class: `editor-plantilla ${activa ? 'activa' : ''} ${predeterminada ? 'predeterminada' : ''}`,
          role: 'button', tabindex: '0',
          title: activa ? 'Desactivar plantilla' : 'Activar plantilla',
        });
        const mini = componer(document.createElement('canvas'), p, muestras, { config, recursos, escala: 0.065 });
        const texto = el('span', { class: 'editor-plantilla-texto' },
          el('strong', {}, p.nombre),
          el('small', {}, p.descripcion),
          el('em', {}, predeterminada ? '✓ Predeterminada' : (activa ? 'Activa' : 'Desactivada')));
        const interruptor = el('label', { class: 'editor-plantilla-toggle', title: activa ? 'Desactivar' : 'Activar' });
        const check = el('input', { type: 'checkbox', checked: activa });
        interruptor.append(check, el('span'));
        tarjeta.append(mini, texto, interruptor);
        const alternar = () => {
          if (activa && config.plantillas.habilitadas.length === 1) {
            this.acciones.aviso?.('Debe quedar al menos una plantilla activa');
            return;
          }
          if (activa) {
            config.plantillas.habilitadas = config.plantillas.habilitadas.filter((id) => id !== p.id);
            if (predeterminada) config.plantillas.porDefecto = config.plantillas.habilitadas[0];
          } else {
            config.plantillas.habilitadas = [...config.plantillas.habilitadas, p.id];
          }
          renderLista();
          actualizarVista();
        };
        check.addEventListener('click', (e) => { e.stopPropagation(); alternar(); });
        tarjeta.addEventListener('click', (e) => {
          if (e.target === check || e.target.closest('.editor-plantilla-toggle')) return;
          if (!config.plantillas.habilitadas.includes(p.id)) config.plantillas.habilitadas.push(p.id);
          config.plantillas.porDefecto = p.id;
          renderLista();
          actualizarVista();
        });
        tarjeta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tarjeta.click(); }
        });
        return tarjeta;
      }));
      const nota = el('p', { class: 'nota editor-plantillas-ayuda' }, 'Haz doble clic en una miniatura para establecerla como predeterminada.');
      lista.append(nota);
    };
    renderLista();
    actualizarVista();
  }

  crearCampo(campo) {
    if (campo.h) return el('h3', {}, campo.h);
    if (campo.tipo === 'probar-nube') return this.campoProbarNube();
    if (campo.tipo === 'papel') {
      if (this.modoWeb) return el('span');
      return el('div', { class: 'campo' }, el('label', {}, 'Hojas cargadas'), this.controlPapel(),
        el('p', { class: 'ayuda' }, 'Cada vez que cambies el rollo o la bandeja, escribe cuántas hojas pusiste. Las tiras de 5×15 cm salen dos por hoja.'));
    }
    if (campo.tipo === 'ayuda-nube') {
      return el('p', { class: 'nota' },
        'Para que los QR funcionen ', el('strong', {}, 'siempre'),
        ' (también días después y con la computadora apagada), cada sesión se guarda en ',
        el('strong', {}, 'Cloudinary'), ' (plan gratuito). El QR sale al instante y las fotos se suben solas; ',
        'si no hay internet en el evento, se suben en cuanto vuelva. Una sola vez:',
        el('br'), '1. Crea tu cuenta en cloudinary.com y copia tu ', el('code', {}, 'Cloud name'), ' (aparece en el panel).',
        el('br'), '2. En Settings → Upload → Upload presets → Add upload preset, pon Signing Mode en ',
        el('code', {}, 'Unsigned'), ', guarda y copia su nombre.',
        el('br'), '3. Pega los dos datos aquí abajo, activa la opción y pulsa "Probar la conexión".',
        el('br'), '4. (Opcional, para la galería de todo el evento) En Settings → Security → "Restricted media types" desmarca ',
        el('code', {}, 'Resource list'), ' y guarda.',
        el('br'), 'Ninguno de los dos es una clave secreta. Las fotos quedan en internet: ',
        'cualquiera con el enlace de una sesión puede verla, pero nadie puede ver la lista de todas.');
    }
    if (campo.tipo === 'tunel') {
      const estado = this.red?.tunel?.estado;
      const mensajes = {
        activo: ['✅ Activo y comprobado desde internet. Los QR funcionan con datos móviles y desde cualquier Wi-Fi:', this.red?.urlPublica],
        conectando: ['⏳ Abriendo el enlace por internet… (tarda unos segundos al abrir el programa)'],
        verificando: ['⏳ Comprobando desde internet que el enlace funcione… Mientras tanto el QR usa el Wi-Fi del evento.'],
        reconectando: ['⏳ Sin conexión a internet; reintentando. Mientras tanto el QR usa el Wi-Fi del evento.'],
        'falta-programa': ['⚠️ Falta el programa cloudflared.exe en la carpeta "herramientas". Mientras tanto el QR sólo funciona en el Wi-Fi del evento.'],
        apagado: ['Apagado: el QR sólo funciona en el Wi-Fi del evento.'],
        error: ['⚠️ No se pudo abrir el enlace por internet:', this.red?.tunel?.detalle],
      };
      const [texto, extra] = mensajes[estado] || ['Estado desconocido (el servidor no respondió).'];
      return el('div', { class: 'campo' }, el('label', {}, 'Estado del enlace'), el('div', {},
        el('p', { class: 'nota', style: 'margin-top:0' }, texto, extra ? el('br') : null, extra ? el('code', {}, extra) : null),
        this.modoWeb || estado === 'apagado' || estado === 'falta-programa'
          ? null
          : el('div', { class: 'fila-botones' }, el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.renovarTunel() }, '🔄 Renovar enlace'))));
    }
    if (campo.tipo === 'red') {
      const ips = this.red?.ips?.length ? this.red.ips.join(', ') : 'sin conexión de red';
      return el('p', { class: 'nota' },
        'Dirección detectada: ', el('code', {}, this.red?.urlBase || '—'), el('br'),
        `IPs de esta computadora: ${ips}. La primera vez, Windows preguntará si Node.js puede usar la red: acepta “Redes privadas”.`);
    }

    const id = `campo-${(campo.ruta || campo.accion).replace(/\./g, '-')}`;
    const valor = campo.ruta ? leer(this.borrador, campo.ruta) : undefined;
    const guardar = (v) => escribir(this.borrador, campo.ruta, v);
    let control;

    switch (campo.tipo) {
      case 'texto':
        control = el('input', {
          type: 'text', id, value: valor ?? '', pattern: campo.patron,
          placeholder: campo.marcador === 'red' ? (this.red?.urlBase || '') : '',
          inputmode: campo.patron ? 'numeric' : undefined,
          oninput: (e) => guardar(e.target.value),
        });
        break;
      case 'numero':
        control = el('input', {
          type: 'number', id, value: valor, min: campo.min, max: campo.max, step: campo.paso || 1,
          oninput: (e) => {
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n)) guardar(Math.min(campo.max ?? n, Math.max(campo.min ?? n, n)));
          },
        });
        break;
      case 'fecha':
        control = el('input', { type: 'date', id, value: valor || '', oninput: (e) => guardar(e.target.value) });
        break;
      case 'color':
        control = el('input', { type: 'color', id, value: valor, oninput: (e) => guardar(e.target.value) });
        break;
      case 'bool':
        control = el('label', { class: 'interruptor' },
          el('input', { type: 'checkbox', id, checked: !!valor, onchange: (e) => guardar(e.target.checked) }),
          el('span'));
        break;
      case 'select':
        control = el('select', { id, onchange: (e) => guardar(campo.numero ? Number(e.target.value) : e.target.value) },
          opcionesDe(campo).map(([v, t]) => el('option', { value: v, selected: String(valor) === String(v) }, t)));
        break;
      case 'camara': {
        const opciones = [['', 'Automática: la conectada por USB y, si no hay, la de la computadora'], ...this.camaras.map((c) => [c.id, c.nombre])];
        control = el('div', { class: 'fila-botones' },
          el('select', { id, onchange: (e) => guardar(e.target.value) },
            opciones.map(([v, t]) => el('option', { value: v, selected: valor === v }, t))),
          el('span', { class: 'nota' }, `En uso ahora: ${this.camara.demo ? '⚠️ ' : '📷 '}${this.camara.nombre}`));
        break;
      }
      case 'multi': {
        const lista = new Set(valor);
        const opciones = opcionesDe(campo);
        control = el('div', { class: 'lista-marcas', id },
          opciones.map(([v, t]) => el('label', {},
            el('input', {
              type: 'checkbox', checked: lista.has(v),
              onchange: (e) => {
                if (e.target.checked) lista.add(v);
                else lista.delete(v);
                guardar(opciones.map(([x]) => x).filter((x) => lista.has(x)));
              },
            }), t)));
        break;
      }
      case 'emojis':
        control = el('input', {
          type: 'text', id, value: (valor || []).join(' '),
          oninput: (e) => guardar([...new Set(e.target.value.split(/\s+/).filter(Boolean))].slice(0, 60)),
        });
        break;
      case 'lineas':
        control = el('textarea', { id, oninput: (e) => guardar(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)) });
        control.value = (valor || []).join('\n');
        break;
      case 'recurso': {
        const vista = el('img', { class: 'recurso-vista', alt: '', src: valor || undefined, hidden: !valor });
        const archivo = el('input', {
          type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true,
          onchange: async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            try {
              const r = await this.api(`/api/recursos/${campo.recurso}`, { method: 'PUT', body: f, headers: { 'Content-Type': f.type } });
              guardar(r.url);
              vista.src = r.url;
              vista.hidden = false;
            } catch (err) {
              this.acciones.aviso?.(err.message);
            }
          },
        });
        control = el('div', { class: 'fila-botones' }, vista, archivo,
          el('button', { class: 'boton-secundario', type: 'button', onclick: () => archivo.click() }, 'Elegir imagen…'),
          el('button', {
            class: 'boton-secundario', type: 'button',
            onclick: async () => {
              await this.api(`/api/recursos/${campo.recurso}`, { method: 'DELETE' }).catch(() => {});
              guardar('');
              vista.hidden = true;
            },
          }, 'Quitar'));
        break;
      }
      case 'accion':
        control = el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.acciones[campo.accion]?.(this.borrador) }, campo.boton);
        break;
      default:
        control = el('span');
    }

    return el('div', { class: 'campo' },
      el('label', { for: id }, campo.etiqueta),
      control,
      campo.ayuda ? el('p', { class: 'ayuda' }, campo.ayuda) : null);
  }

  async mostrarGaleria(todos = false) {
    const c = this.contenido;
    c.replaceChildren();
    if (this.modoWeb) {
      c.append(el('h3', {}, 'Galería'),
        el('p', { class: 'nota' },
          'En la versión web no hay galería: las fotos no se guardan en ninguna computadora. ',
          'Cada invitado descarga su recuerdo al terminar, y si activas la subida a internet también recibe su código QR.'));
      return;
    }
    c.append(el('h3', {}, 'Estadísticas'));
    const cajaEstad = el('div', { class: 'estadisticas' });
    c.append(cajaEstad);
    c.append(el('div', { class: 'fila-botones', style: 'margin:16px 0' },
      el('button', { class: 'boton-secundario', onclick: () => this.api('/api/abrir-carpeta', { method: 'POST' }) }, '📂 Abrir carpeta de fotos del evento'),
      el('button', { class: 'boton-secundario', onclick: () => this.exportarEvento() }, '📦 Exportar evento (ZIP)'),
      el('select', {
        class: 'selector-evento',
        'aria-label': 'Sesiones a mostrar',
        onchange: (e) => this.mostrarGaleria(e.target.value === 'todos'),
      },
      el('option', { value: 'evento', selected: !todos }, 'Sólo este evento'),
      el('option', { value: 'todos', selected: todos }, 'Todos los eventos'))));
    // fotos guardadas en internet: QR que funcionan siempre
    const cajaNube = el('div', { class: 'nota' });
    c.append(cajaNube);
    this.pintarEstadoNube(cajaNube);

    c.append(el('h3', {}, todos ? 'Sesiones de todos los eventos' : `Sesiones de “${this.borrador.evento.nombre}”`));
    c.append(el('p', { class: 'nota' }, 'Toca una sesión para verla en grande con su código QR, para que el invitado la descargue en su celular. ☁️ = guardada en internet (su QR funciona siempre) · ⏳ = subiendo.'));
    const galeria = el('div', { class: 'galeria' });
    c.append(galeria);

    try {
      const [estad, sesiones] = await Promise.all([
        this.api('/api/estadisticas'),
        this.api(`/api/sesiones?limite=${todos ? 300 : 120}${todos ? '&evento=todos' : ''}`),
      ]);
      const numero = (n, t) => el('div', {}, el('strong', {}, String(n)), el('span', {}, t));
      cajaEstad.append(
        numero(estad.evento, 'sesiones en este evento'),
        numero(estad.impresionesEvento, 'impresiones en este evento'),
        numero(estad.total, 'sesiones en total'),
        numero(estad.impresiones, 'impresiones en total'));

      if (!sesiones.length) galeria.append(el('p', { class: 'nota' }, todos ? 'Todavía no hay sesiones.' : 'Todavía no hay sesiones en este evento.'));
      for (const s of sesiones) {
        const esImagen = /\.(jpg|gif|png)$/.test(s.principal);
        const fecha = new Date(s.fecha);
        const hora = todos
          ? fecha.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const abrir = () => this.verSesion(s);
        const figura = el('figure', { title: s.evento },
          el('button', { class: 'galeria-vista', type: 'button', onclick: abrir, 'aria-label': 'Ver sesión y código QR' },
            s.miniatura || esImagen
              ? el('img', { src: `/m/${s.id}/${s.miniatura ? 'miniatura.jpg' : s.principal}`, alt: '', loading: 'lazy', decoding: 'async' })
              : el('div', { class: 'sin-vista' }, '🎬')),
          el('figcaption', {},
            el('span', {}, `${s.nube === 'guardada' ? '☁️ ' : s.nube === 'pendiente' ? '⏳ ' : ''}${hora} · ${s.modo}${s.impresiones ? ` · 🖨️${s.impresiones}` : ''}`),
            el('button', { onclick: abrir }, '📱 QR'),
            s.archivos.includes('recuerdo.jpg')
              ? el('button', { onclick: () => this.acciones.reimprimir?.(s) }, 'Imprimir')
              : null,
            el('button', {
              onclick: async () => {
                if (!confirm('¿Mover esta sesión a la papelera? (queda en la carpeta datos/papelera)')) return;
                await this.api(`/api/sesiones/${s.id}`, { method: 'DELETE' });
                figura.remove();
              },
            }, 'Quitar')));
        galeria.append(figura);
      }
    } catch (err) {
      galeria.append(el('p', { class: 'nota' }, `No se pudo cargar la galería: ${err.message}`));
    }
  }

  /** Resumen de las fotos guardadas en internet y botón para subir las sesiones anteriores. */
  async pintarEstadoNube(caja) {
    let estado;
    try {
      estado = await this.api('/api/nube/estado');
    } catch {
      return;
    }
    if (!estado.activa) {
      caja.replaceChildren(
        '💡 Para que los QR de la galería funcionen siempre (aunque la computadora esté apagada), ',
        'activa "Guardar las fotos en internet" en la pestaña Impresión y QR.');
      return;
    }
    const partes = [`☁️ ${estado.guardadas} guardadas en internet`];
    if (estado.pendientes) partes.push(`⏳ ${estado.pendientes} pendientes${estado.subiendo ? " (subiendo…)" : ""}`);
    if (estado.sinSubir) partes.push(`${estado.sinSubir} sólo en esta computadora`);
    let bloqueEvento = null;
    if (estado.enlaceEvento) {
      const qr = el('div', { class: 'qr-mini', role: 'img', 'aria-label': 'Código QR de la galería del evento' });
      qr.innerHTML = qrSvg(estado.enlaceEvento, { nivel: 'M', margen: 2 });
      bloqueEvento = el('div', { class: 'galeria-evento' }, qr,
        el('div', {},
          el('strong', {}, '📸 Galería de todo el evento'),
          el('p', {}, estado.listaActiva === false
            ? 'Falta activar "Resource list" en Cloudinary (paso 4 en Impresión y QR) para que esta galería muestre las fotos.'
            : 'Compártela con el cliente al terminar: muestra todas las fotos guardadas en internet de este evento.'),
          el('code', { class: 'visor-url' }, estado.enlaceEvento),
          el('div', { class: 'fila-botones' },
            el('button', {
              class: 'boton-secundario',
              type: 'button',
              onclick: async () => {
                try {
                  await navigator.clipboard.writeText(estado.enlaceEvento);
                  this.acciones.aviso?.('📋 Enlace copiado');
                } catch {
                  this.acciones.aviso?.('No se pudo copiar; selecciónalo y cópialo a mano');
                }
              },
            }, '📋 Copiar enlace'))));
    }
    caja.replaceChildren(
      el('strong', {}, partes.join(' · ')),
      estado.ultimoError ? el('span', {}, el('br'), `⚠️ Último problema al subir: ${estado.ultimoError}`) : null,
      estado.conError
        ? el('div', { class: 'fila-botones', style: 'margin-top:10px' },
          el('button', {
            class: 'boton-secundario',
            type: 'button',
            onclick: async () => {
              await this.api('/api/nube/reintentar', { method: 'POST', json: {} }).catch(() => {});
              this.acciones.aviso?.('☁️ Reintentando las subidas pendientes');
              setTimeout(() => this.pintarEstadoNube(caja), 4000);
            },
          }, '🔁 Reintentar ahora'))
        : null,
      bloqueEvento,
      estado.sinSubir
        ? el('div', { class: 'fila-botones', style: 'margin-top:10px' },
          el('button', {
            class: 'boton-primario',
            type: 'button',
            onclick: async () => {
              try {
                const r = await this.api('/api/nube/subir-anteriores', { method: 'POST', json: {} });
                this.acciones.aviso?.(`☁️ Guardando en internet ${r.encoladas} sesiones. Sigue usando la cabina; se suben solas.`);
                this.pintarEstadoNube(caja);
              } catch (err) {
                this.acciones.aviso?.(err.message);
              }
            },
          }, `☁️ Guardar en internet las ${estado.sinSubir} sesiones anteriores`))
        : null);
  }

  /** Muestra una sesión ya tomada en grande, con su código QR para descargarla otra vez. */
  async verSesion(s) {
    this.raiz.querySelector('.visor-sesion')?.remove();
    // 1) guardada en internet: enlace permanente (funciona siempre)
    // 2) si no: el enlace de internet vigente AHORA (se consulta de nuevo, nunca uno viejo)
    // 3) si no hay: el del Wi-Fi del evento
    let red = this.red;
    try {
      red = await this.api('/api/red');
      this.red = red;
    } catch { /* se usa el último conocido */ }
    const permanente = Boolean(s.enlace);
    const porInternet = permanente || Boolean(red?.urlPublica);
    const url = permanente ? s.enlace : `${red?.urlPublica || red?.urlBase || location.origin}/g/${s.id}`;
    const archivo = `/m/${s.id}/${s.principal}`;
    const medio = /\.(mp4|webm)$/.test(s.principal)
      ? el('video', { src: archivo, autoplay: true, loop: true, muted: true, playsinline: true, controls: true })
      : el('img', { src: archivo, alt: 'Sesión de fotos' });
    const qr = el('div', { class: 'visor-qr', role: 'img', 'aria-label': 'Código QR para descargar' });
    qr.innerHTML = qrSvg(url, { nivel: 'M' });
    const fecha = new Date(s.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    const fotos = s.archivos.filter((a) => /^foto-\d+\.jpg$/.test(a)).length;
    const detalle = [s.evento, fecha, s.modo, fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : '']
      .filter(Boolean).join(' · ');

    const cerrar = () => visor.remove();
    const visor = el('div', {
      class: 'visor-sesion',
      tabindex: '-1',
      onclick: (e) => { if (e.target === visor) cerrar(); },
      onkeydown: (e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation(); // sólo cierra el visor, no los ajustes
        cerrar();
      },
    },
    el('div', { class: 'visor-caja' },
      el('div', { class: 'visor-medio' }, medio),
      el('aside', { class: 'visor-panel' },
        el('h3', {}, 'Escanea para descargar'),
        qr,
        el('p', { class: 'nota' }, permanente
          ? '☁️ Guardada en internet: este código funciona siempre, con datos móviles o cualquier Wi-Fi, aunque la computadora esté apagada.'
          : porInternet
            ? 'Abre la cámara del celular y apunta al código. Funciona con datos móviles mientras esta aplicación esté abierta.'
            : 'Abre la cámara del celular y apunta al código. El celular debe estar en el mismo Wi-Fi que esta computadora.'),
        el('code', { class: 'visor-url' }, url),
        el('p', { class: 'nota' }, detalle),
        el('div', { class: 'fila-botones' },
          s.archivos.includes('recuerdo.jpg')
            ? el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.acciones.reimprimir?.(s) }, '🖨️ Imprimir otra vez')
            : null,
          el('button', { class: 'boton-primario', type: 'button', onclick: cerrar }, 'Cerrar')))));
    this.raiz.append(visor);
    visor.focus();
  }

  mostrarAyuda() {
    const p = (...h) => el('p', { class: 'nota' }, ...h);
    const code = (t) => el('code', {}, t);
    this.contenido.append(
      el('h3', {}, 'Uso en el evento'),
      p('Abre la cabina con ', code('Iniciar Sonria PJs.bat'), '. Se abre a pantalla completa y la impresión sale directo, sin preguntar.'),
      p('Para entrar a los ajustes: toca el engrane casi invisible de la esquina superior derecha del inicio, o presiona ', code('Ctrl + Shift + A'), '.'),
      p('Para salir de la pantalla completa presiona ', code('Alt + F4'), '.'),
      p('Un botón o pedal USB que envíe la tecla ', code('Espacio'), ' o ', code('Enter'), ' sirve para comenzar la sesión.'),
      el('h3', {}, 'Impresora'),
      p('Pon tu impresora de fotos como predeterminada en Windows, con papel 10×15 cm (4×6") y sin bordes. Las tiras de 5×15 cm salen dos por hoja: corta por la mitad (muchas impresoras de sublimación lo hacen solas con la opción “2 inch cut”).'),
      el('h3', {}, 'Código QR'),
      p('Si esta computadora tiene internet, los invitados descargan sus fotos con sus datos móviles o desde cualquier Wi-Fi: la cabina abre sola un enlace seguro de Cloudflare (revisa su estado en Impresión y QR). Sin internet, el QR funciona sólo para quienes estén en el mismo Wi-Fi que esta computadora.'),
      p('Para que los QR funcionen SIEMPRE (días después y con la computadora apagada), activa "Guardar las fotos en internet" (Cloudinary, gratis). Si no hay internet en el evento, las fotos se suben solas cuando vuelva; mientras tanto el celular muestra "Tus fotos se están subiendo".'),
      el('h3', {}, 'Antes de cada evento'),
      p('Abre la pestaña ', code('Estado'), ': todo debe estar en ✅. Carga el papel (🧻), imprime la página de prueba y escanea un QR de prueba con datos móviles.'),
      p('Al terminar, ', code('📦 Exportar evento (ZIP)'), ' arma un archivo ordenado (impresiones, GIF, videos y fotos) para entregarlo al cliente.'),
      el('h3', {}, 'Cámara profesional'),
      p('Canon (EOS Webcam Utility), Nikon (Webcam Utility), Sony (Imaging Edge Webcam) y Fujifilm (X Webcam) permiten usar tu cámara como webcam. Instala la utilidad, conecta la cámara por USB y elígela en la pestaña Cámara.'),
      el('h3', {}, 'Dónde quedan las fotos'),
      p('En la carpeta ', code('datos\\fotos\\<nombre-del-evento>'), ' junto al programa. Cada sesión tiene su propia carpeta con la impresión, las fotos individuales, el GIF o el video.'),
    );
  }

  async guardar() {
    const b = this.borrador;
    const modos = Object.values(b.modos).filter(Boolean).length;
    if (!modos) return this.acciones.aviso?.('Activa al menos un modo');
    if (!b.plantillas.habilitadas.length) return this.acciones.aviso?.('Elige al menos una plantilla');
    if (!b.filtros.habilitados.length) b.filtros.habilitados = ['normal'];
    if (!b.plantillas.habilitadas.includes(b.plantillas.porDefecto)) b.plantillas.porDefecto = b.plantillas.habilitadas[0];
    if (!b.filtros.habilitados.includes(b.filtros.porDefecto)) b.filtros.porDefecto = b.filtros.habilitados[0];
    b.impresion.copiasPorDefecto = Math.min(b.impresion.copiasPorDefecto, b.impresion.copiasMaximas);
    b.general.pin = String(b.general.pin || '').replace(/\D/g, '').slice(0, 8);
    try {
      const guardada = await this.api('/api/config', { method: 'PUT', json: b });
      this.raiz.hidden = true;
      this.contenido.replaceChildren();
      await this.acciones.alGuardar?.(guardada);
    } catch (err) {
      this.acciones.aviso?.(`No se pudo guardar: ${err.message}`);
    }
  }
}
