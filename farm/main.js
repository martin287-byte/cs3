import {
  T, SEASON_LEN, GOAL, CHICKEN_COST, MAX_CHICKENS, HOE_UPGRADES, CAN_UPGRADES, PICK_UPGRADES, PEN, HEART_REWARDS,
  CROPS, FORAGE, FISH, ORES, DISHES, START_RECIPES, VILLAGERS, MERCHANT, FESTIVALS, FESTIVAL_DAY, itemInfo, edibleEnergy,
} from "./data.js";
import { SEASONS, buildSprites, hash } from "./sprites.js";
import { generateWorld, makeMine } from "./world.js";
import * as audio from "./audio.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const SAVE_KEY = "tinyvalley-save-v5";
const TOOLS = ["hoe", "can", "rod", "pick", "seeds"];
const CROP_IDS = Object.keys(CROPS);
const BLOCKING = [2, 3, 4, 5, 6, 10, 11, 13];
const FORAGE_COUNT = { farm: 5, town: 4, forest: 22 };

const S = buildSprites({
  crops: CROP_IDS, forage: Object.keys(FORAGE),
  fish: Object.fromEntries(Object.entries(FISH).map(([k, v]) => [k, v.color])),
  ores: Object.fromEntries(Object.entries(ORES).map(([k, v]) => [k, v.color])),
  dishes: Object.fromEntries(Object.entries(DISHES).map(([k, v]) => [k, v.color])),
  npcs: { ...Object.fromEntries(Object.entries(VILLAGERS).map(([k, v]) => [k, v.pal])), zed: MERCHANT.pal },
});

let scene = "title", titleSel = 0, maps, state, chickens = [], npcs = {}, clock = 0, walkT = 0, moving = false, particles = [], fishing = null;

const seasonOf = day => Math.floor((day - 1) / SEASON_LEN) % 4;
const dayOfSeason = day => ((day - 1) % SEASON_LEN) + 1;
const yearOf = day => Math.floor((day - 1) / (SEASON_LEN * 4)) + 1;
const seasonTag = k => CROPS[k].seasons.map(s => SEASONS[s].name.slice(0, 2)).join("/");
const maxWater = () => CAN_UPGRADES[state.canLevel - 1]?.cap ?? 20;
const hearts = id => Math.min(10, Math.floor(state.friend[id].pts / 100));
const hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } };
const cur = () => maps[state.map];
const tileAt = (x, y) => cur().tiles[y]?.[x];
const inBounds = (x, y) => x >= 0 && y >= 0 && x < cur().w && y < cur().h;
const hourNow = () => state.minutes / 60;
const mood = () => ["spring", "summer", "fall", "winter"][seasonOf(state.day)];
const festivalToday = () => (dayOfSeason(state.day) === FESTIVAL_DAY ? FESTIVALS.find(f => f.season === seasonOf(state.day)) : null);
const merchantHere = () => state.day % MERCHANT.every === 0;
const curSeed = () => CROP_IDS[state.seedSel];

function defaultState() {
  return {
    map: "farm", px: 7 * T, py: 7 * T, fx: 0, fy: 1, sel: 0, seedSel: 0,
    money: 50, energy: 100, day: 1, minutes: 6 * 60, rain: false,
    inv: {}, seeds: Object.fromEntries(CROP_IDS.map(k => [k, k === "turnip" ? 5 : 0])),
    water: 20, canLevel: 0, hoeLevel: 0, pickLevel: 0, chickens: 0, recipes: [...START_RECIPES],
    mineBest: 1, mineFloor: 1, fest: null,
    friend: Object.fromEntries(Object.keys(VILLAGERS).map(id => [id, { pts: 0, talked: false, gifted: false, rewards: 0 }])),
    won: false, ui: null, msg: "", msgT: 0, fade: 0, caught: 0,
  };
}

function newGame() {
  maps = generateWorld();
  state = defaultState();
  spawnForage(); makeChickens();
}

function makeChickens() {
  chickens = Array.from({ length: state.chickens }, () => ({
    x: (PEN.x0 + Math.random() * (PEN.x1 - PEN.x0)) * T, y: (PEN.y0 + Math.random() * (PEN.y1 - PEN.y0)) * T, vx: 0, vy: 0, t: 0,
  }));
}

function spawnForage() {
  const season = seasonOf(state.day), ids = Object.keys(FORAGE).filter(k => FORAGE[k].seasons.includes(season));
  for (const [name, m] of Object.entries(maps)) {
    for (const row of m.tiles) for (const t of row) delete t.forage;
    for (let i = 0, placed = 0; i < 400 && placed < (FORAGE_COUNT[name] || 0); i++) {
      const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), t = m.tiles[y][x];
      if (t.t === 0 && !t.crop && !t.forage) { t.forage = ids[Math.floor(Math.random() * ids.length)]; placed++; }
    }
  }
}

const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ maps, state })); } catch {} };
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s?.maps || !s?.state) return false;
    const d = defaultState();
    maps = s.maps;
    state = { ...d, ...s.state, seeds: { ...d.seeds, ...s.state.seeds }, friend: { ...d.friend, ...s.state.friend }, ui: null };
    makeChickens(); return true;
  } catch { return false; }
}

function startGame(cont) {
  if (!(cont && load())) newGame();
  scene = "game"; fishing = null; audio.startMusic(state.map === "mine" ? "mine" : mood());
}

// ---------------------------------------------------------------- input
const keys = new Set();
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(k)) e.preventDefault();
  if (!keys.has(k)) {
    if (k === "m") audio.toggleMute();
    else if (scene === "title") titleKey(k);
    else if (state.ui) uiKey(k);
    else if (fishing && (k === " " || k === "escape")) fishKey(k);
    else if (/^[1-5]$/.test(k)) { const n = Number(k) - 1; if (n === 4 && state.sel === 4) cycleSeed(); state.sel = n; }
    else if (k === "q") { state.sel = 4; cycleSeed(); }
    else if (k === " ") useTool();
    else if (k === "e") interact();
    else if (k === "i") state.ui = { type: "inv", tab: 0 };
    else if (k === "escape") state.ui = { type: "pause" };
  }
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

function cycleSeed() { state.seedSel = (state.seedSel + 1) % CROP_IDS.length; }

const titleOptions = () => [...(hasSave() ? ["Continue"] : []), "New Game", audio.isMuted() ? "Music: Off" : "Music: On"];
function titleKey(k) {
  const opts = titleOptions();
  if (k === "arrowup" || k === "w") titleSel = (titleSel + opts.length - 1) % opts.length;
  else if (k === "arrowdown" || k === "s") titleSel = (titleSel + 1) % opts.length;
  else if (k === "enter" || k === " ") {
    audio.beep(600, 0.1, "triangle");
    const o = opts[titleSel];
    if (o === "Continue") return startGame(true);
    if (o === "New Game") return startGame(false);
    audio.toggleMute();
  }
  audio.startMusic("title");
}

