import { Color } from "./Color.js";
import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { Intersection } from "./types.js";
import { Material } from "./Material.js";

export class AmbientLight {
  type = "ambient" as const;
  intensity: number;

  constructor({ intensity }: { intensity: number }) {
    this.intensity = intensity;
  }
}

export class DirectionalLight implements DirectionalLight {
  type = "directional" as const;
  intensity: number;
  dir: Vector;

  constructor({ dir, intensity }: { dir: Vector; intensity: number }) {
    this.intensity = intensity;
    this.dir = dir;
    this.type === "directional";
  }
}

export class PointLight {
  type = "point" as const;
  intensity: number;
  position: Point;
  constructor({ intensity, position }: { position: Point; intensity: number }) {
    this.position = position;
    this.intensity = intensity;
  }
}

export class AreaLight {
  type = "areaLight" as const;
  intensity: number;
  corner: Point;
  v1: Vector;
  v2: Vector;
  uSteps: number;
  vSteps: number;
  samples: number;
  uVec: Vector;
  vVec: Vector;
  position: Point;
  normal: Vector;
  size: number;
  material: Material;

  constructor({
    intensity,
    corner,
    v1,
    v2,
    uSteps,
    vSteps,
    size,
    material
  }: {
    intensity: number;
    corner: Point;
    v1: Vector;
    v2: Vector;
    uSteps: number;
    vSteps: number;
    size: number;
    material: Material;
  }) {
    this.corner = corner;
    this.intensity = intensity;
    this.v1 = v1;
    this.v2 = v2;
    this.uVec = v1.divide(uSteps);
    this.vVec = v2.divide(vSteps);
    this.uSteps = uSteps;
    this.vSteps = vSteps;
    this.samples = uSteps * vSteps;

    this.normal = v1.crossProduct(v2);
    this.size = size;
    this.material = material;
    this.position = new Point(
      this.corner.x + this.size / 2,
      this.corner.y,
      this.corner.z + this.size / 2
    );
  }

  pointOnLight(u: number, v: number) {
    return new Point(
      this.corner.x + 0.5 + this.uVec.x * (u + 0.5),
      0,
      this.corner.z + 0.5 + this.vVec.z * (v + 0.5)
    );
  }

  intersection(ray: Ray): Intersection {
    const t = (this.corner.y - ray.start.y) / ray.dir.y;

    const hitPoint = ray.getPoint(t);

    if (
      hitPoint.x >= this.corner.x &&
      hitPoint.x <= this.corner.x + this.size &&
      hitPoint.z >= this.corner.z &&
      hitPoint.z <= this.corner.z + this.size
    ) {
      return { t };
    }
  }
}

export type Light = AmbientLight | DirectionalLight | PointLight | AreaLight;
