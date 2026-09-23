/*
 * Editor de stickers ("props digitales"): emojis y frases que el invitado
 * coloca sobre su foto. Funciona con mouse y con pantalla táctil
 * (arrastrar con un dedo, pellizcar con dos para escalar y girar).
 *
 * Las posiciones se guardan en coordenadas relativas (0–1) a la foto, para
 * dibujarlas luego en resolución completa con dibujarStickers().
 */

export const EMOJIS = [
  '👑', '🎩', '🕶️', '🥸', '💋', '🎀', '🌹', '💐',
  '❤️', '💖', '💍', '🥂', '🍾', '🎂', '🎉', '🎈',
  '⭐', '✨', '🔥', '💯', '😎', '🥳', '😂', '😍',
  '🦄', '🐶', '🐱', '🌈', '🎸', '🎤', '🤠', '👸',
];

export class EditorStickers {
  /**
   * @param {{escenario:HTMLElement, lienzo:HTMLCanvasElement, capa:HTMLElement,
   *          paleta:HTMLElement, herramientas:HTMLElement}} elementos
   */
  constructor({ escenario, lienzo, capa, paleta, herramientas }) {
    this.escenario = escenario;
    this.lienzo = lienzo;
    this.capa = capa;
    this.paleta = paleta;
    this.herramientas = herramientas;
    this.stickers = [];
    this.elegido = null;
    this.punteros = new Map();
    this.gesto = null;

    this.capa.addEventListener('pointerdown', (e) => this.alPresionar(e));
    this.capa.addEventListener('pointermove', (e) => this.alMover(e));
    this.capa.addEventListener('pointerup', (e) => this.alSoltar(e));
    this.capa.addEventListener('pointercancel', (e) => this.alSoltar(e));
    this.capa.addEventListener('wheel', (e) => {
      if (!this.elegido) return;
      e.preventDefault();
      this.escalar(e.deltaY < 0 ? 1.08 : 1 / 1.08);
    }, { passive: false });

    this.herramientas.addEventListener('click', (e) => {
      const accion = e.target.closest('button')?.dataset.herramienta;
      if (!accion || !this.elegido) return;
      if (accion === 'mas') this.escalar(1.15);
      if (accion === 'menos') this.escalar(1 / 1.15);
      if (accion === 'izq') this.girar(-15);
      if (accion === 'der') this.girar(15);
      if (accion === 'quitar') this.quitar(this.elegido);
    });

    this.observador = new ResizeObserver(() => this.ajustarCapa());
    this.observador.observe(this.escenario);
    this.observador.observe(this.lienzo);
  }

  /**
   * Prepara el editor con la imagen compuesta y lo configurado en
   * Ajustes → Diseño (frases y emojis). Sin configuración usa los de fábrica.
   */
  preparar(imagen, frases = [], emojis = EMOJIS) {
    this.stickers = [];
    this.elegido = null;
    this.capa.replaceChildren();
    this.lienzo.width = imagen.width;
    this.lienzo.height = imagen.height;
    this.lienzo.getContext('2d').drawImage(imagen, 0, 0);

    this.paleta.replaceChildren();
    for (const frase of frases.filter(Boolean)) {
      const b = document.createElement('button');
      b.className = 'frase';
      b.textContent = frase;
      b.addEventListener('click', () => this.agregar('frase', frase));
      this.paleta.appendChild(b);
    }
    for (const emoji of (emojis?.length ? emojis : EMOJIS)) {
      const b = document.createElement('button');
      b.textContent = emoji;
      b.addEventListener('click', () => this.agregar('emoji', emoji));
      this.paleta.appendChild(b);
    }
    requestAnimationFrame(() => this.ajustarCapa());
    this.actualizarHerramientas();
  }

  /** Coloca la capa interactiva exactamente encima del lienzo mostrado. */
  ajustarCapa() {
    // medidas de diseño (no afectadas por las animaciones con transform)
    Object.assign(this.capa.style, {
      left: `${this.lienzo.offsetLeft}px`,
      top: `${this.lienzo.offsetTop}px`,
      width: `${this.lienzo.offsetWidth}px`,
      height: `${this.lienzo.offsetHeight}px`,
    });
    this.stickers.forEach((s) => this.pintar(s));
  }

