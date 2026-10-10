// Procedural generation of the three maps: Farm, Town, Forest. Tile types:
// 17 house floor, 18 house wall, 19 furniture (blocking, drawn on floor); 0 grass, 1 tilled, 2 water, 3 tree/rock, 4 farmhouse, 5 bin, 6 shop, 7 pen floor, 8 path, 10 decor building,
// 11 cave wall, 12 cave floor, 13 ore node, 14 sand (beach / desert), 15 greenhouse floor, 16 greenhouse wall
import { PEN, PASTURE } from "./data.js";

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

// Building plots: [id, x, y, w, h, sprite]. Tiles block movement from the start; the sprite changes when built.
export const PLOTS = [["coop", 44, 3, 3, 2, "plot"], ["barn", 30, 4, 3, 2, "plot"], ["silo", 16, 4, 2, 2, "plotS"], ["greenhouse", 21, 4, 3, 2, "plot"]];
export const GH_DOOR = { x: 22, y: 6 };                                              // where you stand outside the greenhouse

function makeFarm(rnd) {
  const m = blank(64, 44, "Farm");
  border(m, [{ x0: 63, y0: 19, x1: 63, y1: 22 }]);
  fill(m, 7, 7, 8, 21, 8); fill(m, 7, 20, 63, 21, 8);                            // paths: door -> east exit
  building(m, "home", 6, 5, 4, "home");
  put(m, 11, 7, 5, { kind: "bin" }); m.objects.push({ sprite: "bin", x: 11, y: 7, h: 1 });
  fill(m, PEN.x0, PEN.y0, PEN.x1, PEN.y1, 7); fill(m, PASTURE.x0, PASTURE.y0, PASTURE.x1, PASTURE.y1, 7);
  for (const [id, x, y, w, h, sprite] of PLOTS) { fill(m, x, y, x + w - 1, y + h - 1, 10, { kind: "plot", plot: id }); m.objects.push({ sprite, x, y, h, w, plot: id }); }
  pond(m, 46, 34, 5, 4, "pond");
  scatter(m, rnd, 90, (x, y) => !(x >= 3 && x <= 24 && y >= 3 && y <= 10) && !(x >= 24 && x <= 50 && y >= 2 && y <= 14)
    && !(y >= 18 && y <= 23) && !(x >= 38 && x <= 54 && y >= 28 && y <= 40));
  m.warps.push({ x: 63, y: 19, w: 1, h: 4, to: "town", tx: 2, ty: 13 });
  return m;
}

// The village upgrade: a fountain plaza, clinic, library, inn, smithy, market stalls and lamp posts. Idempotent, and also applied to older saves.
export function upgradeTown(m) {
  if (m.v2) return; m.v2 = true;
  const stamp = (sprite, x, y, w, h, kind) => { fill(m, x, y, x + w - 1, y + h - 1, 10, { kind }); m.objects.push({ sprite, x, y, w, h }); };
  fill(m, 20, 8, 25, 11, 8);                                                       // paved plaza
  stamp("fountain", 22, 9, 2, 2, "fountain");
  const lots = [["clinic", 35, 4, "clinic", 36], ["library", 11, 4, "library", 12], ["inn", 26, 23, "inn", 27], ["smithy", 6, 23, "smithy", 7]];
  for (const [sprite, x, y, kind, dx] of lots) {
    fill(m, x - 1, y, x + 3, y + 1, 0); stamp(sprite, x, y, 3, 2, kind);
    if (y < 10) fill(m, dx, y + 2, dx + 1, 12, 8);                                // path from the door down to the main road
  }
  fill(m, 7, 25, 21, 26, 8); fill(m, 22, 25, 28, 26, 8);                          // south paths join the road to the beach
  for (const [x, y] of [[17, 12], [25, 12], [17, 15], [25, 15], [33, 12], [9, 12], [9, 15], [40, 12]]) if (m.tiles[y][x].t === 0) stamp("lamp", x, y, 1, 1, "lamp");
  stamp("stall", 23, 16, 2, 1, "stall"); stamp("stall", 26, 16, 2, 1, "stall");
}

