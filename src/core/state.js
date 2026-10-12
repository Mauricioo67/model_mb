// ============================================================
// core/state.js — Única fuente de verdad del estado compartido.
// Los módulos importan `game` y `view` desde acá. El objeto es
// mutable a propósito; lo inmutable son las constantes de
// core/constants.js y de data/.
// ============================================================

import { GAME_DEFAULTS } from './constants.js';

// Contexto de render y escala (HiDPI/zoom). app.js los llena al iniciar.
// w/h son las dimensiones lógicas de la vista (mismas que VIEW en constants).
export const view = {
  ctx: null,  // contexto 2d del canvas
  scale: 1,   // pixels de backing store por unidad lógica
  w: 0,       // ancho lógico de la vista
  h: 0,       // alto lógico de la vista
};

// Fábrica del estado de partida: llamar en cada partida nueva.
// Co-op local: `players` es un array (P1 + P2); score, coins y lives
// son compartidos (arcade clásico).
export function createInitialState() {
  return {
    running: false,
    paused: false,
    level: 1,
    maxLevels: GAME_DEFAULTS.maxLevels,
    lives: GAME_DEFAULTS.lives,
    score: 0,
    coins: 0,
    combo: 0,
    frame: 0,
    players: [],
    camera: { x: 0 },
    levelData: null,
    particles: [],
    shake: 0, // magnitud del screen shake en px
    flashTimer: 0, // flash blanco al recibir daño (feedback visual)
    lastLevelScore: 0,
    lastLevelCoins: 0,
    mode: null, // 'coop' | 'solo'
  };
}

// Instancia compartida por todos los módulos (misma identidad siempre).
export const game = createInitialState();

// Reinicia la partida conservando la identidad del objeto.
export function resetGameState() {
  Object.assign(game, createInitialState());
}

export const STORAGE_KEY_HIGH_SCORE = 'mario_bros_high_score_v1';

export function loadHighScore() {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HIGH_SCORE);
    if (!stored) return 0;
    const parsed = parseInt(stored, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  } catch (e) {
    return 0;
  }
}

export function saveHighScore(score) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = loadHighScore();
    const sanitized = (typeof score === 'number' && Number.isInteger(score) && score >= 0) ? score : 0;
    if (sanitized > current) {
      localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(sanitized));
    }
  } catch (e) {
    // Silenciosamente falla si no hay localStorage disponible
  }
}

export function resetHighScore() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_HIGH_SCORE);
  } catch (e) {
    // Silenciosamente falla
  }
}
