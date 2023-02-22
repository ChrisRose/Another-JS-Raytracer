import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { Color } from "./Color.js";
import { Intersection } from "./types.js";
import { Material } from "./Material.js";
import { Rectangle } from "./Rectangle.js";

export class Box {
  type = "box" as const;
  corner: Point;
  name?: string;
  material: Material;
  sides: Rectangle[];
  width: number;
  height: number;

  constructor({
    corner,
    name,
    material,
    width,
    height
  }: {
    corner: Point;
    name?: string;
    material: Material;
    width: number;
    height: number;
  }) {
    this.corner = corner;
    this.name = name;
    this.material = material;
    this.width = width;
    this.height = height;

    const top = new Rectangle({
      corner: new Point(
        this.corner.x,
        this.corner.y + this.height,
        this.corner.z
      ),
      width: this.width,
      height: this.height,
      v1: new Vector(1, 0, 0),
      v2: new Vector(0, 0, 1),
      orientation: "xzAxis",
      normal: new Vector(0, -1, 0),
      material
    });

    const bottom = new Rectangle({
      corner: new Point(this.corner.x, this.corner.y + 0.1, this.corner.z),
      v1: new Vector(1, 0, 0),
      v2: new Vector(0, 0, 1),
      width: this.width,
      height: this.height,
      orientation: "xzAxis",
      normal: new Vector(0, 1, 0),
      material
    });

    const left = new Rectangle({
      corner,
      v1: new Vector(0, 1, 0),
      v2: new Vector(0, 0, 1),
      width: this.width,
      height: this.height,
      orientation: "yzAxis",
      normal: new Vector(-1, 0, 0),
      material
    });

    const right = new Rectangle({
      corner: new Point(
        this.corner.x + this.width,
        this.corner.y,
        this.corner.z
      ),
      v1: new Vector(0, 1, 0),
      v2: new Vector(0, 0, 1),
      width: this.width,
      height: this.height,
      orientation: "yzAxis",
      normal: new Vector(1, 0, 0),
      material
    });

    const front = new Rectangle({
      corner,
      v1: new Vector(1, 0, 0),
      v2: new Vector(0, 1, 0),
      width: this.width,
      height: this.height,
      orientation: "xyAxis",
      normal: new Vector(0, 0, -1),
      material
    });

    const back = new Rectangle({
      corner: new Point(
        this.corner.x,
        this.corner.y,
        this.corner.z + this.width
      ),
      v1: new Vector(1, 0, 0),
      v2: new Vector(0, 1, 0),
      width: this.width,
      height: this.height,
      orientation: "xyAxis",
      normal: new Vector(0, 0, 1),
      material
    });

    this.sides = [front, top, left, right, back, bottom];
  }

  intersection(ray: Ray): Intersection {
    let closestIntersection = Infinity;

    for (const side of this.sides) {
      const intersection = side.intersection(ray);
      if (intersection && intersection.t < closestIntersection) {
        closestIntersection = intersection.t;
        return { ...intersection, normal: side.normal };
      }
    }
  }
}
