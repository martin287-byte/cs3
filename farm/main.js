import { SEASONS, buildSprites, hash } from "./sprites.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height, T = 16, COLS = 30, ROWS = 16;

const SEASON_LEN = 10;
const CROPS = {
  turnip:  { days: 4, price: 20, seed: 5,  seasons: [0, 2] },
  carrot:  { days: 5, price: 35, seed: 10, seasons: [0, 1] },
  tomato:  { days: 6, price: 30, seed: 20, seasons: [1], regrow: 2 },           // keeps producing
  pumpkin: { days: 7, price: 90, seed: 25, seasons: [2] },
  cabbage: { days: 5, price: 50, seed: 15, seasons: [0, 3] },
};
const TOOLS = ["hoe", "can", ...Object.keys(CROPS)];
const SAVE_KEY = "tinyfarm-save-v3";
const GOAL = 3000, EGG_PRICE = 15, CHICKEN_COST = 250, MAX_CHICKENS = 4;
const HOE_UPGRADES = [{ cost: 200 }, { cost: 500 }];                             // each level reaches one more tile
const CAN_UPGRADES = [{ cap: 40, cost: 150 }, { cap: 80, cost: 400 }];
const PEN = { x0: 23, y0: 2, x1: 28, y1: 5 };
const NPC_POS = { x: 11, y: 6 };
const NPC_LINES = [
  "Rosa: Welcome to the valley! Water your crops every day.",
  "Rosa: Tomatoes keep fruiting after the first harvest.",
  "Rosa: Each season lasts 10 days. Crops wither out of season!",
  "Rosa: Rain and snow water everything for free.",
  "Rosa: Chickens lay eggs every night. Cheap income!",
  "Rosa: Upgrade your hoe and can to work several tiles at once.",
  "Rosa: Cabbage is the only crop that survives winter.",
];

// tile types: 0 grass, 1 tilled, 2 water(pond), 3 tree/rock, 4 house, 5 bin, 6 shop, 7 pen floor
const S = buildSprites(Object.keys(CROPS));
let world, state, chickens = [], clock = 0, walkT = 0, moving = false, particles = [];

const seasonOf = day => Math.floor((day - 1) / SEASON_LEN) % 4;
const dayOfSeason = day => ((day - 1) % SEASON_LEN) + 1;
const yearOf = day => Math.floor((day - 1) / (SEASON_LEN * 4)) + 1;
const seasonTag = k => CROPS[k].seasons.map(s => SEASONS[s].name.slice(0, 2)).join("/");
const maxWater = () => CAN_UPGRADES[state.canLevel - 1]?.cap ?? 20;

function defaultState() {
  return {
    px: 6 * T, py: 5 * T, fx: 0, fy: 1, sel: 0,
    money: 50, energy: 100, day: 1, minutes: 6 * 60, rain: false,
    inv: { turnip: 0, carrot: 0, tomato: 0, pumpkin: 0, cabbage: 0, egg: 0 },
    seeds: { turnip: 5, carrot: 0, tomato: 0, pumpkin: 0, cabbage: 0 },
    water: 20, canLevel: 0, hoeLevel: 0, chickens: 0, menu: false, panel: false,
    friend: 0, talked: false, won: false, msg: "", msgT: 0,
  };
}

