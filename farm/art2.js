// Crops (5 growth stages, outlined and shaded), produce icons and animals.
import { mk, R, disc, ellipse, shade, outline, hash } from "./px.js";

const LEAF = "#4eac3c", LEAF_L = "#86d460", LEAF_D = "#2a782a", STEM = "#3a8a30";
const CW = 16, CH = 24;                                                            // logical crop sprite size; the plant stands on row 22

function leaf(g, x, y, w, h, c = LEAF) {                                           // a small shaded leaf blob
  R(g, shade(c, -0.22), x, y + 1, w, h); R(g, c, x, y, w, h); R(g, shade(c, 0.28), x, y, Math.max(1, w - 1), 1);
}
function sprout(g, x, y, c = LEAF) { R(g, STEM, x, y, 1, 3); leaf(g, x - 2, y - 1, 2, 2, c); leaf(g, x + 1, y - 2, 2, 2, c); }

function drawStage(type, st) {
  return mk(CW, CH, g => {
    const base = 22;
    if (st === 0) {                                                                // freshly planted: seed in a mound
      ellipse(g, "#5e3e22", 8, base - 1, 4, 1.6); ellipse(g, "#7a5230", 8, base - 2, 3, 1); R(g, "#e8d49a", 7, base - 2, 2, 1);
      return;
    }
    if (st === 1) { sprout(g, 8, base - 3, type === "kale" ? "#3a8a5a" : LEAF_L); return; }
    if (st === 2) {                                                                // young plant
      R(g, STEM, 8, base - 7, 1, 7); leaf(g, 4, base - 6, 4, 3, LEAF); leaf(g, 9, base - 8, 4, 3, LEAF_L); leaf(g, 6, base - 10, 3, 3, LEAF);
      if (type === "pumpkin") { R(g, "#2a782a", 3, base - 1, 10, 1); }
      return;
    }
    const tall = type === "corn", vine = type === "tomato";
    if (type === "turnip") {
      for (const [x, y, w, h] of [[3, 12, 4, 6], [6, 9, 4, 8], [9, 12, 4, 6], [5, 14, 6, 5]]) leaf(g, x, y + 3, w, h, st === 3 ? LEAF : LEAF_L);
      if (st === 4) { disc(g, "#cfc2e0", 8, base - 2, 4); disc(g, "#f4eef8", 8, base - 1, 3); R(g, "#a566c8", 5, base - 6, 7, 3); R(g, "#c890e8", 6, base - 6, 3, 1); R(g, "#6a3a88", 5, base - 4, 7, 1); }
    } else if (type === "carrot") {
      for (const [x, y, w, h] of [[3, 10, 3, 9], [6, 6, 4, 12], [10, 10, 3, 9], [5, 12, 2, 7], [9, 12, 2, 7]]) leaf(g, x, y + 2, w, h, st === 3 ? "#58b845" : "#72cc54");
      if (st === 4) { R(g, "#d86a14", 6, base - 3, 5, 4); R(g, "#f08a2a", 7, base - 3, 3, 3); R(g, "#ffb060", 7, base - 3, 1, 2); R(g, "#d86a14", 7, base + 1, 3, 1); }
    } else if (type === "potato") {
      for (const [x, y, w, h] of [[2, 12, 6, 6], [8, 11, 6, 7], [5, 8, 6, 8], [3, 15, 4, 4], [9, 15, 4, 4]]) leaf(g, x, y + 3, w, h, "#3f9a3a");
      if (st === 3) for (const [x, y] of [[5, 11], [10, 13], [7, 8]]) { R(g, "#fff", x, y, 2, 2); R(g, "#f4e04a", x, y); }
      if (st === 4) for (const [x, y] of [[4, 20], [8, 21], [11, 20]]) { ellipse(g, "#8a6234", x + 1, y, 2.5, 1.8); R(g, "#b98a52", x, y - 1, 2, 1); R(g, "#5a3a18", x + 2, y, 1, 1); }
    } else if (vine) {
      R(g, "#7a5230", 7, 4, 2, 19); R(g, "#a47a4a", 7, 4, 1, 19);                     // stake
      for (const [x, y, w] of [[3, 5, 4], [9, 7, 5], [2, 11, 5], [9, 13, 5], [4, 17, 4], [9, 18, 4]]) leaf(g, x, y, w, 3, "#3f9a3a");
      if (st === 3) for (const [x, y] of [[5, 9], [10, 12]]) { R(g, "#ffe86a", x, y, 2, 2); R(g, "#fff9c0", x, y); }
      if (st === 4) for (const [x, y] of [[4, 8], [10, 10], [3, 14], [10, 16], [6, 19]]) { disc(g, "#c8281f", x + 1, y + 1, 2); R(g, "#ff6a5a", x, y, 1, 1); R(g, "#3f9a3a", x + 1, y - 1, 2, 1); }
    } else if (tall) {
      R(g, "#3a8a2a", 7, 2, 2, 21); R(g, "#6ac04a", 7, 2, 1, 21);
      for (const [x, y, w, d] of [[1, 6, 6, -1], [9, 9, 6, 1], [2, 13, 5, -1], [9, 16, 5, 1], [4, 19, 4, -1]]) { leaf(g, x, y, w, 2, "#4eac3c"); if (st >= 3) R(g, "#2a782a", d < 0 ? x : x + w - 1, y + 3, 1, 2); }
      if (st === 3) for (const x of [6, 9]) R(g, "#d8c060", x, 2, 1, 3);
      if (st === 4) for (const [x, y] of [[4, 10], [10, 13]]) { R(g, "#5a9a3a", x, y, 3, 7); R(g, "#f2d648", x + 1, y + 1, 2, 5); R(g, "#d8b430", x + 2, y + 1, 1, 5); R(g, "#fff2a0", x + 1, y + 1, 1, 2); R(g, "#c8a020", x + 1, y - 1, 1, 2); }
    } else if (type === "pumpkin") {
      for (const [x, y, w, h] of [[1, 15, 6, 4], [9, 14, 6, 5], [4, 12, 5, 4], [6, 18, 5, 3]]) leaf(g, x, y + 2, w, h, "#3a8a34");
      R(g, "#2a782a", 2, 19, 12, 1);
      if (st === 4) { ellipse(g, "#a8480c", 8, 18, 6.5, 5); ellipse(g, "#e87a14", 8, 17, 6, 4.5); ellipse(g, "#f4a040", 6, 15, 2.5, 1.5); for (const x of [5, 8, 11]) R(g, "#b85a0c", x, 14, 1, 7); R(g, "#4a7a2a", 7, 11, 2, 3); R(g, "#6ab04a", 9, 12, 2, 1); }
    } else if (type === "eggplant") {
      for (const [x, y, w, h] of [[2, 10, 6, 8], [8, 9, 6, 9], [5, 6, 6, 9], [3, 15, 4, 5], [9, 15, 4, 5]]) leaf(g, x, y + 2, w, h, "#3a8a4a");
      if (st === 3) for (const [x, y] of [[4, 10], [10, 11], [7, 8]]) { R(g, "#c890f0", x, y, 2, 2); R(g, "#fff", x, y); }
      if (st === 4) for (const [x, y] of [[4, 14], [9, 15], [6, 17]]) { ellipse(g, "#3a1a5a", x + 1.5, y + 3, 2.4, 3.6); ellipse(g, "#6a34a0", x + 1.5, y + 2.5, 2, 3.2); R(g, "#a874e0", x + 1, y + 1, 1, 2); R(g, "#3a8a4a", x, y - 1, 3, 1); }
    } else if (type === "cabbage") {
      ellipse(g, "#3a8a4a", 8, base - 2, 7, 3.4); ellipse(g, "#58b058", 8, base - 3, 6, 3);
      if (st === 3) { ellipse(g, "#78c474", 8, base - 4, 4, 3); }
      if (st === 4) { disc(g, "#3a8a4a", 8, base - 5, 6); disc(g, "#78c474", 8, base - 5, 5); disc(g, "#a4dc96", 7, base - 6, 3); R(g, "#58a456", 5, base - 3, 6, 1); R(g, "#d4f0c8", 6, base - 8, 2, 1); R(g, "#58a456", 8, base - 8, 1, 5); }
    } else {                                                                       // kale
      for (const [x, y, w, h] of [[2, 11, 5, 8], [9, 11, 5, 8], [5, 8, 6, 10], [3, 15, 4, 5], [9, 15, 4, 5]]) { leaf(g, x, y + 2, w, h, st === 4 ? "#2f7a56" : "#3a8a5a"); R(g, "#5ab07a", x + 1, y + 3, 1, h - 2); }
      if (st === 4) for (const x of [3, 6, 9, 11]) R(g, "#7ac49a", x, 11 + (x % 3), 1, 1);
    }
  });
}

