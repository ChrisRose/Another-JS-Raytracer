import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObjects } from "../types.js";
import { AmbientLight, AreaLight, Light } from "../Light.js";
import { checkerBoardTexture } from "../textures.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 1, -9);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(5));
};

const ambient1 = new AmbientLight({ intensity: 0.2 });

const ceilingLight = new AreaLight({
  corner: new Point(-1, 2, -2),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 0.6,
  size: 2,
  material: new Material({
    albedo: new Color(255, 255, 255)
  })
});

export const lights: Light[] = [];
lights.push(ambient1);
lights.push(ceilingLight);

export const sceneObjects: SceneObjects = [];

const matteBall = new Sphere({
  center: new Point(0, 0, 0),
  radius: 1,
  name: "matteBall",
  material: new Material({
    albedo: new Color(0, 0, 155),
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
    albedo: new Color(255, 0, 0),
    specular: 200,
    reflectivity: 1,
    refractionIndex: 0
  })
});

const leftWall = new Rectangle({
  corner: new Point(-2.5, -1, -3),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  size: 2,
  orientation: "yzAxis",
  normal: new Vector(1, 0, 0),
  material: new Material({
    albedo: new Color(255, 192, 203),
    reflectivity: 0.5
  })
});

const skyBall = new Sphere({
  center: new Point(0, 0, -2),
  radius: 10,
  name: "skyBall",
  material: new Material({
    albedo: new Color(255, 255, 255),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 0
  })
});

const floor = new Rectangle({
  corner: new Point(-50, -1, -50),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  size: 100,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({
    reflectivity: 0.5,
    albedo: new Color(255, 255, 255),
    glossiness: 0.1
    // texture: checkerBoardTexture
  })
});

sceneObjects.push(floor);
sceneObjects.push(refractiveBall);
sceneObjects.push(reflectiveBall);
sceneObjects.push(matteBall);
sceneObjects.push(skyBall);
sceneObjects.push(leftWall);
// sceneObjects.push(ceilingLight);
