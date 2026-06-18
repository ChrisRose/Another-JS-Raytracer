import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";
import { Mesh } from "../Mesh.js";
import { Triangle } from "../Triangle.js";

export const cameraStart = new Point(0, 1.5, -1.5);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(3));

// ─── Hallway dimensions ───────────────────────────────────────────────────────
// 4 units wide (x: -2..+2), 2.8 tall (y: 0..2.8), 63 deep (z: -3..60)

const HALF_W  = 2;
const CEIL_H  = 2.8;
const Z_START = -3;
const Z_END   = 60;
const DEPTH   = Z_END - Z_START; // 63

const wallMat  = new Material({ albedo: new Color(0.80, 0.70, 0.33) });
const floorMat = new Material({ albedo: new Color(0.50, 0.44, 0.20) });
const ceilMat  = new Material({ albedo: new Color(0.88, 0.83, 0.50) });

// ─── Room geometry ────────────────────────────────────────────────────────────

// xzAxis: width = x extent, height = z extent
const floor = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_START),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  HALF_W * 2,
  height: DEPTH,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: floorMat,
});

const ceiling = new Rectangle({
  corner: new Point(-HALF_W, CEIL_H, Z_START),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  HALF_W * 2,
  height: DEPTH,
  normal: new Vector(0, -1, 0),
  orientation: "xzAxis",
  material: ceilMat,
});

// yzAxis: height = y extent, width = z extent
const leftWall = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_START),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  DEPTH,
  height: CEIL_H,
  normal: new Vector(1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

const rightWall = new Rectangle({
  corner: new Point(HALF_W, 0, Z_START),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  DEPTH,
  height: CEIL_H,
  normal: new Vector(-1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

// xyAxis: width = x extent, height = y extent
const backWall = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_END),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  HALF_W * 2,
  height: CEIL_H,
  normal: new Vector(0, 0, -1),
  orientation: "xyAxis",
  material: wallMat,
});

const frontWall = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_START),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  HALF_W * 2,
  height: CEIL_H,
  normal: new Vector(0, 0, 1),
  orientation: "xyAxis",
  material: wallMat,
});

// ─── Ceiling light panels ─────────────────────────────────────────────────────
// 1.6 × 0.9 emissive quads hung just below the ceiling.
// Winding clockwise from above → stored normal (0, −1, 0).

function makePanel(zCenter: number): Mesh {
  const LW  = 0.8;  // half-width  (panel is 1.6 wide in x)
  const LD  = 0.45; // half-depth  (panel is 0.9 deep in z)
  const y   = CEIL_H - 0.01;
  const mat = new Material({
    albedo:   new Color(1, 0.95, 0.8),
    emissive: new Color(5, 4.2, 2.0),
  });

  const p0 = new Vector(-LW, y, zCenter - LD);
  const p1 = new Vector( LW, y, zCenter - LD);
  const p2 = new Vector( LW, y, zCenter + LD);
  const p3 = new Vector(-LW, y, zCenter + LD);

  // v1−v2 × v3−v2 normal check: clockwise from above → (0,−1,0)
  const t1 = new Triangle({ v1: p0, v2: p2, v3: p1, material: mat });
  const t2 = new Triangle({ v1: p0, v2: p3, v3: p2, material: mat });

  return new Mesh({ name: "light", material: mat, meshObjects: [t1, t2] });
}

const lights = [2, 8, 14, 20, 28, 36, 44, 52].map(makePanel);

// ─── Scene export ─────────────────────────────────────────────────────────────

export const sceneObjects: SceneObject[] = [
  floor, ceiling,
  leftWall, rightWall,
  backWall, frontWall,
  ...lights,
];
