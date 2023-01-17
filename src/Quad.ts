import { Vector } from "./Vector.js";
import { Ray } from "./Ray.js";
import { epsilon } from "./const.js";
import { Material } from "./Material.js";

export class Quad {
  material: Material;
  v1: Vector;
  v2: Vector;
  v3: Vector;
  v4: Vector;
  type = "quad" as const;
  normal: Vector;
  name?: string;

  constructor({
    material,
    v1,
    v2,
    v3,
    v4,
    name
  }: {
    material: Material;
    v1: Vector;
    v2: Vector;
    v3: Vector;
    v4: Vector;
    name?: string;
  }) {
    this.material = material;
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
    this.v4 = v4;
    this.name = name;

    // find normal of quad assuming counter-clockwise winding by finding the normal of the first triangle and the second triangle and averaging them
    const edge1 = this.v1.subtract(this.v2);
    const edge2 = this.v3.subtract(this.v2);
    const normal1 = edge1.crossProduct(edge2).normalize();

    const edge3 = this.v3.subtract(this.v4);
    const edge4 = this.v1.subtract(this.v4);
    const normal2 = edge3.crossProduct(edge4).normalize();

    this.normal = normal1.add(normal2).negative().normalize();
  }

  intersection(ray: Ray) {
    let intersected = false;

    // compute intersection of ray and quadrilateral
    // first, find intersection of ray and first triangle
    const edge1 = this.v2.subtract(this.v1);
    const edge2 = this.v4.subtract(this.v1);
    const h = ray.dir.crossProduct(edge2);
    const a = edge1.dotProduct(h);
    if (a > -epsilon && a < epsilon) {
      intersected = false;
    } else {
      const f = 1.0 / a;
      const s = ray.start.subtract(this.v1.toPoint());
      const sVec = new Vector(s.x, s.y, s.z);
      const u = f * sVec.dotProduct(h);
      if (u < 0.0 || u > 1.0) {
        intersected = false;
      } else {
        const q = sVec.crossProduct(edge1);
        const v = f * ray.dir.dotProduct(q);
        if (v < 0.0 || u + v > 1.0) {
          intersected = false;
        } else {
          const t = f * edge2.dotProduct(q);
          if (t > epsilon) {
            return { t };
          }
        }
      }
    }

    // if the ray does not intersect the first triangle, then it may intersect the second triangle
    // find intersection of ray and second triangle
    const edge3 = this.v4.subtract(this.v3);
    const edge4 = this.v2.subtract(this.v3);

    const h2 = ray.dir.crossProduct(edge4);
    const a2 = edge3.dotProduct(h2);
    if (a2 > -epsilon && a2 < epsilon) {
      intersected = false;
    } else {
      const f2 = 1.0 / a2;
      const s2 = ray.start.subtract(this.v3.toPoint());
      const sVec2 = new Vector(s2.x, s2.y, s2.z);
      const u2 = f2 * sVec2.dotProduct(h2);
      if (u2 < 0.0 || u2 > 1.0) {
        intersected = false;
      } else {
        const q2 = sVec2.crossProduct(edge3);
        const v2 = f2 * ray.dir.dotProduct(q2);
        if (v2 < 0.0 || u2 + v2 > 1.0) {
          intersected = false;
        } else {
          const t2 = f2 * edge4.dotProduct(q2);
          if (t2 > epsilon) {
            return { t: t2 };
          }
        }
      }
    }
  }
}
