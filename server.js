'use strict';
/*
 * Sonría PJs — servidor local de la cabina de fotos.
 *
 * - Sirve la interfaz de la cabina (carpeta public/) en http://localhost:5050
 * - Guarda cada sesión (fotos, GIF, video) en datos/fotos/<evento>/<sesión>/
 * - Publica una página de descarga por sesión (/g/<id>) para que los invitados
 *   la abran escaneando el QR desde su celular, conectados a la misma red Wi-Fi.
 *
 * Las rutas de administración (/api/...) sólo responden a peticiones hechas
 * desde la misma computadora; los invitados en la red sólo pueden ver su sesión.
 *
 * Sin dependencias externas: sólo Node.js 18 o superior.
 */

const http = require('http');
const https = require('https');
const dns = require('dns');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { pipeline } = require('stream');

const PUERTO = Number(process.env.PUERTO || 5050);
const RAIZ = __dirname;
const PUBLICO = path.join(RAIZ, 'public');
const DATOS = path.join(RAIZ, 'datos');
const FOTOS = path.join(DATOS, 'fotos');
const PAPELERA = path.join(DATOS, 'papelera');
const RECURSOS = path.join(DATOS, 'recursos');
const DISENOS = path.join(DATOS, 'disenos');
const ARCHIVO_CONFIG = path.join(DATOS, 'config.json');
const CONFIG_BASE = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.default.json'), 'utf8'));

const MB = 1024 * 1024;
const INICIO = new Date().toISOString();
// fecha-hora-aleatorio; las sesiones nuevas llevan 12 caracteres aleatorios porque
// con el enlace por internet cualquiera podría intentar adivinarlas
const ID_VALIDO = /^[0-9]{8}-[0-9]{6}-[0-9a-f]{6,16}$/;
/** Puerto interno que sólo sirve las fotos; es el único que se publica en internet. */
const PUERTO_PUBLICO = PUERTO + 1;
const HERRAMIENTAS = path.join(RAIZ, 'herramientas');
const ARCHIVO_VALIDO = /^[a-z0-9_-]{1,40}\.(jpg|png|gif|webm|mp4)$/;
/** Imágenes que se suben desde los ajustes: logotipos, fondo, marco de GIF/video y fondos de pantalla verde. */
const ID_RECURSO = /^(logo|logo-claro|fondo|marco|verde-[1-8])$/;
const RECURSO_VALIDO = /^(logo|logo-claro|fondo|marco|verde-[1-8])\.(png|jpg|webp)$/;
const ID_DISENO = /^[a-z0-9][a-z0-9-]{2,70}$/;
const EXTENSIONES_IMAGEN = ['png', 'jpg', 'webp'];
/** Archivos de uso interno de la cabina: no se muestran al invitado ni se suben. */
const ARCHIVOS_INTERNOS = new Set(['miniatura.jpg']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

for (const dir of [DATOS, FOTOS, PAPELERA, RECURSOS, DISENOS]) fs.mkdirSync(dir, { recursive: true });

// ---------------------------------------------------------------- utilidades

function log(...partes) {
  const hora = new Date().toLocaleTimeString('es-MX', { hour12: false });
  console.log(`[${hora}]`, ...partes);
}

function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Mezcla profunda: los objetos se combinan, los arreglos y valores se reemplazan. */
function mezclar(base, extra) {
  const salida = structuredClone(base);
  if (!esObjeto(extra)) return salida;
  for (const [clave, valor] of Object.entries(extra)) {
    if (!(clave in base)) continue; // ignora claves desconocidas
    salida[clave] = esObjeto(base[clave]) ? mezclar(base[clave], valor) : valor;
  }
  return salida;
}

/**
 * Los ajustes se guardan en memoria y sólo se vuelven a leer del disco si el
 * archivo cambió (antes se leía en cada foto que descargaba un celular).
 * Quien necesite modificar la configuración debe hacer una copia.
 */
const memoriaConfig = { marca: -1, config: null };

function leerConfig() {
  let marca = 0;
  try {
    marca = fs.statSync(ARCHIVO_CONFIG).mtimeMs;
  } catch { /* todavía no hay ajustes guardados */ }
  if (memoriaConfig.config && memoriaConfig.marca === marca) return memoriaConfig.config;
  let config;
  try {
    const guardada = JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8'));
    config = mezclar(CONFIG_BASE, guardada);
    config.textos = limpiarTextos(guardada.textos);
  } catch {
    config = structuredClone(CONFIG_BASE);
  }
  Object.assign(memoriaConfig, { marca, config });
  return config;
}

/**
 * Los textos de la cabina son de forma libre (clave -> texto), así que no pasan
 * por la mezcla normal: se limpian aquí. Vacío = se usa el texto de fábrica.
 */
function limpiarTextos(textos) {
  const salida = {};
  for (const [clave, valor] of Object.entries(textos || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{1,40}$/.test(clave)) continue;
    const texto = String(valor ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300);
    if (texto) salida[clave] = texto;
  }
  return salida;
}

function guardarConfig(nueva) {
  const config = mezclar(CONFIG_BASE, nueva);
  config.textos = limpiarTextos(nueva?.textos);
  const temporal = ARCHIVO_CONFIG + '.tmp';
  fs.writeFileSync(temporal, JSON.stringify(config, null, 2));
  fs.renameSync(temporal, ARCHIVO_CONFIG);
  memoriaConfig.config = null;
  return config;
}

function slug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'evento';
}

/** true si el color (#rrggbb) es claro: sobre él va texto oscuro. */
function esColorClaro(hex) {
  const n = parseInt(String(hex || '').replace('#', '').slice(0, 6), 16) || 0;
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function nuevoId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const fecha = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const hora = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${fecha}-${hora}-${crypto.randomBytes(6).toString('hex')}`;
}

function ipsLocales() {
  const ips = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const i of interfaces || []) {
      if (i.family !== 'IPv4' || i.internal || i.address.startsWith('169.254.')) continue;
      ips.push(i.address);
    }
  }
  const prioridad = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('172.') ? 2 : 3);
  return ips.sort((a, b) => prioridad(a) - prioridad(b));
}

function urlBase(config) {
  const manual = String(config.compartir.urlBase || '').trim().replace(/\/+$/, '');
  if (manual) return manual;
  const ip = ipsLocales()[0] || 'localhost';
  return `http://${ip}:${PUERTO}`;
}

/** Dirección que va en el QR: la de internet si el túnel está activo; si no, la de la red local. */
function urlDescarga(config) {
  if (config.compartir.internet !== false && enlaceVerificado()) return tunel.url;
  return urlBase(config);
}

/** El enlace sólo va en un QR si se comprobó desde internet hace poco (nunca uno caído). */
function enlaceVerificado() {
  return Boolean(tunel.url) && tunel.estado === 'activo' && Date.now() - tunel.verificado < 90 * 1000;
}

function esLocal(req) {
  // lo que llega por un túnel o proxy nunca cuenta como "esta computadora"
  if (req.headers['cf-connecting-ip'] || req.headers['cdn-loop'] || req.headers['x-forwarded-for']) return false;
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function enviarJSON(res, codigo, datos) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(cuerpo);
}

function enviarError(res, codigo, mensaje) {
  enviarJSON(res, codigo, { error: mensaje });
}

function leerCuerpo(req, limite) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let total = 0;
    req.on('data', (parte) => {
      total += parte.length;
      if (total > limite) {
        reject(Object.assign(new Error('El archivo es demasiado grande'), { codigo: 413 }));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

async function leerJSON(req) {
  const cuerpo = await leerCuerpo(req, 2 * MB);
  try {
    return JSON.parse(cuerpo.toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('JSON inválido'), { codigo: 400 });
  }
}

/**
 * Mueve una carpeta o archivo. En Windows, el antivirus o una descarga en curso
 * pueden bloquearlo unos instantes: se reintenta antes de rendirse.
 */
async function moverConReintentos(origen, destino, intentos = 8) {
  for (let n = 1; ; n++) {
    try {
      return await fsp.rename(origen, destino);
    } catch (err) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(err.code) || n >= intentos) {
        throw Object.assign(new Error('Un archivo de la sesión está en uso (quizá alguien lo está descargando). Intenta de nuevo en unos segundos.'), { codigo: 409 });
      }
      await new Promise((r) => setTimeout(r, 400 * n));
    }
  }
}

async function escribirAtomico(destino, datos) {
  const temporal = `${destino}.${process.pid}.tmp`;
  await fsp.writeFile(temporal, datos);
  await fsp.rename(temporal, destino);
}

/** Envía un archivo con soporte para rangos (necesario para reproducir video en iPhone). */
async function enviarArchivo(req, res, ruta, extraCabeceras = {}) {
  let info;
  try {
    info = await fsp.stat(ruta);
    if (!info.isFile()) throw new Error('no es archivo');
  } catch {
    return enviarError(res, 404, 'No encontrado');
  }
  const tipo = MIME[path.extname(ruta).toLowerCase()] || 'application/octet-stream';
  const cabeceras = {
    'Content-Type': tipo,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    ...extraCabeceras,
  };
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rango && (rango[1] || rango[2])) {
    let inicio = rango[1] ? Number(rango[1]) : info.size - Number(rango[2]);
    let fin = rango[1] && rango[2] ? Number(rango[2]) : info.size - 1;
    inicio = Math.max(0, inicio);
    fin = Math.min(fin, info.size - 1);
    if (inicio > fin) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...cabeceras,
      'Content-Range': `bytes ${inicio}-${fin}/${info.size}`,
      'Content-Length': fin - inicio + 1,
    });
    if (req.method === 'HEAD') return res.end();
    return enviarFlujo(fs.createReadStream(ruta, { start: inicio, end: fin }), res);
  }
  res.writeHead(200, { ...cabeceras, 'Content-Length': info.size });
  if (req.method === 'HEAD') return res.end();
  enviarFlujo(fs.createReadStream(ruta), res);
}

/**
 * Envía el archivo y lo suelta siempre, aunque el celular se desconecte a la
 * mitad (con .pipe() el archivo quedaba abierto y Windows no dejaba moverlo).
 */
function enviarFlujo(flujo, res) {
  pipeline(flujo, res, () => {}); // el error de "cliente desconectado" no importa
}

// ---------------------------------------------------------------- sesiones

/** id -> { dir, meta } */
const sesiones = new Map();

/** Último estado de la cámara reportado por la cabina. */
let estadoCamara = null;

