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
const floorMat = new Material({ albedo: new Color(0.18, 0.16, 0.14) });
const wallMat  = new Material({ albedo: new Color(0.06, 0.06, 0.07) });

const floor = new Rectangle({
  corner: new Point(-6, 0, -6), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 18, normal: new Vector(0, 1, 0), orientation: "xzAxis", material: floorMat,
});
const ceiling = new Rectangle({
  corner: new Point(-6, 6, -6), v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 12, height: 18, normal: new Vector(0, -1, 0), orientation: "xzAxis", material: wallMat,
});
const backWall = new Rectangle({
  corner: new Point(-6, 0, 12), v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 12, height: 6, normal: new Vector(0, 0, -1), orientation: "xyAxis", material: wallMat,
});
const leftWall = new Rectangle({
  corner: new Point(-6, 0, -6), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 18, height: 6, normal: new Vector(1, 0, 0), orientation: "yzAxis", material: wallMat,
});
const rightWall = new Rectangle({
  corner: new Point(6, 0, -6), v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 18, height: 6, normal: new Vector(-1, 0, 0), orientation: "yzAxis", material: wallMat,
});

// Overhead cool key light
const keyLight = new Sphere({
  center: new Point(0, 8, -1), radius: 2, name: "lightBall",
  material: new Material({ albedo: new Color(1, 1, 1), emissive: new Color(6, 6, 7) }),
});

// Intense warm back light — drives SSS glow through ears and thin sections
const backLight = new Sphere({
  center: new Point(0, 1.8, 4.5), radius: 1.5,
  material: new Material({ albedo: new Color(1, 0.80, 0.50), emissive: new Color(60, 38, 12) }),
});

export const sceneObjects: SceneObject[] = [
  floor, ceiling, backWall, leftWall, rightWall, keyLight, backLight,
];

// ─── Monkey head (fetched at runtime in browser, loaded directly in Node.js) ──
// Suzanne bounds: x[-3.86,-1.13] y[0.27,2.24] z[3.25,4.96], centroid (-2.494, 1.320, 4.431)
// scale=1.5, translate centers at (0,0,0), bottom at y≈0.

export async function init() {
  const base = import.meta.env.BASE_URL;
  const monkey = await fetchAndParseMesh(`${base}meshes/suzanne.obj`, {
    name: "monkey",
    material: new Material({
      albedo: new Color(0.78, 0.42, 0.24),
      subsurface: 0.65,
      subsurfaceSigma: 3,
    }),
    scale: 1.5,
    translate: { x: 3.741, y: -0.405, z: 6.647 },
  });
  sceneObjects.push(monkey);
}
