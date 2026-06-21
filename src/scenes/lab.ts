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

export const cameraStart = new Point(0, 2.2, -1.8);
export const rotateCamera = (dir: Vector) =>
  dir.multiplyWith3x3Matrix(getRotationXMatrix(10));

export const sigma_t = 0.13;
export const sigma_s = 0.11;
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
const rackMat     = new Material({ albedo: new Color(0.62, 0.44, 0.22), roughness: 0.50 });

const liquids = {
  red:   new Material({ albedo: new Color(0.80, 0.04, 0.04) }),
  blue:  new Material({ albedo: new Color(0.04, 0.08, 0.90) }),
  amber: new Material({ albedo: new Color(0.90, 0.55, 0.04) }),
  teal:  new Material({ albedo: new Color(0.04, 0.70, 0.60) }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tubeRack(cx: number, cz: number, n: number, spacing: number, angleDeg = 0, yBase = 0, scale = 1): SceneObject[] {
  const θ = angleDeg * Math.PI / 180;
  const cosT = Math.cos(θ), sinT = Math.sin(θ);
  const p = (lx: number, ly: number, lz: number) =>
    new Vector(cx + lx * cosT - lz * sinT, yBase + ly, cz + lx * sinT + lz * cosT);

  const hw = (n - 1) * spacing / 2 + 0.14 * scale;
  const d = 0.20 * scale;
  const m = rackMat;
  const tris: Triangle[] = [];

  const bar = (ly0: number, ly1: number) => {
    tris.push(new Triangle({ v1: p(-hw, ly1, -d/2), v2: p( hw, ly1,  d/2), v3: p(-hw, ly1,  d/2), material: m }));
    tris.push(new Triangle({ v1: p(-hw, ly1, -d/2), v2: p( hw, ly1, -d/2), v3: p( hw, ly1,  d/2), material: m }));
    tris.push(new Triangle({ v1: p(-hw, ly0, -d/2), v2: p( hw, ly1, -d/2), v3: p(-hw, ly1, -d/2), material: m }));
    tris.push(new Triangle({ v1: p(-hw, ly0, -d/2), v2: p( hw, ly0, -d/2), v3: p( hw, ly1, -d/2), material: m }));
  };

  bar(-0.05*scale, 0.10*scale);
  bar(0.50*scale,  0.57*scale);

  const lp = p(-hw + 0.07*scale, -0.05*scale, 0);
  const rp = p( hw - 0.07*scale, -0.05*scale, 0);
  return [
    new Mesh({ name: "rackBars", material: m, meshObjects: tris }),
    new Cylinder({ center: new Point(lp.x, lp.y, lp.z), radius: 0.07*scale, height: 0.62*scale, material: m }),
    new Cylinder({ center: new Point(rp.x, rp.y, rp.z), radius: 0.07*scale, height: 0.62*scale, material: m }),
  ];
}

function alcoveRack(cx: number, cy: number, cz: number, n: number, spacing: number, angleDeg = 0): SceneObject[] {
  const θ = angleDeg * Math.PI / 180;
  const cosT = Math.cos(θ), sinT = Math.sin(θ);
  const p = (lx: number, ly: number, lz: number) =>
    new Vector(cx + lx * cosT - lz * sinT, cy + ly, cz + lx * sinT + lz * cosT);

  const hw = (n - 1) * spacing / 2 + 0.08;
  const d = 0.13;
  const m = rackMat;
  const tris: Triangle[] = [];

  const bar = (ly0: number, ly1: number) => {
    tris.push(new Triangle({ v1: p(-hw, ly1, -d/2), v2: p( hw, ly1,  d/2), v3: p(-hw, ly1,  d/2), material: m }));
    tris.push(new Triangle({ v1: p(-hw, ly1, -d/2), v2: p( hw, ly1, -d/2), v3: p( hw, ly1,  d/2), material: m }));
    tris.push(new Triangle({ v1: p(-hw, ly0, -d/2), v2: p( hw, ly1, -d/2), v3: p(-hw, ly1, -d/2), material: m }));
    tris.push(new Triangle({ v1: p(-hw, ly0, -d/2), v2: p( hw, ly0, -d/2), v3: p( hw, ly1, -d/2), material: m }));
  };
  bar(0, 0.07);
  bar(0.42, 0.48);

  const lp = p(-hw + 0.045, 0, 0);
  const rp = p( hw - 0.045, 0, 0);
  return [
    new Mesh({ name: "alcoveRackBars", material: m, meshObjects: tris }),
    new Cylinder({ center: new Point(lp.x, lp.y, lp.z), radius: 0.035, height: 0.50, material: m }),
    new Cylinder({ center: new Point(rp.x, rp.y, rp.z), radius: 0.035, height: 0.50, material: m }),
  ];
}

function alcoveRackWithTubes(cx: number, cy: number, cz: number, n: number, spacing: number, angleDeg: number, colors: Material[]): SceneObject[] {
  const θ = angleDeg * Math.PI / 180;
  const cosT = Math.cos(θ), sinT = Math.sin(θ);
  const objs = alcoveRack(cx, cy, cz, n, spacing, angleDeg);
  for (let i = 0; i < n; i++) {
    const lx = (i - (n - 1) / 2) * spacing;
    const tx = cx + lx * cosT;
    const tz = cz + lx * sinT;
    for (const o of alcoveTube(tx, cy, tz, colors[i % colors.length])) objs.push(o);
  }
  return objs;
}

function testTube(x: number, z: number, liquid: Material, yBase = 0, scale = 1): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, yBase, z), radius: 0.09*scale,  height: 1.00*scale, material: glassMat }),
    new Cylinder({ center: new Point(x, yBase, z), radius: 0.062*scale, height: 0.65*scale, material: liquid  }),
  ];
}

