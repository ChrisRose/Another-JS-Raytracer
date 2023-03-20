import { Point } from "./Point.js";
import { Vector } from "./Vector.js";
import { Ray } from "./Ray.js";
import { epsilon } from "./const.js";
import { Intersection } from "./types.js";
import { Material } from "./Material.js";

export class Sphere {
  center: Point;
  radius: number;
  name?: string;
  type = "sphere" as const;
  discriminant: number | undefined;
  b: number | undefined;
  c: number | undefined;
  material: Material;

  constructor({
    center,
    radius,
    name,
    material
  }: {
    center: Point;
    radius: number;
    name?: string;
    material: Material;
  }) {
    this.center = center;
    this.radius = radius;
    this.name = name;
    this.material = material;
  }

  normal(p: Point) {
    return new Vector(
      p.x - this.center.x,
      p.y - this.center.y,
      p.z - this.center.z
    );
  }

  intersection(ray: Ray): Intersection {
    var a, b, c, discriminant;

    const rayDirNormalized = ray.dir.normalize();

    a = 1;
    b =
      2 *
      (rayDirNormalized.x * (ray.start.x - this.center.x) +
        rayDirNormalized.y * (ray.start.y - this.center.y) +
        rayDirNormalized.z * (ray.start.z - this.center.z));
    c =
      Math.pow(ray.start.x - this.center.x, 2) +
      Math.pow(ray.start.y - this.center.y, 2) +
      Math.pow(ray.start.z - this.center.z, 2) -
      Math.pow(this.radius, 2);

    this.b = b;
    this.c = c;

    discriminant = Math.pow(b, 2) - 4 * a * c;
    this.discriminant = discriminant;

    if (discriminant < 0) {
      return undefined;
    } else {
      let t0 = (-b - Math.sqrt(discriminant)) / 2;
      let t1 = (-b + Math.sqrt(discriminant)) / 2;

      if (t0 > 0) {
        return { t: t0 };
      }

      if (t0 > t1) {
        const temp = t0;
        t0 = t1;
        t1 = temp;
      }

      if (Math.abs(t0) < epsilon) {
        return undefined;
      }

      return { t: t0 };
    }
  }
}
