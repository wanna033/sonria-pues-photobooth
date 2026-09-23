/*
 * Sonría PJs — flujo principal de la cabina.
 *
 * inicio → modo → plantilla → filtro → captura → revisión → stickers → procesando → final
 * (cada paso se omite si no aplica o si sólo hay una opción)
 */

import { Camara } from './camara.js';
import { FILTROS, filtroPorId } from './filtros.js';
import {
  PLANTILLAS, plantillaPorId, buscarPlantilla, registrarPersonalizadas, componer, cargarImagen, fotoDeMuestra,
  dibujarMarcaDeAgua, dibujarCubriendo, dibujarStickers, tamanoDePlantilla, tamanoImpresion, todasLasPlantillas,
} from './plantillas.js';
import { crearGif } from './gif.js';
import { qrSvg, generarQR } from './qr.js';
import { configurarSonidos, pitido, obturador, exito, hablar } from './sonidos.js';
import { EditorStickers } from './stickers.js';
import { Ajustes } from './ajustes.js';
import { configurarTextos, pintarTextosFijos, t } from './textos.js';
import { nubeActiva, subirSesion as subirSesionANube, probarNube } from './nube.js';
import { detectarModoWeb, apiWeb } from './web.js';

const $ = (selector) => document.querySelector(selector);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const CANCELADO = Symbol('cancelado');

// el nombre y la descripción de cada modo se editan en Ajustes → Textos
const MODOS = {
  foto: { icono: '📸', clave: 'modoFoto' },
  gif: { icono: '✨', clave: 'modoGif' },
  boomerang: { icono: '🔁', clave: 'modoBoomerang' },
  video: { icono: '🎬', clave: 'modoVideo' },
};

const estado = {
  config: null,
  recursos: { logo: null, fondo: null },
  pantalla: '',
  historial: [],
  token: 0,
  modo: 'foto',
  plantilla: null,
  filtro: 'normal',
  fotos: [],
  vistas: [],
  compuesto: null,
  resultado: null,
  sesion: null,
  copias: 1,
  impreso: false,
  ultimaActividad: Date.now(),
  finHasta: 0,
  urls: [],
  detenerVideo: null,
  papel: null, // hojas que quedan en la impresora (si se lleva la cuenta)
};

const camara = new Camara();
let editor;
let ajustes;

// ================================================================ utilidades

/** En la versión web (sin servidor) las llamadas se atienden en el navegador. */
let MODO_WEB = false;

async function api(ruta, { method = 'GET', json, body, headers } = {}) {
  if (MODO_WEB) return apiWeb(ruta, { method, json, body });
  const res = await fetch(ruta, {
    method,
    headers: json ? { 'Content-Type': 'application/json' } : headers,
    body: json ? JSON.stringify(json) : body,
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

function aviso(texto, ms = 3500) {
  const caja = $('#aviso-flotante');
  caja.textContent = texto;
  caja.hidden = false;
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => { caja.hidden = true; }, ms);
}

function urlDe(blob) {
  const url = URL.createObjectURL(blob);
  estado.urls.push(url);
  return url;
}

function lienzoABlob(lienzo, tipo = 'image/jpeg', calidad = 0.92) {
  return new Promise((resolve, reject) => {
    lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), tipo, calidad);
  });
}

function reducir(fuente, anchoMax) {
  const w = Math.min(anchoMax, fuente.width);
  const h = Math.round((fuente.height * w) / fuente.width);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(fuente, 0, 0, w, h);
  return c;
}

function revisarToken(token) {
  if (token !== estado.token) throw CANCELADO;
}

async function pausa(ms, token) {
  await esperar(ms);
  revisarToken(token);
}

const modosHabilitados = () => Object.keys(MODOS).filter((m) => estado.config.modos[m]);
const plantillasHabilitadas = () => {
  const lista = estado.config.plantillas.habilitadas.map(buscarPlantilla)
    .filter((p, i, a) => p && a.indexOf(p) === i);
  return lista.length ? lista : [plantillaPorId(estado.config.plantillas.porDefecto)];
};
const filtrosHabilitados = () => FILTROS.filter((f) => estado.config.filtros.habilitados.includes(f.id));
const filtroCss = () => filtroPorId(estado.filtro).css;

// ================================================================ configuración y marca

async function aplicarConfig() {
  const { marca, evento, captura } = estado.config;
  const raiz = document.documentElement.style;
  raiz.setProperty('--primario', marca.colorPrimario);
  raiz.setProperty('--secundario', marca.colorSecundario);
  raiz.setProperty('--fondo', marca.colorFondo);
  document.documentElement.dataset.tema = marca.tema === 'oscuro' ? 'oscuro' : 'claro';
  configurarTextos(estado.config.textos);
  pintarTextosFijos();
  document.title = marca.nombre || 'Sonría Pues';
  $('.marca-nombre').textContent = marca.nombre;
  $('.evento-nombre').textContent = evento.nombre;
  $('.marca-eslogan').textContent = marca.eslogan;

  const [logo, logoClaro, fondo] = await Promise.all([
    cargarImagen(marca.logo),
    cargarImagen(marca.logoClaro),
    cargarImagen(estado.config.plantillas.fondoImagen),
    cargarDisenos(),
  ]);
  estado.recursos = { logo, logoClaro, fondo };

  // en el inicio: la versión del logo que contrasta con el tema
  const oscuro = marca.tema === 'oscuro';
  const logoInicio = oscuro && logoClaro ? marca.logoClaro : marca.logo;
  const imgLogo = $('.marca-logo');
  imgLogo.hidden = !logo;
  if (logo) {
    imgLogo.src = logoInicio;
    imgLogo.alt = marca.nombre;
  }
  // si el logotipo ya trae el nombre, no se repite en texto
  const ocultarNombre = Boolean(logo) && !marca.mostrarNombre;
  $('.marca-nombre').hidden = ocultarNombre;
  $('.inicio-texto').classList.toggle('logo-grande', ocultarNombre);

  configurarSonidos({ sonidos: captura.sonidos, voz: captura.voz });
  document.querySelectorAll('.video-vivo').forEach((v) => v.classList.toggle('espejo', captura.espejoVistaPrevia));
}

/** Carga los diseños propios ("Mis diseños") para usarlos como plantillas. */
async function cargarDisenos() {
  let lista = [];
  try {
    lista = await api('/api/disenos');
  } catch (err) {
    console.error('No se pudieron cargar los diseños', err);
  }
  const cargados = await Promise.all(lista.map(async (meta) => ({ meta, imagen: await cargarImagen(meta.url) })));
  registrarPersonalizadas(cargados.filter((d) => d.imagen));
}

