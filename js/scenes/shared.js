/* Shared palette + small helpers for the procedural scenes. */

export const PALETTE = {
  green: '#4a9c6a',
  greenDeep: '#2c7a4b',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  red: '#d9534f',
  violet: '#8b5cf6',
  white: '#d9fbff',
};

export const TONES = {
  monitor: ['#4a9c6a', '#06b6d4', '#d9fbff'],
  alert: ['#f59e0b', '#d9534f', '#ffb15a'],
  network: ['#06b6d4', '#4a9c6a', '#d9fbff'],
  docs: ['#8b5cf6', '#06b6d4', '#d9fbff'],
  pipeline: ['#4a9c6a', '#f59e0b', '#06b6d4'],
};

export function toneColors(THREE, tone) {
  const names = TONES[tone] || TONES.monitor;
  return names.map((hex) => new THREE.Color(hex));
}

export function makeCamera(THREE, z = 9, y = 0.4) {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, y, z);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function makeParticles(THREE, count, spread, colors, size = 0.09) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * spread.x;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * spread.y;
    pos[i * 3 + 2] = (Math.random() * 2 - 1) * (spread.z || 2);
    tmp.copy(colors[i % colors.length]);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
