// animals.js — Procedural 3D Animal Herds & Autonomous Wandering AI System
// Instantiates 100+ stylized 3D animals across 10 habitat zones.
// Features real-time autonomous wandering AI (pathing, turns, limb sync walking, circular soaring & swimming).

import * as THREE from 'three';
import { getTerrainHeight } from './terrain.js';

// ─── ANIMAL SPECIES DATA DATABASE ─────────────────────────────────────────────
export const ANIMAL_DATA = {
  lion: {
    id: 'lion', name: 'African Lion', scientific: 'Panthera leo', zone: 'AFRICAN SAVANNA', stageIndex: 1,
    status: 'VULNERABLE', statusColor: '#f59e0b', diet: 'Carnivore (Zebra, Wildebeest, Antelope)',
    lifespan: '10 - 14 years', weight: '190 kg', speed: '80 km/h',
    facts: [
      'A lion\'s roar can be heard up to 8 kilometres away across the savanna.',
      'Lions live in family prides consisting of related females, offspring, and a coalition of males.',
      'Male lions spend up to 20 hours a day resting to conserve energy for hunting.'
    ]
  },
  zebra: {
    id: 'zebra', name: 'Plains Zebra', scientific: 'Equus quagga', zone: 'AFRICAN SAVANNA', stageIndex: 1,
    status: 'NEAR THREATENED', statusColor: '#eab308', diet: 'Herbivore (Grasses & leaves)',
    lifespan: '20 years', weight: '350 kg', speed: '65 km/h',
    facts: [
      'Every zebra has a unique pattern of black and white stripes, like a human fingerprint.',
      'Zebra stripes confuse biting flies and create a dazzling optical illusion for predators.',
      'Zebras sleep standing up and keep watch in shifts to protect the herd.'
    ]
  },
  giraffe: {
    id: 'giraffe', name: 'Northern Giraffe', scientific: 'Giraffa camelopardalis', zone: 'AFRICAN SAVANNA', stageIndex: 1,
    status: 'VULNERABLE', statusColor: '#f59e0b', diet: 'Herbivore (Acacia leaves)',
    lifespan: '25 years', weight: '1,200 kg', speed: '60 km/h',
    facts: [
      'Giraffes have 45 cm dark blue-purple tongues that wrap around thorny acacia branches.',
      'Each vertebra in a giraffe\'s neck is over 25 cm long.',
      'Giraffes only need 30 minutes of sleep per day.'
    ]
  },
  elephant: {
    id: 'elephant', name: 'African Bush Elephant', scientific: 'Loxodonta africana', zone: 'AFRICAN SAVANNA', stageIndex: 1,
    status: 'ENDANGERED', statusColor: '#ef4444', diet: 'Herbivore (Grass, bark, roots)',
    lifespan: '60 - 70 years', weight: '6,000 kg', speed: '40 km/h',
    facts: [
      'The elephant trunk contains over 40,000 individual muscles.',
      'Elephants communicate across miles using low-frequency infrasound undetectable by humans.',
      'Massive ears flap to cool down blood by up to 5°C.'
    ]
  },
  gorilla: {
    id: 'gorilla', name: 'Western Lowland Gorilla', scientific: 'Gorilla gorilla gorilla', zone: 'TROPICAL RAINFOREST', stageIndex: 2,
    status: 'CRITICALLY ENDANGERED', statusColor: '#dc2626', diet: 'Herbivore (Foliage & fruit)',
    lifespan: '35 - 40 years', weight: '160 kg', speed: '40 km/h',
    facts: [
      'Dominant adult males develop silver hair across their backs and are called Silverbacks.',
      'Gorillas share 98.3% of their DNA with human beings.',
      'They build fresh leafy nests on the forest floor every night.'
    ]
  },
  jaguar: {
    id: 'jaguar', name: 'South American Jaguar', scientific: 'Panthera onca', zone: 'TROPICAL RAINFOREST', stageIndex: 2,
    status: 'NEAR THREATENED', statusColor: '#eab308', diet: 'Carnivore (Tapirs, caimans, fish)',
    lifespan: '12 - 15 years', weight: '100 kg', speed: '80 km/h',
    facts: [
      'Jaguars have the strongest bite force of all big cats.',
      'They love water and are exceptional swimmers.',
      'Their rose-like coat patterns (rosettes) feature inner spots.'
    ]
  },
  polarbear: {
    id: 'polarbear', name: 'Polar Bear', scientific: 'Ursus maritimus', zone: 'ARCTIC TUNDRA', stageIndex: 3,
    status: 'VULNERABLE', statusColor: '#f59e0b', diet: 'Carnivore (Seals & fish)',
    lifespan: '20 - 25 years', weight: '550 kg', speed: '40 km/h',
    facts: [
      'Polar bear skin under thick fur is completely black to absorb solar heat.',
      'Hollow transparent fur reflects light, giving a white appearance.',
      'Polar bears can swim continuously for over 90 kilometres.'
    ]
  },
  penguin: {
    id: 'penguin', name: 'Emperor Penguin', scientific: 'Aptenodytes forsteri', zone: 'ARCTIC TUNDRA', stageIndex: 3,
    status: 'NEAR THREATENED', statusColor: '#eab308', diet: 'Carnivore (Fish & krill)',
    lifespan: '20 years', weight: '35 kg', speed: '9 km/h (swimming 30 km/h)',
    facts: [
      'Emperor penguins dive over 500 metres deep and stay underwater for 20 minutes.',
      'Males incubate eggs on their feet beneath a warm pouch for 65 freezing days.',
      'They huddle together in massive groups to conserve body heat in blizzards.'
    ]
  },
  shark: {
    id: 'shark', name: 'Great White Shark', scientific: 'Carcharodon carcharias', zone: 'DEEP OCEAN', stageIndex: 4,
    status: 'VULNERABLE', statusColor: '#f59e0b', diet: 'Carnivore (Seals & fish)',
    lifespan: '70 years', weight: '1,100 kg', speed: '56 km/h',
    facts: [
      'Sharks can detect a drop of blood in 100 litres of seawater from 500 metres away.',
      'Over 300 serrated teeth continuously replace themselves throughout life.',
      'Specialized Ampullae of Lorenzini organs detect prey electromagnetic pulses.'
    ]
  },
  mantaray: {
    id: 'mantaray', name: 'Giant Oceanic Manta Ray', scientific: 'Mobula birostris', zone: 'DEEP OCEAN', stageIndex: 4,
    status: 'ENDANGERED', statusColor: '#ef4444', diet: 'Planktivore (Zooplankton)',
    lifespan: '40 - 50 years', weight: '1,300 kg', speed: '24 km/h',
    facts: [
      'Manta rays have the largest brain-to-body mass ratio of all cold-blooded fish.',
      'Famous for underwater acrobatics, leaping out of the water to breach.',
      'Unique spot patterns on their belly act like human fingerprints.'
    ]
  },
  fish: {
    id: 'fish', name: 'Coral Reef Fish', scientific: 'Pomacentridae', zone: 'DEEP OCEAN', stageIndex: 4,
    status: 'LEAST CONCERN', statusColor: '#22c55e', diet: 'Omnivore (Algae & plankton)',
    lifespan: '5 - 10 years', weight: '0.4 kg', speed: '15 km/h',
    facts: [
      'Vibrant tropical reef fish live in tight schooling formations for defense against predators.',
      'Form symbiotic relationships with anemones and corals.'
    ]
  },
  komodo: {
    id: 'komodo', name: 'Komodo Dragon', scientific: 'Varanus komodoensis', zone: 'DESERT BADLANDS', stageIndex: 5,
    status: 'ENDANGERED', statusColor: '#ef4444', diet: 'Carnivore (Deer & water buffalo)',
    lifespan: '30 years', weight: '90 kg', speed: '20 km/h',
    facts: [
      'The largest living lizard species on Earth, growing up to 3 metres long.',
      'Yellow forked tongue smells prey up to 9.5 kilometres away.',
      'Possesses venom glands in the lower jaw.'
    ]
  },
  eagle: {
    id: 'eagle', name: 'Andean Condor', scientific: 'Vultur gryphus', zone: 'THE GRAND AVIARY', stageIndex: 6,
    status: 'VULNERABLE', statusColor: '#f59e0b', diet: 'Scavenger (Carrion)',
    lifespan: '50 - 70 years', weight: '15 kg', speed: '55 km/h',
    facts: [
      'Boasts a massive wingspan up to 3.3 metres.',
      'Soars for hundreds of kilometres on thermal wind currents without flapping wings once.',
      'Acts as nature\'s cleanup crew preventing disease spread.'
    ]
  },
  flamingo: {
    id: 'flamingo', name: 'Greater Flamingo', scientific: 'Phoenicopterus roseus', zone: 'THE GRAND AVIARY', stageIndex: 6,
    status: 'LEAST CONCERN', statusColor: '#22c55e', diet: 'Omnivore (Algae & crustaceans)',
    lifespan: '30 - 40 years', weight: '3.5 kg', speed: '50 km/h',
    facts: [
      'Bright pink color comes from carotenoid pigments in their food.',
      'Feeds upside down using specialized bill filters.',
      'Standing on one leg conserves body heat.'
    ]
  },
  leopard: {
    id: 'leopard', name: 'African Leopard', scientific: 'Panthera pardus pardus', zone: 'NIGHT SAFARI', stageIndex: 7,
    status: 'VULNERABLE', statusColor: '#f59e0b', diet: 'Carnivore (Impalas & rodents)',
    lifespan: '12 - 17 years', weight: '65 kg', speed: '58 km/h',
    facts: [
      'Leopards haul prey heavier than themselves high up trees.',
      'Reflective eye layer enables night vision 7× stronger than humans.',
      'Elusive and solitary nocturnal predator.'
    ]
  },
  lioncub: {
    id: 'lioncub', name: 'Savanna Lion Cubs', scientific: 'Panthera leo (Juvenile)', zone: 'THE NURSERY', stageIndex: 8,
    status: 'PROTECTED', statusColor: '#3b82f6', diet: 'Milk & Meat',
    lifespan: 'Newborn', weight: '12 kg', speed: '25 km/h',
    facts: [
      'Born with faint camouflage spots that fade in adulthood.',
      'All lionesses nurse and protect cubs collectively.',
      'Cubs learn hunting through playful stalking games.'
    ]
  },
  goldenlion: {
    id: 'goldenlion', name: 'Golden Lion Monument', scientific: 'Statua Panthera Aurum', zone: 'ENTRY PLAZA', stageIndex: 0,
    status: 'MONUMENT', statusColor: '#eab308', diet: 'N/A', lifespan: 'Eternal', weight: '14,000 kg', speed: '0 km/h',
    facts: [
      'Tribute to wildlife conservation and the sacred bond between humanity and animals.',
      'Gleams under sunrise rays to welcome visitors.'
    ]
  }
};

