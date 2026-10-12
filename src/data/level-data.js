// ============================================================
// data/level-data.js — Contenido de los niveles como DATOS.
// Modificar el mundo (suelo, huecos, bloques, monedas, enemigos,
// decoración) no requiere tocar ningún módulo de lógica: solo
// este archivo. La lógica de construcción vive en src/levels.js.
// ============================================================

export const TILE = 40;
export const GROUND_Y = 380;

// Segmentos de suelo del nivel base. Los huecos son el espacio
// libre entre segmentos consecutivos.
export const GROUND_SEGMENTS = [
  { x: 0, w: 520 },
  { x: 640, w: 320 },
  { x: 1060, w: 380 },
  { x: 1540, w: 280 },
  { x: 1920, w: 420 },
  { x: 2460, w: 380 },
  { x: 2960, w: 460 },
  { x: 3500, w: 420 },
  { x: 4020, w: 520 },
  { x: 4640, w: 420 },
  { x: 5160, w: 480 },
  { x: 5740, w: 420 },
  { x: 6260, w: 460 },
  { x: 6820, w: 1000 }, // tramo final hasta la bandera
];

// Bloques golpeables: `coin` da una moneda, `power` un power-up.
// x relativo al mundo; y relativo al suelo (nº de tiles hacia arriba).
export const BLOCKS = [
  { x: 320, yUp: 2, coin: true, power: null },
  { x: 520, yUp: 3, coin: false, power: 'mushroom' },
  { x: 660, yUp: 2, coin: true, power: null },
  { x: 760, yUp: 3, coin: false, power: 'flower' },
  { x: 1160, yUp: 2, coin: true, power: null },
  { x: 1210, yUp: 3, coin: false, power: 'mushroom' },
  { x: 1460, yUp: 2, coin: true, power: null },
  { x: 1520, yUp: 3, coin: false, power: 'flower' },
  { x: 1960, yUp: 2, coin: true, power: null },
  { x: 2010, yUp: 3, coin: false, power: 'mushroom' },
  { x: 2560, yUp: 2, coin: true, power: null },
  { x: 2620, yUp: 3, coin: false, power: 'flower' },
  { x: 3060, yUp: 2, coin: true, power: null },
  { x: 3120, yUp: 3, coin: false, power: 'mushroom' },
  { x: 3560, yUp: 2, coin: true, power: null },
  { x: 3610, yUp: 3, coin: false, power: 'flower' },
  { x: 4160, yUp: 2, coin: true, power: null },
  { x: 4210, yUp: 3, coin: false, power: 'mushroom' },
  { x: 4680, yUp: 2, coin: true, power: null },
  { x: 4710, yUp: 3, coin: false, power: 'flower' },
  { x: 5260, yUp: 2, coin: true, power: null },
  { x: 5310, yUp: 3, coin: false, power: 'mushroom' },
  { x: 5800, yUp: 2, coin: true, power: null },
  { x: 5840, yUp: 3, coin: false, power: 'flower' },
  { x: 6400, yUp: 2, coin: true, power: null },
  { x: 6440, yUp: 3, coin: false, power: 'mushroom' },
];

// Bloques que esconden una estrella según el nivel (a partir de N).
// Clave: x del bloque; valor: primer nivel en el que es estrella.
export const STAR_BLOCKS = Object.freeze([
  { blockX: 2620, fromLevel: 3 },
  { blockX: 4710, fromLevel: 5 },
]);

// Monedas fijas del nivel (x relativo al mundo).
export const COINS = [
  310, 480, 700, 1100, 1600, 2000, 2500, 3000,
  3500, 4100, 4700, 5200, 5800, 6300,
];

// Monedas extra que crecen con el nivel.
export const COIN_RAMP = Object.freeze({
  base: 6,       // monedas extra en nivel 1
  perLevel: 2,   // monedas extra por nivel adicional
  startX: 200,   // x de la primera
  spacing: 450,  // distancia entre monedas
  shiftPerLevel: 30, // desplazamiento x por nivel
  yUp: 3,        // altura en tiles sobre el suelo
});

// Cheeps: peces voladores que oscilan verticalmente.
// x,y son la posición base; amplitude y period son la oscilación.
export const CHEEPS = [
  { x: 900, y: GROUND_Y - 60, amplitude: 40, period: 100, dir: 1, speed: 0.8 },
  { x: 2000, y: GROUND_Y - 80, amplitude: 50, period: 120, dir: -1, speed: 1.0 },
  { x: 3500, y: GROUND_Y - 70, amplitude: 45, period: 110, dir: 1, speed: 0.9 },
  { x: 5000, y: GROUND_Y - 90, amplitude: 55, period: 130, dir: -1, speed: 1.1 },
];

// Pit blocks: bloques que al pisarlos abren un hueco temporalmente.
// Un jugador que pise uno de estos bloques cae al hueco si no salta rápido.
export const PIT_BLOCKS = [
  { x: 1100, yUp: 2, timer: 60 },  // 60 frames (~1 segundo) de hueco abierto
  { x: 2200, yUp: 2, timer: 80 },
  { x: 3800, yUp: 2, timer: 70 },
  { x: 5200, yUp: 2, timer: 90 },
];


