const assets = {
  marioSmall: { right: [], left: [] },
  marioBig: { right: [], left: [] },
  luigiSmall: { right: [], left: [] },  // P2 (co-op local)
  luigiBig: { right: [], left: [] },
  goomba: null,
  koopa: null,
  coin: null,
  mushroom: null,
  flower: null,
  star: null,
  flag: null,
};

// Dimensiones de sprite por entidad (px), en un solo lugar.
const SPRITE_SIZES = Object.freeze({
  playerSmall: [32, 36],
  playerBig: [36, 44],
  goomba: [30, 26],
  koopa: [34, 32],
  coin: [20, 20],
  powerup: [24, 30],
  star: [24, 24],
  flag: [40, 80],
});

// Convierte un SVG en un canvas pre-renderizado (rápido de dibujar en el loop).
// Si el entorno no soporta canvas o falla la carga, devuelve un fallback seguro.
function svgToSprite(svg, w, h) {
  return new Promise(resolve => {
    const img = new Image();
    const fallback = () => {
      if (typeof document !== 'undefined' && document.createElement) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        resolve(c); // transparente: no crashea drawImage si falló la carga
      } else {
        resolve(img);
      }
    };
    const renderToCanvas = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        if (typeof document !== 'undefined' && document.createElement) renderToCanvas();
        else resolve(img);
      } catch (e) { fallback(); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); fallback(); };
    img.src = url;
  });
}

// Espeja un sprite horizontalmente (para Mario mirando a la izquierda)
function flipSprite(sprite) {
  if (typeof document === 'undefined' || !document.createElement) return sprite;
  const c = document.createElement('canvas');
  c.width = sprite.width; c.height = sprite.height;
  const ctx = c.getContext('2d');
  ctx.translate(sprite.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0);
  return c;
}

// Carga los 4 frames de un jugador (mario/luigi, small/big) y espeja la vista izquierda.
// Muta los arrays existentes del objeto compartido (no los reemplaza).
async function loadPlayerSprites(key, { big, skin }) {
  const [w, h] = big ? SPRITE_SIZES.playerBig : SPRITE_SIZES.playerSmall;
  if (!assets[key]) assets[key] = { right: [], left: [] };
  const frames = await Promise.all(
    Array.from({ length: 4 }, (_, i) => svgToSprite(svgMario(i, big, skin), w, h))
  );
  for (const frame of frames) {
    assets[key].right.push(frame);
    assets[key].left.push(flipSprite(frame));
  }
}

async function initAssets() {
  // Mario (P1) y Luigi (P2): paleta verde para distinguir al segundo jugador.
  await Promise.all([
    loadPlayerSprites('marioSmall', { big: false, skin: 'mario' }),
    loadPlayerSprites('luigiSmall', { big: false, skin: 'luigi' }),
    loadPlayerSprites('marioBig', { big: true, skin: 'mario' }),
    loadPlayerSprites('luigiBig', { big: true, skin: 'luigi' }),
  ]);
  const singles = [
    ['goomba', svgGoomba()],
    ['koopa', svgKoopa()],
    ['coin', svgCoin()],
    ['mushroom', svgPowerup('mushroom')],
    ['flower', svgPowerup('flower')],
    ['star', svgStar()],
    ['flag', svgFlag()],
  ];
  await Promise.all(singles.map(async ([key, svg]) => {
    const [w, h] = SPRITE_SIZES[key] || SPRITE_SIZES.powerup;
    assets[key] = await svgToSprite(svg, w, h);
  }));
}

