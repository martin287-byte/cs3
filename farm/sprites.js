// Procedural pixel art: every sprite is drawn once into an offscreen canvas at startup.
export const SEASONS = [
  { name: "Spring", grass: "#5fae4f", g2: "#74c460", g3: "#4a9340", leaf: "#4caf50", leaf2: "#7ed957", out: "#1f4d28" },
  { name: "Summer", grass: "#4f9f3a", g2: "#63b84a", g3: "#3e8630", leaf: "#2e8b3a", leaf2: "#4cb054", out: "#1b4a24" },
  { name: "Fall",   grass: "#9aa347", g2: "#b3b755", g3: "#7f8a38", leaf: "#d9822b", leaf2: "#f0a73a", out: "#8a4a15" },
  { name: "Winter", grass: "#dfe9f2", g2: "#f3f8fc", g3: "#c3d3e3", leaf: "#3f6b52", leaf2: "#f3f8fc", out: "#2d4a3a" },
];

export function hash(a, b, c = 0) {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function mk(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; fn(g); return c;
}
const R = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const disc = (g, c, cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) R(g, c, cx + x, cy + y); };
function art(g, rows, pal) { rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) R(g, pal[ch], x, y); })); }
const flip = src => mk(src.width, src.height, g => { g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); });

// ---- tiles ----
function grass(s, v) {
  const P = SEASONS[s];
  return mk(16, 16, g => {
    R(g, P.grass, 0, 0, 16, 16);
    for (let i = 0; i < 7; i++) R(g, i % 2 ? P.g2 : P.g3, Math.floor(hash(i, v, s) * 16), Math.floor(hash(i, v, s + 9) * 16));
    if (v === 1) { R(g, P.g3, 5, 9, 1, 2); R(g, P.g3, 6, 10); R(g, P.g3, 10, 4, 1, 2); }
    if (v === 2 && s === 0) { R(g, "#f4a6c8", 9, 7); R(g, "#fff", 9, 6); }
    if (v === 2 && s === 1) { R(g, "#ffe066", 9, 7); R(g, "#fff", 8, 7); }
    if (v === 2 && s === 2) R(g, "#d0652a", 9, 7, 2, 1);
  });
}
function soil(wet) {
  return mk(16, 16, g => {
    R(g, wet ? "#4a3320" : "#7a5230", 0, 0, 16, 16);
    for (let i = 0; i < 8; i++) R(g, i % 2 ? (wet ? "#5c4129" : "#8a6039") : (wet ? "#3b281a" : "#6a4526"), Math.floor(hash(i, 3, wet) * 16), Math.floor(hash(i, 4, wet) * 16));
    for (const y of [4, 10]) { R(g, wet ? "#35241a" : "#5e3e22", 0, y, 16, 1); R(g, wet ? "#5c4129" : "#8f6a3f", 0, y + 1, 16, 1); }
    R(g, "rgba(0,0,0,.25)", 0, 0, 16, 1); R(g, "rgba(0,0,0,.25)", 0, 0, 1, 16);
  });
}
const water = f => mk(16, 16, g => {
  R(g, "#3a7bd5", 0, 0, 16, 16); R(g, "#336fc4", 0, 12, 16, 4);
  for (let i = 0; i < 4; i++) R(g, "#8fc1f5", (i * 5 + f * 3) % 14, 2 + i * 4, 3, 1);
});
const pen = () => mk(16, 16, g => {
  R(g, "#c9b26a", 0, 0, 16, 16);
  for (let i = 0; i < 9; i++) R(g, i % 2 ? "#b39a50" : "#dcc982", Math.floor(hash(i, 7) * 14), Math.floor(hash(i, 8) * 16), 2, 1);
});

