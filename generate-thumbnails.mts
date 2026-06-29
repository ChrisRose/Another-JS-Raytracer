/**
 * Renders each scene in Node.js and saves a thumbnail to public/thumbnails/.
 * Run with: npx tsx generate-thumbnails.ts
 */

import { createCanvas, loadImage } from 'canvas';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Scene imports
import * as cornellBoxMeshesScene  from './src/scenes/cornellBoxMeshes.js';
import * as globalIlluminationScene from './src/scenes/globalIllumination.js';
import * as refractionScene         from './src/scenes/refraction.js';
import * as metalBunnyScene         from './src/scenes/metalBunny.js';
import * as backroomsScene          from './src/scenes/backrooms.js';
import * as chessScene              from './src/scenes/chess.js';
import * as dragonScene             from './src/scenes/dragon.js';
import * as labScene               from './src/scenes/lab.js';
import * as monkeyScene            from './src/scenes/monkey.js';

// Raytracer utilities
import { Color }    from './src/Color.js';
import { Material } from './src/Material.js';
import { parseMesh } from './src/meshUtils.js';
import { Vector }  from './src/Vector.js';
import { Ray }     from './src/Ray.js';
import { Point }   from './src/Point.js';
import { epsilon } from './src/const.js';
import { distance, subtract, dotProduct } from './src/utils.js';
import { Sphere }    from './src/Sphere.js';
import { Triangle }  from './src/Triangle.js';
import { Rectangle } from './src/Rectangle.js';
import { intersectBVH } from './src/BVH.js';
import { SceneObject } from './src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Scene catalogue ──────────────────────────────────────────────────────────
const SCENES = [
  { id: 'cornellBoxMeshes',  scene: cornellBoxMeshesScene  },
  { id: 'globalIllumination', scene: globalIlluminationScene },
  { id: 'refraction',         scene: refractionScene         },
  { id: 'metalBunny',         scene: metalBunnyScene         },
  { id: 'backrooms',          scene: backroomsScene          },
  { id: 'chess',              scene: chessScene              },
  { id: 'dragon',             scene: dragonScene             },
  { id: 'lab',               scene: labScene               },
  { id: 'monkey',            scene: monkeyScene            },
];

const PREVIEW = process.argv.includes('--preview');
const WIDTH   = PREVIEW ? 200 : 600;
const HEIGHT  = PREVIEW ? 200 : 600;
const PASSES  = PREVIEW ?  16 : 128;
const OUT_DIR = path.join(__dirname, 'public', 'thumbnails');

// ─── ImageData shim for sky texture ──────────────────────────────────────────
interface ImageDataLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// ─── Path-tracer helpers ──────────────────────────────────────────────────────

function findClosestIntersection({
  ray, tMin, tMax, findClosest = true, sceneObjects
}: {
  ray: Ray; tMin: number; tMax: number; findClosest?: boolean; sceneObjects: SceneObject[];
}) {
  let intersected: { point: Point; object: any } | null = null;
  let closestIntersection = Infinity;

  const meshObjects = sceneObjects.filter(o => o.type === 'mesh') as any[];
  for (const meshObject of meshObjects) {
    if (meshObject.bvh) {
      const hit = intersectBVH(meshObject.bvh, ray, tMin, tMax, !findClosest);
      if (hit) {
        const point = ray.getPoint(hit.t);
        if (!findClosest) return { point, object: hit.tri, mesh: meshObject };
        const dist = distance(point, ray.start);
        if (dist < closestIntersection) { closestIntersection = dist; tMax = hit.t; intersected = { point, object: hit.tri, mesh: meshObject }; }
      }
    } else {
      for (const prim of meshObject.meshObjects) {
        const intersection = prim.intersection(ray);
        if (!intersection) continue;
        const { t } = intersection;
        if (t > tMin && t < tMax) {
          const point = ray.getPoint(t);
          if (!findClosest) return { point, object: prim };
          const dist = distance(point, ray.start);
          if (dist < closestIntersection) { closestIntersection = dist; intersected = { point, object: prim }; }
        }
      }
    }
  }

  const nonMesh = sceneObjects.filter(o => o.type !== 'mesh') as any[];
  for (const obj of nonMesh) {
    const intersection = obj.intersection(ray);
    if (!intersection) continue;
    const { t } = intersection;
    if (t == null) continue;
    const point = ray.getPoint(t);
    if (t > tMin && t < tMax) {
      if (!findClosest) return { point, object: intersection.side || obj };
      const dist = distance(point, ray.start);
      if (dist < closestIntersection) {
        closestIntersection = dist;
        intersected = { point, object: intersection.side || obj };
      }
    }
  }
  return intersected;
}

