import { Color } from "./Color.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import {
  Intersected,
  Intersection,
  Primitive,
  SceneObject,
  Shape
} from "./types.js";
import { distance, subtract, dotProduct, getGlossyRay } from "./utils.js";
import { epsilon } from "./const.js";
import { AreaLight, Light, LightBall } from "./Light.js";
import {
  cameraStart,
  lights,
  rotateCamera,
  sceneObjects
} from "./scenes/cornellBoxMeshes.js";
import { Point } from "./Point.js";
import { Mesh } from "./Mesh.js";
import { getRotationMatrixAlignedToVector } from "./matrix.js";

export function findClosestIntersection({
  origin,
  dir,
  tMin,
  tMax,
  findClosest = true,
  sceneObjects,
  i,
  j
}: {
  origin: Point;
  dir: Vector;
  tMin: number;
  tMax: number;
  findClosest?: boolean;
  i?: number;
  j?: number;
  sceneObjects: SceneObject[];
}): Intersected | null {
  let point: Point;
  let intersected: Intersected = null;
  let dist = Infinity;
  let closestIntersection = Infinity;
  let intersection: Intersection;
  let meshObjects = sceneObjects.filter((object) => object.type === "mesh");

  // loop through all scene objects and find each mesh object
  // if intersection with bounding box then find closest intersection
  for (let k = 0; k < meshObjects.length; k++) {
    const meshObject = meshObjects[k] as Mesh;
    const boundingBox = meshObject.boundingBox;
    if (boundingBox) {
      const boundingBoxIntersection = boundingBox.intersection(
        new Ray(origin, dir)
      );
      if (true || boundingBoxIntersection) {
        for (let j = 0; j < meshObject.meshObjects.length; j++) {
          const object = meshObject.meshObjects[j];

          intersection = object.intersection(new Ray(origin, dir));

          if (intersection) {
            const { t } = intersection;
            point = new Ray(origin, dir).getPoint(t);

            if (t > tMin && t < tMax) {
              if (!findClosest) {
                return { point, object };
              }

              dist = distance(point, origin);

              if (dist < closestIntersection) {
                closestIntersection = dist;
                intersected = {
                  point,
                  object,
                  intersection
                };
              }
            }
          }
        }
      }
    }
  }

  let objects = sceneObjects.filter((object) => object.type !== "mesh");
  for (let k = 0; k < objects.length; k++) {
    const object = objects[k] as Primitive;

    // if (i === 400 && j === 325 && object.type === "triangle") {
    //   debugger;
    // }

    intersection = object.intersection(new Ray(origin, dir));

    if (intersection) {
      const { t } = intersection;
      point = new Ray(origin, dir).getPoint(t);

      if (t > tMin && t < tMax) {
        if (!findClosest) {
          return { point, object };
        }

        dist = distance(point, origin);

        if (dist < closestIntersection) {
          closestIntersection = dist;
          intersected = {
            point,
            object: intersection.side || object,
            intersection
          };
        }
      }
    }
  }

  return intersected;
}

const isShadowed = function ({
  lightDirection,
  origin,
  sceneObjects
}: {
  lightDirection: Vector;
  origin: Point;
  sceneObjects: SceneObject[];
}) {
  return findClosestIntersection({
    origin,
    dir: lightDirection,
    tMin: epsilon,
    tMax: 1,
    findClosest: false,
    sceneObjects: sceneObjects.filter(
      (object) => object.type !== "lightBall" && object.type !== "areaLight"
    )
  });
};

// const intensityAt = ({
//   light,
//   point,
//   sceneObjects
// }: {
//   light: AreaLight | LightBall;
//   point: Point;
//   sceneObjects: SceneObject[];
// }) => {
//   let total = 0;

//   if (light.type === "areaLight") {
//     for (let v = 0; v <= light.vSteps - 1; v++) {
//       for (let u = 0; u <= light.uSteps - 1; u++) {
//         const lightPosition = light.pointOnLight(u, v);
//         if (
//           !isShadowed({
//             origin: point,
//             lightPosition,
//             sceneObjects
//           })
//         ) {
//           total += 1;
//         }
//       }
//     }
//   } else if (light.type === "lightBall") {
//     const lightPatches = light.getLightPatches();

