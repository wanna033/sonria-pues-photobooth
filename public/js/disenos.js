/*
 * "Mis diseños": el usuario sube su tira o postal hecha en Photoshop/Canva
 * (con recuadros de color donde van las fotos) y la cabina la usa como plantilla.
 *
 * - detectarRecuadros(): encuentra solos los recuadros de color lisos (o los
 *   huecos transparentes de un PNG) que no tocan la orilla de la imagen.
 * - EditorDisenos: lista de diseños y editor visual para mover y ajustar recuadros.
 */

import {
  crearPlantillaPersonalizada, componer, fotoDeMuestra, cargarImagen, tamanoDePlantilla, LARGO_PREDETERMINADO_CM,
} from './plantillas.js';

const MAX_PIXELES_ANALISIS = 2_500_000;
const TOLERANCIA_COLOR = 60; // suma de diferencias R+G+B para considerar "el mismo color"
const MAX_RECUADROS = 12;
const PPP = 300;

function el(etiqueta, props = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...hijos.flat().filter((h) => h !== null && h !== undefined && h !== false));
  return e;
}

function slug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'diseno';
}

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

// ================================================================ detección automática

/** Revisa que las cuatro orillas del recuadro estén casi completas (descarta círculos, letras, etc.). */
function bordesRectos(etiquetas, etiqueta, w, minX, minY, maxX, maxY) {
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const m = Math.max(1, Math.round(Math.min(bw, bh) * 0.02));
  const lleno = (x0, y0, dx, dy, pasos) => {
    let dentro = 0;
    for (let s = 0; s < pasos; s++) {
      if (etiquetas[(y0 + dy * s) * w + (x0 + dx * s)] === etiqueta) dentro++;
    }
    return dentro / pasos >= 0.9;
  };
  const x0 = minX + Math.round(bw * 0.1);
  const pasosX = Math.max(1, Math.round(bw * 0.8));
  const y0 = minY + Math.round(bh * 0.1);
  const pasosY = Math.max(1, Math.round(bh * 0.8));
  return lleno(x0, minY + m, 1, 0, pasosX)
    && lleno(x0, maxY - m, 1, 0, pasosX)
    && lleno(minX + m, y0, 0, 1, pasosY)
    && lleno(maxX - m, y0, 0, 1, pasosY);
}

/**
 * Ajuste fino a resolución completa: cada orilla crece mientras la línea de
 * afuera no se parezca al fondo. Así se cubren bordes difuminados, contornos
 * finos y el "halo" que dejan el suavizado o la compresión JPG.
 */
function ajustarOrillas(ctx, anchoImg, altoImg, r) {
  const maxPasos = Math.max(3, Math.round(Math.min(anchoImg, altoImg) * 0.01));
  const promedio = (x, y, w, h) => {
    const d = ctx.getImageData(x, y, w, h).data;
    let rr = 0, gg = 0, bb = 0, aa = 0;
    for (let i = 0; i < d.length; i += 4) { rr += d[i]; gg += d[i + 1]; bb += d[i + 2]; aa += d[i + 3]; }
    const n = d.length / 4;
    return [rr / n, gg / n, bb / n, aa / n];
  };
  const distancia = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);

  // tramo central de cada orilla (evita las esquinas)
  const y0 = Math.round(r.y + r.h * 0.2);
  const alto = Math.max(1, Math.round(r.h * 0.6));
  const x0 = Math.round(r.x + r.w * 0.2);
  const ancho = Math.max(1, Math.round(r.w * 0.6));
  const linea = {
    izquierda: (x) => promedio(x, y0, 1, alto),
    derecha: (x) => promedio(x, y0, 1, alto),
    arriba: (y) => promedio(x0, y, ancho, 1),
    abajo: (y) => promedio(x0, y, ancho, 1),
  };
  const crecer = (lado, inicio, direccion, limite) => {
    const lejos = inicio + direccion * (maxPasos + 2);
    if (lejos < 0 || lejos > limite) return inicio;
    const fondo = linea[lado](lejos);
    let borde = inicio;
    for (let k = 1; k <= maxPasos; k++) {
      const pos = inicio + direccion * k;
      if (distancia(linea[lado](pos), fondo) <= 45) break;
      borde = pos;
    }
    return borde;
  };

  const izquierda = crecer('izquierda', r.x, -1, anchoImg - 1);
  const derecha = crecer('derecha', r.x + r.w - 1, 1, anchoImg - 1);
  const arriba = crecer('arriba', r.y, -1, altoImg - 1);
  const abajo = crecer('abajo', r.y + r.h - 1, 1, altoImg - 1);
  // 1 px extra de seguridad
  const x = Math.max(0, izquierda - 1);
  const y = Math.max(0, arriba - 1);
  return {
    ...r,
    x,
    y,
    w: Math.min(anchoImg - 1, derecha + 1) - x + 1,
    h: Math.min(altoImg - 1, abajo + 1) - y + 1,
  };
}

