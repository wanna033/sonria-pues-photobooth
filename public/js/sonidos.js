/*
 * Sonidos sintetizados (sin archivos de audio) y voz del asistente.
 */

let contexto = null;
let activado = true;
let vozActivada = true;

export function configurarSonidos({ sonidos = true, voz = true } = {}) {
  activado = sonidos;
  vozActivada = voz;
}

function audio() {
  if (!contexto) contexto = new AudioContext();
  if (contexto.state === 'suspended') contexto.resume();
  return contexto;
}

export function pitido(frecuencia = 880, duracion = 0.12, volumen = 0.22) {
  if (!activado) return;
  const ctx = audio();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gan = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frecuencia;
  gan.gain.setValueAtTime(0.0001, t);
  gan.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
  gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  osc.connect(gan).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duracion + 0.02);
}

/** Sonido de obturador: dos chasquidos de ruido filtrado. */
export function obturador() {
  if (!activado) return;
  const ctx = audio();
  const largo = Math.floor(ctx.sampleRate * 0.09);
  const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < largo; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / largo) ** 3;

  [0, 0.085].forEach((retraso, n) => {
    const t = ctx.currentTime + retraso;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = n === 0 ? 2400 : 1600;
    filtro.Q.value = 0.9;
    const gan = ctx.createGain();
    gan.gain.value = 0.9;
    fuente.connect(filtro).connect(gan).connect(ctx.destination);
    fuente.start(t);
  });
}

export function exito() {
  if (!activado) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    setTimeout(() => pitido(f, 0.22, 0.16), i * 90);
  });
}

let vozElegida;

function vozEspanol() {
  if (vozElegida !== undefined) return vozElegida;
  const voces = speechSynthesis.getVoices();
  if (!voces.length) return null; // aún no cargan; se reintenta
  vozElegida = voces.find((v) => v.lang === 'es-MX')
    || voces.find((v) => v.lang === 'es-US')
    || voces.find((v) => v.lang?.startsWith('es'))
    || null;
  return vozElegida;
}

if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    vozElegida = undefined;
    vozEspanol();
  });
}

export function hablar(texto) {
  if (!vozActivada || !('speechSynthesis' in window)) return;
  const voz = vozEspanol();
  speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = voz?.lang || 'es-MX';
  if (voz) frase.voice = voz;
  frase.rate = 1.05;
  frase.pitch = 1.1;
  speechSynthesis.speak(frase);
}
