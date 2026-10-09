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
    if (type === "potato") { R(g, G, 5, 4, 6, 5); R(g, G2, 7, 3, 2, 2); disc(g, "#b98a52", 6, 11, 3); disc(g, "#c99a62", 10, 12, 3); R(g, "#8a6234", 6, 11); R(g, "#8a6234", 10, 12); }
    if (type === "corn") { R(g, GD, 7, 1, 2, 14); R(g, G, 3, 5, 4, 2); R(g, G, 9, 4, 4, 2); R(g, G, 4, 9, 3, 2); R(g, "#f6d84a", 7, 3, 2, 5); R(g, "#d9b832", 8, 3, 1, 5); R(g, "#f6d84a", 9, 8, 2, 4); }
    if (type === "eggplant") { R(g, G, 4, 3, 8, 4); R(g, GD, 6, 2, 4, 2); disc(g, "#5b2a86", 6, 10, 3); disc(g, "#5b2a86", 10, 9, 3); R(g, "#8a52b8", 5, 9); R(g, "#8a52b8", 9, 8); }
    if (type === "kale") { for (const [x, y, w] of [[3, 7, 5], [8, 6, 5], [5, 10, 6], [7, 3, 4]]) { R(g, "#2f7a4a", x, y, w, 3); R(g, "#4aa066", x + 1, y, w - 2, 1); } }
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

// ---- world extras ----
const path = v => mk(16, 16, g => {
  R(g, "#b8a27a", 0, 0, 16, 16);
  for (let i = 0; i < 9; i++) R(g, i % 2 ? "#a38d66" : "#cdb88f", Math.floor(hash(i, v, 21) * 14), Math.floor(hash(i, v, 22) * 15), 2, 1);
  R(g, "#9b8660", Math.floor(hash(v, 5) * 12) + 2, Math.floor(hash(v, 6) * 12) + 2, 2, 2);
});

// ---- items ----
function forageIcon(id) {
  return mk(16, 16, g => {
    const G = "#3fae3f", GD = "#2e7d32";
    if (id === "leek") { R(g, "#f4f4e4", 7, 8, 2, 6); R(g, G, 6, 2, 4, 7); R(g, GD, 7, 3, 1, 5); }
    if (id === "daffodil") { R(g, GD, 8, 8, 1, 6); R(g, G, 6, 11, 2, 1); for (const [x, y] of [[8, 4], [8, 8], [5, 6], [11, 6]]) R(g, "#ffd93d", x - 1, y - 1, 3, 3); R(g, "#f08a24", 7, 6, 3, 2); }
    if (id === "berry") { R(g, G, 4, 4, 8, 3); for (const [x, y] of [[5, 8], [8, 7], [10, 9], [6, 11], [9, 12]]) { R(g, "#e84a6a", x, y, 3, 3); R(g, "#ff9ab0", x, y); } }
    if (id === "grape") { for (const [x, y] of [[5, 5], [8, 5], [11, 5], [6, 8], [9, 8], [7, 11]]) { R(g, "#7a3fa0", x - 1, y - 1, 4, 4); R(g, "#a874c8", x - 1, y - 1); } R(g, GD, 7, 1, 2, 3); }
    if (id === "mushroom") { R(g, "#f4e4c4", 6, 9, 4, 5); disc(g, "#c0392b", 8, 8, 5); R(g, "#f4e4c4", 4, 8, 8, 5 - 5); R(g, "#fff", 5, 6, 2, 2); R(g, "#fff", 9, 5, 2, 2); R(g, "#f4e4c4", 6, 9, 4, 5); }
    if (id === "blackberry") { for (const [x, y] of [[5, 6], [8, 5], [10, 8], [6, 9], [9, 11], [7, 12]]) { R(g, "#3b1f5e", x - 1, y - 1, 4, 4); R(g, "#7a5aa8", x - 1, y - 1); } R(g, GD, 7, 1, 3, 3); }
    if (id === "holly") { for (const [x, y] of [[4, 6], [9, 5], [6, 10], [10, 10]]) { R(g, "#1f6b3a", x, y, 4, 3); R(g, "#2e8b4a", x, y, 2, 1); } for (const [x, y] of [[7, 8], [8, 9], [9, 8]]) R(g, "#e03030", x, y, 2, 2); }
    if (id === "snowyam") { disc(g, "#b9935a", 8, 9, 4); R(g, "#d8b97a", 6, 7, 3, 2); R(g, "#fff", 9, 10, 1, 1); R(g, "#fff", 6, 11, 1, 1); R(g, "#fff", 10, 7, 1, 1); }
  });
}
const fishIcon = col => mk(16, 16, g => {
  for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) if ((x * x) / 25 + (y * y) / 9 <= 1) R(g, col, 7 + x, 8 + y);
  R(g, col, 12, 5, 2, 1); R(g, col, 12, 6, 3, 4); R(g, col, 12, 10, 2, 1);
  R(g, "rgba(255,255,255,.4)", 4, 9, 7, 1); R(g, "#111", 4, 7); R(g, "rgba(0,0,0,.25)", 8, 6, 1, 4);
});
const eggIcon = () => mk(16, 16, g => { disc(g, "#e8dcc4", 8, 9, 4); disc(g, "#fff8ea", 8, 8, 3); R(g, "#fff", 7, 6, 1, 1); });
const rodIcon = () => mk(16, 16, g => {
  for (let i = 0; i < 11; i++) R(g, "#8b5a2b", 2 + i, 13 - i, 1, 2);
  R(g, "#ddd", 13, 3, 1, 8); R(g, "#e33", 12, 11, 3, 3); R(g, "#fff", 12, 11, 3, 1);
});


