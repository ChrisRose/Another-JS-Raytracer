import { Point } from "./Point.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";

export const subtract = (r1: Vector | Point, r2: Vector | Point) =>
  new Vector(r1.x - r2.x, r1.y - r2.y, r1.z - r2.z);

export const distance = (p1: Point, p2: Point) =>
  Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
  );

export const dotProduct = (r1: Vector, r2: Vector) =>
  r1.x * r2.x + r1.y * r2.y + r1.z * r2.z;

// a function to get a random reflection ray in a hemisphere with a cosine distribution
export const getHemisphereRay = ({ point }: { point: Point }): Ray => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = Math.cos(theta) * Math.sin(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(phi);
  const hemisphereRay = new Ray(point, new Vector(x, y, z));
  return hemisphereRay;
};

// a function that takes a normal, a point, and an incident ray and a glossiness value and returns a random reflection ray in a hemisphere with a cosine distribution
export const getGlossyRay = ({
  normal,
  point,
  incidentRay,
  glossiness
}: {
  normal: Vector;

  point: Point;
  incidentRay: Vector;
  glossiness: number;
}): Ray => {
  const hemisphereRay = getHemisphereRay({
    point
  });

  const dot = dotProduct(hemisphereRay.dir, normal);
  if (dot > 0) {
    const glossyRay = new Ray(
      point,
      incidentRay.add(hemisphereRay.dir.multiply(glossiness)).normalize()
    );
    return glossyRay;
  } else {
    return getGlossyRay({ normal, point, incidentRay, glossiness });
  }
};
