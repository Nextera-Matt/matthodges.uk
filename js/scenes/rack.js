/* Rack scene: server rows, status LEDs, packets hopping between racks. */

import { makeCamera, makeParticles, toneColors } from './shared.js';

export function createScene(THREE, ctx) {
  const { coarse, tone } = ctx;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.045);
  const camera = makeCamera(THREE, 9.5, 0.8);
  const colors = toneColors(THREE, tone);

  const group = new THREE.Group();
  scene.add(group);

  const rackPos = [];
  const rows = coarse ? 2 : 3;
  const cols = coarse ? 4 : 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rackPos.push(new THREE.Vector3((c - (cols - 1) / 2) * 1.9, (r - (rows - 1) / 2) * 2.1, -r * 1.6));
    }
  }

  const rackGeo = new THREE.BoxGeometry(1.25, 1.7, 0.8);
  const rackMat = new THREE.MeshBasicMaterial({ color: colors[0], wireframe: true, transparent: true, opacity: 0.32 });
  const racks = new THREE.InstancedMesh(rackGeo, rackMat, rackPos.length);
  const dummy = new THREE.Object3D();
  rackPos.forEach((pos, i) => {
    dummy.position.copy(pos);
    dummy.updateMatrix();
    racks.setMatrixAt(i, dummy.matrix);
  });
  group.add(racks);

  // Status LEDs on rack faces.
  const ledCount = rackPos.length * 5;
  const ledPos = new Float32Array(ledCount * 3);
  const ledCol = new Float32Array(ledCount * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < ledCount; i++) {
    const rack = rackPos[i % rackPos.length];
    ledPos[i * 3] = rack.x + (Math.random() - 0.5) * 0.9;
    ledPos[i * 3 + 1] = rack.y + (Math.random() - 0.5) * 1.3;
    ledPos[i * 3 + 2] = rack.z + 0.45;
    tmp.copy(colors[i % colors.length]);
    ledCol[i * 3] = tmp.r; ledCol[i * 3 + 1] = tmp.g; ledCol[i * 3 + 2] = tmp.b;
  }
  const ledGeo = new THREE.BufferGeometry();
  ledGeo.setAttribute('position', new THREE.BufferAttribute(ledPos, 3));
  ledGeo.setAttribute('color', new THREE.BufferAttribute(ledCol, 3));
  const ledMat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.Points(ledGeo, ledMat));

  // Packets hopping rack to rack.
  const PACKETS = coarse ? 14 : 26;
  const packetGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const packetMat = new THREE.MeshBasicMaterial({ color: colors[1], transparent: true, opacity: 0.95, depthWrite: false });
  const packetMesh = new THREE.InstancedMesh(packetGeo, packetMat, PACKETS);
  group.add(packetMesh);
  const packets = Array.from({ length: PACKETS }, () => ({
    a: Math.floor(Math.random() * rackPos.length),
    b: Math.floor(Math.random() * rackPos.length),
    t: Math.random(),
    speed: 0.25 + Math.random() * 0.45,
  }));

  group.add(makeParticles(THREE, coarse ? 80 : 160, { x: 9, y: 5, z: 3 }, colors, 0.07));

  function update(time, pointer) {
    const t = ctx.reduced ? 0 : time;
    group.rotation.y = Math.sin(t * 0.12) * 0.16;
    group.rotation.x = Math.sin(t * 0.09) * 0.05;
    ledMat.opacity = 0.65 + Math.sin(t * 2.2) * 0.3;

    packets.forEach((pkt, i) => {
      pkt.t += pkt.speed * 0.016;
      if (pkt.t > 1) {
        pkt.t = 0;
        pkt.a = pkt.b;
        pkt.b = Math.floor(Math.random() * rackPos.length);
      }
      dummy.position.lerpVectors(rackPos[pkt.a], rackPos[pkt.b], pkt.t);
      dummy.position.y += Math.sin(pkt.t * Math.PI) * 0.5;
      dummy.updateMatrix();
      packetMesh.setMatrixAt(i, dummy.matrix);
    });
    packetMesh.instanceMatrix.needsUpdate = true;

    camera.position.x += ((pointer.x * 0.8) - camera.position.x) * 0.03;
    camera.position.y += ((0.8 - pointer.y * 0.5) - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -1);
  }

  return { scene, camera, update };
}