/** Estado del enlace por internet (túnel de Cloudflare). */
const tunel = {
  url: '',
  estado: 'apagado',
  detalle: '',
  proceso: null,
  intentos: 0,
  cerrando: false,
  reiniciando: false,
  verificado: 0, // última vez que el enlace respondió desde internet
  nacio: 0, // cuándo se obtuvo el enlace actual
  fallos: 0,
  comprobando: false,
};

function indexarSesiones() {
  sesiones.clear();
  for (const evento of fs.readdirSync(FOTOS, { withFileTypes: true })) {
    if (!evento.isDirectory()) continue;
    const dirEvento = path.join(FOTOS, evento.name);
    for (const sesion of fs.readdirSync(dirEvento, { withFileTypes: true })) {
      if (!sesion.isDirectory() || !ID_VALIDO.test(sesion.name)) continue;
      const dir = path.join(dirEvento, sesion.name);
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
        sesiones.set(sesion.name, { dir, meta });
      } catch {
        // sesión incompleta: se ignora
      }
    }
  }
}

async function guardarMeta(sesion) {
  await escribirAtomico(path.join(sesion.dir, 'meta.json'), JSON.stringify(sesion.meta, null, 2));
}

function resumenSesion(id, { meta }) {
  return {
    id,
    evento: meta.evento,
    eventoSlug: meta.eventoSlug,
    fecha: meta.fecha,
    modo: meta.modo,
    plantilla: meta.plantilla || '',
    principal: meta.principal,
    archivos: meta.archivos.map((a) => a.nombre).filter((n) => !ARCHIVOS_INTERNOS.has(n)),
    // vista chica para la galería y el inicio (las sesiones antiguas no la tienen)
    miniatura: meta.archivos.some((a) => a.nombre === 'miniatura.jpg'),
    impresiones: meta.impresiones || 0,
    // enlace permanente (fotos guardadas en internet) y estado de la subida
    enlace: meta.enlace || '',
    nube: meta.nube ? (meta.nube.completo ? 'guardada' : 'pendiente') : '',
  };
}

function tipoDeArchivo(nombre) {
  const ext = path.extname(nombre);
  if (ext === '.gif') return 'gif';
  if (ext === '.webm' || ext === '.mp4') return 'video';
  return 'foto';
}

// ---------------------------------------------------------------- diseños propios
// Cada diseño es una imagen (la tira o postal hecha en Photoshop/Canva) más un
// JSON con los recuadros donde van las fotos: datos/disenos/<id>.png + <id>.json

function imagenDeDiseno(id) {
  for (const ext of EXTENSIONES_IMAGEN) {
    if (fs.existsSync(path.join(DISENOS, `${id}.${ext}`))) return `${id}.${ext}`;
  }
  return null;
}

function listarDisenos() {
  const lista = [];
  for (const archivo of fs.readdirSync(DISENOS)) {
    if (!archivo.endsWith('.json')) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(DISENOS, archivo), 'utf8'));
      const imagen = imagenDeDiseno(meta.id);
      if (!imagen) continue;
      const version = Math.round(fs.statSync(path.join(DISENOS, imagen)).mtimeMs);
      lista.push({ ...meta, url: `/api/disenos/${meta.id}/imagen?v=${version}` });
    } catch {
      // archivo dañado: se ignora
    }
  }
  return lista.sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
}

function validarDiseno(id, cuerpo, anterior) {
  const entero = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
  const ancho = entero(cuerpo.ancho, 20, 30000);
  const alto = entero(cuerpo.alto, 20, 30000);
  const ranuras = (Array.isArray(cuerpo.ranuras) ? cuerpo.ranuras : []).slice(0, 12).map((r) => {
    const x = entero(r.x, 0, ancho - 10);
    const y = entero(r.y, 0, alto - 10);
    return { x, y, w: entero(r.w, 10, ancho - x), h: entero(r.h, 10, alto - y) };
  });
  if (!ranuras.length) throw Object.assign(new Error('El diseño necesita al menos un recuadro para fotos'), { codigo: 400 });
  return {
    id,
    nombre: String(cuerpo.nombre || 'Mi diseño').trim().slice(0, 60) || 'Mi diseño',
    ancho,
    alto,
    capa: cuerpo.capa === 'debajo' ? 'debajo' : 'encima',
    duplicar: Boolean(cuerpo.duplicar),
    // lado largo de la hoja impresa, en cm (15.24 cm = 6")
    largoCm: Math.min(60, Math.max(2, Number(cuerpo.largoCm) || 15.24)),
    ranuras,
    creado: anterior?.creado || new Date().toISOString(),
    actualizado: new Date().toISOString(),
  };
}

async function borrarImagenesDeDiseno(id) {
  for (const ext of EXTENSIONES_IMAGEN) {
    await fsp.unlink(path.join(DISENOS, `${id}.${ext}`)).catch(() => {});
  }
}

// ---------------------------------------------------------------- fotos guardadas en internet (Cloudinary)
//
// Cada sesión se sube a Cloudinary con nombres fijos (sonria/<sesión>/recuerdo.jpg…),
// así el enlace permanente se conoce ANTES de subir y el QR sale al instante:
//   https://<usuario>.github.io/<repo>/g/?c=<cuenta>&s=<sesión>&a=<archivos>
// La subida la hace el servidor en una cola: si no hay internet, reintenta cada
// minuto y las fotos aparecen en cuanto vuelve la conexión.

/** Letra corta de cada archivo dentro del enlace (mantiene el QR pequeño). */
const CODIGOS_NUBE = { 'recuerdo.jpg': 'r', 'animacion.gif': 'a', 'boomerang.gif': 'b', 'video.mp4': 'v', 'video.webm': 'w' };
/** Límites del plan gratuito de Cloudinary, con margen (imagen 10 MB, video 100 MB). */
const LIMITE_IMAGEN_NUBE = 9.5 * MB;
const LIMITE_VIDEO_NUBE = 95 * MB;
const MINUTO = 60 * 1000;
const ARCHIVO_EVENTOS_NUBE = path.join(DATOS, 'nube-eventos.json');

function nubeLista(config) {
  const n = config.compartir.nube;
  return Boolean(n.activo && n.cloudName && n.preset);
}

function codigoNube(nombre) {
  return CODIGOS_NUBE[nombre] || (nombre.match(/^foto-([1-9])\.jpg$/) || [])[1] || '';
}

/** Qué archivos se guardan en internet (sin las fotos sueltas, salvo que se pida). */
function archivosParaNube(config, nombres) {
  return nombres.filter((n) =>
    CODIGOS_NUBE[n] || (config.compartir.nube.subirFotosSueltas && /^foto-[1-9]\.jpg$/.test(n)));
}

function paginaDescarga(config) {
  return String(config.compartir.nube.urlGaleria || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
}

function enlacePermanente(config, id, meta) {
  const cuenta = meta.nube?.cloud || config.compartir.nube.cloudName;
  const archivos = meta.nube?.archivos || archivosParaNube(config, meta.archivos.map((a) => a.nombre));
  if (!cuenta || !archivos.length) return '';
  const pagina = paginaDescarga(config);
  if (!pagina) {
    // sin página de descarga: el QR abre directo el recuerdo principal
    const principal = archivos[0];
    const tipo = /\.(mp4|webm)$/.test(principal) ? 'video' : 'image';
    return `https://res.cloudinary.com/${cuenta}/${tipo}/upload/sonria/${id}/${principal}`;
  }
  return `${pagina}/?c=${encodeURIComponent(cuenta)}&s=${id}&a=${archivos.map(codigoNube).join('')}`;
}

/**
 * Etiqueta secreta de cada evento en Cloudinary: con ella la página de descarga
 * arma la galería con TODAS las fotos del evento (nadie puede adivinarla).
 */
function etiquetaEvento(eventoSlug) {
  let mapa = {};
  try { mapa = JSON.parse(fs.readFileSync(ARCHIVO_EVENTOS_NUBE, 'utf8')); } catch { /* primera vez */ }
  if (!mapa[eventoSlug]) {
    mapa[eventoSlug] = `sonria_${eventoSlug.slice(0, 40)}_${crypto.randomBytes(5).toString('hex')}`;
    fs.writeFileSync(ARCHIVO_EVENTOS_NUBE, JSON.stringify(mapa, null, 2));
  }
  return mapa[eventoSlug];
}

/** Enlace de la galería completa del evento (necesita la página de descarga). */
function enlaceEventoNube(config, eventoSlug) {
  const pagina = paginaDescarga(config);
  if (!nubeLista(config) || !pagina) return '';
  return `${pagina}/?c=${encodeURIComponent(config.compartir.nube.cloudName)}&t=${etiquetaEvento(eventoSlug)}`;
}

/** Explica en palabras sencillas lo que responde Cloudinary. */
function errorDeNube(mensaje, estado) {
  const original = String(mensaje || `Cloudinary respondió ${estado}`);
  const reglas = [
    [/whitelisted for unsigned|must be unsigned|unsigned upload/i, 'El preset no está en modo "Unsigned". En Cloudinary: Settings → Upload → edita el preset y pon Signing Mode: Unsigned.'],
    [/preset.*not found|not found.*preset|invalid upload preset/i, 'No existe un preset con ese nombre. Cópialo tal cual aparece en Cloudinary (Settings → Upload).'],
    [/cloud_name|unknown api key|invalid cloud|disabled account|account.*disabled/i, 'El Cloud name no es correcto. Cópialo del panel principal (Dashboard) de Cloudinary.'],
    [/file size too large|too large/i, 'El archivo pesa más de lo que permite el plan gratuito de Cloudinary.'],
    [/rate limit|too many/i, 'Cloudinary pidió esperar un poco (demasiadas subidas por hora). Se reintenta sola.'],
  ];
  const regla = reglas.find(([patron]) => patron.test(original)) || (estado === 420 || estado === 429 ? reglas[4] : null);
  const error = new Error(regla ? `${regla[1]} (${original})` : original);
  // los errores de datos (4xx) no se arreglan solos; los demás sí
  error.permanente = estado >= 400 && estado < 500 && estado !== 420 && estado !== 429;
  return error;
}

async function llamarCloudinary(url, cuerpo, segundos = 180) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', body: cuerpo, signal: AbortSignal.timeout(segundos * 1000) });
  } catch (err) {
    const error = new Error(err.name === 'TimeoutError' ? 'La subida tardó demasiado (internet lento)' : 'Sin conexión a internet');
    error.sinConexion = true;
    throw error;
  }
  const respuesta = await res.json().catch(() => ({}));
  if (!res.ok) throw errorDeNube(respuesta?.error?.message, res.status);
  return respuesta;
}

