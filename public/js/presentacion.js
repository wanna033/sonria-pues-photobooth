/*
 * Presentación en vivo: muestra las fotos, GIF y videos del evento en una
 * pantalla o TV. Las sesiones nuevas aparecen enseguida con la etiqueta
 * "¡Nueva!"; el resto del tiempo se van rotando las últimas.
 *
 * Se abre desde Ajustes → Estado o con el acceso directo "Sonría Pues - Presentación".
 */

import { qrSvg } from './qr.js';

const $ = (selector) => document.querySelector(selector);
const CUANTAS = 40; // últimas sesiones que se rotan
const SEGUNDOS = { foto: 7, gif: 8, video: 14 };

let lista = [];
const vistas = new Set();
const nuevas = [];
let indice = 0;
let primeraVez = true;

async function api(ruta) {
  const res = await fetch(ruta, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function esClaro(hex) {
  const n = parseInt(String(hex || '').replace('#', '').slice(0, 6), 16) || 0;
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

async function aplicarMarca() {
  const { marca, evento, compartir } = await api('/api/config');
  const raiz = document.documentElement.style;
  raiz.setProperty('--primario', marca.colorPrimario);
  raiz.setProperty('--secundario', marca.colorSecundario);
  // la presentación va sobre fondo oscuro (se ve mejor en una TV): el logo claro si existe
  const logo = $('#logo');
  const archivoLogo = marca.logoClaro || marca.logo;
  logo.hidden = !archivoLogo;
  if (archivoLogo) logo.src = archivoLogo;
  if (esClaro(marca.colorFondo) === false) raiz.setProperty('--fondo', marca.colorFondo);
  $('#evento').textContent = evento.nombre || '';
  $('#eslogan').textContent = marca.eslogan || '';
  document.title = `${marca.nombre} · Presentación`;

  // QR con la galería de todo el evento (si las fotos se guardan en internet)
  try {
    const nube = await api('/api/nube/estado');
    $('#qr').hidden = !nube.enlaceEvento || !compartir.qr;
    if (nube.enlaceEvento) $('#qr-codigo').innerHTML = qrSvg(nube.enlaceEvento, { nivel: 'M', margen: 2 });
  } catch { /* sin nube */ }
}

async function actualizar() {
  try {
    const sesiones = await api(`/api/sesiones?limite=${CUANTAS}`);
    lista = sesiones.filter((s) => /\.(jpg|gif|mp4|webm)$/.test(s.principal));
    for (const s of [...lista].reverse()) {
      if (vistas.has(s.id)) continue;
      vistas.add(s.id);
      if (!primeraVez) nuevas.push(s);
    }
    primeraVez = false;
    $('#contador').textContent = lista.length ? `${sesiones.length >= CUANTAS ? `${CUANTAS}+` : sesiones.length} recuerdos en este evento` : '';
    $('#sin-conexion').hidden = true;
  } catch {
    $('#sin-conexion').hidden = false;
  }
}

function crearMedio(sesion) {
  const url = `/m/${sesion.id}/${encodeURIComponent(sesion.principal)}`;
  const esVideo = /\.(mp4|webm)$/.test(sesion.principal);
  const medio = document.createElement(esVideo ? 'video' : 'img');
  if (esVideo) Object.assign(medio, { muted: true, playsInline: true, autoplay: true, loop: false, preload: 'auto' });
  medio.src = url;
  return { medio, esVideo, esGif: sesion.principal.endsWith('.gif') };
}

function siguiente() {
  const nueva = nuevas.shift();
  const sesion = nueva || lista[indice++ % Math.max(1, lista.length)];
  $('#vacio').hidden = Boolean(sesion);
  if (!sesion) return setTimeout(siguiente, 3000);

  const { medio, esVideo, esGif } = crearMedio(sesion);
  const diapositiva = document.createElement('div');
  diapositiva.className = 'diapositiva';
  const marco = document.createElement('div');
  marco.className = 'marco';
  marco.append(medio);
  if (nueva) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'nueva';
    etiqueta.textContent = '¡Nueva!';
    marco.append(etiqueta);
  }
  diapositiva.append(marco);

  let listo = false;
  const mostrar = () => {
    if (listo) return;
    listo = true;
    $('#escenario').append(diapositiva);
    // (con un temporizador: requestAnimationFrame se pausa si la ventana no está al frente)
    setTimeout(() => diapositiva.classList.add('visible'), 30);
    // la anterior se desvanece y se quita
    for (const vieja of [...document.querySelectorAll('.diapositiva')].slice(0, -1)) {
      vieja.classList.remove('visible');
      setTimeout(() => vieja.remove(), 1300);
    }
    const segundos = esVideo ? SEGUNDOS.video : esGif ? SEGUNDOS.gif : SEGUNDOS.foto;
    setTimeout(siguiente, segundos * 1000);
  };
  medio.addEventListener(esVideo ? 'loadeddata' : 'load', mostrar, { once: true });
  // si un archivo no carga, se pasa al siguiente
  medio.addEventListener('error', () => { if (!listo) { listo = true; setTimeout(siguiente, 500); } }, { once: true });
}

await aplicarMarca().catch(() => {});
await actualizar();
setInterval(actualizar, 5000);
setInterval(() => aplicarMarca().catch(() => {}), 60000);
setTimeout(() => { $('#aviso').style.opacity = '0'; }, 8000);
siguiente();
