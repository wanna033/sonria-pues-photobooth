/*
 * Codificador de GIF animado para Sonría PJs.
 *
 * - Paleta global de 256 colores por "median cut" sobre un histograma RGB 5-5-5
 *   construido con todos los cuadros (colores estables entre cuadros, sin parpadeo).
 * - Compresión LZW estándar de GIF89a con bucle infinito (NETSCAPE2.0).
 *
 *   const gif = await crearGif(listaDeImageData, { retrasoMs: 450, alProgreso })
 *   // gif es un Blob image/gif
 */

const ceder = () => new Promise((r) => setTimeout(r, 0));

// ------------------------------------------------------------------ paleta

function construirHistograma(cuadros) {
  const hist = new Uint32Array(32768);
  for (const { data } of cuadros) {
    // muestreo: 1 de cada 2 píxeles basta para la paleta
    for (let i = 0; i < data.length; i += 8) {
      hist[((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)]++;
    }
  }
  return hist;
}

function crearCaja(colores, hist) {
  let rMin = 31, rMax = 0, gMin = 31, gMax = 0, bMin = 31, bMax = 0, total = 0;
  for (const c of colores) {
    const r = c >> 10, g = (c >> 5) & 31, b = c & 31;
    if (r < rMin) rMin = r; if (r > rMax) rMax = r;
    if (g < gMin) gMin = g; if (g > gMax) gMax = g;
    if (b < bMin) bMin = b; if (b > bMax) bMax = b;
    total += hist[c];
  }
  return { colores, total, rango: [rMax - rMin, gMax - gMin, bMax - bMin] };
}

function medianCut(hist, maxColores) {
  const usados = [];
  for (let c = 0; c < 32768; c++) if (hist[c]) usados.push(c);
  if (usados.length === 0) usados.push(0);

  let cajas = [crearCaja(usados, hist)];
  while (cajas.length < maxColores) {
    // divide la caja con más peso × rango
    let indice = -1;
    let mejor = 0;
    cajas.forEach((caja, i) => {
      const puntaje = caja.colores.length > 1 ? Math.max(...caja.rango) * Math.sqrt(caja.total) : 0;
      if (puntaje > mejor) {
        mejor = puntaje;
        indice = i;
      }
    });
    if (indice < 0) break;

    const caja = cajas[indice];
    const eje = caja.rango.indexOf(Math.max(...caja.rango));
    const componente = eje === 0 ? (c) => c >> 10 : eje === 1 ? (c) => (c >> 5) & 31 : (c) => c & 31;
    caja.colores.sort((a, b) => componente(a) - componente(b));

    const mitad = caja.total / 2;
    let acumulado = 0;
    let corte = 1;
    for (let i = 0; i < caja.colores.length - 1; i++) {
      acumulado += hist[caja.colores[i]];
      if (acumulado >= mitad) {
        corte = i + 1;
        break;
      }
      corte = i + 1;
    }
    cajas.splice(indice, 1,
      crearCaja(caja.colores.slice(0, corte), hist),
      crearCaja(caja.colores.slice(corte), hist));
  }

  return cajas.map((caja) => {
    let r = 0, g = 0, b = 0, peso = 0;
    for (const c of caja.colores) {
      const w = hist[c] || 1;
      r += (c >> 10) * w; g += ((c >> 5) & 31) * w; b += (c & 31) * w; peso += w;
    }
    // de 5 bits a 8 bits, centrado en el intervalo
    return [r / peso * 8 + 4, g / peso * 8 + 4, b / peso * 8 + 4].map((v) => Math.min(255, Math.round(v)));
  });
}

function mapaDeColores(paleta) {
  const mapa = new Int16Array(32768).fill(-1);
  return (c) => {
    let i = mapa[c];
    if (i >= 0) return i;
    const r = (c >> 10) * 8 + 4, g = ((c >> 5) & 31) * 8 + 4, b = (c & 31) * 8 + 4;
    let mejor = Infinity;
    for (let p = 0; p < paleta.length; p++) {
      const [pr, pg, pb] = paleta[p];
      const d = (r - pr) ** 2 * 2 + (g - pg) ** 2 * 4 + (b - pb) ** 2 * 3;
      if (d < mejor) {
        mejor = d;
        i = p;
      }
    }
    mapa[c] = i;
    return i;
  };
}

// ------------------------------------------------------------------ escritura binaria

class Bytes {
  constructor(tamano = 1 << 20) {
    this.buf = new Uint8Array(tamano);
    this.pos = 0;
  }
  asegurar(n) {
    if (this.pos + n <= this.buf.length) return;
    const nuevo = new Uint8Array(Math.max(this.buf.length * 2, this.pos + n));
    nuevo.set(this.buf);
    this.buf = nuevo;
  }
  byte(b) {
    this.asegurar(1);
    this.buf[this.pos++] = b;
  }
  corto(v) {
    this.byte(v & 0xff);
    this.byte((v >> 8) & 0xff);
  }
  texto(s) {
    for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i));
  }
  bytes(arr) {
    this.asegurar(arr.length);
    this.buf.set(arr, this.pos);
    this.pos += arr.length;
  }
  resultado() {
    return this.buf.subarray(0, this.pos);
  }
}

