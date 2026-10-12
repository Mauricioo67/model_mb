// ============================================================
// camera.js — Cámara suavizada con límites del nivel.
// Co-op: sigue el punto medio entre los jugadores.
// ============================================================

import { game, view } from './core/state.js';

function cameraUpdate() {
  const gd = game.levelData;
  const players = game.players.filter(p => p);
  if (!players.length) return;
  const xs = players.map(p => p.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const target = mid - view.w * 0.35;
  game.camera.x += (target - game.camera.x) * 0.1;
  if (game.camera.x < 0) game.camera.x = 0;
  if (gd && game.camera.x > gd.worldLen - view.w) game.camera.x = gd.worldLen - view.w;
}

export { cameraUpdate };
