import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { AmbientLight, Light, LightBall, LightType } from "../Light.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 1, -9);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(5));
};

const ambient1 = new AmbientLight({
  color: new Color(1, 1, 1),
  intensity: 0.2
});

const lightBall = new LightBall({
  position: new Point(1.2, 5, -2),
  radius: 2,
  intensity: 1,
  color: new Color(1, 1, 1),
  uSteps: 5,
  vSteps: 5
});

export const lights: LightType[] = [];
lights.push(ambient1);
lights.push(lightBall);

export const sceneObjects: SceneObject[] = [];

const matteBall = new Sphere({
  center: new Point(0, 0, 0),
  radius: 1,
  name: "matteBall",
  material: new Material({
    albedo: new Color(0, 0, 1),
    specular: 100,
    reflectivity: 0,
    refractionIndex: 0
  })
});

const refractiveBall = new Sphere({
  center: new Point(-1.2, 0, -2),
  radius: 1,
  name: "",
  material: new Material({
    refractionIndex: 1.5,
    albedo: new Color(0, 0, 0),
    specular: 0,
    reflectivity: 0
  })
});

const reflectiveBall = new Sphere({
  center: new Point(1.2, 0, -2),
  radius: 1,
  name: "",
  material: new Material({
    albedo: new Color(1, 0, 0),
    specular: 200,
    reflectivity: 0.4,
    refractionIndex: 0
  })
});

const leftWall = new Rectangle({
  corner: new Point(-2.5, -1, -3),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 2,
  height: 2,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({
    albedo: new Color(1, 0, 0),
    reflectivity: 0.5
  })
});

const skyBall = new Sphere({
  center: new Point(0, 0, -2),
  radius: 10,
  name: "skyBall",
  material: new Material({
    albedo: new Color(0, 1, 0),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 0,
    imageMap: "sf"
  })
});

const floor = new Rectangle({
  corner: new Point(-50, -1, -50),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 100,
  height: 100,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({
    reflectivity: 0.8,
    albedo: new Color(1, 1, 1),
    glossiness: 0.1
  })
});

sceneObjects.push(skyBall);
sceneObjects.push(lightBall);
sceneObjects.push(matteBall);
sceneObjects.push(refractiveBall);
sceneObjects.push(reflectiveBall);
sceneObjects.push(leftWall);
sceneObjects.push(floor);
