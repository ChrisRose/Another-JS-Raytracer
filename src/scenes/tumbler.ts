import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Material } from "../Material.js";
import { Triangle } from "../Triangle.js";
import { Mesh } from "../Mesh.js";
import { Sphere } from "../Sphere.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";

export const cameraStart = new Point(0, 1.6, -5);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(3));

// ── Tumbler geometry parameters ─────────────────────────────────────────────
const N           = 12;    // facets around circumference
const HEIGHT      = 2.5;   // world units
const OUTER_BOT_R = 0.85;  // outer radius at base
const OUTER_TOP_R = 1.0;   // outer radius at rim
const WALL_THICK  = 0.09;  // wall thickness
const BASE_THICK  = 0.30;  // solid base height
const TWIST_DEG   = 45;    // total rotation base→rim
// Outer wall is split at BASE_THICK so the cavity-floor outer edge aligns
// exactly with an outer-wall ring — preventing a mesh seam/leak.
const RINGS_BELOW = 2;
const RINGS_ABOVE = 12;
const IOR         = 1.52;

const glass = new Material({
  albedo: new Color(0.97, 0.99, 1.0),
  refractionIndex: IOR,
});

function outerR(y: number) {
  return OUTER_BOT_R + (OUTER_TOP_R - OUTER_BOT_R) * (y / HEIGHT);
}
function innerR(y: number) {
  return outerR(y) - WALL_THICK;
}

// Position of vertex i on a ring at height y with accumulated twist.
// Rings go CCW when viewed from above — this winding convention is used
// throughout to ensure consistent outward-pointing face normals.
function vx(r: number, y: number, i: number): Vector {
  const twist = ((TWIST_DEG * Math.PI) / 180) * (y / HEIGHT);
  const angle = (2 * Math.PI * i) / N + twist;
  return new Vector(r * Math.cos(angle), y, r * Math.sin(angle));
}
function makeOuterRing(y: number): Vector[] {
  return Array.from({ length: N }, (_, i) => vx(outerR(y), y, i));
}
function makeInnerRing(y: number): Vector[] {
  return Array.from({ length: N }, (_, i) => vx(innerR(y), y, i));
}

const tris: Triangle[] = [];
const t = (v1: Vector, v2: Vector, v3: Vector) =>
  tris.push(new Triangle({ v1, v2, v3, material: glass }));

// ── Outer wall — lower section (y=0 → BASE_THICK) ───────────────────────────
const outerLow: Vector[][] = [];
for (let r = 0; r <= RINGS_BELOW; r++) {
  outerLow.push(makeOuterRing((r / RINGS_BELOW) * BASE_THICK));
}
for (let r = 0; r < RINGS_BELOW; r++) {
  const lo = outerLow[r], hi = outerLow[r + 1];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    t(lo[i], lo[j], hi[j]);
    t(lo[i], hi[j], hi[i]);
  }
}

// ── Outer wall — upper section (BASE_THICK → HEIGHT) ─────────────────────────
// outerHigh[0] at y=BASE_THICK is shared with the cavity-floor outer edge.
const outerHigh: Vector[][] = [];
for (let r = 0; r <= RINGS_ABOVE; r++) {
  outerHigh.push(makeOuterRing(BASE_THICK + (r / RINGS_ABOVE) * (HEIGHT - BASE_THICK)));
}
for (let r = 0; r < RINGS_ABOVE; r++) {
  const lo = outerHigh[r], hi = outerHigh[r + 1];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    t(lo[i], lo[j], hi[j]);
    t(lo[i], hi[j], hi[i]);
  }
}

// ── Inner wall (BASE_THICK → HEIGHT, normal points inward toward cavity) ──────
const innerRings: Vector[][] = [];
for (let r = 0; r <= RINGS_ABOVE; r++) {
  innerRings.push(makeInnerRing(BASE_THICK + (r / RINGS_ABOVE) * (HEIGHT - BASE_THICK)));
}
for (let r = 0; r < RINGS_ABOVE; r++) {
  const lo = innerRings[r], hi = innerRings[r + 1];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    t(lo[i], hi[j], lo[j]);
    t(lo[i], hi[i], hi[j]);
  }
}

// ── Exterior bottom face (y=0, normal pointing down) ─────────────────────────
const centerBot = new Vector(0, 0, 0);
const botRing   = outerLow[0];
for (let i = 0; i < N; i++) {
  t(botRing[i], centerBot, botRing[(i + 1) % N]);
}