// ---- mine ----
const caveWall = v => mk(16, 16, g => {
  R(g, "#3a3548", 0, 0, 16, 16);
  for (let i = 0; i < 10; i++) R(g, i % 2 ? "#2d2a3a" : "#4a4560", Math.floor(hash(i, v, 31) * 14), Math.floor(hash(i, v, 32) * 15), 2, 1);
  R(g, "#26222f", 0, 14, 16, 2);
});
const caveFloor = v => mk(16, 16, g => {
  R(g, "#6b6577", 0, 0, 16, 16);
  for (let i = 0; i < 8; i++) R(g, i % 2 ? "#5e5869" : "#7a7487", Math.floor(hash(i, v, 33) * 15), Math.floor(hash(i, v, 34) * 15), 2, 1);
});
function oreNode(id, color) {
  return mk(16, 16, g => {
    disc(g, "#4a4658", 8, 9, 7); disc(g, "#7c7a85", 8, 8, 6); disc(g, "#a09eaa", 6, 6, 2);
    if (id !== "stone") for (const [x, y] of [[5, 8], [9, 5], [10, 10], [7, 11], [11, 8]]) { R(g, color, x, y, 2, 2); R(g, "#fff", x, y); }
    if (id === "amethyst") { R(g, color, 7, 3, 2, 5); R(g, "#d9a8ff", 7, 3, 1, 2); }
  });
}
const ladderDown = () => mk(16, 16, g => { R(g, "#6b6577", 0, 0, 16, 16); R(g, "#120e18", 3, 2, 10, 12); for (const y of [4, 7, 10, 13]) R(g, "#8b5a2b", 3, y, 10, 1); R(g, "#6f4624", 3, 2, 1, 12); R(g, "#6f4624", 12, 2, 1, 12); });
const mineExitSprite = () => mk(16, 16, g => { R(g, "#6b6577", 0, 0, 16, 16); R(g, "#d8c8a0", 2, 3, 12, 10); R(g, "#b8a880", 2, 3, 12, 1); R(g, "#ffd23f", 7, 5, 2, 6); R(g, "#ffd23f", 5, 7, 6, 2); });
const caveBuilding = () => mk(48, 40, g => {
  disc(g, "#4a4658", 24, 24, 22); R(g, "#4a4658", 2, 24, 44, 16);
  disc(g, "#7c7a85", 24, 23, 20); R(g, "#7c7a85", 4, 24, 40, 15);
  disc(g, "#a09eaa", 14, 14, 5); disc(g, "#a09eaa", 34, 16, 4);
  R(g, "#2a2432", 16, 20, 16, 20); disc(g, "#2a2432", 24, 21, 8); R(g, "#0c0a10", 18, 24, 12, 16); disc(g, "#0c0a10", 24, 24, 6);
  R(g, "#8b5a2b", 14, 20, 2, 20); R(g, "#8b5a2b", 32, 20, 2, 20); R(g, "#8b5a2b", 14, 19, 20, 2);
});

