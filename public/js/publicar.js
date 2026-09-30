/*
 * Administrar desde internet: publica los ajustes y los diseños para todos los
 * celulares directamente en GitHub (la página vive ahí), sin la computadora.
 *
 * Usa un token de GitHub que la dueña o el dueño crea una sola vez y que se
 * guarda SÓLO en su propio dispositivo. Escribe lo mismo que "Publicar en
 * internet" de la cabina de la PC: web/config.json, web/disenos.json y las
 * imágenes en web/disenos/ y web/recursos/.
 */

const API = 'https://api.github.com';
export const REPO_PREDETERMINADO = 'wanna033/sonria-pues-photobooth';
const CLAVE = 'sonriaPues.github';

// ------------------------------------------------------------------ token guardado en este dispositivo

export function leerAcceso() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE)) || {};
    return { token: guardado.token || '', repo: guardado.repo || REPO_PREDETERMINADO };
  } catch {
    return { token: '', repo: REPO_PREDETERMINADO };
  }
}

export function guardarAcceso(acceso) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(acceso));
  } catch { /* modo privado: se usa sólo esta vez */ }
}

export function olvidarAcceso() {
  try {
    localStorage.removeItem(CLAVE);
  } catch { /* nada guardado */ }
}

// ------------------------------------------------------------------ GitHub

function cabeceras(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function errorDeGitHub(res) {
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401) return new Error('El token no es válido o ya venció. Crea uno nuevo en GitHub.');
  if (res.status === 403) return new Error('El token no tiene permiso para escribir. Dale el permiso «Contents: Read and write».');
  if (res.status === 404) return new Error('No se encontró el repositorio, o el token no tiene acceso a él.');
  return new Error(datos.message || `GitHub respondió ${res.status}`);
}

/** Revisa que el token pueda escribir en el repositorio. */
export async function probarAcceso({ token, repo }) {
  const res = await fetch(`${API}/repos/${repo}`, { headers: cabeceras(token), cache: 'no-store' });
  if (!res.ok) throw await errorDeGitHub(res);
  const datos = await res.json();
  if (datos.permissions && !datos.permissions.push) {
    throw new Error('El token puede leer pero no escribir. Dale el permiso «Contents: Read and write».');
  }
  return datos;
}

/** Crea o reemplaza un archivo del repositorio (un commit por archivo). */
async function escribirArchivo({ token, repo }, ruta, base64, mensaje) {
  const url = `${API}/repos/${repo}/contents/${ruta}`;
  for (let intento = 0; intento < 2; intento++) {
    let sha;
    const previo = await fetch(url, { headers: cabeceras(token), cache: 'no-store' });
    if (previo.ok) sha = (await previo.json()).sha;
    else if (previo.status !== 404) throw await errorDeGitHub(previo);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...cabeceras(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mensaje, content: base64, ...(sha ? { sha } : {}) }),
    });
    if (res.ok) return;
    // otro cambio llegó en medio: se vuelve a leer y se intenta otra vez
    if (res.status !== 409 && res.status !== 422) throw await errorDeGitHub(res);
    if (intento === 1) throw await errorDeGitHub(res);
  }
}

/** Texto (UTF-8) a base64, por partes para no desbordar con textos grandes. */
function textoABase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

const EXTENSION = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

function partesDataUrl(url) {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(url);
  return m ? { tipo: m[1], base64: m[2], extension: EXTENSION[m[1]] || 'png' } : null;
}

// ------------------------------------------------------------------ ajustes para los celulares

const slug = (texto) => String(texto || 'evento').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'evento';

