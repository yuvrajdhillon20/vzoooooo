// ui.js — All UI management for Virtual Zoo
// Handles: info panel, HUD bar, nav dots, controls bar, mini graph, panel transitions

import { WAYPOINTS, NUM_STAGES } from './waypoints.js';
import { jumpToStage, startAutoPlay, stopAutoPlay, isAutoPlaying } from './scroll.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initUI(callbacks = {}) {
  buildNavDots();
  buildVeilBeginBtn(callbacks);
  setupControls(callbacks);
  setupPanelClose();
}

function buildNavDots() {
  const container = $('nav-dots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < NUM_STAGES; i++) {
    const wp = WAYPOINTS[i];
    const item = document.createElement('div');
    item.className = 'nav-dot-item';

    const label = document.createElement('span');
    label.className = 'nav-dot-label';
    label.textContent = `${i + 1} — ${wp.zone.split(' ').slice(-2).join(' ')}`;

    const dot = document.createElement('button');
    dot.className = 'nav-dot';
    dot.setAttribute('data-index', i);
    dot.setAttribute('aria-label', wp.zone);
    dot.addEventListener('click', () => jumpToStage(i));

    item.appendChild(label);
    item.appendChild(dot);
    container.appendChild(item);
  }
}

function buildVeilBeginBtn(callbacks) {
  const btn = $('begin-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const veil = $('veil');
    veil.style.opacity = '0';
    veil.style.pointerEvents = 'none';
    setTimeout(() => { veil.style.display = 'none'; }, 1100);

    $('controls-bar').classList.add('visible');
    $('info-panel').classList.add('visible');
    $('hud-bar').classList.add('visible');
    $('nav-dots').classList.add('visible');
    $('fps-counter').classList.add('visible');

    if (callbacks.onBegin) callbacks.onBegin();
  });
}

function setupControls(callbacks) {
  const soundBtn     = $('sound-btn');
  const freeroamBtn  = $('freeroam-btn');
  const experienceBtn = $('experience-btn');
  const daynightBtn  = $('daynight-btn');

  soundBtn?.addEventListener('click', () => {
    const on = soundBtn.dataset.state !== 'off';
    soundBtn.dataset.state = on ? 'off' : 'on';
    soundBtn.querySelector('.ctrl-text').textContent = on ? 'SOUND OFF' : 'SOUND ON';
    if (callbacks.onSoundToggle) callbacks.onSoundToggle(!on);
  });

  daynightBtn?.addEventListener('click', () => {
    if (callbacks.onDayNightToggle) callbacks.onDayNightToggle();
  });

  freeroamBtn?.addEventListener('click', () => {
    if (callbacks.onFreeRoam) callbacks.onFreeRoam();
  });

  experienceBtn?.addEventListener('click', () => {
    if (isAutoPlaying()) {
      stopAutoPlay();
      experienceBtn.innerHTML = '<span class="btn-icon">►</span> EXPERIENCE';
      experienceBtn.classList.remove('active');
    } else {
      startAutoPlay();
      experienceBtn.innerHTML = '<span class="btn-icon">■</span> STOP';
      experienceBtn.classList.add('active');
    }
  });
}

function setupPanelClose() {
  const closeBtn = $('panel-close');
  const panel    = $('info-panel');
  if (!closeBtn || !panel) return;
  closeBtn.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    closeBtn.textContent = panel.classList.contains('collapsed') ? '+' : '✕';
  });
}

// ─── Update per frame ──────────────────────────────────────────────────────────
let _lastStage = -1;

export function updateUI(stageIndex, stageProgress) {
  updateNavDots(stageIndex);
  updateHUD(stageIndex);

  // Only update info panel content when stage changes
  if (stageIndex !== _lastStage) {
    _lastStage = stageIndex;
    updatePanel(stageIndex);
  }
}

function updateNavDots(activeIndex) {
  const dots = document.querySelectorAll('.nav-dot');
  dots.forEach(dot => {
    const idx = parseInt(dot.dataset.index);
    dot.classList.toggle('active', idx === activeIndex);
  });
}