const say = (m, t = 2.5) => { state.msg = m; state.msgT = t; };
const later = (m, delay, t = 4) => setTimeout(() => { if (state) say(m, t); }, delay);
const addItem = (id, n = 1) => { state.inv[id] = (state.inv[id] || 0) + n; };
const invItems = () => Object.entries(state.inv).filter(([, n]) => n > 0).sort((a, b) => itemInfo(a[0]).name.localeCompare(itemInfo(b[0]).name));
const matsText = mats => Object.entries(mats || {}).map(([id, n]) => `${n} ${itemInfo(id).name}`).join(", ");
const hasMats = mats => Object.entries(mats || {}).every(([id, n]) => (state.inv[id] || 0) >= n);

// ---------------------------------------------------------------- geometry & npcs
const targetTile = () => ({ x: Math.floor((state.px + 6) / T) + state.fx, y: Math.floor((state.py + 10) / T) + state.fy });
const lineTiles = n => {
  const { x, y } = targetTile();
  return Array.from({ length: n }, (_, i) => [x + state.fx * i, y + state.fy * i]).filter(([a, b]) => inBounds(a, b));
};
const blocked = (tx, ty) => !inBounds(tx, ty) || BLOCKING.includes(tileAt(tx, ty).t);
const cropStage = c => (c.age >= CROPS[c.type].days ? 4 : Math.min(3, Math.floor(c.age / CROPS[c.type].days * 4)));
const npcOverlap = (nx, ny) => Object.values(npcs).some(n => n.map === state.map && Math.abs(n.x - nx) < 9 && Math.abs(n.y - ny) < 9);
const npcNear = (tx, ty) => Object.entries(npcs).find(([, n]) => n.map === state.map && Math.abs(n.x + 8 - (tx * T + 8)) < 10 && Math.abs(n.y + 8 - (ty * T + 8)) < 10)?.[0];

function scheduleFor(id) {
  const h = hourNow();
  if (id === "zed") return merchantHere() && h >= 8 && h < 22 ? { map: "town", x: MERCHANT.x, y: MERCHANT.y } : { map: null };
  const v = VILLAGERS[id], sched = v.sched;
  if (h < sched[0].h) return { map: null };
  if (state.fest && h >= 10 && h < 18) return { map: "town", ...v.gather };                // everyone attends festivals
  let entry = sched[0];
  for (const e of sched) if (e.h <= h) entry = e;
  return entry;
}
function updateNpcs(dt) {
  for (const id of [...Object.keys(VILLAGERS), "zed"]) {
    const tgt = scheduleFor(id), n = (npcs[id] ??= { map: null, x: 0, y: 0, dir: 0, moving: false });
    n.moving = false;
    if (!tgt.map) { n.map = null; continue; }
    const tx = tgt.x * T, ty = tgt.y * T;
    if (n.map !== tgt.map) { n.map = tgt.map; n.x = tx; n.y = ty; continue; }
    const dx = tx - n.x, dy = ty - n.y, sp = 30 * dt;
    if (Math.abs(dx) > 1) { n.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); n.dir = dx > 0 ? 2 : 3; n.moving = true; }
    else if (Math.abs(dy) > 1) { n.y += Math.sign(dy) * Math.min(sp, Math.abs(dy)); n.dir = dy > 0 ? 0 : 1; n.moving = true; }
  }
}

// ---------------------------------------------------------------- tools
function useTool() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const tile = tileAt(x, y), tool = TOOLS[state.sel];

  if (tile.crop && tile.crop.age >= CROPS[tile.crop.type].days) {          // harvest with any tool
    const c = CROPS[tile.crop.type];
    addItem(tile.crop.type); say(`Harvested ${tile.crop.type}!`); audio.beep(660, 0.12, "triangle");
    if (c.regrow) tile.crop.age = c.days - c.regrow; else delete tile.crop;
    return;
  }
  if (tool === "rod") return castRod(tile, x, y);
  if (tool === "pick") return mine(tile);
  if (tool === "hoe") {
    if (state.map !== "farm") return say("The soil here isn't yours to till.");
    const tiles = lineTiles(state.hoeLevel + 1).filter(([a, b]) => tileAt(a, b).t === 0);
    if (!tiles.length) return;
    if (state.energy < 2) return say("Too tired! Sleep at your farmhouse (E at the door).");
    for (const [a, b] of tiles) { tileAt(a, b).t = 1; delete tileAt(a, b).forage; }
    state.energy -= 2; audio.beep(180, 0.06, "sawtooth");
  } else if (tool === "can") {
    if (tile.t === 2) { state.water = maxWater(); audio.beep(520, 0.1, "sine"); return say("Watering can refilled."); }
    const tiles = lineTiles(state.canLevel + 1).map(([a, b]) => tileAt(a, b)).filter(t => t.t === 1 && !t.wet);
    if (!tiles.length) return;
    if (state.water <= 0) return say("Can is empty — refill it at water.");
    if (state.energy < 1) return say("Too tired! Sleep at your farmhouse.");
    for (const t of tiles) if (state.water > 0) { t.wet = true; state.water--; }
    state.energy -= 1; audio.beep(400, 0.07, "sine");
  } else {
    const crop = curSeed();
    if (tile.t !== 1 || tile.crop) return;
    if (!CROPS[crop].seasons.includes(seasonOf(state.day))) return say(`${crop} doesn't grow in ${SEASONS[seasonOf(state.day)].name}. (${seasonTag(crop)})`);
    if (!state.seeds[crop]) return say(`No ${crop} seeds — Q switches seeds; buy more at the shop.`);
    state.seeds[crop]--; tile.crop = { type: crop, age: 0 }; audio.beep(300, 0.06);
  }
}

// ---------------------------------------------------------------- mining
function mine(tile) {
  if (tile.t === 13) {
    const id = tile.ore, ore = ORES[id];
    if (ore.hard > state.pickLevel) return say(`Too hard! Your pickaxe needs an upgrade (${ore.name}).`);
    if (state.energy < 3) return say("Too tired to mine!");
    state.energy -= 3; tile.t = 12; delete tile.ore;
    addItem(id, 1 + (Math.random() < 0.25 ? 1 : 0)); say(`Mined ${ore.name}!`); audio.beep(240, 0.08, "square");
  } else if (tile.t === 3 && tile.rock) {                                   // clear surface rocks
    if (state.energy < 2) return say("Too tired to mine!");
    state.energy -= 2; tile.t = 0; delete tile.rock; addItem("stone"); say("Broke a rock."); audio.beep(220, 0.08, "square");
  }
}
function enterMine(floor) {
  state.mineFloor = floor; maps.mine = makeMine(floor); state.map = "mine";
  const s = maps.mine.start; state.px = s.x * T + 2; state.py = s.y * T; state.fade = 0.4; fishing = null;
  say(`${maps.mine.name} — find the ladder!`, 2.5); audio.startMusic("mine");
}
function leaveMine() {
  state.map = "forest"; state.px = 39 * T + 2; state.py = 6 * T; state.fx = 0; state.fy = 1; state.fade = 0.4;
  say("Forest", 1.5); audio.startMusic(mood());
}