function etiquetaNueva(evento) {
  const azar = [...crypto.getRandomValues(new Uint8Array(5))].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sonria_${slug(evento).slice(0, 40)}_${azar}`;
}

/** Igual que en la cabina de la PC: sin PIN, impresora, pantalla verde ni formulario. */
export function configParaCelular(config, fabrica, { disenos, plantillasBasicas }) {
  const c = structuredClone(config);
  c.general = { ...c.general, pin: fabrica.general?.pin || '1234', carpetaRespaldo: '' };
  const nube = config.compartir?.nube || {};
  c.compartir = structuredClone(fabrica.compartir);
  c.compartir.qr = false;
  if (nube.activo && nube.cloudName && nube.preset) {
    Object.assign(c.compartir.nube, {
      activo: true,
      cloudName: nube.cloudName,
      preset: nube.preset,
      urlGaleria: nube.urlGaleria || fabrica.compartir.nube.urlGaleria,
      galeriaCelulares: nube.galeriaCelulares !== false,
      // la misma etiqueta mientras siga siendo el mismo evento (así la galería no se parte)
      etiquetaEvento: /^sonria_[a-z0-9_-]{1,90}$/.test(nube.etiquetaEvento || '') ? nube.etiquetaEvento : etiquetaNueva(c.evento?.nombre),
    });
  }
  if (c.captura) c.captura.camaraId = '';
  if (c.formulario) c.formulario.activo = false;
  c.pantallaVerde = { ...c.pantallaVerde, activo: false, fondos: [] };
  if (c.impresion) c.impresion.habilitada = false;
  const basicas = plantillasBasicas ? fabrica.plantillas.habilitadas : [];
  c.plantillas.habilitadas = [...disenos, ...basicas];
  if (!c.plantillas.habilitadas.length) c.plantillas.habilitadas = [fabrica.plantillas.porDefecto];
  c.plantillas.porDefecto = c.plantillas.habilitadas[0];
  delete c.web;
  return c;
}

/**
 * Publica para todos los celulares.
 * @param {{token:string, repo:string}} acceso
 * @param {object} config los ajustes tal como están en el panel
 * @param {object} fabrica config.default.json
 * @param {object[]} disenos los diseños elegidos (propios de este dispositivo o ya publicados)
 * @param {(texto:string) => void} [alAvanzar]
 */
export async function publicarEnGitHub({ acceso, config, fabrica, disenos, plantillasBasicas, alAvanzar = () => {} }) {
  await probarAcceso(acceso);
  const marca = Date.now();
  const final = configParaCelular(config, fabrica, { disenos: disenos.map((d) => d.id), plantillasBasicas });

  // imágenes de los ajustes (logotipo, fondo, marco…): de "data:" a archivos en web/recursos/
  const recursos = [];
  const recorrer = (valor, ruta) => {
    if (typeof valor === 'string') {
      const partes = valor.startsWith('data:') ? partesDataUrl(valor) : null;
      if (!partes) return valor;
      const nombre = `${ruta.join('-').replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 50)}.${partes.extension}`;
      recursos.push({ ruta: `web/recursos/${nombre}`, base64: partes.base64 });
      return `../web/recursos/${nombre}?v=${marca}`;
    }
    if (Array.isArray(valor)) return valor.map((v, i) => recorrer(v, [...ruta, String(i)]));
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, recorrer(v, [...ruta, k])]));
    }
    return valor;
  };
  const configFinal = recorrer(final, []);

  // diseños: los de este dispositivo se suben; los ya publicados se quedan como están
  const lista = [];
  const imagenes = [];
  for (const d of disenos) {
    const { url, ...meta } = d;
    const partes = String(url || '').startsWith('data:') ? partesDataUrl(url) : null;
    if (partes) {
      const archivo = `${d.id}.${partes.extension}`;
      imagenes.push({ ruta: `web/disenos/${archivo}`, base64: partes.base64 });
      lista.push({ ...meta, url: `../web/disenos/${archivo}?v=${marca}` });
    } else {
      lista.push({ ...meta, url });
    }
  }

  const archivos = [
    ...imagenes,
    ...recursos,
    { ruta: 'web/disenos.json', base64: textoABase64(JSON.stringify(lista, null, 2)) },
    // la configuración al final: así nunca apunta a imágenes que todavía no están
    { ruta: 'web/config.json', base64: textoABase64(JSON.stringify(configFinal, null, 2)) },
  ];
  for (const [i, a] of archivos.entries()) {
    alAvanzar(`Subiendo ${i + 1} de ${archivos.length}…`);
    await escribirArchivo(acceso, a.ruta, a.base64, `Versión para celular: ${a.ruta.replace('web/', '')} (desde el panel en línea)`);
  }
  return { archivos: archivos.length, disenos: lista.length };
}