// ─── ANIMAL HERD POPULATION FACTORY ──────────────────────────────────────────

export function createAnimals(scene) {
  const animals = [];

  // Helper to add herd of animals around center position
  function addHerd(type, dataKey, count, cx, cy, cz, radius, isSoaring = false, isSwimming = false) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const r = Math.random() * radius;
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      const y = cy;

      let mesh;
      switch (type) {
        case 'lion': mesh = createLionMesh(false); break;
        case 'zebra': mesh = createZebraMesh(); break;
        case 'elephant': mesh = createElephantMesh(); break;
        case 'giraffe': mesh = createGiraffeMesh(); break;
        case 'gorilla': mesh = createGorillaMesh(); break;
        case 'jaguar': mesh = createJaguarMesh(); break;
        case 'polarbear': mesh = createPolarBearMesh(); break;
        case 'penguin': mesh = createPenguinMesh(); break;
        case 'shark': mesh = createSharkMesh(); break;
        case 'mantaray': mesh = createMantaRayMesh(); break;
        case 'fish': mesh = createFishMesh(); break;
        case 'komodo': mesh = createKomodoMesh(); break;
        case 'eagle': mesh = createEagleMesh(); break;
        case 'flamingo': mesh = createFlamingoMesh(); break;
        case 'leopard': mesh = createLeopardMesh(); break;
        case 'lioncub': mesh = createLionMesh(true); break;
        case 'statue': mesh = createGoldenLionStatue(); break;
        default: mesh = createLionMesh(false); break;
      }

      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      scene.add(mesh);

      // Autonomous Wandering AI State
      const ai = {
        center: new THREE.Vector3(cx, cy, cz),
        radius,
        targetPos: new THREE.Vector3(x + (Math.random() - 0.5) * 40, y, z + (Math.random() - 0.5) * 40),
        speed: (0.4 + Math.random() * 0.6) * (type === 'zebra' || type === 'jaguar' ? 1.5 : 1.0),
        isSoaring,
        isSwimming,
        angleOffset: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      };

      animals.push({ mesh, data: ANIMAL_DATA[dataKey] || ANIMAL_DATA.lion, type, stageIndex: ANIMAL_DATA[dataKey]?.stageIndex || 1, ai });
    }
  }

  // 1. GATEWAY (Stage 0): Golden Lion Monument
  const goldenLion = createGoldenLionStatue();
  goldenLion.position.set(0, getTerrainHeight(0, -15) + 7.5, -15);
  scene.add(goldenLion);
  animals.push({ mesh: goldenLion, data: ANIMAL_DATA.goldenlion, type: 'statue', stageIndex: 0, ai: null });

  // 2. AFRICAN SAVANNA (Stage 1): 5 Lions, 4 Elephants, 4 Giraffes, 8 Zebras (21 Animals)
  addHerd('lion', 'lion', 5, 385, 17, -225, 35);
  addHerd('elephant', 'elephant', 4, 340, 14, -260, 45);
  addHerd('giraffe', 'giraffe', 4, 315, 18, -150, 40);
  addHerd('zebra', 'zebra', 8, 410, 16, -180, 50);

  // 3. TROPICAL RAINFOREST (Stage 2): 4 Gorillas, 2 Jaguars, 12 Parrots/Macaws (18 Animals)
  addHerd('gorilla', 'gorilla', 4, 695, 45, -95, 25);
  addHerd('jaguar', 'jaguar', 2, 722, 39, -135, 30);
  addHerd('eagle', 'eagle', 12, 690, 65, -90, 40, true);

  // 4. ARCTIC TUNDRA (Stage 3): 3 Polar Bears, 16 Emperor Penguins (19 Animals)
  addHerd('polarbear', 'polarbear', 3, 965, 54, 225, 35);
  addHerd('penguin', 'penguin', 16, 942, 49, 185, 30);

  // 5. DEEP OCEAN (Stage 4): 2 Great White Sharks, 3 Manta Rays, 24 Coral Fish (29 Animals)
  addHerd('shark', 'shark', 2, 830, 8, 580, 40, false, true);
  addHerd('mantaray', 'mantaray', 3, 790, 16, 535, 45, false, true);
  addHerd('fish', 'fish', 24, 820, 12, 560, 50, false, true);

  // 6. DESERT BADLANDS (Stage 5): 4 Komodo Dragons, 5 Vultures soaring (9 Animals)
  addHerd('komodo', 'komodo', 4, 588, 20, 740, 30);
  addHerd('eagle', 'eagle', 5, 580, 45, 730, 35, true);

  // 7. THE GRAND AVIARY (Stage 6): 15 Flamingos, 4 Condors (19 Animals)
  addHerd('flamingo', 'flamingo', 15, 85, 62, 785, 25);
  addHerd('eagle', 'eagle', 4, 105, 85, 808, 30, true);

  // 8. NIGHT SAFARI (Stage 7): 3 Leopards, 6 Owls (9 Animals)
  addHerd('leopard', 'leopard', 3, -150, 24, 665, 35);
  addHerd('eagle', 'eagle', 6, -160, 38, 640, 30, true);

  // 9. THE NURSERY (Stage 8): 8 Playful Lion Cubs & Baby Elephants (8 Animals)
  addHerd('lioncub', 'lioncub', 5, -220, 15, 340, 20);
  addHerd('elephant', 'elephant', 3, -240, 15, 310, 25);

  return animals;
}

