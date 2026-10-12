// ============================================================
// touch.js — Controles táctiles co-op (P1 izquierda, P2 derecha).
// Expone el estado crudo por jugador (dirección y salto presionado).
// No conoce la simulación: input.js decide cómo consumirlo y lo
// integra al mismo jump buffer que teclado y gamepad.
// ============================================================

import { game } from './core/state.js';
import { setPaused } from './input.js';
import { showScreen, hideAllScreens } from './ui.js';

// Estado por jugador: cada botón se registra por separado y la
// dirección se calcula al leer (si aprietan ambos, queda neutro).
// Indexado igual que PLAYERS/CONTROLS: 0 -> P1, 1 -> P2.
const touchState = [
  { left: false, right: false, jump: false },
  { left: false, right: false, jump: false },
];

let touchBound = false;

// ¿El dispositivo tiene input táctil? Decide si los botones se muestran.
function isTouchDevice() {
  return typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

// Habilita los controles táctiles agregando la clase html.touch (CSS).
function initTouch() {
  if (isTouchDevice()) document.documentElement.classList.add('touch');
}

// ¿El dispositivo está en orientación vertical?
function isPortrait() {
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
}

// Muestra u oculta la capa de controles táctiles según el estado de la
// partida: solo durante el juego (menú/game over/pausa la esconden).
function updateTouchControlsVisibility() {
  const layer = document.getElementById('touchControls');
  if (!layer) return;
  layer.classList.toggle('hidden', !game.running);
}

// El juego es horizontal: si el jugador gira el teléfono a vertical en
// plena partida, se pausa y se muestra el aviso de rotación.
function handleOrientation() {
  if (!game.running) return;
  if (isPortrait()) {
    if (!game.paused) {
      setPaused(true);
      showScreen('rotate');
    }
  } else if (game.paused) {
    // Al volver a horizontal, reanuda (el aviso desaparece con la pausa).
    setPaused(false);
  }
}

// Registra un botón con multitouch correcto: pointer events con captura
// por botón. Cada dedo queda asociado a UN botón aunque se deslice,
// y pointerup/cancel/lostpointercapture lo sueltan siempre.
// Evita inyección de código: solo acepta funciones nativas (no strings).
function bindButton(id, onDown, onUp = onDown) {
  if (typeof onDown !== 'function' || typeof onUp !== 'function') {
    throw new Error('bindButton: onDown/onUp must be functions');
  }
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    onDown();
  });
  const release = () => onUp();
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
}

// Conecta todos los botones táctiles. Idempotente.
function bindTouchControls() {
  if (touchBound) return;
  touchBound = true;

  bindButton('p1Left', () => { touchState[0].left = true; }, () => { touchState[0].left = false; });
  bindButton('p1Right', () => { touchState[0].right = true; }, () => { touchState[0].right = false; });
  bindButton('p1Jump', () => { touchState[0].jump = true; }, () => { touchState[0].jump = false; });
  bindButton('p2Left', () => { touchState[1].left = true; }, () => { touchState[1].left = false; });
  bindButton('p2Right', () => { touchState[1].right = true; }, () => { touchState[1].right = false; });
  bindButton('p2Jump', () => { touchState[1].jump = true; }, () => { touchState[1].jump = false; });

  // Botón de pausa táctil (visible solo en dispositivos táctiles).
  document.getElementById('pauseBtn')?.addEventListener('click', () => {
    if (game.running) setPaused(true);
  });

  // Reanudar tocando la pantalla de pausa (en táctil no hay tecla P).
  // La de rotación también reanuda: volvió a horizontal o insiste.
  const resume = () => {
    if (game.running && game.paused) setPaused(false);
  };
  document.getElementById('pauseScreen')?.addEventListener('click', resume);
  document.getElementById('rotateScreen')?.addEventListener('click', resume);

  // Auto-pausa al girar el dispositivo (y reanudar al volver a horizontal).
  window.addEventListener('resize', handleOrientation);
  window.addEventListener('orientationchange', handleOrientation);
}

// Suelta todo (al ocultar la pestaña quedaban direcciones "pegadas").
function resetTouchInput() {
  for (const s of touchState) { s.left = false; s.right = false; s.jump = false; }
}

// --- API de lectura (consumida por input.js) ---

function touchX(playerIndex) {
  const s = touchState[playerIndex];
  if (!s) return 0;
  return (s.right ? 1 : 0) - (s.left ? 1 : 0);
}

function touchJumpHeld(playerIndex) {
  return !!touchState[playerIndex]?.jump;
}

export {
  initTouch, bindTouchControls, resetTouchInput,
  touchX, touchJumpHeld, updateTouchControlsVisibility,
};
