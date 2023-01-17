import { Point } from "./Point.js";
import { Vector } from "./Vector.js";
export class Ray {
  start: Point;
  dir: Vector;

  constructor(start: Point, dir: Vector) {
    this.start = start;
    this.dir = dir;
  }

  negative() {
    return new Ray(
      this.start,
      new Vector(-this.dir.x, -this.dir.y, -this.dir.z)
    );
  }

  getPoint(t: number) {
    return new Point(
      this.start.x + this.dir.x * t,
      this.start.y + this.dir.y * t,
      this.start.z + this.dir.z * t
    );
  }
}