function updateHUD(stageIndex) {
  const wp = WAYPOINTS[stageIndex];
  if (!wp) return;

  const setVal = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  setVal('hud-zone',    wp.hudZone);
  setVal('hud-species', wp.species);
  setVal('hud-temp',    wp.temperature < 0 ? `${wp.temperature}°C` : `${wp.temperature}°C`);
  setVal('hud-danger',  wp.dangerLevel);
  setVal('hud-time',    wp.timeOfDay);
  setVal('hud-zonenum', `${stageIndex + 1} / ${NUM_STAGES}`);

  // Color danger level
  const dangerEl = $('hud-danger');
  if (dangerEl) {
    dangerEl.className = 'hud-value';
    if (wp.dangerLevel === 'EXTREME') dangerEl.classList.add('danger-extreme');
    else if (wp.dangerLevel === 'HIGH') dangerEl.classList.add('danger-high');
    else if (wp.dangerLevel === 'MEDIUM') dangerEl.classList.add('danger-medium');
    else if (wp.dangerLevel === 'LOW') dangerEl.classList.add('danger-low');
    else dangerEl.classList.add('danger-none');
  }
}

function updatePanel(stageIndex) {
  const wp = WAYPOINTS[stageIndex];
  if (!wp) return;

  const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
  const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

  const heroEl = $('panel-hero');
  if (heroEl) {
    heroEl.innerHTML = `<img src="${wp.heroImg || '/assets/gateway.jpg'}" alt="${wp.zone}" class="panel-hero-img"/><div class="panel-hero-badge">${wp.hudZone}</div>`;
  }

  setText('panel-stage', `${wp.stage} · ${wp.zone}`);
  setHTML('panel-title', `${wp.name} <em>${wp.nameItalic}</em>`);

  // Stats
  const s1 = wp.stat1;
  setHTML('stat1-label', s1.label);
  setHTML('stat1-value', `${s1.value}<span class="stat-unit">${s1.unit}</span>`);
  setText('stat1-sub',   s1.sub);

  const s2 = wp.stat2;
  setHTML('stat2-label', s2.label);
  setHTML('stat2-value', `${s2.value}<span class="stat-unit">${s2.unit}</span>`);
  setText('stat2-sub',   s2.sub);

  // Description (convert \n to <br>)
  setHTML('panel-desc', wp.description.replace(/\n\n/g, '<br><br>'));

  // Tags
  const tagsEl = $('panel-tags');
  if (tagsEl) {
    tagsEl.innerHTML = wp.tags.map(t => `<span class="tag">${t}</span>`).join('');
  }

  setText('panel-footer', wp.footerText);

  // Draw mini graph
  drawMiniGraph(stageIndex);
}

// ─── Mini line graph ───────────────────────────────────────────────────────────
function drawMiniGraph(stageIndex) {
  const wp = WAYPOINTS[stageIndex];
  const canvas = $('mini-graph');
  if (!canvas || !wp) return;

  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const data = wp.graphData;

  ctx.clearRect(0, 0, W, H);

  // Dashed baseline
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.75);
  ctx.lineTo(W, H * 0.75);
  ctx.stroke();
  ctx.setLineDash([]);

  // Graph line
  const stepX = W / (data.length - 1);
  const pad = 8;

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, 'rgba(198, 160, 100, 0.5)');
  gradient.addColorStop(1, 'rgba(198, 160, 100, 0.0)');

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * stepX;
    const y = H - pad - v * (H - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#c8a96e';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Fill under curve
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Dots on data points
  data.forEach((v, i) => {
    const x = i * stepX;
    const y = H - pad - v * (H - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#eacf9f';
    ctx.fill();
  });

  // End dot (larger, with glow)
  const lastX = (data.length - 1) * stepX;
  const lastY = H - pad - data[data.length - 1] * (H - pad * 2);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Label
  const labelEl = $('graph-label');
  if (labelEl) labelEl.textContent = wp.graphLabel;
}

// ─── FPS display ──────────────────────────────────────────────────────────────
let _fpsFrames = 0, _fpsTime = 0, _fpsCurrent = 0;

export function updateFPS(time) {
  _fpsFrames++;
  if (time - _fpsTime >= 1000) {
    _fpsCurrent = _fpsFrames;
    _fpsFrames = 0;
    _fpsTime = time;
    const el = $('fps-counter');
    if (el) el.textContent = `${_fpsCurrent} fps`;
  }
}

// ─── Free Roam overlay ────────────────────────────────────────────────────────
export function showFreeRoamOverlay(visible) {
  const el = $('freeroam-overlay');
  if (el) el.style.display = visible ? 'flex' : 'none';
  const btn = $('freeroam-btn');
  if (btn) btn.classList.toggle('active', visible);
}

// ─── Experience button sync ───────────────────────────────────────────────────
export function syncExperienceBtn() {
  const btn = $('experience-btn');
  if (!btn) return;
  if (isAutoPlaying()) {
    btn.innerHTML = '<span class="btn-icon">■</span> STOP';
    btn.classList.add('active');
  } else {
    btn.innerHTML = '<span class="btn-icon">►</span> EXPERIENCE';
    btn.classList.remove('active');
  }
}
