import { AreaLight } from "./Light.js";
import { Sphere } from "./Sphere.js";
import { Plane } from "./Plane.js";
import { Rectangle } from "./Rectangle.js";
import { Point } from "./Point.js";
import { Box } from "./Box.js";
import { Vector } from "./Vector.js";

export type Shape = Plane | Sphere | Rectangle | Box;

export type SceneObjects = (Shape | AreaLight)[];

export type Intersected =
  | {
      point: Point;
      object: Shape | AreaLight;
      inside?: boolean;
      intersection?: Intersection;
    }
  | undefined;

export type Intersection =
  | {
      t: number;
      inside?: boolean;
      normal?: Vector;
    }
  | undefined;
