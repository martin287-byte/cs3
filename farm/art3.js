// Interior art for the farmhouse and cellar (floors, walls, furniture) and the exterior upgrade variants.
// Everything is procedural pixel art in the same style as the rest of the game.
import { mk, R, shade, outline, hash } from "./px.js";

const WOOD = "#c8935a", WOOD_D = "#a8743c", WOOD_L = "#dcab72", DARK = "#4a2e18", MID = "#6a4020";

function floorTile(v, stone) {
  return mk(16, 16, g => {
    if (!stone) {
      R(g, WOOD, 0, 0, 16, 16);
      for (let row = 0; row < 3; row++) {                                              // horizontal planks with staggered joints
        const y = row * 5 + 1, off = ((row + v) % 3) * 5 + 3;
        R(g, WOOD_D, 0, y + 4, 16, 1); R(g, WOOD_L, 0, y, 16, 1);
        R(g, WOOD_D, off % 16, y, 1, 4); R(g, shade(WOOD, 0.06), (off + 7) % 16, y + 1, 4, 1);
      }
      R(g, WOOD_D, 0, 15, 16, 1);
      if (v === 1) { R(g, "#8a5a2a", 10, 3, 2, 1); R(g, "#8a5a2a", 11, 4, 1, 1); }
    } else {
      R(g, "#6c6c78", 0, 0, 16, 16);
      for (const [x, y, w, h] of [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 5, 8], [5, 8, 8, 8], [13, 8, 3, 8]]) { R(g, "#5a5a66", x, y + h - 1, w, 1); R(g, "#5a5a66", x + w - 1, y, 1, h); R(g, "#8a8a96", x + 1, y + 1, w - 3, 1); }
      if (v % 2) R(g, "#4e6a4a", 3 + v, 4, 2, 1);
    }
  });
}
function wallTile(kind, stone) {
  return mk(16, 16, g => {
    if (stone) {
      R(g, "#4a4a56", 0, 0, 16, 16);
      for (let y = 0; y < 16; y += 5) { R(g, "#33333d", 0, y + 4, 16, 1); for (let x = (y / 5) % 2 ? 4 : 0; x < 16; x += 8) R(g, "#33333d", x, y, 1, 4); }
      R(g, "#5e5e6c", 1, 1, 6, 1); R(g, "#5e5e6c", 9, 6, 6, 1);
      if (kind === "side") R(g, "#2a2a32", 0, 0, 16, 16), R(g, "#3a3a44", 2, 2, 12, 12);
      return;
    }
    if (kind === "side") { R(g, "#5a3a1c", 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) R(g, "#46290f", 0, y + 3, 16, 1); R(g, "#7a5028", 1, 1, 14, 2); return; }
    R(g, "#ecdcb8", 0, 0, 16, 16);
    for (let x = 0; x < 16; x += 4) R(g, "#e0cca4", x, 0, 2, 16);                      // wallpaper stripes
    if (kind === "top") { R(g, "#3a2410", 0, 0, 16, 2); R(g, "#7a5028", 0, 2, 16, 1); R(g, "rgba(0,0,0,.12)", 0, 3, 16, 2); }
    else {                                                                              // wainscoting along the bottom
      R(g, "#d4bf94", 0, 0, 16, 1); R(g, "#8a5a30", 0, 9, 16, 1); R(g, "#a8743c", 0, 10, 16, 6); R(g, "#c08a50", 0, 10, 16, 1);
      for (let x = 0; x < 16; x += 8) { R(g, "#8a5a30", x, 11, 1, 4); R(g, "#8a5a30", x + 1, 11, 6, 1); R(g, "#8a5a30", x + 1, 14, 6, 1); R(g, "#8a5a30", x + 7, 11, 1, 4); }
      R(g, "#5a3a1c", 0, 15, 16, 1);
    }
  });
}

const spr = (w, h, fn) => outline(mk(w, h, fn));

