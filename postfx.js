// postfx.js — Post-processing pipeline for Virtual Zoo
// EffectComposer with: RenderPass → UnrealBloom → Vignette+FilmGrain (ShaderPass) → OutputPass

import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }       from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

// Custom vignette + film grain shader
const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
    uVignette: { value: 1.3 },
    uGrain:    { value: 0.035 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Vignette — smooth circular darkening toward edges
      vec2 uv2 = vUv * 2.0 - 1.0;
      float dist = dot(uv2 * vec2(0.55, 0.65), uv2 * vec2(0.55, 0.65));
      float vignette = 1.0 - clamp(pow(dist, uVignette), 0.0, 1.0);
      color.rgb *= vignette;

      // Film grain — pseudo-random noise
      float grain = rand(vUv + fract(uTime * 0.017)) * uGrain;
      color.rgb += grain - uGrain * 0.5;

      // Subtle teal-to-warm chromatic push (cinematic LUT approximation)
      color.r = color.r * 1.02 - 0.01;
      color.b = color.b * 0.98;

      gl_FragColor = clamp(color, 0.0, 1.0);
    }
  `,
};

let _composer = null;
let _bloomPass = null;
let _vignettePass = null;

export function initPostFX(renderer, scene, camera) {
  _composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  _composer.addPass(renderPass);

  _bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,    // strength
    0.5,    // radius
    0.85    // threshold
  );
  _composer.addPass(_bloomPass);

  _vignettePass = new ShaderPass(VignetteGrainShader);
  _composer.addPass(_vignettePass);

  _composer.addPass(new OutputPass());

  return _composer;
}

export function updatePostFX(time, bloomStrength) {
  if (!_composer) return;
  if (_vignettePass) {
    _vignettePass.uniforms.uTime.value = time;
  }
  if (_bloomPass) {
    _bloomPass.strength = THREE.MathUtils.lerp(_bloomPass.strength, bloomStrength, 0.05);
  }
}

export function resizePostFX(width, height) {
  if (_composer) _composer.setSize(width, height);
}

export function renderPostFX() {
  if (_composer) _composer.render();
}
