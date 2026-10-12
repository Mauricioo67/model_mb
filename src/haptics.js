// ============================================================
// haptics.js — Feedback háptico (vibración) en dispositivos móviles.
// Los patrones viven en data/tuning.js (HAPTICS). Donde la API no
// existe (iOS, desktop) es un no-op silencioso: nadie chequea soporte.
// ============================================================

import { HAPTICS } from './data/tuning.js';

// ¿El dispositivo soporta vibración?
function vibrateSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

// Vibra con un patrón de HAPTICS por su clave exacta ('STOMP', 'DEATH', ...).
function vibrate(patternKey) {
  if (!vibrateSupported()) return;
  const pattern = HAPTICS[patternKey];
  if (pattern == null) return;
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // Algunos navegadores lanzan si el patrón es inválido: ignorar.
  }
}

// Cada evento del juego mapea explícitamente a su patrón.
export const haptics = Object.freeze({
  stomp: () => vibrate('STOMP'),
  shellKill: () => vibrate('SHELL_KILL'),
  powerup: () => vibrate('POWERUP'),
  death: () => vibrate('DEATH'),
});

export { vibrateSupported };
