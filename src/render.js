// ============================================================
// render.js — Dibujo de la escena y minimap.
// No calcula lógica de juego: consume el estado compartido y
// los colores/efectos de data/level-data.js y data/tuning.js.
// ============================================================

import { assets } from './assets.js';
import { allPowerups } from './entities.js';
import { game, view } from './core/state.js';
import { VIEW } from './core/constants.js';
import { PALETTE } from './data/level-data.js';
import { FX, POWERUP, SQUASH, PLAYER, ENEMY, BLOCK } from './data/tuning.js';
import { PARTICLE_BEHAVIORS } from './particles.js';

// Caché de segmentos visibles para optimización de render.
const visibleSegmentsCache = new Map();
let lastCameraX = -1;

function render() {
  const ctx = view.ctx;
  if (!ctx) return;
  // Backing store puede estar escalado por HiDPI/zoom (view.scale lo define app.js).
  const VS = Math.max(0.0001, view.scale || 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, Math.round(VIEW.W * VS), Math.round(VIEW.H * VS));
  // A partir de aquí se dibuja en coordenadas lógicas (800x500) con transform de escala
  const WIN_W = VIEW.W / VS;
  const WIN_H = VIEW.H / VS;
  ctx.setTransform(VS, 0, 0, VS, 0, 0);
  const gd = game.levelData;
  const cam = game.camera;
  if (!gd) return;

  ctx.fillStyle = PALETTE.SKY;
  ctx.fillRect(0, 0, WIN_W, gd.groundY);
  ctx.fillStyle = PALETTE.GROUND_TOP;
  ctx.fillRect(0, gd.groundY, WIN_W, WIN_H - gd.groundY);

  // Screen shake: el cielo no tiembla, el mundo sí
  const shake = game.shake || 0;
  const shX = (Math.random() - 0.5) * shake * 2;
  const shY = (Math.random() - 0.5) * shake * 2;
  ctx.save();
  ctx.translate(shX, shY);

  ctx.fillStyle = PALETTE.CLOUD;
  for (const cl of gd.clouds) {
    const cx = cl.x - cam.x * 0.2;
    if (cx + cl.w < 0 || cx > WIN_W) continue;
    drawCloud(ctx, cx, cl.y, cl.w, cl.h);
  }

  ctx.fillStyle = PALETTE.HILL;
  for (const h of gd.hills) {
    const hx = h.x - cam.x * 0.4;
    if (hx + h.w < 0 || hx > WIN_W) continue;
    ctx.beginPath();
    ctx.ellipse(hx + h.w / 2, gd.groundY, h.w / 2, h.h, 0, Math.PI, 0);
    ctx.fill();
  }

  const viewL = cam.x - 50, viewR = cam.x + WIN_W + 50;

  for (const p of gd.groundSegments) {
    if (p.x + p.w < viewL || p.x > viewR) continue;
    const px = p.x - cam.x;
    ctx.fillStyle = PALETTE.GROUND;
    ctx.fillRect(px, gd.groundY, p.w, WIN_H - gd.groundY);
    ctx.fillStyle = PALETTE.GROUND_TOP;
    ctx.fillRect(px, gd.groundY, p.w, 8);
    ctx.strokeStyle = PALETTE.GROUND_LINE;
    ctx.lineWidth = 1;
    for (let bx = 0; bx < p.w; bx += 40) {
      ctx.beginPath();
      ctx.moveTo(px + bx, gd.groundY + 8);
      ctx.lineTo(px + bx, WIN_H);
      ctx.stroke();
    }
  }

  for (const b of gd.blocks) {
    if (!b.visible || b.destroyed) continue;
    if (b.x + b.w < viewL || b.x > viewR) continue;
    // Rebote visual al golpear el bloque desde abajo
    const bump = b.bumpTimer > 0 ? -Math.sin((b.bumpTimer / BLOCK.BUMP_FRAMES) * Math.PI) * 6 : 0;
    const bx = b.x - cam.x, by = b.y + bump;
    if (b.destroyed) { ctx.fillStyle = PALETTE.BLOCK_GONE_FILL; ctx.globalAlpha = PALETTE.BLOCK_GONE_ALPHA; }
    else if (b.collected && b.power) { ctx.fillStyle = PALETTE.BLOCK_GONE_FILL; ctx.globalAlpha = PALETTE.BLOCK_GONE_ALPHA; }
    else if (b.power) { ctx.fillStyle = b.power === 'star' ? PALETTE.FLAG_STAR : PALETTE.BLOCK; }
    else { ctx.fillStyle = b.collected ? PALETTE.BLOCK_USED : PALETTE.BLOCK; }
    ctx.fillRect(bx, by, b.w, b.h);
    ctx.strokeStyle = b.collected ? PALETTE.BLOCK_OUTLINE : PALETTE.BLOCK_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, b.w, b.h);
    ctx.strokeStyle = PALETTE.BLOCK_SHINE;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + b.w, by);
    ctx.moveTo(bx, by); ctx.lineTo(bx, by + b.h);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (b.power && !b.collected && !b.destroyed) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(b.power === 'lifeup' ? '1' : '?', bx + 20, by + 24);
    }
    if (b.coin && !b.collected && !b.destroyed) {
      ctx.fillStyle = PALETTE.COIN;
      ctx.beginPath();
      ctx.arc(bx + 20, by + 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.COIN_EDGE;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Monedas: giro 3D simulado escalando en X
  const coinPhase = Math.abs(Math.cos(game.frame * 0.08));
  for (const c of gd.coins) {
    if (c.collected || c.x < viewL || c.x > viewR) continue;
    const cx = c.x - cam.x;
    const bobY = Math.sin(game.frame * 0.1 + c.x * 0.05) * 3;
    ctx.save();
    ctx.translate(cx + 10, c.y + 10 + bobY);
    ctx.scale(Math.max(0.15, coinPhase), 1);
    if (assets.coin) ctx.drawImage(assets.coin, -10, -10, 20, 20);
    ctx.restore();
  }

  for (const pu of allPowerups()) {
    if (pu.collected) continue;
    if (pu.x < viewL || pu.x > viewR) continue;
    const puImg = pu.type === 'flower' ? assets.flower : pu.type === 'star' ? assets.star : assets.mushroom;
    const px = pu.x - cam.x;
    const bounce = Math.abs(Math.sin(game.frame * POWERUP.BOUNCE_ANIM_RATE)) * 2;
    ctx.save();
    ctx.translate(px + 12, pu.y + 15 + bounce);
    if (pu.type === 'star') {
      // halo pulsante para la estrella
      const glow = 14 + Math.sin(game.frame * 0.3) * 3;
      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, glow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(puImg, -12, -15, POWERUP.W, POWERUP.H);
    ctx.restore();
  }

  for (const e of gd.enemies) {
    if (e.type !== 'koopa') continue;
    if (!e.alive && !e.shell) continue;
    if (e.x + e.w < viewL || e.x > viewR) continue;
    const ex = e.x - cam.x;
    if (e.shell) {
      // El caparazón se dibuja en SU posición (e.shell.x), no en la del koopa.
      const sx = e.shell.x - cam.x;
      ctx.save();
      ctx.translate(sx + ENEMY.SHELL.w / 2, e.shell.y);
      ctx.scale(e.shell.vx >= 0 ? 1 : -1, 1);
      if (assets.koopa) ctx.drawImage(assets.koopa, -ENEMY.SHELL.w / 2, 0, ENEMY.SHELL.w, ENEMY.SHELL.h);
      ctx.restore();
    } else {
      // Mirar hacia donde camina
      const moving = e.dir >= 0;
      ctx.save();
      ctx.translate(ex + e.w / 2, 0);
      if (!moving) ctx.scale(-1, 1);
      if (assets.koopa) ctx.drawImage(assets.koopa, -e.w / 2, e.y, e.w, e.h);
      ctx.restore();
    }
  }

  for (const e of gd.enemies) {
    if (e.type !== 'goomba') continue;
    if (e.x + e.w < viewL || e.x > viewR) continue;
    const gx = e.x - cam.x;
    if (!e.alive) {
      if (e.squishTimer > 0) {
        ctx.save();
        ctx.translate(gx + 15, e.y + 26);
        ctx.scale(1, 0.4);
        ctx.translate(-15, -26);
        if (assets.goomba) ctx.drawImage(assets.goomba, gx, e.y, e.w, e.h);
        ctx.restore();
      }
      continue;
    }
    // Wobble al caminar
    const wob = Math.sin(e.animFrame * Math.PI) * 1.5;
    ctx.save();
    ctx.translate(gx, e.y);
    if (assets.goomba) ctx.drawImage(assets.goomba, 0, wob * 0.5, e.w, e.h);
    ctx.restore();
  }

  if (gd.flagX >= viewL && gd.flagX <= viewR) {
    const fx = gd.flagX - cam.x;
    if (assets.flag) ctx.drawImage(assets.flag, fx - 2, gd.groundY - 82, 40, 80);
    ctx.fillStyle = PALETTE.FLAG_STAR;
    ctx.beginPath();
    ctx.moveTo(fx + 20, gd.groundY - 80);
    ctx.lineTo(fx + 20 + 20 * Math.sin(game.frame * 0.1), gd.groundY - 80 + 5 * Math.sin(game.frame * 0.1));
    ctx.lineTo(fx + 20 + 18 * Math.sin(game.frame * 0.1 + 1), gd.groundY - 66 + 3 * Math.sin(game.frame * 0.1));
    ctx.lineTo(fx + 20, gd.groundY - 66);
    ctx.fill();
    ctx.fillStyle = PALETTE.FLAG_TEXT;
    ctx.font = '14px Arial';
    ctx.fillText('★', fx + 12, gd.groundY - 70);
  }

  // Flash blanco al recibir daño (feedback visual inmediato)
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${game.flashTimer / 120})`;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
  }
  
  for (const p of game.particles) {
    const alpha = Math.min(1, (p.life / FX.PARTICLE_FADE_FRAMES)) * (p.behavior === PARTICLE_BEHAVIORS.SPARKLE ? Math.sin(p.life * 0.5) * 0.5 + 0.5 : 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    const size = p.size || FX.PARTICLE_SIZE;
    ctx.fillRect(p.x - cam.x, p.y, size, size);
    if (p.behavior === PARTICLE_BEHAVIORS.SPARKLE) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x - cam.x - 1, p.y - 1, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  // Jugadores (co-op): dibuja a cada uno con su skin y etiqueta
  const players = (game.players || []).filter(p => p);
  if (players.length && !players.some(p => spriteSetFor(p).right.length)) {
    return drawMinimap(ctx); // sprites aún cargando
  }
  for (const p of players) {
    if (!(p.alive || p.y < WIN_H + PLAYER.DEATH_FALL_MARGIN)) continue;
    const px = p.x - cam.x;
    if (!(px + p.w >= 0 && px <= WIN_W)) continue;
    const set = spriteSetFor(p);
    if (!set.right.length) continue;
    const marioImg = p.facingRight
      ? set.right[p.animFrame % set.right.length]
      : set.left[p.animFrame % set.left.length];
    const damaged = p.invincible > 0 && !p.invincibleFlash;
    const star = p.starTimer > 0;
    if (damaged) ctx.globalAlpha = 0.45;
    ctx.save();
    const bobY = p.grounded ? Math.abs(Math.sin(game.frame * 0.3)) * 1.5 : 0;
    // Squash & stretch: escala alrededor de los pies (ancla abajo-centro)
    const sq = p.squash || 0;
    const sx = 1 + sq * SQUASH.SCALE_X, sy = 1 - sq * SQUASH.SCALE_Y;
    ctx.translate(px + p.w / 2, p.y + p.h + bobY);
    ctx.scale(sx, sy);
    ctx.translate(-p.w / 2, -p.h);
    if (star) {
      // Ciclo de colores + destellos mientras dura la estrella
      ctx.filter = `hue-rotate(${POWERUP.STAR_HUES[Math.floor(game.frame / 4) % POWERUP.STAR_HUES.length]}deg) saturate(1.6) brightness(1.15)`;
      ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
      ctx.beginPath();
      ctx.arc(p.w / 2, p.h / 2, Math.max(p.w, p.h) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(marioImg, 0, 0, p.w, p.h);
    ctx.restore();
    ctx.globalAlpha = 1;
    // Etiqueta P1/P2 al inicio del nivel para distinguirlos
    if (game.frame < PLAYER.RESPAWN_LABEL_FRAMES) {
      ctx.fillStyle = p.skin === 'luigi' ? '#2e7d32' : '#d32f2f';
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, px + p.w / 2, p.y - 6);
    }
  }

  ctx.restore(); // fin del screen shake

  drawMinimap(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

// Sprite sets por skin; centralizado acá para no reconstruir el mapa por frame.
const SPRITE_SETS = {
  mario: { small: assets.marioSmall, big: assets.marioBig },
  luigi: { small: assets.luigiSmall, big: assets.luigiBig },
};

function spriteSetFor(p) {
  const sets = SPRITE_SETS[p.skin] || SPRITE_SETS.mario;
  return p.big ? sets.big : sets.small;
}

function drawCloud(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.arc(x + w * 0.25, y + h * 0.6, h * 0.5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.5, y + h * 0.4, h * 0.6, 0, Math.PI * 2);
  ctx.arc(x + w * 0.75, y + h * 0.6, h * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMinimap(ctx) {
  const VS = Math.max(0.0001, view.scale || 1);
  const WIN_W = VIEW.W / VS; // tamaño lógico de vista
  const mmW = 170, mmH = 46;
  const mmX = WIN_W - mmW - 10, mmY = 50;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  const gd = game.levelData;
  const levelLen = gd.worldLen;
  const scale = mmW / levelLen;

  ctx.fillStyle = PALETTE.GROUND;
  for (const p of gd.groundSegments) ctx.fillRect(mmX + p.x * scale, mmY + 16, Math.max(1, p.w * scale), 4);
  ctx.fillStyle = PALETTE.BLOCK;
  for (const b of gd.blocks) if (b.visible) ctx.fillRect(mmX + b.x * scale - 1, mmY + 10, 2, 2);
  ctx.fillStyle = PALETTE.COIN;
  for (const c of gd.coins) if (!c.collected) ctx.fillRect(mmX + c.x * scale - 1, mmY + 6, 2, 2);
  ctx.fillStyle = '#7a5c2e';
  for (const e of gd.enemies) if (e.alive) ctx.fillRect(mmX + e.x * scale - 1, mmY + 6, 2, 2);
  ctx.fillStyle = PALETTE.BLOCK_USED;
  for (const e of gd.enemies) if (e.shell) ctx.fillRect(mmX + e.shell.x * scale - 1, mmY + 6, 2, 2);
  // Puntos de jugadores (co-op): blanco = P1, gris claro = P2
  const playerDots = ['ffffff', 'c0c0c0'];
  (game.players || []).forEach((pp, i) => {
    ctx.fillStyle = pp.starTimer > 0 ? '#fff45c' : ('#' + (playerDots[i] || 'ffffff'));
    ctx.fillRect(mmX + pp.x * scale - 2, mmY + 2, 4, pp.big ? 10 : 8);
  });
  ctx.strokeStyle = PALETTE.FLAG_STAR;
  ctx.strokeRect(mmX + game.camera.x * scale, mmY, mmW * (WIN_W / levelLen), mmH);
  ctx.fillStyle = '#fff';
  ctx.font = '10px Courier New';
  ctx.fillText('NIVEL ' + game.level, mmX + 4, mmY + 10);
}

export { render, drawCloud, drawMinimap };
