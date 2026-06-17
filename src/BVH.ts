import { Ray } from "./Ray.js";
import { Point } from "./Point.js";
import { Triangle } from "./Triangle.js";

export class AABB {
  constructor(
    public min: { x: number; y: number; z: number },
    public max: { x: number; y: number; z: number }
  ) {}

  static fromTriangles(tris: Triangle[]): AABB {
    let minX = Infinity,  minY = Infinity,  minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const tri of tris) {
      for (const v of [tri.v1, tri.v2, tri.v3]) {
        if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
      }
    }
    // Small padding prevents degenerate AABBs on axis-aligned faces
    const e = 1e-4;
    return new AABB(
      { x: minX - e, y: minY - e, z: minZ - e },
      { x: maxX + e, y: maxY + e, z: maxZ + e }
    );
  }

  // Slab method — branchless min/max variant
  hit(ray: Ray, tMin: number, tMax: number): boolean {
    let invD = 1 / ray.dir.x;
    let t0 = (this.min.x - ray.start.x) * invD;
    let t1 = (this.max.x - ray.start.x) * invD;
    if (invD < 0) { const s = t0; t0 = t1; t1 = s; }
    if (t0 > tMin) tMin = t0;
    if (t1 < tMax) tMax = t1;
    if (tMax <= tMin) return false;

    invD = 1 / ray.dir.y;
    t0 = (this.min.y - ray.start.y) * invD;
    t1 = (this.max.y - ray.start.y) * invD;
    if (invD < 0) { const s = t0; t0 = t1; t1 = s; }
    if (t0 > tMin) tMin = t0;
    if (t1 < tMax) tMax = t1;
    if (tMax <= tMin) return false;

    invD = 1 / ray.dir.z;
    t0 = (this.min.z - ray.start.z) * invD;
    t1 = (this.max.z - ray.start.z) * invD;
    if (invD < 0) { const s = t0; t0 = t1; t1 = s; }
    if (t0 > tMin) tMin = t0;
    if (t1 < tMax) tMax = t1;
    return tMax > tMin;
  }
}

export type BVHLeaf     = { kind: "leaf";     triangles: Triangle[]; bounds: AABB };
export type BVHInterior = { kind: "interior"; left: BVHNode; right: BVHNode; bounds: AABB };
export type BVHNode     = BVHLeaf | BVHInterior;

function buildNode(tris: Triangle[], depth: number): BVHNode {
  const bounds = AABB.fromTriangles(tris);

  if (tris.length <= 4 || depth > 24) {
    return { kind: "leaf", triangles: tris, bounds };
  }

  // Split on the axis with the largest centroid spread
  const dx = bounds.max.x - bounds.min.x;
  const dy = bounds.max.y - bounds.min.y;
  const dz = bounds.max.z - bounds.min.z;
  const axis: "x" | "y" | "z" =
    dx >= dy && dx >= dz ? "x" : dy >= dz ? "y" : "z";

  const sorted = tris.slice().sort((a, b) => a.center[axis] - b.center[axis]);
  const mid = sorted.length >> 1;

  return {
    kind: "interior",
    left:  buildNode(sorted.slice(0, mid), depth + 1),
    right: buildNode(sorted.slice(mid),    depth + 1),
    bounds
  };
}

export function buildBVH(triangles: Triangle[]): BVHNode {
  return buildNode(triangles, 0);
}

/**
 * Traverse the BVH and return the closest hit within [tMin, tMax].
 * When findFirst=true, returns immediately on any hit (for shadow rays).
 */
export function intersectBVH(
  node: BVHNode,
  ray: Ray,
  tMin: number,
  tMax: number,
  findFirst = false
): { tri: Triangle; t: number } | null {
  if (!node.bounds.hit(ray, tMin, tMax)) return null;

  if (node.kind === "leaf") {
    let closest: { tri: Triangle; t: number } | null = null;
    for (const tri of node.triangles) {
      const hit = tri.intersection(ray);
      if (hit && hit.t > tMin && hit.t < tMax) {
        if (findFirst) return { tri, t: hit.t };
        tMax = hit.t;
        closest = { tri, t: hit.t };
      }
    }
    return closest;
  }

  // Interior: check both children; shrink tMax after the first hit
  // so the second child gets an automatically tighter window.
  const leftHit = intersectBVH(node.left, ray, tMin, tMax, findFirst);
  if (leftHit) {
    if (findFirst) return leftHit;
    tMax = leftHit.t;
  }
  const rightHit = intersectBVH(node.right, ray, tMin, tMax, findFirst);
  return rightHit ?? leftHit;
}
