import { Color } from "../Color.js";
import { Point } from "../Point.js";
import { Vector } from "../Vector.js";
import { Rectangle } from "../Rectangle.js";
import { SceneObject } from "../types.js";
import { Material } from "../Material.js";
import { Mesh } from "../Mesh.js";
import { Triangle } from "../Triangle.js";
import { Cylinder } from "../Cylinder.js";
import { Sphere } from "../Sphere.js";
import { getRotationXMatrix } from "../matrix.js";
import { parseMesh } from "../meshUtils.js";
import { icosahedron } from "../meshes/icosahedron.js";

export const cameraStart = new Point(0, 2.2, -3.2);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(10));

export const sigma_t = 0.10;
export const sigma_s = 0.09;
export const phaseG  = 0.0;
export const skyFn = (_dir: Vector) => new Color(0, 0, 0);

// ─── Wood grain ───────────────────────────────────────────────────────────────
function woodGrain(point: Point): Color {
  const grain = point.x * 2.0
    + Math.sin(point.z * 6.0) * 0.30
    + Math.sin(point.z * 14.0 + point.x * 4.0) * 0.10
    + Math.sin(point.x * 11.0 - point.z * 3.8) * 0.07;
  const t = Math.pow((Math.sin(grain * 9.0) + 1) * 0.5, 2);
  const light = new Color(0.68, 0.48, 0.26);
  const dark  = new Color(0.35, 0.22, 0.09);
  return new Color(light.r*(1-t)+dark.r*t, light.g*(1-t)+dark.g*t, light.b*(1-t)+dark.b*t);
}

// ─── Materials ────────────────────────────────────────────────────────────────
const benchTop    = new Material({ albedo: new Color(0.5, 0.35, 0.15), texture: (p) => woodGrain(p), roughness: 0.40 });
const benchSide   = new Material({ albedo: new Color(0.28, 0.18, 0.07) });
const legMat      = new Material({ albedo: new Color(0.22, 0.14, 0.06) });
const wallMat     = new Material({ albedo: new Color(0.22, 0.21, 0.20) });
const floorMat    = new Material({ albedo: new Color(0.12, 0.11, 0.10) });
const glassMat    = new Material({ albedo: new Color(0, 0, 0), refractionIndex: 1.5 });
const capMat      = new Material({ albedo: new Color(0.95, 0.95, 0.95) });
const flaskMat    = new Material({ albedo: new Color(0.18, 0.52, 0.28), roughness: 0.55, subsurface: 0.35 });
const backFlaskMat= new Material({ albedo: new Color(0.42, 0.02, 0.08), roughness: 0.30, subsurface: 0.20 });
const paperMat    = new Material({ albedo: new Color(0.93, 0.91, 0.86) });
const candleWax   = new Material({ albedo: new Color(0.94, 0.91, 0.84) });
const candleFlame = new Material({ albedo: new Color(1.0, 0.6, 0.1), emissive: new Color(6, 3, 0.5) });
const frostedWhite= new Material({ albedo: new Color(0.88, 0.88, 0.86), roughness: 0.35, subsurface: 0.20 });
const frostedGreen= new Material({ albedo: new Color(0.65, 0.88, 0.72), roughness: 0.40, subsurface: 0.15 });
const alcoveMat   = new Material({ albedo: new Color(0.55, 0.45, 0.32) });
const shelfMat    = new Material({ albedo: new Color(0.50, 0.38, 0.18) });
const slatMat     = new Material({ albedo: new Color(0.10, 0.07, 0.04) });

const liquids = {
  red:   new Material({ albedo: new Color(0.80, 0.04, 0.04) }),
  blue:  new Material({ albedo: new Color(0.04, 0.08, 0.90) }),
  amber: new Material({ albedo: new Color(0.90, 0.55, 0.04) }),
  teal:  new Material({ albedo: new Color(0.04, 0.70, 0.60) }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function testTube(x: number, z: number, liquid: Material): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, 0,    z), radius: 0.09,  height: 1.00, material: glassMat }),
    new Cylinder({ center: new Point(x, 0,    z), radius: 0.062, height: 0.65, material: liquid  }),
  ];
}

