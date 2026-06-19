import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { Light, LightBall } from "../Light.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 1.2, -5);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(1));
};

const lightBall = new LightBall({
  position: new Point(-1, 1, 0),
  radius: 1,
  intensity: 1,
  color: new Color(1, 1, 1),
  uSteps: 5,
  vSteps: 5
});

export const lights: Light[] = [];
lights.push(lightBall);

export const sceneObjects: SceneObject[] = [];

const leftWall = new Rectangle({
  corner: new Point(-3, 0, -3),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 3,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const rightWall = new Rectangle({
  corner: new Point(3, 0, -3),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 3,
  orientation: "yzAxis",
  normal: new Vector(-1, 0, 0),
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const backWall = new Rectangle({
  corner: new Point(-3, 0, 3),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 6,
  height: 3,
  orientation: "xyAxis",
  normal: new Vector(0, 0, -1),
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const floor = new Rectangle({
  corner: new Point(-3, 0, -3),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({
    albedo: new Color(1, 1, 1),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 0,
    glossiness: 0
  })
});

const ceiling = new Rectangle({
  corner: new Point(-3, 3, -3),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "xzAxis",
  normal: new Vector(0, -1, 0),
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const greenBall = new Sphere({
  center: new Point(1, 1, 0),
  radius: 1,
  name: "green",
  material: new Material({
    albedo: new Color(0, 1, 0),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 0,
    glossiness: 0
  })
});

sceneObjects.push(floor);
sceneObjects.push(lightBall);
sceneObjects.push(greenBall);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(backWall);
sceneObjects.push(ceiling);
