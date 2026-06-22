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
import { Cylinder } from "./Cylinder.js";

export type Shape =
  | Sphere
  | Plane
  | Rectangle
  | Box
  | Triangle
  | Quad
  | AreaLight
  | LightBall
  | Cylinder;
export type Primitive = Sphere | Plane | Rectangle | Triangle | Quad | Cylinder;
export type SceneObject = Shape | Mesh | AreaLight | LightBall;

export type LightPatch = {
  patch: { x: number; y: number; z: number }[];
  center: Point;
};

export type Intersected = {
  point: Point;
  object?: Primitive | AreaLight | LightBall;
  intersection?: Intersection;
  mesh?: Mesh;
} | null;

export type Intersection =
  | {
      t: number;
      side?: Primitive;
    }
  | undefined;