function alcoveTube(x: number, y: number, z: number, liquid: Material): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, y,      z), radius: 0.055, height: 0.60, material: glassMat }),
    new Cylinder({ center: new Point(x, y,      z), radius: 0.038, height: 0.38, material: liquid  }),
    new Cylinder({ center: new Point(x, y+0.53, z), radius: 0.060, height: 0.08, material: capMat  }),
  ];
}

function candle(x: number, y: number, z: number): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, y,      z), radius: 0.045, height: 0.28, material: candleWax   }),
    new Cylinder({ center: new Point(x, y+0.30, z), radius: 0.022, height: 0.07, material: candleFlame }),
  ];
}

function makeErlenmeyer(
  cx: number, cz: number, scale: number,
  flaskM: Material, liquidM: Material,
  yBase = 0
): SceneObject[] {
  const SEGS = 18;
  const profile: [number, number][] = [
    [0.00, 0.000], [0.30, 0.000], [0.32, 0.060], [0.32, 0.340],
    [0.22, 0.480], [0.07, 0.600], [0.07, 0.880],
  ];
  const tris: Triangle[] = [];
  const PI2 = Math.PI * 2;
  for (let pi = 0; pi < profile.length - 1; pi++) {
    const [r0, y0] = profile[pi];
    const [r1, y1] = profile[pi + 1];
    for (let s = 0; s < SEGS; s++) {
      const a0 = (s / SEGS) * PI2, a1 = ((s + 1) / SEGS) * PI2;
      const p00 = new Vector(cx + scale*r0*Math.cos(a0), scale*y0+yBase, cz + scale*r0*Math.sin(a0));
      const p01 = new Vector(cx + scale*r0*Math.cos(a1), scale*y0+yBase, cz + scale*r0*Math.sin(a1));
      const p10 = new Vector(cx + scale*r1*Math.cos(a0), scale*y1+yBase, cz + scale*r1*Math.sin(a0));
      const p11 = new Vector(cx + scale*r1*Math.cos(a1), scale*y1+yBase, cz + scale*r1*Math.sin(a1));
      if (r0 < 0.001) {
        tris.push(new Triangle({ v1: p00, v2: p10, v3: p11, material: flaskM }));
      } else {
        tris.push(new Triangle({ v1: p00, v2: p10, v3: p11, material: flaskM }));
        tris.push(new Triangle({ v1: p00, v2: p11, v3: p01, material: flaskM }));
      }
    }
  }
  const baseR = profile[1][0] * scale;
  for (let s = 0; s < SEGS; s++) {
    const a0 = (s / SEGS) * PI2, a1 = ((s + 1) / SEGS) * PI2;
    tris.push(new Triangle({
      v1: new Vector(cx, yBase, cz),
      v2: new Vector(cx + baseR*Math.cos(a1), yBase, cz + baseR*Math.sin(a1)),
      v3: new Vector(cx + baseR*Math.cos(a0), yBase, cz + baseR*Math.sin(a0)),
      material: flaskM,
    }));
  }
  return [
    new Mesh({ name: "erlenmeyer", material: flaskM, meshObjects: tris }),
    new Cylinder({ center: new Point(cx, 0.005+yBase, cz), radius: 0.26*scale, height: 0.22*scale, material: liquidM }),
  ];
}

export const sceneObjects: SceneObject[] = [];

// ─── Table — narrow, lifted on legs ──────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(-2.3, 0, 0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 3, height: 5.5,
  normal: new Vector(0, 1, 0), orientation: "xzAxis",
  material: benchTop,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(-2.3, -0.12, 0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 3, height: 0.12,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: benchSide,
}));
for (const [lx, lz] of [[-2.18, 0.14], [0.58, 0.14], [-2.18, 5.36], [0.58, 5.36]] as [number,number][]) {
  sceneObjects.push(new Cylinder({ center: new Point(lx, -0.6, lz), radius: 0.05, height: 0.48, material: legMat }));
}