// ---- furniture ---------------------------------------------------------------------------------------------
function bed(double) {
  return spr(32, 32, g => {
    R(g, "#6a4020", 1, 2, 30, 30); R(g, "#8a5a30", 2, 3, 28, 4); R(g, "#a8743c", 2, 3, 28, 1);                      // frame & headboard
    R(g, "#f4efe6", double ? 4 : 5, 8, double ? 11 : 9, 7); R(g, "#d8d2c6", double ? 4 : 5, 14, double ? 11 : 9, 1);  // pillow(s)
    if (double) { R(g, "#f4efe6", 17, 8, 11, 7); R(g, "#d8d2c6", 17, 14, 11, 1); }
    const q = double ? "#3a6ab8" : "#c84a4a", qd = shade(q, -0.22), ql = shade(q, 0.2);
    R(g, q, 3, 15, 26, 15); R(g, qd, 3, 28, 26, 2); R(g, ql, 3, 15, 26, 2);                                         // quilt
    for (let x = 6; x < 28; x += 6) { R(g, ql, x, 20, 3, 3); R(g, qd, x + 1, 24, 3, 2); }
    R(g, "#5a3a1c", 1, 28, 30, 4);
  });
}
const FURN = {
  window: () => spr(16, 32, g => {
    R(g, "#3a2410", 1, 6, 14, 22); R(g, "#7a5028", 2, 7, 12, 20); R(g, "#8ed0f4", 3, 8, 10, 18); R(g, "#c8ecff", 3, 8, 10, 6);
    R(g, "#7a5028", 7, 8, 2, 18); R(g, "#7a5028", 3, 16, 10, 2); R(g, "#ffffff", 4, 9, 2, 3);
    R(g, "#d84a4a", 1, 6, 3, 18); R(g, "#b83a3a", 1, 18, 3, 6); R(g, "#d84a4a", 12, 6, 3, 18); R(g, "#b83a3a", 12, 18, 3, 6);   // curtains
    R(g, "#a8743c", 0, 27, 16, 3); R(g, "#c8935a", 0, 27, 16, 1);
  }),
  hearth: () => spr(32, 32, g => {
    R(g, "#5a5a66", 1, 2, 30, 30); R(g, "#7a7a88", 2, 3, 28, 4); R(g, "#9a9aa8", 2, 3, 28, 1);
    for (let y = 8; y < 30; y += 5) for (let x = (y % 10 ? 2 : 5); x < 30; x += 8) { R(g, "#4a4a56", x, y, 7, 1); R(g, "#8a8a98", x, y + 1, 6, 1); }
    R(g, "#14100c", 8, 12, 16, 18); R(g, "#2a1a10", 9, 13, 14, 2); R(g, "#6a4a30", 8, 29, 16, 3);                    // opening and logs
    R(g, "#8a5a30", 10, 26, 12, 3); R(g, "#5a3a1c", 11, 27, 10, 1);
    R(g, "#8a5a30", 0, 6, 32, 3); R(g, "#c08a50", 0, 6, 32, 1);                                                      // mantel
    R(g, "#e8d8b0", 4, 0, 3, 6); R(g, "#ffd23f", 5, 0, 1, 1);                                                        // candle
  }),
  chest: () => spr(16, 16, g => {
    R(g, "#6a4020", 1, 5, 14, 10); R(g, "#8a5a30", 1, 5, 14, 3); R(g, "#a8743c", 2, 5, 12, 1); R(g, "#3a3a44", 1, 8, 14, 1);
    R(g, "#4a4a56", 7, 7, 2, 4); R(g, "#ffd23f", 7, 9, 2, 1); R(g, "#5a3410", 1, 13, 14, 2);
  }),
  mirror: () => spr(16, 32, g => {
    R(g, "#6a4020", 2, 2, 12, 28); R(g, "#a8743c", 3, 3, 10, 26); R(g, "#cfe6f4", 4, 5, 8, 22); R(g, "#ffffff", 5, 6, 2, 8); R(g, "#ffffff", 8, 9, 1, 5);
    R(g, "#9ac4dc", 4, 20, 8, 7); R(g, "#6a4020", 3, 29, 10, 3);
  }),
  table: () => spr(32, 24, g => {
    R(g, "#a8743c", 0, 8, 32, 6); R(g, "#c8935a", 0, 8, 32, 2); R(g, "#6a4020", 1, 14, 3, 9); R(g, "#6a4020", 28, 14, 3, 9); R(g, "#8a5a30", 0, 13, 32, 1);
    R(g, "#f4efe6", 6, 10, 20, 3); R(g, "#d84a4a", 6, 10, 20, 1);                                                    // runner
    R(g, "#8ed0f4", 14, 3, 4, 5); R(g, "#6ab0e0", 14, 6, 4, 2); R(g, "#e84a6a", 13, 0, 2, 3); R(g, "#ffd23f", 16, 1, 2, 3); R(g, "#6aaa4a", 15, 3, 1, 3);   // vase of flowers
  }),
  plant: () => spr(16, 24, g => {
    R(g, "#8a4a2a", 4, 15, 8, 8); R(g, "#a8603a", 4, 15, 8, 2); R(g, "#6a3a1a", 5, 22, 6, 1);
    for (const [x, y, w, h, c] of [[2, 6, 5, 9, "#4a9a4a"], [9, 4, 5, 11, "#5ab04a"], [5, 2, 6, 13, "#6ac05a"], [1, 10, 4, 5, "#3a8a3a"], [11, 9, 4, 6, "#3a8a3a"]]) { R(g, c, x, y, w, h); R(g, "#8ad87a", x, y, 1, h - 2); }
  }),
  stove: () => spr(32, 32, g => {
    R(g, "#d0d0d8", 2, 0, 28, 6); R(g, "#a8a8b4", 4, 6, 24, 2);                                                       // hood
    R(g, "#3a3a44", 1, 14, 30, 18); R(g, "#4a4a56", 1, 14, 30, 2); R(g, "#2a2a32", 1, 30, 30, 2);
    for (const x of [5, 18]) { R(g, "#14141a", x, 15, 9, 3); R(g, "#6a6a76", x + 2, 15, 5, 1); }                    // burners
    R(g, "#1a1a22", 5, 20, 22, 10); R(g, "#8ed0f4", 7, 22, 18, 5); R(g, "#c8ecff", 7, 22, 18, 1); R(g, "#d0d0d8", 6, 19, 20, 1);   // oven window
    R(g, "#b83a3a", 3, 18, 2, 2); R(g, "#b83a3a", 27, 18, 2, 2); R(g, "#6a6a76", 6, 8, 20, 4);
  }),
  fridge: () => spr(16, 32, g => {
    R(g, "#e8eef4", 1, 2, 14, 30); R(g, "#ffffff", 1, 2, 14, 2); R(g, "#b8c4d0", 1, 13, 14, 1); R(g, "#8a98a8", 12, 5, 2, 6); R(g, "#8a98a8", 12, 16, 2, 8);
    R(g, "#c8d4e0", 2, 4, 2, 26); R(g, "#a8b4c0", 1, 30, 14, 2);
  }),
  counter: () => spr(32, 16, g => {
    R(g, "#c8c8d0", 0, 1, 32, 4); R(g, "#e8e8f0", 0, 1, 32, 1); R(g, "#8a5a30", 1, 5, 30, 11); R(g, "#a8743c", 2, 6, 13, 9); R(g, "#a8743c", 17, 6, 13, 9);
    R(g, "#ffd23f", 13, 9, 1, 3); R(g, "#ffd23f", 18, 9, 1, 3); R(g, "#5a3410", 1, 14, 30, 2); R(g, "#6a8ab0", 20, 0, 8, 2); R(g, "#d8d8e0", 22, -1, 2, 2);
  }),
  shelf: () => spr(16, 32, g => {
    R(g, "#6a4020", 1, 2, 14, 30); R(g, "#4a2a10", 2, 3, 12, 28);
    const cols = ["#d84a4a", "#4a7ad8", "#e8c83a", "#4aa84a", "#8a4ac8", "#d8884a"];
    for (const y of [4, 12, 20, 28]) R(g, "#8a5a30", 1, y, 14, 2);
    for (const y of [5, 13, 21]) for (let x = 3, i = 0; x < 13; x += 2, i++) { const hh = 5 + ((i + y) % 3); R(g, cols[(i + y) % 6], x, y + 6 - hh + 1, 2, hh); }
  }),
  barrel: () => spr(16, 24, g => {
    R(g, "#8a5a30", 2, 4, 12, 18); R(g, "#a8743c", 3, 4, 3, 18); R(g, "#6a4020", 11, 4, 3, 18); R(g, "#4a4a56", 2, 7, 12, 1); R(g, "#4a4a56", 2, 17, 12, 1);
    R(g, "#5a3a1c", 3, 2, 10, 2); R(g, "#7a5028", 4, 2, 8, 1); R(g, "#3a2410", 3, 21, 10, 2);
  }),
  crate: () => spr(16, 16, g => {
    R(g, "#a8743c", 1, 2, 14, 13); R(g, "#6a4020", 1, 2, 14, 1); R(g, "#6a4020", 1, 14, 14, 1); R(g, "#6a4020", 1, 2, 1, 13); R(g, "#6a4020", 14, 2, 1, 13);
    for (let i = 0; i < 12; i++) { R(g, "#8a5a30", 2 + i, 3 + i, 1, 1); R(g, "#8a5a30", 13 - i, 3 + i, 1, 1); }
  }),
  // flat decals (drawn under the player)
  rug: () => rug(64, 32, "#b83a3a", "#e8c83a"),
  rugS: () => rug(48, 32, "#3a6ab8", "#f0e8d0"),
  mat: () => mk(32, 16, g => { R(g, "#5a3a1c", 2, 3, 28, 11); R(g, "#8a5a30", 3, 4, 26, 9); for (let x = 5; x < 27; x += 3) R(g, "#6a4020", x, 6, 1, 5); R(g, "#d8c090", 4, 5, 24, 1); }),
  trapdoor: () => mk(16, 16, g => { R(g, "#3a2410", 1, 1, 14, 14); R(g, "#7a5028", 2, 2, 12, 12); for (let y = 5; y < 14; y += 4) R(g, "#5a3a1c", 2, y, 12, 1); R(g, "#c8c8d0", 7, 6, 3, 3); R(g, "#6a6a76", 8, 7, 1, 1); }),
  stairs: () => mk(32, 16, g => { R(g, "#14141a", 0, 0, 32, 16); for (let i = 0; i < 4; i++) { R(g, shade("#8a8a96", -0.12 * i), 2, i * 4, 28, 3); R(g, "#2a2a32", 2, i * 4 + 3, 28, 1); } R(g, "#6a4020", 0, 0, 2, 16); R(g, "#6a4020", 30, 0, 2, 16); }),
};
function rug(w, h, c, trim) {
  return mk(w, h, g => {
    R(g, shade(c, -0.3), 1, 2, w - 2, h - 4); R(g, c, 2, 3, w - 4, h - 6); R(g, trim, 4, 5, w - 8, 1); R(g, trim, 4, h - 6, w - 8, 1); R(g, trim, 4, 5, 1, h - 10); R(g, trim, w - 5, 5, 1, h - 10);
    for (let x = 9; x < w - 9; x += 6) { R(g, shade(c, 0.25), x, h / 2 - 1, 3, 3); R(g, trim, x + 1, h / 2, 1, 1); }
    for (let y = 4; y < h - 4; y += 3) { R(g, "#f0e8d0", 0, y, 1, 1); R(g, "#f0e8d0", w - 1, y, 1, 1); }
  });
}

