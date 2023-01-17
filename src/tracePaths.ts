import { Color } from "./Color.js";
import { Ray } from "./Ray.js";
import { Vector } from "./Vector.js";
import { Intersected, Intersection, SceneObjects, Shape } from "./types.js";
import {
  distance,
  subtract,
  dotProduct,
  getGlossyRay,
  getHemisphereRay
} from "./utils.js";
import { epsilon } from "./const.js";
import { AreaLight, Light } from "./Light.js";
// import {
//   cameraStart,
//   lights,
//   rotateCamera,
//   sceneObjects
// } from "./scenes/cornell.js";
import {
  cameraStart,
  lights,
  rotateCamera,
  sceneObjects
} from "./scenes/caustics.js";
// import {
//   cameraStart,
//   lights,
//   rotateCamera,
//   sceneObjects
// } from "./scenes/default.js";
import { Point } from "./Point.js";

export function intersection({
  origin,
  dir,
  tMin,
  tMax,
  findClosest = true,
  sceneObjects
}: {
  origin: Point;
  dir: Vector;
  tMin: number;
  tMax: number;
  findClosest?: boolean;
  sceneObjects: SceneObjects;
  i?: number;
  j?: number;
}) {
  let point: Point;
  let intersected = null;
  let dist = Infinity;
  let closestIntersection = Infinity;

  for (var k = 0; k < sceneObjects.length; k++) {
    const intersection = sceneObjects[k].intersection(new Ray(origin, dir));

    if (intersection) {
      const { t, inside } = intersection;
      point = new Ray(origin, dir).getPoint(t);

      if (t > tMin && t < tMax) {
        if (!findClosest) {
          return { point, object: sceneObjects[k] };
        }

        dist = distance(point, origin);

        if (dist < closestIntersection) {
          closestIntersection = dist;
          intersected = { point, object: sceneObjects[k], inside };
        }
      }
    }
  }

  return intersected;
}

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

const isShadowed = function ({
  lightPosition,
  origin,
  sceneObjects
}: {
  lightPosition: Point;
  origin: Point;
  sceneObjects: SceneObjects;
}) {
  const L = new Vector(
    lightPosition.x - origin.x,
    lightPosition.y - origin.y,
    lightPosition.z - origin.z
  );

  return intersection({
    origin: origin,
    dir: L,
    tMin: epsilon,
    tMax: 1,
    findClosest: false,
    sceneObjects
  });
};

const intensityAt = (
  light: AreaLight,
  point: Point,
  sceneObjects: SceneObjects
) => {
  let total = 0;
  for (let v = 0; v <= light.vSteps - 1; v++) {
    for (let u = 0; u <= light.uSteps - 1; u++) {
      const lightPosition = light.pointOnLight(u, v);

      if (
        !isShadowed({
          origin: point,
          lightPosition,
          sceneObjects
        })
      ) {
        total += 1;
      }
    }
  }

  return total / light.samples;
};

const computeIntensity = function ({
  point,
  object,
  inside,
  sceneObjects,
  ray
}: {
  point: Point;
  object: Shape;
  inside?: boolean;
  ray: Ray;
  sceneObjects: SceneObjects;
  i?: number;
  j?: number;
}) {
  let intensity = 0;

  for (let k = 0; k <= lights.length - 1; k++) {
    const light = lights[k];

    let normal;

    if (object?.type === "sphere") {
      normal = object.normal(point);
      if (inside) {
        normal = normal.multiply(-1);
      }
    } else if (object.type === "plane" || object.type === "rectangle") {
      normal = object.normal;
    }

    if (!normal) {
      throw new Error("normal is undefined");
    }

    if (light.type === "ambient") {
      intensity += light.intensity;
    } else if (light.type === "directional") {
      const dot = light.dir?.negative().dotProduct(normal.normalize());
      intensity += light.intensity * dot;
    } else if (light.type === "areaLight") {
      // const shadowBiasVector = normal?.multiply(0.01);
      // const shadowBiasPoint = new Point(
      //   shadowBiasVector.x,
      //   shadowBiasVector.y,
      //   shadowBiasVector.z
      // );
      // const shiftedPoint = new Point(point.x, point.y, point.z).add(
      //   shadowBiasPoint
      // );

      // const softIntensity = intensityAt(light, shiftedPoint, sceneObjects);

      // intensity *= softIntensity + 0.4;

      const lightVector = new Vector(
        light.position.subtract(point).x,
        light.position.subtract(point).y,
        light.position.subtract(point).z
      ).normalize();

      const dot = lightVector?.dotProduct(normal.normalize());

      if (dot && dot > 0) {
        intensity += light.intensity * dot;
      }

      if (object.material.specular) {
        intensity += computeSpecularComponent({
          lightVector,
          light,
          normal,
          specular: object.material.specular,
          point,
          ray
        });
      }
    }
  }

  return intensity;
};