// ─── Room ─────────────────────────────────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(-4, -0.6, -3),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 8, height: 13,
  normal: new Vector(0, 1, 0), orientation: "xzAxis",
  material: floorMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(-4, -0.6, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 13, height: 13,
  normal: new Vector(1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));

// ─── Back wall — almost entirely alcove ───────────────────────────────────────
const AX0 = -3.4, AX1 = 3.4;
const AY0 =  0.5, AY1 = 4.0;
const AZ0 =  7.0, AZ1 = 8.5;

// Top strip
sceneObjects.push(new Rectangle({
  corner: new Point(-4, AY1, AZ0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 8, height: 12.4 - AY1,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));
// Left flank
sceneObjects.push(new Rectangle({
  corner: new Point(-4, -0.6, AZ0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: AX0 + 4, height: AY1 + 0.6,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));
// Right flank
sceneObjects.push(new Rectangle({
  corner: new Point(AX1, -0.6, AZ0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 4 - AX1, height: AY1 + 0.6,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));
// Bottom strip
sceneObjects.push(new Rectangle({
  corner: new Point(AX0, -0.6, AZ0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: AX1 - AX0, height: AY0 + 0.6,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: wallMat,
}));

// ─── Alcove interior ──────────────────────────────────────────────────────────
sceneObjects.push(new Rectangle({
  corner: new Point(AX0, AY0, AZ0),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: AZ1 - AZ0, height: AY1 - AY0,
  normal: new Vector(1, 0, 0), orientation: "yzAxis",
  material: alcoveMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(AX1, AY0, AZ0),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: AZ1 - AZ0, height: AY1 - AY0,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: alcoveMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(AX0, AY0, AZ1),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: AX1 - AX0, height: AY1 - AY0,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: alcoveMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(AX0, AY1, AZ0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, (AZ1-AZ0)/(AX1-AX0)),
  width: AX1 - AX0, height: AZ1 - AZ0,
  normal: new Vector(0, -1, 0), orientation: "xzAxis",
  material: alcoveMat,
}));

// ─── Alcove glass panes ───────────────────────────────────────────────────────
// Two tall panes with a gap in the centre; slight green tint of thick glass
const GAP      = 0.22;
const PANE_T   = 0.10;
const paneMat  = new Material({ albedo: new Color(0.82, 0.94, 0.88), refractionIndex: 1.52 });

for (const [px0, px1, innerNX] of [
  [AX0,   -GAP,  1],   // left pane  — inner edge faces +x
  [ GAP,  AX1,  -1],   // right pane — inner edge faces -x
] as [number, number, number][]) {
  const pw = px1 - px0;
  // front face (facing camera)
  sceneObjects.push(new Rectangle({ corner: new Point(px0, AY0, AZ0),          v1: new Vector(1,0,0), v2: new Vector(0,1,0), width: pw,     height: AY1-AY0, normal: new Vector(0,0,-1),    orientation: "xyAxis", material: paneMat }));
  // back face (facing alcove interior)
  sceneObjects.push(new Rectangle({ corner: new Point(px0, AY0, AZ0+PANE_T),   v1: new Vector(1,0,0), v2: new Vector(0,1,0), width: pw,     height: AY1-AY0, normal: new Vector(0,0, 1),    orientation: "xyAxis", material: paneMat }));
  // inner edge (the cut face visible through the gap)
  const ex = innerNX > 0 ? px1 : px0;
  sceneObjects.push(new Rectangle({ corner: new Point(ex, AY0, AZ0),            v1: new Vector(0,1,0), v2: new Vector(0,0,1), height: AY1-AY0, width: PANE_T, normal: new Vector(innerNX,0,0), orientation: "yzAxis", material: paneMat }));
}

// ─── Alcove shelves ───────────────────────────────────────────────────────────
const SY1 = 1.5, SY2 = 2.8;
const SZmid = (AZ0 + AZ1) / 2;

for (const sy of [SY1, SY2]) {
  sceneObjects.push(new Rectangle({
    corner: new Point(AX0 + 0.06, sy, AZ0 + 0.05),
    v1: new Vector(1, 0, 0), v2: new Vector(0, 0, (AZ1-AZ0-0.20)/(AX1-AX0-0.12)),
    width: AX1 - AX0 - 0.12, height: AZ1 - AZ0 - 0.20,
    normal: new Vector(0, 1, 0), orientation: "xzAxis",
    material: shelfMat,
  }));
}

// ─── Alcove shelf items ───────────────────────────────────────────────────────
const tubeColors = [liquids.red, liquids.teal, liquids.amber, liquids.blue];
let ti = 0;

// Lower shelf — 11 items, chaotic spacing, varied z depth
const lowerItems: [number, number, 'candle'|'tube'|'flask'][] = [
  [-3.1, 7.32, 'candle'],
  [-2.5, 7.90, 'tube'  ],
  [-1.9, 8.08, 'candle'],
  [-1.4, 7.50, 'flask' ],
  [-0.8, 7.82, 'candle'],
  [-0.2, 8.16, 'tube'  ],
  [ 0.4, 7.38, 'flask' ],
  [ 1.0, 7.95, 'candle'],
  [ 1.6, 7.60, 'tube'  ],
  [ 2.4, 8.08, 'candle'],
  [ 3.1, 7.44, 'candle'],
];
for (const [x, z, type] of lowerItems) {
  if (type === 'candle') {
    for (const o of candle(x, SY1, z)) sceneObjects.push(o);
  } else if (type === 'tube') {
    for (const o of alcoveTube(x, SY1, z, tubeColors[ti++ % 4])) sceneObjects.push(o);
  } else {
    for (const o of makeErlenmeyer(x, z, 0.55, backFlaskMat, liquids.red, SY1)) sceneObjects.push(o);
  }
}

// Upper shelf — 10 items, varied types, chaotic z depth
const upperItems: [number, number, 'candle'|'vase'|'tube'][] = [
  [-3.0, 7.84, 'vase'  ],
  [-2.3, 7.50, 'candle'],
  [-1.6, 8.10, 'tube'  ],
  [-0.9, 7.36, 'vase'  ],
  [-0.2, 7.78, 'candle'],
  [ 0.6, 8.14, 'vase'  ],
  [ 1.2, 7.55, 'tube'  ],
  [ 1.9, 7.92, 'candle'],
  [ 2.6, 7.40, 'vase'  ],
  [ 3.2, 8.06, 'candle'],
];
for (const [x, z, type] of upperItems) {
  if (type === 'candle') {
    for (const o of candle(x, SY2, z)) sceneObjects.push(o);
  } else if (type === 'tube') {
    for (const o of alcoveTube(x, SY2, z, tubeColors[ti++ % 4])) sceneObjects.push(o);
  } else {
    sceneObjects.push(new Cylinder({ center: new Point(x, SY2, z), radius: 0.065, height: 0.38, material: frostedWhite }));
  }
}

// ─── Right wall with window ───────────────────────────────────────────────────
const WY0 = 0.5, WY1 = 4.5;
const WZ0 = 0.5, WZ1 = 3.7;

sceneObjects.push(new Rectangle({
  corner: new Point(4, -0.6, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 13, height: WY0 + 0.6,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(4, WY1, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 13, height: 13 - WY1,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(4, WY0, -3),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: WZ0 + 3, height: WY1 - WY0,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(4, WY0, WZ1),
  v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
  width: 10 - WZ1, height: WY1 - WY0,
  normal: new Vector(-1, 0, 0), orientation: "yzAxis",
  material: wallMat,
}));

// ─── Window slats ─────────────────────────────────────────────────────────────
// Vertical dividers (z)
for (const zs of [WZ0 + (WZ1-WZ0)/3, WZ0 + 2*(WZ1-WZ0)/3]) {
  sceneObjects.push(new Rectangle({
    corner: new Point(3.90, WY0, zs - 0.04),
    v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
    height: WY1 - WY0, width: 0.08,
    normal: new Vector(-1, 0, 0), orientation: "yzAxis",
    material: slatMat,
  }));
}
// Horizontal dividers (y)
for (const ys of [WY0 + (WY1-WY0)/4, WY0 + 2*(WY1-WY0)/4, WY0 + 3*(WY1-WY0)/4]) {
  sceneObjects.push(new Rectangle({
    corner: new Point(3.90, ys - 0.04, WZ0),
    v1: new Vector(0, 1, 0), v2: new Vector(0, 0, 1),
    height: 0.08, width: WZ1 - WZ0,
    normal: new Vector(-1, 0, 0), orientation: "yzAxis",
    material: slatMat,
  }));
}

// ─── Window light ─────────────────────────────────────────────────────────────
const LX = 4.05;
const sunMat = new Material({ albedo: new Color(1, 0.95, 0.80), emissive: new Color(22, 20, 14) });
sceneObjects.push(new Mesh({
  name: "windowLight",
  material: sunMat,
  meshObjects: [
    new Triangle({ v1: new Vector(LX, WY0, WZ0), v2: new Vector(LX, WY0, WZ1), v3: new Vector(LX, WY1, WZ1), material: sunMat }),
    new Triangle({ v1: new Vector(LX, WY0, WZ0), v2: new Vector(LX, WY1, WZ1), v3: new Vector(LX, WY1, WZ0), material: sunMat }),
  ],
}));

// ─── Paper ────────────────────────────────────────────────────────────────────
// 1.2×1.5 sheet rotated 15° CW around y, centred at (-0.2, 0, 1.5)
sceneObjects.push(new Mesh({
  name: "paper", material: paperMat,
  meshObjects: [
    new Triangle({ v1: new Vector(-1.774, 0.003, 0.930), v2: new Vector(-0.226, 0.003, 2.070), v3: new Vector(-1.386, 0.003, 2.380), material: paperMat }),
    new Triangle({ v1: new Vector(-1.774, 0.003, 0.930), v2: new Vector(-0.614, 0.003, 0.620), v3: new Vector(-0.226, 0.003, 2.070), material: paperMat }),
  ],
}));

// ─── Table items ──────────────────────────────────────────────────────────────

// Test tubes ×4 — scattered positions
const tubeLayout: [number, number, Material][] = [
  [ 0.3, 1.2, liquids.red  ],
  [-1.6, 2.3, liquids.teal ],
  [-0.5, 4.6, liquids.amber],
  [-1.0, 1.9, liquids.blue ],
];
for (const [x, z, mat] of tubeLayout) {
  for (const o of testTube(x, z, mat)) sceneObjects.push(o);
}

// Erlenmeyers ×2
for (const o of makeErlenmeyer(-0.1, 0.6, 1.8, flaskMat,     liquids.amber)) sceneObjects.push(o);
for (const o of makeErlenmeyer(-1.4, 3.5, 1.0, backFlaskMat, liquids.red  )) sceneObjects.push(o);

// Faceted crystal ball (icosahedron, IOR 1.9)
sceneObjects.push(parseMesh({
  mesh: icosahedron,
  material: new Material({ albedo: new Color(0, 0, 0), refractionIndex: 1.9 }),
  name: "crystalBall",
  scale: 0.30,
  translate: { x: -1.3, y: 0.32, z: 1.8 },
}));

// Frosted glass sphere
sceneObjects.push(new Sphere({
  center: new Point(-1.7, 0.22, 3.1),
  radius: 0.22,
  material: frostedWhite,
}));

// Frosted green vase (tall cylinder)
sceneObjects.push(new Cylinder({ center: new Point(-2.0, 0, 4.3), radius: 0.11, height: 0.70, material: frostedGreen }));

// Candles on table ×2
for (const o of candle(-1.9, 0, 0.8)) sceneObjects.push(o);
for (const o of candle(-1.3, 0, 3.5)) sceneObjects.push(o);

// ─── Stool (right of table) ───────────────────────────────────────────────────
sceneObjects.push(new Cylinder({ center: new Point(0.85, -0.12, 2.2), radius: 0.32, height: 0.07, material: benchTop }));
for (const [sx, sz] of [[0.63, 1.98], [1.07, 1.98], [0.63, 2.42], [1.07, 2.42]] as [number,number][]) {
  sceneObjects.push(new Cylinder({ center: new Point(sx, -0.6, sz), radius: 0.04, height: 0.48, material: legMat }));
}