// ---------------------------------------------------------------- fishing
function castRod(tile, x, y) {
  if (fishing) return fishKey(" ");
  if (tile.t !== 2) return say("Face the water to fish.");
  if (!tile.water) return say("Nothing lives here.");
  if (state.energy < 2) return say("Too tired to fish!");
  state.energy -= 2;
  fishing = { phase: "wait", t: 1.5 + Math.random() * 3, x, y, water: tile.water };
  audio.beep(300, 0.12, "sine"); say("Cast! Wait for the bite...");
}
function pickFish(water) {
  const season = seasonOf(state.day);
  const list = Object.entries(FISH).filter(([, f]) => f.where.includes(water) && f.seasons.includes(season));
  const weights = list.map(([, f]) => 100 / f.price);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) if ((r -= weights[i]) <= 0) return list[i][0];
  return list[0][0];
}
function fishKey(k) {
  if (!fishing) return;
  if (k === "escape" || fishing.phase === "wait") { fishing = null; return say("Reeled in."); }
  if (fishing.phase === "bite") {
    const id = pickFish(fishing.water), f = FISH[id];
    fishing = { ...fishing, phase: "reel", fish: id, cursor: 0, dir: 1, speed: 1.1 + f.diff * 0.55, zone: 0.15 + Math.random() * 0.5, width: 0.34 - f.diff * 0.06 };
    audio.beep(700, 0.08, "square");
  } else if (fishing.phase === "reel") {
    const { cursor, zone, width, fish } = fishing;
    if (cursor >= zone && cursor <= zone + width) {
      addItem(fish); state.caught++; say(`Caught a ${FISH[fish].name}! ($${FISH[fish].price})`, 3);
      audio.beep(880, 0.15, "triangle"); audio.beep(1100, 0.2, "triangle");
      festProgress("derby");
    } else { say("It got away..."); audio.beep(150, 0.2, "sawtooth"); }
    fishing = null;
  }
}
function updateFishing(dt) {
  if (!fishing) return;
  if (fishing.phase === "wait" && (fishing.t -= dt) <= 0) { fishing.phase = "bite"; fishing.t = 0.9; audio.beep(900, 0.1, "square"); }
  else if (fishing.phase === "bite" && (fishing.t -= dt) <= 0) { fishing = null; say("Too slow — it got away."); }
  else if (fishing.phase === "reel") {
    fishing.cursor += fishing.dir * fishing.speed * dt;
    if (fishing.cursor >= 1) { fishing.cursor = 1; fishing.dir = -1; } else if (fishing.cursor <= 0) { fishing.cursor = 0; fishing.dir = 1; }
  }
}

// ---------------------------------------------------------------- festivals
function startFestival() {
  const f = festivalToday();
  state.fest = f ? { id: f.id, progress: 0, done: false } : null;
  for (const row of maps.town.tiles) for (const t of row) delete t.fegg;
  if (f?.id === "egghunt") {
    for (let i = 0, placed = 0; i < 600 && placed < 25; i++) {
      const m = maps.town, x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), t = m.tiles[y][x];
      if (t.t === 0 && !t.forage && !t.fegg) { t.fegg = true; placed++; }
    }
  }
}
function festPrize() {
  const f = FESTIVALS.find(x => x.id === state.fest.id);
  state.fest.done = true; state.money += f.prize;
  say(`${f.name} complete! You win $${f.prize}!`, 5); audio.beep(1000, 0.2, "triangle"); audio.beep(1300, 0.3, "triangle");
  checkWin();
}
function festProgress(id) {
  if (!state.fest || state.fest.id !== id || state.fest.done) return;
  const f = FESTIVALS.find(x => x.id === id);
  if (++state.fest.progress >= f.goal) festPrize(); else say(`${f.name}: ${state.fest.progress}/${f.goal}`, 2);
}
function festEntry() {                                                       // Rosa takes harvest-fair / feast entries
  const fe = state.fest, f = fe && FESTIVALS.find(x => x.id === fe.id);
  if (!f || fe.done) return null;
  if (f.id === "fair") {
    const have = CROP_IDS.filter(k => (state.inv[k] || 0) > 0);
    if (have.length < 3) return "Rosa: Bring me three different crops for the fair!";
    for (const k of have.slice(0, 3)) state.inv[k]--;
    festPrize(); return "Rosa: Wonderful display! First prize!";
  }
  if (f.id === "feast") {
    const dish = Object.keys(DISHES).find(k => (state.inv[k] || 0) > 0);
    if (!dish) return "Rosa: Bring me a cooked dish for the feast!";
    state.inv[dish]--; festPrize(); return `Rosa: Mmm, ${DISHES[dish].name}! Delicious!`;
  }
  return null;
}

// ---------------------------------------------------------------- cooking
function resolveNeed(need) {
  const left = { ...state.inv }, take = [];
  for (const [spec, n] of need) {
    let want = n;
    const pool = spec[0] === "@"
      ? Object.keys(left).filter(id => (spec === "@fish" ? FISH[id] : FORAGE[id]) && left[id] > 0).sort((a, b) => itemInfo(a).price - itemInfo(b).price)
      : [spec];
    for (const id of pool) { const q = Math.min(want, left[id] || 0); if (q > 0) { left[id] -= q; want -= q; take.push([id, q]); } }
    if (want > 0) return null;
  }
  return take;
}
const needText = need => need.map(([s, n]) => `${n} ${s === "@fish" ? "any fish" : s === "@forage" ? "forage" : itemInfo(s).name}`).join(" + ");
function cook(id) {
  const take = resolveNeed(DISHES[id].need);
  if (!take) return say("Missing ingredients.");
  for (const [i, q] of take) state.inv[i] -= q;
  addItem(id); say(`Cooked ${DISHES[id].name}!`); audio.beep(520, 0.1, "triangle"); audio.beep(660, 0.15, "triangle");
}
function eat(id) {
  const e = edibleEnergy(id);
  if (!e || !state.inv[id]) return;
  if (state.energy >= 100) return say("You're not hungry.");
  state.inv[id]--; state.energy = Math.min(100, state.energy + e); say(`Ate ${itemInfo(id).name}: +${e} energy`); audio.beep(440, 0.1, "sine");
}

// ---------------------------------------------------------------- interaction & menus
function interact() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const id = npcNear(x, y), tile = tileAt(x, y);
  if (id === "zed") { state.ui = { type: "merchant", mode: "buy" }; audio.beep(520, 0.05); }
  else if (id) { state.ui = { type: "talk", id, mode: "menu", text: "", n: 0 }; audio.beep(520, 0.05); }
  else if (tile.kind === "bin") state.ui = { type: "bin" };
  else if (tile.kind === "home") state.ui = { type: "home" };
  else if (tile.kind === "mine") enterMine(state.mineBest);
  else if (tile.kind === "mexit") leaveMine();
  else if (tile.kind === "ladder") {
    const f = state.mineFloor + 1;
    enterMine(f);
    if (f % 5 === 0) { state.mineBest = f; later(`Elevator checkpoint: you'll start on floor ${f} next time.`, 600); }
  }
  else if (tile.kind === "shop") {
    const o = npcs.oliver;
    if (hourNow() >= 20 || !o || o.map !== "town" || Math.abs(o.x - 19 * T) > 40) return say(state.fest && hourNow() >= 10 && hourNow() < 18 ? "Oliver is at the festival!" : "The shop is closed. (Open 9:00–20:00)");
    state.ui = { type: "shop", page: 0 }; audio.beep(500, 0.05);
  }
}

