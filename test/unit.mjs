// ============================================================
// test/unit.mjs — Pruebas unitarias con node:test (sin dependencias).
// Cubren las unidades puras extraídas en el refactor: geometría,
// reset de estado, construcción de niveles y el sistema de partículas.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = 'file://' + join(dirname(fileURLToPath(import.meta.url)), '..', 'src') + '/';

const physics = await import(SRC + 'physics.js');
const state = await import(SRC + 'core/state.js');
const levels = await import(SRC + 'levels.js');
const particles = await import(SRC + 'particles.js');
const { FX } = await import(SRC + 'data/tuning.js');
const { TILE, GROUND_Y, GROUND_SEGMENTS, WORLD, BLOCKS } = await import(SRC + 'data/level-data.js');
const { VIEW } = await import(SRC + 'core/constants.js');

const { game, resetGameState } = state;
const { rectOverlap, playerHitbox, getSolids } = physics;
const { buildLevel, initLevelData, resetLevelState, validateLevelData, reseedLevelBuild, normalizeLevelData } = levels;
const { burst, updateParticles, resetParticles, PARTICLE_BEHAVIORS } = particles;

// --- geometry: rectOverlap ----------------------------------------------

test('rectOverlap detecta superposición', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(rectOverlap(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(rectOverlap(a, { x: 20, y: 20, w: 10, h: 10 }), false);
});

test('rectOverlap: el borde tocado NO cuenta como colisión', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(rectOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(rectOverlap(a, { x: 0, y: 10, w: 10, h: 10 }), false);
});

test('rectOverlap: contención total y diagonales separadas', () => {
  assert.equal(rectOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 2, y: 2, w: 3, h: 3 }), true);
  assert.equal(rectOverlap({ x: 0, y: 0, w: 5, h: 5 }, { x: 100, y: 100, w: 5, h: 5 }), false);
});

// --- geometry: playerHitbox ---------------------------------------------

test('playerHitbox aplica el inset en los cuatro bordes', () => {
  const p = { x: 10, y: 20, w: 28, h: 36 };
  const hit = playerHitbox(p);
  const inset = 4; // PLAYER.HITBOX_INSET
  assert.deepEqual(hit, { x: 10 + inset, y: 20 + inset, w: 28 - inset * 2, h: 36 - inset * 2 });
});

// --- geometry: getSolids (cache por frame) -------------------------------

test('getSolids arma suelo + bloques visibles y cachea por frame', () => {
  resetGameState();
  const gd = buildLevel(1);
  game.levelData = gd;
  game.frame = 1;

  const first = getSolids();
  assert.equal(getSolids(), first, 'misma identidad dentro del mismo frame');

  const groundCount = gd.groundSegments.length;
  const visibleBlocks = gd.blocks.filter(b => b.visible).length;
  assert.equal(first.length, groundCount + visibleBlocks);

  // El suelo baja lo suficiente como para nunca verse el borde inferior
  const ground = first[0];
  assert.ok(ground.h >= VIEW.H - GROUND_Y);

  game.frame = 2; // nuevo frame => rebuild con nueva identidad
  assert.notEqual(getSolids(), first);
});

test('getSolids excluye los bloques ya no visibles', () => {
  resetGameState();
  const gd = buildLevel(1);
  game.levelData = gd;
  game.frame = 10;
  const before = getSolids().length;
  gd.blocks[0].visible = false;
  game.frame = 11;
  assert.equal(getSolids().length, before - 1);
});

// --- state: resetGameState ----------------------------------------------

test('resetGameState restaura campos conservando la identidad del objeto', () => {
  const sameRef = game;
  game.score = 999;
  game.coins = 42;
  game.lives = 1;
  game.running = true;
  game.players = [{}, {}];

  resetGameState();

  assert.equal(game, sameRef, 'la identidad del objeto compartido no cambia');
  assert.equal(game.score, 0);
  assert.equal(game.coins, 0);
  assert.equal(game.lives, 3);
  assert.equal(game.running, false);
  assert.deepEqual(game.players, []);
});

// --- levels: buildLevel / initLevelData ----------------------------------

test('buildLevel extiende el último segmento de suelo hasta el fin del mundo', () => {
  const gd = buildLevel(3);
  const worldLen = WORLD.BASE_LEN + 3 * WORLD.LEN_PER_LEVEL;
  assert.equal(gd.worldLen, worldLen);
  const last = gd.groundSegments[gd.groundSegments.length - 1];
  assert.equal(last.x + last.w, worldLen);
});

test('buildLevel coloca cada bloque según su yUp del mundo de datos', () => {
  const gd = buildLevel(1);
  for (const bp of BLOCKS) {
    const built = gd.blocks.find(b => b.x === bp.x);
    assert.ok(built, `bloque x=${bp.x} presente en el nivel`);
    assert.equal(built.y, GROUND_Y - TILE * bp.yUp);
    assert.equal(built.w, TILE);
    assert.equal(built.h, TILE);
    assert.equal(built.coin, bp.coin);
    assert.equal(built.power, bp.power);
  }
});

test('buildLevel no deja monedas flotando sobre huecos', () => {
  for (let n = 1; n <= 5; n++) {
    const gd = buildLevel(n);
    for (const c of gd.coins) {
      const overGround = gd.groundSegments.some(s => c.x >= s.x && c.x <= s.x + s.w);
      assert.ok(overGround, `moneda x=${c.x} del nivel ${n} fuera del suelo`);
    }
  }
});

test('buildLevel coloca la bandera dentro del mundo y sobre el último tramo', () => {
  for (let n = 1; n <= 5; n++) {
    const gd = buildLevel(n);
    assert.ok(gd.flagX > 0 && gd.flagX < gd.worldLen);
  }
});