/** Compresión LZW de GIF (tamaño mínimo de código 8). Devuelve los bytes empaquetados. */
function comprimirLZW(indices) {
  const tamanoMinimo = 8;
  const codigoLimpiar = 1 << tamanoMinimo;
  const codigoFin = codigoLimpiar + 1;
  const salida = new Bytes(indices.length);

  let siguiente = codigoFin + 1;
  let tamanoCodigo = tamanoMinimo + 1;
  let acumulador = 0;
  let bits = 0;
  let tabla = new Map();

  const emitir = (codigo) => {
    acumulador |= codigo << bits;
    bits += tamanoCodigo;
    while (bits >= 8) {
      salida.byte(acumulador & 0xff);
      acumulador >>>= 8;
      bits -= 8;
    }
  };

  emitir(codigoLimpiar);
  let prefijo = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const clave = (prefijo << 8) | k;
    const codigo = tabla.get(clave);
    if (codigo !== undefined) {
      prefijo = codigo;
      continue;
    }
    emitir(prefijo);
    if (siguiente === 4096) {
      emitir(codigoLimpiar);
      siguiente = codigoFin + 1;
      tamanoCodigo = tamanoMinimo + 1;
      tabla = new Map();
    } else {
      if (siguiente >= 1 << tamanoCodigo) tamanoCodigo++;
      tabla.set(clave, siguiente++);
    }
    prefijo = k;
  }
  emitir(prefijo);
  emitir(codigoFin);
  if (bits > 0) salida.byte(acumulador & 0xff);
  return salida.resultado();
}

// ------------------------------------------------------------------ API

/**
 * @param {ImageData[]} cuadros  todos del mismo tamaño
 * @param {{ retrasoMs?: number|number[], alProgreso?: (fraccion:number)=>void }} opciones
 * @returns {Promise<Blob>}
 */
export async function crearGif(cuadros, { retrasoMs = 450, alProgreso = () => {} } = {}) {
  if (!cuadros.length) throw new Error('No hay cuadros para el GIF');
  const { width: ancho, height: alto } = cuadros[0];

  const paleta = medianCut(construirHistograma(cuadros), 256);
  while (paleta.length < 256) paleta.push([0, 0, 0]);
  const buscar = mapaDeColores(paleta);
  await ceder();

  const gif = new Bytes(ancho * alto * cuadros.length * 0.6 + 4096);
  gif.texto('GIF89a');
  gif.corto(ancho);
  gif.corto(alto);
  gif.byte(0xf7); // paleta global de 256 colores
  gif.byte(0);
  gif.byte(0);
  for (const [r, g, b] of paleta) {
    gif.byte(r);
    gif.byte(g);
    gif.byte(b);
  }

  // bucle infinito
  gif.bytes([0x21, 0xff, 0x0b]);
  gif.texto('NETSCAPE2.0');
  gif.bytes([0x03, 0x01, 0x00, 0x00, 0x00]);

  const indices = new Uint8Array(ancho * alto);
  for (let n = 0; n < cuadros.length; n++) {
    const { data } = cuadros[n];
    for (let i = 0, p = 0; p < indices.length; i += 4, p++) {
      indices[p] = buscar(((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3));
    }

    const retraso = Array.isArray(retrasoMs) ? retrasoMs[n] : retrasoMs;
    gif.bytes([0x21, 0xf9, 0x04, 0x04]); // control gráfico: no desechar
    gif.corto(Math.max(2, Math.round(retraso / 10)));
    gif.bytes([0x00, 0x00]);

    gif.byte(0x2c); // descriptor de imagen
    gif.corto(0);
    gif.corto(0);
    gif.corto(ancho);
    gif.corto(alto);
    gif.byte(0x00);

    gif.byte(8); // tamaño mínimo de código LZW
    const datos = comprimirLZW(indices);
    for (let i = 0; i < datos.length; i += 255) {
      const trozo = datos.subarray(i, i + 255);
      gif.byte(trozo.length);
      gif.bytes(trozo);
    }
    gif.byte(0);

    alProgreso((n + 1) / cuadros.length);
    await ceder();
  }
  gif.byte(0x3b);
  return new Blob([gif.resultado()], { type: 'image/gif' });
}

/**
 * Igual que crearGif, pero en segundo plano (la pantalla no se congela).
 * Si el navegador no permite el trabajo en segundo plano, se hace aquí mismo.
 */
export function crearGifEnSegundoPlano(cuadros, { retrasoMs = 450, alProgreso = () => {} } = {}) {
  let trabajador;
  try {
    trabajador = new Worker(new URL('./gif-trabajador.js', import.meta.url), { type: 'module' });
  } catch {
    return crearGif(cuadros, { retrasoMs, alProgreso });
  }
  return new Promise((resolve, reject) => {
    const enEstaPagina = () => {
      trabajador.terminate();
      crearGif(cuadros, { retrasoMs, alProgreso }).then(resolve, reject);
    };
    trabajador.onmessage = ({ data }) => {
      if (data.progreso !== undefined) return alProgreso(data.progreso);
      trabajador.terminate();
      if (data.gif) resolve(data.gif);
      else reject(new Error(data.error));
    };
    trabajador.onerror = (e) => {
      e.preventDefault();
      enEstaPagina();
    };
    // se copian (no se transfieren) para poder rehacerlo aquí si el trabajador falla
    trabajador.postMessage({ cuadros, retrasoMs });
  });
}
