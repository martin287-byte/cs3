// Visual polish: swaying grass and trees, water glints, particles, night lighting and a soft vignette.
// Everything is drawn procedurally (no assets) and kept cheap enough to run every frame on phones.
import { hash, SEASONS } from "./px.js";

const T = 16;
let sunDx = 0;
export function setSun(hr) { sunDx = Math.max(-6, Math.min(6, (hr - 13) * 1.1)); }       // morning shadows lean left, evening shadows lean right
export const sunShift = (rx = 5) => sunDx * 0.5 * Math.min(1.4, rx / 6);
export const sunStretch = () => 1 + Math.abs(sunDx) * 0.04;

// ---- ground decoration (drawn per visible grass tile) ---------------------------------------------
const FLOWER = ["#ff8fb1", "#ffe14a", "#ffffff", "#8fb4ff", "#d99bff"];
export function grassDeco(ctx, x, y, season, clock) {
  const r = hash(x, y, 11); if (r > 0.26) return;
  const px = x * T + 2 + Math.floor(hash(x, y, 12) * 11), py = y * T + 5 + Math.floor(hash(x, y, 13) * 8), pal = SEASONS[season];
  const s = Math.round(Math.sin(clock * 1.6 + x * 0.7 + y * 0.35) * 0.9);
  if (r < 0.17) {                                                                    // tuft of grass blades
    ctx.fillStyle = pal.g3; ctx.fillRect(px, py + 1, 1, 2); ctx.fillRect(px + 2, py + 1, 1, 2); ctx.fillRect(px + 1, py, 1, 3);
    ctx.fillStyle = pal.g2; ctx.fillRect(px + s, py - 1, 1, 1); ctx.fillRect(px + 1 + s, py - 1, 1, 1); ctx.fillRect(px + 2 + (s >> 1), py, 1, 1);
  } else if (season < 2) {                                                           // flower on a swaying stem
    ctx.fillStyle = pal.g3; ctx.fillRect(px, py + 1, 1, 2);
    ctx.fillStyle = FLOWER[Math.floor(hash(x, y, 14) * FLOWER.length)]; ctx.fillRect(px - 1 + s, py - 1, 2, 2);
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(px + s, py, 1, 1);
  } else if (season === 2) {                                                         // fallen leaves
    ctx.fillStyle = hash(x, y, 15) > 0.5 ? "#e0702a" : "#c03a22"; ctx.fillRect(px, py, 2, 1); ctx.fillStyle = "#f4b04a"; ctx.fillRect(px, py, 1, 1);
  } else { ctx.fillStyle = "#ffffff"; ctx.fillRect(px, py, 2, 1); ctx.fillStyle = pal.g3; ctx.fillRect(px, py + 1, 2, 1); }   // little snow drifts
}

export function waterSparkle(ctx, x, y, clock) {
  const ph = Math.floor(clock * 1.4 + hash(x, y, 21) * 9);
  if (hash(x, y, 22 + ph) < 0.88) return;
  const px = x * T + 2 + Math.floor(hash(x, y, 23 + ph) * 11), py = y * T + 3 + Math.floor(hash(x, y, 24 + ph) * 9);
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(px, py, 2, 1);
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(px + 1, py - 1, 1, 1); ctx.fillRect(px, py + 1, 1, 1);
}

// Draws a tree/palm with its crown bending slightly in the wind (trunk stays put).
export function drawSwaying(ctx, img, x, y, clock, amp = 1) {
  const ox = img.ox || 0, oy = img.oy || 0, X = Math.round(x) - ox, Y = Math.round(y) - oy;
  const split = Math.floor(img.height * 0.6), s = Math.round(Math.sin(clock * 1.25 + x * 0.11) * 0.85 * amp);
  ctx.drawImage(img, 0, 0, img.width, split, X + s, Y, img.width, split);
  ctx.drawImage(img, 0, split, img.width, img.height - split, X, Y + split, img.width, img.height - split);
}

