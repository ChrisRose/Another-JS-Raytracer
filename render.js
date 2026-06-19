/**
 * Standalone Node.js Cornell box path tracer.
 *
 * Key correctness properties:
 * - Cosine-weighted hemisphere sampling (Malley's method + Gram-Schmidt ONB)
 * - Proper sphere-light NEE: uniform cone sampling, estimator weighted by
 *   solidAngle so it is an unbiased MC estimate of the direct-light integral
 * - includeEmission=false on diffuse bounces prevents double-counting when
 *   both NEE and a random path could hit the same emissive surface
 * - Bounded rectangular wall faces (not infinite planes)
 * - Two axis-aligned boxes on the floor (Cornell box scene content)
 * - Gamma 2.2 correction before clamping
 */

'use strict';

const fs = require('fs');
const zlib = require('zlib');

const WIDTH  = 400;
const HEIGHT = 400;
const SAMPLES = 64;
const MAX_DEPTH = 5;
const EPS = 1e-4;

// ---------------------------------------------------------------------------
// Math
// ---------------------------------------------------------------------------

class Vec3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  add(v)  { return new Vec3(this.x+v.x, this.y+v.y, this.z+v.z); }
  sub(v)  { return new Vec3(this.x-v.x, this.y-v.y, this.z-v.z); }
  mul(s)  { return new Vec3(this.x*s,   this.y*s,   this.z*s);   }
  dot(v)  { return this.x*v.x + this.y*v.y + this.z*v.z; }
  cross(v){ return new Vec3(this.y*v.z-this.z*v.y, this.z*v.x-this.x*v.z, this.x*v.y-this.y*v.x); }
  len()   { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); }
  norm()  { const l=this.len(); return l>0 ? new Vec3(this.x/l,this.y/l,this.z/l) : new Vec3(0,1,0); }
}

class Color {
  constructor(r,g,b) { this.r=r; this.g=g; this.b=b; }
  add(c)   { return new Color(this.r+c.r, this.g+c.g, this.b+c.b); }
  mulC(c)  { return new Color(this.r*c.r, this.g*c.g, this.b*c.b); }
  mulS(s)  { return new Color(this.r*s,   this.g*s,   this.b*s);   }
  div(s)   { return new Color(this.r/s,   this.g/s,   this.b/s);   }
  gamma(e=1/2.2){ return new Color(Math.pow(Math.max(0,this.r),e), Math.pow(Math.max(0,this.g),e), Math.pow(Math.max(0,this.b),e)); }
  clamp()  { return new Color(Math.min(1,Math.max(0,this.r)), Math.min(1,Math.max(0,this.g)), Math.min(1,Math.max(0,this.b))); }
  toRGB()  { const c=this.clamp(); return [Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255)]; }
}

const BLACK = new Color(0,0,0);
const WHITE = new Color(1,1,1);
const RED   = new Color(0.63, 0.065, 0.05);   // Cornell box left wall (measured)
const GREEN = new Color(0.14, 0.45,  0.091);   // Cornell box right wall (measured)

// ---------------------------------------------------------------------------
// Cosine-weighted hemisphere sampling — Malley's method + Gram-Schmidt ONB
// ---------------------------------------------------------------------------

function cosineSample(normal) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const r = Math.sqrt(v);
  const lx = r * Math.cos(theta), ly = r * Math.sin(theta), lz = Math.sqrt(1-v);
  const up = Math.abs(normal.y) < 0.999 ? new Vec3(0,1,0) : new Vec3(1,0,0);
  const t  = up.cross(normal).norm();
  const b  = normal.cross(t);
  return t.mul(lx).add(b.mul(ly)).add(normal.mul(lz)).norm();
}

// ---------------------------------------------------------------------------
// Proper sphere-light NEE: uniform-cone sampling with solid-angle estimator
//
// The MC estimator for a direction ω sampled uniformly in the cone is:
//   f_r(ω) * L_e * cos(θ_surface) / PDF(ω)
//   = (albedo/π) * L_e * cos(θ) * solidAngle
//
// Expected value = true direct-lighting integral (unbiased).
// ---------------------------------------------------------------------------

function sampleSphereLight(lightCenter, lightRadius, point) {
  const toLight = lightCenter.sub(point);
  const dist = toLight.len();
  if (dist <= lightRadius) return null;        // inside the light

  const sinMax = lightRadius / dist;
  const cosMax = Math.sqrt(1 - sinMax * sinMax);
  const solidAngle = 2 * Math.PI * (1 - cosMax);

  // Sample uniformly within the subtended cone
  const u = Math.random(), v = Math.random();
  const cosT = 1 - u * (1 - cosMax);
  const sinT = Math.sqrt(Math.max(0, 1 - cosT*cosT));
  const phi  = 2 * Math.PI * v;

  // ONB aligned to the direction toward the light centre
  const z  = toLight.norm();
  const up = Math.abs(z.y) < 0.999 ? new Vec3(0,1,0) : new Vec3(1,0,0);
  const x  = up.cross(z).norm();
  const y  = z.cross(x);

  const dir = x.mul(sinT*Math.cos(phi)).add(y.mul(sinT*Math.sin(phi))).add(z.mul(cosT)).norm();
  return { dir, solidAngle };
}

