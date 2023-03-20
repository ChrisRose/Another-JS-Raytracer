import { Box } from "./Box";
import { Color } from "./Color";
import { Material } from "./Material";
import { Point } from "./Point";
import { Primitive, SceneObject, Shape } from "./types";

export class Mesh {
  type = "mesh" as const;
  name?: string;
  meshObjects: Primitive[] = [];
  material: Material;
  boundingBox?: Shape;

  constructor({
    name,
    meshObjects,
    material
  }: {
    name?: string;
    meshObjects?: Primitive[];
    material: Material;
  }) {
    this.name = name;
    this.meshObjects = meshObjects || [];
    this.material = material;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (const meshObject of this.meshObjects) {
      if (meshObject.type === "triangle") {
        const { v1, v2, v3 } = meshObject;
        const xValues = [v1.x, v2.x, v3.x];
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);

        const yValues = [v1.y, v2.y, v3.y];
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);

        const zValues = [v1.z, v2.z, v3.z];
        const zMin = Math.min(...zValues);
        const zMax = Math.max(...zValues);

        if (xMin < minX) minX = xMin;
        if (xMax > maxX) maxX = xMax;
        if (yMin < minY) minY = yMin;
        if (yMax > maxY) maxY = yMax;
        if (zMin < minZ) minZ = zMin;
        if (zMax > maxZ) maxZ = zMax;
      } else if (meshObject.type === "quad") {
        const { v1, v2, v3, v4 } = meshObject;
        const xValues = [v1.x, v2.x, v3.x, v4.x];
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);

        const yValues = [v1.y, v2.y, v3.y, v4.y];
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);

        const zValues = [v1.z, v2.z, v3.z, v4.z];
        const zMin = Math.min(...zValues);
        const zMax = Math.max(...zValues);

        if (xMin < minX) minX = xMin;
        if (xMax > maxX) maxX = xMax;
        if (yMin < minY) minY = yMin;
        if (yMax > maxY) maxY = yMax;
        if (zMin < minZ) minZ = zMin;
        if (zMax > maxZ) maxZ = zMax;
      }
    }

    if (this.name === "teapot") {
      this.boundingBox = new Box({
        corner: new Point(minX, minY, minZ),
        width: maxX - minX || maxZ - minZ,
        height: maxY - minY,
        material: new Material({
          albedo: new Color(0, 0, 0),
          emissive: new Color(0, 0, 0)
        })
      });
    }
  }
}
