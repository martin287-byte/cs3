// Character builder: pick a name and how your farmer looks, with a live animated preview.
// Used for new games and from the farmhouse wardrobe. Everything is tappable (and keyboard friendly).
import { makePerson, PLAYER_LOOK } from "./art.js";

export const SKIN = ["#fbe3d0", "#f9d9bc", "#f4c9a0", "#e5ac7e", "#c68a5c", "#a06a42", "#7a4a2c", "#5a3420"];
export const HAIR = ["#2a1a12", "#6a4426", "#a0702e", "#d9a84a", "#e8d08a", "#c0501e", "#8a2a1a", "#8a8a94", "#e8e8f0", "#3a5a9a", "#8a4aa8", "#d86aa0"];
export const EYES = ["#2a1a12", "#4a3020", "#2a5a9a", "#2a8a5a", "#6a6a2a", "#7a2a8a"];
export const SHIRTS = ["#d4504a", "#e8923a", "#e8c83a", "#6aaa4a", "#3aa89a", "#3a7ad4", "#7a5ad4", "#d45a9a", "#f0f0f0", "#3a3a44", "#8a5a3a", "#5a8a3a"];
export const PANTS = ["#3f5fa8", "#2a3a6a", "#4a4a54", "#6a4a2a", "#8a7a4a", "#3a6a3a", "#7a3a3a", "#2a2a2a"];
export const STYLES = ["short", "long", "bun", "cap", "bald"];
const STYLE_NAMES = { short: "Short", long: "Long", bun: "Bun", cap: "Cap", bald: "Bald" };
const MAX_NAME = 12, LETTERS = ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ"], ACCENTS = "ÁÉÍÓÖŐÚÜŰ";

// The look stored in saves ({skin, hair, hairStyle, eye, shirt, pants, beard?}) becomes sprite parameters here.
export const toSpriteLook = l => ({ ...PLAYER_LOOK, ...l, cap: l.shirt ?? PLAYER_LOOK.shirt, beard: l.beard ? l.hair : undefined });

