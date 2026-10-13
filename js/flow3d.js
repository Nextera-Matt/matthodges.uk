/* ===== Infrastructure flow field — scroll-driven 3D journey =====
 * Fixed full-viewport canvas behind homepage content. Camera flies through
 * waypoint moods as sections scroll by (hero -> focus -> projects -> about
 * -> contact). Progressive enhancement: needs WebGL + CDN import; otherwise
 * the CSS fallback stays. Respects prefers-reduced-motion (one static frame,
 * no scroll reaction), pauses when tab hidden, caps DPR for perf.
 * No build step — loaded as ES module with importmap (three@0.160.0).
 */

const canvas = document.getElementById('flow3d');
if (!canvas) throw new Error('no canvas');

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = window.matchMedia('(pointer: coarse)').matches;

const THREE = await import('three');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 0.6, 11);

const COLORS = {
  node: new THREE.Color('#4a9c6a'),
  nodeHot: new THREE.Color('#06b6d4'),
  edge: new THREE.Color('#4a9c6a'),
  packet: new THREE.Color('#a7f3d0'),
  alert: new THREE.Color('#f59e0b'),
};

// ---- Graph layout: layered topo (edge -> core -> services) ----
const NODE_COUNT = isCoarse ? 42 : 72;
const nodes = [];
const layers = [-4.5, -1.5, 1.5, 4.5];
for (let i = 0; i < NODE_COUNT; i++) {
  const layer = layers[i % layers.length];
  nodes.push({
    base: new THREE.Vector3(
      layer + (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 5.2,
      (Math.random() - 0.5) * 3.0,
    ),
    phase: Math.random() * Math.PI * 2,
    speed: 0.25 + Math.random() * 0.5,
    hot: Math.random() < 0.18,
  });
}

// Edges: connect each node to 1–2 nearest neighbours for a mesh feel.
const edgePairs = [];
for (let i = 0; i < nodes.length; i++) {
  const dists = nodes
    .map((n, j) => ({ j, d: j === i ? Infinity : nodes[i].base.distanceTo(n.base) }))
    .sort((a, b) => a.d - b.d);
  edgePairs.push([i, dists[0].j]);
  if (i % 3 === 0) edgePairs.push([i, dists[1].j]);
}

// ---- Points (hosts) ----
const pos = new Float32Array(nodes.length * 3);
const col = new Float32Array(nodes.length * 3);
const nodeGeo = new THREE.BufferGeometry();
nodeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
nodeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
const nodeMat = new THREE.PointsMaterial({
  size: 0.11,
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  sizeAttenuation: true,
  depthWrite: false,
});
scene.add(new THREE.Points(nodeGeo, nodeMat));

// ---- Edges (checks) ----
const edgePos = new Float32Array(edgePairs.length * 2 * 3);
const edgeGeo = new THREE.BufferGeometry();
edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
const edgeMat = new THREE.LineBasicMaterial({
  color: COLORS.edge,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

// ---- Packets (traffic + occasional alert) ----
const PACKETS = isCoarse ? 22 : 40;
const packets = [];
const packetGeo = new THREE.SphereGeometry(0.05, 8, 8);
const packetMat = new THREE.MeshBasicMaterial({ color: COLORS.packet, transparent: true, opacity: 0.9, depthWrite: false });
const alertMat = new THREE.MeshBasicMaterial({ color: COLORS.alert, transparent: true, opacity: 0.95, depthWrite: false });
const packetMesh = new THREE.InstancedMesh(packetGeo, packetMat, PACKETS);
const alertMesh = new THREE.InstancedMesh(packetGeo, alertMat, 6);
scene.add(packetMesh, alertMesh);
for (let i = 0; i < PACKETS; i++) {
  packets.push({ edge: Math.floor(Math.random() * edgePairs.length), t: Math.random(), speed: 0.15 + Math.random() * 0.35 });
}
const alerts = Array.from({ length: 6 }, () => ({
  edge: Math.floor(Math.random() * edgePairs.length),
  t: Math.random(),
  speed: 0.25 + Math.random() * 0.3,
}));

const dummy = new THREE.Object3D();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function nodePos(i, out, time) {
  const n = nodes[i];
  out.copy(n.base);
  out.y += Math.sin(time * n.speed + n.phase) * 0.18;
  out.x += Math.cos(time * n.speed * 0.7 + n.phase) * 0.12;
  return out;
}

// ---- Scroll journey: section moods drive camera + scene targets ----
const MOODS = {
  hero:     { camZ: 11, camY: 0.6, rotY: 0, edge: 0.22, flow: 1.0, dim: 0.85 },
  focus:    { camZ: 9.5, camY: 0.2, rotY: 0.35, edge: 0.16, flow: 0.7, dim: 0.4 },
  projects: { camZ: 8, camY: -0.2, rotY: -0.3, edge: 0.3, flow: 1.5, dim: 0.5 },
  about:    { camZ: 9.5, camY: 0.1, rotY: 0.25, edge: 0.2, flow: 0.9, dim: 0.4 },
  contact:  { camZ: 11, camY: 0.6, rotY: 0, edge: 0.22, flow: 0.8, dim: 0.55 },
};
let target = { ...MOODS.hero };
const current = { ...MOODS.hero };

function sectionFor(el) {
  if (el.classList.contains('hero')) return 'hero';
  return el.id && MOODS[el.id] ? el.id : null;
}

if (!prefersReduced) {
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const mood = sectionFor(entry.target);
      if (mood) {
        target = { ...MOODS[mood] };
        document.body.dataset.mood = mood;
      }
    });
  }, { threshold: 0.25, rootMargin: '-20% 0px -20% 0px' });

  // Hero section has class .hero (not id); the rest are ids.
  document.querySelectorAll('main > section.hero, main section#focus, main section#projects, main section#about, main section#contact').forEach((el) => seen.observe(el));
}

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize, { passive: true });

