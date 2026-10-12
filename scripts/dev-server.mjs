// ============================================================
// scripts/dev-server.mjs — Servidor estático sin dependencias.
// Los ES modules no cargan por file:// (CORS en navegadores);
// este servidor sirve el proyecto por HTTP con los MIME correctos.
//
// Uso: npm run dev  (o: node scripts/dev-server.mjs [puerto])
// Muestra además la URL de la red local: abrila en el celular
// (misma WiFi) para probar los controles táctiles.
// ============================================================

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Primera dirección IPv4 privada de la red local (192.168.x.x / 10.x.x.x...).
function lanAddress() {
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filePath = normalize(join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✋ El puerto ${PORT} ya está en uso.`);
    console.error(`   Probá otro: npm run dev -- 8081\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Mario Bros — dev server`);
  console.log(`  Local:   http://localhost:${PORT}`);
  const lan = lanAddress();
  if (lan) {
    console.log(`  Red:     http://${lan}:${PORT}   ← abrila en el celular (misma WiFi)`);
  }
  console.log('Ctrl+C para detener.');
});