// ---- scenery ----
function tree(s) {
  const P = SEASONS[s];
  return mk(16, 24, g => {
    R(g, "#4e3119", 6, 14, 4, 10); R(g, "#6b4423", 7, 14, 2, 10);
    disc(g, P.out, 8, 8, 7); disc(g, P.leaf, 8, 8, 6); disc(g, P.leaf2, 6, 6, 3);
    if (s === 3) { R(g, "#fff", 3, 3, 10, 2); R(g, "#fff", 5, 2, 6, 1); }
  });
}
const rock = () => mk(16, 16, g => {
  disc(g, "#5d6066", 8, 10, 6); disc(g, "#8a8d93", 8, 9, 5); disc(g, "#b5b8be", 6, 7, 2);
});
function building(roof, roof2, wall, wall2, shop) {
  return mk(48, 40, g => {
    R(g, "#3a2616", 2, 14, 44, 26); R(g, wall, 3, 15, 42, 24);
    for (let y = 18; y < 39; y += 4) R(g, wall2, 3, y, 42, 1);
    for (let y = 0; y < 16; y++) {
      const half = Math.round(6 + y * 1.2), x0 = 24 - half, w = half * 2;
      R(g, roof, x0, y, w, 1);
      if (y % 3 === 2) R(g, roof2, x0, y, w, 1);
      else for (let x = x0 + ((Math.floor(y / 3) % 2) * 2); x < x0 + w; x += 4) R(g, roof2, x, y);
    }
    R(g, "#222", 0, 15, 48, 1);
    for (const wx of [6, 33]) { R(g, "#2a1a10", wx, 22, 9, 8); R(g, "#9fd3f2", wx + 1, 23, 7, 6); R(g, "#2a1a10", wx + 4, 23, 1, 6); R(g, "#2a1a10", wx + 1, 26, 7, 1); }
    R(g, "#4a2e18", 18, 26, 12, 14); R(g, "#7a4b2a", 19, 27, 10, 13); R(g, "#ffd23f", 26, 34, 2, 2);
    if (shop) {
      for (let i = 0; i < 18; i++) R(g, i % 4 < 2 ? "#e24b4b" : "#fff", 15 + i, 22, 1, 4);
      R(g, "#222", 15, 26, 18, 1);
      g.fillStyle = "#ffd23f"; g.font = "bold 7px monospace"; g.fillText("SHOP", 14, 12);
    }
  });
}
const bin = () => mk(16, 16, g => {
  R(g, "#3a2616", 0, 3, 16, 13); R(g, "#8b5a2b", 1, 6, 14, 9); R(g, "#a8723a", 1, 4, 14, 2);
  R(g, "#6f4624", 1, 9, 14, 1); R(g, "#6f4624", 1, 12, 14, 1); R(g, "#ffd23f", 6, 7, 4, 1);
});

// ---- characters ----
const DOWN = ["................", "................", "....oooooooo....", "....ohhhhhho....", "....ohhhhhho....", "....osesseso....", "....osssssso....", "...osrrrrrrso...",
  "...orrrrrrrro...", "...orrrrrrrro...", "....obbbbbbo....", "....obbbbbbo....", "....obboobbo....", "....obboobbo....", "....kkk..kkk....", "................"];
const UP = DOWN.map((r, i) => (i === 5 || i === 6 ? "....ohhhhhho...." : r));
const RIGHT = DOWN.map((r, i) => (i === 5 ? "....ohhsseso...." : i === 6 ? "....ohhsssso...." : r));
const WALK = [
  { 12: "....obbo.obbo...", 13: "....obbo..obbo..", 14: "...kkk....kkk..." },
  { 12: "...obbo.obbo....", 13: "..obbo..obbo....", 14: "..kkk....kkk...." },
];
function person(pal) {
  const frames = rows => [rows, ...WALK.map(w => rows.map((r, i) => w[i] ?? r))].map(rs => mk(16, 16, g => art(g, rs, pal)));
  const right = frames(RIGHT);
  return [frames(DOWN), frames(UP), right, right.map(flip)];                 // down, up, right, left
}
const CHICKEN = ["......rr....", ".....wwwwyy.", ".....wewwy..", ".....wwww...", "...wwwwwww..", "..wwwwwwwww.", "..wwwwwwwww.", "...wwwwwww..", ".....y..y...", ".....y..y..."];
const chicken = () => mk(12, 10, g => art(g, CHICKEN, { w: "#fff", r: "#e53935", y: "#f6b73c", e: "#222" }));

