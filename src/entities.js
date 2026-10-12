// ============================================================
// entities.js — Monedas, power-ups, enemigos y caparazón.
// Co-op local: todas las interacciones consideran a TODOS los
// jugadores (game.players). Las vidas son compartidas; la muerte
// es individual con respawn. Balance desde data/tuning.js.
// ============================================================

import { game, view } from './core/state.js';
import { rectOverlap, getSolids, playerHitbox } from './physics.js';
import { sfxCoin, sfxStomp, sfxShell, sfxPower, sfxBump, sfxDie, startStarMusic, stopStarMusic } from './audio.js';
import { uiUpdate, uiShowGameOver } from './ui.js';
import { burst } from './particles.js';
import { haptics } from './haptics.js';
import { SCORE, DESTROYABLE, STOMP, ENEMY, POWERUP, FX, PLAYER, COIN, BLOCK } from './data/tuning.js';
import { WORLD } from './data/level-data.js';

let powerups = [];

export function allPowerups() { return powerups; }
export function resetPowerups() { powerups = []; }

// --- Monedas ------------------------------------------------------------

function collectCoins() {
  const players = alivePlayers();
  for (const c of game.levelData.coins) {
    if (c.collected) continue;
    const cRect = { x: c.x, y: c.y, w: COIN.SIZE, h: COIN.SIZE };
    const collector = players.find(p => rectOverlap(playerHitbox(p), cRect));
    if (!collector) continue;
    c.collected = true;
    game.coins++;
    game.score += SCORE.COIN * (game.combo + 1);
    bumpCombo();
    sfxCoin();
    burst('coin', c.x + COIN.SIZE / 2, c.y + COIN.SIZE / 2);
    uiUpdate();
  }
}

// --- Bloques golpeables -------------------------------------------------

// Golpear un bloque desde abajo: moneda extraíble, power-up y feedback visual.
// Cualquier jugador puede activarlo; el premio es único por bloque.
// Los bloques sin power-up se destruyen al pisotonar desde arriba.
function bumpBlocks() {
  const gd = game.levelData;
  const players = alivePlayers();
  for (const b of gd.blocks) {
    if (b.collected || !b.visible) continue;
    const bRect = { x: b.x, y: b.y, w: b.w, h: b.h };
    for (const p of players) {
      // Cabeza del jugador (franja superior estrecha) para no activar bloques de costado
      const head = { x: p.x + PLAYER.HEAD_INSET, y: p.y, w: p.w - PLAYER.HEAD_INSET * 2, h: PLAYER.HEAD_HEIGHT };
      if (!rectOverlap(head, bRect)) continue;
      b.bumpTimer = BLOCK.BUMP_FRAMES;
      if (b.coin) collectBlockCoin(b);
      if (b.power) { sfxBump(); spawnPowerupFromBlock(b); }
      break; // el bloque reacciona una sola vez por golpe
    }
  }
  // Pisotón: destruye bloques sin power-up (solo si tienen coin ya extraído)
  for (const b of gd.blocks) {
    if (b.collected || b.power || !b.visible) continue;
    for (const p of players) {
      const head = { x: p.x + PLAYER.HEAD_INSET, y: p.y, w: p.w - PLAYER.HEAD_INSET * 2, h: PLAYER.HEAD_HEIGHT };
      const bRect = { x: b.x, y: b.y, w: b.w, h: b.h };
      if (rectOverlap(head, bRect)) {
        b.destroyed = true;
        b.visible = false;
        game.score += DESTROYABLE.STOMP_DESTROY_SCORE;
        sfxStomp();
        burst('goombaDeath', b.x + b.w / 2, b.y - 6);
        uiUpdate();
        break;
      }
    }
  }
}

function collectBlockCoin(b) {
  b.collected = true; // sigue siendo sólido, solo agota su premio
  game.coins++;
  game.score += SCORE.BLOCK_COIN;
  sfxCoin();
  burst('blockCoin', b.x + b.w / 2, b.y - 6);
  uiUpdate();
}

// --- Power-ups ----------------------------------------------------------

