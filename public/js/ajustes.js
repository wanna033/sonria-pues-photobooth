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
      { h: 'Descarga con código QR' },
      { ruta: 'compartir.qr', tipo: 'bool', etiqueta: 'Mostrar código QR' },
      { ruta: 'compartir.urlBase', tipo: 'texto', etiqueta: 'Dirección para el QR', ayuda: 'Déjala vacía para detectarla sola. Se usa cuando el QR funciona sólo en la red del evento.', marcador: 'red' },
      { tipo: 'red' },
      { h: 'Descarga con datos móviles o desde otro Wi-Fi' },
      { tipo: 'ayuda-nube' },
      { ruta: 'compartir.nube.activo', tipo: 'bool', etiqueta: 'Subir cada sesión a internet', ayuda: 'Si no hay internet en el evento, el QR vuelve solo a la red local.' },
      { ruta: 'compartir.nube.cloudName', tipo: 'texto', etiqueta: 'Cloud name de Cloudinary', ayuda: 'Aparece arriba en el panel de Cloudinary. No es una clave secreta.' },
      { ruta: 'compartir.nube.preset', tipo: 'texto', etiqueta: 'Upload preset (Unsigned)', ayuda: 'El nombre del preset sin firmar que creaste en Cloudinary.' },
      { ruta: 'compartir.nube.urlGaleria', tipo: 'texto', etiqueta: 'Dirección de tu página de descarga', ayuda: 'Por ejemplo https://tuusuario.github.io/sonria-pues/g. Si la dejas vacía, el QR abre la foto directamente.' },
      { ruta: 'compartir.nube.subirFotosSueltas', tipo: 'bool', etiqueta: 'Subir también las fotos individuales', ayuda: 'Apagado sube sólo la tira, el GIF y el video: más rápido y códigos QR más sencillos.' },
      { tipo: 'accion', etiqueta: 'Prueba', boton: '☁️ Probar la conexión con la nube', accion: 'probarNube' },
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
    this.mostrar('evento');
  }

  cerrar() {
    this.editorDisenos?.salir();
    this.raiz.querySelector('.visor-sesion')?.remove();
    this.raiz.hidden = true;
    this.contenido.replaceChildren();
    this.acciones.alCerrar?.();
  }

  mostrar(id) {
    const seccion = SECCIONES.find((s) => s.id === id);
    for (const b of this.pestanas.children) b.classList.toggle('activa', b.dataset.seccion === id);
    this.editorDisenos?.salir();
    this.raiz.querySelector('.visor-sesion')?.remove();
    this.contenido.replaceChildren();
    this.contenido.scrollTop = 0;
    if (seccion.especial === 'textos') return this.mostrarTextos();
    if (seccion.especial === 'disenos') return this.mostrarDisenos();
    if (seccion.especial === 'galeria') return this.mostrarGaleria();
    if (seccion.especial === 'ayuda') return this.mostrarAyuda();
    for (const campo of seccion.campos) this.contenido.append(this.crearCampo(campo));
    if (id === 'diseno') this.mostrarEditorPlantillas();
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
    if (campo.tipo === 'ayuda-nube') {
      return el('p', { class: 'nota' },
        'Para que el QR se abra con datos móviles, la cabina sube cada sesión a ',
        el('strong', {}, 'Cloudinary'), ' (plan gratuito). Una sola vez: ',
        el('br'), '1. Crea tu cuenta en cloudinary.com y copia tu ', el('code', {}, 'Cloud name'), '.',
        el('br'), '2. En Settings → Upload → Upload presets, crea uno con Signing Mode en ',
        el('code', {}, 'Unsigned'), ' y copia su nombre.',
        el('br'), '3. Pega los dos datos aquí abajo y pulsa "Probar la conexión".',
        el('br'), 'Ninguno de los dos es una clave secreta. Ten en cuenta que las fotos quedan en internet: ',
        'cualquiera con el enlace puede verlas.');
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
      el('select', {
        class: 'selector-evento',
        'aria-label': 'Sesiones a mostrar',
        onchange: (e) => this.mostrarGaleria(e.target.value === 'todos'),
      },
      el('option', { value: 'evento', selected: !todos }, 'Sólo este evento'),
      el('option', { value: 'todos', selected: todos }, 'Todos los eventos'))));
    c.append(el('h3', {}, todos ? 'Sesiones de todos los eventos' : `Sesiones de “${this.borrador.evento.nombre}”`));
    c.append(el('p', { class: 'nota' }, 'Toca una sesión para verla en grande con su código QR, para que el invitado la descargue en su celular.'));
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
            esImagen
              ? el('img', { src: `/m/${s.id}/${s.principal}`, alt: '', loading: 'lazy' })
              : el('div', { class: 'sin-vista' }, '🎬')),
          el('figcaption', {},
            el('span', {}, `${hora} · ${s.modo}${s.impresiones ? ` · 🖨️${s.impresiones}` : ''}`),
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

  /** Muestra una sesión ya tomada en grande, con su código QR para descargarla otra vez. */
  verSesion(s) {
    this.raiz.querySelector('.visor-sesion')?.remove();
    const url = `${this.red?.urlBase || location.origin}/g/${s.id}`;
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
        el('p', { class: 'nota' }, 'Abre la cámara del celular y apunta al código. El celular debe estar en el mismo Wi-Fi que esta computadora.'),
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
      p('Los invitados descargan sus fotos desde su celular conectados al mismo Wi-Fi que esta computadora. Si no hay Wi-Fi en el lugar, crea uno con un router portátil o con la “Zona con cobertura inalámbrica móvil” de Windows.'),
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
