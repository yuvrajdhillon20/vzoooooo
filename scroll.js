// scroll.js — Scroll-driven camera engine for Virtual Zoo
// Maps window scroll position to waypoint interpolation.
// Camera position, target, FOV, sky colors, and fog all smoothly lerp between waypoints.

import * as THREE from 'three';
import { NUM_STAGES } from './waypoints.js';

// Total page scroll height in pixels (set on body)
const SCROLL_HEIGHT = 10000;

let _waypoints = [];
let _scrollProgress = 0;   // 0 → 1
let _stageProgress = 0;    // 0 → 1 within current stage
let _currentStage = 0;     // integer stage index
let _targetScrollY = 0;    // for auto-experience mode
let _autoPlay = false;
let _autoStartTime = 0;
const AUTO_DURATION = 120; // seconds to traverse all stages

// Smoothed values (used externally)
export const smooth = {
  progress:  0,
  stage:     0,
  stageFrac: 0,
};

export function initScroll(waypoints) {
  _waypoints = waypoints;
  document.body.style.height = `${SCROLL_HEIGHT + window.innerHeight}px`;
  window.addEventListener('scroll', _onScroll, { passive: true });
}

function _onScroll() {
  if (_autoPlay) return;
  _scrollProgress = window.scrollY / SCROLL_HEIGHT;
}

export function startAutoPlay() {
  _autoPlay = true;
  _autoStartTime = performance.now() / 1000;
  _scrollProgress = 0;
  window.scrollTo(0, 0);
}

export function stopAutoPlay() {
  _autoPlay = false;
}

export function isAutoPlaying() { return _autoPlay; }

export function jumpToStage(index) {
  const progress = index / (NUM_STAGES - 1);
  _scrollProgress = progress;
  window.scrollTo(0, progress * SCROLL_HEIGHT);
}

/** Called every frame from the render loop. Returns the interpolated camera config. */
export function tickScroll(delta) {
  if (_autoPlay) {
    const elapsed = performance.now() / 1000 - _autoStartTime;
    _scrollProgress = Math.min(elapsed / AUTO_DURATION, 1);
    if (_scrollProgress >= 1) {
      _autoPlay = false;
      _scrollProgress = 1;
    }
  }

  // Smooth the progress
  smooth.progress = THREE.MathUtils.lerp(smooth.progress, _scrollProgress, delta * 2.5);

  // Compute current stage
  const rawStage = smooth.progress * (NUM_STAGES - 1);
  const stageA = Math.floor(rawStage);
  const stageB = Math.min(stageA + 1, NUM_STAGES - 1);
  const t = rawStage - stageA; // [0, 1] within stage

  smooth.stage     = Math.round(rawStage); // nearest stage
  smooth.stageFrac = t;

  _currentStage = Math.floor(rawStage);

  const wpA = _waypoints[stageA];
  const wpB = _waypoints[stageB];

  // Use smoothstep for eased transition
  const st = smoothstep(t);

  return {
    stageA,
    stageB,
    t: st,
    rawT: t,
    cameraPos:    lerpV3(wpA.cameraPos,    wpB.cameraPos,    st),
    cameraTarget: lerpV3(wpA.cameraTarget, wpB.cameraTarget, st),
    fov:          lerp(wpA.fov,            wpB.fov,          st),
    skyTopColor:     lerpRGB(wpA.skyTopColor,     wpB.skyTopColor,     st),
    skyHorizonColor: lerpRGB(wpA.skyHorizonColor, wpB.skyHorizonColor, st),
    fogColor:        lerpRGB(wpA.fogColor,         wpB.fogColor,         st),
    fogNear:      lerp(wpA.fogNear,        wpB.fogNear,        st),
    fogFar:       lerp(wpA.fogFar,         wpB.fogFar,         st),
    ambientColor:     lerpRGB(wpA.ambientColor,     wpB.ambientColor,     st),
    ambientIntensity: lerp(wpA.ambientIntensity, wpB.ambientIntensity, st),
    sunColor:     lerpRGB(wpA.sunColor,    wpB.sunColor,      st),
    sunIntensity: lerp(wpA.sunIntensity,   wpB.sunIntensity,  st),
    sunPos:       lerpV3(wpA.sunPos,       wpB.sunPos,        st),
    bloomStrength: lerp(wpA.bloomStrength, wpB.bloomStrength, st),
    currentStage: Math.round(rawStage),
  };
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

function smoothstep(t) { return t * t * (3 - 2 * t); }

function lerpV3(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function lerpRGB(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}