async function subirArchivoANube(config, id, sesion, nombre) {
  const { cloudName, preset } = config.compartir.nube;
  const ruta = path.join(sesion.dir, nombre);
  const datos = await fsp.readFile(ruta);
  let tipo = /\.(mp4|webm)$/.test(nombre) ? 'video' : 'image';
  if (tipo === 'image' && datos.length > LIMITE_IMAGEN_NUBE) {
    // un GIF muy pesado (boomerang largo) se guarda como video: la página lo muestra en MP4
    if (nombre.endsWith('.gif')) tipo = 'video';
    else throw Object.assign(new Error(`${nombre} pesa más de 10 MB (límite del plan gratuito)`), { permanente: true });
  }
  if (tipo === 'video' && datos.length > LIMITE_VIDEO_NUBE) {
    throw Object.assign(new Error(`${nombre} pesa más de 100 MB (límite del plan gratuito)`), { permanente: true });
  }
  const esperado = `sonria/${id}/${nombre.replace(/\.[^.]+$/, '')}`;
  const cuerpo = new FormData();
  cuerpo.append('file', new Blob([datos]), nombre);
  cuerpo.append('upload_preset', preset);
  cuerpo.append('public_id', esperado);
  cuerpo.append('tags', etiquetaEvento(sesion.meta.eventoSlug || 'evento'));
  let respuesta;
  try {
    respuesta = await llamarCloudinary(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${tipo}/upload`, cuerpo);
  } catch (err) {
    if (/already exists/i.test(err.message)) return; // ya estaba subido
    throw err;
  }
  if (respuesta.public_id && respuesta.public_id !== esperado) {
    throw Object.assign(new Error(`El preset cambia el nombre de las fotos (quedó "${respuesta.public_id}"). En Cloudinary edita el preset y deja vacío "Folder" y apagado "Use filename".`), { permanente: true });
  }
}

const colaNube = [];
const estadoNube = { subiendo: false, ultimoError: '', ultimaSubida: '', subidasHoy: 0, listaActiva: null };

/** Si se cambió de cuenta de Cloudinary, lo pendiente se sube a la cuenta nueva (con enlace nuevo). */
function alinearCuenta(config, id, sesion) {
  const nube = sesion.meta.nube;
  const cuenta = config.compartir.nube.cloudName;
  if (!nube || nube.completo || !cuenta || nube.cloud === cuenta) return;
  Object.assign(nube, { cloud: cuenta, subidos: [], error: '', fallos: 0, proximo: 0 });
  sesion.meta.enlace = enlacePermanente(config, id, sesion.meta);
}

/**
 * Marca la sesión para guardarla en internet y devuelve su enlace permanente.
 * @param {string[]} [planeados] archivos que TODAVÍA se van a subir desde la cabina
 *   (sirve para imprimir el QR en la foto antes de terminar de guardarla)
 */
function prepararEnNube(config, id, sesion, planeados) {
  const meta = sesion.meta;
  if (!meta.nube?.completo) {
    const nombres = planeados || meta.archivos.map((a) => a.nombre);
    meta.nube = {
      cloud: meta.nube?.cloud || config.compartir.nube.cloudName,
      archivos: meta.nube?.archivos || archivosParaNube(config, nombres),
      subidos: meta.nube?.subidos || [],
      completo: false,
      error: '',
      fallos: 0,
      proximo: 0,
    };
    alinearCuenta(config, id, sesion);
  }
  meta.enlace = enlacePermanente(config, id, meta);
  return meta.enlace;
}

/** @param {boolean} [urgente] la sesión de un invitado que está esperando va primero */
function encolarNube(id, urgente = false) {
  const i = colaNube.indexOf(id);
  if (i >= 0 && !urgente) return;
  if (i >= 0) colaNube.splice(i, 1);
  if (urgente) colaNube.unshift(id);
  else colaNube.push(id);
}

/**
 * Sube las sesiones pendientes, una por una. Si una falla no detiene a las
 * demás: se vuelve a intentar más tarde, cada vez con más espera. Sin internet
 * se pausa todo y se reintenta cada 30 segundos.
 */
async function procesarColaNube() {
  if (estadoNube.subiendo) return;
  estadoNube.subiendo = true;
  try {
    for (;;) {
      const config = leerConfig();
      if (!nubeLista(config)) break;
      const ahora = Date.now();
      const id = colaNube.find((x) => !(sesiones.get(x)?.meta.nube?.proximo > ahora));
      if (!id) break;
      const sesion = sesiones.get(id);
      if (!sesion?.meta.nube || sesion.meta.nube.completo) {
        colaNube.splice(colaNube.indexOf(id), 1);
        continue;
      }
      alinearCuenta(config, id, sesion);
      const nube = sesion.meta.nube;
      try {
        for (const nombre of nube.archivos) {
          if (nube.subidos.includes(nombre)) continue;
          // la cabina todavía lo está guardando: se espera
          if (!sesion.meta.archivos.some((a) => a.nombre === nombre)) {
            // si a los 10 minutos no llegó (la cabina se cerró a medias), se sigue sin él
            if (Date.now() - new Date(sesion.meta.fecha).getTime() > 10 * MINUTO) {
              nube.archivos = nube.archivos.filter((n) => n !== nombre);
              continue;
            }
            throw Object.assign(new Error(`Esperando a que la cabina termine de guardar ${nombre}`), { espera: true });
          }
          await subirArchivoANube(config, id, sesion, nombre);
          nube.subidos.push(nombre);
          await guardarMeta(sesion);
        }
        Object.assign(nube, { completo: true, error: '', fallos: 0, proximo: 0 });
        await guardarMeta(sesion);
        colaNube.splice(colaNube.indexOf(id), 1);
        Object.assign(estadoNube, { ultimoError: '', ultimaSubida: new Date().toISOString() });
        estadoNube.subidasHoy += 1;
        log(`Sesión ${id} guardada en internet`);
      } catch (err) {
        if (err.espera) {
          nube.proximo = Date.now() + 5000;
          continue;
        }
        nube.fallos = (nube.fallos || 0) + 1;
        const espera = err.permanente ? 60 * MINUTO : err.sinConexion ? 30 * 1000 : Math.min(30 * MINUTO, MINUTO * 2 ** Math.min(5, nube.fallos - 1));
        Object.assign(nube, { error: err.message, proximo: Date.now() + espera });
        estadoNube.ultimoError = err.message;
        await guardarMeta(sesion).catch(() => {});
        log(`No se pudo guardar ${id} en internet (${err.message}); se reintenta en ${Math.round(espera / 1000)} s`);
        if (err.sinConexion) break; // sin internet no tiene caso seguir con las demás
      }
    }
  } finally {
    estadoNube.subiendo = false;
  }
}

/** Reintenta ya todo lo pendiente (al guardar los ajustes o desde el botón "Reintentar"). */
function reintentarNube() {
  for (const id of colaNube) {
    const nube = sesiones.get(id)?.meta.nube;
    if (nube) nube.proximo = 0;
  }
  procesarColaNube();
}

// revisión periódica (por ejemplo, cuando vuelve el internet)
setInterval(() => {
  if (colaNube.length) procesarColaNube();
}, 15 * 1000);

/** Cuántas sesiones hay en internet, cuántas faltan y el último problema. */
function resumenNube(config) {
  let guardadas = 0;
  let pendientes = 0;
  let conError = 0;
  let sinSubir = 0;
  for (const { meta } of sesiones.values()) {
    if (meta.nube?.completo) guardadas++;
    else if (meta.nube) {
      pendientes++;
      if (meta.nube.error) conError++;
    } else sinSubir++;
  }
  return {
    activa: nubeLista(config),
    guardadas,
    pendientes,
    conError,
    sinSubir,
    subiendo: estadoNube.subiendo,
    ultimoError: conError ? estadoNube.ultimoError : '',
    ultimaSubida: estadoNube.ultimaSubida,
    subidasHoy: estadoNube.subidasHoy,
    listaActiva: estadoNube.listaActiva,
    enCola: colaNube.length,
    enlaceEvento: enlaceEventoNube(config, slug(config.evento.nombre)),
  };
}

/** Prueba completa de Cloudinary con los datos escritos en los ajustes (aunque no se hayan guardado). */
async function probarNube({ cloudName, preset }) {
  cloudName = String(cloudName || '').trim();
  preset = String(preset || '').trim();
  if (!cloudName || !preset) throw new Error('Escribe el Cloud name y el nombre del preset');
  if (!/^[a-z0-9_-]{1,80}$/i.test(cloudName)) throw new Error('El Cloud name sólo lleva letras, números, "-" o "_" (sin espacios)');
  // imagen de 1×1 píxel
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const esperado = `sonria/prueba/prueba-${crypto.randomBytes(4).toString('hex')}`;
  const cuerpo = new FormData();
  cuerpo.append('file', new Blob([pixel], { type: 'image/png' }), 'prueba.png');
  cuerpo.append('upload_preset', preset);
  cuerpo.append('public_id', esperado);
  cuerpo.append('tags', 'sonria_prueba');
  cuerpo.append('return_delete_token', 'true');
  const r = await llamarCloudinary(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, cuerpo, 30);
  const resultado = { ok: true, carpetaCorrecta: r.public_id === esperado, publica: false, listaActiva: false, url: r.secure_url };

  // ¿se puede ver desde cualquier celular?
  const verUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${r.public_id}.png`;
  resultado.publica = await fetch(verUrl, { signal: AbortSignal.timeout(15000) }).then((x) => x.ok).catch(() => false);
  // ¿la galería del evento puede listar las fotos? (Settings → Security → "Resource list")
  resultado.listaActiva = await fetch(`https://res.cloudinary.com/${cloudName}/image/list/sonria_prueba.json?t=${Date.now()}`, { signal: AbortSignal.timeout(15000) })
    .then((x) => x.ok).catch(() => false);
  estadoNube.listaActiva = resultado.listaActiva;

  // se borra la imagen de prueba
  if (r.delete_token) {
    const borrar = new FormData();
    borrar.append('token', r.delete_token);
    fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/delete_by_token`, { method: 'POST', body: borrar }).catch(() => {});
  }
  if (!resultado.carpetaCorrecta) {
    resultado.ok = false;
    resultado.error = `El preset cambia el nombre de las fotos (quedó "${r.public_id}"). En Cloudinary edita el preset: deja vacío "Folder" y apaga "Use filename".`;
  } else if (!resultado.publica) {
    resultado.ok = false;
    resultado.error = 'La foto se subió, pero no se puede ver desde internet. En Cloudinary: Settings → Security, desactiva la restricción de entrega (Restricted media types).';
  }
  return resultado;
}

// ---------------------------------------------------------------- papel de la impresora
// Contador de hojas: se descuenta con cada impresión y avisa antes de que se acabe.

const ARCHIVO_PAPEL = path.join(DATOS, 'papel.json');

function leerPapel() {
  try {
    const p = JSON.parse(fs.readFileSync(ARCHIVO_PAPEL, 'utf8'));
    return { restante: Math.max(0, Math.round(Number(p.restante) || 0)), cargado: Math.max(0, Math.round(Number(p.cargado) || 0)) };
  } catch {
    return { restante: 0, cargado: 0 };
  }
}

function guardarPapel(papel) {
  fs.writeFileSync(ARCHIVO_PAPEL, JSON.stringify(papel));
  return papel;
}

// ---------------------------------------------------------------- impresora y disco (diagnóstico)

const ESTADOS_IMPRESORA = { 3: 'Lista', 4: 'Imprimiendo', 5: 'Calentando', 6: 'Detenida', 7: 'Sin conexión' };
const ERRORES_IMPRESORA = {
  3: 'Queda poco papel', 4: 'Sin papel', 5: 'Queda poca tinta', 6: 'Sin tinta', 7: 'Tapa abierta',
  8: 'Papel atascado', 9: 'Sin conexión', 10: 'Necesita servicio', 11: 'Bandeja de salida llena',
};
const memoriaImpresora = { hora: 0, datos: null, consultando: null };

/** Impresora predeterminada de Windows y su estado (se consulta cada 20 s como máximo). */
function consultarImpresora() {
  if (process.platform !== 'win32') return Promise.resolve(null);
  if (Date.now() - memoriaImpresora.hora < 20 * 1000) return Promise.resolve(memoriaImpresora.datos);
  if (memoriaImpresora.consultando) return memoriaImpresora.consultando;
  const guion = [
    "$p = Get-CimInstance Win32_Printer -Filter 'Default=TRUE' | Select-Object -First 1",
    'if (-not $p) { "null"; exit }',
    '$t = @(Get-CimInstance Win32_PrintJob | Where-Object { $_.Name -like ($p.Name + ",*") }).Count',
    '[pscustomobject]@{ nombre = $p.Name; estado = $p.PrinterStatus; error = $p.DetectedErrorState; fueraDeLinea = $p.WorkOffline; trabajos = $t } | ConvertTo-Json -Compress',
  ].join('; ');
  memoriaImpresora.consultando = new Promise((resolve) => {
    const proceso = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', guion], { windowsHide: true });
    let salida = '';
    const reloj = setTimeout(() => proceso.kill(), 10000);
    proceso.stdout.on('data', (d) => { salida += d; });
    proceso.on('error', () => resolve(null));
    proceso.on('close', () => {
      clearTimeout(reloj);
      let datos = null;
      try {
        const p = JSON.parse(salida.trim() || 'null');
        if (p) {
          const problema = ERRORES_IMPRESORA[p.error] || (p.fueraDeLinea ? 'Sin conexión' : '');
          datos = {
            nombre: p.nombre,
            estado: problema || ESTADOS_IMPRESORA[p.estado] || 'Lista',
            problema,
            trabajos: p.trabajos || 0,
          };
        }
      } catch { /* sin datos */ }
      Object.assign(memoriaImpresora, { hora: Date.now(), datos, consultando: null });
      resolve(datos);
    });
  });
  return memoriaImpresora.consultando;
}

function espacioEnDisco() {
  try {
    const s = fs.statfsSync(DATOS);
    return { libre: s.bavail * s.bsize, total: s.blocks * s.bsize };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- datos de los invitados (formulario opcional)

/** Limpia lo que escribió el invitado (nunca se confía en lo que llega). */
function limpiarDatosInvitado(datos) {
  if (!esObjeto(datos)) return null;
  const texto = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  const limpio = {
    nombre: texto(datos.nombre, 80),
    correo: texto(datos.correo, 120).toLowerCase(),
    telefono: texto(datos.telefono, 30).replace(/[^0-9+() -]/g, ''),
    acepta: Boolean(datos.acepta),
  };
  return limpio.nombre || limpio.correo || limpio.telefono ? limpio : null;
}

/** Lista de contactos del evento para Excel (UTF-8 con BOM y ";" como separador). */
function contactosCsv(eventoSlug) {
  const celda = (v) => {
    const t = String(v ?? '');
    // evita que Excel ejecute fórmulas escritas por un invitado
    const seguro = /^[=+\-@]/.test(t) ? `'${t}` : t;
    return `"${seguro.replace(/"/g, '""')}"`;
  };
  const filas = [['Fecha', 'Hora', 'Nombre', 'Correo', 'Teléfono', 'Acepta', 'Sesión', 'Enlace de sus fotos']];
  const lista = [...sesiones.entries()].filter(([, s]) => s.meta.eventoSlug === eventoSlug && s.meta.datos).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (const [id, { meta }] of lista) {
    const f = new Date(meta.fecha);
    filas.push([f.toLocaleDateString('es-CO'), f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      meta.datos.nombre, meta.datos.correo, meta.datos.telefono, meta.datos.acepta ? 'Sí' : 'No', id, meta.enlace || '']);
  }
  const texto = '\ufeff' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
  return { datos: Buffer.from(texto, 'utf8'), filas: filas.length - 1 };
}

// ---------------------------------------------------------------- respaldo automático
// Copia cada archivo a otra carpeta (una memoria USB o una carpeta de OneDrive/Google
// Drive) en cuanto se guarda: si la computadora falla, las fotos están a salvo.

const estadoRespaldo = { ultimo: '', error: '', copiados: 0 };

function carpetaRespaldo(config) {
  const carpeta = String(config.general.carpetaRespaldo || '').trim();
  return carpeta && path.isAbsolute(carpeta) ? carpeta : '';
}

async function respaldarArchivo(config, sesion, nombre) {
  const carpeta = carpetaRespaldo(config);
  if (!carpeta) return;
  try {
    const destino = path.join(carpeta, sesion.meta.eventoSlug, sesion.meta.id);
    await fsp.mkdir(destino, { recursive: true });
    await fsp.copyFile(path.join(sesion.dir, nombre), path.join(destino, nombre));
    Object.assign(estadoRespaldo, { ultimo: new Date().toISOString(), error: '' });
    estadoRespaldo.copiados += 1;
  } catch (err) {
    estadoRespaldo.error = err.code === 'ENOENT' ? `No se encuentra la carpeta ${carpeta} (¿se desconectó la memoria USB?)` : err.message;
    log(`Respaldo: ${estadoRespaldo.error}`);
  }
}

/** Copia lo que falte del evento (por ejemplo, al volver a conectar la memoria USB). */
async function sincronizarRespaldo(config, eventoSlug) {
  const carpeta = carpetaRespaldo(config);
  if (!carpeta) throw Object.assign(new Error('Primero escribe la carpeta de respaldo en Ajustes → General'), { codigo: 400 });
  let copiados = 0;
  for (const sesion of sesiones.values()) {
    if (sesion.meta.eventoSlug !== eventoSlug) continue;
    for (const { nombre } of sesion.meta.archivos) {
      const destino = path.join(carpeta, eventoSlug, sesion.meta.id, nombre);
      if (fs.existsSync(destino)) continue;
      await respaldarArchivo(config, sesion, nombre);
      if (estadoRespaldo.error) throw Object.assign(new Error(estadoRespaldo.error), { codigo: 409 });
      copiados++;
    }
  }
  return copiados;
}

// ---------------------------------------------------------------- exportar un evento (ZIP)
// ZIP sin compresión (las fotos y videos ya vienen comprimidos): rápido y sin librerías.

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos) {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function fechaDos(fecha) {
  return {
    hora: (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1),
    dia: ((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate(),
  };
}

/** @param {{nombre:string, ruta?:string, datos?:Buffer, fecha:Date}[]} entradas */
async function crearZip(destino, entradas) {
  const temporal = `${destino}.tmp`;
  const archivo = await fsp.open(temporal, 'w');
  const central = [];
  let posicion = 0;
  try {
    for (const e of entradas) {
      const datos = e.datos || await fsp.readFile(e.ruta);
      const nombre = Buffer.from(e.nombre, 'utf8');
      const { hora, dia } = fechaDos(e.fecha);
      if (posicion + datos.length + 200 > 0xfffffff0) throw Object.assign(new Error('El evento pesa más de 4 GB: exporta desde la carpeta'), { codigo: 413 });
      const cabecera = Buffer.alloc(30);
      cabecera.writeUInt32LE(0x04034b50, 0);
      cabecera.writeUInt16LE(20, 4);
      cabecera.writeUInt16LE(0x0800, 6); // nombres en UTF-8
      cabecera.writeUInt16LE(0, 8); // sin compresión
      cabecera.writeUInt16LE(hora, 10);
      cabecera.writeUInt16LE(dia, 12);
      const crc = crc32(datos);
      cabecera.writeUInt32LE(crc, 14);
      cabecera.writeUInt32LE(datos.length, 18);
      cabecera.writeUInt32LE(datos.length, 22);
      cabecera.writeUInt16LE(nombre.length, 26);
      await archivo.write(cabecera);
      await archivo.write(nombre);
      await archivo.write(datos);
      central.push({ nombre, crc, bytes: datos.length, posicion, hora, dia });
      posicion += 30 + nombre.length + datos.length;
    }
    const inicioCentral = posicion;
    for (const c of central) {
      const b = Buffer.alloc(46);
      b.writeUInt32LE(0x02014b50, 0);
      b.writeUInt16LE(20, 4);
      b.writeUInt16LE(20, 6);
      b.writeUInt16LE(0x0800, 8);
      b.writeUInt16LE(0, 10);
      b.writeUInt16LE(c.hora, 12);
      b.writeUInt16LE(c.dia, 14);
      b.writeUInt32LE(c.crc, 16);
      b.writeUInt32LE(c.bytes, 20);
      b.writeUInt32LE(c.bytes, 24);
      b.writeUInt16LE(c.nombre.length, 28);
      b.writeUInt32LE(c.posicion, 42);
      await archivo.write(b);
      await archivo.write(c.nombre);
      posicion += 46 + c.nombre.length;
    }
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0);
    fin.writeUInt16LE(central.length, 8);
    fin.writeUInt16LE(central.length, 10);
    fin.writeUInt32LE(posicion - inicioCentral, 12);
    fin.writeUInt32LE(inicioCentral, 16);
    await archivo.write(fin);
  } catch (err) {
    await archivo.close();
    await fsp.unlink(temporal).catch(() => {});
    throw err;
  }
  await archivo.close();
  await fsp.rename(temporal, destino);
  return posicion + 22;
}

/** Arma el ZIP de un evento, ordenado por carpetas: impresiones, GIF, videos y fotos. */
async function exportarEvento(eventoSlug) {
  const carpetas = { recuerdo: 'impresiones', gif: 'gif-y-boomerang', video: 'videos', foto: 'fotos-individuales' };
  const entradas = [];
  const lista = [...sesiones.entries()].filter(([, s]) => s.meta.eventoSlug === eventoSlug).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (const [id, { dir, meta }] of lista) {
    const fecha = new Date(meta.fecha);
    const p = (n) => String(n).padStart(2, '0');
    const prefijo = `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}_${p(fecha.getHours())}.${p(fecha.getMinutes())}.${p(fecha.getSeconds())}_${id.slice(-6)}`;
    for (const { nombre } of meta.archivos) {
      if (nombre === 'miniatura.jpg' || !fs.existsSync(path.join(dir, nombre))) continue;
      const tipo = nombre === 'recuerdo.jpg' ? 'recuerdo' : tipoDeArchivo(nombre);
      entradas.push({ nombre: `${eventoSlug}/${carpetas[tipo]}/${prefijo}_${nombre}`, ruta: path.join(dir, nombre), fecha });
    }
  }
  if (!entradas.length) throw Object.assign(new Error('Este evento todavía no tiene fotos'), { codigo: 404 });
  const contactos = contactosCsv(eventoSlug);
  if (contactos.filas) entradas.push({ nombre: `${eventoSlug}/contactos.csv`, datos: contactos.datos, fecha: new Date() });
  const carpeta = path.join(DATOS, 'exportaciones');
  await fsp.mkdir(carpeta, { recursive: true });
  const hoy = new Date();
  const destino = path.join(carpeta, `${eventoSlug}-${hoy.toISOString().slice(0, 10)}-${String(hoy.getHours()).padStart(2, '0')}${String(hoy.getMinutes()).padStart(2, '0')}.zip`);
  const bytes = await crearZip(destino, entradas);
  return { destino, bytes, archivos: entradas.length, sesiones: lista.length };
}

// ---------------------------------------------------------------- página de descarga

function paginaGaleria(config, id, sesion) {
  const { marca, evento } = config;
  const meta = sesion.meta;
  // la principal primero, luego animaciones y videos, y al final las fotos sueltas
  const peso = { gif: 0, video: 1, foto: 2 };
  const resto = meta.archivos.map((a) => a.nombre)
    .filter((n) => n !== meta.principal && !ARCHIVOS_INTERNOS.has(n))
    .sort((a, b) => peso[tipoDeArchivo(a)] - peso[tipoDeArchivo(b)] || a.localeCompare(b));
  const orden = [meta.principal, ...resto]
    .filter((n, i, arr) => n && arr.indexOf(n) === i && meta.archivos.some((a) => a.nombre === n));

  const tarjetas = orden.map((nombre, i) => {
    const url = `/m/${id}/${encodeURIComponent(nombre)}`;
    const tipo = tipoDeArchivo(nombre);
    const medio = tipo === 'video'
      ? `<video src="${url}" controls playsinline loop muted autoplay preload="metadata"></video>`
      : `<img src="${url}" alt="Recuerdo ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
    const etiqueta = { foto: 'Descargar foto', gif: 'Descargar GIF', video: 'Descargar video' }[tipo];
    const archivoDescarga = `${slug(marca.nombre)}-${nombre}`;
    return `<figure class="${i === 0 ? 'principal' : ''}">${medio}
      <div class="botones"><a class="boton" href="${url}?descargar=1" download="${escaparHtml(archivoDescarga)}">${etiqueta}</a>
      <button class="boton compartir" type="button" data-url="${url}" data-nombre="${escaparHtml(archivoDescarga)}" hidden>Compartir</button></div></figure>`;
  }).join('\n');

  // fondo claro u oscuro según el color de la marca; el logo se elige para que contraste
  const claro = esColorClaro(marca.colorFondo);
  // los logos se guardan con ruta relativa a la cabina; aquí hay que dejarla absoluta
  const absoluta = (p) => (p && !/^(https?:|data:|\/)/.test(p) ? `/${p}` : p);
  const archivoLogo = absoluta(claro ? marca.logo : (marca.logoClaro || marca.logo));
  const logo = archivoLogo ? `<img class="logo" src="${escaparHtml(archivoLogo)}" alt="${escaparHtml(marca.nombre)}">` : '';
  const mostrarNombre = !archivoLogo || marca.mostrarNombre;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escaparHtml(marca.nombre)} · Tus fotos</title>
<meta name="theme-color" content="${escaparHtml(marca.colorFondo)}">
<link rel="icon" href="/marca/icono.png">
<style>
  :root { --primario: ${escaparHtml(marca.colorPrimario)}; --secundario: ${escaparHtml(marca.colorSecundario)}; --fondo: ${escaparHtml(marca.colorFondo)};
    --texto: ${claro ? '#2b2622' : '#ffffff'}; --tarjeta: ${claro ? '#ffffff' : 'rgba(255,255,255,.07)'}; --borde: ${claro ? 'rgba(43,38,34,.1)' : 'rgba(255,255,255,.12)'}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; color: var(--texto);
    background: radial-gradient(120% 60% at 50% 0%, color-mix(in srgb, var(--primario) ${claro ? 18 : 35}%, var(--fondo)) 0%, var(--fondo) 70%) fixed; min-height: 100vh; }
  header { text-align: center; padding: 28px 16px 8px; }
  .logo { max-height: 140px; max-width: 78%; margin-bottom: 6px; }
  h1 { margin: 0; font-size: 30px; letter-spacing: -0.5px;
    background: linear-gradient(90deg, var(--primario), var(--secundario)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  header p { margin: 6px 0 0; opacity: .8; font-weight: 600; }
  main { max-width: 720px; margin: 0 auto; padding: 16px; display: grid; gap: 18px; }
  figure { margin: 0; background: var(--tarjeta); border: 1px solid var(--borde); border-radius: 18px; padding: 12px;
    box-shadow: ${claro ? '0 10px 30px rgba(60,45,20,.12)' : 'none'}; }
  figure img, figure video { width: 100%; display: block; border-radius: 10px; background: #000; }
  .boton { display: block; margin-top: 12px; text-align: center; padding: 14px; border-radius: 999px; font-weight: 700; color: #fff; text-decoration: none;
    background: ${claro ? 'linear-gradient(135deg, color-mix(in srgb, var(--secundario) 85%, #fff), var(--secundario))' : 'linear-gradient(90deg, var(--primario), var(--secundario))'}; }
  .ayuda { text-align: center; font-size: 14px; opacity: .7; padding: 4px 16px 32px; }
  .botones { display: flex; gap: 10px; }
  .botones .boton { flex: 1; border: 0; font: inherit; font-weight: 700; cursor: pointer; }
  .botones .compartir { flex: 0 0 auto; padding-inline: 20px; background: var(--primario); color: ${esColorClaro(marca.colorPrimario) ? '#2b2622' : '#fff'}; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<header>
  ${logo}
  ${mostrarNombre ? `<h1>${escaparHtml(marca.nombre)}</h1>` : ''}
  <p>${escaparHtml(meta.evento || evento.nombre)}</p>
</header>
<main>
${tarjetas}
</main>
<p class="ayuda">¿No se descarga? Mantén presionada la foto y elige “Guardar imagen”.</p>
<script>
  // compartir directo a WhatsApp, Instagram… (sólo en celulares que lo permiten)
  for (const b of document.querySelectorAll('.compartir')) {
    if (!navigator.canShare) continue;
    b.hidden = false;
    b.addEventListener('click', async () => {
      try {
        const blob = await (await fetch(b.dataset.url)).blob();
        const archivo = new File([blob], b.dataset.nombre, { type: blob.type });
        if (navigator.canShare({ files: [archivo] })) await navigator.share({ files: [archivo] });
        else await navigator.share({ url: location.href });
      } catch (e) { /* el invitado canceló */ }
    });
  }
</script>
</body>
</html>`;
}

function paginaNoEncontrada(config) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(config.marca.nombre)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:"Segoe UI",system-ui,sans-serif;background:${escaparHtml(config.marca.colorFondo)};color:${esColorClaro(config.marca.colorFondo) ? '#2b2622' : '#fff'};text-align:center;padding:24px}</style>
</head><body><div><h1>Sesión no encontrada</h1><p>Pide a la persona de la cabina que te muestre el código QR otra vez.</p></div></body></html>`;
}

// ---------------------------------------------------------------- rutas

function leerRuta(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = decodeURIComponent(url.pathname);
  return { url, ruta, metodo: req.method, partes: ruta.split('/').filter(Boolean) };
}

/**
 * Rutas públicas: la página de descarga de cada sesión, sus archivos y la marca.
 * Es lo único que ven los invitados (en el Wi-Fi o por internet).
 * @returns {boolean} true si la petición era pública y ya se respondió
 */
function manejarPublico(req, res, { url, metodo, partes }) {
  const lectura = metodo === 'GET' || metodo === 'HEAD';

  if (metodo === 'GET' && partes[0] === 'g' && partes.length === 2) {
    const config = leerConfig();
    const sesion = ID_VALIDO.test(partes[1]) && sesiones.get(partes[1]);
    res.writeHead(sesion ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(sesion ? paginaGaleria(config, partes[1], sesion) : paginaNoEncontrada(config));
    return true;
  }

  if (lectura && partes[0] === 'm' && partes.length === 3) {
    const [, id, archivo] = partes;
    const sesion = ID_VALIDO.test(id) && ARCHIVO_VALIDO.test(archivo) && sesiones.get(id);
    if (!sesion) {
      enviarError(res, 404, 'No encontrado');
      return true;
    }
    const extra = url.searchParams.has('descargar')
      ? { 'Content-Disposition': `attachment; filename="${slug(leerConfig().marca.nombre)}-${archivo}"` }
      : {};
    enviarArchivo(req, res, path.join(sesion.dir, archivo), extra);
    return true;
  }

  if (lectura && partes[0] === 'recursos' && partes.length === 2) {
    if (RECURSO_VALIDO.test(partes[1])) enviarArchivo(req, res, path.join(RECURSOS, partes[1]));
    else enviarError(res, 404, 'No encontrado');
    return true;
  }

  // logotipo, icono y animación de la marca (también los ve el celular del invitado)
  if (lectura && partes[0] === 'marca' && partes.length === 2) {
    if (/^[a-z0-9_-]{1,60}\.(png|jpg|webp|svg|mp4|webm)$/.test(partes[1])) enviarArchivo(req, res, path.join(PUBLICO, 'marca', partes[1]));
    else enviarError(res, 404, 'No encontrado');
    return true;
  }

  return false;
}

/** Servidor principal (puerto 5050): la cabina completa, sólo desde esta computadora. */
async function manejar(req, res) {
  const peticion = leerRuta(req);
  if (manejarPublico(req, res, peticion)) return;
  const { url, ruta, metodo, partes } = peticion;

  // ---- de aquí en adelante, sólo desde esta computadora

  if (!esLocal(req)) {
    return enviarError(res, 403, 'Sólo disponible en la computadora de la cabina');
  }

  if (partes[0] === 'api') {
    return manejarApi(req, res, metodo, partes.slice(1), url);
  }

  if (metodo !== 'GET' && metodo !== 'HEAD') return enviarError(res, 405, 'Método no permitido');

  // archivos estáticos de la interfaz
  const destino = path.normalize(path.join(PUBLICO, ruta === '/' ? 'index.html' : ruta));
  if (!destino.startsWith(PUBLICO + path.sep)) return enviarError(res, 403, 'Prohibido');
  return enviarArchivo(req, res, destino);
}

/** Servidor público (puerto 5051): SÓLO fotos y marca. Es el que se publica en internet. */
function manejarSoloPublico(req, res) {
  const peticion = leerRuta(req);
  if (peticion.partes[0] === 'salud' && peticion.partes.length === 1) {
    // la cabina se consulta a sí misma por internet para saber que el enlace sirve
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end('ok');
    return;
  }
  if (manejarPublico(req, res, peticion)) return;
  if (peticion.partes.length === 0) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(paginaNoEncontrada(leerConfig()));
    return;
  }
  enviarError(res, 404, 'No encontrado');
}

async function manejarApi(req, res, metodo, partes, url) {
  const [recurso, id, extra] = partes;

  if (recurso === 'config') {
    if (metodo === 'GET') return enviarJSON(res, 200, leerConfig());
    if (metodo === 'PUT') {
      const antes = leerConfig();
      const config = guardarConfig(await leerJSON(req));
      log('Configuración guardada');
      aplicarCambioInternet(antes, config);
      if (nubeLista(config)) reintentarNube(); // quizá se corrigió el cloud name o el preset
      return enviarJSON(res, 200, config);
    }
  }

  // ---- panel "Estado": todo lo que hay que revisar antes y durante el evento
  if (recurso === 'estado-sistema' && metodo === 'GET') {
    const config = leerConfig();
    const eventoSlug = slug(config.evento.nombre);
    let sesionesEvento = 0;
    for (const { meta } of sesiones.values()) if (meta.eventoSlug === eventoSlug) sesionesEvento++;
    return enviarJSON(res, 200, {
      impresora: await consultarImpresora(),
      disco: espacioEnDisco(),
      camara: estadoCamara,
      tunel: {
        estado: tunel.estado,
        detalle: tunel.detalle,
        url: enlaceVerificado() ? tunel.url : '',
        verificadoHace: tunel.verificado ? Math.round((Date.now() - tunel.verificado) / 1000) : null,
      },
      nube: resumenNube(config),
      papel: { ...leerPapel(), controlar: Boolean(config.impresion.controlarPapel), aviso: config.impresion.avisoPapel },
      sesiones: { total: sesiones.size, evento: sesionesEvento },
      respaldo: { carpeta: carpetaRespaldo(config), ...estadoRespaldo },
      arrancado: INICIO,
    });
  }

  if (recurso === 'papel') {
    if (metodo === 'GET') return enviarJSON(res, 200, leerPapel());
    if (metodo === 'PUT') {
      const { restante } = await leerJSON(req);
      const n = Math.max(0, Math.min(100000, Math.round(Number(restante) || 0)));
      log(`Papel cargado: ${n} hojas`);
      return enviarJSON(res, 200, guardarPapel({ restante: n, cargado: n }));
    }
  }

  // abre un enlace por internet nuevo (por si el actual dejó de funcionar)
  if (recurso === 'tunel' && id === 'reiniciar' && metodo === 'POST') {
    if (leerConfig().compartir.internet === false) return enviarError(res, 400, 'El QR por internet está apagado en los ajustes');
    log('Renovando el enlace por internet (pedido desde los ajustes)');
    Object.assign(tunel, { estado: 'reconectando', detalle: 'Renovando el enlace…', intentos: 0 });
    if (tunel.proceso) {
      tunel.reiniciando = true;
      tunel.proceso.kill();
    } else {
      iniciarTunel();
    }
    return enviarJSON(res, 200, { ok: true });
  }

  // lista de contactos del evento (formulario) en un archivo para Excel
  if (recurso === 'contactos' && metodo === 'POST') {
    const eventoSlug = slug(leerConfig().evento.nombre);
    const { datos, filas } = contactosCsv(eventoSlug);
    if (!filas) return enviarError(res, 404, 'Todavía nadie ha dejado sus datos en este evento');
    const carpeta = path.join(DATOS, 'exportaciones');
    await fsp.mkdir(carpeta, { recursive: true });
    const destino = path.join(carpeta, `${eventoSlug}-contactos-${new Date().toISOString().slice(0, 10)}.csv`);
    await escribirAtomico(destino, datos);
    if (process.platform === 'win32') spawn('explorer.exe', ['/select,', destino], { detached: true, stdio: 'ignore' }).unref();
    return enviarJSON(res, 200, { archivo: path.basename(destino), filas });
  }

  if (recurso === 'respaldo' && id === 'sincronizar' && metodo === 'POST') {
    const copiados = await sincronizarRespaldo(leerConfig(), slug(leerConfig().evento.nombre));
    log(`Respaldo sincronizado: ${copiados} archivos copiados`);
    return enviarJSON(res, 200, { copiados });
  }

  // guarda todo el evento en un ZIP ordenado (para entregarlo al cliente)
  if (recurso === 'exportar' && metodo === 'POST') {
    const cuerpo = await leerJSON(req);
    const eventoSlug = cuerpo.evento ? slug(cuerpo.evento) : slug(leerConfig().evento.nombre);
    log(`Exportando el evento ${eventoSlug}…`);
    const r = await exportarEvento(eventoSlug);
    log(`Evento exportado: ${r.destino} (${r.archivos} archivos)`);
    if (process.platform === 'win32') spawn('explorer.exe', ['/select,', r.destino], { detached: true, stdio: 'ignore' }).unref();
    return enviarJSON(res, 200, { ...r, archivo: path.basename(r.destino) });
  }

  // estado de la cámara que reporta la cabina (para diagnosticar problemas)
  if (recurso === 'camara') {
    if (metodo === 'POST') {
      const datos = await leerJSON(req);
      estadoCamara = { ...datos, hora: new Date().toISOString() };
      log(datos.demo
        ? `Cámara: DEMOSTRACIÓN (${datos.error || 'sin cámara'}) · detectadas: ${(datos.camaras || []).join(', ') || 'ninguna'}`
        : `Cámara en uso: ${datos.nombre} (${datos.resolucion || '?'})`);
      return enviarJSON(res, 200, { ok: true });
    }
    if (metodo === 'GET') return enviarJSON(res, 200, estadoCamara || {});
  }

  if (recurso === 'red' && metodo === 'GET') {
    const config = leerConfig();
    return enviarJSON(res, 200, {
      ips: ipsLocales(),
      puerto: PUERTO,
      urlBase: urlBase(config),
      urlPublica: config.compartir.internet !== false && enlaceVerificado() ? tunel.url : '',
      tunel: {
        estado: tunel.estado,
        detalle: tunel.detalle,
        verificadoHace: tunel.verificado ? Math.round((Date.now() - tunel.verificado) / 1000) : null,
      },
    });
  }

  if (recurso === 'estadisticas' && metodo === 'GET') {
    const config = leerConfig();
    const eventoSlug = slug(config.evento.nombre);
    const estad = { total: 0, evento: 0, impresiones: 0, impresionesEvento: 0, porModo: {}, porModoEvento: {}, porHora: {}, contactos: 0 };
    for (const { meta } of sesiones.values()) {
      estad.total += 1;
      estad.impresiones += meta.impresiones || 0;
      estad.porModo[meta.modo] = (estad.porModo[meta.modo] || 0) + 1;
      if (meta.eventoSlug === eventoSlug) {
        estad.evento += 1;
        estad.impresionesEvento += meta.impresiones || 0;
        estad.porModoEvento[meta.modo] = (estad.porModoEvento[meta.modo] || 0) + 1;
        // sesiones por hora del día (para ver los momentos de más movimiento)
        const hora = new Date(meta.fecha).getHours();
        estad.porHora[hora] = (estad.porHora[hora] || 0) + 1;
        if (meta.datos) estad.contactos += 1;
      }
    }
    return enviarJSON(res, 200, estad);
  }

  // la aplicación (Sonria Pues.exe) lo llama al cerrar la cabina: cierra el enlace por internet y se apaga
  if (recurso === 'apagar' && metodo === 'POST') {
    log('Cerrando Sonría Pues…');
    enviarJSON(res, 200, { ok: true });
    setTimeout(() => {
      cerrarTunel();
      process.exit(0);
    }, 300);
    return;
  }

  if (recurso === 'abrir-carpeta' && metodo === 'POST') {
    const config = leerConfig();
    const carpeta = path.join(FOTOS, slug(config.evento.nombre));
    fs.mkdirSync(carpeta, { recursive: true });
    spawn('explorer.exe', [carpeta], { detached: true, stdio: 'ignore' }).unref();
    return enviarJSON(res, 200, { carpeta });
  }

  if (recurso === 'recursos' && id && ID_RECURSO.test(id)) {
    if (metodo === 'PUT') {
      const tipo = String(req.headers['content-type'] || '');
      const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('jpeg') ? 'jpg' : null;
      if (!ext) return enviarError(res, 415, 'Usa una imagen PNG, JPG o WEBP');
      const datos = await leerCuerpo(req, 25 * MB);
      for (const viejo of await fsp.readdir(RECURSOS)) {
        if (viejo.startsWith(id + '.')) await fsp.unlink(path.join(RECURSOS, viejo)).catch(() => {});
      }
      await escribirAtomico(path.join(RECURSOS, `${id}.${ext}`), datos);
      return enviarJSON(res, 200, { url: `/recursos/${id}.${ext}?v=${Date.now()}` });
    }
    if (metodo === 'DELETE') {
      for (const viejo of await fsp.readdir(RECURSOS)) {
        if (viejo.startsWith(id + '.')) await fsp.unlink(path.join(RECURSOS, viejo)).catch(() => {});
      }
      return enviarJSON(res, 200, { ok: true });
    }
  }

  if (recurso === 'disenos') {
    if (metodo === 'GET' && !id) return enviarJSON(res, 200, listarDisenos());
    if (!id || !ID_DISENO.test(id)) return enviarError(res, 400, 'Identificador de diseño inválido');
    const archivoMeta = path.join(DISENOS, `${id}.json`);

    if (extra === 'imagen') {
      if (metodo === 'GET' || metodo === 'HEAD') {
        const imagen = imagenDeDiseno(id);
        if (!imagen) return enviarError(res, 404, 'Diseño sin imagen');
        return enviarArchivo(req, res, path.join(DISENOS, imagen));
      }
      if (metodo === 'PUT') {
        const tipo = String(req.headers['content-type'] || '');
        const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('jpeg') ? 'jpg' : null;
        if (!ext) return enviarError(res, 415, 'Exporta tu diseño como PNG o JPG');
        const datos = await leerCuerpo(req, 60 * MB);
        await borrarImagenesDeDiseno(id);
        await escribirAtomico(path.join(DISENOS, `${id}.${ext}`), datos);
        return enviarJSON(res, 200, { ok: true });
      }
    }

    if (!extra && metodo === 'PUT') {
      let anterior = null;
      try { anterior = JSON.parse(await fsp.readFile(archivoMeta, 'utf8')); } catch { /* nuevo */ }
      const meta = validarDiseno(id, await leerJSON(req), anterior);
      await escribirAtomico(archivoMeta, JSON.stringify(meta, null, 2));
      log(`Diseño guardado: ${meta.nombre} (${meta.ranuras.length} fotos)`);
      return enviarJSON(res, 200, meta);
    }

    if (!extra && metodo === 'DELETE') {
      const marca = Date.now();
      for (const archivo of [`${id}.json`, imagenDeDiseno(id)].filter(Boolean)) {
        await fsp.rename(path.join(DISENOS, archivo), path.join(PAPELERA, `diseno-${marca}__${archivo}`)).catch(() => {});
      }
      log(`Diseño ${id} enviado a la papelera`);
      return enviarJSON(res, 200, { ok: true });
    }
  }

  if (recurso === 'nube') {
    // estado de la subida a internet (para los ajustes)
    if (metodo === 'GET' && id === 'estado') return enviarJSON(res, 200, resumenNube(leerConfig()));

    // prueba con los datos escritos en los ajustes (aunque todavía no se guarden)
    if (metodo === 'POST' && id === 'probar') {
      try {
        return enviarJSON(res, 200, await probarNube(await leerJSON(req)));
      } catch (err) {
        return enviarJSON(res, 200, { ok: false, error: err.message });
      }
    }

    if (metodo === 'POST' && id === 'reintentar') {
      reintentarNube();
      return enviarJSON(res, 200, { enCola: colaNube.length });
    }
    // guardar en internet también las sesiones anteriores (todas las de todos los eventos)
    if (metodo === 'POST' && id === 'subir-anteriores') {
      const config = leerConfig();
      if (!nubeLista(config)) return enviarError(res, 400, 'Primero configura Cloudinary en Impresión y QR');
      let nuevas = 0;
      const lista = [...sesiones.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)); // las más recientes primero
      for (const [sid, sesion] of lista) {
        if (sesion.meta.nube?.completo) continue;
        prepararEnNube(config, sid, sesion);
        sesion.meta.nube.proximo = 0;
        encolarNube(sid);
        await guardarMeta(sesion);
        nuevas++;
      }
      procesarColaNube();
      log(`Guardando en internet ${nuevas} sesiones anteriores`);
      return enviarJSON(res, 200, { encoladas: nuevas });
    }
  }

  if (recurso === 'sesiones') {
    // listar sesiones (más recientes primero)
    if (metodo === 'GET' && !id) {
      const config = leerConfig();
      const soloEvento = url.searchParams.get('evento') !== 'todos';
      const limite = Math.min(Number(url.searchParams.get('limite')) || 60, 500);
      const eventoSlug = slug(config.evento.nombre);
      const lista = [...sesiones.entries()]
        .filter(([, s]) => !soloEvento || s.meta.eventoSlug === eventoSlug)
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, limite)
        .map(([sid, s]) => resumenSesion(sid, s));
      return enviarJSON(res, 200, lista);
    }

    // crear sesión
    if (metodo === 'POST' && !id) {
      const cuerpo = await leerJSON(req);
      const config = leerConfig();
      const nuevo = nuevoId();
      const eventoSlug = slug(config.evento.nombre);
      const dir = path.join(FOTOS, eventoSlug, nuevo);
      await fsp.mkdir(dir, { recursive: true });
      const sesion = {
        dir,
        meta: {
          id: nuevo,
          evento: config.evento.nombre,
          eventoSlug,
          fecha: new Date().toISOString(),
          modo: String(cuerpo.modo || 'foto').slice(0, 20),
          plantilla: String(cuerpo.plantilla || '').slice(0, 80),
          filtro: String(cuerpo.filtro || '').slice(0, 40),
          principal: ARCHIVO_VALIDO.test(cuerpo.principal || '') ? cuerpo.principal : '',
          archivos: [],
          impresiones: 0,
        },
      };
      const datosInvitado = limpiarDatosInvitado(cuerpo.datos);
      if (datosInvitado) sesion.meta.datos = datosInvitado;
      await guardarMeta(sesion);
      sesiones.set(nuevo, sesion);
      log(`Nueva sesión ${nuevo} (${sesion.meta.modo})`);
      const base = urlDescarga(config);
      return enviarJSON(res, 201, { id: nuevo, url: `${base}/g/${nuevo}`, publica: Boolean(tunel.url) && base === tunel.url });
    }

    const sesion = id && ID_VALIDO.test(id) && sesiones.get(id);
    if (!sesion) return enviarError(res, 404, 'Sesión no encontrada');

    // subir un archivo a la sesión
    if (metodo === 'PUT' && extra) {
      if (!ARCHIVO_VALIDO.test(extra)) return enviarError(res, 400, 'Nombre de archivo inválido');
      const datos = await leerCuerpo(req, 300 * MB);
      await escribirAtomico(path.join(sesion.dir, extra), datos);
      respaldarArchivo(leerConfig(), sesion, extra); // en segundo plano
      sesion.meta.archivos = sesion.meta.archivos.filter((a) => a.nombre !== extra);
      sesion.meta.archivos.push({ nombre: extra, tipo: tipoDeArchivo(extra), bytes: datos.length });
      if (!sesion.meta.principal && !ARCHIVOS_INTERNOS.has(extra)) sesion.meta.principal = extra;
      await guardarMeta(sesion);
      return enviarJSON(res, 200, { ok: true, bytes: datos.length });
    }

    // Antes de armar la impresión: reserva el enlace permanente con los archivos que
    // se van a guardar, para poder imprimir el QR en la foto misma.
    if (metodo === 'POST' && extra === 'reservar') {
      const config = leerConfig();
      if (!nubeLista(config)) return enviarJSON(res, 200, { permanente: false });
      const { archivos } = await leerJSON(req);
      const nombres = (Array.isArray(archivos) ? archivos : []).filter((n) => ARCHIVO_VALIDO.test(n));
      const enlace = prepararEnNube(config, id, sesion, nombres);
      await guardarMeta(sesion);
      return enviarJSON(res, 200, { permanente: Boolean(enlace), url: enlace });
    }

    // la cabina terminó de subir los archivos: si hay nube, se guarda en internet y
    // se devuelve el enlace permanente para el QR
    if (metodo === 'POST' && extra === 'listo') {
      const config = leerConfig();
      if (!nubeLista(config)) return enviarJSON(res, 200, { permanente: false });
      const enlace = prepararEnNube(config, id, sesion);
      sesion.meta.nube.proximo = 0;
      encolarNube(id, true);
      await guardarMeta(sesion);
      procesarColaNube();
      return enviarJSON(res, 200, { permanente: Boolean(enlace), url: enlace });
    }

    // registrar impresiones (y descontar el papel)
    if (metodo === 'POST' && extra === 'impresiones') {
      const { copias } = await leerJSON(req);
      const n = Math.max(1, Math.min(Number(copias) || 1, 20));
      sesion.meta.impresiones = (sesion.meta.impresiones || 0) + n;
      await guardarMeta(sesion);
      let papel = leerPapel();
      if (leerConfig().impresion.controlarPapel) papel = guardarPapel({ ...papel, restante: Math.max(0, papel.restante - n) });
      return enviarJSON(res, 200, { impresiones: sesion.meta.impresiones, papel });
    }

    // eliminar (se mueve a la papelera, no se borra)
    if (metodo === 'DELETE' && !extra) {
      const destino = path.join(PAPELERA, `${sesion.meta.eventoSlug}__${id}`);
      await moverConReintentos(sesion.dir, destino);
      sesiones.delete(id);
      if (colaNube.includes(id)) colaNube.splice(colaNube.indexOf(id), 1);
      log(`Sesión ${id} enviada a la papelera`);
      return enviarJSON(res, 200, { ok: true });
    }
  }

  return enviarError(res, 404, 'Ruta desconocida');
}

// ---------------------------------------------------------------- enlace por internet
//
// Con "cloudflared" (programa gratuito de Cloudflare, sin cuenta) se abre un
// enlace público https://….trycloudflare.com hacia el servidor público (sólo
// fotos). Así el QR funciona con datos móviles o desde cualquier Wi-Fi.
// El enlace cambia cada vez que se abre el programa; no hace falta configurar nada.

const ARCHIVO_PID_TUNEL = path.join(DATOS, 'tunel.pid');

function rutaCloudflared() {
  for (const nombre of ['cloudflared.exe', 'cloudflared']) {
    const ruta = path.join(HERRAMIENTAS, nombre);
    if (fs.existsSync(ruta)) return ruta;
  }
  return 'cloudflared'; // instalado en Windows (en el PATH)
}

/** Cierra un túnel que haya quedado abierto de una ejecución anterior. */
function cerrarTunelAnterior() {
  try {
    const pid = Number(fs.readFileSync(ARCHIVO_PID_TUNEL, 'utf8'));
    // taskkill con filtro: sólo cierra ese número de proceso si de verdad es cloudflared
    // (Windows reutiliza los números; así nunca se cierra otro programa por error)
    if (pid && process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/FI', 'IMAGENAME eq cloudflared.exe', '/F'], { windowsHide: true });
    }
  } catch {
    // no había túnel anterior
  }
  fs.rmSync(ARCHIVO_PID_TUNEL, { force: true });
}

function iniciarTunel() {
  if (leerConfig().compartir.internet === false) {
    Object.assign(tunel, { estado: 'apagado', url: '', detalle: 'Desactivado en los ajustes' });
    return;
  }
  Object.assign(tunel, { estado: 'conectando', url: '', detalle: '' });

  const proceso = spawn(rutaCloudflared(), [
    'tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${PUERTO_PUBLICO}`,
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  tunel.proceso = proceso;

  const leer = (datos) => {
    const texto = datos.toString();
    const enlace = texto.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (enlace && !tunel.url) {
      // todavía no se usa: primero hay que comprobar que responde desde internet
      Object.assign(tunel, { url: enlace[0], estado: 'verificando', detalle: '', intentos: 0, verificado: 0, nacio: Date.now(), fallos: 0 });
      log(`Enlace por internet creado, comprobando: ${tunel.url}`);
      prepararDnsCloudflare().finally(() => setTimeout(comprobarTunel, 3000));
    }
    const falla = texto.match(/ERR[^\n]*(failed|error)[^\n]*/i);
    if (falla && !tunel.url) tunel.detalle = falla[0].slice(0, 200);
  };
  proceso.stdout.on('data', leer);
  proceso.stderr.on('data', leer);
  if (proceso.pid) fs.writeFileSync(ARCHIVO_PID_TUNEL, String(proceso.pid));

  proceso.on('error', (err) => {
    tunel.proceso = null;
    if (err.code === 'ENOENT') {
      Object.assign(tunel, { estado: 'falta-programa', detalle: 'Falta cloudflared.exe en la carpeta "herramientas"' });
      log('Enlace por internet: falta cloudflared.exe (el QR funcionará sólo en el Wi-Fi del evento)');
    } else {
      Object.assign(tunel, { estado: 'error', detalle: err.message });
    }
  });

  proceso.on('exit', () => {
    tunel.proceso = null;
    fs.rmSync(ARCHIVO_PID_TUNEL, { force: true });
    if (tunel.cerrando || tunel.estado === 'falta-programa' || tunel.estado === 'apagado') return;
    if (tunel.reiniciando) {
      // lo cerramos a propósito porque dejó de responder: se abre uno nuevo enseguida
      tunel.reiniciando = false;
      Object.assign(tunel, { url: '', estado: 'reconectando' });
      setTimeout(iniciarTunel, 1000);
      return;
    }
    // se cayó (sin internet, por ejemplo): se reintenta cada vez con más espera
    tunel.intentos += 1;
    Object.assign(tunel, { url: '', estado: 'reconectando' });
    const espera = Math.min(60, 5 * tunel.intentos);
    log(`Enlace por internet caído; reintento en ${espera} s`);
    setTimeout(iniciarTunel, espera * 1000);
  });
}

/** Prende o apaga el enlace por internet al momento, sin reiniciar el programa. */
function aplicarCambioInternet(antes, despues) {
  const estabaPrendido = antes.compartir.internet !== false;
  const quedaPrendido = despues.compartir.internet !== false;
  if (estabaPrendido === quedaPrendido) return;
  if (!quedaPrendido) {
    log('QR por internet apagado desde los ajustes');
    Object.assign(tunel, { estado: 'apagado', url: '', detalle: 'Desactivado en los ajustes' });
    tunel.proceso?.kill();
  } else if (!tunel.proceso) {
    log('QR por internet encendido desde los ajustes');
    tunel.intentos = 0;
    iniciarTunel();
  }
}

function cerrarTunel() {
  tunel.cerrando = true;
  tunel.proceso?.kill();
  fs.rmSync(ARCHIVO_PID_TUNEL, { force: true });
}

/**
 * Comprueba desde internet que el enlace responda (igual que lo haría un
 * celular: DNS público de Cloudflare + HTTPS). Cloudflare a veces da de baja
 * los enlaces rápidos aunque el programa siga abierto; si pasa, se abre otro.
 */
// Para comprobar el enlace NO se usa la memoria de DNS de Windows (guarda hasta
// 15 min los "no existe"). Primero se pregunta directo a los servidores de
// Cloudflare que crean los enlaces (responden al instante, sin memoria vieja) y,
// si no se puede, a DNS públicos.
const dnsPublico = new dns.Resolver();
dnsPublico.setServers(['1.1.1.1', '8.8.8.8']);
let dnsCloudflare = null;

async function prepararDnsCloudflare() {
  if (dnsCloudflare) return;
  try {
    const nombres = await dns.promises.resolveNs('trycloudflare.com');
    const ips = (await Promise.all(nombres.map((n) => dns.promises.resolve4(n).catch(() => [])))).flat();
    if (!ips.length) return;
    dnsCloudflare = new dns.Resolver({ timeout: 3000, tries: 2 });
    dnsCloudflare.setServers(ips.slice(0, 4));
  } catch {
    // sin esto se usan los DNS públicos
  }
}

function buscarEnDnsPublico(nombre, opciones, listo) {
  const responder = (direcciones) => {
    if (opciones?.all) return listo(null, direcciones.map((address) => ({ address, family: 4 })));
    return listo(null, direcciones[0], 4);
  };
  const conPublico = () => dnsPublico.resolve4(nombre, (err, direcciones) => {
    if (err || !direcciones?.length) return listo(err || new Error('El enlace no existe en internet'));
    responder(direcciones);
  });
  if (!dnsCloudflare) return conPublico();
  dnsCloudflare.resolve4(nombre, (err, direcciones) => {
    if (err || !direcciones?.length) return conPublico();
    responder(direcciones);
  });
}

function comprobarTunel() {
  if (!tunel.url || tunel.comprobando || tunel.cerrando) return;
  tunel.comprobando = true;
  const url = tunel.url;
  const peticion = https.get(`${url}/salud?t=${Date.now()}`, { timeout: 10000, lookup: buscarEnDnsPublico }, (res) => {
    res.resume();
    terminar(res.statusCode === 200);
  });
  peticion.on('timeout', () => peticion.destroy(new Error('sin respuesta')));
  peticion.on('error', () => terminar(false));

  let listo = false;
  function terminar(ok) {
    if (listo) return;
    listo = true;
    tunel.comprobando = false;
    if (url !== tunel.url) return; // mientras tanto se cambió de enlace

    if (ok) {
      if (tunel.estado !== 'activo') log(`Enlace por internet listo: ${url}`);
      Object.assign(tunel, { estado: 'activo', verificado: Date.now(), fallos: 0, detalle: '' });
      return;
    }

    // uno recién creado puede tardar en aparecer en internet (DNS): se espera hasta 2 minutos
    if (tunel.estado === 'verificando' && Date.now() - tunel.nacio < 120 * 1000) {
      setTimeout(comprobarTunel, 4000);
      return;
    }
    tunel.fallos += 1;
    if (tunel.estado === 'activo' && tunel.fallos < 3) return; // un fallo aislado no basta
    log(`El enlace por internet dejó de responder (${url}); abriendo uno nuevo`);
    Object.assign(tunel, { estado: 'reconectando', detalle: 'El enlace anterior dejó de responder' });
    tunel.reiniciando = true;
    if (tunel.proceso) tunel.proceso.kill();
    else setTimeout(iniciarTunel, 1000);
  }
}

// vigilancia permanente del enlace
setInterval(comprobarTunel, 30 * 1000);

// al cerrar la ventana del servidor (SIGHUP en Windows) o con Ctrl+C, se cierra también el túnel
for (const senal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(senal, () => {
    cerrarTunel();
    process.exit(0);
  });
}
process.on('exit', cerrarTunel);

// ---------------------------------------------------------------- arranque

indexarSesiones();

// sesiones que quedaron a medio subir la última vez: se retoman solas (las más recientes primero)
for (const [id, { meta }] of [...sesiones].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
  if (!meta.nube || meta.nube.completo) continue;
  meta.nube.proximo = 0;
  colaNube.push(id);
}
if (colaNube.length) setTimeout(procesarColaNube, 5000);

const alFallar = (res) => (err) => {
  log('Error:', err.message);
  if (!res.headersSent) enviarError(res, err.codigo || 500, err.message || 'Error interno');
  else res.destroy();
};

const servidor = http.createServer((req, res) => {
  manejar(req, res).catch(alFallar(res));
});

// sólo escucha dentro de esta computadora: le llega el túnel, nadie más
const servidorPublico = http.createServer((req, res) => {
  try {
    manejarSoloPublico(req, res);
  } catch (err) {
    alFallar(res)(err);
  }
});

servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Sonría PJs ya está funcionando en el puerto ${PUERTO}.`);
    process.exit(0);
  }
  throw err;
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  const config = leerConfig();
  console.log('');
  console.log('  ███ Sonría PJs ███');
  console.log(`  Cabina:            http://localhost:${PUERTO}`);
  console.log(`  QR en el Wi-Fi:    ${urlBase(config)}/g/<sesión>`);
  console.log('  QR por internet:   abriendo enlace de Cloudflare…');
  console.log(`  Fotos guardadas en ${FOTOS}`);
  console.log(`  Sesiones registradas: ${sesiones.size}`);
  console.log('');

  servidorPublico.listen(PUERTO_PUBLICO, '127.0.0.1', () => {
    cerrarTunelAnterior();
    iniciarTunel();
  });
});
