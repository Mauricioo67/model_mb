// ============================================================
// player.js — Los jugadores: movimiento, salto y estados.
// Co-op local: cada jugador tiene índice (input/controles propios)
// y skin. La lógica es idéntica para todos; el balance viene de
// data/tuning.js (PLAYER/SQUASH/STOMP/PLAYERS).
// ============================================================

import { game } from './core/state.js';
import { VIEW } from './core/constants.js';
import { rectOverlap, getSolids } from './physics.js';
import { inputX, inputJump, inputJumpHeld, consumeJump } from './input.js';
import { sfxJump, stopStarMusic } from './audio.js';
import { killPlayer } from './entities.js';
import { uiUpdate } from './ui.js';
import { PLAYER, SQUASH, PLAYERS } from './data/tuning.js';

// Velocidad bajo la cual la fricción redondea a cero (evita deslizamiento eterno)
const FRICTION_EPSILON = 0.05;
// Al reintegrar la fuerza de animación de caminata por paso
const WALK_ANIM_RATE = 0.25;
// Altura máxima de un subpaso de integración vertical (evita atravesar el suelo)
const VERTICAL_SUBSTEP_MAX_PX = 8;

function createPlayer(level, playerIndex = 0) {
  const size = level.playerBig ? PLAYER.BIG : PLAYER.SMALL;
  const def = PLAYERS[playerIndex] || PLAYERS[0];
  return {
    index: playerIndex,
    skin: def.skin,     // 'mario' | 'luigi'
    label: def.label,   // 'P1' | 'P2'
    x: def.spawnX, y: level.groundY - size.h,
    w: size.w, h: size.h,
    vx: 0, vy: 0,
    speed: PLAYER.SPEED, jump: PLAYER.JUMP_VY,
    grounded: false,
    facingRight: true,
    animFrame: 0,
    animTimer: 0,
    alive: true,
    big: !!level.playerBig,
    invincible: 0,          // post-daño / invulnerabilidad breve
    starTimer: 0,           // estrella: invencible + mata enemigos al tocar
    squishTimer: 0,
    invincibleFlash: 0,
    coyote: 0,              // frames restantes para saltar tras dejar el suelo
    squash: 0,              // -1 aplastado (aterrizaje), +1 estirado (salto)
    _jumps: 0,
    _jumpActive: false, // el ascenso proviene de un salto propio (permite cortarlo)
  };
}

// Crea (o recrea) a todos los jugadores al iniciar un nivel.
function startLevel(levelData) {
  stopStarMusic();
  game.levelData = levelData;
  game.players = PLAYERS.map((_, i) => createPlayer(levelData, i));
  uiUpdate();
}

// --- Movimiento horizontal ---------------------------------------------

function applyHorizontalInput(p, input) {
  if (input !== 0) {
    // Aceleración progresiva en lugar de velocidad instantánea
    p.vx += (input * p.speed - p.vx) * PLAYER.ACCEL;
    if (Math.abs(p.vx) < FRICTION_EPSILON) p.vx = input * p.speed;
    advanceWalkAnimation(p);
  } else {
    p.vx *= PLAYER.FRICTION; // fricción
    if (Math.abs(p.vx) < FRICTION_EPSILON) p.vx = 0;
    p.animFrame = 0;
    p.animTimer = 0;
  }
  if (input > 0) p.facingRight = true;
  if (input < 0) p.facingRight = false;
}

function advanceWalkAnimation(p) {
  p.animTimer += WALK_ANIM_RATE;
  if (p.animTimer >= 1) { p.animTimer = 0; p.animFrame++; }
}

// --- Salto ---------------------------------------------------------------

// Coyote time: unos frames extra para saltar tras dejar el borde.
function tickCoyote(p) {
  if (p.grounded) p.coyote = PLAYER.COYOTE_FRAMES;
  else if (p.coyote > 0) p.coyote--;
}

function tryJump(p, idx, jump) {
  const canJump = p.grounded || p.coyote > 0;
  if (jump && canJump) {
    performJump(p, idx, p.jump);
    return;
  }
  tryAirJump(p, idx, jump);
}

function performJump(p, idx, vy) {
  p.vy = vy;
  p.grounded = false;
  p.coyote = 0;
  p._jumps = 0;
  p._jumpActive = true;
  p.squash = SQUASH.JUMP_STRETCH; // estirado al saltar
  sfxJump();
  consumeJump(idx);
}

