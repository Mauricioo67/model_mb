// ============================================================
// particles.js — Sistema de partículas de efectos.
// Emisión (burst con config de data/tuning.js), simulación por
// paso y limpieza. No conoce enemigos ni jugadores: solo emite
// donde se le indica y avanza su propio estado.
// ============================================================

import { game } from './core/state.js';
import { FX } from './data/tuning.js';

// Tipos de comportamiento de partículas.
const PARTICLE_BEHAVIORS = Object.freeze({
  FALL: 'fall',        // cae con gravedad (default)
  BOUNCE: 'bounce',    // rebota en el suelo
  EXPLOSION: 'explosion', // salta en dirección radial
  SPARKLE: 'sparkle',  // destella y desaparece rápido
});

// Emite n partículas sueltas del color dado, con velocidad inicial hacia arriba.
function spawnParticles(x, y, color, n, vz = 4, behavior = PARTICLE_BEHAVIORS.FALL) {
  for (let i = 0; i < n; i++) {
    const angle = behavior === PARTICLE_BEHAVIORS.EXPLOSION ? Math.random() * Math.PI * 2 : 0;
    const speed = behavior === PARTICLE_BEHAVIORS.EXPLOSION ? vz * (0.5 + Math.random() * 0.5) : 0;
    game.particles.push({
      x, y,
      vx: behavior === PARTICLE_BEHAVIORS.EXPLOSION
        ? Math.cos(angle) * speed
        : (Math.random() - 0.5) * FX.PARTICLE_SPREAD,
      vy: behavior === PARTICLE_BEHAVIORS.EXPLOSION
        ? Math.sin(angle) * speed
        : -Math.random() * vz - 1,
      color,
      life: FX.PARTICLE_LIFE_MIN + Math.random() * FX.PARTICLE_LIFE_SPAN,
      maxLife: FX.PARTICLE_LIFE_MIN + FX.PARTICLE_LIFE_SPAN,
      behavior,
      size: FX.PARTICLE_SIZE * (0.5 + Math.random() * 0.5),
      bounceCount: 0,
    });
  }
}

// Emite partículas con los parámetros nombrados de FX.PARTICLES.
function burst(kind, x, y, behavior) {
  const cfg = FX.PARTICLES[kind];
  if (!cfg) return;
  const particleBehavior = behavior || cfg.behavior || PARTICLE_BEHAVIORS.FALL;
  spawnParticles(x, y, cfg.color, cfg.count, cfg.power, particleBehavior);
}

// Avanza la simulación (un paso) y descarta las partículas muertas.
function updateParticles() {
  game.particles = game.particles.filter(pt => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    
    switch (pt.behavior) {
      case PARTICLE_BEHAVIORS.FALL:
        pt.vy += FX.PARTICLE_GRAVITY;
        break;
      case PARTICLE_BEHAVIORS.BOUNCE: {
        pt.vy += FX.PARTICLE_GRAVITY * 0.5;
        if (pt.y > game.levelData?.groundY - 10 && pt.vy > 0) {
          pt.vy *= -0.6;
          pt.vx *= 0.8;
          pt.bounceCount++;
          if (pt.bounceCount > 2) pt.vy = 0;
        }
        break;
      }
      case PARTICLE_BEHAVIORS.EXPLOSION:
        pt.vx *= 0.95;
        pt.vy *= 0.95;
        pt.vy += FX.PARTICLE_GRAVITY * 0.3;
        break;
      case PARTICLE_BEHAVIORS.SPARKLE:
        pt.life -= 2;
        break;
    }
    
    pt.life--;
    return pt.life > 0;
  });
}

// Limpia todas las partículas (inicio de nivel o de partida).
function resetParticles() {
  game.particles = [];
}

export { spawnParticles, burst, updateParticles, resetParticles, PARTICLE_BEHAVIORS };
