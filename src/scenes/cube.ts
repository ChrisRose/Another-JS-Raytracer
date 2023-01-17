import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { AreaLight, Light, LightBall, LightType } from "../Light.js";
import { Material } from "../Material.js";
import { Box } from "../Box.js";
import { getRotationXMatrix } from "../matrix.js";
import ObjFileParser from "obj-file-parser";
import { Mesh } from "../Mesh.js";
import { cube } from "../meshes/cube.js";
import { Quad } from "../Quad.js";

export const cameraStart = new Point(0, 1, -6);
export const rotateCamera = (dir: Vector) => {
  return dir.multiplyWith3x3Matrix(getRotationXMatrix(0));
};

const lightBall = new LightBall({
  position: new Point(2, 0, 5),
  radius: 0.5,
  intensity: 3,
  color: new Color(1, 0, 0),
  name: "lightBall",
  uSteps: 4,
  vSteps: 4
});

const skyLight = new LightBall({
  position: new Point(0, 0, 0),
  radius: 10,
  intensity: 1,
  color: new Color(1, 1, 1),
  name: "skyLight",
  uSteps: 1,
  vSteps: 1
});

export const lights: LightType[] = [];

//lights.push(lightBall);
lights.push(skyLight);

export const sceneObjects: SceneObject[] = [];

const matteBall = new Sphere({
  center: new Point(0, 3, 3),
  radius: 1,
  name: "matte",
  material: new Material({
    albedo: new Color(0.5, 0.5, 0.5)
  })
});

sceneObjects.push(matteBall);
sceneObjects.push(lightBall);

const mesh = new ObjFileParser(cube).parse();

const model = mesh?.models[0];

const faces = model.faces;

for (let i = 0; i < faces.length; i += 1) {
  if (faces[i].vertices.length === 4) {
    const vertexIndex1 = faces[i].vertices[0]?.vertexIndex - 1;
    const vertexIndex2 = faces[i].vertices[1]?.vertexIndex - 1;
    const vertexIndex3 = faces[i].vertices[2]?.vertexIndex - 1;
    const vertexIndex4 = faces[i].vertices[3]?.vertexIndex - 1;

    const v1 = model.vertices[vertexIndex1];
    const v2 = model.vertices[vertexIndex2];
    const v3 = model.vertices[vertexIndex3];
    const v4 = model.vertices[vertexIndex4];

    const quad = new Quad({
      v1: new Vector(v1.x, v1.y, v1.z),
      v2: new Vector(v2.x, v2.y, v2.z),
      v3: new Vector(v3.x, v3.y, v3.z),
      v4: new Vector(v4.x, v4.y, v4.z),
      material: new Material({
        albedo: new Color(0, 1, 0)
      })
    });

    sceneObjects.push(quad);
  }
}
