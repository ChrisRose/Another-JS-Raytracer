import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { AmbientLight, AreaLight, LightBall, LightType } from "../Light.js";
import { Material } from "../Material.js";
import { getRotationXMatrix } from "../matrix.js";
import { checkerboardTexture, gridTexture } from "../textures.js";

export const cameraStart = new Point(0, 8, -6);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(45));
};

export const ambientLight = new AmbientLight({
  color: new Color(1, 1, 1),
  intensity: 1
});

const lightBall = new LightBall({
  position: new Point(-3, 5, -1),
  radius: 0.5,
  intensity: 10,
  color: new Color(1, 1, 1),
  name: "lightBall",
  uSteps: 4,
  vSteps: 4
});

export const lights: LightType[] = [];
lights.push(ambientLight);
lights.push(lightBall);

export const sceneObjects: SceneObject[] = [];

const floor = new Rectangle({
  corner: new Point(-500, 0, -12),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 1000,
  height: 12,
  orientation: "xzAxis",
  normal: new Vector(0, 1, 0),
  material: new Material({
    albedo: new Color(1, 0, 0),
    emissive: new Color(0, 0, 0),
    reflectivity: 0,
    texture: checkerboardTexture
  })
});

const wall = new Rectangle({
  corner: new Point(-6, 0, 3),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 12,
  height: 12,
  orientation: "xyAxis",
  normal: new Vector(0, 1, 0),
  material: new Material({
    albedo: new Color(1, 0, 0),
    emissive: new Color(0, 0, 0),
    reflectivity: 0
  })
});

const ball1 = new Sphere({
  center: new Point(-3, 1, 1),
  radius: 1,
  name: "ball1",
  material: new Material({
    albedo: new Color(1, 1, 1),
    specular: 200,
    emissive: new Color(0, 0, 0),
    reflectivity: 0.5
  })
});

const ball2 = new Sphere({
  center: new Point(0, 1, 1),
  radius: 1,
  name: "ball2",
  material: new Material({
    albedo: new Color(1, 1, 1),
    specular: 200,
    emissive: new Color(0, 0, 0),
    refractionIndex: 1
  })
});

const ball3 = new Sphere({
  center: new Point(3, 1, 1),
  radius: 1,
  name: "ball3",
  material: new Material({
    albedo: new Color(1, 1, 1),
    specular: 200,
    emissive: new Color(0, 0, 0)
  })
});

sceneObjects.push(floor);
sceneObjects.push(wall);
sceneObjects.push(ball1);
sceneObjects.push(ball2);
sceneObjects.push(ball3);
sceneObjects.push(lightBall);
