// terrain.js — Procedural terrain generation for Virtual Zoo
// Creates a large displaced PlaneGeometry with per-vertex zone-based coloring
// Also creates instanced trees, water plane, and path trail between zones.

import * as THREE from 'three';
import { ZONE_CENTERS } from './waypoints.js';

// ─── Perlin noise ─────────────────────────────────────────────────────────────
const _perm = new Uint8Array(512);
(() => {
  const base = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,
    103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,
    252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,
    68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,
    230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,
    76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,
    186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,
    59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,
    70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,
    178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,
    81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,
    115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,
    195,78,66,215,61,156,180];
  for (let i = 0; i < 512; i++) _perm[i] = base[i & 255];
})();

function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _lerp(t, a, b) { return a + t * (b - a); }
function _grad(h, x, y) {
  const u = (h & 1) ? x : y, v = (h & 2) ? -x : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function noise2d(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = _fade(x), v = _fade(y);
  const a = _perm[X] + Y, b = _perm[X + 1] + Y;
  return _lerp(v,
    _lerp(u, _grad(_perm[a],     x,     y), _grad(_perm[b],     x - 1, y)),
    _lerp(u, _grad(_perm[a + 1], x, y - 1), _grad(_perm[b + 1], x - 1, y - 1))
  );
}

export function fbm(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let value = 0, amplitude = 0.5, frequency = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return value / max;
}

// ─── Zone influence ────────────────────────────────────────────────────────────
const ZONE_RADIUS = 300; // influence radius per zone

function getZoneWeights(wx, wz) {
  const weights = ZONE_CENTERS.map(zone => {
    const dx = wx - zone.x, dz = wz - zone.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const w = Math.max(0, 1 - dist / ZONE_RADIUS);
    return w * w; // squared for sharper falloff
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map(w => w / total);
}

// Exact Terrain Elevation Query Function for Ground Clamping 3D Objects
export function getTerrainHeight(wx, wz) {
  const weights = getZoneWeights(wx, wz);
  let baseH = 0, noiseAmp = 0;
  for (let z = 0; z < ZONE_CENTERS.length; z++) {
    const w = weights[z];
    baseH += w * ZONE_CENTERS[z].baseHeight;
    noiseAmp += w * ZONE_CENTERS[z].noiseAmp;
  }
  const scale = 0.004;
  const noise = fbm(wx * scale, wz * scale, 5) * 2 - 1;
  return baseH + noise * noiseAmp;
}

// ─── Terrain creation ─────────────────────────────────────────────────────────
export function createTerrain(scene) {
  const SIZE = 2500, SEGS = 192;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;

  // Vertex colors
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i);

    const weights = getZoneWeights(wx, wz);
    let r = 0, g = 0, b = 0;
    for (let z = 0; z < ZONE_CENTERS.length; z++) {
      const w = weights[z];
      r += w * ZONE_CENTERS[z].color[0];
      g += w * ZONE_CENTERS[z].color[1];
      b += w * ZONE_CENTERS[z].color[2];
    }

    const finalY = getTerrainHeight(wx, wz);
    pos.setY(i, finalY);

    const scale = 0.004;
    const noise = fbm(wx * scale, wz * scale, 5) * 2 - 1;
    const ridge = Math.max(0, noise) * 0.15;
    colors[i * 3]     = Math.min(1, r + ridge * 0.5 + 0.05);
    colors[i * 3 + 1] = Math.min(1, g + ridge * 0.6 + 0.05);
    colors[i * 3 + 2] = Math.min(1, b + ridge * 0.4 + 0.05);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);

  // Water plane for ocean zone
  const waterGeo = new THREE.PlaneGeometry(360, 360, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0a2a4a,
    roughness: 0.05,
    metalness: 0.6,
    transparent: true,
    opacity: 0.88,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(825, -2, 565);
  water.receiveShadow = true;
  scene.add(water);
  scene.userData.water = water;

  // Dome for aviary
  const domeGeo = new THREE.SphereGeometry(90, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    transparent: true,
    opacity: 0.18,
    roughness: 0.1,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.set(105, 10, 808);
  scene.add(dome);

  // Entry Plaza & Visitor Courtyard Architecture
  createEntryPlaza(scene);

  // Instanced trees
  createTrees(scene);

  // Habitat props (rocks, icebergs, lanterns, cacti)
  createHabitatProps(scene);

  // Path trail between waypoints
  createPathTrail(scene);

  return mesh;
}

// ─── Trees & Dense Vegetation ──────────────────────────────────────────────────
function createTrees(scene) {
  const foliageGeo = new THREE.ConeGeometry(4.5, 12, 6);
  const trunkGeo   = new THREE.CylinderGeometry(0.7, 0.9, 7, 5);

  const TREE_ZONES = [
    { z: ZONE_CENTERS[0], count: 120, color: 0x5a7a4a }, // gateway
    { z: ZONE_CENTERS[1], count: 65,  color: 0x8a7a3a }, // savanna
    { z: ZONE_CENTERS[2], count: 320, color: 0x1a5a18 }, // rainforest (ultra dense)
    { z: ZONE_CENTERS[6], count: 180, color: 0x3a8a3a }, // aviary
    { z: ZONE_CENTERS[7], count: 140, color: 0x182a18 }, // night safari
    { z: ZONE_CENTERS[8], count: 150, color: 0x4a7a42 }, // nursery
    { z: ZONE_CENTERS[9], count: 90,  color: 0x5a5848 }, // archive
  ];

  for (const entry of TREE_ZONES) {
    const foliageMat = new THREE.MeshStandardMaterial({ color: entry.color, roughness: 0.9 });
    const trunkMat   = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1.0 });
    const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, entry.count);
    const trunk   = new THREE.InstancedMesh(trunkGeo,   trunkMat,   entry.count);
    foliage.castShadow = true;
    trunk.castShadow = true;

    const mat4 = new THREE.Matrix4();
    const pos  = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < entry.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 220;
      const tx = entry.z.x + Math.cos(angle) * r;
      const tz = entry.z.z + Math.sin(angle) * r;
      const ty = getTerrainHeight(tx, tz);
      const s = 0.7 + Math.random() * 0.9;

      pos.set(tx, ty + 6 * s, tz);
      quat.identity();
      scale.setScalar(s);
      mat4.compose(pos, quat, scale);
      foliage.setMatrixAt(i, mat4);

      pos.set(tx, ty + 2.5 * s, tz);
      scale.set(s, s, s);
      mat4.compose(pos, quat, scale);
      trunk.setMatrixAt(i, mat4);
    }
    foliage.instanceMatrix.needsUpdate = true;
    trunk.instanceMatrix.needsUpdate = true;
    scene.add(foliage);
    scene.add(trunk);
  }

  // 8,500+ Instanced Grass, Wildflowers & Leafy Shrubs Across Terrain
  const FLORA_TYPES = [
    { geo: new THREE.ConeGeometry(1.2, 3.8, 3), mat: new THREE.MeshStandardMaterial({ color: 0x7bb034, roughness: 0.85 }), count: 5500 },
    { geo: new THREE.DodecahedronGeometry(0.8, 0), mat: new THREE.MeshStandardMaterial({ color: 0xffdd22, roughness: 0.6 }), count: 1200 },
    { geo: new THREE.DodecahedronGeometry(0.7, 0), mat: new THREE.MeshStandardMaterial({ color: 0xff66bb, roughness: 0.6 }), count: 1000 },
    { geo: new THREE.SphereGeometry(1.5, 5, 5), mat: new THREE.MeshStandardMaterial({ color: 0x4a8b38, roughness: 0.9 }), count: 800 }
  ];

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();

  for (const flora of FLORA_TYPES) {
    const instMesh = new THREE.InstancedMesh(flora.geo, flora.mat, flora.count);
    instMesh.castShadow = true;
    for (let i = 0; i < flora.count; i++) {
      const gx = (Math.random() - 0.5) * 2200;
      const gz = (Math.random() - 0.5) * 2200;
      const gy = getTerrainHeight(gx, gz) + 1.2;
      const s = 0.6 + Math.random() * 0.9;
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      mat4.compose(new THREE.Vector3(gx, gy, gz), quat, new THREE.Vector3(s, s, s));
      instMesh.setMatrixAt(i, mat4);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    scene.add(instMesh);
  }
}

