import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Plane } from "../Plane.js";
import { SceneObject } from "../types.js";
import { AmbientLight, AreaLight, Light } from "../Light.js";
import { checkerboardTexture } from "../textures.js";
import { Material } from "../Material.js";

export const cameraStart = new Point(0, 0.4, -9);
export const rotateCamera = (dir: Vector) => {
  return dir;
};

const ceilingLight = new AreaLight({
  corner: new Point(0, 3.5, 1.5),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 0.6,
  size: 1,
  color: new Color(1, 1, 1)
});
export const lights: Light[] = [];
lights.push(ceilingLight);

export const sceneObjects: SceneObject[] = [];

const plane1 = new Plane({
  center: new Point(0, -1, 0),
  normal: new Vector(0, 1, 0),
  size: 3,
  material: new Material({
    reflectivity: 0,
    texture: checkerboardTexture,
    albedo: new Color(1, 1, 1)
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
    albedo: new Color(1, 0, 0),
    specular: 100,
    reflectivity: 0
  })
});

const sphere3 = new Sphere({
  center: new Point(-1.5, -0.2, -2),
  radius: 0.8,
  name: "green",
  material: new Material({
    albedo: new Color(1, 153, 1),
    specular: 100,
    reflectivity: 0.8
  })
});

sceneObjects.push(sphere1);
sceneObjects.push(sphere2);
sceneObjects.push(sphere3);
sceneObjects.push(plane1);
sceneObjects.push(ceilingLight);
