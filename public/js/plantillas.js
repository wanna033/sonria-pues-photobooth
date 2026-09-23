/*
 * Plantillas de impresión y motor de composición.
 * Todas las medidas están en píxeles a 300 ppp:
 *   1800×1200 = 15×10 cm (4×6") horizontal, 1200×1800 = vertical.
 * Las "tiras" se diseñan en media hoja (600×1800) y se duplican para
 * imprimir dos tiras de 5×15 cm en una hoja de 10×15 cm.
 */

import { t } from './textos.js';

export const PLANTILLAS = [
  {
    id: 'tira-4',
    nombre: 'Tira clásica',
    descripcion: '4 fotos · 2 tiras 5×15 cm',
    fotos: 4,
    ancho: 1200,
    alto: 1800,
    duplicar: true,
    ranuras: [
      { x: 40, y: 40, w: 520, h: 347 },
      { x: 40, y: 411, w: 520, h: 347 },
      { x: 40, y: 782, w: 520, h: 347 },
      { x: 40, y: 1153, w: 520, h: 347 },
    ],
    pie: { x: 30, y: 1520, w: 540, h: 250 },
  },
  {
    id: 'tira-3',
    nombre: 'Tira de tres',
    descripcion: '3 fotos · 2 tiras 5×15 cm',
    fotos: 3,
    ancho: 1200,
    alto: 1800,
    duplicar: true,
    ranuras: [
      { x: 40, y: 40, w: 520, h: 420 },
      { x: 40, y: 484, w: 520, h: 420 },
      { x: 40, y: 928, w: 520, h: 420 },
    ],
    pie: { x: 30, y: 1370, w: 540, h: 400 },
  },
  {
    id: 'postal-1',
    nombre: 'Postal',
    descripcion: '1 foto grande · 10×15 cm',
    fotos: 1,
    ancho: 1800,
    alto: 1200,
    ranuras: [{ x: 60, y: 60, w: 1680, h: 945 }],
    pie: { x: 60, y: 1020, w: 1680, h: 150 },
  },
  {
    id: 'cuadricula-4',
    nombre: 'Cuadrícula',
    descripcion: '4 fotos · 10×15 cm',
    fotos: 4,
    ancho: 1800,
    alto: 1200,
    ranuras: [
      { x: 60, y: 60, w: 825, h: 464 },
      { x: 915, y: 60, w: 825, h: 464 },
      { x: 60, y: 549, w: 825, h: 464 },
      { x: 915, y: 549, w: 825, h: 464 },
    ],
    pie: { x: 60, y: 1028, w: 1680, h: 142 },
  },
  {
    id: 'grande-3',
    nombre: 'Una grande y tres',
    descripcion: '4 fotos · 10×15 cm',
    fotos: 4,
    ancho: 1800,
    alto: 1200,
    ranuras: [
      { x: 50, y: 50, w: 1100, h: 960 },
      { x: 1180, y: 50, w: 570, h: 303 },
      { x: 1180, y: 378, w: 570, h: 303 },
      { x: 1180, y: 706, w: 570, h: 304 },
    ],
    pie: { x: 50, y: 1030, w: 1700, h: 140 },
  },
  {
    id: 'retrato-1',
    nombre: 'Retrato',
    descripcion: '1 foto vertical · 10×15 cm',
    fotos: 1,
    ancho: 1200,
    alto: 1800,
    ranuras: [{ x: 60, y: 60, w: 1080, h: 1350 }],
    pie: { x: 60, y: 1430, w: 1080, h: 320 },
  },
];

// ------------------------------------------------------------------ tamaño de impresión

export const PPP_IMPRESION = 300;
export const CM_POR_PULGADA = 2.54;
/** Lado largo predeterminado de la hoja: 15.24 cm (6"). */
export const LARGO_PREDETERMINADO_CM = 15.24;

/** Tamaños de foto estándar (pulgadas), sólo para ponerles nombre. */
const TAMANOS_ESTANDAR = [
  { corto: 2, largo: 6, nombre: 'tira 5×15 cm (2×6")' },
  { corto: 4, largo: 6, nombre: 'postal 10×15 cm (4×6")' },
  { corto: 5, largo: 7, nombre: '13×18 cm (5×7")' },
  { corto: 6, largo: 8, nombre: '15×20 cm (6×8")' },
  { corto: 8, largo: 10, nombre: '20×25 cm (8×10")' },
  { corto: 8.5, largo: 11, nombre: 'carta (8.5×11")' },
];

