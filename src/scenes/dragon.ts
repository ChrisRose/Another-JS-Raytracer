import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";
import { fetchAndParseMesh } from "../meshUtils.js";

export const cameraStart = new Point(0, 3, -14);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(3));

// ─── Room ────────────────────────────────────────────────────────────────────

const roomMat  = new Material({ albedo: new Color(0.9, 0.9, 0.9) });
const redMat   = new Material({ albedo: new Color(0.65, 0.1, 0.1) });
const greenMat = new Material({ albedo: new Color(0.1, 0.4, 0.15) });

const floor = new Rectangle({
  corner: new Point(-6, 0, -16), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 30, normal: new Vector(0, 1, 0), orientation: "xzAxis", material: roomMat,
});
const ceiling = new Rectangle({
  corner: new Point(-6, 14, -16), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 30, normal: new Vector(0, -1, 0), orientation: "xzAxis", material: roomMat,
});
const backWall = new Rectangle({
  corner: new Point(-6, 0, 14), v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 12, height: 14, normal: new Vector(0, 0, -1), orientation: "xyAxis", material: roomMat,
});
const leftWall = new Rectangle({
  corner: new Point(-6, 0, -16), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 30, height: 14, normal: new Vector(1, 0, 0), orientation: "yzAxis", material: redMat,
});
const rightWall = new Rectangle({
  corner: new Point(6, 0, -16), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 30, height: 14, normal: new Vector(-1, 0, 0), orientation: "yzAxis", material: greenMat,
});

const lightBall = new Sphere({
  center: new Point(0, 16, 3), radius: 3, name: "lightBall",
  material: new Material({ albedo: new Color(1, 1, 1), emissive: new Color(5, 5, 5) }),
});

export const sceneObjects: SceneObject[] = [
  floor, ceiling, backWall, leftWall, rightWall, lightBall,
];

// ─── Dragon (fetched at runtime, pushed in init()) ───────────────────────────
// Mesh bounds: x[-1,1] y[-0.58,0.83] z[-0.54,0.35]
// scale=4 → 8 units wide; translate.y=2.34 lifts it onto the floor.

export async function init() {
  const base = import.meta.env.BASE_URL;
  const dragon = await fetchAndParseMesh(`${base}meshes/dragon.obj`, {
    name: "dragon",
    material: new Material({
      albedo: new Color(0.95, 0.64, 0.54),  // polished copper
      metallic: 1,
      roughness: 0.15,
    }),
    scale: 4,
    translate: { x: 0, y: 2.34, z: 1 },
  });
  sceneObjects.push(dragon);
}
