const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height, T = 16, COLS = 30, ROWS = 16;

const CROPS = {
  turnip:  { days: 4, price: 20, seed: 5,  color: "#e8e0f0" },
  carrot:  { days: 5, price: 35, seed: 10, color: "#f97316" },
  tomato:  { days: 7, price: 30, seed: 20, color: "#ef4444", regrow: 2 },   // keeps producing
  pumpkin: { days: 8, price: 90, seed: 25, color: "#f59e0b" },
};
const TOOLS = ["hoe", "can", "turnip", "carrot", "tomato", "pumpkin"];
const SAVE_KEY = "tinyfarm-save-v2";
const GOAL = 3000, EGG_PRICE = 15, CHICKEN_COST = 250, MAX_CHICKENS = 4;
const CAN_UPGRADES = [{ cap: 40, cost: 150 }, { cap: 80, cost: 400 }];
const PEN = { x0: 23, y0: 2, x1: 28, y1: 5 };
const NPC_POS = { x: 11, y: 6 };
const NPC_LINES = [
  "Rosa: Welcome to the valley! Water your crops every day.",
  "Rosa: Tomatoes keep fruiting after the first harvest.",
  "Rosa: Pumpkins take ages, but they pay off nicely.",
  "Rosa: Rain waters everything for free. Lucky days!",
  "Rosa: Chickens lay eggs every night. Cheap income!",
  "Rosa: The pond refills your watering can.",
];

// tile types: 0 grass, 1 tilled, 2 water(pond), 3 tree/rock, 4 house, 5 bin, 6 shop, 7 pen floor
let world, state;

function newGame() {
  world = Array.from({ length: ROWS }, () => Array(COLS).fill(null).map(() => ({ t: 0 })));
  const set = (x, y, t) => { world[y][x] = { t }; };
  for (let y = 11; y < 15; y++) for (let x = 20; x < 27; x++) set(x, y, 2);          // pond
  for (let x = 0; x < COLS; x++) { set(x, 0, 3); set(x, ROWS - 1, 3); }              // border trees
  for (let y = 0; y < ROWS; y++) { set(0, y, 3); set(COLS - 1, y, 3); }
  for (let i = 0; i < 25; i++) {                                                     // scattered rocks/trees
    const x = 2 + Math.floor(Math.random() * 26), y = 2 + Math.floor(Math.random() * 12);
    if (world[y][x].t === 0 && !(x >= 2 && x <= 16 && y <= 8) && !(x >= PEN.x0 - 1 && y <= PEN.y1 + 1)) set(x, y, 3);  // keep home, shop, Rosa, pen clear
  }
  for (let y = 2; y <= 3; y++) for (let x = 3; x <= 5; x++) set(x, y, 4);            // house 3x2
  set(8, 4, 5);                                                                      // shipping bin
  for (let y = 2; y <= 3; y++) for (let x = 12; x <= 14; x++) set(x, y, 6);          // shop 3x2
  for (let y = PEN.y0; y <= PEN.y1; y++) for (let x = PEN.x0; x <= PEN.x1; x++) set(x, y, 7);
  state = {
    px: 6 * T, py: 5 * T, fx: 0, fy: 1, sel: 0,
    money: 50, energy: 100, day: 1, minutes: 6 * 60, rain: false,
    inv: { turnip: 0, carrot: 0, tomato: 0, pumpkin: 0, egg: 0 },
    seeds: { turnip: 5, carrot: 0, tomato: 0, pumpkin: 0 },
    water: 20, canLevel: 0, chickens: 0, menu: false,
    friend: 0, talked: false, won: false, msg: "", msgT: 0,
  };
  makeChickens();
}

let chickens = [];
function makeChickens() {
  chickens = Array.from({ length: state.chickens }, () => ({
    x: (PEN.x0 + Math.random() * (PEN.x1 - PEN.x0)) * T, y: (PEN.y0 + Math.random() * (PEN.y1 - PEN.y0)) * T, vx: 0, vy: 0, t: 0,
  }));
}
let audio;
function beep(f = 440, d = 0.08, type = "square", vol = 0.04) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol;
    o.connect(g); g.connect(audio.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d);
    o.start(); o.stop(audio.currentTime + d);
  } catch {}
}
const maxWater = () => CAN_UPGRADES[state.canLevel - 1]?.cap ?? 20;

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ world, state })); } catch {}
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s?.world && s?.state) { world = s.world; state = s.state; state.menu = false; makeChickens(); return true; }
  } catch {}
  return false;
}

