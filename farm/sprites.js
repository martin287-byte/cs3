// Procedural pixel art: every sprite is drawn once into an offscreen canvas at startup.
import { SEASONS, hash, mk, R, disc, ellipse, flip, shade, outline, tint } from "./px.js";
import { cropSprite, produceIcon, chickenFrames, cowFrames, dogFrames, catFrames } from "./art2.js";
import { buildHouseArt } from "./art3.js";
import { makeTileCache, drawTree, drawRock, drawPalm, drawCactus, drawHouse, makePerson } from "./art.js";
export { SEASONS, hash };
function art(g, rows, pal) { rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) R(g, pal[ch], x, y); })); }

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
    if (id === "shell") { disc(g, "#f4c8c0", 8, 9, 5); R(g, "#e8a8a0", 4, 9, 9, 1); for (const x of [5, 7, 9, 11]) R(g, "#e8a8a0", x, 5, 1, 5); R(g, "#fff", 6, 6); }
    if (id === "coral") { R(g, "#e8506a", 7, 6, 2, 8); R(g, "#e8506a", 4, 4, 2, 6); R(g, "#e8506a", 11, 3, 2, 7); R(g, "#e8506a", 4, 9, 4, 2); R(g, "#e8506a", 9, 8, 4, 2); R(g, "#ff8aa0", 4, 4); R(g, "#ff8aa0", 11, 3); R(g, "#ff8aa0", 7, 6); }
    if (id === "urchin") { disc(g, "#3a2a5a", 8, 9, 4); for (let a = 0; a < 12; a++) R(g, "#5a4a8a", 8 + Math.round(Math.cos(a / 12 * 6.28) * 6), 9 + Math.round(Math.sin(a / 12 * 6.28) * 6)); R(g, "#7a6aaa", 7, 8, 2, 2); }
    if (id === "cactusfruit") { disc(g, "#d84a8a", 8, 9, 4); R(g, "#f08ab8", 6, 7, 2, 2); R(g, "#2e8b3a", 7, 2, 2, 3); for (const [x, y] of [[5, 9], [10, 8], [8, 12]]) R(g, "#fff", x, y); }
    if (id === "sandrose") { for (const [x, y, w] of [[3, 7, 10], [4, 5, 8], [5, 9, 7], [6, 3, 5], [4, 11, 8]]) R(g, "#e0b878", x, y, w, 2); R(g, "#f4d8a0", 6, 6, 4, 1); R(g, "#c49858", 5, 10, 6, 1); }
    if (id === "coconut") { disc(g, "#5a3a1c", 8, 9, 5); disc(g, "#7a4e2a", 8, 8, 4); R(g, "#2a1a10", 6, 7, 1, 1); R(g, "#2a1a10", 9, 7, 1, 1); R(g, "#2a1a10", 7, 10, 2, 1); R(g, "#a8743e", 5, 6, 2, 1); }
    if (id === "starfruit") { for (const [x, y, w, h] of [[7, 2, 2, 12], [3, 6, 10, 3], [5, 4, 6, 8]]) R(g, "#f4d03a", x, y, w, h); R(g, "#fff3a0", 7, 3, 1, 3); R(g, "#c8a010", 6, 11, 4, 1); R(g, "#c8a010", 4, 8, 1, 1); R(g, "#c8a010", 11, 8, 1, 1); }
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

