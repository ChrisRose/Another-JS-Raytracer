import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 1.8, -6);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(5));
};

const lightBall = new Sphere({
  center: new Point(0, 6, -3),
  radius: 1.5,
  name: "lightBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    emissive: new Color(6, 6, 6)
  })
});

export const sceneObjects: SceneObject[] = [];

const floor = new Rectangle({
  corner: new Point(-4, 0, -8),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 8,
  height: 16,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.85, 0.85, 0.85) })
});

const backWall = new Rectangle({
  corner: new Point(-4, 0, 8),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 8,
  height: 6,
  orientation: "xyAxis",
  normal: new Vector(0, 0, -1),
  material: new Material({ albedo: new Color(0.85, 0.85, 0.85) })
});

const leftWall = new Rectangle({
  corner: new Point(-4, 0, -8),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 16,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({ albedo: new Color(0.85, 0.2, 0.2) })
});

const rightWall = new Rectangle({
  corner: new Point(4, 0, -8),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 16,
  orientation: "yzAxis",
  normal: new Vector(-1, 0, 0),
  material: new Material({ albedo: new Color(0.2, 0.35, 0.85) })
});

// Glass sphere — IOR 1.5 (crown glass)
const glassSphere = new Sphere({
  center: new Point(0, 1.3, 0),
  radius: 1.3,
  name: "glass",
  material: new Material({
    albedo: new Color(1, 1, 1),
    refractionIndex: 1.5
  })
});

// Coloured spheres behind the glass — their inverted images are visible through it
const orangeSphere = new Sphere({
  center: new Point(-1.4, 0.7, 3.5),
  radius: 0.7,
  name: "orange",
  material: new Material({ albedo: new Color(1, 0.45, 0.1) })
});

const tealSphere = new Sphere({
  center: new Point(1.4, 0.7, 3.5),
  radius: 0.7,
  name: "teal",
  material: new Material({ albedo: new Color(0.1, 0.75, 0.65) })
});

sceneObjects.push(floor);
sceneObjects.push(backWall);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(lightBall);
sceneObjects.push(glassSphere);
sceneObjects.push(orangeSphere);
sceneObjects.push(tealSphere);