const keys = new Set();
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  if (!keys.has(k)) {
    if (state.menu) menuKey(k);
    else {
      if (k >= "1" && k <= "6") state.sel = Number(k) - 1;
      if (k === " ") useTool();
      if (k === "e") interact();
    }
  }
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

function say(m, t = 2.5) { state.msg = m; state.msgT = t; }
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
    const c = CROPS[tile.crop.type];
    state.inv[tile.crop.type]++; say(`Harvested ${tile.crop.type}!`); beep(660, 0.12, "triangle");
    if (c.regrow) tile.crop.age = c.days - c.regrow; else delete tile.crop;
    return;
  }
  if (tool === "hoe") {
    if (tile.t !== 0) return;
    if (state.energy < 2) return say("Too tired! Press E at the house to sleep.");
    tile.t = 1; state.energy -= 2; beep(180, 0.06, "sawtooth");
  } else if (tool === "can") {
    if (tile.t === 2) { state.water = maxWater(); beep(520, 0.1, "sine"); return say("Watering can refilled."); }
    if (tile.t !== 1 || tile.wet) return;
    if (state.water <= 0) return say("Can is empty — refill it at the pond.");
    if (state.energy < 1) return say("Too tired! Press E at the house to sleep.");
    tile.wet = true; state.water--; state.energy -= 1; beep(400, 0.07, "sine");
  } else {
    if (tile.t !== 1 || tile.crop) return;
    if (!state.seeds[tool]) return say(`No ${tool} seeds — buy some at the shop.`);
    state.seeds[tool]--; tile.crop = { type: tool, age: 0 }; beep(300, 0.06);
  }
}

function interact() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const t = world[y][x].t;
  if (t === 5) {
    let total = 0;
    for (const k in state.inv) { total += state.inv[k] * (k === "egg" ? EGG_PRICE : CROPS[k].price); state.inv[k] = 0; }
    state.money += total; say(total ? `Sold goods for $${total}` : "Nothing to sell.");
    if (total) beep(880, 0.15, "triangle");
    checkWin();
  } else if (t === 4) sleep();
  else if (t === 6) { state.menu = true; beep(500, 0.05); }
  else if (x === NPC_POS.x && y === NPC_POS.y) talk();
}

function talk() {
  say(NPC_LINES[(state.day + state.friend) % NPC_LINES.length], 4);
  if (!state.talked) {
    state.talked = true; state.friend++;
    if (state.friend === 5) { state.money += 100; setTimeout(() => say("Rosa gives you $100 as a friendship gift!", 4), 4200); beep(990, 0.2, "triangle"); }
  }
}

function checkWin() {
  if (!state.won && state.money >= GOAL) { state.won = true; say(`You saved $${GOAL} and bought the new barn! You win (keep playing!)`, 6); beep(1200, 0.4, "triangle"); }
}

const SHOP = () => [
  ...Object.keys(CROPS).map(k => ({ label: `5x ${k} seeds`, cost: CROPS[k].seed * 5, buy: () => { state.seeds[k] += 5; } })),
  state.canLevel < CAN_UPGRADES.length
    ? { label: `Can upgrade (${CAN_UPGRADES[state.canLevel].cap} water)`, cost: CAN_UPGRADES[state.canLevel].cost, buy: () => { state.canLevel++; state.water = maxWater(); } }
    : { label: "Can maxed", cost: Infinity },
  state.chickens < MAX_CHICKENS
    ? { label: `Chicken (${state.chickens}/${MAX_CHICKENS})`, cost: CHICKEN_COST, buy: () => { state.chickens++; makeChickens(); } }
    : { label: "Coop full", cost: Infinity },
];
function menuKey(k) {
  if (k === "escape" || k === "e") { state.menu = false; return; }
  const item = SHOP()[Number(k) - 1];
  if (!item || item.cost === Infinity) return;
  if (state.money < item.cost) return beep(120, 0.15, "sawtooth");
  state.money -= item.cost; item.buy(); beep(700, 0.1, "triangle");
}

