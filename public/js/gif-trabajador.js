/*
 * Crea el GIF en segundo plano (Web Worker): mientras tanto la pantalla
 * "Creando tu GIF…" sigue fluida y la animación de la marca no se congela.
 */
import { crearGif } from './gif.js';

self.onmessage = async ({ data }) => {
  try {
    const gif = await crearGif(data.cuadros, {
      retrasoMs: data.retrasoMs,
      alProgreso: (fraccion) => self.postMessage({ progreso: fraccion }),
    });
    self.postMessage({ gif });
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
};