export function makeBuilder(h) {
  const { ctx, W, H, S, woodFrame, txt, beep, lang, isTouch } = h;
  let active = false, cur = {}, name = "", onDone = null, sel = 0, t = 0, editing = false, shift = true, hits = [], preview = null, dir = 0, dirT = 0, mode = "new", cancelable = false, backup = null;

  const ROWS = [
    { id: "name", label: "Name" },
    { id: "skin", label: "Skin", key: "skin", list: SKIN },
    { id: "style", label: "Hair style", key: "hairStyle", list: STYLES, text: true },
    { id: "hair", label: "Hair colour", key: "hair", list: HAIR },
    { id: "eye", label: "Eyes", key: "eye", list: EYES },
    { id: "shirt", label: "Shirt", key: "shirt", list: SHIRTS },
    { id: "pants", label: "Pants", key: "pants", list: PANTS },
    { id: "beard", label: "Facial hair", toggle: true },
  ];
  const BTN_RANDOM = ROWS.length, BTN_START = ROWS.length + 1;
  const raw = (s, x, y, c = "#fff", a = "left") => { ctx.fillStyle = c; ctx.textAlign = a; ctx.fillText(s, x, y); ctx.textAlign = "left"; };   // user text: never translated
  const rebuild = () => { preview = makePerson(toSpriteLook(cur)); };
  const defaultName = () => (lang() === "hu" ? "Gazda" : "Farmer");
  const hit = (x, y, w, hh, fn) => hits.push({ x, y, w, h: hh, fn });
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function change(i, d) {
    const r = ROWS[i]; if (!r) return;
    if (r.toggle) cur.beard = !cur.beard;
    else if (r.list) { const idx = r.list.indexOf(cur[r.key]); cur[r.key] = r.list[((idx < 0 ? 0 : idx) + d + r.list.length) % r.list.length]; }
    else return;
    beep(560 + i * 30, 0.04, "triangle"); rebuild();
  }
  function randomize() {
    cur = { skin: pick(SKIN), hair: pick(HAIR), hairStyle: pick(STYLES), eye: pick(EYES), shirt: pick(SHIRTS), pants: pick(PANTS), beard: Math.random() < 0.2 };
    beep(700, 0.06, "triangle"); rebuild();
  }
  function finish(ok) {
    if (editing) { editing = false; return; }
    active = false; if (!ok && backup) { cur = backup.look; name = backup.name; }
    onDone?.(ok ? { look: { ...cur }, name: name.trim() || defaultName() } : null);
  }
  function addChar(ch) {
    if (name.length >= MAX_NAME) return;
    name += shift || !name.length ? ch.toUpperCase() : ch.toLowerCase(); shift = false; beep(820, 0.02, "square", 0.02);
  }

  function keyboardLayout() {                                                       // returns [{label, x, y, w, h, fn}]
    const keys = []; let y = 100;
    const rows = [...LETTERS, ...(lang() === "hu" ? [ACCENTS] : [])];
    for (const row of rows) {
      const n = row.length, x0 = 240 - (n * 44 - 4) / 2;
      [...row].forEach((c, i) => keys.push({ label: c, x: x0 + i * 44, y, w: 40, h: 22, fn: () => addChar(c) }));
      y += 26;
    }
    keys.push({ label: "Shift", x: 40, y, w: 84, h: 22, on: shift, fn: () => { shift = !shift; } });
    keys.push({ label: "Space", x: 128, y, w: 124, h: 22, fn: () => addChar(" ") });
    keys.push({ label: "Del", x: 256, y, w: 84, h: 22, fn: () => { name = name.slice(0, -1); } });
    keys.push({ label: "OK", x: 344, y, w: 96, h: 22, ok: true, fn: () => { editing = false; beep(660, 0.05, "triangle"); } });
    return keys;
  }

  function drawEditor() {
    hit(0, 0, W, H, () => {});                                                      // swallow taps outside the keyboard
    ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.fillRect(0, 0, W, H);
    woodFrame(24, 36, 432, 214, "rgba(34,22,12,.97)");
    txt("Your name", 40, 56, "#ffe9b0");
    ctx.fillStyle = "#12090a"; ctx.fillRect(40, 62, 400, 24); ctx.strokeStyle = "#93622f"; ctx.strokeRect(40.5, 62.5, 399, 23);
    ctx.font = "bold 11px monospace"; raw(name + (Math.sin(t * 8) > 0 ? "_" : " "), 48, 79, "#fff"); ctx.font = "9px monospace";
    raw(`${name.length}/${MAX_NAME}`, 432, 79, "#c9a56a", "right");
    for (const k of keyboardLayout()) {
      ctx.fillStyle = k.ok ? "#3a7a3a" : k.on ? "#cb9450" : "#4a2e18"; ctx.fillRect(k.x, k.y, k.w, k.h);
      ctx.fillStyle = k.ok ? "#6ac46a" : "#93622f"; ctx.fillRect(k.x, k.y, k.w, 1); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(k.x, k.y + k.h - 1, k.w, 1);
      const shown = k.label.length === 1 ? (shift || !name.length ? k.label : k.label.toLowerCase()) : k.label;
      if (k.label.length === 1) raw(shown, k.x + k.w / 2, k.y + 15, "#fff", "center"); else txt(shown, k.x + k.w / 2, k.y + 15, "#fff", "center");
      hit(k.x, k.y, k.w, k.h, k.fn);
    }
  }

  function draw() {
    hits = []; ctx.imageSmoothingEnabled = false;
    // backdrop: sky and grass
    const g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, "#8fc4f0"); g.addColorStop(1, "#dcefff"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let y = 6; y < 17; y++) for (let x = 0; x < 30; x++) ctx.drawImage(S.tile("grass", 0, (x * 7 + y * 3) % 8, 0), x * 16, y * 16);
    ctx.font = "bold 11px monospace"; txt("CREATE YOUR FARMER", W / 2 + 1, 19, "#2b3b20", "center"); txt("CREATE YOUR FARMER", W / 2, 18, "#ffe9a8", "center"); ctx.font = "9px monospace";

    // preview stage
    woodFrame(14, 28, 172, 200);
    ctx.save(); ctx.beginPath(); ctx.rect(18, 32, 164, 192); ctx.clip();
    for (let y = 0; y < 14; y++) for (let x = 0; x < 11; x++) ctx.drawImage(S.tile("grass", 0, (x * 5 + y) % 8, 0), 18 + x * 16, 32 + y * 16);
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(56, 178, 88, 7); ctx.fillRect(64, 185, 72, 2);
    const walking = dir !== 0, frame = walking ? [1, 0, 2, 0][Math.floor(t * 7) % 4] : 0, img = preview[dir][frame], s = 6;
    ctx.drawImage(img, Math.round(100 - 8 * s - (img.ox || 0) * s), Math.round(184 - 24 * s - (img.oy || 0) * s + (walking && frame === 0 ? -s : 0)), img.width * s, img.height * s);
    ctx.restore();
    hit(18, 32, 164, 192, () => { dir = [2, 3, 1, 0][dir] ?? 0; dirT = 0; });
    woodFrame(36, 204, 128, 20, "rgba(26,17,9,.95)"); raw(name || defaultName(), 100, 218, "#fff", "center");

    // option rows
    woodFrame(192, 28, 276, 200);
    ROWS.forEach((r, i) => {
      const y = 50 + i * 21;
      if (sel === i) { ctx.fillStyle = "rgba(255,210,63,.16)"; ctx.fillRect(198, y - 12, 264, 18); }
      txt(r.label, 206, y, sel === i ? "#ffd23f" : "#fff");
      if (r.id === "name") { raw(name || defaultName(), 392, y, "#fff", "center"); txt("edit", 446, y, "#c9a56a", "right"); }
      else {
        txt("◀", 334, y, "#ffe9b0", "center"); txt("▶", 450, y, "#ffe9b0", "center");
        if (r.toggle) txt(cur.beard ? "on" : "off", 392, y, "#fff", "center");
        else if (r.text) txt(STYLE_NAMES[cur[r.key]] ?? cur[r.key], 392, y, "#fff", "center");
        else { const c = cur[r.key]; ctx.fillStyle = "#12090a"; ctx.fillRect(366, y - 9, 52, 13); ctx.fillStyle = c; ctx.fillRect(368, y - 7, 48, 9); }
        hit(322, y - 12, 24, 18, () => { sel = i; change(i, -1); }); hit(438, y - 12, 24, 18, () => { sel = i; change(i, 1); }); hit(346, y - 12, 90, 18, () => { sel = i; change(i, 1); });
      }
      hit(198, y - 12, 124, 18, () => { sel = i; if (r.id === "name") editing = true; });
      if (r.id === "name") hit(322, y - 12, 140, 18, () => { sel = i; editing = true; });
    });
    for (const [i, label, x] of [[BTN_RANDOM, "Random", 200], [BTN_START, mode === "new" ? "Start" : "Done", 344]]) {
      woodFrame(x, 234, 124, 24, sel === i ? "rgba(90,60,20,.97)" : "rgba(34,22,12,.95)");
      txt(label, x + 62, 250, sel === i ? "#ffd23f" : "#fff", "center");
      hit(x, 234, 124, 24, () => { sel = i; if (i === BTN_RANDOM) randomize(); else finish(true); });
    }
    if (cancelable) { txt("Cancel", 40, 250, "#ffb0a0"); hit(14, 238, 60, 18, () => finish(false)); }
    else if (isTouch()) txt("Tap ◀ ▶ to change", 14, 250, "#1f2a14");
    else { txt("↑↓ choose  ←→ change", 14, 244, "#1f2a14"); txt("Enter: select · R: random", 14, 256, "#1f2a14"); }
    if (editing) drawEditor();
  }

  return {
    get active() { return active; },
    get editing() { return editing; },
    // opts: {look, name, mode: "new" | "edit"}; cb receives {look, name} or null when cancelled
    begin(opts, cb) {
      cur = { skin: PLAYER_LOOK.skin, hair: PLAYER_LOOK.hair, hairStyle: PLAYER_LOOK.hairStyle, eye: PLAYER_LOOK.eye, shirt: PLAYER_LOOK.shirt, pants: PLAYER_LOOK.pants, ...opts.look };
      name = opts.name ?? ""; mode = opts.mode ?? "new"; cancelable = mode === "edit"; backup = { look: { ...cur }, name };
      onDone = cb; active = true; sel = 0; editing = false; shift = true; dir = 0; dirT = 0; t = 0; rebuild();
    },
    update(dt) { t += dt; dirT += dt; if (!editing && dirT > 2.2) { dir = [2, 3, 1, 0][dir] ?? 0; dirT = 0; } },
    key(k) {
      if (editing) {
        if (k === "enter" || k === "escape") { editing = false; return; }
        if (k === "backspace") name = name.slice(0, -1);
        else if (k === "shift") shift = !shift;
        else if ([...k].length === 1 && /[\p{L} ]/u.test(k)) addChar(k);
        return;
      }
      if (k === "escape" && cancelable) return finish(false);
      if (k === "arrowup" || k === "w") sel = (sel + BTN_START) % (BTN_START + 1);
      else if (k === "arrowdown" || k === "s") sel = (sel + 1) % (BTN_START + 2 - 1);
      else if (k === "arrowleft" || k === "a") change(sel, -1);
      else if (k === "arrowright" || k === "d") change(sel, 1);
      else if (k === "r") randomize();
      else if (k === "tab") { dir = [2, 3, 1, 0][dir] ?? 0; dirT = 0; }
      else if (k === "enter" || k === " " || k === "e") {
        if (sel === 0) editing = true; else if (sel === BTN_RANDOM) randomize(); else if (sel === BTN_START) finish(true); else change(sel, 1);
      }
    },
    tap(cx, cy) { for (let i = hits.length - 1; i >= 0; i--) { const r = hits[i]; if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) { r.fn(); return; } } },
    draw,
  };
}
