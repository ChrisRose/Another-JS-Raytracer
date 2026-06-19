#!/usr/bin/env node
// generate-sky.js — generates a 2048x1024 equirectangular Milky Way panorama PNG
// Output: src/assets/milkyway.png

"use strict";
const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

const WIDTH  = 2048;
const HEIGHT = 1024;

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len       = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf    = Buffer.concat([typeBytes, data]);
  const crcVal    = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

// ─── Milky Way hash ───────────────────────────────────────────────────────────
function hash(a, b) {
  let h = (((a * 374761393) ^ (b * 1234567891)) >>> 0);
  h = ((h ^ (h >>> 13)) * 1664525 + 1013904223) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0xFFFFFFFF;
}

// ─── Milky Way algorithm ──────────────────────────────────────────────────────
function milkyWayPixel(theta, phi) {
  // theta: 0=top, PI=bottom; phi: -PI to PI
  const galLat  = theta - Math.PI / 2;
  const band     = Math.exp(-galLat * galLat * 6) * 0.35;
  const coreMask = Math.exp(-galLat * galLat * 18) * Math.max(0, Math.cos(phi - 1.0)) * 0.5;

  // Stars
  const CELLS = 180;
  const ci0 = Math.floor(theta * CELLS / Math.PI);
  const cj0 = Math.floor((phi + Math.PI) * CELLS / (2 * Math.PI));
  let star = 0;

  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ci = ci0 + di;
      const cj = (cj0 + dj + CELLS) % CELLS;
      if (hash(ci, cj) > 0.97) {
        const starT = (ci + hash(ci + 500, cj)) * Math.PI / CELLS;
        const starP = (cj + hash(ci, cj + 500)) * 2 * Math.PI / CELLS - Math.PI;
        const dot = Math.sin(theta) * Math.cos(phi) * Math.sin(starT) * Math.cos(starP)
                  + Math.sin(theta) * Math.sin(phi) * Math.sin(starT) * Math.sin(starP)
                  + Math.cos(theta) * Math.cos(starT);
        const angDist = Math.acos(Math.max(-1, Math.min(1, dot)));
        const size = 0.003 + hash(ci + 100, cj + 100) * 0.004;
        if (angDist < size) {
          const bright = hash(ci + 200, cj + 200) * 0.6 + 0.4;
          star = Math.max(star, bright * (1 - angDist / size));
        }
      }
    }
  }

  const r_linear = 0.004 + band * 0.25 + coreMask * 0.45 + star;
  const g_linear = 0.004 + band * 0.20 + coreMask * 0.30 + star * 0.92;
  const b_linear = 0.010 + band * 0.40 + coreMask * 0.15 + star * 0.88;

  return [r_linear, g_linear, b_linear];
}

// sRGB gamma 1/2.2
function toSrgb(v) {
  return Math.round(Math.min(1, Math.max(0, Math.pow(v, 1 / 2.2))) * 255);
}

// ─── Build raw pixel data ─────────────────────────────────────────────────────
console.log(`Generating ${WIDTH}x${HEIGHT} Milky Way panorama...`);
const startTime = Date.now();

// rawData: each row is [0x00, R, G, B, R, G, B, ...]
const rawData = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));

for (let row = 0; row < HEIGHT; row++) {
  if (row % 100 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Row ${row}/${HEIGHT} (${elapsed}s elapsed)`);
  }

  const theta = (row + 0.5) / HEIGHT * Math.PI; // 0..PI

  const rowOffset = row * (1 + WIDTH * 3);
  rawData[rowOffset] = 0x00; // filter byte

  for (let col = 0; col < WIDTH; col++) {
    const phi = (col + 0.5) / WIDTH * 2 * Math.PI - Math.PI; // -PI..PI

    const [r, g, b] = milkyWayPixel(theta, phi);

    const pixOffset = rowOffset + 1 + col * 3;
    rawData[pixOffset]     = toSrgb(r);
    rawData[pixOffset + 1] = toSrgb(g);
    rawData[pixOffset + 2] = toSrgb(b);
  }
}

console.log(`  Row ${HEIGHT}/${HEIGHT} -- pixel generation complete.`);

// ─── Build PNG ────────────────────────────────────────────────────────────────
console.log("Compressing and writing PNG...");

// PNG signature
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR: width(4), height(4), bitDepth=8, colorType=2(RGB), compression=0, filter=0, interlace=0
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(WIDTH, 0);
ihdrData.writeUInt32BE(HEIGHT, 4);
ihdrData[8]  = 8; // bit depth
ihdrData[9]  = 2; // color type: RGB
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace
const ihdr = makeChunk("IHDR", ihdrData);

// IDAT: deflate the raw data
const compressed = zlib.deflateSync(rawData, { level: 6 });
const idat = makeChunk("IDAT", compressed);

// IEND
const iend = makeChunk("IEND", Buffer.alloc(0));

const pngBuffer = Buffer.concat([signature, ihdr, idat, iend]);

// ─── Write output ─────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, "src", "assets", "milkyway.png");
fs.writeFileSync(outPath, pngBuffer);

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
const sizeKB  = (pngBuffer.length / 1024).toFixed(1);
console.log(`Done! Written to ${outPath}`);
console.log(`File size: ${sizeKB} KB | Time: ${elapsed}s`);
