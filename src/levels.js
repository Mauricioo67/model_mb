// ============================================================
// levels.js — Lógica de CONSTRUCCIÓN de niveles.
// Consume los datos del mundo desde src/data/level-data.js y el
// balance de entidades desde src/data/tuning.js. Acá no hay
// posiciones ni valores de balance hardcodeados: solo armado.
// ============================================================

import {
  TILE, GROUND_Y, GROUND_SEGMENTS, BLOCKS, STAR_BLOCKS, COINS, COIN_RAMP,
  GOOMBAS, KOOPAS, CHEEPS, PIT_BLOCKS, WORLD, CLOUDS, HILLS,
} from './data/level-data.js';
import { COIN, VALID_POWERUP_TYPES, DESTROYABLE, ENEMY, seededRandom } from './data/tuning.js';

// Devuelve la posición más cercana alcanzable dentro de un segmento de suelo.
// Evita monedas y enemigos flotando sobre huecos.
function nearestSegmentX(x, segments) {
  for (const s of segments) {
    if (x >= s.x && x <= s.x + s.w) return x;
  }
  let best = null;
  let bestDist = Infinity;
  for (const s of segments) {
    const d = x < s.x ? s.x - x : x - (s.x + s.w);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  if (!best) return x;
  return x < best.x ? best.x + WORLD.ENTITY_MARGIN : best.x + best.w - WORLD.ENTITY_MARGIN;
}

function buildLevel(n, seed) {
  if (seed === undefined) {
    seed = n * 1000 + 1;
  }
  const worldLen = WORLD.BASE_LEN + n * WORLD.LEN_PER_LEVEL;
  const groundY = GROUND_Y;

  // Suelo: clona los segmentos; el último se extiende hasta el fin del mundo.
  const groundSegments = GROUND_SEGMENTS.map(s => ({ ...s }));
  const last = groundSegments[groundSegments.length - 1];
  last.w = worldLen - last.x;

  // Bloques golpeables desde los datos (yUp = tiles de altura sobre el suelo).
  const blocks = BLOCKS.map(bp => ({
    x: bp.x, y: groundY - TILE * bp.yUp, w: TILE, h: TILE,
    coin: bp.coin,
    power: bp.power,
    collected: false,
    visible: true,
  }));

  // Estrellas: en niveles avanzados algunos bloques de flor esconden una estrella.
  for (const rule of STAR_BLOCKS) {
    if (n >= rule.fromLevel) {
      const b = blocks.find(b => b.x === rule.blockX && b.power === 'flower');
      if (b) b.power = 'star';
    }
  }

  // 1-Up: en niveles pares, un bloque aleatorio de moneda se convierte en 1-Up.
  if (n % 2 === 0) {
    const coinBlocks = blocks.filter(b => b.coin && !b.power);
    if (coinBlocks.length > 0) {
      const rng = seededRandom(seed + n * 7 + 13);
      const idx = Math.floor(rng() * coinBlocks.length);
      coinBlocks[idx].power = 'lifeup';
    }
  }

  // Bloques acomodados (pit blocks): se convierten en hueco al pisarlos.
  const pitBlocks = PIT_BLOCKS.map(pb => ({
    x: pb.x,
    y: groundY - TILE * pb.yUp,
    w: TILE,
    h: TILE,
    timer: pb.timer,
    isPit: true,
    open: false,
    closeTimer: 0,
  }));

  // Monedas fijas + monedas extra que crecen con el nivel.
  const coinY = groundY - TILE * COIN_RAMP.yUp - COIN.MARGIN_Y;
  const coins = COINS.map(x => ({ x, y: coinY, collected: false }));
  const rampCount = COIN_RAMP.base + n * COIN_RAMP.perLevel;
  for (let i = 0; i < rampCount; i++) {
    const cx = COIN_RAMP.startX + i * COIN_RAMP.spacing + n * COIN_RAMP.shiftPerLevel;
    coins.push({ x: cx, y: coinY, collected: false });
  }
  // Ajusta monedas que cayeron sobre un hueco
  for (const c of coins) c.x = nearestSegmentX(c.x, groundSegments);

  // La bandera siempre sobre tierra firme (último segmento)
  const flagX = WORLD.FLAG_BASE_X + n * WORLD.FLAG_PER_LEVEL;

  // Enemigos desde los datos; tamaños desde el tuning de entidades.
  // y = groundY - h: el hitbox queda exactamente apoyado sobre el suelo
  // (los offsets del tuning no coinciden con h y los dejaban hundidos).
  const enemySpecs = [
    ...GOOMBAS.map(g => ({ type: 'goomba', ...g, size: ENEMY.GOOMBA })),
    ...KOOPAS.map(k => ({ type: 'koopa', ...k, size: ENEMY.KOOPA })),
    ...CHEEPS.map(c => ({ type: 'cheep', ...c, size: ENEMY.CHEEP })),
  ];
  const enemies = enemySpecs.map(spec => ({
    type: spec.type,
    x: spec.x, y: groundY - (spec.size?.h || 26),
    w: spec.size?.w || 30, h: spec.size?.h || 26,
    dir: spec.dir, speed: spec.speed,
    alive: true, shell: null, animFrame: 0, squishTimer: 0,
    _ox: spec.x, _odir: spec.dir,
    // atributos específicos para cheep
    cheepAmplitude: spec.amplitude || 0,
    cheepPeriod: spec.period || 120,
    cheepOffset: 0,
  }));
  // Ajusta enemigos que aparecieron sobre un hueco
  for (const e of enemies) e.x = nearestSegmentX(e.x, groundSegments);

  const result = {
    groundY,
    worldLen,
    groundSegments,
    blocks,
    coins,
    flagX,
    enemies,
    pitBlocks,
    clouds: CLOUDS.map(c => ({ ...c })),
    hills: HILLS.map(h => ({ ...h })),
  };

  // Validación defensiva: asegura que los datos del nivel construidos sean válidos.
  validateLevelData(result);
  return result;
}

// Validación de datos: asegura que los datos del nivel sean coherentes.
// Similar a defensive programming: si los datos están mal, falla temprano
// con un error claro en lugar de comportamiento indefinido.
function validateLevelData(levelData) {
  if (!levelData) throw new Error('levelData is null or undefined');
  if (!Array.isArray(levelData.groundSegments)) throw new Error('groundSegments must be an array');
  if (!Array.isArray(levelData.blocks)) throw new Error('blocks must be an array');
  if (!Array.isArray(levelData.coins)) throw new Error('coins must be an array');
  if (!Array.isArray(levelData.enemies)) throw new Error('enemies must be an array');
  if (typeof levelData.groundY !== 'number') throw new Error('groundY must be a number');
  if (typeof levelData.worldLen !== 'number') throw new Error('worldLen must be a number');
  if (typeof levelData.flagX !== 'number') throw new Error('flagX must be a number');
  if (levelData.flagX < 0 || levelData.flagX >= levelData.worldLen) {
    throw new Error('flagX must be within world bounds');
  }
  for (const block of levelData.blocks) {
    if (block.power && !VALID_POWERUP_TYPES.has(block.power)) {
      throw new Error(`unknown power-up type: ${block.power}`);
    }
  }
}

function initLevelData(n, seed) {
  const base = buildLevel(n, seed);
  return { ...base, playerBig: n % 2 === 0 };
}

function resetLevelState(levelData) {
  for (const c of levelData.coins) c.collected = false;
  for (const b of levelData.blocks) { b.collected = false; b.visible = true; }
  for (const e of levelData.enemies) {
    e.alive = true;
    e.squishTimer = 0;
    e.animFrame = 0;
    e.shell = null;
    if (e._ox != null) e.x = e._ox;
    if (e._odir != null) e.dir = e._odir;
  }
  if (levelData.pitBlocks) {
    for (const pb of levelData.pitBlocks) {
      pb.open = false;
      pb.closeTimer = 0;
    }
  }
}

// Normaliza y valida los datos del nivel al importarlos o usarlos externamente.
// Esto garantiza que cualquier nivel recibido desde fuera del módulo cumple
// las invariantes esperadas por la lógica del juego (defensive programming).
function normalizeLevelData(levelData) {
  if (!levelData || typeof levelData !== 'object') {
    throw new Error('levelData must be an object');
  }
  validateLevelData(levelData);
  return levelData;
}

export { initLevelData, resetLevelState, buildLevel, validateLevelData, normalizeLevelData };

export function reseedLevelBuild(seed = Date.now()) {
  // No-op: seed se pasa directamente a buildLevel desde app.js.
  // Esta función se mantiene para compatibilidad con código existente.
}
