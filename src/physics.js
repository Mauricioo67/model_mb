import { game } from './core/state.js';
import { VIEW, PHYSICS } from './core/constants.js';
import { PLAYER } from './data/tuning.js';

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Sólidos del nivel actual (suelo + bloques visibles), cacheados por
// paso de simulación: antes se reconstruía el array en cada llamada
// (varias por frame). Se invalida al cambiar de nivel o de frame.
// La clave es la IDENTIDAD del objeto de nivel (WeakMap): no dependemos
// de la interpolación de strings ni de que levelData defina toString.
let cacheKey = null;      // frame del último rebuild
let cacheLevel = null;    // referencia débil al nivel cacheado
let cachedSolids = [];

function getSolids() {
  const gd = game.levelData;
  if (!gd) return [];
  if (cacheLevel !== gd || cacheKey !== game.frame) {
    cachedSolids = [];
    for (const p of gd.groundSegments) {
      cachedSolids.push({ x: p.x, y: gd.groundY, w: p.w, h: VIEW.H - gd.groundY + PHYSICS.GROUND_DEPTH_BELOW_PX });
    }
    for (const b of gd.blocks) {
      if (b.visible && !b.destroyed) cachedSolids.push({ x: b.x, y: b.y, w: b.w, h: b.h });
    }
    cacheLevel = gd;
    cacheKey = game.frame;
  }
  return cachedSolids;
}

// Rectángulo de contacto reducido de un jugador (evita colisiones por píxel).
// Única definición compartida por player, entities y el chequeo de bandera.
function playerHitbox(p) {
  const i = PLAYER.HITBOX_INSET;
  return { x: p.x + i, y: p.y + i, w: p.w - i * 2, h: p.h - i * 2 };
}

export { rectOverlap, getSolids, playerHitbox };