// ---- more items ----
const pickIcon = () => mk(16, 16, g => {
  for (let i = 0; i < 10; i++) R(g, "#8b5a2b", 3 + i, 13 - i, 2, 2);
  R(g, "#aab", 2, 3, 9, 2); R(g, "#778", 2, 5, 2, 2); R(g, "#aab", 9, 3, 4, 3); R(g, "#778", 12, 5, 2, 3);
});
const dishIcon = col => mk(16, 16, g => { disc(g, "#d8d8e0", 8, 9, 6); disc(g, "#fff", 8, 9, 5); disc(g, col, 8, 9, 3); R(g, "rgba(255,255,255,.5)", 7, 7, 2, 1); });
const tonicIcon = () => mk(16, 16, g => { R(g, "#8b5a2b", 6, 2, 4, 3); R(g, "#cfe8ff", 5, 5, 6, 2); R(g, "#e84a6a", 4, 7, 8, 7); R(g, "#ff9ab0", 5, 8, 2, 4); R(g, "#6a2a3a", 4, 14, 8, 1); });
const festEgg = () => mk(16, 16, g => { disc(g, "#e84a9a", 8, 9, 4); R(g, "#ffd23f", 4, 8, 9, 2); R(g, "#3a9ae8", 4, 11, 9, 1); R(g, "#fff", 7, 5, 1, 1); });