// ── Cavity floor (y=BASE_THICK, normal pointing up) ──────────────────────────
const cavOuter = outerHigh[0];
const cavInner = innerRings[0];
for (let i = 0; i < N; i++) {
  const j = (i + 1) % N;
  t(cavOuter[j], cavInner[i], cavOuter[i]);
  t(cavInner[j], cavInner[i], cavOuter[j]);
}

// ── Top rim (y=HEIGHT, normal pointing up) ────────────────────────────────────
const rimOuter = outerHigh[RINGS_ABOVE];
const rimInner = innerRings[RINGS_ABOVE];
for (let i = 0; i < N; i++) {
  const j = (i + 1) % N;
  t(rimOuter[j], rimInner[i], rimOuter[i]);
  t(rimInner[j], rimInner[i], rimOuter[j]);
}

const tumblerMesh = new Mesh({ name: "tumbler", meshObjects: tris, material: glass });

// ── Water ────────────────────────────────────────────────────────────────────
// Fills the cavity from BASE_THICK to WATER_LEVEL.
// Water rings use makeInnerRing() — same CCW orientation as the tumbler rings,
// so the same outward-normal winding (BL,BR,TR)+(BL,TR,TL) applies.
const WATER_LEVEL = 1.85;
const WATER_RINGS = RINGS_ABOVE;

const waterMat = new Material({
  albedo: new Color(0.82, 0.94, 1.0),
  refractionIndex: 1.33,
});

const waterRings: Vector[][] = [];
for (let r = 0; r <= WATER_RINGS; r++) {
  const y = BASE_THICK + (r / WATER_RINGS) * (WATER_LEVEL - BASE_THICK);
  waterRings.push(makeInnerRing(y));
}

const waterTris: Triangle[] = [];
const wt = (v1: Vector, v2: Vector, v3: Vector) =>
  waterTris.push(new Triangle({ v1, v2, v3, material: waterMat }));

// Outer wall (normals outward from water = toward glass inner surface)
for (let r = 0; r < WATER_RINGS; r++) {
  const lo = waterRings[r], hi = waterRings[r + 1];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    wt(lo[i], lo[j], hi[j]);
    wt(lo[i], hi[j], hi[i]);
  }
}

// Top face (normal up — the air/water interface visible from the camera)
const waterTopCenter = new Vector(0, WATER_LEVEL, 0);
for (let i = 0; i < N; i++) {
  wt(waterTopCenter, waterRings[WATER_RINGS][i], waterRings[WATER_RINGS][(i + 1) % N]);
}

// No bottom face: the glass cavity floor at y=BASE_THICK already bounds this
// surface; adding a coincident water face would cause z-fighting.

const waterMesh = new Mesh({ name: "water", meshObjects: waterTris, material: waterMat });

// ── Straw ────────────────────────────────────────────────────────────────────
// A thin cylinder leaning slightly toward the camera.
// Bottom sits in the water, top sticks up above the rim.
const N_STRAW   = 8;
const STRAW_R   = 0.04;
const STRAW_SEGS = 2;

const strawBotVec = new Vector(0.30, BASE_THICK + 0.05, 0.20);
const strawTopVec = new Vector(0.10, HEIGHT + 0.92, -0.35);

const _axisRaw = strawTopVec.subtract(strawBotVec);
const _axisLen = _axisRaw.length();
const strawAxis = _axisRaw.multiply(1 / _axisLen);

// Perpendicular frame for the straw cross-section.
// Negate the ring angle so rings go CCW (matching tumbler convention),
// letting us reuse the standard outward-normal winding.
const _worldRef = Math.abs(strawAxis.y) < 0.9
  ? new Vector(0, 1, 0)
  : new Vector(1, 0, 0);
const strawU = _worldRef.crossProduct(strawAxis).normalize();
const strawV = strawAxis.crossProduct(strawU).normalize();

function strawRing(center: Vector): Vector[] {
  return Array.from({ length: N_STRAW }, (_, i) => {
    const angle = -(2 * Math.PI * i) / N_STRAW; // negated → CCW from straw tip
    return center
      .add(strawU.multiply(STRAW_R * Math.cos(angle)))
      .add(strawV.multiply(STRAW_R * Math.sin(angle)));
  });
}
function strawNormal(i: number): Vector {
  const angle = -(2 * Math.PI * i) / N_STRAW;
  return strawU.multiply(Math.cos(angle)).add(strawV.multiply(Math.sin(angle)));
}

