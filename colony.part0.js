import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLORS = {
  teal: 0x2dd4bf,
  yellow: 0xfbbf24,
  green: 0x4ade80,
  pink: 0xfb7185,
  blue: 0x60a5fa,
  sand: 0xe8c48a,
};

const THEMES = {
  desert: {
    fog: 0xc4a574, fogNear: 30, fogFar: 98,
    ground: 0xb8894a, groundDark: 0x8a6230,
    tile: 0x9a7040, sky: 0x1a1008, hemi: 0xffe0b0, sun: 0xffd090, amb: 0.42,
  },
  ocean: {
    fog: 0x0a4a68, fogNear: 32, fogFar: 105,
    ground: 0x0c5a78, groundDark: 0x063848,
    tile: 0x0e6a88, sky: 0x02131f, hemi: 0xa0e8ff, sun: 0x88d0ff, amb: 0.48,
  },
  forest: {
    fog: 0x1a4020, fogNear: 28, fogFar: 92,
    ground: 0x2a5a32, groundDark: 0x163820,
    tile: 0x326a3a, sky: 0x0a140c, hemi: 0xb8f0c0, sun: 0xd0ffb0, amb: 0.46,
  },
  sky: {
    fog: 0x87b8e8, fogNear: 38, fogFar: 115,
    ground: 0x6a9ccc, groundDark: 0x4a7aaa,
    tile: 0x7aacc8, sky: 0x3d6aaa, hemi: 0xffffff, sun: 0xfff8e0, amb: 0.62,
  },
  city: {
    fog: 0x1a1030, fogNear: 26, fogFar: 88,
    ground: 0x181428, groundDark: 0x0c0a18,
    tile: 0x221a38, sky: 0x050510, hemi: 0xc8a0ff, sun: 0x22d3ee, amb: 0.32,
  },
};

const HEX_SIZE = 1.15;

function hexToWorld(q, r) {
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const z = HEX_SIZE * 1.5 * r;
  return new THREE.Vector3(x, 0, z);
}

function makeHexShape(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function makeHexRing(radius, color, y = 0.04) {
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.userData.pulse = true;
  return line;
}

function makeLabelSprite(text, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(8,8,14,0.78)';
  roundRect(ctx, 8, 12, 240, 40, 12);
  ctx.fill();
  ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 2;
  roundRect(ctx, 8, 12, 240, 40, 12);
  ctx.stroke();
  ctx.fillStyle = '#f5f0e6';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 18), 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.0, 0.5, 1);
  spr.position.y = 2.35;
  return spr;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Elegant mini robot: pad + neon ring + body/head/antenna/eye + companion units */
function makeRobot(color, primary) {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x2a3140,
    metalness: 0.82,
    roughness: 0.28,
  });
  const metalDark = new THREE.MeshStandardMaterial({
    color: 0x161a24,
    metalness: 0.75,
    roughness: 0.35,
  });
  const accent = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: primary ? 0.55 : 0.28,
    metalness: 0.55,
    roughness: 0.3,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: color,
    emissiveIntensity: primary ? 1.6 : 1.1,
    metalness: 0.2,
    roughness: 0.2,
  });

  // raised hex pad
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.02, 0.16, 6),
    metalDark
  );
  pad.position.y = 0.18;
  pad.castShadow = true;
  pad.receiveShadow = true;
  root.add(pad);

  const ring = makeHexRing(1.02, color, 0.28);
  root.add(ring);

  // soft glow disc under feet
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: primary ? 0.28 : 0.14,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.27;
  root.add(glow);

  // hips / pelvis
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.14, 10), metal);
  hips.position.y = 0.42;
  hips.castShadow = true;
  root.add(hips);

  // torso capsule-ish (cylinder + rounded top)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.55, 12),
    metal
  );
  torso.position.y = 0.78;
  torso.castShadow = true;
  root.add(torso);

  // chest light strip
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.08, 0.08),
    accent
  );
  chest.position.set(0, 0.88, 0.28);
  root.add(chest);

  // shoulders
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), metal);
    shoulder.position.set(sx * 0.34, 0.98, 0);
    shoulder.castShadow = true;
    root.add(shoulder);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.38, 8), metal);
    arm.position.set(sx * 0.42, 0.72, 0.05);
    arm.rotation.z = sx * 0.25;
    arm.castShadow = true;
    root.add(arm);
  }

  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), metalDark);
  neck.position.y = 1.12;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), metal);
  head.position.y = 1.32;
  head.castShadow = true;
  root.add(head);

  // visor / face plate
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.06),
    metalDark
  );
  visor.position.set(0, 1.32, 0.18);
  root.add(visor);

  // glowing eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), eyeMat);
  eye.position.set(0, 1.33, 0.22);
  root.add(eye);

  // antenna
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.38, 6),
    accent
  );
  ant.position.set(0.08, 1.62, -0.02);
  root.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
  tip.position.set(0.08, 1.82, -0.02);
  root.add(tip);

  // legs
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 8), metalDark);
    leg.position.set(sx * 0.12, 0.28, 0.02);
    leg.castShadow = true;
    root.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.16), metal);
    foot.position.set(sx * 0.12, 0.14, 0.04);
    root.add(foot);
  }

  // "core" reference = eye for pulse
  root.userData.eye = eye;
  root.userData.tip = tip;
  root.userData.chest = chest;
  root.userData.glow = glow;
  root.userData.accentMats = [accent, eyeMat];

  return { root, pad, ring, eye, tip, chest, glow };
}

function makeCompanion(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.07, 0.1, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x2a3140,
      metalness: 0.7,
      rough