// ---- beach & desert, board ----
function sand(biome, v) {
  const c = biome === "beach" ? ["#ecdca0", "#f6eab8", "#d9c88a"] : ["#d9a85a", "#e6ba70", "#c4903f"];
  return mk(16, 16, g => {
    R(g, c[0], 0, 0, 16, 16);
    for (let i = 0; i < 9; i++) R(g, i % 2 ? c[1] : c[2], Math.floor(hash(i, v, 41) * 15), Math.floor(hash(i, v, 42) * 15), 2, 1);
    if (v === 1) { R(g, c[2], 4, 9, 3, 1); R(g, c[2], 5, 10, 3, 1); }
  });
}
const oceanTile = f => mk(16, 16, g => {
  R(g, "#2f6fc0", 0, 0, 16, 16); R(g, "#2860ae", 0, 10, 16, 6);
  for (let i = 0; i < 4; i++) R(g, "#a8d4ff", (i * 6 + f * 4) % 13, 2 + i * 4, 4, 1);
});
const palm = () => mk(16, 24, g => {
  for (let i = 0; i < 12; i++) R(g, i % 3 === 0 ? "#6a4a28" : "#8a6a3e", 7 + Math.round(Math.sin(i / 4) * 1.2), 23 - i, 3, 1);
  for (const [dx, dy] of [[-6, 2], [-5, -1], [5, 2], [4, -1], [0, -3], [-2, 3], [3, 3]]) { R(g, "#2e8b3a", 8 + dx - 2, 8 + dy, 5, 2); R(g, "#4cb054", 8 + dx - 1, 8 + dy, 3, 1); }
  R(g, "#6a4a28", 7, 9, 2, 2); R(g, "#6a4a28", 10, 9, 2, 2);
});
const cactus = () => mk(16, 20, g => {
  R(g, "#1f6a30", 6, 3, 5, 17); R(g, "#2e8b3a", 7, 3, 3, 17); R(g, "#1f6a30", 1, 8, 5, 3); R(g, "#1f6a30", 1, 5, 3, 4); R(g, "#1f6a30", 11, 6, 4, 3); R(g, "#1f6a30", 13, 3, 3, 4);
  R(g, "#2e8b3a", 2, 5, 1, 4); R(g, "#2e8b3a", 14, 3, 1, 4); R(g, "#f4e04a", 8, 2, 2, 1); R(g, "#e84a8a", 8, 1, 2, 1);
});
const boardSprite = () => mk(16, 24, g => {
  R(g, "#4a2e18", 2, 4, 12, 14); R(g, "#a07848", 3, 5, 10, 12); R(g, "#5a3a1e", 3, 5, 10, 1);
  R(g, "#4a2e18", 3, 18, 2, 6); R(g, "#4a2e18", 11, 18, 2, 6);
  R(g, "#f4f0d8", 4, 7, 4, 4); R(g, "#e8d890", 9, 6, 3, 5); R(g, "#f4f0d8", 5, 12, 5, 4); R(g, "#d84a4a", 5, 7); R(g, "#d84a4a", 10, 6);
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
    if (id === "sprinkler" || id === "qsprinkler") {
      const q = id === "qsprinkler"; R(g, q ? "#d8b020" : "#8a96a8", 7, 8, 2, 6); R(g, q ? "#f0d050" : "#b8c4d4", 5, 6, 6, 3);
      for (const [x, y] of [[3, 3], [12, 3], [2, 7], [13, 7], [8, 2]]) R(g, "#7ac0ff", x, y, 1, 2);
      if (q) { R(g, "#7ac0ff", 4, 11); R(g, "#7ac0ff", 11, 11); }
    }
    if (id === "pearl") { disc(g, "#d8c8e0", 8, 9, 4); disc(g, "#fdf6ff", 8, 8, 3); R(g, "#fff", 6, 6, 2, 1); R(g, "#f8d8f0", 9, 10, 2, 1); }
    if (id === "coin") { disc(g, "#8a6a1a", 8, 8, 5); disc(g, "#e8c040", 8, 8, 4); disc(g, "#c8a028", 8, 8, 2); R(g, "#fff3a0", 5, 5, 2, 1); R(g, "#8a6a1a", 7, 7, 2, 2); }
    if (id === "relic") { R(g, "#7a4a2a", 4, 5, 8, 8); R(g, "#a86a3a", 5, 6, 6, 6); R(g, "#7a4a2a", 6, 3, 4, 3); R(g, "#d8a060", 6, 7, 2, 1); R(g, "#5a3018", 8, 9, 2, 2); R(g, "#3a2410", 4, 13, 8, 1); }
    if (id === "bouquet") { R(g, "#3fae3f", 7, 8, 2, 7); for (const [x, y, c] of [[4, 3, "#e84a6a"], [8, 2, "#ffd93d"], [11, 4, "#b06ae0"], [6, 6, "#fff"], [10, 7, "#e84a6a"]]) { R(g, c, x, y, 3, 3); R(g, "#f08a24", x + 1, y + 1); } }
    if (id === "pendant") { R(g, "#ffd23f", 6, 2, 1, 5); R(g, "#ffd23f", 9, 2, 1, 5); disc(g, "#ffd23f", 8, 10, 4); disc(g, "#5ad0ff", 8, 10, 2); R(g, "#fff", 7, 9); }
  });
}

