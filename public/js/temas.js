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
};

export const NOMBRES_FORMAS = Object.keys(FORMAS);

/** Dibuja una figura en (x, y) de tamaño `s`. */
export function dibujarForma(ctx, forma, x, y, s, { color = '#ffffff', rot = 0, alpha = 1, brillo = 0 } = {}) {
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
  dibujar(ctx, s);
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
    dibujarForma(ctx, e.forma, e.x * w, e.y * h, e.tam * base, {
      color: colorDe(e.color, paleta, azar),
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
