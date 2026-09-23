/*
 * Generador de códigos QR (modo byte, versiones 1–40) escrito para Sonría PJs.
 * Implementa la norma ISO/IEC 18004: Reed–Solomon, entrelazado de bloques,
 * patrones de función, selección de máscara por penalización e información
 * de formato/versión.
 *
 *   const qr = generarQR('https://ejemplo.com', 'M');
 *   qr.tamano            // módulos por lado
 *   qr.oscuro(x, y)      // true si el módulo es negro
 *   qrSvg('texto')       // cadena <svg> lista para insertar
 */

const NIVELES = {
  // [índice en tablas, bits de formato]
  L: [0, 1],
  M: [1, 0],
  Q: [2, 3],
  H: [3, 2],
};

// Codewords de corrección por bloque, por nivel y versión (índice 0 sin uso).
const ECC_POR_BLOQUE = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// Número de bloques de corrección, por nivel y versión.
const NUM_BLOQUES = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

function bit(valor, i) {
  return ((valor >>> i) & 1) !== 0;
}

function modulosDatosCrudos(ver) {
  let resultado = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlineacion = Math.floor(ver / 7) + 2;
    resultado -= (25 * numAlineacion - 10) * numAlineacion - 55;
    if (ver >= 7) resultado -= 36;
  }
  return resultado;
}

function codewordsDeDatos(ver, nivel) {
  return Math.floor(modulosDatosCrudos(ver) / 8) - ECC_POR_BLOQUE[nivel][ver] * NUM_BLOQUES[nivel][ver];
}

// ---- Reed–Solomon sobre GF(2^8) con polinomio 0x11D

