import { Color } from "./Color.js";
import { epsilon } from "./const.js";
import { Point } from "./Point.js";
import { Intersected } from "./types.js";

const getUV = (intersected: Intersected) => {
  if (!intersected?.object) {
    return { u: 0, v: 0 };
  }
  const { x, y, z } = intersected.point;
  let u: number = 0,
    v: number = 0;
  if (intersected.object?.type === "rectangle") {
    if (intersected.object.orientation === "xyAxis") {
      u = x % 1;
      v = y % 1;
    }
    if (intersected.object.orientation === "xzAxis") {
      u = x % 1;
      v = z % 1;
    }
  } else {
    u = x % 1;
    v = z % 1;
  }
  return { u, v };
};

export const checkerboardTexture = (intersected: Intersected) => {
  const checkers = {
    width: 2,
    height: 2,
    color1: new Color(0, 0, 0),
    color2: new Color(1, 1, 1)
  };
  const { u, v } = getUV(intersected);

  let u2 = Math.floor(u * checkers.width);
  let v2 = Math.floor(v * checkers.height);

  if ((u2 + v2) % 2 === 0) {
    return checkers.color1;
  }
  return checkers.color2;
};

export const gridTexture = (intersected: Intersected) => {
  const { u, v } = getUV(intersected);

  const thickness = 0.01;
  const background = new Color(0.5, 0.5, 0.5);
  const grid = new Color(0, 0, 0);
  const delta = (v: number) => Math.abs(v - Math.floor(v + 0.5));
  const isline = (v: number) => (delta(v) < thickness ? true : false);
  if (isline(u) || isline(v)) {
    return grid;
  } else {
    return background;
  }
};
