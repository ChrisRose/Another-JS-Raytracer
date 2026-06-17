/**
 * Standalone Node.js Cornell box path tracer.
 * Implements the same fixes applied to tracePaths.ts:
 * - Cosine-weighted hemisphere sampling (Malley's method + ONB)
 * - Correct albedo throughput weight
 * - 4-bounce path tracing
 * - Gamma correction (2.2)
 * - Per-pixel sample accumulation
 * - Next-event estimation against the area light
 */

'use strict';

const fs = require('fs');
const zlib = require('zlib');

const WIDTH = 400;
const HEIGHT = 400;
const SAMPLES = 32;
const MAX_DEPTH = 4;
const EPS = 1e-5;

// ---------------------------------------------------------------------------
// Math primitives
// ---------------------------------------------------------------------------

class Vec3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  mul(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v) {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  len() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  norm() { const l = this.len(); return new Vec3(this.x / l, this.y / l, this.z / l); }
}

class Color {
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
  add(c) { return new Color(this.r + c.r, this.g + c.g, this.b + c.b); }
  mulC(c) { return new Color(this.r * c.r, this.g * c.g, this.b * c.b); }
  mulS(s) { return new Color(this.r * s, this.g * s, this.b * s); }
  div(s) { return new Color(this.r / s, this.g / s, this.b / s); }
  gamma(e = 1 / 2.2) {
    return new Color(
      Math.pow(Math.max(0, this.r), e),
      Math.pow(Math.max(0, this.g), e),
      Math.pow(Math.max(0, this.b), e)
    );
  }
  clamp() {
    return new Color(
      Math.min(1, Math.max(0, this.r)),
      Math.min(1, Math.max(0, this.g)),
      Math.min(1, Math.max(0, this.b))
    );
  }
  toRGB() {
    const c = this.clamp();
    return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
  }
}

const BLACK = new Color(0, 0, 0);
const WHITE = new Color(1, 1, 1);
const RED   = new Color(0.75, 0.07, 0.07);
const GREEN = new Color(0.07, 0.75, 0.07);

// ---------------------------------------------------------------------------
// Cosine-weighted hemisphere sampling (Malley's method + Gram-Schmidt ONB)
// ---------------------------------------------------------------------------

function cosineSample(normal) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const r = Math.sqrt(v);
  const lx = r * Math.cos(theta);
  const ly = r * Math.sin(theta);
  const lz = Math.sqrt(1 - v); // z >= 0, upper hemisphere

  const up = Math.abs(normal.y) < 0.999 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
  const tangent = up.cross(normal).norm();
  const bitangent = normal.cross(tangent);

  return tangent.mul(lx).add(bitangent.mul(ly)).add(normal.mul(lz)).norm();
}

// ---------------------------------------------------------------------------
// Scene: Cornell box as axis-aligned planes + spheres
// ---------------------------------------------------------------------------

class Plane {
  // axis: 'x'|'y'|'z', value: position on that axis, side: +1 or -1 for normal direction
  constructor(axis, value, side, albedo, emissive = null, name = 'plane') {
    this.axis = axis;
    this.value = value;
    this.side = side;
    this.albedo = albedo;
    this.emissive = emissive;
    this.name = name;
  }

  intersect(ro, rd) {
    const d = rd[this.axis];
    if (Math.abs(d) < EPS) return null;
    const t = (this.value - ro[this.axis]) / d;
    return t > EPS ? t : null;
  }

  normalAt() {
    const s = this.side;
    return this.axis === 'x' ? new Vec3(s, 0, 0)
         : this.axis === 'y' ? new Vec3(0, s, 0)
         :                     new Vec3(0, 0, s);
  }
}

class Sphere {
  constructor(cx, cy, cz, radius, albedo, emissive = null, name = 'sphere') {
    this.center = new Vec3(cx, cy, cz);
    this.radius = radius;
    this.albedo = albedo;
    this.emissive = emissive;
    this.name = name;
  }

  intersect(ro, rd) {
    const oc = ro.sub(this.center);
    const a = rd.dot(rd);
    const b = 2 * oc.dot(rd);
    const c = oc.dot(oc) - this.radius * this.radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    if (t1 > EPS) return t1;
    const t2 = (-b + sq) / (2 * a);
    return t2 > EPS ? t2 : null;
  }

  normalAt(p) {
    return p.sub(this.center).norm();
  }
}

// Cornell box bounds (from OBJ vertex data):
//   x: -8 to 8, y: 0 to 18, z: -8 to 10
// Cornell box is open at the front — no front wall (camera looks in from z=-25).
const scene = [
  new Plane('y',  0,  1, WHITE, null, 'floor'),
  new Plane('y', 18, -1, WHITE, null, 'ceiling'),
  new Plane('z', 10, -1, WHITE, null, 'backWall'),
  new Plane('x', -8,  1, RED,   null, 'leftWall'),
  new Plane('x',  8, -1, GREEN, null, 'rightWall'),
];

