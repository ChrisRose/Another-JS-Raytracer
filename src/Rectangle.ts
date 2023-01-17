import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { Color } from "./Color.js";
import { Intersection } from "./types.js";
import { Material } from "./Material.js";

export class Rectangle {
  type = "rectangle" as const;
  corner: Point;
  v1: Vector;
  v2: Vector;
  normal: Vector;
  orientation: string;
  name?: string;
  material: Material;
  width: number;
  height: number;

  constructor({
    corner,
    v1,
    v2,
    orientation,
    normal,
    name,
    material,
    width,
    height
  }: {
    corner: Point;
    v1: Vector;
    v2: Vector;
    orientation: string;
    normal: Vector;
    name?: string;
    material: Material;
    width: number;
    height: number;
  }) {
    this.corner = corner;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = normal;
    this.orientation = orientation;
    this.name = name;
    this.material = material;
    this.width = width;
    this.height = height;
  }

  intersection(ray: Ray): Intersection {
    if (this.orientation === "yzAxis") {
      const t = (this.corner.x - ray.start.x) / ray.dir.x;

      const hitPoint = ray.getPoint(t);

      const y0 = this.corner.y;
      const y1 = this.corner.y + this.v1.y * this.height;
      const z0 = this.corner.z;
      const z1 = this.corner.z + this.v2.z * this.width;

      if (
        hitPoint.y > y0 &&
        hitPoint.y < y1 &&
        hitPoint.z > z0 &&
        hitPoint.z < z1
      ) {
        return { t };
      }
    } else if (this.orientation === "xyAxis") {
      const t = (this.corner.z - ray.start.z) / ray.dir.z;

      const hitPoint = ray.getPoint(t);

      const x0 = this.corner.x;
      const x1 = this.corner.x + this.v1.x * this.width;
      const y0 = this.corner.y;
      const y1 = this.corner.y + this.v2.y * this.height;

      if (
        hitPoint.x > x0 &&
        hitPoint.x < x1 &&
        hitPoint.y > y0 &&
        hitPoint.y < y1
      ) {
        return { t };
      }
    } else if (this.orientation === "xzAxis") {
      const t = (this.corner.y - ray.start.y) / ray.dir.y;

      const hitPoint = ray.getPoint(t);

      const x0 = this.corner.x;
      const x1 = this.corner.x + this.v1.x * this.width;
      const z0 = this.corner.z;
      const z1 = this.corner.z + this.v2.z * this.width;

      if (
        hitPoint.x > x0 &&
        hitPoint.x < x1 &&
        hitPoint.z > z0 &&
        hitPoint.z < z1
      ) {
        return { t };
      }
    }
  }
}