// ─── PROCEDURAL MESH GENERATORS ─────────────────────────────────────────────

function createMaterial(color, roughness = 0.7, metalness = 0.1, extraProps = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extraProps });
}

// LION
function createLionMesh(isCub = false) {
  const group = new THREE.Group();
  const scale = isCub ? 0.45 : 1.0;
  group.scale.setScalar(scale);

  const furMat  = createMaterial(isCub ? 0xe6b87d : 0xcf9853, 0.85);
  const maneMat = createMaterial(0x5a3410, 0.9);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.0, 7.5, 8), furMat);
  body.geometry.rotateX(Math.PI / 2);
  body.position.y = 4.2;
  body.castShadow = true;
  group.add(body);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 6.2, 3.8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), furMat);
  headGroup.add(head);

  if (!isCub) {
    const mane = new THREE.Mesh(new THREE.SphereGeometry(3.4, 8, 8), maneMat);
    mane.scale.set(1.1, 1.1, 0.85);
    mane.position.set(0, 0, -0.4);
    headGroup.add(mane);
  }
  group.add(headGroup);

  const legs = [];
  [[-1.6, 2.1, 2.4], [1.6, 2.1, 2.4], [-1.5, 2.1, -2.4], [1.5, 2.1, -2.4]].forEach(pos => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 4.2, 6), furMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  });

  group.userData = { headGroup, legs };
  return group;
}

