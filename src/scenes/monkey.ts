import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";
import { fetchAndParseMesh } from "../meshUtils.js";

export const cameraStart = new Point(0, 1.5, -4);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(3));

// ─── Room (mirrors dragon scene proportions) ──────────────────────────────────
const roomMat   = new Material({ albedo: new Color(0.9, 0.9, 0.9) });
const blueMat   = new Material({ albedo: new Color(0.1, 0.25, 0.75) });
const yellowMat = new Material({ albedo: new Color(0.85, 0.75, 0.1) });

const floor = new Rectangle({
  corner: new Point(-6, 0, -9), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 20, normal: new Vector(0, 1, 0), orientation: "xzAxis", material: roomMat,
});
const ceiling = new Rectangle({
  corner: new Point(-6, 8, -9), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 20, normal: new Vector(0, -1, 0), orientation: "xzAxis", material: roomMat,
});
const backWall = new Rectangle({
  corner: new Point(-6, 0, 11), v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 12, height: 8, normal: new Vector(0, 0, -1), orientation: "xyAxis", material: roomMat,
});
const leftWall = new Rectangle({
  corner: new Point(-6, 0, -9), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 20, height: 8, normal: new Vector(1, 0, 0), orientation: "yzAxis", material: blueMat,
});
const rightWall = new Rectangle({
  corner: new Point(6, 0, -9), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 20, height: 8, normal: new Vector(-1, 0, 0), orientation: "yzAxis", material: yellowMat,
});

// Warm back light — backlights SSS through ears
const backLight = new Sphere({
  center: new Point(0, 1.5, 5), radius: 2, name: "lightBall",
  material: new Material({ albedo: new Color(1, 0.95, 0.80), emissive: new Color(28, 24, 16) }),
});

export const sceneObjects: SceneObject[] = [
  floor, ceiling, backWall, leftWall, rightWall, backLight,
];

// ─── Monkey head ──────────────────────────────────────────────────────────────
// Suzanne bounds: x[-3.86,-1.13] y[0.27,2.24] z[3.25,4.96], centroid (-2.494, 1.320, 4.431)
// scale=1.5, translate centers at (0,0,0), bottom at y≈0.

export async function init() {
  const base = import.meta.env.BASE_URL;
  const monkey = await fetchAndParseMesh(`${base}meshes/suzanne.obj`, {
    name: "monkey",
    material: new Material({
      albedo: new Color(0.92, 0.42, 0.06),
      subsurface: 0.70,
      subsurfaceSigma: 2.5,
    }),
    scale: 1.5,
    translate: { x: 3.741, y: -0.405, z: 6.647 },
  });
  sceneObjects.push(monkey);
}
