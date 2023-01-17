import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { subtract } from "./utils.js";
import { Color } from "./Color.js";
import { epsilon } from "./const.js";
import { Intersection } from "./types.js";
import { Material } from "./Material.js";

export class Plane {
  center: Point;
  name?: string;
  normal: Vector;
  size: number;
  type = "plane" as const;
  material: Material;

  constructor({
    center,
    normal,
    name,
    size,
    material
  }: {
    center: Point;
    normal: Vector;
    texture?: (x: number, y: number) => Color;
    reflectivity?: number;
    specular?: number;
    name?: string;
    size: number;
    material: Material;
  }) {
    this.center = center;
    this.normal = normal;
    this.name = name;
    this.size = size;
    this.material = material;
  }

  intersection(ray: Ray): Intersection {
    const denominator = this.normal.dotProduct(ray.dir.normalize());
    let intersectionPoint;

    if (Math.abs(denominator) > 0) {
      const difference = subtract(this.center, ray.start);
      const t = difference.dotProduct(this.normal) / denominator;

      if (t > epsilon) {
        intersectionPoint = ray.getPoint(t);

        if (
          intersectionPoint.x < this.center.x - this.size ||
          intersectionPoint.x > this.center.x + this.size ||
          intersectionPoint.z < this.center.z - this.size ||
          intersectionPoint.z > this.center.z + this.size
        ) {
          return undefined;
        }
        return { t };
      }
    }
  }
}