function sellStack(id, mult = 1) {
  const v = Math.round((state.inv[id] || 0) * itemInfo(id).price * mult);
  state.money += v; state.inv[id] = 0; return v;
}
function checkWin() {
  if (!state.won && state.money >= GOAL) { state.won = true; say(`You saved $${GOAL} and bought the new barn! You win (keep playing!)`, 6); audio.beep(1200, 0.4, "triangle"); }
}

const upgrade = (name, list, level, apply) => level < list.length
  ? { label: `${name} Lv${level + 1} -> Lv${level + 2}`, cost: list[level].cost, mats: list[level].mats, buy: apply }
  : { label: `${name} maxed`, cost: Infinity };
const SHOP = page => page === 0
  ? CROP_IDS.map(k => ({ label: `5x ${k} seeds [${seasonTag(k)}]`, cost: CROPS[k].seed * 5, buy: () => { state.seeds[k] += 5; } }))
  : [
    upgrade("Hoe", HOE_UPGRADES, state.hoeLevel, () => { state.hoeLevel++; }),
    upgrade("Watering can", CAN_UPGRADES, state.canLevel, () => { state.canLevel++; state.water = maxWater(); }),
    upgrade("Pickaxe", PICK_UPGRADES, state.pickLevel, () => { state.pickLevel++; }),
    state.chickens < MAX_CHICKENS
      ? { label: `Chicken (${state.chickens}/${MAX_CHICKENS})`, cost: CHICKEN_COST, buy: () => { state.chickens++; makeChickens(); } }
      : { label: "Coop full", cost: Infinity },
  ];

function merchantBuy(i) {
  const unknown = Object.keys(DISHES).filter(k => !state.recipes.includes(k));
  const stock = [
    { label: "Energy Tonic (+60 energy)", cost: 60, buy: () => addItem("tonic") },
    { label: "Mystery seeds (5, in season)", cost: 90, buy: () => {
      const ok = CROP_IDS.filter(k => CROPS[k].seasons.includes(seasonOf(state.day))), k = ok[Math.floor(Math.random() * ok.length)];
      state.seeds[k] += 5; say(`Got 5 ${k} seeds!`);
    } },
    unknown.length
      ? { label: "Recipe scroll (random recipe)", cost: 300, buy: () => { const r = unknown[Math.floor(Math.random() * unknown.length)]; state.recipes.push(r); say(`Learned ${DISHES[r].name}!`, 4); } }
      : { label: "Recipe scroll (sold out)", cost: Infinity },
  ];
  return i === undefined ? stock : stock[i];
}

function uiKey(k) {
  const ui = state.ui, num = /^[1-9]$/.test(k) ? Number(k) - 1 : -1, close = k === "escape" || k === "e";
  if (ui.type === "shop") {
    if (close) return void (state.ui = null);
    if (k === "tab") return void (ui.page = 1 - ui.page);
    const item = SHOP(ui.page)[num];
    if (!item || item.cost === Infinity) return;
    if (state.money < item.cost || !hasMats(item.mats)) return say(!hasMats(item.mats) ? `Needs ${matsText(item.mats)}` : "Not enough money!") ?? audio.beep(120, 0.15, "sawtooth");
    state.money -= item.cost; for (const [id, n] of Object.entries(item.mats || {})) state.inv[id] -= n;
    item.buy(); audio.beep(700, 0.1, "triangle");
  } else if (ui.type === "bin") {
    if (close) { state.ui = null; return checkWin(); }
    const items = invItems();
    if (k === "a") { let t = 0; for (const [id] of items) t += sellStack(id); if (t) { say(`Sold everything for $${t}`); audio.beep(880, 0.15, "triangle"); } }
    else if (items[num]) { const v = sellStack(items[num][0]); say(`Sold for $${v}`); audio.beep(880, 0.1, "triangle"); }
  } else if (ui.type === "merchant") {
    if (close) return void (state.ui = null);
    if (k === "tab") return void (ui.mode = ui.mode === "buy" ? "sell" : "buy");
    if (ui.mode === "buy") {
      const item = merchantBuy(num);
      if (!item || item.cost === Infinity) return;
      if (state.money < item.cost) return audio.beep(120, 0.15, "sawtooth");
      state.money -= item.cost; item.buy(); audio.beep(700, 0.1, "triangle");
    } else {
      const items = invItems();
      if (items[num]) { const v = sellStack(items[num][0], 1.5); say(`Zed pays $${v}`); audio.beep(880, 0.1, "triangle"); }
    }
  } else if (ui.type === "home") {
    if (close) return void (state.ui = null);
    if (num === 0) sleep(); else if (num === 1) state.ui = { type: "cook" };
  } else if (ui.type === "cook") {
    if (close) return void (state.ui = null);
    const id = state.recipes[num];
    if (id) cook(id);
  } else if (ui.type === "inv") {
    if (["i", "escape"].includes(k) || (k === "e")) state.ui = null;
    else if (["tab", "arrowleft", "arrowright"].includes(k)) ui.tab = (ui.tab + 1) % 2;
    else if (ui.tab === 0 && num >= 0 && invItems()[num]) eat(invItems()[num][0]);
  } else if (ui.type === "pause") {
    if (k === "escape" || k === "1") state.ui = null;
    else if (k === "2") { save(); state.ui = null; say("Game saved."); }
    else if (k === "3") audio.toggleMute();
    else if (k === "4") { state.ui = null; scene = "title"; titleSel = 0; audio.startMusic("title"); }
  } else if (ui.type === "talk") talkKey(k, num);
}

function talkKey(k, num) {
  const ui = state.ui, f = state.friend[ui.id], v = VILLAGERS[ui.id];
  if (k === "escape" || k === "e") return void (state.ui = null);
  if (ui.mode === "menu") {
    if (num === 0) {
      const h = hearts(ui.id), tier = h < 3 ? v.low : h < 6 ? v.mid : v.high;
      const pool = [v.season[seasonOf(state.day)], ...tier];
      ui.text = `${v.name}: ${pool[(state.day + ui.n++) % pool.length]}`;
      if (!f.talked) { f.talked = true; addFriend(ui.id, 20); }
    } else if (num === 1) { ui.mode = "gift"; ui.text = ""; }
    else if (num === 2 && ui.id === "rosa") ui.text = festEntry() ?? "Rosa: No festival entries today.";
  } else if (ui.mode === "gift") {
    const it = invItems()[num];
    if (!it) return;
    if (f.gifted) return void (ui.text = `${v.name}: You already gave me something today!`);
    const [id] = it, name = itemInfo(id).name;
    state.inv[id]--; f.gifted = true;
    let pts = 20, line = `${v.name}: Oh, a ${name}. Thanks!`;
    if (v.loves.includes(id)) { pts = 80; line = `${v.name}: A ${name}?! I LOVE it! Thank you!!`; }
    else if (v.likes.includes(id)) { pts = 45; line = `${v.name}: A ${name}! That's really nice of you.`; }
    else if (v.hates.includes(id)) { pts = -20; line = `${v.name}: Ugh... a ${name}? No thanks.`; }
    addFriend(ui.id, pts); ui.text = line; ui.mode = "menu"; audio.beep(pts > 0 ? 880 : 150, 0.15, "triangle");
  }
}
function addFriend(id, pts) {
  const f = state.friend[id], v = VILLAGERS[id];
  f.pts = Math.max(0, Math.min(1000, f.pts + pts));
  let delay = 1200;
  while (f.rewards < HEART_REWARDS.length && hearts(id) >= HEART_REWARDS[f.rewards].hearts) {
    const r = HEART_REWARDS[f.rewards++]; state.money += r.money;
    later(`${v.name} gives you $${r.money} (${r.hearts} hearts)!`, delay); delay += 4200; audio.beep(990, 0.2, "triangle");
  }
  for (const [lv, rid] of Object.entries(v.recipes || {})) if (hearts(id) >= Number(lv) && !state.recipes.includes(rid)) {
    state.recipes.push(rid); later(`${v.name} taught you a recipe: ${DISHES[rid].name}!`, delay); delay += 4200;
  }
}

