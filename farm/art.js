// Stardew-style art: autotiled terrain, layered trees, detailed houses and shaded characters.
import { SEASONS, hash, mk, R, disc, ellipse, flip, shade, outline } from "./px.js";

const N = 1, E = 2, S_ = 4, W_ = 8;                                                // edge bits: neighbour in that direction is a different terrain

// ---------------------------------------------------------------- terrain tiles
function grassBase(g, P, s, v, seed = 0) {
  R(g, P.grass, 0, 0, 16, 16);
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {                     // soft 2x2 tone patches
    const n = hash(bx, by, v * 13 + s * 5 + seed);
    if (n < 0.14) R(g, P.g3, bx * 2, by * 2, 2, 2); else if (n > 0.88) R(g, P.g2, bx * 2, by * 2, 2, 2);
  }
  for (let i = 0; i < 4; i++) {                                                      // grass blades
    const x = 1 + Math.floor(hash(i, v, s + 3) * 13), y = 2 + Math.floor(hash(i, v, s + 8) * 12);
    R(g, P.g3, x, y, 1, 2); R(g, P.g2, x, y - 1, 1, 1); R(g, P.g3, x + 1, y + 1, 1, 1);
  }
  const k = v % 8;
  if (s === 0 && k === 2) { for (const [x, y, c] of [[4, 5, "#fff"], [5, 6, "#ffd5e6"], [10, 10, "#ffb0d0"], [11, 9, "#fff"], [7, 12, "#bcd8ff"]]) { R(g, c, x, y); R(g, "#f2d44a", x, y + 0); } R(g, "#4a8a30", 4, 6); R(g, "#4a8a30", 10, 11); }
  if (s === 1 && k === 5) { R(g, "#ffe066", 5, 6, 2, 2); R(g, "#fff3a8", 5, 6); R(g, "#3f8a30", 6, 8, 1, 2); R(g, "#ffe066", 11, 11, 2, 2); R(g, "#3f8a30", 12, 13); }
  if (s === 2 && (k === 2 || k === 6)) { R(g, "#d9702a", 4, 5, 3, 2); R(g, "#b8501c", 5, 6); R(g, "#f4b04a", 10, 11, 3, 2); R(g, "#d9702a", 11, 12); }
  if (s === 3) { if (k === 3) { R(g, "#ffffff", 4, 9, 6, 2); R(g, "#fff", 5, 8, 4, 1); R(g, "#c4d4e6", 4, 11, 6, 1); } for (let i = 0; i < 3; i++) R(g, "#fff", Math.floor(hash(i, v, 77) * 16), Math.floor(hash(i, v, 78) * 16)); }
}

function drawGrass(s, v, mask) {
  const P = SEASONS[s];
  return mk(16, 16, g => {
    grassBase(g, P, s, v);
    if (mask) {                                                                      // soft dark bank next to water / soil edges handled by neighbours
      if (mask & N) R(g, P.g3, 0, 0, 16, 1); if (mask & S_) R(g, P.g3, 0, 15, 16, 1);
      if (mask & W_) R(g, P.g3, 0, 0, 1, 16); if (mask & E) R(g, P.g3, 15, 0, 1, 16);
    }
  });
}

function drawSoil(wet, mask, s) {
  const base = wet ? "#5a3b22" : "#8d643a", dark = wet ? "#3f2814" : "#6e4a28", light = wet ? "#6e4a2c" : "#a67a48";
  return mk(16, 16, g => {
    R(g, base, 0, 0, 16, 16);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) { const n = hash(bx, by, wet ? 5 : 6); if (n < 0.2) R(g, dark, bx * 2, by * 2, 2, 1); else if (n > 0.85) R(g, light, bx * 2, by * 2 + 1, 2, 1); }
    for (const y of [3, 8, 13]) { R(g, dark, 1, y, 14, 1); R(g, light, 1, y + 1, 14, 1); }          // furrows
    if (wet) { for (const [x, y] of [[3, 6], [10, 2], [12, 11], [6, 12]]) R(g, "#8a6040", x, y); }
    const edge = wet ? "#2e1c0e" : "#4e321a";                                        // raised-bed outline where soil meets something else
    if (mask & N) { R(g, edge, 0, 0, 16, 1); R(g, light, 0, 1, 16, 1); }
    if (mask & S_) { R(g, edge, 0, 15, 16, 1); R(g, dark, 0, 14, 16, 1); }
    if (mask & W_) { R(g, edge, 0, 0, 1, 16); R(g, light, 1, 1, 1, 14); }
    if (mask & E) { R(g, edge, 15, 0, 1, 16); R(g, dark, 14, 0, 1, 16); }
    for (const [m1, m2, x, y] of [[N, W_, 0, 0], [N, E, 15, 0], [S_, W_, 0, 15], [S_, E, 15, 15]]) if ((mask & m1) && (mask & m2)) { g.clearRect(x, y, 1, 1); }
  });
}