const lightBall = new Sphere(0, 17, 1, 2, WHITE, new Color(8, 8, 8), 'lightBall');
scene.push(lightBall);

function ro(vec) { return { x: vec.x, y: vec.y, z: vec.z }; }

function intersect(rayO, rayD) {
  let minT = Infinity, hit = null;
  for (const obj of scene) {
    const t = obj.intersect(rayO, rayD);
    if (t !== null && t < minT) { minT = t; hit = obj; }
  }
  return hit ? { t: minT, obj: hit } : null;
}

// ---------------------------------------------------------------------------
// Path tracer
// ---------------------------------------------------------------------------

// includeEmission: true for camera rays and specular bounces; false for diffuse
// bounces where NEE already accounts for direct lighting (avoids double-counting).
function trace(rayO, rayD, depth, includeEmission = true) {
  if (depth > MAX_DEPTH) return BLACK;

  const hit = intersect(rayO, rayD);
  if (!hit) return BLACK; // no sky dome — only explicit lights contribute

  const { t, obj } = hit;
  const P = rayO.add(rayD.mul(t));

  if (obj.emissive) return includeEmission ? obj.emissive : BLACK;

  const normal = obj.normalAt ? obj.normalAt(P) : obj.normalAt();

  // Ensure normal points away from the incoming ray
  const faceNormal = normal.dot(rayD) < 0 ? normal : normal.mul(-1);
  const albedo = obj.albedo;

  // Indirect: single cosine-weighted bounce (weight = albedo, PDF cancels)
  const indirDir = cosineSample(faceNormal);
  const indirO = P.add(faceNormal.mul(EPS));
  // Diffuse bounce: NEE handles direct lighting, so suppress emissive hits
  const indirColor = trace(indirO, indirDir, depth + 1, false);
  let radiance = albedo.mulC(indirColor);

  // Next-event estimation against the area light
  const lc = lightBall.center;
  const lp = new Vec3(
    lc.x + (Math.random() - 0.5) * lightBall.radius,
    lc.y + (Math.random() - 0.5) * lightBall.radius,
    lc.z + (Math.random() - 0.5) * lightBall.radius
  );
  const ld = lp.sub(P).norm();
  const brdf = Math.max(0, faceNormal.dot(ld));
  if (brdf > 0) {
    const shadowO = P.add(faceNormal.mul(EPS));
    const shadowHit = intersect(shadowO, ld);
    if (shadowHit && shadowHit.obj.name === 'lightBall') {
      // weight: albedo * cos(theta) (no PDF since it's an approximation)
      radiance = radiance.add(albedo.mulS(brdf).mulC(lightBall.emissive));
    }
  }

  return radiance;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const camera = new Vec3(0, 8, -25); // matches cameraStart in the scene

const pixels = new Array(WIDTH * HEIGHT);

for (let row = 0; row < HEIGHT; row++) {
  for (let col = 0; col < WIDTH; col++) {
    let color = BLACK;
    for (let s = 0; s < SAMPLES; s++) {
      const x = (col - WIDTH / 2 + Math.random()) / WIDTH;
      const y = (HEIGHT / 2 - row + Math.random()) / HEIGHT;
      const dir = new Vec3(x, y, 1).norm();
      color = color.add(trace(camera, dir, 0));
    }
    pixels[row * WIDTH + col] = color.div(SAMPLES).gamma().clamp().toRGB();
  }
  if ((row + 1) % 20 === 0 || row === HEIGHT - 1) {
    process.stdout.write(`\rRendering... ${Math.round((row + 1) / HEIGHT * 100)}%`);
  }
}
process.stdout.write('\n');

// ---------------------------------------------------------------------------
// Write PNG using only Node.js built-ins (zlib for DEFLATE)
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

function crc32(buf, start, end) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length);
  return out;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

// Build raw (uncompressed) image: filter byte 0 + RGB per row
const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
for (let row = 0; row < HEIGHT; row++) {
  const base = row * (1 + WIDTH * 3);
  raw[base] = 0; // None filter
  for (let col = 0; col < WIDTH; col++) {
    const [r, g, b] = pixels[row * WIDTH + col];
    raw[base + 1 + col * 3] = r;
    raw[base + 1 + col * 3 + 1] = g;
    raw[base + 1 + col * 3 + 2] = b;
  }
}

const compressed = zlib.deflateSync(raw, { level: 6 });

const png = Buffer.concat([
  sig,
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', compressed),
  pngChunk('IEND', Buffer.alloc(0))
]);

const outPath = '/home/user/Another-JS-Raytracer/render.png';
fs.writeFileSync(outPath, png);
console.log(`PNG written to ${outPath}`);
