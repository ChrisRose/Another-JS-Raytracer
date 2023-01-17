import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Plane } from "../Plane.js";
import { SceneObjects } from "../types.js";
import { AmbientLight, AreaLight, Light } from "../Light.js";
import { checkerBoardTexture } from "../textures.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 0.4, -9);
export const rotateCamera = (dir: Vector) => {
  return dir;
};

const ambient1 = new AmbientLight({ intensity: 0.1 });

const ceilingLight = new AreaLight({
  corner: new Point(0, 3.5, 1.5),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 0.6,
  size: 1,
  material: new Material({
    albedo: new Color(255, 255, 159)
  })
});
export const lights: Light[] = [];
lights.push(ambient1);
lights.push(ceilingLight);

export const sceneObjects: SceneObjects = [];

const plane1 = new Plane({
  center: new Point(0, -1, 0),
  normal: new Vector(0, 1, 0),
  size: 3,
  material: new Material({
    reflectivity: 0,
    texture: checkerBoardTexture
  })
});

const sphere1 = new Sphere({
  center: new Point(1, -0.2, 0),
  radius: 0.8,
  name: "green",
  material: new Material({
    albedo: new Color(239, 237, 174),
    specular: 200,
    reflectivity: 0.5,
    refractionIndex: 1.2
  })
});

const sphere2 = new Sphere({
  center: new Point(-1, -0.2, 2),
  radius: 0.8,
  name: "blue",
  material: new Material({
    albedo: new Color(132, 198, 250),
    specular: 100,
    reflectivity: 0.2
  })
});

const sphere3 = new Sphere({
  center: new Point(-1.5, -0.2, -2),
  radius: 0.8,
  name: "pink",
  material: new Material({
    albedo: new Color(255, 153, 255),
    specular: 100,
    reflectivity: 0.2
  })
});
const sphere4 = new Sphere({
  center: new Point(0, -0.6, -2),
  radius: 0.4,
  name: "glass",
  material: new Material({
    albedo: new Color(255, 255, 255),
    specular: 0,
    reflectivity: 0,
    refractionIndex: 1.5
  })
});

sceneObjects.push(sphere1);
sceneObjects.push(sphere2);
sceneObjects.push(sphere3);
sceneObjects.push(sphere4);
sceneObjects.push(plane1);