// ---- greenhouse, community centre, pets, horse ----
function greenhouseB() {
  return mk(48, 40, g => {
    R(g, "#3a4a50", 2, 12, 44, 28); R(g, "#bfe6ee", 3, 13, 42, 26);
    for (let x = 3; x < 46; x += 7) R(g, "#6a8a94", x, 13, 1, 26);
    for (let y = 13; y < 39; y += 8) R(g, "#6a8a94", 3, y, 42, 1);
    for (let y = 0; y < 13; y++) { const half = Math.round(10 + y * 1.1); R(g, "#3a4a50", 24 - half, y, half * 2, 1); R(g, "#a8d8e4", 25 - half, y, half * 2 - 2, 1); }
    for (let x = 6; x < 44; x += 8) R(g, "#6a8a94", x, 2, 1, 11);
    R(g, "#6aa86a", 6, 28, 6, 10); R(g, "#6aa86a", 34, 28, 8, 10); R(g, "#4cb054", 8, 26, 3, 4); R(g, "#e84a6a", 37, 27, 3, 3);
    R(g, "#3a4a50", 19, 22, 10, 18); R(g, "#8ab8c4", 20, 23, 8, 17); R(g, "#3a4a50", 23, 23, 2, 17);
  });
}
const ghFloor = v => mk(16, 16, g => {
  R(g, "#c9b48a", 0, 0, 16, 16);
  for (let i = 0; i < 6; i++) R(g, i % 2 ? "#b8a278" : "#dac79c", Math.floor(hash(i, v, 51) * 14), Math.floor(hash(i, v, 52) * 15), 2, 1);
  R(g, "#b8a278", 0, 15, 16, 1); R(g, "#b8a278", 15, 0, 1, 16);
});
const ghWall = () => mk(16, 16, g => {
  R(g, "#6a8a94", 0, 0, 16, 16); R(g, "#bfe6ee", 1, 1, 14, 14); R(g, "#6a8a94", 7, 0, 2, 16); R(g, "#6a8a94", 0, 7, 16, 2); R(g, "#e8f8fc", 2, 2, 4, 1);
});
function centreB(ok) {
  return mk(48, 40, g => {
    R(g, "#3a2e26", 2, 12, 44, 28); R(g, ok ? "#e8d4a8" : "#8a8070", 3, 13, 42, 26);
    for (let y = 16; y < 39; y += 4) R(g, ok ? "#d4bc88" : "#756b5e", 3, y, 42, 1);
    for (let y = 0; y < 14; y++) { const half = Math.round(8 + y * 1.2); R(g, ok ? "#2f5d9a" : "#5a5248", 24 - half, y, half * 2, 1); if (y % 3 === 2) R(g, ok ? "#264b7d" : "#4a443c", 24 - half, y, half * 2, 1); }
    R(g, "#222", 0, 14, 48, 1);
    R(g, "#2a1a10", 18, 22, 12, 18); R(g, ok ? "#7a4b2a" : "#4a4a4a", 19, 23, 10, 17);
    if (ok) { R(g, "#ffd23f", 26, 31, 2, 2); R(g, "#cccccc", 23, -1, 1, 8); R(g, "#e84a6a", 24, 0, 8, 5); for (const wx of [6, 34]) { R(g, "#2a1a10", wx, 20, 8, 8); R(g, "#9fd3f2", wx + 1, 21, 6, 6); } }
    else { R(g, "#5a3a1e", 18, 22, 12, 3); R(g, "#5a3a1e", 18, 32, 12, 3); R(g, "#5a3a1e", 20, 22, 3, 14); for (const wx of [6, 34]) { R(g, "#2a1a10", wx, 20, 8, 8); R(g, "#5a3a1e", wx, 22, 8, 2); R(g, "#5a3a1e", wx, 26, 8, 2); } R(g, "#d8c880", 8, 30, 8, 5); }
  });
}
const dog = f => mk(14, 11, g => {
  R(g, "#b8844c", 3, 4, 8, 4); R(g, "#d8a46c", 4, 4, 5, 2); R(g, "#b8844c", 9, 2, 4, 4); R(g, "#6a4420", 12, 3, 1, 1); R(g, "#2a1a10", 11, 3, 1, 1); R(g, "#6a4420", 9, 2, 1, 3);
  R(g, "#b8844c", 1, 3 + f, 3, 1); R(g, "#6a4420", 3, 8, 1, 3 - f); R(g, "#6a4420", 6, 8, 1, 2 + f); R(g, "#6a4420", 9, 8, 1, 3 - f);
});
const cat = f => mk(14, 11, g => {
  R(g, "#e8a050", 3, 4, 8, 4); R(g, "#f4c080", 4, 4, 5, 2); R(g, "#e8a050", 9, 2, 4, 4); R(g, "#e8a050", 9, 1, 1, 1); R(g, "#e8a050", 12, 1, 1, 1);
  R(g, "#2a1a10", 11, 3, 1, 1); R(g, "#e8a050", 0, 2 + f, 1, 4); R(g, "#e8a050", 1, 5, 2, 1);
  R(g, "#c07830", 3, 8, 1, 3 - f); R(g, "#c07830", 6, 8, 1, 2 + f); R(g, "#c07830", 9, 8, 1, 3 - f);
});
function horseSide() {
  return mk(26, 18, g => {
    R(g, "#8a5a2e", 5, 5, 14, 7); R(g, "#a8743e", 6, 5, 10, 3); R(g, "#8a5a2e", 17, 1, 5, 6); R(g, "#8a5a2e", 20, 3, 5, 4); R(g, "#2a1a10", 22, 3, 1, 1);
    R(g, "#3a2410", 16, 0, 2, 7); R(g, "#3a2410", 3, 5, 3, 5); R(g, "#3a2410", 2, 9, 2, 4);
    for (const x of [6, 9, 15, 18]) { R(g, "#8a5a2e", x, 12, 2, 5); R(g, "#2a1a10", x, 16, 2, 2); }
    R(g, "#c8a050", 9, 4, 6, 2); R(g, "#c82a2a", 10, 3, 4, 1);
  });
}
function horseFront(back) {
  return mk(14, 20, g => {
    R(g, "#8a5a2e", 3, 3, 8, 9); R(g, "#a8743e", 4, 4, 6, 4); R(g, "#8a5a2e", 5, 0, 4, 5); R(g, "#3a2410", 5, 0, 4, back ? 3 : 1);
    if (!back) { R(g, "#2a1a10", 5, 2, 1, 1); R(g, "#2a1a10", 8, 2, 1, 1); R(g, "#b8844c", 6, 4, 2, 2); }
    R(g, "#8a5a2e", 4, 11, 2, 7); R(g, "#8a5a2e", 8, 11, 2, 7); R(g, "#2a1a10", 4, 17, 2, 2); R(g, "#2a1a10", 8, 17, 2, 2);
    R(g, "#c8a050", 3, 5, 8, 2);
  });
}

