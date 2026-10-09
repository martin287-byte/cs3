// Procedural generation of the three maps: Farm, Town, Forest. Tile types:
// 0 grass, 1 tilled, 2 water, 3 tree/rock, 4 farmhouse, 5 bin, 6 shop, 7 pen floor, 8 path, 10 decor building,
// 11 cave wall, 12 cave floor, 13 ore node
import { PEN, ORES } from "./data.js";

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
  building(m, "cave", 38, 4, 10, "mine");                                          // mine entrance
  scatter(m, rnd, 170, (x, y) => !(x >= 36 && x <= 42 && y <= 9) && !(x >= 10 && x <= 32 && y >= 11 && y <= 25) && !(x >= 26 && x <= 35 && y >= 22) && !(x >= 8 && x <= 13 && y >= 16 && y <= 22));
  m.warps.push({ x: 30, y: 31, w: 2, h: 1, to: "town", tx: 30, ty: 2 });
  return m;
}

export function generateWorld(seed = 20240607) {
  const rnd = rng(seed);
  return { farm: makeFarm(rnd), town: makeTown(rnd), forest: makeForest(rnd) };
}

// One mine floor: a chain of caves joined by corridors, an exit where you arrive and a ladder down.
export function makeMine(floor) {
  const rnd = rng(floor * 7919 + Math.floor(Math.random() * 1e6));
  const m = blank(34, 24, `Mine ${floor}F`);
  fill(m, 0, 0, m.w - 1, m.h - 1, 11);
  const rooms = [];
  let cx = 4, cy = 4 + Math.floor(rnd() * 14);
  for (let i = 0; i < 5; i++) {
    const rx = 2.5 + rnd() * 2.5, ry = 2 + rnd() * 2;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(m, x, y, 12);
    rooms.push([Math.round(cx), Math.round(cy)]);
    const nx = Math.min(m.w - 5, cx + 5 + Math.floor(rnd() * 3)), ny = 3 + Math.floor(rnd() * (m.h - 6));
    for (let x = Math.round(cx); x <= nx; x++) fill(m, x, Math.round(cy), x, Math.round(cy) + 1, 12);   // horizontal corridor
    for (let y = Math.min(Math.round(cy), ny); y <= Math.max(Math.round(cy), ny); y++) fill(m, nx, y, nx + 1, y, 12);   // vertical corridor
    cx = nx; cy = ny;
  }
  const [sx, sy] = rooms[0], [lx, ly] = rooms[rooms.length - 1];
  m.start = { x: sx, y: sy + 1 };
  put(m, sx, sy, 12, { kind: "mexit" });
  put(m, lx, ly, 12, { kind: "ladder" });
  const weights = [["stone", 55], ["copper", floor < 10 ? 25 : 12], ["iron", floor >= 4 ? 18 : 0], ["gold", floor >= 9 ? 12 : 0], ["amethyst", floor >= 6 ? 5 : 0]];
  const total = weights.reduce((a, [, w]) => a + w, 0), nodes = 16 + Math.floor(floor / 2) * 2;
  for (let i = 0, placed = 0; i < 600 && placed < nodes; i++) {
    const x = 1 + Math.floor(rnd() * (m.w - 2)), y = 1 + Math.floor(rnd() * (m.h - 2)), t = m.tiles[y][x];
    if (t.t !== 12 || t.kind || (Math.abs(x - sx) < 2 && Math.abs(y - sy) < 2) || (Math.abs(x - lx) < 2 && Math.abs(y - ly) < 2)) continue;
    let r = rnd() * total, ore = "stone";
    for (const [id, w] of weights) if ((r -= w) <= 0) { ore = id; break; }
    put(m, x, y, 13, { ore }); placed++;
  }
  return m;
}