// ZEBRA (Black & White Stripes)
function createZebraMesh() {
  const group = new THREE.Group();
  const whiteMat = createMaterial(0xf5f5f5, 0.8);
  const stripeMat = createMaterial(0x1a1a1a, 0.9);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.0, 7.0, 8), whiteMat);
  body.geometry.rotateX(Math.PI / 2);
  body.position.y = 5.2;
  body.castShadow = true;
  group.add(body);

  // Black stripes overlay rings
  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.6, 8), stripeMat);
    stripe.geometry.rotateX(Math.PI / 2);
    stripe.position.set(0, 5.2, i * 1.2);
    group.add(stripe);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 8.5, 3.5);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 3.5), whiteMat);
  headGroup.add(head);
  group.add(headGroup);

  const legs = [];
  [[-1.4, 2.6, 2.2], [1.4, 2.6, 2.2], [-1.4, 2.6, -2.2], [1.4, 2.6, -2.2]].forEach(pos => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 5.2, 6), whiteMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  });

  group.userData = { headGroup, legs };
  return group;
}

// ELEPHANT
function createElephantMesh() {
  const group = new THREE.Group();
  const skinMat = createMaterial(0x6e7278, 0.95);
  const tuskMat = createMaterial(0xfffae8, 0.3, 0.1);

  const body = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 8), skinMat);
  body.scale.set(1.0, 0.9, 1.3);
  body.position.y = 7.5;
  body.castShadow = true;
  group.add(body);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 9.2, 6.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 8), skinMat);
  headGroup.add(head);

  // Ears & Trunk
  [-4.2, 4.2].forEach(x => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.8, 0.3), skinMat);
    ear.position.set(x, 0.5, -0.8);
    ear.rotation.y = (x > 0 ? -1 : 1) * 0.35;
    headGroup.add(ear);
  });

  const trunkGroup = new THREE.Group();
  trunkGroup.position.set(0, -1.2, 3.2);
  let parent = trunkGroup;
  const trunkJoints = [];
  for (let i = 0; i < 5; i++) {
    const radius = 1.2 - i * 0.18;
    const joint = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, 1.6, 8), skinMat);
    joint.position.y = -0.8;
    joint.rotation.x = 0.15;
    parent.add(joint);
    trunkJoints.push(joint);
    parent = joint;
  }
  headGroup.add(trunkGroup);

  [-1.5, 1.5].forEach(x => {
    const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.1, 4.0, 6), tuskMat);
    tusk.geometry.rotateX(Math.PI / 3);
    tusk.position.set(x, -1.8, 2.8);
    headGroup.add(tusk);
  });

  group.add(headGroup);

  const legs = [];
  [[-2.8, 3.75, 4.0], [2.8, 3.75, 4.0], [-2.8, 3.75, -3.5], [2.8, 3.75, -3.5]].forEach(pos => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 7.5, 8), skinMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  });

  group.userData = { headGroup, trunkJoints, legs };
  return group;
}

