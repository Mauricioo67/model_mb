// ============================================================
// test/helpers/mock-env.mjs — Entorno DOM simulado para node:test.
// Los módulos del juego esperan window/document/navigator/performance.
// Este helper crea un entorno mínimo pero funcional: los elementos
// registran sus listeners de verdad, así touch.js se puede probar.
// ============================================================

// Contexto 2d nulo: registra llamadas pero no dibuja.
export function makeCtx() {
  return {
    clearRect: () => {},
    fillRect: () => {},
    fill: () => {},
    stroke: () => {},
    beginPath: () => {},
    arc: () => {},
    ellipse: () => {},
    moveTo: () => {},
    lineTo: () => {},
    strokeRect: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    setTransform: () => {},
    globalAlpha: 1,
    filter: 'none',
    fillText: () => {},
    textAlign: 'left',
    font: '',
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
  };
}

// Elemento DOM simulado con listeners y classList de verdad.
export function makeEl() {
  const listeners = {};
  return {
    listeners, // expuesto para disparar eventos desde los tests
    classList: {
      _set: new Set(),
      add(...c) { c.forEach(x => this._set.add(x)); },
      remove(...c) { c.forEach(x => this._set.delete(x)); },
      toggle(c, force) {
        const want = force === undefined ? !this._set.has(c) : !!force;
        want ? this._set.add(c) : this._set.delete(c);
        return want;
      },
      contains(c) { return this._set.has(c); },
    },
    style: {},
    textContent: '',
    src: '',
    width: 0,
    height: 0,
    pointerId: null,
    setPointerCapture(id) { this.pointerId = id; },
    releasePointerCapture() { this.pointerId = null; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter(f => f !== fn);
    },
    getContext: () => makeCtx(),
  };
}

// Dispara un evento sintético sobre un elemento simulado.
export function fire(el, type, props = {}) {
  for (const fn of el.listeners[type] || []) fn({ preventDefault: () => {}, ...props });
}

// Instala el entorno global simulado. Llamar antes de importar módulos.
// Devuelve { doc, canvas, elements, ctx, windowListeners } donde windowListeners
// permite disparar eventos de window (resize, orientationchange, ...).
export function installMockEnv({ touch = false } = {}) {
  const ctx = makeCtx();
  const canvas = Object.assign(makeEl(), { width: 800, height: 500, getContext: () => ctx });
  const elements = new Map(); // id -> elemento estable entre consultas
  const windowListeners = {};

  const doc = {
    getElementById: id => {
      if (id === 'c') return canvas;
      if (!elements.has(id)) elements.set(id, makeEl());
      return elements.get(id);
    },
    addEventListener: () => {},
    hidden: false,
    createElement: () => makeEl(),
    documentElement: makeEl(),
  };

  globalThis.window = {
    addEventListener: (type, fn) => { (windowListeners[type] ||= []).push(fn); },
    innerWidth: 800,
    innerHeight: 500,
    devicePixelRatio: 1,
    requestAnimationFrame: () => 0, // los tests deciden cuándo correr cada frame
    AudioContext: class {
      constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
      resume() {}
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: () => {}, start: () => {}, stop: () => {} }; }
      createGain() { return { gain: { value: 0, setTargetAtTime: () => {} }, connect: () => {} }; }
    },
    webkitAudioContext: null,
  };
  globalThis.document = doc;
  const vibrations = []; // spy: patrones enviados a navigator.vibrate
  const navigatorMock = {
    maxTouchPoints: touch ? 5 : 0,
    getGamepads: () => [],
    vibrate: pattern => { vibrations.push(pattern); return true; },
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: navigatorMock,
    configurable: true,
  });
  globalThis.Image = class {
    constructor() { this.onload = null; this.onerror = null; }
    set src(v) { if (this.onerror) queueMicrotask(() => this.onerror()); }
  };
  globalThis.Blob = class { constructor(parts, opts) { this.type = opts?.type || 'application/octet-stream'; } };
  globalThis.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
  globalThis.performance = { now: () => Date.now() };

  return { doc, canvas, elements, ctx, windowListeners, navigatorMock, vibrations };
}

// Dispara un evento de window capturado por installMockEnv.
export function fireWindow(env, type, props = {}) {
  fire({ listeners: env.windowListeners }, type, props);
}

// Borra los globals para aislar tests entre sí.
export function uninstallMockEnv() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.Image;
  delete globalThis.Blob;
  delete globalThis.URL;
  delete globalThis.performance;
  Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true });
}

// Importa un módulo del juego con cache busting para re-ejecutarlo por test.
export async function importFresh(relPath) {
  return import(`${SRC_BASE}${relPath}?t=${++importCounter}`);
}

export const SRC_BASE = 'file://' + new URL('../../src/', import.meta.url).pathname;
let importCounter = 0;
