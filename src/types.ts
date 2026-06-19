import { AreaLight, LightBall, LightType } from "./Light.js";
import { Sphere } from "./Sphere.js";
import { Plane } from "./Plane.js";
import { Rectangle } from "./Rectangle.js";
import { Point } from "./Point.js";
import { Box } from "./Box.js";
import { Vector } from "./Vector.js";
import { Triangle } from "./Triangle.js";
import { Mesh } from "./Mesh.js";
import { Quad } from "./Quad.js";

export type Shape =
  | Sphere
  | Plane
  | Rectangle
  | Box
  | Triangle
  | Quad
  | AreaLight
  | LightBall;
export type Primitive = Sphere | Plane | Rectangle | Triangle | Quad;
export type SceneObject = Shape | Mesh | AreaLight | LightBall;

export type LightPatch = {
  patch: { x: number; y: number; z: number }[];
  center: Point;
};

export type Intersected = {
  point: Point;
  object?: Primitive | AreaLight | LightBall;
  intersection?: Intersection;
} | null;

export type Intersection =
  | {
      t: number;
      side?: Primitive;
    }
  | undefined;
