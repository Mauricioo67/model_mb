// ============================================================
// ui.js — HUD y pantallas. No conoce la lógica del juego: lee el
// estado compartido y expone funciones de presentación puras.
// El DOM se consulta solo en refs.js; ningún otro módulo toca
// classList/textContent por su cuenta.
// ============================================================

import { game } from './core/state.js';
import { LEVELS } from './data/tuning.js';
import {
  uiCoins, uiLives, uiLevel, uiScore, uiPower, uiPower2,
  uiStartScreen, gameOverScreen, levelCompleteScreen, winScreen, pauseScreen,
  rotateScreen,
  finalScoreEl, levelScoreEl, levelCoinsEl, totalScoreEl,
} from './refs.js';
import { HUD, validators } from './data/tuning.js';
import { loadHighScore, saveHighScore } from './core/state.js';

// Referencias a cada pantalla por nombre de escena.
const SCREENS = Object.freeze({
  start: uiStartScreen,
  gameOver: gameOverScreen,
  levelComplete: levelCompleteScreen,
  win: winScreen,
  pause: pauseScreen,
  rotate: rotateScreen,
});

// Muestra una sola escena y oculta las demás (las pantallas son excluyentes).
function showScreen(name) {
  for (const [screenName, el] of Object.entries(SCREENS)) {
    el.classList.toggle('hidden', screenName !== name);
  }
}

function hideAllScreens() {
  for (const el of Object.values(SCREENS)) el.classList.add('hidden');
}

// Pantalla de selección de modo (single-player / co-op).
let modeSelectionScreen = null;

function showModeSelection() {
  if (!modeSelectionScreen) {
    modeSelectionScreen = document.createElement('div');
    modeSelectionScreen.id = 'modeSelectionScreen';
    modeSelectionScreen.className = 'hidden';
    modeSelectionScreen.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);color:#fff;text-align:center;gap:14px;z-index:10;">
        <h1>🎮 Seleccioná modo</h1>
        <p>Choose how to play:</p>
        <button class="btn mode-btn solo" id="modeSoloBtn">🎯 Single Player (P1)</button>
        <button class="btn mode-btn coop" id="modeCoopBtn">👥 Co-op (P1 + P2)</button>
      </div>
    `;
    document.getElementById('game').appendChild(modeSelectionScreen);
    
    document.getElementById('modeSoloBtn')?.addEventListener('click', () => {
      hideModeSelection();
      startNewGame(GAME_MODE.SOLO);
    });
    document.getElementById('modeCoopBtn')?.addEventListener('click', () => {
      hideModeSelection();
      startNewGame(GAME_MODE.COOP);
    });
  }
  modeSelectionScreen.classList.remove('hidden');
  // Ocultar otras pantallas
  hideAllScreens();
}

function hideModeSelection() {
  if (modeSelectionScreen) {
    modeSelectionScreen.classList.add('hidden');
  }
}

function isModeSelectionVisible() {
  return modeSelectionScreen && !modeSelectionScreen.classList.contains('hidden');
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function powerLabel(p) {
  if (!p) return '—';
  if (p.starTimer > 0) return 'Estrella';
  return p.big ? 'Grande' : 'Pequeño';
}

function sanitizeScore(value) {
  const num = Number(value);
  return validators.isNonNegativeInteger(num) ? num : 0;
}

function uiUpdate() {
  uiCoins.textContent = pad(game.coins, HUD.COINS_PAD);
  uiLives.textContent = 'x' + game.lives;
  uiLevel.textContent = game.level;
  uiScore.textContent = pad(game.score, HUD.SCORE_PAD);
  // Poder por jugador (co-op)
  uiPower.textContent = powerLabel(game.players[0]);
  uiPower2.textContent = powerLabel(game.players[1]);
  // High score
  const highScoreEl = document.getElementById('highScore');
  if (highScoreEl) {
    highScoreEl.textContent = pad(loadHighScore(), HUD.SCORE_PAD);
  }
}

function uiShowLevelComplete(levelScore, levelCoins, totalScore) {
  levelScoreEl.textContent = pad(levelScore, HUD.SCORE_PAD);
  levelCoinsEl.textContent = pad(levelCoins, HUD.LEVEL_COINS_PAD);
  totalScoreEl.textContent = pad(totalScore, HUD.SCORE_PAD);
  // Nombre del nivel según LEVELS (si existe, sino número genérico).
  const lvlDefinition = LEVELS[game.level - 1];
  if (lvlDefinition) {
    const levelNameEl = document.getElementById('levelName');
    if (levelNameEl) levelNameEl.textContent = lvlDefinition.name;
  }
  showScreen('levelComplete');
}

function uiShowWin() {
  finalScoreEl.textContent = pad(game.score, HUD.SCORE_PAD);
  saveHighScore(sanitizeScore(game.score));
  showScreen('win');
}

// Game Over: muestra la pantalla de derrota con el puntaje final.
function uiShowGameOver(score) {
  uiScore.textContent = pad(score, HUD.SCORE_PAD);
  saveHighScore(sanitizeScore(score));
  showScreen('gameOver');
}

export function bindButtons(onStart, onRetry, onNextLevel, onPlayAgain) {
  document.getElementById('startBtn').addEventListener('click', onStart);
  document.getElementById('retryBtn').addEventListener('click', onRetry);
  document.getElementById('nextLevelBtn').addEventListener('click', onNextLevel);
  document.getElementById('playAgainBtn').addEventListener('click', onPlayAgain);
}

export {
  uiUpdate, uiShowLevelComplete, uiShowWin, uiShowGameOver,
  showScreen, hideAllScreens,
  showModeSelection, hideModeSelection, isModeSelectionVisible,
};