async function iniciarCamara() {
  const { demo, error } = await camara.iniciar(estado.config.captura);
  const avisoCamara = $('#aviso-camara');
  avisoCamara.hidden = !demo;
  if (demo) {
    const motivo = error?.name === 'NotAllowedError' ? 'permiso denegado'
      : error?.name === 'NotReadableError' ? 'la cámara está en uso por otro programa'
        : 'no se encontró ninguna cámara';
    avisoCamara.textContent = `⚠️ Cámara de demostración (${motivo}). Revisa la cámara en Ajustes.`;
  }
  for (const video of document.querySelectorAll('video.video-vivo')) camara.conectar(video);

  // se reporta al servidor para poder diagnosticar (queda en la ventana del servidor)
  const camaras = (await camara.listar()).map((c) => c.nombre);
  api('/api/camara', {
    method: 'POST',
    json: {
      demo,
      nombre: camara.nombre,
      resolucion: `${camara.ancho}x${camara.alto}`,
      error: error ? `${error.name}: ${error.message}` : '',
      camaras,
    },
  }).catch(() => {});
}

/**
 * Cámaras que se conectan o desconectan durante el evento: en modo automático
 * (o si se perdió la cámara elegida) se vuelve a elegir la mejor disponible.
 * Nunca a media sesión: si hay alguien posando, se espera a volver al inicio.
 */
let revisarCamaraPendiente = () => {};

function vigilarCamaras() {
  let pendiente = false;
  let temporizador;
  const revisar = async () => {
    if (estado.pantalla !== 'inicio' || ajustes?.abierto) {
      pendiente = true;
      return;
    }
    pendiente = false;
    const antes = camara.nombre;
    await iniciarCamara();
    if (camara.nombre !== antes) aviso(`📷 Usando: ${camara.nombre}`);
  };
  const programar = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(revisar, 1500);
  };
  navigator.mediaDevices?.addEventListener?.('devicechange', () => {
    const elegida = estado.config.captura.camaraId;
    if (!elegida || camara.demo || camara.idActual !== elegida) programar();
  });
  camara.alPerder = programar;
  revisarCamaraPendiente = () => { if (pendiente) programar(); };
}

// ================================================================ navegación

function mostrarPantalla(nombre) {
  document.querySelectorAll('.pantalla').forEach((p) => p.classList.toggle('activa', p.dataset.pantalla === nombre));
  estado.pantalla = nombre;
  estado.ultimaActividad = Date.now();
  animacionProcesando(nombre === 'procesando');
}

/** Mientras se crea el recuerdo se repite la animación de la marca (o la ruedita si está desactivada). */
function animacionProcesando(activa) {
  const video = $('#video-procesando');
  const conVideo = Boolean(estado.config?.marca.animacionCarga) && !video.dataset.fallo;
  video.hidden = !conVideo;
  $('#anillo-procesando').hidden = conVideo;
  if (activa && conVideo) {
    video.currentTime = 0;
    video.play().catch(() => {});
  } else {
    video.pause();
  }
}

/**
 * Animación de carga al abrir el programa: se muestra mientras arranca la
 * cámara y se oculta cuando terminan las dos cosas (el video y el arranque).
 */
function iniciarAnimacionCarga() {
  const capa = $('#carga');
  const video = $('#video-carga');
  let terminarVideo;
  const videoTerminado = new Promise((resolve) => { terminarVideo = resolve; });
  video.addEventListener('ended', terminarVideo, { once: true });
  video.addEventListener('error', terminarVideo, { once: true });
  setTimeout(terminarVideo, 8000); // por si el video no avanza

  const reproducir = async (conSonido) => {
    video.muted = !conSonido;
    try {
      await video.play();
    } catch {
      if (conSonido) return reproducir(false);
      terminarVideo();
    }
  };

  return {
    /** Arranca con la configuración ya leída (si está desactivada, sólo espera el arranque). */
    empezar(config) {
      if (!config.marca.animacionCarga) {
        terminarVideo();
        return;
      }
      reproducir(Boolean(config.captura.sonidos));
    },
    async ocultar() {
      await videoTerminado;
      capa.classList.add('oculta');
      setTimeout(() => {
        video.pause();
        video.removeAttribute('src'); // libera el video de memoria
        video.load();
      }, 800);
    },
  };
}

function ir(nombre) {
  if (estado.pantalla && estado.pantalla !== nombre) estado.historial.push(estado.pantalla);
  mostrarPantalla(nombre);
}

function atras() {
  const anterior = estado.historial.pop();
  if (!anterior || anterior === 'inicio') return reiniciar();
  mostrarPantalla(anterior);
}

function liberarSesion() {
  estado.urls.forEach((u) => URL.revokeObjectURL(u));
  Object.assign(estado, {
    urls: [], fotos: [], vistas: [], compuesto: null, resultado: null, sesion: null, impreso: false,
  });
}

function reiniciar() {
  estado.token++;
  estado.detenerVideo?.();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  liberarSesion();
  estado.historial = [];
  $('#final-resultado').replaceChildren();
  $('#area-impresion').replaceChildren();
  mostrarPantalla('inicio');
  cargarRecientes();
  revisarCamaraPendiente();
}

// ================================================================ inicio

const POSICIONES_POLAROID = [
  { l: 6, t: 4, r: -7 }, { l: 46, t: 0, r: 5 }, { l: 20, t: 34, r: 3 },
  { l: 56, t: 38, r: -4 }, { l: 2, t: 62, r: 6 }, { l: 38, t: 66, r: -3 },
];

async function cargarRecientes() {
  const contenedor = $('#recientes');
  const contenido = $('.inicio-contenido');
  if (!estado.config.general.mostrarRecientes) {
    contenido.classList.add('sin-recientes');
    return;
  }
  let lista = [];
  try {
    lista = (await api('/api/sesiones?limite=12')).filter((s) => s.miniatura || /\.(jpg|gif)$/.test(s.principal)).slice(0, 6);
  } catch { /* sin servidor: se omite */ }
  contenido.classList.toggle('sin-recientes', lista.length === 0);
  contenedor.replaceChildren(...lista.reverse().map((s, i) => {
    const pos = POSICIONES_POLAROID[(lista.length - 1 - i) % POSICIONES_POLAROID.length];
    const div = document.createElement('div');
    div.className = 'polaroid';
    div.style.left = `${pos.l}%`;
    div.style.top = `${pos.t}%`;
    div.style.transform = `rotate(${pos.r}deg)`;
    const img = document.createElement('img');
    img.src = s.miniatura ? `/m/${s.id}/miniatura.jpg` : `/m/${s.id}/${s.principal}`;
    img.alt = '';
    img.decoding = 'async';
    div.appendChild(img);
    return div;
  }));
}

