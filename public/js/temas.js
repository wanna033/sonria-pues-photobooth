/*
 * Plantillas temáticas: amor, amistad, Navidad, Halloween, cumpleaños…
 *
 * Todo se dibuja con figuras vectoriales en el lienzo (corazones, copos,
 * murciélagos, globos…), sin archivos de imagen: se ve igual en la pantalla,
 * en cualquier celular y en la impresión, y cambia de color al personalizar.
 *
 * Un tema define los colores (varias paletas para elegir), el fondo, los
 * adornos, el marco de las fotos, la tipografía, el título, los stickers y un
 * filtro sugerido. El acomodo de las fotos (formato) se elige aparte.
 */

// ------------------------------------------------------------------ colores

function aRgb(hex) {
  const limpio = String(hex).replace('#', '');
  const n = parseInt(limpio.length === 3 ? limpio.replace(/./g, '$&$&') : limpio.slice(0, 6), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}

const aHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Mezcla dos colores: t = 0 es `a`, t = 1 es `b`. */
export function mezclarColor(a, b, t) {
  const x = aRgb(a);
  const y = aRgb(b);
  return aHex(x.map((v, i) => v + (y[i] - v) * t));
}

export function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** ¿El fondo de la paleta es oscuro? (cambia el color del texto y de algunos adornos) */
export const paletaOscura = (paleta) => luminancia(paleta.fondo[0]) < 0.2;

/**
 * Paleta armada a partir de un solo color elegido por el invitado, con la
 * misma "personalidad" (clara u oscura) que la primera paleta del tema.
 */
export function paletaDesdeColor(color, base) {
  const oscuro = paletaOscura(base);
  return {
    nombre: 'Tu color',
    propia: true,
    a: color,
    b: mezclarColor(color, oscuro ? '#ffffff' : '#ffffff', oscuro ? 0.35 : 0.45),
    fondo: oscuro
      ? [mezclarColor(color, '#000000', 0.88), mezclarColor(color, '#000000', 0.7)]
      : [mezclarColor(color, '#ffffff', 0.93), mezclarColor(color, '#ffffff', 0.78)],
    texto: oscuro ? mezclarColor(color, '#ffffff', 0.7) : mezclarColor(color, '#000000', 0.3),
    c: mezclarColor(color, oscuro ? '#000000' : '#ffffff', 0.6), // tercer color (banderines tricolor)
    marco: base.marco,
  };
}

// ------------------------------------------------------------------ formatos (acomodo de las fotos)

/**
 * Acomodos para los temas, con márgenes amplios para que se luzcan los adornos.
 * Medidas a 300 ppp; las tiras se diseñan en media hoja (600×1800) y se
 * duplican al imprimir (dos tiras de 5×15 cm por hoja).
 */
export const FORMATOS_TEMA = {
  'tira-3': {
    nombre: 'Tira de 3',
    fotos: 3,
    ancho: 1200,
    alto: 1800,
    duplicar: true,
    ranuras: [
      { x: 55, y: 95, w: 490, h: 368 },
      { x: 55, y: 497, w: 490, h: 368 },
      { x: 55, y: 899, w: 490, h: 368 },
    ],
    pie: { x: 30, y: 1300, w: 540, h: 470 },
  },
  'tira-4': {
    nombre: 'Tira de 4',
    fotos: 4,
    ancho: 1200,
    alto: 1800,
    duplicar: true,
    ranuras: [
      { x: 55, y: 80, w: 490, h: 310 },
      { x: 55, y: 418, w: 490, h: 310 },
      { x: 55, y: 756, w: 490, h: 310 },
      { x: 55, y: 1094, w: 490, h: 310 },
    ],
    pie: { x: 30, y: 1430, w: 540, h: 340 },
  },
  'retrato-1': {
    nombre: 'Una foto',
    fotos: 1,
    ancho: 1200,
    alto: 1800,
    ranuras: [{ x: 90, y: 100, w: 1020, h: 1275 }],
    pie: { x: 60, y: 1405, w: 1080, h: 360 },
  },
  'cuadricula-4': {
    nombre: 'Cuadrícula',
    fotos: 4,
    ancho: 1800,
    alto: 1200,
    ranuras: [
      { x: 90, y: 90, w: 790, h: 445 },
      { x: 920, y: 90, w: 790, h: 445 },
      { x: 90, y: 565, w: 790, h: 445 },
      { x: 920, y: 565, w: 790, h: 445 },
    ],
    pie: { x: 90, y: 1030, w: 1620, h: 150 },
  },
  'postal-1': {
    nombre: 'Postal',
    fotos: 1,
    ancho: 1800,
    alto: 1200,
    ranuras: [{ x: 90, y: 90, w: 1620, h: 870 }],
    pie: { x: 90, y: 985, w: 1620, h: 195 },
  },
  'tira-2': {
    nombre: 'Tira de 2',
    fotos: 2,
    ancho: 1200,
    alto: 1800,
    duplicar: true,
    ranuras: [
      { x: 55, y: 95, w: 490, h: 540 },
      { x: 55, y: 669, w: 490, h: 540 },
    ],
    pie: { x: 30, y: 1245, w: 540, h: 525 },
  },
  'collage-6': {
    nombre: 'Collage de 6',
    fotos: 6,
    ancho: 1200,
    alto: 1800,
    ranuras: [
      { x: 70, y: 95, w: 510, h: 382 },
      { x: 620, y: 95, w: 510, h: 382 },
      { x: 70, y: 507, w: 510, h: 382 },
      { x: 620, y: 507, w: 510, h: 382 },
      { x: 70, y: 919, w: 510, h: 382 },
      { x: 620, y: 919, w: 510, h: 382 },
    ],
    pie: { x: 60, y: 1330, w: 1080, h: 440 },
  },
  'polaroid-3': {
    nombre: 'Polaroid',
    fotos: 3,
    ancho: 1200,
    alto: 1800,
    // fotos inclinadas con marco blanco grueso abajo, como fotos instantáneas
    ranuras: [
      { x: 120, y: 110, w: 600, h: 450, rot: -5, polaroid: true },
      { x: 480, y: 540, w: 600, h: 450, rot: 4, polaroid: true },
      { x: 150, y: 970, w: 600, h: 450, rot: -3, polaroid: true },
    ],
    pie: { x: 60, y: 1500, w: 1080, h: 270 },
  },
  'historia-1': {
    nombre: 'Historia',
    fotos: 1,
    ancho: 1080,
    alto: 1920,
    // 9:16, del tamaño de las historias de Instagram y los estados de WhatsApp
    ranuras: [{ x: 70, y: 130, w: 940, h: 1380 }],
    pie: { x: 60, y: 1525, w: 960, h: 260 },
  },
  'historia-3': {
    nombre: 'Historia de 3',
    fotos: 3,
    ancho: 1080,
    alto: 1920,
    ranuras: [
      { x: 70, y: 120, w: 940, h: 440 },
      { x: 70, y: 594, w: 940, h: 440 },
      { x: 70, y: 1068, w: 940, h: 440 },
    ],
    pie: { x: 60, y: 1525, w: 960, h: 260 },
  },
  'cuadrado-1': {
    nombre: 'Cuadrado',
    fotos: 1,
    ancho: 1200,
    alto: 1200,
    // 1:1 para publicar en redes
    ranuras: [{ x: 80, y: 80, w: 1040, h: 840 }],
    pie: { x: 80, y: 945, w: 1040, h: 225 },
  },
  'revista': {
    nombre: 'Portada',
    fotos: 1,
    ancho: 1200,
    alto: 1800,
    soloTema: 'revista', // la foto ocupa toda la portada; sólo para el tema Revista
    ranuras: [{ x: 0, y: 0, w: 1200, h: 1800 }],
    pie: null,
  },
};

// ------------------------------------------------------------------ temas

const ANIO = new Date().getFullYear();

/**
 * color de un adorno: 'a' | 'b' | 'texto' | 'marco' (de la paleta),
 * 'contraste' (blanco en fondos oscuros, el color principal en los claros),
 * un color fijo ('#ffffff') o una lista para elegir al azar.
 */
export const TEMAS = [
  {
    id: 'amor',
    nombre: 'Amor',
    icono: '❤️',
    titulo: 'Con todo mi amor',
    formato: 'tira-3',
    fuente: 'elegante',
    filtro: 'rosa',
    fondoExtra: 'bokeh',
    marco: 'solido',
    paletas: [
      { nombre: 'Rojo pasión', a: '#d7263d', b: '#ff7a93', fondo: ['#fff4f5', '#ffd9e0'], texto: '#a4122b', marco: '#ffffff' },
      { nombre: 'Rosa', a: '#f2549a', b: '#ffb1cf', fondo: ['#fff6fa', '#ffe1ee'], texto: '#b8155f', marco: '#ffffff' },
      { nombre: 'Noche romántica', a: '#ff4d6d', b: '#ff8fa3', fondo: ['#2a0612', '#56102a'], texto: '#ffe3ea', marco: '#ffe3ea' },
    ],
    patron: [
      { forma: 'corazon', color: 'a', cantidad: 22, tam: [0.035, 0.08], opacidad: 0.16 },
      { forma: 'corazon', color: 'b', cantidad: 16, tam: [0.02, 0.045], opacidad: 0.35 },
      { forma: 'punto', color: 'b', cantidad: 24, tam: [0.006, 0.012], opacidad: 0.5 },
    ],
    esquinas: [
      { forma: 'corazon', x: 0.07, y: 0.035, tam: 0.14, rot: -0.35, color: 'a', encima: true },
      { forma: 'corazon', x: 0.15, y: 0.02, tam: 0.07, rot: 0.3, color: 'b', encima: true },
      { forma: 'corazon', x: 0.93, y: 0.975, tam: 0.12, rot: 0.3, color: 'a', encima: true },
    ],
    separador: 'corazon',
    sobreFotos: 'corazon',
    stickers: { emojis: ['❤️', '💕', '💘', '😍', '🥰', '🌹', '💋', '💌'], frases: ['Te amo ❤️', 'Juntos', 'Mi persona favorita'] },
  },
  {
    id: 'amistad',
    nombre: 'Amistad',
    icono: '🤝',
    titulo: 'Amigos por siempre',
    formato: 'tira-4',
    fuente: 'divertida',
    filtro: 'vivido',
    marco: 'solido',
    paletas: [
      { nombre: 'Alegre', a: '#ff9f1c', b: '#2ec4b6', fondo: ['#fffaf0', '#fff0d6'], texto: '#e76f51', marco: '#ffffff' },
      { nombre: 'Arcoíris', a: '#8338ec', b: '#ffbe0b', fondo: ['#f7f3ff', '#fff4d6'], texto: '#5a189a', marco: '#ffffff' },
      { nombre: 'Menta', a: '#06d6a0', b: '#118ab2', fondo: ['#effffa', '#dff7ff'], texto: '#0b7a75', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'confeti', color: ['a', 'b', '#ff006e', '#ffbe0b'], cantidad: 60, tam: [0.015, 0.03], opacidad: 0.7 },
      { forma: 'estrella', color: ['a', 'b'], cantidad: 12, tam: [0.025, 0.045], opacidad: 0.55 },
      { forma: 'punto', color: ['a', 'b'], cantidad: 24, tam: [0.008, 0.016], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'estrella', x: 0.08, y: 0.03, tam: 0.12, rot: -0.2, color: 'a', encima: true },
      { forma: 'estrella', x: 0.92, y: 0.03, tam: 0.09, rot: 0.25, color: 'b', encima: true },
    ],
    separador: 'estrella',
    stickers: { emojis: ['🤝', '🫶', '👯', '😂', '🤪', '🍕', '🎉', '⭐'], frases: ['Besties', 'Amigos por siempre', 'Los mejores'] },
  },
  {
    id: 'navidad',
    nombre: 'Navidad',
    icono: '🎄',
    titulo: '¡Feliz Navidad!',
    formato: 'tira-3',
    fuente: 'clasica',
    filtro: 'calido',
    fondoExtra: 'nieve',
    marco: 'doble',
    lineaMarco: 'b',
    paletas: [
      { nombre: 'Clásica', a: '#c1121f', b: '#e9c46a', fondo: ['#0b3d2e', '#14532d'], texto: '#fdf0d5', marco: '#fdf0d5' },
      { nombre: 'Roja', a: '#e9c46a', b: '#ffffff', fondo: ['#7a0c16', '#b3121f'], texto: '#fff4d6', marco: '#fff4d6' },
      { nombre: 'Nevada', a: '#1d6fa3', b: '#c1121f', fondo: ['#f4fbff', '#d9eefb'], texto: '#14532d', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'copo', color: 'contraste', cantidad: 18, tam: [0.03, 0.07], opacidad: 0.35 },
      { forma: 'estrella', color: 'b', cantidad: 8, tam: [0.02, 0.035], opacidad: 0.8 },
      { forma: 'punto', color: 'contraste', cantidad: 40, tam: [0.004, 0.009], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'arbol', x: 0.1, y: 0.95, tam: 0.2, color: '#2d6a4f', encima: true },
      { forma: 'estrella', x: 0.06, y: 0.03, tam: 0.1, rot: -0.2, color: 'b', encima: true },
      { forma: 'copo', x: 0.93, y: 0.03, tam: 0.11, color: 'contraste', encima: true },
    ],
    separador: 'estrella',
    stickers: { emojis: ['🎄', '🎅', '🤶', '🎁', '⛄', '❄️', '🦌', '🔔', '⭐', '🍪'], frases: ['¡Jo, jo, jo!', 'Feliz Navidad', 'Próspero año'] },
  },
  {
    id: 'halloween',
    nombre: 'Halloween',
    icono: '🎃',
    titulo: '¡Feliz Halloween!',
    formato: 'tira-3',
    fuente: 'divertida',
    filtro: 'noche',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Calabaza', a: '#ff7b00', b: '#9d4edd', fondo: ['#0d0d12', '#2a1640'], texto: '#ff9e1b', marco: '#1b1b22' },
      { nombre: 'Morado', a: '#b15eff', b: '#39ff14', fondo: ['#12001f', '#2d0a4e'], texto: '#d29bff', marco: '#1b0a2b' },
      { nombre: 'Verde bruja', a: '#7fff00', b: '#ff7b00', fondo: ['#07140b', '#173a20'], texto: '#a3ff5c', marco: '#101d12' },
    ],
    patron: [
      { forma: 'murcielago', color: 'b', cantidad: 10, tam: [0.05, 0.09], opacidad: 0.8 },
      { forma: 'estrella', color: '#fff6d5', cantidad: 10, tam: [0.01, 0.022], opacidad: 0.8 },
      { forma: 'punto', color: '#ffffff', cantidad: 40, tam: [0.003, 0.007], opacidad: 0.5 },
    ],
    esquinas: [
      { forma: 'telarana', x: 0, y: 0, tam: 0.3, color: '#ffffff', alpha: 0.35, encima: true },
      { forma: 'luna', x: 0.86, y: 0.04, tam: 0.2, color: '#fff4c9', encima: true },
      { forma: 'murcielago', x: 0.7, y: 0.03, tam: 0.09, rot: -0.2, color: '#111111', encima: true },
      { forma: 'murcielago', x: 0.95, y: 0.08, tam: 0.07, rot: 0.3, color: '#111111', encima: true },
      { forma: 'calabaza', x: 0.12, y: 0.965, tam: 0.16, color: 'a', encima: true },
      { forma: 'fantasma', x: 0.88, y: 0.96, tam: 0.14, rot: 0.15, color: '#f5f5f5', encima: true },
    ],
    separador: 'murcielago',
    sobreFotos: 'murcielago',
    colorSobreFotos: '#111111',
    stickers: { emojis: ['🎃', '👻', '🦇', '🕷️', '🕸️', '💀', '🧙', '🍬', '🧛', '🔮'], frases: ['¡Buuu!', 'Dulce o truco', 'Noche de brujas'] },
  },
  {
    id: 'cumpleanos',
    nombre: 'Cumpleaños',
    icono: '🎂',
    titulo: '¡Feliz cumpleaños!',
    formato: 'tira-4',
    fuente: 'divertida',
    filtro: 'vivido',
    fondoExtra: 'rayos',
    marco: 'solido',
    paletas: [
      { nombre: 'Fiesta', a: '#ff006e', b: '#3a86ff', fondo: ['#fff8e6', '#ffe8f1'], texto: '#d90368', marco: '#ffffff' },
      { nombre: 'Dorado', a: '#e0a100', b: '#f4f4f4', fondo: ['#161616', '#2e2a1f'], texto: '#ffd166', marco: '#fff8e1' },
      { nombre: 'Pastel', a: '#ff8fb8', b: '#8ec5ff', fondo: ['#fdfcff', '#f1f7ff'], texto: '#7b5ea7', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'confeti', color: ['a', 'b', '#ffbe0b', '#8338ec'], cantidad: 55, tam: [0.015, 0.03], opacidad: 0.75 },
      { forma: 'punto', color: ['a', 'b', '#ffbe0b'], cantidad: 24, tam: [0.008, 0.016], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'globo', x: 0.08, y: 0.04, tam: 0.16, rot: -0.15, color: 'a', encima: true },
      { forma: 'globo', x: 0.92, y: 0.035, tam: 0.14, rot: 0.15, color: 'b', encima: true },
      { forma: 'globo', x: 0.92, y: 0.93, tam: 0.14, rot: 0.2, color: '#ffbe0b', encima: true },
    ],
    separador: 'estrella',
    stickers: { emojis: ['🎂', '🎈', '🎉', '🎁', '🥳', '🍰', '🎊', '🕯️'], frases: ['¡Feliz cumple!', 'Pide un deseo', '¡A celebrar!'] },
  },
  {
    id: 'boda',
    nombre: 'Boda',
    icono: '💍',
    titulo: 'Nuestra boda',
    formato: 'retrato-1',
    fuente: 'elegante',
    filtro: 'belleza',
    fondoExtra: 'bokeh',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Champaña', a: '#c9a96e', b: '#e8d8b9', fondo: ['#fffdf8', '#f6efe2'], texto: '#8a6d3b', marco: '#ffffff' },
      { nombre: 'Verde olivo', a: '#6b8f71', b: '#c9a96e', fondo: ['#fbfcf8', '#eef3ea'], texto: '#3f5e45', marco: '#ffffff' },
      { nombre: 'Rosa palo', a: '#c98f8f', b: '#e9c9c9', fondo: ['#fffafa', '#f8eaea'], texto: '#8e5a5a', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'hoja', color: 'a', cantidad: 14, tam: [0.04, 0.08], opacidad: 0.22 },
      { forma: 'flor', color: 'b', cantidad: 8, tam: [0.04, 0.07], opacidad: 0.35 },
      { forma: 'punto', color: 'a', cantidad: 26, tam: [0.004, 0.009], opacidad: 0.35 },
    ],
    esquinas: [
      { forma: 'flor', x: 0.05, y: 0.035, tam: 0.1, color: 'a', encima: true },
      { forma: 'hoja', x: 0.12, y: 0.03, tam: 0.09, rot: 1.1, color: '#8aa67f', encima: true },
      { forma: 'flor', x: 0.95, y: 0.965, tam: 0.1, color: 'b', encima: true },
      { forma: 'hoja', x: 0.88, y: 0.97, tam: 0.09, rot: -1.1, color: '#8aa67f', encima: true },
    ],
    separador: 'anillos',
    stickers: { emojis: ['💍', '💐', '🥂', '💒', '🤍', '🕊️', '👰', '🤵'], frases: ['Recién casados', 'Sí, acepto', 'Para siempre'] },
  },
  {
    id: 'xv',
    nombre: 'XV años',
    icono: '👑',
    titulo: 'Mis XV años',
    formato: 'tira-3',
    fuente: 'elegante',
    filtro: 'belleza',
    fondoExtra: 'bokeh',
    colorBokeh: 'a',
    marco: 'doble',
    lineaMarco: 'b',
    paletas: [
      { nombre: 'Rosa y oro', a: '#e0a3b8', b: '#d4af37', fondo: ['#fff7fa', '#fbe4ec'], texto: '#b0527a', marco: '#ffffff' },
      { nombre: 'Lila', a: '#b388eb', b: '#d4af37', fondo: ['#fbf7ff', '#efe3ff'], texto: '#6a3d9a', marco: '#ffffff' },
      { nombre: 'Azul noche', a: '#8ecae6', b: '#d4af37', fondo: ['#0b1d3a', '#1b3a6b'], texto: '#f7e7b4', marco: '#f7e7b4' },
    ],
    patron: [
      { forma: 'chispa', color: 'b', cantidad: 18, tam: [0.02, 0.05], opacidad: 0.7 },
      { forma: 'punto', color: 'b', cantidad: 30, tam: [0.004, 0.009], opacidad: 0.6 },
      { forma: 'estrella', color: 'a', cantidad: 8, tam: [0.02, 0.035], opacidad: 0.5 },
    ],
    esquinas: [
      { forma: 'chispa', x: 0.07, y: 0.03, tam: 0.12, color: 'b', encima: true },
      { forma: 'chispa', x: 0.93, y: 0.03, tam: 0.08, color: 'b', encima: true },
    ],
    separador: 'corona',
    stickers: { emojis: ['👑', '💖', '✨', '👗', '💃', '🌸', '🎀', '🦋'], frases: ['Mis XV', 'Princesa', 'Noche mágica'] },
  },
  {
    id: 'graduacion',
    nombre: 'Graduación',
    icono: '🎓',
    titulo: '¡Lo logramos!',
    formato: 'tira-4',
    fuente: 'clasica',
    filtro: 'cine',
    fondoExtra: 'rayos',
    marco: 'solido',
    paletas: [
      { nombre: 'Azul y oro', a: '#d4af37', b: '#ffffff', fondo: ['#0a1f44', '#123a73'], texto: '#f1d27a', marco: '#ffffff' },
      { nombre: 'Negro y oro', a: '#d4af37', b: '#e5e5e5', fondo: ['#111111', '#262626'], texto: '#e8c766', marco: '#ffffff' },
      { nombre: 'Vino', a: '#f2c14e', b: '#ffffff', fondo: ['#4a0d1c', '#7a1630'], texto: '#f8dd9c', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'estrella', color: 'a', cantidad: 14, tam: [0.015, 0.035], opacidad: 0.6 },
      { forma: 'confeti', color: ['a', 'b'], cantidad: 36, tam: [0.012, 0.025], opacidad: 0.55 },
    ],
    esquinas: [
      { forma: 'birrete', x: 0.1, y: 0.035, tam: 0.16, rot: -0.25, color: 'b', encima: true },
      { forma: 'estrella', x: 0.92, y: 0.03, tam: 0.09, rot: 0.2, color: 'a', encima: true },
    ],
    separador: 'estrella',
    stickers: { emojis: ['🎓', '📜', '🏆', '🥳', '📚', '⭐', '🎉', '💪'], frases: ['¡Graduados!', `Clase ${ANIO}`, '¡Lo logré!'] },
  },
  {
    id: 'babyshower',
    nombre: 'Baby shower',
    icono: '🍼',
    titulo: '¡Bienvenido, bebé!',
    formato: 'retrato-1',
    fuente: 'divertida',
    filtro: 'pastel',
    marco: 'solido',
    paletas: [
      { nombre: 'Celeste', a: '#6fb6de', b: '#ffd6e0', fondo: ['#f5fbff', '#e3f3fc'], texto: '#3a86b4', marco: '#ffffff' },
      { nombre: 'Rosa', a: '#f08fb5', b: '#bde0fe', fondo: ['#fff7fa', '#ffe5ef'], texto: '#c05680', marco: '#ffffff' },
      { nombre: 'Neutro', a: '#9bb57a', b: '#f2cc8f', fondo: ['#fbfaf5', '#f1eedf'], texto: '#6b7f4f', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'nube', color: 'a', cantidad: 8, tam: [0.08, 0.14], opacidad: 0.22 },
      { forma: 'estrella', color: 'b', cantidad: 10, tam: [0.02, 0.04], opacidad: 0.7 },
      { forma: 'punto', color: 'a', cantidad: 22, tam: [0.006, 0.012], opacidad: 0.35 },
    ],
    esquinas: [
      { forma: 'nube', x: 0.12, y: 0.035, tam: 0.18, color: 'a', encima: true },
      { forma: 'estrella', x: 0.9, y: 0.03, tam: 0.08, rot: 0.2, color: 'b', encima: true },
    ],
    separador: 'corazon',
    stickers: { emojis: ['🍼', '👶', '🧸', '🍭', '💙', '💗', '🐣', '🎀'], frases: ['¡Ya viene!', 'Bienvenido, bebé', '¿Niño o niña?'] },
  },
  {
    id: 'anonuevo',
    nombre: 'Año nuevo',
    icono: '🥂',
    titulo: '¡Feliz Año Nuevo!',
    formato: 'tira-4',
    fuente: 'moderna',
    filtro: 'dorado',
    fondoExtra: 'brillo',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Negro y oro', a: '#d4af37', b: '#f5e6b3', fondo: ['#0a0a0a', '#1f1a10'], texto: '#f1d27a', marco: '#f5e6b3' },
      { nombre: 'Plata', a: '#c0c0c0', b: '#ffffff', fondo: ['#0b0f1a', '#1c2436'], texto: '#e6ecf5', marco: '#ffffff' },
      { nombre: 'Champaña', a: '#b08d57', b: '#2b2b2b', fondo: ['#fffaf0', '#f3e6cc'], texto: '#6e5530', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'chispa', color: 'a', cantidad: 22, tam: [0.015, 0.045], opacidad: 0.75 },
      { forma: 'confeti', color: ['a', 'b'], cantidad: 40, tam: [0.012, 0.025], opacidad: 0.55 },
      { forma: 'punto', color: 'a', cantidad: 30, tam: [0.003, 0.008], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'chispa', x: 0.08, y: 0.035, tam: 0.14, color: 'a', encima: true },
      { forma: 'chispa', x: 0.92, y: 0.97, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'chispa',
    stickers: { emojis: ['🥂', '🍾', '🎆', '🎇', '✨', '🕛', '🎉', '💫'], frases: ['¡Feliz año!', 'Salud 🥂', 'Nuevo año, nuevos sueños'] },
  },
  {
    id: 'neon',
    nombre: 'Fiesta neón',
    icono: '🪩',
    titulo: '¡Qué noche!',
    formato: 'tira-4',
    fuente: 'moderna',
    filtro: 'neon',
    fondoExtra: 'brillo',
    marco: 'neon',
    brilloTexto: true,
    paletas: [
      { nombre: 'Rosa y azul', a: '#ff2bd6', b: '#00e5ff', fondo: ['#07000f', '#170030'], texto: '#ff7af0', marco: '#00e5ff' },
      { nombre: 'Verde y morado', a: '#39ff14', b: '#b026ff', fondo: ['#020a02', '#150026'], texto: '#8dff75', marco: '#b026ff' },
      { nombre: 'Naranja y rosa', a: '#ff9100', b: '#ff2bd6', fondo: ['#0f0600', '#26001e'], texto: '#ffb84d', marco: '#ff2bd6' },
    ],
    patron: [
      { forma: 'burbuja', color: ['a', 'b'], cantidad: 16, tam: [0.03, 0.08], opacidad: 0.5, brillo: 0.4 },
      { forma: 'punto', color: ['a', 'b'], cantidad: 30, tam: [0.004, 0.01], opacidad: 0.8, brillo: 1.5 },
      { forma: 'chispa', color: ['a', 'b'], cantidad: 8, tam: [0.02, 0.04], opacidad: 0.8, brillo: 0.6 },
    ],
    esquinas: [],
    separador: 'estrella',
    stickers: { emojis: ['🪩', '🕺', '💃', '🎧', '🔥', '😎', '🎶', '⚡'], frases: ['¡A bailar!', 'Party time', '¡Qué noche!'] },
  },
  {
    id: 'verano',
    nombre: 'Verano',
    icono: '🌴',
    titulo: 'Días de verano',
    formato: 'retrato-1',
    fuente: 'divertida',
    filtro: 'calido',
    fondoExtra: 'ondas',
    marco: 'solido',
    paletas: [
      { nombre: 'Playa', a: '#ff9f1c', b: '#2ec4b6', fondo: ['#e0f7ff', '#fff3d6'], texto: '#0f7c8a', marco: '#ffffff' },
      { nombre: 'Tropical', a: '#ff5d8f', b: '#06d6a0', fondo: ['#f0fff9', '#fff0f5'], texto: '#d6336c', marco: '#ffffff' },
      { nombre: 'Atardecer', a: '#ffd56b', b: '#ff7b54', fondo: ['#4a1d3f', '#b8475a'], texto: '#ffe3a3', marco: '#fff4e0' },
    ],
    patron: [
      { forma: 'hoja', color: 'b', cantidad: 10, tam: [0.04, 0.08], opacidad: 0.3 },
      { forma: 'punto', color: 'a', cantidad: 20, tam: [0.006, 0.012], opacidad: 0.45 },
    ],
    esquinas: [
      { forma: 'sol', x: 0.9, y: 0.045, tam: 0.2, color: 'a', encima: true },
      { forma: 'hoja', x: 0.06, y: 0.04, tam: 0.14, rot: 0.9, color: 'b', encima: true },
      { forma: 'hoja', x: 0.12, y: 0.025, tam: 0.1, rot: 1.6, color: 'b', encima: true },
    ],
    separador: 'sol',
    stickers: { emojis: ['🌴', '☀️', '🏖️', '🍉', '🕶️', '🌊', '🍹', '🐚'], frases: ['Good vibes', 'Modo vacaciones', '¡Al agua!'] },
  },
  {
    id: 'madre',
    nombre: 'Día de la madre',
    icono: '💐',
    titulo: 'Feliz día, mamá',
    formato: 'retrato-1',
    fuente: 'elegante',
    filtro: 'belleza',
    fondoExtra: 'bokeh',
    marco: 'solido',
    paletas: [
      { nombre: 'Flores', a: '#e56b6f', b: '#b5838d', fondo: ['#fff8f5', '#ffe8e0'], texto: '#a4404a', marco: '#ffffff' },
      { nombre: 'Lavanda', a: '#9d8df1', b: '#f6a6d8', fondo: ['#faf8ff', '#efeaff'], texto: '#5e4bb5', marco: '#ffffff' },
      { nombre: 'Durazno', a: '#f4a261', b: '#e76f51', fondo: ['#fffaf4', '#ffeede'], texto: '#b5532f', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'flor', color: ['a', 'b'], cantidad: 14, tam: [0.035, 0.07], opacidad: 0.35 },
      { forma: 'hoja', color: '#8cb369', cantidad: 10, tam: [0.03, 0.06], opacidad: 0.35 },
    ],
    esquinas: [
      { forma: 'flor', x: 0.05, y: 0.035, tam: 0.11, color: 'a', encima: true },
      { forma: 'flor', x: 0.12, y: 0.025, tam: 0.07, color: 'b', encima: true },
      { forma: 'flor', x: 0.95, y: 0.965, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'corazon',
    stickers: { emojis: ['💐', '🌷', '🌸', '💖', '🥰', '🌹', '🎁', '☕'], frases: ['Te quiero, mamá', 'La mejor mamá', 'Gracias, mamá'] },
  },
  {
    id: 'infantil',
    nombre: 'Fiesta infantil',
    icono: '🎠',
    titulo: '¡Un día mágico!',
    formato: 'tira-4',
    fuente: 'divertida',
    filtro: 'caramelo',
    fondoExtra: 'rayos',
    marco: 'solido',
    paletas: [
      { nombre: 'Confeti', a: '#ff4d8d', b: '#4cc9f0', fondo: ['#fff9df', '#ffe7f1'], texto: '#c9184a', marco: '#ffffff' },
      { nombre: 'Dinosaurio', a: '#65a30d', b: '#f59e0b', fondo: ['#f7fee7', '#ecfccb'], texto: '#3f6212', marco: '#ffffff' },
      { nombre: 'Espacio', a: '#a855f7', b: '#22d3ee', fondo: ['#12052a', '#24104f'], texto: '#f0abfc', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'estrella', color: ['a', 'b', '#ffd166'], cantidad: 22, tam: [0.018, 0.045], opacidad: 0.65 },
      { forma: 'confeti', color: ['a', 'b', '#ffd166', '#8ac926'], cantidad: 48, tam: [0.012, 0.025], opacidad: 0.7 },
      { forma: 'burbuja', color: ['a', 'b'], cantidad: 10, tam: [0.035, 0.07], opacidad: 0.28 },
    ],
    esquinas: [
      { forma: 'banderines', x: 0.5, y: 0.012, tam: 0.98, anchoCompleto: true, colores: ['a', 'b', '#ffd166', '#8ac926'] },
      { forma: 'globo', x: 0.08, y: 0.05, tam: 0.16, rot: -0.15, color: 'a', encima: true },
      { forma: 'globo', x: 0.92, y: 0.05, tam: 0.15, rot: 0.15, color: 'b', encima: true },
    ],
    separador: 'estrella',
    sobreFotos: 'estrella',
    stickers: { emojis: ['🎠', '🦄', '🦖', '🚀', '🎈', '🍭', '🎂', '🌟'], frases: ['¡Día mágico!', 'Soy la estrella', '¡A jugar!'] },
  },
  {
    id: 'corporativo',
    nombre: 'Corporativo',
    icono: '🏢',
    titulo: 'Conectamos grandes ideas',
    formato: 'postal-1',
    fuente: 'moderna',
    filtro: 'editorial',
    fondoExtra: 'brillo',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Azul ejecutivo', a: '#2563eb', b: '#38bdf8', fondo: ['#071a33', '#0f2d52'], texto: '#dbeafe', marco: '#ffffff' },
      { nombre: 'Grafito', a: '#d4af37', b: '#94a3b8', fondo: ['#111827', '#273449'], texto: '#f8fafc', marco: '#ffffff' },
      { nombre: 'Innovación', a: '#06b6d4', b: '#8b5cf6', fondo: ['#f0fdfa', '#ede9fe'], texto: '#334155', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'hexagono', color: ['a', 'b'], cantidad: 14, tam: [0.03, 0.07], opacidad: 0.22 },
      { forma: 'punto', color: ['a', 'b'], cantidad: 38, tam: [0.003, 0.009], opacidad: 0.4 },
      { forma: 'chispa', color: 'a', cantidad: 6, tam: [0.015, 0.03], opacidad: 0.45 },
    ],
    esquinas: [
      { forma: 'hexagono', x: 0.07, y: 0.035, tam: 0.1, color: 'a', encima: true },
      { forma: 'hexagono', x: 0.14, y: 0.02, tam: 0.05, color: 'b', encima: true },
      { forma: 'hexagono', x: 0.93, y: 0.965, tam: 0.08, color: 'b', encima: true },
    ],
    separador: 'hexagono',
    stickers: { emojis: ['🏢', '💡', '🚀', '🤝', '📈', '🏆', '✨', '🎯'], frases: ['Gran equipo', 'Conectamos ideas', 'Juntos crecemos'] },
  },
  {
    id: 'deportes',
    nombre: 'Deportes',
    icono: '🏆',
    titulo: '¡Somos campeones!',
    formato: 'cuadricula-4',
    fuente: 'moderna',
    filtro: 'festival',
    fondoExtra: 'rayos',
    marco: 'doble',
    lineaMarco: 'b',
    paletas: [
      { nombre: 'Cancha', a: '#22c55e', b: '#facc15', fondo: ['#052e16', '#14532d'], texto: '#fef08a', marco: '#ffffff' },
      { nombre: 'Azul campeón', a: '#3b82f6', b: '#f8fafc', fondo: ['#0c1e3d', '#1e40af'], texto: '#dbeafe', marco: '#ffffff' },
      { nombre: 'Rojo pasión', a: '#ef4444', b: '#facc15', fondo: ['#450a0a', '#991b1b'], texto: '#fef3c7', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'balon', color: '#ffffff', cantidad: 9, tam: [0.035, 0.07], opacidad: 0.5 },
      { forma: 'estrella', color: ['a', 'b'], cantidad: 14, tam: [0.018, 0.04], opacidad: 0.62 },
      { forma: 'confeti', color: ['a', 'b', '#ffffff'], cantidad: 30, tam: [0.01, 0.022], opacidad: 0.55 },
    ],
    esquinas: [
      { forma: 'balon', x: 0.09, y: 0.045, tam: 0.14, rot: 0.3, color: '#ffffff', encima: true },
      { forma: 'corona', x: 0.92, y: 0.03, tam: 0.1, color: 'b', encima: true },
      { forma: 'estrella', x: 0.92, y: 0.955, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'balon',
    sobreFotos: 'estrella',
    stickers: { emojis: ['🏆', '⚽', '🏀', '🏐', '🥇', '💪', '🔥', '🎉'], frases: ['¡Campeones!', 'Vamos equipo', 'Pasión total'] },
  },
  {
    id: 'mascotas',
    nombre: 'Mascotas',
    icono: '🐾',
    titulo: 'Mi mejor amigo',
    formato: 'retrato-1',
    fuente: 'divertida',
    filtro: 'calido',
    fondoExtra: 'bokeh',
    marco: 'solido',
    paletas: [
      { nombre: 'Ternura', a: '#f97316', b: '#14b8a6', fondo: ['#fff7ed', '#ccfbf1'], texto: '#9a3412', marco: '#ffffff' },
      { nombre: 'Huellitas', a: '#8b5e3c', b: '#eab676', fondo: ['#fffaf3', '#f5e6d3'], texto: '#6b3f25', marco: '#ffffff' },
      { nombre: 'Aventura', a: '#65a30d', b: '#0ea5e9', fondo: ['#f7fee7', '#e0f2fe'], texto: '#3f6212', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'huella', color: ['a', 'b'], cantidad: 18, tam: [0.03, 0.06], opacidad: 0.3 },
      { forma: 'corazon', color: ['a', 'b'], cantidad: 10, tam: [0.02, 0.04], opacidad: 0.3 },
      { forma: 'punto', color: ['a', 'b'], cantidad: 24, tam: [0.006, 0.013], opacidad: 0.4 },
    ],
    esquinas: [
      { forma: 'huella', x: 0.08, y: 0.04, tam: 0.12, rot: -0.35, color: 'a', encima: true },
      { forma: 'huella', x: 0.16, y: 0.02, tam: 0.07, rot: -0.2, color: 'b', encima: true },
      { forma: 'huella', x: 0.92, y: 0.96, tam: 0.1, rot: 0.3, color: 'a', encima: true },
    ],
    separador: 'huella',
    sobreFotos: 'huella',
    stickers: { emojis: ['🐾', '🐶', '🐱', '🦴', '🎾', '❤️', '🐰', '🦜'], frases: ['Mi mejor amigo', 'Amor de cuatro patas', 'Familia peluda'] },
  },
  {
    id: 'comunion',
    nombre: 'Primera comunión',
    icono: '🕊️',
    titulo: 'Mi primera comunión',
    formato: 'tira-3',
    fuente: 'clasica',
    filtro: 'piel',
    fondoExtra: 'brillo',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Blanco y oro', a: '#c9a227', b: '#ffffff', fondo: ['#fffdf5', '#f5ecd1'], texto: '#8a6a10', marco: '#ffffff' },
      { nombre: 'Celeste', a: '#60a5fa', b: '#f8fafc', fondo: ['#f0f9ff', '#dbeafe'], texto: '#1d4ed8', marco: '#ffffff' },
      { nombre: 'Rosa suave', a: '#e8a6b6', b: '#d4af37', fondo: ['#fff8fa', '#fce7ef'], texto: '#9f5267', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'paloma', color: 'a', cantidad: 6, tam: [0.05, 0.09], opacidad: 0.22 },
      { forma: 'chispa', color: ['a', 'b'], cantidad: 16, tam: [0.014, 0.035], opacidad: 0.5 },
      { forma: 'punto', color: 'a', cantidad: 26, tam: [0.003, 0.008], opacidad: 0.35 },
    ],
    esquinas: [
      { forma: 'paloma', x: 0.1, y: 0.04, tam: 0.14, rot: -0.15, color: '#ffffff', encima: true },
      { forma: 'cruz', x: 0.92, y: 0.035, tam: 0.09, color: 'a', encima: true },
      { forma: 'chispa', x: 0.92, y: 0.96, tam: 0.09, color: 'a', encima: true },
    ],
    separador: 'cruz',
    stickers: { emojis: ['🕊️', '🤍', '✨', '🙏', '🌿', '💐', '⭐', '🎁'], frases: ['Día bendecido', 'Mi primera comunión', 'Con amor y fe'] },
  },
  {
    id: 'padre',
    nombre: 'Día del padre',
    icono: '👨‍👧‍👦',
    titulo: 'El mejor papá',
    formato: 'postal-1',
    fuente: 'clasica',
    filtro: 'cine',
    fondoExtra: 'brillo',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Azul elegante', a: '#2563eb', b: '#d4af37', fondo: ['#eff6ff', '#dbeafe'], texto: '#1e3a8a', marco: '#ffffff' },
      { nombre: 'Cuero', a: '#9a6a3a', b: '#d6b37a', fondo: ['#fffaf3', '#ead8bd'], texto: '#5c371d', marco: '#ffffff' },
      { nombre: 'Noche', a: '#60a5fa', b: '#e5e7eb', fondo: ['#0f172a', '#1e293b'], texto: '#bfdbfe', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'corbata', color: ['a', 'b'], cantidad: 8, tam: [0.04, 0.07], opacidad: 0.3 },
      { forma: 'bigote', color: ['a', 'b'], cantidad: 8, tam: [0.04, 0.07], opacidad: 0.3 },
      { forma: 'estrella', color: ['a', 'b'], cantidad: 10, tam: [0.015, 0.03], opacidad: 0.4 },
    ],
    esquinas: [
      { forma: 'corbata', x: 0.08, y: 0.05, tam: 0.14, rot: -0.2, color: 'a', encima: true },
      { forma: 'bigote', x: 0.92, y: 0.965, tam: 0.12, color: 'b', encima: true },
    ],
    separador: 'bigote',
    stickers: { emojis: ['👨‍👧‍👦', '🏆', '💙', '🧔', '⭐', '🎁', '💪', '👑'], frases: ['El mejor papá', 'Mi héroe', 'Te queremos, papá'] },
  },
  {
    id: 'bautizo',
    nombre: 'Bautizo',
    icono: '🕊️',
    titulo: 'Mi bautizo',
    formato: 'retrato-1',
    fuente: 'elegante',
    filtro: 'piel',
    fondoExtra: 'bokeh',
    marco: 'solido',
    paletas: [
      { nombre: 'Celestial', a: '#7db9e8', b: '#d4af37', fondo: ['#f7fcff', '#e2f2ff'], texto: '#3b6f99', marco: '#ffffff' },
      { nombre: 'Rosa bendición', a: '#e8a6b6', b: '#f4d58d', fondo: ['#fff9fb', '#fce8ee'], texto: '#a5576a', marco: '#ffffff' },
      { nombre: 'Salvia', a: '#7c9a79', b: '#d9c5a1', fondo: ['#fbfcf8', '#edf3e9'], texto: '#476145', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'nube', color: 'b', cantidad: 6, tam: [0.07, 0.13], opacidad: 0.2 },
      { forma: 'paloma', color: 'a', cantidad: 5, tam: [0.045, 0.08], opacidad: 0.2 },
      { forma: 'chispa', color: ['a', 'b'], cantidad: 14, tam: [0.014, 0.035], opacidad: 0.55 },
    ],
    esquinas: [
      { forma: 'nube', x: 0.12, y: 0.035, tam: 0.18, color: 'b', encima: true },
      { forma: 'paloma', x: 0.9, y: 0.04, tam: 0.12, rot: 0.15, color: '#ffffff', encima: true },
      { forma: 'flor', x: 0.92, y: 0.96, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'paloma',
    stickers: { emojis: ['🕊️', '🤍', '👶', '✨', '🙏', '🌿', '💧', '⭐'], frases: ['Mi bautizo', 'Día de bendición', 'Con amor y fe'] },
  },
  {
    id: 'revelacion',
    nombre: 'Revelación de bebé',
    icono: '🩷',
    titulo: '¿Niña o niño?',
    formato: 'cuadricula-4',
    fuente: 'divertida',
    filtro: 'pastel',
    fondoExtra: 'rayos',
    marco: 'solido',
    paletas: [
      { nombre: 'Rosa y azul', a: '#f58fbd', b: '#67b7e8', fondo: ['#fff5fa', '#edf8ff'], texto: '#7c4c91', marco: '#ffffff' },
      { nombre: 'Pastel', a: '#c084fc', b: '#67e8f9', fondo: ['#faf5ff', '#ecfeff'], texto: '#7e22ce', marco: '#ffffff' },
      { nombre: 'Fiesta', a: '#ff5d8f', b: '#3a86ff', fondo: ['#fff7ed', '#fdf2f8'], texto: '#c9184a', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'confeti', color: ['a', 'b', '#ffffff'], cantidad: 55, tam: [0.012, 0.028], opacidad: 0.7 },
      { forma: 'corazon', color: ['a', 'b'], cantidad: 16, tam: [0.02, 0.045], opacidad: 0.4 },
    ],
    esquinas: [
      { forma: 'banderines', x: 0.5, y: 0.012, tam: 0.98, anchoCompleto: true, colores: ['a', 'b', '#ffffff'] },
      { forma: 'globo', x: 0.08, y: 0.05, tam: 0.16, color: 'a', encima: true },
      { forma: 'globo', x: 0.92, y: 0.05, tam: 0.16, color: 'b', encima: true },
    ],
    separador: 'corazon',
    stickers: { emojis: ['🩷', '🩵', '👶', '🎀', '🧸', '🍼', '🎉', '❓'], frases: ['¿Niña o niño?', 'La gran sorpresa', 'Team rosa · Team azul'] },
  },
  {
    id: 'despedida',
    nombre: 'Despedida',
    icono: '🥂',
    titulo: 'La última y nos vamos',
    formato: 'tira-4',
    fuente: 'divertida',
    filtro: 'festival',
    fondoExtra: 'brillo',
    marco: 'neon',
    brilloTexto: true,
    paletas: [
      { nombre: 'Rosa fiesta', a: '#ff2d95', b: '#ffd166', fondo: ['#220317', '#4a0730'], texto: '#ff9dcc', marco: '#ffd166' },
      { nombre: 'Noche violeta', a: '#c026d3', b: '#22d3ee', fondo: ['#12001f', '#30105a'], texto: '#f0abfc', marco: '#22d3ee' },
      { nombre: 'Negro y oro', a: '#d4af37', b: '#ffffff', fondo: ['#080808', '#242016'], texto: '#f8df87', marco: '#d4af37' },
    ],
    patron: [
      { forma: 'chispa', color: ['a', 'b'], cantidad: 20, tam: [0.015, 0.04], opacidad: 0.8, brillo: 0.5 },
      { forma: 'confeti', color: ['a', 'b', '#ffffff'], cantidad: 42, tam: [0.01, 0.024], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'anillos', x: 0.09, y: 0.04, tam: 0.12, color: 'b', encima: true },
      { forma: 'corona', x: 0.92, y: 0.03, tam: 0.1, color: 'a', encima: true },
      { forma: 'chispa', x: 0.92, y: 0.96, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'corona',
    stickers: { emojis: ['🥂', '💍', '👑', '💋', '🍾', '✨', '💃', '🪩'], frases: ['Bride squad', 'Team novia', 'La última y nos vamos'] },
  },
  {
    id: 'casino',
    nombre: 'Noche de casino',
    icono: '🎰',
    titulo: 'Noche de suerte',
    formato: 'postal-1',
    fuente: 'clasica',
    filtro: 'dorado',
    fondoExtra: 'brillo',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Las Vegas', a: '#d4af37', b: '#c1121f', fondo: ['#090909', '#251707'], texto: '#f5dc86', marco: '#d4af37' },
      { nombre: 'Rojo y negro', a: '#ef233c', b: '#f8f9fa', fondo: ['#090909', '#31070d'], texto: '#ffccd5', marco: '#ffffff' },
      { nombre: 'Esmeralda', a: '#10b981', b: '#d4af37', fondo: ['#02150f', '#064e3b'], texto: '#a7f3d0', marco: '#d4af37' },
    ],
    patron: [
      { forma: 'pica', color: ['a', 'b'], cantidad: 8, tam: [0.025, 0.05], opacidad: 0.4 },
      { forma: 'corazon', color: ['a', 'b'], cantidad: 8, tam: [0.025, 0.05], opacidad: 0.4 },
      { forma: 'trebol', color: ['a', 'b'], cantidad: 8, tam: [0.025, 0.05], opacidad: 0.4 },
      { forma: 'rombo', color: ['a', 'b'], cantidad: 8, tam: [0.02, 0.045], opacidad: 0.4 },
      { forma: 'punto', color: 'a', cantidad: 30, tam: [0.003, 0.009], opacidad: 0.65, brillo: 0.8 },
    ],
    esquinas: [
      { forma: 'ficha', x: 0.08, y: 0.04, tam: 0.12, color: '#c1121f', encima: true },
      { forma: 'ficha', x: 0.15, y: 0.025, tam: 0.08, color: '#1d3557', encima: true },
      { forma: 'pica', x: 0.92, y: 0.96, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'pica',
    stickers: { emojis: ['🎰', '🎲', '♠️', '♥️', '♦️', '♣️', '💰', '🍸'], frases: ['Noche de suerte', 'Jackpot', 'Todo al rojo'] },
  },
  {
    id: 'carnaval',
    nombre: 'Carnaval',
    icono: '🎭',
    titulo: '¡Que viva la fiesta!',
    formato: 'tira-4',
    fuente: 'divertida',
    filtro: 'caramelo',
    fondoExtra: 'rayos',
    marco: 'solido',
    paletas: [
      { nombre: 'Carnaval', a: '#f72585', b: '#4cc9f0', fondo: ['#fff7d6', '#ffe5f1'], texto: '#b5175b', marco: '#ffffff' },
      { nombre: 'Tropical', a: '#ff8500', b: '#06d6a0', fondo: ['#fff4dc', '#e1fff4'], texto: '#c04f00', marco: '#ffffff' },
      { nombre: 'Noche de máscaras', a: '#b026ff', b: '#ffd166', fondo: ['#10001d', '#33005a'], texto: '#e6b3ff', marco: '#ffd166' },
    ],
    patron: [
      { forma: 'confeti', color: ['a', 'b', '#ffd166', '#06d6a0'], cantidad: 70, tam: [0.01, 0.027], opacidad: 0.78 },
      { forma: 'estrella', color: ['a', 'b'], cantidad: 14, tam: [0.018, 0.04], opacidad: 0.55 },
    ],
    esquinas: [
      { forma: 'banderines', x: 0.5, y: 0.012, tam: 0.98, anchoCompleto: true, colores: ['a', 'b', '#ffd166', '#06d6a0'] },
      { forma: 'antifaz', x: 0.13, y: 0.955, tam: 0.18, rot: -0.2, color: 'a', encima: true },
      { forma: 'antifaz', x: 0.88, y: 0.965, tam: 0.14, rot: 0.25, color: 'b', encima: true },
    ],
    separador: 'antifaz',
    stickers: { emojis: ['🎭', '🎉', '🥳', '🎺', '💃', '🪇', '✨', '🎊'], frases: ['¡Viva la fiesta!', 'Carnaval total', 'Pura alegría'] },
  },
  {
    id: 'revista',
    nombre: 'Portada de revista',
    icono: '📰',
    titulo: 'ESTRELLA',
    formato: 'revista',
    formatos: ['revista'],
    portada: true,
    fuente: 'clasica',
    filtro: 'editorial',
    marco: 'solido',
    // titulares de la portada (el primero se cambia por el nombre del evento si lo hay)
    titulares: ['Los mejores momentos de la noche', 'EXCLUSIVA: ¡la foto del año!', 'Estilo, risas y mucho amor'],
    paletas: [
      { nombre: 'Rojo clásico', a: '#e63946', b: '#ffffff', fondo: ['#111111', '#111111'], texto: '#ffffff', marco: '#ffffff' },
      { nombre: 'Blanco y oro', a: '#ffffff', b: '#ffd166', fondo: ['#111111', '#111111'], texto: '#ffffff', marco: '#ffffff' },
      { nombre: 'Rosa', a: '#ff4f9a', b: '#ffffff', fondo: ['#111111', '#111111'], texto: '#ffffff', marco: '#ffffff' },
    ],
    patron: [],
    esquinas: [],
    stickers: { emojis: ['⭐', '📸', '💋', '🔥', '💎', '👑', '✨', '😎'], frases: ['Exclusiva', 'La foto del año', 'Edición especial'] },
  },
  {
    id: 'muertos',
    nombre: 'Día de muertos',
    icono: '💀',
    titulo: 'Día de muertos',
    formato: 'tira-3',
    fuente: 'divertida',
    filtro: 'calido',
    fondoExtra: 'bokeh',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Cempasúchil', a: '#ff8c00', b: '#e0218a', fondo: ['#1a0b2e', '#3d1458'], texto: '#ffb627', marco: '#fff4e0' },
      { nombre: 'Papel picado', a: '#e0218a', b: '#00b4d8', fondo: ['#fff6e9', '#ffe1c2'], texto: '#8f1d5b', marco: '#ffffff' },
      { nombre: 'Noche de velas', a: '#ffb627', b: '#7b2cbf', fondo: ['#0b0b0b', '#241040'], texto: '#ffd166', marco: '#fff4e0' },
    ],
    patron: [
      { forma: 'cempasuchil', color: '#ff9f1c', cantidad: 10, tam: [0.04, 0.07], opacidad: 0.55 },
      { forma: 'calavera', color: '#fff8f0', cantidad: 4, tam: [0.05, 0.08], opacidad: 0.3 },
      { forma: 'punto', color: ['a', 'b', '#ffd166'], cantidad: 30, tam: [0.004, 0.01], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'banderines', x: 0.5, y: 0.012, tam: 0.98, anchoCompleto: true, colores: ['#e0218a', '#ff8c00', '#00b4d8', '#8ac926', '#7b2cbf'] },
      { forma: 'calavera', x: 0.12, y: 0.955, tam: 0.16, rot: -0.15, color: '#fff8f0', encima: true },
      { forma: 'cempasuchil', x: 0.88, y: 0.96, tam: 0.12, color: '#ff9f1c', encima: true },
    ],
    separador: 'cempasuchil',
    stickers: { emojis: ['💀', '🌼', '🕯️', '🎭', '🌮', '💐', '🦋', '🍞'], frases: ['Día de muertos', 'Siempre en el corazón', '¡Viva la vida!'] },
  },
  {
    id: 'aniversario',
    nombre: 'Aniversario',
    icono: '💞',
    titulo: 'Feliz aniversario',
    formato: 'retrato-1',
    fuente: 'elegante',
    filtro: 'rosa',
    fondoExtra: 'bokeh',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Oro', a: '#c9a227', b: '#e8c1c5', fondo: ['#fffaf3', '#f6ebe0'], texto: '#8a6d1f', marco: '#ffffff' },
      { nombre: 'Rubí', a: '#e0457b', b: '#f9a8d4', fondo: ['#2a0a16', '#4c0d27'], texto: '#fde2ec', marco: '#fde2ec' },
      { nombre: 'Plata', a: '#8e9aaf', b: '#cbc0d3', fondo: ['#fbfbfd', '#eceef4'], texto: '#4a5068', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'corazon', color: ['a', 'b'], cantidad: 14, tam: [0.02, 0.05], opacidad: 0.25 },
      { forma: 'chispa', color: 'a', cantidad: 12, tam: [0.015, 0.035], opacidad: 0.5 },
      { forma: 'punto', color: 'a', cantidad: 24, tam: [0.003, 0.008], opacidad: 0.35 },
    ],
    esquinas: [
      { forma: 'anillos', x: 0.08, y: 0.04, tam: 0.12, color: 'a', encima: true },
      { forma: 'corazon', x: 0.92, y: 0.965, tam: 0.1, rot: 0.2, color: 'b', encima: true },
    ],
    separador: 'anillos',
    stickers: { emojis: ['💞', '🥂', '💍', '🌹', '🍾', '❤️', '📸', '✨'], frases: ['Feliz aniversario', 'Juntos siempre', 'Te elegiría otra vez'] },
  },
  {
    id: 'vaquero',
    nombre: 'Vaquero',
    icono: '🤠',
    titulo: '¡Yiija!',
    formato: 'tira-3',
    fuente: 'clasica',
    filtro: 'retro',
    fondoExtra: 'rayos',
    marco: 'doble',
    lineaMarco: 'a',
    paletas: [
      { nombre: 'Rancho', a: '#b5651d', b: '#e9b949', fondo: ['#fdf3e1', '#f1d9b5'], texto: '#6f3b12', marco: '#fffaf0' },
      { nombre: 'Cuero', a: '#d4a373', b: '#faedcd', fondo: ['#3b2416', '#5c3a21'], texto: '#faedcd', marco: '#faedcd' },
      { nombre: 'Denim', a: '#e76f51', b: '#f2cc8f', fondo: ['#1f3b57', '#2f5d8a'], texto: '#f2cc8f', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'herradura', color: 'a', cantidad: 8, tam: [0.035, 0.06], opacidad: 0.3 },
      { forma: 'estrella', color: 'b', cantidad: 12, tam: [0.02, 0.04], opacidad: 0.55 },
      { forma: 'punto', color: 'a', cantidad: 26, tam: [0.004, 0.009], opacidad: 0.35 },
    ],
    esquinas: [
      { forma: 'sombrero', x: 0.12, y: 0.035, tam: 0.2, rot: -0.12, color: 'a', encima: true },
      { forma: 'herradura', x: 0.9, y: 0.965, tam: 0.1, rot: 0.2, color: 'b', encima: true },
    ],
    separador: 'estrella',
    stickers: { emojis: ['🤠', '🐴', '🌵', '🐂', '⭐', '🎸', '🍺', '🔥'], frases: ['¡Yiija!', 'Cowboy style', 'Pura fiesta country'] },
  },
  {
    id: 'hawaiana',
    nombre: 'Hawaiana',
    icono: '🌺',
    titulo: 'Aloha',
    formato: 'retrato-1',
    fuente: 'divertida',
    filtro: 'vivido',
    fondoExtra: 'ondas',
    marco: 'solido',
    paletas: [
      { nombre: 'Tropical', a: '#ff4d6d', b: '#2ec4b6', fondo: ['#fff4e6', '#ffe0c7'], texto: '#d62f55', marco: '#ffffff' },
      { nombre: 'Laguna', a: '#ff9f1c', b: '#0096c7', fondo: ['#e6fbff', '#cdf3ff'], texto: '#006d8f', marco: '#ffffff' },
      { nombre: 'Atardecer', a: '#ffd166', b: '#ef476f', fondo: ['#3a0f3f', '#a4304f'], texto: '#ffe3a3', marco: '#fff4e0' },
    ],
    patron: [
      { forma: 'hibisco', color: ['a', 'b'], cantidad: 9, tam: [0.04, 0.08], opacidad: 0.35 },
      { forma: 'hoja', color: '#2a9d8f', cantidad: 9, tam: [0.04, 0.08], opacidad: 0.3 },
      { forma: 'punto', color: 'a', cantidad: 20, tam: [0.005, 0.011], opacidad: 0.4 },
    ],
    esquinas: [
      { forma: 'hibisco', x: 0.07, y: 0.04, tam: 0.14, rot: 0.2, color: 'a', encima: true },
      { forma: 'hoja', x: 0.15, y: 0.03, tam: 0.1, rot: 1.3, color: '#2a9d8f', encima: true },
      { forma: 'sol', x: 0.9, y: 0.045, tam: 0.18, color: '#ffd166', encima: true },
      { forma: 'hibisco', x: 0.93, y: 0.965, tam: 0.1, color: 'b', encima: true },
    ],
    separador: 'hibisco',
    stickers: { emojis: ['🌺', '🌴', '🍍', '🥥', '🏄', '🌊', '🍹', '🤙'], frases: ['Aloha', 'Good vibes', 'Island time'] },
  },
  {
    id: 'patrio',
    nombre: 'Fiesta patria',
    icono: '🎆',
    titulo: '¡Viva mi tierra!',
    formato: 'tira-4',
    fuente: 'clasica',
    filtro: 'vivido',
    fondoExtra: 'rayos',
    marco: 'solido',
    paletas: [
      { nombre: 'Amarillo, azul y rojo', a: '#fcd116', b: '#003893', c: '#ce1126', fondo: ['#fffdf3', '#fff4c7'], texto: '#003893', marco: '#ffffff' },
      { nombre: 'Verde, blanco y rojo', a: '#006847', b: '#ce1126', c: '#ffffff', fondo: ['#fbfff9', '#f1faef'], texto: '#006847', marco: '#ffffff' },
      { nombre: 'Azul, blanco y rojo', a: '#0033a0', b: '#d52b1e', c: '#ffffff', fondo: ['#f5f8ff', '#e6ecff'], texto: '#0033a0', marco: '#ffffff' },
    ],
    patron: [
      { forma: 'estrella', color: ['a', 'b', 'c'], cantidad: 16, tam: [0.02, 0.045], opacidad: 0.55 },
      { forma: 'confeti', color: ['a', 'b', 'c'], cantidad: 40, tam: [0.012, 0.026], opacidad: 0.6 },
    ],
    esquinas: [
      { forma: 'banderines', x: 0.5, y: 0.012, tam: 0.98, anchoCompleto: true, colores: ['a', 'b', 'c'] },
      { forma: 'estrella', x: 0.92, y: 0.955, tam: 0.1, color: 'a', encima: true },
    ],
    separador: 'estrella',
    stickers: { emojis: ['🎆', '🎉', '⭐', '🎺', '🥁', '💃', '🇨🇴', '🇲🇽'], frases: ['¡Viva mi tierra!', 'Orgullo patrio', '¡Que viva la fiesta!'] },
  },
  {
    id: 'rock',
    nombre: 'Rock',
    icono: '🎸',
    titulo: 'Rock & Roll',
    formato: 'tira-4',
    fuente: 'moderna',
    filtro: 'dramatico',
    fondoExtra: 'brillo',
    marco: 'doble',
    lineaMarco: 'a',
    brilloTexto: true,
    paletas: [
      { nombre: 'Eléctrico', a: '#ffea00', b: '#ff006e', fondo: ['#0a0a0a', '#1c1c1c'], texto: '#ffea00', marco: '#161616' },
      { nombre: 'Metal', a: '#e5e5e5', b: '#ff2e2e', fondo: ['#050505', '#2b0000'], texto: '#f1f1f1', marco: '#1a1a1a' },
      { nombre: 'Punk', a: '#39ff14', b: '#ff00a0', fondo: ['#0d0014', '#260033'], texto: '#39ff14', marco: '#141414' },
    ],
    patron: [
      { forma: 'rayo', color: ['a', 'b'], cantidad: 10, tam: [0.03, 0.06], opacidad: 0.5 },
      { forma: 'nota', color: ['a', 'b'], cantidad: 8, tam: [0.03, 0.05], opacidad: 0.4 },
      { forma: 'estrella', color: 'a', cantidad: 10, tam: [0.012, 0.025], opacidad: 0.6, brillo: 0.6 },
    ],
    esquinas: [
      { forma: 'rayo', x: 0.08, y: 0.04, tam: 0.13, rot: -0.2, color: 'a', encima: true },
      { forma: 'nota', x: 0.92, y: 0.955, tam: 0.1, rot: 0.15, color: 'b', encima: true },
    ],
    separador: 'rayo',
    stickers: { emojis: ['🎸', '🤘', '🎤', '🥁', '⚡', '🔥', '😎', '🎶'], frases: ['Rock & Roll', '¡Arriba el rock!', 'Modo concierto'] },
  },
];

export const temaPorId = (id) => TEMAS.find((t) => t.id === id) || null;

// ------------------------------------------------------------------ figuras

/** Cada figura se dibuja centrada en (0, 0) y mide más o menos `s` de lado. */
const FORMAS = {
  corazon(ctx, s) {
    const k = s / 34;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      if (i) ctx.lineTo(x * k, (y - 2.5) * k);
      else ctx.moveTo(x * k, (y - 2.5) * k);
    }
    ctx.closePath();
    ctx.fill();
  },

  estrella(ctx, s) {
    const R = s / 2;
    const r = R * 0.45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r : R;
      ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fill();
  },

  chispa(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.quadraticCurveTo(0, 0, R, 0);
    ctx.quadraticCurveTo(0, 0, 0, R);
    ctx.quadraticCurveTo(0, 0, -R, 0);
    ctx.quadraticCurveTo(0, 0, 0, -R);
    ctx.fill();
  },

  copo(ctx, s) {
    const R = s / 2;
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const ang = (k * Math.PI) / 3;
      const c = Math.cos(ang);
      const n = Math.sin(ang);
      ctx.moveTo(0, 0);
      ctx.lineTo(c * R, n * R);
      const bx = c * R * 0.55;
      const by = n * R * 0.55;
      for (const d of [-1, 1]) {
        const a2 = ang + (d * Math.PI) / 4;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a2) * R * 0.3, by + Math.sin(a2) * R * 0.3);
      }
    }
    ctx.stroke();
  },

  confeti(ctx, s) {
    ctx.fillRect(-s / 2, -s * 0.22, s, s * 0.44);
  },

  rombo(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(R * 0.72, 0);
    ctx.lineTo(0, R);
    ctx.lineTo(-R * 0.72, 0);
    ctx.closePath();
    ctx.fill();
  },

  punto(ctx, s) {
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.fill();
  },

  burbuja(ctx, s) {
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.stroke();
  },

  globo(ctx, s) {
    const rx = s * 0.34;
    const ry = s * 0.42;
    const cy = -s * 0.08;
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, cy + ry - 1);
    ctx.lineTo(-s * 0.05, cy + ry + s * 0.07);
    ctx.lineTo(s * 0.05, cy + ry + s * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.beginPath();
    ctx.moveTo(0, cy + ry + s * 0.07);
    ctx.quadraticCurveTo(s * 0.1, s * 0.6, 0, s * 0.95);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, cy - ry * 0.38, rx * 0.17, ry * 0.26, -0.5, 0, Math.PI * 2);
    ctx.fill();
  },

  murcielago(ctx, s) {
    const r = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, -0.12 * r);
    ctx.quadraticCurveTo(0.35 * r, -0.45 * r, r, -0.2 * r);
    ctx.quadraticCurveTo(0.8 * r, 0, 0.75 * r, 0.22 * r);
    ctx.quadraticCurveTo(0.6 * r, 0.06 * r, 0.45 * r, 0.24 * r);
    ctx.quadraticCurveTo(0.3 * r, 0.1 * r, 0.14 * r, 0.3 * r);
    ctx.quadraticCurveTo(0, 0.46 * r, -0.14 * r, 0.3 * r);
    ctx.quadraticCurveTo(-0.3 * r, 0.1 * r, -0.45 * r, 0.24 * r);
    ctx.quadraticCurveTo(-0.6 * r, 0.06 * r, -0.75 * r, 0.22 * r);
    ctx.quadraticCurveTo(-0.8 * r, 0, -r, -0.2 * r);
    ctx.quadraticCurveTo(-0.35 * r, -0.45 * r, 0, -0.12 * r);
    ctx.fill();
    // orejas
    ctx.beginPath();
    ctx.moveTo(-0.13 * r, -0.08 * r);
    ctx.lineTo(-0.16 * r, -0.34 * r);
    ctx.lineTo(-0.03 * r, -0.14 * r);
    ctx.lineTo(0.03 * r, -0.14 * r);
    ctx.lineTo(0.16 * r, -0.34 * r);
    ctx.lineTo(0.13 * r, -0.08 * r);
    ctx.fill();
  },

  calabaza(ctx, s) {
    const R = s / 2;
    for (const [dx, rx] of [[-0.3, 0.42], [0.3, 0.42], [0, 0.46]]) {
      ctx.beginPath();
      ctx.ellipse(dx * R, 0.1 * R, rx * R, 0.6 * R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = R * 0.04;
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#3a5a1e';
    ctx.beginPath();
    ctx.roundRect(-0.07 * R, -0.72 * R, 0.14 * R, 0.24 * R, 0.04 * R);
    ctx.fill();
    // cara de calabaza
    ctx.fillStyle = 'rgba(45,15,0,0.85)';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(d * 0.3 * R, -0.12 * R);
      ctx.lineTo(d * 0.16 * R, 0.08 * R);
      ctx.lineTo(d * 0.42 * R, 0.08 * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-0.4 * R, 0.25 * R);
    const dientes = [-0.26, -0.13, 0, 0.13, 0.26];
    dientes.forEach((x, i) => ctx.lineTo(x * R, (i % 2 ? 0.3 : 0.4) * R));
    ctx.lineTo(0.4 * R, 0.25 * R);
    ctx.quadraticCurveTo(0, 0.7 * R, -0.4 * R, 0.25 * R);
    ctx.fill();
  },

  fantasma(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(-0.5 * R, 0.62 * R);
    ctx.lineTo(-0.5 * R, -0.1 * R);
    ctx.arc(0, -0.1 * R, 0.5 * R, Math.PI, 0);
    ctx.lineTo(0.5 * R, 0.62 * R);
    for (let i = 0; i < 3; i++) {
      const x1 = 0.5 * R - ((i + 0.5) * R) / 3;
      const x2 = 0.5 * R - ((i + 1) * R) / 3;
      ctx.quadraticCurveTo(x1, 0.42 * R, x2, 0.62 * R);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(d * 0.17 * R, -0.14 * R, 0.07 * R, 0.11 * R, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0.12 * R, 0.08 * R, 0.1 * R, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  luna(ctx, s) {
    const R = s / 2;
    ctx.save();
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = s * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (const [x, y, r] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.24], [-0.1, 0.4, 0.12], [0.35, -0.35, 0.1]]) {
      ctx.beginPath();
      ctx.arc(x * R, y * R, r * R, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  flor(ctx, s) {
    const R = s / 2;
    for (let k = 0; k < 5; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.48, R * 0.3, R * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.24, 0, Math.PI * 2);
    ctx.fill();
  },

  hoja(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.quadraticCurveTo(R * 0.75, 0, 0, R);
    ctx.quadraticCurveTo(-R * 0.75, 0, 0, -R);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.8);
    ctx.lineTo(0, R * 0.85);
    ctx.stroke();
  },

  nube(ctx, s) {
    const R = s / 2;
    for (const [x, y, r] of [[-0.45, 0.12, 0.3], [-0.1, -0.12, 0.4], [0.32, 0.02, 0.32]]) {
      ctx.beginPath();
      ctx.arc(x * R, y * R, r * R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.roundRect(-0.75 * R, 0.05 * R, 1.4 * R, 0.37 * R, 0.18 * R);
    ctx.fill();
  },

  sol(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const ang = (k * Math.PI) / 6;
      const ancho = Math.PI / 24;
      ctx.moveTo(Math.cos(ang - ancho) * R * 0.58, Math.sin(ang - ancho) * R * 0.58);
      ctx.lineTo(Math.cos(ang) * R, Math.sin(ang) * R);
      ctx.lineTo(Math.cos(ang + ancho) * R * 0.58, Math.sin(ang + ancho) * R * 0.58);
    }
    ctx.fill();
  },

  birrete(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(-0.55 * R, 0);
    ctx.lineTo(-0.55 * R, 0.38 * R);
    ctx.quadraticCurveTo(0, 0.62 * R, 0.55 * R, 0.38 * R);
    ctx.lineTo(0.55 * R, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -0.55 * R);
    ctx.lineTo(R, -0.18 * R);
    ctx.lineTo(0, 0.18 * R);
    ctx.lineTo(-R, -0.18 * R);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f2c14e';
    ctx.fillStyle = '#f2c14e';
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -0.18 * R);
    ctx.lineTo(0.72 * R, -0.05 * R);
    ctx.lineTo(0.72 * R, 0.45 * R);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0.72 * R, 0.52 * R, 0.07 * R, 0.12 * R, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  arbol(ctx, s) {
    const R = s / 2;
    const pisos = [[-1, -0.25, 0.45], [-0.6, 0.2, 0.65], [-0.15, 0.65, 0.85]];
    for (const [arriba, abajo, ancho] of pisos) {
      ctx.beginPath();
      ctx.moveTo(0, arriba * R);
      ctx.lineTo(ancho * R, abajo * R);
      ctx.lineTo(-ancho * R, abajo * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(-0.12 * R, 0.65 * R, 0.24 * R, 0.3 * R);
    for (const [x, y, c] of [[-0.2, -0.3, '#e63946'], [0.25, 0.05, '#ffd166'], [-0.35, 0.45, '#ffd166'], [0.4, 0.5, '#e63946'], [0, 0.25, '#ffffff']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x * R, y * R, 0.07 * R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.translate(0, -R);
    FORMAS.estrella(ctx, R * 0.42);
  },

  /** Telaraña en una esquina: se dibuja hacia abajo y a la derecha del punto (0, 0). */
  telarana(ctx, s) {
    const R = s;
    ctx.lineWidth = Math.max(1, s * 0.012);
    const rayos = 6;
    const puntos = (k) => [...Array(rayos).keys()].map((i) => {
      const ang = (i / (rayos - 1)) * (Math.PI / 2);
      return [Math.cos(ang) * R * k, Math.sin(ang) * R * k];
    });
    ctx.beginPath();
    for (const [x, y] of puntos(1)) {
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
    }
    for (const k of [0.25, 0.45, 0.65, 0.85]) {
      const p = puntos(k);
      ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) {
        const [x0, y0] = p[i - 1];
        const [x1, y1] = p[i];
        ctx.quadraticCurveTo((x0 + x1) * 0.42, (y0 + y1) * 0.42, x1, y1);
      }
    }
    ctx.stroke();
  },

  anillos(ctx, s) {
    const R = s / 2;
    ctx.lineWidth = Math.max(1, R * 0.12);
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(d * 0.24 * R, 0.12 * R, 0.4 * R, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-0.24 * R, -0.58 * R);
    ctx.lineTo(-0.12 * R, -0.42 * R);
    ctx.lineTo(-0.24 * R, -0.26 * R);
    ctx.lineTo(-0.36 * R, -0.42 * R);
    ctx.closePath();
    ctx.fill();
  },

  corona(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(-R, 0.45 * R);
    ctx.lineTo(-R, -0.3 * R);
    ctx.lineTo(-0.5 * R, 0.1 * R);
    ctx.lineTo(0, -0.55 * R);
    ctx.lineTo(0.5 * R, 0.1 * R);
    ctx.lineTo(R, -0.3 * R);
    ctx.lineTo(R, 0.45 * R);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [x, y] of [[-R, -0.3 * R], [0, -0.55 * R], [R, -0.3 * R]]) {
      ctx.beginPath();
      ctx.arc(x, y, 0.13 * R, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  huella(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.ellipse(0, 0.25 * R, 0.4 * R, 0.33 * R, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, r] of [[-0.45, -0.22, 0.15], [-0.16, -0.5, 0.16], [0.16, -0.5, 0.16], [0.45, -0.22, 0.15]]) {
      ctx.beginPath();
      ctx.ellipse(x * R, y * R, r * R, r * R * 1.2, x * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  balon(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1, R * 0.06);
    const pentagono = (cx, cy, r, giro) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = giro + (i * Math.PI * 2) / 5;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    };
    pentagono(0, 0, R * 0.32, -Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32);
      ctx.lineTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72);
      ctx.stroke();
      pentagono(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02, R * 0.3, a + Math.PI / 5);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
  },

  /** Pica de la baraja (♠). */
  pica(ctx, s) {
    const R = s / 2;
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.translate(0, 0.12 * R);
    FORMAS.corazon(ctx, s * 0.95);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0, 0.2 * R);
    ctx.lineTo(0.22 * R, 0.95 * R);
    ctx.lineTo(-0.22 * R, 0.95 * R);
    ctx.closePath();
    ctx.fill();
  },

  /** Trébol de la baraja (♣). */
  trebol(ctx, s) {
    const R = s / 2;
    for (const [x, y] of [[0, -0.45], [-0.42, 0.08], [0.42, 0.08]]) {
      ctx.beginPath();
      ctx.arc(x * R, y * R, 0.32 * R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.2 * R, 0.95 * R);
    ctx.lineTo(-0.2 * R, 0.95 * R);
    ctx.closePath();
    ctx.fill();
  },

  /** Ficha de casino. */
  ficha(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.fillRect(-0.1 * R, -R, 0.2 * R, 0.24 * R);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, R * 0.06);
    ctx.setLineDash([R * 0.12, R * 0.1]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  paloma(ctx, s) {
    const R = s / 2;
    ctx.beginPath(); // cuerpo
    ctx.ellipse(-0.05 * R, 0.12 * R, 0.55 * R, 0.26 * R, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // cabeza
    ctx.arc(0.48 * R, -0.18 * R, 0.17 * R, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // cola
    ctx.moveTo(-0.5 * R, 0.2 * R);
    ctx.lineTo(-R, 0.05 * R);
    ctx.lineTo(-0.92 * R, 0.42 * R);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // ala
    ctx.moveTo(-0.25 * R, 0.02 * R);
    ctx.bezierCurveTo(-0.35 * R, -0.7 * R, 0.15 * R, -0.95 * R, 0.25 * R, -0.85 * R);
    ctx.bezierCurveTo(0.1 * R, -0.45 * R, 0.15 * R, -0.1 * R, 0.2 * R, 0.02 * R);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4a261'; // pico
    ctx.beginPath();
    ctx.moveTo(0.63 * R, -0.2 * R);
    ctx.lineTo(0.82 * R, -0.13 * R);
    ctx.lineTo(0.62 * R, -0.1 * R);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b2b2b'; // ojo
    ctx.beginPath();
    ctx.arc(0.52 * R, -0.22 * R, 0.03 * R, 0, Math.PI * 2);
    ctx.fill();
  },

  cruz(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.roundRect(-0.13 * R, -R, 0.26 * R, 2 * R, 0.08 * R);
    ctx.roundRect(-0.6 * R, -0.52 * R, 1.2 * R, 0.26 * R, 0.08 * R);
    ctx.fill();
  },

  corbata(ctx, s) {
    const R = s / 2;
    ctx.beginPath(); // nudo
    ctx.moveTo(-0.22 * R, -R);
    ctx.lineTo(0.22 * R, -R);
    ctx.lineTo(0.14 * R, -0.68 * R);
    ctx.lineTo(-0.14 * R, -0.68 * R);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // cuerpo
    ctx.moveTo(-0.13 * R, -0.64 * R);
    ctx.lineTo(0.13 * R, -0.64 * R);
    ctx.lineTo(0.32 * R, 0.7 * R);
    ctx.lineTo(0, R);
    ctx.lineTo(-0.32 * R, 0.7 * R);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = Math.max(1, R * 0.06);
    ctx.beginPath();
    for (const y of [-0.3, 0.05, 0.4]) {
      ctx.moveTo(-0.22 * R, y * R);
      ctx.lineTo(0.22 * R, (y - 0.18) * R);
    }
    ctx.stroke();
  },

  /** Antifaz de carnaval (con los ojos huecos). */
  antifaz(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(-R, -0.25 * R);
    ctx.bezierCurveTo(-0.6 * R, -0.5 * R, -0.2 * R, -0.35 * R, 0, -0.2 * R);
    ctx.bezierCurveTo(0.2 * R, -0.35 * R, 0.6 * R, -0.5 * R, R, -0.25 * R);
    ctx.bezierCurveTo(0.95 * R, 0.25 * R, 0.55 * R, 0.45 * R, 0.25 * R, 0.3 * R);
    ctx.quadraticCurveTo(0, 0.12 * R, -0.25 * R, 0.3 * R);
    ctx.bezierCurveTo(-0.55 * R, 0.45 * R, -0.95 * R, 0.25 * R, -R, -0.25 * R);
    ctx.closePath();
    ctx.ellipse(-0.45 * R, -0.02 * R, 0.22 * R, 0.14 * R, 0.15, 0, Math.PI * 2);
    ctx.ellipse(0.45 * R, -0.02 * R, 0.22 * R, 0.14 * R, -0.15, 0, Math.PI * 2);
    ctx.fill('evenodd');
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const x of [-0.75, -0.2, 0.2, 0.75]) {
      ctx.beginPath();
      ctx.arc(x * R, -0.3 * R, 0.05 * R, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  bigote(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, -0.1 * R);
    ctx.bezierCurveTo(-0.3 * R, -0.45 * R, -0.75 * R, -0.2 * R, -0.85 * R, 0.1 * R);
    ctx.bezierCurveTo(-0.95 * R, -0.1 * R, -R, -0.3 * R, -0.85 * R, -0.35 * R);
    ctx.bezierCurveTo(-1.05 * R, -0.25 * R, -1.02 * R, 0.25 * R, -0.7 * R, 0.25 * R);
    ctx.bezierCurveTo(-0.4 * R, 0.3 * R, -0.15 * R, 0.1 * R, 0, 0.12 * R);
    ctx.bezierCurveTo(0.15 * R, 0.1 * R, 0.4 * R, 0.3 * R, 0.7 * R, 0.25 * R);
    ctx.bezierCurveTo(1.02 * R, 0.25 * R, 1.05 * R, -0.25 * R, 0.85 * R, -0.35 * R);
    ctx.bezierCurveTo(R, -0.3 * R, 0.95 * R, -0.1 * R, 0.85 * R, 0.1 * R);
    ctx.bezierCurveTo(0.75 * R, -0.2 * R, 0.3 * R, -0.45 * R, 0, -0.1 * R);
    ctx.fill();
  },

  /** Calavera de azúcar (Día de muertos). */
  calavera(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.arc(0, -0.15 * R, 0.72 * R, Math.PI * 0.85, Math.PI * 0.15);
    ctx.lineTo(0.42 * R, 0.55 * R);
    ctx.quadraticCurveTo(0, 0.85 * R, -0.42 * R, 0.55 * R);
    ctx.closePath();
    ctx.fill();
    // ojos con flores
    for (const d of [-1, 1]) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(d * 0.3 * R, -0.1 * R, 0.2 * R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d < 0 ? '#e0218a' : '#00b4d8';
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(d * 0.3 * R + Math.cos(a) * 0.09 * R, -0.1 * R + Math.sin(a) * 0.09 * R, 0.055 * R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(d * 0.3 * R, -0.1 * R, 0.05 * R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a1a1a'; // nariz
    ctx.save();
    ctx.translate(0, 0.2 * R);
    ctx.rotate(Math.PI);
    FORMAS.corazon(ctx, 0.2 * R);
    ctx.restore();
    ctx.strokeStyle = '#1a1a1a'; // dientes
    ctx.lineWidth = Math.max(1, R * 0.035);
    ctx.beginPath();
    ctx.moveTo(-0.3 * R, 0.45 * R);
    ctx.lineTo(0.3 * R, 0.45 * R);
    for (const x of [-0.2, -0.07, 0.07, 0.2]) {
      ctx.moveTo(x * R, 0.38 * R);
      ctx.lineTo(x * R, 0.52 * R);
    }
    ctx.stroke();
    ctx.fillStyle = '#e0218a'; // adorno en la frente
    FORMAS.corazon(ctx, 0.16 * R);
  },

  /** Flor de cempasúchil: muchos pétalos en capas. */
  cempasuchil(ctx, s) {
    const R = s / 2;
    const base = ctx.fillStyle;
    [[1, 14, 0.2], [0.72, 12, 0.17], [0.45, 10, 0.14]].forEach(([radio, petalos, tam], capa) => {
      ctx.fillStyle = capa === 1 ? mezclarColor(base, '#000000', 0.12) : base;
      for (let k = 0; k < petalos; k++) {
        const a = (k * Math.PI * 2) / petalos + capa * 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * radio * R * 0.7, Math.sin(a) * radio * R * 0.7, tam * R * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.fillStyle = mezclarColor(base, '#000000', 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, 0.15 * R, 0, Math.PI * 2);
    ctx.fill();
  },

  /** Sombrero vaquero. */
  sombrero(ctx, s) {
    const R = s / 2;
    ctx.beginPath(); // ala
    ctx.moveTo(-R, 0.05 * R);
    ctx.quadraticCurveTo(-0.95 * R, 0.4 * R, -0.5 * R, 0.38 * R);
    ctx.quadraticCurveTo(0, 0.5 * R, 0.5 * R, 0.38 * R);
    ctx.quadraticCurveTo(0.95 * R, 0.4 * R, R, 0.05 * R);
    ctx.quadraticCurveTo(0.7 * R, 0.25 * R, 0, 0.22 * R);
    ctx.quadraticCurveTo(-0.7 * R, 0.25 * R, -R, 0.05 * R);
    ctx.fill();
    ctx.beginPath(); // copa con la hendidura
    ctx.moveTo(-0.48 * R, 0.25 * R);
    ctx.bezierCurveTo(-0.55 * R, -0.3 * R, -0.45 * R, -0.62 * R, -0.2 * R, -0.55 * R);
    ctx.quadraticCurveTo(0, -0.42 * R, 0.2 * R, -0.55 * R);
    ctx.bezierCurveTo(0.45 * R, -0.62 * R, 0.55 * R, -0.3 * R, 0.48 * R, 0.25 * R);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; // cinta
    ctx.fillRect(-0.5 * R, 0.02 * R, R, 0.12 * R);
  },

  herradura(ctx, s) {
    const R = s / 2;
    ctx.lineWidth = R * 0.3;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(0, -0.05 * R, 0.62 * R, Math.PI * 0.85, Math.PI * 2.15, false);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * 0.95 + (k * Math.PI * 1.1) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 0.62 * R, -0.05 * R + Math.sin(a) * 0.62 * R, 0.05 * R, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** Flor de hibisco (hawaiana). */
  hibisco(ctx, s) {
    const R = s / 2;
    for (let k = 0; k < 5; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-0.55 * R, -0.35 * R, -0.45 * R, -1.02 * R, 0, -0.95 * R);
      ctx.bezierCurveTo(0.45 * R, -1.02 * R, 0.55 * R, -0.35 * R, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 0.2 * R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.45 * R, -0.5 * R);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    for (const [x, y] of [[0.45, -0.5], [0.38, -0.58], [0.52, -0.42]]) {
      ctx.beginPath();
      ctx.arc(x * R, y * R, 0.05 * R, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** Guirnalda de banderines (papel picado, fiestas). Usa los colores de `colores` si se dan. */
  banderines(ctx, s, colores) {
    const R = s / 2;
    const lista = colores?.length ? colores : [ctx.fillStyle, '#ffffff'];
    const caida = 0.1 * R;
    const y = (x) => caida * (1 - (x / R) ** 2); // la cuerda cuelga un poco en el centro
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(1, R * 0.01);
    ctx.beginPath();
    ctx.moveTo(-R, y(-R));
    ctx.quadraticCurveTo(0, caida * 2, R, y(R));
    ctx.stroke();
    ctx.restore();
    const n = 9;
    const ancho = (2 * R) / n;
    for (let i = 0; i < n; i++) {
      const x0 = -R + i * ancho + ancho * 0.08;
      const x1 = x0 + ancho * 0.84;
      ctx.fillStyle = lista[i % lista.length];
      ctx.beginPath();
      ctx.moveTo(x0, y(x0));
      ctx.lineTo(x1, y(x1));
      ctx.lineTo((x0 + x1) / 2, (y(x0) + y(x1)) / 2 + ancho * 1.1);
      ctx.closePath();
      ctx.fill();
    }
  },

  rayo(ctx, s) {
    const R = s / 2;
    ctx.beginPath();
    ctx.moveTo(0.15 * R, -R);
    ctx.lineTo(-0.5 * R, 0.1 * R);
    ctx.lineTo(-0.02 * R, 0.1 * R);
    ctx.lineTo(-0.2 * R, R);
    ctx.lineTo(0.5 * R, -0.15 * R);
    ctx.lineTo(0.05 * R, -0.15 * R);
    ctx.closePath();
    ctx.fill();
  },

  /** Nota musical (♫). */
  nota(ctx, s) {
    const R = s / 2;
    for (const x of [-0.45, 0.4]) {
      ctx.beginPath();
      ctx.ellipse(x * R, 0.6 * R, 0.24 * R, 0.17 * R, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x * R + 0.16 * R, -0.75 * R, 0.08 * R, 1.35 * R);
    }
    ctx.beginPath();
    ctx.moveTo(-0.29 * R, -0.75 * R);
    ctx.lineTo(0.64 * R, -0.95 * R);
    ctx.lineTo(0.64 * R, -0.72 * R);
    ctx.lineTo(-0.29 * R, -0.52 * R);
    ctx.closePath();
    ctx.fill();
  },

  hexagono(ctx, s) {
    const R = s / 2;
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    ctx.closePath();
    ctx.stroke();
  },
};

export const NOMBRES_FORMAS = Object.keys(FORMAS);

/** Dibuja una figura en (x, y) de tamaño `s`. */
export function dibujarForma(ctx, forma, x, y, s, { color = '#ffffff', colores = null, rot = 0, alpha = 1, brillo = 0 } = {}) {
  const dibujar = FORMAS[forma];
  if (!dibujar || !(s > 0)) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (brillo) {
    ctx.shadowColor = color;
    ctx.shadowBlur = brillo;
  }
  dibujar(ctx, s, colores);
  ctx.restore();
}

// ------------------------------------------------------------------ fondo y adornos

/** Pseudoaleatorio determinista: los adornos salen igual en la vista previa y en la impresión. */
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const numeroDe = (texto) => [...String(texto)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

function colorDe(clave, paleta, azar) {
  if (Array.isArray(clave)) return colorDe(clave[Math.floor(azar() * clave.length)], paleta, azar);
  if (clave === 'contraste') return paletaOscura(paleta) ? '#ffffff' : paleta.a;
  if (clave in paleta && typeof paleta[clave] === 'string') return paleta[clave];
  return clave;
}

/** Fondo del tema: degradado, efecto especial (luna, nieve, rayos…) y lluvia de figuras. */
export function dibujarFondoTema(ctx, w, h, tema, paleta) {
  const degradado = ctx.createLinearGradient(0, 0, 0, h);
  degradado.addColorStop(0, paleta.fondo[0]);
  degradado.addColorStop(1, paleta.fondo[1]);
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, w, h);

  const base = Math.min(w, h);
  const azar = aleatorio(numeroDe(tema.id) + w * 7 + h);
  dibujarEfecto(ctx, w, h, tema, paleta, azar);

  // la misma densidad en una tira que en una postal
  const factor = (w * h) / (base * base) / 3;
  for (const p of tema.patron || []) {
    const cantidad = Math.round(p.cantidad * factor * 3);
    for (let i = 0; i < cantidad; i++) {
      const s = base * (p.tam[0] + azar() * (p.tam[1] - p.tam[0]));
      dibujarForma(ctx, p.forma, azar() * w, azar() * h, s, {
        color: colorDe(p.color, paleta, azar),
        rot: (azar() - 0.5) * 1.2,
        alpha: p.opacidad ?? 1,
        brillo: p.brillo ? s * p.brillo : 0,
      });
    }
  }
}

function dibujarEfecto(ctx, w, h, tema, paleta, azar) {
  const efecto = tema.fondoExtra;
  const base = Math.min(w, h);
  ctx.save();
  if (efecto === 'bokeh') {
    const color = paleta[tema.colorBokeh || 'b'];
    for (let i = 0; i < 14; i++) {
      const x = azar() * w;
      const y = azar() * h;
      const r = base * (0.06 + azar() * 0.12);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `${color}55`);
      g.addColorStop(1, `${color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  } else if (efecto === 'nieve') {
    ctx.fillStyle = '#ffffff';
    for (const [alto, alpha] of [[0.07, 0.55], [0.045, 0.95]]) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, h);
      const ola = h * alto;
      for (let x = 0; x <= w; x += w / 6) {
        ctx.quadraticCurveTo(x + w / 12, h - ola * (1.2 + azar() * 0.5), x + w / 6, h - ola);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (efecto === 'luna') {
    const r = base * 0.16;
    dibujarForma(ctx, 'luna', w - base * 0.2, base * 0.13, r * 2, { color: '#fff4c9' });
  } else if (efecto === 'rayos') {
    const cx = w / 2;
    const cy = h * 0.42;
    const largo = Math.hypot(w, h);
    ctx.fillStyle = paletaOscura(paleta) ? 'rgba(255,255,255,0.05)' : `${paleta.a}14`;
    for (let k = 0; k < 24; k += 2) {
      const a1 = (k / 24) * Math.PI * 2;
      const a2 = ((k + 1) / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a1) * largo, cy + Math.sin(a1) * largo);
      ctx.lineTo(cx + Math.cos(a2) * largo, cy + Math.sin(a2) * largo);
      ctx.closePath();
      ctx.fill();
    }
  } else if (efecto === 'ondas') {
    for (const [alto, alpha] of [[0.1, 0.25], [0.07, 0.4], [0.04, 0.6]]) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = paleta.b;
      ctx.beginPath();
      ctx.moveTo(0, h);
      const y = h - h * alto;
      ctx.lineTo(0, y);
      for (let x = 0; x < w; x += w / 4) {
        ctx.quadraticCurveTo(x + w / 8, y - h * 0.02, x + w / 4, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (efecto === 'brillo') {
    for (const [x, y, color] of [[w * 0.5, h * 0.35, paleta.a], [w * 0.5, h * 0.9, paleta.b]]) {
      const r = Math.max(w, h) * 0.55;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `${color}40`);
      g.addColorStop(1, `${color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.restore();
}

/** Adornos grandes en las esquinas; `encima` = después de las fotos. */
export function dibujarEsquinas(ctx, w, h, tema, paleta, encima) {
  const base = Math.min(w, h);
  const azar = aleatorio(numeroDe(tema.id));
  for (const e of tema.esquinas || []) {
    if (Boolean(e.encima) !== encima) continue;
    // los banderines cuelgan de lado a lado, sin importar si es tira o postal
    const tam = e.anchoCompleto ? w * e.tam : e.tam * base;
    dibujarForma(ctx, e.forma, e.x * w, e.y * h, tam, {
      color: colorDe(e.color, paleta, azar),
      colores: e.colores?.map((c) => colorDe(c, paleta, azar)),
      rot: e.rot || 0,
      alpha: e.alpha ?? 1,
    });
  }
}

/** Figura chiquita en la esquina de cada foto (un corazón, un murciélago…). */
export function dibujarSobreFoto(ctx, r, tema, paleta, i) {
  if (!tema.sobreFotos) return;
  const s = Math.min(r.w, r.h) * 0.17;
  const derecha = i % 2 === 0;
  dibujarForma(ctx, tema.sobreFotos, derecha ? r.x + r.w - s * 0.2 : r.x + s * 0.2, r.y + s * 0.15, s, {
    color: tema.colorSobreFotos || paleta.a,
    rot: derecha ? 0.25 : -0.25,
  });
}
