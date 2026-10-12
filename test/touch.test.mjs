// ============================================================
// test/touch.test.mjs — Pruebas de los controles táctiles.
// Ejercitan touch.js + input.js con un DOM simulado funcional:
// dirección, salto con buffer, multitouch (dos dedos), pausa,
// reanudación y limpieza al ocultar la pestaña.
//
// Los tres módulos forman UN grafo compartido (input.js lee el
// estado de SU touch.js): se instalan una sola vez y cada test
// limpia el estado manualmente.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installMockEnv, fire, fireWindow, SRC_BASE,
} from './helpers/mock-env.mjs';

// Entorno + grafo de módulos, una sola vez para toda la suite.
const env = installMockEnv({ touch: true });

const touchMod = await import(SRC_BASE + 'touch.js');
const inputMod = await import(SRC_BASE + 'input.js');
const { game } = await import(SRC_BASE + 'core/state.js');

touchMod.bindTouchControls();
inputMod.bindInput(); // inicializa los jump buffers (en el juego lo llama app.js)

// Estado limpio antes de cada prueba (el grafo es compartido):
// buffers de salto, flancos registrados y estado táctil.
test.beforeEach(() => {
  inputMod.clearAllInputs();
  game.running = false;
  game.paused = false;
});

test('los botones táctiles mueven a P1 en ambas direcciones', () => {
  const left = document.getElementById('p1Left');
  fire(left, 'pointerdown', { pointerId: 1 });
  assert.equal(inputMod.inputX(0), -1);
  fire(left, 'pointerup', { pointerId: 1 });
  assert.equal(inputMod.inputX(0), 0);

  const right = document.getElementById('p1Right');
  fire(right, 'pointerdown', { pointerId: 1 });
  assert.equal(inputMod.inputX(0), 1);
  fire(right, 'pointerup', { pointerId: 1 });
  assert.equal(inputMod.inputX(0), 0);
});

test('P2 controla su propia zona sin interferir con P1', () => {
  fire(document.getElementById('p2Left'), 'pointerdown', { pointerId: 7 });
  fire(document.getElementById('p1Right'), 'pointerdown', { pointerId: 8 });

  assert.equal(inputMod.inputX(1), -1, 'P2 va a la izquierda');
  assert.equal(inputMod.inputX(0), 1, 'P1 va a la derecha');

  fire(document.getElementById('p2Left'), 'pointerup', { pointerId: 7 });
  fire(document.getElementById('p1Right'), 'pointerup', { pointerId: 8 });
  assert.equal(inputMod.inputX(1), 0);
  assert.equal(inputMod.inputX(0), 0);
});

test('saltar llena el jump buffer y se consume al saltar', () => {
  const jump = document.getElementById('p1Jump');
  fire(jump, 'pointerdown', { pointerId: 3 });

  inputMod.tickJumpBuffer(); // registra el flanco ascendente táctil
  assert.equal(inputMod.inputJump(0), true, 'el buffer tiene el salto pendiente');

  inputMod.consumeJump(0);
  assert.equal(inputMod.inputJump(0), false, 'consumido: no re-salta');

  // El salto mantenido habilita salto variable (altura completa)
  assert.equal(inputMod.inputJumpHeld(0), true);
  fire(jump, 'pointerup', { pointerId: 3 });
  assert.equal(inputMod.inputJumpHeld(0), false, 'soltar corta el salto');
});

