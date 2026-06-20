import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { Material } from "../Material.js";
import { Mesh } from "../Mesh.js";
import { Triangle } from "../Triangle.js";
import { Cylinder } from "../Cylinder.js";
import { Sphere } from "../Sphere.js";
import { getRotationXMatrix } from "../matrix.js";

export const cameraStart = new Point(0, 2.0, -2.5);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(16));

// DOF: wide aperture focused on the jade sphere for dramatic separation.
export const lensRadius    = 0.30;
export const focusDistance = 4.7;

// Participating media: atmospheric dust that makes the sun shaft visible.
export const sigma_t = 0.07;  // extinction (scattering + absorption)
export const sigma_s = 0.055; // scattering  (albedo ≈ 0.79)
export const phaseG  = 0.45;  // forward-scattering (Mie-like dust)

// ─── Wood grain texture ───────────────────────────────────────────────────────
function woodGrain(point: Point): Color {
  // Flat-sawn plank grain running along z; sine turbulence adds knot waviness.
  const grain = point.x
    + Math.sin(point.z * 3.1) * 0.35
    + Math.sin(point.z * 7.3 + point.x * 2.1) * 0.12
    + Math.sin(point.x * 5.7 - point.z * 1.9) * 0.08;
  const t = Math.pow((Math.sin(grain * 4.5) + 1) * 0.5, 2);
  const light = new Color(0.68, 0.48, 0.26);
  const dark  = new Color(0.35, 0.22, 0.09);
  return new Color(
    light.r * (1 - t) + dark.r * t,
    light.g * (1 - t) + dark.g * t,
    light.b * (1 - t) + dark.b * t
  );
}

// ─── Materials ────────────────────────────────────────────────────────────────
const benchTop   = new Material({ albedo: new Color(0.5, 0.35, 0.15), texture: (p) => woodGrain(p), roughness: 0.40 });
const benchSide  = new Material({ albedo: new Color(0.28, 0.18, 0.07) });
const wallMat    = new Material({ albedo: new Color(0.75, 0.74, 0.72) });
const floorMat   = new Material({ albedo: new Color(0.32, 0.31, 0.30) });
const glassMat   = new Material({ albedo: new Color(0, 0, 0), refractionIndex: 1.5 });

const liquids = {
  red:    new Material({ albedo: new Color(0.80, 0.04, 0.04), emissive: new Color(0.45, 0.02, 0.02) }),
  blue:   new Material({ albedo: new Color(0.04, 0.08, 0.85), emissive: new Color(0.02, 0.04, 0.50) }),
  green:  new Material({ albedo: new Color(0.04, 0.75, 0.10), emissive: new Color(0.02, 0.40, 0.05) }),
  amber:  new Material({ albedo: new Color(0.90, 0.55, 0.04), emissive: new Color(0.50, 0.28, 0.02) }),
  purple: new Material({ albedo: new Color(0.52, 0.04, 0.72), emissive: new Color(0.28, 0.02, 0.38) }),
  cyan:   new Material({ albedo: new Color(0.04, 0.72, 0.82), emissive: new Color(0.02, 0.36, 0.42) }),
  rose:   new Material({ albedo: new Color(0.88, 0.22, 0.45), emissive: new Color(0.45, 0.10, 0.22) }),
  teal:   new Material({ albedo: new Color(0.05, 0.55, 0.48), emissive: new Color(0.03, 0.28, 0.24) }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function testTube(x: number, z: number, liquid: Material): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, 0, z), radius: 0.12,  height: 0.75, material: glassMat }),
    new Cylinder({ center: new Point(x, 0, z), radius: 0.085, height: 0.50, material: liquid  }),
  ];
}

export const sceneObjects: SceneObject[] = [];

// ─── Bench ────────────────────────────────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(-2.5, 0, 0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 5, height: 5.5,
  normal: new Vector(0, 1, 0), orientation: "xzAxis",
  material: benchTop,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(-2.5, -0.6, 0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 5, height: 0.6,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: benchSide,
}));