// Mario (paleta clásica) o Luigi (paleta verde, P2 del co-op),
// mirando a la derecha. La versión izquierda se obtiene espejando.
function svgMario(animFrame = 0, big = false, skin = 'mario') {
  const P = skin === 'luigi'
    ? { shirt: '#2e7d32', overol: '#1a237e' }   // Luigi: camisa verde
    : { shirt: '#d32f2f', overol: '#283593' };  // Mario: camisa roja
  const f = animFrame % 2;
  const legShift = f === 0 ? 0 : 2;
  const w = big ? 36 : 32, h = big ? 44 : 36;
  const red = P.shirt, skinC = '#ffcc99', blue = P.overol, shoe = '#5d4037', hair = '#4e342e';
  const torsoY = big ? 22 : 18;
  const legY = big ? 32 : 27;
  const shoeY = big ? 38 : 31;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <!-- gorra -->
      <rect x="9" y="1" width="15" height="5" rx="2" fill="${red}"/>
      <rect x="5" y="4" width="22" height="3.5" rx="1.5" fill="${red}"/>
      <!-- cara -->
      <rect x="8" y="7" width="16" height="${big ? 12 : 10}" rx="3" fill="${skinC}"/>
      <rect x="7" y="${big ? 9 : 8}" width="2.5" height="${big ? 8 : 7}" rx="1" fill="${hair}"/>
      <circle cx="14" cy="${big ? 12 : 11}" r="1.4" fill="#212121"/>
      <circle cx="20" cy="${big ? 12 : 11}" r="1.4" fill="#212121"/>
      <rect x="14" y="${big ? 15 : 14}" width="8" height="2" rx="1" fill="${hair}"/>
      <!-- torso: camisa roja + overol azul -->
      <rect x="${7 + legShift}" y="${torsoY}" width="${w - 14 - legShift}" height="${legY - torsoY}" rx="2" fill="${red}"/>
      <rect x="${10 + legShift}" y="${torsoY + 3}" width="${w - 20 - legShift}" height="${legY - torsoY - 3}" rx="1" fill="${blue}"/>
      <rect x="${11 + legShift}" y="${torsoY}" width="3" height="4" fill="${blue}"/>
      <rect x="${w - 17 - legShift}" y="${torsoY}" width="3" height="4" fill="${blue}"/>
      <circle cx="${13 + legShift}" cy="${torsoY + 4}" r="1.2" fill="#ffeb3b"/>
      <!-- brazos -->
      <rect x="2" y="${torsoY + 1}" width="6" height="${legY - torsoY - 2}" rx="2" fill="${red}"/>
      <rect x="${w - 8}" y="${torsoY + 1}" width="6" height="${legY - torsoY - 2}" rx="2" fill="${red}"/>
      <circle cx="5" cy="${legY - 1}" r="2.2" fill="${skinC}"/>
      <circle cx="${w - 5}" cy="${legY - 1}" r="2.2" fill="${skinC}"/>
      <!-- piernas y zapatos -->
      <rect x="${9 + legShift}" y="${legY}" width="5" height="${shoeY - legY}" rx="1.5" fill="${blue}"/>
      <rect x="${w - 15 + legShift}" y="${legY}" width="5" height="${shoeY - legY}" rx="1.5" fill="${blue}"/>
      <ellipse cx="${11 + legShift}" cy="${shoeY + 2}" rx="${big ? 6 : 5}" ry="2.5" fill="${shoe}"/>
      <ellipse cx="${w - 11 + legShift}" cy="${shoeY + 2}" rx="${big ? 6 : 5}" ry="2.5" fill="${shoe}"/>
    </svg>`;
}

function svgGoomba() {
  const w = 30, h = 26;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <ellipse cx="${w / 2}" cy="${h * 0.6}" rx="${w / 2 - 2}" ry="${h * 0.45}" fill="#7a5c2e"/>
      <rect x="2" y="3" width="${w - 4}" height="${h * 0.5}" rx="3" fill="#7a5c2e"/>
      <rect x="7" y="6" width="6" height="6" rx="1" fill="#fff"/>
      <rect x="${w - 13}" y="6" width="6" height="6" rx="1" fill="#fff"/>
      <circle cx="10" cy="8" r="1.6" fill="#000"/>
      <circle cx="${w - 11}" cy="8" r="1.6" fill="#000"/>
      <path d="M 8 ${h * 0.85} Q ${w / 2} ${h - 1} ${w - 8} ${h * 0.85}" stroke="#3a2a1a" stroke-width="1.5" fill="none"/>
      <rect x="0" y="${h * 0.55}" width="6" height="1.5" fill="#3a2a1a"/>
      <rect x="${w - 6}" y="${h * 0.55}" width="6" height="1.5" fill="#3a2a1a"/>
      <rect x="3" y="${h - 6}" width="7" height="5" rx="1" fill="#5a3a1a"/>
      <rect x="${w - 10}" y="${h - 6}" width="7" height="5" rx="1" fill="#5a3a1a"/>
    </svg>`;
}

