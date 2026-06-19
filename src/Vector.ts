import { Point } from "./Point";

export class Vector {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector {
    var l = this.length();
    return new Vector(this.x / l, this.y / l, this.z / l);
  }

  multiply(scalar: number) {
    return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar: number) {
    return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  add(v: Vector) {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  addScalar(n: number) {
    return new Vector(this.x + n, this.y + n, this.z + n);
  }

  subtract(v: Vector) {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  dotProduct(v: Vector) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  crossProduct(v: Vector) {
    return new Vector(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  negative() {
    return new Vector(this.x * -1, this.y * -1, this.z * -1);
  }

  multiplyWith3x3Matrix(matrix: any) {
    var result = [0, 0, 0];
    const vector = [this.x, this.y, this.z];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        result[i] += vector[j] * matrix[i][j];
      }
    }
    return new Vector(result[0], result[1], result[2]);
  }

  toPoint() {
    return new Point(this.x, this.y, this.z);
  }
}
