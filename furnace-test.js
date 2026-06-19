/**
 * Furnace test for the path tracer.
 *
 * Setup: a large emissive sphere (the "furnace") emitting constant radiance L=1
 * from all directions, with a single Lambertian sphere of albedo r at the center.
 *
 * Expected result (energy-conserving Lambertian BRDF):
 *   background pixels  → 1.0 (raw linear, before gamma)
 *   sphere pixels      → r   (e.g. 0.5 for half-albedo, 1.0 for white = invisible)
 *
 * We render three side-by-side crops:
 *   left:   albedo = 1.0  → sphere should be invisible (same as background)
 *   centre: albedo = 0.5  → sphere should appear at ~50% brightness
 *   right:  albedo = 0.18 → 18% grey (common reference reflectance)
 *
 * NEE is disabled so energy accounting is clean (no double-counting).
 */

'use strict';

const fs = require('fs');
const zlib = require('zlib');

const W = 300, H = 300, SAMPLES = 64, MAX_DEPTH = 8;
const EPS = 1e-5;

// ---------------------------------------------------------------------------
// Math
// ---------------------------------------------------------------------------

class Vec3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  mul(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v) { return new Vec3(this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.z, this.x*v.y - this.y*v.x); }
  len() { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); }
  norm() { const l = this.len(); return new Vec3(this.x/l, this.y/l, this.z/l); }
}

class Color {
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
  add(c) { return new Color(this.r + c.r, this.g + c.g, this.b + c.b); }
  mulC(c) { return new Color(this.r * c.r, this.g * c.g, this.b * c.b); }
  mulS(s) { return new Color(this.r * s, this.g * s, this.b * s); }
  div(s) { return new Color(this.r / s, this.g / s, this.b / s); }
  gamma(e = 1/2.2) { return new Color(Math.pow(Math.max(0,this.r),e), Math.pow(Math.max(0,this.g),e), Math.pow(Math.max(0,this.b),e)); }
  clamp() { return new Color(Math.min(1,Math.max(0,this.r)), Math.min(1,Math.max(0,this.g)), Math.min(1,Math.max(0,this.b))); }
  toRGB() { const c = this.clamp(); return [Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255)]; }
}

const BLACK = new Color(0, 0, 0);

// ---------------------------------------------------------------------------
// Cosine-weighted hemisphere sampling (Malley + Gram-Schmidt ONB)
// ---------------------------------------------------------------------------

function cosineSample(normal) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const r = Math.sqrt(v);
  const lx = r * Math.cos(theta), ly = r * Math.sin(theta), lz = Math.sqrt(1 - v);
  const up = Math.abs(normal.y) < 0.999 ? new Vec3(0,1,0) : new Vec3(1,0,0);
  const tangent = up.cross(normal).norm();
  const bitangent = normal.cross(tangent);
  return tangent.mul(lx).add(bitangent.mul(ly)).add(normal.mul(lz)).norm();
}

// ---------------------------------------------------------------------------
// Sphere primitive
// ---------------------------------------------------------------------------

class Sphere {
  constructor(cx, cy, cz, radius, albedo, emissive = null) {
    this.center = new Vec3(cx, cy, cz);
    this.radius = radius;
    this.albedo = albedo;
    this.emissive = emissive;
  }

  intersect(ro, rd) {
    const oc = ro.sub(this.center);
    const b = 2 * oc.dot(rd);
    const c = oc.dot(oc) - this.radius * this.radius;
    const disc = b*b - 4*c; // a=1 since rd is normalised
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / 2;
    if (t1 > EPS) return t1;
    const t2 = (-b + sq) / 2;
    return t2 > EPS ? t2 : null;
  }

  normalAt(p) { return p.sub(this.center).norm(); }
}

// ---------------------------------------------------------------------------
// Render one panel (one albedo value)
// ---------------------------------------------------------------------------