function drawWater(f, mask, ocean) {
  const A = ocean ? "#2f74c8" : "#3f8ad8", B = ocean ? "#2663b2" : "#3375c4", C = ocean ? "#8ec4f4" : "#9acdf6";
  return mk(16, 16, g => {
    R(g, A, 0, 0, 16, 16);
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 8; bx++) if (hash(bx, by, ocean ? 3 : 4) < 0.35) R(g, B, bx * 2, by * 4 + 2, 3, 2);
    for (let i = 0; i < 4; i++) {                                                    // travelling glints
      const y = 2 + i * 4, x = Math.floor((i * 5 + f * 4 + hash(i, 1, 9) * 6) % 13);
      R(g, C, x, y, 3, 1); R(g, "#d8eeff", x + 1, y, 1, 1);
    }
    const foam = "#eef9ff", foam2 = "#b8e0fa";                                       // shoreline foam
    const wob = f % 2;
    if (mask & N) { R(g, foam, 0, 0, 16, 1 + wob); R(g, foam2, 0, 1 + wob, 16, 1); }
    if (mask & S_) { R(g, foam, 0, 15 - wob, 16, 1 + wob); R(g, foam2, 0, 14 - wob, 16, 1); }
    if (mask & W_) { R(g, foam, 0, 0, 1 + wob, 16); R(g, foam2, 1 + wob, 0, 1, 16); }
    if (mask & E) { R(g, foam, 15 - wob, 0, 1 + wob, 16); R(g, foam2, 14 - wob, 0, 1, 16); }
  });
}

function drawPath(v, mask, s, sandy) {
  const P = SEASONS[s], base = sandy ? "#d4b87e" : "#c9ab7c", d = sandy ? "#b89c64" : "#a98c60", l = sandy ? "#e6cf98" : "#dcc395";
  return mk(16, 16, g => {
    R(g, base, 0, 0, 16, 16);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) { const n = hash(bx, by, 20 + v); if (n < 0.16) R(g, d, bx * 2, by * 2, 2, 1); else if (n > 0.88) R(g, l, bx * 2, by * 2, 2, 1); }
    for (let i = 0; i < 3; i++) { const x = 2 + Math.floor(hash(i, v, 31) * 11), y = 2 + Math.floor(hash(i, v, 32) * 11); R(g, d, x, y, 2, 1); R(g, l, x, y - 1, 1, 1); }
    const lip = (side) => {                                                          // irregular grass lip where the path meets grass
      for (let i = 0; i < 16; i++) {
        const n = hash(i, v + side, 40), len = 1 + (n < 0.55 ? 1 : 0) + (n < 0.2 ? 1 : 0);
        for (let k = 0; k < len; k++) {
          const c = k === len - 1 ? P.g3 : P.grass;
          if (side === 0) R(g, c, i, k, 1, 1); else if (side === 1) R(g, c, 15 - k, i, 1, 1); else if (side === 2) R(g, c, i, 15 - k, 1, 1); else R(g, c, k, i, 1, 1);
        }
      }
    };
    if (!sandy) { if (mask & N) lip(0); if (mask & E) lip(1); if (mask & S_) lip(2); if (mask & W_) lip(3); }
  });
}

