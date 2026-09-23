/*
 * Manejo de la cámara (webcam, o una cámara réflex/mirrorless usada como
 * webcam con la utilidad del fabricante). Si no hay cámara disponible, genera
 * una imagen de demostración para que la cabina se pueda probar igual.
 */

export class Camara {
  constructor() {
    this.stream = null;
    this.demo = false;
    this.animacionDemo = 0;
    // video oculto pero en el documento, siempre reproduciendo: es la fuente de las capturas
    this.fuente = document.createElement('video');
    this.fuente.muted = true;
    this.fuente.playsInline = true;
    this.fuente.setAttribute('aria-hidden', 'true');
    Object.assign(this.fuente.style, {
      position: 'fixed', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none', left: '0', top: '0',
    });
    document.body.appendChild(this.fuente);
  }

  get ancho() {
    return this.fuente.videoWidth || 1280;
  }

  get alto() {
    return this.fuente.videoHeight || 720;
  }

  /**
   * Preferencia en modo automático (menor = mejor):
   * 0 cámara profesional vía su utilidad de webcam o capturadora, 1 cámara USB,
   * 2 cámara integrada de la computadora, 3 cámaras virtuales (OBS, etc.).
   */
  static prioridad(nombre = '') {
    if (/eos webcam|webcam utility|imaging edge|x webcam|gopro|cam link|elgato|capture/i.test(nombre)) return 0;
    if (/virtual|obs|manycam|xsplit|snap camera|droidcam|iriun|airplay|3uair|screen|mirror|dummy/i.test(nombre)) return 3;
    if (/integrated|integrada|built-?in|interna|internal|facetime|front|frontal/i.test(nombre)) return 2;
    return 1;
  }

  /** Id del dispositivo en uso ('' en modo demostración). */
  get idActual() {
    return this.demo ? '' : (this.stream?.getVideoTracks()[0]?.getSettings().deviceId || '');
  }

  /** Nombre de la cámara que se está usando. */
  get nombre() {
    return this.demo ? 'Cámara de demostración' : (this.stream?.getVideoTracks()[0]?.label || 'Cámara');
  }