// ---- particles & ripples (world coordinates) --------------------------------------------------------
const ps = [];
const rnd = (a, b) => a + Math.random() * (b - a);
const KINDS = {
  dust:  { n: 2, col: ["#dccda5", "#efe3c2"], vx: [-9, 9], vy: [-14, -4], g: 10, life: [0.3, 0.5], size: 2 },
  snow:  { n: 2, col: ["#ffffff", "#e4edf6"], vx: [-9, 9], vy: [-14, -4], g: 10, life: [0.3, 0.5], size: 2 },
  dirt:  { n: 7, col: ["#7a5230", "#a07040", "#5a3a20"], vx: [-26, 26], vy: [-48, -14], g: 150, life: [0.35, 0.55], size: 2 },
  water: { n: 8, col: ["#6fb8ff", "#bfe3ff", "#ffffff"], vx: [-22, 22], vy: [-34, -8], g: 110, life: [0.35, 0.5], size: 1 },
  chip:  { n: 6, col: ["#a8a8b0", "#dcdce4", "#6a6a76"], vx: [-30, 30], vy: [-46, -16], g: 160, life: [0.3, 0.5], size: 2 },
  star:  { n: 8, col: ["#ffe45c", "#ffffff", "#ffb830"], vx: [-34, 34], vy: [-40, -6], g: 30, life: [0.45, 0.7], size: 2 },
};
export function emit(kind, x, y) {
  const k = KINDS[kind]; if (!k || ps.length > 220) return;
  for (let i = 0; i < k.n; i++) ps.push({ x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: rnd(...k.vx), vy: rnd(...k.vy), g: k.g, life: rnd(...k.life), t: 0, col: k.col[i % k.col.length], size: k.size });
}
export function ripple(x, y) { if (ps.length < 220) ps.push({ ripple: true, x, y, life: 0.7, t: 0 }); }
export function clearFx() { ps.length = 0; }
export function updateFx(dt) {
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.t += dt;
    if (p.t >= p.life) { ps.splice(i, 1); continue; }
    if (!p.ripple) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
}
export function drawFx(ctx) {
  for (const p of ps) {
    const k = p.t / p.life;
    if (p.ripple) {
      const r = 1 + Math.floor(k * 3), x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = `rgba(215,235,255,${0.7 * (1 - k)})`;
      ctx.fillRect(x - r, y, 1, 1); ctx.fillRect(x + r, y, 1, 1);
      if (r > 1) { ctx.fillRect(x - r + 1, y - 1, 2 * r - 1, 1); ctx.fillRect(x - r + 1, y + 1, 2 * r - 1, 1); }
    } else { ctx.globalAlpha = Math.min(1, 1.6 * (1 - k)); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); ctx.globalAlpha = 1; }
  }
}

// ---- lighting (screen space) -----------------------------------------------------------------------
let vig;
export function vignette(ctx, W, H, night) {
  if (!vig) {
    vig = document.createElement("canvas"); vig.width = W; vig.height = H;
    const g = vig.getContext("2d"), gr = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.98);
    gr.addColorStop(0, "rgba(8,6,16,0)"); gr.addColorStop(1, "rgba(8,6,16,.55)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 0.5 + 0.5 * night; ctx.drawImage(vig, 0, 0); ctx.globalAlpha = 1;
}
export function sunGlow(ctx, W, H, hr) {                                             // soft warm light from the upper left during the day
  if (hr < 7 || hr > 18) return;
  const a = 0.13 * Math.sin((hr - 7) / 11 * Math.PI), g = ctx.createRadialGradient(W * 0.15, -20, 10, W * 0.15, -20, W * 0.9);
  g.addColorStop(0, `rgba(255,236,190,${a})`); g.addColorStop(1, "rgba(255,236,190,0)");
  ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function windowGlow(ctx, cx, cy, w, strength, clock) {                        // warm light spilling from a building at night
  const flick = 1 + Math.sin(clock * 5 + cx) * 0.03, g = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.75 * flick);
  g.addColorStop(0, `rgba(255,214,130,${0.7 * strength})`); g.addColorStop(0.5, `rgba(255,190,100,${0.32 * strength})`); g.addColorStop(1, "rgba(255,180,90,0)");
  ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(cx - w, cy - w, w * 2, w * 2); ctx.restore();
}

// Lit glass for the shared house sprite (windows at x=10 and x=37, lantern by the door), drawn after the night tint so it stays bright.
export function litWindows(ctx, sx, sy, strength) {
  ctx.save(); ctx.globalAlpha = Math.min(1, strength * 1.15);
  for (const wx of [10, 37]) {
    ctx.fillStyle = "#ffcf6a"; ctx.fillRect(sx + wx + 2, sy + 35, 5, 7);
    ctx.fillStyle = "#fff0b0"; ctx.fillRect(sx + wx + 2, sy + 35, 2, 3);
    ctx.fillStyle = "#8a5424"; ctx.fillRect(sx + wx + 4, sy + 35, 1, 7); ctx.fillRect(sx + wx + 2, sy + 38, 5, 1);
  }
  ctx.fillStyle = "#ffe9a0"; ctx.fillRect(sx + 39, sy + 40, 2, 4);
  ctx.restore();
}