function comenzar() {
  if (estado.pantalla !== 'inicio' || ajustes.abierto) return;
  pitido(660, 0.08, 0.12);
  liberarSesion();
  const modos = modosHabilitados();
  if (modos.length === 1) return elegirModo(modos[0]);
  const opciones = $('#opciones-modo');
  opciones.replaceChildren(...modos.map((m) => {
    const b = document.createElement('button');
    b.className = 'tarjeta-modo';
    b.innerHTML = `<span class="icono">${MODOS[m].icono}</span><strong>${t(MODOS[m].clave)}</strong><span>${t(`${MODOS[m].clave}Detalle`)}</span>`;
    b.addEventListener('click', () => elegirModo(m));
    return b;
  }));
  ir('modo');
}

function elegirModo(modo) {
  estado.modo = modo;
  if (modo === 'foto') {
    const plantillas = plantillasHabilitadas();
    if (plantillas.length > 1) return mostrarPlantillas(plantillas);
    estado.plantilla = plantillas[0] || plantillaPorId(estado.config.plantillas.porDefecto);
  }
  pasoFiltro();
}

// ================================================================ plantillas

function mostrarPlantillas(plantillas) {
  const contenedor = $('#opciones-plantilla');
  const muestras = [0, 1, 2, 3].map(fotoDeMuestra);
  const vertical = innerHeight > innerWidth;
  const columnas = vertical ? 2 : (plantillas.length <= 4 ? plantillas.length : Math.ceil(plantillas.length / 2));
  const filas = Math.ceil(plantillas.length / columnas);
  contenedor.style.setProperty('--columnas', columnas);
  contenedor.style.setProperty('--alto-miniatura', `${filas === 1 ? 45 : filas === 2 ? 24 : 16}vh`);
  contenedor.replaceChildren(...plantillas.map((p, i) => {
    const b = document.createElement('button');
    b.className = 'tarjeta-plantilla';
    b.style.animationDelay = `${i * 0.05}s`;
    const lienzo = componer(document.createElement('canvas'), p, muestras, {
      config: estado.config, recursos: estado.recursos, escala: 0.22,
    });
    const nombre = document.createElement('strong');
    nombre.textContent = p.nombre;
    const detalle = document.createElement('span');
    detalle.textContent = p.descripcion;
    b.append(lienzo, nombre, detalle);
    b.addEventListener('click', () => {
      estado.plantilla = p;
      pasoFiltro();
    });
    return b;
  }));
  ir('plantilla');
}

// ================================================================ filtros

function pasoFiltro() {
  const filtros = filtrosHabilitados();
  const preferido = estado.config.filtros.porDefecto;
  estado.filtro = filtros.some((f) => f.id === preferido) ? preferido : (filtros[0]?.id || 'normal');
  if (!estado.config.filtros.mostrarSelector || filtros.length < 2) return iniciarCaptura();

  const principal = $('#video-filtro');
  camara.conectar(principal);
  principal.style.filter = filtroCss();

  const contenedor = $('#opciones-filtro');
  contenedor.replaceChildren(...filtros.map((f) => {
    const b = document.createElement('button');
    b.className = 'tarjeta-filtro';
    b.classList.toggle('elegida', f.id === estado.filtro);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.className = 'video-vivo';
    video.classList.toggle('espejo', estado.config.captura.espejoVistaPrevia);
    video.style.filter = f.css;
    camara.conectar(video);
    const nombre = document.createElement('span');
    nombre.textContent = f.nombre;
    b.append(video, nombre);
    b.addEventListener('click', () => {
      estado.filtro = f.id;
      principal.style.filter = f.css;
      contenedor.querySelectorAll('.tarjeta-filtro').forEach((x) => x.classList.toggle('elegida', x === b));
    });
    return b;
  }));
  ir('filtro');
}

function soltarVideosFiltro() {
  $('#opciones-filtro').querySelectorAll('video').forEach((v) => { v.srcObject = null; });
}

// ================================================================ captura

function indicador(texto) {
  $('#captura-indicador').textContent = texto;
}

function mensaje(texto) {
  const caja = $('#mensaje-captura');
  caja.replaceChildren();
  if (texto) {
    const span = document.createElement('span');
    span.textContent = texto;
    caja.appendChild(span);
  }
}

function pintarMiniaturas(total, actual) {
  const contenedor = $('#miniaturas');
  contenedor.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'casilla';
    if (estado.vistas[i]) {
      d.classList.add('llena');
      d.style.backgroundImage = `url(${estado.vistas[i]})`;
    }
    if (i === actual) d.classList.add('actual');
    return d;
  }));
}

async function cuentaRegresiva(segundos, token) {
  const caja = $('#cuenta');
  for (let s = segundos; s >= 1; s--) {
    revisarToken(token);
    const span = document.createElement('span');
    span.textContent = s;
    caja.replaceChildren(span);
    pitido(s === 1 ? 1175 : 880, 0.14);
    await pausa(1000, token);
  }
  caja.replaceChildren();
}

function destello() {
  obturador();
  if (!estado.config.captura.flash) return;
  const flash = $('#flash');
  flash.classList.remove('disparo');
  void flash.offsetWidth; // reinicia la animación
  flash.classList.add('disparo');
}

async function capturarFotos(indices, total, token) {
  const { captura } = estado.config;
  const video = $('#video-principal');
  video.style.filter = filtroCss();
  camara.conectar(video);

  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    indicador(total > 1 ? t('capturaContador', { n: i + 1, total }) : t('capturaUnaFoto'));
    pintarMiniaturas(total > 1 ? total : 0, i);

    if (k === 0) {
      mensaje(t('capturaPreparense'));
      hablar(t('vozPreparense'));
      await pausa(1400, token);
      mensaje('');
    }
    await cuentaRegresiva(k === 0 ? captura.cuentaPrimera : captura.cuentaRegresiva, token);
    mensaje(t('capturaSonrian'));
    hablar(t('vozSonrian'));
    await pausa(350, token);

    const foto = camara.capturar({ filtroCss: filtroCss(), espejo: captura.espejoFotos });
    destello();
    mensaje('');
    estado.fotos[i] = foto;
    estado.vistas[i] = urlDe(await lienzoABlob(reducir(foto, 640), 'image/jpeg', 0.8));

    const vista = $('#vista-disparo');
    vista.src = estado.vistas[i];
    vista.classList.add('visible');
    pintarMiniaturas(total > 1 ? total : 0, -1);
    await pausa(Math.max(1200, captura.pausaEntreFotos * 1000), token);
    vista.classList.remove('visible');
    await pausa(250, token);
  }
  indicador('');
}

async function iniciarCaptura() {
  soltarVideosFiltro();
  ir('captura');
  $('#grabando').hidden = true;
  const token = ++estado.token;
  try {
    if (estado.modo === 'foto' || estado.modo === 'gif') {
      const total = estado.modo === 'foto' ? estado.plantilla.fotos : estado.config.gif.fotos;
      estado.fotos = new Array(total).fill(null);
      estado.vistas = new Array(total).fill(null);
      await capturarFotos([...Array(total).keys()], total, token);
      if (estado.config.captura.permitirRepetir) mostrarRevision();
      else await continuarTrasFotos();
    } else if (estado.modo === 'boomerang') {
      await capturarBoomerang(token);
    } else {
      await capturarVideo(token);
    }
  } catch (err) {
    if (err === CANCELADO) return;
    console.error(err);
    aviso(`Algo salió mal: ${err.message}`, 6000);
    reiniciar();
  }
}

