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
import { distance, subtract, dotProduct } from "./utils.js";
import { epsilon } from "./const.js";
import { Point } from "./Point.js";
import { Mesh } from "./Mesh.js";
import { Sphere } from "./Sphere.js";
import { Triangle } from "./Triangle.js";
import { intersectBVH } from "./BVH.js";

// Scene state — populated dynamically in onmessage before rendering begins.
/* eslint-disable prefer-const */
let sceneObjects: SceneObject[] = [];
let cameraStart!: Point;
let rotateCamera!: (dir: Vector) => Vector;
/* eslint-enable prefer-const */

async function importScene(name: string): Promise<{
  cameraStart: Point;
  rotateCamera: (dir: Vector) => Vector;
  sceneObjects: SceneObject[];
}> {
  if (name === "cornellBox")         return import("./scenes/cornellBox.js");
  if (name === "globalIllumination") return import("./scenes/globalIllumination.js");
  if (name === "furnaceTest")        return import("./scenes/furnaceTest.js");
  if (name === "teapot")             return import("./scenes/teapot.js");
  if (name === "refraction")         return import("./scenes/refraction.js");
  if (name === "metalBunny")         return import("./scenes/metalBunny.js");
  if (name === "backrooms")          return import("./scenes/backrooms.js");
  return import("./scenes/cornellBoxMeshes.js");
}

