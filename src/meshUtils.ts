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
  name,
  scale = 1,
  translate = { x: 0, y: 0, z: 0 }
}: {
  mesh: string;
  material: Material;
  name?: string;
  scale?: number;
  translate?: { x: number; y: number; z: number };
}) => {
  const xv = (v: { x: number; y: number; z: number }) =>
    new Vector(v.x * scale + translate.x, v.y * scale + translate.y, -v.z * scale + translate.z);

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
        v1: xv(v1),
        v2: xv(v2),
        v3: xv(v3),
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
        v1: xv(v1),
        v2: xv(v2),
        v3: xv(v4),
        vertextNormals: [
          new Vector(v1Normal.x, v1Normal.y, -v1Normal.z),
          new Vector(v2Normal.x, v2Normal.y, -v2Normal.z),
          new Vector(v4Normal.x, v4Normal.y, -v4Normal.z)
        ],
        material
      });
      const triangle2 = new Triangle({
        v1: xv(v2),
        v2: xv(v3),
        v3: xv(v4),
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
    material,
    meshObjects: meshObjects
  });

  return sceneMesh;
};

type ParseMeshOptions = Omit<Parameters<typeof parseMesh>[0], "mesh">;

export const fetchAndParseMesh = async (
  url: string,
  options: ParseMeshOptions
): Promise<Mesh> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch mesh ${url}: ${r.status}`);
  const mesh = await r.text();
  return parseMesh({ mesh, ...options });
};
