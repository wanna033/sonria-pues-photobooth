/*
 * Filtros de color. Se aplican igual en la vista en vivo (CSS `filter`)
 * y en la foto final (canvas `ctx.filter`), así lo que ves es lo que sale.
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
];

export function filtroPorId(id) {
  return FILTROS.find((f) => f.id === id) || FILTROS[0];
}