/**
 * Busca recuadros de un solo color (o huecos transparentes) dentro del diseño.
 * @param {HTMLImageElement} imagen
 * @returns {{ranuras: {x,y,w,h}[], capa: 'encima'|'debajo'}}
 */
export function detectarRecuadros(imagen) {
  const anchoOriginal = imagen.naturalWidth || imagen.width;
  const altoOriginal = imagen.naturalHeight || imagen.height;
  const escala = Math.min(1, Math.sqrt(MAX_PIXELES_ANALISIS / (anchoOriginal * altoOriginal)));
  const w = Math.max(1, Math.round(anchoOriginal * escala));
  const h = Math.max(1, Math.round(altoOriginal * escala));

  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const etiquetas = new Int32Array(n);
  const pila = new Int32Array(n);
  const areaMinima = n * 0.004;
  const encontrados = [];
  let etiqueta = 0;

  for (let inicio = 0; inicio < n; inicio++) {
    if (etiquetas[inicio]) continue;
    etiqueta++;
    const k0 = inicio * 4;
    const r0 = d[k0];
    const g0 = d[k0 + 1];
    const b0 = d[k0 + 2];
    const transparente = d[k0 + 3] < 128;

    let tope = 0;
    pila[tope++] = inicio;
    etiquetas[inicio] = etiqueta;
    let area = 0;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    let tocaBorde = false;

    while (tope > 0) {
      const p = pila[--tope];
      area++;
      const x = p % w;
      const y = (p - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tocaBorde = true;

      for (let v = 0; v < 4; v++) {
        let q;
        if (v === 0) { if (x === 0) continue; q = p - 1; }
        else if (v === 1) { if (x === w - 1) continue; q = p + 1; }
        else if (v === 2) { if (y === 0) continue; q = p - w; }
        else { if (y === h - 1) continue; q = p + w; }
        if (etiquetas[q]) continue;
        const k = q * 4;
        const tq = d[k + 3] < 128;
        if (transparente || tq) {
          if (!(transparente && tq)) continue;
        } else if (Math.abs(d[k] - r0) + Math.abs(d[k + 1] - g0) + Math.abs(d[k + 2] - b0) > TOLERANCIA_COLOR) {
          continue;
        }
        etiquetas[q] = etiqueta;
        pila[tope++] = q;
      }
    }

    // el fondo toca la orilla; los recuadros para fotos no
    if (tocaBorde || area < areaMinima) continue;
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw < w * 0.06 || bh < h * 0.03 || bw * bh > n * 0.9) continue;
    if (area / (bw * bh) < 0.6) continue;
    if (!bordesRectos(etiquetas, etiqueta, w, minX, minY, maxX, maxY)) continue;
    encontrados.push({ minX, minY, maxX, maxY, area, transparente });
  }

  // de vuelta a la resolución original y ajuste fino de las orillas
  const inversa = 1 / escala;
  const margen = escala < 1 ? Math.round(inversa) : 0;
  const original = document.createElement('canvas');
  original.width = anchoOriginal;
  original.height = altoOriginal;
  const ctxOriginal = original.getContext('2d', { willReadFrequently: true });
  ctxOriginal.drawImage(imagen, 0, 0);
  let ranuras = encontrados
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_RECUADROS)
    .map((r) => {
      const x = Math.max(0, Math.floor(r.minX * inversa) - margen);
      const y = Math.max(0, Math.floor(r.minY * inversa) - margen);
      const x2 = Math.min(anchoOriginal, Math.ceil((r.maxX + 1) * inversa) + margen);
      const y2 = Math.min(altoOriginal, Math.ceil((r.maxY + 1) * inversa) + margen);
      return ajustarOrillas(ctxOriginal, anchoOriginal, altoOriginal,
        { x, y, w: x2 - x, h: y2 - y, transparente: r.transparente });
    });

  // orden de lectura: de arriba hacia abajo y de izquierda a derecha
  ranuras.sort((a, b) => (Math.abs(a.y - b.y) < Math.min(a.h, b.h) * 0.5 ? a.x - b.x : a.y - b.y));
  const huecos = ranuras.filter((r) => r.transparente).length;
  const capa = huecos > ranuras.length / 2 ? 'debajo' : 'encima';
  ranuras = ranuras.map(({ x, y, w: rw, h: rh }) => ({ x, y, w: rw, h: rh }));
  return { ranuras, capa };
}