function sleep() {
  for (const row of world) for (const tile of row) {
    if (tile.crop && (tile.wet || state.rain)) tile.crop.age++;
    tile.wet = false;
  }
  state.day++; state.minutes = 6 * 60; state.energy = 100; state.talked = false;
  state.inv.egg += state.chickens;
  state.rain = Math.random() < 0.2;
  if (state.rain) for (const row of world) for (const tile of row) if (tile.t === 1) tile.wet = true;
  state.water = maxWater(); save();
  say(`Day ${state.day}${state.rain ? " — raining" : ""}.${state.chickens ? ` ${state.chickens} egg(s) laid.` : ""} Saved.`);
}

function update(dt) {
  state.msgT -= dt;
  for (const c of chickens) {
    c.t -= dt;
    if (c.t <= 0) { c.t = 1 + Math.random() * 2; c.vx = (Math.random() - .5) * 20; c.vy = (Math.random() - .5) * 20; }
    c.x = Math.max(PEN.x0 * T, Math.min((PEN.x1 + 1) * T - 8, c.x + c.vx * dt));
    c.y = Math.max(PEN.y0 * T, Math.min((PEN.y1 + 1) * T - 8, c.y + c.vy * dt));
  }
  if (state.menu) return;
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
}

const TILE_COLORS = ["#5a9e4b", "#7a5230", "#3a7bd5", "#2d5a2d", "#b5654a", "#c9a227", "#4a6fa5", "#a89060"];
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
  ctx.fillStyle = "#24406b"; ctx.fillRect(12 * T, 1.4 * T, 3 * T, 0.6 * T);            // shop roof
  ctx.fillStyle = "#ffd23f"; ctx.fillRect(13 * T + 3, 3 * T + 2, 10, 14);              // shop door
  ctx.fillStyle = "#c084fc"; ctx.fillRect(NPC_POS.x * T + 3, NPC_POS.y * T + 2, 10, 13); // Rosa
  ctx.fillStyle = "#fff"; ctx.fillRect(NPC_POS.x * T + 6, NPC_POS.y * T + 5, 2, 2);
  for (const c of chickens) { ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(c.x), Math.round(c.y), 8, 6); ctx.fillStyle = "#f00"; ctx.fillRect(Math.round(c.x) + 6, Math.round(c.y) - 1, 2, 2); }
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
  ctx.fillText(`Day ${state.day}  ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}${state.rain ? "  rain" : ""}   $${state.money}/${GOAL}   Energy ${Math.ceil(state.energy)}   Water ${state.water}/${maxWater()}`, 4, 10);
  const inv = Object.entries(state.inv).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
  if (inv) { ctx.fillStyle = "#cfe8ff"; ctx.fillText(`Bag: ${inv}`, 4, H - 26); ctx.fillStyle = "#fff"; }
  TOOLS.forEach((t, i) => {
    ctx.fillStyle = i === state.sel ? "#ffd23f" : "#555"; ctx.fillRect(4 + i * 78, H - 19, 74, 16);
    ctx.fillStyle = "#000"; ctx.fillText(`${i + 1} ${t}${i > 1 ? " x" + state.seeds[t] : ""}`, 8 + i * 78, H - 8);
  });
  if (state.menu) {
    ctx.fillStyle = "rgba(0,0,0,.85)"; ctx.fillRect(100, 40, 280, 160);
    ctx.fillStyle = "#ffd23f"; ctx.fillText(`SHOP   $${state.money}   (number to buy, E to close)`, 108, 54);
    SHOP().forEach((it, i) => {
      ctx.fillStyle = it.cost === Infinity ? "#777" : state.money >= it.cost ? "#fff" : "#f87171";
      ctx.fillText(`${i + 1}. ${it.label}${it.cost === Infinity ? "" : "  $" + it.cost}`, 108, 74 + i * 14);
    });
  }
  if (state.msgT > 0) { ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(state.msg, W / 2, 30); ctx.textAlign = "left"; }
}

if (!load()) newGame();
let last = performance.now();
(function frame(now) {
  update(Math.min(0.05, (now - last) / 1000)); last = now;
  draw(); requestAnimationFrame(frame);
})(last);