//     for (let i = 0; i < lightPatches.length; i++) {
//       const lightPosition = lightPatches[i].center;
//       if (
//         !isShadowed({
//           origin: point,
//           lightPosition,
//           sceneObjects
//         })
//       ) {
//         total += 1;
//       }
//     }
//   }
//   return total / (light.uSteps * light.vSteps);
// };

const getFresnelReflectance = ({
  normal,
  incidentRay,
  refractionIndex
}: {
  normal: Vector;
  incidentRay: Vector;
  refractionIndex: number;
}) => {
  const cosTheta = Math.max(0, normal.dotProduct(incidentRay));
  const r0 = Math.pow((1 - refractionIndex) / (1 + refractionIndex), 2);
  return Math.max(0, r0 + (1 - r0) * Math.pow(1 - cosTheta, 5));
};

const getReflectedRay = function ({
  normal,
  point,
  incidentRay
}: {
  normal: Vector;
  point: Point;
  incidentRay: Vector;
}) {
  const a = 2 * dotProduct(incidentRay, normal);

  const b = normal.multiply(a);

  return new Ray(point, subtract(incidentRay, b));
};

const getRefractedRay = ({
  normal,
  point,
  incidentRay,
  refractionIndex
}: {
  normal: Vector;
  point: Point;
  incidentRay: Vector;
  refractionIndex: number;
}) => {
  let n = refractionIndex;
  let cosThetaI = normal.dotProduct(incidentRay);
  if (cosThetaI < 0) {
    n = 1 / refractionIndex;
  } else {
  }
  const sin2ThetaI = Math.max(0, 1 - cosThetaI * cosThetaI);
  const sin2ThetaT = n * n * sin2ThetaI;
  if (sin2ThetaI >= 1) {
    return null;
  }
  const cosThetaT = Math.sqrt(1 - sin2ThetaT);

  const refractedRay = incidentRay
    .multiply(-1 * n)
    .add(normal.multiply(n * cosThetaI - cosThetaT));

  return new Ray(point, refractedRay);
};

const getCosineWeightedSample = (normal: Vector) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.sin(phi) * Math.sin(theta);
  const z = Math.cos(phi);

  const randomDirection = new Vector(x, y, z);

  const rotationMatrix = getRotationMatrixAlignedToVector(normal);

  const rotatedRandomDirection = randomDirection.multiplyWith3x3Matrix(
    rotationMatrix
  ) as Vector;

  return rotatedRandomDirection;
};

const castRay = ({
  ray,
  sceneObjects,
  i,
  j
}: {
  ray: Ray;
  sceneObjects: SceneObject[];
  i?: number;
  j?: number;
}) => {
  const closestIntersection = findClosestIntersection({
    origin: ray.start,
    dir: ray.dir,
    tMin: epsilon,
    tMax: Infinity,
    sceneObjects,
    i,
    j
  });
  return closestIntersection;
};

const getColorFromImageMap = ({
  object,
  imageMap,
  point
}: {
  object: Shape;
  imageMap: ImageData;
  point: Point;
}) => {
  if (object?.type !== "sphere") {
    return new Color(0, 0, 0);
  }
  // center of sphere as a vector
  const center = new Vector(object.center.x, object.center.y, object.center.z);

  // point on sphere as a vector
  const pointOnSphere = new Vector(point.x, point.y, point.z);

  // vector from center of sphere to point on sphere
  const pointAroundCenter = subtract(pointOnSphere, center);

  // scale the point to the unit sphere
  const scaledPointAroundCenter = new Point(
    Math.min(1, pointAroundCenter.x / object.radius),
    Math.min(1, pointAroundCenter.y / object.radius),
    Math.min(1, pointAroundCenter.z / object.radius)
  );

  // find the latitude and longitude of the point
  const theta = Math.acos(scaledPointAroundCenter.y);
  const phi =
    Math.atan2(scaledPointAroundCenter.z, scaledPointAroundCenter.x) + Math.PI;

  // find the pixel coordinates of the texture map
  const u = Math.floor((phi / (2 * Math.PI)) * imageMap.width);
  const v = Math.floor((theta / Math.PI) * imageMap.height);

  // get the pixel color from the texture map
  const index = (u + v * imageMap.width) * 4;
  const r = imageMap.data[index] / 255;
  const g = imageMap.data[index + 1] / 255;
  const b = imageMap.data[index + 2] / 255;

  return new Color(r, g, b);
};

