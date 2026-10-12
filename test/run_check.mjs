import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeCtx, makeEl, installMockEnv } from './helpers/mock-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');

const files = [
  // core y data primero: sin dependencias de DOM
  'core/constants.js',
  'core/state.js',
  'data/tuning.js',
  'data/level-data.js',
  'particles.js',
  // lógica
  'assets.js',
  'input.js',
  'touch.js',
  'audio.js',
  'levels.js',
  'physics.js',
  'refs.js',
  'entities.js',
  'player.js',
  'camera.js',
  'render.js',
  'ui.js',
  // composition root al final
  'app.js',
];

const SRC = 'file://' + srcDir + '/';

// Entorno DOM simulado compartido (test/helpers/mock-env.mjs):
// makeCtx/makeEl vienen importados; mockGlobals instala window/document/etc.
function mockGlobals() {
  installMockEnv({ touch: false });
}

let allOk = true;
for (const file of files) {
  const filePath = join(srcDir, file);
  if (!existsSync(filePath)) {
    console.log(`MISSING: ${file}`);
    allOk = false;
    continue;
  }
  try {
    mockGlobals();
    await import(SRC + file);
    console.log(`ESM_OK: ${file}`);
  } catch (e) {
    console.log(`ESM_ERROR: ${file}`);
    console.log('Message:', e.message);
    console.log('Stack:', (e.stack || '').split('\n').slice(0, 5).join('\n'));
    allOk = false;
  }
}

