import { AreaLight } from "./Light.js";
import { Sphere } from "./Sphere.js";
import { Plane } from "./Plane.js";
import { Rectangle } from "./Rectangle.js";
import { Point } from "./Point.js";

export type Shape = Plane | Sphere | Rectangle;

export type SceneObjects = (Shape | AreaLight)[];

export type Intersected =
  | {
      point: Point;
      object: Shape | AreaLight;
      inside?: boolean;
    }
  | undefined;

export type Intersection =
  | {
      t: number;
      inside?: boolean;
    }
  | undefined;
