import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { Sphere } from "../Sphere.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";
import { parseMesh } from "../meshUtils.js";
import { queen as queenMesh } from "../meshes/chess/queen.js";
import { king as kingMesh } from "../meshes/chess/king.js";
import { pawn as pawnMesh } from "../meshes/chess/pawn.js";

// Low angle — pulled back a little since the pieces are now at the near end
export const cameraStart = new Point(0, 1.6, -3);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(14));

// ─── Milky Way sky ────────────────────────────────────────────────────────────
// Deterministic integer hash (xorshift-based) → [0,1)
const hash = (a: number, b: number): number => {
  let h = (((a * 374761393) ^ (b * 1234567891)) >>> 0);
  h = ((h ^ (h >>> 13)) * 1664525 + 1013904223) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0xFFFFFFFF;
};

export const skyFn = (dir: Vector): Color => {
  const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  const nx = dir.x / len, ny = dir.y / len, nz = dir.z / len;

  // Spherical coords: theta = polar (0=up), phi = azimuthal (-PI..PI)
  const theta = Math.acos(Math.max(-1, Math.min(1, ny)));
  const phi   = Math.atan2(nz, nx);

  // Milky Way band: bright stripe along theta ≈ PI/2 (horizon)
  const galLat   = theta - Math.PI / 2;
  const band     = Math.exp(-galLat * galLat * 6) * 0.35;
  // Bright galactic core offset by phi ≈ 1.0 rad
  const coreMask = Math.exp(-galLat * galLat * 18) * Math.max(0, Math.cos(phi - 1.0)) * 0.5;

  // Stars: divide sky into cells and place one star per ~3% of cells
  const CELLS = 180;
  const ci0 = Math.floor(theta * CELLS / Math.PI);
  const cj0 = Math.floor((phi + Math.PI) * CELLS / (2 * Math.PI));
  let star = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ci = ci0 + di, cj = (cj0 + dj + CELLS) % CELLS;
      if (hash(ci, cj) > 0.97) {              // ~3% star density
        const starT = (ci + hash(ci + 500, cj)) * Math.PI / CELLS;
        const starP = (cj + hash(ci, cj + 500)) * 2 * Math.PI / CELLS - Math.PI;
        // Dot product gives cos(angular distance)
        const dot = Math.sin(theta) * Math.cos(phi) * Math.sin(starT) * Math.cos(starP)
                  + Math.sin(theta) * Math.sin(phi) * Math.sin(starT) * Math.sin(starP)
                  + Math.cos(theta) * Math.cos(starT);
        const angDist = Math.acos(Math.max(-1, Math.min(1, dot)));
        const size    = 0.003 + hash(ci + 100, cj + 100) * 0.004;
        if (angDist < size) {
          const bright = hash(ci + 200, cj + 200) * 0.6 + 0.4;
          star = Math.max(star, bright * (1 - angDist / size));
        }
      }
    }
  }

  return new Color(
    0.004 + band * 0.25 + coreMask * 0.45 + star,
    0.004 + band * 0.20 + coreMask * 0.30 + star * 0.92,
    0.010 + band * 0.40 + coreMask * 0.15 + star * 0.88
  );
};

// ─── Checkerboard floor ───────────────────────────────────────────────────────
function boardColor(point: Point, _normal: Vector): Color {
  const col = Math.floor(point.x + 4);
  const row = Math.floor(point.z);
  return (col + row) % 2 === 0
    ? new Color(0.92, 0.89, 0.82)
    : new Color(0.07, 0.05, 0.04);
}

// ─── Materials ────────────────────────────────────────────────────────────────
// White pieces: polished silver
const whiteMat = new Material({ albedo: new Color(0.88, 0.86, 0.84), metallic: 1, roughness: 0.06 });
// Black pieces: dark gunmetal
const blackMat = new Material({ albedo: new Color(0.12, 0.10, 0.10), metallic: 1, roughness: 0.10 });

// ─── Checkmate position: Qe1# (board rotated 180°) ───────────────────────────
// White Queen e1 (col 4, row 0) delivers checkmate to Black King d1 (col 3, row 0).
// White King d3 (col 3, row 2) supports.
//
// Board rotated 180° from original Qd8# so the action is at the near end.
// All Black King escape squares are covered:
//   c1 → controlled by Qe1 (rank)
//   c2 → controlled by Kd3 (adjacent)
//   d2 → controlled by Qe1 (diagonal) + Kd3 (adjacent)
//   e2 → controlled by Qe1 (file) + Kd3 (adjacent)
//   e1 → occupied by White Queen
//
// Scale 0.14 → king ≈1.13u tall, queen ≈1.0u tall, pawn ≈0.51u tall.
const SCALE = 0.14;

// col 0-7 (a-h), row 0-7 (rank 1-8); pieces on near side of board (low z)
const at = (col: number, row: number) => ({
  x: col - 3.5, y: 0, z: row + 0.5
});

export const sceneObjects: SceneObject[] = [];

// Board
sceneObjects.push(new Rectangle({
  corner: new Point(-4, 0, 0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 8, height: 8,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.5, 0.5, 0.5), texture: boardColor })
}));

// White Queen — e1
const { x: qx, z: qz } = at(4, 0);
sceneObjects.push(parseMesh({
  mesh: queenMesh, name: "wQueen",
  material: whiteMat,
  scale: SCALE,
  translate: { x: qx, y: 0, z: qz }
}));

// White King — d3
const { x: wkx, z: wkz } = at(3, 2);
sceneObjects.push(parseMesh({
  mesh: kingMesh, name: "wKing",
  material: whiteMat,
  scale: SCALE,
  translate: { x: wkx, y: 0, z: wkz }
}));

// Black King — d1
const { x: bkx, z: bkz } = at(3, 0);
sceneObjects.push(parseMesh({
  mesh: kingMesh, name: "bKing",
  material: blackMat,
  scale: SCALE,
  translate: { x: bkx, y: 0, z: bkz }
}));

// Scattered pawns for depth
const { x: p1x, z: p1z } = at(5, 2);
sceneObjects.push(parseMesh({ mesh: pawnMesh, name: "p1", material: whiteMat, scale: SCALE, translate: { x: p1x, y: 0, z: p1z } }));
const { x: p2x, z: p2z } = at(1, 1);
sceneObjects.push(parseMesh({ mesh: pawnMesh, name: "p2", material: blackMat, scale: SCALE, translate: { x: p2x, y: 0, z: p2z } }));

// ─── Soft fill light ──────────────────────────────────────────────────────────
sceneObjects.push(new Sphere({
  center: new Point(3, 10, 5),
  radius: 3,
  name: "lightBall",
  material: new Material({ albedo: new Color(1, 1, 1), emissive: new Color(2.5, 2.4, 2.2) })
}));
