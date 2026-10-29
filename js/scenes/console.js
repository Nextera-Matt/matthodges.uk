/* Console scene: wireframe instrument panel with a live scope trace. */

import { makeCamera, makeParticles, toneColors, PALETTE } from './shared.js';

export function createScene(THREE, ctx) {
  const { coarse } = ctx;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.04);
  const camera = makeCamera(THREE, 9, 0.3);
  const colors = toneColors(THREE, 'monitor');

  // Panel grid.
  const panelGeo = new THREE.PlaneGeometry(18, 10, 24, 14);
  const panel = new THREE.LineSegments(
    new THREE.WireframeGeometry(panelGeo),
    new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.green), transparent: true, opacity: 0.16 }),
  );
  panel.position.z = -2.5;
  scene.add(panel);

  // Scope trace.
  const POINTS = 140;
  const tracePos = new Float32Array(POINTS * 3);
  const traceGeo = new THREE.BufferGeometry();
  traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePos, 3));
  const trace = new THREE.Line(traceGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.cyan), transparent: true, opacity: 0.9 }));
  scene.add(trace);

  // Slow dials.
  const dials = [];
  [[-4.6, 1.8, 0.9], [4.8, 2.1, 0.7], [5.2, -2.0, 1.1]].forEach(([x, y, r], i) => {
    const dial = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.TorusGeometry(r, 0.02, 8, 48)),
      new THREE.LineBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.55 }),
    );
    dial.position.set(x, y, -1);
    scene.add(dial);
    dials.push(dial);
  });

  scene.add(makeParticles(THREE, coarse ? 70 : 140, { x: 9, y: 5, z: 3 }, colors, 0.07));

  function update(time, pointer) {
    const t = ctx.reduced ? 0 : time;
    for (let i = 0; i < POINTS; i++) {
      const x = (i / (POINTS - 1) - 0.5) * 15;
      const y = Math.sin(x * 0.7 + t * 1.4) * 0.55
        + Math.sin(x * 1.7 - t * 0.9) * 0.28
        + Math.sin(x * 3.4 + t * 2.2) * 0.1;
      tracePos[i * 3] = x;
      tracePos[i * 3 + 1] = y - 0.4;
      tracePos[i * 3 + 2] = 0;
    }
    traceGeo.attributes.position.needsUpdate = true;
    dials.forEach((dial, i) => {
      dial.rotation.z = t * (0.25 + i * 0.13) * (i % 2 ? -1 : 1);
    });
    panel.rotation.y = Math.sin(t * 0.07) * 0.05;
    camera.position.x += ((pointer.x * 0.7) - camera.position.x) * 0.03;
    camera.position.y += ((0.3 - pointer.y * 0.45) - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -1);
  }

  return { scene, camera, update };
}