const smithG1 = (nDotV: number, alpha2: number) =>
  2 * nDotV / (nDotV + Math.sqrt(alpha2 + (1 - alpha2) * nDotV * nDotV));

function sampleGGX(normal: Vector, alpha2: number): Vector {
  const u1 = Math.random(), u2 = Math.random();
  const cosTheta = Math.sqrt((1 - u1) / (1 + (alpha2 - 1) * u1));
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = 2 * Math.PI * u2;
  const up = Math.abs(normal.y) < 0.999 ? new Vector(0, 1, 0) : new Vector(1, 0, 0);
  const tangent   = up.crossProduct(normal).normalize();
  const bitangent = normal.crossProduct(tangent);
  return tangent.multiply(sinTheta * Math.cos(phi))
    .add(bitangent.multiply(sinTheta * Math.sin(phi)))
    .add(normal.multiply(cosTheta)).normalize();
}

function getCosineWeightedSample(normal: Vector): Vector {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const r = Math.sqrt(v);
  const localX = r * Math.cos(theta), localY = r * Math.sin(theta);
  const localZ = Math.sqrt(1 - v);
  const up = Math.abs(normal.y) < 0.999 ? new Vector(0, 1, 0) : new Vector(1, 0, 0);
  const tangent   = up.crossProduct(normal).normalize();
  const bitangent = normal.crossProduct(tangent);
  return tangent.multiply(localX).add(bitangent.multiply(localY)).add(normal.multiply(localZ));
}

function getFresnelReflectance({ normal, incidentRay, refractionIndex }: { normal: Vector; incidentRay: Vector; refractionIndex: number }): number {
  const cosTheta = Math.abs(normal.dotProduct(incidentRay));
  const r0 = ((1 - refractionIndex) / (1 + refractionIndex)) ** 2;
  return r0 + (1 - r0) * Math.pow(1 - cosTheta, 5);
}

function getReflectedRay({ normal, point, incidentRay }: { normal: Vector; point: Point; incidentRay: Vector }): Ray {
  const a = 2 * dotProduct(incidentRay, normal);
  return new Ray(point, subtract(incidentRay, normal.multiply(a)));
}

function getRefractedRay({ normal, point, incidentRay, refractionIndex }: { normal: Vector; point: Point; incidentRay: Vector; refractionIndex: number }): Ray | null {
  const cosThetaI = normal.dotProduct(incidentRay);
  const entering = cosThetaI < 0;
  const n = entering ? (1 / refractionIndex) : refractionIndex;
  const orientedNormal = entering ? normal : normal.multiply(-1);
  const cosTheta = Math.abs(cosThetaI);
  const sin2ThetaT = n * n * (1 - cosTheta * cosTheta);
  if (sin2ThetaT >= 1) return null;
  const cosThetaT = Math.sqrt(1 - sin2ThetaT);
  return new Ray(point, incidentRay.multiply(n).add(orientedNormal.multiply(n * cosTheta - cosThetaT)));
}

function sampleSphereLight(lightCenter: Point, lightRadius: number, surfacePoint: Point) {
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
  const dir = x.multiply(sinT * Math.cos(phi)).add(y.multiply(sinT * Math.sin(phi))).add(z.multiply(cosT)).normalize();
  return { dir, solidAngle };
}