function makeTown(rnd) {                                                            // 64x44: the original centre (top-left) plus an east district, a river and a south bank
  const m = blank(64, 44, "Town");
  border(m, [{ x0: 0, y0: 12, x1: 0, y1: 15 }, { x0: 30, y0: 0, x1: 31, y1: 0 }, { x0: 20, y0: 43, x1: 23, y1: 43 }, { x0: 63, y0: 12, x1: 63, y1: 15 }]);
  fill(m, 0, 13, 63, 14, 8); fill(m, 18, 7, 19, 13, 8); fill(m, 30, 0, 31, 13, 8); fill(m, 20, 15, 21, 43, 8);
  put(m, 22, 12, 10, { kind: "board" }); m.objects.push({ sprite: "board", x: 22, y: 12, h: 1, w: 1 });          // quest bulletin board
  building(m, "shop", 17, 5, 6, "shop");
  building(m, "h1", 6, 4, 10, "house"); building(m, "h2", 26, 4, 10, "house");
  building(m, "h3", 6, 18, 10, "house"); building(m, "h1", 26, 18, 10, "house");
  building(m, "centre", 12, 18, 10, "centre");                                     // community centre
  pond(m, 38, 21, 4, 3, "pond");
  upgradeTown(m);
  // east district: a north-south avenue, more homes, the town hall and the post office
  fill(m, 50, 2, 51, 27, 8);
  const lot = (sprite, x, y, kind, doorX) => { fill(m, x - 1, y, x + 3, y + 1, 0); building(m, sprite, x, y, 10, kind); fill(m, doorX, y + 2, doorX + 1, y < 13 ? 12 : y + 3, 8); };
  lot("h2", 45, 4, "house", 46); lot("townhall", 55, 4, "hall", 56);
  for (const [sprite, x, kind] of [["post", 45, "post"], ["h3", 55, "house"]]) { fill(m, x - 1, 18, x + 3, 19, 0); building(m, sprite, x, 18, 10, kind); }
  fill(m, 45, 20, 57, 21, 8);
  // the river and a bridge, then the south bank with the museum and more homes
  for (let x = 1; x < 63; x++) for (const y of [30, 31]) put(m, x, y, 2, { water: "pond" });
  fill(m, 20, 30, 21, 31, 8);
  fill(m, 6, 36, 58, 37, 8);
  for (const [sprite, x, kind] of [["h1", 8, "house"], ["museum", 28, "museum"], ["h2", 40, "house"], ["h3", 50, "house"]]) { fill(m, x - 1, 34, x + 3, 35, 0); building(m, sprite, x, 34, 10, kind); }
  pond(m, 14, 41, 3, 2, "pond"); pond(m, 57, 41, 3, 2, "pond");
  for (const [x, y] of [[45, 12], [53, 12], [60, 12], [45, 15], [53, 15], [60, 15], [19, 29], [22, 29], [19, 32], [22, 32], [30, 38], [46, 38]]) if (m.tiles[y][x].t === 0) { fill(m, x, y, x, y, 10, { kind: "lamp" }); m.objects.push({ sprite: "lamp", x, y, w: 1, h: 1 }); }
  const keep = (x, y) => (y >= 11 && y <= 15) || (y >= 29 && y <= 32) || (y >= 35 && y <= 38) || (x >= 19 && x <= 22) || (x >= 49 && x <= 52 && y <= 28);
  scatter(m, rnd, 45, (x, y) => !(y >= 11 && y <= 15) && !(x >= 19 && x <= 22 && y >= 15) && !(x >= 16 && x <= 20 && y <= 14) && !(x >= 29 && x <= 32 && y <= 14)
    && !(x >= 4 && x <= 16 && ((y >= 3 && y <= 7) || (y >= 17 && y <= 21))) && !(x >= 24 && x <= 30 && ((y >= 3 && y <= 7) || (y >= 17 && y <= 21))) && x < 44 && y < 28);
  scatter(m, rnd, 60, (x, y) => (x >= 44 || y >= 28) && !keep(x, y) && !(x >= 44 && x <= 58 && ((y >= 3 && y <= 7) || (y >= 17 && y <= 21))));
  m.warps.push({ x: 0, y: 12, w: 1, h: 4, to: "farm", tx: 61, ty: 20 }, { x: 30, y: 0, w: 2, h: 1, to: "forest", tx: 30, ty: 28 },
    { x: 20, y: 43, w: 4, h: 1, to: "beach", tx: 21, ty: 2 }, { x: 63, y: 12, w: 1, h: 4, to: "desert", tx: 2, ty: 15 });
  return m;
}

function makeForest(rnd) {
  const m = blank(46, 32, "Forest");
  border(m, [{ x0: 30, y0: 31, x1: 31, y1: 31 }]);
  fill(m, 30, 24, 31, 31, 8);
  pond(m, 21, 18, 9, 5, "lake");
  building(m, "cave", 38, 4, 10, "mine");                                          // mine entrance
  scatter(m, rnd, 170, (x, y) => !(x >= 36 && x <= 42 && y <= 9) && !(x >= 10 && x <= 32 && y >= 11 && y <= 25) && !(x >= 26 && x <= 35 && y >= 22) && !(x >= 8 && x <= 13 && y >= 16 && y <= 22) && !(x >= 31 && x <= 37 && y >= 6 && y <= 11));
  m.warps.push({ x: 30, y: 31, w: 2, h: 1, to: "town", tx: 30, ty: 2 });
  return m;
}