function sleep() {
  const old = seasonOf(state.day);
  for (const m of Object.values(maps)) for (const row of m.tiles) for (const tile of row) {
    if (tile.crop && tile.wet) tile.crop.age++;
    tile.wet = false;
  }
  state.day++; state.minutes = 6 * 60; state.energy = 100;
  state.map = "farm"; state.px = 7 * T; state.py = 7 * T; state.fx = 0; state.fy = 1; fishing = null; state.ui = null;
  for (const id in state.friend) { state.friend[id].talked = false; state.friend[id].gifted = false; }
  addItem("egg", state.chickens);
  const s = seasonOf(state.day);
  let extra = "";
  if (s !== old) {
    let withered = 0;
    for (const m of Object.values(maps)) for (const row of m.tiles) for (const tile of row) if (tile.crop && !CROPS[tile.crop.type].seasons.includes(s)) { delete tile.crop; withered++; }
    extra = ` ${SEASONS[s].name} begins!${withered ? ` ${withered} crop(s) withered.` : ""}`;
  }
  audio.startMusic(mood());
  state.rain = Math.random() < (s === 3 ? 0.3 : 0.2);
  if (state.rain) for (const row of maps.farm.tiles) for (const tile of row) if (tile.t === 1) tile.wet = true;
  state.water = maxWater(); spawnForage(); startFestival();
  if (state.fest) { const f = FESTIVALS.find(x => x.id === state.fest.id); extra += ` Today: ${f.name}! ${f.desc}.`; }
  if (merchantHere()) extra += " Zed the merchant is in Town today.";
  save();
  say(`Day ${state.day}${state.rain ? (s === 3 ? " — snowing" : " — raining") : ""}.${state.chickens ? ` ${state.chickens} egg(s) laid.` : ""}${extra}`, extra ? 6 : 3);
}

// ---------------------------------------------------------------- update
function goMap(to, tx, ty) {
  state.map = to; state.px = tx * T + 2; state.py = ty * T; state.fade = 0.4; fishing = null;
  say(maps[to].name, 1.5); audio.beep(440, 0.08, "triangle");
}

function update(dt) {
  clock += dt;
  if (scene !== "game") return;
  state.msgT -= dt; state.fade = Math.max(0, state.fade - dt);
  const snow = seasonOf(state.day) === 3;
  for (const p of particles) {                                                      // rain / snow
    p.y += p.v * (snow ? 0.4 : 1) * dt; p.x += (snow ? Math.sin(clock * 2 + p.v) * 8 : -6) * dt;
    if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
    if (p.x < 0) p.x += W;
    if (p.x > W) p.x -= W;
  }
  updateNpcs(dt); updateFishing(dt);
  for (const c of chickens) {
    c.t -= dt;
    if (c.t <= 0) { c.t = 1 + Math.random() * 2; c.vx = (Math.random() - .5) * 20; c.vy = (Math.random() - .5) * 20; }
    c.x = Math.max(PEN.x0 * T, Math.min((PEN.x1 + 1) * T - 12, c.x + c.vx * dt));
    c.y = Math.max(PEN.y0 * T, Math.min((PEN.y1 + 1) * T - 10, c.y + c.vy * dt));
  }
  if (state.ui) { moving = false; return; }

  const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  moving = !!(dx || dy);
  if (moving && fishing) {
    if (fishing.phase === "wait") { fishing = null; say("Reeled in."); } else moving = false;   // can't walk mid-reel
  }
  if (moving) {
    walkT += dt;
    if (dx && dy) { state.fx = 0; state.fy = dy; } else { state.fx = dx; state.fy = dy; }
    const sp = 70 * dt;
    for (const [mx, my] of [[dx * sp, 0], [0, dy * sp]]) {
      const nx = state.px + mx, ny = state.py + my;
      const corners = [[nx + 3, ny + 6], [nx + 9, ny + 6], [nx + 3, ny + 13], [nx + 9, ny + 13]];
      if (!corners.some(([cx, cy]) => blocked(Math.floor(cx / T), Math.floor(cy / T))) && !npcOverlap(nx, ny)) { state.px = nx; state.py = ny; }
    }
  }
  const fx = Math.floor((state.px + 6) / T), fy = Math.floor((state.py + 10) / T), here = tileAt(fx, fy);
  if (here?.forage) {                                                              // walk over forage to pick it up
    addItem(here.forage); say(`Found ${FORAGE[here.forage].name}!`); audio.beep(760, 0.1, "triangle"); delete here.forage;
  }
  if (here?.fegg) { delete here.fegg; audio.beep(900, 0.08, "triangle"); festProgress("egghunt"); }
  for (const w of cur().warps) if (fx >= w.x && fx < w.x + w.w && fy >= w.y && fy < w.y + w.h) { goMap(w.to, w.tx, w.ty); break; }

  state.minutes += dt * (10 / 3);                    // ~6 real minutes per 20h day
  if (state.minutes >= 26 * 60) { sleep(); say("You passed out... and woke up at home."); }
}

