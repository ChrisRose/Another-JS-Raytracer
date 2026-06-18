import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { getRotationXMatrix } from "../matrix.js";
import { Material } from "../Material.js";
import { Mesh } from "../Mesh.js";
import { Triangle } from "../Triangle.js";
import { teapotLowRes as teapotMesh } from "../meshes/cornellBox/teapotLowRes.js";
import { parseMesh } from "../meshUtils.js";

export const cameraStart = new Point(0, 1.5, -1.5);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(3));

// ─── Hallway dimensions ───────────────────────────────────────────────────────
// 4 units wide (x: -2..+2), 2.8 tall (y: 0..2.8), 63 deep (z: -3..60)

const HALF_W  = 2;
const CEIL_H  = 2.8;
const Z_START = -3;
const Z_END   = 60;
const DEPTH   = Z_END - Z_START; // 63

// Procedural chevron wallpaper — upward-pointing V shapes, subtle contrast.
// Uses hit-point world coords; normal selects the correct surface-local axes.
function chevronColor(point: Point, normal: Vector): Color {
  const base = new Color(0.80, 0.70, 0.33);
  const mark = new Color(0.65, 0.57, 0.27);

  const ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
  let h: number, v: number;
  if (ay >= ax && ay >= az) { h = point.x; v = point.z; }   // floor / ceiling
  else if (ax >= az)         { h = point.z; v = point.y; }   // left / right wall
  else                       { h = point.x; v = point.y; }   // front / back wall

  const freqV = 2.5, freqH = 2.5;
  const vf = ((v * freqV) % 1 + 1) % 1;   // 0..1, handles negative coords
  const hf = ((h * freqH) % 1 + 1) % 1;

  // V pointing up: left stroke rises hf = vf/2 (0→0.5), right descends hf = 1 − vf/2
  const thickness = 0.055;
  const onLine = Math.abs(hf - vf * 0.5) < thickness
              || Math.abs(hf - (1 - vf * 0.5)) < thickness;

  return onLine ? mark : base;
}

const wallMat  = new Material({ albedo: new Color(0.80, 0.70, 0.33), texture: chevronColor });
const floorMat = new Material({ albedo: new Color(0.50, 0.44, 0.20) });
const ceilMat  = new Material({ albedo: new Color(0.88, 0.83, 0.50) });

// ─── Main hallway surfaces ────────────────────────────────────────────────────

// xzAxis: width = x extent, height = z extent (Rectangle bug fixed)
const floor = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_START),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  HALF_W * 2,
  height: DEPTH,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: floorMat,
});

const ceiling = new Rectangle({
  corner: new Point(-HALF_W, CEIL_H, Z_START),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  HALF_W * 2,
  height: DEPTH,
  normal: new Vector(0, -1, 0),
  orientation: "xzAxis",
  material: ceilMat,
});

// xyAxis: width = x extent, height = y extent
const backWall = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_END),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  HALF_W * 2,
  height: CEIL_H,
  normal: new Vector(0, 0, -1),
  orientation: "xyAxis",
  material: wallMat,
});

const frontWall = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_START),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  HALF_W * 2,
  height: CEIL_H,
  normal: new Vector(0, 0, 1),
  orientation: "xyAxis",
  material: wallMat,
});

// ─── Left + right walls: split around doorway at z = 6..8, y = 0..2.2 ────────

const DOOR_Z0  = 6;
const DOOR_Z1  = 8;
const DOOR_H   = 2.2;  // door height