function scatterDeco(m, rnd, count, deco, ok) {
  let placed = 0;
  for (let i = 0; i < count * 8 && placed < count; i++) {
    const x = 1 + Math.floor(rnd() * (m.w - 2)), y = 1 + Math.floor(rnd() * (m.h - 2));
    if (m.tiles[y][x].t === 14 && ok(x, y)) { put(m, x, y, 3, { deco }); placed++; }
  }
}

function makeBeach(rnd) {
  const m = blank(46, 30, "Beach");
  fill(m, 0, 0, m.w - 1, m.h - 1, 14);
  border(m, [{ x0: 20, y0: 0, x1: 23, y1: 0 }]);
  for (let x = 0; x < m.w; x++) {                                                   // ocean with a wavy shoreline
    const shore = 19 + Math.round(Math.sin(x / 3.2) * 1.4 + Math.sin(x / 1.7) * 0.6);
    for (let y = shore; y < m.h; y++) put(m, x, y, 2, { water: "ocean" });
  }
  fill(m, 20, 1, 23, 8, 8);                                                         // boardwalk down from town
  building(m, "boat", 37, 15, 10, "boat");                                         // rowboat to the island
  for (let y = 15; y <= 16; y++) for (let x = 37; x <= 39; x++) m.tiles[y][x].dest = "island";
  scatterDeco(m, rnd, 26, "palm", (x, y) => y < 17 && !(x >= 19 && x <= 24 && y <= 9) && !(x >= 20 && x <= 24 && y >= 14 && y <= 18) && !(x >= 35 && x <= 41 && y >= 12));
  for (const row of m.tiles) for (const t of row) if (t.t === 3 && !t.deco) t.deco = "palm";
  m.warps.push({ x: 20, y: 0, w: 4, h: 1, to: "town", tx: 21, ty: 41 });
  return m;
}

function makeDesert(rnd) {
  const m = blank(50, 32, "Desert");
  fill(m, 0, 0, m.w - 1, m.h - 1, 14);
  border(m, [{ x0: 0, y0: 14, x1: 0, y1: 17 }]);
  pond(m, 34, 20, 5, 3, "oasis");
  scatterDeco(m, rnd, 55, "cactus", (x, y) => !(x <= 5 && y >= 12 && y <= 19) && !(((x - 34) / 7) ** 2 + ((y - 20) / 5) ** 2 < 1) && !(x >= 22 && x <= 30 && y >= 9 && y <= 13));
  fill(m, 1, 15, 14, 16, 8);                                                        // trail from town
  for (const row of m.tiles) for (const t of row) if (t.t === 3 && !t.deco) t.deco = "cactus";
  m.warps.push({ x: 0, y: 14, w: 1, h: 4, to: "town", tx: 61, ty: 13 });
  return m;
}

function makeIsland(rnd) {
  const m = blank(40, 28, "Island");
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) put(m, x, y, 2, { water: "deep" });
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (((x - 20) / 15) ** 2 + ((y - 13) / 9.5) ** 2 + Math.sin(x * 1.3 + y) * 0.04 <= 1) put(m, x, y, 14);
  fill(m, 19, 17, 21, 20, 8);                                                       // path to the boat
  building(m, "boat", 19, 20, 10, "boat");
  for (let y = 20; y <= 21; y++) for (let x = 19; x <= 21; x++) m.tiles[y][x].dest = "beach";
  scatterDeco(m, rnd, 34, "palm", (x, y) => !(x >= 17 && x <= 23 && y >= 15));
  return m;
}

function makeGreenhouse() {
  const m = blank(15, 11, "Greenhouse");
  fill(m, 0, 0, 14, 10, 15);
  for (let x = 0; x < 15; x++) { put(m, x, 0, 16); if (x < 6 || x > 8) put(m, x, 10, 16); }
  for (let y = 0; y < 11; y++) { put(m, 0, y, 16); put(m, 14, y, 16); }
  for (const [x0, y0] of [[2, 2], [8, 2], [2, 6], [8, 6]]) fill(m, x0, y0, x0 + 4, y0 + 2, 1);
  m.warps.push({ x: 6, y: 10, w: 3, h: 1, to: "farm", tx: GH_DOOR.x, ty: GH_DOOR.y });
  return m;
}


