// particles.js — Zone-specific particle systems for Virtual Zoo
// Each zone has a distinct particle effect: dust, leaves, snow, bubbles, heat, birds, fireflies, sparkles

import * as THREE from 'three';

const PARTICLE_CONFIGS = {
  dust: {
    count: 1200, color: 0xd4b070, size: 2.2, spread: [180, 50, 180],
    opacity: 0.5, speedY: 0.02, drift: 0.015,
  },
  leaves: {
    count: 1000, color: 0x3a8a28, size: 3.2, spread: [200, 70, 200],
    opacity: 0.7, speedY: -0.06, drift: 0.025,
  },
  snow: {
    count: 1600, color: 0xe8f4fc, size: 2.8, spread: [220, 90, 220],
    opacity: 0.85, speedY: -0.08, drift: 0.008,
  },
  bubbles: {
    count: 900, color: 0x88bbdd, size: 3.5, spread: [160, 40, 160],
    opacity: 0.55, speedY: 0.07, drift: 0.012,
  },
  heat: {
    count: 600, color: 0xff8822, size: 2.0, spread: [180, 40, 180],
    opacity: 0.3, speedY: 0.05, drift: 0.03,
  },
  birds: {
    count: 450, color: 0xffeedd, size: 4.2, spread: [180, 90, 180],
    opacity: 0.85, speedY: 0.01, drift: 0.05,
  },
  fireflies: {
    count: 600, color: 0xaaffaa, size: 4.5, spread: [160, 60, 160],
    opacity: 0.0, speedY: 0.015, drift: 0.022,
  },
  sparkles: {
    count: 500, color: 0xffd4a0, size: 3.2, spread: [160, 50, 160],
    opacity: 0.6, speedY: 0.018, drift: 0.018,
  },
};

export function createParticles(scene, waypoints) {
  const systems = {};

  for (const wp of waypoints) {
    if (!wp.particleType || !PARTICLE_CONFIGS[wp.particleType]) continue;

    const cfg = PARTICLE_CONFIGS[wp.particleType];
    const { count, color, size, spread, opacity, speedY, drift } = cfg;

    const cx = wp.cameraTarget.x;
    const cy = (wp.cameraTarget.y || 15) + 15;
    const cz = wp.cameraTarget.z;

    // Positions
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases    = new Float32Array(count);
    const sizes     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = cx + (Math.random() - 0.5) * spread[0];
      positions[i * 3 + 1] = cy + Math.random() * spread[1];
      positions[i * 3 + 2] = cz + (Math.random() - 0.5) * spread[2];
      velocities[i * 3]     = (Math.random() - 0.5) * drift;
      velocities[i * 3 + 1] = speedY + (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * drift;
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i]  = size * (0.5 + Math.random() * 0.8);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));
    geo._velocities = velocities;
    geo._cx = cx; geo._cy = cy; geo._cz = cz;
    geo._spread = spread;

    let mat;
    if (wp.particleType === 'fireflies') {
      // Glowing fireflies — use additive blending
      mat = new THREE.PointsMaterial({
        color,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    } else {
      mat = new THREE.PointsMaterial({
        color,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        depthWrite: false,
      });
    }

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    points.userData = { type: wp.particleType, cfg, speedY, drift };
    scene.add(points);

    systems[wp.index] = points;
  }

  return systems;
}

export function updateParticles(systems, activeIndex, time, delta) {
  for (const [idx, points] of Object.entries(systems)) {
    const i = parseInt(idx);
    const isActive = i === activeIndex;

    // Fade in/out visibility
    const targetOpacity = isActive ? 1 : 0;
    points.material.opacity = THREE.MathUtils.lerp(
      points.material.opacity,
      isActive ? (PARTICLE_CONFIGS[points.userData.type]?.opacity || 0.7) : 0,
      delta * 1.5
    );
    points.visible = points.material.opacity > 0.01;

    if (!isActive && points.material.opacity < 0.02) continue;

    const geo = points.geometry;
    const pos = geo.attributes.position;
    const vels = geo._velocities;
    const count = pos.count;
    const type = points.userData.type;
    const { speedY, drift } = points.userData;
    const spread = geo._spread;
    const cx = geo._cx, cy = geo._cy, cz = geo._cz;

    for (let j = 0; j < count; j++) {
      let x = pos.getX(j);
      let y = pos.getY(j);
      let z = pos.getZ(j);

      // Animate position
      x += vels[j * 3]     + Math.sin(time * 0.4 + j) * 0.01;
      y += vels[j * 3 + 1];
      z += vels[j * 3 + 2] + Math.cos(time * 0.3 + j) * 0.01;

      // Fireflies: sinusoidal movement
      if (type === 'fireflies') {
        x += Math.sin(time * 0.8 + j * 2.1) * 0.04;
        y += Math.cos(time * 0.6 + j * 1.7) * 0.03;
        z += Math.sin(time * 0.5 + j * 1.3) * 0.04;
        // Pulsing opacity — handled per-material, approximate with color
        const pulse = 0.5 + 0.5 * Math.sin(time * 2 + j);
        points.material.opacity = isActive ? 0.7 + pulse * 0.3 : 0;
      }

      // Bounds check — recycle particle back to spawn area
      if (y > cy + spread[1] || y < cy - 20) {
        y = cy + (Math.random() - 0.2) * spread[1] * 0.3;
        x = cx + (Math.random() - 0.5) * spread[0];
        z = cz + (Math.random() - 0.5) * spread[2];
      }
      if (Math.abs(x - cx) > spread[0] * 0.6) x = cx + (Math.random() - 0.5) * spread[0] * 0.5;
      if (Math.abs(z - cz) > spread[2] * 0.6) z = cz + (Math.random() - 0.5) * spread[2] * 0.5;

      pos.setXYZ(j, x, y, z);
    }
    pos.needsUpdate = true;
  }
}
