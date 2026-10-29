/* Flow scene: tracer flow field for the homepage journey. */

export function createScene(THREE, ctx) {
  const { canvas, reduced, coarse } = ctx;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0.4, 10);

  const COL = {
    slow: new THREE.Color('#2c7a4b'),
    mid: new THREE.Color('#4a9c6a'),
    fast: new THREE.Color('#06b6d4'),
    hot: new THREE.Color('#d9fbff'),
  };

  const COUNT = coarse ? 900 : 1900;
  const BOUNDS = { x: 11, y: 6.5, zMin: -7, zMax: 3 };
  const px = new Float32Array(COUNT);
  const py = new Float32Array(COUNT);
  const pz = new Float32Array(COUNT);
  const spd = new Float32Array(COUNT);
  const hue = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    px[i] = (Math.random() * 2 - 1) * BOUNDS.x;
    py[i] = (Math.random() * 2 - 1) * BOUNDS.y;
    pz[i] = BOUNDS.zMin + Math.random() * (BOUNDS.zMax - BOUNDS.zMin);
    spd[i] = 0.5 + Math.random();
    hue[i] = Math.random();
  }

  const vertPos = new Float32Array(COUNT * 2 * 3);
  const vertCol = new Float32Array(COUNT * 2 * 3);
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(vertPos, 3));
  streakGeo.setAttribute('color', new THREE.BufferAttribute(vertCol, 3));
  const streakMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.LineSegments(streakGeo, streakMat));

  function field(x, y, z, t, swirl, out) {
    const s = swirl;
    out.x = Math.sin(y * 0.55 + t * 0.50 * s) + Math.sin(z * 0.38 - t * 0.30 * s);
    out.y = Math.sin(z * 0.55 + t * 0.42 * s) + Math.sin(x * 0.38 + t * 0.34 * s);
    out.z = Math.sin(x * 0.55 - t * 0.46 * s) + Math.sin(y * 0.38 - t * 0.28 * s);
    return out;
  }
  const fv = { x: 0, y: 0, z: 0 };
  const tmpColor = new THREE.Color();

  function tint(speedNorm, offset, out) {
    const v = Math.min(1, Math.max(0, speedNorm * 0.75 + offset * 0.35));
    if (v < 0.5) out.copy(COL.slow).lerp(COL.mid, v * 2);
    else out.copy(COL.mid).lerp(COL.fast, (v - 0.5) * 2);
    if (v > 0.82) out.lerp(COL.hot, (v - 0.82) / 0.18);
    return out;
  }

  const MOODS = {
    hero:     { camZ: 10.5, camY: 0.4, camX: 0, roll: 0, fov: 55, speed: 1.0, swirl: 1.0, dim: 0.9 },
    focus:    { camZ: 8.0, camY: 0.1, camX: -0.8, roll: 0.03, fov: 58, speed: 0.8, swirl: 0.8, dim: 0.38 },
    projects: { camZ: 6.0, camY: -0.3, camX: 0.6, roll: -0.04, fov: 64, speed: 1.7, swirl: 1.4, dim: 0.48 },
    about:    { camZ: 8.5, camY: 0.3, camX: 1.0, roll: 0.05, fov: 56, speed: 0.9, swirl: 1.1, dim: 0.36 },
    contact:  { camZ: 11.5, camY: 0.6, camX: 0, roll: 0, fov: 52, speed: 0.6, swirl: 0.7, dim: 0.42 },
  };
  let target = { ...MOODS.hero };
  const current = { ...MOODS.hero };

  function sectionFor(el) {
    if (el.classList.contains('hero')) return 'hero';
    return el.id && MOODS[el.id] ? el.id : null;
  }

  if (!reduced) {
    const sections = [...document.querySelectorAll('main > section.hero, main section#focus, main section#projects, main section#about, main section#contact')];
    // Mood follows whichever section sits under the viewport midpoint, so a
    // tall hero cannot hold the HUD (or the camera) on "hero" while a later
    // section is what is actually being read.
    const pickMood = () => {
      const mid = window.innerHeight / 2;
      const currentEl = sections.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top <= mid && rect.bottom >= mid;
      });
      const mood = currentEl ? sectionFor(currentEl) : null;
      if (mood && document.body.dataset.mood !== mood) {
        target = { ...MOODS[mood] };
        document.body.dataset.mood = mood;
      }
    };
    window.addEventListener('scroll', pickMood, { passive: true });
    pickMood();
  }

  let energy = 0;
  if (!reduced) {
    let lastY = window.scrollY;
    let lastT = performance.now();
    window.addEventListener('scroll', () => {
      const now = performance.now();
      const dtMs = Math.max(16, now - lastT);
      const v = Math.abs(window.scrollY - lastY) / dtMs;
      energy = Math.min(2.2, energy + v * 1.4);
      lastY = window.scrollY;
      lastT = now;
    }, { passive: true });
  }

  let mx = 0;
  let my = 0;
  let gust = 0;
  if (!coarse && !reduced) {
    let lastPX = 0;
    let lastPY = 0;
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      const dx = e.clientX - lastPX;
      const dy = e.clientY - lastPY;
      gust = Math.min(1.5, gust + Math.hypot(dx, dy) / 220);
      lastPX = e.clientX;
      lastPY = e.clientY;
    }, { passive: true });
  }

  let impulse = null;
  window.addEventListener('matt:flow-impulse', (e) => {
    impulse = { ...(e.detail || {}), until: performance.now() + 1400 };
  });

  window.addEventListener('matt:terminal-command', (e) => {
    const cmd = (e.detail?.command || '').split(/\s+/)[0];
    const first = (e.detail?.command || '').split(/\s+/).slice(0, 2).join(' ');
    if (cmd === 'top' || cmd === 'htop' || cmd === 'ps') {
      energy = Math.min(2.2, energy + 1.4);
      window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { speed: 2.8, swirl: 1.8, camZ: current.camZ - 1.4 } }));
    } else if (cmd === 'stats' || cmd === 'neofetch') {
      energy = Math.min(2.2, energy + 1.0);
      window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { speed: 2.2, swirl: 1.5, camZ: current.camZ - 0.8 } }));
    } else if (cmd === 'uptime' || cmd === 'free' || cmd === 'df') {
      energy = Math.min(2.2, energy + 0.5);
      window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { speed: 1.5, swirl: 1.2 } }));
    } else if (first === 'sudo hire' || cmd === 'hire') {
      energy = 2.2;
      window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { speed: 3.2, swirl: 2.0, camZ: current.camZ - 1.8 } }));
    } else {
      energy = Math.min(2.2, energy + 0.7);
      window.dispatchEvent(new CustomEvent('matt:flow-impulse', { detail: { speed: 1.9, swirl: 1.3 } }));
    }
  });

  function update(time) {
    const k = reduced ? 1 : 0.045;
    for (const key of ['camZ', 'camY', 'camX', 'roll', 'fov', 'speed', 'swirl', 'dim']) {
      let goal = target[key];
      if (impulse && performance.now() < impulse.until && impulse[key] !== undefined) goal = impulse[key];
      current[key] += (goal - current[key]) * k;
    }
    if (impulse && performance.now() >= impulse.until) impulse = null;

    const t = reduced ? 0 : time;
    energy = Math.max(0, energy - energy * 0.06 - 0.004);
    gust = Math.max(0, gust - gust * 0.1 - 0.002);
    const flow = current.speed * (1 + energy * 0.9);

    camera.position.x += ((current.camX + mx * 0.9) - camera.position.x) * 0.03;
    camera.position.y += ((current.camY - my * 0.6) - camera.position.y) * 0.03;
    camera.position.z += (current.camZ - camera.position.z) * 0.03;
    camera.fov += (current.fov - camera.fov) * 0.03;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, -1);
    camera.rotation.z += (current.roll - camera.rotation.z) * 0.03;

    canvas.style.setProperty('--flow-dim', current.dim.toFixed(3));

    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z);
    const halfW = halfH * camera.aspect;
    const gx = mx * halfW;
    const gy = -my * halfH;

    const p = streakGeo.attributes.position.array;
    const c = streakGeo.attributes.color.array;
    const step = 2.1 * flow;

    for (let i = 0; i < COUNT; i++) {
      let x = px[i];
      let y = py[i];
      let z = pz[i];

      field(x, y, z, t, current.swirl, fv);
      let vx = fv.x;
      let vy = fv.y;
      let vz = fv.z * 0.6;

      if (gust > 0.01) {
        const dx = x - gx;
        const dy = y - gy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 9 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = (gust * 3.2 * (1 - d / 3)) / d;
          vx += dx * push;
          vy += dy * push;
        }
      }

      const mag = Math.hypot(vx, vy, vz) || 1;
      const v = (mag / 2.4) * spd[i];
      const nx = (vx / mag) * step * spd[i];
      const ny = (vy / mag) * step * spd[i];
      const nz = (vz / mag) * step * spd[i];

      x += nx * 0.016;
      y += ny * 0.016;
      z += nz * 0.016;

      if (x > BOUNDS.x) x = -BOUNDS.x; else if (x < -BOUNDS.x) x = BOUNDS.x;
      if (y > BOUNDS.y) y = -BOUNDS.y; else if (y < -BOUNDS.y) y = BOUNDS.y;
      if (z > BOUNDS.zMax) z = BOUNDS.zMin; else if (z < BOUNDS.zMin) z = BOUNDS.zMax;
      px[i] = x; py[i] = y; pz[i] = z;

      const streakLen = 0.25 + Math.min(1.6, v) * 0.9;
      const tx = x - (vx / mag) * streakLen;
      const ty = y - (vy / mag) * streakLen;
      const tz = z - (vz / mag) * streakLen;
      const o = i * 6;
      p[o] = x; p[o + 1] = y; p[o + 2] = z;
      p[o + 3] = tx; p[o + 4] = ty; p[o + 5] = tz;

      tint(v, hue[i], tmpColor);
      const bright = 0.55 + Math.min(1, energy) * 0.45;
      c[o] = tmpColor.r * bright; c[o + 1] = tmpColor.g * bright; c[o + 2] = tmpColor.b * bright;
      c[o + 3] = tmpColor.r * 0.04; c[o + 4] = tmpColor.g * 0.04; c[o + 5] = tmpColor.b * 0.04;
    }
    streakGeo.attributes.position.needsUpdate = true;
    streakGeo.attributes.color.needsUpdate = true;
  }

  return { scene, camera, update };
}
