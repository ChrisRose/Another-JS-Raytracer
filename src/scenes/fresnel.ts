import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObjects } from "../types.js";
import { AmbientLight, AreaLight, Light } from "../Light.js";
import { getRotationXMatrix } from "../matrix.js";
import { checkerBoardTexture } from "../textures.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 0.25, -10);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

const ambient1 = new AmbientLight({ intensity: 0.2 });

const ceilingLight = new AreaLight({
  corner: new Point(-1, 10, -1),
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

const floor = new Rectangle({
  corner: new Point(-50, 0, -50),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  width: 100,
  height: 100,
  material: new Material({
    albedo: new Color(255, 255, 255),
    reflectivity: 0.8
    // texture: checkerBoardTexture
  })
});

const ball1 = new Sphere({
  center: new Point(0, 3, 5),
  radius: 3,
  name: "",
  material: new Material({
    albedo: new Color(255, 0, 0),
    specular: 200,
    reflectivity: 0,
    refractionIndex: 0
  })
});

sceneObjects.push(floor);
sceneObjects.push(ball1);
