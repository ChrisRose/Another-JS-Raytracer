import { Material } from "./Material";
import { Primitive } from "./types";
import { Triangle } from "./Triangle";
import { BVHNode, buildBVH } from "./BVH";

export class Mesh {
  type = "mesh" as const;
  name?: string;
  meshObjects: Primitive[] = [];
  material: Material;
  bvh: BVHNode | null = null;

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

    const triangles = this.meshObjects.filter(
      (o): o is Triangle => o.type === "triangle"
    );
    if (triangles.length > 0) {
      this.bvh = buildBVH(triangles);
    }
  }
}