function drawSand(biome, v, mask) {
  const c = biome === "beach" ? ["#efdfa4", "#f8edbf", "#dccb8a", "#c9b878"] : ["#dcab5e", "#e8bd74", "#c79443", "#b4812f"];
  return mk(16, 16, g => {
    R(g, c[0], 0, 0, 16, 16);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) { const n = hash(bx, by, 50 + v); if (n < 0.15) R(g, c[2], bx * 2, by * 2 + 1, 2, 1); else if (n > 0.88) R(g, c[1], bx * 2, by * 2, 2, 1); }
    if (v % 4 === 1) { R(g, c[2], 3, 9, 4, 1); R(g, c[1], 4, 8, 3, 1); }
    if (mask & N) R(g, c[3], 0, 0, 16, 2); if (mask & S_) R(g, c[3], 0, 14, 16, 2);          // wet sand beside water
    if (mask & W_) R(g, c[3], 0, 0, 2, 16); if (mask & E) R(g, c[3], 14, 0, 2, 16);
  });
}

function drawPen(mask) {
  return mk(16, 16, g => {
    R(g, "#d4bd72", 0, 0, 16, 16);
    for (let i = 0; i < 10; i++) { const x = Math.floor(hash(i, 7) * 13), y = Math.floor(hash(i, 8) * 15); R(g, i % 2 ? "#bfa458" : "#e6d28a", x, y, 3, 1); }
    const rail = (x, y, w, h) => { R(g, "#5e3a1c", x, y, w, h); };
    const wood = "#a8743e", hi = "#c8944e", post = "#7a4e26";
    if (mask & N) { rail(0, 0, 16, 5); R(g, wood, 0, 1, 16, 3); R(g, hi, 0, 1, 16, 1); R(g, post, 0, 0, 2, 5); R(g, post, 14, 0, 2, 5); }
    if (mask & S_) { rail(0, 11, 16, 5); R(g, wood, 0, 12, 16, 3); R(g, hi, 0, 12, 16, 1); R(g, post, 0, 11, 2, 5); R(g, post, 14, 11, 2, 5); }
    if (mask & W_) { rail(0, 0, 5, 16); R(g, wood, 1, 0, 3, 16); R(g, hi, 1, 0, 1, 16); R(g, post, 0, 0, 5, 2); R(g, post, 0, 14, 5, 2); }
    if (mask & E) { rail(11, 0, 5, 16); R(g, wood, 12, 0, 3, 16); R(g, hi, 12, 0, 1, 16); R(g, post, 11, 0, 5, 2); R(g, post, 11, 14, 5, 2); }
  });
}

export const BIOMES = {
  stone: { wall: "#4b4659", wallL: "#6a6580", wallD: "#312d3d", floor: "#7d7790", floorL: "#8f89a2", floorD: "#686278" },
  frost: { wall: "#4f7396", wallL: "#8cc4e8", wallD: "#33506e", floor: "#a9cfe4", floorL: "#d4ecf8", floorD: "#86b0cc" },
  magma: { wall: "#4e2c2a", wallL: "#8a4a3a", wallD: "#321a1a", floor: "#6e3d36", floorL: "#88504a", floorD: "#52292a" },
};
function drawCaveWall(b, v, mask) {
  const P = BIOMES[b];
  return mk(16, 16, g => {
    R(g, P.wall, 0, 0, 16, 16);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) { const n = hash(bx, by, 60 + v); if (n < 0.2) R(g, P.wallD, bx * 2, by * 2, 2, 2); else if (n > 0.86) R(g, P.wallL, bx * 2, by * 2, 2, 1); }
    if (mask & S_) { R(g, P.wallL, 0, 8, 16, 6); R(g, P.wall, 0, 10, 16, 2); R(g, P.wallD, 0, 14, 16, 2); for (let i = 0; i < 4; i++) R(g, P.wallD, 2 + i * 4, 9, 1, 3); }
    if (mask & N) R(g, P.wallL, 0, 0, 16, 2);
    if (b === "magma") for (let i = 0; i < 2; i++) { const x = 2 + Math.floor(hash(i, v, 66) * 11), y = 2 + Math.floor(hash(i, v, 67) * 8); R(g, "#ff7a2a", x, y, 2, 1); R(g, "#ffc060", x, y, 1, 1); }
  });
}
function drawCaveFloor(b, v, mask) {
  const P = BIOMES[b];
  return mk(16, 16, g => {
    R(g, P.floor, 0, 0, 16, 16);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) { const n = hash(bx, by, 70 + v); if (n < 0.15) R(g, P.floorD, bx * 2, by * 2, 2, 1); else if (n > 0.88) R(g, P.floorL, bx * 2, by * 2, 2, 1); }
    if (b === "frost") for (let i = 0; i < 2; i++) R(g, "#fff", Math.floor(hash(i, v, 71) * 14), Math.floor(hash(i, v, 72) * 14));
    if (b === "magma" && v % 3 === 0) { R(g, "#e8602a", 4, 9, 5, 1); R(g, "#ffb050", 5, 9, 2, 1); R(g, "#e8602a", 8, 10, 3, 1); }
    g.globalAlpha = 0.4; if (mask & N) { R(g, "#000", 0, 0, 16, 3); } g.globalAlpha = 0.22;
    if (mask & N) R(g, "#000", 0, 3, 16, 2); if (mask & W_) R(g, "#000", 0, 0, 2, 16); if (mask & E) R(g, "#000", 14, 0, 2, 16); g.globalAlpha = 1;
  });
}

