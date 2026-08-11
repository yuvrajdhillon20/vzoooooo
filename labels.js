// labels.js — CSS2D floating zone labels using Three.js CSS2DRenderer
// Each label is positioned at a terrain point and rendered as a DOM element overlaid on the canvas.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { fbm } from './terrain.js';

/**
 * Create all CSS2D zone labels from waypoint marker configs.
 * Returns a map of stageIndex → [CSS2DObject, ...]
 */
export function createLabels(scene, waypoints) {
  const labelGroups = {};

  for (const wp of waypoints) {
    const group = [];
    for (const marker of (wp.labelMarkers || [])) {
      const el = document.createElement('div');
      el.className = 'terrain-label';

      const line = document.createElement('div');
      line.className = 'terrain-label__line';

      const textEl = document.createElement('div');
      textEl.className = 'terrain-label__text';
      textEl.textContent = marker.text;

      el.appendChild(line);
      el.appendChild(textEl);

      const obj = new CSS2DObject(el);
      const { x, z } = marker.pos;
      // Approximate terrain height at this point
      const terrainY = marker.pos.y ?? (fbm(x * 0.004, z * 0.004) * 20 + 5);
      obj.position.set(x, terrainY + 2, z);
      obj.visible = false;

      scene.add(obj);
      group.push(obj);
    }
    labelGroups[wp.index] = group;
  }

  return labelGroups;
}

/**
 * Show labels for the active stage, hide others.
 * Fades are handled via CSS opacity class.
 */
export function updateLabels(labelGroups, activeIndex) {
  for (const [idx, group] of Object.entries(labelGroups)) {
    const active = parseInt(idx) === activeIndex;
    for (const obj of group) {
      obj.visible = true; // always visible in scene; opacity controlled via CSS class
      const el = obj.element;
      if (active) {
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    }
  }
}