// ---- combat, animals, farm buildings ----
const slime = f => mk(14, 12, g => {
  const h = f ? 1 : 0;
  disc(g, "#2f8a3a", 7, 7 + h, 5); R(g, "#2f8a3a", 2, 8, 11, 4 - h); R(g, "#5fd36a", 3, 5 + h, 8, 5); R(g, "#9affa0", 4, 5 + h, 2, 2);
  R(g, "#111", 4, 7 + h, 2, 2); R(g, "#111", 8, 7 + h, 2, 2); R(g, "#fff", 4, 7 + h); R(g, "#fff", 8, 7 + h);
});
const bat = f => mk(14, 12, g => {
  R(g, "#4a2f6a", 5, 4, 4, 5); R(g, "#6a4a8a", 6, 4, 2, 2); R(g, "#f33", 6, 5); R(g, "#f33", 8, 5);
  R(g, "#4a2f6a", 5, 3, 1, 1); R(g, "#4a2f6a", 8, 3, 1, 1);
  if (f) { R(g, "#3a2255", 0, 2, 5, 3); R(g, "#3a2255", 9, 2, 5, 3); R(g, "#3a2255", 1, 5, 3, 2); R(g, "#3a2255", 10, 5, 3, 2); }
  else { R(g, "#3a2255", 0, 5, 5, 3); R(g, "#3a2255", 9, 5, 5, 3); R(g, "#3a2255", 1, 8, 3, 2); R(g, "#3a2255", 10, 8, 3, 2); }
});
const skeleton = f => mk(14, 16, g => {
  R(g, "#e8e4d8", 4, 0, 6, 5); R(g, "#111", 5, 2, 2, 2); R(g, "#111", 8, 2, 2, 2); R(g, "#e8e4d8", 6, 4, 2, 1);
  R(g, "#e8e4d8", 6, 5, 2, 6); R(g, "#e8e4d8", 4, 6, 6, 1); R(g, "#e8e4d8", 4, 8, 6, 1); R(g, "#e8e4d8", 2, 6, 1, 4); R(g, "#e8e4d8", 11, 6, 1, 4);
  R(g, "#e8e4d8", f ? 4 : 5, 11, 1, 5); R(g, "#e8e4d8", f ? 9 : 8, 11, 1, 5);
});
const cow = () => mk(20, 14, g => {
  R(g, "#f4f0e8", 3, 3, 14, 7); R(g, "#2b2b2b", 5, 4, 4, 3); R(g, "#2b2b2b", 12, 6, 4, 3);
  R(g, "#f4f0e8", 15, 1, 5, 5); R(g, "#2b2b2b", 18, 2, 1, 1); R(g, "#e8a0a0", 18, 4, 2, 2); R(g, "#d8c8a0", 15, 0, 1, 2);
  for (const x of [4, 7, 12, 15]) R(g, "#d8d4c8", x, 10, 2, 4);
  R(g, "#e8a0a0", 8, 9, 3, 2);
});
const swordIcon = () => mk(16, 16, g => {
  for (let i = 0; i < 10; i++) R(g, "#cfd4e0", 4 + i, 11 - i, 2, 2);
  R(g, "#fff", 11, 2, 2, 2); R(g, "#8b5a2b", 3, 11, 3, 3); R(g, "#ffd23f", 3, 9, 5, 1); R(g, "#ffd23f", 7, 9, 1, 3);
});
function plot(w, h, label) {
  return mk(w * 16, h * 16, g => {
    R(g, "#8a6a3e", 2, 4, w * 16 - 4, h * 16 - 6); R(g, "#a4824f", 4, 6, w * 16 - 8, h * 16 - 10);
    for (const [x, y] of [[1, 3], [w * 16 - 4, 3], [1, h * 16 - 4], [w * 16 - 4, h * 16 - 4]]) { R(g, "#5a3a1e", x, y, 3, 4); }
    R(g, "#5a3a1e", w * 8 - 1, 6, 2, 9); R(g, "#d8c090", w * 8 - 9, 2, 18, 8);
    g.fillStyle = "#5a3a1e"; g.font = "bold 6px monospace"; g.fillText(label, w * 8 - 8, 8);
  });
}
function barn() {
  return mk(48, 40, g => {
    R(g, "#3a2616", 2, 14, 44, 26); R(g, "#b83a3a", 3, 15, 42, 24);
    for (let x = 3; x < 45; x += 4) R(g, "#9a2e2e", x, 15, 1, 24);
    for (let y = 0; y < 16; y++) { const half = Math.round(8 + y * 1.1); R(g, "#6a4a3a", 24 - half, y, half * 2, 1); if (y % 3 === 2) R(g, "#554034", 24 - half, y, half * 2, 1); }
    R(g, "#222", 0, 15, 48, 1);
    R(g, "#fff", 14, 22, 20, 17); R(g, "#d8d8d8", 15, 23, 18, 15); R(g, "#b83a3a", 24, 22, 1, 17);
    R(g, "#fff", 15, 23, 18, 1); for (let i = 0; i < 7; i++) { R(g, "#b83a3a", 16 + i * 2, 23 + i * 2, 2, 2); R(g, "#b83a3a", 31 - i * 2, 23 + i * 2, 2, 2); }
    R(g, "#ffd23f", 22, 6, 4, 4);
  });
}
function coopB() {
  return mk(48, 40, g => {
    R(g, "#3a2616", 4, 16, 40, 24); R(g, "#d8b070", 5, 17, 38, 22);
    for (let y = 20; y < 39; y += 4) R(g, "#c49a58", 5, y, 38, 1);
    for (let y = 2; y < 17; y++) { const half = Math.round(6 + y * 1.3); R(g, "#7a4a2a", 24 - half, y, half * 2, 1); if (y % 3 === 2) R(g, "#5e3a20", 24 - half, y, half * 2, 1); }
    R(g, "#222", 3, 17, 42, 1); R(g, "#2a1a10", 18, 24, 12, 16); R(g, "#6a4a2a", 19, 25, 10, 15); R(g, "#2a1a10", 22, 28, 4, 5);
    R(g, "#e53935", 9, 22, 4, 4); R(g, "#fff", 10, 23, 2, 2);
  });
}
function silo() {
  return mk(32, 48, g => {
    R(g, "#3a3a44", 3, 12, 26, 36); R(g, "#9aa0b0", 4, 12, 24, 36);
    for (let y = 16; y < 48; y += 6) R(g, "#7a8090", 4, y, 24, 1);
    R(g, "#c4cad8", 7, 12, 4, 36);
    disc(g, "#3a3a44", 16, 12, 13); R(g, "#3a3a44", 3, 12, 26, 2);
    disc(g, "#b84a3a", 16, 11, 12); R(g, "#b84a3a", 4, 11, 24, 2); disc(g, "#d8695a", 12, 7, 4);
    R(g, "#2a2a30", 12, 34, 8, 14); R(g, "#6a4a2a", 13, 35, 6, 13);
  });
}
function miscIcon(id) {
  return mk(16, 16, g => {
    if (id === "milk") { R(g, "#e8e8f0", 5, 5, 6, 9); R(g, "#fff", 6, 6, 2, 6); R(g, "#6a8ac8", 5, 3, 6, 3); R(g, "#6a8ac8", 5, 8, 6, 2); }
    if (id === "slime") { disc(g, "#2f8a3a", 8, 9, 5); disc(g, "#5fd36a", 8, 8, 4); R(g, "#cfffd0", 6, 6, 2, 2); }
    if (id === "batwing") { R(g, "#3a2255", 2, 5, 12, 3); R(g, "#4a2f6a", 3, 8, 3, 3); R(g, "#4a2f6a", 8, 8, 3, 3); R(g, "#6a4a8a", 5, 4, 6, 2); }
    if (id === "bone") { R(g, "#e8e4d8", 4, 7, 8, 2); disc(g, "#e8e4d8", 4, 6, 2); disc(g, "#e8e4d8", 4, 10, 2); disc(g, "#e8e4d8", 12, 6, 2); disc(g, "#e8e4d8", 12, 10, 2); }
    if (id === "bouquet") { R(g, "#3fae3f", 7, 8, 2, 7); for (const [x, y, c] of [[4, 3, "#e84a6a"], [8, 2, "#ffd93d"], [11, 4, "#b06ae0"], [6, 6, "#fff"], [10, 7, "#e84a6a"]]) { R(g, c, x, y, 3, 3); R(g, "#f08a24", x + 1, y + 1); } }
    if (id === "pendant") { R(g, "#ffd23f", 6, 2, 1, 5); R(g, "#ffd23f", 9, 2, 1, 5); disc(g, "#ffd23f", 8, 10, 4); disc(g, "#5ad0ff", 8, 10, 2); R(g, "#fff", 7, 9); }
  });
}