const leftWallPreDoor = new Rectangle({
  corner: new Point(-HALF_W, 0, Z_START),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  DOOR_Z0 - Z_START,    // z: -3..9
  height: CEIL_H,
  normal: new Vector(1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

const leftWallPostDoor = new Rectangle({
  corner: new Point(-HALF_W, 0, DOOR_Z1),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  Z_END - DOOR_Z1,      // z: 11..60
  height: CEIL_H,
  normal: new Vector(1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

// Lintel above the left door
const aboveDoor = new Rectangle({
  corner: new Point(-HALF_W, DOOR_H, DOOR_Z0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  DOOR_Z1 - DOOR_Z0,
  height: CEIL_H - DOOR_H,
  normal: new Vector(1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

// Right doorway is offset 10 units further along the hall than the left.
const RDOOR_Z0 = DOOR_Z0 + 10;   // 16
const RDOOR_Z1 = DOOR_Z1 + 10;   // 18

const rightWallPreDoor = new Rectangle({
  corner: new Point(HALF_W, 0, Z_START),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  RDOOR_Z0 - Z_START,
  height: CEIL_H,
  normal: new Vector(-1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

const rightWallPostDoor = new Rectangle({
  corner: new Point(HALF_W, 0, RDOOR_Z1),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  Z_END - RDOOR_Z1,
  height: CEIL_H,
  normal: new Vector(-1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

const aboveRightDoor = new Rectangle({
  corner: new Point(HALF_W, DOOR_H, RDOOR_Z0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  RDOOR_Z1 - RDOOR_Z0,
  height: CEIL_H - DOOR_H,
  normal: new Vector(-1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

// ─── Side room off the left: x = -7..-2, z = 7..15 ──────────────────────────
// No lights — illuminated only by indirect light leaking through the doorway.

const ROOM_X0  = -10;
const ROOM_Z0  = 4;
const ROOM_Z1  = 22;
const ROOM_D   = ROOM_Z1 - ROOM_Z0;
const ROOM_W   = -HALF_W - ROOM_X0;  // 8  (x: -10..-2)

// Right room z-range, offset 10 units further down the hall.
const RROOM_Z0 = ROOM_Z0 + 10;   // 14
const RROOM_Z1 = ROOM_Z1 + 10;   // 32
const RROOM_D  = RROOM_Z1 - RROOM_Z0;

const sideFloor = new Rectangle({
  corner: new Point(ROOM_X0, 0, ROOM_Z0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  ROOM_W,
  height: ROOM_D,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: floorMat,
});

const sideCeiling = new Rectangle({
  corner: new Point(ROOM_X0, CEIL_H, ROOM_Z0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  ROOM_W,
  height: ROOM_D,
  normal: new Vector(0, -1, 0),
  orientation: "xzAxis",
  material: ceilMat,
});

// Outer (far) wall of side room at x = -7
const sideOuterWall = new Rectangle({
  corner: new Point(ROOM_X0, 0, ROOM_Z0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  ROOM_D,
  height: CEIL_H,
  normal: new Vector(1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

// Near wall of side room (z = 7, visible at angle through the door)
const sideNearWall = new Rectangle({
  corner: new Point(ROOM_X0, 0, ROOM_Z0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  ROOM_W,
  height: CEIL_H,
  normal: new Vector(0, 0, 1),
  orientation: "xyAxis",
  material: wallMat,
});

// Far wall of side room (z = 15)
const sideFarWall = new Rectangle({
  corner: new Point(ROOM_X0, 0, ROOM_Z1),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  ROOM_W,
  height: CEIL_H,
  normal: new Vector(0, 0, -1),
  orientation: "xyAxis",
  material: wallMat,
});

// ─── Ceiling light panels ─────────────────────────────────────────────────────
// 1.6 × 0.9 emissive quads just below the ceiling, warm fluorescent yellow.
// Winding clockwise from above → stored normal (0, −1, 0).

function makePanel(zCenter: number): Mesh {
  const LW  = 0.5;
  const LD  = 0.28;
  const y   = CEIL_H - 0.01;
  const mat = new Material({
    albedo:   new Color(1, 0.95, 0.8),
    emissive: new Color(5, 4.2, 2.0),
  });

  const p0 = new Vector(-LW, y, zCenter - LD);
  const p1 = new Vector( LW, y, zCenter - LD);
  const p2 = new Vector( LW, y, zCenter + LD);
  const p3 = new Vector(-LW, y, zCenter + LD);

  const t1 = new Triangle({ v1: p0, v2: p2, v3: p1, material: mat });
  const t2 = new Triangle({ v1: p0, v2: p3, v3: p2, material: mat });

  return new Mesh({ name: "light", material: mat, meshObjects: [t1, t2] });
}

const lights = [2, 8, 14, 20, 28, 36, 44, 52].map(makePanel);

// ─── Side-room light ──────────────────────────────────────────────────────────
// One dim panel centred in the side room — half the hallway brightness so it
// reads as a different, gloomier space rather than pitch black.
const sideRoomLight = (() => {
  const LW  = 0.5;
  const LD  = 0.28;
  const xc  = (ROOM_X0 - HALF_W) / 2;   // -4.5
  const zc  = (ROOM_Z0 + ROOM_Z1) / 2;  // 11
  const y   = CEIL_H - 0.01;
  const mat = new Material({
    albedo:   new Color(1, 0.95, 0.8),
    emissive: new Color(2.5, 2.1, 1.0),
  });
  const p0 = new Vector(xc - LW, y, zc - LD);
  const p1 = new Vector(xc + LW, y, zc - LD);
  const p2 = new Vector(xc + LW, y, zc + LD);
  const p3 = new Vector(xc - LW, y, zc + LD);
  return new Mesh({ name: "light", material: mat, meshObjects: [
    new Triangle({ v1: p0, v2: p2, v3: p1, material: mat }),
    new Triangle({ v1: p0, v2: p3, v3: p2, material: mat }),
  ]});
})();

// ─── Side room off the right: x = +2..+10, z = 14..32 ───────────────────────

const rightSideFloor = new Rectangle({
  corner: new Point(HALF_W, 0, RROOM_Z0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  ROOM_W,
  height: RROOM_D,
  normal: new Vector(0, 1, 0),
  orientation: "xzAxis",
  material: floorMat,
});

const rightSideCeiling = new Rectangle({
  corner: new Point(HALF_W, CEIL_H, RROOM_Z0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 0, 1),
  width:  ROOM_W,
  height: RROOM_D,
  normal: new Vector(0, -1, 0),
  orientation: "xzAxis",
  material: ceilMat,
});

const rightSideOuterWall = new Rectangle({
  corner: new Point(HALF_W + ROOM_W, 0, RROOM_Z0),
  v1: new Vector(0, 1, 0),
  v2: new Vector(0, 0, 1),
  width:  RROOM_D,
  height: CEIL_H,
  normal: new Vector(-1, 0, 0),
  orientation: "yzAxis",
  material: wallMat,
});

const rightSideNearWall = new Rectangle({
  corner: new Point(HALF_W, 0, RROOM_Z0),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  ROOM_W,
  height: CEIL_H,
  normal: new Vector(0, 0, 1),
  orientation: "xyAxis",
  material: wallMat,
});

const rightSideFarWall = new Rectangle({
  corner: new Point(HALF_W, 0, RROOM_Z1),
  v1: new Vector(1, 0, 0),
  v2: new Vector(0, 1, 0),
  width:  ROOM_W,
  height: CEIL_H,
  normal: new Vector(0, 0, -1),
  orientation: "xyAxis",
  material: wallMat,
});

const rightSideRoomLight = (() => {
  const LW  = 0.5;
  const LD  = 0.28;
  const xc  = HALF_W + ROOM_W / 2;           // 6
  const zc  = (RROOM_Z0 + RROOM_Z1) / 2;    // 23
  const y   = CEIL_H - 0.01;
  const mat = new Material({
    albedo:   new Color(1, 0.95, 0.8),
    emissive: new Color(2.5, 2.1, 1.0),
  });
  const p0 = new Vector(xc - LW, y, zc - LD);
  const p1 = new Vector(xc + LW, y, zc - LD);
  const p2 = new Vector(xc + LW, y, zc + LD);
  const p3 = new Vector(xc - LW, y, zc + LD);
  return new Mesh({ name: "light", material: mat, meshObjects: [
    new Triangle({ v1: p0, v2: p2, v3: p1, material: mat }),
    new Triangle({ v1: p0, v2: p3, v3: p2, material: mat }),
  ]});
})();

// ─── Teapot at the end of the hallway ────────────────────────────────────────
// OBJ native bounds: x 0.66..3.47, y 5.92..7.43, z 2.43..4.17
// translate centres x at 0, puts y bottom at floor, centres z at ~25 (50% closer than before).

const teapot = parseMesh({
  mesh: teapotMesh,
  name: "teapot",
  scale:     1.0,
  translate: { x: -2.07, y: -5.92, z: 28.5 },
  material:  new Material({ albedo: new Color(0.02, 0.02, 0.02) }),
});

// ─── Scene export ─────────────────────────────────────────────────────────────

export const sceneObjects: SceneObject[] = [
  floor, ceiling,
  backWall, frontWall,
  // Left wall split around the door
  leftWallPreDoor, leftWallPostDoor, aboveDoor,
  // Right wall split around the door
  rightWallPreDoor, rightWallPostDoor, aboveRightDoor,
  // Left side room
  sideFloor, sideCeiling, sideOuterWall, sideNearWall, sideFarWall,
  // Right side room
  rightSideFloor, rightSideCeiling, rightSideOuterWall, rightSideNearWall, rightSideFarWall,
  // Overhead lights
  ...lights,
  sideRoomLight,
  rightSideRoomLight,
  // Teapot
  teapot,
];