const traceRay = ({
  ray,
  imageMaps,
  bounceDepth = 0,
  i,
  j,
  k
}: {
  ray: Ray;
  imageMaps: { [key: string]: ImageData };
  bounceDepth?: number;
  i?: number;
  j?: number;
  k?: number;
}): Color => {
  let color = new Color(0, 0, 0);
  const maxBounceDepth = 1;

  if (bounceDepth > maxBounceDepth) {
    return color;
  }

  let intersected = castRay({ ray, sceneObjects, i, j });

  let normal: Vector;
  if (intersected?.object) {
    if (typeof intersected?.object.normal === "function") {
      normal = intersected?.object.normal(intersected?.point);
    } else {
      normal = intersected?.object?.normal;
    }

    let albedo: Color;

    if (!normal) {
      throw new Error("No normal found");
    }

    if ((intersected?.object as Primitive).material?.imageMap) {
      albedo = getColorFromImageMap({
        imageMap:
          imageMaps[(intersected.object as Primitive).material.imageMap!],
        point: intersected.point,
        object: intersected.object
      });
    } else if ((intersected?.object as Primitive).material?.texture) {
      albedo =
        (intersected?.object as Primitive)?.material?.texture?.(intersected) ||
        new Color(0, 0, 0);
    } else {
      albedo =
        (intersected?.object as Primitive)?.material?.albedo ||
        new Color(1, 1, 1);
    }

    const emissive =
      (intersected?.object as Primitive)?.material?.emissive ||
      (intersected?.object as AreaLight).color;

    if (emissive) {
      color = color.addWithColor(emissive);
      if ((intersected?.object as AreaLight)?.intensity) {
        color = color.multiply((intersected?.object as AreaLight)?.intensity);
      }
      return color;
    }

    const reflectance =
      (intersected?.object as Primitive)?.material?.reflectivity || 0;

    const refractionIndex =
      (intersected?.object as Primitive)?.material?.refractionIndex || 0;

    // direct lighting
    for (i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (light.position) {
        const lightDirection = new Vector(
          light.position.subtract(intersected.point).x,
          light.position.subtract(intersected.point).y,
          light.position.subtract(intersected.point).z
        ).normalize();

        const cosTheta = Math.max(
          0,
          dotProduct(lightDirection, normal.normalize())
        );

        const brdf = albedo.divide(Math.PI);

        if (!(intersected.object as Primitive).material?.refractionIndex) {
          color = color.multiplyWithColor(
            light.color.multiply(light.intensity)
          );

          color = color.addWithColor(brdf.multiply(cosTheta));
        }
      }
      if (!(intersected.object as Primitive).material?.refractionIndex) {
        if (light.type === "ambient") {
          color = color.addWithColor(light.color.multiply(light.intensity));
        }
      }
    }

    const biasedNormal = normal.multiply(epsilon).toPoint();
    const shiftedPoint = intersected.point.add(biasedNormal);

    // reflection
    if (reflectance > 0) {
      if (intersected.object.type === "triangle") {
        // get barycentric coordinates
        const UVW = intersected.object.getUVW(intersected.point);
        if (UVW) {
          const { u, v, w } = UVW;
          // get the normal at the point of intersection
          normal = intersected.object.normalAtPoint({ u, v, w });
        }
      }

      const reflectedRay = getReflectedRay({
        normal,
        point: shiftedPoint,
        incidentRay: ray.dir.normalize()
      });

      const fresnelReflectance = getFresnelReflectance({
        normal,
        incidentRay: reflectedRay.dir,
        refractionIndex: refractionIndex
      });

      const reflectedColor = traceRay({
        ray: reflectedRay,
        imageMaps,
        bounceDepth: bounceDepth + 1,
        i,
        j,
        k
      });

      color = color.addWithColor(
        reflectedColor.multiply(reflectance * fresnelReflectance)
      );
    }

    // refraction
    if (refractionIndex > 0) {
      const refractedRay = getRefractedRay({
        normal: normal.normalize(),
        point: intersected.point,
        incidentRay: ray.dir.normalize(),
        refractionIndex
      });

      if (!refractedRay) {
        return color;
      }

      const refractedColor = traceRay({
        ray: refractedRay,
        imageMaps,
        bounceDepth: bounceDepth + 1,
        i,
        j,
        k
      });

      color = color.addWithColor(refractedColor);
    }

    // russian roulette
    const random = Math.random();
    const russianRouletteProbability = 0.2;
    if (random >= russianRouletteProbability) {
      return color;
    }

    // soft shadows
    const filteredLights = lights.filter((light) => light.type !== "ambient");
    const randomLight =
      filteredLights[Math.floor(Math.random() * filteredLights.length)];
    if (!randomLight.position) {
      return color;
    }
    let softIntensity = 0;
    if (randomLight.type === "areaLight") {
      for (let v = 0; v < randomLight.vSteps; v++) {
        for (let u = 0; u < randomLight.uSteps; u++) {
          const pointOnLight = randomLight.pointOnLight(u, v);
          const lightDirection = new Vector(
            pointOnLight.x - shiftedPoint.x,
            pointOnLight.y - shiftedPoint.y,
            pointOnLight.z - shiftedPoint.z
          );

          if (
            !isShadowed({
              lightDirection,
              sceneObjects,
              origin: shiftedPoint
            })
          ) {
            softIntensity += 1;
          }
        }
      }
      color = color.multiply(
        softIntensity / (randomLight.uSteps * randomLight.vSteps)
      );
    }

    // // indirect lighting
    let indirectColor = new Color(0, 0, 0);
    const randomDirection = getCosineWeightedSample(normal);
    const cosTheta = Math.max(0, randomDirection.dotProduct(normal));

    const randomRay = new Ray(shiftedPoint, randomDirection);
    indirectColor = indirectColor.addWithColor(
      traceRay({
        ray: randomRay,
        imageMaps,
        i,
        j,
        k
      })
        .multiply(cosTheta)
        .multiply(1 / russianRouletteProbability)
    );

    color = color.addWithColor(indirectColor);
  }
  return color;
};

onmessage = (e: MessageEvent) => {
  const { iStart, iEnd, jStart, jEnd, width, imageMaps } = e.data;

  const samplesPerPixel = 100;

  const pixelColors: {
    i: number;
    j: number;
    pixelColor: { r: number; g: number; b: number };
  }[] = [];
  let pixelColor = new Color(0, 0, 0);

  for (var i = iStart; i < iEnd; i++) {
    for (var j = jStart; j < jEnd; j++) {
      const xStart = (j - width / 2) / width;
      const yStart = (width / 2 - i) / width;
      const dir = new Vector(xStart, yStart, 1);
      const rotatedDir = rotateCamera(dir);

      for (let k = 0; k <= samplesPerPixel; k++) {
        const color = traceRay({
          ray: new Ray(cameraStart, rotatedDir),
          i,
          j,
          imageMaps,
          k
        });

        pixelColor = pixelColor.addWithColor(color);
      }
      pixelColor = pixelColor.divide(samplesPerPixel);

      pixelColor = pixelColor.clamp();

      pixelColors.push({ i, j, pixelColor });
    }
  }

  postMessage({ pixelColors });
};
