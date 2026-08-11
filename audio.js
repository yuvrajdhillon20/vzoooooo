// audio.js — Web Audio API ambient sounds & animal vocalizations for Virtual Zoo
// Synthesizes zone-appropriate ambient tones & realistic animal calls using WebAudio oscillators & noise.

let _ctx = null;
let _master = null;
let _currentNode = null;
let _enabled = true;
let _currentZone = -1;

export function initAudio() {
  // Audio context is created on first user interaction
}

function ensureContext() {
  if (_ctx) return;
  _ctx = new (window.AudioContext || window.webkitAudioContext)();
  _master = _ctx.createGain();
  _master.gain.value = 0.25;
  _master.connect(_ctx.destination);
}

export function setAudioEnabled(enabled) {
  _enabled = enabled;
  if (_master && _ctx) {
    _master.gain.setTargetAtTime(enabled ? 0.25 : 0, _ctx.currentTime, 0.3);
  }
}

export function updateAudio(stageIndex) {
  if (stageIndex === _currentZone) return;
  _currentZone = stageIndex;

  if (!_enabled) return;

  ensureContext();
  if (_ctx.state === 'suspended') _ctx.resume();

  if (_currentNode) fadeOutNode(_currentNode);

  const node = createZoneAmbient(stageIndex);
  if (!node) return;
  _currentNode = node;

  node.gainNode.gain.setValueAtTime(0, _ctx.currentTime);
  node.gainNode.gain.setTargetAtTime(1, _ctx.currentTime, 1.5);
}

function fadeOutNode(node) {
  try {
    node.gainNode.gain.setTargetAtTime(0, _ctx.currentTime, 0.8);
    setTimeout(() => {
      try { node.stop(); } catch(e) {}
    }, 2000);
  } catch(e) {}
}

// ─── PROCEDURAL ANIMAL VOCALIZATIONS ─────────────────────────────────────────

export function playAnimalSound(type) {
  if (!_enabled) return;
  ensureContext();
  if (_ctx.state === 'suspended') _ctx.resume();

  const now = _ctx.currentTime;

  switch (type) {
    case 'lion':
    case 'lioncub':
    case 'jaguar':
    case 'leopard': {
      // Low resonant Roar (Low frequency FM sweep + growl noise)
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 1.2);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

      osc.connect(gain);
      gain.connect(_master);
      osc.start(now);
      osc.stop(now + 1.4);
      break;
    }

    case 'elephant': {
      // High brassy Trumpet sweep
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(680, now + 0.4);
      osc.frequency.linearRampToValueAtTime(420, now + 1.0);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

      osc.connect(gain);
      gain.connect(_master);
      osc.start(now);
      osc.stop(now + 1.1);
      break;
    }

    case 'eagle': {
      // High piercing screech
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(3200, now + 0.3);
      osc.frequency.linearRampToValueAtTime(2100, now + 0.8);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc.connect(gain);
      gain.connect(_master);
      osc.start(now);
      osc.stop(now + 0.85);
      break;
    }

    case 'shark':
    case 'mantaray': {
      // Deep underwater splash / rumble
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 1.5);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      osc.connect(gain);
      gain.connect(_master);
      osc.start(now);
      osc.stop(now + 1.5);
      break;
    }

    case 'eat': {
      // Crunching / Munching sound effect
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.setValueAtTime(250, now + 0.1);
      osc.frequency.setValueAtTime(500, now + 0.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(_master);
      osc.start(now);
      osc.stop(now + 0.35);
      break;
    }

    default: {
      // Default chirp/call
      const osc = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(_master);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
  }
}

// ─── AMBIENT ZONE RECIPES ───────────────────────────────────────────────────

function createZoneAmbient(zoneIndex) {
  const recipes = [
    createWindAmbient,       // 0 Gateway
    createSavannaAmbient,    // 1 Savanna
    createRainforestAmbient, // 2 Rainforest
    createArcticAmbient,     // 3 Arctic
    createOceanAmbient,      // 4 Ocean
    createDesertAmbient,     // 5 Badlands
    createAviaryAmbient,     // 6 Aviary
    createNightAmbient,      // 7 Night Safari
    createNurseryAmbient,    // 8 Nursery
    createArchiveAmbient,    // 9 Archive
  ];

  const fn = recipes[zoneIndex];
  return fn ? fn() : null;
}

function makeGain(val = 1) {
  const g = _ctx.createGain();
  g.gain.value = val;
  g.connect(_master);
  return g;
}

function makeOsc(type, freq, detune = 0) {
  const o = _ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  return o;
}

