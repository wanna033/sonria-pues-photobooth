/*
 * "Mis fotos" en el celular: las últimas creaciones del invitado quedan
 * guardadas en el propio teléfono (IndexedDB), por si olvidó guardar alguna o
 * quiere compartirla después. Nada sale del dispositivo.
 */

const BASE = 'sonria-pues';
const ALMACEN = 'recuerdos';
/** Cuántas se conservan (las más viejas se borran solas). */
export const MAXIMO_RECUERDOS = 24;

let conexion = null;

function abrir() {
  conexion ??= new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN, { keyPath: 'id' });
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  }).catch((err) => {
    conexion = null; // modo privado o sin espacio: se puede volver a intentar
    throw err;
  });
  return conexion;
}

function operar(modo, accion) {
  return abrir().then((bd) => new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, modo);
    const resultado = accion(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolve(resultado?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

/** @returns {Promise<{id:number, fecha:string, blob:Blob, nombre:string, tipo:string}[]>} de la más nueva a la más vieja */
export async function listarRecuerdos() {
  try {
    const todos = await operar('readonly', (a) => a.getAll());
    return (todos || []).sort((x, y) => y.id - x.id);
  } catch {
    return [];
  }
}

/** Guarda una creación y borra las que pasen del máximo. */
export async function guardarRecuerdo(blob, nombre) {
  try {
    const id = Date.now();
    await operar('readwrite', (a) => a.put({ id, fecha: new Date().toISOString(), blob, nombre, tipo: blob.type }));
    const todos = await listarRecuerdos();
    const sobran = todos.slice(MAXIMO_RECUERDOS);
    if (sobran.length) await operar('readwrite', (a) => sobran.forEach((r) => a.delete(r.id)));
    return id;
  } catch {
    return null; // sin espacio o sin permiso: la cabina sigue igual
  }
}

export async function borrarRecuerdo(id) {
  try {
    await operar('readwrite', (a) => a.delete(id));
  } catch { /* ya no estaba */ }
}
