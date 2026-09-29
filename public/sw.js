/*
 * Versión para celular: guarda la cabina en el teléfono para que abra aunque
 * no haya señal (salones de eventos con mala cobertura).
 *
 * Siempre se intenta primero internet, así los cambios publicados aparecen
 * enseguida; si no responde en unos segundos, se usa la copia guardada.
 * Sólo se registra en la versión web (en la cabina de la PC no hace falta).
 */

const CACHE = 'sonria-pues-v2';
const ESPERA_MS = 3500;

const BASICOS = [
  './',
  'index.html',
  'css/app.css',
  'manifest.webmanifest',
  'icono.svg',
  'marca/icono.png',
  'marca/logo.png',
  'marca/logo-claro.png',
  'js/app.js',
  'js/ajustes.js',
  'js/camara.js',
  'js/disenos.js',
  'js/filtros.js',
  'js/gif.js',
  'js/gif-trabajador.js',
  'js/nube.js',
  'js/plantillas.js',
  'js/qr.js',
  'js/sonidos.js',
  'js/stickers.js',
  'js/temas.js',
  'js/textos.js',
  'js/web.js',
  '../config.default.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  // sólo lo de este sitio; los videos se piden por partes y no se guardan
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('.mp4')) return;
  e.respondWith(primeroInternet(e));
});

async function primeroInternet(e) {
  const { request } = e;
  const cache = await caches.open(CACHE);
  const clave = request.mode === 'navigate' ? 'index.html' : request;
  const red = fetch(request).then((res) => {
    if (res.ok && res.type === 'basic') e.waitUntil(cache.put(clave, res.clone()));
    return res;
  });
  red.catch(() => {}); // si gana la copia guardada, el error de la red no importa
  const guardada = () => cache.match(clave, { ignoreSearch: true });
  try {
    // con señal débil no se espera para siempre: si hay copia guardada, se usa
    return await Promise.race([
      red,
      new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('lento')), ESPERA_MS)),
    ]);
  } catch {
    return (await guardada()) || red;
  }
}