function newGame() {
  world = Array.from({ length: ROWS }, () => Array(COLS).fill(null).map(() => ({ t: 0 })));
  const set = (x, y, t, extra = {}) => { world[y][x] = { t, ...extra }; };
  for (let y = 11; y < 15; y++) for (let x = 20; x < 27; x++) set(x, y, 2);          // pond
  for (let x = 0; x < COLS; x++) { set(x, 0, 3); set(x, ROWS - 1, 3); }              // border trees
  for (let y = 0; y < ROWS; y++) { set(0, y, 3); set(COLS - 1, y, 3); }
  for (let i = 0; i < 25; i++) {                                                     // scattered rocks/trees
    const x = 2 + Math.floor(Math.random() * 26), y = 2 + Math.floor(Math.random() * 12);
    if (world[y][x].t === 0 && !(x >= 2 && x <= 16 && y <= 8) && !(x >= PEN.x0 - 1 && y <= PEN.y1 + 1)) set(x, y, 3, { rock: Math.random() < 0.4 });
  }
  for (let y = 2; y <= 3; y++) for (let x = 3; x <= 5; x++) set(x, y, 4);            // house 3x2
  set(8, 4, 5);                                                                      // shipping bin
  for (let y = 2; y <= 3; y++) for (let x = 12; x <= 14; x++) set(x, y, 6);          // shop 3x2
  for (let y = PEN.y0; y <= PEN.y1; y++) for (let x = PEN.x0; x <= PEN.x1; x++) set(x, y, 7);
  state = defaultState();
  makeChickens();
}

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

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ world, state })); } catch {}
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s?.world && s?.state) {
      world = s.world; state = { ...defaultState(), ...s.state, menu: false, panel: false }; makeChickens(); return true;
    }
  } catch {}
  return false;
}

const keys = new Set();
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  if (!keys.has(k)) {
    if (state.menu) menuKey(k);
    else if (state.panel) { if (["i", "e", "escape"].includes(k)) state.panel = false; }
    else {
      if (/^[1-7]$/.test(k)) state.sel = Number(k) - 1;
      else if (k === " ") useTool();
      else if (k === "e") interact();
      else if (k === "i") state.panel = true;
    }
  }
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

function say(m, t = 2.5) { state.msg = m; state.msgT = t; }
const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const blocked = (tx, ty) => !inBounds(tx, ty) || [2, 3, 4, 5, 6].includes(world[ty][tx].t) || (tx === NPC_POS.x && ty === NPC_POS.y);
const targetTile = () => ({
  x: Math.floor((state.px + 6) / T) + state.fx,
  y: Math.floor((state.py + 10) / T) + state.fy,
});
const lineTiles = n => {
  const { x, y } = targetTile();
  return Array.from({ length: n }, (_, i) => [x + state.fx * i, y + state.fy * i]).filter(([a, b]) => inBounds(a, b));
};
const cropStage = c => (c.age >= CROPS[c.type].days ? 4 : Math.min(3, Math.floor(c.age / CROPS[c.type].days * 4)));

