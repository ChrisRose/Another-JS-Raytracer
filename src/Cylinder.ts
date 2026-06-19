import { Material } from "./Material.js";
import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { Intersection } from "./types.js";

/** Y-aligned analytical cylinder with two flat caps. */
export class Cylinder {
  readonly type = "cylinder" as const;
  center: Point;
  radius: number;
  height: number;
  material: Material;
  name: string;

  constructor({ center, radius, height, material, name = "cylinder" }: {
    center: Point;
    radius: number;
    height: number;
    material: Material;
    name?: string;
  }) {
    this.center = center;
    this.radius = radius;
    this.height = height;
    this.material = material;
    this.name = name;
  }

  intersection(ray: Ray): Intersection {
    const r = this.radius;
    const h = this.height;
    const ox = ray.start.x - this.center.x;
    const oy = ray.start.y - this.center.y;
    const oz = ray.start.z - this.center.z;
    const dx = ray.dir.x;
    const dy = ray.dir.y;
    const dz = ray.dir.z;

    let tBest = Infinity;

    // Curved surface: (ox + t·dx)² + (oz + t·dz)² = r²
    const a = dx * dx + dz * dz;
    if (a > 1e-10) {
      const b = 2 * (ox * dx + oz * dz);
      const c = ox * ox + oz * oz - r * r;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
          if (t > 1e-6 && t < tBest) {
            const ly = oy + t * dy;
            if (ly >= 0 && ly <= h) tBest = t;
          }
        }
      }
    }

    // Flat caps (bottom y=0, top y=h)
    if (Math.abs(dy) > 1e-10) {
      for (const tCap of [-oy / dy, (h - oy) / dy]) {
        if (tCap > 1e-6 && tCap < tBest) {
          const px = ox + tCap * dx;
          const pz = oz + tCap * dz;
          if (px * px + pz * pz <= r * r) tBest = tCap;
        }
      }
    }

    return tBest < Infinity ? { t: tBest } : undefined;
  }

  /** Outward normal: −Y on bottom cap, +Y on top cap, radial on curved surface. */
  normal(point: Point): Vector {
    const ly = point.y - this.center.y;
    if (ly <= 1e-3) return new Vector(0, -1, 0);
    if (ly >= this.height - 1e-3) return new Vector(0, 1, 0);
    return new Vector(
      (point.x - this.center.x) / this.radius,
      0,
      (point.z - this.center.z) / this.radius
    );
  }
}