export function cropSprite(type, st) { return outline(drawStage(type, st), "#1f3a1c"); }

// ---------------------------------------------------------------- produce icons (16x16, used in menus and the toolbar)
export function produceIcon(type) {
  const spr = mk(16, 16, g => {
    if (type === "turnip") { disc(g, "#cfc2e0", 8, 10, 4); disc(g, "#f4eef8", 8, 11, 3); R(g, "#a566c8", 5, 6, 7, 3); R(g, "#c890e8", 6, 6, 3, 1); leaf(g, 6, 1, 2, 5); leaf(g, 8, 2, 2, 4); }
    if (type === "carrot") { R(g, "#e87a1a", 6, 5, 5, 3); R(g, "#f08a2a", 7, 8, 3, 3); R(g, "#d86a14", 8, 11, 2, 3); R(g, "#ffb060", 7, 5, 1, 4); leaf(g, 6, 0, 2, 5); leaf(g, 9, 1, 2, 4); }
    if (type === "potato") { ellipse(g, "#8a6234", 8, 9, 6, 4.5); ellipse(g, "#b98a52", 8, 8, 5.2, 3.8); R(g, "#d4a870", 5, 6, 3, 1); R(g, "#5a3a18", 6, 9); R(g, "#5a3a18", 10, 8); }
    if (type === "tomato") { disc(g, "#a81e18", 8, 9, 5); disc(g, "#d8321f", 8, 8, 4); R(g, "#ff7a6a", 5, 6, 2, 2); R(g, "#3f9a3a", 6, 3, 5, 2); R(g, "#2a782a", 8, 2, 1, 2); }
    if (type === "corn") { ellipse(g, "#c8a020", 8, 8, 3.5, 6.5); ellipse(g, "#f2d648", 8, 8, 3, 6); R(g, "#fff2a0", 7, 4, 1, 3); for (const y of [5, 8, 11]) R(g, "#d8b430", 6, y, 5, 1); R(g, "#4a9a3a", 4, 8, 3, 7); R(g, "#6ac04a", 4, 9, 1, 5); R(g, "#4a9a3a", 10, 9, 2, 6); }
    if (type === "pumpkin") { ellipse(g, "#a8480c", 8, 10, 7, 5.5); ellipse(g, "#e87a14", 8, 9, 6.4, 5); ellipse(g, "#f4a040", 6, 7, 2.5, 1.5); for (const x of [5, 8, 11]) R(g, "#b85a0c", x, 6, 1, 8); R(g, "#4a7a2a", 7, 2, 2, 3); }
    if (type === "eggplant") { ellipse(g, "#3a1a5a", 8, 9, 3.6, 6); ellipse(g, "#6a34a0", 7.5, 8.5, 3, 5.4); R(g, "#a874e0", 6, 6, 1, 4); R(g, "#3a8a4a", 5, 2, 6, 2); R(g, "#2a782a", 7, 1, 2, 2); }
    if (type === "cabbage") { disc(g, "#3a8a4a", 8, 9, 6); disc(g, "#78c474", 8, 9, 5); disc(g, "#a4dc96", 7, 7, 3); R(g, "#58a456", 5, 11, 6, 1); R(g, "#58a456", 8, 5, 1, 7); R(g, "#d4f0c8", 6, 4, 2, 1); }
    if (type === "kale") { for (const [x, y, w, h] of [[2, 6, 5, 8], [9, 6, 5, 8], [5, 3, 6, 10]]) { leaf(g, x, y, w, h, "#2f7a56"); R(g, "#5ab07a", x + 1, y + 1, 1, h - 1); } }
  });
  return spr;
}