// ---------------------------------------------------------------- boomerang

async function capturarBoomerang(token) {
  const { boomerang, captura } = estado.config;
  const video = $('#video-principal');
  video.style.filter = filtroCss();
  camara.conectar(video);
  pintarMiniaturas(0, -1);
  indicador(t('capturaBoomerang'));
  mensaje(t('capturaBoomerangAviso'));
  hablar(t('vozBoomerang'));
  await pausa(1800, token);
  mensaje('');
  await cuentaRegresiva(captura.cuentaPrimera, token);

  const w = Number(boomerang.ancho) || 640;
  const h = Math.round((w * camara.alto) / camara.ancho / 2) * 2;
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  const total = Math.round(boomerang.segundos * boomerang.fps);
  const intervalo = 1000 / boomerang.fps;
  const cuadros = [];

  $('#grabando').hidden = false;
  $('#btn-detener-video').hidden = true;
  pitido(1175, 0.2);
  const inicio = performance.now();
  for (let n = 0; n < total; n++) {
    revisarToken(token);
    const restante = Math.max(0, boomerang.segundos - (performance.now() - inicio) / 1000);
    $('#grabando-tiempo').textContent = `${restante.toFixed(1)} s`;
    camara.dibujar(ctx, w, h, { filtroCss: filtroCss(), espejo: captura.espejoFotos });
    dibujarMarcaDeAgua(ctx, w, h, estado.config);
    cuadros.push(ctx.getImageData(0, 0, w, h));
    const siguiente = inicio + (n + 1) * intervalo;
    await esperar(Math.max(0, siguiente - performance.now()));
  }
  $('#grabando').hidden = true;
  destello();
  revisarToken(token);

  ir('procesando');
  progreso(t('procesandoBoomerang'), 0);
  const secuencia = cuadros.concat(cuadros.slice(1, -1).reverse());
  const gif = await crearGif(secuencia, {
    retrasoMs: intervalo,
    alProgreso: (f) => progreso(t('procesandoBoomerang'), f * 0.8),
  });
  revisarToken(token);
  await guardarSesion([['boomerang.gif', gif], ['miniatura.jpg', await miniaturaDe(lienzo)]], 'boomerang.gif', token);
  estado.resultado = { tipo: 'imagen', url: urlDe(gif) };
  mostrarFinal();
}

// ---------------------------------------------------------------- video

function tipoDeVideo() {
  const tipos = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return tipos.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}

async function capturarVideo(token) {
  const { video: ajustesVideo, captura } = estado.config;
  const vivo = $('#video-principal');
  vivo.style.filter = filtroCss();
  camara.conectar(vivo);
  pintarMiniaturas(0, -1);
  indicador(t('capturaVideo'));
  mensaje(t('capturaVideoAviso'));
  hablar(t('vozVideo'));
  await pausa(1800, token);
  mensaje('');
  await cuentaRegresiva(captura.cuentaPrimera, token);

  const w = Math.min(1280, camara.ancho);
  const h = Math.round((w * camara.alto) / camara.ancho / 2) * 2;
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  const pintar = () => {
    camara.dibujar(ctx, w, h, { filtroCss: filtroCss(), espejo: captura.espejoFotos });
    dibujarMarcaDeAgua(ctx, w, h, estado.config);
  };
  pintar();
  const dibujo = setInterval(pintar, 1000 / 30);

  const flujo = lienzo.captureStream(30);
  const audio = ajustesVideo.conAudio ? await camara.obtenerAudio() : null;
  audio?.getAudioTracks().forEach((t) => flujo.addTrack(t));

  const tipo = tipoDeVideo();
  const grabadora = new MediaRecorder(flujo, { ...(tipo ? { mimeType: tipo } : {}), videoBitsPerSecond: 6_000_000 });
  const partes = [];
  grabadora.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
  const terminado = new Promise((resolve) => { grabadora.onstop = resolve; });

  let reloj;
  const detener = () => {
    clearInterval(reloj);
    if (grabadora.state !== 'inactive') grabadora.stop();
  };
  estado.detenerVideo = detener;

  grabadora.start(500);
  pitido(1175, 0.2);
  $('#grabando').hidden = false;
  $('#btn-detener-video').hidden = false;
  const inicio = Date.now();
  const actualizar = () => {
    const restante = Math.max(0, ajustesVideo.segundos - (Date.now() - inicio) / 1000);
    $('#grabando-tiempo').textContent = `0:${String(Math.ceil(restante)).padStart(2, '0')}`;
    if (restante <= 0) detener();
  };
  actualizar();
  reloj = setInterval(actualizar, 250);

  await terminado;
  clearInterval(dibujo);
  audio?.getTracks().forEach((t) => t.stop());
  estado.detenerVideo = null;
  $('#grabando').hidden = true;
  revisarToken(token);

  ir('procesando');
  progreso(t('procesandoVideo'), 0.2);
  const mime = (grabadora.mimeType || tipo || 'video/webm').split(';')[0];
  const blob = new Blob(partes, { type: mime });
  const nombre = mime.includes('mp4') ? 'video.mp4' : 'video.webm';
  await guardarSesion([[nombre, blob], ['miniatura.jpg', await miniaturaDe(lienzo)]], nombre, token);
  estado.resultado = { tipo: 'video', url: urlDe(blob) };
  mostrarFinal();
}

// ================================================================ revisión

function mostrarRevision() {
  const contenedor = $('#revision-fotos');
  contenedor.replaceChildren(...estado.vistas.map((url, i) => {
    const b = document.createElement('button');
    b.className = 'foto-revision';
    b.style.animationDelay = `${i * 0.06}s`;
    b.innerHTML = `<img src="${url}" alt="Foto ${i + 1}"><span class="numero">${i + 1}</span>`;
    b.addEventListener('click', () => repetir([i]));
    return b;
  }));
  ir('revision');
}

async function repetir(indices) {
  mostrarPantalla('captura');
  const token = ++estado.token;
  try {
    await capturarFotos(indices, estado.fotos.length, token);
    estado.historial.pop();
    mostrarRevision();
  } catch (err) {
    if (err !== CANCELADO) {
      console.error(err);
      reiniciar();
    }
  }
}