// ---- crops: stage 0 seed, 1 sprout, 2 leaves, 3 bush, 4 ripe ----
function crop(type, st) {
  const G = "#4caf50", G2 = "#7ed957", GD = "#2e7d32";
  return mk(16, 16, g => {
    if (st === 0) { R(g, "#d8c27a", 7, 12, 2, 1); R(g, "#3a2a18", 6, 13, 4, 1); return; }
    if (st === 1) { R(g, GD, 8, 10, 1, 4); R(g, G2, 7, 9, 1, 2); R(g, G, 9, 9, 1, 2); return; }
    if (st === 2) { R(g, GD, 8, 7, 1, 7); R(g, G, 5, 8, 3, 2); R(g, G2, 9, 6, 3, 2); R(g, G, 6, 6, 2, 1); return; }
    if (st === 3) { R(g, G, 4, 5, 8, 7); R(g, G2, 5, 4, 6, 2); R(g, GD, 3, 9, 2, 2); R(g, GD, 11, 9, 2, 2); R(g, GD, 6, 8, 1, 4); return; }
    if (type === "turnip") { R(g, G, 6, 3, 4, 5); R(g, G2, 7, 2, 2, 3); disc(g, "#f0eaf5", 8, 11, 3); R(g, "#a66bbf", 6, 9, 5, 2); }
    if (type === "carrot") { R(g, G, 5, 2, 6, 6); R(g, G2, 7, 1, 2, 3); R(g, "#f08a24", 6, 9, 4, 2); R(g, "#f08a24", 7, 11, 2, 2); R(g, "#f08a24", 7, 13); }
    if (type === "tomato") {
      R(g, G, 3, 3, 10, 10); R(g, GD, 4, 4, 2, 2); R(g, GD, 9, 8, 2, 2);
      for (const [x, y] of [[5, 5], [10, 6], [7, 9], [11, 10], [4, 10]]) { R(g, "#e5382f", x, y, 2, 2); R(g, "#ff8a80", x, y); }
    }
    if (type === "pumpkin") { disc(g, "#e98a15", 8, 10, 5); R(g, "#c76a12", 6, 6, 1, 8); R(g, "#c76a12", 10, 6, 1, 8); R(g, GD, 7, 3, 2, 3); R(g, G, 9, 4, 2, 1); }
    if (type === "cabbage") { disc(g, "#4f9a52", 8, 10, 5); disc(g, "#7fc77a", 8, 10, 4); disc(g, "#a8dfa2", 7, 9, 2); R(g, "#4f9a52", 6, 12, 5, 1); }
  });
}
const hoeIcon = () => mk(16, 16, g => {
  for (let i = 0; i < 10; i++) R(g, "#8b5a2b", 3 + i, 13 - i, 2, 2);
  R(g, "#aab", 10, 2, 5, 2); R(g, "#778", 13, 4, 2, 3);
});
const canIcon = () => mk(16, 16, g => {
  R(g, "#2d5aa8", 3, 6, 9, 8); R(g, "#4a7fd0", 4, 7, 7, 6); R(g, "#2d5aa8", 12, 7, 1, 2); R(g, "#2d5aa8", 13, 5, 1, 2); R(g, "#2d5aa8", 14, 3, 1, 2);
  R(g, "#2d5aa8", 1, 7, 2, 1); R(g, "#2d5aa8", 1, 7, 1, 5); R(g, "#2d5aa8", 1, 12, 2, 1);
});

export function buildSprites(cropTypes) {
  const S = {
    grass: SEASONS.map((_, s) => [0, 1, 2, 3].map(v => grass(s, v))),
    soil: soil(false), soilWet: soil(true), water: [water(0), water(1)], pen: pen(),
    tree: SEASONS.map((_, s) => tree(s)), rock: rock(),
    house: building("#a63d3d", "#8a2f2f", "#c98a5b", "#b27545", false),
    shop: building("#2f5d9a", "#264b7d", "#d9c7a0", "#c4b08a", true),
    bin: bin(), chicken: chicken(), crop: {}, icon: { hoe: hoeIcon(), can: canIcon() },
    player: person({ o: "#2b1b17", h: "#5a3a22", s: "#f2c59b", e: "#222", r: "#d94f4f", b: "#3a5ba8", k: "#3b2a20" }),
    rosa: person({ o: "#2b1b17", h: "#8e44ad", s: "#f2c59b", e: "#222", r: "#f08fb4", b: "#c2578a", k: "#3b2a20" }),
  };
  for (const t of cropTypes) { S.crop[t] = [0, 1, 2, 3, 4].map(st => crop(t, st)); S.icon[t] = S.crop[t][4]; }
  return S;
}