// Candy-stripe texture: red and white bands along the straw axis.
const _sBx = strawBotVec.x, _sBy = strawBotVec.y, _sBz = strawBotVec.z;
const _sAx = strawAxis.x,   _sAy = strawAxis.y,   _sAz = strawAxis.z;
const strawMat = new Material({
  albedo: new Color(0.92, 0.10, 0.10),
  texture: (point) => {
    const proj = (point.x - _sBx) * _sAx + (point.y - _sBy) * _sAy + (point.z - _sBz) * _sAz;
    return Math.floor(proj * 7) % 2 === 0
      ? new Color(0.92, 0.10, 0.10)
      : new Color(0.95, 0.95, 0.95);
  },
});

const strawRings: Vector[][] = [];
for (let s = 0; s <= STRAW_SEGS; s++) {
  const center = strawBotVec.add(strawAxis.multiply((_axisLen * s) / STRAW_SEGS));
  strawRings.push(strawRing(center));
}

const strawTris: Triangle[] = [];
const st = (v1: Vector, v2: Vector, v3: Vector, vn: Vector[]) =>
  strawTris.push(new Triangle({ v1, v2, v3, material: strawMat, vertextNormals: vn }));

// Outer wall with smooth vertex normals (correct shading for a round cylinder)
for (let s = 0; s < STRAW_SEGS; s++) {
  const lo = strawRings[s], hi = strawRings[s + 1];
  for (let i = 0; i < N_STRAW; i++) {
    const j = (i + 1) % N_STRAW;
    const ni = strawNormal(i), nj = strawNormal(j);
    st(lo[i], lo[j], hi[j], [ni, nj, nj]);
    st(lo[i], hi[j], hi[i], [ni, nj, ni]);
  }
}

// Bottom cap (normal toward -strawAxis; straw sits on the glass floor)
const botCenter = strawRings[0].reduce((a, b) => a.add(b)).multiply(1 / N_STRAW);
// Approximate center — just use strawBotVec shifted to cap position
const strawCapBot = strawBotVec;
const strawCapTop = strawTopVec;
for (let i = 0; i < N_STRAW; i++) {
  const j = (i + 1) % N_STRAW;
  strawTris.push(new Triangle({ v1: strawRings[0][i],           v2: strawCapBot, v3: strawRings[0][j],           material: strawMat }));
  strawTris.push(new Triangle({ v1: strawCapTop,                 v2: strawRings[STRAW_SEGS][i], v3: strawRings[STRAW_SEGS][j], material: strawMat }));
}

const strawMesh = new Mesh({ name: "straw", meshObjects: strawTris, material: strawMat });

// ── Scene lighting & environment ─────────────────────────────────────────────

const overheadLight = new Sphere({
  center: new Point(0, 7, 0),
  radius: 1.2,
  name: "lightBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    emissive: new Color(8, 7.5, 6.5),
  }),
});

const fillLight = new Sphere({
  center: new Point(-4, 4, -4),
  radius: 0.7,
  name: "lightBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    emissive: new Color(3, 3.5, 4),
  }),
});

// ── Room surfaces ─────────────────────────────────────────────────────────────

const floor = new Rectangle({
  corner: new Point(-8, 0, -8),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 16,
  height: 16,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.92, 0.92, 0.92), roughness: 0.15 }),
});

const backWall = new Rectangle({
  corner: new Point(-6, 0, 6),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 12,
  height: 8,
  orientation: "xyAxis",
  normal: new Vector(0, 0, -1),
  material: new Material({ albedo: new Color(0.88, 0.88, 0.88) }),
});

const leftWall = new Rectangle({
  corner: new Point(-6, 0, -8),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 14,
  height: 8,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({ albedo: new Color(0.85, 0.30, 0.20) }),
});

const rightWall = new Rectangle({
  corner: new Point(6, 0, -8),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 14,
  height: 8,
  orientation: "yzAxis",
  normal: new Vector(-1, 0, 0),
  material: new Material({ albedo: new Color(0.20, 0.35, 0.80) }),
});

const ceiling = new Rectangle({
  corner: new Point(-6, 8, -8),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 12,
  height: 14,
  normal: new Vector(0, -1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.90, 0.90, 0.90) }),
});

export const sceneObjects: SceneObject[] = [
  overheadLight,
  fillLight,
  floor,
  backWall,
  leftWall,
  rightWall,
  ceiling,
  tumblerMesh,
  waterMesh,
  strawMesh,
];