async function continuarTrasFotos() {
  const token = estado.token;
  if (estado.modo === 'gif') return finalizarGif(token);

  estado.compuesto = componer(document.createElement('canvas'), estado.plantilla, estado.fotos, {
    config: estado.config, recursos: estado.recursos,
  });
  if (estado.config.stickers.habilitados) {
    editor.preparar(estado.compuesto, estado.config.stickers.frases, estado.config.stickers.emojis);
    ir('stickers');
    return;
  }
  return finalizarFoto([], token);
}

// ================================================================ procesamiento y guardado

function progreso(texto, fraccion) {
  $('#procesando-texto').textContent = texto;
  $('#procesando-barra').style.width = `${Math.round(Math.min(1, fraccion) * 100)}%`;
}

async function gifDeFotos(fotos, alProgreso) {
  const w = Number(estado.config.gif.ancho) || 720;
  const h = Math.round((w * fotos[0].height) / fotos[0].width / 2) * 2;
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  const cuadros = fotos.map((f) => {
    dibujarCubriendo(ctx, f, 0, 0, w, h, 0.5);
    dibujarMarcaDeAgua(ctx, w, h, estado.config);
    return ctx.getImageData(0, 0, w, h);
  });
  return crearGif(cuadros, { retrasoMs: estado.config.gif.retrasoMs, alProgreso });
}

async function fotosIndividuales() {
  const archivos = [];
  for (const [i, f] of estado.fotos.entries()) {
    archivos.push([`foto-${i + 1}.jpg`, await lienzoABlob(f, 'image/jpeg', 0.9)]);
  }
  return archivos;
}

/** Vista chica (480 px en su lado largo) para la galería y el inicio: cargan mucho más rápido. */
function miniaturaDe(fuente) {
  const escala = Math.min(1, 480 / Math.max(fuente.width, fuente.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(fuente.width * escala));
  c.height = Math.max(1, Math.round(fuente.height * escala));
  c.getContext('2d').drawImage(fuente, 0, 0, c.width, c.height);
  return lienzoABlob(c, 'image/jpeg', 0.8);
}

function crearSesion(principal) {
  return api('/api/sesiones', {
    method: 'POST',
    json: { modo: estado.modo, plantilla: estado.plantilla?.id, filtro: estado.filtro, principal },
  });
}

/**
 * @param {Array<[string, Blob]>} archivos
 * @param {object} [creada] sesión ya creada antes (cuando el QR va impreso en la foto)
 */
async function guardarSesion(archivos, principal, token, creada = null) {
  try {
    progreso($('#procesando-texto').textContent, 0.85);
    const sesion = creada || await crearSesion(principal);
    for (const [n, [nombre, blob]] of archivos.entries()) {
      revisarToken(token);
      await api(`/api/sesiones/${sesion.id}/${nombre}`, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } });
      progreso($('#procesando-texto').textContent, 0.85 + (0.15 * (n + 1)) / archivos.length);
    }
    // "publica": el enlace sale por internet (funciona con datos móviles)
    estado.sesion = { ...sesion, enInternet: Boolean(sesion.publica) };
  } catch (err) {
    if (err === CANCELADO) throw err;
    console.error(err);
    aviso('No se pudo guardar en la computadora. Revisa que el servidor esté abierto.', 6000);
  }
  await compartirEnInternet(archivos, token);
}

/**
 * Sube la sesión a la nube para que el QR se pueda abrir con datos móviles o
 * desde otro Wi-Fi. Si no hay internet o falla, el QR sigue sirviendo en la red
 * local del evento.
 */
async function compartirEnInternet(archivos, token) {
  if (!nubeActiva(estado.config)) return;

  // En la computadora la subida la hace el servidor (en segundo plano y con
  // reintentos): aquí sólo se pide el enlace permanente, que ya sirve para el QR.
  if (!MODO_WEB) {
    if (!estado.sesion?.id) return;
    try {
      const r = await api(`/api/sesiones/${estado.sesion.id}/listo`, { method: 'POST', json: {} });
      if (r.permanente && r.url) estado.sesion = { ...estado.sesion, url: r.url, enInternet: true, permanente: true };
    } catch (err) {
      console.error('No se pudo preparar el enlace permanente', err);
    }
    return;
  }

  // Versión web (sin servidor): se sube desde el navegador y se espera
  const texto = t('procesandoSubiendo');
  try {
    progreso(texto, 0.05);
    const { enlace } = await subirSesionANube(estado.config, archivos, (f) => progreso(texto, 0.05 + f * 0.9));
    revisarToken(token);
    estado.sesion = { ...(estado.sesion || {}), url: enlace, enInternet: true };
  } catch (err) {
    if (err === CANCELADO) throw err;
    console.error('No se pudo subir a internet', err);
    aviso('Sin internet: el código QR sólo funcionará en el Wi-Fi del evento.', 6000);
  }
}

/**
 * QR impreso en la foto: con las fotos guardadas en internet, el enlace se
 * reserva ANTES de armar la impresión y se dibuja en una esquina. Así el
 * invitado puede descargar sus fotos cuando quiera, escaneando su tira.
 * @returns {Promise<object|null>} la sesión ya creada (o null)
 */
async function ponerQrEnImpresion(conGif) {
  const { impresion } = estado.config;
  if (MODO_WEB || !impresion.qrEnImpresion || !nubeActiva(estado.config)) return null;
  let sesion = null;
  try {
    sesion = await crearSesion('recuerdo.jpg');
    const planeados = ['recuerdo.jpg', ...estado.fotos.map((_, i) => `foto-${i + 1}.jpg`), ...(conGif ? ['animacion.gif'] : [])];
    const r = await api(`/api/sesiones/${sesion.id}/reservar`, { method: 'POST', json: { archivos: planeados } });
    if (r.url) {
      dibujarQrEnFoto(estado.compuesto, r.url, {
        duplicar: estado.plantilla.duplicar,
        tamano: tamanoDePlantilla(estado.plantilla),
        posicion: impresion.qrPosicion,
      });
    }
  } catch (err) {
    console.error('No se pudo poner el QR en la impresión', err);
  }
  return sesion;
}

/** Dibuja el QR (≈2 cm, con recuadro blanco) en una esquina de cada tira de la hoja. */
function dibujarQrEnFoto(lienzo, url, { duplicar, tamano, posicion = 'abajo-derecha' }) {
  const qr = generarQR(url, 'M');
  const ctx = lienzo.getContext('2d');
  const unidades = duplicar ? 2 : 1;
  const anchoUnidad = lienzo.width / unidades;
  const pxPorPulgada = lienzo.width / tamano.anchoIn;
  const lado = Math.round(Math.min(0.85 * pxPorPulgada, 0.34 * Math.min(anchoUnidad, lienzo.height)));
  const borde = Math.round(0.12 * pxPorPulgada);
  const margen = 2; // módulos blancos alrededor
  const modulo = lado / (qr.tamano + margen * 2);
  const derecha = !posicion.endsWith('izquierda');
  const abajo = !posicion.startsWith('arriba');
  for (let u = 0; u < unidades; u++) {
    const x0 = Math.round(u * anchoUnidad + (derecha ? anchoUnidad - lado - borde : borde));
    const y0 = abajo ? lienzo.height - lado - borde : borde;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x0, y0, lado, lado, lado * 0.06);
    ctx.fill();
    ctx.fillStyle = '#000000';
    for (let y = 0; y < qr.tamano; y++) {
      for (let x = 0; x < qr.tamano; x++) {
        if (!qr.oscuro(x, y)) continue;
        const px = x0 + (x + margen) * modulo;
        const py = y0 + (y + margen) * modulo;
        // se redondea hacia afuera para que no queden líneas blancas entre módulos
        ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(px + modulo) - Math.floor(px), Math.ceil(py + modulo) - Math.floor(py));
      }
    }
    ctx.restore();
  }
}

