import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Sphere } from "../Sphere.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";

// Low dramatic angle — camera barely above board level looking across
export const cameraStart = new Point(0.5, 1.5, -1.5);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(15));

// Checkerboard: col = floor(x+4) maps x=-4..4 to columns 0..7
function boardColor(point: Point, _normal: Vector): Color {
  const col = Math.floor(point.x + 4);
  const row = Math.floor(point.z);
  return (col + row) % 2 === 0
    ? new Color(0.92, 0.89, 0.82)  // ivory
    : new Color(0.07, 0.05, 0.04); // ebony
}

// ─── Materials ────────────────────────────────────────────────────────────────
const silver   = new Material({ albedo: new Color(0.90, 0.88, 0.86), metallic: 1, roughness: 0.05 });
const gold     = new Material({ albedo: new Color(1.00, 0.71, 0.29), metallic: 1, roughness: 0.08 });
const chrome   = new Material({ albedo: new Color(0.85, 0.85, 0.85), metallic: 1, roughness: 0.02 });
const glass    = new Material({ albedo: new Color(1, 1, 1), refractionIndex: 1.5 });
const onyx     = new Material({ albedo: new Color(0.10, 0.08, 0.08), metallic: 1, roughness: 0.08 });
const darkGold = new Material({ albedo: new Color(0.38, 0.26, 0.06), metallic: 1, roughness: 0.12 });
const darkRook = new Material({ albedo: new Color(0.15, 0.13, 0.13), metallic: 1, roughness: 0.04 });
const wPawn    = new Material({ albedo: new Color(0.82, 0.80, 0.77), metallic: 1, roughness: 0.20 });
const bPawn    = new Material({ albedo: new Color(0.09, 0.08, 0.07), metallic: 1, roughness: 0.22 });

// Place a sphere centred on board square (col 0-7, row 0-7).
// Sits flush on the board: centre.y = radius.
const piece = (col: number, row: number, r: number, mat: Material): Sphere =>
  new Sphere({ center: new Point(col - 3.5, r, row + 0.5), radius: r, material: mat });

export const sceneObjects: SceneObject[] = [];

// ─── Board ────────────────────────────────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(-4, 0, 0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 8,
  height: 8,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.5, 0.5, 0.5), texture: boardColor })
}));

// Dark surround (table surface beyond the board)
sceneObjects.push(new Rectangle({
  corner: new Point(-10, -0.02, -6),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width: 20,
  height: 20,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: new Material({ albedo: new Color(0.18, 0.12, 0.08) })
}));

// ─── White back rank (row 0) ──────────────────────────────────────────────────
sceneObjects.push(piece(0, 0, 0.33, chrome));   // a1 rook
sceneObjects.push(piece(1, 0, 0.28, silver));   // b1 knight
sceneObjects.push(piece(2, 0, 0.26, glass));    // c1 bishop
sceneObjects.push(piece(3, 0, 0.37, gold));     // d1 queen
sceneObjects.push(piece(4, 0, 0.41, silver));   // e1 king
sceneObjects.push(piece(5, 0, 0.26, glass));    // f1 bishop
sceneObjects.push(piece(6, 0, 0.28, silver));   // g1 knight
sceneObjects.push(piece(7, 0, 0.33, chrome));   // h1 rook

// White pawns — most on row 1, two advanced to row 3
for (const col of [0, 1, 2, 5, 6, 7]) sceneObjects.push(piece(col, 1, 0.20, wPawn));
sceneObjects.push(piece(3, 3, 0.20, wPawn));
sceneObjects.push(piece(4, 3, 0.20, wPawn));

// ─── Black back rank (row 7) ─────────────────────────────────────────────────
sceneObjects.push(piece(0, 7, 0.33, darkRook));  // a8 rook
sceneObjects.push(piece(1, 7, 0.28, onyx));      // b8 knight
sceneObjects.push(piece(2, 7, 0.26, glass));     // c8 bishop
sceneObjects.push(piece(3, 7, 0.37, darkGold));  // d8 queen
sceneObjects.push(piece(4, 7, 0.41, onyx));      // e8 king
sceneObjects.push(piece(5, 7, 0.26, glass));     // f8 bishop
sceneObjects.push(piece(6, 7, 0.28, onyx));      // g8 knight
sceneObjects.push(piece(7, 7, 0.33, darkRook));  // h8 rook

// Black pawns — most on row 6, two advanced to row 4
for (const col of [0, 1, 2, 5, 6, 7]) sceneObjects.push(piece(col, 6, 0.20, bPawn));
sceneObjects.push(piece(3, 4, 0.20, bPawn));
sceneObjects.push(piece(4, 4, 0.20, bPawn));

// ─── Lighting — large warm overhead sphere ────────────────────────────────────
sceneObjects.push(new Sphere({
  center: new Point(2, 12, 4),
  radius: 3,
  name: "lightBall",
  material: new Material({ albedo: new Color(1, 1, 1), emissive: new Color(3.5, 3.5, 3.2) })
}));
