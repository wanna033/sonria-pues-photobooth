/*
 * Disparo "manos libres": escucha el micrófono y avisa cuando oye un sonido
 * fuerte y repentino (un aplauso, un chasquido o un "¡whisky!" bien gritado).
 *
 * Compara cada instante con el ruido de fondo: en una fiesta con música el
 * fondo ya es alto, así que sólo cuenta un golpe claramente más fuerte.
 */

export class DetectorAplauso {
  constructor() {
    this.flujo = null;
    this.contexto = null;
    this.reloj = 0;
  }

  get activo() {
    return Boolean(this.flujo);
  }

  /**
   * @param {() => void} alDetectar se llama una vez por aplauso (con pausa de 1.5 s entre uno y otro)
   * @returns {Promise<void>} falla si no hay micrófono o no dieron permiso
   */
  async iniciar(alDetectar) {
    this.detener();
    this.flujo = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.contexto = new AudioContext();
    if (this.contexto.state === 'suspended') await this.contexto.resume().catch(() => {});
    const fuente = this.contexto.createMediaStreamSource(this.flujo);
    const analizador = this.contexto.createAnalyser();
    analizador.fftSize = 1024;
    fuente.connect(analizador);
    const muestras = new Float32Array(analizador.fftSize);

    let fondo = 0.02; // nivel del ruido de fondo (se va ajustando)
    let ultimo = 0;
    const inicio = performance.now();
    this.reloj = setInterval(() => {
      analizador.getFloatTimeDomainData(muestras);
      let pico = 0;
      let suma = 0;
      for (const v of muestras) {
        const a = Math.abs(v);
        if (a > pico) pico = a;
        suma += v * v;
      }
      const nivel = Math.sqrt(suma / muestras.length);
      const ahora = performance.now();
      // el primer medio segundo sólo aprende cómo suena el lugar
      const golpe = ahora - inicio > 500 && pico > 0.35 && nivel > Math.max(0.05, fondo * 4);
      if (golpe && ahora - ultimo > 1500) {
        ultimo = ahora;
        alDetectar();
      }
      // el fondo sube despacio y baja más rápido, así un aplauso no lo "contamina"
      fondo += (nivel - fondo) * (nivel > fondo ? 0.02 : 0.1);
    }, 30);
  }

  detener() {
    clearInterval(this.reloj);
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.contexto?.close().catch(() => {});
    this.flujo = null;
    this.contexto = null;
  }
}
