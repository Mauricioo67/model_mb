# 🍄 Mario Bros — Niveles

Juego tipo plataformas tipo Mario en el navegador, escrito en JavaScript vanilla bajo módulos ES. Incluye:

- Co-op local para dos jugadores (teclado + gamepad + táctil).
- Motor de simulación en timestep fijo (60 Hz).
- Niveles con generación deterministica por semilla.
- Power-ups (champiñón, flor, estrella, 1-Up).
- Enemigos (Goomba, Koopa) y caparazón.
- Sonidos sintetizados por Web Audio (sin archivos externos).
- Sprites SVG procedurales.
- High score persistente en `localStorage` con validación.
- Sistema de partículas, caché de segmentos visibles y minimap.

## Estructura de archivos

```
src/
  app.js                Composition root / game loop
  assets.js             Carga de sprites (SVG -> canvas)
  camera.js             Cámara suavizada con límites del nivel
  entities.js           Monedas, power-ups, enemigos y caparazón
  input.js              Teclado, gamepad y táctil
  physics.js            Colisiones y sólidos
  player.js             Movimiento, salto e integración
  render.js             Dibujo de la escena y minimap
  touch.js              Controles táctiles co-op
  audio.js              Sonido sintetizado
  haptics.js            Vibración móvil
  refs.js               Referencias DOM centralizadas
  particles.js          Sistema de partículas
  core/
    constants.js         Constantes del loop y vista
    state.js            Estado compartido del juego
  data/
    tuning.js           Balance, FX, power-ups, HUD y validadores
    level-data.js       Constantes y piezas del mundo
    levels.js           Generación y validación de niveles
index.html
README.md
test/
  unit.mjs              Pruebas unitarias (node:test)
scripts/
  dev-server.mjs        Servidor de desarrollo
```

## Tecnologías y decisiones clave

- **Fixed timestep**: la simulación avanza a 60 Hz independientemente de la tasa de refresco.
- **Defensive programming**: validación temprana de nivel, sanitización de high score, null-safety en módulos de efectos.
- **Responsabilidad única por módulo**: la lógica de juego no toca el DOM; el render no modifica estado de simulación.
- **Accesibilidad táctil**: multitouch por botón, `pointer capture`, prevención de scroll/zoom.

## Mejoras implementadas

Sección de roadmap histórico (para contexto de estado actual):

- Modo single-player + co-op con pantalla de selección inicial.
- Partículas con comportamientos FALL, BOUNCE, EXPLOSION y SPARKLE.
- High score persistente con validación (`validators.isNonNegativeInteger`).
- Feedback visual: flash blanco al recibir daño.
- Caché de segmentos visibles por posición de cámara en el render.
- Sonido de fondo que cambia por nivel.
- UI de pausa táctil y reanudación al rotar el dispositivo.

## Pendiente (roadmap)

- Nuevos tipos de enemigo (por ejemplo Cheep Cheep volador).
- Bloques "pit" que se abren al pisarlos.
- Power-up multiplicador de puntuación.
- Pooling de partículas para evitar allocs en el loop.
- Menú de pausa extendido: reiniciar nivel, volver al menú, volumen.
- Combo visual mejorado (texto flotante).
- Bonus por recolectar todas las monedas sin perder vidas.
- Más capas de parallax (árboles, estrellas).
- Internacionalización: español + inglés.
- Menú de pausa con más opciones.
- Tutoriales introductorios.
- Ajuste de volumen UI.
- Sistema de log de errores básico para depuración.
- Pruebas de rendimiento / memory leak.
- CI con GitHub Actions.
- Screenshots/gifs en README.

## Ejecución

Desarrollo local:

```bash
npm run dev
```

Pruebas:

```bash
npm test
```

Si `npm test` es lento, se puede ejecutar solo el smoke:

```bash
node test/run_check.mjs
```

Unitario:

```bash
node --test test/unit.mjs
```

## Licencia

Proyecto educativo/hobby. Sprites y música son sintéticos (no se incluyen recursos con derechos).