// One cached lookup for every terrain tile: kind, season, variant, neighbour mask and options.
export function makeTileCache() {
  const cache = new Map();
  return function tile(kind, s, v, mask = 0, opt = {}) {
    const key = `${kind}|${s}|${v}|${mask}|${opt.wet ? 1 : 0}|${opt.f || 0}|${opt.biome || ""}|${opt.sandy ? 1 : 0}`;
    let c = cache.get(key);
    if (!c) {
      c = kind === "grass" ? drawGrass(s, v, mask) : kind === "soil" ? drawSoil(!!opt.wet, mask, s) : kind === "water" ? drawWater(opt.f || 0, mask, false)
        : kind === "ocean" ? drawWater(opt.f || 0, mask, true) : kind === "path" ? drawPath(v % 4, mask, s, !!opt.sandy) : kind === "sand" ? drawSand(opt.biome, v % 4, mask)
        : kind === "pen" ? drawPen(mask) : kind === "cwall" ? drawCaveWall(opt.biome, v % 4, mask) : kind === "cfloor" ? drawCaveFloor(opt.biome, v % 4, mask) : null;
      cache.set(key, c);
    }
    return c;
  };
}

// ---------------------------------------------------------------- trees, rocks, plants
function leafCluster(g, P, s, cx, cy, r, seed) {
  disc(g, P.leafD, cx + 1, cy + 1, r);                                              // shaded underside
  disc(g, P.leaf, cx, cy, r);
  disc(g, P.leaf2, cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.max(2, Math.round(r * 0.55)));
  if (s === 2) for (let i = 0; i < 5; i++) R(g, i % 2 ? "#c43a22" : P.leaf2, cx - r + Math.floor(hash(i, seed, 90) * r * 2), cy - r + Math.floor(hash(i, seed, 91) * r * 2));
}
function drawTree(s, variant) {
  const P = SEASONS[s];
  const base = mk(24, 34, g => {
    const trunk = (x0, w, top) => { R(g, "#4e3119", x0, top, w, 34 - top); R(g, "#7a5230", x0 + 1, top, w - 3, 34 - top); R(g, "#9a6a3e", x0 + 1, top, 1, 34 - top); R(g, "#4e3119", x0 - 1, 31, w + 2, 3); R(g, "#7a5230", x0, 31, w, 2); };
    if (variant === 2) {                                                             // pine
      trunk(10, 4, 26);
      const cols = s === 3 ? [P.leaf, P.leafD, P.leaf2] : [P.leaf, P.leafD, P.leaf2];
      for (let i = 0; i < 4; i++) {
        const top = 2 + i * 6, half = 4 + i * 2;
        for (let y = 0; y < 9; y++) { const hw = Math.round(half * (y + 1) / 9) + 1; R(g, cols[1], 12 - hw + 1, top + y + 1, hw * 2, 1); R(g, cols[0], 12 - hw, top + y, hw * 2, 1); }
        for (let y = 0; y < 8; y++) R(g, cols[2], 12 - Math.round(half * (y + 1) / 9) - 1, top + y, 2, 1);
      }
      if (s === 3) for (let i = 0; i < 4; i++) { R(g, "#fff", 8 + i, 3 + i * 6, 8 - i * 2 + 2, 2); }
    } else {
      trunk(10, 5, 17);
      const big = variant === 0;
      for (const [cx, cy, r] of big ? [[12, 12, 9], [6, 15, 6], [18, 15, 6], [12, 19, 6], [7, 9, 5], [17, 9, 5]] : [[12, 12, 7], [7, 16, 5], [17, 16, 5], [12, 18, 5]]) leafCluster(g, P, s, cx, cy, r, variant * 7 + cx);
      if (s === 3) { for (const [cx, cy, r] of [[12, 7, 6], [7, 11, 3], [17, 11, 3]]) { disc(g, "#fff", cx, cy, r); disc(g, "#dfeaf4", cx + 1, cy + 1, Math.max(1, r - 2)); } }
    }
  });
  return outline(base, s === 3 ? "#2a3b34" : "#2a1a12");
}
function drawRock(variant) {
  const base = mk(16, 14, g => {
    ellipse(g, "#555963", 8, 8, 7, 5); ellipse(g, "#8a8e99", 8, 7, 6, 4.5); ellipse(g, "#a9adb8", 6, 5, 3, 2); R(g, "#c8ccd6", 5, 4, 2, 1);
    R(g, "#6a6e79", 9, 8, 4, 2); R(g, "#555963", 7, 11, 6, 1);
    if (variant) { R(g, "#5a9a3e", 3, 7, 4, 2); R(g, "#7ab852", 4, 7, 2, 1); R(g, "#5a9a3e", 11, 9, 2, 1); }
  });
  return outline(base);
}
function drawPalm() {
  const base = mk(26, 34, g => {
    for (let i = 0; i < 22; i++) { const x = 12 + Math.round(Math.sin(i / 7) * 2.2), y = 33 - i; R(g, "#6a4a28", x, y, 4, 1); R(g, i % 3 ? "#9a7448" : "#7a5a34", x + 1, y, 2, 1); }
    const frond = (dx, dy, len) => { for (let i = 0; i < len; i++) { const x = 14 + Math.round(dx * i), y = 11 + Math.round(dy * i + i * i * 0.04); R(g, "#2f8a3a", x, y, 2, 2); R(g, "#58b84e", x, y, 1, 1); R(g, "#1f6a2c", x, y + 2, 1, 1); } };
    for (const [dx, dy] of [[-1, -0.3], [-0.9, 0.1], [-0.6, 0.5], [1, -0.3], [0.9, 0.1], [0.6, 0.5], [0, -0.9], [-0.3, -0.7], [0.3, -0.7]]) frond(dx, dy, 9);
    disc(g, "#7a4a22", 12, 12, 1); disc(g, "#7a4a22", 15, 13, 1);
  });
  return outline(base);
}
function drawCactus() {
  const base = mk(18, 26, g => {
    R(g, "#2a7a3a", 6, 3, 6, 23); R(g, "#3ea04e", 7, 3, 3, 23); R(g, "#69c878", 7, 4, 1, 21);
    R(g, "#2a7a3a", 1, 10, 6, 3); R(g, "#3ea04e", 1, 8, 3, 5); R(g, "#2a7a3a", 12, 8, 5, 3); R(g, "#3ea04e", 14, 5, 3, 6);
    R(g, "#69c878", 2, 8, 1, 4); R(g, "#69c878", 15, 5, 1, 5);
    for (const [x, y] of [[8, 8], [9, 13], [8, 18], [2, 9], [15, 7]]) R(g, "#e8f0c0", x, y);
    R(g, "#f4e04a", 8, 2, 3, 2); R(g, "#e8508a", 9, 1, 1, 1);
  });
  return outline(base);
}