function spawnPowerupFromBlock(block) {
  const type = block.power || 'mushroom';
  powerups.push({
    x: block.x + 8, y: block.y - 20,
    w: POWERUP.W, h: POWERUP.H,
    vy: POWERUP.POP_VY,
    type,
    collected: false,
  });
  block.collected = true;
  block.visible = false;
}

// Caída con gravedad simple y apoyo sobre sólidos (power-ups).
function fallWithGravity(pu, gravity, solids) {
  pu.y += pu.vy;
  pu.vy += gravity;
  for (const s of solids) {
    if (rectOverlap({ x: pu.x, y: pu.y, w: pu.w, h: pu.h }, s)) {
      pu.y = s.y - pu.h;
      pu.vy = 0;
    }
  }
}

function updatePowerups() {
  const solids = getSolids();
  const players = alivePlayers();
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    if (pu.collected) { powerups.splice(i, 1); continue; }
    fallWithGravity(pu, POWERUP.GRAVITY, solids);
    const puRect = { x: pu.x, y: pu.y, w: pu.w, h: pu.h };
    const collector = players.find(p => rectOverlap(playerHitbox(p), puRect));
    if (collector) {
      pu.collected = true;
      applyPowerup(collector, pu);
      continue;
    }
    if (pu.y > view.h + POWERUP.OFFSCREEN_MARGIN) powerups.splice(i, 1);
  }
}

// Aplica un power-up al jugador que lo tocó.
function applyPowerup(p, pu) {
  if (pu.type === 'star') {
    p.starTimer = POWERUP.STAR_FRAMES;
    game.score += SCORE.POWERUP_MAIN;
    sfxPower();
    haptics.powerup();
    startStarMusic();
    burst('powerStar', pu.x + 12, pu.y + 10);
  } else if (pu.type === 'mushroom' || pu.type === 'flower') {
    applyGrowthPowerup(p, pu);
  } else if (pu.type === 'lifeup') {
    game.lives++;
    game.score += SCORE.LIFEUP;
    sfxPower();
    haptics.powerup();
    burst('powerStar', pu.x + 12, pu.y + 10);
  } else {
    // Silenciar power-up desconocido en lugar de ignorar silenciosamente.
    console.warn(`power-up desconocido: ${pu.type}`);
  }
  uiUpdate();
}

function applyGrowthPowerup(p, pu) {
  if (!p.big) {
    p.big = true;
    p.y -= PLAYER.BIG.h - p.h; // crece hacia arriba: no atraviesa el suelo
    p.w = PLAYER.BIG.w; p.h = PLAYER.BIG.h;
    game.score += SCORE.POWERUP_MAIN;
    burst('powerGrow', pu.x + 12, pu.y + 10);
  } else {
    game.score += SCORE.POWERUP_EXTRA;
    burst(pu.type === 'flower' ? 'powerFlower' : 'powerGrow', pu.x + 12, pu.y + 10);
  }
  sfxPower();
  haptics.powerup();
}

// --- Enemigos -----------------------------------------------------------

function alivePlayers() {
  return game.players.filter(p => p.alive);
}

function bumpCombo() {
  game.combo = Math.min(game.combo + 1, STOMP.COMBO_MAX);
}

function awardStompScore() {
  game.score += SCORE.STOMP_BASE * (game.combo + 1);
  bumpCombo();
}

function awardScore(score, x, y, kind) {
  game.score += score;
  sfxStomp();
  burst(kind, x, y);
  uiUpdate();
}

// Límite derecho de movimiento, compartido por enemigos y caparazón.
function worldRightBound(gd) {
  return gd.flagX + WORLD.RIGHT_BOUND_PAD;
}

