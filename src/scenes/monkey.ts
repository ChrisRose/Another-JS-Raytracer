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
const floorMat = new Material({ albedo: new Color(0.50, 0.48, 0.45) });
const wallMat  = new Material({ albedo: new Color(0.55, 0.55, 0.56) });

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

// Overhead key light — sampled via NEE, moderate emissive is fine
const keyLight = new Sphere({
  center: new Point(0, 8, -1), radius: 2, name: "lightBall",
  material: new Material({ albedo: new Color(1, 1, 1), emissive: new Color(16, 16, 18) }),
});

// Front fill — path-traced only so needs very high emissive to register at low pass count
const frontLight = new Sphere({
  center: new Point(1.5, 2.5, -3.5), radius: 1.2,
  material: new Material({ albedo: new Color(1, 0.95, 0.85), emissive: new Color(220, 190, 140) }),
});

// Warm back light — path-traced only, intense to drive SSS glow through ears
const backLight = new Sphere({
  center: new Point(0, 1.8, 4.5), radius: 1.5,
  material: new Material({ albedo: new Color(1, 0.75, 0.40), emissive: new Color(350, 210, 60) }),
});

export const sceneObjects: SceneObject[] = [
  floor, ceiling, backWall, leftWall, rightWall, keyLight, frontLight, backLight,
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
