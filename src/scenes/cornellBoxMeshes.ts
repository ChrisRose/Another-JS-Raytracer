import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { SceneObject } from "../types.js";
import { Material } from "../Material.js";
import { getRotationXMatrix, getRotationYMatrix } from "../matrix.js";
import { leftBox as leftBoxMesh } from "../meshes/cornellBox/leftBox.js";
import { rightBox as rightBoxMesh } from "../meshes/cornellBox/rightBox.js";
import { leftWall as leftWallMesh } from "../meshes/cornellBox/leftWall.js";
import { rightWall as rightWallMesh } from "../meshes/cornellBox/rightWall.js";
import { floor as floorMesh } from "../meshes/cornellBox/floor.js";
import { ceiling as ceilingMesh } from "../meshes/cornellBox/ceiling.js";
import { ceilingLight as ceilingLightMesh } from "../meshes/cornellBox/ceilingLight.js";
import { backWall as backWallMesh } from "../meshes/cornellBox/backWall.js";
import { teapotLowRes as teapotMesh } from "../meshes/cornellBox/teapotLowRes.js";
import { parseMesh } from "../meshUtils.js";

export const cameraStart = new Point(0, 8, -25);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

export const sceneObjects: SceneObject[] = [];

const floor = parseMesh({
  mesh: floorMesh,
  name: "floor",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const ceiling = parseMesh({
  mesh: ceilingMesh,
  name: "ceiling",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});


const backWall = parseMesh({
  mesh: backWallMesh,
  name: "backWall",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const leftWall = parseMesh({
  mesh: leftWallMesh,
  name: "leftWall",
  material: new Material({
    albedo: new Color(1, 0, 0)
  })
});

const rightWall = parseMesh({
  mesh: rightWallMesh,
  name: "rightWall",
  material: new Material({
    albedo: new Color(0, 1, 0)
  })
});

const leftBox = parseMesh({
  mesh: leftBoxMesh,
  name: "leftBox",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const rightBox = parseMesh({
  mesh: rightBoxMesh,
  name: "rightBox",
  material: new Material({
    albedo: new Color(1, 1, 1)
  })
});

const teapot = parseMesh({
  mesh: teapotMesh,
  name: "teapot",
  material: new Material({
    albedo: new Color(1, 0, 0)
  })
});

const ceilingLight = parseMesh({
  mesh: ceilingLightMesh,
  name: "ceilingLight",
  material: new Material({
    albedo: new Color(1, 1, 1),
    emissive: new Color(3, 3, 3)
  })
});

sceneObjects.push(floor);
sceneObjects.push(ceiling);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(leftBox);
sceneObjects.push(rightBox);
sceneObjects.push(ceilingLight);
sceneObjects.push(backWall);
sceneObjects.push(teapot);

