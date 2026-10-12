// ============================================================
// test/haptics.test.mjs — Pruebas del feedback háptico.
// Validan que los eventos del juego disparan la vibración correcta
// (spy sobre navigator.vibrate) y que en dispositivos sin soporte
// el módulo es un no-op silencioso.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { installMockEnv, SRC_BASE } from './helpers/mock-env.mjs';

// Entorno con soporte de vibración + grafo de módulos compartido.
const env = installMockEnv({ touch: true });
const { vibrations, navigatorMock } = env;

const { haptics, vibrateSupported } = await import(SRC_BASE + 'haptics.js');
const { HAPTICS } = await import(SRC_BASE + 'data/tuning.js');

// Limpia el spy antes de cada prueba.
test.beforeEach(() => {
  vibrations.length = 0;
});

test('el entorno simulado reporta soporte de vibración', () => {
  assert.equal(vibrateSupported(), true);
});

test('cada evento dispara su patrón definido en HAPTICS', () => {
  haptics.stomp();
  assert.deepEqual(vibrations, [HAPTICS.STOMP]);

  haptics.shellKill();
  assert.deepEqual(vibrations, [HAPTICS.STOMP, HAPTICS.SHELL_KILL]);

  haptics.powerup();
  assert.deepEqual(vibrations, [HAPTICS.STOMP, HAPTICS.SHELL_KILL, HAPTICS.POWERUP]);

  haptics.death();
  assert.deepEqual(vibrations, [HAPTICS.STOMP, HAPTICS.SHELL_KILL, HAPTICS.POWERUP, HAPTICS.DEATH]);
});

test('un patrón desconocido se ignora sin lanzar', () => {
  assert.doesNotThrow(() => haptics.noExiste?.());
  assert.equal(vibrations.length, 0);
});

test('sin navigator.vibrate el módulo es un no-op silencioso', async () => {
  // Simula un dispositivo sin la API (ej: iOS) quitando el método.
  const hadVibrate = navigatorMock.vibrate;
  delete navigatorMock.vibrate;

  assert.equal(vibrateSupported(), false);
  assert.doesNotThrow(() => {
    haptics.stomp();
    haptics.death();
  });
  assert.equal(vibrations.length, 0);

  navigatorMock.vibrate = hadVibrate; // restaurar para el resto de la suite
});

test('los patrones de HAPTICS son duraciones válidas', () => {
  for (const [name, pattern] of Object.entries(HAPTICS)) {
    if (Array.isArray(pattern)) {
      assert.ok(pattern.length > 0 && pattern.every(n => typeof n === 'number' && n >= 0), name);
    } else {
      assert.ok(typeof pattern === 'number' && pattern >= 0, name);
    }
  }
});