// ---------------------------------------------------------------- drawing
function wrap(text, maxW) {
  const lines = []; let line = "";
  for (const w of text.split(" ")) {
    if (ctx.measureText(line + w).width > maxW && line) { lines.push(line.trimEnd()); line = ""; }
    line += w + " ";
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
const txt = (s, x, y, c = "#fff", align = "left") => { ctx.fillStyle = c; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.textAlign = "left"; };

function drawWorld() {
  const m = cur(), season = seasonOf(state.day), frame = Math.floor(clock * 2) % 2, inMine = state.map === "mine";
  const camX = Math.max(0, Math.min(m.w * T - W, Math.round(state.px + 6 - W / 2)));
  const camY = Math.max(0, Math.min(m.h * T - H, Math.round(state.py + 10 - H / 2)));
  ctx.fillStyle = "#0c0a10"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-camX, -camY);
  const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(m.w - 1, Math.ceil((camX + W) / T));
  const y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(m.h - 1, Math.ceil((camY + H) / T) + 1);
  const things = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const tile = m.tiles[y][x], v = Math.min(3, Math.floor(hash(x, y) * 4));
    let base;
    if (tile.t === 1) base = tile.wet ? S.soilWet : S.soil;
    else if (tile.t === 2) base = S.water[frame];
    else if (tile.t === 7) base = S.pen;
    else if (tile.t === 8) base = S.path[v];
    else if (tile.t === 11) base = S.cave[v];
    else if (tile.t === 12 || tile.t === 13) base = S.cfloor[v];
    else base = S.grass[season][v];
    ctx.drawImage(base, x * T, y * T);
    if (tile.t === 13) ctx.drawImage(S.node[tile.ore], x * T, y * T);
    if (tile.kind === "ladder") ctx.drawImage(S.ladder, x * T, y * T);
    if (tile.kind === "mexit") ctx.drawImage(S.mexit, x * T, y * T);
    if (tile.crop) ctx.drawImage(S.crop[tile.crop.type][cropStage(tile.crop)], x * T, y * T);
    if (tile.forage) ctx.drawImage(S.icon[tile.forage], x * T, y * T + Math.round(Math.sin(clock * 3 + x) * 0.6));
    if (tile.fegg) ctx.drawImage(S.icon.fegg, x * T, y * T + Math.round(Math.sin(clock * 4 + x) * 0.8));
    if (tile.t === 3) things.push({ img: tile.rock ? S.rock : S.tree[season], x: x * T, y: tile.rock ? y * T : y * T - 8, sort: (y + 1) * T });
  }
  if (state.map === "town" && festivalToday()) {                                    // festival pennants
    const cols = ["#e84a6a", "#ffd23f", "#3a9ae8", "#3ddc97"];
    ctx.fillStyle = "#ddd"; ctx.fillRect(x0 * T, 12 * T + 2, (x1 - x0 + 1) * T, 1);
    for (let x = x0; x <= x1; x++) { ctx.fillStyle = cols[x % 4]; ctx.fillRect(x * T + 3, 12 * T + 3, 8, 3); ctx.fillRect(x * T + 4, 12 * T + 6, 6, 2); ctx.fillRect(x * T + 6, 12 * T + 8, 2, 1); }
  }
  for (const o of m.objects) {
    const img = S.bldg[o.sprite];
    if (o.x * T > camX + W || (o.x + 3) * T < camX) continue;
    things.push({ img, x: o.x * T, y: (o.y + o.h) * T - img.height, sort: (o.y + o.h) * T });
  }
  for (const [id, n] of Object.entries(npcs)) if (n.map === state.map) {
    const f = n.moving ? 1 + (Math.floor(clock * 6) % 2) : 0;
    things.push({ img: S.npc[id][n.dir][f], x: Math.round(n.x), y: Math.round(n.y) - 1, sort: n.y + 14 });
  }
  if (state.map === "farm") for (const c of chickens) things.push({ img: S.chicken, x: Math.round(c.x), y: Math.round(c.y), sort: c.y + 10, flip: c.vx < 0 });
  const dir = state.fy > 0 ? 0 : state.fy < 0 ? 1 : state.fx > 0 ? 2 : 3;
  const pf = moving ? 1 + (Math.floor(walkT * 8) % 2) : 0;
  things.push({ img: S.player[dir][pf], x: Math.round(state.px) - 2, y: Math.round(state.py) - 1, sort: state.py + 14 });
  things.sort((a, b) => a.sort - b.sort);
  for (const t of things) {
    if (t.flip) { ctx.save(); ctx.translate(t.x + t.img.width, t.y); ctx.scale(-1, 1); ctx.drawImage(t.img, 0, 0); ctx.restore(); }
    else ctx.drawImage(t.img, t.x, t.y);
  }
  if (fishing) {                                                                    // line and bobber
    const bx = fishing.x * T + 8, by = fishing.y * T + 8 + (fishing.phase === "bite" ? Math.sin(clock * 30) * 1.5 : Math.sin(clock * 3));
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.moveTo(state.px + 6, state.py + 4); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = "#e33"; ctx.fillRect(bx - 1, by - 1, 3, 3);
    if (fishing.phase === "bite") txt("!", state.px + 6, state.py - 6, "#ffd23f", "center");
  }
  const { x, y } = targetTile();                                                    // target marker
  ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.3 * Math.sin(clock * 6)})`; ctx.strokeRect(x * T + .5, y * T + .5, T - 1, T - 1);
  ctx.restore();

  if (inMine) {                                                                     // lantern light
    const lx = state.px + 6 - camX, ly = state.py + 8 - camY, g = ctx.createRadialGradient(lx, ly, 26, lx, ly, 118);
    g.addColorStop(0, "rgba(5,3,12,0)"); g.addColorStop(1, "rgba(5,3,12,.94)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    const hr = hourNow(), dark = hr > 19 ? Math.min(.55, (hr - 19) / 7) : 0;        // night tint
    if (dark) { ctx.fillStyle = `rgba(10,10,50,${dark})`; ctx.fillRect(0, 0, W, H); }
    if (state.rain) {
      const snow = season === 3;
      if (!snow) { ctx.fillStyle = "rgba(20,30,70,.18)"; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = snow ? "#fff" : "#9ec9ff";
      for (const p of particles) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, snow ? 1 : 3);
    }
  }
  if (state.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${state.fade / 0.4})`; ctx.fillRect(0, 0, W, H); }
  drawHud(hourNow(), x, y);
}