export function findClosestIntersection({
  ray,
  tMin,
  tMax,
  findClosest = true,
  sceneObjects,
  i,
  j
}: {
  ray: Ray;
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

  // BVH-accelerated mesh intersection: O(log n) per ray instead of O(n)
  for (let k = 0; k < meshObjects.length; k++) {
    const meshObject = meshObjects[k] as Mesh;

    if (meshObject.bvh) {
      const hit = intersectBVH(meshObject.bvh, ray, tMin, tMax, !findClosest);
      if (hit) {
        point = ray.getPoint(hit.t);
        if (!findClosest) return { point, object: hit.tri };
        dist = distance(point, ray.start);
        if (dist < closestIntersection) {
          closestIntersection = dist;
          tMax = hit.t; // shrink window so later meshes get a tighter bound
          intersected = { point, object: hit.tri, intersection: { t: hit.t } };
        }
      }
    } else {
      // Fallback for meshes with no triangles (e.g. quad-only meshes)
      for (let j = 0; j < meshObject.meshObjects.length; j++) {
        const object = meshObject.meshObjects[j];
        intersection = object.intersection(ray);
        if (intersection) {
          const { t } = intersection;
          point = ray.getPoint(t);
          if (t > tMin && t < tMax) {
            if (!findClosest) return { point, object };
            dist = distance(point, ray.start);
            if (dist < closestIntersection) {
              closestIntersection = dist;
              intersected = { point, object, intersection };
            }
          }
        }
      }
    }
  }

  let objects = sceneObjects.filter((object) => object.type !== "mesh");
  for (let k = 0; k < objects.length; k++) {
    const object = objects[k] as Primitive;

    intersection = object.intersection(ray);

    if (intersection) {
      const { t } = intersection;
      point = ray.getPoint(t);

      if (t > tMin && t < tMax) {
        if (!findClosest) {
          return { point, object };
        }

        dist = distance(point, ray.start);

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

const getFresnelReflectance = ({
  normal,
  incidentRay,
  refractionIndex
}: {
  normal: Vector;
  incidentRay: Vector;
  refractionIndex: number;
}) => {
  const cosTheta = Math.abs(normal.dotProduct(incidentRay));
  const r0 = Math.pow((1 - refractionIndex) / (1 + refractionIndex), 2);
  return r0 + (1 - r0) * Math.pow(1 - cosTheta, 5);
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
  const cosThetaI = normal.dotProduct(incidentRay);
  const entering = cosThetaI < 0;
  // n = n_incident / n_transmitted
  const n = entering ? (1 / refractionIndex) : refractionIndex;
  // Orient normal toward the incident medium so the formula is uniform
  const orientedNormal = entering ? normal : normal.multiply(-1);
  const cosTheta = Math.abs(cosThetaI);

  const sin2ThetaT = n * n * (1 - cosTheta * cosTheta);
  if (sin2ThetaT >= 1) return null; // total internal reflection

  const cosThetaT = Math.sqrt(1 - sin2ThetaT);
  // ωt = n·ωi + (n·cosθi − cosθt)·n̂  (n̂ points into incident medium)
  const refractedDir = incidentRay.multiply(n)
    .add(orientedNormal.multiply(n * cosTheta - cosThetaT));

  return new Ray(point, refractedDir);
};

// Proper sphere-light NEE: uniform cone sampling with solid-angle estimator.
// MC estimator for one sample:  (albedo/π) × L_e × cos(θ) × solidAngle
// Expected value = true direct-lighting integral (unbiased).
const sampleSphereLight = (
  lightCenter: Point,
  lightRadius: number,
  surfacePoint: Point
): { dir: Vector; solidAngle: number } | null => {
  const toLight = lightCenter.subtract(surfacePoint).toVector();
  const dist = toLight.length();
  if (dist <= lightRadius) return null;

  const sinMax = lightRadius / dist;
  const cosMax = Math.sqrt(1 - sinMax * sinMax);
  const solidAngle = 2 * Math.PI * (1 - cosMax);

  const u = Math.random(), v = Math.random();
  const cosT = 1 - u * (1 - cosMax);
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  const phi = 2 * Math.PI * v;

  const z = toLight.normalize();
  const up = Math.abs(z.y) < 0.999 ? new Vector(0, 1, 0) : new Vector(1, 0, 0);
  const x = up.crossProduct(z).normalize();
  const y = z.crossProduct(x);

  const dir = x.multiply(sinT * Math.cos(phi))
    .add(y.multiply(sinT * Math.sin(phi)))
    .add(z.multiply(cosT))
    .normalize();

  return { dir, solidAngle };
};

// ─── Disney-style metallic BRDF (Cook-Torrance GGX) ─────────────────────────

// GGX NDF: D(h) = α² / (π * ((n·h)²(α²-1)+1)²)
const ggxD = (nDotH: number, alpha2: number): number => {
  const d = nDotH * nDotH * (alpha2 - 1) + 1;
  return alpha2 / (Math.PI * d * d);
};

// Smith G1 masking term for GGX
const smithG1 = (nDotV: number, alpha2: number): number => {
  return 2 * nDotV / (nDotV + Math.sqrt(alpha2 + (1 - alpha2) * nDotV * nDotV));
};

// Sample a microfacet half-vector from the GGX distribution.
// Returns h in world space.
const sampleGGX = (normal: Vector, alpha2: number): Vector => {
  const u1 = Math.random();
  const u2 = Math.random();
  // Spherical coords of h in local frame (n is up)
  const cosTheta = Math.sqrt((1 - u1) / (1 + (alpha2 - 1) * u1));
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = 2 * Math.PI * u2;
  // Build ONB around normal
  const up = Math.abs(normal.y) < 0.999 ? new Vector(0, 1, 0) : new Vector(1, 0, 0);
  const tangent = up.crossProduct(normal).normalize();
  const bitangent = normal.crossProduct(tangent);
  return tangent.multiply(sinTheta * Math.cos(phi))
    .add(bitangent.multiply(sinTheta * Math.sin(phi)))
    .add(normal.multiply(cosTheta))
    .normalize();
};

const getCosineWeightedSample = (normal: Vector) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;

  // Malley's method: project a uniform disk sample onto the hemisphere.
  // PDF = cos(θ)/π, giving efficient cosine-weighted sampling.
  const r = Math.sqrt(v);
  const localX = r * Math.cos(theta);
  const localY = r * Math.sin(theta);
  const localZ = Math.sqrt(1 - v); // z ≥ 0 → upper hemisphere only

  // Build an orthonormal basis (tangent, bitangent, normal) via Gram-Schmidt.
  const up = Math.abs(normal.y) < 0.999 ? new Vector(0, 1, 0) : new Vector(1, 0, 0);
  const tangent = up.crossProduct(normal).normalize();
  const bitangent = normal.crossProduct(tangent);

  return tangent.multiply(localX)
    .add(bitangent.multiply(localY))
    .add(normal.multiply(localZ));
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
    ray,
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
  includeEmission = true,
  i,
  j,
  k
}: {
  ray: Ray;
  imageMaps: { [key: string]: ImageData };
  bounceDepth?: number;
  includeEmission?: boolean;
  i?: number;
  j?: number;
  k?: number;
}): Color => {
  let radiance = new Color(0, 0, 0);
  const maxBounceDepth = 4;

  if (bounceDepth > maxBounceDepth) {
    return new Color(0, 0, 0);
  }

  let intersected = castRay({ ray, sceneObjects, i, j });

  let normal: Vector;
  if (intersected?.object) {
    if (intersected.object.type === "triangle") {
      // get barycentric coordinates
      const UVW = intersected.object.getUVW(intersected.point);
      const { u, v, w } = UVW;
      // get the normal at the point of intersection
      normal = intersected.object.normalAtPoint({ u, v, w });
    } else if (typeof intersected?.object.normal === "function") {
      normal = intersected?.object.normal(intersected?.point);
    } else {
      normal = intersected?.object?.normal;
    }

    if (!normal) {
      throw new Error("No normal found");
    }

    const emission = intersected?.object?.material?.emissive;

    // Only count emissive surfaces for camera rays or specular bounces.
    // Diffuse bounces use NEE for direct lighting, so suppress emissive
    // hits to avoid double-counting the same light contribution.
    if (emission) {
      return includeEmission ? emission : new Color(0, 0, 0);
    }

    const material = (intersected.object as Primitive).material;

    // Metallic: Cook-Torrance GGX specular BRDF with importance sampling.
    // F0 = albedo (metals reflect their own colour), no diffuse component.
    if ((material.metallic ?? 0) > 0) {
      const roughness = Math.max(0.01, material.roughness ?? 0.3);
      const alpha2 = roughness * roughness * roughness * roughness; // α = roughness², α² = roughness⁴
      const ωo = ray.dir.multiply(-1).normalize();          // view direction (outgoing)
      const nDotO = Math.max(0, normal.dotProduct(ωo));
      if (nDotO <= 0) return new Color(0, 0, 0);

      const h = sampleGGX(normal, alpha2);
      const oDotH = Math.max(0, ωo.dotProduct(h));

      // Reflect ωo about h to get the incoming light direction ωi
      const ωi = h.multiply(2 * ωo.dotProduct(h)).subtract(ωo).normalize();
      const nDotI = Math.max(0, normal.dotProduct(ωi));
      if (nDotI <= 0) return new Color(0, 0, 0); // below surface

      const nDotH = Math.max(0, normal.dotProduct(h));

      // Schlick Fresnel: F0 = albedo for metals
      const f0 = material.albedo;
      const fresnel = f0.addWithColor(
        new Color(1, 1, 1).subtract(f0).multiply(Math.pow(1 - oDotH, 5))
      );

      // Smith G2 (separable form)
      const G = smithG1(nDotO, alpha2) * smithG1(nDotI, alpha2);

      // GGX importance-sampled weight: F * G * (ωo·h) / ((n·ωo) * (n·h))
      // (D cancels with the PDF D*(n·h)/(4*(ωo·h)))
      const weight = (G * oDotH) / (nDotO * nDotH);
      const Li = traceRay({
        ray: new Ray(intersected.point.add(normal.multiply(epsilon).toPoint()), ωi),
        imageMaps, bounceDepth: bounceDepth + 1, includeEmission: true, i, j, k
      });
      return fresnel.multiply(weight).multiplyWithColor(Li);
    }

    // Dielectric (glass): Fresnel-weighted Russian roulette between reflection and refraction.
    // Skip diffuse bounce and NEE — this is a purely specular path.
    if ((material.refractionIndex ?? 0) > 0) {
      const fresnel = getFresnelReflectance({
        normal,
        incidentRay: ray.dir,
        refractionIndex: material.refractionIndex!
      });
      const reflected = getReflectedRay({ normal, point: intersected.point, incidentRay: ray.dir });
      if (Math.random() < fresnel) {
        return traceRay({ ray: reflected, imageMaps, bounceDepth: bounceDepth + 1, includeEmission: true, i, j, k });
      }
      const refracted = getRefractedRay({ normal, point: intersected.point, incidentRay: ray.dir, refractionIndex: material.refractionIndex! });
      // TIR fallback: reflect if refraction is geometrically impossible
      return traceRay({ ray: refracted ?? reflected, imageMaps, bounceDepth: bounceDepth + 1, includeEmission: true, i, j, k });
    }

    let color = material.albedo;

    // Single path sample per bounce (proper Monte Carlo path tracing).
    // With cosine-weighted sampling, PDF = cos(θ)/π and BRDF = albedo/π,
    // so the weight simplifies to just albedo.
    const randomDirection = getCosineWeightedSample(normal);
    const throughputWeight = color;
    const shiftedPoint = intersected.point.add(
      normal.multiply(epsilon).toPoint()
    );

    // Diffuse bounce: suppress emissive hits since NEE covers direct lighting.
    radiance = radiance.addWithColor(
      throughputWeight.multiplyWithColor(
        traceRay({
          ray: new Ray(shiftedPoint, randomDirection),
          imageMaps,
          bounceDepth: bounceDepth + 1,
          includeEmission: false,
          i,
          j,
          k
        })
      )
    );

    // Next-event estimation: sphere light or mesh area light.
    const lightSphere = sceneObjects.find((o) => o.name === "lightBall") as Sphere | undefined;

    if (lightSphere) {
      // Sphere-light NEE: uniform cone sampling, solid-angle estimator.
      const sample = sampleSphereLight(lightSphere.center, lightSphere.radius, intersected.point);
      if (sample) {
        const { dir: lightDir, solidAngle } = sample;
        const cosTheta = Math.max(0, normal.dotProduct(lightDir));
        if (cosTheta > 0) {
          const shadowHit = castRay({ ray: new Ray(intersected.point, lightDir), sceneObjects, i, j });
          if (shadowHit?.object?.name === "lightBall") {
            const emission = lightSphere.material.emissive ?? new Color(0, 0, 0);
            const weight = cosTheta * solidAngle / Math.PI;
            radiance = radiance.addWithColor(color.multiply(weight).multiplyWithColor(emission));
          }
        }
      }
    } else {
      // Area-light NEE: sample a random point on any emissive mesh triangle.
      // Estimator: albedo/π × L_e × cosTheta_surface × cosTheta_light × totalArea / dist²
      type EmissiveTri = { tri: Triangle; emission: Color; area: number };
      const emissiveTris: EmissiveTri[] = [];
      for (const obj of sceneObjects) {
        if (obj.type === "mesh") {
          const mesh = obj as Mesh;
          const emissive = mesh.material?.emissive;
          if (emissive && (emissive.r > 0 || emissive.g > 0 || emissive.b > 0)) {
            for (const prim of mesh.meshObjects) {
              if (prim.type === "triangle") {
                const tri = prim as Triangle;
                const edge1 = tri.v2.subtract(tri.v1);
                const edge2 = tri.v3.subtract(tri.v1);
                const area = 0.5 * edge1.crossProduct(edge2).length();
                emissiveTris.push({ tri, emission: emissive, area });
              }
            }
          }
        }
      }

      if (emissiveTris.length > 0) {
        const totalArea = emissiveTris.reduce((s, e) => s + e.area, 0);

        // Pick triangle proportional to area
        let rnd = Math.random() * totalArea;
        let chosen = emissiveTris[emissiveTris.length - 1];
        for (const e of emissiveTris) { rnd -= e.area; if (rnd <= 0) { chosen = e; break; } }

        // Uniform point on triangle via barycentric coordinates
        const sqr1 = Math.sqrt(Math.random());
        const r2 = Math.random();
        const b0 = 1 - sqr1, b1 = sqr1 * (1 - r2), b2 = sqr1 * r2;
        const { tri, emission } = chosen;
        const lightPoint = new Point(
          b0 * tri.v1.x + b1 * tri.v2.x + b2 * tri.v3.x,
          b0 * tri.v1.y + b1 * tri.v2.y + b2 * tri.v3.y,
          b0 * tri.v1.z + b1 * tri.v2.z + b2 * tri.v3.z
        );

        const toLightVec = new Vector(
          lightPoint.x - intersected.point.x,
          lightPoint.y - intersected.point.y,
          lightPoint.z - intersected.point.z
        );
        const dist = toLightVec.length();
        const lightDir = toLightVec.normalize();
        const cosTheta = Math.max(0, normal.dotProduct(lightDir));
        const cosThetaLight = Math.abs(tri.normal.dotProduct(lightDir));

        if (cosTheta > 0 && cosThetaLight > 0) {
          const shadowHit = findClosestIntersection({
            ray: new Ray(intersected.point, lightDir),
            tMin: epsilon,
            tMax: dist - epsilon,
            sceneObjects,
            i,
            j
          });
          if (!shadowHit) {
            const weight = cosTheta * cosThetaLight * totalArea / (dist * dist * Math.PI);
            radiance = radiance.addWithColor(color.multiply(weight).multiplyWithColor(emission));
          }
        }
      }
    }
  } else {
    const skyColor = new Color(0.2, 0.2, 0.2);
    radiance = radiance.addWithColor(skyColor);
  }

  return radiance;
};

onmessage = async (e: MessageEvent) => {
  const {
    iStart, iEnd, jStart, jEnd, width, imageMaps,
    sceneName = "cornellBoxMeshes",
    totalPasses = 128
  } = e.data;

  const scene = await importScene(sceneName);
  sceneObjects = scene.sceneObjects;
  cameraStart  = scene.cameraStart;
  rotateCamera = scene.rotateCamera;

  // Precompute base ray directions for the tile — same for every pass.
  type PixelDir = { i: number; j: number; rotatedDir: Vector };
  const pixelDirs: PixelDir[] = [];
  for (let i = iStart; i < iEnd; i++) {
    for (let j = jStart; j < jEnd; j++) {
      const xStart = (j - width / 2) / width;
      const yStart = (width / 2 - i) / width;
      pixelDirs.push({ i, j, rotatedDir: rotateCamera(new Vector(xStart, yStart, 1)) });
    }
  }

  // Progressive: send one raw sample per pixel per message.
  // The main thread accumulates and gamma-corrects for display.
  for (let pass = 0; pass < totalPasses; pass++) {
    const pixelColors: { i: number; j: number; r: number; g: number; b: number }[] = [];

    for (const { i, j, rotatedDir } of pixelDirs) {
      const xJitter = Math.random() / width;
      const yJitter = Math.random() / width;
      const jitteredDir = new Vector(
        rotatedDir.x + xJitter,
        rotatedDir.y + yJitter,
        rotatedDir.z
      );
      const color = traceRay({ ray: new Ray(cameraStart, jitteredDir), imageMaps, i, j });
      pixelColors.push({ i, j, r: color.r, g: color.g, b: color.b });
    }

    postMessage({ pass, totalPasses, pixelColors });
  }
};