function hgPhase(cosTheta: number, g: number): number {
  if (Math.abs(g) < 1e-3) return 1 / (4 * Math.PI);
  const g2 = g * g;
  return (1 - g2) / (4 * Math.PI * Math.pow(Math.max(0, 1 + g2 - 2 * g * cosTheta), 1.5));
}

function sampleHG(dir: Vector, g: number): Vector {
  const u = Math.random();
  let cosTheta: number;
  if (Math.abs(g) < 0.001) {
    cosTheta = 1 - 2 * u;
  } else {
    const sq = (1 - g * g) / (1 + g * (2 * u - 1));
    cosTheta = (1 + g * g - sq * sq) / (2 * g);
  }
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = 2 * Math.PI * Math.random();
  const z = dir.normalize();
  const up = Math.abs(z.y) < 0.999 ? new Vector(0, 1, 0) : new Vector(1, 0, 0);
  const x  = up.crossProduct(z).normalize();
  const y  = z.crossProduct(x);
  return x.multiply(sinTheta * Math.cos(phi)).add(y.multiply(sinTheta * Math.sin(phi))).add(z.multiply(cosTheta)).normalize();
}

interface TraceCtx {
  ray: Ray;
  sceneObjects: SceneObject[];
  skyFn?: (dir: Vector) => Color;
  skyImageData?: ImageDataLike;
  bounceDepth?: number;
  includeEmission?: boolean;
  sigma_t?: number;
  sigma_s?: number;
  phaseG?: number;
}

