import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Material } from "../Material.js";
import { getRotationXMatrix } from "../matrix.js";
import { Sphere } from "../Sphere.js";
import { SceneObject } from "../types.js";
import { LightType } from "../Light.js";

export const cameraStart = new Point(0, 8, -25);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

export const sceneObjects: SceneObject[] = [];
export const lights: LightType[] = [];

const lightBallObj = new Sphere({
  center: new Point(0, 8, 0),
  radius: 4,
  name: "lightBallObj",
  material: new Material({
    albedo: new Color(0.18, 0.18, 0.18)
  })
});

sceneObjects.push(lightBallObj);
