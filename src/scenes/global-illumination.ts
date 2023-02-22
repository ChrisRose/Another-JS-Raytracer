import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObjects } from "../types.js";
import { AmbientLight, AreaLight, DirectionalLight, Light } from "../Light.js";
import { checkerBoardTexture } from "../textures.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 1, -6);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(1));
};

const ambient1 = new AmbientLight({ intensity: 0.2 });

const directionalLight = new DirectionalLight({
  dir: new Vector(0, 0, 1),
  intensity: 0.4
});

const ceilingLight = new AreaLight({
  corner: new Point(-2.5, 10, -2.5),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 0.4,
  size: 5,
  material: new Material({
    albedo: new Color(255, 255, 255)
  })
});

export const lights: Light[] = [];
lights.push(ambient1);
lights.push(ceilingLight);
//lights.push(directionalLight);

export const sceneObjects: SceneObjects = [];

const metalBall = new Sphere({
  center: new Point(-1.1, 1, 0),
  radius: 1,
  name: "",
  material: new Material({
    albedo: new Color(255, 255, 255),
    specular: 200,
    reflectivity: 0.8,
    refractionIndex: 0,
    glossiness: 0.1
  })
});

const greenBall = new Sphere({
  center: new Point(1.1, 1, 0),
  radius: 1,
  name: "green",
  material: new Material({
    albedo: new Color(0, 255, 0),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 0,
    glossiness: 0
  })
});

const floor = new Rectangle({
  corner: new Point(-30, 0, -30),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 60,
  height: 60,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({
    albedo: new Color(255, 255, 255),
    specular: 0,
    reflectivity: 0.5,
    refractionIndex: 0,
    glossiness: 0
  })
});

sceneObjects.push(floor);

sceneObjects.push(metalBall);

sceneObjects.push(greenBall);

sceneObjects.push(ceilingLight);
