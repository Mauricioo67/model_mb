// ============================================================
// app.js — Composition root.
// Único lugar que conoce todo: crea el canvas, inicializa módulos,
// define el game loop (fixed timestep) y orquesta las transiciones
// de partida. El estado vive en core/state.js; las constantes en
// core/constants.js y data/.
// ============================================================

import { initAssets } from './assets.js';
import { bindInput, setPaused, tickJumpBuffer, startPadPolling, stopPadPolling } from './input.js';
import { initTouch, bindTouchControls, updateTouchControlsVisibility } from './touch.js';
import { ensureAudio, sfxLevel, stopStarMusic, startBgTheme, stopBgTheme, switchBgTheme } from './audio.js';
import { uiUpdate, uiShowLevelComplete, uiShowWin, bindButtons, hideAllScreens, showModeSelection } from './ui.js';
import { initLevelData, normalizeLevelData, reseedLevelBuild } from './levels.js';
import { rectOverlap, playerHitbox } from './physics.js';
import { entitiesUpdate, resetPowerups } from './entities.js';
import { updateParticles, resetParticles } from './particles.js';
import { cameraUpdate } from './camera.js';
import { render } from './render.js';
import { startLevel, playerUpdate } from './player.js';

import { game, view, resetGameState } from './core/state.js';
import { VIEW, LOOP, GAME_DEFAULTS } from './core/constants.js';
import { SCORE, FX, HUD, GAME_MODE } from './data/tuning.js';
import { FLAG } from './data/level-data.js';

// --- Canvas y vista (única fuente: view en core/state.js) ---
const canvas = document.getElementById('c');
canvas.width = VIEW.W;
canvas.height = VIEW.H;
view.ctx = canvas.getContext('2d');
view.w = VIEW.W;
view.h = VIEW.H;