/**
 * Tamaño físico de la hoja impresa. Siempre respeta la forma exacta de la
 * plantilla (sin bandas blancas, recortes ni deformación): el lado largo mide
 * `largoCm` y el corto se calcula con la proporción de la imagen.
 * @returns {{anchoIn, altoIn, anchoCm, altoCm, nombre}}
 */
export function tamanoImpresion(anchoPx, altoPx, largoCm = LARGO_PREDETERMINADO_CM) {
  const largoIn = (Number(largoCm) || LARGO_PREDETERMINADO_CM) / CM_POR_PULGADA;
  const vertical = altoPx >= anchoPx;
  const proporcion = Math.min(anchoPx, altoPx) / Math.max(anchoPx, altoPx);
  const cortoIn = largoIn * proporcion;
  const estandar = TAMANOS_ESTANDAR.find((t) => Math.abs(t.largo - largoIn) < 0.06 && Math.abs(t.corto - cortoIn) < 0.06);
  const anchoIn = vertical ? cortoIn : largoIn;
  const altoIn = vertical ? largoIn : cortoIn;
  const cm = (v) => Math.round(v * CM_POR_PULGADA * 10) / 10;
  return {
    anchoIn,
    altoIn,
    anchoCm: cm(anchoIn),
    altoCm: cm(altoIn),
    nombre: estandar ? estandar.nombre : `tamaño propio ${cm(anchoIn)}×${cm(altoIn)} cm`,
  };
}

/** Tamaño de la hoja que produce una plantilla (en pulgadas y cm). */
export function tamanoDePlantilla(p) {
  const anchoHoja = p.personalizada && p.duplicar ? p.ancho * 2 : p.ancho;
  return tamanoImpresion(anchoHoja, p.alto, p.largoCm);
}

// ------------------------------------------------------------------ diseños propios

let personalizadas = [];

/**
 * Convierte un diseño subido por el usuario (imagen + recuadros) en una plantilla.
 * @param {{id, nombre, ancho, alto, ranuras, capa, duplicar}} meta
 * @param {HTMLImageElement} imagen
 */
export function crearPlantillaPersonalizada(meta, imagen) {
  const fotos = meta.ranuras.length;
  return {
    id: meta.id,
    nombre: meta.nombre,
    descripcion: `${fotos} ${fotos === 1 ? 'foto' : 'fotos'} · ${meta.duplicar ? '2 tiras por hoja' : 'diseño propio'}`,
    fotos,
    personalizada: true,
    ancho: meta.ancho,
    alto: meta.alto,
    ranuras: meta.ranuras,
    capa: meta.capa,
    duplicar: meta.duplicar,
    largoCm: Number(meta.largoCm) || LARGO_PREDETERMINADO_CM,
    imagen,
  };
}

/** @param {{meta, imagen}[]} lista */
export function registrarPersonalizadas(lista) {
  personalizadas = lista.map(({ meta, imagen }) => crearPlantillaPersonalizada(meta, imagen));
}

export function todasLasPlantillas() {
  return [...personalizadas, ...PLANTILLAS];
}

export function buscarPlantilla(id) {
  return todasLasPlantillas().find((p) => p.id === id);
}

export function plantillaPorId(id) {
  return buscarPlantilla(id) || PLANTILLAS[0];
}

// ------------------------------------------------------------------ utilidades

export function cargarImagen(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function dimensiones(fuente) {
  return {
    w: fuente.videoWidth || fuente.naturalWidth || fuente.width,
    h: fuente.videoHeight || fuente.naturalHeight || fuente.height,
  };
}

/** Dibuja `fuente` cubriendo el rectángulo (recorta lo que sobra, ligeramente hacia arriba). */
export function dibujarCubriendo(ctx, fuente, x, y, w, h, sesgoVertical = 0.42) {
  const { w: sw, h: sh } = dimensiones(fuente);
  if (!sw || !sh) return;
  const escala = Math.min(sw / w, sh / h);
  const cw = w * escala;
  const ch = h * escala;
  ctx.drawImage(fuente, (sw - cw) / 2, (sh - ch) * sesgoVertical, cw, ch, x, y, w, h);
}

function rectRedondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, r));
}

/** Pseudoaleatorio determinista, para que el confeti salga igual en la vista previa y en la impresión. */
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function luminancia(hex) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0;
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const FUENTES = {
  moderna: {
    titulo: (px) => `900 ${px}px "Segoe UI Black", "Segoe UI", Arial, sans-serif`,
    texto: (px) => `600 ${px}px "Segoe UI", Arial, sans-serif`,
  },
  elegante: {
    titulo: (px) => `400 ${px}px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`,
    texto: (px) => `italic 400 ${px}px Georgia, "Times New Roman", serif`,
  },
  divertida: {
    titulo: (px) => `700 ${px}px "Segoe Print", "Comic Sans MS", cursive`,
    texto: (px) => `400 ${px}px "Segoe Print", "Comic Sans MS", cursive`,
  },
  clasica: {
    titulo: (px) => `700 ${px}px Georgia, "Times New Roman", serif`,
    texto: (px) => `400 ${px}px Georgia, "Times New Roman", serif`,
  },
};

