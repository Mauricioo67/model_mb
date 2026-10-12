// ============================================================
// audio.js — Sonidos con Web Audio API.
// Todo se genera por síntesis: no hay archivos de audio que cargar.
// El contexto se crea diferido (requisito de autoplay de los
// navegadores) y se reanuda si el navegador lo suspendió.
// ============================================================

let audioCtx = null;
const THEMES = Object.freeze({
  1: [260, 330, 390, 520],
  2: [220, 260, 330, 390],
  3: [330, 390, 520, 650],
  4: [260, 330, 390, 520, 650],
  5: [220, 260, 330, 390, 520, 650],
});

// Crea el AudioContext si no existe y lo reanuda si está suspendido.
// Debe llamarse desde un gesto del usuario (click/tecla).
let bgTheme = null;
let bgNoteIndex = 0;
let bgInterval = null;

function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Encola un beep sintetizado (oscilador + envolvente de ganancia).
function beep(freq, dur = 0.1, type = 'square', vol = 0.05, delayMs = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t0);
  gain.gain.setTargetAtTime(0, t0 + dur, 0.1);
  osc.stop(t0 + dur + 0.05);
}

// --- Estrella: melodía en bucle mientras dura la invencibilidad ---
const STAR_MELODY = Object.freeze([660, 660, 660, 520, 660, 780, 440, 520]);
const STAR_NOTE_MS = 140;
const STAR_NOTE_VOL = 0.04;

let starInterval = null;

function startStarMusic() {
  stopStarMusic();
  if (!audioCtx) return;
  let i = 0;
  starInterval = setInterval(() => {
    beep(STAR_MELODY[i % STAR_MELODY.length], 0.09, 'square', STAR_NOTE_VOL);
    i++;
  }, STAR_NOTE_MS);
}

function stopStarMusic() {
  if (starInterval) {
    clearInterval(starInterval);
    starInterval = null;
  }
}

function startBgTheme() {
  if (!audioCtx) return;
  stopBgTheme();
  const theme = THEMES[game.level] || THEMES[1];
  bgNoteIndex = 0;
  bgInterval = setInterval(() => {
    beep(theme[bgNoteIndex % theme.length], 0.15, 'square', 0.04);
    bgNoteIndex++;
  }, 150);
}

function stopBgTheme() {
  if (bgInterval) {
    clearInterval(bgInterval);
    bgInterval = null;
  }
}

function switchBgTheme() {
  if (typeof game !== 'undefined' && game.running) {
    startBgTheme();
  }
}

// --- Efectos puntuales (cada uno es una pequeña frase de beeps) ---

const SFX = Object.freeze({
  jump:    () => beep(520, 0.12, 'sine', 0.08),
  coin:    () => { beep(980, 0.05); beep(1380, 0.07, 'square', 0.05, 80); },
  stomp:   () => beep(280, 0.14, 'triangle'),
  die:     () => { beep(200, 0.1); beep(140, 0.18, 'square', 0.05, 80); },
  power:   () => { beep(480, 0.1); beep(640, 0.12, 'square', 0.05, 90); beep(820, 0.14, 'square', 0.05, 180); },
  shell:   () => beep(360, 0.08, 'square', 0.06),
  bump:    () => beep(120, 0.08, 'triangle', 0.05),
  level:   () => [440, 550, 660, 780].forEach((f, i) => beep(f, 0.12, 'square', 0.05, i * 90)),
});

export const sfxJump = SFX.jump;
export const sfxCoin = SFX.coin;
export const sfxStomp = SFX.stomp;
export const sfxDie = SFX.die;
export const sfxPower = SFX.power;
export const sfxShell = SFX.shell;
export const sfxBump = SFX.bump;
export const sfxLevel = SFX.level;
export { ensureAudio, startBgTheme, stopBgTheme, switchBgTheme, startStarMusic, stopStarMusic };