// ---------------------------------------------------------------- buildings
export function drawHouse({ wall, roof, trim, shutter, shop = false, chimney = true, label = "" }) {
  return mk(56, 56, g => {
    const wall2 = shade(wall, -0.14), wallL = shade(wall, 0.12), roofD = shade(roof, -0.22), roofL = shade(roof, 0.2);
    R(g, "#3b2814", 4, 24, 48, 32);                                                  // wall block + outline
    R(g, wall, 5, 25, 46, 26);
    for (let y = 27; y < 51; y += 4) { R(g, wall2, 5, y, 46, 1); R(g, wallL, 5, y + 1, 46, 1); }
    R(g, trim, 5, 25, 3, 26); R(g, trim, 48, 25, 3, 26); R(g, shade(trim, -0.2), 7, 25, 1, 26); R(g, shade(trim, -0.2), 48, 25, 1, 26);
    for (let x = 5; x < 51; x += 5) R(g, "#8a8e99", x, 51, 4, 5), R(g, "#a9adb8", x, 51, 4, 1);   // stone foundation
    R(g, "#6a6e79", 5, 55, 46, 1);
    if (chimney) { R(g, "#3b2814", 38, 2, 8, 22); R(g, "#a8654a", 39, 3, 6, 20); R(g, "#c8826a", 39, 3, 2, 20); R(g, "#7a4636", 43, 3, 2, 20); R(g, "#6a6e79", 37, 1, 10, 3); R(g, "#8a8e99", 37, 1, 10, 1); }
    for (let y = 3; y < 28; y++) {                                                   // roof
      const half = Math.round(14 + (y - 3) * (14 / 24)), x0 = 28 - half, w = half * 2, row = (y - 3) % 4;
      R(g, "#3b2814", x0 - 1, y, w + 2, 1);
      R(g, row === 3 ? roofD : roof, x0, y, w, 1);
      if (row !== 3) for (let x = x0 + ((Math.floor((y - 3) / 4) % 2) * 3); x < x0 + w; x += 6) R(g, roofD, x, y);
      if (row === 0) R(g, roofL, x0 + 1, y, w - 2, 1);
    }
    R(g, roofL, 14, 3, 28, 1); R(g, roofD, 14, 4, 28, 1);
    R(g, "#3b2814", 0, 27, 56, 1); R(g, roofD, 1, 26, 54, 1); g.globalAlpha = 0.28; R(g, "#000", 5, 28, 46, 3); g.globalAlpha = 1;   // eave shadow
    for (const wx of [10, 37]) {                                                    // windows with shutters and flower boxes
      R(g, "#3b2814", wx - 4, 32, 18, 14); R(g, shutter, wx - 3, 33, 4, 12); R(g, shutter, wx + 8, 33, 4, 12); R(g, shade(shutter, -0.2), wx - 3, 33, 1, 12);
      R(g, trim, wx + 1, 33, 7, 1); R(g, "#2a1a10", wx + 1, 34, 7, 9);
      R(g, "#92d4f4", wx + 2, 35, 5, 3); R(g, "#6ab0e0", wx + 2, 38, 5, 4); R(g, "#d6f0ff", wx + 2, 35, 1, 2); R(g, trim, wx + 4, 35, 1, 7); R(g, trim, wx + 2, 38, 5, 1);
      R(g, "#6a4020", wx, 44, 9, 3); R(g, "#8a5a30", wx, 44, 9, 1);
      for (const [dx, c] of [[1, "#e84a6a"], [3, "#ffd23f"], [5, "#fff"], [7, "#e84a6a"]]) { R(g, "#3a9a3a", wx + dx, 43, 1, 1); R(g, c, wx + dx, 42, 1, 1); }
    }
    R(g, "#3b2814", 23, 35, 12, 21); R(g, "#7a4a28", 24, 36, 10, 19);                  // door
    R(g, "#9a6a3c", 24, 36, 10, 1); R(g, "#5e3a1c", 28, 36, 1, 19); R(g, "#6a4020", 25, 38, 3, 6); R(g, "#6a4020", 30, 38, 3, 6); R(g, "#6a4020", 25, 46, 3, 7); R(g, "#6a4020", 30, 46, 3, 7);
    R(g, "#ffd23f", 31, 46, 2, 2); R(g, "#c8a020", 31, 47, 2, 1);
    R(g, "#9a9ea8", 21, 53, 16, 3); R(g, "#b8bcc6", 21, 53, 16, 1);                    // step
    R(g, "#3b2814", 38, 38, 4, 7); R(g, "#ffd88a", 39, 40, 2, 4); R(g, "#6a4020", 38, 37, 4, 1);   // lantern
    if (shop) {
      for (let i = 0; i < 24; i++) R(g, i % 6 < 3 ? "#e24b4b" : "#fff8f0", 16 + i, 29, 1, 6);
      R(g, "#3b2814", 16, 35, 24, 1); for (let i = 0; i < 4; i++) { R(g, i % 2 ? "#fff8f0" : "#e24b4b", 16 + i * 6, 35, 6, 2); }
      R(g, "#3b2814", 44, 30, 10, 8); R(g, "#d8b070", 45, 31, 8, 6); g.fillStyle = "#5a3a1c"; g.font = "bold 5px monospace"; g.fillText("SHOP", 45, 36);
    }
    if (label) { g.fillStyle = "#fff"; g.font = "bold 5px monospace"; g.fillText(label, 3, 12); }
  });
}