// ─── Entry Plaza & Courtyard Architecture ────────────────────────────────────
function createEntryPlaza(scene) {
  // Cobblestone Paved Courtyard Base Disk
  const plazaGeo = new THREE.CylinderGeometry(85, 90, 1.2, 32);
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0x5a554a,
    roughness: 0.8,
    metalness: 0.1,
  });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(0, 5.0, -10);
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Grand Stone Water Fountain
  const fountainGeo = new THREE.CylinderGeometry(14, 16, 3.5, 16);
  const fountainMat = new THREE.MeshStandardMaterial({ color: 0x7a7468, roughness: 0.6 });
  const fountain = new THREE.Mesh(fountainGeo, fountainMat);
  fountain.position.set(0, 7.0, -10);
  fountain.castShadow = true;
  fountain.receiveShadow = true;
  scene.add(fountain);

  const poolWaterGeo = new THREE.CylinderGeometry(12, 12, 0.4, 16);
  const poolWaterMat = new THREE.MeshStandardMaterial({ color: 0x0088cc, roughness: 0.1, transparent: true, opacity: 0.85 });
  const poolWater = new THREE.Mesh(poolWaterGeo, poolWaterMat);
  poolWater.position.set(0, 8.6, -10);
  scene.add(poolWater);

  // Entrance Archway Pillars
  [-35, 35].forEach(x => {
    const pillarGeo = new THREE.BoxGeometry(4.5, 18, 4.5);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a8475, roughness: 0.7 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 14, 30);
    pillar.castShadow = true;
    scene.add(pillar);
  });
}

