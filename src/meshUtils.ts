import ObjFileParser from "obj-file-parser";
import { Color } from "./Color";
import { Material } from "./Material";
import { Mesh } from "./Mesh";
import { Triangle } from "./Triangle";
import { Primitive } from "./types";
import { Vector } from "./Vector";

export const parseMesh = ({
  mesh,
  material,
  name
}: {
  mesh: string;
  material: Material;
  name?: string;
}) => {
  const parsedMesh = new ObjFileParser(mesh).parse();
  const model = parsedMesh?.models[0];
  const meshObjects: Primitive[] = [];
  const faces = model.faces;

  for (let i = 0; i < faces.length; i += 1) {
    if (faces[i].vertices.length === 3) {
      const v1 = model.vertices[faces[i].vertices[0]?.vertexIndex - 1];
      const v2 = model.vertices[faces[i].vertices[1]?.vertexIndex - 1];
      const v3 = model.vertices[faces[i].vertices[2]?.vertexIndex - 1];

      const vn1Idx = faces[i].vertices[0]?.vertexNormalIndex;
      const vn2Idx = faces[i].vertices[1]?.vertexNormalIndex;
      const vn3Idx = faces[i].vertices[2]?.vertexNormalIndex;
      const n1 = vn1Idx ? model.vertexNormals[vn1Idx - 1] : null;
      const n2 = vn2Idx ? model.vertexNormals[vn2Idx - 1] : null;
      const n3 = vn3Idx ? model.vertexNormals[vn3Idx - 1] : null;
      const vertexNormals =
        n1 && n2 && n3
          ? [
              new Vector(n1.x, n1.y, -n1.z),
              new Vector(n2.x, n2.y, -n2.z),
              new Vector(n3.x, n3.y, -n3.z)
            ]
          : undefined;

      const triangle = new Triangle({
        v1: new Vector(v1.x, v1.y, -v1.z),
        v2: new Vector(v2.x, v2.y, -v2.z),
        v3: new Vector(v3.x, v3.y, -v3.z),
        vertextNormals: vertexNormals,
        material
      });

      meshObjects.push(triangle);
    } else if (faces[i].vertices.length === 4) {
      const v1Normal =
        model.vertexNormals[faces[i].vertices[0]?.vertexNormalIndex - 1];
      const v2Normal =
        model.vertexNormals[faces[i].vertices[1]?.vertexNormalIndex - 1];
      const v3Normal =
        model.vertexNormals[faces[i].vertices[2]?.vertexNormalIndex - 1];
      const v4Normal =
        model.vertexNormals[faces[i].vertices[3]?.vertexNormalIndex - 1];
      const v1 = model.vertices[faces[i].vertices[0]?.vertexIndex - 1];
      const v2 = model.vertices[faces[i].vertices[1]?.vertexIndex - 1];
      const v3 = model.vertices[faces[i].vertices[2]?.vertexIndex - 1];
      const v4 = model.vertices[faces[i].vertices[3]?.vertexIndex - 1];
      const triangle1 = new Triangle({
        v1: new Vector(v1.x, v1.y, -v1.z),
        v2: new Vector(v2.x, v2.y, -v2.z),
        v3: new Vector(v4.x, v4.y, -v4.z),
        vertextNormals: [
          new Vector(v1Normal.x, v1Normal.y, -v1Normal.z),
          new Vector(v2Normal.x, v2Normal.y, -v2Normal.z),
          new Vector(v4Normal.x, v4Normal.y, -v4Normal.z)
        ],
        material
      });
      const triangle2 = new Triangle({
        v1: new Vector(v2.x, v2.y, -v2.z),
        v2: new Vector(v3.x, v3.y, -v3.z),
        v3: new Vector(v4.x, v4.y, -v4.z),
        vertextNormals: [
          new Vector(v2Normal.x, v2Normal.y, -v2Normal.z),
          new Vector(v3Normal.x, v3Normal.y, -v3Normal.z),
          new Vector(v4Normal.x, v4Normal.y, -v4Normal.z)
        ],
        material
      });
      meshObjects.push(triangle1);
      meshObjects.push(triangle2);
    }
  }
  const sceneMesh = new Mesh({
    name,
    material: new Material({
      albedo: new Color(1, 0, 0)
    }),
    meshObjects: meshObjects
  });

  return sceneMesh;
};
