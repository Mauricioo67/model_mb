// ============================================================
// refs.js — Referencias DOM centralizadas.
// Único módulo que consulta el DOM; si un ID falta, falla temprano
// con un error claro. Los demás módulos acceden al DOM solo a
// través de la API de ui.js.
// ============================================================

function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el;
}

export const uiCoins = byId('coins');
export const uiLives = byId('lives');
export const uiLevel = byId('level');
export const uiScore = byId('score');
export const uiPower = byId('power');
export const uiPower2 = byId('power2');

export const uiStartScreen = byId('startScreen');
export const gameOverScreen = byId('gameOverScreen');
export const levelCompleteScreen = byId('levelCompleteScreen');
export const winScreen = byId('winScreen');
export const pauseScreen = byId('pauseScreen');
export const rotateScreen = byId('rotateScreen');

export const finalScoreEl = byId('finalScore');
export const levelScoreEl = byId('levelScore');
export const levelCoinsEl = byId('levelCoins');
export const totalScoreEl = byId('totalScore');