// Camina el suelo; se da la vuelta en los bordes de los huecos y ante bloques.
function enemyGroundUpdate(e, gd) {
  const solids = getSolids();
  const nx = e.x + e.speed * e.dir;
  // ¿Hay suelo bajo los pies en la nueva posición?
  const foot = { x: e.dir > 0 ? nx + e.w - 2 : nx + 2, y: e.y + e.h + 2, w: 2, h: 4 };
  if (!groundBelow(foot, gd)) { e.dir *= -1; return; }
  // Sonda de pared: franja vertical delante del sprite, SIN tocar el suelo
  // (antes el rect incluía los pies y colisionaba con el piso: enemigos congelados).
  const probe = { x: e.dir > 0 ? nx + e.w : nx - 2, y: e.y + 2, w: 2, h: e.h - 6 };
  for (const s of solids) {
    if (rectOverlap(probe, s)) { e.dir *= -1; return; }
  }
  e.x = nx;
  if (e.x < 0) { e.x = 0; e.dir = 1; }
  const maxX = worldRightBound(gd) - e.w;
  if (e.x > maxX) { e.x = maxX; e.dir = -1; }
}

function groundBelow(foot, gd) {
  for (const seg of gd.groundSegments) {
    if (foot.x >= seg.x && foot.x <= seg.x + seg.w) return true;
  }
  return false;
}

function enemyBlocks() {
  for (const e of game.levelData.enemies) {
    if (e.type === 'goomba') updateGoomba(e);
    else if (e.type === 'koopa') updateKoopa(e);
  }
}

function updateGoomba(e) {
  if (!e.alive) {
    if (e.squishTimer > 0) e.squishTimer--;
    return;
  }
  e.animFrame += ENEMY.ANIM_RATE;
  enemyGroundUpdate(e, game.levelData);
  const eRect = { x: e.x, y: e.y, w: e.w, h: e.h };
  for (const p of alivePlayers()) {
    if (!rectOverlap(playerHitbox(p), eRect)) continue;
    handleGoombaContact(e, p);
    break; // el enemigo reacciona al primer jugador que lo toca
  }
}

function handleGoombaContact(e, p) {
  if (p.starTimer > 0) {
    e.alive = false;
    e.squishTimer = 0;
    awardScore(SCORE.STAR_KILL, e.x + 15, e.y, 'goombaDeath');
  } else if (isStomp(p, e.y, STOMP.GOOMBA_HEAD_MARGIN)) {
    e.alive = false;
    e.squishTimer = ENEMY.SQUISH_FRAMES;
    onEnemyStomped(p, e.x + 15, e.y, 'goombaDeath', sfxStomp);
  } else if (p.invincible <= 0) {
    killPlayer(p);
  }
}

function updateKoopa(e) {
  if (e.shell) {
    updateShellWithPlayers(e);
    return;
  }
  if (!e.alive) return;
  e.animFrame += ENEMY.ANIM_RATE;
  enemyGroundUpdate(e, game.levelData);
  const eRect = { x: e.x, y: e.y, w: e.w, h: e.h };
  for (const p of alivePlayers()) {
    if (!rectOverlap(playerHitbox(p), eRect)) continue;
    handleKoopaContact(e, p);
    break;
  }
}

function handleKoopaContact(e, p) {
  if (p.starTimer > 0) {
    e.alive = false;
    e.shell = null;
    awardScore(SCORE.STAR_KILL, e.x + 15, e.y, 'koopaDeath');
  } else if (isStomp(p, e.y, STOMP.KOOPA_HEAD_MARGIN)) {
    // Pisar un Koopa lo convierte en caparazón quieto
    e.alive = false;
    e.shell = createShell(e);
    onEnemyStomped(p, e.x + 15, e.y, 'koopaDeath', sfxShell);
  } else if (p.invincible <= 0) {
    killPlayer(p);
  }
}

function createShell(e) {
  return {
    x: e.x + 5, y: e.y + e.h - ENEMY.SHELL.h,
    vx: 0, killed: false, grace: ENEMY.SHELL_GRACE_FRAMES,
  };
}

// Impulso hacia arriba tras pisar un enemigo (combo creciente).
// Vive acá porque entities.js es su único consumidor.
function bounceAfterStomp(p, combo) {
  p.vy = STOMP.BASE_BOUNCE_VY - Math.min(combo, STOMP.COMBO_MAX) * STOMP.BOUNCE_PER_COMBO;
  p.grounded = false;
  p._jumpActive = false; // el rebote no se puede cortar soltando la tecla
  p.squash = STOMP.STOMP_BOUNCE;
}

