// ============================================================
// data/tuning.js — Balance del juego en un solo lugar.
// TODO lo que un diseñador querría ajustar (velocidades, saltos,
// puntajes, tiempos) vive acá; la lógica lo consume pero no lo
// hardcodea. Modificar este archivo NO debe requerir tocar src/.
// ============================================================

// --- Jugador: movimiento y salto ---
export const PLAYER = Object.freeze({
  SMALL: { w: 28, h: 36 },       // hitbox Mario chico
  BIG: { w: 32, h: 44 },         // hitbox Mario grande
  SPEED: 3.2,                    // velocidad horizontal máxima (px/paso)
  ACCEL: 0.35,                   // factor de aproximación a la velocidad objetivo
  FRICTION: 0.6,                 // multiplicador de vx sin input
  JUMP_VY: -10.2,                // impulso inicial de salto
  JUMP_CUT_VY: -4,               // vy al soltar la tecla (salto variable)
  JUMP_CUT_MIN_VY: -4,           // solo corta si vy < esto (subiendo fuerte)
  GRAVITY_RISE: 0.45,            // gravedad subiendo con salto sostenido
  GRAVITY_FALL: 0.68,            // gravedad cayendo (asimétrica: más pesada)
  MAX_FALL: 13,                  // velocidad terminal de caída
  COYOTE_FRAMES: 6,              // ~100ms para saltar tras dejar el borde
  JUMP_BUFFER_FRAMES: 8,         // ~130ms de buffer de pulsación de salto
  MAX_AIR_JUMPS: 2,              // saltos extra en el aire (solo Mario grande)
  AIR_JUMP_VY_FACTOR: 0.88,      // impulso del salto aéreo relativo al base
  AIR_JUMP_WINDOW_MAX_VY: 3,     // el salto aéreo aplica mientras vy esté entre 0 y esto
  RESPAWN_INVINCIBLE_FRAMES: 120, // invulnerabilidad al reaparecer (2s)
  RESPAWN_FRAMES: 60,            // segundos de espera tras morir antes del respawn (a 60fps)  RESPAWN_LABEL_FRAMES: 90,     // cuántos frames se muestra la etiqueta P1/P2 sobre el jugador
  RESPAWN_VIEW_MARGIN: 80,      // px desde el borde izquierdo de la vista donde reaparece
  DEATH_FALL_MARGIN: 200,       // px bajo la pantalla para considerar muerte por caída
  HITBOX_INSET: 4,              // px recortados de cada borde del hitbox de contacto
  HEAD_INSET: 6,                // px recortados de los costados de la franja de cabeza
  HEAD_HEIGHT: 8,               // alto de la franja de cabeza (golpear bloques desde abajo)
});

// --- Bloques golpeables ---
export const BLOCK = Object.freeze({
  BUMP_FRAMES: 8, // frames de rebote visual al golpear desde abajo
});

// --- Squash & stretch (game feel) ---
export const SQUASH = Object.freeze({
  DECAY: 0.82,            // decaimiento por paso
  MIN_ABS: 0.02,          // umbral bajo el cual se corta a 0
  JUMP_STRETCH: 0.35,     // estiramiento al saltar
  STOMP_BOUNCE: 0.35,     // estiramiento al rebotar en un enemigo
  LANDING_BASE: 0.15,     // aplastamiento base al aterrizar
  LANDING_PER_VY: 0.03,   // aplastamiento extra por unidad de velocidad de impacto
  LANDING_MAX: 0.45,      // aplastamiento máximo
  SCALE_X: 0.6,           // factor de escala X por unidad de squash (render)
  SCALE_Y: 0.8,           // factor de escala Y por unidad de squash (render)
});

// --- Rebote al pisar enemigos (combo) ---
export const STOMP = Object.freeze({
  BASE_BOUNCE_VY: -7,          // impulso base tras pisar
  BOUNCE_PER_COMBO: 0.4,       // impulso extra por nivel de combo
  COMBO_MAX: 5,                // tope del multiplicador de combo
  GOOMBA_HEAD_MARGIN: 12,      // px de tolerancia para contar "pisotón" en Goomba
  KOOPA_HEAD_MARGIN: 14,       // ídem para Koopa
});