function makeNoise(bufSize = 44100) {
  const buf = _ctx.createBuffer(1, bufSize, _ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = _ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function makeFilter(type, freq, Q = 1) {
  const f = _ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = Q;
  return f;
}

function bundleNodes(nodes, gainNode) {
  return { gainNode, stop: () => nodes.forEach(n => { try { n.stop(); } catch(e){} }) };
}

function createWindAmbient() {
  const gainNode = makeGain(0.18);
  const noise = makeNoise();
  const filter = makeFilter('bandpass', 800, 0.5);
  noise.connect(filter); filter.connect(gainNode);
  noise.start();
  return bundleNodes([noise], gainNode);
}

function createSavannaAmbient() {
  const gainNode = makeGain(0.2);
  const osc = makeOsc('sine', 55);
  const osc2 = makeOsc('sine', 82.5, -3);
  const g1 = _ctx.createGain(); g1.gain.value = 0.3;
  const g2 = _ctx.createGain(); g2.gain.value = 0.2;
  osc.connect(g1); g1.connect(gainNode);
  osc2.connect(g2); g2.connect(gainNode);
  const noise = makeNoise();
  const filter = makeFilter('bandpass', 600, 0.4);
  const gn = _ctx.createGain(); gn.gain.value = 0.12;
  noise.connect(filter); filter.connect(gn); gn.connect(gainNode);
  [osc, osc2, noise].forEach(n => n.start());
  return bundleNodes([osc, osc2, noise], gainNode);
}

function createRainforestAmbient() {
  const gainNode = makeGain(0.22);
  const noise = makeNoise();
  const filter = makeFilter('highpass', 2000, 0.8);
  const gn = _ctx.createGain(); gn.gain.value = 0.25;
  noise.connect(filter); filter.connect(gn); gn.connect(gainNode);
  const osc = makeOsc('sine', 40);
  const go = _ctx.createGain(); go.gain.value = 0.15;
  osc.connect(go); go.connect(gainNode);
  [noise, osc].forEach(n => n.start());
  return bundleNodes([noise, osc], gainNode);
}

function createArcticAmbient() {
  const gainNode = makeGain(0.15);
  const noise = makeNoise();
  const f1 = makeFilter('highpass', 1200, 0.3);
  const f2 = makeFilter('lowpass', 3000, 0.5);
  const gn = _ctx.createGain(); gn.gain.value = 0.3;
  noise.connect(f1); f1.connect(f2); f2.connect(gn); gn.connect(gainNode);
  const osc = makeOsc('sine', 320, 8);
  const go = _ctx.createGain(); go.gain.value = 0.05;
  osc.connect(go); go.connect(gainNode);
  [noise, osc].forEach(n => n.start());
  return bundleNodes([noise, osc], gainNode);
}

function createOceanAmbient() {
  const gainNode = makeGain(0.22);
  const noise = makeNoise();
  const f1 = makeFilter('lowpass', 700, 0.8);
  const gn = _ctx.createGain(); gn.gain.value = 0.35;
  noise.connect(f1); f1.connect(gn); gn.connect(gainNode);
  const osc = makeOsc('sine', 30);
  const go = _ctx.createGain(); go.gain.value = 0.2;
  osc.connect(go); go.connect(gainNode);
  [noise, osc].forEach(n => n.start());
  return bundleNodes([noise, osc], gainNode);
}

function createDesertAmbient() {
  const gainNode = makeGain(0.12);
  const noise = makeNoise();
  const f = makeFilter('bandpass', 400, 0.3);
  const gn = _ctx.createGain(); gn.gain.value = 0.2;
  noise.connect(f); f.connect(gn); gn.connect(gainNode);
  noise.start();
  return bundleNodes([noise], gainNode);
}

function createAviaryAmbient() {
  const gainNode = makeGain(0.18);
  const noise = makeNoise();
  const f = makeFilter('bandpass', 3000, 1.5);
  const gn = _ctx.createGain(); gn.gain.value = 0.15;
  noise.connect(f); f.connect(gn); gn.connect(gainNode);
  [880, 1100, 1320].forEach((freq, i) => {
    const o = makeOsc('sine', freq, i * 5);
    const g = _ctx.createGain(); g.gain.value = 0.03;
    o.connect(g); g.connect(gainNode);
    o.start();
  });
  noise.start();
  return bundleNodes([noise], gainNode);
}

function createNightAmbient() {
  const gainNode = makeGain(0.18);
  const noise = makeNoise();
  const f = makeFilter('bandpass', 4000, 3);
  const gn = _ctx.createGain(); gn.gain.value = 0.18;
  noise.connect(f); f.connect(gn); gn.connect(gainNode);
  const osc = makeOsc('sine', 38);
  const go = _ctx.createGain(); go.gain.value = 0.12;
  osc.connect(go); go.connect(gainNode);
  [noise, osc].forEach(n => n.start());
  return bundleNodes([noise, osc], gainNode);
}

function createNurseryAmbient() {
  const gainNode = makeGain(0.15);
  [220, 330, 440].forEach((freq, i) => {
    const o = makeOsc('sine', freq, i * 2);
    const g = _ctx.createGain(); g.gain.value = 0.05;
    o.connect(g); g.connect(gainNode);
    o.start();
  });
  const noise = makeNoise();
  const f = makeFilter('lowpass', 400);
  const gn = _ctx.createGain(); gn.gain.value = 0.08;
  noise.connect(f); f.connect(gn); gn.connect(gainNode);
  noise.start();
  return bundleNodes([noise], gainNode);
}

function createArchiveAmbient() {
  const gainNode = makeGain(0.14);
  [55, 82, 110].forEach((freq, i) => {
    const o = makeOsc('sine', freq, i * 3);
    const g = _ctx.createGain(); g.gain.value = 0.08;
    o.connect(g); g.connect(gainNode);
    o.start();
  });
  return bundleNodes([], gainNode);
}