export function buildSprites({ crops, forage, fish, npcs, ores, dishes, misc }) {
  const S = {
    grass: SEASONS.map((_, s) => [0, 1, 2, 3].map(v => grass(s, v))),
    soil: soil(false), soilWet: soil(true), water: [water(0), water(1)], pen: pen(), path: [0, 1, 2, 3].map(path),
    tree: SEASONS.map((_, s) => tree(s)), rock: rock(),
    bldg: {
      home: building("#a63d3d", "#8a2f2f", "#c98a5b", "#b27545", false),
      shop: building("#2f5d9a", "#264b7d", "#d9c7a0", "#c4b08a", true),
      h1: building("#3f8a4a", "#2f6b38", "#d8b98a", "#c4a478", false),
      h2: building("#c9a227", "#a8851c", "#e3d4b0", "#cfc09a", false),
      h3: building("#7a4fa0", "#5f3d82", "#c9a7a0", "#b5948c", false),
      bin: bin(), cave: caveBuilding(), coop: coopB(), barn: barn(), silo: silo(), plot: plot(3, 2, "PLOT"), plotS: plot(2, 2, "PLOT"),
    },
    cave: [0, 1, 2, 3].map(caveWall), cfloor: [0, 1, 2, 3].map(caveFloor), node: {}, ladder: ladderDown(), mexit: mineExitSprite(),
    chicken: chicken(), crop: {}, icon: { sword: swordIcon(), hoe: hoeIcon(), can: canIcon(), rod: rodIcon(), pick: pickIcon(), egg: eggIcon(), tonic: tonicIcon(), fegg: festEgg() },
    mon: { slime: [slime(0), slime(1)], bat: [bat(0), bat(1)], skeleton: [skeleton(0), skeleton(1)] }, cow: cow(),
    player: person({ o: "#2b1b17", h: "#5a3a22", s: "#f2c59b", e: "#222", r: "#d94f4f", b: "#3a5ba8", k: "#3b2a20" }),
    npc: {},
  };
  for (const [id, pal] of Object.entries(npcs)) S.npc[id] = person({ o: "#2b1b17", s: "#f2c59b", e: "#222", k: "#3b2a20", ...pal });
  for (const t of crops) { S.crop[t] = [0, 1, 2, 3, 4].map(st => crop(t, st)); S.icon[t] = S.crop[t][4]; }
  for (const id of forage) S.icon[id] = forageIcon(id);
  for (const [id, col] of Object.entries(ores)) { S.node[id] = oreNode(id, col); S.icon[id] = S.node[id]; }
  for (const id of misc) if (id !== "tonic") S.icon[id] = miscIcon(id);
  for (const [id, col] of Object.entries(dishes)) S.icon[id] = dishIcon(col);
  for (const [id, color] of Object.entries(fish)) S.icon[id] = fishIcon(color);
  return S;
}