function drawHud(hr, tx, ty) {
  const s = seasonOf(state.day);
  ctx.fillStyle = "rgba(20,15,35,.8)"; ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 24, W, 24);
  ctx.font = "9px monospace";
  const h = Math.floor(hr) % 24, mm = Math.floor(state.minutes % 60 / 10) * 10;
  txt(`${cur().name} | ${SEASONS[s].name} ${dayOfSeason(state.day)} Y${yearOf(state.day)} ${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}${state.rain ? (s === 3 ? " snow" : " rain") : ""} | $${state.money}/${GOAL} | En ${Math.ceil(state.energy)} | Water ${state.water}/${maxWater()}`, 4, 10);
  if (state.fest) {
    const f = FESTIVALS.find(x => x.id === state.fest.id);
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 14, 170, 11);
    txt(state.fest.done ? `* ${f.name}: done!` : `* ${f.name}: ${state.fest.progress}/${f.goal}`, 4, 23, "#ffd23f");
  }

  const items = invItems(), bag = items.slice(0, 6).map(([k, n]) => `${n} ${itemInfo(k).name}`).join(", ");
  if (bag) { const t = `Bag: ${bag}${items.length > 6 ? "…" : ""}`; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(2, H - 38, ctx.measureText(t).width + 4, 12); txt(t, 4, H - 28, "#cfe8ff"); }
  const tile = inBounds(tx, ty) ? tileAt(tx, ty) : null, id = tile && npcNear(tx, ty);
  const hint = !tile ? "" : id ? `E: ${id === "zed" ? "trade with Zed" : "talk to " + VILLAGERS[id].name}` : tile.crop && tile.crop.age >= CROPS[tile.crop.type].days ? "Space: harvest" : tile.kind === "home" ? "E: sleep / cook"
    : tile.kind === "bin" ? "E: sell goods" : tile.kind === "shop" ? "E: shop" : tile.kind === "mine" ? "E: enter mine" : tile.kind === "ladder" ? "E: go down" : tile.kind === "mexit" ? "E: leave mine"
    : tile.t === 2 && TOOLS[state.sel] === "rod" ? "Space: fish" : tile.t === 13 && TOOLS[state.sel] === "pick" ? "Space: mine" : "";
  if (hint) { const w = ctx.measureText(hint).width + 4; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(W - w - 2, H - 38, w, 12); txt(hint, W - 4, H - 28, "#ffd23f", "right"); }

  const sw = 96;
  TOOLS.forEach((t, i) => {
    const x = 2 + i * sw, sel = i === state.sel;
    ctx.fillStyle = sel ? "#ffd23f" : "#3b3550"; ctx.fillRect(x, H - 22, sw - 2, 20);
    const icon = t === "seeds" ? S.icon[curSeed()] : S.icon[t];
    ctx.drawImage(icon, x + 1, H - 20);
    const label = t === "hoe" ? `Hoe L${state.hoeLevel + 1}` : t === "can" ? `Can L${state.canLevel + 1}` : t === "rod" ? "Rod" : t === "pick" ? `Pick L${state.pickLevel + 1}` : `${curSeed()} x${state.seeds[curSeed()]}`;
    ctx.font = "8px monospace"; txt(`${i + 1} ${label}`, x + 19, H - 9, sel ? "#000" : "#fff"); ctx.font = "9px monospace";
  });

  if (fishing?.phase === "reel") {                                                  // timing bar
    const bx = W / 2 - 70, by = H - 66;
    ctx.fillStyle = "rgba(0,0,0,.8)"; ctx.fillRect(bx - 40, by - 14, 220, 30);
    txt(`${FISH[fishing.fish].name} on the line! Space in the green`, W / 2, by - 4, "#fff", "center");
    ctx.fillStyle = "#334"; ctx.fillRect(bx, by + 2, 140, 8);
    ctx.fillStyle = "#3ddc97"; ctx.fillRect(bx + fishing.zone * 140, by + 2, fishing.width * 140, 8);
    ctx.fillStyle = "#fff"; ctx.fillRect(bx + fishing.cursor * 140 - 1, by, 3, 12);
  }
  drawUi();
  if (state.msgT > 0) {
    const lines = wrap(state.msg, 420), top = state.ui ? H - 40 - lines.length * 11 : 26;   // keep clear of menu titles
    ctx.fillStyle = "rgba(0,0,0,.8)"; ctx.fillRect(W / 2 - 215, top, 430, lines.length * 11 + 4);
    lines.forEach((l, i) => txt(l, W / 2, top + 9 + i * 11, "#fff", "center"));
  }
}

function panel(x, y, w, h, title) {
  ctx.fillStyle = "rgba(0,0,0,.92)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffd23f"; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  txt(title, x + 8, y + 14, "#ffd23f");
}
function drawUi() {
  const ui = state.ui; if (!ui) return;
  ctx.font = "9px monospace";
  if (ui.type === "shop") {
    panel(50, 22, 380, 214, `SHOP ${ui.page ? "(upgrades)" : "(seeds)"}  $${state.money}  Tab: page  E: close`);
    SHOP(ui.page).forEach((it, i) => {
      const ok = it.cost !== Infinity && state.money >= it.cost && hasMats(it.mats);
      txt(`${i + 1}. ${it.label}${it.cost === Infinity ? "" : "  $" + it.cost}${it.mats ? " + " + matsText(it.mats) : ""}`, 58, 36 + (i + 1) * 14, it.cost === Infinity ? "#777" : ok ? "#fff" : "#f87171");
    });
    txt(`Now: ${SEASONS[seasonOf(state.day)].name}. Out-of-season crops wither when the season changes. Ore comes from the mine.`, 58, 228, "#9aa");
  } else if (ui.type === "bin") {
    panel(60, 30, 360, 200, "SELL  (number sells a stack, A sells all, E to close)");
    const items = invItems();
    if (!items.length) txt("Nothing to sell — harvest, forage, fish or mine!", 68, 56, "#777");
    items.slice(0, 9).forEach(([id, n], i) => { ctx.drawImage(S.icon[id], 68, 41 + (i + 1) * 14 - 10, 12, 12); txt(`${i + 1}. ${n}x ${itemInfo(id).name}  = $${n * itemInfo(id).price}`, 84, 40 + (i + 1) * 14); });
  } else if (ui.type === "merchant") {
    panel(60, 30, 360, 200, `ZED THE MERCHANT  $${state.money}  (${ui.mode.toUpperCase()} — Tab to switch, E to close)`);
    if (ui.mode === "buy") merchantBuy().forEach((it, i) => txt(`${i + 1}. ${it.label}${it.cost === Infinity ? "" : "  $" + it.cost}`, 68, 40 + (i + 1) * 14, it.cost === Infinity ? "#777" : state.money >= it.cost ? "#fff" : "#f87171"));
    else {
      txt("Zed pays 1.5x for everything:", 68, 52, "#8f8");
      invItems().slice(0, 9).forEach(([id, n], i) => { ctx.drawImage(S.icon[id], 68, 55 + (i + 1) * 14 - 10, 12, 12); txt(`${i + 1}. ${n}x ${itemInfo(id).name} = $${Math.round(n * itemInfo(id).price * 1.5)}`, 84, 54 + (i + 1) * 14); });
    }
  } else if (ui.type === "home") {
    panel(150, 80, 180, 70, "FARMHOUSE");
    txt("1. Sleep (end the day)", 160, 106); txt("2. Cook", 160, 122); txt("E: cancel", 160, 138, "#777");
  } else if (ui.type === "cook") {
    panel(40, 30, 400, 200, "KITCHEN  (number cooks, E to close)");
    state.recipes.slice(0, 9).forEach((id, i) => {
      const d = DISHES[id], ok = !!resolveNeed(d.need);
      ctx.drawImage(S.icon[id], 48, 40 + (i + 1) * 16 - 11, 12, 12);
      txt(`${i + 1}. ${d.name}: ${needText(d.need)}  ($${d.price}, +${d.energy} en)`, 64, 40 + (i + 1) * 16, ok ? "#fff" : "#777");
    });
    txt("Eat food from the inventory (I, then a number). Befriend villagers to learn more recipes.", 48, 222, "#9aa");
  } else if (ui.type === "inv") drawInventory(ui);
  else if (ui.type === "pause") {
    panel(150, 70, 180, 110, "PAUSED");
    ["1. Resume", "2. Save game", `3. Music: ${audio.isMuted() ? "off" : "on"}`, "4. Quit to title"].forEach((s, i) => txt(s, 160, 94 + i * 16));
  } else if (ui.type === "talk") {
    const v = VILLAGERS[ui.id], hh = hearts(ui.id);
    panel(60, 120, 360, 112, `${v.name} — ${v.job}   ${"*".repeat(hh)}${".".repeat(10 - hh)}`);
    ctx.drawImage(S.npc[ui.id][0][0], 68, 134);
    if (ui.mode === "menu") txt(`1. Talk    2. Give gift${ui.id === "rosa" && state.fest && !state.fest.done && ["fair", "feast"].includes(state.fest.id) ? "    3. Festival entry" : ""}    E: leave`, 92, 148);
    else {
      txt("Pick a gift (number)  — E: leave", 92, 148, "#ffd23f");
      invItems().slice(0, 6).forEach(([id, n], i) => txt(`${i + 1}. ${n}x ${itemInfo(id).name}`, 92 + (i % 3) * 110, 162 + Math.floor(i / 3) * 12));
    }
    wrap(ui.text, 340).forEach((l, i) => txt(l, 68, 196 + i * 12, "#cfe8ff"));
  }
}