const boat = () => mk(48, 32, g => {
  ellipse(g, "#3a2410", 24, 20, 23, 10); ellipse(g, "#8a5a2e", 24, 19, 22, 9); ellipse(g, "#a8743e", 24, 17, 20, 6); ellipse(g, "#5e3a1c", 24, 16, 17, 4);
  for (let x = 8; x < 42; x += 5) R(g, "#7a4e26", x, 12, 1, 8);
  R(g, "#c8944e", 10, 20, 28, 1); R(g, "#3a2410", 8, 23, 32, 1); R(g, "#d8b070", 20, 14, 8, 2); R(g, "#6a4020", 38, 6, 2, 12); R(g, "#6a4020", 5, 10, 8, 2);
  R(g, "#e8d8b0", 4, 9, 2, 4);
});
const digSpot = () => mk(16, 16, g => { R(g, "#6a4a28", 4, 7, 8, 3); R(g, "#8a6a40", 5, 6, 6, 1); R(g, "#3a2410", 6, 6, 1, 1); R(g, "#3a2410", 9, 6, 1, 1); R(g, "#3a2410", 7, 8, 2, 1); R(g, "#fff3a0", 3, 4); R(g, "#fff3a0", 12, 5); });

export function buildSprites({ crops, forage, fish, npcs, ores, dishes, misc }) {
  const S = {
    tile: makeTileCache(),
    tree: SEASONS.map((_, sn) => [0, 1, 2].map(v => drawTree(sn, v))), rock: [drawRock(0), drawRock(1)], palm: drawPalm(), cactus: drawCactus(),
    bldg: {
      home: drawHouse({ wall: "#dba868", roof: "#b8453d", trim: "#f2dfb2", shutter: "#4a8a5a" }),
      shop: drawHouse({ wall: "#ecdcb4", roof: "#3a6aa8", trim: "#fff4d8", shutter: "#c8483f", shop: true }),
      h1: drawHouse({ wall: "#e2c298", roof: "#4a9a52", trim: "#f6ecd0", shutter: "#7a5ab0" }),
      h2: drawHouse({ wall: "#eadab8", roof: "#d4a93a", trim: "#ffffff", shutter: "#3a6aa8" }),
      h3: drawHouse({ wall: "#d6b2aa", roof: "#8a5ab8", trim: "#f6e8e0", shutter: "#4a8a5a" }),
      boat: boat(), greenhouse: greenhouseB(), centre: centreB(false), centreOk: centreB(true), board: outline(boardSprite()), bin: outline(bin()), cave: caveBuilding(), coop: coopB(), barn: barn(), silo: silo(), plot: plot(3, 2, "PLOT"), plotS: plot(2, 2, "PLOT"),
    },
    node: {}, ladder: ladderDown(), mexit: mineExitSprite(),
    ghfloor: [0, 1, 2, 3].map(ghFloor), ghwall: ghWall(),
    pet: { dog: dogFrames(), cat: catFrames() }, horse: { side: outline(horseSide()), front: outline(horseFront(false)), back: outline(horseFront(true)) },
    chicken: chickenFrames(), crop: {}, icon: { sword: swordIcon(), hoe: hoeIcon(), can: canIcon(), rod: rodIcon(), pick: pickIcon(), egg: eggIcon(), tonic: tonicIcon(), fegg: festEgg(), dig: digSpot() },
    mon: { slime: [outline(slime(0)), outline(slime(1))], bat: [outline(bat(0)), outline(bat(1))], skeleton: [outline(skeleton(0)), outline(skeleton(1))] }, cow: cowFrames(),
    monB: { frost: {}, magma: {} },
    player: makePerson({}),
    npc: {},
  };
  for (const [id, look] of Object.entries(npcs)) S.npc[id] = makePerson(look);
  for (const [b, col] of [["frost", "#6ab4ff"], ["magma", "#ff6a30"]]) for (const k of Object.keys(S.mon)) S.monB[b][k] = S.mon[k].map(img => tint(img, col, 0.5));
  for (const t of crops) { S.crop[t] = [0, 1, 2, 3, 4].map(st => cropSprite(t, st)); S.icon[t] = produceIcon(t); }
  for (const id of forage) S.icon[id] = forageIcon(id);
  for (const [id, col] of Object.entries(ores)) { S.node[id] = oreNode(id, col); S.icon[id] = S.node[id]; }
  for (const id of misc) if (id !== "tonic") S.icon[id] = miscIcon(id);
  for (const [id, col] of Object.entries(dishes)) S.icon[id] = dishIcon(col);
  for (const [id, color] of Object.entries(fish)) S.icon[id] = fishIcon(color);
  buildHouseArt(S);
  return S;
}
