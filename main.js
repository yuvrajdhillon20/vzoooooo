// main.js — Virtual Zoo · Entry Point
// Orchestrates Three.js scene, scroll-driven camera, post-processing, and UI.

import * as THREE from 'three';
import { CSS2DRenderer }      from 'three/addons/renderers/CSS2DRenderer.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { WAYPOINTS }                     from './waypoints.js';
import { createTerrain }                 from './terrain.js';
import { createParticles, updateParticles } from './particles.js';
import { createLabels, updateLabels }    from './labels.js';
import { initScroll, tickScroll, jumpToStage } from './scroll.js';
import { initUI, updateUI, updateFPS, showFreeRoamOverlay, syncExperienceBtn } from './ui.js';
import { setAudioEnabled, updateAudio }  from './audio.js';
import { initPostFX, updatePostFX, resizePostFX, renderPostFX } from './postfx.js';
import { createAnimals, updateAnimals }  from './animals.js';
import { initAnimalInspector, updateAnimalInspector } from './animalInspector.js';

// ─── State ─────────────────────────────────────────────────────────────────────
let scene, renderer, camera, labelRenderer, composer;
let freeRoamControls;
let particleSystems, labelGroups;
let animals = [];
let dayNightMode = 'auto'; // 'auto', 'day', 'night'

const _camPos    = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _color     = new THREE.Color();

