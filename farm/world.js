// Procedural generation of the three maps: Farm, Town, Forest. Tile types:
// 0 grass, 1 tilled, 2 water, 3 tree/rock, 4 farmhouse, 5 bin, 6 shop, 7 pen floor, 8 path, 10 decor building
import { PEN } from "./data.js";

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blank = (w, h, name) => ({ name, w, h, tiles: Array.from({ length: h }, () => Array.from({ length: w }, () => ({ t: 0 }))), objects: [], warps: [] });
const put = (m, x, y, t, extra) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[y][x] = { t, ...extra }; };
const fill = (m, x0, y0, x1, y1, t, extra) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(m, x, y, t, extra); };
const inRect = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

function border(m, gaps) {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++)
    if ((x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) && !gaps.some(g => inRect(x, y, g))) put(m, x, y, 3);
}
function scatter(m, rnd, count, ok) {
  let placed = 0;
  for (let i = 0; i < count * 8 && placed < count; i++) {
    const x = 1 + Math.floor(rnd() * (m.w - 2)), y = 1 + Math.floor(rnd() * (m.h - 2));
    if (m.tiles[y][x].t === 0 && ok(x, y)) { put(m, x, y, 3, { rock: rnd() < 0.35 }); placed++; }
  }
}
function pond(m, cx, cy, rx, ry, water) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(m, x, y, 2, { water });
}
function building(m, sprite, x, y, t, kind) {
  fill(m, x, y, x + 2, y + 1, t, { kind });
  m.objects.push({ sprite, x, y, h: 2 });
}

function makeFarm(rnd) {
  const m = blank(50, 34, "Farm");
  border(m, [{ x0: 49, y0: 15, x1: 49, y1: 18 }]);
  fill(m, 7, 7, 8, 16, 8); fill(m, 7, 16, 49, 17, 8);                            // paths: door -> east exit
  building(m, "home", 6, 5, 4, "home");
  put(m, 11, 7, 5, { kind: "bin" }); m.objects.push({ sprite: "bin", x: 11, y: 7, h: 1 });
  fill(m, PEN.x0, PEN.y0, PEN.x1, PEN.y1, 7);
  pond(m, 34, 25, 4.5, 3, "pond");
  scatter(m, rnd, 55, (x, y) => !(x >= 3 && x <= 14 && y >= 3 && y <= 10) && !(x >= PEN.x0 - 2 && x <= PEN.x1 + 2 && y >= PEN.y0 - 2 && y <= PEN.y1 + 2)
    && !(y >= 14 && y <= 19) && !(x >= 28 && x <= 40 && y >= 20 && y <= 30));
  m.warps.push({ x: 49, y: 15, w: 1, h: 4, to: "town", tx: 2, ty: 13 });
  return m;
}

function makeTown(rnd) {
  const m = blank(44, 28, "Town");
  border(m, [{ x0: 0, y0: 12, x1: 0, y1: 15 }, { x0: 30, y0: 0, x1: 31, y1: 0 }]);
  fill(m, 0, 13, 43, 14, 8); fill(m, 18, 7, 19, 13, 8); fill(m, 30, 0, 31, 13, 8);
  building(m, "shop", 17, 5, 6, "shop");
  building(m, "h1", 6, 4, 10, "house"); building(m, "h2", 26, 4, 10, "house");
  building(m, "h3", 6, 18, 10, "house"); building(m, "h1", 26, 18, 10, "house");
  pond(m, 38, 21, 4, 3, "pond");
  scatter(m, rnd, 45, (x, y) => !(y >= 12 && y <= 15) && !(x >= 16 && x <= 20 && y <= 14) && !(x >= 29 && x <= 32 && y <= 14)
    && !(x >= 4 && x <= 10 && ((y >= 3 && y <= 7) || (y >= 17 && y <= 21))) && !(x >= 24 && x <= 30 && ((y >= 3 && y <= 7) || (y >= 17 && y <= 21))));
  m.warps.push({ x: 0, y: 12, w: 1, h: 4, to: "farm", tx: 47, ty: 16 }, { x: 30, y: 0, w: 2, h: 1, to: "forest", tx: 30, ty: 28 });
  return m;
}

function makeForest(rnd) {
  const m = blank(46, 32, "Forest");
  border(m, [{ x0: 30, y0: 31, x1: 31, y1: 31 }]);
  fill(m, 30, 24, 31, 31, 8);
  pond(m, 21, 18, 9, 5, "lake");
  scatter(m, rnd, 170, (x, y) => !(x >= 10 && x <= 32 && y >= 11 && y <= 25) && !(x >= 26 && x <= 35 && y >= 22) && !(x >= 8 && x <= 13 && y >= 16 && y <= 22));
  m.warps.push({ x: 30, y: 31, w: 2, h: 1, to: "town", tx: 30, ty: 2 });
  return m;
}

export function generateWorld(seed = 20240607) {
  const rnd = rng(seed);
  return { farm: makeFarm(rnd), town: makeTown(rnd), forest: makeForest(rnd) };
}