// Efectos comunes a cualquier pisotón: rebote, puntaje por combo, háptica y partículas.
function onEnemyStomped(p, x, y, burstKind, sfx) {
  bounceAfterStomp(p, game.combo);
  game.shake = Math.max(game.shake, FX.STOMP_SHAKE);
  awardStompScore();
  sfx();
  haptics.stomp();
  burst(burstKind, x, y);
  uiUpdate();
}

// ¿El jugador viene cayendo sobre la cabeza del enemigo?
function isStomp(p, enemyTop, headMarginPx) {
  return p.vy > 0 && p.y + p.h - enemyTop < headMarginPx;
}

function updateShellWithPlayers(e) {
  const gd = game.levelData;
  for (const p of alivePlayers()) {
    if (!e.shell) break; // otro jugador pudo destruirlo en este paso
    updateShell(e, p, gd);
  }
}

// Caparazón: quieto se patea de costado, en movimiento mata enemigos y daña a Mario
function updateShell(e, p, gd) {
  const sh = e.shell;
  moveShell(sh, gd);
  e.animFrame += ENEMY.ANIM_RATE * 2;

  // Un caparazón rodante elimina a otros enemigos que atraviesa
  if (Math.abs(sh.vx) > ENEMY.SHELL_KILL_MIN_VX) killEnemiesInPath(e, sh);

  const sRect = { x: sh.x, y: sh.y, w: ENEMY.SHELL.w, h: ENEMY.SHELL.h };
  if (!rectOverlap(playerHitbox(p), sRect)) return;

  if (p.starTimer > 0) {
    destroyShell(e, SCORE.SHELL_STOMP);
    return;
  }

  // Pisarlo de arriba lo destruye
  if (isStomp(p, sh.y, ENEMY.SHELL_KICK_Y_TOLERANCE) && !sh.grace) {
    bumpCombo();
    destroyShell(e, SCORE.SHELL_STOMP);
    return;
  }

  // De costado: si está quieto, se patea; si se mueve, daña (salvo gracia recién pateado)
  if (sh.grace > 0) { sh.grace--; return; }
  if (sh.vx === 0 && !sh.killed) {
    kickShell(sh, p);
  } else if (p.invincible <= 0) {
    killPlayer(p);
  }
}

function moveShell(sh, gd) {
  sh.x += sh.vx;
  // Rozamiento: desacelera en dirección al movimiento (antes, con vx negativo
  // el shell era acelerado por la fricción y no se detenía jamás).
  if (sh.vx !== 0) sh.vx -= Math.sign(sh.vx) * Math.min(Math.abs(sh.vx), ENEMY.SHELL_FRICTION);
  if (Math.abs(sh.vx) < ENEMY.SHELL_MIN_VX) sh.vx = 0;
  if (shellHitsWallOrGap(sh, gd)) {
    sh.vx *= -1;
    sh.x = Math.max(0, Math.min(sh.x, worldRightBound(gd) - ENEMY.SHELL.w));
  }
}

function shellHitsWallOrGap(sh, gd) {
  const bound = worldRightBound(gd);
  if (sh.x < 0 || sh.x + ENEMY.SHELL.w > bound) return true;
  if (sh.vx === 0) return false;
  // Rebote en los bordes de los huecos (el caparazón no se cae)
  const nx = sh.x + Math.sign(sh.vx) * ENEMY.SHELL_PROBE_PX;
  const foot = { x: sh.vx > 0 ? nx + ENEMY.SHELL.w - 2 : nx + 2, y: sh.y + 14, w: 2, h: 4 };
  return !groundBelow(foot, gd);
}

function kickShell(sh, p) {
  const dir = (p.x + p.w / 2) < (sh.x + 12) ? 1 : -1;
  sh.vx = dir * ENEMY.SHELL_KICK_VX;
  sh.grace = ENEMY.SHELL_GRACE_FRAMES;
  sfxShell();
}

