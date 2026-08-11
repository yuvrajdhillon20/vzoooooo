// animalInspector.js — Interactive 3D Animal Inspection & Raycasting
// Handles hover detection, 3D target indicators, camera close-up lerp, modal facts display, and animal feeding interaction.

import * as THREE from 'three';
import { playAnimalSound } from './audio.js';

let _raycaster, _mouse, _camera, _scene, _animals;
let _hoveredAnimal = null;
let _selectedAnimal = null;
let _inspecting = false;
let _origCameraPos = null;
let _origCameraTarget = null;
let _badgeEl = null;

export function initAnimalInspector(camera, scene, animals) {
  _camera  = camera;
  _scene   = scene;
  _animals = animals;
  _raycaster = new THREE.Raycaster();
  _mouse     = new THREE.Vector2(-999, -999);

  _origCameraPos = new THREE.Vector3();
  _origCameraTarget = new THREE.Vector3();

  // Create floating hover badge element
  createHoverBadge();

  // Listeners
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
}

function createHoverBadge() {
  _badgeEl = document.createElement('div');
  _badgeEl.className = 'animal-hover-badge';
  _badgeEl.style.display = 'none';
  document.body.appendChild(_badgeEl);
}

function onMouseMove(e) {
  _mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Move badge next to cursor
  if (_badgeEl && _hoveredAnimal) {
    _badgeEl.style.left = `${e.clientX + 16}px`;
    _badgeEl.style.top  = `${e.clientY + 16}px`;
  }
}

function onClick(e) {
  // Ignore clicks on UI elements (modal, buttons, panel)
  if (e.target.closest('.controls-bar') ||
      e.target.closest('.info-panel') ||
      e.target.closest('.hud-bar') ||
      e.target.closest('.nav-dots') ||
      e.target.closest('#veil') ||
      e.target.closest('.animal-modal')) {
    return;
  }

  if (_hoveredAnimal) {
    selectAnimal(_hoveredAnimal);
  }
}

export function updateAnimalInspector(camera, delta) {
  if (!_raycaster || !_animals) return;

  _raycaster.setFromCamera(_mouse, camera);

  // Collect all animal meshes and children
  const targets = [];
  const animalMap = new Map();

  _animals.forEach(item => {
    item.mesh.traverse(child => {
      if (child.isMesh) {
        targets.push(child);
        animalMap.set(child, item);
      }
    });
  });

  const intersects = _raycaster.intersectObjects(targets, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object;
    const item = animalMap.get(hitMesh);

    if (item && item !== _hoveredAnimal) {
      _hoveredAnimal = item;
      document.body.style.cursor = 'pointer';
      if (_badgeEl) {
        _badgeEl.innerHTML = `<span class="badge-icon">🔍</span> Inspect <strong>${item.data.name}</strong>`;
        _badgeEl.style.display = 'flex';
      }
    }
  } else {
    if (_hoveredAnimal) {
      _hoveredAnimal = null;
      document.body.style.cursor = 'default';
      if (_badgeEl) _badgeEl.style.display = 'none';
    }
  }

  // Camera lerp if inspecting animal
  if (_inspecting && _selectedAnimal) {
    const targetPos = _selectedAnimal.mesh.position;
    // Position camera offset slightly above and in front of animal
    const offset = new THREE.Vector3(0, 8, 18);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), _selectedAnimal.mesh.rotation.y);

    const camGoal = targetPos.clone().add(offset);
    camera.position.lerp(camGoal, delta * 3.0);
    camera.lookAt(targetPos.clone().add(new THREE.Vector3(0, 3, 0)));
  }
}

export function selectAnimal(item) {
  _selectedAnimal = item;
  _inspecting = true;
  _origCameraPos.copy(_camera.position);

  // Play animal sound vocalization
  playAnimalSound(item.type);

  // Open Animal Detail Modal
  openAnimalModal(item.data, item);
}

export function closeAnimalInspector() {
  _inspecting = false;
  _selectedAnimal = null;

  // Hide modal
  const modal = document.getElementById('animal-modal');
  if (modal) modal.style.display = 'none';
}

function openAnimalModal(data, item) {
  let modal = document.getElementById('animal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'animal-modal';
    modal.className = 'animal-modal';
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="animal-modal__card">
      <button class="animal-modal__close" id="modal-close-btn">✕</button>

      <div class="animal-modal__hero">
        <img src="${data.heroImg || '/assets/savanna.jpg'}" alt="${data.name}" class="animal-modal__hero-img"/>
        <div class="animal-modal__hero-overlay"></div>
        <span class="animal-modal__status" style="background:${data.statusColor}">${data.status}</span>
      </div>

      <div class="animal-modal__body">
        <div class="animal-modal__header">
          <span class="animal-modal__zone">📍 ${data.zone}</span>
        </div>

        <h2 class="animal-modal__title">${data.name}</h2>
        <div class="animal-modal__scientific">${data.scientific}</div>

        <div class="animal-modal__grid">
          <div class="modal-stat"><span class="lbl">DIET</span><span class="val">${data.diet}</span></div>
          <div class="modal-stat"><span class="lbl">LIFESPAN</span><span class="val">${data.lifespan}</span></div>
          <div class="modal-stat"><span class="lbl">AVG WEIGHT</span><span class="val">${data.weight}</span></div>
          <div class="modal-stat"><span class="lbl">TOP SPEED</span><span class="val">${data.speed}</span></div>
        </div>

        <div class="animal-modal__facts">
          <div class="facts-heading">✨ SPECIES DISCOVERY FACTS</div>
          <ul>
            ${data.facts.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
        <div class="animal-modal__actions">
          <button class="modal-btn modal-btn--accent" id="feed-animal-btn">
            🍖 FEED ${data.name.split(' ')[0].toUpperCase()}
          </button>
          <button class="modal-btn" id="sound-animal-btn">
            🔊 ANIMAL CALL
          </button>
          <button class="modal-btn modal-btn--ghost" id="return-tour-btn">
            ⬅ RETURN TO TOUR
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  document.getElementById('modal-close-btn').onclick = closeAnimalInspector;
  document.getElementById('return-tour-btn').onclick = closeAnimalInspector;

  document.getElementById('sound-animal-btn').onclick = () => {
    playAnimalSound(item.type);
  };

  document.getElementById('feed-animal-btn').onclick = () => {
    feedAnimal(item);
  };
}

function feedAnimal(item) {
  // Spawn treat physics item near animal
  const foodGeo = new THREE.SphereGeometry(0.8, 8, 8);
  const foodMat = new THREE.MeshStandardMaterial({ color: 0xff4422, roughness: 0.4 });
  const food = new THREE.Mesh(foodGeo, foodMat);

  const startPos = item.mesh.position.clone().add(new THREE.Vector3(0, 15, 6));
  food.position.copy(startPos);
  _scene.add(food);

  // Play eating sound and animate food drop
  playAnimalSound('eat');

  let startTime = performance.now();
  function animateFood() {
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed < 1.2) {
      food.position.y = Math.max(item.mesh.position.y + 0.5, startPos.y - elapsed * 12);
      requestAnimationFrame(animateFood);
    } else {
      // Animal eats food with a jump reaction
      item.mesh.position.y += 1.5;
      setTimeout(() => { item.mesh.position.y -= 1.5; }, 300);
      _scene.remove(food);
    }
  }
  requestAnimationFrame(animateFood);
}
