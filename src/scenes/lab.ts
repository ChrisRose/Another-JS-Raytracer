import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { Material } from "../Material.js";
import { Mesh } from "../Mesh.js";
import { Triangle } from "../Triangle.js";
import { Cylinder } from "../Cylinder.js";
import { getRotationXMatrix } from "../matrix.js";

export const cameraStart = new Point(0, 2.8, -2.5);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(16));

// Participating media: atmospheric dust that makes the sun shaft visible.
export const sigma_t = 0.07;  // extinction (scattering + absorption)
export const sigma_s = 0.055; // scattering  (albedo ≈ 0.79)
export const phaseG  = 0.45;  // forward-scattering (Mie-like dust)

// ─── Wood grain texture ───────────────────────────────────────────────────────
function woodGrain(point: Point): Color {
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
const capMat     = new Material({ albedo: new Color(0.95, 0.95, 0.95) });

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
    new Cylinder({ center: new Point(x, 0,    z), radius: 0.12,  height: 0.75, material: glassMat }),
    new Cylinder({ center: new Point(x, 0,    z), radius: 0.085, height: 0.50, material: liquid  }),
    new Cylinder({ center: new Point(x, 0.68, z), radius: 0.13,  height: 0.12, material: capMat  }),
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
  width: 13, height: 13,
  normal: new Vector(1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));

// ─── Back wall (solid) ────────────────────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(-5, -0.6, 7),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 10, height: 13,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));

// ─── Right wall with window hole ──────────────────────────────────────────────
const WY0 = 0.3, WY1 = 4.5;
const WZ0 = 0.2, WZ1 = 4.0;

// Below window
sceneObjects.push(new Rectangle({
  corner: new Point(5, -0.6, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 13, height: WY0 + 0.6,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
// Above window
sceneObjects.push(new Rectangle({
  corner: new Point(5, WY1, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 13, height: 13 - WY1,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
// In front of window (z: -3 to WZ0)
sceneObjects.push(new Rectangle({
  corner: new Point(5, WY0, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: WZ0 + 3,
  height: WY1 - WY0,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
// Behind window (z: WZ1 to 10)
sceneObjects.push(new Rectangle({
  corner: new Point(5, WY0, WZ1),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 10 - WZ1,
  height: WY1 - WY0,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));

// ─── Window light — emissive plane just outside the right wall ────────────────
const LX = 5.05;
const sunMat = new Material({ albedo: new Color(1, 0.95, 0.80), emissive: new Color(7, 6.5, 5) });
sceneObjects.push(new Mesh({
  name: "windowLight",
  material: sunMat,
  meshObjects: [
    new Triangle({ v1: new Vector(LX, WY0, WZ0), v2: new Vector(LX, WY0, WZ1), v3: new Vector(LX, WY1, WZ1), material: sunMat }),
    new Triangle({ v1: new Vector(LX, WY0, WZ0), v2: new Vector(LX, WY1, WZ1), v3: new Vector(LX, WY1, WZ0), material: sunMat }),
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