test('multitouch: dos jugadores se mueven y saltan a la vez', () => {
  // Dedos simultáneos de ambos jugadores
  fire(document.getElementById('p1Right'), 'pointerdown', { pointerId: 11 });
  fire(document.getElementById('p2Left'), 'pointerdown', { pointerId: 12 });
  fire(document.getElementById('p1Jump'), 'pointerdown', { pointerId: 13 });
  fire(document.getElementById('p2Jump'), 'pointerdown', { pointerId: 14 });

  inputMod.tickJumpBuffer();

  assert.equal(inputMod.inputX(0), 1);
  assert.equal(inputMod.inputX(1), -1);
  assert.equal(inputMod.inputJump(0), true);
  assert.equal(inputMod.inputJump(1), true);
  assert.equal(inputMod.inputJumpHeld(0), true);
  assert.equal(inputMod.inputJumpHeld(1), true);

  // Soltar un dedo no afecta al resto (pointer capture por botón)
  fire(document.getElementById('p1Jump'), 'pointerup', { pointerId: 13 });
  assert.equal(inputMod.inputJumpHeld(0), false);
  assert.equal(inputMod.inputJumpHeld(1), true);
});

test('pointercancel suelta el botón (dedo que se desliza fuera)', () => {
  const btn = document.getElementById('p1Left');
  fire(btn, 'pointerdown', { pointerId: 21 });
  assert.equal(inputMod.inputX(0), -1);
  fire(btn, 'pointercancel', { pointerId: 21 });
  assert.equal(inputMod.inputX(0), 0);
});

test('el botón de pausa pausa solo con partida en curso', () => {
  game.running = true;
  fire(document.getElementById('pauseBtn'), 'click');
  assert.equal(game.paused, true, 'pausa con running=true');

  // Tocar la pantalla de pausa reanuda
  fire(document.getElementById('pauseScreen'), 'click');
  assert.equal(game.paused, false, 'reanuda al tocar la pantalla');

  // Sin partida en curso, el botón no hace nada
  game.running = false;
  fire(document.getElementById('pauseBtn'), 'click');
  assert.equal(game.paused, false);
});

test('ocultar la pestaña limpia el input táctil activo', () => {
  fire(document.getElementById('p1Right'), 'pointerdown', { pointerId: 31 });
  assert.equal(inputMod.inputX(0), 1);

  inputMod.clearAllInputs();
  assert.equal(inputMod.inputX(0), 0, 'dirección limpiada');
  assert.equal(inputMod.inputJumpHeld(0), false, 'salto limpiado');
});

// --- Visibilidad y orientación -------------------------------------------

test('los controles se muestran solo mientras hay partida en curso', () => {
  const layer = document.getElementById('touchControls');

  touchMod.updateTouchControlsVisibility();
  assert.ok(layer.classList.contains('hidden'), 'sin partida: ocultos');

  game.running = true;
  touchMod.updateTouchControlsVisibility();
  assert.ok(!layer.classList.contains('hidden'), 'con partida: visibles');

  game.running = false;
  touchMod.updateTouchControlsVisibility();
  assert.ok(layer.classList.contains('hidden'), 'partida terminada: ocultos otra vez');
});

test('girar a vertical en plena partida pausa y avisa; volver a horizontal reanuda', () => {
  game.running = true;

  // Simular rotación a vertical
  window.innerWidth = 500;
  window.innerHeight = 800;
  fireWindow(env, 'resize');
  assert.equal(game.paused, true, 'se pausa al girar a vertical');

  const rotate = document.getElementById('rotateScreen');
  assert.ok(!rotate.classList.contains('hidden'), 'aparece el aviso de rotación');

  // Volver a horizontal reanuda y quita el aviso
  window.innerWidth = 800;
  window.innerHeight = 500;
  fireWindow(env, 'resize');
  assert.equal(game.paused, false, 'se reanuda al volver a horizontal');
  assert.ok(rotate.classList.contains('hidden'), 'el aviso desaparece');
});

test('la rotación fuera de partida no pausa ni muestra nada', () => {
  game.running = false;
  window.innerWidth = 500;
  window.innerHeight = 800;
  fireWindow(env, 'resize');
  assert.equal(game.paused, false, 'sin partida, girar no pausa');

  // Restaurar horizontal para el resto de la suite
  window.innerWidth = 800;
  window.innerHeight = 500;
});