  agregar(tipo, texto) {
    const s = {
      tipo,
      texto,
      x: 0.5 + (Math.random() - 0.5) * 0.2,
      y: 0.45 + (Math.random() - 0.5) * 0.2,
      tam: tipo === 'frase' ? 0.045 : 0.11,
      rot: tipo === 'frase' ? -6 : 0,
      el: document.createElement('div'),
    };
    s.el.className = `sticker ${tipo}`;
    s.el.textContent = texto;
    s.el.addEventListener('pointerdown', () => this.elegir(s));
    this.capa.appendChild(s.el);
    this.stickers.push(s);
    this.pintar(s);
    this.elegir(s);
  }

  elegir(s) {
    this.elegido?.el.classList.remove('elegido');
    this.elegido = s;
    s?.el.classList.add('elegido');
    if (s) this.capa.appendChild(s.el); // al frente
    this.actualizarHerramientas();
  }

  quitar(s) {
    s.el.remove();
    this.stickers = this.stickers.filter((x) => x !== s);
    this.elegir(this.stickers.at(-1) || null);
  }

  escalar(factor) {
    const s = this.elegido;
    s.tam = Math.min(0.6, Math.max(0.02, s.tam * factor));
    this.pintar(s);
  }

  girar(grados) {
    this.elegido.rot = (this.elegido.rot + grados) % 360;
    this.pintar(this.elegido);
  }

  pintar(s) {
    const ancho = this.capa.clientWidth || 1;
    const alto = this.capa.clientHeight || 1;
    s.el.style.fontSize = `${s.tam * ancho}px`;
    s.el.style.transform = `translate(${s.x * ancho}px, ${s.y * alto}px) translate(-50%, -50%) rotate(${s.rot}deg)`;
  }

  actualizarHerramientas() {
    for (const b of this.herramientas.querySelectorAll('button')) b.disabled = !this.elegido;
  }

  // ---- gestos

  relativo(e) {
    const caja = this.capa.getBoundingClientRect();
    return { x: (e.clientX - caja.left) / caja.width, y: (e.clientY - caja.top) / caja.height };
  }

  alPresionar(e) {
    const tocado = this.stickers.find((s) => s.el === e.target || s.el.contains(e.target));
    if (!tocado && this.punteros.size === 0) {
      this.elegir(null);
      return;
    }
    this.capa.setPointerCapture(e.pointerId);
    this.punteros.set(e.pointerId, this.relativo(e));
    this.iniciarGesto();
  }

  iniciarGesto() {
    const s = this.elegido;
    if (!s) return;
    const puntos = [...this.punteros.values()];
    if (puntos.length === 1) {
      this.gesto = { tipo: 'mover', dx: s.x - puntos[0].x, dy: s.y - puntos[0].y };
    } else if (puntos.length >= 2) {
      const [a, b] = puntos;
      const proporcion = this.capa.clientWidth / this.capa.clientHeight;
      this.gesto = {
        tipo: 'pellizco',
        distancia: Math.hypot((b.x - a.x) * proporcion, b.y - a.y),
        angulo: Math.atan2(b.y - a.y, (b.x - a.x) * proporcion),
        tam: s.tam,
        rot: s.rot,
      };
    }
  }

  alMover(e) {
    if (!this.punteros.has(e.pointerId) || !this.elegido || !this.gesto) return;
    this.punteros.set(e.pointerId, this.relativo(e));
    const s = this.elegido;
    const puntos = [...this.punteros.values()];
    if (this.gesto.tipo === 'mover' && puntos.length === 1) {
      s.x = Math.min(1, Math.max(0, puntos[0].x + this.gesto.dx));
      s.y = Math.min(1, Math.max(0, puntos[0].y + this.gesto.dy));
    } else if (this.gesto.tipo === 'pellizco' && puntos.length >= 2) {
      const [a, b] = puntos;
      const proporcion = this.capa.clientWidth / this.capa.clientHeight;
      const distancia = Math.hypot((b.x - a.x) * proporcion, b.y - a.y);
      const angulo = Math.atan2(b.y - a.y, (b.x - a.x) * proporcion);
      s.tam = Math.min(0.6, Math.max(0.02, this.gesto.tam * (distancia / (this.gesto.distancia || 1))));
      s.rot = this.gesto.rot + ((angulo - this.gesto.angulo) * 180) / Math.PI;
    }
    this.pintar(s);
  }

  alSoltar(e) {
    this.punteros.delete(e.pointerId);
    this.iniciarGesto();
    if (this.punteros.size === 0) this.gesto = null;
  }

  /** Stickers en formato serializable para dibujarlos en resolución completa. */
  resultado() {
    return this.stickers.map(({ tipo, texto, x, y, tam, rot }) => ({ tipo, texto, x, y, tam, rot }));
  }
}