const computeColor = function ({
  intersected,
  intensity,
  imageMap
}: {
  intersected: Intersected;
  intensity: number;
  imageMap?: ImageData;
}) {
  let pixelColor = new Color(0, 0, 0);
  const point = intersected?.point;
  const object = intersected?.object as Shape;
  if (object?.material?.texture && point) {
    // @ts-ignore
    pixelColor = object?.material
      .texture?.(point.x, point.z)
      ?.multiply(intensity);
  } else if (
    object?.type === "sphere" &&
    object?.name === "skyBall" &&
    imageMap &&
    point
  ) {
    const radius = object.radius;
    // scale the point on a sphere with radius 9 to a point on a sphere with radius 1
    const scaledPoint = new Point(
      point.x / radius,
      point.y / radius,
      point.z / radius
    );

    // find the latitude and longitude of the point
    const theta = Math.acos(scaledPoint.y);
    const phi = Math.atan2(scaledPoint.z, scaledPoint.x) + Math.PI;

    // find the pixel coordinates of the texture map
    const u = Math.floor((phi / (2 * Math.PI)) * imageMap.width);
    const v = Math.floor((theta / Math.PI) * imageMap.height);

    // get the pixel color from the texture map
    const index = (u + v * imageMap.width) * 4;
    const r = imageMap.data[index];
    const g = imageMap.data[index + 1];
    const b = imageMap.data[index + 2];

    pixelColor = new Color(r, g, b).multiply(intensity);
  } else if (intersected?.object?.material.albedo) {
    pixelColor = intersected.object.material.albedo
      .divide(Math.PI)
      .multiply(intensity);
  }
  return pixelColor;
};