// Mouse parallax (desktop only, subtle — text stays readable).
let mx = 0;
let my = 0;
if (!isCoarse && !prefersReduced) {
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

// Pause when tab hidden.
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

// External impulses (terminal commands, HUD events) temporarily push targets.
let impulse = null;
window.addEventListener('matt:flow-impulse', (e) => {
  impulse = { ...(e.detail || {}), until: performance.now() + 1200 };
});

const clock = new THREE.Clock();
let staticFrameRendered = false;

function tick() {
  requestAnimationFrame(tick);
  if (!visible) return;
  const time = clock.getElapsedTime();

  if (prefersReduced && staticFrameRendered) return;

  // Ease current mood toward target (and apply any short impulse).
  const k = prefersReduced ? 1 : 0.04;
  for (const key of ['camZ', 'camY', 'rotY', 'edge', 'flow', 'dim']) {
    let goal = target[key];
    if (impulse && performance.now() < impulse.until && impulse[key] !== undefined) goal = impulse[key];
    current[key] += (goal - current[key]) * k;
  }
  if (impulse && performance.now() >= impulse.until) impulse = null;

  const t = prefersReduced ? 0 : time;

  camera.position.x += ((mx * 0.7) - camera.position.x) * 0.03;
  camera.position.y += ((current.camY - my * 0.5) - camera.position.y) * 0.03;
  camera.position.z += (current.camZ - camera.position.z) * 0.03;
  camera.lookAt(0, 0, 0);
  camera.rotation.z += (current.rotY * 0.15 - camera.rotation.z) * 0.03;

  edgeMat.opacity = current.edge;
  canvas.style.setProperty('--flow-dim', current.dim.toFixed(3));

  const p = nodeGeo.attributes.position.array;
  const c = nodeGeo.attributes.color.array;
  for (let i = 0; i < nodes.length; i++) {
    nodePos(i, tmpA, t);
    p[i * 3] = tmpA.x; p[i * 3 + 1] = tmpA.y; p[i * 3 + 2] = tmpA.z;
    const col3 = nodes[i].hot ? COLORS.nodeHot : COLORS.node;
    c[i * 3] = col3.r; c[i * 3 + 1] = col3.g; c[i * 3 + 2] = col3.b;
  }
  nodeGeo.attributes.position.needsUpdate = true;
  nodeGeo.attributes.color.needsUpdate = true;

  const ep = edgeGeo.attributes.position.array;
  edgePairs.forEach(([a, b], idx) => {
    nodePos(a, tmpA, t); nodePos(b, tmpB, t);
    ep[idx * 6] = tmpA.x; ep[idx * 6 + 1] = tmpA.y; ep[idx * 6 + 2] = tmpA.z;
    ep[idx * 6 + 3] = tmpB.x; ep[idx * 6 + 4] = tmpB.y; ep[idx * 6 + 5] = tmpB.z;
  });
  edgeGeo.attributes.position.needsUpdate = true;

  const dt = prefersReduced ? 0 : 0.016 * current.flow;
  packets.forEach((pkt, i) => {
    pkt.t += pkt.speed * dt;
    if (pkt.t > 1) { pkt.t = 0; pkt.edge = Math.floor(Math.random() * edgePairs.length); }
    const [a, b] = edgePairs[pkt.edge];
    nodePos(a, tmpA, t); nodePos(b, tmpB, t);
    dummy.position.lerpVectors(tmpA, tmpB, pkt.t);
    dummy.updateMatrix();
    packetMesh.setMatrixAt(i, dummy.matrix);
  });
  packetMesh.instanceMatrix.needsUpdate = true;

  alerts.forEach((al, i) => {
    al.t += al.speed * dt;
    if (al.t > 1) { al.t = 0; al.edge = Math.floor(Math.random() * edgePairs.length); }
    const [a, b] = edgePairs[al.edge];
    nodePos(a, tmpA, t); nodePos(b, tmpB, t);
    dummy.position.lerpVectors(tmpA, tmpB, al.t);
    dummy.scale.setScalar(1.5);
    dummy.updateMatrix();
    dummy.scale.setScalar(1);
    alertMesh.setMatrixAt(i, dummy.matrix);
  });
  alertMesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
  staticFrameRendered = true;
}
tick();

// Terminal commands land in the scene with different signatures:
// busy commands surge the flows, info commands breathe, hiring is a party.
window.addEventListener('matt:terminal-command', (e) => {
  const cmd = (e.detail?.command || '').split(/\s+/)[0];
  const first = (e.detail?.command || '').split(/\s+/).slice(0, 2).join(' ');
  if (cmd === 'top' || cmd === 'htop' || cmd === 'ps') {
    window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { edge: 0.45, flow: 2.6, camZ: current.camZ - 1.2 } }));
  } else if (cmd === 'stats' || cmd === 'neofetch') {
    window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { edge: 0.4, flow: 2.0, camZ: current.camZ - 0.8 } }));
  } else if (cmd === 'uptime' || cmd === 'free' || cmd === 'df') {
    window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { edge: 0.3, flow: 1.4 } }));
  } else if (first === 'sudo hire' || cmd === 'hire') {
    window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { edge: 0.5, flow: 3.0, camZ: current.camZ - 1.6 } }));
  } else {
    window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { edge: 0.35, flow: 1.8 } }));
  }
});