// ---------------------------------------------------------------------------
// Bounded rectangular wall face
// ---------------------------------------------------------------------------

class Rect {
  constructor(axis, value, side, u0, u1, v0, v1, albedo, emissive=null, name='rect') {
    this.axis = axis;         // 'x' | 'y' | 'z'
    this.value = value;
    this.side = side;         // +1 or -1 for outward normal
    const others = ['x','y','z'].filter(a => a !== axis);
    this.uAxis = others[0];
    this.vAxis = others[1];
    this.u0 = u0; this.u1 = u1;
    this.v0 = v0; this.v1 = v1;
    this.albedo = albedo;
    this.emissive = emissive;
    this.name = name;
  }

  intersect(ro, rd) {
    const d = rd[this.axis];
    if (Math.abs(d) < EPS) return null;
    const t = (this.value - ro[this.axis]) / d;
    if (t < EPS) return null;
    const P = ro.add(rd.mul(t));
    if (P[this.uAxis] < this.u0 || P[this.uAxis] > this.u1) return null;
    if (P[this.vAxis] < this.v0 || P[this.vAxis] > this.v1) return null;
    return t;
  }

  normalAt() {
    const s = this.side;
    return this.axis==='x' ? new Vec3(s,0,0)
         : this.axis==='y' ? new Vec3(0,s,0)
         :                   new Vec3(0,0,s);
  }
}

// ---------------------------------------------------------------------------
// Axis-aligned bounding box (the two Cornell boxes on the floor)
// ---------------------------------------------------------------------------

class AABB {
  constructor(x0,x1, y0,y1, z0,z1, albedo, name='box') {
    this.mn = new Vec3(x0,y0,z0);
    this.mx = new Vec3(x1,y1,z1);
    this.albedo = albedo;
    this.emissive = null;
    this.name = name;
  }

  intersect(ro, rd) {
    let tMin=-Infinity, tMax=Infinity;
    for (const ax of ['x','y','z']) {
      const inv = 1/rd[ax];
      let t0 = (this.mn[ax]-ro[ax])*inv;
      let t1 = (this.mx[ax]-ro[ax])*inv;
      if (inv<0) { const tmp=t0; t0=t1; t1=tmp; }
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
    }
    if (tMax<=tMin) return null;
    return tMin>EPS ? tMin : (tMax>EPS ? tMax : null);
  }

  normalAt(p) {
    // Identify the closest face by the largest normalised distance from centre
    const c  = new Vec3((this.mn.x+this.mx.x)/2, (this.mn.y+this.mx.y)/2, (this.mn.z+this.mx.z)/2);
    const hx = (this.mx.x-this.mn.x)/2, hy=(this.mx.y-this.mn.y)/2, hz=(this.mx.z-this.mn.z)/2;
    const dx = Math.abs(p.x-c.x)/hx, dy=Math.abs(p.y-c.y)/hy, dz=Math.abs(p.z-c.z)/hz;
    if (dx>=dy && dx>=dz) return new Vec3(p.x>c.x?1:-1, 0, 0);
    if (dy>=dz)           return new Vec3(0, p.y>c.y?1:-1, 0);
    return                       new Vec3(0, 0, p.z>c.z?1:-1);
  }
}

// ---------------------------------------------------------------------------
// Sphere (light source)
// ---------------------------------------------------------------------------

class Sphere {
  constructor(cx,cy,cz, r, albedo, emissive=null, name='sphere') {
    this.center  = new Vec3(cx,cy,cz);
    this.radius  = r;
    this.albedo  = albedo;
    this.emissive= emissive;
    this.name    = name;
  }

  intersect(ro, rd) {
    const oc = ro.sub(this.center);
    const b  = 2*oc.dot(rd), c=oc.dot(oc)-this.radius*this.radius;
    const d  = b*b-4*c;
    if (d<0) return null;
    const sq=Math.sqrt(d), t1=(-b-sq)/2;
    if (t1>EPS) return t1;
    const t2=(-b+sq)/2;
    return t2>EPS ? t2 : null;
  }

  normalAt(p) { return p.sub(this.center).norm(); }
}

// ---------------------------------------------------------------------------
// Cornell box scene
//   Room: x -8..8, y 0..18, z -8..10   (18×18×16 units, open at front)
//   Camera at (0, 8, -25) looking +z
// ---------------------------------------------------------------------------

// Light: sphere near the ceiling, chosen to produce pleasant exposure when
// weighted by the correct solid-angle NEE estimator.
const LIGHT_EMISSIVE = new Color(40, 40, 40);
const lightBall = new Sphere(0, 17, 1, 2, WHITE, LIGHT_EMISSIVE, 'lightBall');