// GIRAFFE
function createGiraffeMesh() {
  const group = new THREE.Group();
  const bodyMat = createMaterial(0xdfa048, 0.85);

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.2, 7.0), bodyMat);
  body.position.y = 11.5;
  body.rotation.x = -0.15;
  body.castShadow = true;
  group.add(body);

  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 13.0, 3.0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 12.0, 8), bodyMat);
  neck.geometry.rotateX(0.2);
  neck.position.set(0, 5.5, 1.2);
  neckGroup.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 3.2), bodyMat);
  head.position.set(0, 11.5, 3.0);
  neckGroup.add(head);
  group.add(neckGroup);

  const legs = [];
  [[-1.4, 6.25, 2.5], [1.4, 6.25, 2.5], [-1.4, 6.25, -2.5], [1.4, 6.25, -2.5]].forEach(pos => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.45, 12.5, 6), bodyMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  });

  group.userData = { neckGroup, legs };
  return group;
}

// GORILLA
function createGorillaMesh() {
  const group = new THREE.Group();
  const furMat = createMaterial(0x1a1c20, 0.9);
  const skinMat = createMaterial(0x2a2826, 0.85);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 8), furMat);
  chest.scale.set(1.2, 1.1, 1.0);
  chest.position.y = 5.2;
  chest.castShadow = true;
  group.add(chest);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 8.2, 1.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), skinMat);
  headGroup.add(head);
  group.add(headGroup);

  const legs = [];
  [[-3.2, 4.0, 1.5], [3.2, 4.0, 1.5]].forEach(pos => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.9, 6.5, 6), furMat);
    arm.position.set(...pos);
    arm.castShadow = true;
    group.add(arm);
    legs.push(arm);
  });

  group.userData = { headGroup, legs };
  return group;
}