// ---- house interiors -------------------------------------------------------------------------------------
// Rooms are 8 tiles tall (two wall rows, six floor rows) and grow wider with each upgrade; they are drawn at 2x zoom.
// Tile types: 17 floor, 18 wall, 19 furniture (blocks movement, drawn on the floor). Flat objects (rugs, mats) are decals.
function furn(m, sprite, kind, x, y, w = 1, h = 1) {
  fill(m, x, y, x + w - 1, y + h - 1, 19, { kind });
  m.objects.push({ sprite, x, y, w, h });
}
const decal = (m, sprite, x, y, w, h) => m.objects.push({ sprite, x, y, w, h, flat: true });
const deco = (m, sprite, x, y, w, h) => m.objects.push({ sprite, x, y, w, h });                         // sprites on the wall (no collision)

export function makeHouse(level = 0) {
  const w = 9 + 3 * Math.min(2, level), m = blank(w, 8, "House");
  m.indoor = true; m.zoom = 2; m.style = "wood"; m.level = level; m.entry = { x: 3, y: 6 }; m.spawn = { x: 2, y: 4 };
  fill(m, 0, 0, w - 1, 7, 17); fill(m, 0, 0, w - 1, 1, 18); fill(m, 0, 2, 0, 7, 18); fill(m, w - 1, 2, w - 1, 7, 18);
  furn(m, "bed", "bed", 1, 2, 2, 2);
  furn(m, "hearth", "hearth", 4, 2, 2, 1);
  furn(m, "chest", "chest", 6, 2);
  furn(m, "mirror", "mirror", 7, 2);
  furn(m, "table", "table", 4, 5, 2, 1);
  furn(m, "plant", "plant", 1, 6);
  decal(m, "rug", 3, 3, 4, 2); decal(m, "mat", 3, 7, 2, 1);
  deco(m, "window", 3, 0, 1, 2); deco(m, "window", 6, 0, 1, 2);
  m.warps.push({ x: 3, y: 7, w: 2, h: 1, to: "farm", tx: 7, ty: 7 });
  if (level >= 1) {                                                                   // kitchen: stove, fridge, counter
    furn(m, "stove", "stove", 8, 2, 2, 1); furn(m, "fridge", "chest", 10, 2); furn(m, "counter", "counter", 8, 4, 2, 1);
    deco(m, "window", 9, 0, 1, 2);
  }
  if (level >= 2) {                                                                   // bedroom wing: double bed, bookshelf, rug
    furn(m, "bed2", "bed", 11, 2, 2, 2); furn(m, "shelf", "shelf", 13, 2); furn(m, "plant", "plant", 12, 6);
    decal(m, "rugS", 11, 4, 3, 2); deco(m, "window", 12, 0, 1, 2);
  }
  if (level >= 3) {                                                                   // cellar hatch
    decal(m, "trapdoor", 10, 6, 1, 1);
    m.warps.push({ x: 10, y: 6, w: 1, h: 1, to: "cellar", tx: 4, ty: 3 });
  }
  return m;
}

export function makeCellar() {
  const m = blank(10, 8, "Cellar");
  m.indoor = true; m.zoom = 2; m.style = "stone"; m.entry = { x: 4, y: 3 };
  fill(m, 0, 0, 9, 7, 17); fill(m, 0, 0, 9, 1, 18); fill(m, 0, 2, 0, 7, 18); fill(m, 9, 2, 9, 7, 18);
  decal(m, "stairs", 4, 2, 2, 1);
  m.warps.push({ x: 4, y: 2, w: 2, h: 1, to: "house", tx: 10, ty: 5 });
  furn(m, "barrel", "barrel", 1, 2); furn(m, "barrel", "barrel", 2, 2); furn(m, "crate", "crate", 7, 2); furn(m, "crate", "crate", 8, 2);
  furn(m, "chest", "chest2", 8, 5); furn(m, "barrel", "barrel", 1, 6); furn(m, "crate", "crate", 7, 6);
  decal(m, "mat", 4, 5, 2, 1);
  return m;
}

export function generateWorld(seed = 20240607) {
  const rnd = rng(seed);
  return { farm: makeFarm(rnd), town: makeTown(rnd), forest: makeForest(rnd), beach: makeBeach(rnd), desert: makeDesert(rnd), island: makeIsland(rnd), greenhouse: makeGreenhouse(), house: makeHouse(0), cellar: makeCellar() };
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
  const weights = [["stone", 55], ["copper", floor < 10 ? 25 : 12], ["iron", floor >= 4 ? 18 : 0], ["gold", floor >= 9 ? 12 : 0], ["amethyst", floor >= 6 ? 5 : 0], ["aquamarine", floor >= 10 ? 6 : 0], ["ruby", floor >= 20 ? 5 : 0]];
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
