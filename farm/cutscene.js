// A small cutscene engine. A script is an array of steps:
//   "Name: line"      dialogue (portrait + name); any other string is narration
//   { walk: [id, dx, dy] }  { at: [id, dx, dy, dir] }  { face: [id, dir|"player"] }  { emote: [id, "!"|"?"|"♥"|"…"] }
//   { wait: seconds }  { cam: [dx, dy] | null }  { fade: "out" | "in" }
// Positions are tiles relative to where the player stands when the scene starts. "player" is a valid actor id.
const EMOTE = { "!": "#e84a4a", "?": "#4a8ae8", "♥": "#f0506a", "…": "#888", "♪": "#3ddc97" };
const DIRV = [[0, 1], [0, -1], [1, 0], [-1, 0]];                                      // npc dir 0 down, 1 up, 2 right, 3 left

export function createCutscenes(d) {
  const { ctx, W, H, T } = d;
  let sc = null;

  const isP = id => id === "player";
  const spot = id => (isP(id) ? { x: d.state().px, y: d.state().py } : d.npcs[id] || { x: 0, y: 0 });
  const place = (id, x, y) => { if (isP(id)) { d.state().px = x; d.state().py = y; } else { const n = (d.npcs[id] ??= { map: null, x, y, dir: 0, moving: false }); n.map = d.state().map; n.x = x; n.y = y; } };
  const setDir = (id, dir) => { if (isP(id)) { const s = d.state(); [s.fx, s.fy] = DIRV[dir]; } else if (d.npcs[id]) d.npcs[id].dir = dir; };
  const moving = (id, v) => { if (isP(id)) d.setMoving(v); else if (d.npcs[id]) d.npcs[id].moving = v; };
  const dirTo = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 3) : (dy > 0 ? 0 : 1); };

  function finish(skipped) {
    if (!sc) return;
    const s = d.state(); Object.assign(s, sc.saved.player);
    for (const [id, o] of Object.entries(sc.saved.npcs)) { if (d.npcs[id]) Object.assign(d.npcs[id], o, { moving: false }); }
    d.setMoving(false); d.setCam(null);
    const end = sc.onEnd; sc = null; end?.(skipped);
  }

  function begin(steps, onEnd) {
    const s = d.state(), ids = new Set(["player"]);
    for (const st of steps) if (typeof st === "object") for (const v of Object.values(st)) if (Array.isArray(v) && typeof v[0] === "string") ids.add(v[0]);
    const saved = { player: { px: s.px, py: s.py, fx: s.fx, fy: s.fy }, npcs: {} };
    for (const id of ids) if (!isP(id) && d.npcs[id]) saved.npcs[id] = { map: d.npcs[id].map, x: d.npcs[id].x, y: d.npcs[id].y, dir: d.npcs[id].dir };
    for (const id of ids) if (!isP(id) && !saved.npcs[id]) saved.npcs[id] = { map: null, x: 0, y: 0, dir: 0 };
    sc = { steps, i: 0, onEnd, saved, ox: Math.round(s.px / T), oy: Math.round(s.py / T), t: 0, bars: 0, fade: 0, fadeTo: 0, box: null, wait: 0, walk: null, emotes: [], cam: null };
    run();
  }

  const speakerOf = line => {                                                          // "Rosa: Hello" -> id of the villager called Rosa
    const m = /^([A-Za-z]{2,12}):\s/.exec(line); if (!m) return null;
    if (m[1] === "You") return "player";
    return Object.keys(d.VILLAGERS).find(id => d.VILLAGERS[id].name === m[1]) || null;
  };

  function run() {                                                                     // execute steps until one needs time or a key press
    while (sc && sc.i < sc.steps.length && !sc.box && sc.wait <= 0 && !sc.walk && sc.fade === sc.fadeTo) {
      const st = sc.steps[sc.i++];
      if (typeof st === "string") {
        const who = speakerOf(st); ctx.font = "9px monospace";
        const text = who ? d.tr(st).replace(/^[^:]{1,12}:\s*/, "") : d.tr(st);
        const lines = d.wrap(text, who ? 372 : 420);
        sc.box = { who, lines, full: lines.join("").length, shown: 0, name: who ? (isP(who) ? d.state().name || "You" : d.VILLAGERS[who].name) : "" };
        if (who && !isP(who) && d.npcs[who]) setDir(who, dirTo(spot(who), spot("player")));
        return;
      }
      if (st.walk) { const [id, dx, dy] = st.walk; sc.walk = { id, x: (sc.ox + dx) * T + (isP(id) ? 2 : 0), y: (sc.oy + dy) * T, speed: st.walk[3] || 52 }; if (!isP(id) && d.npcs[id] && d.npcs[id].map !== d.state().map) place(id, sc.walk.x, sc.walk.y); }
      else if (st.at) { const [id, dx, dy, dir] = st.at; place(id, (sc.ox + dx) * T + (isP(id) ? 2 : 0), (sc.oy + dy) * T); if (dir != null) setDir(id, dir); }
      else if (st.face) { const [id, dir] = st.face; setDir(id, dir === "player" ? dirTo(spot(id), spot("player")) : dir); }
      else if (st.emote) { sc.emotes.push({ id: st.emote[0], e: st.emote[1], t: 1.3 }); d.audio.beep(st.emote[1] === "♥" ? 880 : 520, 0.08, "triangle"); sc.wait = 0.6; }
      else if (st.wait != null) sc.wait = st.wait;
      else if (st.cam !== undefined) { sc.cam = st.cam ? { x: (sc.ox + st.cam[0]) * T + 8, y: (sc.oy + st.cam[1]) * T + 8 } : null; if (!st.cam) d.setCam(null); }
      else if (st.fade) { sc.fadeTo = st.fade === "out" ? 1 : 0; }
    }
    if (sc && sc.i >= sc.steps.length && !sc.box && sc.wait <= 0 && !sc.walk && sc.fade === sc.fadeTo) { sc.ending = true; }
  }

  return {
    get active() { return !!sc; },
    start(steps, onEnd) { if (sc) return false; begin(steps, onEnd); return true; },
    key(k) {
      if (!sc) return;
      if (k === "escape") return finish(true);
      if (sc.box) { if (sc.box.shown < sc.box.full) sc.box.shown = sc.box.full; else { sc.box = null; run(); } }
    },
    update(dt) {
      if (!sc) return;
      sc.t += dt; sc.bars = Math.min(1, sc.bars + dt * 2.5);
      if (sc.fade !== sc.fadeTo) { sc.fade += Math.sign(sc.fadeTo - sc.fade) * Math.min(Math.abs(sc.fadeTo - sc.fade), dt * 1.6); if (sc.fade === sc.fadeTo) run(); }
      if (sc.cam) { const c = d.getCam() || { x: d.state().px + 6, y: d.state().py + 10 }; d.setCam({ x: c.x + (sc.cam.x - c.x) * Math.min(1, dt * 3), y: c.y + (sc.cam.y - c.y) * Math.min(1, dt * 3) }); }
      for (const e of sc.emotes) e.t -= dt; sc.emotes = sc.emotes.filter(e => e.t > 0);
      if (sc.box && sc.box.shown < sc.box.full) sc.box.shown = Math.min(sc.box.full, sc.box.shown + dt * 55);
      if (sc.wait > 0) { sc.wait -= dt; if (sc.wait <= 0) run(); }
      if (sc.walk) {
        const w = sc.walk, p = spot(w.id), dx = w.x - p.x, dy = w.y - p.y, sp = w.speed * dt;
        if (Math.abs(dx) > 0.5) { place(w.id, p.x + Math.sign(dx) * Math.min(sp, Math.abs(dx)), p.y); setDir(w.id, dx > 0 ? 2 : 3); moving(w.id, true); }
        else if (Math.abs(dy) > 0.5) { place(w.id, p.x, p.y + Math.sign(dy) * Math.min(sp, Math.abs(dy))); setDir(w.id, dy > 0 ? 0 : 1); moving(w.id, true); }
        else { moving(w.id, false); sc.walk = null; run(); }
      }
      if (sc?.ending && !sc.box) finish(false);
    },
    draw() {
      if (!sc) return;
      const bh = Math.round(24 * sc.bars), cam = d.cam();
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
      for (const e of sc.emotes) {                                                     // speech-bubble icons above heads
        const p = spot(e.id), sx = (p.x + 8 - cam.x) * cam.zoom, sy = (p.y - 12 - cam.y) * cam.zoom - Math.sin(e.t * 4) * 1.5, col = EMOTE[e.e] || "#fff";
        ctx.fillStyle = "#2a1a12"; ctx.fillRect(sx - 7, sy - 12, 14, 13); ctx.fillStyle = "#fff8e8"; ctx.fillRect(sx - 6, sy - 11, 12, 11); ctx.fillRect(sx - 1, sy, 3, 3);
        ctx.fillStyle = col; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.fillText(e.e, sx, sy - 2); ctx.textAlign = "left";
      }
      ctx.font = "9px monospace"; ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.textAlign = "right"; ctx.fillText(d.tr("Esc: skip"), W - 6, 15); ctx.textAlign = "left";
      if (sc.box) {
        const b = sc.box, y = 186, h = 72, who = b.who;
        d.woodFrame(12, y, W - 24, h, "rgba(34,22,12,.95)");
        let tx = 24;
        if (who) {
          d.woodFrame(18, y + 6, 42, 60, "#7a5a36"); const img = isP(who) ? d.S.player[0][0] : d.S.npc[who]?.[0]?.[0];
          if (img) ctx.drawImage(img, 22, y + 11, 34, 51); tx = 70;
          ctx.fillStyle = "#ffd23f"; ctx.fillText(b.name, tx, y + 18);
        }
        let left = Math.floor(b.shown);
        b.lines.slice(0, 4).forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length; ctx.fillStyle = who ? "#f2ead8" : "#d8d0b0"; ctx.fillText(part, tx, y + (who ? 32 : 22) + i * 11); });
        if (b.shown >= b.full && Math.floor(sc.t * 2.5) % 2 === 0) { ctx.fillStyle = "#ffd23f"; ctx.fillText("▼", W - 30, y + h - 12); }
      }
      if (sc.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${sc.fade})`; ctx.fillRect(0, 0, W, H); }
    },
  };
}
