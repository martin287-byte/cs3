// Shared pixel-art helpers (no dependencies, so any module can import them).
export const SEASONS = [
  { name: "Spring", grass: "#86c354", g2: "#9bd566", g3: "#66a43c", leaf: "#5fb04a", leaf2: "#93d86a", leafD: "#3c8838", out: "#2c5a2a" },
  { name: "Summer", grass: "#6fb54a", g2: "#88c95c", g3: "#4f9636", leaf: "#3f9a3f", leaf2: "#69c058", leafD: "#2a7430", out: "#1e4e22" },
  { name: "Fall",   grass: "#b3a64a", g2: "#c8bb5c", g3: "#8f8636", leaf: "#e08a30", leaf2: "#f6b44c", leafD: "#b4501c", out: "#6a3416" },
  { name: "Winter", grass: "#e4edf6", g2: "#f7fbff", g3: "#c4d4e6", leaf: "#456f5c", leaf2: "#f2f8fc", leafD: "#2d4e40", out: "#2a4538" },
];

export function hash(a, b, c = 0) {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function mk(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = false; fn(g); return c;
}
export const R = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
export const disc = (g, c, cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) R(g, c, cx + x, cy + y); };
export const ellipse = (g, c, cx, cy, rx, ry) => {
  for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++)
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) R(g, c, Math.round(cx + x), Math.round(cy + y));
};
export const flip = src => {
  const o = mk(src.width, src.height, g => { g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); });
  o.ox = src.ox; o.oy = src.oy; return o;
};

// Mix a hex colour toward white (f > 0) or black (f < 0).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), t = f < 0 ? 0 : 255, p = Math.abs(f);
  const ch = s => Math.round(((n >> s) & 255) * (1 - p) + t * p);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Draws a 1px dark outline around the opaque pixels of a sprite. The result is 2px larger in
// each dimension; `ox`/`oy` record the padding so callers can position by the logical sprite.
export function outline(src, color = "#2a1a12") {
  const w = src.width, h = src.height, data = src.getContext("2d").getImageData(0, 0, w, h).data;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]);
  const out = mk(w + 2, h + 2, g => {
    g.fillStyle = color;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++)
      if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
    g.drawImage(src, 1, 1);
  });
  out.ox = 1; out.oy = 1; return out;
}

// Returns a copy of a sprite tinted toward `color` (keeps transparency and offsets).
export function tint(src, color, alpha = 0.45) {
  const o = mk(src.width, src.height, g => { g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-atop"; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, src.width, src.height); });
  o.ox = src.ox; o.oy = src.oy; return o;
}
