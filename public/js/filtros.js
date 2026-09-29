/*
 * Filtros de color. Se aplican igual en la vista en vivo (CSS `filter`)
 * y en la foto final (canvas `ctx.filter`), así lo que ves es lo que sale.
 *
 * Safari (iPhone y iPad) no aplica `ctx.filter` al dibujar en un lienzo: la
 * vista en vivo se veía con filtro pero la foto salía sin él. Ahí se aplica
 * el mismo filtro calculando los píxeles (ver `dibujarConFiltro`).
 */
export const FILTROS = [
  { id: 'normal', nombre: 'Natural', css: 'none' },
  { id: 'bn', nombre: 'Blanco y negro', css: 'grayscale(1) contrast(1.1)' },
  { id: 'glamour', nombre: 'Glamour', css: 'grayscale(1) contrast(1.35) brightness(1.08)' },
  { id: 'sepia', nombre: 'Sepia', css: 'sepia(0.85) contrast(1.05) brightness(1.03)' },
  { id: 'vintage', nombre: 'Vintage', css: 'sepia(0.35) saturate(1.25) contrast(1.08) hue-rotate(-8deg) brightness(1.02)' },
  { id: 'calido', nombre: 'Cálido', css: 'sepia(0.22) saturate(1.3) brightness(1.05)' },
  { id: 'frio', nombre: 'Frío', css: 'saturate(0.9) hue-rotate(12deg) brightness(1.05) contrast(1.05)' },
  { id: 'vivido', nombre: 'Vívido', css: 'saturate(1.6) contrast(1.12)' },
  { id: 'belleza', nombre: 'Piel suave', css: 'brightness(1.08) contrast(0.92) saturate(1.12) blur(0.4px)' },
  { id: 'rosa', nombre: 'Romántico', css: 'sepia(0.2) saturate(1.35) hue-rotate(-14deg) brightness(1.07) contrast(0.95)' },
  { id: 'dorado', nombre: 'Dorado', css: 'sepia(0.45) saturate(1.5) brightness(1.05) contrast(1.06)' },
  { id: 'noche', nombre: 'Noche de terror', css: 'grayscale(0.35) sepia(0.3) hue-rotate(185deg) saturate(1.5) contrast(1.28) brightness(0.9)' },
  { id: 'nieve', nombre: 'Invierno', css: 'sepia(0.15) hue-rotate(170deg) saturate(0.85) brightness(1.12) contrast(1.02)' },
  { id: 'retro', nombre: 'Retro 70s', css: 'sepia(0.4) saturate(1.6) hue-rotate(-15deg) contrast(0.9) brightness(1.08)' },
  { id: 'cine', nombre: 'Cine', css: 'contrast(1.2) saturate(1.1) sepia(0.12) brightness(0.96)' },
  { id: 'pastel', nombre: 'Pastel', css: 'saturate(0.7) brightness(1.15) contrast(0.85)' },
  { id: 'neon', nombre: 'Neón', css: 'saturate(2) contrast(1.2) hue-rotate(-20deg)' },
  { id: 'dramatico', nombre: 'Dramático', css: 'grayscale(0.25) contrast(1.45) brightness(0.95)' },
];

export function filtroPorId(id) {
  return FILTROS.find((f) => f.id === id) || FILTROS[0];
}

// ------------------------------------------------------------------ filtro en el lienzo

/** ¿El navegador aplica `ctx.filter`? Se prueba pintando un punto rojo en gris. */
export const FILTRO_NATIVO = (() => {
  try {
    const lienzo = document.createElement('canvas');
    lienzo.width = 1;
    lienzo.height = 1;
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    ctx.filter = 'grayscale(1)';
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
  } catch {
    return true; // sin poder probar: se deja al navegador
  }
})();

// Matrices de color de la especificación de CSS (Filter Effects): cada función
// es una matriz 3×3 más un desplazamiento, y se combinan en una sola.
const IDENTIDAD = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

