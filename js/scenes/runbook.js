/* Runbook scene: three orbiting rings with stepping markers. */

import { makeCamera, makeParticles, PALETTE } from './shared.js';

export function createScene(THREE, ctx) {
  const { coarse } = ctx;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.04);
  const camera = makeCamera(THREE, 9.5, 0.5);

  const ringDefs = [
    { radius: 2.1, color: PALETTE.green, speed: 0.5, tilt: 0.5 },
    { radius: 3.0, color: PALETTE.cyan, speed: -0.35, tilt: -0.35 },
    { radius: 3.9, color: PALETTE.amber, speed: 0.22, tilt: 0.9 },
  ];
  const rings = [];
  const markerGeo = new THREE.SphereGeometry(0.09, 10, 10);

  ringDefs.forEach((def) => {
    const group = new THREE.Group();
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.TorusGeometry(def.radius, 0.015, 8, 96)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(def.color), transparent: true, opacity: 0.6 }),
    );
    group.add(ring);
    const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color) }));
    group.add(marker);
    group.rotation.x = def.tilt;
    scene.add(group);
    rings.push({ group, marker, ...def });
  });

  const core = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]),
    new THREE.PointsMaterial({ color: new THREE.Color(PALETTE.white), size: 0.22, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(core);
  scene.add(makeParticles(THREE, coarse ? 70 : 130, { x: 9, y: 5, z: 3 }, [new THREE.Color(PALETTE.green), new THREE.Color(PALETTE.cyan), new THREE.Color(PALETTE.amber)], 0.07));

  function update(time, pointer) {
    const t = ctx.reduced ? 0 : time;
    rings.forEach((ring, i) => {
      // Steps rather than glides: the marker ticks around like a checklist.
      const stepped = Math.floor(t * ring.speed * 3) / 3 + (t * ring.speed * 0.15);
      ring.marker.position.set(Math.cos(stepped * Math.PI * 2) * ring.radius, Math.sin(stepped * Math.PI * 2) * ring.radius, 0);
      ring.group.rotation.z = t * 0.05 * (i % 2 ? -1 : 1);
    });
    camera.position.x += ((pointer.x * 0.7) - camera.position.x) * 0.03;
    camera.position.y += ((0.5 - pointer.y * 0.45) - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  }

  return { scene, camera, update };
}
