g,
    units,
    sprite,
    primary: !!agent.primary,
  };
  group.traverse((c) => { c.userData.agentId = agent.id; });
  colonyGroup.add(group);

  bases.set(agent.id, {
    group,
    eye,
    tip,
    chest,
    glow,
    ring,
    units,
    sprite,
    color,
    status: agent.status || 'idle',
    primary: !!agent.primary,
  });

  pad.userData.agentId = agent.id;
}

const LAYOUT = {
  pa: [0, 0],
  ccw: [-2, -1], cms: [-3, 0], crd: [-2, 0],
  pms: [2, -2], arm: [3, -2], prm: [3, -1], prr: [2, -1],
  gms: [-2, 2], itm: [-3, 2], ith: [-3, 1], pw: [-1, 2],
  cha: [2, 1], cr: [3, 0], fa: [2, 2], ith2: [1, 2],
  wp: [0, -2], aie: [1, -2], ffu: [-1, -1],
  tc: [0, 2], ls: [1, 1], pih: [-1, 1], es: [0, -3],
};

function clearColony() {
  while (colonyGroup.children.length) {
    const g = colonyGroup.children[0];
    colonyGroup.remove(g);
    disposeObject(g);
  }
  bases.clear();
}

function buildColonyFromStatus(data) {
  clearColony();
  for (const desk of data.desks || []) {
    for (const agent of desk.agents || []) {
      const [q, r] = LAYOUT[agent.id] || [0, 0];
      buildBase(agent, desk.color || 'sand', q, r);
    }
  }
  for (const agent of data.standalone || []) {
    const [q, r] = LAYOUT[agent.id] || [0, 0];
    buildBase(agent, agent.color || 'sand', q, r);
  }
}

function applyTheme(name) {
  currentTheme = name;
  localStorage.setItem('opsTheme', name);
  document.documentElement.setAttribute('data-theme', name === 'city' ? 'city' : name);
  const theme = THEMES[name] || THEMES.desert;
  buildLights(theme);
  buildGround(theme);
  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.theme === name);
  });
}

function renderRoutines(list) {
  const el = document.getElementById('routines');
  el.innerHTML = (list || []).map((r) => `
    <div class="routine">
      <div class="row">
        <span class="name">${esc(r.name)}</span>
        <span class="pill ${esc(r.status)}">${esc(r.status)}</span>
      </div>
      <div class="sched">${esc(r.schedule)} · ${esc(r.tag || '')}</div>
    </div>
  `).join('');
}

function renderActivity(list) {
  const el = document.getElementById('activity');
  el.innerHTML = (list || []).map((a) => `
    <div class="act ${esc(a.color || '')}">
      <div class="t">${esc(a.time)}</div>
      <div class="b">${a.body}</div>
    </div>
  `).join('');
}

function updateMudrex(m) {
  const chip = document.getElementById('mudrexChip');
  if (!m) { chip.textContent = 'Mudrex —'; return; }
  const book = m.book || '—';
  chip.textContent = `Mudrex ${Number(m.balanceUsdt).toFixed(2)} USDT · ${book}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function syncAgentStatus(data) {
  const byId = {};
  for (const desk of data.desks || []) {
    for (const a of desk.agents || []) byId[a.id] = a;
  }
  for (const a of data.standalone || []) byId[a.id] = a;

  for (const [id, base] of bases) {
    const a = byId[id];
    if (!a) continue;
    base.status = a.status || 'idle';
    const active = base.status === 'active' || base.status === 'watching';
    if (base.eye?.material) {
      base.eye.material.emissiveIntensity = active ? 2.0 : (base.primary ? 1.5 : 1.0);
    }
    if (base.glow?.material) {
      base.glow.material.opacity = active ? 0.4 : (base.primary ? 0.28 : 0.14);
    }
  }
}

async function poll() {
  const chip = document.getElementById('pollChip');
  const label = document.getElementById('pollLabel');
  try {
    const res = await fetch('./status.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (bases.size === 0) buildColonyFromStatus(data);
    else syncAgentStatus(data);
    renderRoutines(data.routines);
    renderActivity(data.activity);
    updateMudrex(data.mudrex);
    chip.classList.add('live');
    chip.classList.remove('err');
    const t = data.refreshedAt || new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Calcutta' });
    label.textContent = `live · ${t}`;
    document.getElementById('refreshMeta').textContent =
      `${data.agentCount || bases.size} robots · status.json every 30s · refreshed ${t}`;
  } catch (e) {
    chip.classList.remove('live');
    chip.classList.add('err');
    label.textContent = 'poll failed';
  }
}

// ---- mobile panel toggles ----
function setPanel(name, open) {
  document.body.classList.toggle(`panel-${name}-open`, open);
  document.querySelectorAll(`.fab[data-panel="${name}"]`).forEach((b) => {
    b.classList.toggle('on', open);
  });
}

document.querySelectorAll('.fab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.panel;
    const isOpen = document.body.classList.contains(`panel-${name}-open`);
    // close the other panel so mobile view stays clean
    if (!isOpen) {
      setPanel('routines', false);
      setPanel('activity', false);
    }
    setPanel(name, !isOpen);
  });
});

document.querySelectorAll('.panel-close').forEach((btn) => {
  btn.addEventListener('click', () => setPanel(btn.dataset.close, false));
});

// hide orbit hint after first interaction
const hint = document.getElementById('orbitHint');
let hintGone = false;
function hideHint() {
  if (hintGone) return;
  hintGone = true;
  if (hint) hint.style.opacity = '0';
  setTimeout(() => hint?.remove(), 400);
}
canvas.addEventListener('pointerdown', hideHint, { once: true });
setTimeout(hideHint, 8000);

// ---- tooltip ----
const tip = document.getElementById('tip');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener('pointermove', (ev) => {
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(colonyGroup.children, true);
  let id = null;
  if (hits[0]) {
    let o = hits[0].object;
    while (o) {
      if (o.userData?.id) { id = o.userData.id; break; }
      if (o.userData?.agentId) { id = o.userData.agentId; break; }
      o = o.parent;
    }
  }
  if (!id) { tip.style.display = 'none'; return; }
  const base = bases.get(id);
  if (!base) { tip.style.display = 'none'; return; }
  const ag = base.group.userData.agent;
  tip.style.display = 'block';
  tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 280) + 'px';
  tip.style.top = Math.min(ev.clientY + 14, window.innerHeight - 120) + 'px';
  tip.innerHTML = `<strong>${esc(ag.name)}</strong>${esc(ag.detail || '')}<div class="meta">${esc(ag.status)} · ${esc(ag.next || '')}</div>`;
});
canvas.addEventListener('pointerleave', () => { tip.style.display = 'none'; });

document.getElementById('themeSwitch').addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  applyTheme(btn.dataset.theme);
});

const clock = new THREE.Clock();
let camDrift = 0;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  camDrift += 0.0002;
  controls.target.x += Math.sin(camDrift) * 0.0008;
  controls.update();

  for (const [, base] of bases) {
    const active = base.status === 'active' || base.status === 'watching';
    const pulse = 0.85 + Math.sin(t * (active ? 3.4 : 1.5) + base.group.position.x) * (active ? 0.35 : 0.12);
    if (base.ring?.material) base.ring.material.opacity = pulse;

    // Harish