function alcoveTube(x: number, y: number, z: number, liquid: Material): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, y,      z), radius: 0.055, height: 0.60, material: glassMat }),
    new Cylinder({ center: new Point(x, y,      z), radius: 0.038, height: 0.38, material: liquid  }),
    new Cylinder({ center: new Point(x, y+0.53, z), radius: 0.060, height: 0.08, material: capMat  }),
  ];
}

function candle(x: number, y: number, z: number, scale = 1): SceneObject[] {
  return [
    new Cylinder({ center: new Point(x, y,             z), radius: 0.045*scale, height: 0.28*scale, material: candleWax   }),
    new Cylinder({ center: new Point(x, y+0.30*scale,  z), radius: 0.022*scale, height: 0.07*scale, material: candleFlame }),
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

// ─── Table — lab bench, top at y=1.0 ─────────────────────────────────────────
// Footprint: x −1.5…2.5, z 1.3…3.3; pulled closer to camera
sceneObjects.push(new Rectangle({
  corner: new Point(-1.5, 1.0, 1.3),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: 4.0, height: 2.0,
  normal: new Vector(0, 1, 0), orientation: "xzAxis",
  material: benchTop,
}));
sceneObjects.push(new Rectangle({
  corner: new Point(-1.5, 0.88, 1.3),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
  width: 4.0, height: 0.12,
  normal: new Vector(0, 0, -1), orientation: "xyAxis",
  material: benchSide,
}));
for (const [lx, lz] of [[-1.38, 3.18], [-1.38, 1.42], [2.38, 3.18], [2.38, 1.42]] as [number,number][]) {
  sceneObjects.push(new Cylinder({ center: new Point(lx, -0.6, lz), radius: 0.10, height: 1.48, material: legMat }));
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

// ─── Arched alcove entrance ───────────────────────────────────────────────────
// Narrowed entrance (−1.8 → 1.8) gives radius=1.8, spring line at y=2.2
{
  const EX0 = -1.8, EX1 = 1.8;
  const arch_r  = (EX1 - EX0) / 2;   // 1.8
  const arch_cy = AY1 - arch_r;       // spring line at y=2.2
  const ARCH_N  = 24;
  const archPt  = (a: number) => new Vector(arch_r * Math.cos(a), arch_cy + arch_r * Math.sin(a), AZ0);

  // Wall panels filling the gap between alcove width and entrance width
  for (const [x0, w] of [[AX0, EX0 - AX0], [EX1, AX1 - EX1]] as [number, number][]) {
    sceneObjects.push(new Rectangle({
      corner: new Point(x0, AY0, AZ0),
      v1: new Vector(1, 0, 0), v2: new Vector(0, 1, 0),
      width: w, height: AY1 - AY0,
      normal: new Vector(0, 0, -1), orientation: "xyAxis",
      material: wallMat,
    }));
  }

  // Spandrel triangles — wall fill in corners above spring line
  const archTris: Triangle[] = [];
  for (let i = 0; i < ARCH_N; i++) {
    const a0 = Math.PI * i / ARCH_N;
    const a1 = Math.PI * (i + 1) / ARCH_N;
    const P0 = archPt(a0), P1 = archPt(a1);
    if (i < ARCH_N / 2) {
      // Right spandrel — fan from (EX1, AY1)
      archTris.push(new Triangle({ v1: P1, v2: P0, v3: new Vector(EX1, AY1, AZ0), material: wallMat }));
    } else {
      // Left spandrel — fan from (EX0, AY1)
      archTris.push(new Triangle({ v1: new Vector(EX0, AY1, AZ0), v2: P1, v3: P0, material: wallMat }));
    }
  }
  sceneObjects.push(new Mesh({ name: "archSpandrel", material: wallMat, meshObjects: archTris }));
}

// ─── Alcove interior ─────────────────────────────────────────────────────────
// Floor at y=AY0
sceneObjects.push(new Rectangle({
  corner: new Point(AX0, AY0, AZ0),
  v1: new Vector(1, 0, 0), v2: new Vector(0, 0, 1),
  width: AX1 - AX0, height: AZ1 - AZ0,
  normal: new Vector(0, 1, 0), orientation: "xzAxis",
  material: alcoveMat,
}));
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

// Lower shelf — 8 items + 3 mini-racks
const lowerItems: [number, number, 'candle'|'flask'][] = [
  [-3.1, 7.32, 'candle'],
  [-1.9, 8.08, 'candle'],
  [-1.4, 7.50, 'flask' ],
  [-0.8, 7.82, 'candle'],
  [ 0.4, 7.38, 'flask' ],
  [ 1.0, 7.95, 'candle'],
  [ 2.4, 8.08, 'candle'],
  [ 3.1, 7.44, 'candle'],
];
for (const [x, z, type] of lowerItems) {
  if (type === 'candle') {
    for (const o of candle(x, SY1, z)) sceneObjects.push(o);
  } else {
    for (const o of makeErlenmeyer(x, z, 0.55, backFlaskMat, liquids.red, SY1)) sceneObjects.push(o);
  }
}
for (const o of alcoveRackWithTubes(-2.5, SY1, 7.90, 3, 0.14, -15, [liquids.red,  liquids.amber, liquids.teal])) sceneObjects.push(o);
for (const o of alcoveRackWithTubes(-0.2, SY1, 8.16, 2, 0.14,  10, [liquids.blue, liquids.red                ])) sceneObjects.push(o);
for (const o of alcoveRackWithTubes( 1.6, SY1, 7.60, 3, 0.14, -10, [liquids.teal, liquids.amber, liquids.blue])) sceneObjects.push(o);

// Upper shelf — 8 items + 2 mini-racks
const upperItems: [number, number, 'candle'|'vase'][] = [
  [-3.0, 7.84, 'vase'  ],
  [-2.3, 7.50, 'candle'],
  [-0.9, 7.36, 'vase'  ],
  [-0.2, 7.78, 'candle'],
  [ 0.6, 8.14, 'vase'  ],
  [ 1.9, 7.92, 'candle'],
  [ 2.6, 7.40, 'vase'  ],
  [ 3.2, 8.06, 'candle'],
];
for (const [x, z, type] of upperItems) {
  if (type === 'candle') {
    for (const o of candle(x, SY2, z)) sceneObjects.push(o);
  } else {
    sceneObjects.push(new Cylinder({ center: new Point(x, SY2, z), radius: 0.065, height: 0.38, material: frostedWhite }));
  }
}
for (const o of alcoveRackWithTubes(-1.6, SY2, 8.10, 2, 0.14,  15, [liquids.amber, liquids.red               ])) sceneObjects.push(o);
for (const o of alcoveRackWithTubes( 1.2, SY2, 7.55, 3, 0.14, -12, [liquids.blue,  liquids.teal, liquids.amber])) sceneObjects.push(o);

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

// ─── Stools ───────────────────────────────────────────────────────────────────
sceneObjects.push(new Cylinder({ center: new Point(-0.8, 0.58, 0.65), radius: 0.28, height: 0.05, material: benchTop }));
for (const [sx, sz] of [[-1.02, 0.87], [-1.02, 0.43], [-0.58, 0.87], [-0.58, 0.43]] as [number,number][]) {
  sceneObjects.push(new Cylinder({ center: new Point(sx, -0.6, sz), radius: 0.05, height: 1.18, material: legMat }));
}
sceneObjects.push(new Cylinder({ center: new Point(1.2, 0.58, 0.80), radius: 0.28, height: 0.05, material: benchTop }));
for (const [sx, sz] of [[0.98, 1.02], [0.98, 0.58], [1.42, 1.02], [1.42, 0.58]] as [number,number][]) {
  sceneObjects.push(new Cylinder({ center: new Point(sx, -0.6, sz), radius: 0.05, height: 1.18, material: legMat }));
}

// ─── Table items ──────────────────────────────────────────────────────────────
const TABLE_Y = 1.0;

// Test tube rack — right of centre, angled slightly toward camera
const RACK_CX = 0.9, RACK_CZ = 1.8, RACK_N = 4, RACK_SP = 0.18, RACK_ANG = 18;
const rack_θ = RACK_ANG * Math.PI / 180;
for (const o of tubeRack(RACK_CX, RACK_CZ, RACK_N, RACK_SP, RACK_ANG, TABLE_Y, 0.60)) sceneObjects.push(o);
const rackLiquids = [liquids.red, liquids.teal, liquids.amber, liquids.blue];
for (let i = 0; i < RACK_N; i++) {
  const lx = (i - (RACK_N - 1) / 2) * RACK_SP;
  const tx = RACK_CX + lx * Math.cos(rack_θ);
  const tz = RACK_CZ + lx * Math.sin(rack_θ);
  for (const o of testTube(tx, tz, rackLiquids[i], TABLE_Y, 0.60)) sceneObjects.push(o);
}

// Erlenmeyers — left 1/3 (dominant) and back-right (shorter accent)
for (const o of makeErlenmeyer(-1.1, 2.8, 0.72, flaskMat,     liquids.amber, TABLE_Y)) sceneObjects.push(o);
for (const o of makeErlenmeyer( 1.9, 2.9, 0.75, backFlaskMat, liquids.red,   TABLE_Y)) sceneObjects.push(o);

// Faceted crystal ball — centre-left, catches window light from right
sceneObjects.push(parseMesh({
  mesh: icosahedron,
  material: new Material({ albedo: new Color(0, 0, 0), refractionIndex: 1.9 }),
  name: "crystalBall",
  scale: 0.22,
  translate: { x: -0.4, y: TABLE_Y + 0.22, z: 2.35 },
}));

// Frosted sphere — background-right accent
sceneObjects.push(new Sphere({
  center: new Point(1.6, TABLE_Y + 0.15, 3.0),
  radius: 0.15,
  material: frostedWhite,
}));

// Candle — back-right, warm point light in the fog
for (const o of candle(1.5, TABLE_Y, 2.0, 0.9)) sceneObjects.push(o);
