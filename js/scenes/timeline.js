/* Timeline scene: a career spine with pulsing year nodes. */

import { makeCamera, makeParticles, PALETTE } from './shared.js';

export function createScene(THREE, ctx) {
  const { coarse } = ctx;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.045);
  const camera = makeCamera(THREE, 9.5, 0.3);

  const group = new THREE.Group();
  scene.add(group);

  const spineX = -2.6;
  const spineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(spineX, -5.5, 0),
    new THREE.Vector3(spineX, 5.5, 0),
  ]);
  group.add(new THREE.Line(spineGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.green), transparent: true, opacity: 0.5 })));

  const YEARS = coarse ? 5 : 7;
  const nodes = [];
  const nodeGeo = new THREE.SphereGeometry(0.11, 12, 12);
  const tickGeo = new THREE.BufferGeometry();
  const tickPos = [];
  for (let i = 0; i < YEARS; i++) {
    const y = 4.2 - i * (8.4 / (YEARS - 1));
    const isCurrent = i === 0;
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(isCurrent ? PALETTE.cyan : PALETTE.green), transparent: true, opacity: 0.95 });
    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.set(spineX, y, 0);
    group.add(node);
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.TorusGeometry(0.3, 0.01, 8, 40)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(isCurrent ? PALETTE.cyan : PALETTE.green), transparent: true, opacity: 0.5 }),
    );
    ring.position.copy(node.position);
    group.add(ring);
    nodes.push({ node, ring, phase: i * 0.9 });
    tickPos.push(spineX, y, 0, spineX + 2.6 + (i % 2) * 1.4, y, 0);
  }
  tickGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tickPos), 3));
  group.add(new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.green), transparent: true, opacity: 0.25 })));

  group.add(makeParticles(THREE, coarse ? 60 : 120, { x: 9, y: 5, z: 3 }, [new THREE.Color(PALETTE.green), new THREE.Color(PALETTE.cyan)], 0.07));

  function update(time, pointer) {
    const t = ctx.reduced ? 0 : time;
    nodes.forEach(({ node, ring, phase }) => {
      const pulse = 1 + Math.sin(t * 1.8 + phase) * 0.25;
      node.scale.setScalar(pulse);
      ring.scale.setScalar(1 + Math.sin(t * 1.8 + phase) * 0.15);
      ring.rotation.x = t * 0.4 + phase;
      ring.rotation.y = t * 0.3;
    });
    group.position.y = Math.sin(t * 0.18) * 0.25;
    camera.position.x += ((pointer.x * 0.6) - camera.position.x) * 0.03;
    camera.position.y += ((0.3 - pointer.y * 0.4) - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  }

  return { scene, camera, update };
}