function renderPanel(albedo) {
  // Scene: furnace (large emissive sphere) + test sphere at centre
  const furnace = new Sphere(0, 0, 0, 1000, new Color(1,1,1), new Color(1,1,1));
  const testSphere = new Sphere(0, 0, 0, 1, albedo, null);
  const scene = [furnace, testSphere];

  function intersect(ro, rd) {
    let minT = Infinity, hit = null;
    for (const obj of scene) {
      const t = obj.intersect(ro, rd);
      if (t !== null && t < minT) { minT = t; hit = obj; }
    }
    return hit ? { t: minT, obj: hit } : null;
  }

  // Pure path tracing, no NEE, so energy accounting is exact
  function trace(ro, rd, depth) {
    if (depth > MAX_DEPTH) return BLACK;
    const hit = intersect(ro, rd);
    if (!hit) return new Color(1, 1, 1); // furnace emits 1 everywhere

    const { t, obj } = hit;
    const P = ro.add(rd.mul(t));

    if (obj.emissive) return obj.emissive;

    const rawNormal = obj.normalAt(P);
    // Face normal: ensure it points against the incoming ray
    const normal = rawNormal.dot(rd) < 0 ? rawNormal : rawNormal.mul(-1);

    const indirDir = cosineSample(normal);
    const indirO = P.add(normal.mul(EPS));
    // Weight = albedo (cosine-weighted sampling cancels BRDF/PDF)
    return obj.albedo.mulC(trace(indirO, indirDir, depth + 1));
  }

  // Camera: orthographic from the front, looking at the sphere
  // Use perspective from z=-4 toward origin so we see the sphere clearly
  const camZ = -4;
  const pixels = new Array(W * H);
  let spherePixels = [], bgPixels = [];

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      let color = BLACK;
      // Small angle — scale ±1.5 world units across the image
      const cx = (col - W/2 + 0.5) / W * 3;
      const cy = (H/2 - row + 0.5) / H * 3;

      // Determine if this pixel is over the sphere (for stats)
      const overSphere = (cx*cx + cy*cy) < 1.0;

      for (let s = 0; s < SAMPLES; s++) {
        const jx = (Math.random() - 0.5) / W * 3;
        const jy = (Math.random() - 0.5) / H * 3;
        const ro = new Vec3(cx + jx, cy + jy, camZ);
        const rd = new Vec3(0, 0, 1); // orthographic — rays parallel
        color = color.add(trace(ro, rd, 0));
      }
      const linear = color.div(SAMPLES);
      if (overSphere) spherePixels.push((linear.r + linear.g + linear.b) / 3);
      else            bgPixels.push((linear.r + linear.g + linear.b) / 3);
      pixels[row * W + col] = linear.gamma().clamp().toRGB();
    }
    if ((row + 1) % 30 === 0 || row === H - 1)
      process.stdout.write(`\r  albedo=${albedo.r.toFixed(2)} rendering... ${Math.round((row+1)/H*100)}%`);
  }
  process.stdout.write('\n');

  const avg = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
  console.log(`  sphere avg (linear): ${avg(spherePixels).toFixed(4)}  (expected ${albedo.r.toFixed(4)})`);
  console.log(`  bg avg (linear):     ${avg(bgPixels).toFixed(4)}  (expected 1.0000)`);

  return pixels;
}

// ---------------------------------------------------------------------------
// Render three panels and assemble side-by-side
// ---------------------------------------------------------------------------

const TOTAL_W = W * 3;
const TOTAL_H = H;

const panels = [
  { label: 'albedo=1.0 (invisible)', albedo: new Color(1, 1, 1) },
  { label: 'albedo=0.5',             albedo: new Color(0.5, 0.5, 0.5) },
  { label: 'albedo=0.18 (18% grey)', albedo: new Color(0.18, 0.18, 0.18) },
];

const finalPixels = new Array(TOTAL_W * TOTAL_H);

for (let p = 0; p < panels.length; p++) {
  const { label, albedo } = panels[p];
  console.log(`Panel ${p + 1}: ${label}`);
  const panelPixels = renderPanel(albedo);
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      finalPixels[row * TOTAL_W + p * W + col] = panelPixels[row * W + col];
    }
  }
}

// ---------------------------------------------------------------------------
// Write PNG
// ---------------------------------------------------------------------------

function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}
const CRC_TABLE = makeCrcTable();
function crc32(buf, s, e) { let c=0xffffffff; for(let i=s;i<e;i++) c=CRC_TABLE[(c^buf[i])&0xff]^(c>>>8); return(c^0xffffffff)>>>0; }
function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length);
  return out;
}

const sig = Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(TOTAL_W, 0); ihdr.writeUInt32BE(TOTAL_H, 4);
ihdr[8] = 8; ihdr[9] = 2;

const raw = Buffer.alloc(TOTAL_H * (1 + TOTAL_W * 3));
for (let row = 0; row < TOTAL_H; row++) {
  raw[row * (1 + TOTAL_W * 3)] = 0;
  for (let col = 0; col < TOTAL_W; col++) {
    const [r,g,b] = finalPixels[row * TOTAL_W + col];
    const base = row * (1 + TOTAL_W * 3) + 1 + col * 3;
    raw[base] = r; raw[base+1] = g; raw[base+2] = b;
  }
}

const png = Buffer.concat([
  sig,
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
  pngChunk('IEND', Buffer.alloc(0))
]);

const outPath = '/home/user/Another-JS-Raytracer/furnace-test.png';
fs.writeFileSync(outPath, png);
console.log(`\nWritten to ${outPath}`);