function traceRay({ ray, sceneObjects, skyFn, skyImageData, bounceDepth = 0, includeEmission = true, sigma_t = 0, sigma_s = 0, phaseG = 0 }: TraceCtx): Color {
  if (bounceDepth > 4) return new Color(0, 0, 0);

  const intersected = findClosestIntersection({ ray, tMin: epsilon, tMax: Infinity, sceneObjects });

  // Participating medium: free-path sample
  if (sigma_t > 0) {
    const t_free = -Math.log(Math.max(1e-10, Math.random())) / sigma_t;
    const t_surf = intersected ? distance(intersected.point, ray.start) : Infinity;
    if (t_free < t_surf) {
      const sp = ray.getPoint(t_free);
      const inDir = ray.dir.normalize();
      const sa = sigma_s / sigma_t;
      let nee = new Color(0, 0, 0);

      // NEE: emissive spheres
      for (const obj of sceneObjects) {
        if (obj.type !== 'sphere') continue;
        const sphere = obj as unknown as Sphere;
        const em = sphere.material?.emissive;
        if (!em || (em.r === 0 && em.g === 0 && em.b === 0)) continue;
        const sample = sampleSphereLight(sphere.center, sphere.radius, sp);
        if (!sample) continue;
        const { dir: lightDir, solidAngle } = sample;
        const phase = hgPhase(inDir.dotProduct(lightDir), phaseG);
        const shadowHit = findClosestIntersection({ ray: new Ray(sp, lightDir), tMin: epsilon, tMax: Infinity, sceneObjects });
        if (shadowHit?.object === sphere) {
          const dx = sphere.center.x - sp.x, dy = sphere.center.y - sp.y, dz = sphere.center.z - sp.z;
          const T = Math.exp(-sigma_t * Math.sqrt(dx*dx + dy*dy + dz*dz));
          nee = nee.addWithColor(em.multiply(sa * phase * solidAngle * T));
        }
      }

      // NEE: emissive mesh triangles
      const emissiveTris: { tri: Triangle; emission: Color; area: number }[] = [];
      for (const obj of sceneObjects) {
        if (obj.type !== 'mesh') continue;
        const mesh = obj as any;
        const emissive = mesh.material?.emissive as Color | undefined;
        if (!emissive || (emissive.r === 0 && emissive.g === 0 && emissive.b === 0)) continue;
        for (const prim of mesh.meshObjects) {
          if (prim.type !== 'triangle') continue;
          const tri = prim as Triangle;
          const e1 = tri.v2.subtract(tri.v1), e2 = tri.v3.subtract(tri.v1);
          emissiveTris.push({ tri, emission: emissive, area: 0.5 * e1.crossProduct(e2).length() });
        }
      }
      if (emissiveTris.length > 0) {
        const totalArea = emissiveTris.reduce((s, e) => s + e.area, 0);
        let rnd = Math.random() * totalArea;
        let chosen = emissiveTris[emissiveTris.length - 1];
        for (const e of emissiveTris) { rnd -= e.area; if (rnd <= 0) { chosen = e; break; } }
        const sqr1 = Math.sqrt(Math.random()), r2 = Math.random();
        const b0 = 1 - sqr1, b1 = sqr1 * (1 - r2), b2 = sqr1 * r2;
        const { tri, emission } = chosen;
        const lp = new Point(b0*tri.v1.x + b1*tri.v2.x + b2*tri.v3.x, b0*tri.v1.y + b1*tri.v2.y + b2*tri.v3.y, b0*tri.v1.z + b1*tri.v2.z + b2*tri.v3.z);
        const dx = lp.x - sp.x, dy = lp.y - sp.y, dz = lp.z - sp.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const lDir = new Vector(dx/dist, dy/dist, dz/dist);
        const cosTL = Math.abs(tri.normal.dotProduct(lDir));
        const phase = hgPhase(inDir.dotProduct(lDir), phaseG);
        const shadowHit = findClosestIntersection({ ray: new Ray(sp, lDir), tMin: epsilon, tMax: dist - epsilon, sceneObjects });
        if (!shadowHit) {
          const T = Math.exp(-sigma_t * dist);
          nee = nee.addWithColor(emission.multiply(sa * phase * cosTL * totalArea * T / (dist * dist)));
        }
      }

      // Indirect scattered ray — suppress emission to avoid double-counting.
      const indirect = new Color(sa, sa, sa).multiplyWithColor(
        traceRay({ ray: new Ray(sp, sampleHG(ray.dir, phaseG)), sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth + 1, includeEmission: false, sigma_t, sigma_s, phaseG })
      );
      return nee.addWithColor(indirect);
    }
  }

  if (!intersected?.object) {
    if (skyImageData) {
      const d = ray.dir;
      const len = Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z);
      const theta = Math.acos(Math.max(-1, Math.min(1, d.y/len)));
      const phi   = Math.atan2(d.z/len, d.x/len);
      const u = Math.floor(((phi + Math.PI) / (2 * Math.PI)) * skyImageData.width * 2) % skyImageData.width;
      const v = Math.floor((theta / Math.PI)                  * skyImageData.height) % skyImageData.height;
      const idx = (v * skyImageData.width + u) * 4;
      const fromSrgb = (x: number) => Math.pow(x / 255, 2.2);
      return new Color(fromSrgb(skyImageData.data[idx]), fromSrgb(skyImageData.data[idx+1]), fromSrgb(skyImageData.data[idx+2]));
    }
    return skyFn ? skyFn(ray.dir) : new Color(0.2, 0.2, 0.2);
  }

  const obj = intersected.object as any;
  let normal: Vector;
  if (obj.type === 'triangle') {
    const UVW = obj.getUVW(intersected.point);
    normal = obj.normalAtPoint(UVW);
  } else if (typeof obj.normal === 'function') {
    normal = obj.normal(intersected.point);
  } else {
    normal = obj.normal;
  }

  const emission = obj?.material?.emissive;
  if (emission) return includeEmission ? emission : new Color(0, 0, 0);

  const material = obj.material;

  if ((material.metallic ?? 0) > 0) {
    const roughness = Math.max(0.01, material.roughness ?? 0.3);
    const alpha2 = roughness ** 4;
    const ωo = ray.dir.multiply(-1).normalize();
    const nDotO = Math.max(0, normal.dotProduct(ωo));
    if (nDotO <= 0) return new Color(0, 0, 0);
    const h = sampleGGX(normal, alpha2);
    const oDotH = Math.max(0, ωo.dotProduct(h));
    const ωi = h.multiply(2 * ωo.dotProduct(h)).subtract(ωo).normalize();
    const nDotI = Math.max(0, normal.dotProduct(ωi));
    if (nDotI <= 0) return new Color(0, 0, 0);
    const nDotH = Math.max(0, normal.dotProduct(h));
    const f0 = material.albedo;
    const fresnel = f0.addWithColor(new Color(1,1,1).subtract(f0).multiply(Math.pow(1 - oDotH, 5)));
    const G = smithG1(nDotO, alpha2) * smithG1(nDotI, alpha2);
    const weight = (G * oDotH) / (nDotO * nDotH);
    const Li = traceRay({ ray: new Ray(intersected.point.add(normal.multiply(epsilon).toPoint()), ωi), sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth+1, includeEmission: true, sigma_t, sigma_s, phaseG });
    return fresnel.multiply(weight).multiplyWithColor(Li);
  }

  if ((material.refractionIndex ?? 0) > 0) {
    const fresnel = getFresnelReflectance({ normal, incidentRay: ray.dir, refractionIndex: material.refractionIndex! });
    const reflected = getReflectedRay({ normal, point: intersected.point, incidentRay: ray.dir });
    if (Math.random() < fresnel) {
      return traceRay({ ray: reflected, sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth+1, includeEmission: true, sigma_t, sigma_s, phaseG });
    }
    const refracted = getRefractedRay({ normal, point: intersected.point, incidentRay: ray.dir, refractionIndex: material.refractionIndex! });
    return traceRay({ ray: refracted ?? reflected, sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth+1, includeEmission: true, sigma_t, sigma_s, phaseG });
  }

  // Glossy dielectric: roughness set, not metallic, not glass.
  if (material.roughness !== undefined && !material.metallic && !material.refractionIndex) {
    const roughness = Math.max(0.01, material.roughness);
    const alpha2 = roughness ** 4;
    const ωo = ray.dir.multiply(-1).normalize();
    const nDotO = Math.max(0, normal.dotProduct(ωo));
    const fresnelP = 0.04 + 0.96 * Math.pow(1 - nDotO, 5);
    if (Math.random() < fresnelP) {
      const h = sampleGGX(normal, alpha2);
      const oDotH = Math.max(0, ωo.dotProduct(h));
      const ωi = h.multiply(2 * ωo.dotProduct(h)).subtract(ωo).normalize();
      const nDotI = normal.dotProduct(ωi);
      const nDotH = Math.max(0, normal.dotProduct(h));
      if (nDotI > 0 && nDotH > 0 && nDotO > 0) {
        const G = smithG1(nDotO, alpha2) * smithG1(nDotI, alpha2);
        const weight = (G * oDotH) / (nDotO * nDotH);
        const Li = traceRay({ ray: new Ray(intersected.point.add(normal.multiply(epsilon).toPoint()), ωi), sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth+1, includeEmission: true, sigma_t, sigma_s, phaseG });
        return new Color(1, 1, 1).multiply(weight).multiplyWithColor(Li);
      }
    }
    // Diffuse arm falls through.
  }

  // Subsurface scattering: use Beer-Lambert T as branching probability.
  if ((material.subsurface ?? 0) > 0 && material.subsurfaceSigma) {
    let thickness = 0.5;
    if ((intersected as any).mesh?.bvh) {
      const hit = intersectBVH((intersected as any).mesh.bvh, new Ray(intersected.point, ray.dir), epsilon * 10, Infinity, false);
      thickness = hit ? hit.t : 0.5;
    } else {
      const exitPt = intersected.point.add(ray.dir.normalize().multiply(epsilon * 10).toPoint());
      const exitHit = (obj as any).intersection?.(new Ray(exitPt, ray.dir));
      thickness = exitHit?.t ?? 0.5;
    }
    const T = Math.exp(-material.subsurfaceSigma * thickness);
    if (Math.random() < T) {
      const albedo = material.texture ? material.texture(intersected.point, normal) : material.albedo;
      const scatterDir = getCosineWeightedSample(normal.multiply(-1));
      const exitPt = intersected.point.add(normal.multiply(-epsilon).toPoint());
      return albedo.multiplyWithColor(
        traceRay({ ray: new Ray(exitPt, scatterDir), sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth+1, includeEmission: true, sigma_t, sigma_s, phaseG })
      );
    }
  }

  const color = material.texture ? material.texture(intersected.point, normal) : material.albedo;
  const randomDir = getCosineWeightedSample(normal);
  const shiftedPoint = intersected.point.add(normal.multiply(epsilon).toPoint());
  let radiance = color.multiplyWithColor(
    traceRay({ ray: new Ray(shiftedPoint, randomDir), sceneObjects, skyFn, skyImageData, bounceDepth: bounceDepth+1, includeEmission: false, sigma_t, sigma_s, phaseG })
  );

  // ─── NEE: sample all emissive lights ───────────────────────────────────────

  // Emissive spheres
  for (const obj of sceneObjects) {
    if (obj.type !== 'sphere') continue;
    const sphere = obj as unknown as Sphere;
    const em = sphere.material?.emissive;
    if (!em || (em.r === 0 && em.g === 0 && em.b === 0)) continue;
    const sample = sampleSphereLight(sphere.center, sphere.radius, intersected.point);
    if (!sample) continue;
    const { dir: lightDir, solidAngle } = sample;
    const cosTheta = Math.max(0, normal.dotProduct(lightDir));
    if (cosTheta === 0) continue;
    const shadowHit = findClosestIntersection({ ray: new Ray(intersected.point, lightDir), tMin: epsilon, tMax: Infinity, sceneObjects });
    if (shadowHit?.object === sphere) {
      radiance = radiance.addWithColor(color.multiply(cosTheta * solidAngle / Math.PI).multiplyWithColor(em));
    }
  }

  // Emissive rectangles
  for (const obj of sceneObjects) {
    if (obj.type !== 'rectangle') continue;
    const rect = obj as unknown as Rectangle;
    const em = rect.material?.emissive;
    if (!em || (em.r === 0 && em.g === 0 && em.b === 0)) continue;
    const u = Math.random(), v = Math.random();
    const lx = rect.corner.x + u * rect.v1.x * rect.width + v * rect.v2.x * rect.height;
    const ly = rect.corner.y + u * rect.v1.y * rect.width + v * rect.v2.y * rect.height;
    const lz = rect.corner.z + u * rect.v1.z * rect.width + v * rect.v2.z * rect.height;
    const dx = lx - intersected.point.x, dy = ly - intersected.point.y, dz = lz - intersected.point.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const lightDir = new Vector(dx/dist, dy/dist, dz/dist);
    const cosTheta = Math.max(0, normal.dotProduct(lightDir));
    const cosThetaLight = Math.abs(rect.normal.dotProduct(lightDir));
    if (cosTheta === 0 || cosThetaLight === 0) continue;
    const shadowHit = findClosestIntersection({ ray: new Ray(intersected.point, lightDir), tMin: epsilon, tMax: dist - epsilon, sceneObjects });
    if (!shadowHit) {
      const area = rect.width * rect.height;
      radiance = radiance.addWithColor(color.multiply(cosTheta * cosThetaLight * area / (dist * dist * Math.PI)).multiplyWithColor(em));
    }
  }

  // Emissive mesh triangles
  const emissiveTris: { tri: Triangle; emission: Color; area: number }[] = [];
  for (const obj of sceneObjects) {
    if (obj.type !== 'mesh') continue;
    const mesh = obj as any;
    const emissive = mesh.material?.emissive;
    if (!emissive || (emissive.r === 0 && emissive.g === 0 && emissive.b === 0)) continue;
    for (const prim of mesh.meshObjects) {
      if (prim.type !== 'triangle') continue;
      const tri = prim as Triangle;
      const edge1 = tri.v2.subtract(tri.v1);
      const edge2 = tri.v3.subtract(tri.v1);
      emissiveTris.push({ tri, emission: emissive, area: 0.5 * edge1.crossProduct(edge2).length() });
    }
  }
  if (emissiveTris.length > 0) {
    const totalArea = emissiveTris.reduce((s, e) => s + e.area, 0);
    let rnd = Math.random() * totalArea;
    let chosen = emissiveTris[emissiveTris.length - 1];
    for (const e of emissiveTris) { rnd -= e.area; if (rnd <= 0) { chosen = e; break; } }
    const sqr1 = Math.sqrt(Math.random()), r2 = Math.random();
    const b0 = 1 - sqr1, b1 = sqr1 * (1 - r2), b2 = sqr1 * r2;
    const { tri, emission } = chosen;
    const lightPoint = new Point(b0*tri.v1.x + b1*tri.v2.x + b2*tri.v3.x, b0*tri.v1.y + b1*tri.v2.y + b2*tri.v3.y, b0*tri.v1.z + b1*tri.v2.z + b2*tri.v3.z);
    const toLightVec = new Vector(lightPoint.x-intersected.point.x, lightPoint.y-intersected.point.y, lightPoint.z-intersected.point.z);
    const dist = toLightVec.length();
    const lightDir = toLightVec.normalize();
    const cosTheta = Math.max(0, normal.dotProduct(lightDir));
    const cosThetaLight = Math.abs(tri.normal.dotProduct(lightDir));
    if (cosTheta > 0 && cosThetaLight > 0) {
      const shadowHit = findClosestIntersection({ ray: new Ray(intersected.point, lightDir), tMin: epsilon, tMax: dist - epsilon, sceneObjects });
      if (!shadowHit) {
        radiance = radiance.addWithColor(color.multiply(cosTheta * cosThetaLight * totalArea / (dist * dist * Math.PI)).multiplyWithColor(emission));
      }
    }
  }
  return radiance;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

