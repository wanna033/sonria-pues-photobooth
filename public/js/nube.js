/*
 * Compartir por internet: sube la sesión a Cloudinary (plan gratuito) y arma el
 * enlace de la página de descarga, para que el QR funcione desde datos móviles
 * o desde cualquier otro Wi-Fi, no sólo desde la red del evento.
 *
 * No usa claves secretas: Cloudinary permite "subidas sin firmar" con dos datos
 * públicos que se escriben en Ajustes → Impresión y QR:
 *   - cloudName: el nombre de tu cuenta.
 *   - preset:    el nombre de una "upload preset" en modo Unsigned.
 *
 * Si no hay internet o falla la subida, la cabina sigue funcionando y el QR
 * vuelve a la dirección de la red local.
 */

const API = 'https://api.cloudinary.com/v1_1';

export function nubeActiva(config) {
  const n = config?.compartir?.nube;
  return Boolean(n?.activo && n.cloudName && n.preset);
}

/** Enlace público de un archivo ya subido (con recorte "fl_attachment" para descargar). */
export function urlDeArchivo(cloudName, archivo, paraDescargar = false) {
  const tipo = archivo.tipo === 'v' ? 'video' : 'image';
  const transformacion = paraDescargar ? 'fl_attachment/' : '';
  return `https://res.cloudinary.com/${cloudName}/${tipo}/upload/${transformacion}${archivo.id}.${archivo.formato}`;
}

/** Empaqueta la sesión en el enlace de la galería (va dentro del código QR). */
export function enlaceGaleria(config, datos) {
  const base = String(config.compartir.nube.urlGaleria || '').trim();
  const json = JSON.stringify(datos);
  const codificado = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (!base) {
    // sin página de galería: el QR lleva directo al recuerdo principal
    return urlDeArchivo(datos.c, datos.a[0]);
  }
  return `${base.replace(/#.*$/, '').replace(/\/+$/, '')}/#${codificado}`;
}

/** Lee el paquete del enlace (lo usa la página de descarga). */
export function leerEnlace(hash) {
  const limpio = String(hash || '').replace(/^#/, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!limpio) return null;
  try {
    const binario = atob(limpio);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/**
 * Sube un archivo a Cloudinary sin firmar.
 * @returns {{tipo:'i'|'v', id:string, formato:string, nombre:string}}
 */
export async function subirArchivo(config, nombre, blob, opciones = {}) {
  const { cloudName, preset } = config.compartir.nube;
  const cuerpo = new FormData();
  cuerpo.append('file', blob, nombre);
  cuerpo.append('upload_preset', preset);
  if (opciones.publicId) cuerpo.append('public_id', opciones.publicId);
  if (opciones.etiqueta) cuerpo.append('tags', opciones.etiqueta);
  const res = await fetch(`${API}/${cloudName}/auto/upload`, { method: 'POST', body: cuerpo });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos?.error?.message || `Cloudinary respondió ${res.status}`);
  return {
    nombre,
    tipo: datos.resource_type === 'video' ? 'v' : 'i',
    id: datos.public_id,
    formato: datos.format || nombre.split('.').pop(),
  };
}

/**
 * Sube la sesión completa y devuelve el enlace para el QR.
 * @param {Array<[string, Blob]>} archivos
 * @param {(fraccion:number)=>void} [alProgreso]
 */
export async function subirSesion(config, archivos, alProgreso = () => {}) {
  const { subirFotosSueltas } = config.compartir.nube;
  // por defecto sólo el recuerdo, el GIF y el video: menos espera y códigos QR más simples
  const lista = archivos.filter(([nombre]) => nombre !== 'miniatura.jpg'
    && (subirFotosSueltas || !/^foto-\d+\.jpg$/.test(nombre)));
  const subidos = [];
  for (const [nombre, blob] of lista) {
    subidos.push(await subirArchivo(config, nombre, blob));
    alProgreso(subidos.length / lista.length);
  }
  if (!subidos.length) throw new Error('No había archivos para subir');

  const datos = {
    c: config.compartir.nube.cloudName,
    e: config.evento.nombre || '',
    a: subidos.map((a) => ({ tipo: a.tipo, id: a.id, formato: a.formato, n: a.nombre })),
  };
  return { enlace: enlaceGaleria(config, datos), archivos: subidos };
}

/** Prueba de conexión desde los ajustes: sube y borra una imagen diminuta. */
export async function probarNube(config) {
  const pixel = await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')).blob();
  const subido = await subirArchivo(config, 'prueba-sonria.png', pixel);
  return urlDeArchivo(config.compartir.nube.cloudName, subido);
}

// ------------------------------------------------------------------ galería del evento (celulares)
//
// Las fotos de los celulares se suben igual que las de la cabina de la PC:
// sonria/<sesión>/<archivo> con la etiqueta del evento, así todas aparecen
// juntas en la galería (g/?c=<cuenta>&t=<etiqueta>).

/** Letra de cada archivo dentro del enlace (igual que en la cabina). */
const CODIGOS = { 'recuerdo.jpg': 'r', 'animacion.gif': 'a', 'boomerang.gif': 'b', 'video.mp4': 'v', 'video.webm': 'w' };

/** Identificador de sesión con el mismo formato que la cabina: fecha-hora-aleatorio. */
export function idDeSesion() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const azar = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${azar}`;
}

const paginaDescarga = (config) => String(config.compartir?.nube?.urlGaleria || '').trim()
  .replace(/[?#].*$/, '').replace(/\/+$/, '');

/** ¿Los invitados pueden subir sus fotos del celular a la galería del evento? */
export function galeriaDisponible(config) {
  const n = config?.compartir?.nube;
  return nubeActiva(config) && n.galeriaCelulares !== false && /^sonria_[a-z0-9_-]{1,90}$/.test(n.etiquetaEvento || '')
    && Boolean(paginaDescarga(config));
}

/** Enlace de la galería con todas las fotos del evento. */
export function enlaceGaleriaEvento(config) {
  if (!galeriaDisponible(config)) return '';
  const { cloudName, etiquetaEvento } = config.compartir.nube;
  return `${paginaDescarga(config)}/?c=${encodeURIComponent(cloudName)}&t=${etiquetaEvento}`;
}

/**
 * Sube la creación del invitado a la galería del evento.
 * @param {Array<[string, Blob]>} archivos p. ej. [['recuerdo.jpg', blob]]
 * @returns {Promise<{enlace:string, galeria:string}>} enlace de su sesión y de la galería
 */
export async function subirALaGaleria(config, archivos, alProgreso = () => {}) {
  const { cloudName, etiquetaEvento } = config.compartir.nube;
  const lista = archivos.filter(([nombre]) => CODIGOS[nombre]);
  if (!lista.length) throw new Error('No hay nada para subir');
  const id = idDeSesion();
  let letras = '';
  for (const [i, [nombre, blob]] of lista.entries()) {
    const subido = await subirArchivo(config, nombre, blob, {
      publicId: `sonria/${id}/${nombre.replace(/\.[^.]+$/, '')}`,
      etiqueta: etiquetaEvento,
    });
    if (subido.id !== `sonria/${id}/${nombre.replace(/\.[^.]+$/, '')}`) {
      throw new Error('El preset de Cloudinary cambia el nombre de las fotos: deja vacío "Folder" y apagado "Use filename"');
    }
    letras += CODIGOS[nombre];
    alProgreso((i + 1) / lista.length);
  }
  return {
    enlace: `${paginaDescarga(config)}/?c=${encodeURIComponent(cloudName)}&s=${id}&a=${letras}&t=${etiquetaEvento}`,
    galeria: enlaceGaleriaEvento(config),
  };
}
