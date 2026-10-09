const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height, T = 16, COLS = 30, ROWS = 16;

const CROPS = {
  turnip:  { days: 4, price: 20, seed: 5,  color: "#e8e0f0" },
  pumpkin: { days: 8, price: 90, seed: 25, color: "#f59e0b" },
};
const TOOLS = ["hoe", "can", "turnip", "pumpkin"];
const SAVE_KEY = "tinyfarm-save-v1";

// tile types: 0 grass, 1 tilled, 2 water(pond), 3 tree/rock, 4 house, 5 bin
let world, state;

function newGame() {
  world = Array.from({ length: ROWS }, () => Array(COLS).fill(null).map(() => ({ t: 0 })));
  const set = (x, y, t) => { world[y][x] = { t }; };
  for (let y = 11; y < 15; y++) for (let x = 20; x < 27; x++) set(x, y, 2);          // pond
  for (let x = 0; x < COLS; x++) { set(x, 0, 3); set(x, ROWS - 1, 3); }              // border trees
  for (let y = 0; y < ROWS; y++) { set(0, y, 3); set(COLS - 1, y, 3); }
  for (let i = 0; i < 25; i++) {                                                     // scattered rocks/trees
    const x = 2 + Math.floor(Math.random() * 26), y = 2 + Math.floor(Math.random() * 12);
    if (world[y][x].t === 0 && !(x >= 3 && x <= 8 && y >= 2 && y <= 6)) set(x, y, 3);
  }
  for (let y = 2; y <= 3; y++) for (let x = 3; x <= 5; x++) set(x, y, 4);            // house 3x2
  set(8, 4, 5);                                                                      // shipping bin
  state = {
    px: 6 * T, py: 5 * T, fx: 0, fy: 1, sel: 0,
    money: 50, energy: 100, day: 1, minutes: 6 * 60, rain: false,
    inv: { turnip: 0, pumpkin: 0 }, msg: "", msgT: 0,
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ world, state })); } catch {}
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s?.world && s?.state) { world = s.world; state = s.state; return true; }
  } catch {}
  return false;
}

const keys = new Set();
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  if (!keys.has(k)) {
    if (k >= "1" && k <= "4") state.sel = Number(k) - 1;
    if (k === " ") useTool();
    if (k === "e") interact();
  }
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

function say(m) { state.msg = m; state.msgT = 2.5; }
const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const blocked = (tx, ty) => !inBounds(tx, ty) || [2, 3, 4, 5].includes(world[ty][tx].t);
const targetTile = () => ({
  x: Math.floor((state.px + 5) / T) + state.fx,
  y: Math.floor((state.py + 5) / T) + state.fy,
});

function useTool() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const tile = world[y][x], tool = TOOLS[state.sel];

  if (tile.crop && tile.crop.age >= CROPS[tile.crop.type].days) {          // harvest any time
    state.inv[tile.crop.type]++; say(`Harvested ${tile.crop.type}!`);
    delete tile.crop; return;
  }
  if (tool === "hoe") {
    if (tile.t !== 0 || state.energy < 2) return state.energy < 2 ? say("Too tired! Press E at the house to sleep.") : 0;
    tile.t = 1; state.energy -= 2;
  } else if (tool === "can") {
    if (tile.t === 2) { state.energy = Math.min(100, state.energy + 0); return say("Can refilled (it's bottomless in this prototype)."); }
    if (tile.t !== 1 || state.energy < 2) return;
    tile.wet = true; state.energy -= 2;
  } else {
    const c = CROPS[tool];
    if (tile.t !== 1 || tile.crop) return;
    if (state.money < c.seed) return say("Not enough money!");
    state.money -= c.seed; tile.crop = { type: tool, age: 0 };
  }
}

function interact() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const t = world[y][x].t;
  if (t === 5) {
    let total = 0;
    for (const k in state.inv) { total += state.inv[k] * CROPS[k].price; state.inv[k] = 0; }
    state.money += total; say(total ? `Sold goods for $${total}` : "Nothing to sell.");
  } else if (t === 4) sleep();
}

function sleep() {
  for (const row of world) for (const tile of row) {
    if (tile.crop && (tile.wet || state.rain)) tile.crop.age++;
    tile.wet = false;
  }
  state.day++; state.minutes = 6 * 60; state.energy = 100;
  state.rain = Math.random() < 0.2;
  if (state.rain) for (const row of world) for (const tile of row) if (tile.t === 1) tile.wet = true;
  save(); say(`Day ${state.day}${state.rain ? " — it's raining (crops auto-watered)" : ""}. Game saved.`);
}