// --- Puntajes ---
export const SCORE = Object.freeze({
  COIN: 100,
  BLOCK_COIN: 200,
  STOMP_BASE: 200,
  SHELL_KILL: 400,
  SHELL_STOMP: 300,
  STAR_KILL: 200,
  POWERUP_MAIN: 1000,   // estrella o crecer
  POWERUP_EXTRA: 500,   // power-up con Mario ya grande
  LIFEUP: 1000,         // 1-Up (vida extra)
  LEVEL_CLEAR: 1000,    // bonificación por completar nivel
  MULTIPLIER_POWERUP: 2000, // power-up multiplicador de puntuación
  ALL_COINS_BONUS: 5000, // bonus por recoger todas las monedas sin morir
  CHEEP_KILL: 150,     // pisotón en pez volador
});

// --- Bloques destructibles ---
export const DESTROYABLE = Object.freeze({
  // Un bloque ordinario (sin power-up) se destruye al pisotonarlo desde arriba.
  // Esto extiende el comportamiento de los bloques 'coin' (que solo licuán moneda).
  STOMP_DESTROY_SCORE: 50,
});

// --- Monedas ---
export const COIN = Object.freeze({
  SIZE: 20,      // px por lado (colisión y render)
  MARGIN_Y: 10,  // px de margen vertical al colocarla sobre el suelo
});

// --- Enemigos ---
export const ENEMY = Object.freeze({
  GOOMBA: { w: 30, h: 26 },   // h = alto; los enemigos se apoyan: y = groundY - h
  KOOPA: { w: 34, h: 32 },
  CHEEP: { w: 24, h: 16 },   // pez volador
  SHELL: { w: 24, h: 12 },
  SQUISH_FRAMES: 30,         // frames mostrando el Goomba aplastado
  ANIM_RATE: 0.1,            // avance de animación por paso
  SHELL_FRICTION: 0.96,      // desaceleración del caparazón
  SHELL_MIN_VX: 0.15,        // |vx| bajo el cual el caparazón se detiene
  SHELL_KILL_MIN_VX: 0.5,    // |vx| mínimo para que el caparazón mate enemigos
  SHELL_KICK_VX: 6,          // velocidad al patear un caparazón
  SHELL_GRACE_FRAMES: 12,    // inmunidad tras patear (no daña a Mario enseguida)
  SHELL_PROBE_PX: 3,         // distancia de sondeo de pared/hueco del caparazón
  SHELL_KICK_Y_TOLERANCE: 10, // px para contar "pisotón" sobre un caparazón quieto
  STOMP_STAR_SCORE: 200,
  BUMP_DESTROY_SCORE: 50,
  CHEEP_SPEED: 1.2,          // velocidad del pez volador
  CHEEP_AMPLITUDE: 60,       // amplitud de oscilación vertical
  CHEEP_PERIOD: 120,         // periodo de oscilación en frames
});

// --- Power-ups ---
export const POWERUP = Object.freeze({
  W: 24, H: 30,
  POP_VY: -6,                 // impulso inicial al salir del bloque
  GRAVITY: 0.5,
  BOUNCE_ANIM_RATE: 0.15,     // velocidad del rebote visual
  STAR_FRAMES: 480,           // ~8s de invencibilidad a 60fps
  STAR_HUES: Object.freeze([0, 40, 80, 160, 220, 300]), // ciclo de color (render)
  OFFSCREEN_MARGIN: 50,       // px bajo la pantalla para reciclar un power-up
});

const VALID_POWERUP_TYPES = new Set(['mushroom', 'flower', 'star', 'lifeup']);

export { VALID_POWERUP_TYPES };

// --- Háptica (vibración en móviles; no-op donde no está disponible) ---
export const HAPTICS = Object.freeze({
  STOMP: 20,          // pisotón: tap corto
  SHELL_KILL: 30,     // caparazón eliminando enemigos
  POWERUP: [20, 40, 20], // power-up: doble pulsito
  DEATH: [60, 40, 60],   // muerte: pulso largo doble
});