function svgKoopa() {
  const w = 34, h = 32;
  const shellColor = '#ad3434';
  const shellRim = '#8a1f1f';
  const bodyColor = '#9a9a3a';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="5" y="${h - 9}" width="7" height="8" rx="2" fill="${bodyColor}"/>
      <rect x="${w - 12}" y="${h - 9}" width="7" height="8" rx="2" fill="${bodyColor}"/>
      <ellipse cx="${w / 2}" cy="${h * 0.5}" rx="${w / 2 - 2}" ry="${h * 0.4}" fill="${shellColor}"/>
      <ellipse cx="${w / 2}" cy="${h * 0.5}" rx="${w / 2 - 2}" ry="${h * 0.4}" fill="none" stroke="${shellRim}" stroke-width="2"/>
      <path d="M ${w / 2 - 10} ${h * 0.4} L ${w / 2 - 10} ${h * 0.6}" stroke="${shellRim}" stroke-width="2"/>
      <path d="M ${w / 2 + 10} ${h * 0.4} L ${w / 2 + 10} ${h * 0.6}" stroke="${shellRim}" stroke-width="2"/>
      <rect x="10" y="6" width="${w - 20}" height="${h * 0.45}" rx="4" fill="${bodyColor}"/>
      <rect x="14" y="8" width="6" height="6" rx="1" fill="#fff"/>
      <rect x="${w - 20}" y="8" width="6" height="6" rx="1" fill="#fff"/>
      <circle cx="17" cy="10" r="1.6" fill="#000"/>
      <circle cx="${w - 17}" cy="10" r="1.6" fill="#000"/>
      <rect x="17" y="12" width="6" height="1.5" fill="#5a3a1a"/>
    </svg>`;
}

function svgCoin() {
  const w = 20, h = 20;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="#ffd700"/>
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="#ffec80"/>
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 5}" ry="${h / 2 - 5}" fill="none" stroke="#b8860b" stroke-width="1"/>
      <text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" font-size="9" font-family="Arial" fill="#b8860b" font-weight="bold">★</text>
    </svg>`;
}

function svgPowerup(type = 'mushroom') {
  if (type === 'mushroom') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
        <rect x="7" y="14" width="10" height="5" rx="2" fill="#8b2a2a"/>
        <rect x="8" y="14" width="8" height="5" rx="2" fill="#fff"/>
        <rect x="9" y="10" width="10" height="12" rx="3" fill="#c8102e"/>
        <rect x="9" y="10" width="10" height="3" rx="3" fill="#ffeb3b"/>
        <circle cx="12" cy="18" r="2" fill="#fff"/>
        <circle cx="12" cy="12" r="1.5" fill="#000"/>
      </svg>`;
  }
  if (type === 'lifeup') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
        <path d="M12 2 L15 8 L22 9 L17 14 L19 21 L12 17 L5 21 L7 14 L2 9 L9 8 Z" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
        <text x="12" y="21" text-anchor="middle" font-size="9" font-family="Arial" fill="#fff" font-weight="bold">1</text>
      </svg>`;
  }
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
      <rect x="7" y="16" width="10" height="5" rx="2" fill="#8b2a2a"/>
      <rect x="8" y="16" width="8" height="5" rx="2" fill="#fff"/>
      <rect x="9" y="10" width="10" height="12" rx="3" fill="#c8102e"/>
      <g>
        <circle cx="12" cy="6" r="4" fill="#ff4d6d"/>
        <circle cx="8" cy="10" r="4" fill="#ff4d6d"/>
        <circle cx="16" cy="10" r="4" fill="#ff4d6d"/>
        <circle cx="10" cy="3" r="4" fill="#ff4d6d"/>
        <circle cx="14" cy="3" r="4" fill="#ff4d6d"/>
        <circle cx="12" cy="6" r="2" fill="#ffeb3b"/>
      </g>
    </svg>`;
}

function svgStar() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <polygon points="12,2 15,9 23,9 17,13 19,21 12,16 5,21 7,13 1,9 9,9" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>
    </svg>`;
}

function svgFlag() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="80" viewBox="0 0 40 80">
      <rect x="18" y="0" width="4" height="80" fill="#888"/>
      <rect x="0" y="0" width="20" height="14" fill="#ffeb3b"/>
      <circle cx="10" cy="7" r="3" fill="#b22222"/>
    </svg>`;
}

export { assets, initAssets };
