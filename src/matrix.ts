import { Vector } from "./Vector";

export const getRotationYMatrix = (angle: number) => {
  const degrees = (angle * Math.PI) / 180;
  const cos = Math.cos(degrees);
  const sin = Math.sin(degrees);
  return [
    [cos, 0, sin],
    [0, 1, 0],
    [-sin, 0, cos]
  ];
};

export const getRotationXMatrix = (angle: number) => {
  const degrees = (angle * Math.PI) / 180;
  const cos = Math.cos(degrees);
  const sin = Math.sin(degrees);
  return [
    [1, 0, 0],
    [0, cos, -sin],
    [0, sin, cos]
  ];
};

export const getRotationZMatrix = (angle: number) => {
  const degrees = (angle * Math.PI) / 180;
  const cos = Math.cos(degrees);
  const sin = Math.sin(degrees);
  return [
    [cos, -sin, 0],
    [sin, cos, 0],
    [0, 0, 1]
  ];
};

export const getRotationMatrixAlignedToVector = (vector: Vector) => {
  const x = vector.x;
  const y = vector.y;
  const z = vector.z;
  const length = Math.sqrt(x * x + y * y + z * z);
  const xNormalized = x / length;
  const yNormalized = y / length;
  const zNormalized = z / length;
  const cos = xNormalized;
  const sin = Math.sqrt(1 - cos * cos);
  const cos2 = yNormalized;
  const sin2 = Math.sqrt(1 - cos2 * cos2);
  const cos3 = zNormalized;
  const sin3 = Math.sqrt(1 - cos3 * cos3);
  return [
    [
      cos * cos2,
      cos * sin2 * sin3 - sin * cos3,
      cos * sin2 * cos3 + sin * sin3
    ],
    [
      sin * cos2,
      sin * sin2 * sin3 + cos * cos3,
      sin * sin2 * cos3 - cos * sin3
    ],
    [-sin2, cos2 * sin3, cos2 * cos3]
  ];
};