// ---------------------------------------------------------------- animals
export function chickenFrames() {
  const draw = f => mk(12, 11, g => {
    const peck = f === 1, hy = peck ? 3 : 0;
    ellipse(g, "#c8c0b8", 5.5, 7, 4.8, 3.6); ellipse(g, "#f4f0ea", 5.5, 6.4, 4.5, 3.2); R(g, "#e8e0d6", 3, 8, 6, 1);   // body
    R(g, "#d8cfc4", 2, 5, 4, 3); R(g, "#f8f4ee", 3, 5, 2, 1);                      // wing
    R(g, "#f4f0ea", 8, 2 + hy, 3, 3); R(g, "#f4f0ea", 7, 3 + hy, 1, 2);            // head + neck
    R(g, "#d82a2a", 8, 1 + hy, 2, 1); R(g, "#e84a3a", 9, 1 + hy, 1, 1);            // comb
    R(g, "#f0a02a", 11, 3 + hy, 1, 1); R(g, "#d83a3a", 10, 5 + hy, 1, 1);           // beak + wattle
    R(g, "#222", 9, 3 + hy);
    R(g, "#e8e0d6", 0, 4, 2, 3); R(g, "#d8cfc4", 1, 5, 1, 2);                      // tail
    R(g, "#e89a2a", 4, 9, 1, 2); R(g, "#e89a2a", 7, 9, 1, 2);                      // legs
  });
  return [outline(draw(0)), outline(draw(1))];
}