function useTool() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const tile = world[y][x], tool = TOOLS[state.sel];

  if (tile.crop && tile.crop.age >= CROPS[tile.crop.type].days) {          // harvest with any tool
    const c = CROPS[tile.crop.type];
    state.inv[tile.crop.type]++; say(`Harvested ${tile.crop.type}!`); beep(660, 0.12, "triangle");
    if (c.regrow) tile.crop.age = c.days - c.regrow; else delete tile.crop;
    return;
  }
  if (tool === "hoe") {
    const tiles = lineTiles(state.hoeLevel + 1).filter(([a, b]) => world[b][a].t === 0);
    if (!tiles.length) return;
    if (state.energy < 2) return say("Too tired! Press E at the house to sleep.");
    for (const [a, b] of tiles) world[b][a].t = 1;
    state.energy -= 2; beep(180, 0.06, "sawtooth");
  } else if (tool === "can") {
    if (tile.t === 2) { state.water = maxWater(); beep(520, 0.1, "sine"); return say("Watering can refilled."); }
    const tiles = lineTiles(state.canLevel + 1).map(([a, b]) => world[b][a]).filter(t => t.t === 1 && !t.wet);
    if (!tiles.length) return;
    if (state.water <= 0) return say("Can is empty — refill it at the pond.");
    if (state.energy < 1) return say("Too tired! Press E at the house to sleep.");
    for (const t of tiles) if (state.water > 0) { t.wet = true; state.water--; }
    state.energy -= 1; beep(400, 0.07, "sine");
  } else {
    if (tile.t !== 1 || tile.crop) return;
    if (!CROPS[tool].seasons.includes(seasonOf(state.day))) return say(`${tool} doesn't grow in ${SEASONS[seasonOf(state.day)].name}.`);
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
  ...Object.keys(CROPS).map(k => ({ label: `5x ${k} seeds [${seasonTag(k)}]`, cost: CROPS[k].seed * 5, buy: () => { state.seeds[k] += 5; } })),
  state.hoeLevel < HOE_UPGRADES.length
    ? { label: `Hoe upgrade (reach ${state.hoeLevel + 2})`, cost: HOE_UPGRADES[state.hoeLevel].cost, buy: () => { state.hoeLevel++; } }
    : { label: "Hoe maxed", cost: Infinity },
  state.canLevel < CAN_UPGRADES.length
    ? { label: `Can upgrade (${CAN_UPGRADES[state.canLevel].cap} water, reach ${state.canLevel + 2})`, cost: CAN_UPGRADES[state.canLevel].cost, buy: () => { state.canLevel++; state.water = maxWater(); } }
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
  const oldSeason = seasonOf(state.day);
  for (const row of world) for (const tile of row) {
    if (tile.crop && tile.wet) tile.crop.age++;
    tile.wet = false;
  }
  state.day++; state.minutes = 6 * 60; state.energy = 100; state.talked = false;
  state.inv.egg += state.chickens;
  const s = seasonOf(state.day);
  let extra = "";
  if (s !== oldSeason) {
    let withered = 0;
    for (const row of world) for (const tile of row) if (tile.crop && !CROPS[tile.crop.type].seasons.includes(s)) { delete tile.crop; withered++; }
    extra = ` ${SEASONS[s].name} begins!${withered ? ` ${withered} crop(s) withered.` : ""}`;
  }
  state.rain = Math.random() < (s === 3 ? 0.3 : 0.2);
  if (state.rain) for (const row of world) for (const tile of row) if (tile.t === 1) tile.wet = true;
  state.water = maxWater(); save();
  say(`Day ${state.day}${state.rain ? (s === 3 ? " — snowing" : " — raining") : ""}.${state.chickens ? ` ${state.chickens} egg(s) laid.` : ""}${extra} Saved.`, extra ? 5 : 3);
}