function ajustarTexto(ctx, texto, fuente, tamanoMax, anchoMax) {
  let px = tamanoMax;
  ctx.font = fuente(px);
  while (px > 10 && ctx.measureText(texto).width > anchoMax) {
    px -= Math.max(1, px * 0.06);
    ctx.font = fuente(px);
  }
  return px;
}

export function fechaEvento(config) {
  const [a, m, d] = String(config.evento.fecha || '').split('-').map(Number);
  const fecha = a && m && d ? new Date(a, m - 1, d) : new Date();
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ------------------------------------------------------------------ partes del diseño

function dibujarFondo(ctx, w, h, config, recursos) {
  const { colorPrimario, colorSecundario, colorFondo } = config.marca;
  const tipo = config.plantillas.fondo;

  if (tipo === 'imagen' && recursos.fondo) {
    dibujarCubriendo(ctx, recursos.fondo, 0, 0, w, h, 0.5);
    return;
  }
  if (tipo === 'blanco') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (tipo === 'oscuro') {
    ctx.fillStyle = colorFondo;
    ctx.fillRect(0, 0, w, h);
    const brillo = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, Math.max(w, h));
    brillo.addColorStop(0, colorPrimario + '66');
    brillo.addColorStop(1, colorPrimario + '00');
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, w, h);
  } else {
    const degradado = ctx.createLinearGradient(0, 0, w, h);
    degradado.addColorStop(0, colorPrimario);
    degradado.addColorStop(1, colorSecundario);
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, w, h);
  }

  // confeti sutil
  const azar = aleatorio(w * 7 + h);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  const cantidad = Math.round((w * h) / 9000);
  for (let i = 0; i < cantidad; i++) {
    ctx.beginPath();
    ctx.arc(azar() * w, azar() * h, 2 + azar() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dibujarFoto(ctx, foto, r, config) {
  const redondeado = config.plantillas.esquinasRedondeadas;
  const radio = redondeado ? Math.min(r.w, r.h) * 0.045 : 0;
  if (config.plantillas.marcoFotos) {
    const borde = Math.max(6, Math.round(Math.min(r.w, r.h) * 0.022));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = borde * 2.5;
    ctx.shadowOffsetY = borde * 0.8;
    ctx.fillStyle = '#ffffff';
    rectRedondeado(ctx, r.x - borde, r.y - borde, r.w + borde * 2, r.h + borde * 2, radio ? radio + borde : 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  rectRedondeado(ctx, r.x, r.y, r.w, r.h, radio);
  ctx.clip();
  if (foto) {
    dibujarCubriendo(ctx, foto, r.x, r.y, r.w, r.h);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
}

function dibujarPie(ctx, caja, config, recursos) {
  const fuente = FUENTES[config.plantillas.fuente] || FUENTES.moderna;
  const fondoClaro = config.plantillas.fondo === 'blanco';
  const colorTitulo = fondoClaro
    ? (luminancia(config.marca.colorPrimario) > 0.6 ? '#222' : config.marca.colorPrimario)
    : '#ffffff';
  const colorTexto = fondoClaro ? '#333333' : 'rgba(255,255,255,0.92)';

  const titulo = String(config.evento.nombre || '').trim();
  const subtitulo = String(config.evento.textoImpresion || '').trim();
  const detalle = [config.evento.mostrarFecha ? fechaEvento(config) : '', config.marca.nombre]
    .filter(Boolean).join('  ·  ');

  // sobre fondos oscuros (oscuro o degradado) se usa la versión clara del logo si existe
  const fondoOscuro = config.plantillas.fondo === 'oscuro' || config.plantillas.fondo === 'degradado';
  const logo = (fondoOscuro && recursos.logoClaro) || recursos.logo;
  const vertical = caja.h > caja.w * 0.35;
  let areaTexto = { ...caja };

  if (logo) {
    const proporcion = logo.naturalWidth / logo.naturalHeight;
    let lw, lh, lx, ly;
    if (vertical) {
      lh = caja.h * (titulo || subtitulo ? 0.42 : 0.8);
      lw = Math.min(caja.w * 0.8, lh * proporcion);
      lh = lw / proporcion;
      lx = caja.x + (caja.w - lw) / 2;
      ly = caja.y + caja.h * 0.04;
      areaTexto = { x: caja.x, y: ly + lh + caja.h * 0.04, w: caja.w, h: caja.y + caja.h - (ly + lh + caja.h * 0.04) };
    } else {
      lh = caja.h * 0.84;
      lw = Math.min(caja.w * 0.22, lh * proporcion);
      lh = lw / proporcion;
      lx = caja.x;
      ly = caja.y + (caja.h - lh) / 2;
      areaTexto = { x: caja.x + lw + caja.w * 0.02, y: caja.y, w: caja.w - lw - caja.w * 0.04, h: caja.h };
    }
    ctx.drawImage(logo, lx, ly, lw, lh);
  }

  const lineas = [];
  if (titulo) lineas.push({ texto: titulo, fuente: fuente.titulo, peso: 1, color: colorTitulo });
  if (subtitulo) lineas.push({ texto: subtitulo, fuente: fuente.texto, peso: 0.52, color: colorTexto });
  if (detalle) lineas.push({ texto: detalle, fuente: fuente.texto, peso: 0.4, color: colorTexto });
  if (!lineas.length) return;

  const pesoTotal = lineas.reduce((s, l) => s + l.peso, 0);
  const alturaBase = (areaTexto.h * 0.8) / (pesoTotal * 1.25);
  const tamanos = lineas.map((l) => ajustarTexto(ctx, l.texto, l.fuente, alturaBase * l.peso, areaTexto.w * 0.94));
  const altoBloque = tamanos.reduce((s, t) => s + t * 1.25, 0);
  let y = areaTexto.y + (areaTexto.h - altoBloque) / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!fondoClaro) {
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  lineas.forEach((linea, i) => {
    ctx.font = linea.fuente(tamanos[i]);
    ctx.fillStyle = linea.color;
    y += (tamanos[i] * 1.25) / 2;
    ctx.fillText(linea.texto, areaTexto.x + areaTexto.w / 2, y);
    y += (tamanos[i] * 1.25) / 2;
  });
  ctx.restore();
}

// ------------------------------------------------------------------ stickers

export function dibujarStickers(ctx, stickers, W, H, config) {
  for (const s of stickers) {
    const px = s.tam * W;
    ctx.save();
    ctx.translate(s.x * W, s.y * H);
    ctx.rotate((s.rot * Math.PI) / 180);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (s.tipo === 'frase') {
      ctx.font = `900 ${px}px "Segoe UI Black", "Segoe UI", Arial, sans-serif`;
      const tw = ctx.measureText(s.texto).width;
      const w = tw + px * 1.4;
      const h = px * 1.7;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = px * 0.25;
      ctx.shadowOffsetY = px * 0.08;
      ctx.fillStyle = '#ffffff';
      rectRedondeado(ctx, -w / 2 - px * 0.12, -h / 2 - px * 0.12, w + px * 0.24, h + px * 0.24, h);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      const degradado = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      degradado.addColorStop(0, config.marca.colorPrimario);
      degradado.addColorStop(1, config.marca.colorSecundario);
      ctx.fillStyle = degradado;
      rectRedondeado(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.texto, 0, px * 0.04);
    } else {
      ctx.font = `${px}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = px * 0.1;
      ctx.shadowOffsetY = px * 0.05;
      ctx.fillText(s.texto, 0, px * 0.05);
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ composición

/**
 * Compone la plantilla en `lienzo`.
 * @param {HTMLCanvasElement} lienzo
 * @param {object} plantilla
 * @param {(CanvasImageSource|null)[]} fotos
 * @param {{config, recursos:{logo, fondo}, escala?:number, stickers?:any[]}} opciones
 */
export function componer(lienzo, plantilla, fotos, { config, recursos = {}, escala = 1, stickers = [] }) {
  if (plantilla.personalizada) return componerPersonalizada(lienzo, plantilla, fotos, { config, escala, stickers });
  const anchoUnidad = plantilla.duplicar ? plantilla.ancho / 2 : plantilla.ancho;
  const unidad = document.createElement('canvas');
  unidad.width = Math.round(anchoUnidad * escala);
  unidad.height = Math.round(plantilla.alto * escala);
  const u = unidad.getContext('2d');
  u.scale(escala, escala);
  u.imageSmoothingQuality = 'high';

  dibujarFondo(u, anchoUnidad, plantilla.alto, config, recursos);
  plantilla.ranuras.forEach((r, i) => dibujarFoto(u, fotos[i] || null, r, config));
  dibujarPie(u, plantilla.pie, config, recursos);

  lienzo.width = Math.round(plantilla.ancho * escala);
  lienzo.height = Math.round(plantilla.alto * escala);
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(unidad, 0, 0);
  if (plantilla.duplicar) ctx.drawImage(unidad, unidad.width, 0);
  if (stickers.length) dibujarStickers(ctx, stickers, lienzo.width, lienzo.height, config);
  return lienzo;
}

/**
 * Compone un diseño propio: la imagen del usuario más las fotos en sus recuadros.
 * - capa "encima": las fotos tapan los recuadros de color del diseño.
 * - capa "debajo": el diseño (PNG con huecos transparentes) va encima de las fotos.
 * Si el diseño es chico se escala para que la impresión tenga al menos 1800 px.
 */
function componerPersonalizada(lienzo, p, fotos, { config, escala = 1, stickers = [] }) {
  // resolución de salida: 300 ppp del tamaño real de la hoja
  const hoja = tamanoDePlantilla(p);
  const ladoLargoPx = Math.round(Math.max(hoja.anchoIn, hoja.altoIn) * PPP_IMPRESION);
  const ladoLargoDiseno = Math.max(p.ancho * (p.duplicar ? 2 : 1), p.alto);
  const factor = escala * Math.max(1, ladoLargoPx / ladoLargoDiseno);
  const unidad = document.createElement('canvas');
  unidad.width = Math.max(1, Math.round(p.ancho * factor));
  unidad.height = Math.max(1, Math.round(p.alto * factor));
  const u = unidad.getContext('2d');
  u.imageSmoothingQuality = 'high';

  const dibujarFotos = () => {
    p.ranuras.forEach((r, i) => {
      const x = Math.round(r.x * factor);
      const y = Math.round(r.y * factor);
      const w = Math.round((r.x + r.w) * factor) - x;
      const h = Math.round((r.y + r.h) * factor) - y;
      if (fotos[i]) {
        dibujarCubriendo(u, fotos[i], x, y, w, h);
      } else {
        u.fillStyle = 'rgba(0,0,0,0.3)';
        u.fillRect(x, y, w, h);
      }
    });
  };

  if (p.capa === 'debajo') {
    u.fillStyle = '#ffffff';
    u.fillRect(0, 0, unidad.width, unidad.height);
    dibujarFotos();
    u.drawImage(p.imagen, 0, 0, unidad.width, unidad.height);
  } else {
    u.drawImage(p.imagen, 0, 0, unidad.width, unidad.height);
    dibujarFotos();
  }

  lienzo.width = unidad.width * (p.duplicar ? 2 : 1);
  lienzo.height = unidad.height;
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(unidad, 0, 0);
  if (p.duplicar) ctx.drawImage(unidad, unidad.width, 0);
  if (stickers.length) dibujarStickers(ctx, stickers, lienzo.width, lienzo.height, config);
  return lienzo;
}

/** Foto de muestra para las miniaturas de las plantillas. */
export function fotoDeMuestra(indice) {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 270;
  const ctx = c.getContext('2d');
  const tono = (indice * 67 + 200) % 360;
  const g = ctx.createLinearGradient(0, 0, 480, 270);
  g.addColorStop(0, `hsl(${tono} 55% 62%)`);
  g.addColorStop(1, `hsl(${(tono + 40) % 360} 60% 42%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const personas = (indice % 3) + 1;
  for (let p = 0; p < personas; p++) {
    const cx = 240 + (p - (personas - 1) / 2) * 120;
    ctx.beginPath();
    ctx.arc(cx, 120, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, 262, 70, 90, 0, Math.PI, 0);
    ctx.fill();
  }
  return c;
}

/**
 * Banda con la marca que se pone en los GIF, boomerangs y videos.
 * El texto se edita en Ajustes → Textos y se puede apagar en Evento y marca.
 */
export function dibujarMarcaDeAgua(ctx, w, h, config) {
  if (config.marca?.marcaDeAgua === false) return;
  const texto = t('marcaAgua', { evento: config.evento?.nombre || '', marca: config.marca?.nombre || '' }).trim();
  if (!texto) return;
  const alto = Math.round(h * 0.1);
  ctx.save();
  const degradado = ctx.createLinearGradient(0, h - alto * 1.6, 0, h);
  degradado.addColorStop(0, 'rgba(0,0,0,0)');
  degradado.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = degradado;
  ctx.fillRect(0, h - alto * 1.6, w, alto * 1.6);
  const px = ajustarTexto(ctx, texto, FUENTES.moderna.titulo, alto * 0.5, w * 0.9);
  ctx.font = FUENTES.moderna.titulo(px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(texto, w / 2, h - alto * 0.55);
  ctx.restore();
}