async function finalizarFoto(stickers, token) {
  ir('procesando');
  try {
    progreso(t('procesandoFoto'), 0.1);
    await esperar(50);
    if (stickers.length) {
      const { width, height } = estado.compuesto;
      dibujarStickers(estado.compuesto.getContext('2d'), stickers, width, height, estado.config);
    }
    const conGif = estado.config.gif.tambienEnModoFoto && estado.fotos.length > 1;
    const creada = await ponerQrEnImpresion(conGif);
    revisarToken(token);
    const recuerdo = await lienzoABlob(estado.compuesto, 'image/jpeg', 0.93);
    const archivos = [['recuerdo.jpg', recuerdo], ...await fotosIndividuales(), ['miniatura.jpg', await miniaturaDe(estado.compuesto)]];
    revisarToken(token);
    if (conGif) {
      progreso(t('procesandoGifExtra'), 0.3);
      archivos.push(['animacion.gif', await gifDeFotos(estado.fotos, (f) => progreso(t('procesandoGifExtra'), 0.3 + f * 0.5))]);
    }
    revisarToken(token);
    progreso(t('procesandoGuardando'), 0.85);
    await guardarSesion(archivos, 'recuerdo.jpg', token, creada);
    estado.resultado = {
      tipo: 'imagen',
      url: urlDe(recuerdo),
      imprimible: true,
      tamano: tamanoDePlantilla(estado.plantilla),
    };
    mostrarFinal();
  } catch (err) {
    if (err === CANCELADO) return;
    console.error(err);
    aviso(`Algo salió mal: ${err.message}`, 6000);
    reiniciar();
  }
}

async function finalizarGif(token) {
  ir('procesando');
  try {
    progreso(t('procesandoGif'), 0.05);
    const gif = await gifDeFotos(estado.fotos, (f) => progreso(t('procesandoGif'), 0.05 + f * 0.75));
    revisarToken(token);
    await guardarSesion([['animacion.gif', gif], ...await fotosIndividuales(), ['miniatura.jpg', await miniaturaDe(estado.fotos[0])]], 'animacion.gif', token);
    estado.resultado = { tipo: 'imagen', url: urlDe(gif) };
    mostrarFinal();
  } catch (err) {
    if (err === CANCELADO) return;
    console.error(err);
    aviso(`Algo salió mal: ${err.message}`, 6000);
    reiniciar();
  }
}

// ================================================================ pantalla final

function mostrarFinal() {
  const { config, resultado, sesion } = estado;
  const contenedor = $('#final-resultado');
  let medio;
  if (resultado.tipo === 'video') {
    medio = document.createElement('video');
    Object.assign(medio, { src: resultado.url, autoplay: true, loop: true, muted: true, playsInline: true });
  } else {
    medio = document.createElement('img');
    medio.src = resultado.url;
    medio.alt = 'Tu recuerdo';
  }
  contenedor.replaceChildren(medio);

  // en la versión web no se imprime desde la cabina: el invitado descarga su recuerdo
  const enlaceDescarga = $('#btn-descargar');
  enlaceDescarga.hidden = !MODO_WEB;
  if (MODO_WEB) {
    enlaceDescarga.href = resultado.url;
    const marcaEnArchivo = (config.marca.nombre || 'recuerdo')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // "Sonría" -> "Sonria"
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const extension = resultado.tipo === 'video' ? 'mp4' : (estado.modo === 'foto' ? 'jpg' : 'gif');
    enlaceDescarga.download = `${marcaEnArchivo}-${Date.now()}.${extension}`;
  }
  const puedeImprimir = !MODO_WEB && resultado.imprimible && config.impresion.habilitada && papelDisponible() > 0;
  $('#bloque-impresion').hidden = !puedeImprimir;
  estado.copias = Math.min(config.impresion.copiasPorDefecto, copiasMaximas());
  actualizarCopias();
  const botonImprimir = $('#btn-imprimir');
  botonImprimir.disabled = false;
  botonImprimir.lastChild.textContent = ` ${t('finalImprimir')}`;
  $('#tamano-impresion').textContent = resultado.tamano
    ? t('finalHoja', { ancho: resultado.tamano.anchoCm, alto: resultado.tamano.altoCm })
    : '';

  const mostrarQr = config.compartir.qr && sesion?.url;
  $('#bloque-qr').hidden = !mostrarQr;
  $('#qr').innerHTML = mostrarQr ? qrSvg(sesion.url, { nivel: 'M' }) : '';
  // el aviso cambia según sea un enlace de internet o de la red del evento
  $('[data-texto="finalQrAyuda"]').textContent = sesion?.permanente
    ? t('finalQrAyudaPermanente')
    : (sesion?.enInternet ? t('finalQrAyudaNube') : t('finalQrAyuda'));

  estado.finHasta = Date.now() + config.general.pantallaFinalSegundos * 1000;
  exito();
  ir('final');
  estado.historial = [];
}

/** Hojas que quedan en la impresora (Infinity si no se lleva la cuenta). */
function papelDisponible() {
  if (!estado.config.impresion.controlarPapel || !estado.papel) return Infinity;
  return estado.papel.restante;
}

function copiasMaximas() {
  return Math.max(1, Math.min(estado.config.impresion.copiasMaximas, papelDisponible()));
}

async function actualizarPapel(papel) {
  if (MODO_WEB) return;
  if (papel) estado.papel = papel;
  else {
    try {
      estado.papel = await api('/api/papel');
    } catch { /* sin servidor */ }
  }
  pintarAvisosOperador();
}

/** Aviso discreto en el inicio para quien atiende la cabina (papel por acabarse). */
function pintarAvisosOperador() {
  const caja = $('#aviso-papel');
  const quedan = papelDisponible();
  caja.hidden = !(quedan <= estado.config.impresion.avisoPapel);
  caja.textContent = quedan <= 0
    ? '🧻 Se acabó el papel. Al cargar más, actualízalo en Ajustes → Estado.'
    : `🧻 Quedan ${quedan} ${quedan === 1 ? 'hoja' : 'hojas'} de papel`;
}