function drawInventory(ui) {
  panel(30, 14, 420, 230, `${ui.tab === 0 ? "[ITEMS]  friends" : " items  [FRIENDS]"}   (Tab: switch, I/E: close)`);
  let y = 40;
  if (ui.tab === 0) {
    const row = (t, c = "#fff") => { txt(t, 40, y, c); y += 12; };
    row(`Hoe L${state.hoeLevel + 1}  Can L${state.canLevel + 1} (${maxWater()})  Pick L${state.pickLevel + 1}`, "#cfe8ff");
    row(`Fish caught ${state.caught}  Mine best ${state.mineBest}F`, "#cfe8ff");
    y += 2; row("Seeds (Q switches)        Season  Sell", "#ffd23f");
    CROP_IDS.forEach((k, i) => {
      ctx.drawImage(S.icon[k], 40, y - 10, 12, 12);
      const c = i === state.seedSel ? "#ffd23f" : state.seeds[k] ? "#fff" : "#777";
      txt(`${k} x${state.seeds[k]}`, 56, y, c); txt(seasonTag(k), 140, y, c); txt(`$${CROPS[k].price}`, 190, y, c); y += 12;
    });
    let ry = 40;
    const items = invItems(); let total = 0;
    for (const [id, n] of items) total += n * itemInfo(id).price;
    txt("Bag (number = eat)", 250, ry, "#ffd23f"); ry += 12;
    if (!items.length) txt("(empty)", 250, ry, "#777");
    items.slice(0, 11).forEach(([id, n], i) => {
      ctx.drawImage(S.icon[id], 250, ry - 10, 12, 12);
      txt(`${i < 9 ? i + 1 + "." : "  "} ${n}x ${itemInfo(id).name}`.slice(0, 26), 266, ry, edibleEnergy(id) ? "#fff" : "#aab"); ry += 12;
    });
    if (items.length > 11) { txt(`…and ${items.length - 11} more`, 250, ry, "#777"); ry += 12; }
    if (items.length) txt(`Worth $${total}`, 250, ry + 2, "#8f8");
  } else {
    for (const [id, v] of Object.entries(VILLAGERS)) {
      ctx.drawImage(S.npc[id][0][0], 40, y - 12);
      txt(`${v.name} (${v.job})`, 60, y - 2); txt(`${"*".repeat(hearts(id))}${".".repeat(10 - hearts(id))}  ${hearts(id)}/10`, 60, y + 8, "#ff7a9c");
      txt(`Loves: ${v.loves.slice(0, 3).map(i => itemInfo(i).name).join(", ")}`, 215, y - 2, "#8f8"); txt(`Likes: ${v.likes.slice(0, 3).map(i => itemInfo(i).name).join(", ")}`, 215, y + 8, "#cfe8ff");
      y += 28;
    }
    y += 2; txt(`Recipes: ${state.recipes.map(r => DISHES[r].name).join(", ")}`.slice(0, 70), 40, y, "#ffd23f");
    txt(`Chickens ${state.chickens}/${MAX_CHICKENS}   Goal $${state.money}/${GOAL}   Zed visits every ${MERCHANT.every}th day`, 40, y + 14, "#cfe8ff");
  }
}

function drawTitle() {
  const sky = ctx.createLinearGradient(0, 0, 0, 180); sky.addColorStop(0, "#5fb4ff"); sky.addColorStop(1, "#e4f6ff");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff6b0"; ctx.beginPath(); ctx.arc(400, 46, 18, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.9)";
  for (let i = 0; i < 4; i++) { const cx = ((clock * 6 + i * 130) % (W + 80)) - 40, cy = 30 + i * 22; ctx.fillRect(cx, cy, 44, 8); ctx.fillRect(cx + 8, cy - 5, 26, 6); }
  ctx.fillStyle = "#7fc46a"; ctx.beginPath(); ctx.moveTo(0, 190);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 162 + Math.sin(x / 55) * 14);
  ctx.lineTo(W, 190); ctx.fill();
  for (let y = 11; y < 17; y++) for (let x = 0; x < 30; x++) ctx.drawImage(S.grass[0][Math.min(3, Math.floor(hash(x, y, 4) * 4))], x * T, y * T);
  for (let x = 4; x < 12; x++) { ctx.drawImage(S.soilWet, x * T, 12 * T); ctx.drawImage(S.crop[CROP_IDS[x % CROP_IDS.length]][4], x * T, 12 * T); }
  ctx.drawImage(S.bldg.home, 18 * T, 11 * T - 24); ctx.drawImage(S.tree[0], 25 * T, 11 * T - 8); ctx.drawImage(S.tree[0], 1 * T, 11 * T - 8);
  const f = Math.floor(clock * 6) % 2; ctx.drawImage(S.player[2][1 + f], ((clock * 20) % (W + 30)) - 20, 14 * T);
  ctx.drawImage(S.chicken, 15 * T, 14 * T + 4);
  ctx.font = "bold 30px monospace"; txt("TINY VALLEY", W / 2 + 2, 62, "#2b3b20", "center"); txt("TINY VALLEY", W / 2, 60, "#ffe9a8", "center");
  ctx.font = "10px monospace"; txt("a cozy farming adventure", W / 2, 78, "#2b3b20", "center");
  const opts = titleOptions(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(W / 2 - 70, 92, 140, opts.length * 16 + 10);
  opts.forEach((o, i) => txt(`${i === titleSel ? "> " : "  "}${o}`, W / 2, 108 + i * 16, i === titleSel ? "#ffd23f" : "#fff", "center"));
  ctx.font = "9px monospace"; txt("W/S select · Enter start · M toggles music", W / 2, H - 8, "#fff", "center");
}

// ---------------------------------------------------------------- boot
if (location.search.includes("debug")) window.__farm = {
  S, get state() { return state; }, get maps() { return maps; }, get npcs() { return npcs; }, get fishing() { return fishing; },
  sleep, useTool, startGame, goMap, enterMine, interact, cook, eat, startFestival, festProgress,
};
particles = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 60 + Math.random() * 60 }));
let last = performance.now();
(function frame(now) {
  update(Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now;
  ctx.font = "9px monospace";
  if (scene === "title") drawTitle(); else drawWorld();
  requestAnimationFrame(frame);
})(last);