function multiplicarGF(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function divisorRS(grado) {
  const resultado = new Array(grado).fill(0);
  resultado[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    for (let j = 0; j < resultado.length; j++) {
      resultado[j] = multiplicarGF(resultado[j], raiz);
      if (j + 1 < resultado.length) resultado[j] ^= resultado[j + 1];
    }
    raiz = multiplicarGF(raiz, 0x02);
  }
  return resultado;
}

function residuoRS(datos, divisor) {
  const resultado = divisor.map(() => 0);
  for (const b of datos) {
    const factor = b ^ resultado.shift();
    resultado.push(0);
    divisor.forEach((coef, i) => {
      resultado[i] ^= multiplicarGF(coef, factor);
    });
  }
  return resultado;
}

// ---- codificación

function codificarDatos(bytes, nivel) {
  let ver;
  for (ver = 1; ver <= 40; ver++) {
    const bitsCuenta = ver <= 9 ? 8 : 16;
    const necesarios = 4 + bitsCuenta + bytes.length * 8;
    if (necesarios <= codewordsDeDatos(ver, nivel) * 8) break;
  }
  if (ver > 40) throw new Error('Texto demasiado largo para un código QR');

  const bits = [];
  const agregar = (valor, largo) => {
    for (let i = largo - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };
  agregar(0b0100, 4); // modo byte
  agregar(bytes.length, ver <= 9 ? 8 : 16);
  for (const b of bytes) agregar(b, 8);

  const capacidad = codewordsDeDatos(ver, nivel) * 8;
  agregar(0, Math.min(4, capacidad - bits.length)); // terminador
  agregar(0, (8 - (bits.length % 8)) % 8);
  for (let relleno = 0xec; bits.length < capacidad; relleno ^= 0xec ^ 0x11) agregar(relleno, 8);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  return { ver, codewords };
}

function agregarCorreccionYEntrelazar(datos, ver, nivel) {
  const numBloques = NUM_BLOQUES[nivel][ver];
  const eccPorBloque = ECC_POR_BLOQUE[nivel][ver];
  const totalCodewords = Math.floor(modulosDatosCrudos(ver) / 8);
  const bloquesCortos = numBloques - (totalCodewords % numBloques);
  const largoCorto = Math.floor(totalCodewords / numBloques);

  const divisor = divisorRS(eccPorBloque);
  const bloques = [];
  for (let i = 0, k = 0; i < numBloques; i++) {
    const dat = datos.slice(k, k + largoCorto - eccPorBloque + (i < bloquesCortos ? 0 : 1));
    k += dat.length;
    const ecc = residuoRS(dat, divisor);
    if (i < bloquesCortos) dat.push(0);
    bloques.push(dat.concat(ecc));
  }

  const resultado = [];
  for (let i = 0; i < bloques[0].length; i++) {
    bloques.forEach((bloque, j) => {
      if (i !== largoCorto - eccPorBloque || j >= bloquesCortos) resultado.push(bloque[i]);
    });
  }
  return resultado;
}

// ---- matriz

class MatrizQR {
  constructor(ver) {
    this.ver = ver;
    this.tamano = ver * 4 + 17;
    this.modulos = Array.from({ length: this.tamano }, () => new Array(this.tamano).fill(false));
    this.funcion = Array.from({ length: this.tamano }, () => new Array(this.tamano).fill(false));
  }

  poner(x, y, oscuro) {
    this.modulos[y][x] = oscuro;
    this.funcion[y][x] = true;
  }

  posicionesAlineacion() {
    if (this.ver === 1) return [];
    const num = Math.floor(this.ver / 7) + 2;
    const paso = Math.floor((this.ver * 8 + num * 3 + 5) / (num * 4 - 4)) * 2;
    const resultado = [6];
    for (let pos = this.tamano - 7; resultado.length < num; pos -= paso) resultado.splice(1, 0, pos);
    return resultado;
  }

  dibujarPatronesDeFuncion(nivelFormato) {
    const n = this.tamano;
    for (let i = 0; i < n; i++) {
      this.poner(6, i, i % 2 === 0);
      this.poner(i, 6, i % 2 === 0);
    }
    this.dibujarBuscador(3, 3);
    this.dibujarBuscador(n - 4, 3);
    this.dibujarBuscador(3, n - 4);

    const pos = this.posicionesAlineacion();
    const num = pos.length;
    for (let i = 0; i < num; i++) {
      for (let j = 0; j < num; j++) {
        const esquina = (i === 0 && j === 0) || (i === 0 && j === num - 1) || (i === num - 1 && j === 0);
        if (!esquina) this.dibujarAlineacion(pos[i], pos[j]);
      }
    }
    this.dibujarFormato(nivelFormato, 0);
    this.dibujarVersion();
  }

  dibujarBuscador(x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.tamano && yy >= 0 && yy < this.tamano) {
          this.poner(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  dibujarAlineacion(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.poner(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  dibujarFormato(bitsNivel, mascara) {
    const datos = (bitsNivel << 3) | mascara;
    let rem = datos;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((datos << 10) | rem) ^ 0x5412;
    const n = this.tamano;

    for (let i = 0; i <= 5; i++) this.poner(8, i, bit(bits, i));
    this.poner(8, 7, bit(bits, 6));
    this.poner(8, 8, bit(bits, 7));
    this.poner(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.poner(14 - i, 8, bit(bits, i));

    for (let i = 0; i < 8; i++) this.poner(n - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.poner(8, n - 15 + i, bit(bits, i));
    this.poner(8, n - 8, true); // módulo oscuro fijo
  }

  dibujarVersion() {
    if (this.ver < 7) return;
    let rem = this.ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const color = bit(bits, i);
      const a = this.tamano - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.poner(a, b, color);
      this.poner(b, a, color);
    }
  }

  dibujarCodewords(datos) {
    const n = this.tamano;
    let i = 0;
    for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
      if (derecha === 6) derecha = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = derecha - j;
          const haciaArriba = ((derecha + 1) & 2) === 0;
          const y = haciaArriba ? n - 1 - vert : vert;
          if (!this.funcion[y][x] && i < datos.length * 8) {
            this.modulos[y][x] = bit(datos[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  aplicarMascara(mascara) {
    const n = this.tamano;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let invertir;
        switch (mascara) {
          case 0: invertir = (x + y) % 2 === 0; break;
          case 1: invertir = y % 2 === 0; break;
          case 2: invertir = x % 3 === 0; break;
          case 3: invertir = (x + y) % 3 === 0; break;
          case 4: invertir = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invertir = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invertir = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invertir = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (!this.funcion[y][x] && invertir) this.modulos[y][x] = !this.modulos[y][x];
      }
    }
  }

  penalizacion() {
    const n = this.tamano;
    const m = this.modulos;
    let resultado = 0;

    const agregarHistorial = (largo, historial) => {
      if (historial[0] === 0) largo += n;
      historial.pop();
      historial.unshift(largo);
    };
    const contarPatrones = (h) => {
      const k = h[1];
      const centro = k > 0 && h[2] === k && h[3] === k * 3 && h[4] === k && h[5] === k;
      return (centro && h[0] >= k * 4 && h[6] >= k ? 1 : 0) + (centro && h[6] >= k * 4 && h[0] >= k ? 1 : 0);
    };
    const terminarYContar = (colorActual, largo, historial) => {
      if (colorActual) {
        agregarHistorial(largo, historial);
        largo = 0;
      }
      largo += n;
      agregarHistorial(largo, historial);
      return contarPatrones(historial);
    };

    for (let pasada = 0; pasada < 2; pasada++) {
      for (let a = 0; a < n; a++) {
        let color = false;
        let largo = 0;
        const historial = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < n; b++) {
          const celda = pasada === 0 ? m[a][b] : m[b][a];
          if (celda === color) {
            largo++;
            if (largo === 5) resultado += 3;
            else if (largo > 5) resultado++;
          } else {
            agregarHistorial(largo, historial);
            if (!color) resultado += contarPatrones(historial) * 40;
            color = celda;
            largo = 1;
          }
        }
        resultado += terminarYContar(color, largo, historial) * 40;
      }
    }

    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) resultado += 3;
      }
    }

    let oscuros = 0;
    for (const fila of m) for (const c of fila) if (c) oscuros++;
    const total = n * n;
    const k = Math.ceil(Math.abs(oscuros * 20 - total * 10) / total) - 1;
    resultado += k * 10;
    return resultado;
  }
}

/**
 * @param {string} texto
 * @param {'L'|'M'|'Q'|'H'} nivelLetra
 * @param {number} [mascaraForzada] 0–7 (sólo para pruebas)
 */
export function generarQR(texto, nivelLetra = 'M', mascaraForzada = -1) {
  const [nivel, bitsNivel] = NIVELES[nivelLetra] || NIVELES.M;
  const bytes = Array.from(new TextEncoder().encode(texto));
  const { ver, codewords } = codificarDatos(bytes, nivel);
  const finales = agregarCorreccionYEntrelazar(codewords, ver, nivel);

  const matriz = new MatrizQR(ver);
  matriz.dibujarPatronesDeFuncion(bitsNivel);
  matriz.dibujarCodewords(finales);

  let mascara = mascaraForzada;
  if (mascara < 0) {
    let mejor = Infinity;
    for (let i = 0; i < 8; i++) {
      matriz.aplicarMascara(i);
      matriz.dibujarFormato(bitsNivel, i);
      const p = matriz.penalizacion();
      if (p < mejor) {
        mejor = p;
        mascara = i;
      }
      matriz.aplicarMascara(i); // deshace (XOR)
    }
  }
  matriz.aplicarMascara(mascara);
  matriz.dibujarFormato(bitsNivel, mascara);

  return {
    version: ver,
    mascara,
    tamano: matriz.tamano,
    oscuro: (x, y) => matriz.modulos[y][x],
    modulos: matriz.modulos,
  };
}

/** Devuelve un <svg> del código con un margen de 4 módulos. */
export function qrSvg(texto, { nivel = 'M', color = '#000', fondo = '#fff', margen = 4 } = {}) {
  const qr = generarQR(texto, nivel);
  const total = qr.tamano + margen * 2;
  let trazo = '';
  for (let y = 0; y < qr.tamano; y++) {
    for (let x = 0; x < qr.tamano; x++) {
      if (qr.oscuro(x, y)) trazo += `M${x + margen},${y + margen}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`
    + `<rect width="${total}" height="${total}" fill="${fondo}"/><path d="${trazo}" fill="${color}"/></svg>`;
}