// JAGUAR / LEOPARD
function createJaguarMesh() { return createLionMesh(false); }
function createLeopardMesh() {
  const group = createLionMesh(false);
  const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  [-0.6, 0.6].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), eyeGlowMat);
    eye.position.set(x, 6.8, 5.5);
    group.add(eye);
  });
  return group;
}

// POLAR BEAR
function createPolarBearMesh() {
  const group = new THREE.Group();
  const furMat = createMaterial(0xf4f7fa, 0.9, 0.05);

  const body = new THREE.Mesh(new THREE.SphereGeometry(4.2, 9, 8), furMat);
  body.scale.set(1.0, 0.95, 1.4);
  body.position.y = 5.2;
  body.castShadow = true;
  group.add(body);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 6.4, 4.8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.0, 8, 8), furMat);
  headGroup.add(head);
  group.add(headGroup);

  const legs = [];
  [[-2.1, 2.5, 3.2], [2.1, 2.5, 3.2], [-2.1, 2.5, -3.2], [2.1, 2.5, -3.2]].forEach(pos => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 5.0, 8), furMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  });

  group.userData = { headGroup, legs };
  return group;
}

// PENGUIN
function createPenguinMesh() {
  const group = new THREE.Group();
  const blackMat = createMaterial(0x12151a, 0.8);
  const whiteMat = createMaterial(0xffffff, 0.8);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 3.8, 8), blackMat);
  body.position.y = 2.4;
  body.castShadow = true;
  group.add(body);

  const belly = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 3.2, 8, 1, false, -Math.PI / 3, Math.PI * 0.66), whiteMat);
  belly.position.set(0, 2.3, 0.3);
  group.add(belly);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 4.6, 0);
  headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), blackMat));
  group.add(headGroup);

  group.userData = { headGroup, legs: [] };
  return group;
}

