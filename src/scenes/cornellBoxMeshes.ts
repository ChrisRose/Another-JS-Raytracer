import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { SceneObject } from "../types.js";
import { AmbientLight, AreaLight, LightBall, LightType } from "../Light.js";
import { Material } from "../Material.js";
import { getRotationXMatrix, getRotationYMatrix } from "../matrix.js";
import { leftBox as leftBoxMesh } from "../meshes/cornellBox/leftBox.js";
import { rightBox as rightBoxMesh } from "../meshes/cornellBox/rightBox.js";
import { leftWall as leftWallMesh } from "../meshes/cornellBox/leftWall.js";
import { rightWall as rightWallMesh } from "../meshes/cornellBox/rightWall.js";
import { floor as floorMesh } from "../meshes/cornellBox/floor.js";
import { ceiling as ceilingMesh } from "../meshes/cornellBox/ceiling.js";
import { backWall as backWallMesh } from "../meshes/cornellBox/backWall.js";
import { parseMesh } from "../meshUtils.js";
import { Sphere } from "../Sphere.js";

export const cameraStart = new Point(0, 10, -25);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

export const ambientLight = new AmbientLight({
  color: new Color(1, 1, 1),
  intensity: 0.1
});

const ceilingLight = new AreaLight({
  corner: new Point(-2, 17.11, -4),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  uSteps: 4,
  vSteps: 4,
  intensity: 3,
  color: new Color(1, 1, 1),
  size: 4,
  name: "ceilingLight"
});

const lightBall = new LightBall({
  position: new Point(3, 9, -8),
  radius: 1,
  intensity: 1,
  color: new Color(1, 1, 1),
  name: "lightBall",
  uSteps: 2,
  vSteps: 2
});

export const lights: LightType[] = [];
lights.push(ceilingLight);
lights.push(ambientLight);
lights.push(lightBall);

export const sceneObjects: SceneObject[] = [];

sceneObjects.push(ceilingLight);

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

const reflectiveBall = new Sphere({
  center: new Point(-3, 12, 1),
  radius: 2,
  name: "reflectiveBall",
  material: new Material({
    albedo: new Color(1, 0, 0),
    reflectivity: 0.8
  })
});

const refractiveBall = new Sphere({
  center: new Point(3, 12, 1),
  radius: 2,
  name: "refractiveBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    refractionIndex: 1.5
  })
});

const textureMappedBall = new Sphere({
  center: new Point(3, 3, 0),
  radius: 1,
  name: "textureMappedBall",
  material: new Material({
    albedo: new Color(1, 1, 1),
    imageMap: "earth"
  })
});

sceneObjects.push(floor);
sceneObjects.push(ceiling);
sceneObjects.push(leftWall);
sceneObjects.push(rightWall);
sceneObjects.push(leftBox);
sceneObjects.push(rightBox);
sceneObjects.push(reflectiveBall);
sceneObjects.push(refractiveBall);
sceneObjects.push(lightBall);
sceneObjects.push(backWall);
//sceneObjects.push(textureMappedBall);

console.log("sceneObjects", sceneObjects);
