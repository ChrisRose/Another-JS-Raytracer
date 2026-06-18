import { Color } from "./Color.js";
import { Point } from "./Point.js";
import { Vector } from "./Vector.js";

const getUV = (point: Point, normal: Vector) => {
  const ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
  if (az >= ax && az >= ay) return { u: point.x % 1, v: point.y % 1 }; // front/back
  if (ay >= ax)              return { u: point.x % 1, v: point.z % 1 }; // floor/ceiling
  return                            { u: point.z % 1, v: point.y % 1 }; // left/right
};

export const checkerboardTexture = (point: Point, normal: Vector): Color => {
  const { u, v } = getUV(point, normal);
  const u2 = Math.floor(u * 2);
  const v2 = Math.floor(v * 2);
  return (u2 + v2) % 2 === 0 ? new Color(0, 0, 0) : new Color(1, 1, 1);
};

export const gridTexture = (point: Point, normal: Vector): Color => {
  const { u, v } = getUV(point, normal);
  const thickness = 0.01;
  const delta = (x: number) => Math.abs(x - Math.floor(x + 0.5));
  return delta(u) < thickness || delta(v) < thickness
    ? new Color(0, 0, 0)
    : new Color(0.5, 0.5, 0.5);
};