// ─── Room ─────────────────────────────────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(-6, -0.6, -3),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 13,
  normal: new Vector(0, 1, 0), orientation: "xzAxis",
  material: floorMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(-5, -0.6, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 6, height: 13,
  normal: new Vector(1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(5, -0.6, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 6, height: 13,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));

// ─── Back wall with window hole ───────────────────────────────────────────────
const BZ     = 7;
const WX0 = -1.2, WX1 = 1.2;
const WY0 =  1.5, WY1 = 4.5;

// Below window
sceneObjects.push(new Rectangle({
  corner: new Point(-5, -0.6, BZ),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 10, height: WY0 + 0.6,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));
// Above window
sceneObjects.push(new Rectangle({
  corner: new Point(-5, WY1, BZ),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 10, height: 5 - WY1,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));
// Left of window
sceneObjects.push(new Rectangle({
  corner: new Point(-5, WY0, BZ),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: WX0 + 5, height: WY1 - WY0,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));
// Right of window
sceneObjects.push(new Rectangle({
  corner: new Point(WX1, WY0, BZ),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 5 - WX1, height: WY1 - WY0,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));

// ─── Window — emissive mesh representing sunlight ─────────────────────────────
const LZ     = BZ - 0.05;
const sunMat = new Material({ albedo: new Color(1, 0.95, 0.80), emissive: new Color(7, 6.5, 5) });
sceneObjects.push(new Mesh({
  name: "windowLight",
  material: sunMat,
  meshObjects: [
    new Triangle({ v1: new Vector(WX0, WY0, LZ), v2: new Vector(WX1, WY0, LZ), v3: new Vector(WX1, WY1, LZ), material: sunMat }),
    new Triangle({ v1: new Vector(WX0, WY0, LZ), v2: new Vector(WX1, WY1, LZ), v3: new Vector(WX0, WY1, LZ), material: sunMat }),
  ],
}));

// ─── Test tubes ───────────────────────────────────────────────────────────────
const tubes: [number, number, Material][] = [
  [-1.7, 1.8, liquids.red   ],
  [-0.9, 1.3, liquids.blue  ],
  [-0.1, 2.0, liquids.green ],
  [ 0.6, 1.5, liquids.amber ],
  [ 1.3, 1.9, liquids.purple],
  [ 1.8, 2.6, liquids.cyan  ],
  [-1.3, 2.8, liquids.rose  ],
  [ 0.4, 3.1, liquids.teal  ],
];
for (const [x, z, mat] of tubes) {
  for (const obj of testTube(x, z, mat)) sceneObjects.push(obj);
}

// ─── Jade sphere ──────────────────────────────────────────────────────────────
// Dragon material: jade green waxy gloss coat over SSS body.
// Sits center-table as the focal subject; wide DOF blurs the tubes behind it.
sceneObjects.push(new Sphere({
  center: new Point(0, 0.40, 2.0),
  radius: 0.40,
  material: new Material({
    albedo:    new Color(0.08, 0.48, 0.22),
    roughness: 0.08,
    subsurface: 0.62,
  }),
}));

// ─── Fill light ───────────────────────────────────────────────────────────────
// Warm overhead panel illuminates front faces of glass; sampled by area-light NEE.
const fillMat = new Material({ albedo: new Color(1, 0.92, 0.80), emissive: new Color(2.5, 2.2, 1.8) });
sceneObjects.push(new Mesh({
  name: "fillLight",
  material: fillMat,
  meshObjects: [
    new Triangle({ v1: new Vector(-1.5, 5, -1), v2: new Vector(1.5, 5, -1), v3: new Vector(1.5, 5, 1), material: fillMat }),
    new Triangle({ v1: new Vector(-1.5, 5, -1), v2: new Vector(1.5, 5,  1), v3: new Vector(-1.5, 5, 1), material: fillMat }),
  ],
}));