// ---------------------------------------------------------------- characters
export const PLAYER_LOOK = { skin: "#f4c9a0", hair: "#6a4426", hairStyle: "short", shirt: "#d4504a", pants: "#3f5fa8", shoes: "#4a2e1a", eye: "#2a1a12" };

function drawPerson(L, dir, f) {
  const skin = L.skin, skinD = shade(skin, -0.14), hair = L.hair, hairL = shade(hair, 0.22), hairD = shade(hair, -0.2);
  const shirt = L.shirt, shirtD = shade(shirt, -0.18), shirtL = shade(shirt, 0.15), pants = L.pants, pantsD = shade(pants, -0.2), shoes = L.shoes;
  const style = L.hairStyle;
  const step = f === 1 ? -1 : f === 2 ? 1 : 0;                                       // -1: left leg forward, 1: right leg forward
  return mk(16, 24, g => {
    if (dir === 2) {                                                                // facing right
      const sw = step * 2;
      const legX = [[6, 7], [8, 9]], lx = [6 + (step === -1 ? -1 : 0), 8 + (step === 1 ? 1 : 0)];
      for (let i = 0; i < 2; i++) { const x = i === 0 ? lx[0] : lx[1]; R(g, i ? pantsD : pants, x, 18, 3, 4 - (i === 0 && step === 1 ? 1 : 0)); R(g, shoes, x - (i && step ? 0 : 0), 22 - (i === 0 && step === 1 ? 1 : 0), 4, 2); }
      R(g, shirtD, 5, 11, 6, 7); R(g, shirt, 5, 11, 5, 7); R(g, shirtL, 5, 11, 5, 1); R(g, "#6a4020", 5, 17, 6, 1);
      R(g, skin, 7, 10, 3, 2);
      R(g, skin, 5, 3, 7, 8); R(g, skinD, 5, 9, 7, 2); R(g, skin, 12, 7, 1, 2);
      if (style !== "bald") { R(g, hair, 4, 2, 8, 4); R(g, hairL, 5, 2, 5, 1); R(g, hair, 4, 5, 3, 5); R(g, hairD, 4, 8, 3, 2); if (style === "long") { R(g, hair, 3, 6, 4, 9); R(g, hairD, 3, 12, 3, 3); } if (style === "bun") { R(g, hair, 5, 0, 4, 3); R(g, hairL, 6, 0, 2, 1); } if (style === "cap") { R(g, L.cap, 4, 1, 8, 4); R(g, shade(L.cap, 0.2), 5, 1, 5, 1); R(g, shade(L.cap, -0.2), 11, 4, 3, 1); } }
      else { R(g, skin, 5, 2, 7, 2); }
      if (L.beard) { R(g, L.beard, 8, 9, 5, 3); R(g, shade(L.beard, 0.2), 9, 9, 3, 1); }
      R(g, L.eye, 10, 7, 1, 2);
      R(g, shirt, 7 + sw / 2, 12, 3, 5); R(g, shirtD, 9 + sw / 2, 12, 1, 5); R(g, skin, 7 + sw / 2, 17, 3, 2);
    } else if (dir === 3) {
      return;                                                                        // mirrored by caller
    } else {
      const up = dir === 1;
      const swing = step;                                                           // arms swing opposite legs
      const lyl = 18 - (step === -1 ? 1 : 0) + (step === 1 ? 0 : 0), lyr = 18 - (step === 1 ? 1 : 0);
      R(g, pants, 5, lyl, 3, 4 + (step === -1 ? -0 : 0)); R(g, pantsD, 8, lyr, 3, 4); R(g, pantsD, 7, 18, 1, 2);
      R(g, shoes, 5, 22 - (step === -1 ? 1 : 0), 3, 2); R(g, shoes, 8, 22 - (step === 1 ? 1 : 0), 3, 2);
      R(g, shirtD, 4, 11, 8, 7); R(g, shirt, 4, 11, 5, 7); R(g, shirtL, 5, 11, 3, 1); R(g, "#6a4020", 4, 17, 8, 1); R(g, "#ffd23f", 7, 17, 2, 1);
      R(g, skin, 7, 10, 2, 2);
      R(g, shirt, 2, 11 + (swing === 1 ? 1 : 0), 2, 4); R(g, skin, 2, 15 + (swing === 1 ? 1 : 0), 2, 2); R(g, shirtD, 12, 11 + (swing === -1 ? 1 : 0), 2, 4); R(g, skin, 12, 15 + (swing === -1 ? 1 : 0), 2, 2);
      R(g, skin, 4, 3, 8, 8); R(g, skinD, 4, 10, 8, 1);
      if (!up) {
        R(g, L.eye, 6, 7, 1, 2); R(g, L.eye, 9, 7, 1, 2); R(g, "#fff", 6, 7); R(g, "#fff", 9, 7); R(g, "#e89a8a", 5, 9, 2, 1); R(g, "#e89a8a", 9, 9, 2, 1);
        if (L.beard) { R(g, L.beard, 4, 9, 8, 3); R(g, shade(L.beard, 0.2), 6, 9, 4, 1); R(g, skin, 7, 8, 2, 1); }
      }
      if (style !== "bald") {
        R(g, hair, 3, 2, 10, up ? 9 : 5); R(g, hairL, 5, 2, 6, 1); R(g, hairL, 4, 3, 2, 1);
        if (!up) { R(g, hair, 3, 6, 2, 3); R(g, hair, 11, 6, 2, 3); R(g, hairD, 3, 8, 2, 1); R(g, hairD, 11, 8, 2, 1); } else { R(g, hairD, 4, 8, 8, 2); }
        if (style === "long") { R(g, hair, 3, 6, 2, 9); R(g, hair, 11, 6, 2, 9); R(g, hairD, 3, 12, 2, 3); R(g, hairD, 11, 12, 2, 3); if (up) R(g, hair, 3, 6, 10, 9); }
        if (style === "bun") { R(g, hair, 6, 0, 4, 3); R(g, hairL, 7, 0, 2, 1); }
        if (style === "cap") { R(g, L.cap, 3, 1, 10, 4); R(g, shade(L.cap, 0.2), 4, 1, 6, 1); if (!up) { R(g, shade(L.cap, -0.25), 3, 5, 10, 1); R(g, shade(L.cap, -0.1), 2, 4, 12, 1); } }
      }
    }
  });
}

// Four directions (down, up, right, left) x three frames (idle, step A, step B), each outlined.
export function makePerson(look) {
  const L = { ...PLAYER_LOOK, ...look };
  const frames = dir => [0, 1, 2].map(f => outline(drawPerson(L, dir, f)));
  const right = frames(2);
  return [frames(0), frames(1), right, right.map(flip)];
}

export { drawTree, drawRock, drawPalm, drawCactus };
