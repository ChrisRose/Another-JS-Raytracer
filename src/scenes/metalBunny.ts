import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";
import { bunny as bunnyMesh } from "../meshes/bunny/bunny.js";
import { parseMesh } from "../meshUtils.js";

export const cameraStart = new Point(0, 3, -14);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(3));

export const sceneObjects: SceneObject[] = [];

// ─── Room geometry (Rectangles — no mesh loading overhead) ───────────────────

const floor = new Rectangle({
  corner: new Point(-10, 0, -10),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 20,
  height: 20,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.9, 0.9, 0.9) })
});

const ceiling = new Rectangle({
  corner: new Point(-10, 14, -10),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 20,
  height: 20,
  normal: new Vector(0, -1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.9, 0.9, 0.9) })
});

const backWall = new Rectangle({
  corner: new Point(-10, 0, 10),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 20,
  height: 14,
  normal: new Vector(0, 0, -1),
  orientation: "xyAxis",
  material: new Material({ albedo: new Color(0.9, 0.9, 0.9) })
});

const leftWall = new Rectangle({
  corner: new Point(-10, 0, -10),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 14,
  height: 20,
  normal: new Vector(1, 0, 0),
  orientation: "yzAxis",
  material: new Material({ albedo: new Color(0.65, 0.1, 0.1) })
});

const rightWall = new Rectangle({
  corner: new Point(10, 0, -10),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 14,
  height: 20,
  normal: new Vector(-1, 0, 0),
  orientation: "yzAxis",
  material: new Material({ albedo: new Color(0.1, 0.4, 0.15) })
});

// ─── Sphere light (uses existing sphere NEE path) ────────────────────────────

const lightBall = new Sphere({
  center: new Point(0, 16, 3),
  radius: 3,
  name: "lightBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    emissive: new Color(5, 5, 5)
  })
});

// ─── Gold metallic bunny ─────────────────────────────────────────────────────
// Gold F0 ≈ (1.0, 0.71, 0.29); roughness 0.25 gives a brushed-gold look.

const bunny = parseMesh({
  mesh: bunnyMesh,
  name: "bunny",
  material: new Material({
    albedo: new Color(1.0, 0.71, 0.29),
    metallic: 1,
    roughness: 0.25
  })
});

sceneObjects.push(floor);
sceneObjects.push(ceiling);
sceneObjects.push(backWall);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(lightBall);
sceneObjects.push(bunny);
