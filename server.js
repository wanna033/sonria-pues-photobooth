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
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

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
const ID_VALIDO = /^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$/;
const ARCHIVO_VALIDO = /^[a-z0-9_-]{1,40}\.(jpg|png|gif|webm|mp4)$/;
const RECURSO_VALIDO = /^(logo|logo-claro|fondo)\.(png|jpg|webp)$/;
const ID_DISENO = /^[a-z0-9][a-z0-9-]{2,70}$/;
const EXTENSIONES_IMAGEN = ['png', 'jpg', 'webp'];

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

function leerConfig() {
  try {
    const guardada = JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8'));
    const config = mezclar(CONFIG_BASE, guardada);
    config.textos = limpiarTextos(guardada.textos);
    return config;
  } catch {
    return structuredClone(CONFIG_BASE);
  }
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
  return `${fecha}-${hora}-${crypto.randomBytes(3).toString('hex')}`;
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

function esLocal(req) {
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
    return fs.createReadStream(ruta, { start: inicio, end: fin }).pipe(res);
  }
  res.writeHead(200, { ...cabeceras, 'Content-Length': info.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(ruta).pipe(res);
}

// ---------------------------------------------------------------- sesiones

/** id -> { dir, meta } */
const sesiones = new Map();

/** Último estado de la cámara reportado por la cabina. */
let estadoCamara = null;

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
    archivos: meta.archivos.map((a) => a.nombre),
    impresiones: meta.impresiones || 0,
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

// ---------------------------------------------------------------- página de descarga

function paginaGaleria(config, id, sesion) {
  const { marca, evento } = config;
  const meta = sesion.meta;
  // la principal primero, luego animaciones y videos, y al final las fotos sueltas
  const peso = { gif: 0, video: 1, foto: 2 };
  const resto = meta.archivos.map((a) => a.nombre)
    .filter((n) => n !== meta.principal)
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
    return `<figure class="${i === 0 ? 'principal' : ''}">${medio}
      <a class="boton" href="${url}?descargar=1" download="${escaparHtml(`${slug(marca.nombre)}-${nombre}`)}">${etiqueta}</a></figure>`;
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

async function manejar(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = decodeURIComponent(url.pathname);
  const metodo = req.method;
  const partes = ruta.split('/').filter(Boolean);

  // ---- rutas públicas (invitados en la red Wi-Fi)

  if (metodo === 'GET' && partes[0] === 'g' && partes.length === 2) {
    const config = leerConfig();
    const sesion = ID_VALIDO.test(partes[1]) && sesiones.get(partes[1]);
    res.writeHead(sesion ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(sesion ? paginaGaleria(config, partes[1], sesion) : paginaNoEncontrada(config));
  }

  if ((metodo === 'GET' || metodo === 'HEAD') && partes[0] === 'm' && partes.length === 3) {
    const [, id, archivo] = partes;
    const sesion = ID_VALIDO.test(id) && ARCHIVO_VALIDO.test(archivo) && sesiones.get(id);
    if (!sesion) return enviarError(res, 404, 'No encontrado');
    const extra = url.searchParams.has('descargar')
      ? { 'Content-Disposition': `attachment; filename="${slug(leerConfig().marca.nombre)}-${archivo}"` }
      : {};
    return enviarArchivo(req, res, path.join(sesion.dir, archivo), extra);
  }

  if ((metodo === 'GET' || metodo === 'HEAD') && partes[0] === 'recursos' && partes.length === 2) {
    if (!RECURSO_VALIDO.test(partes[1])) return enviarError(res, 404, 'No encontrado');
    return enviarArchivo(req, res, path.join(RECURSOS, partes[1]));
  }

  // logotipo, icono y animación de la marca (también los ve el celular del invitado)
  if ((metodo === 'GET' || metodo === 'HEAD') && partes[0] === 'marca' && partes.length === 2) {
    if (!/^[a-z0-9_-]{1,60}\.(png|jpg|webp|svg|mp4|webm)$/.test(partes[1])) return enviarError(res, 404, 'No encontrado');
    return enviarArchivo(req, res, path.join(PUBLICO, 'marca', partes[1]));
  }

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

async function manejarApi(req, res, metodo, partes, url) {
  const [recurso, id, extra] = partes;

  if (recurso === 'config') {
    if (metodo === 'GET') return enviarJSON(res, 200, leerConfig());
    if (metodo === 'PUT') {
      const config = guardarConfig(await leerJSON(req));
      log('Configuración guardada');
      return enviarJSON(res, 200, config);
    }
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
    return enviarJSON(res, 200, { ips: ipsLocales(), puerto: PUERTO, urlBase: urlBase(config) });
  }

  if (recurso === 'estadisticas' && metodo === 'GET') {
    const config = leerConfig();
    const eventoSlug = slug(config.evento.nombre);
    const estad = { total: 0, evento: 0, impresiones: 0, impresionesEvento: 0, porModo: {} };
    for (const { meta } of sesiones.values()) {
      estad.total += 1;
      estad.impresiones += meta.impresiones || 0;
      estad.porModo[meta.modo] = (estad.porModo[meta.modo] || 0) + 1;
      if (meta.eventoSlug === eventoSlug) {
        estad.evento += 1;
        estad.impresionesEvento += meta.impresiones || 0;
      }
    }
    return enviarJSON(res, 200, estad);
  }

  if (recurso === 'abrir-carpeta' && metodo === 'POST') {
    const config = leerConfig();
    const carpeta = path.join(FOTOS, slug(config.evento.nombre));
    fs.mkdirSync(carpeta, { recursive: true });
    spawn('explorer.exe', [carpeta], { detached: true, stdio: 'ignore' }).unref();
    return enviarJSON(res, 200, { carpeta });
  }

  if (recurso === 'recursos' && id && /^(logo|logo-claro|fondo)$/.test(id)) {
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
      await guardarMeta(sesion);
      sesiones.set(nuevo, sesion);
      log(`Nueva sesión ${nuevo} (${sesion.meta.modo})`);
      return enviarJSON(res, 201, { id: nuevo, url: `${urlBase(config)}/g/${nuevo}` });
    }

    const sesion = id && ID_VALIDO.test(id) && sesiones.get(id);
    if (!sesion) return enviarError(res, 404, 'Sesión no encontrada');

    // subir un archivo a la sesión
    if (metodo === 'PUT' && extra) {
      if (!ARCHIVO_VALIDO.test(extra)) return enviarError(res, 400, 'Nombre de archivo inválido');
      const datos = await leerCuerpo(req, 300 * MB);
      await escribirAtomico(path.join(sesion.dir, extra), datos);
      sesion.meta.archivos = sesion.meta.archivos.filter((a) => a.nombre !== extra);
      sesion.meta.archivos.push({ nombre: extra, tipo: tipoDeArchivo(extra), bytes: datos.length });
      if (!sesion.meta.principal) sesion.meta.principal = extra;
      await guardarMeta(sesion);
      return enviarJSON(res, 200, { ok: true, bytes: datos.length });
    }

    // registrar impresiones
    if (metodo === 'POST' && extra === 'impresiones') {
      const { copias } = await leerJSON(req);
      sesion.meta.impresiones = (sesion.meta.impresiones || 0) + Math.max(1, Math.min(Number(copias) || 1, 20));
      await guardarMeta(sesion);
      return enviarJSON(res, 200, { impresiones: sesion.meta.impresiones });
    }

    // eliminar (se mueve a la papelera, no se borra)
    if (metodo === 'DELETE' && !extra) {
      const destino = path.join(PAPELERA, `${sesion.meta.eventoSlug}__${id}`);
      await fsp.rename(sesion.dir, destino);
      sesiones.delete(id);
      log(`Sesión ${id} enviada a la papelera`);
      return enviarJSON(res, 200, { ok: true });
    }
  }

  return enviarError(res, 404, 'Ruta desconocida');
}

// ---------------------------------------------------------------- arranque

indexarSesiones();

const servidor = http.createServer((req, res) => {
  manejar(req, res).catch((err) => {
    log('Error:', err.message);
    if (!res.headersSent) enviarError(res, err.codigo || 500, err.message || 'Error interno');
    else res.destroy();
  });
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
  console.log(`  Descargas (QR):    ${urlBase(config)}/g/<sesión>`);
  console.log(`  Fotos guardadas en ${FOTOS}`);
  console.log(`  Sesiones registradas: ${sesiones.size}`);
  console.log('');
});
