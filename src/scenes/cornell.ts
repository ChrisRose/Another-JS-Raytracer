import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObjects } from "../types.js";
import { AmbientLight, AreaLight, Light } from "../Light.js";
import { checkerBoardTexture } from "../textures.js";
import { Material } from "../Material.js";
import { Box } from "../Box.js";
import { getRotationXMatrix, getRotationYMatrix } from "../matrix.js";

export const cameraStart = new Point(0, 2.5, -7);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(10));
};

const ambient1 = new AmbientLight({ intensity: 0.2 });

const ceilingLight = new AreaLight({
  corner: new Point(-1, 3.9, 2),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 0.8,
  size: 2,
  material: new Material({
    albedo: new Color(255, 255, 255)
  })
});

export const lights: Light[] = [];
lights.push(ambient1);
lights.push(ceilingLight);

export const sceneObjects: SceneObjects = [];

const leftWall = new Rectangle({
  corner: new Point(-3, -2, 0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({ albedo: new Color(255, 0, 0) })
});
const rightWall = new Rectangle({
  corner: new Point(3, -2, 0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "yzAxis",
  normal: new Vector(-1, 0, 0),
  material: new Material({ albedo: new Color(0, 255, 0) })
});
const backWall = new Rectangle({
  corner: new Point(-3, -2, 6),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width: 6,
  height: 6,
  orientation: "xyAxis",
  normal: new Vector(0, 0, -1),
  material: new Material({ albedo: new Color(255, 255, 255) })
});
const ceiling = new Rectangle({
  corner: new Point(-3, 4, 0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "xzAxis",
  normal: new Vector(0, -1, 0),
  material: new Material({ albedo: new Color(255, 255, 255) })
});
const floor = new Rectangle({
  corner: new Point(-3, -2, 0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 6,
  height: 6,
  orientation: "xzAxis",
  normal: new Vector(0, 1, 0),
  material: new Material({ reflectivity: 0, albedo: new Color(255, 255, 255) })
});

const glassBall = new Sphere({
  center: new Point(0, -1, 1),
  radius: 1,
  name: "glass",
  material: new Material({
    albedo: new Color(0, 0, 0),
    specular: 200,
    reflectivity: 0,
    refractionIndex: 1.5
  })
});
const matteBall = new Sphere({
  center: new Point(1, -1, 1),
  radius: 1,
  name: "matte",
  material: new Material({
    albedo: new Color(0, 0, 255),
    specular: 100,
    reflectivity: 0,
    refractionIndex: 0
  })
});
const reflectiveBall = new Sphere({
  center: new Point(1, -1, 3),
  radius: 1,
  name: "reflective",
  material: new Material({
    albedo: new Color(255, 255, 255),
    specular: 100,
    reflectivity: 0.8,
    refractionIndex: 0
  })
});

const box = new Box({
  corner: new Point(-2, -2, 3),
  width: 2,
  height: 3,
  material: new Material({
    albedo: new Color(255, 255, 255),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 0
  })
});

sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(backWall);
sceneObjects.push(ceiling);
sceneObjects.push(floor);
sceneObjects.push(box);
// sceneObjects.push(glassBall);
sceneObjects.push(matteBall);
// sceneObjects.push(reflectiveBall);
sceneObjects.push(ceilingLight);
