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
const OUTER_TOP_R = 1.0;   // outer radius at rim (tumbler widens slightly)
const WALL_THICK  = 0.09;  // wall thickness (constant)
const BASE_THICK  = 0.30;  // solid base height
const TWIST_DEG   = 45;    // total rotation from base to rim
// Outer wall is split at BASE_THICK so the cavity-floor outer edge aligns
// exactly with an outer-wall ring — preventing a mesh seam/leak.
const RINGS_BELOW = 2;     // outer-wall ring count for solid base (y=0→BASE_THICK)
const RINGS_ABOVE = 12;    // outer-wall ring count for main body (BASE_THICK→HEIGHT)
const IOR         = 1.52;  // borosilicate glass

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
// Outward-normal winding: (BL, BR, TR) + (BL, TR, TL).
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
// outerHigh[0] is at y=BASE_THICK — the cavity floor outer edge snaps to this
// ring, sealing the mesh at that transition.
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
// Reversed winding: (BL, TR, BR) + (BL, TL, TR).
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
// Fan from center: (ring[i], center, ring[j]) → downward normal.
const centerBot = new Vector(0, 0, 0);
const botRing   = outerLow[0];
for (let i = 0; i < N; i++) {
  t(botRing[i], centerBot, botRing[(i + 1) % N]);
}

// ── Cavity floor (y=BASE_THICK, normal pointing up) ──────────────────────────
// Outer edge = outerHigh[0], which is the shared ring at y=BASE_THICK.
// Winding (outer[j], inner[i], outer[i]) + (inner[j], inner[i], outer[j]) → upward.
const cavOuter = outerHigh[0];
const cavInner = innerRings[0];
for (let i = 0; i < N; i++) {
  const j = (i + 1) % N;
  t(cavOuter[j], cavInner[i], cavOuter[i]);
  t(cavInner[j], cavInner[i], cavOuter[j]);
}

// ── Top rim (y=HEIGHT, normal pointing up) ────────────────────────────────────
// Outer edge = outerHigh[RINGS_ABOVE] at y=HEIGHT; inner edge = innerRings last.
const rimOuter = outerHigh[RINGS_ABOVE];
const rimInner = innerRings[RINGS_ABOVE];
for (let i = 0; i < N; i++) {
  const j = (i + 1) % N;
  t(rimOuter[j], rimInner[i], rimOuter[i]);
  t(rimInner[j], rimInner[i], rimOuter[j]);
}

const tumblerMesh = new Mesh({
  name: "tumbler",
  meshObjects: tris,
  material: glass,
});

// ── Scene lighting & environment ─────────────────────────────────────────────

// Warm overhead sphere light centred above the tumbler.
const overheadLight = new Sphere({
  center: new Point(0, 7, 0),
  radius: 1.2,
  name: "lightBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    emissive: new Color(8, 7.5, 6.5),
  }),
});

// Smaller fill light from the left-front to catch the rim and inner walls.
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
  material: new Material({
    albedo: new Color(0.92, 0.92, 0.92),
    roughness: 0.15,
  }),
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
];
