/*
 * Modo web: la misma cabina, pero funcionando sin el servidor de la computadora
 * (por ejemplo publicada en GitHub Pages).
 *
 * Reemplaza las llamadas al servidor por almacenamiento en el propio navegador:
 *   - los ajustes y los diseños se guardan en el dispositivo (localStorage),
 *   - las sesiones no se guardan en disco: el invitado descarga su recuerdo,
 *   - si está configurada la nube, el código QR sigue funcionando igual.
 */

const CLAVE_CONFIG = 'sonriaPues.config';
const CLAVE_DISENOS = 'sonriaPues.disenos';
const CLAVE_RECURSOS = 'sonriaPues.recursos';

let configBase = null;
/** Archivos de la última sesión, para poder descargarlos. */
export const ultimaSesion = { archivos: new Map() };

const leerJson = (clave, porDefecto) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? porDefecto;
  } catch {
    return porDefecto;
  }
};

const guardarJson = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false; // sin espacio o en modo privado: se sigue sin guardar
  }
};

function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mezclar(base, extra) {
  const salida = structuredClone(base);
  if (!esObjeto(extra)) return salida;
  for (const [clave, valor] of Object.entries(extra)) {
    if (!(clave in base)) continue;
    salida[clave] = esObjeto(base[clave]) ? mezclar(base[clave], valor) : valor;
  }
  return salida;
}

const aDataUrl = (blob) => new Promise((resolve) => {
  const lector = new FileReader();
  lector.onload = () => resolve(lector.result);
  lector.readAsDataURL(blob);
});

/**
 * ¿Hay servidor de la cabina detrás de esta página?
 * @returns {Promise<boolean>} true si hay que usar el modo web
 */
export async function detectarModoWeb() {
  try {
    const res = await fetch('api/config', { headers: { Accept: 'application/json' } });
    if (!res.ok) return true;
    configBase = await res.json();
    return false;
  } catch {
    return true;
  }
}

/** Configuración de fábrica (config.default.json, que vive junto al programa). */
async function configDeFabrica() {
  if (configBase) return configBase;
  try {
    configBase = await (await fetch('../config.default.json')).json();
  } catch {
    configBase = {};
  }
  return configBase;
}

/**
 * Responde igual que el servidor, pero usando el navegador.
 * @param {string} ruta  p. ej. '/api/config'
 * @param {{method?: string, json?: any, body?: any}} opciones
 */
export async function apiWeb(ruta, { method = 'GET', json, body } = {}) {
  const camino = ruta.split('?')[0].replace(/^\//, '').split('/'); // ['api', 'config', ...]
  const [, recurso, id, extra] = camino;

  if (recurso === 'config') {
    const fabrica = await configDeFabrica();
    if (method === 'PUT') {
      guardarJson(CLAVE_CONFIG, json);
      return mezclar(fabrica, json);
    }
    const guardada = leerJson(CLAVE_CONFIG, {});
    const config = mezclar(fabrica, guardada);
    config.textos = guardada.textos || {};
    return config;
  }

  if (recurso === 'red') return { ips: [], puerto: 0, urlBase: location.origin };

  if (recurso === 'camara') return { ok: true };

  if (recurso === 'disenos') {
    const disenos = leerJson(CLAVE_DISENOS, []);
    if (method === 'GET' && !id) return disenos;
    if (method === 'PUT' && extra === 'imagen') {
      const diseno = disenos.find((d) => d.id === id);
      if (diseno) diseno.url = await aDataUrl(body);
      guardarJson(CLAVE_DISENOS, disenos);
      return { ok: true };
    }
    if (method === 'PUT') {
      const anterior = disenos.find((d) => d.id === id);
      const meta = { ...json, id, url: anterior?.url || '', creado: anterior?.creado || new Date().toISOString() };
      const resto = disenos.filter((d) => d.id !== id);
      if (!guardarJson(CLAVE_DISENOS, [meta, ...resto])) {
        throw new Error('No hay espacio en este dispositivo para guardar el diseño');
      }
      return meta;
    }
    if (method === 'DELETE') {
      guardarJson(CLAVE_DISENOS, disenos.filter((d) => d.id !== id));
      return { ok: true };
    }
  }

  if (recurso === 'recursos') {
    const recursos = leerJson(CLAVE_RECURSOS, {});
    if (method === 'PUT') {
      recursos[id] = await aDataUrl(body);
      guardarJson(CLAVE_RECURSOS, recursos);
      return { url: recursos[id] };
    }
    if (method === 'DELETE') {
      delete recursos[id];
      guardarJson(CLAVE_RECURSOS, recursos);
      return { ok: true };
    }
  }

  if (recurso === 'sesiones') {
    if (method === 'POST' && !id) {
      ultimaSesion.archivos.clear();
      return { id: `web-${Date.now()}`, url: '' };
    }
    if (method === 'PUT' && extra) {
      ultimaSesion.archivos.set(extra, body); // se queda en memoria para descargarlo
      return { ok: true };
    }
    if (method === 'GET') return [];
    return { ok: true };
  }

  if (recurso === 'estadisticas') return { total: 0, evento: 0, impresiones: 0, impresionesEvento: 0, porModo: {} };

  return { ok: true };
}
