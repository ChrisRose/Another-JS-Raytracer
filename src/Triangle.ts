import { Vector } from "./Vector.js";
import { Ray } from "./Ray.js";
import { epsilon } from "./const.js";
import { Material } from "./Material.js";
import { Point } from "./Point.js";

export class Triangle {
  material: Material;
  v1: Vector;
  v2: Vector;
  v3: Vector;
  type = "triangle" as const;
  name?: string;
  vertextNormals?: Vector[];
  normal: Vector;

  constructor({
    material,
    v1,
    v2,
    v3,
    name,
    vertextNormals
  }: {
    material: Material;
    v1: Vector;
    v2: Vector;
    v3: Vector;
    name?: string;
    vertextNormals?: Vector[];
  }) {
    this.material = material;
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
    this.name = name;
    this.vertextNormals = vertextNormals;
    const edge1 = this.v1.subtract(this.v2);
    const edge2 = this.v3.subtract(this.v2);
    this.normal = edge1.crossProduct(edge2).normalize();
  }

  intersection(ray: Ray) {
    // compute Möller–Trumbore intersection algorithm
    const edge1 = this.v2.subtract(this.v1);
    const edge2 = this.v3.subtract(this.v1);
    const h = ray.dir.crossProduct(edge2);
    const a = edge1.dotProduct(h);
    if (a > -epsilon && a < epsilon) {
      return undefined;
    }
    const f = 1.0 / a;
    const s = ray.start.subtract(this.v1.toPoint());
    const sVec = new Vector(s.x, s.y, s.z);
    const u = f * sVec.dotProduct(h);
    if (u < 0.0 || u > 1.0) {
      return undefined;
    }
    const q = sVec.crossProduct(edge1);
    const v = f * ray.dir.dotProduct(q);
    if (v < 0.0 || u + v > 1.0) {
      return undefined;
    }
    const t = f * edge2.dotProduct(q);
    if (t > epsilon) {
      return { t };
    }
    return undefined;
  }

  getUVW(point: Point) {
    // compute barycentric coordinates given a point within the triangle
    const vectorizedPoint = new Vector(point.x, point.y, point.z);
    const v1 = this.v1;
    const v2 = this.v2;
    const v3 = this.v3;
    const u = v2.subtract(v1);
    const v = v3.subtract(v1);
    const dotUU = u.dotProduct(u);
    const dotUV = u.dotProduct(v);
    const dotUW = u.dotProduct(vectorizedPoint.subtract(v1));
    const dotVV = v.dotProduct(v);
    const dotVW = v.dotProduct(vectorizedPoint.subtract(v1));
    const invDet = 1.0 / (dotUU * dotVV - dotUV * dotUV);
    const uCoord = (dotVV * dotUW - dotUV * dotVW) * invDet;
    const vCoord = (dotUU * dotVW - dotUV * dotUW) * invDet;
    const wCoord = 1.0 - uCoord - vCoord;
    return { u: uCoord, v: vCoord, w: wCoord };
  }

  normalAtPoint({ u, v, w }: { u: number; v: number; w: number }) {
    if (!this.vertextNormals) {
      return this.normal;
    }
    const { vertextNormals } = this;
    const n1 = vertextNormals[0];
    const n2 = vertextNormals[1];
    const n3 = vertextNormals[2];

    // interpolate normal at point
    const normal = n1
      .multiply(u)
      .add(n2.multiply(v))
      .add(n3.multiply(w))
      .normalize();

    return normal;
  }
}