// ─── Path trail ───────────────────────────────────────────────────────────────
function createPathTrail(scene) {
  // Glowing dotted trail connecting zone centers
  const sphereGeo = new THREE.SphereGeometry(1.2, 6, 6);
  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xeacf9f,
    emissive: 0xeacf9f,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });

  const centers = ZONE_CENTERS;
  for (let i = 0; i < centers.length - 1; i++) {
    const from = centers[i];
    const to   = centers[i + 1];
    const steps = 20;
    for (let s = 0; s <= steps; s++) {
      const t  = s / steps;
      const x  = from.x + (to.x - from.x) * t;
      const z  = from.z + (to.z - from.z) * t;
      const y0 = from.baseHeight + (to.baseHeight - from.baseHeight) * t;
      const noise = fbm(x * 0.004, z * 0.004) * 15;
      const y  = y0 + noise + 1.5;

      const dot = new THREE.Mesh(sphereGeo, dotMat);
      dot.position.set(x, y, z);
      scene.add(dot);
    }
  }
}

// ─── HABITAT PROPS FOR ALL 10 BIOMES ───────────────────────────────────────────
function createHabitatProps(scene) {
  // 1. SAVANNA (Biome 2): Rock Outcrops & Acacia Perches
  const rockGeo = new THREE.DodecahedronGeometry(4, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.95 });
  for (let i = 0; i < 18; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const scale = 0.8 + Math.random() * 1.5;
    rock.scale.set(scale * 1.2, scale * 0.8, scale * 1.1);
    const rx = 370 + (Math.random() - 0.5) * 120;
    const rz = -220 + (Math.random() - 0.5) * 120;
    rock.position.set(rx, getTerrainHeight(rx, rz) + 2, rz);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    scene.add(rock);
  }

  // 2. RAINFOREST (Biome 3): Jungle River Stream & Mossy Stone Arches
  const riverGeo = new THREE.PlaneGeometry(160, 40, 1, 1);
  riverGeo.rotateX(-Math.PI / 2);
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x0077aa, roughness: 0.1, transparent: true, opacity: 0.85 });
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.position.set(690, getTerrainHeight(690, -80) + 0.5, -80);
  river.rotation.y = Math.PI * 0.25;
  scene.add(river);

  const archGeo = new THREE.TorusGeometry(12, 2.5, 8, 16, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({ color: 0x2d4d24, roughness: 0.9 });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.set(680, getTerrainHeight(680, -90) + 6, -90);
  arch.rotation.y = Math.PI * 0.3;
  arch.castShadow = true;
  scene.add(arch);

  // 3. ARCTIC TUNDRA (Biome 4): Icy Blue Glacier Icebergs & Snow Drifts
  const iceGeo = new THREE.DodecahedronGeometry(9, 1);
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xb8e2ff, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 16; i++) {
    const ice = new THREE.Mesh(iceGeo, iceMat);
    const scale = 1.2 + Math.random() * 2.2;
    ice.scale.set(scale, scale * 2.2, scale);
    const ix = 950 + (Math.random() - 0.5) * 150;
    const iz = 200 + (Math.random() - 0.5) * 150;
    ice.position.set(ix, getTerrainHeight(ix, iz) + 5, iz);
    ice.rotation.y = Math.PI * Math.random();
    ice.castShadow = true;
    scene.add(ice);
  }

  // 4. DEEP OCEAN (Biome 5): Neon Coral Reefs & Kelp Forests
  const coralColors = [0xff33aa, 0x00eeff, 0xffaa00, 0x9933ff];
  for (let i = 0; i < 24; i++) {
    const coralMat = new THREE.MeshStandardMaterial({
      color: coralColors[i % coralColors.length],
      emissive: coralColors[i % coralColors.length],
      emissiveIntensity: 0.2,
      roughness: 0.5
    });
    const coral = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5 + Math.random() * 2, 1), coralMat);
    const cx = 825 + (Math.random() - 0.5) * 140;
    const cz = 565 + (Math.random() - 0.5) * 140;
    coral.position.set(cx, 4 + Math.random() * 8, cz);
    scene.add(coral);
  }

  // Sea Kelp Stalks
  const kelpMat = new THREE.MeshStandardMaterial({ color: 0x00aa55, roughness: 0.8 });
  for (let i = 0; i < 30; i++) {
    const kelp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 24, 6), kelpMat);
    const kx = 810 + (Math.random() - 0.5) * 120;
    const kz = 550 + (Math.random() - 0.5) * 120;
    kelp.position.set(kx, 12, kz);
    scene.add(kelp);
  }

  // 5. DESERT BADLANDS (Biome 6): Red Canyon Mesas & Saguaro Cacti
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0xa34928, roughness: 0.95 });
  for (let i = 0; i < 8; i++) {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 22, 7), mesaMat);
    const mx = 580 + (Math.random() - 0.5) * 140;
    const mz = 720 + (Math.random() - 0.5) * 140;
    mesa.position.set(mx, getTerrainHeight(mx, mz) + 8, mz);
    mesa.castShadow = true;
    scene.add(mesa);
  }

  // Saguaro Cacti
  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x3b6e32, roughness: 0.9 });
  for (let i = 0; i < 18; i++) {
    const cactus = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 6), cactusMat);
    const cx = 570 + (Math.random() - 0.5) * 130;
    const cz = 710 + (Math.random() - 0.5) * 130;
    cactus.position.set(cx, getTerrainHeight(cx, cz) + 5, cz);
    cactus.castShadow = true;
    scene.add(cactus);
  }

  // 6. THE GRAND AVIARY (Biome 7): Condor Cliff Perches
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(16, 28, 16), cliffMat);
    const cx = 105 + (Math.random() - 0.5) * 80;
    const cz = 800 + (Math.random() - 0.5) * 80;
    cliff.position.set(cx, getTerrainHeight(cx, cz) + 12, cz);
    cliff.castShadow = true;
    scene.add(cliff);
  }

  // 7. NIGHT SAFARI (Biome 8): Warm Red Safari Lanterns & Floating Fireflies
  const lanternGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 6);
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x221a14 });
  const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });

  for (let i = 0; i < 12; i++) {
    const px = -150 + (Math.random() - 0.5) * 100;
    const pz = 640 + (Math.random() - 0.5) * 100;
    const py = getTerrainHeight(px, pz);

    const pole = new THREE.Mesh(lanternGeo, lanternMat);
    pole.position.set(px, py + 3, pz);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), lightGlowMat);
    glow.position.set(px, py + 6, pz);
    scene.add(pole);
    scene.add(glow);

    const pointLight = new THREE.PointLight(0xffaa44, 2.5, 35);
    pointLight.position.set(px, py + 6, pz);
    scene.add(pointLight);
  }

  // 8. THE NURSERY (Biome 9): Wooden Fences & Pink Cherry Blossom Canopies
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
  for (let i = 0; i < 16; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), fenceMat);
    const fx = -220 + Math.cos((i / 16) * Math.PI * 2) * 35;
    const fz = 320 + Math.sin((i / 16) * Math.PI * 2) * 35;
    post.position.set(fx, getTerrainHeight(fx, fz) + 2.5, fz);
    scene.add(post);
  }

  const cherryMat = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8 });
  const cherryTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const cx = -230 + (Math.random() - 0.5) * 60;
    const cz = 310 + (Math.random() - 0.5) * 60;
    const cy = getTerrainHeight(cx, cz);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 10, 6), cherryTrunkMat);
    trunk.position.set(cx, cy + 5, cz);

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(7, 1), cherryMat);
    canopy.position.set(cx, cy + 12, cz);

    scene.add(trunk);
    scene.add(canopy);
  }

  // 9. THE ARCHIVE (Biome 10): Ancient Stone Pillars & Holographic Obelisk
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a8475, roughness: 0.7 });
  for (let i = 0; i < 8; i++) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 20, 12), pillarMat);
    const px = -82 + Math.cos((i / 8) * Math.PI * 2) * 45;
    const pz = -18 + Math.sin((i / 8) * Math.PI * 2) * 45;
    pillar.position.set(px, getTerrainHeight(px, pz) + 10, pz);
    pillar.castShadow = true;
    scene.add(pillar);
  }

  // Central Hologram Monolith Obelisk
  const obeliskGeo = new THREE.BoxGeometry(6, 32, 6);
  const obeliskMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.3, metalness: 0.7 });
  const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
  obelisk.position.set(-82, getTerrainHeight(-82, -18) + 16, -18);
  obelisk.castShadow = true;
  scene.add(obelisk);

  // Hologram Blue Data Ring
  const ringGeo = new THREE.TorusGeometry(10, 0.4, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.8 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(-82, getTerrainHeight(-82, -18) + 16, -18);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
}

