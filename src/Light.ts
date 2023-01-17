import { Color } from "./Color.js";
import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { Intersection, LightPatch } from "./types.js";
import { epsilon } from "./const.js";

export type LightType =
  | AmbientLight
  | DirectionalLight
  | PointLight
  | AreaLight
  | LightBall;

export class Light {
  intensity: number;
  color: Color;
  name?: string;
  type?: string;
  dir?: Vector;
  position?: Point;

  constructor({
    intensity,
    color,
    name,
    type,
    dir,
    position
  }: {
    intensity: number;
    color: Color;
    name?: string;
    type?: string;
    dir?: Vector;
    position?: Point;
  }) {
    this.intensity = intensity;
    this.color = color;
    this.name = name;
    this.type = type;
    this.dir = dir;
    this.position = position;
  }
}

export class AmbientLight extends Light {
  type = "ambient" as const;

  constructor({
    color,
    intensity,
    name
  }: {
    color: Color;
    intensity: number;
    name?: string;
  }) {
    super({ intensity, color, name });
  }
}

export class DirectionalLight extends Light {
  type = "directional" as const;
  dir: Vector;

  constructor({
    dir,
    intensity,
    name
  }: {
    dir: Vector;
    intensity: number;
    name?: string;
  }) {
    super({ intensity, color: new Color(1, 1, 1), name });
    this.dir = dir;
  }
}

export class PointLight extends Light {
  type = "point" as const;
  position: Point;
  constructor({
    intensity,
    position,
    name
  }: {
    position: Point;
    intensity: number;
    name?: string;
  }) {
    super({ intensity, color: new Color(1, 1, 1), name });
    this.position = position;
  }
}

export class AreaLight extends Light {
  type = "areaLight" as const;
  corner: Point;
  v1: Vector;
  v2: Vector;
  uSteps: number;
  vSteps: number;
  uVec: Vector;
  vVec: Vector;
  position: Point;
  normal: Vector;
  size: number;

  constructor({
    corner,
    v1,
    v2,
    uSteps,
    vSteps,
    size,
    color = new Color(1, 1, 1),
    intensity,
    name
  }: {
    corner: Point;
    v1: Vector;
    v2: Vector;
    uSteps: number;
    vSteps: number;
    size: number;
    intensity: number;
    color?: Color;
    name?: string;
  }) {
    super({ intensity, color, name });
    this.corner = corner;
    this.v1 = v1;
    this.v2 = v2;
    this.uVec = v1.divide(uSteps);
    this.vVec = v2.divide(vSteps);
    this.uSteps = uSteps;
    this.vSteps = vSteps;
    this.normal = v1.crossProduct(v2);
    this.size = size;
    this.position = new Point(
      this.corner.x + this.size / 2,
      this.corner.y,
      this.corner.z + this.size / 2
    );
  }

  pointOnLight(u: number, v: number) {
    return new Point(
      this.corner.x + 0.5 + this.uVec.x * (u + 0.5),
      this.corner.y,
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

export class LightBall {
  type = "lightBall" as const;
  position: Point;
  radius: number;
  name?: string;
  discriminant: number | undefined;
  b: number | undefined;
  c: number | undefined;
  intensity: number;
  color: Color;
  uSteps: number;
  vSteps: number;
  inside?: boolean;

  constructor({
    position,
    radius,
    name,
    intensity,
    color,
    uSteps,
    vSteps
  }: {
    position: Point;
    radius: number;
    name?: string;
    intensity: number;
    color: Color;
    uSteps: number;
    vSteps: number;
  }) {
    this.position = position;
    this.radius = radius;
    this.name = name;
    this.intensity = intensity;
    this.color = color;
    this.name = name;
    this.uSteps = uSteps;
    this.vSteps = vSteps;
  }

  normal(p: Point) {
    return new Vector(
      p.x - this.position.x,
      p.y - this.position.y,
      p.z - this.position.z
    );
  }

  getLightPatches() {
    // Calculate the latitude and longitude spacing
    const latSpacing = Math.PI / (this.uSteps + 1);
    const lonSpacing = (2 * Math.PI) / this.vSteps;

    // Create a grid of points on the sphere's surface
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i <= this.uSteps + 1; i++) {
      const lat = Math.PI / 2 - i * latSpacing;
      for (let j = 0; j < this.vSteps; j++) {
        const lon = j * lonSpacing;
        const x = this.position.x + this.radius * Math.sin(lat) * Math.cos(lon);
        const y = this.position.y + this.radius * Math.sin(lat) * Math.sin(lon);
        const z = this.position.z + this.radius * Math.cos(lat);
        points.push({ x, y, z });
      }
    }

    // Create patches on the sphere's surface
    const patches: LightPatch[] = [];
    for (let i = 0; i < this.uSteps + 1; i++) {
      for (let j = 0; j < this.vSteps; j++) {
        const p1 = points[i * this.vSteps + j];
        const p2 = points[(i + 1) * this.vSteps + j];
        const p3 = points[(i + 1) * this.vSteps + ((j + 1) % this.vSteps)];
        const p4 = points[i * this.vSteps + ((j + 1) % this.vSteps)];
        const patch = [p1, p2, p3, p4];
        const center = patch.reduce(
          (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
          { x: 0, y: 0, z: 0 }
        );
        center.x /= 4;
        center.y /= 4;
        center.z /= 4;
        const centerPoint = new Point(center.x, center.y, center.z);
        patches.push({ patch, center: centerPoint });
      }
    }

    return patches;
  }

  intersection(ray: Ray): Intersection {
    var a, b, c, discriminant, t0, t1;

    const rayDirNormalized = ray.dir.normalize();

    a = 1;
    b =
      2 *
      (rayDirNormalized.x * (ray.start.x - this.position.x) +
        rayDirNormalized.y * (ray.start.y - this.position.y) +
        rayDirNormalized.z * (ray.start.z - this.position.z));
    c =
      Math.pow(ray.start.x - this.position.x, 2) +
      Math.pow(ray.start.y - this.position.y, 2) +
      Math.pow(ray.start.z - this.position.z, 2) -
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

      if (this.name === "skyLight") {
        return { t: t1 };
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