// --- Smoke test de juego real: nivel completo con colisiones, HUD y renders ---
// El estado ya no vive en globalThis: se importa core/state.js (mismo objeto
// compartido que usan todos los módulos).
let smokeOk = false;
try {
  mockGlobals();
  const { game, view } = await import(SRC + 'core/state.js');
  const levels = await import(SRC + 'levels.js');
  const entities = await import(SRC + 'entities.js');
  const playerMod = await import(SRC + 'player.js');
  const renderMod = await import(SRC + 'render.js');
  const cameraMod = await import(SRC + 'camera.js');
  const uiMod = await import(SRC + 'ui.js');

  view.ctx = makeCtx(); // render sin canvas real

  const gd = levels.initLevelData(2);
  playerMod.startLevel(gd);
  game.running = true; // el loop real arranca con Jugar; aquí simulamos que empezó

  // 0) Co-op: hay dos jugadores, con skins distintas y sobre el suelo
  if (game.players.length !== 2) {
    throw new Error('co-op expected 2 players, got ' + game.players.length);
  }
  if (game.players[0].skin === game.players[1].skin) {
    throw new Error('players must have distinct skins');
  }
  for (const pl of game.players) {
    if (Math.abs(pl.y + pl.h - gd.groundY) > 0.01) {
      throw new Error('player does not start grounded: y=' + pl.y);
    }
  }
  const [p1, p2] = game.players;

  // 1) Caer al hueco => killPlayer consume una vida compartida y respawnea
  //    solo a ese jugador (el otro permanece vivo).
  const seg0 = gd.groundSegments[0];
  p1.x = seg0.x + seg0.w + 60; // dentro del primer hueco (520..640)
  p1.y = gd.groundY - p1.h;
  p1.vy = 0;
  p2.x = seg0.x + 100; // P2 seguro sobre el suelo
  p2.y = gd.groundY - p2.h;
  p2.vy = 0;
  for (let i = 0; i < 600 && game.running && (game.lives === 3 || !p1.alive); i++) {
    game.frame++;
    for (const pl of game.players) playerMod.playerUpdate(pl);
    cameraMod.cameraUpdate();
    entities.entitiesUpdate(); // killPlayer del hueco y respawn ocurren acá
  }
  if (game.lives !== 2 || !game.running) {
    throw new Error('fall into pit did not consume exactly one shared life (lives=' + game.lives + ', running=' + game.running + ')');
  }
  if (!p1.alive || !(p1.invincible > 0)) throw new Error('P1 lacks respawn invincibility window');
  if (!p2.alive) throw new Error('P2 must stay alive when P1 dies');

  // 3) Golpear un bloque de moneda desde abajo otorga una moneda
  const coinBlock = gd.blocks.find(b => b.coin && !b.collected);
  p1.x = coinBlock.x + 10;
  p1.y = coinBlock.y + coinBlock.h - 5;
  const coinsBefore = game.coins;
  entities.bumpBlocks();
  if (game.coins !== coinsBefore + 1 || !coinBlock.collected) {
    throw new Error('bumpBlocks did not award a coin (coins=' + game.coins + ', collected=' + coinBlock.collected + ')');
  }

  // 4) UI se actualiza sin errores y el render del nivel completo funciona
  uiMod.uiUpdate();
  renderMod.render();

  // 5) resetLevelState restaura posiciones, dirección y shells
  const koopa = gd.enemies.find(e => e.type === 'koopa');
  koopa.shell = { x: 123, vx: 3, killed: false, grace: 0, y: 0 };
  koopa.x = 999; koopa.dir = 1;
  levels.resetLevelState(gd);
  if (koopa.shell !== null || koopa.x !== koopa._ox || koopa.dir !== koopa._odir) {
    throw new Error('resetLevelState did not restore koopa state');
  }

  smokeOk = true;
  console.log('SMOKE_OK: game simulation, death/respawn, block bump, ui and render ran clean');
} catch (e) {
  console.log('SMOKE_ERROR:', e.message);
  console.log('Stack:', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  allOk = false;
}

// --- Smoke test 2: beginLevel + game loop (fixed timestep con reloj controlado) ---
// Ejercita el composition root completo: beginLevel (que usa lastTime/acc y
// WORLD de level-data), el loop rAF real, la pausa y el caparazón como entidad.
let loopOk = false;
try {
  mockGlobals();

  // Reloj controlado: cada consulta al reloj avanza exactamente un paso.
  const STEP = 1000 / 60;
  let clockMs = 0;
  globalThis.performance = { now: () => (clockMs += STEP) };

  // requestAnimationFrame capturado: el test decide cuándo correr cada frame.
  let rafCb = null;
  const captureRaf = cb => { rafCb = cb; return 1; };
  globalThis.requestAnimationFrame = captureRaf;
  globalThis.window.requestAnimationFrame = captureRaf;

  const appMod = await import(SRC + 'app.js'); // instancia cacheada: mismo `game`
  const { game, view, resetGameState } = await import(SRC + 'core/state.js');
  const entitiesMod = await import(SRC + 'entities.js');
  const renderMod = await import(SRC + 'render.js');
  const { ENEMY } = await import(SRC + 'data/tuning.js');

  view.ctx = makeCtx();

  // 0) beginLevel compone un nivel jugable sin lanzar (timestep + WORLD import)
  resetGameState();
  appMod.beginLevel(2);
  if (!game.running || game.level !== 2 || game.players.length !== 2) {
    throw new Error('beginLevel did not start a 2-player level');
  }
  for (const pl of game.players) {
    if (Math.abs(pl.y + pl.h - game.levelData.groundY) > 0.01) {
      throw new Error('beginLevel: player does not start grounded');
    }
  }

  // 1) El loop corre con rAF, avanza la simulación y reprograma cada frame
  const g0 = game.levelData.enemies.find(e => e.type === 'goomba');
  const g0x = g0.x;
  for (let f = 0; f < 240 && game.running; f++) {
    if (!rafCb) throw new Error('loop did not reschedule requestAnimationFrame');
    const cb = rafCb;
    rafCb = null;
    cb();
  }
  if (game.frame < 100) throw new Error('simulation did not advance under the loop (frame=' + game.frame + ')');
  if (Math.abs(g0.x - g0x) < 5) throw new Error('enemies do not patrol (wall probe hits the floor?)');
  for (const pl of game.players) {
    if (!pl.alive || Math.abs(pl.y + pl.h - game.levelData.groundY) > 0.01) {
      throw new Error('idle player fell or died during the loop');
    }
  }

  // 2) En pausa el loop sigue vivo (reprograma rAF) pero NO simula
  const f0 = game.frame;
  game.paused = true;
  appMod.loop();
  if (game.frame !== f0) throw new Error('the loop simulated while paused');
  if (!rafCb) throw new Error('paused loop did not reschedule rAF');
  game.paused = false;

  // 3) El caparazón es una entidad: avanza con vx>0 y se renderiza sin errores
  const koopa = game.levelData.enemies.find(e => e.type === 'koopa' && !e.shell);
  koopa.alive = false;
  koopa.shell = { x: 250, vx: 2, killed: false, grace: 0, y: game.levelData.groundY - ENEMY.SHELL.h };
  const shellX0 = koopa.shell.x;
  entitiesMod.entitiesUpdate();
  if (koopa.shell.x <= shellX0) throw new Error('shell does not move with vx>0');
  renderMod.render(); // dibuja el shell en su propia posición; no debe lanzar

  // 4) beginLevel reparte un estado limpio para una partida nueva
  resetGameState();
  appMod.beginLevel(1);
  if (game.lives !== 3 || game.score !== 0 || game.coins !== 0) {
    throw new Error('beginLevel did not start from a clean state');
  }

  loopOk = true;
  console.log('LOOP_OK: beginLevel, fixed-timestep loop, pause, shell and clean reset ran clean');
} catch (e) {
  console.log('LOOP_ERROR:', e.message);
  console.log('Stack:', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  allOk = false;
}

console.log(allOk && smokeOk && loopOk ? 'ESM_CHECK_PASSED' : 'ESM_CHECK_HAS_ISSUES');
process.exitCode = allOk && smokeOk && loopOk ? 0 : 1;
