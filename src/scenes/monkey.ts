import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { Material } from "../Material.js";
import { fetchAndParseMesh } from "../meshUtils.js";

export const cameraStart = new Point(0, 1.5, -5);
export const rotateCamera = (dir: Vector) => dir;

// ─── Room ────────────────────────────────────────────────────────────────────
const floorMat = new Material({ albedo: new Color(0.9, 0.9, 0.9) });
const wallMat  = new Material({ albedo: new Color(0.9, 0.9, 0.9) });

const floor = new Rectangle({
  corner: new Point(-6, 0, -6), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 18, normal: new Vector(0, 1, 0), orientation: "xzAxis", material: floorMat,
});
const ceiling = new Rectangle({
  corner: new Point(-6, 6, -6), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 18, normal: new Vector(0, -1, 0), orientation: "xzAxis", material: wallMat,
});
// Emissive back wall — warm orange, just behind the head
const backWallMat = new Material({ albedo: new Color(1, 0.72, 0.38), emissive: new Color(80, 50, 18) });
const backWall = new Rectangle({
  corner: new Point(-6, 0, 4), v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 12, height: 6, normal: new Vector(0, 0, -1), orientation: "xyAxis", material: backWallMat,
});

// Dim front wall behind the camera — cool ambient fill
const frontWallMat = new Material({ albedo: new Color(0.85, 0.90, 1.0), emissive: new Color(3, 3.5, 4.5) });
const frontWall = new Rectangle({
  corner: new Point(-6, 0, -6), v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 12, height: 6, normal: new Vector(0, 0, 1), orientation: "xyAxis", material: frontWallMat,
});
const leftWall = new Rectangle({
  corner: new Point(-6, 0, -6), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 18, height: 6, normal: new Vector(1, 0, 0), orientation: "yzAxis", material: wallMat,
});
const rightWall = new Rectangle({
  corner: new Point(6, 0, -6), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 18, height: 6, normal: new Vector(-1, 0, 0), orientation: "yzAxis", material: wallMat,
});

export const sceneObjects: SceneObject[] = [
  floor, ceiling, backWall, frontWall, leftWall, rightWall,
];

// ─── Monkey head (fetched at runtime in browser, loaded directly in Node.js) ──
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