export function cowFrames() {
  const draw = f => mk(22, 15, g => {
    const dy = f ? 1 : 0;
    ellipse(g, "#c8c0b4", 10, 8, 8.4, 4.8); ellipse(g, "#f6f2ea", 10, 7.4, 8, 4.4);   // body
    ellipse(g, "#3a3430", 7, 6, 3, 2.2); ellipse(g, "#3a3430", 13, 8, 2.8, 2); R(g, "#3a3430", 10, 4, 3, 1);   // patches
    R(g, "#f6f2ea", 16, 3, 5, 5); R(g, "#e8e0d4", 16, 7, 5, 1);                    // head
    R(g, "#3a3430", 16, 3, 2, 2); R(g, "#f4a8a0", 19, 6, 3, 2); R(g, "#d88078", 20, 7, 1, 1);   // ear patch, muzzle
    R(g, "#222", 18, 4); R(g, "#e8d8b0", 16, 2, 1, 2); R(g, "#e8d8b0", 20, 2, 1, 2);        // eye, horns
    R(g, "#f4a8a0", 7, 11, 4, 2); R(g, "#d88078", 8, 12, 2, 1);                    // udder
    for (const [x, off] of [[3, 0], [6, dy], [13, dy], [16, 0]]) { R(g, "#e8e0d4", x, 11, 2, 3 + off); R(g, "#3a3430", x, 13 + off, 2, 1); }
    R(g, "#d8d0c4", 1, 5, 2, 4); R(g, "#3a3430", 0, 8, 2, 2);                      // tail
  });
  return [outline(draw(0)), outline(draw(1))];
}

export function dogFrames() {
  const draw = f => mk(15, 12, g => {
    ellipse(g, "#9a6a38", 6, 6.6, 5, 3); ellipse(g, "#c8924e", 6, 6, 4.6, 2.6); R(g, "#e8c088", 4, 7, 5, 2);   // body
    R(g, "#c8924e", 9, 2, 5, 5); R(g, "#e8c088", 11, 5, 3, 2); R(g, "#2a1a10", 13, 4, 1, 1); R(g, "#2a1a10", 11, 3); R(g, "#6a4420", 9, 2, 2, 3);   // head, ear
    R(g, "#c8924e", 0, 3 - f, 2, 4); R(g, "#9a6a38", 1, 2 - f, 1, 2);                // tail wag
    for (const [x, o] of [[3, f], [5, 1 - f], [8, f], [10, 1 - f]]) { R(g, "#9a6a38", x, 8, 2, 3 - o); R(g, "#e8c088", x, 10 - o, 2, 1); }
  });
  return [outline(draw(0)), outline(draw(1))];
}

export function catFrames() {
  const draw = f => mk(15, 12, g => {
    ellipse(g, "#c8761e", 6, 6.6, 5, 3); ellipse(g, "#f0a040", 6, 6, 4.6, 2.6);
    for (const x of [4, 7]) R(g, "#c8761e", x, 4, 1, 3);                           // tabby stripes
    R(g, "#f0a040", 9, 2, 5, 5); R(g, "#f0a040", 9, 1, 1, 1); R(g, "#f0a040", 13, 1, 1, 1); R(g, "#f4b8a0", 13, 1);
    R(g, "#2a1a10", 11, 3); R(g, "#2a1a10", 13, 4); R(g, "#f4c8c0", 12, 5);
    R(g, "#c8761e", 0, 2 + f, 2, 5); R(g, "#f0a040", 1, 1 + f, 1, 2); R(g, "#fff", 0, 1 + f);   // curled tail
    for (const [x, o] of [[3, f], [5, 1 - f], [8, f], [10, 1 - f]]) { R(g, "#c8761e", x, 8, 2, 3 - o); R(g, "#f8d8a8", x, 10 - o, 2, 1); }
  });
  return [outline(draw(0)), outline(draw(1))];
}