// --- Partículas y efectos ---
export const FX = Object.freeze({
  PARTICLE_GRAVITY: 0.2,       // gravedad de partículas
  PARTICLE_LIFE_MIN: 25,       // vida mínima (frames)
  PARTICLE_LIFE_SPAN: 25,      // variación extra aleatoria
  PARTICLE_SPREAD: 4,          // dispersión horizontal (|vx| máx)
  PARTICLE_SIZE: 4,            // px por partícula (render)
  PARTICLE_FADE_FRAMES: 40,    // frames sobre los que se desvanece (render)
  SHAKE_DECAY: 0.8,            // decaimiento del screen shake por frame
  DEATH_SHAKE: 14,
  STOMP_SHAKE: 5,
  SHELL_SHAKE: 6,
  PARTICLES: Object.freeze({
    coin: { color: '#ffd700', count: 8, power: 4, behavior: 'sparkle' },
    blockCoin: { color: '#ffd700', count: 10, power: 4, behavior: 'sparkle' },
    powerStar: { color: '#ffd700', count: 18, power: 4, behavior: 'explosion' },
    powerGrow: { color: '#c8102e', count: 12, power: 4, behavior: 'explosion' },
    powerFlower: { color: '#ff4d6d', count: 12, power: 4, behavior: 'explosion' },
    goombaDeath: { color: '#7a5c2e', count: 6, power: 4, behavior: 'bounce' },
    koopaDeath: { color: '#8a1f1f', count: 6, power: 4, behavior: 'bounce' },
    playerDeath: { color: '#c8102e', count: 14, power: 6, behavior: 'explosion' },
  }),
});

// --- Jugadores (co-op local) ---
// Cada entrada define un jugador: skin de sprites y punto de aparición.
export const PLAYERS = Object.freeze([
  { id: 0, skin: 'mario', label: 'P1', spawnX: 80 },
  { id: 1, skin: 'luigi', label: 'P2', spawnX: 124 },
]);

// Modo de partida: 'coop' | 'solo'
export const GAME_MODE = Object.freeze({
  COOP: 'coop',
  SOLO: 'solo',
});

// Niveles: cada nivel puede tener su propio modo y datos específicos.
export const LEVELS = Object.freeze([
  { n: 1, mode: GAME_MODE.SOLO, name: 'Nivel 1 — Principiante' },
  { n: 2, mode: GAME_MODE.COOP, name: 'Nivel 2 — Co-op' },
  { n: 3, mode: GAME_MODE.SOLO, name: 'Nivel 3 — Solo' },
  { n: 4, mode: GAME_MODE.COOP, name: 'Nivel 4 — Co-op' },
  { n: 5, mode: GAME_MODE.COOP, name: 'Nivel 5 — Final' },
]);

// Generador de números pseudoaleatorios con seed (LCG) para variación determinista
// de niveles. Usado por buildLevel para elegir el bloque 1-Up de forma reproducible.
// Es un detalle de implementación de data/ pero expuesto para que levels.js lo use.
function seededRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export { seededRandom };

// Validadores para sanitizar datos del cliente (defensive programming).
export const validators = Object.freeze({
  isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
  },
  isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  },
  clamp(value, min, max) {
    if (typeof value !== 'number' || !isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
  },
  sanitizeString(value, maxLength = 100) {
    if (typeof value !== 'string') return '';
    return value.slice(0, maxLength).replace(/[<>]/g, '');
  },
});

// Controles por jugador (códigos de KeyboardEvent.code).
// El índice coincide con PLAYERS. Los gamepads se asignan por orden (pad 0 -> P1).
export const CONTROLS = Object.freeze([
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'] },       // P1: lado izquierdo del teclado
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'] },  // P2: flechas
]);

// --- HUD ---
export const HUD = Object.freeze({
  UPDATE_EVERY_FRAMES: 10, // actualiza el HUD cada N pasos de simulación
  SCORE_PAD: 5,
  COINS_PAD: 3,
  LEVEL_COINS_PAD: 2,
});
