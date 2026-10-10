// Story intro shown on a new game: six short procedural scenes with typewriter narration.
// Any key / tap advances (first completes the text), Esc or the Skip button jumps straight into the game.
import { hash } from "./px.js";

const LETTER = [
  "",
  "",
  "Tiny Valley's old farm is yours now. The soil is rich, the neighbours are kind — but the community centre, where the whole valley once gathered, has fallen into ruin.",
  "",
  "Restore it, and the valley will bloom again. I believe in you.",
  "",
  "— Grandpa Walt",
];

export function makeIntro(h) {
  const { ctx, W, H, S, txt, wrap, woodFrame, tr, beep } = h;
  let i = 0, t = 0, shown = 0, leaving = 0, onDone = null, active = false, total = 1, lines = [];

  const spr = (img, x, y, s = 1) => ctx.drawImage(img, Math.round(x - (img.ox || 0) * s), Math.round(y - (img.oy || 0) * s), img.width * s, img.height * s);
  const lw = img => img.width - 2 * (img.ox || 0), lh = img => img.height - 2 * (img.oy || 0);
  const vgrad = (y0, y1, stops) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); };
  const glow = (x, y, r, rgb, a) => { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); };
  const stars = (n, maxY) => { for (let k = 0; k < n; k++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + k)); ctx.fillStyle = `rgba(255,255,230,${tw * 0.9})`; ctx.fillRect(Math.floor(hash(k, 1) * W), Math.floor(hash(k, 2) * maxY), 1, 1); } };

  // ---- scenes ---------------------------------------------------------------------------------------
  function city() {
    vgrad(0, H, [[0, "#0c0f2c"], [1, "#3b3772"]]); stars(50, 110);
    ctx.fillStyle = "#f4efc0"; for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (x * x + y * y <= 130) ctx.fillRect(398 + x, 46 + y, 1, 1);
    ctx.fillStyle = "#3b3772"; for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) if ((x - 6) ** 2 + (y + 2) ** 2 <= 95 && x * x + y * y <= 130) ctx.fillRect(398 + x, 46 + y, 1, 1);
    for (const [layer, col, base] of [[0, "#1d1c47", 205], [1, "#141335", 225]]) for (let b = 0; b < 22; b++) {
      const bw = 20 + Math.floor(hash(b, layer, 3) * 14), bx = b * 24 - 6 + layer * 10, bh = 60 + Math.floor(hash(b, layer, 4) * 90) - layer * 20, by = base - bh;
      ctx.fillStyle = col; ctx.fillRect(bx, by, bw, bh);
      for (let wy = by + 6; wy < base - 6; wy += 9) for (let wx = bx + 3; wx < bx + bw - 4; wx += 6) {
        const on = hash(wx, wy, layer) > 0.62 + 0.06 * Math.sin(t * 0.7 + wx);
        if (on) { ctx.fillStyle = hash(wx, wy, 9) > 0.8 ? "#9ad0ff" : "#ffd98a"; ctx.fillRect(wx, wy, 3, 4); }
      }
    }
    ctx.fillStyle = "rgba(170,200,255,.55)"; for (let k = 0; k < 70; k++) { const x = (hash(k, 7) * W + t * 20) % W, y = (hash(k, 8) * H + t * 190) % H; ctx.fillRect(Math.round(x), Math.round(y), 1, 4); }
    ctx.fillStyle = "#24160c"; ctx.fillRect(0, 0, W, 8); ctx.fillRect(0, 0, 8, H); ctx.fillRect(W - 8, 0, 8, H); ctx.fillRect(W / 2 - 3, 0, 6, H);      // window frame
    ctx.fillStyle = "#3c2412"; ctx.fillRect(0, 214, W, 56); ctx.fillStyle = "#5a3a1c"; ctx.fillRect(0, 214, W, 3);
    glow(70, 205, 90, "255,200,120", 0.5); ctx.fillStyle = "#1a1a22"; ctx.fillRect(250, 182, 74, 32); ctx.fillStyle = "#4a7fd0"; ctx.fillRect(254, 186, 66, 24); glow(287, 198, 60, "110,160,255", 0.25);
    spr(S.player[1][0], 196, 148, 3);
  }
  function letterArrives() {
    vgrad(0, H, [[0, "#1c120a"], [1, "#3a2414"]]); ctx.fillStyle = "#2a1a10"; ctx.fillRect(0, 190, W, 80); ctx.fillStyle = "#4a2e18"; ctx.fillRect(0, 190, W, 4);
    glow(380, 150, 120, "255,190,100", 0.55 + 0.1 * Math.sin(t * 9));
    ctx.fillStyle = "#6a4020"; ctx.fillRect(374, 158, 12, 34); ctx.fillStyle = "#e8d8b0"; ctx.fillRect(375, 158, 10, 5); ctx.fillStyle = "#ffcf5a"; ctx.fillRect(379, 150 + Math.round(Math.sin(t * 9)), 2, 8);   // candle
    const k = Math.min(1, t / 1.2), ease = 1 - (1 - k) ** 3, ex = 150 + 40 * (1 - ease), ey = 110 + 26 * ease - 50 * (1 - ease) + Math.sin(t * 2) * 1.5;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(ex + 6, 190, 130, 6);
    ctx.fillStyle = "#e9dab4"; ctx.fillRect(ex, ey, 140, 84); ctx.fillStyle = "#d3c196"; ctx.fillRect(ex, ey + 80, 140, 4);
    ctx.fillStyle = "#c8b384"; for (let r = 0; r < 70; r++) ctx.fillRect(ex + 20 + r, ey + 36 + Math.round(r * 0.2), 1, 1);                // address scribble
    ctx.strokeStyle = "#b8a474"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 70, ey + 46); ctx.lineTo(ex + 140, ey); ctx.stroke();
    ctx.fillStyle = "#b32b2b"; ctx.fillRect(ex + 62, ey + 38, 16, 16); ctx.fillStyle = "#d84a4a"; ctx.fillRect(ex + 64, ey + 40, 8, 6);
    for (let m = 0; m < 20; m++) { const x = (hash(m, 5) * W + t * 6) % W, y = 40 + (hash(m, 6) * 140 - t * 6 + 400) % 140; ctx.fillStyle = `rgba(255,220,150,${0.25 + 0.2 * Math.sin(t * 2 + m)})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  }
  function letterText() {
    vgrad(0, H, [[0, "#1c120a"], [1, "#2c1a0e"]]); glow(W / 2, 120, 260, "255,200,120", 0.35);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(66, 22, 360, 236); ctx.fillStyle = "#efe0b8"; ctx.fillRect(60, 14, 360, 236);
    ctx.fillStyle = "#dccb9c"; ctx.fillRect(60, 244, 360, 6); for (let y = 30; y < 240; y += 14) { ctx.fillStyle = "rgba(150,120,70,.12)"; ctx.fillRect(74, y + 4, 332, 1); }
    ctx.fillStyle = "#b32b2b"; ctx.fillRect(398, 214, 14, 14); ctx.fillStyle = "#d84a4a"; ctx.fillRect(400, 216, 6, 5);
  }
  function journey() {
    const p = Math.min(1, t / 6);
    vgrad(0, H, [[0, "#6aa8e8"], [0.5, "#ffcf9a"], [1, "#ff9a6a"]]);
    glow(330, 105 - 22 * p, 120, "255,230,170", 0.7); ctx.fillStyle = "#fff3c0"; for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (x * x + y * y <= 130) ctx.fillRect(330 + x, 98 - 22 * p + y, 1, 1);
    const hills = (col, base, amp, f, sp, off) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base + Math.sin((x + t * sp + off) / f) * amp + Math.sin((x + t * sp) / (f * 0.43)) * amp * 0.35); ctx.lineTo(W, H); ctx.fill(); };
    hills("#9bb6d8", 112, 14, 60, 6, 0); hills("#6f9a6a", 138, 12, 44, 14, 90); hills("#4f8a46", 162, 9, 36, 30, 40);
    ctx.fillStyle = "#7a5a34"; ctx.fillRect(0, 168, W, 30); ctx.fillStyle = "#c9a46a"; ctx.fillRect(0, 172, W, 26);
    ctx.fillStyle = "#e8cf94"; for (let x = -((t * 60) % 40); x < W; x += 40) ctx.fillRect(x, 184, 22, 2);
    for (let k = 0; k < 6; k++) { const x = ((k * 110 - t * 60) % (W + 110) + W + 110) % (W + 110) - 50; spr(S.tree[0][k % 3], x, 56, 2); }
    const fr = [1, 0, 2, 0][Math.floor(t * 8) % 4]; ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(198, 192, 30, 5);
    spr(S.player[2][fr], 192, 134 + (fr === 0 ? -1 : 0), 2.5);
  }
  function arrival() {
    vgrad(0, 110, [[0, "#7fb6f0"], [1, "#d9ecff"]]); glow(80, 20, 150, "255,240,190", 0.6);
    ctx.fillStyle = "#8fb0d8"; ctx.beginPath(); ctx.moveTo(0, 110); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 84 + Math.sin(x / 55) * 12); ctx.lineTo(W, 110); ctx.fill();
    for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) ctx.drawImage(S.tile("grass", 0, Math.floor(hash(x, y, 4) * 8) % 8, 0), x * 32, 96 + y * 32, 32, 32);
    for (let y = 2; y < 6; y++) ctx.drawImage(S.tile("path", 0, y % 4, 0, {}), 7 * 32 + 8, 96 + y * 32, 32, 32);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(252, 150, 150, 8);
    spr(S.bldg.home, 262, 56, 2);
    for (const [tx, ty, v] of [[40, 40, 0], [120, 70, 1], [430, 54, 2], [380, 112, 1], [16, 128, 2]]) { ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(tx + 8, ty + lh(S.tree[0][v]) * 2 - 6, 40, 6); spr(S.tree[0][v], tx, ty, 2); }
    for (let k = 0; k < 5; k++) { const p = (t * 0.3 + k * 0.2) % 1; ctx.fillStyle = `rgba(240,240,245,${0.6 * (1 - p)})`; ctx.fillRect(Math.round(262 + 2 * 43 + Math.sin(p * 5 + k) * 4 + p * 10), Math.round(62 - p * 40), 4 + Math.round(p * 4), 4 + Math.round(p * 4)); }
    const wk = Math.min(1, t / 5), fr = [1, 0, 2, 0][Math.floor(t * 8) % 4];
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(238, 258 - 90 * wk + 40, 28, 5);
    spr(S.player[1][wk < 1 ? fr : 0], 236, 214 - 100 * wk, 2.4);
  }
  function titleCard() {
    vgrad(0, H, [[0, "#102818"], [1, "#2c5a34"]]); stars(30, 90);
    const a = Math.min(1, t / 1.2);
    ctx.font = "bold 22px monospace"; txt("Spring, Day 1", W / 2 + 1, 100 + 1, "#0a1a0e", "center"); txt("Spring, Day 1", W / 2, 100, `rgba(255,233,168,${a})`, "center");
    ctx.font = "10px monospace"; txt("Restore the community centre.", W / 2, 132, `rgba(235,255,235,${Math.min(1, Math.max(0, t - 0.8))})`, "center");
    txt("Welcome to Tiny Valley.", W / 2, 150, `rgba(235,255,235,${Math.min(1, Math.max(0, t - 1.6))})`, "center");
    ctx.font = "9px monospace";
  }

  const SLIDES = [
    { scene: city, text: "Gray towers. Gray mornings. Another year of numbers on a screen, and the sky never changed." },
    { scene: letterArrives, text: "Then, one rainy evening, a thick envelope arrived. It smelled of woodsmoke and old soil." },
    { scene: letterText, letter: true },
    { scene: journey, text: "You packed one bag, left the grey city behind, and followed the road into the sunrise." },
    { scene: arrival, text: "The fields were wild and the fences crooked — but smoke curled from the chimney. This was home now." },
    { scene: titleCard, card: true },
  ];

  function layout() {
    const s = SLIDES[i]; ctx.font = "9px monospace";
    if (s.letter) lines = [h.tf("My dear {0},", h.name() || "grandchild"), ...LETTER.slice(1)].flatMap(p => (p ? wrap(p, 320) : [""]));
    else if (s.card) lines = [];
    else lines = wrap(s.text, 390);
    total = Math.max(1, s.card ? 1 : lines.join("").length);
  }
  function next() { if (i >= SLIDES.length - 1) return end(); i++; t = 0; shown = 0; leaving = 0; layout(); beep(520, 0.05, "triangle"); }
  function end() { active = false; onDone?.(); }

  return {
    get active() { return active; },
    begin(cb) { onDone = cb; active = true; i = 0; t = 0; shown = 0; leaving = 0; layout(); },
    update(dt) {
      t += dt; const prev = shown; shown = Math.min(total, shown + dt * 42);
      if (Math.floor(shown / 5) !== Math.floor(prev / 5) && shown < total) beep(900 + (Math.floor(shown) % 3) * 40, 0.015, "square", 0.012);
      if (leaving && (leaving += dt) > 1.35) next();
    },
    key(k) {
      if (k === "escape") return end();
      if (![" ", "enter", "e", "arrowright", "arrowdown"].includes(k)) return;
      if (shown < total - 0.5 && !SLIDES[i].card) shown = total; else if (!leaving) leaving = 1.001;
    },
    tap(cx, cy) { if (cx > W - 70 && cy < 22) return end(); this.key(" "); },
    draw() {
      layout(); ctx.imageSmoothingEnabled = false;
      SLIDES[i].scene();
      const s = SLIDES[i], n = Math.floor(shown);
      if (s.letter || !s.card) {
        let left = n, y0 = s.letter ? 40 : 0;
        const rows = lines.map(l => { const part = l.slice(0, Math.max(0, left)); left -= l.length; return part; });
        if (s.letter) rows.forEach((r, k) => txt(r, 84, y0 + k * 12 + (k > 1 ? 0 : 0), k === lines.length - 1 ? "#6a2a1a" : "#4a3018"));
        else { const bh = lines.length * 12 + 14, by = H - bh - 10; woodFrame(14, by, W - 28, bh, "rgba(26,17,9,.94)"); rows.forEach((r, k) => txt(r, 24, by + 17 + k * 12, "#fff2d0")); }
      }
      if (shown >= total - 0.5 && Math.sin(t * 6) > -0.3) txt("▶", W - 24, H - 18, "#ffd23f");
      txt(h.isTouch() ? "Skip ▶" : "Esc: skip", W - 8, 14, "rgba(255,255,255,.6)", "right");
      const f = leaving ? Math.min(1, (leaving - 1) / 0.35) : Math.max(0, 1 - t / 0.5);
      if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, f)})`; ctx.fillRect(0, 0, W, H); }
    },
  };
}