  async iniciar({ camaraId = '', resolucion = '1920x1080' } = {}) {
    this.detener();
    const [ancho, alto] = String(resolucion).split('x').map(Number);
    const pedir = (id) => navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...(id ? { deviceId: { exact: id } } : {}),
        width: { ideal: ancho || 1920 },
        height: { ideal: alto || 1080 },
        frameRate: { ideal: 30 },
      },
    });

    let error = null;
    try {
      this.stream = await pedir(camaraId);
    } catch (e) {
      error = e;
      if (camaraId) {
        try {
          this.stream = await pedir('');
          error = null;
        } catch (e2) {
          error = e2;
        }
      }
    }

    // Automática: con el permiso ya dado se conocen los nombres; si hay una cámara
    // conectada mejor que la actual (p. ej. USB en vez de la integrada), se cambia a ella.
    if (this.stream && !camaraId) {
      const actual = this.stream.getVideoTracks()[0];
      const mejor = (await this.listar())
        .map((c, i) => ({ ...c, orden: i, prioridad: Camara.prioridad(c.nombre) }))
        .sort((a, b) => a.prioridad - b.prioridad || a.orden - b.orden)[0];
      const idActual = actual?.getSettings().deviceId;
      if (mejor && mejor.id !== idActual && mejor.prioridad < Camara.prioridad(actual?.label)) {
        try {
          const nuevo = await pedir(mejor.id);
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = nuevo;
        } catch {
          // si la cámara preferida está ocupada, se queda con la que ya funciona
        }
      }
    }

    this.demo = !this.stream;
    if (this.demo) this.stream = this.flujoDemo(1280, 720);
    // si desconectan la cámara durante el evento, se avisa para buscar otra
    this.stream.getVideoTracks()[0]?.addEventListener('ended', () => this.alPerder?.());

    this.fuente.srcObject = this.stream;
    await this.fuente.play().catch(() => {});
    await new Promise((resolve) => {
      if (this.fuente.videoWidth) return resolve();
      this.fuente.addEventListener('loadedmetadata', resolve, { once: true });
      setTimeout(resolve, 3000);
    });
    return { demo: this.demo, error };
  }

  /** Muestra la cámara en otro elemento <video>. */
  conectar(video) {
    if (video.srcObject !== this.stream) video.srcObject = this.stream;
    video.play().catch(() => {});
  }

  /**
   * Toma una foto a resolución completa con el filtro aplicado.
   * @returns {HTMLCanvasElement}
   */
  capturar({ filtroCss = 'none', espejo = false, anchoMax = 0 } = {}) {
    let w = this.ancho;
    let h = this.alto;
    if (anchoMax && w > anchoMax) {
      h = Math.round((h * anchoMax) / w);
      w = anchoMax;
    }
    const lienzo = document.createElement('canvas');
    lienzo.width = w;
    lienzo.height = h;
    this.dibujar(lienzo.getContext('2d'), w, h, { filtroCss, espejo });
    return lienzo;
  }

  /** Dibuja el cuadro actual (cubriendo w×h) en un contexto. */
  dibujar(ctx, w, h, { filtroCss = 'none', espejo = false } = {}) {
    ctx.save();
    ctx.filter = filtroCss || 'none';
    if (espejo) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const sw = this.ancho;
    const sh = this.alto;
    const escala = Math.min(sw / w, sh / h);
    const cw = w * escala;
    const ch = h * escala;
    ctx.drawImage(this.fuente, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    ctx.restore();
  }

  async listar() {
    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      return dispositivos
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({ id: d.deviceId, nombre: d.label || `Cámara ${i + 1}` }));
    } catch {
      return [];
    }
  }

  async obtenerAudio() {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    } catch {
      return null;
    }
  }

  detener() {
    cancelAnimationFrame(this.animacionDemo);
    clearInterval(this.animacionDemo);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /** Imagen animada para probar la cabina sin cámara. */
  flujoDemo(w, h) {
    const lienzo = document.createElement('canvas');
    lienzo.width = w;
    lienzo.height = h;
    const ctx = lienzo.getContext('2d');
    const burbujas = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h, r: 20 + Math.random() * 70,
      vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 2.4, tono: (i * 47) % 360,
    }));
    const pintar = () => {
      const t = performance.now() / 1000;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, `hsl(${(t * 20) % 360} 60% 35%)`);
      g.addColorStop(1, `hsl(${(t * 20 + 120) % 360} 60% 25%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const b of burbujas) {
        b.x = (b.x + b.vx + w) % w;
        b.y = (b.y + b.vy + h) % h;
        ctx.fillStyle = `hsla(${b.tono} 90% 70% / 0.35)`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // "persona" de ejemplo
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.42 + Math.sin(t * 2) * 8, h * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 1.02, h * 0.3, h * 0.36, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.arc(w / 2 - h * 0.045, h * 0.4 + Math.sin(t * 2) * 8, h * 0.015, 0, Math.PI * 2);
      ctx.arc(w / 2 + h * 0.045, h * 0.4 + Math.sin(t * 2) * 8, h * 0.015, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = h * 0.012;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.45 + Math.sin(t * 2) * 8, h * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `700 ${Math.round(h * 0.045)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Cámara de demostración', w / 2, h * 0.1);
      ctx.font = `400 ${Math.round(h * 0.03)}px "Segoe UI", sans-serif`;
      ctx.fillText(new Date().toLocaleTimeString('es-MX'), w / 2, h * 0.16);
    };
    // setInterval en lugar de requestAnimationFrame para que siga aunque la ventana no tenga foco
    this.animacionDemo = setInterval(pintar, 1000 / 30);
    pintar();
    return lienzo.captureStream(30);
  }
}
