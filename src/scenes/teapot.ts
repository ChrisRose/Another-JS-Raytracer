import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { SceneObject } from "../types.js";
import { AreaLight, LightType } from "../Light.js";
import { Material } from "../Material.js";
import { getRotationXMatrix, getRotationYMatrix } from "../matrix.js";
import { teapot as teapotMesh } from "../meshes/teapot/teapot.js";
import { cornellBox as cornellBoxMesh } from "../meshes/teapot/cornellBox.js";
import { leftWall as leftWallMesh } from "../meshes/teapot/leftWall.js";
import { rightWall as rightWallMesh } from "../meshes/teapot/rightWall.js";
import { parseMesh } from "../meshUtils.js";
import { Sphere } from "../Sphere.js";

export const cameraStart = new Point(0, 2.5, -5);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

const ceilingLight = new AreaLight({
  corner: new Point(-0.6, 5, 1),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 1,
  color: new Color(1, 1, 1),
  size: 1,
  name: "ceilingLight"
});

export const lights: LightType[] = [];
lights.push(ceilingLight);

export const sceneObjects: SceneObject[] = [];

sceneObjects.push(ceilingLight);

const cornellBox = parseMesh({
  mesh: cornellBoxMesh,
  name: "cornellBx",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const leftWall = parseMesh({
  mesh: leftWallMesh,
  name: "cornellBx",
  material: new Material({
    albedo: new Color(1, 0, 0)
  })
});

const rightWall = parseMesh({
  mesh: rightWallMesh,
  name: "cornellBx",
  material: new Material({
    albedo: new Color(0, 1, 0)
  })
});

const teapot = parseMesh({
  mesh: teapotMesh,
  name: "teapot",
  material: new Material({
    albedo: new Color(1, 1, 1),
    reflectivity: 0.3
  })
});

const ball = new Sphere({
  center: new Point(3, 1, 1),
  radius: 3,
  name: "ball3",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

sceneObjects.push(ceilingLight);
sceneObjects.push(cornellBox);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);

sceneObjects.push(ball);
//sceneObjects.push(teapot);
