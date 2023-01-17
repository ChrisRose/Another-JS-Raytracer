import { Vector } from "./Vector.js";

export class Point {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(p: Point): Point {
    return new Point(this.x + p.x, this.y + p.y, this.z + p.z);
  }

  subtract(p: Point): Point {
    return new Point(this.x - p.x, this.y - p.y, this.z - p.z);
  }

  multiply(factor: number): Point {
    return new Point(this.x * factor, this.y * factor, this.z * factor);
  }
}
