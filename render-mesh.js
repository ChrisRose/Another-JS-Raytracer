/**
 * Cornell box path tracer using the actual mesh geometry (OBJ triangles).
 * Reads the embedded OBJ strings from the .ts mesh files, negates z to match
 * the coordinate convention used by the TypeScript app (meshUtils.ts), and
 * renders with the same unbiased MC estimator as render.js:
 *
 *  - Cosine-weighted hemisphere sampling (Malley + Gram-Schmidt ONB)
 *  - Sphere-light NEE: uniform cone sampling, solid-angle-weighted estimator
 *  - includeEmission=false on diffuse bounces prevents double-counting
 *  - Möller–Trumbore triangle intersection with barycentric normal interpolation
 *  - Per-group AABB for coarse rejection (main speedup for the teapot)
 *  - Gamma 2.2 + clamp before writing PNG
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const MESH_DIR  = path.join(__dirname, 'src/meshes/cornellBox');
const W         = 400;
const H         = 400;
const SAMPLES   = 32;
const MAX_DEPTH = 6;
const EPS       = 1e-4;

// ---------------------------------------------------------------------------
// Math
// ---------------------------------------------------------------------------

class Vec3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  add(v)   { return new Vec3(this.x+v.x, this.y+v.y, this.z+v.z); }
  sub(v)   { return new Vec3(this.x-v.x, this.y-v.y, this.z-v.z); }
  mul(s)   { return new Vec3(this.x*s,   this.y*s,   this.z*s);   }
  dot(v)   { return this.x*v.x + this.y*v.y + this.z*v.z; }
  cross(v) { return new Vec3(this.y*v.z-this.z*v.y, this.z*v.x-this.x*v.z, this.x*v.y-this.y*v.x); }
  len()    { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); }
  norm()   { const l = this.len(); return l > 0 ? new Vec3(this.x/l, this.y/l, this.z/l) : new Vec3(0,1,0); }
}

class Color {
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
  add(c)    { return new Color(this.r+c.r, this.g+c.g, this.b+c.b); }
  mulC(c)   { return new Color(this.r*c.r, this.g*c.g, this.b*c.b); }
  mulS(s)   { return new Color(this.r*s,   this.g*s,   this.b*s);   }
  div(s)    { return new Color(this.r/s,   this.g/s,   this.b/s);   }
  gamma(e=1/2.2) { return new Color(Math.pow(Math.max(0,this.r),e), Math.pow(Math.max(0,this.g),e), Math.pow(Math.max(0,this.b),e)); }
  clamp()   { return new Color(Math.min(1,Math.max(0,this.r)), Math.min(1,Math.max(0,this.g)), Math.min(1,Math.max(0,this.b))); }
  toRGB()   { const c = this.clamp(); return [Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255)]; }
}

const BLACK = new Color(0, 0, 0);
const WHITE = new Color(1, 1, 1);
const RED   = new Color(0.63, 0.065, 0.05);   // Cornell box left wall
const GREEN = new Color(0.14, 0.45,  0.091);  // Cornell box right wall

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

function cosineSample(normal) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const r = Math.sqrt(v);
  const lx = r * Math.cos(theta), ly = r * Math.sin(theta), lz = Math.sqrt(1 - v);
  const up = Math.abs(normal.y) < 0.999 ? new Vec3(0,1,0) : new Vec3(1,0,0);
  const t = up.cross(normal).norm();
  const b = normal.cross(t);
  return t.mul(lx).add(b.mul(ly)).add(normal.mul(lz)).norm();
}

function sampleSphereLight(center, radius, point) {
  const toLight = center.sub(point);
  const dist = toLight.len();
  if (dist <= radius) return null;

  const sinMax = radius / dist;
  const cosMax = Math.sqrt(1 - sinMax * sinMax);
  const solidAngle = 2 * Math.PI * (1 - cosMax);

  const u = Math.random(), v = Math.random();
  const cosT = 1 - u * (1 - cosMax);
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  const phi  = 2 * Math.PI * v;

  const z  = toLight.norm();
  const up = Math.abs(z.y) < 0.999 ? new Vec3(0,1,0) : new Vec3(1,0,0);
  const x  = up.cross(z).norm();
  const y  = z.cross(x);

  const dir = x.mul(sinT*Math.cos(phi)).add(y.mul(sinT*Math.sin(phi))).add(z.mul(cosT)).norm();
  return { dir, solidAngle };
}

// ---------------------------------------------------------------------------
// OBJ parser — reads embedded OBJ strings from .ts files
//
// Coordinate convention (matches meshUtils.ts):
//   render.x = obj.x
//   render.y = obj.y
//   render.z = -obj.z      ← z is negated
//
// Handles face formats:
//   f v//vn v//vn v//vn          (walls, boxes — triangles)
//   f v/uv/vn v/uv/vn v/uv/vn   (teapot — quads, split to 2 tris)
// ---------------------------------------------------------------------------

function extractObjFromTs(filename) {
  const src = fs.readFileSync(path.join(MESH_DIR, filename), 'utf8');
  return src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
}

function parseObj(source, albedo, emissive = null) {
  const verts = [], norms = [], tris = [];
  const PAD = 0.05;
  let minX=Infinity, minY=Infinity, minZ=Infinity;
  let maxX=-Infinity, maxY=-Infinity, maxZ=-Infinity;

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const tok = line.split(/\s+/);

    if (tok[0] === 'v') {
      const x = parseFloat(tok[1]), y = parseFloat(tok[2]), z = -parseFloat(tok[3]);
      verts.push(new Vec3(x, y, z));
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    } else if (tok[0] === 'vn') {
      // Negate z for normals too
      norms.push(new Vec3(parseFloat(tok[1]), parseFloat(tok[2]), -parseFloat(tok[3])));
    } else if (tok[0] === 'f') {
      const fv = tok.slice(1).map(s => {
        const p = s.split('/');
        return { vi: parseInt(p[0]) - 1, ni: p[2] ? parseInt(p[2]) - 1 : -1 };
      });
      if (fv.length === 3) {
        pushTri(fv[0], fv[1], fv[2]);
      } else if (fv.length === 4) {
        // Quad → (0,1,3) + (1,2,3), matching meshUtils.ts split
        pushTri(fv[0], fv[1], fv[3]);
        pushTri(fv[1], fv[2], fv[3]);
      }
    }
  }

  function pushTri(a, b, c) {
    const v1 = verts[a.vi], v2 = verts[b.vi], v3 = verts[c.vi];
    if (!v1 || !v2 || !v3) return;
    const n1 = a.ni >= 0 ? norms[a.ni] : null;
    const n2 = b.ni >= 0 ? norms[b.ni] : null;
    const n3 = c.ni >= 0 ? norms[c.ni] : null;
    const e1 = v2.sub(v1), e2 = v3.sub(v1);
    tris.push({ v1, e1, e2, faceNormal: e1.cross(e2).norm(), n1, n2, n3, albedo, emissive });
  }

  return {
    tris,
    bbox: { minX:minX-PAD, maxX:maxX+PAD, minY:minY-PAD, maxY:maxY+PAD, minZ:minZ-PAD, maxZ:maxZ+PAD }
  };
}

// ---------------------------------------------------------------------------
// Intersection helpers
// ---------------------------------------------------------------------------

function bboxHit(bb, ro, rd) {
  let tMin = -Infinity, tMax = Infinity;
  for (const [lo, hi, o, d] of [
    [bb.minX, bb.maxX, ro.x, rd.x],
    [bb.minY, bb.maxY, ro.y, rd.y],
    [bb.minZ, bb.maxZ, ro.z, rd.z],
  ]) {
    if (Math.abs(d) < 1e-10) {
      if (o < lo || o > hi) return false;
      continue;
    }
    const inv = 1 / d;
    let t0 = (lo - o) * inv, t1 = (hi - o) * inv;
    if (inv < 0) { const tmp = t0; t0 = t1; t1 = tmp; }
    if (t0 > tMin) tMin = t0;
    if (t1 < tMax) tMax = t1;
    if (tMax < tMin) return false;
  }
  return tMax > 0;
}

// Möller–Trumbore — returns { t, u, v } or null
function triIntersect(tri, ro, rd) {
  const h = rd.cross(tri.e2);
  const a = tri.e1.dot(h);
  if (Math.abs(a) < EPS) return null;

  const f = 1 / a;
  const s = ro.sub(tri.v1);
  const u = f * s.dot(h);
  if (u < 0 || u > 1) return null;

  const q = s.cross(tri.e1);
  const v = f * rd.dot(q);
  if (v < 0 || u + v > 1) return null;

  const t = f * tri.e2.dot(q);
  return t > EPS ? { t, u, v } : null;
}

// Shading normal: barycentric-interpolated vertex normals (if available),
// otherwise the flat face normal.  Always flipped to face the incoming ray.
function shadingNormal(tri, u, v, rd) {
  let n;
  if (tri.n1 && tri.n2 && tri.n3) {
    const w = 1 - u - v;
    n = tri.n1.mul(w).add(tri.n2.mul(u)).add(tri.n3.mul(v)).norm();
  } else {
    n = tri.faceNormal;
  }
  return n.dot(rd) < 0 ? n : n.mul(-1);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

class Sphere {
  constructor(cx, cy, cz, r, albedo, emissive = null, name = '') {
    this.center = new Vec3(cx, cy, cz);
    this.radius = r;
    this.albedo = albedo;
    this.emissive = emissive;
    this.name = name;
  }
  intersect(ro, rd) {
    const oc = ro.sub(this.center);
    const b = 2 * oc.dot(rd), c = oc.dot(oc) - this.radius * this.radius;
    const d = b * b - 4 * c;
    if (d < 0) return null;
    const sq = Math.sqrt(d), t1 = (-b - sq) / 2;
    if (t1 > EPS) return t1;
    const t2 = (-b + sq) / 2;
    return t2 > EPS ? t2 : null;
  }
  normalAt(p) { return p.sub(this.center).norm(); }
}

console.log('Loading meshes...');
const loadT0 = Date.now();

const meshGroups = [
  parseObj(extractObjFromTs('floor.ts'),        WHITE),
  parseObj(extractObjFromTs('ceiling.ts'),      WHITE),
  parseObj(extractObjFromTs('backWall.ts'),     WHITE),
  parseObj(extractObjFromTs('leftWall.ts'),     RED),
  parseObj(extractObjFromTs('rightWall.ts'),    GREEN),
  parseObj(extractObjFromTs('leftBox.ts'),      WHITE),
  parseObj(extractObjFromTs('rightBox.ts'),     WHITE),
  parseObj(extractObjFromTs('teapotLowRes.ts'), new Color(0.9, 0.1, 0.1)),
];

const totalTris = meshGroups.reduce((s, g) => s + g.tris.length, 0);
console.log(`Loaded ${totalTris} triangles in ${Date.now() - loadT0}ms`);

// Light sphere placed inside the box, below the ceiling (ceiling y=16 in .ts coords).
// NEE samples this sphere directly for unbiased direct-light estimation.
const LIGHT_EMISSIVE = new Color(40, 40, 40);
const lightBall = new Sphere(0, 14, 0, 1.5, WHITE, LIGHT_EMISSIVE, 'lightBall');

// ---------------------------------------------------------------------------
// Scene intersection — closest hit across all primitives
// ---------------------------------------------------------------------------

function findHit(ro, rd) {
  let minT = Infinity, result = null;

  // Sphere light
  const st = lightBall.intersect(ro, rd);
  if (st !== null && st < minT) { minT = st; result = { t: st, sph: lightBall }; }

  // Mesh groups (AABB early-reject per group)
  for (const grp of meshGroups) {
    if (!bboxHit(grp.bbox, ro, rd)) continue;
    for (const tri of grp.tris) {
      const h = triIntersect(tri, ro, rd);
      if (h && h.t < minT) { minT = h.t; result = { t: h.t, tri, u: h.u, v: h.v }; }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Path tracer
// ---------------------------------------------------------------------------

function trace(ro, rd, depth, includeEmission = true) {
  if (depth > MAX_DEPTH) return BLACK;

  const hit = findHit(ro, rd);
  if (!hit) return BLACK;  // ray escaped the open-front box

  const P = ro.add(rd.mul(hit.t));

  let albedo, emissive, normal;

  if (hit.sph) {
    albedo   = hit.sph.albedo;
    emissive = hit.sph.emissive;
    const rawN = hit.sph.normalAt(P);
    normal = rawN.dot(rd) < 0 ? rawN : rawN.mul(-1);
  } else {
    const tri = hit.tri;
    albedo   = tri.albedo;
    emissive = tri.emissive;
    normal   = shadingNormal(tri, hit.u, hit.v, rd);
  }

  if (emissive) return includeEmission ? emissive : BLACK;

  let radiance = BLACK;

  // Indirect: single cosine-weighted bounce (PDF cancels with BRDF, weight = albedo)
  const indirDir = cosineSample(normal);
  const indirO   = P.add(normal.mul(EPS));
  radiance = albedo.mulC(trace(indirO, indirDir, depth + 1, false));

  // Direct: sphere-light NEE
  const sample = sampleSphereLight(lightBall.center, lightBall.radius, P);
  if (sample) {
    const { dir: ld, solidAngle } = sample;
    const cosTheta = Math.max(0, normal.dot(ld));
    if (cosTheta > 0) {
      const shadowHit = findHit(P.add(normal.mul(EPS)), ld);
      if (shadowHit && shadowHit.sph === lightBall) {
        radiance = radiance.add(albedo.mulS(cosTheta * solidAngle / Math.PI).mulC(LIGHT_EMISSIVE));
      }
    }
  }

  return radiance;
}

// ---------------------------------------------------------------------------
// Render — camera matches tracePaths.ts: (0, 8, -25), direction (x, y, 1)
// ---------------------------------------------------------------------------

const camPos = new Vec3(0, 8, -25);
const pixels = new Array(W * H);
const t0 = Date.now();

for (let row = 0; row < H; row++) {
  for (let col = 0; col < W; col++) {
    let color = BLACK;
    for (let s = 0; s < SAMPLES; s++) {
      const x = (col - W / 2 + Math.random()) / W;
      const y = (H / 2 - row + Math.random()) / H;
      color = color.add(trace(camPos, new Vec3(x, y, 1).norm(), 0));
    }
    pixels[row * W + col] = color.div(SAMPLES).gamma().clamp().toRGB();
  }
  if ((row + 1) % 40 === 0 || row === H - 1) {
    const elapsed = (Date.now() - t0) / 1000;
    const eta = elapsed / (row + 1) * H - elapsed;
    process.stdout.write(`\r  ${Math.round((row+1)/H*100)}%  ${elapsed.toFixed(1)}s elapsed  ~${eta.toFixed(0)}s remaining`);
  }
}
process.stdout.write('\n');

// ---------------------------------------------------------------------------
// Write PNG (zlib deflate, no external deps)
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
function crc32(buf, s, e) { let c = 0xffffffff; for (let i = s; i < e; i++) c = CRC_TABLE[(c^buf[i])&0xff] ^ (c>>>8); return (c^0xffffffff) >>> 0; }
function chunk(type, data) {
  const o = Buffer.alloc(12 + data.length);
  o.writeUInt32BE(data.length, 0); o.write(type, 4, 'ascii');
  data.copy(o, 8); o.writeUInt32BE(crc32(o, 4, 8 + data.length), 8 + data.length);
  return o;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;

const raw = Buffer.alloc(H * (1 + W * 3));
for (let row = 0; row < H; row++) {
  raw[row * (1 + W * 3)] = 0;
  for (let col = 0; col < W; col++) {
    const [r, g, b] = pixels[row * W + col];
    const base = row * (1 + W * 3) + 1 + col * 3;
    raw[base] = r; raw[base+1] = g; raw[base+2] = b;
  }
}

const outPath = path.join(__dirname, 'render-mesh.png');
fs.writeFileSync(outPath, Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level:6})), chunk('IEND', Buffer.alloc(0))]));
console.log(`PNG written to ${outPath}`);