// SHARK
function createSharkMesh() {
  const group = new THREE.Group();
  const bodyMat = createMaterial(0x4a5d6e, 0.4, 0.2);

  const body = new THREE.Mesh(new THREE.ConeGeometry(2.5, 10.0, 8), bodyMat);
  body.geometry.rotateX(-Math.PI / 2);
  body.position.z = 2.0;
  group.add(body);

  const fin = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 4), bodyMat);
  fin.geometry.rotateX(-0.4);
  fin.position.set(0, 2.8, 1.0);
  group.add(fin);

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0, -3.2);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 2.2), bodyMat);
  tailFin.position.set(0, 0, -1.8);
  tailGroup.add(tailFin);
  group.add(tailGroup);

  group.userData = { tailGroup, legs: [] };
  return group;
}

// MANTA RAY
function createMantaRayMesh() {
  const group = new THREE.Group();
  const topMat = createMaterial(0x1a2430, 0.6, 0.2);

  const shape = new THREE.Shape();
  shape.moveTo(0, 6); shape.lineTo(7, 0); shape.lineTo(0, -4); shape.lineTo(-7, 0); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true });
  geo.rotateX(Math.PI / 2);
  group.add(new THREE.Mesh(geo, topMat));
  group.userData = { legs: [] };
  return group;
}

// CORAL REEF FISH
function createFishMesh() {
  const group = new THREE.Group();
  const colors = [0xff4422, 0xffbb00, 0x00ccff, 0xaa22ff];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const mat = createMaterial(color, 0.4, 0.3);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), mat);
  body.scale.set(0.6, 1.0, 1.4);
  group.add(body);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.8), mat);
  tail.position.set(0, 0, -1.2);
  group.add(tail);

  group.userData = { legs: [] };
  return group;
}

// KOMODO DRAGON
function createKomodoMesh() {
  const group = new THREE.Group();
  const scaleMat = createMaterial(0x4a3b2a, 0.95);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 6.5, 8), scaleMat);
  body.geometry.rotateX(Math.PI / 2);
  body.position.y = 1.4;
  body.castShadow = true;
  group.add(body);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.6, 3.8);
  headGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.4), scaleMat));
  group.add(headGroup);

  const legs = [];
  [[-1.8, 1.0, 2.0], [1.8, 1.0, 2.0], [-1.8, 1.0, -2.0], [1.8, 1.0, -2.0]].forEach(pos => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), scaleMat);
    leg.position.set(...pos);
    group.add(leg);
    legs.push(leg);
  });

  group.userData = { headGroup, legs };
  return group;
}

// EAGLE / CONDOR
function createEagleMesh() {
  const group = new THREE.Group();
  const featherMat = createMaterial(0x28201a, 0.8);

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 6), featherMat);
  body.geometry.rotateX(-Math.PI / 3);
  group.add(body);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 1.8), featherMat);
  leftWing.position.set(-2.8, 0.4, 0.5);
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 1.8), featherMat);
  rightWing.position.set(2.8, 0.4, 0.5);

  group.add(leftWing); group.add(rightWing);
  group.userData = { leftWing, rightWing, legs: [] };
  return group;
}

// FLAMINGO
function createFlamingoMesh() {
  const group = new THREE.Group();
  const pinkMat = createMaterial(0xff6699, 0.7);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), pinkMat);
  body.position.y = 4.2;
  group.add(body);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 4.2, 6), pinkMat);
  leg.position.set(0, 2.1, 0);
  group.add(leg);

  group.userData = { legs: [leg] };
  return group;
}

// GOLDEN LION STATUE
function createGoldenLionStatue() {
  const group = createLionMesh(false);
  group.scale.setScalar(1.6);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.25, emissive: 0x442200, emissiveIntensity: 0.3 });
  group.traverse(child => { if (child.isMesh) child.material = goldMat; });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 14), goldMat);
  plinth.position.y = -1.5;
  group.add(plinth);
  return group;
}

