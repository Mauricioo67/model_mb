// ============================================================
// core/constants.js — Constantes estructurales del motor.
// No contienen balance de juego: dimensiones de la vista, timing
// del loop y valores por defecto de una partida.
// El balance jugable (física, puntajes, spawns) vive en src/data/.
// ============================================================

export const VIEW = Object.freeze({
  W: 800,      // ancho lógico del escenario
  H: 500,      // alto lógico del escenario
  DPR_MAX: 2,  // tope de devicePixelRatio para el backing store
  MIN_SCALE: 0.1, // escala mínima de seguridad
});

export const LOOP = Object.freeze({
  STEP_MS: 1000 / 60, // paso fijo de simulación (~60Hz)
  MAX_STEPS: 5,       // techo de pasos de simulación por frame renderizado
  ACC_MAX_MS: 250,    // si la pestaña se congeló, no simular más que esto
});

export const GAME_DEFAULTS = Object.freeze({
  maxLevels: 5,
  lives: 3,
});

export const PHYSICS = Object.freeze({
  GROUND_DEPTH_BELOW_PX: 200, // extensión del suelo bajo la pantalla (nunca se ve el borde)
});
