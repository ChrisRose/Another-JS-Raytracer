import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Ray } from "../Ray.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";

test("intersects a sphere", () => {
  const sphere = new Sphere({
    center: new Point(3, 0, 5),
    radius: 3,
    albedo: new Color(0, 0, 155),
    specular: 100,
    reflectivity: 0,
    refractionIndex: 0
  });

  const ray = new Ray(new Point(1, -2, -1), new Vector(1, 2, 4));

  const intersection = sphere.intersection(ray);

  if (!intersection) {
    throw new Error("No intersection found");
  }

  const discriminant = sphere.discriminant;

  expect(discriminant).toBeCloseTo(31.43, 2);

  expect(intersection).toBeCloseTo(3.744);

  expect(ray.dir.normalize().x).toBeCloseTo(0.218, 3);
  expect(ray.dir.normalize().y).toBeCloseTo(0.436, 3);
  expect(ray.dir.normalize().z).toBeCloseTo(0.873, 3);

  expect(sphere.b).toBeCloseTo(-13.092, 2);
  expect(sphere.c).toBe(35);

  const normalizedRay = new Ray(ray.start, ray.dir.normalize());
  const intersectionPoint = normalizedRay.getPoint(intersection);

  expect(intersectionPoint.x).toBeCloseTo(1.816);
});