// ─── AUTONOMOUS ROAMING AI & PARAMETRIC ANIMATION LOOP ─────────────────────

export function updateAnimals(animals, time, delta) {
  for (const item of animals) {
    const { mesh, type, ai } = item;
    if (!mesh) continue;

    const ud = mesh.userData || {};

    // 1. AUTONOMOUS WANDERING AI MOVEMENT
    if (ai) {
      if (ai.isSoaring) {
        // Soar in circular flight path
        const angle = time * 0.5 + ai.angleOffset;
        mesh.position.x = ai.center.x + Math.cos(angle) * ai.radius;
        mesh.position.z = ai.center.z + Math.sin(angle) * ai.radius;
        mesh.position.y = ai.center.y + Math.sin(time * 1.5 + ai.phase) * 3.0;
        mesh.rotation.y = -angle + Math.PI / 2;
      } else if (ai.isSwimming) {
        // Swim in ocean circuit
        const angle = time * 0.4 + ai.angleOffset;
        mesh.position.x = ai.center.x + Math.cos(angle) * ai.radius;
        mesh.position.z = ai.center.z + Math.sin(angle) * ai.radius;
        mesh.position.y = ai.center.y + Math.sin(time * 1.2 + ai.phase) * 2.5;
        mesh.rotation.y = -angle + Math.PI / 2;
      } else {
        // Ground quadruped wandering AI
        const dist = mesh.position.distanceTo(ai.targetPos);
        if (dist < 4.0) {
          // Pick new target within radius
          const newAngle = Math.random() * Math.PI * 2;
          const newR = Math.random() * ai.radius;
          ai.targetPos.set(
            ai.center.x + Math.cos(newAngle) * newR,
            ai.center.y,
            ai.center.z + Math.sin(newAngle) * newR
          );
        }

        // Steer towards target position
        const dir = ai.targetPos.clone().sub(mesh.position).normalize();
        mesh.position.addScaledVector(dir, ai.speed * delta * 8.0);

        // Dynamically clamp y elevation to exact terrain surface
        mesh.position.y = getTerrainHeight(mesh.position.x, mesh.position.z);

        // Smooth rotation facing direction of travel
        const targetAngle = Math.atan2(dir.x, dir.z);
        mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetAngle, delta * 3.0);

        // Limb walking animation sync
        if (ud.legs && ud.legs.length >= 4) {
          const walkPhase = time * ai.speed * 12.0;
          ud.legs[0].rotation.x = Math.sin(walkPhase) * 0.4;
          ud.legs[1].rotation.x = -Math.sin(walkPhase) * 0.4;
          ud.legs[2].rotation.x = -Math.sin(walkPhase) * 0.4;
          ud.legs[3].rotation.x = Math.sin(walkPhase) * 0.4;
        }
      }
    }

    // 2. ORGANIC IDLE & JOINT ANIMATIONS
    switch (type) {
      case 'lion': case 'lioncub': case 'jaguar': case 'leopard': case 'polarbear': case 'zebra': {
        if (ud.headGroup) {
          ud.headGroup.rotation.y = Math.sin(time * 0.8 + mesh.id) * 0.12;
        }
        break;
      }
      case 'elephant': {
        if (ud.trunkJoints) {
          ud.trunkJoints.forEach((j, idx) => {
            j.rotation.z = Math.sin(time * 1.8 + idx * 0.4) * 0.12;
          });
        }
        break;
      }
      case 'shark': {
        if (ud.tailGroup) ud.tailGroup.rotation.y = Math.sin(time * 2.5) * 0.45;
        break;
      }
      case 'eagle': {
        if (ud.leftWing && ud.rightWing) {
          ud.leftWing.rotation.z = Math.sin(time * 5.0) * 0.4;
          ud.rightWing.rotation.z = -Math.sin(time * 5.0) * 0.4;
        }
        break;
      }
      case 'statue': {
        mesh.rotation.y += delta * 0.05;
        break;
      }
    }
  }
}
