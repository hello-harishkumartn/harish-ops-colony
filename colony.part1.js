ness: 0.35,
      emissive: color,
      emissiveIntensity: 0.15,
    })
  );
  body.position.y = 0.12;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3a4255,
      metalness: 0.65,
      roughness: 0.3,
    })
  );
  head.position.y = 0.28;
  g.add(head);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 1.2,
    })
  );
  eye.position.set(0, 0.29, 0.07);
  g.add(eye);
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.12, 5),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
  );
  ant.position.y = 0.4;
  g.add(ant);
  return g;
}

// ---- scene ----
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 14, 16);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minPolarAngle = Math.PI * 0.16;
controls.target.set(0, 0.6, 0);
controls.enablePan = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.update();

let ambLight, hemiLight, sunLight, fillLight, rimLight;
const groundGroup = new THREE.Group();
scene.add(groundGroup);
const colonyGroup = new THREE.Group();
scene.add(colonyGroup);

const bases = new Map();
let tileMeshes = [];
let currentTheme = localStorage.getItem('opsTheme') || 'desert';

function buildLights(theme) {
  if (ambLight) scene.remove(ambLight, hemiLight, sunLight, fillLight, rimLight);
  ambLight = new THREE.AmbientLight(0xffffff, theme.amb);
  hemiLight = new THREE.HemisphereLight(theme.hemi, theme.groundDark, 0.6);
  sunLight = new THREE.DirectionalLight(theme.sun, 1.25);
  sunLight.position.set(14, 24, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 65;
  sunLight.shadow.camera.left = -24;
  sunLight.shadow.camera.right = 24;
  sunLight.shadow.camera.top = 24;
  sunLight.shadow.camera.bottom = -24;
  sunLight.shadow.bias = -0.0002;
  fillLight = new THREE.DirectionalLight(theme.hemi, 0.32);
  fillLight.position.set(-12, 6, -10);
  rimLight = new THREE.PointLight(theme.sun, 0.45, 40);
  rimLight.position.set(-6, 8, 12);
  scene.add(ambLight, hemiLight, sunLight, fillLight, rimLight);
}

function disposeObject(obj) {
  obj.traverse?.((c) => {
    c.geometry?.dispose?.();
    if (c.material) {
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
      else {
        c.material.map?.dispose?.();
        c.material.dispose?.();
      }
    }
  });
}

function makeGroundTexture(theme) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 140);
  const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
  g.addColorStop(0, hex(theme.ground));
  g.addColorStop(1, hex(theme.groundDark));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // subtle noise
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.needsUpdate = true;
  return tex;
}

function buildGround(theme) {
  while (groundGroup.children.length) {
    const c = groundGroup.children[0];
    groundGroup.remove(c);
    disposeObject(c);
  }
  tileMeshes = [];

  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);

  const groundGeo = new THREE.CircleGeometry(50, 72);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: makeGroundTexture(theme),
    roughness: 0.94,
    metalness: 0.04,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  groundGroup.add(ground);

  const shape = makeHexShape(HEX_SIZE * 0.92);
  const extrude = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  extrude.rotateX(-Math.PI / 2);
  const tileMat = new THREE.MeshStandardMaterial({
    color: theme.tile,
    roughness: 0.72,
    metalness: 0.18,
  });

  const coords = [];
  for (let q = -6; q <= 6; q++) {
    for (let r = -6; r <= 6; r++) {
      if (Math.abs(q + r) > 6) continue;
      coords.push([q, r]);
    }
  }

  const inst = new THREE.InstancedMesh(extrude, tileMat, coords.length);
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  coords.forEach(([q, r], i) => {
    const p = hexToWorld(q, r);
    dummy.position.set(p.x, 0.02 + ((q * 17 + r * 31) % 7) * 0.006, p.z);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });
  inst.instanceMatrix.needsUpdate = true;
  groundGroup.add(inst);
  tileMeshes.push(inst);

  const rockGeo = new THREE.DodecahedronGeometry(0.32, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: theme.groundDark,
    roughness: 0.88,
    metalness: 0.15,
  });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rad = 15 + (i % 3) * 1.3;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(Math.cos(a) * rad, 0.18, Math.sin(a) * rad);
    rock.scale.setScalar(0.55 + (i % 4) * 0.22);
    rock.rotation.set(i, i * 0.5, i * 0.3);
    rock.castShadow = true;
    groundGroup.add(rock);
  }
}

function buildBase(agent, deskColor, q, r) {
  const color = COLORS[deskColor] ?? COLORS.sand;
  const group = new THREE.Group();
  const pos = hexToWorld(q, r);
  group.position.copy(pos);

  const { root, pad, ring, eye, tip, chest, glow } = makeRobot(color, !!agent.primary);
  // scale primary a bit larger
  if (agent.primary) root.scale.setScalar(1.12);
  group.add(root);

  const units = [];
  for (let i = 0; i < 2; i++) {
    const u = makeCompanion(color);
    u.position.set((i - 0.5) * 0.45, 0.28, 0.85);
    u.userData = { phase: Math.random() * Math.PI * 2, radius: 0.7 + i * 0.12, speed: 0.85 + i * 0.25 };
    group.add(u);
    units.push(u);
  }

  const sprite = makeLabelSprite(agent.short || agent.name, color);
  group.add(sprite);

  group.userData = {
    id: agent.id,
    agent,
    deskColor,
    color,
    eye,
    tip,
    chest,
    glow,
    rin