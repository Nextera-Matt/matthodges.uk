/* ===== Scene router — per-page 3D backgrounds =====
 * One fixed canvas, one scene per page type, chosen by body[data-scene]:
 * flow (home), rack (projects), console (tools), runbook (services),
 * timeline (CV). Scenes are procedural Three.js in js/scenes/; body[data-model]
 * is reserved for a future GLTF that can replace a scene if it earns its place.
 * Progressive enhancement: needs WebGL + CDN import, otherwise the CSS
 * fallback stays. Reduced motion renders one static frame. DPR is capped
 * and the loop pauses while the tab is hidden.
 */

const canvas = document.getElementById('flow3d');
if (!canvas) throw new Error('no canvas');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;

const THREE = await import('three');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
renderer.setClearColor(0x000000, 0);

const LOADERS = {
  flow: () => import('./scenes/flow.js'),
  rack: () => import('./scenes/rack.js'),
  console: () => import('./scenes/console.js'),
  runbook: () => import('./scenes/runbook.js'),
  timeline: () => import('./scenes/timeline.js'),
};

// Per-scene canvas opacity so foreground text stays readable.
const DIMS = { flow: 0.9, rack: 0.55, console: 0.5, runbook: 0.5, timeline: 0.45 };

const requested = document.body.dataset.scene || 'flow';
const sceneName = LOADERS[requested] ? requested : 'flow';
document.body.dataset.sceneActive = sceneName;

const ctx = {
  THREE,
  canvas,
  reduced,
  coarse,
  tone: document.body.dataset.tone || 'monitor',
  model: document.body.dataset.model || '',
};

let active = null;
try {
  const mod = await LOADERS[sceneName]();
  active = mod.createScene(THREE, ctx);
} catch (err) {
  if (sceneName === 'flow') throw err;
  console.warn(`scene "${sceneName}" failed, falling back to flow:`, err?.message || err);
  const mod = await LOADERS.flow();
  active = mod.createScene(THREE, ctx);
  document.body.dataset.sceneActive = 'flow';
}
// Flow sets --flow-dim itself per mood; the other scenes use a fixed dim.
if (document.body.dataset.sceneActive !== 'flow') {
  canvas.style.setProperty('--flow-dim', String(DIMS[document.body.dataset.sceneActive] || 0.55));
}

// Shared pointer for gentle parallax in the non-flow scenes.
const pointer = { x: 0, y: 0 };
if (!coarse && !reduced) {
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  if (active?.camera) {
    active.camera.aspect = w / h;
    active.camera.updateProjectionMatrix();
  }
}
resize();
window.addEventListener('resize', resize, { passive: true });

let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

const clock = new THREE.Clock();
let staticFrameRendered = false;

function tick() {
  requestAnimationFrame(tick);
  if (!visible || !active) return;
  if (reduced && staticFrameRendered) return;
  const time = reduced ? 0 : clock.getElapsedTime();
  active.update(time, pointer);
  renderer.render(active.scene, active.camera);
  staticFrameRendered = true;
}
tick();