/** QR con la galería de TODO el evento en una esquina del inicio (opcional). */
async function pintarQrEvento() {
  const caja = $('#qr-evento');
  caja.hidden = true;
  if (MODO_WEB || !estado.config.compartir.qrEventoEnInicio) return;
  try {
    const nube = await api('/api/nube/estado');
    if (!nube.enlaceEvento) return;
    caja.querySelector('.qr-evento-codigo').innerHTML = qrSvg(nube.enlaceEvento, { nivel: 'M', margen: 2 });
    caja.hidden = false;
  } catch { /* sin nube */ }
}

function actualizarCopias() {
  const max = copiasMaximas();
  $('#copias-numero').textContent = estado.copias;
  $('#copias-etiqueta').textContent = t(estado.copias === 1 ? 'finalCopia' : 'finalCopias');
  $('#btn-copias-menos').disabled = estado.copias <= 1 || estado.impreso;
  $('#btn-copias-mas').disabled = estado.copias >= max || estado.impreso;
}

// ================================================================ impresión

/**
 * Imprime la imagen en una hoja del tamaño exacto de la plantilla: la página
 * mide lo mismo que el diseño y la imagen la llena completa, una hoja por copia.
 * @param {{anchoIn:number, altoIn:number}} tamano
 */
async function imprimirImagen(url, tamano, copias) {
  const ancho = `${tamano.anchoIn.toFixed(3)}in`;
  const alto = `${tamano.altoIn.toFixed(3)}in`;
  $('#estilo-pagina-impresion').textContent = `@page { size: ${ancho} ${alto}; margin: 0; }`;
  const area = $('#area-impresion');
  const imagenes = [];
  const hojas = Array.from({ length: copias }, () => {
    const hoja = document.createElement('div');
    hoja.className = 'hoja-impresion';
    Object.assign(hoja.style, { width: ancho, height: alto });
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    hoja.appendChild(img);
    imagenes.push(img);
    return hoja;
  });
  area.replaceChildren(...hojas);
  await Promise.all(imagenes.map((img) => img.decode().catch(() => {})));
  window.print();
}

/** Tamaño de impresión de una sesión guardada (por su plantilla, o por la forma de la imagen). */
function tamanoDeSesion(sesion, img) {
  const id = sesion.plantilla || '';
  // las sesiones antiguas guardaban el nombre de la plantilla recortado a 40 letras
  const plantilla = buscarPlantilla(id)
    || (id.length === 40 ? todasLasPlantillas().find((p) => p.id.startsWith(id)) : null);
  if (plantilla) return tamanoDePlantilla(plantilla);
  return tamanoImpresion(img.naturalWidth, img.naturalHeight);
}

async function imprimirSesion() {
  if (estado.impreso || !estado.resultado?.imprimible) return;
  estado.impreso = true;
  const boton = $('#btn-imprimir');
  boton.disabled = true;
  actualizarCopias();
  await imprimirImagen(estado.resultado.url, estado.resultado.tamano, estado.copias);
  boton.lastChild.textContent = ` ${t('finalImprimiendo')}`;
  aviso(estado.copias === 1 ? t('avisoImprimiendoUna') : t('avisoImprimiendoVarias', { n: estado.copias }));
  hablar(t('vozImprimiendo'));
  if (estado.sesion) {
    api(`/api/sesiones/${estado.sesion.id}/impresiones`, { method: 'POST', json: { copias: estado.copias } })
      .then((r) => actualizarPapel(r.papel)).catch(() => {});
  }
  estado.finHasta = Math.max(estado.finHasta, Date.now() + 20000);
}

async function imprimirPrueba(configBorrador) {
  const config = configBorrador || estado.config;
  const plantilla = plantillaPorId(config.plantillas.porDefecto);
  const [logo, logoClaro, fondo] = await Promise.all([
    cargarImagen(config.marca.logo), cargarImagen(config.marca.logoClaro), cargarImagen(config.plantillas.fondoImagen),
  ]);
  const lienzo = componer(document.createElement('canvas'), plantilla, [0, 1, 2, 3].map(fotoDeMuestra), {
    config, recursos: { logo, logoClaro, fondo },
  });
  const url = urlDe(await lienzoABlob(lienzo));
  const tamano = tamanoDePlantilla(plantilla);
  aviso(`🖨️ Página de prueba: hoja de ${tamano.anchoCm} × ${tamano.altoCm} cm`, 6000);
  await imprimirImagen(url, tamano, 1);
}

async function reimprimir(sesion) {
  const url = `/m/${sesion.id}/recuerdo.jpg`;
  const img = await cargarImagen(url);
  if (!img) return aviso('No se encontró la imagen de esa sesión');
  await imprimirImagen(url, tamanoDeSesion(sesion, img), 1);
  api(`/api/sesiones/${sesion.id}/impresiones`, { method: 'POST', json: { copias: 1 } })
    .then((r) => actualizarPapel(r.papel)).catch(() => {});
}

// ================================================================ PIN y ajustes

function pedirPin() {
  const pin = String(estado.config.general.pin || '');
  if (!pin) return Promise.resolve(true);
  return new Promise((resolve) => {
    const modal = $('#modal-pin');
    const puntos = $('#pin-puntos');
    const teclado = $('#pin-teclado');
    let escrito = '';

    const pintar = () => {
      puntos.replaceChildren(...Array.from(escrito, () => document.createElement('span')));
    };
    const terminar = (ok) => {
      modal.hidden = true;
      document.removeEventListener('keydown', teclas, true);
      resolve(ok);
    };
    const pulsar = (tecla) => {
      if (tecla === '⌫') escrito = escrito.slice(0, -1);
      else if (/\d/.test(tecla)) escrito += tecla;
      pintar();
      if (escrito.length >= pin.length) {
        if (escrito === pin) return terminar(true);
        puntos.classList.remove('error');
        void puntos.offsetWidth;
        puntos.classList.add('error');
        escrito = '';
        setTimeout(pintar, 400);
      }
    };
    const teclas = (e) => {
      if (/^\d$/.test(e.key)) pulsar(e.key);
      else if (e.key === 'Backspace') pulsar('⌫');
      else if (e.key === 'Escape') terminar(false);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };

    teclado.replaceChildren(...['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((t) => {
      const b = document.createElement('button');
      b.textContent = t;
      if (!t) b.style.visibility = 'hidden';
      b.addEventListener('click', () => pulsar(t));
      return b;
    }));
    $('#btn-pin-cancelar').onclick = () => terminar(false);
    document.addEventListener('keydown', teclas, true);
    escrito = '';
    pintar();
    modal.hidden = false;
  });
}