const scene = [
  // Walls (bounded rectangles — open at front z < -8)
  new Rect('y',  0,  1, -8, 8, -8, 10, WHITE, null, 'floor'),
  new Rect('y', 18, -1, -8, 8, -8, 10, WHITE, null, 'ceiling'),
  new Rect('z', 10, -1, -8, 8,  0, 18, WHITE, null, 'backWall'),
  new Rect('x', -8,  1,  0, 18,-8, 10, RED,   null, 'leftWall'),
  new Rect('x',  8, -1,  0, 18,-8, 10, GREEN, null, 'rightWall'),

  lightBall,

  // Cornell box interior geometry: tall box (left) and short box (right)
  new AABB(-5.5, -1.5,  0, 11.5, -0.5, 4.5, WHITE, 'tallBox'),
  new AABB( 1.0,  5.0,  0,  5.5, -4.0, 2.0, WHITE, 'shortBox'),
];

function intersect(ro, rd) {
  let minT=Infinity, hit=null;
  for (const obj of scene) {
    const t = obj.intersect(ro, rd);
    if (t!==null && t<minT) { minT=t; hit=obj; }
  }
  return hit ? { t:minT, obj:hit } : null;
}

// ---------------------------------------------------------------------------
// Path tracer
// ---------------------------------------------------------------------------

function trace(ro, rd, depth, includeEmission=true) {
  if (depth > MAX_DEPTH) return BLACK;

  const hit = intersect(ro, rd);
  if (!hit) return BLACK;  // ray escaped the open-front box

  const { t, obj } = hit;
  const P = ro.add(rd.mul(t));

  // Emissive surface — only count for camera rays or specular bounces to
  // avoid double-counting with NEE.
  if (obj.emissive) {
    return includeEmission ? obj.emissive : BLACK;
  }

  const rawN = obj.normalAt(P);
  // Face normal: flip if the ray is hitting the back side of a surface
  const N = rawN.dot(rd) < 0 ? rawN : rawN.mul(-1);
  const albedo = obj.albedo;

  // --- Indirect bounce (single cosine-weighted sample) ---
  const indirDir = cosineSample(N);
  const indirO   = P.add(N.mul(EPS));
  // Suppress emission on diffuse bounces — NEE handles direct lighting
  const indirL   = trace(indirO, indirDir, depth+1, false);
  let radiance = albedo.mulC(indirL);  // weight = albedo (PDF cancels for cosine sampling)

  // --- Direct lighting: sphere-light NEE ---
  // Estimator: (albedo/π) × L_e × cos(θ) × solidAngle   (unbiased)
  const lightSample = sampleSphereLight(lightBall.center, lightBall.radius, P);
  if (lightSample) {
    const { dir: ld, solidAngle } = lightSample;
    const cosTheta = Math.max(0, N.dot(ld));
    if (cosTheta > 0) {
      const shadowHit = intersect(P.add(N.mul(EPS)), ld);
      if (shadowHit && shadowHit.obj.name === 'lightBall') {
        const weight = cosTheta * solidAngle / Math.PI;
        radiance = radiance.add(albedo.mulS(weight).mulC(LIGHT_EMISSIVE));
      }
    }
  }

  return radiance;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const camera = new Vec3(0, 8, -25);
const pixels = new Array(WIDTH * HEIGHT);

for (let row = 0; row < HEIGHT; row++) {
  for (let col = 0; col < WIDTH; col++) {
    let color = BLACK;
    for (let s = 0; s < SAMPLES; s++) {
      const x = (col - WIDTH/2  + Math.random()) / WIDTH;
      const y = (HEIGHT/2 - row + Math.random()) / HEIGHT;
      color = color.add(trace(camera, new Vec3(x, y, 1).norm(), 0));
    }
    pixels[row * WIDTH + col] = color.div(SAMPLES).gamma().clamp().toRGB();
  }
  if ((row+1) % 20 === 0 || row === HEIGHT-1)
    process.stdout.write(`\rRendering... ${Math.round((row+1)/HEIGHT*100)}%`);
}
process.stdout.write('\n');

// ---------------------------------------------------------------------------
// Write PNG (zlib deflate, no external deps)
// ---------------------------------------------------------------------------

function makeCrcTable() {
  const t=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[i]=c;}
  return t;
}
const CRC_TABLE=makeCrcTable();
function crc32(buf,s,e){let c=0xffffffff;for(let i=s;i<e;i++)c=CRC_TABLE[(c^buf[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,data){const o=Buffer.alloc(12+data.length);o.writeUInt32BE(data.length,0);o.write(type,4,'ascii');data.copy(o,8);o.writeUInt32BE(crc32(o,4,8+data.length),8+data.length);return o;}

const sig=Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr=Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH,0);ihdr.writeUInt32BE(HEIGHT,4);ihdr[8]=8;ihdr[9]=2;

const raw=Buffer.alloc(HEIGHT*(1+WIDTH*3));
for(let row=0;row<HEIGHT;row++){
  raw[row*(1+WIDTH*3)]=0;
  for(let col=0;col<WIDTH;col++){
    const[r,g,b]=pixels[row*WIDTH+col];
    const base=row*(1+WIDTH*3)+1+col*3;
    raw[base]=r;raw[base+1]=g;raw[base+2]=b;
  }
}

const outPath='/home/user/Another-JS-Raytracer/render.png';
fs.writeFileSync(outPath,Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]));
console.log(`PNG written to ${outPath}`);