function update(dt) {
  let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  if (dx || dy) {
    if (dx && dy) { state.fx = 0; state.fy = dy; } else { state.fx = dx; state.fy = dy; }
    const sp = 70 * dt;
    for (const [mx, my] of [[dx * sp, 0], [0, dy * sp]]) {
      const nx = state.px + mx, ny = state.py + my;
      const corners = [[nx + 3, ny + 6], [nx + 9, ny + 6], [nx + 3, ny + 13], [nx + 9, ny + 13]];
      if (!corners.some(([cx, cy]) => blocked(Math.floor(cx / T), Math.floor(cy / T)))) { state.px = nx; state.py = ny; }
    }
  }
  state.minutes += dt * (10 / 3);                    // ~6 real minutes per 20h day
  if (state.minutes >= 26 * 60) { say("You passed out..."); sleep(); }
  state.msgT -= dt;
}

const TILE_COLORS = ["#5a9e4b", "#7a5230", "#3a7bd5", "#2d5a2d", "#b5654a", "#c9a227"];
function draw() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const tile = world[y][x];
    ctx.fillStyle = TILE_COLORS[tile.t]; ctx.fillRect(x * T, y * T, T, T);
    if (tile.t === 0 && (x * 7 + y * 13) % 5 === 0) { ctx.fillStyle = "#68ad58"; ctx.fillRect(x * T + 4, y * T + 6, 2, 3); }
    if (tile.t === 3) { ctx.fillStyle = "#1e4a1e"; ctx.beginPath(); ctx.arc(x * T + 8, y * T + 7, 7, 0, 7); ctx.fill(); }
    if (tile.t === 1 && (tile.wet || state.rain)) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x * T, y * T, T, T); }
    if (tile.crop) {
      const c = CROPS[tile.crop.type], p = Math.min(1, tile.crop.age / c.days);
      ctx.fillStyle = "#3fae3f"; ctx.fillRect(x * T + 7, y * T + 12 - 8 * p, 2, 4 + 6 * p);
      if (p >= 1) { ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(x * T + 8, y * T + 8, 5, 0, 7); ctx.fill(); }
    }
  }
  ctx.fillStyle = "#7a2f2f"; ctx.fillRect(3 * T, 1.4 * T, 3 * T, 0.6 * T);            // roof
  ctx.fillStyle = "#f5deb3"; ctx.fillRect(4 * T + 3, 3 * T + 2, 10, 14);               // door
  ctx.fillStyle = "#5c4400"; ctx.fillRect(8 * T + 2, 4 * T + 4, 12, 9);                // bin lid

  const { x, y } = targetTile();                                                       // target marker
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.strokeRect(x * T + .5, y * T + .5, T - 1, T - 1);

  ctx.fillStyle = "#ff7b54"; ctx.fillRect(Math.round(state.px) + 3, Math.round(state.py) + 3, 10, 12);
  ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(state.px) + 8 + state.fx * 2, Math.round(state.py) + 5, 2, 2);

  const hr = state.minutes / 60, dark = hr > 19 ? Math.min(.55, (hr - 19) / 7) : 0;      // night tint
  if (dark || state.rain) { ctx.fillStyle = `rgba(10,10,50,${Math.max(dark, state.rain ? .2 : 0)})`; ctx.fillRect(0, 0, W, H); }

  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 22, W, 22);
  ctx.fillStyle = "#fff"; ctx.font = "9px monospace";
  const h = Math.floor(hr) % 24, m = Math.floor(state.minutes % 60 / 10) * 10;
  ctx.fillText(`Day ${state.day}  ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}${state.rain ? "  rain" : ""}   $${state.money}   Energy ${Math.ceil(state.energy)}   Turnips ${state.inv.turnip}  Pumpkins ${state.inv.pumpkin}`, 4, 10);
  TOOLS.forEach((t, i) => {
    ctx.fillStyle = i === state.sel ? "#ffd23f" : "#555"; ctx.fillRect(4 + i * 60, H - 19, 56, 16);
    ctx.fillStyle = "#000"; ctx.fillText(`${i + 1} ${t}`, 8 + i * 60, H - 8);
  });
  if (state.msgT > 0) { ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(state.msg, W / 2, 30); ctx.textAlign = "left"; }
}

if (!load()) newGame();
let last = performance.now();
(function frame(now) {
  update(Math.min(0.05, (now - last) / 1000)); last = now;
  draw(); requestAnimationFrame(frame);
})(last);