await mkdir(OUT_DIR, { recursive: true });

// If a scene ID is passed as argv, render only that scene (used for parallel workers).
const targetId = process.argv.slice(2).find(a => !a.startsWith('--'));
const scenesToRender = targetId ? SCENES.filter(s => s.id === targetId) : SCENES;

for (const { id, scene } of scenesToRender) {
  // Dragon OBJ is served via fetch in the browser; in Node.js we read it from disk.
  if (id === 'dragon' && !dragonScene.sceneObjects.some((o: any) => o.name === 'dragon')) {
    console.log('[dragon] Loading OBJ from disk…');
    const objText = await readFile(path.join(__dirname, 'public', 'meshes', 'dragon.obj'), 'utf-8');
    const dragon = parseMesh({
      mesh: objText,
      name: 'dragon',
      material: new Material({ albedo: new Color(0.10, 0.58, 0.32), roughness: 0.18, subsurface: 0.70, subsurfaceSigma: 2.5 }),
      scale: 4,
      translate: { x: 0, y: 2.34, z: 1 },
    });
    dragonScene.sceneObjects.push(dragon);
    console.log(`[dragon] ${dragon.meshObjects.length} triangles, BVH built`);
  }

  // Monkey scene: Suzanne head from disk.
  if (id === 'monkey' && !monkeyScene.sceneObjects.some((o: any) => o.name === 'monkey')) {
    console.log('[monkey] Loading Suzanne from disk…');
    const objText = await readFile(path.join(__dirname, 'public', 'meshes', 'suzanne.obj'), 'utf-8');
    const monkey = parseMesh({
      mesh: objText,
      name: 'monkey',
      material: new Material({ albedo: new Color(0.92, 0.42, 0.06), subsurface: 0.70, subsurfaceSigma: 2.5 }),
      scale: 1.5,
      translate: { x: 3.741, y: -0.405, z: 6.647 },
    });
    monkeyScene.sceneObjects.push(monkey);
    console.log(`[monkey] ${monkey.meshObjects.length} triangles, BVH built`);
  }

  const { cameraStart, rotateCamera, sceneObjects, skyFn, skyImageKey, sigma_t = 0, sigma_s = 0, phaseG = 0 } = scene as any;
  console.log(`[${id}] Rendering  (${PASSES} passes)`);

  let skyImageData: ImageDataLike | undefined;
  if (skyImageKey === 'sky') {
    const skyPath = path.join(__dirname, 'src', 'assets', 'milkyway.jpg');
    const img = await loadImage(skyPath);
    const c   = createCanvas(img.width, img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    const raw = c.getContext('2d').getImageData(0, 0, img.width, img.height);
    skyImageData = { data: raw.data, width: raw.width, height: raw.height };
    console.log(`  Loaded sky image ${skyImageData.width}×${skyImageData.height}`);
  }

  const canvas   = createCanvas(WIDTH, HEIGHT);
  const ctx      = canvas.getContext('2d');
  const accumR   = new Float32Array(WIDTH * HEIGHT);
  const accumG   = new Float32Array(WIDTH * HEIGHT);
  const accumB   = new Float32Array(WIDTH * HEIGHT);
  const counts   = new Uint32Array(WIDTH * HEIGHT);

  const pixelDirs: { i: number; j: number; rotatedDir: Vector }[] = [];
  for (let i = 0; i < HEIGHT; i++) {
    for (let j = 0; j < WIDTH; j++) {
      pixelDirs.push({ i, j, rotatedDir: rotateCamera(new Vector((j - WIDTH/2)/WIDTH, (WIDTH/2 - i)/WIDTH, 1)) });
    }
  }

  const startTime = Date.now();
  for (let pass = 0; pass < PASSES; pass++) {
    if (pass % 8 === 0) process.stdout.write(`[${id}] pass ${pass}/${PASSES}\r`);
    for (const { i, j, rotatedDir } of pixelDirs) {
      const jitteredDir = new Vector(rotatedDir.x + Math.random()/WIDTH, rotatedDir.y + Math.random()/WIDTH, rotatedDir.z);
      const color = traceRay({ ray: new Ray(cameraStart, jitteredDir), sceneObjects, skyFn, skyImageData, sigma_t, sigma_s, phaseG });
      const lum = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
      const clampScale = lum > 20 ? 20 / lum : 1;
      const idx = i * WIDTH + j;
      accumR[idx] += color.r * clampScale; accumG[idx] += color.g * clampScale; accumB[idx] += color.b * clampScale;
      counts[idx]++;
    }
  }

  const imageData = ctx.createImageData(WIDTH, HEIGHT);
  const inv = 1 / 2.2;
  for (let i = 0; i < HEIGHT * WIDTH; i++) {
    const n = counts[i];
    if (n === 0) continue;
    const p = i * 4;
    imageData.data[p]   = Math.min(255, Math.pow(Math.max(0, accumR[i]/n), inv) * 255);
    imageData.data[p+1] = Math.min(255, Math.pow(Math.max(0, accumG[i]/n), inv) * 255);
    imageData.data[p+2] = Math.min(255, Math.pow(Math.max(0, accumB[i]/n), inv) * 255);
    imageData.data[p+3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  const buf  = canvas.toBuffer('image/jpeg', { quality: 0.92 });
  const dest = path.join(OUT_DIR, `${id}.jpg`);
  await writeFile(dest, buf);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(`[${id}] done                                              \n`);
  console.log(`[${id}] → ${path.relative(__dirname, dest)}  (${(buf.length/1024).toFixed(0)} KB, ${elapsed}s)`);
}

console.log('\nAll thumbnails generated.');