// --- Escalado responsive ---
// El escenario lógico se escala con CSS (#stage) y el canvas ajusta su backing
// store a la resolución física del dispositivo (HiDPI).
const stage = document.getElementById('stage');
function fitStage() {
  const s = Math.min((window.innerWidth || VIEW.W) / VIEW.W, (window.innerHeight || VIEW.H) / VIEW.H);
  if (stage) stage.style.transform = `scale(${s})`;
  const dpr = Math.min(window.devicePixelRatio || 1, VIEW.DPR_MAX);
  view.scale = Math.max(VIEW.MIN_SCALE, dpr * s);
  const bw = Math.round(VIEW.W * view.scale);
  const bh = Math.round(VIEW.H * view.scale);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
fitStage();

// Fullscreen al iniciar desde un click del usuario (silencioso si no está disponible)
function tryFullscreen() {
  const el = document.documentElement;
  if (el && el.requestFullscreen && !document.fullscreenElement) {
    el.requestFullscreen().catch(() => {});
  }
}

// Estado del fixed timestep: acumulador y marca de tiempo del frame anterior.
// Declarados en el scope del módulo: beginLevel y loop los comparten.
let lastTime = null;
let acc = 0;

// Evita múltiples loops en paralelo si beginLevel se llama dos veces seguidas.
let loopScheduled = false;

function scheduleLoop() {
  if (loopScheduled) return;
  loopScheduled = true;
  requestAnimationFrame(loop);
}

function startGame(mode = GAME_MODE.SOLO) {
  resetGameState(); // estado limpio conservando la identidad del objeto
  game.lives = GAME_DEFAULTS.lives; // vidas compartidas del co-op
  hideAllScreens();
  beginLevel(game.level, mode);
}

function beginLevel(n, mode = GAME_MODE.SOLO) { // exportada abajo para pruebas de integración
  game.level = n;
  game.lastLevelScore = game.score;
  game.lastLevelCoins = game.coins;
  game.levelData = initLevelData(n);
  game.mode = mode;
  resetPowerups();
  resetParticles();
  game.combo = 0;
  game.camera.x = 0;
  game.shake = 0;
  startLevel(game.levelData);
  game.running = true;
  game.paused = false;
  lastTime = null; // reinicia el acumulador del fixed timestep
  acc = 0;
  uiUpdate();
  scheduleLoop(); // arranca/reanuda el loop desde cualquier entrada
  startBgTheme();
  switchBgTheme();
}

function finishLevel() {
  ensureAudio();
  stopStarMusic();
  sfxLevel();
  const levelScore = game.score - game.lastLevelScore + SCORE.LEVEL_CLEAR;
  const levelCoins = game.coins - game.lastLevelCoins;
  game.score += SCORE.LEVEL_CLEAR;
  game.lastLevelScore = game.score;
  game.running = false;
  // Último nivel: pantalla de victoria; si no, la de nivel completado.
  if (game.level >= game.maxLevels) {
    uiShowWin();
  } else {
    uiShowLevelComplete(levelScore, levelCoins, game.score);
  }
}

function loop() {
  loopScheduled = false;
  if (!game.running) return;
  updateTouchControlsVisibility(); // barato: un classList.toggle por frame

  // --- Fixed timestep 60Hz con acumulador ---
  // La simulación avanza en pasos de 16.67ms sin importar la tasa de refresco
  // del monitor (60/120/144Hz): la velocidad del juego es siempre la misma.
  const now = performance.now();
  if (lastTime == null || now < lastTime) lastTime = now - LOOP.STEP_MS;
  acc += now - lastTime;
  lastTime = now;
  // En pausa el loop sigue vivo (para reanudar con P) pero no simula:
  // descarta el tiempo acumulado para no hacer una ráfaga al reanudar.
  if (game.paused) {
    acc = 0;
    render();
    scheduleLoop();
    return;
  }
  if (acc > LOOP.ACC_MAX_MS) acc = LOOP.ACC_MAX_MS; // si la pestaña se congeló, no simular una eternidad
  let stepsRun = 0;
  while (acc >= LOOP.STEP_MS && stepsRun < LOOP.MAX_STEPS && game.running) {
    acc -= LOOP.STEP_MS;
    stepsRun++;
    stepGame();
  }

  // Decay del screen shake (fuera de la simulación, depende del tiempo real)
  if (game.shake > 0) game.shake = Math.max(0, game.shake - FX.SHAKE_DECAY);
  // Decay del flash de daño
  if (game.flashTimer > 0) game.flashTimer = Math.max(0, game.flashTimer - 1);

  render();
  scheduleLoop();
}

// Un paso de simulación (16.67ms de juego)
function stepGame() {
  game.frame++;
  tickJumpBuffer();
  for (const p of game.players) playerUpdate(p);
  entitiesUpdate();
  cameraUpdate();

  // Si se acabaron las vidas compartidas, el Game Over ya se mostró en killPlayer
  if (!game.running) return;

  if (anyPlayerReachedFlag()) {
    finishLevel();
    return;
  }

  updateParticles();
  if (game.frame % HUD.UPDATE_EVERY_FRAMES === 0) uiUpdate(); // HUD fresco sin coste por frame
}

// La bandera completa el nivel: basta con que LLEGUE CUALQUIERA (co-op).
function anyPlayerReachedFlag() {
  const gd = game.levelData;
  const flagRect = { x: gd.flagX, y: gd.groundY - FLAG.H, w: FLAG.W, h: FLAG.H };
  return game.players.some(p => p.alive && rectOverlap(playerHitbox(p), flagRect));
}

// Exposición para pruebas de integración (no usadas por la lógica del juego).
export { beginLevel, loop };

export { startBgTheme, stopBgTheme, switchBgTheme };

// Auto-pausa al perder el foco de la ventana (evita muertes injustas en segundo plano)
window.addEventListener('blur', () => {
  if (game.running && !game.paused) setPaused(true);
});

// El polling de gamepads se inicia en bindInput (input.js).
// No iniciarlo acá de nuevo para evitar duplicados.

// Semilla reproducible para la variación de niveles (p.ej. 1-Up positions).
// Cambiar esta semilla genera distribuciones distintas de power-ups especiales.
reseedLevelBuild(12345);

initAssets();
bindInput();
initTouch(); // marca html.touch si el dispositivo es táctil (muestra/oculta botones)
bindTouchControls();
updateTouchControlsVisibility(); // estado inicial: sin partida => ocultos
const startNewGame = (mode = GAME_MODE.SOLO) => { ensureAudio(); tryFullscreen(); startGame(mode); };
bindButtons(showModeSelection, startNewGame, () => {
  hideAllScreens();
  beginLevel(game.level + 1, game.mode === GAME_MODE.SOLO ? GAME_MODE.SOLO : GAME_MODE.COOP);
}, startNewGame);

// Escena inicial tras el menú (startLevel crea a los jugadores sobre el suelo)
game.levelData = initLevelData(1);
startLevel(game.levelData);
game.camera.x = 0;
render();