async function abrirAjustes() {
  if (ajustes.abierto || estado.pantalla !== 'inicio') return;
  if (!(await pedirPin())) return;
  await ajustes.abrir(estado.config);
}

async function alGuardarAjustes(nueva) {
  const camaraAntes = JSON.stringify([estado.config.captura.camaraId, estado.config.captura.resolucion]);
  estado.config = nueva;
  await aplicarConfig();
  if (camaraAntes !== JSON.stringify([nueva.captura.camaraId, nueva.captura.resolucion]) || camara.demo) {
    await iniciarCamara();
  }
  aviso('✅ Ajustes guardados');
  reiniciar();
  actualizarPapel();
  pintarQrEvento();
}

// ================================================================ inactividad

function vigilarInactividad() {
  const marcar = () => {
    estado.ultimaActividad = Date.now();
    if (estado.pantalla === 'final') estado.finHasta = Math.max(estado.finHasta, Date.now() + 15000);
  };
  document.addEventListener('pointerdown', marcar, true);
  document.addEventListener('keydown', marcar, true);

  setInterval(() => {
    if (ajustes.abierto) return;
    const ahora = Date.now();
    if (estado.pantalla === 'final') {
      const restante = Math.ceil((estado.finHasta - ahora) / 1000);
      $('#regreso').textContent = t('finalRegreso', { segundos: Math.max(0, restante) });
      if (restante <= 0) reiniciar();
      return;
    }
    const conInteraccion = ['modo', 'plantilla', 'filtro', 'revision', 'stickers'];
    if (conInteraccion.includes(estado.pantalla)
      && ahora - estado.ultimaActividad > estado.config.general.inactividadSegundos * 1000) {
      reiniciar();
    }
  }, 1000);
}

// ================================================================ arranque

function conectarEventos() {
  $('#p-inicio').addEventListener('click', (e) => {
    if (e.target.closest('#btn-ajustes')) return;
    comenzar();
  });
  $('#btn-ajustes').addEventListener('click', (e) => {
    e.stopPropagation();
    abrirAjustes();
  });

  document.querySelectorAll('[data-accion="inicio"]').forEach((b) => b.addEventListener('click', reiniciar));
  document.querySelectorAll('[data-accion="atras"]').forEach((b) => b.addEventListener('click', () => {
    soltarVideosFiltro();
    atras();
  }));

  $('#btn-filtro-listo').addEventListener('click', iniciarCaptura);
  $('#btn-repetir-todo').addEventListener('click', () => repetir([...estado.fotos.keys()]));
  $('#btn-revision-listo').addEventListener('click', () => continuarTrasFotos());
  $('#btn-stickers-listo').addEventListener('click', () => finalizarFoto(editor.resultado(), estado.token));
  $('#btn-stickers-omitir').addEventListener('click', () => finalizarFoto([], estado.token));
  $('#btn-detener-video').addEventListener('click', () => estado.detenerVideo?.());

  $('#btn-copias-menos').addEventListener('click', () => { estado.copias = Math.max(1, estado.copias - 1); actualizarCopias(); });
  $('#btn-copias-mas').addEventListener('click', () => {
    estado.copias = Math.min(copiasMaximas(), estado.copias + 1);
    actualizarCopias();
  });
  $('#btn-imprimir').addEventListener('click', imprimirSesion);
  $('#btn-terminar').addEventListener('click', reiniciar);

  document.addEventListener('keydown', (e) => {
    if (ajustes.abierto || !$('#modal-pin').hidden) return;
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      abrirAjustes();
      return;
    }
    // botón/pedal USB: Espacio o Enter
    if (e.key === ' ' || e.key === 'Enter') {
      if (estado.pantalla === 'inicio') { e.preventDefault(); comenzar(); }
      else if (estado.pantalla === 'filtro') { e.preventDefault(); iniciarCaptura(); }
      else if (estado.pantalla === 'revision') { e.preventDefault(); continuarTrasFotos(); }
      else if (estado.pantalla === 'final') { e.preventDefault(); reiniciar(); }
    }
  });

  window.addEventListener('contextmenu', (e) => {
    if (!ajustes.abierto) e.preventDefault();
  });
}

async function arrancar() {
  const carga = iniciarAnimacionCarga();
  MODO_WEB = await detectarModoWeb();
  document.body.classList.toggle('modo-web', MODO_WEB);
  estado.config = await api('/api/config');
  carga.empezar(estado.config);
  $('#video-procesando').addEventListener('error', (e) => {
    e.target.dataset.fallo = '1';
    animacionProcesando(estado.pantalla === 'procesando');
  });
  await aplicarConfig();
  await iniciarCamara();

  editor = new EditorStickers({
    escenario: $('#stickers-escenario'),
    lienzo: $('#stickers-lienzo'),
    capa: $('#stickers-capa'),
    paleta: $('#stickers-paleta'),
    herramientas: $('#stickers-herramientas'),
  });
  ajustes = new Ajustes({
    raiz: $('#ajustes'),
    pestanas: $('#ajustes-pestanas'),
    contenido: $('#ajustes-contenido'),
    botonGuardar: $('#btn-ajustes-guardar'),
    botonCancelar: $('#btn-ajustes-cancelar'),
    api,
    camara,
    modoWeb: MODO_WEB,
    acciones: {
      alGuardar: alGuardarAjustes,
      // cambios guardados sin cerrar los ajustes (p. ej. al guardar un diseño propio)
      alActualizar: async (config) => {
        estado.config = config;
        await aplicarConfig();
      },
      alCambiarPapel: (papel) => actualizarPapel(papel),
      aviso,
      imprimirPrueba,
      reimprimir,
      probarNube: async (config) => {
        if (!nubeActiva(config)) return aviso('Primero activa la subida y escribe el cloud name y el preset');
        aviso('☁️ Probando la conexión…');
        try {
          const url = await probarNube(config);
          aviso(`✅ La nube funciona: ${url}`, 9000);
        } catch (err) {
          aviso(`❌ No se pudo subir: ${err.message}`, 9000);
        }
      },
    },
  });

  conectarEventos();
  vigilarInactividad();
  vigilarCamaras();
  mostrarPantalla('inicio');
  cargarRecientes();
  actualizarPapel();
  pintarQrEvento();
  await carga.ocultar();

  if (new URLSearchParams(location.search).has('ajustes')) abrirAjustes();
}

arrancar().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<div style="position:fixed;inset:0;display:grid;place-items:center;font:20px 'Segoe UI',sans-serif;color:#2e2821;background:#fffdf8;text-align:center;padding:24px">
    <div><h1>No se pudo iniciar la cabina</h1><p>${String(err.message).replace(/</g, '&lt;')}</p>
    <p>Asegúrate de abrirlo con “Iniciar Sonria PJs.bat”.</p></div></div>`;
});

// para pruebas desde la consola
window.sonriaPJs = { estado, camara, PLANTILLAS };
