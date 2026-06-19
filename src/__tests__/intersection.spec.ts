import { Color } from "../Color.js";
import { Material } from "../Material.js";
import { Point } from "../Point.js";
import { Ray } from "../Ray.js";
import { Sphere } from "../Sphere.js";
import { Triangle } from "../Triangle.js";
import { Vector } from "../Vector.js";

test("intersects a sphere", () => {
  const sphere = new Sphere({
    center: new Point(3, 0, 5),
    radius: 3,
    material: new Material({
      albedo: new Color(1, 0, 0)
    })
  });

  const ray = new Ray(new Point(1, -2, -1), new Vector(1, 2, 4));

  const intersection = sphere.intersection(ray);

  if (!intersection) {
    throw new Error("No intersection found");
  }

  const discriminant = sphere.discriminant;

  expect(discriminant).toBeCloseTo(31.43, 2);

  expect(intersection.t).toBeCloseTo(3.744);

  expect(ray.dir.normalize().x).toBeCloseTo(0.218, 3);
  expect(ray.dir.normalize().y).toBeCloseTo(0.436, 3);
  expect(ray.dir.normalize().z).toBeCloseTo(0.873, 3);

  expect(sphere.b).toBeCloseTo(-13.092, 2);
  expect(sphere.c).toBe(35);

  const normalizedRay = new Ray(ray.start, ray.dir.normalize());
  const intersectionPoint = normalizedRay.getPoint(intersection?.t);

  expect(intersectionPoint.x).toBeCloseTo(1.816);
});

test("intersects a triangle", () => {
  const triangle = new Triangle({
    material: new Material({
      albedo: new Color(1, 0, 0)
    }),
    v1: new Vector(1, 0, 0),
    v2: new Vector(0, 1, 0),
    v3: new Vector(0, 0, 1)
  });

  const ray = new Ray(new Point(0, 0, 0), new Vector(1, 1, 1));

  const intersection = triangle.intersection(ray);

  if (!intersection) {
    throw new Error("No intersection found");
  }

  expect(intersection.t).toBeCloseTo(0.33);
});

test("intersects a triangle 2", () => {
  const triangle = new Triangle({
    material: new Material({
      albedo: new Color(1, 0, 0)
    }),
    v1: new Vector(-3, 0, 4),
    v2: new Vector(-3, 6, 4),
    v3: new Vector(1, 0, -4)
  });

  const ray = new Ray(new Point(1, 0, -10), new Vector(0, 0, 1));

  const intersection = triangle.intersection(ray);

  if (!intersection) {
    throw new Error("No intersection found");
  }

  const intersectionPoint = ray.getPoint(intersection.t);

  expect(intersectionPoint.x).toBeCloseTo(1);
  expect(intersectionPoint.y).toBeCloseTo(0);
  expect(intersectionPoint.z).toBeCloseTo(-4);
});
