// ============================================================
// input.js — Teclado, gamepads y táctil para co-op local.
// Cada jugador tiene su propio mapeo (data/tuning.js -> CONTROLS)
// y su propio buffer de salto, compartido por todas las fuentes.
// Prioridad: gamepad > táctil > teclado.
// ============================================================

import { game } from './core/state.js';
import { ensureAudio } from './audio.js';
import { showScreen, hideAllScreens } from './ui.js';
import { resetTouchInput, touchX, touchJumpHeld } from './touch.js';
import { PLAYER, CONTROLS, PLAYERS } from './data/tuning.js';

// Códigos de teclas cuyo comportamiento nativo se suprime durante el juego.
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyD', 'KeyS'];

// Botones estándar de gamepad (Gamepad API).
const PAD_BUTTON = Object.freeze({
  A: 0,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
});

// Umbral de inclinación de la palanca considerada "dirección".
const PAD_AXIS_THRESHOLD = 0.35;

const PAUSE_KEY = 'KeyP';

const keys = {};
let bound = false;
let jumpBuffers = []; // un timer de buffer de salto por jugador
let padPrevJump = []; // flanco previo del botón de salto de cada gamepad
let touchPrevJump = []; // flanco previo del botón de salto táctil

// Pausa/reanuda la partida mostrando u ocultando la pantalla de pausa.
// Único punto de verdad del estado de pausa (input.js, touch.js y app.js la usan).
function setPaused(paused) {
  game.paused = paused;
  if (paused) showScreen('pause');
  else hideAllScreens();
}

let padAssignment = [0, 1];
let padPollTimer = null;

function pollPads() {
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  const connected = [];
  for (const pad of pads) {
    if (pad && pad.connected) connected.push(pad);
  }
  for (let i = 0; i < PLAYERS.length; i++) {
    const assigned = padAssignment[i];
    const pad = pads[assigned];
    if (!pad || !pad.connected) {
      for (const p of connected) {
        if (!padAssignment.includes(p.index)) {
          padAssignment[i] = p.index;
          break;
        }
      }
    }
  }
}

function padForPlayer(playerIndex) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  const padIdx = padAssignment[playerIndex];
  const pad = pads && pads[padIdx];
  return pad && pad.connected ? pad : null;
}

function keyHeld(codes) {
  return codes.some(c => keys[c]);
}

function bindInput() {
  if (bound) return; // evita duplicar listeners si se llama dos veces
  bound = true;
  jumpBuffers = PLAYERS.map(() => 0);
  padPrevJump = PLAYERS.map(() => false);
  touchPrevJump = PLAYERS.map(() => false);
  // Iniciar polling de gamepads para detección de hot-plug.
  // Se inicia aquí (en lugar de en app.js) para que esté disponible
  // incluso si el juego se usa sin app.js (p.ej. tests o integraciones).
  startPadPolling();
  // Limpiar el polling al desvincular (evita leaks si se re-registra).
  window.addEventListener('beforeunload', stopPadPolling);
  window.addEventListener('keydown', e => {
    if (e.code === PAUSE_KEY) {
      if (game.running) setPaused(!game.paused);
      return;
    }
    PLAYERS.forEach((_, i) => {
      if (CONTROLS[i].jump.includes(e.code) && !e.repeat) {
        jumpBuffers[i] = PLAYER.JUMP_BUFFER_FRAMES;
      }
    });
    keys[e.code] = true;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    ensureAudio();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  // Al volver de otra pestaña, quedan teclas "pegadas": limpiar y pausar.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearAllInputs();
      if (game.running && !game.paused) setPaused(true);
    }
  });
}

// Limpia toda la entrada activa: teclas, buffers de salto, flancos
// registrados y estado táctil. (visibilitychange y pruebas.)
function clearAllInputs() {
  for (const k of Object.keys(keys)) keys[k] = false;
  jumpBuffers = jumpBuffers.map(() => 0);
  padPrevJump = padPrevJump.map(() => false);
  touchPrevJump = touchPrevJump.map(() => false);
  resetTouchInput();
}

// Input horizontal de un jugador: gamepad > táctil > teclado.
function inputX(playerIndex = 0) {
  const padDir = padDirection(padForPlayer(playerIndex));
  if (padDir !== 0) return padDir;
  const tDir = touchX(playerIndex);
  if (tDir !== 0) return tDir;
  const c = CONTROLS[playerIndex] || CONTROLS[0];
  if (keyHeld(c.right)) return 1;
  if (keyHeld(c.left)) return -1;
  return 0;
}

// Jump buffering por jugador: la pulsación queda válida ~130ms y se
// consume solo cuando el salto realmente ocurre.
function inputJump(playerIndex = 0) {
  return (jumpBuffers[playerIndex] || 0) > 0;
}

// ¿El salto sigue mantenido? (altura de salto variable). Cualquier fuente
// que lo mantenga cuenta: teclado, gamepad o táctil.
function inputJumpHeld(playerIndex = 0) {
  const c = CONTROLS[playerIndex] || CONTROLS[0];
  if (keyHeld(c.jump)) return true;
  if (touchJumpHeld(playerIndex)) return true;
  const pad = padForPlayer(playerIndex);
  return !!(pad && pad.buttons[PAD_BUTTON.A] && pad.buttons[PAD_BUTTON.A].pressed);
}

function consumeJump(playerIndex = 0) {
  jumpBuffers[playerIndex] = 0;
}

// Dirección horizontal desde un gamepad: palanca o D-pad (0 = ninguna).
function padDirection(pad) {
  if (!pad) return 0;
  const ax = (pad.axes && pad.axes[0]) || 0;
  if (ax < -PAD_AXIS_THRESHOLD) return -1;
  if (ax > PAD_AXIS_THRESHOLD) return 1;
  if (pad.buttons[PAD_BUTTON.DPAD_LEFT] && pad.buttons[PAD_BUTTON.DPAD_LEFT].pressed) return -1;
  if (pad.buttons[PAD_BUTTON.DPAD_RIGHT] && pad.buttons[PAD_BUTTON.DPAD_RIGHT].pressed) return 1;
  return 0;
}

// Se llama una vez por paso de simulación: decae los buffers de cada
// jugador y registra el flanco ascendente de salto en cada fuente
// (gamepad y táctil), para que todas se beneficien del buffer.
function tickJumpBuffer() {
  for (let i = 0; i < jumpBuffers.length; i++) {
    if (jumpBuffers[i] > 0) jumpBuffers[i]--;

    const pad = padForPlayer(i);
    const padPressed = !!(pad && pad.buttons[PAD_BUTTON.A] && pad.buttons[PAD_BUTTON.A].pressed);
    if (padPressed && !padPrevJump[i]) jumpBuffers[i] = PLAYER.JUMP_BUFFER_FRAMES;
    padPrevJump[i] = padPressed;

    const touchPressed = touchJumpHeld(i);
    if (touchPressed && !touchPrevJump[i]) jumpBuffers[i] = PLAYER.JUMP_BUFFER_FRAMES;
    touchPrevJump[i] = touchPressed;
  }
}

export { keys, bindInput, inputX, inputJump, inputJumpHeld, consumeJump, tickJumpBuffer, setPaused, clearAllInputs, padForPlayer };

export function startPadPolling() {
  if (padPollTimer) return;
  padPollTimer = setInterval(pollPads, 250);
}

export function stopPadPolling() {
  if (padPollTimer) {
    clearInterval(padPollTimer);
    padPollTimer = null;
  }
}