let freeRoamActive = false;
let lastTime = 0;
const keys = {};
let audioEnabled = true;

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb4a98c, 700, 2400);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 5000);
  const wp0 = WAYPOINTS[0];
  camera.position.set(wp0.cameraPos.x, wp0.cameraPos.y, wp0.cameraPos.z);
  camera.lookAt(wp0.cameraTarget.x, wp0.cameraTarget.y, wp0.cameraTarget.z);

  // CSS2D Label renderer
  labelRenderer = new CSS2DRenderer({
    element: document.getElementById('labels-container'),
  });
  labelRenderer.setSize(window.innerWidth, window.innerHeight);

  // Lights (Warm luminous ambient fill)
  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x8a7a5a, 1.25);
  scene.add(hemisphere);
  scene.userData.hemisphere = hemisphere;

  const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
  sun.position.set(150, 280, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near   = 0.5;
  sun.shadow.camera.far    = 3000;
  sun.shadow.camera.left   = -1200;
  sun.shadow.camera.right  =  1200;
  sun.shadow.camera.top    =  1200;
  sun.shadow.camera.bottom = -1200;
  sun.shadow.bias = -0.0001;
  scene.add(sun);
  scene.userData.sun = sun;

  // Sky sphere (large inverted sphere)
  const skyGeo = new THREE.SphereGeometry(4000, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTopColor:     { value: new THREE.Color(0.03, 0.08, 0.18) },
      uHorizonColor: { value: new THREE.Color(0.24, 0.43, 0.63) },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        float t = smoothstep(-0.1, 0.5, h);
        gl_FragColor = vec4(mix(uHorizonColor, uTopColor, t), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const skySphere = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skySphere);
  scene.userData.skyMat = skyMat;

  // Post-processing
  composer = initPostFX(renderer, scene, camera);

  // Terrain + trees + path
  createTerrain(scene);

  // 3D Animated Animals
  animals = createAnimals(scene);

  // Particles
  particleSystems = createParticles(scene, WAYPOINTS);

  // Labels
  labelGroups = createLabels(scene, WAYPOINTS);

  // Scroll system
  initScroll(WAYPOINTS);

  // Animal Inspector (Raycaster & Modals)
  initAnimalInspector(camera, scene, animals);

  // UI
  initUI({
    onFreeRoam: toggleFreeRoam,
    onSoundToggle: (enabled) => {
      audioEnabled = enabled;
      setAudioEnabled(enabled);
    },
    onDayNightToggle: () => {
      if (dayNightMode === 'auto') dayNightMode = 'night';
      else if (dayNightMode === 'night') dayNightMode = 'day';
      else dayNightMode = 'auto';

      const btn = document.getElementById('daynight-btn');
      if (btn) {
        btn.querySelector('.ctrl-text').textContent = dayNightMode.toUpperCase();
      }
    }
  });

  // Free roam controls (pointer lock)
  freeRoamControls = new PointerLockControls(camera, renderer.domElement);
  freeRoamControls.addEventListener('unlock', () => {
    if (freeRoamActive) toggleFreeRoam();
  });

  // Simulate loading progress
  simulateLoading();

  // Key events
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyF') toggleFreeRoam();
    if (e.code === 'Escape' && freeRoamActive) toggleFreeRoam();
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  // Resize
  window.addEventListener('resize', onResize);

  // Start render loop immediately for loading animation
  requestAnimationFrame(animate);
}

// ─── Loading simulation ────────────────────────────────────────────────────────
function simulateLoading() {
  let pct = 0;
  const pctEl  = document.getElementById('loader-pct');
  const txtEl  = document.getElementById('loader-text');
  const texts  = [
    'INITIALIZING HABITATS',
    'POPULATING SPECIES',
    'LIGHTING THE SAVANNA',
    'FREEZING THE ARCTIC',
    'FILLING THE OCEAN',
    'TRAINING THE ANIMALS',
    'READY TO EXPLORE',
  ];

  const interval = setInterval(() => {
    pct += Math.random() * 7 + 3;
    if (pct >= 100) {
      pct = 100;
      clearInterval(interval);
      if (txtEl) txtEl.textContent = 'READY';
      setTimeout(() => {
        const loader = document.getElementById('loader');
        const btn    = document.getElementById('begin-btn');
        const hint   = document.getElementById('sound-hint');
        if (loader) loader.style.display = 'none';
        if (btn)  { btn.style.display = 'flex'; btn.style.opacity = '0'; btn.style.transition = 'opacity 0.8s'; requestAnimationFrame(() => { btn.style.opacity = '1'; }); }
        if (hint) { hint.style.display = 'block'; hint.style.opacity = '0'; hint.style.transition = 'opacity 1.2s 0.4s'; requestAnimationFrame(() => { hint.style.opacity = '1'; }); }
      }, 600);
    } else {
      if (txtEl) txtEl.textContent = texts[Math.floor((pct / 100) * texts.length)] || texts[0];
    }
    if (pctEl) pctEl.textContent = `${Math.floor(pct)}%`;
  }, 100);
}

// ─── Free Roam ────────────────────────────────────────────────────────────────
function toggleFreeRoam() {
  freeRoamActive = !freeRoamActive;
  if (freeRoamActive) {
    freeRoamControls.lock();
    showFreeRoamOverlay(true);
    document.body.style.overflow = 'hidden';
  } else {
    freeRoamControls.unlock();
    showFreeRoamOverlay(false);
    document.body.style.overflow = '';
  }
}

function updateFreeRoam(delta) {
  if (!freeRoamActive || !freeRoamControls.isLocked) return;
  const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 140 : 48;
  const d = speed * delta;
  if (keys['KeyW']) freeRoamControls.moveForward(d);
  if (keys['KeyS']) freeRoamControls.moveForward(-d);
  if (keys['KeyA']) freeRoamControls.moveRight(-d);
  if (keys['KeyD']) freeRoamControls.moveRight(d);
  if (keys['Space'])        camera.position.y += d;
  if (keys['ControlLeft'] || keys['KeyQ']) camera.position.y -= d;
}

// ─── Render Loop ───────────────────────────────────────────────────────────────
function animate(timeMs = 0) {
  requestAnimationFrame(animate);

  const time  = timeMs / 1000;
  const delta = Math.min(time - lastTime, 0.1);
  lastTime = time;

  // Scroll-driven camera interpolation (only when not in free roam)
  if (!freeRoamActive) {
    const sc = tickScroll(delta);

    // Camera
    _camPos.set(sc.cameraPos.x, sc.cameraPos.y, sc.cameraPos.z);
    _camTarget.set(sc.cameraTarget.x, sc.cameraTarget.y, sc.cameraTarget.z);
    camera.position.lerp(_camPos, delta * 2.2);
    camera.fov = THREE.MathUtils.lerp(camera.fov, sc.fov, delta * 1.8);
    camera.updateProjectionMatrix();

    // Soft look-at (avoid hard snapping)
    const currentTarget = new THREE.Vector3();
    camera.getWorldDirection(currentTarget);
    currentTarget.multiplyScalar(100).add(camera.position);
    currentTarget.lerp(_camTarget, delta * 1.6);
    camera.lookAt(currentTarget);

    // Sky colors
    const skyMat = scene.userData.skyMat;
    if (skyMat) {
      _color.setRGB(sc.skyTopColor[0]/255, sc.skyTopColor[1]/255, sc.skyTopColor[2]/255);
      skyMat.uniforms.uTopColor.value.lerp(_color, delta * 1.2);
      _color.setRGB(sc.skyHorizonColor[0]/255, sc.skyHorizonColor[1]/255, sc.skyHorizonColor[2]/255);
      skyMat.uniforms.uHorizonColor.value.lerp(_color, delta * 1.2);
    }

    // Fog
    if (scene.fog) {
      _color.setRGB(sc.fogColor[0]/255, sc.fogColor[1]/255, sc.fogColor[2]/255);
      scene.fog.color.lerp(_color, delta * 1.0);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, sc.fogNear, delta * 1.2);
      scene.fog.far  = THREE.MathUtils.lerp(scene.fog.far,  sc.fogFar,  delta * 1.2);
      renderer.setClearColor(scene.fog.color);
    }

    // Sun light
    const sun = scene.userData.sun;
    if (sun) {
      _color.setRGB(sc.sunColor[0]/255, sc.sunColor[1]/255, sc.sunColor[2]/255);
      sun.color.lerp(_color, delta * 1.0);
      sun.intensity = THREE.MathUtils.lerp(sun.intensity, sc.sunIntensity, delta * 1.2);
      sun.position.lerp(
        new THREE.Vector3(sc.sunPos.x, sc.sunPos.y, sc.sunPos.z),
        delta * 0.8
      );
    }

    // Ambient light
    const hemi = scene.userData.hemisphere;
    if (hemi) {
      _color.setRGB(sc.ambientColor[0]/255, sc.ambientColor[1]/255, sc.ambientColor[2]/255);
      hemi.color.lerp(_color, delta * 1.0);
      hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, sc.ambientIntensity, delta * 1.0);
    }

    // Water animation
    const water = scene.userData.water;
    if (water) {
      water.material.opacity = 0.82 + Math.sin(time * 0.4) * 0.06;
      water.position.y = -2 + Math.sin(time * 0.6) * 0.5;
    }

    // Update post-FX
    updatePostFX(time, sc.bloomStrength);

    // Update UI
    updateUI(sc.currentStage);
    syncExperienceBtn();

    // Update particles
    updateParticles(particleSystems, sc.currentStage, time, delta);

    // Update labels
    updateLabels(labelGroups, sc.currentStage);

    // Update audio
    updateAudio(sc.currentStage);

  } else {
    // Free roam mode
    updateFreeRoam(delta);
    updatePostFX(time, 0.25);
  }

  // Day / Night manual light override
  if (dayNightMode === 'night') {
    if (scene.fog) {
      scene.fog.color.setHex(0x060c18);
      renderer.setClearColor(0x060c18);
    }
    const sun = scene.userData.sun;
    if (sun) sun.intensity = 0.2;
  } else if (dayNightMode === 'day') {
    const sun = scene.userData.sun;
    if (sun) sun.intensity = 3.0;
  }

  // Update 3D Animals & Animal Raycast Inspector
  updateAnimals(animals, time, delta);
  updateAnimalInspector(camera, delta);

  // Update FPS counter
  updateFPS(timeMs);

  // Render
  renderPostFX();
  labelRenderer.render(scene, camera);
}

// ─── Resize ────────────────────────────────────────────────────────────────────
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  resizePostFX(w, h);
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