function flameFrames() {
  return [0, 1, 2].map(f => mk(12, 12, g => {
    const h = 6 + (f === 1 ? 2 : f === 2 ? 1 : 0);
    R(g, "#e0481a", 3, 12 - h, 6, h); R(g, "#ff8a1a", 4, 12 - h + 1, 4, h - 1); R(g, "#ffd23f", 5, 12 - h + 3, 2, h - 3); R(g, "#fff3a8", 5, 9, 2, 2);
    R(g, "#e0481a", 1, 8 + f % 2, 2, 4); R(g, "#ff8a1a", 9, 7 + (f + 1) % 2, 2, 5);
  }));
}

// Extra details painted on the exterior house sprite (the base sprite is 56 wide and outlined, so everything is offset by 1).
function overlay(base, level, scaffold) {
  const o = mk(base.width, base.height, g => {
    g.globalAlpha = scaffold ? 0.62 : 1; g.drawImage(base, 0, 0); g.globalAlpha = 1;
    const d = (c, x, y, w = 1, h = 1) => R(g, c, x + 1, y + 1, w, h);
    if (level >= 1) {                                                                   // kitchen: striped awning over the door and a herb box
      for (let i = 0; i < 16; i++) d(i % 4 < 2 ? "#4aa84a" : "#f4efe6", 20 + i, 30, 1, 4);
      d("#2a6a2a", 20, 34, 16, 1); d("#3a2410", 20, 29, 16, 1);
      d("#6a4020", 3, 48, 9, 3); for (const x of [4, 6, 8, 10]) { d("#4aa84a", x, 46, 1, 3); d("#8ad87a", x, 45, 1, 1); }
    }
    if (level >= 2) {                                                                   // bedroom: dormer window in the roof, wreath on the door
      d("#3b2814", 22, 8, 12, 12); d("#a8654a", 23, 9, 10, 11); d("#c8826a", 23, 9, 10, 2); d("#2a1a10", 25, 12, 6, 6); d("#92d4f4", 26, 13, 4, 4); d("#d6f0ff", 26, 13, 1, 2); d("#6a4020", 28, 13, 1, 4);
      d("#3b2814", 21, 7, 14, 2); d("#7a4636", 22, 6, 12, 2);
      d("#3a9a3a", 26, 38, 4, 4); d("#e84a6a", 26, 38, 1, 1); d("#e84a6a", 29, 41, 1, 1); d("#ffd23f", 28, 39, 1, 1);
    }
    if (level >= 3) {                                                                   // cellar hatch by the house and ivy on the wall
      d("#3b2814", 40, 49, 14, 8); d("#7a5028", 41, 50, 12, 6); d("#5a3a1c", 47, 50, 1, 6); d("#c8c8d0", 44, 52, 2, 1); d("#c8c8d0", 49, 52, 2, 1);
      for (const [x, y] of [[1, 34], [2, 38], [1, 42], [3, 46], [2, 50], [4, 36], [3, 44]]) { d("#3a8a3a", x, y, 3, 3); d("#5ab04a", x, y, 1, 1); }
    }
    if (scaffold) {                                                                     // wooden scaffolding while Oliver works
      const pole = (x, y1, y2) => { d("#8a5a30", x, y1, 2, y2 - y1); d("#b8803c", x, y1, 1, y2 - y1); };
      for (const x of [3, 27, 51]) pole(x, 10, 57);
      for (const y of [22, 38, 52]) { d("#a8743c", 1, y, 54, 3); d("#d8a060", 1, y, 54, 1); }
      for (let i = 0; i < 10; i++) { d("#8a5a30", 5 + i * 2, 25 + i, 2, 1); d("#8a5a30", 31 + i * 2, 41 - i, 2, 1); }
      d("#e8c83a", 44, 28, 8, 5); d("#3a3a44", 45, 29, 6, 1);
    }
  });
  o.ox = base.ox; o.oy = base.oy; return o;
}

export function buildHouseArt(S) {
  S.hfloor = { wood: [0, 1, 2, 3].map(v => floorTile(v, false)), stone: [0, 1, 2, 3].map(v => floorTile(v, true)) };
  S.hwall = { wood: { top: wallTile("top", false), base: wallTile("base", false), side: wallTile("side", false) }, stone: { top: wallTile("top", true), base: wallTile("base", true), side: wallTile("side", true) } };
  S.flame = flameFrames();
  for (const [k, fn] of Object.entries(FURN)) S.bldg[k] = fn();
  S.bldg.bed = bed(false); S.bldg.bed2 = bed(true);
  for (let l = 1; l <= 3; l++) S.bldg["home" + l] = overlay(S.bldg.home, l, false);
  S.bldg.homeScaf = overlay(S.bldg.home, 0, true);
}