const computeSpecularComponent = ({
  normal,
  lightVector,
  light,
  specular,
  point,
  ray
}: {
  normal: Vector;
  lightVector: Vector;
  light: Light;
  specular: number;
  point: Point;
  ray: Ray;
}) => {
  let intensity = 0;
  const reflectedRay = getReflectedRay({
    normal,
    point,
    incidentRay: lightVector
  });
  const dot = dotProduct(reflectedRay.dir, ray.dir);
  if (dot > 0) {
    intensity +=
      light.intensity *
      Math.pow(dot / (reflectedRay.dir.length() * ray.dir.length()), specular);
  }
  return intensity;
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

const getFresnelReflectance = ({
  normal,
  incidentRay,
  refractionIndex
}: {
  normal: Vector;
  incidentRay: Vector;
  refractionIndex: number;
}) => {
  // computes Shlick's approximation
  const cosTheta = Math.max(0, normal.dotProduct(incidentRay));
  const r0 = Math.pow((1 - refractionIndex) / (1 + refractionIndex), 2);
  return r0 + (1 - r0) * Math.pow(1 - cosTheta, 5);
};

export function traceRay({
  ray,
  i,
  j,
  bounceDepth = 1,
  imageMap
}: {
  ray: Ray;
  i?: number;
  j?: number;
  bounceDepth?: number;
  imageMap?: ImageData;
}): Color {
  const maxBounceDepth = 5;
  const pathsPerPixel = 3;

  let intersected, normal, reflectedRay;

  intersected = intersection({
    origin: ray.start,
    dir: ray.dir,
    tMin: epsilon,
    tMax: Infinity,
    i,
    j,
    sceneObjects
  });

  // if (i === 500 && j === 500) {
  //   debugger;
  // }

  if (!intersected) {
    return new Color(0, 0, 0);
  }

  if (intersected.object.type === "areaLight") {
    return intersected?.object?.material?.albedo || new Color(0, 0, 0);
  }

  if (intersected?.object?.type === "sphere") {
    normal = intersected?.object.normal(intersected?.point);
    if (intersected?.object?.name === "skyBall") {
      normal = normal.negative();
    }
  } else {
    normal = intersected?.object?.normal;
  }

  if (!normal) {
    throw new Error("no normal found");
  }

  let intensity = computeIntensity({
    point: intersected?.point,
    object: intersected.object,
    inside: intersected.inside,
    ray,
    i,
    j,
    sceneObjects
  });

  let pixelColor = computeColor({
    intersected,
    intensity,
    imageMap
  });

  if (bounceDepth > maxBounceDepth) {
    return pixelColor;
  }

  let reflectedColor: Color = new Color(0, 0, 0);
  if (intersected?.object?.material?.reflectivity) {
    const biasedNormal = normal?.multiply(epsilon);
    const biasedPoint = new Point(
      biasedNormal.x,
      biasedNormal.y,
      biasedNormal.z
    );
    const shiftedPoint = new Point(
      intersected?.point.x,
      intersected?.point.y,
      intersected?.point.z
    ).add(biasedPoint);

    reflectedRay = getReflectedRay({
      normal: normal as Vector,
      point: shiftedPoint,
      incidentRay: ray.dir
    });

    const fresnelReflectance = getFresnelReflectance({
      normal,
      incidentRay: reflectedRay.dir,
      refractionIndex: intersected.object.material.refractionIndex || 1
    });

    // @ts-ignore
    if (intersected.object.material.glossiness) {
      for (let i = 0; i < pathsPerPixel; i++) {
        const hemisphereRay = getGlossyRay({
          normal,
          point: intersected.point,
          incidentRay: reflectedRay.dir,
          // @ts-ignore
          glossiness: intersected.object.material.glossiness
        });

        const color = traceRay({
          ray: hemisphereRay,
          bounceDepth: bounceDepth + 1,
          i,
          j,
          imageMap
        });

        reflectedColor = reflectedColor.add(color);
      }
      reflectedColor = reflectedColor.multiply(1 / pathsPerPixel);
    } else {
      reflectedColor = traceRay({
        ray: reflectedRay,
        bounceDepth: bounceDepth + 1,
        i,
        j,
        imageMap
      });
    }

    pixelColor = pixelColor.add(
      reflectedColor.multiply(Math.max(0, fresnelReflectance))
    );
  }

  if (intersected?.object.material?.refractionIndex) {
    let refractionColor: Color;

    const refractionRay = getRefractedRay({
      normal: normal.normalize(),
      point: intersected.point,
      incidentRay: ray.dir.normalize(),
      refractionIndex: intersected.object.material?.refractionIndex
    });

    if (!refractionRay) {
      return pixelColor;
    }

    refractionColor = traceRay({
      ray: refractionRay,
      bounceDepth: bounceDepth + 1,
      imageMap
    });

    pixelColor = pixelColor.add(refractionColor);
  }

  const getRandomDirection = (normal: Vector) => {
    const u = Math.random();
    const v = Math.random();
    const sinTheta = Math.sqrt(1 - u * u);
    const phi = 2 * Math.PI * v;
    const x = sinTheta * Math.acos(phi);
    const z = sinTheta * Math.asin(phi);
    const randomDirection = new Vector(x, v, z);
    const cosTheta = randomDirection.normalize().dotProduct(normal);
    return { randomDirection, cosTheta };
  };

  let bounceColor = new Color(0, 0, 0);
  for (let i = 0; i <= pathsPerPixel; i++) {
    const { randomDirection } = getRandomDirection(normal.normalize());
    const biasedNormal = normal?.multiply(epsilon);
    const biasedPoint = new Point(
      biasedNormal.x,
      biasedNormal.y,
      biasedNormal.z
    );
    const shiftedPoint = new Point(
      intersected?.point.x,
      intersected?.point.y,
      intersected?.point.z
    ).add(biasedPoint);

    // const hemisphereRay = getHemisphereRay({
    //   point: shiftedPoint
    // });

    const randomRay = new Ray(shiftedPoint, randomDirection);

    const randomColor = traceRay({
      ray: randomRay,
      bounceDepth: bounceDepth + 1
    });
    bounceColor = bounceColor.add(randomColor);
  }
  bounceColor = bounceColor.divide(pathsPerPixel);
  pixelColor = pixelColor.add(bounceColor);

  return new Color(
    Math.min(pixelColor.r, 255),
    Math.min(pixelColor.g, 255),
    Math.min(pixelColor.b, 255)
  );
}

onmessage = (e: MessageEvent) => {
  const { iStart, iEnd, jStart, jEnd, width, imageMap } = e.data;

  const samplesPerPixel = 10;

  const pixelColors = [];
  let pixelColor = new Color(0, 0, 0);

  const jitteredSample = (dir: Vector, radius: number) => {
    const randomX = Math.random() * radius;
    const randomY = Math.random() * radius;
    const randomZ = Math.random() * radius;
    const randomDir = new Vector(randomX, randomY, randomZ);
    return dir.add(randomDir);
  };

  for (var i = iStart; i < iEnd; i++) {
    for (var j = jStart; j < jEnd; j++) {
      const xStart = (j - width / 2) / width;
      const yStart = (width / 2 - i) / width;
      const dir = new Vector(xStart, yStart, 1);

      for (let k = 0; k < samplesPerPixel; k++) {
        const rotatedDir = rotateCamera(dir);

        const jitteredDir = jitteredSample(rotatedDir, 0.001);

        const jitteredPixelColor = traceRay({
          ray: new Ray(cameraStart, jitteredDir),
          i,
          j,
          imageMap
        });

        pixelColor = pixelColor.add(jitteredPixelColor);
      }
      pixelColor = pixelColor.divide(samplesPerPixel);

      pixelColors.push({ i, j, pixelColor });
    }
  }

  postMessage({ pixelColors });
};