// Salto extra en el aire: solo Mario grande, dentro de una ventana de vy.
function tryAirJump(p, idx, jump) {
  const inWindow = p.vy > 0 && p.vy < PLAYER.AIR_JUMP_WINDOW_MAX_VY;
  if (jump && p.big && inWindow && p._jumps < PLAYER.MAX_AIR_JUMPS) {
    p.vy = p.jump * PLAYER.AIR_JUMP_VY_FACTOR;
    p._jumps++;
    p._jumpActive = true;
    sfxJump();
    consumeJump(idx);
  }
}

// Altura de salto variable: soltar la tecla corta el impulso.
function applyJumpCut(p, idx) {
  if (p._jumpActive && !inputJumpHeld(idx) && p.vy < PLAYER.JUMP_CUT_VY) {
    p.vy = PLAYER.JUMP_CUT_MIN_VY;
    p._jumpActive = false;
  }
}

// --- Gravedad e integración ---------------------------------------------

function applyGravity(p, idx) {
  // Gravedad asimétrica: caer es más rápido que subir (salto con más "peso")
  const risingWithJump = p.vy < 0 && inputJumpHeld(idx);
  p.vy += risingWithJump ? PLAYER.GRAVITY_RISE : PLAYER.GRAVITY_FALL;
  if (p.vy > PLAYER.MAX_FALL) p.vy = PLAYER.MAX_FALL;
}

function resolveHorizontalCollisions(p, solids) {
  p.x += p.vx;
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  for (const s of solids) {
    if (rectOverlap(p, s)) {
      p.x = p.vx > 0 ? s.x - p.w : s.x + s.w;
      p.vx = 0;
    }
  }
}

// Eje Y: puede necesitar varios subpasos para no atravesar el suelo.
// Devuelve la velocidad usada en el último subpaso (para el squash de aterrizaje).
function resolveVerticalCollisions(p, solids) {
  const wasGrounded = p.grounded;
  const steps = Math.max(1, Math.ceil(Math.abs(p.vy) / VERTICAL_SUBSTEP_MAX_PX));
  const stepVy = p.vy / steps;
  for (let i = 0; i < steps; i++) {
    p.y += stepVy;
    p.grounded = false;
    let landed = false;
    for (const s of solids) {
      if (rectOverlap(p, s)) {
        if (stepVy > 0) {
          p.y = s.y - p.h;
          p.grounded = true;
          landed = true;
        } else if (stepVy < 0) {
          p.y = s.y + s.h;
        }
        p.vy = 0;
      }
    }
    if (landed) break;
  }
  applyLandingSquash(p, wasGrounded, stepVy);
  return stepVy;
}

// Squash al aterrizar (proporcional a la velocidad de impacto)
function applyLandingSquash(p, wasGrounded, stepVy) {
  if (wasGrounded || !p.grounded) return;
  const landing = SQUASH.LANDING_BASE + Math.abs(stepVy) * SQUASH.LANDING_PER_VY;
  p.squash = -Math.min(SQUASH.LANDING_MAX, landing);
}

// --- Timers -------------------------------------------------------------

function tickTimers(p) {
  if (p.invincible > 0) p.invincible--;
  if (p.starTimer > 0) {
    p.starTimer--;
    if (p.starTimer === 0) starExpired(p);
  }
  p.invincibleFlash = (game.frame % 6 < 3);
  decaySquash(p);
}

// Squash & stretch: decae hacia la forma normal
function decaySquash(p) {
  if (p.squash === 0) return;
  p.squash *= SQUASH.DECAY;
  if (Math.abs(p.squash) < SQUASH.MIN_ABS) p.squash = 0;
}

// Un jugador perdió la estrella: cortar su música si nadie más la tiene.
function starExpired(p) {
  if (!game.players.some(o => o !== p && o.starTimer > 0)) stopStarMusic();
  uiUpdate();
}

// Animación de muerte: pequeño salto y caída sin control.
function updateDeathAnimation(p) {
  p.vy = Math.min(p.vy + PLAYER.GRAVITY_FALL, PLAYER.MAX_FALL);
  p.y += p.vy;
}

// Actualiza a UN jugador (se llama por cada uno en cada paso).
function playerUpdate(p) {
  if (!p) return;
  if (!p.alive) return updateDeathAnimation(p);

  const solids = getSolids();
  const idx = p.index;
  const input = inputX(idx);
  const jump = inputJump(idx);

  tickTimers(p);
  applyHorizontalInput(p, input);
  tickCoyote(p);
  tryJump(p, idx, jump);
  if (p.grounded) { p._jumps = 0; p._jumpActive = false; }
  applyJumpCut(p, idx);
  applyGravity(p, idx);

  resolveHorizontalCollisions(p, solids);
  resolveVerticalCollisions(p, solids);

  if (p.y > VIEW.H + PLAYER.DEATH_FALL_MARGIN) killPlayer(p);
}

export { startLevel, createPlayer, playerUpdate };