// ================================================================ editor

export class EditorDisenos {
  /**
   * @param {{contenedor: HTMLElement, api: Function, aviso: Function,
   *          enUso: () => string[], alCambiar: (cambio) => Promise<void>}} opciones
   */
  constructor({ contenedor, api, aviso, enUso, alCambiar }) {
    Object.assign(this, { contenedor, api, aviso, enUso, alCambiar });
    this.alTeclear = (e) => this.teclado(e);
    this.activo = false;
  }

  /** Suelta el teclado y la imagen temporal (al cambiar de pestaña o cerrar los ajustes). */
  salir() {
    document.removeEventListener('keydown', this.alTeclear, true);
    if (this.urlLocal) URL.revokeObjectURL(this.urlLocal);
    this.urlLocal = null;
    this.activo = false;
  }

  // ---------------------------------------------------------------- lista

  async mostrarLista() {
    this.salir();
    const c = this.contenedor;
    c.replaceChildren();
    c.scrollTop = 0;
    const selector = el('input', {
      type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true,
      onchange: (e) => {
        const archivo = e.target.files[0];
        e.target.value = '';
        if (archivo) this.nuevo(archivo);
      },
    });
    c.append(
      el('h3', {}, 'Mis diseños'),
      el('p', { class: 'nota' },
        'Diseña tu tira o postal en Photoshop, Canva o Illustrator y deja ', el('strong', {}, 'recuadros de color'),
        ' donde van las fotos (por ejemplo 1, 2 y 3). Expórtala como PNG o JPG y súbela aquí: Sonría PJs encuentra los recuadros sola y ahí pone las fotos de los invitados.'),
      el('p', { class: 'nota' },
        'Tamaños ideales a 300 ppp: ', el('strong', {}, 'tira 5×15 cm (2×6") → 600×1800 px'), ' · ',
        el('strong', {}, 'postal 10×15 cm (4×6") → 1800×1200 o 1200×1800 px'),
        '. En Photoshop: Archivo › Exportar › Exportar como… › PNG.'),
      el('div', { class: 'fila-botones' }, selector,
        el('button', { class: 'boton-primario', type: 'button', onclick: () => selector.click() }, '＋ Subir un diseño')),
    );

    const galeria = el('div', { class: 'galeria galeria-disenos' });
    c.append(galeria);
    let lista = [];
    try {
      lista = await this.api('/api/disenos');
    } catch (err) {
      galeria.append(el('p', { class: 'nota' }, `No se pudieron cargar los diseños: ${err.message}`));
      return;
    }
    if (!lista.length) {
      galeria.append(el('p', { class: 'nota' }, 'Todavía no has subido ningún diseño.'));
      return;
    }
    const enUso = this.enUso();
    for (const meta of lista) {
      const fotos = meta.ranuras.length;
      galeria.append(el('figure', {},
        el('img', { src: meta.url, alt: meta.nombre, loading: 'lazy' }),
        el('figcaption', {},
          el('span', {}, el('strong', {}, meta.nombre), el('br'),
            `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}${enUso.includes(meta.id) ? ' · ✅ en uso' : ''}`),
          el('button', { type: 'button', onclick: () => this.editar(meta) }, 'Editar'),
          el('button', { type: 'button', onclick: () => this.quitar(meta) }, 'Quitar'))));
    }
  }

  async quitar(meta) {
    if (!confirm(`¿Quitar el diseño “${meta.nombre}”? (se mueve a la carpeta datos/papelera)`)) return;
    try {
      await this.api(`/api/disenos/${meta.id}`, { method: 'DELETE' });
      await this.alCambiar({ id: meta.id, eliminado: true });
    } catch (err) {
      this.aviso(`No se pudo quitar: ${err.message}`);
    }
    this.mostrarLista();
  }