function killEnemiesInPath(e, sh) {
  for (const other of game.levelData.enemies) {
    if (other === e || !other.alive || other.shell) continue;
    const oRect = { x: other.x, y: other.y, w: other.w, h: other.h };
    if (!rectOverlap({ x: sh.x, y: sh.y, w: ENEMY.SHELL.w, h: ENEMY.SHELL.h }, oRect)) continue;
    other.alive = false;
    if (other.type === 'goomba') other.squishTimer = ENEMY.SQUISH_FRAMES;
    game.shake = Math.max(game.shake, FX.SHELL_SHAKE);
    haptics.shellKill();
    awardScore(SCORE.SHELL_KILL, other.x + other.w / 2, other.y, other.type === 'koopa' ? 'koopaDeath' : 'goombaDeath');
  }
}

function destroyShell(e, score) {
  const sh = e.shell;
  game.score += score;
  sfxStomp();
  burst('koopaDeath', sh.x + 12, sh.y);
  e.shell = null;
  uiUpdate();
}

// Decae el timer de gracia de los caparazones quietos: sin esto, un shell
// pateado queda "en gracia" eterna cuando nadie lo toca por varios pasos.
function tickShellsGrace() {
  for (const e of game.levelData.enemies) {
    if (e.shell && e.shell.grace > 0 && e.shell.vx === 0) e.shell.grace--;
  }
}

// --- Muerte y respawn ---------------------------------------------------

// Muerte de UN jugador: consume una vida compartida y programa su respawn.
// La partida termina (Game Over) solo cuando las vidas compartidas se agotan.
function killPlayer(p) {
  if (!p || p.invincible > 0 || p.starTimer > 0 || !p.alive) return;
  p.alive = false;
  p.respawnTimer = PLAYER.RESPAWN_FRAMES; // la animación de muerte corre en player.js
  game.lives--;
  game.combo = 0;
  game.shake = FX.DEATH_SHAKE;
  game.flashTimer = 30; // flash blanco al morir
  sfxDie();
  haptics.death();
  burst('playerDeath', p.x, p.y);
  uiUpdate();
  if (game.lives <= 0) {
    game.running = false;
    stopStarMusic();
    uiShowGameOver(game.score);
  }
}

// Reaparece a un jugador en el borde izquierdo de la vista, sobre tierra firme.
function respawnPlayer(p) {
  const gd = game.levelData;
  const wantX = Math.max(game.camera.x + PLAYER.RESPAWN_VIEW_MARGIN, 0);
  // Primer segmento de suelo que cubra o quede a la derecha del punto deseado
  const seg =
    gd.groundSegments.find(s => wantX >= s.x && wantX <= s.x + s.w) ||
    gd.groundSegments.find(s => s.x + s.w > wantX) ||
    gd.groundSegments[0];
  let x = Math.max(wantX, seg.x + 10);
  if (x > seg.x + seg.w - 20) x = seg.x + seg.w - 20;

  Object.assign(p, {
    alive: true,
    big: false, // al morir se pierde el power-up
    w: PLAYER.SMALL.w, h: PLAYER.SMALL.h,
    x, y: gd.groundY - PLAYER.SMALL.h,
    vx: 0, vy: 0,
    grounded: true,
    coyote: 0, squash: 0,
    _jumps: 0, _jumpActive: false,
    starTimer: 0,
    respawnTimer: 0,
    invincible: PLAYER.RESPAWN_INVINCIBLE_FRAMES, // invulnerabilidad breve al reaparecer
  });
  uiUpdate();
}

// Reaparece a los jugadores muertos cuando su timer de respawn termina.
function respawnPlayers() {
  for (const p of game.players) {
    if (p.alive || p.respawnTimer <= 0) continue;
    p.respawnTimer--;
    if (p.respawnTimer === 0) respawnPlayer(p);
  }
}

export function entitiesUpdate() {
  bumpBlocks();
  collectCoins();
  updatePowerups();
  enemyBlocks();
  tickShellsGrace();
  respawnPlayers();
}

export { killPlayer, respawnPlayer, spawnPowerupFromBlock, bumpBlocks };