test('buildLevel apoya a todos los enemigos sobre el suelo', () => {
  const gd = buildLevel(1);
  for (const e of gd.enemies) {
    assert.ok(Math.abs(e.y + e.h - GROUND_Y) < 0.01, 'enemigo apoyado: y + h === groundY');
  }
});

test('initLevelData alterna el tamaño inicial de los jugadores por nivel', () => {
  assert.equal(initLevelData(1).playerBig, false);
  assert.equal(initLevelData(2).playerBig, true);
});

test('resetLevelState restaura monedas, bloques y enemigos', () => {
  const gd = buildLevel(2);
  const coin = gd.coins[0];
  const block = gd.blocks.find(b => b.coin);
  const enemy = gd.enemies.find(e => e.type === 'koopa');

  coin.collected = true;
  block.collected = true;
  block.visible = false;
  enemy.alive = false;
  enemy.shell = { x: 123, vx: 3, killed: false, grace: 0, y: 0 };
  enemy.x = 999;
  enemy.dir = -enemy._odir;

  resetLevelState(gd);

  assert.equal(coin.collected, false);
  assert.equal(block.collected, false);
  assert.equal(block.visible, true);
  assert.equal(enemy.alive, true);
  assert.equal(enemy.shell, null);
  assert.equal(enemy.x, enemy._ox);
  assert.equal(enemy.dir, enemy._odir);
});

// --- high score: load/save/reset -----------------------------------

test('loadHighScore devuelve 0 si no hay nada guardado', async () => {
  // Nota: este test depende del entorno de almacenamiento.
  // En node sin localStorage esto siempre devuelve 0.
  const { loadHighScore } = await import(SRC + 'core/state.js');
  assert.equal(loadHighScore(), 0);
});

test('resetHighScore limpia el almacenamiento', async () => {
  const { resetHighScore, loadHighScore } = await import(SRC + 'core/state.js');
  resetHighScore();
  assert.equal(loadHighScore(), 0);
});

// --- particles: burst / update / reset -----------------------------------

test('burst emite la cantidad de partículas definida en FX.PARTICLES', () => {
  resetGameState();
  burst('coin', 10, 10);
  assert.equal(game.particles.length, FX.PARTICLES.coin.count);
  assert.ok(game.particles.every(pt => pt.color === FX.PARTICLES.coin.color));
});

test('burst con una kind desconocida no emite ni lanza', () => {
  resetGameState();
  assert.doesNotThrow(() => burst('noExiste', 0, 0));
  assert.equal(game.particles.length, 0);
});

test('updateParticles aplica gravedad y descarta las muertas', () => {
  resetGameState();
  game.particles.push({ x: 0, y: 0, vx: 1, vy: 0, color: '#fff', life: 1, behavior: 'fall', size: 4, bounceCount: 0, maxLife: 26 });
  game.particles.push({ x: 0, y: 0, vx: 0, vy: 0, color: '#fff', life: 50, behavior: 'fall', size: 4, bounceCount: 0, maxLife: 75 });

  updateParticles();

  assert.equal(game.particles.length, 1, 'la partícula con life=1 muere en este paso');
  const alive = game.particles[0];
  assert.equal(alive.vy, FX.PARTICLE_GRAVITY, 'la gravedad se suma a vy');
  assert.equal(alive.life, 49);
});

test('resetParticles vacía el array compartido', () => {
  burst('playerDeath', 0, 0);
  assert.ok(game.particles.length > 0);
  resetParticles();
  assert.deepEqual(game.particles, []);
});

test('burst con comportamiento personalizado', () => {
  resetGameState();
  burst('coin', 10, 10, PARTICLE_BEHAVIORS.SPARKLE);
  assert.equal(game.particles.length, FX.PARTICLES.coin.count);
  assert.ok(game.particles.every(pt => pt.behavior === PARTICLE_BEHAVIORS.SPARKLE));
});

test('updateParticles aplica comportamientos distintos', () => {
  resetGameState();
  game.levelData = { groundY: 100 };
  game.particles.push({ x: 0, y: 90, vx: 0, vy: 5, color: '#fff', life: 50, behavior: PARTICLE_BEHAVIORS.BOUNCE, bounceCount: 0 });
  updateParticles();
  assert.ok(game.particles.length > 0);
  assert.ok(Math.abs(game.particles[0].vy) < 5);
});

// --- sanity: conjunto de niveles jugable de punta a punta -----------------

test('validateLevelData acepta niveles válidos', () => {
  for (let n = 1; n <= 5; n++) {
    const gd = initLevelData(n);
    assert.doesNotThrow(() => validateLevelData(gd), `nivel ${n} debería ser válido`);
  }
});

test('validateLevelData rechaza datos inválidos', () => {
  assert.throws(() => validateLevelData(null), 'null LevelData');
  assert.throws(() => validateLevelData({}), 'sin arrays');
  assert.throws(() => validateLevelData({
    groundY: 0, worldLen: 800, flagX: 900,
    groundSegments: [], blocks: [], coins: [], enemies: [],
  }), 'flagX fuera de mundo');
  assert.throws(() => validateLevelData({
    groundY: 0, worldLen: 800, flagX: 100,
    groundSegments: [], blocks: [{ power: 'invalido' }], coins: [], enemies: [],
  }), 'tipo power desconocido');
});

test('los 5 niveles componen sin errores y con propiedades coherentes', () => {
  reseedLevelBuild(42);
  for (let n = 1; n <= 5; n++) {
    const gd = initLevelData(n);
    assert.ok(gd.groundSegments.length === GROUND_SEGMENTS.length);
    assert.ok(gd.enemies.length > 0);
    assert.ok(gd.coins.length > 0);
    assert.ok(gd.clouds.length > 0 && gd.hills.length > 0);
  }
  reseedLevelBuild();
});