function matrizDe(nombre, v) {
  const s = 1 - Math.min(1, Math.max(0, v));
  switch (nombre) {
    case 'grayscale':
      return [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s,
        0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s,
        0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0, 0, 0];
    case 'sepia':
      return [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s,
        0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s,
        0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s, 0, 0, 0];
    case 'saturate':
      return [0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v,
        0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v,
        0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v, 0, 0, 0];
    case 'hue-rotate': {
      const c = Math.cos((v * Math.PI) / 180);
      const n = Math.sin((v * Math.PI) / 180);
      return [0.213 + c * 0.787 - n * 0.213, 0.715 - c * 0.715 - n * 0.715, 0.072 - c * 0.072 + n * 0.928,
        0.213 - c * 0.213 + n * 0.143, 0.715 + c * 0.285 + n * 0.14, 0.072 - c * 0.072 - n * 0.283,
        0.213 - c * 0.213 - n * 0.787, 0.715 - c * 0.715 + n * 0.715, 0.072 + c * 0.928 + n * 0.072, 0, 0, 0];
    }
    case 'brightness':
      return [v, 0, 0, 0, v, 0, 0, 0, v, 0, 0, 0];
    case 'contrast': {
      const o = (0.5 - 0.5 * v) * 255;
      return [v, 0, 0, 0, v, 0, 0, 0, v, o, o, o];
    }
    default:
      return null; // blur y otros: se omiten (el cambio es mínimo)
  }
}

/** Aplica `b` después de `a`. */
function combinar(a, b) {
  const m = (f, c) => b[f * 3] * a[c] + b[f * 3 + 1] * a[3 + c] + b[f * 3 + 2] * a[6 + c];
  const salida = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) salida.push(m(f, c));
  for (let f = 0; f < 3; f++) {
    salida.push(b[f * 3] * a[9] + b[f * 3 + 1] * a[10] + b[f * 3 + 2] * a[11] + b[9 + f]);
  }
  return salida;
}

const matrices = new Map();

function matrizDeCss(css) {
  if (!matrices.has(css)) {
    let total = IDENTIDAD;
    for (const [, nombre, valor, unidad] of String(css).matchAll(/([a-z-]+)\(\s*([-\d.]+)(%|deg|px)?\s*\)/g)) {
      const m = matrizDe(nombre, Number(valor) / (unidad === '%' ? 100 : 1));
      if (m) total = combinar(total, m);
    }
    matrices.set(css, total);
  }
  return matrices.get(css);
}

/** Aplica el filtro calculando los píxeles de una zona del lienzo. */
export function filtrarPixeles(ctx, x, y, w, h, css) {
  if (!css || css === 'none' || w < 1 || h < 1) return;
  const m = matrizDeCss(css);
  const imagen = ctx.getImageData(x, y, w, h);
  const px = imagen.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    px[i] = m[0] * r + m[1] * g + m[2] * b + m[9];
    px[i + 1] = m[3] * r + m[4] * g + m[5] * b + m[10];
    px[i + 2] = m[6] * r + m[7] * g + m[8] * b + m[11];
  }
  ctx.putImageData(imagen, x, y);
}

/**
 * Dibuja con el filtro: usa `ctx.filter` donde existe y, si no (Safari),
 * corrige los píxeles de la zona dibujada después.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} css filtro CSS
 * @param {{x:number, y:number, w:number, h:number}} zona en píxeles del lienzo
 * @param {() => void} dibujar
 */
export function dibujarConFiltro(ctx, css, zona, dibujar) {
  const activo = Boolean(css) && css !== 'none';
  ctx.save();
  if (activo && FILTRO_NATIVO) ctx.filter = css;
  dibujar();
  ctx.restore();
  if (activo && !FILTRO_NATIVO) {
    filtrarPixeles(ctx, Math.round(zona.x), Math.round(zona.y), Math.round(zona.w), Math.round(zona.h), css);
  }
}
