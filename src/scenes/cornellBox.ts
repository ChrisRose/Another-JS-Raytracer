import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { AmbientLight, AreaLight, LightBall, LightType } from "../Light.js";
import { Material } from "../Material.js";
import { Box } from "../Box.js";
import { getRotationXMatrix } from "../matrix.js";

export const cameraStart = new Point(0, 0, -5);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

export const ambientLight = new AmbientLight({
  color: new Color(1, 1, 1),
  intensity: 0
});

const ceilingLight = new AreaLight({
  corner: new Point(-1, 3.9, 2),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 0.8,
  color: new Color(1, 1, 1),
  size: 2,
  name: "ceilingLight"
});

const lightBall = new LightBall({
  position: new Point(-1, 0.25, 1),
  radius: 0.5,
  intensity: 1,
  color: new Color(1, 1, 1),
  name: "lightBall",
  uSteps: 2,
  vSteps: 2
});

export const lights: LightType[] = [];
lights.push(lightBall);
lights.push(ceilingLight);
lights.push(ambientLight);

export const sceneObjects: SceneObject[] = [];

const ceiling = new Rectangle({
  corner: new Point(-3, 4, 0),
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

const backWall = new Rectangle({
  corner: new Point(-3, -2, 6),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 6,
  height: 6,
  orientation: "xyAxis",
  normal: new Vector(0, 0, -1),
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const leftWall = new Rectangle({
  corner: new Point(-3, -2, 0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({
    albedo: new Color(1, 0, 0)
  })
});

const rightWall = new Rectangle({
  corner: new Point(3, -2, 0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "yzAxis",
  normal: new Vector(-1, 0, 0),
  material: new Material({
    albedo: new Color(0, 1, 0)
  })
});

const floor = new Rectangle({
  corner: new Point(-3, -2, 0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "xzAxis",
  normal: new Vector(0, 1, 0),
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const reflectiveBall = new Sphere({
  center: new Point(-1, -0.5, 1.5),
  radius: 0.8,
  name: "reflectiveBall",
  material: new Material({
    albedo: new Color(-1, 0, 0),
    specular: 200,
    reflectivity: 0.8
  })
});

const matteBall = new Sphere({
  center: new Point(-1.5, -0.5, 0),
  radius: 0.5,
  name: "matteBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    specular: 200
  })
});

const glassBall = new Sphere({
  center: new Point(1.5, 2, 4),
  radius: 0.8,
  name: "glassBall",
  material: new Material({
    albedo: new Color(0, 0, 0),
    specular: 200,
    refractionIndex: 1.5
  })
});

const box = new Box({
  corner: new Point(1, -2, 1),
  width: 1.5,
  height: 1.5,
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

sceneObjects.push(ceiling);
sceneObjects.push(backWall);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(floor);
sceneObjects.push(box);
sceneObjects.push(reflectiveBall);
sceneObjects.push(glassBall);
sceneObjects.push(ceilingLight);
sceneObjects.push(lightBall);
sceneObjects.push(matteBall);