// Goombas: posición, dirección inicial y velocidad.
export const GOOMBAS = [
  { x: 450, dir: 1, speed: 0.6 },
  { x: 850, dir: -1, speed: 0.8 },
  { x: 1250, dir: 1, speed: 0.7 },
  { x: 1550, dir: -1, speed: 0.5 },
  { x: 1850, dir: 1, speed: 0.9 },
  { x: 2250, dir: -1, speed: 0.6 },
  { x: 2650, dir: 1, speed: 0.7 },
  { x: 2950, dir: -1, speed: 0.8 },
  { x: 3350, dir: 1, speed: 0.6 },
  { x: 3650, dir: -1, speed: 0.7 },
  { x: 4050, dir: 1, speed: 0.9 },
  { x: 4450, dir: -1, speed: 0.5 },
  { x: 4850, dir: 1, speed: 0.8 },
  { x: 5450, dir: -1, speed: 0.7 },
  { x: 5750, dir: 1, speed: 0.6 },
  { x: 6150, dir: -1, speed: 0.9 },
];

// Koopas: posición, dirección inicial y velocidad.
export const KOOPAS = [
  { x: 700, dir: 1, speed: 0.8 },
  { x: 1600, dir: -1, speed: 0.7 },
  { x: 2400, dir: 1, speed: 0.9 },
  { x: 3100, dir: -1, speed: 0.6 },
  { x: 3800, dir: 1, speed: 0.8 },
  { x: 4500, dir: -1, speed: 0.7 },
  { x: 5300, dir: 1, speed: 0.9 },
  { x: 6100, dir: -1, speed: 0.6 },
];

// Parámetros de progresión del mundo.
export const WORLD = Object.freeze({
  BASE_LEN: 7000,      // largo del nivel 1
  LEN_PER_LEVEL: 400,  // largo extra por nivel
  FLAG_BASE_X: 6650,   // x de la bandera en el nivel 1
  FLAG_PER_LEVEL: 200, // desplazamiento de la bandera por nivel
  ENTITY_MARGIN: 10,   // margen al ajustar entidades fuera del suelo
  RIGHT_BOUND_PAD: 300, // límite derecho de movimiento (px tras la bandera)
});

// Rectángulo de detección de la bandera (fin de nivel).
export const FLAG = Object.freeze({ W: 40, H: 90 });

// Decoración: nubes en paralaje lejano (factor 0.2)...
export const CLOUDS = [
  { x: 200, y: 60, w: 80, h: 30 },
  { x: 500, y: 40, w: 100, h: 35 },
  { x: 900, y: 80, w: 70, h: 28 },
  { x: 1400, y: 50, w: 90, h: 32 },
  { x: 2000, y: 70, w: 85, h: 30 },
  { x: 2700, y: 45, w: 95, h: 34 },
  { x: 3400, y: 75, w: 80, h: 30 },
  { x: 4200, y: 55, w: 100, h: 36 },
  { x: 4900, y: 80, w: 75, h: 28 },
  { x: 5700, y: 60, w: 90, h: 32 },
  { x: 6300, y: 70, w: 85, h: 30 },
  { x: 7000, y: 50, w: 100, h: 34 },
];

// ...y colinas en paralaje cercano (factor 0.4).
export const HILLS = [
  { x: 0, w: 300, h: 80 },
  { x: 400, w: 400, h: 60 },
  { x: 900, w: 350, h: 90 },
  { x: 1400, w: 450, h: 70 },
  { x: 2000, w: 300, h: 85 },
  { x: 2500, w: 500, h: 65 },
  { x: 3200, w: 400, h: 80 },
  { x: 3800, w: 450, h: 70 },
  { x: 4500, w: 500, h: 90 },
  { x: 5200, w: 400, h: 75 },
  { x: 5900, w: 500, h: 85 },
  { x: 6600, w: 450, h: 70 },
];

// Colores de la escena (render).
export const PALETTE = Object.freeze({
  SKY: '#87ceeb',
  GROUND_TOP: '#3cb371',
  GROUND: '#6b8e23',
  HILL: '#7ec850',
  BLOCK: '#a0522d',
  BLOCK_USED: '#8a6a3a',
  BLOCK_EDGE: '#6b3410',
  BLOCK_GONE_FILL: '#888',
  BLOCK_GONE_ALPHA: 0.35,
  BLOCK_SHINE: 'rgba(255,255,255,0.2)',
  BLOCK_OUTLINE: 'rgba(0,0,0,0.2)',
  GROUND_LINE: 'rgba(0,0,0,0.15)',
  CLOUD: 'rgba(255,255,255,0.9)',
  COIN: '#ffd700',
  COIN_EDGE: '#b8860b',
  FLAG_STAR: '#ffeb3b',
  FLAG_TEXT: '#b22222',
});