  async nuevo(archivo) {
    const url = URL.createObjectURL(archivo);
    const imagen = await cargarImagen(url);
    if (!imagen) {
      URL.revokeObjectURL(url);
      this.aviso('No se pudo abrir esa imagen. Exporta tu diseño como PNG o JPG.');
      return;
    }
    const { ranuras, capa } = detectarRecuadros(imagen);
    const meta = {
      nombre: archivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 60) || 'Mi diseño',
      ancho: imagen.naturalWidth,
      alto: imagen.naturalHeight,
      capa,
      // una tira (proporción 1:3) se imprime dos veces en la hoja de 10×15 cm
      duplicar: imagen.naturalHeight / imagen.naturalWidth > 2.3,
      largoCm: LARGO_PREDETERMINADO_CM,
      ranuras,
    };
    this.abrirEditor(meta, imagen, { archivo, url, detectados: ranuras.length, usarEnEvento: true });
  }

  async editar(guardado) {
    const imagen = await cargarImagen(guardado.url);
    if (!imagen) {
      this.aviso('No se pudo cargar la imagen de ese diseño');
      return;
    }
    const { id, nombre, ancho, alto, capa, duplicar, ranuras } = guardado;
    const largoCm = Number(guardado.largoCm) || LARGO_PREDETERMINADO_CM;
    this.abrirEditor(structuredClone({ id, nombre, ancho, alto, capa, duplicar, largoCm, ranuras }), imagen, {});
  }

  abrirEditor(meta, imagen, { archivo = null, url = null, detectados = null, usarEnEvento = false }) {
    this.salir();
    Object.assign(this, {
      meta, imagen, archivo, detectados, usarEnEvento,
      urlLocal: url,
      elegida: meta.ranuras.length ? 0 : -1,
      vistaPrevia: false,
      arrastre: null,
      activo: true,
    });
    document.addEventListener('keydown', this.alTeclear, true);
    this.pintar();
  }

  // ---------------------------------------------------------------- dibujo del editor

  pintar() {
    this.zona = el('div', { class: 'disenador-zona' });
    this.panel = el('aside', { class: 'disenador-panel' });
    this.contenedor.replaceChildren(
      el('div', { class: 'disenador-barra' },
        el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.mostrarLista() }, '← Mis diseños'),
        el('h3', {}, this.meta.id ? 'Editar diseño' : 'Nuevo diseño')),
      el('div', { class: 'disenador' }, this.zona, this.panel));
    this.contenedor.scrollTop = 0;
    this.pintarZona();
    this.pintarPanel();
  }

  pintarZona() {
    this.zona.replaceChildren();
    if (this.vistaPrevia) {
      const plantilla = crearPlantillaPersonalizada(this.meta, this.imagen);
      const muestras = Array.from({ length: MAX_RECUADROS }, (_, i) => fotoDeMuestra(i));
      const lienzo = componer(document.createElement('canvas'), plantilla, muestras, { config: {}, escala: 0.5 });
      lienzo.className = 'disenador-vista';
      this.zona.append(lienzo);
      return;
    }

    this.marco = el('div', { class: 'disenador-marco' },
      el('img', { src: this.imagen.src, alt: 'Tu diseño', draggable: 'false' }));
    this.cajas = this.meta.ranuras.map((_, i) => {
      const caja = el('div', { class: 'disenador-ranura', 'data-i': i }, el('span', { class: 'disenador-numero' }, String(i + 1)));
      this.marco.append(caja);
      return caja;
    });
    this.cajas.forEach((_, i) => this.posicionar(i));
    this.marcarElegida();
    this.marco.addEventListener('pointerdown', (e) => this.presionar(e));
    this.marco.addEventListener('pointermove', (e) => this.mover(e));
    this.marco.addEventListener('pointerup', () => { this.arrastre = null; });
    this.marco.addEventListener('pointercancel', () => { this.arrastre = null; });
    this.zona.append(this.marco);
  }

  posicionar(i) {
    const r = this.meta.ranuras[i];
    const { ancho, alto } = this.meta;
    Object.assign(this.cajas[i].style, {
      left: `${(r.x / ancho) * 100}%`,
      top: `${(r.y / alto) * 100}%`,
      width: `${(r.w / ancho) * 100}%`,
      height: `${(r.h / alto) * 100}%`,
    });
  }

  marcarElegida() {
    this.cajas.forEach((caja, i) => {
      caja.classList.toggle('elegida', i === this.elegida);
      caja.querySelectorAll('.disenador-asa').forEach((a) => a.remove());
      if (i === this.elegida) {
        for (const esquina of ['nw', 'ne', 'sw', 'se']) caja.append(el('span', { class: 'disenador-asa', 'data-esquina': esquina }));
      }
    });
  }

  elegir(i) {
    this.elegida = i;
    this.marcarElegida();
    this.pintarPanel();
  }

  pintarPanel() {
    const m = this.meta;
    const cm = (px) => ((px / PPP) * 2.54).toFixed(1);
    const campo = (etiqueta, control) => el('label', { class: 'disenador-campo' }, el('span', {}, etiqueta), control);
    const opcion = (texto, marcado, alCambiar) => el('label', { class: 'disenador-opcion' },
      el('span', { class: 'interruptor' },
        el('input', { type: 'checkbox', checked: marcado, onchange: (e) => alCambiar(e.target.checked) }),
        el('span')),
      el('span', {}, texto));
    const fotos = m.ranuras.length;
    const r = this.meta.ranuras[this.elegida];

    this.medidas = {};
    const medida = (clave, etiqueta) => {
      const entrada = el('input', {
        type: 'number', min: 0, step: 1, value: r ? r[clave] : '',
        oninput: (e) => this.cambiarMedida(clave, e.target.value),
      });
      this.medidas[clave] = entrada;
      return el('label', {}, el('span', {}, etiqueta), entrada);
    };

    this.panel.replaceChildren(
      campo('Nombre del diseño', el('input', {
        type: 'text', value: m.nombre, maxlength: 60,
        oninput: (e) => { m.nombre = e.target.value; },
      })),
      el('p', { class: 'nota' }, `Imagen de ${m.ancho} × ${m.alto} px (${cm(m.ancho)} × ${cm(m.alto)} cm a 300 ppp).`),
      Math.max(m.ancho, m.alto) < 1500
        ? el('p', { class: 'nota disenador-alerta' },
          '⚠️ Resolución baja: la impresión puede verse borrosa. Exporta tu diseño a 600×1800 px (tira) o 1800×1200 px (postal).')
        : null,
      this.detectados === null ? null
        : el('p', { class: `nota ${this.detectados ? 'disenador-exito' : 'disenador-alerta'}` },
          this.detectados
            ? `✨ Encontré ${this.detectados} ${this.detectados === 1 ? 'recuadro' : 'recuadros'} para fotos. Revisa que estén bien.`
            : 'No encontré recuadros de color. Agrégalos con “＋ Agregar foto”.'),
      campo('Cómo se acomodan las fotos', el('select', { onchange: (e) => { m.capa = e.target.value; this.refrescarVista(); } },
        el('option', { value: 'encima', selected: m.capa === 'encima' }, 'Las fotos tapan los recuadros de color'),
        el('option', { value: 'debajo', selected: m.capa === 'debajo' }, 'El diseño va encima (PNG con huecos transparentes)'))),
      opcion('Imprimir 2 tiras por hoja', m.duplicar, (v) => {
        m.duplicar = v;
        this.refrescarVista();
        this.pintarPanel();
      }),
      this.campoTamano(campo),

      el('h4', {}, `Fotos (${fotos})`),
      el('div', { class: 'disenador-lista' },
        m.ranuras.map((_, i) => el('button', {
          type: 'button', class: i === this.elegida ? 'elegida' : '',
          onclick: () => { if (this.vistaPrevia) this.alternarVista(); this.elegir(i); },
        }, `Foto ${i + 1}`))),
      el('div', { class: 'fila-botones' },
        el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.agregarRanura(), disabled: fotos >= MAX_RECUADROS }, '＋ Agregar foto'),
        el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.quitarRanura(), disabled: !r }, '🗑 Quitar'),
        el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.detectarOtraVez() }, '🔍 Detectar otra vez')),
      r ? el('div', { class: 'disenador-medidas' },
        medida('x', 'X'), medida('y', 'Y'), medida('w', 'Ancho'), medida('h', 'Alto')) : null,
      el('p', { class: 'nota' }, 'Arrastra un recuadro para moverlo y sus esquinas para cambiar el tamaño. Con las flechas del teclado se mueve 1 px (con Mayús, 10 px).'),

      opcion('Usar sólo este diseño en el evento', this.usarEnEvento, (v) => { this.usarEnEvento = v; }),
      el('div', { class: 'fila-botones disenador-acciones' },
        el('button', { class: 'boton-secundario', type: 'button', onclick: () => this.alternarVista() },
          this.vistaPrevia ? '✏️ Seguir editando' : '👁 Vista previa'),
        el('button', { class: 'boton-primario', type: 'button', onclick: () => this.guardar() }, '💾 Guardar diseño')),
    );
  }

  /**
   * Medida real de la hoja impresa. Ancho y alto van enlazados para respetar la
   * forma del diseño; se guarda sólo el lado largo (largoCm).
   */
  campoTamano(campo) {
    const m = this.meta;
    const hojaActual = () => tamanoDePlantilla({ personalizada: true, ...m });
    const hoja = hojaActual();
    const nota = el('p', { class: 'nota' });
    const describir = (h) => {
      nota.textContent = `Se imprime en ${h.nombre}${m.duplicar ? ', con 2 tiras' : ''}. Pon ese tamaño de papel en tu impresora.`;
    };
    const entrada = (lado) => el('input', {
      type: 'number', min: 1, max: 60, step: 0.1, value: hoja[`${lado}Cm`],
      'aria-label': lado === 'ancho' ? 'Ancho en cm' : 'Alto en cm',
      oninput: (e) => {
        const valor = Number(e.target.value);
        if (!(valor > 0)) return;
        const h = hojaActual();
        const vertical = h.altoIn >= h.anchoIn;
        const proporcion = Math.min(h.anchoIn, h.altoIn) / Math.max(h.anchoIn, h.altoIn);
        const esLargo = (lado === 'alto') === vertical;
        m.largoCm = limitar(esLargo ? valor : valor / proporcion, 2, 60);
        const nueva = hojaActual();
        (lado === 'ancho' ? altoEntrada : anchoEntrada).value = nueva[lado === 'ancho' ? 'altoCm' : 'anchoCm'];
        describir(nueva);
      },
    });
    const anchoEntrada = entrada('ancho');
    const altoEntrada = entrada('alto');
    describir(hoja);
    return el('div', { class: 'disenador-bloque' },
      campo('Tamaño de la hoja impresa (cm)',
        el('div', { class: 'disenador-tamano' }, anchoEntrada, el('span', {}, '×'), altoEntrada)),
      nota);
  }

  actualizarMedidas() {
    const r = this.meta.ranuras[this.elegida];
    if (!r) return;
    for (const [clave, entrada] of Object.entries(this.medidas || {})) {
      if (document.activeElement !== entrada) entrada.value = r[clave];
    }
  }

  cambiarMedida(clave, texto) {
    const r = this.meta.ranuras[this.elegida];
    const v = Math.round(Number(texto));
    if (!r || texto === '' || !Number.isFinite(v)) return;
    const { ancho, alto } = this.meta;
    if (clave === 'x') r.x = limitar(v, 0, ancho - r.w);
    if (clave === 'y') r.y = limitar(v, 0, alto - r.h);
    if (clave === 'w') r.w = limitar(v, 10, ancho - r.x);
    if (clave === 'h') r.h = limitar(v, 10, alto - r.y);
    if (!this.vistaPrevia) this.posicionar(this.elegida);
  }

  refrescarVista() {
    if (this.vistaPrevia) this.pintarZona();
  }

  alternarVista() {
    this.vistaPrevia = !this.vistaPrevia;
    this.pintarZona();
    this.pintarPanel();
  }

  agregarRanura() {
    const { ancho, alto } = this.meta;
    const w = Math.round(ancho * 0.6);
    const h = Math.round(Math.min(alto * 0.25, (w * 2) / 3));
    this.meta.ranuras.push({ x: Math.round((ancho - w) / 2), y: Math.round((alto - h) / 2), w, h });
    this.elegida = this.meta.ranuras.length - 1;
    this.vistaPrevia = false;
    this.pintarZona();
    this.pintarPanel();
  }

  quitarRanura() {
    if (this.elegida < 0) return;
    this.meta.ranuras.splice(this.elegida, 1);
    this.elegida = Math.min(this.elegida, this.meta.ranuras.length - 1);
    this.pintarZona();
    this.pintarPanel();
  }

  detectarOtraVez() {
    const { ranuras, capa } = detectarRecuadros(this.imagen);
    this.detectados = ranuras.length;
    if (ranuras.length) {
      this.meta.ranuras = ranuras;
      this.meta.capa = capa;
      this.elegida = 0;
    }
    this.vistaPrevia = false;
    this.pintarZona();
    this.pintarPanel();
  }

  // ---------------------------------------------------------------- arrastre y teclado

  presionar(e) {
    const caja = e.target.closest('.disenador-ranura');
    if (!caja) {
      this.elegir(-1);
      return;
    }
    const i = Number(caja.dataset.i);
    const esquina = e.target.closest('.disenador-asa')?.dataset.esquina || null;
    if (i !== this.elegida) this.elegir(i);
    e.preventDefault();
    this.marco.setPointerCapture(e.pointerId);
    this.arrastre = {
      esquina,
      x0: e.clientX,
      y0: e.clientY,
      r0: { ...this.meta.ranuras[i] },
      escala: this.meta.ancho / this.marco.clientWidth,
    };
  }

  mover(e) {
    const a = this.arrastre;
    if (!a) return;
    const { ancho, alto } = this.meta;
    const dx = (e.clientX - a.x0) * a.escala;
    const dy = (e.clientY - a.y0) * a.escala;
    const minimo = Math.max(10, Math.round(Math.min(ancho, alto) * 0.02));
    const r = { ...a.r0 };
    if (!a.esquina) {
      r.x = limitar(a.r0.x + dx, 0, ancho - r.w);
      r.y = limitar(a.r0.y + dy, 0, alto - r.h);
    } else {
      if (a.esquina.includes('w')) {
        r.x = limitar(a.r0.x + dx, 0, a.r0.x + a.r0.w - minimo);
        r.w = a.r0.x + a.r0.w - r.x;
      }
      if (a.esquina.includes('e')) r.w = limitar(a.r0.w + dx, minimo, ancho - a.r0.x);
      if (a.esquina.includes('n')) {
        r.y = limitar(a.r0.y + dy, 0, a.r0.y + a.r0.h - minimo);
        r.h = a.r0.y + a.r0.h - r.y;
      }
      if (a.esquina.includes('s')) r.h = limitar(a.r0.h + dy, minimo, alto - a.r0.y);
    }
    for (const k of ['x', 'y', 'w', 'h']) r[k] = Math.round(r[k]);
    this.meta.ranuras[this.elegida] = r;
    this.posicionar(this.elegida);
    this.actualizarMedidas();
  }

  teclado(e) {
    if (!this.activo || this.vistaPrevia || this.elegida < 0) return;
    if (e.target.matches?.('input, textarea, select')) return;
    const r = this.meta.ranuras[this.elegida];
    const paso = e.shiftKey ? 10 : 1;
    const { ancho, alto } = this.meta;
    switch (e.key) {
      case 'ArrowLeft': r.x = Math.max(0, r.x - paso); break;
      case 'ArrowRight': r.x = Math.min(ancho - r.w, r.x + paso); break;
      case 'ArrowUp': r.y = Math.max(0, r.y - paso); break;
      case 'ArrowDown': r.y = Math.min(alto - r.h, r.y + paso); break;
      case 'Delete':
        e.preventDefault();
        this.quitarRanura();
        return;
      default:
        return;
    }
    e.preventDefault();
    this.posicionar(this.elegida);
    this.actualizarMedidas();
  }

  // ---------------------------------------------------------------- guardar

  async guardar() {
    const m = this.meta;
    if (!m.ranuras.length) {
      this.aviso('Agrega al menos un recuadro para las fotos');
      return;
    }
    m.nombre = String(m.nombre || '').trim() || 'Mi diseño';
    const id = m.id || `${slug(m.nombre)}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      const { nombre, ancho, alto, capa, duplicar, largoCm, ranuras } = m;
      await this.api(`/api/disenos/${id}`, { method: 'PUT', json: { nombre, ancho, alto, capa, duplicar, largoCm, ranuras } });
      if (this.archivo) {
        await this.api(`/api/disenos/${id}/imagen`, {
          method: 'PUT', body: this.archivo, headers: { 'Content-Type': this.archivo.type || 'image/png' },
        });
      }
      m.id = id;
      this.archivo = null;
      await this.alCambiar({ id, usarEnEvento: this.usarEnEvento });
      this.aviso('✅ Diseño guardado');
      this.mostrarLista();
    } catch (err) {
      this.aviso(`No se pudo guardar el diseño: ${err.message}`);
    }
  }
}