function update(dt) {
  clock += dt; state.msgT -= dt;
  for (const p of particles) {                                                      // rain / snow
    p.y += p.v * (state.rain && seasonOf(state.day) === 3 ? 0.4 : 1) * dt; p.x += (state.rain && seasonOf(state.day) === 3 ? Math.sin(clock * 2 + p.v) * 8 : -6) * dt;
    if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
    if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
  }
  for (const c of chickens) {
    c.t -= dt;
    if (c.t <= 0) { c.t = 1 + Math.random() * 2; c.vx = (Math.random() - .5) * 20; c.vy = (Math.random() - .5) * 20; }
    c.x = Math.max(PEN.x0 * T, Math.min((PEN.x1 + 1) * T - 12, c.x + c.vx * dt));
    c.y = Math.max(PEN.y0 * T, Math.min((PEN.y1 + 1) * T - 10, c.y + c.vy * dt));
  }
  if (state.menu || state.panel) { moving = false; return; }
  const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  moving = !!(dx || dy);
  if (moving) {
    walkT += dt;
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

function draw() {
  const season = seasonOf(state.day), frame = Math.floor(clock * 2) % 2;
  const things = [];                                                                // y-sorted sprites
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const tile = world[y][x];
    let base;
    if (tile.t === 1) base = tile.wet ? S.soilWet : S.soil;
    else if (tile.t === 2) base = S.water[frame];
    else if (tile.t === 7) base = S.pen;
    else base = S.grass[season][Math.floor(hash(x, y) * 4)];
    if (!base) throw new Error("base "+x+","+y+" t="+tile.t+" season="+season+" frame="+frame);
    ctx.drawImage(base, x * T, y * T);
    if (tile.crop) ctx.drawImage(S.crop[tile.crop.type][cropStage(tile.crop)], x * T, y * T);
    if (tile.t === 3) things.push({ img: tile.rock ? S.rock : S.tree[season], x: x * T, y: tile.rock ? y * T : y * T - 8, sort: (y + 1) * T });
    if (tile.t === 5) things.push({ img: S.bin, x: x * T, y: y * T, sort: (y + 1) * T });
  }
  things.push({ img: S.house, x: 3 * T, y: 24, sort: 4 * T }, { img: S.shop, x: 12 * T, y: 24, sort: 4 * T });
  things.push({ img: S.rosa[0][0], x: NPC_POS.x * T, y: NPC_POS.y * T - 1, sort: (NPC_POS.y + 1) * T });
  for (const c of chickens) things.push({ img: S.chicken, x: Math.round(c.x), y: Math.round(c.y), sort: c.y + 10, flip: c.vx < 0 });
  const dir = state.fy > 0 ? 0 : state.fy < 0 ? 1 : state.fx > 0 ? 2 : 3;
  const pf = moving ? 1 + (Math.floor(walkT * 8) % 2) : 0;
  things.push({ img: S.player[dir][pf], x: Math.round(state.px) - 2, y: Math.round(state.py) - 1, sort: state.py + 14 });
  things.sort((a, b) => a.sort - b.sort);
  for (const t of things) {
    if (t.flip) { ctx.save(); ctx.translate(t.x + t.img.width, t.y); ctx.scale(-1, 1); ctx.drawImage(t.img, 0, 0); ctx.restore(); }
    else ctx.drawImage(t.img, t.x, t.y);
  }

  const { x, y } = targetTile();                                                    // target marker
  ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.3 * Math.sin(clock * 6)})`; ctx.strokeRect(x * T + .5, y * T + .5, T - 1, T - 1);

  const hr = state.minutes / 60, dark = hr > 19 ? Math.min(.55, (hr - 19) / 7) : 0;      // night tint
  if (dark) { ctx.fillStyle = `rgba(10,10,50,${dark})`; ctx.fillRect(0, 0, W, H); }
  if (state.rain) {
    const snow = season === 3;
    if (!snow) { ctx.fillStyle = "rgba(20,30,70,.18)"; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = snow ? "#fff" : "#9ec9ff";
    for (const p of particles) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, snow ? 1 : 3);
  }
  drawHud(hr, x, y);
}

function drawHud(hr, tx, ty) {
  const s = seasonOf(state.day);
  ctx.fillStyle = "rgba(20,15,35,.8)"; ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 24, W, 24);
  ctx.fillStyle = "#fff"; ctx.font = "9px monospace";
  const h = Math.floor(hr) % 24, m = Math.floor(state.minutes % 60 / 10) * 10;
  ctx.fillText(`${SEASONS[s].name} ${dayOfSeason(state.day)} Y${yearOf(state.day)}  ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}${state.rain ? (s === 3 ? "  snow" : "  rain") : ""}   $${state.money}/${GOAL}   Energy ${Math.ceil(state.energy)}   Water ${state.water}/${maxWater()}`, 4, 10);

  const inv = Object.entries(state.inv).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
  if (inv) { const t = `Bag: ${inv}`; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(2, H - 38, ctx.measureText(t).width + 4, 12); ctx.fillStyle = "#cfe8ff"; ctx.fillText(t, 4, H - 28); }
  const tile = inBounds(tx, ty) ? world[ty][tx] : null;
  const hint = !tile ? "" : tile.crop && tile.crop.age >= CROPS[tile.crop.type].days ? "Space: harvest" : tile.t === 4 ? "E: sleep" : tile.t === 5 ? "E: sell goods"
    : tile.t === 6 ? "E: shop" : tx === NPC_POS.x && ty === NPC_POS.y ? "E: talk" : "";
  if (hint) { const w = ctx.measureText(hint).width + 4; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(W - w - 2, H - 38, w, 12); ctx.fillStyle = "#ffd23f"; ctx.textAlign = "right"; ctx.fillText(hint, W - 4, H - 28); ctx.textAlign = "left"; }

  const sw = 68;
  TOOLS.forEach((t, i) => {
    const x = 2 + i * sw, sel = i === state.sel;
    ctx.fillStyle = sel ? "#ffd23f" : "#3b3550"; ctx.fillRect(x, H - 22, sw - 2, 20);
    ctx.drawImage(S.icon[t], x + 1, H - 20);
    ctx.fillStyle = sel ? "#000" : "#fff";
    ctx.fillText(`${i + 1} ${i === 0 ? "L" + (state.hoeLevel + 1) : i === 1 ? "L" + (state.canLevel + 1) : "x" + state.seeds[t]}`, x + 19, H - 9);
  });

  if (state.menu) {
    ctx.fillStyle = "rgba(0,0,0,.88)"; ctx.fillRect(70, 26, 340, 190);
    ctx.fillStyle = "#ffd23f"; ctx.fillText(`SHOP  $${state.money}  (number to buy, E to close)`, 78, 40);
    SHOP().forEach((it, i) => {
      ctx.fillStyle = it.cost === Infinity ? "#777" : state.money >= it.cost ? "#fff" : "#f87171";
      ctx.fillText(`${i + 1}. ${it.label}${it.cost === Infinity ? "" : "  $" + it.cost}`, 78, 60 + i * 14);
    });
    ctx.fillStyle = "#9aa"; ctx.fillText(`Now: ${SEASONS[s].name}. Out-of-season crops wither when the season changes.`, 78, 60 + 8 * 14 + 10);
  }
  if (state.panel) drawPanel();
  if (state.msgT > 0) {
    const w = ctx.measureText(state.msg).width + 10;
    ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(W / 2 - w / 2, 18, w, 14);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(state.msg, W / 2, 28); ctx.textAlign = "left";
  }
}

function drawPanel() {
  ctx.fillStyle = "rgba(0,0,0,.9)"; ctx.fillRect(50, 20, 380, 210);
  ctx.fillStyle = "#ffd23f"; ctx.fillText("INVENTORY  (I / E / Esc to close)", 58, 34);
  let y = 50;
  const line = (t, c = "#fff") => { ctx.fillStyle = c; ctx.fillText(t, 58, y); y += 12; };
  line(`Hoe Lv${state.hoeLevel + 1} (tills ${state.hoeLevel + 1} tile${state.hoeLevel ? "s" : ""} in a line)    Can Lv${state.canLevel + 1} (${maxWater()} water, ${state.canLevel + 1} tile${state.canLevel ? "s" : ""})`, "#cfe8ff");
  y += 4; line("Seeds                         Seasons        Sell");
  for (const k of Object.keys(CROPS)) {
    ctx.drawImage(S.icon[k], 58, y - 10, 12, 12);
    ctx.fillStyle = state.seeds[k] ? "#fff" : "#777";
    ctx.fillText(`${k} x${state.seeds[k]}`, 74, y); ctx.fillText(seasonTag(k), 206, y); ctx.fillText(`$${CROPS[k].price}`, 300, y); y += 14;
  }
  y += 4; line("Harvest bag", "#ffd23f");
  const items = Object.entries(state.inv).filter(([, n]) => n);
  if (!items.length) line("(empty — harvest crops and sell at the bin)", "#777");
  let total = 0;
  for (const [k, n] of items) { const v = n * (k === "egg" ? EGG_PRICE : CROPS[k].price); total += v; line(`${n} ${k}  = $${v}`); }
  if (items.length) line(`Total worth $${total}`, "#8f8");
  y += 4; line(`Chickens ${state.chickens}/${MAX_CHICKENS}   Rosa friendship ${state.friend}   Goal $${state.money}/${GOAL}`, "#cfe8ff");
}

if (!load()) newGame();
if (location.search.includes("debug")) window.__farm = { S, get state() { return state; }, get world() { return world; }, sleep, useTool };
particles = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 60 + Math.random() * 60 }));
let last = performance.now();
(function frame(now) {
  update(Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now;
  draw(); requestAnimationFrame(frame);
})(last);
