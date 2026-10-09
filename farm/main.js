import {
  T, SEASON_LEN, GOAL, CHICKEN_COST, MAX_CHICKENS, MAX_COWS, COW_COST, HOE_UPGRADES, CAN_UPGRADES, PICK_UPGRADES, SWORD_UPGRADES, SWORD_DAMAGE,
  PEN, PASTURE, BUILDINGS, MONSTERS, MISC, HEART_REWARDS, CROPS, FORAGE, FISH, ORES, DISHES, START_RECIPES, VILLAGERS, MERCHANT,
  FESTIVALS, SPOUSE_LINES, SKILLS, XP_TABLE, PERKS, TRAVEL, BUNDLES, RESTORE_PRIZE, SPRINKLER_SHOP, HORSE_COST, PET_COST, PETS, itemInfo, edibleEnergy,
} from "./data.js";
import { SEASONS, buildSprites, hash } from "./sprites.js";
import { generateWorld, makeMine, PLOTS } from "./world.js";
import * as audio from "./audio.js";
import { initTouch, dispatchKey } from "./touch.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const SAVE_KEY = "tinyvalley-save-v9";
const TOOLS = ["hoe", "can", "rod", "pick", "sword", "seeds"];
const SEED_SLOT = TOOLS.indexOf("seeds");
const CROP_IDS = Object.keys(CROPS);
const BLOCKING = [2, 3, 4, 5, 6, 10, 11, 13, 16];
const FORAGE_COUNT = { farm: 8, town: 4, forest: 22, beach: 14, desert: 12 };
const SHOP_PAGES = ["Seeds", "Upgrades", "Farm", "Gifts"];

const S = buildSprites({
  crops: CROP_IDS, forage: Object.keys(FORAGE),
  fish: Object.fromEntries(Object.entries(FISH).map(([k, v]) => [k, v.color])),
  ores: Object.fromEntries(Object.entries(ORES).map(([k, v]) => [k, v.color])),
  dishes: Object.fromEntries(Object.entries(DISHES).map(([k, v]) => [k, v.color])), misc: Object.keys(MISC),
  npcs: { ...Object.fromEntries(Object.entries(VILLAGERS).map(([k, v]) => [k, v.pal])), zed: MERCHANT.pal },
});

let petObj = null, scene = "title", titleSel = 0, maps, state, animals = [], monsters = [], slash = null, slashCool = 0, invuln = 0, npcs = {}, clock = 0, walkT = 0, moving = false, particles = [], fishing = null;

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
const festivalToday = () => FESTIVALS.find(f => f.season === seasonOf(state.day) && f.day === dayOfSeason(state.day)) ?? null;
const partner = () => state.spouse ?? "rosa";
const areaMood = () => (["mine", "beach", "desert"].includes(state.map) ? state.map : mood());

// ---- skills ----
const skillLevel = id => XP_TABLE.filter(x => state.xp[id] >= x).length;                  // 1..10
const hasPerk = id => Object.values(state.perks).includes(id);
const maxHp = () => 100 + 5 * (skillLevel("combat") - 1) + (hasPerk("defender") ? 25 : 0);
function gainXp(id, n) {
  const before = skillLevel(id);
  state.xp[id] += n;
  const after = skillLevel(id);
  if (after > before) {
    later(`${SKILLS[id].name} reached level ${after}!`, 700, 3.5); audio.beep(900, 0.2, "triangle");
    for (const tier of [5, 10]) if (after >= tier && !state.perks[`${id}${tier}`] && !state.pendingPerks.some(p => p.skill === id && p.tier === tier)) state.pendingPerks.push({ skill: id, tier });
  }
}
function sellMult(id) {
  const sk = CROPS[id] ? "farming" : FORAGE[id] ? "foraging" : FISH[id] ? "fishing" : null;
  let m = sk ? 1 + 0.03 * (skillLevel(sk) - 1) : 1;
  if (CROPS[id] && hasPerk("tiller")) m += 0.10;
  if ((id === "egg" || id === "milk") && hasPerk("rancher")) m += 0.30;
  if (DISHES[id] && hasPerk("artisan")) m += 0.40;
  if (FISH[id] && hasPerk("fisher")) m += 0.25;
  if (ORES[id] && hasPerk("blacksmith")) m += 0.40;
  if (FORAGE[id] && hasPerk("botanist")) m += 0.25;
  return m;
}
const sellPrice = id => Math.round(itemInfo(id).price * sellMult(id));
const merchantHere = () => state.day % MERCHANT.every === 0;
const curSeed = () => CROP_IDS[state.seedSel];

function defaultState() {
  return {
    map: "farm", px: 7 * T, py: 7 * T, fx: 0, fy: 1, sel: 0, seedSel: 0,
    money: 50, energy: 100, day: 1, minutes: 6 * 60, rain: false,
    inv: {}, seeds: Object.fromEntries(CROP_IDS.map(k => [k, k === "turnip" ? 5 : 0])),
    water: 20, canLevel: 0, hoeLevel: 0, pickLevel: 0, swordLevel: 0, hp: 100, chickens: 0, cows: 0, build: {}, recipes: [...START_RECIPES],
    dating: null, engaged: null, spouse: null,
    perks: {}, pendingPerks: [], visited: { farm: true }, tut: { on: true, step: 0, dist: 0, sold: false }, tips: {},
    pet: null, horse: false, mounted: false, bundles: {}, restored: false,
    xp: { farming: 0, fishing: 0, mining: 0, foraging: 0, combat: 0 }, quests: [], board: [], questSeq: 0,
    mineBest: 1, mineFloor: 1, fest: null,
    friend: Object.fromEntries(Object.keys(VILLAGERS).map(id => [id, { pts: 0, talked: false, gifted: false, rewards: 0 }])),
    won: false, ui: null, msg: "", msgT: 0, fade: 0, caught: 0,
  };
}

function newGame() {
  maps = generateWorld();
  state = defaultState();
  refreshBoard(); spawnForage(); makeAnimals();
}

function makeAnimals() {
  const spawn = (kind, n, r) => Array.from({ length: n }, () => ({
    kind, r, x: (r.x0 + Math.random() * (r.x1 - r.x0)) * T, y: (r.y0 + Math.random() * (r.y1 - r.y0)) * T, vx: 0, vy: 0, t: 0,
  }));
  animals = [...spawn("chicken", state.chickens, PEN), ...spawn("cow", state.cows, PASTURE)];
}

function spawnForage() {
  const season = seasonOf(state.day);
  for (const [name, m] of Object.entries(maps)) {
    const area = name === "beach" || name === "desert" ? name : null;
    const ids = Object.keys(FORAGE).filter(k => (area ? FORAGE[k].area === area : !FORAGE[k].area && FORAGE[k].seasons.includes(season)));
    for (const row of m.tiles) for (const t of row) delete t.forage;
    for (let i = 0, placed = 0; i < 500 && placed < Math.round((FORAGE_COUNT[name] || 0) * (hasPerk("tracker") ? 1.5 : 1)); i++) {
      const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), t = m.tiles[y][x];
      if ((t.t === 0 || t.t === 14) && !t.crop && !t.forage) { t.forage = ids[Math.floor(Math.random() * ids.length)]; placed++; }
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
    state = { ...d, ...s.state, seeds: { ...d.seeds, ...s.state.seeds }, xp: { ...d.xp, ...s.state.xp }, tut: { ...d.tut, ...s.state.tut }, visited: { ...d.visited, ...s.state.visited }, tips: { ...s.state.tips }, perks: { ...s.state.perks }, build: { ...s.state.build }, friend: { ...d.friend, ...s.state.friend }, ui: null };
    makeAnimals(); return true;
  } catch { return false; }
}

function startGame(cont) {
  if (!(cont && load())) newGame();
  scene = "game"; fishing = null; monsters = []; placePet();
  if (state.map === "mine") spawnMonsters();
  audio.startMusic(areaMood());
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
    else if (/^[1-6]$/.test(k)) { const n = Number(k) - 1; if (n === SEED_SLOT && state.sel === SEED_SLOT) cycleSeed(); state.sel = n; }
    else if (k === "q") { state.sel = SEED_SLOT; cycleSeed(); }
    else if (k === " ") useTool();
    else if (k === "e") interact();
    else if (k === "i") state.ui = { type: "inv", tab: 0 };
    else if (k === "j") state.ui = { type: "journal" };
    else if (k === "p") placeSprinkler();
    else if (k === "n") state.ui = { type: "map" };
    else if (k === "h") toggleMount();
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
  if (state.spouse === id) return { map: "farm", x: 9, y: 8 };                                // lives on the farm
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
    const bonus = state.build.silo === "built" && Math.random() < 0.25;
    gainXp("farming", 3 + Math.round(c.price / 20));
    addItem(tile.crop.type, bonus ? 2 : 1); say(`Harvested ${tile.crop.type}!${bonus ? " (silo bonus!)" : ""}`); audio.beep(660, 0.12, "triangle");
    if (c.regrow) tile.crop.age = c.days - c.regrow; else delete tile.crop;
    return;
  }
  if (state.mounted) return say("Dismount first (press H).");
  if (tool === "rod") return castRod(tile, x, y);
  if (tool === "pick") return mine(tile);
  if (tool === "sword") return swing();
  if (tool === "hoe") {
    if (state.map !== "farm") return say(state.map === "greenhouse" ? "The beds are already tilled." : "The soil here isn't yours to till.");
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
    if (tile.sprinkler) return say("A sprinkler is in the way.");
    if (state.map !== "greenhouse" && !CROPS[crop].seasons.includes(seasonOf(state.day))) return say(`${crop} doesn't grow in ${SEASONS[seasonOf(state.day)].name}. (${seasonTag(crop)})`);
    if (!state.seeds[crop]) return say(`No ${crop} seeds — Q switches seeds; buy more at the shop.`);
    state.seeds[crop]--; tile.crop = { type: crop, age: 0 }; audio.beep(300, 0.06);
  }
}

// ---------------------------------------------------------------- mining
function mine(tile) {
  if (tile.t === 13) {
    const id = tile.ore, ore = ORES[id];
    if (ore.hard > state.pickLevel) return say(`Too hard! Your pickaxe needs an upgrade (${ore.name}).`);
    const cost = Math.max(1, 3 - Math.floor(skillLevel("mining") / 4) - (hasPerk("prospector") ? 1 : 0));
    if (state.energy < cost) return say("Too tired to mine!");
    state.energy -= cost; tile.t = 12; delete tile.ore;
    const got = 1 + (Math.random() < 0.25 + 0.03 * (skillLevel("mining") - 1) + (hasPerk("miner") ? 0.2 : 0) ? 1 : 0);
    if (hasPerk("geologist") && Math.random() < 0.08) addItem("amethyst");
    addItem(id, got); gainXp("mining", { stone: 2, copper: 4, iron: 7, gold: 12, amethyst: 16 }[id]); questEvent("mine", id, got); say(`Mined ${ore.name}!`); audio.beep(240, 0.08, "square");
  } else if (tile.t === 3 && tile.rock) {                                   // clear surface rocks
    if (state.energy < 2) return say("Too tired to mine!");
    state.energy -= 2; tile.t = 0; delete tile.rock; addItem("stone"); say("Broke a rock."); audio.beep(220, 0.08, "square");
  }
}
function enterMine(floor) {
  state.mounted = false;
  tip("mine", "Select the sword (5) and press Space to fight monsters; the pickaxe (4) breaks ore. Eat food to heal.");
  state.mineFloor = floor; maps.mine = makeMine(floor); state.map = "mine";
  const s = maps.mine.start; state.px = s.x * T + 2; state.py = s.y * T; state.fade = 0.4; fishing = null;
  say(`${maps.mine.name} — find the ladder!`, 2.5); audio.startMusic("mine"); spawnMonsters();
}
function leaveMine() {
  monsters = []; state.map = "forest"; state.px = 39 * T + 2; state.py = 6 * T; state.fx = 0; state.fy = 1; state.fade = 0.4;
  say("Forest", 1.5); audio.startMusic(mood());
}

// ---------------------------------------------------------------- combat
function spawnMonsters() {
  monsters = [];
  const m = maps.mine, floor = state.mineFloor, types = Object.entries(MONSTERS).filter(([, d]) => d.minFloor <= floor);
  const total = types.reduce((a, [, d]) => a + d.weight, 0), want = Math.min(12, 3 + Math.floor(floor / 2));
  for (let i = 0; i < 400 && monsters.length < want; i++) {
    const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), t = m.tiles[y][x];
    if (t.t !== 12 || t.kind || Math.hypot(x - m.start.x, y - m.start.y) < 7) continue;
    let r = Math.random() * total, type = types[0][0];
    for (const [id, d] of types) if ((r -= d.weight) <= 0) { type = id; break; }
    monsters.push({ type, x: x * T + 1, y: y * T + 1, hp: MONSTERS[type].hp + Math.floor(floor / 6), hurt: 0, kx: 0, ky: 0, wob: Math.random() * 6 });
  }
}
function swing() {
  if (slashCool > 0) return;
  slashCool = 0.4; slash = { t: 0.18, fx: state.fx, fy: state.fy }; audio.beep(500, 0.06, "sawtooth", 0.03);
  const cx = state.px + 6 + state.fx * 14, cy = state.py + 8 + state.fy * 14, dmg = SWORD_DAMAGE[state.swordLevel] + (hasPerk("fighter") ? 1 : 0) + (hasPerk("brute") ? 1 : 0);
  for (const mon of [...monsters]) {
    if (Math.abs(mon.x + 7 - cx) > 16 || Math.abs(mon.y + 7 - cy) > 16) continue;
    mon.hp -= dmg; mon.hurt = 0.3;
    const d = Math.hypot(mon.x - state.px, mon.y - state.py) || 1; mon.kx = (mon.x - state.px) / d * 90; mon.ky = (mon.y - state.py) / d * 90;
    if (mon.hp <= 0) {
      monsters.splice(monsters.indexOf(mon), 1);
      const def = MONSTERS[mon.type];
      gainXp("combat", { slime: 6, bat: 8, skeleton: 18 }[mon.type]); questEvent("slay", mon.type);
      if (Math.random() < 0.8) { addItem(def.drop); say(`Defeated ${def.name}! Got ${itemInfo(def.drop).name}`); } else say(`Defeated ${def.name}!`);
      audio.beep(300, 0.12, "triangle");
    } else audio.beep(220, 0.06, "square");
  }
}
const monBlocked = (x, y) => [[x + 2, y + 4], [x + 11, y + 4], [x + 2, y + 11], [x + 11, y + 11]].some(([cx, cy]) => {
  const t = tileAt(Math.floor(cx / T), Math.floor(cy / T)); return !t || t.t === 11 || t.t === 13;
});
function updateMonsters(dt) {
  if (state.map !== "mine") return;
  for (const mon of monsters) {
    const def = MONSTERS[mon.type], dx = state.px + 6 - (mon.x + 7), dy = state.py + 8 - (mon.y + 7), dist = Math.hypot(dx, dy) || 1;
    let vx = 0, vy = 0;
    if (mon.hurt > 0) { mon.hurt -= dt; vx = mon.kx; vy = mon.ky; mon.kx *= 0.9; mon.ky *= 0.9; }
    else if (dist < 120) {
      mon.wob += dt * 6; const w = mon.type === "bat" ? Math.sin(mon.wob) * 0.9 : 0;
      vx = (dx / dist + w * dy / dist) * def.speed; vy = (dy / dist - w * dx / dist) * def.speed;
    }
    if (!monBlocked(mon.x + vx * dt, mon.y)) mon.x += vx * dt;
    if (!monBlocked(mon.x, mon.y + vy * dt)) mon.y += vy * dt;
    if (dist < 11 && invuln <= 0) hurtPlayer(Math.max(1, def.dmg + Math.floor(state.mineFloor / 5) - Math.floor(skillLevel("combat") / 3)));
  }
}
function hurtPlayer(n) {
  state.hp -= n; invuln = hasPerk("acrobat") ? 1.6 : 1; audio.beep(120, 0.2, "sawtooth"); say(`Ouch! -${n} HP`, 1.2);
  if (state.hp <= 0) { const lost = Math.min(Math.floor(state.money * 0.1), 500); state.money -= lost; sleep(); say(`You were knocked out in the mine! Lost $${lost}.`, 5); }
}

// ---------------------------------------------------------------- fishing
function castRod(tile, x, y) {
  if (fishing) return fishKey(" ");
  if (tile.t !== 2) return say("Face the water to fish.");
  if (!tile.water) return say("Nothing lives here.");
  if (state.energy < 2) return say("Too tired to fish!");
  state.energy -= 2;
  fishing = { phase: "wait", t: Math.max(0.6, (1.5 + Math.random() * 3 - 0.1 * (skillLevel("fishing") - 1)) * (hasPerk("trapper") ? 0.5 : 1)), x, y, water: tile.water };
  audio.beep(300, 0.12, "sine"); say("Cast! Wait for the bite...");
  tip("fish", "When the '!' appears press Space, then press Space again while the cursor is in the green zone.");
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
    fishing = { ...fishing, phase: "reel", fish: id, cursor: 0, dir: 1, speed: 1.1 + f.diff * 0.55, zone: 0.15 + Math.random() * 0.5, width: 0.34 - f.diff * 0.06 + 0.012 * (skillLevel("fishing") - 1) + (hasPerk("angler") ? 0.1 : 0) };
    audio.beep(700, 0.08, "square");
  } else if (fishing.phase === "reel") {
    const { cursor, zone, width, fish } = fishing;
    if (cursor >= zone && cursor <= zone + width) {
      addItem(fish); state.caught++; gainXp("fishing", 8 + FISH[fish].diff * 6); questEvent("fish"); say(`Caught a ${FISH[fish].name}! ($${FISH[fish].price})`, 3);
      audio.beep(880, 0.15, "triangle"); audio.beep(1100, 0.2, "triangle");
      festProgress("derby");
      if (hasPerk("pirate") && Math.random() < 0.2) { state.money += 60; later("Treasure! +$60", 900, 2.5); }
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

// ---------------------------------------------------------------- pets, horse, sprinklers
function placePet() { petObj = state.pet ? { map: state.map, x: state.px - 10, y: state.py + 4, dir: 1, moving: false } : null; }
const petBlocked = (x, y) => { const t = tileAt(Math.floor((x + 7) / T), Math.floor((y + 8) / T)); return !t || BLOCKING.includes(t.t); };
function updatePet(dt) {
  if (!state.pet || state.map === "mine") return;
  if (!petObj || petObj.map !== state.map) return placePet();
  const dx = state.px - petObj.x, dy = state.py + 4 - petObj.y, d = Math.hypot(dx, dy);
  petObj.moving = d > 22;
  if (petObj.moving) {
    const sp = (state.mounted ? 100 : 62) * dt, vx = dx / d * sp, vy = dy / d * sp;
    if (!petBlocked(petObj.x + vx, petObj.y)) petObj.x += vx;
    if (!petBlocked(petObj.x, petObj.y + vy)) petObj.y += vy;
    if (Math.abs(dx) > 2) petObj.dir = dx > 0 ? 1 : -1;
  }
  if (d > 150) placePet();
}
const petNear = (tx, ty) => petObj && petObj.map === state.map && Math.abs(petObj.x + 7 - (tx * T + 8)) < 12 && Math.abs(petObj.y + 5 - (ty * T + 8)) < 12;
function petPet() {
  const p = state.pet;
  if (!p.petted) { p.petted = true; p.pts = Math.min(5, p.pts + 1); say(`You pet ${p.name}! (bond ${p.pts}/5)`); audio.beep(880, 0.12, "triangle"); }
  else { say(`${p.name} wags happily.`); audio.beep(600, 0.06, "triangle"); }
}
function petDigs() {                                                              // morning gift from the pet
  const p = state.pet; if (!p) return "";
  p.petted = false;
  if (Math.random() >= 0.25 + 0.1 * p.pts) return "";
  const r = Math.random(), season = seasonOf(state.day);
  if (r < 0.4) { addItem("copper"); return ` ${p.name} dug up a Copper Ore!`; }
  if (r < 0.7) { const ids = Object.keys(FORAGE).filter(k => !FORAGE[k].area && FORAGE[k].seasons.includes(season)), id = pick(ids); addItem(id); return ` ${p.name} found a ${FORAGE[id].name}!`; }
  const ok = CROP_IDS.filter(k => CROPS[k].seasons.includes(season)), k = pick(ok); state.seeds[k] += 3; return ` ${p.name} dug up 3 ${k} seeds!`;
}
function toggleMount() {
  if (!state.horse) return say("You don't have a horse. (Shop → Farm page; needs a barn)");
  if (state.mounted) { state.mounted = false; return say("Dismounted."); }
  if (["mine", "greenhouse"].includes(state.map)) return say("No riding indoors.");
  if (fishing) return;
  state.mounted = true; say("Mounted! Press H to get down."); audio.beep(400, 0.1, "triangle");
}
function placeSprinkler() {
  if (state.map !== "farm") return say("Place sprinklers on your farm.");
  const { x, y } = targetTile(), tile = inBounds(x, y) && tileAt(x, y);
  if (!tile) return;
  if (tile.sprinkler) { addItem(tile.sprinkler === 2 ? "qsprinkler" : "sprinkler"); delete tile.sprinkler; return say("Picked up the sprinkler."); }
  const id = (state.inv.qsprinkler || 0) > 0 ? "qsprinkler" : (state.inv.sprinkler || 0) > 0 ? "sprinkler" : null;
  if (!id) return say("No sprinklers — buy them at the shop (Farm page).");
  if (![0, 1].includes(tile.t) || tile.crop) return say("Can't place it there.");
  state.inv[id]--; tile.sprinkler = id === "qsprinkler" ? 2 : 1; audio.beep(520, 0.1, "sine"); say("Sprinkler placed. It waters nearby tilled soil each night.");
}
function enterGreenhouse() { state.mounted = false; goMap("greenhouse", 7, 9); }

// ---------------------------------------------------------------- community centre
const bundleCount = b => state.bundles[b.id]?.length ?? 0;
const bundleDone = b => bundleCount(b) >= b.take;
function depositItem(b, id) {
  const dep = (state.bundles[b.id] ??= []);
  if (dep.includes(id) || dep.length >= b.take) return;
  if (!(state.inv[id] > 0)) return say(`You don't have any ${itemInfo(id).name}.`);
  state.inv[id]--; dep.push(id); audio.beep(700, 0.1, "triangle");
  if (dep.length >= b.take) {
    state.money += b.reward; say(`${b.name} complete! +$${b.reward}`, 4); audio.beep(1000, 0.3, "triangle");
    if (BUNDLES.every(bundleDone)) restoreCentre();
  }
}
function restoreCentre() {
  state.restored = true; state.money += RESTORE_PRIZE; state.ui = { type: "ending" }; audio.beep(1200, 0.6, "triangle");
}

// ---------------------------------------------------------------- tutorial, tips, map
const isTouch = () => document.body.classList.contains("touch");
const TUT_STEPS = () => {
  const t = isTouch(), press = t ? "Tap" : "Press";
  return [
    t ? "Drag the left joystick to walk. The white square shows the tile you are facing." : "Walk with WASD or the arrow keys. The white square shows the tile you are facing.",
    `${press} 1 to take the hoe, face some grass and ${t ? "tap A" : "press Space"} to till the soil.`,
    `${press} 6 for seeds (Q switches the seed type), then use them on the tilled soil.`,
    `${press} 2 for the watering can and water your seeds. Refill it at any pond.`,
    `Walk to your farmhouse door and ${t ? "tap E" : "press E"}, then choose Sleep. Watered crops grow overnight!`,
    `${t ? "Tap A" : "Press Space"} on ripe crops to harvest them, then sell them at the shipping bin next to your house (E).`,
    `Explore east to reach the Town. ${t ? "Tap MAP" : "Press N"} any time for the world map and fast travel.`,
  ];
};
const farmHas = pred => { for (const row of maps.farm.tiles) for (const t of row) if (pred(t)) return true; return false; };
const TUT_DONE = [
  () => state.tut.dist >= 48, () => farmHas(t => t.t === 1 || t.crop), () => farmHas(t => t.crop), () => farmHas(t => t.wet) || state.day > 1,
  () => state.day > 1, () => state.tut.sold || state.day >= 4, () => !!state.visited.town,
];
let tutTimer = 0;
function updateTutorial(dt) {
  const tut = state.tut;
  if (!tut.on || state.ui) return;
  tut.dist += 0;                                                                  // distance is added by the movement code
  if ((tutTimer -= dt) > 0) return;
  tutTimer = 0.5;
  while (tut.step < TUT_DONE.length && TUT_DONE[tut.step]()) { tut.step++; audio.beep(820, 0.12, "triangle"); }
  if (tut.step >= TUT_DONE.length) { tut.on = false; say("Tutorial complete! Hints can be switched back on in the pause menu (Esc).", 5); }
}
function tip(id, text) {
  if (!state.tut.on || state.tips[id]) return;
  state.tips[id] = true; state.tip = { text, t: 7 };
}
function travelTo(id) {
  if (!state.visited[id]) return say("You haven't discovered that place yet.");
  if (state.map === id) return say("You're already here.");
  state.ui = null; state.mounted = false;
  const [x, y] = TRAVEL[id]; goMap(id, x, y); state.minutes += 30; say(`Travelled to ${maps[id].name} (30 minutes pass).`, 3);
}
function openPerk() {
  const p = state.pendingPerks[0];
  state.ui = { type: "perk", skill: p.skill, tier: p.tier };
}

// ---------------------------------------------------------------- quests
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function genQuest() {
  const season = seasonOf(state.day), giver = pick(Object.keys(VILLAGERS)), r = Math.random();
  let q;
  if (r < 0.4) {
    const pool = [...CROP_IDS.filter(k => CROPS[k].seasons.includes(season)), ...Object.keys(FORAGE).filter(k => !FORAGE[k].area && FORAGE[k].seasons.includes(season)),
      "egg", "milk", ...Object.keys(FISH).filter(k => FISH[k].seasons.includes(season) && FISH[k].where.some(w => w === "pond" || w === "lake")), ...state.recipes];
    const item = pick(pool), n = 2 + Math.floor(Math.random() * 3);
    q = { type: "deliver", item, n, reward: Math.round(itemInfo(item).price * n * 1.7 + 20) };
  } else if (r < 0.65) {
    const types = Object.keys(MONSTERS).filter(k => MONSTERS[k].minFloor <= Math.max(3, state.mineBest)), item = pick(types), n = 3 + Math.floor(Math.random() * 4);
    q = { type: "slay", item, n, reward: Math.round(MONSTERS[item].hp * 10 * n + 40) };
  } else if (r < 0.85) {
    const ores = ["stone", "copper", ...(state.pickLevel >= 1 ? ["iron"] : [])], item = pick(ores), n = 5 + Math.floor(Math.random() * 4);
    q = { type: "mine", item, n, reward: Math.round(ORES[item].price * n * 1.6 + 30) };
  } else {
    const n = 3 + Math.floor(Math.random() * 3);
    q = { type: "fish", item: null, n, reward: 45 * n };
  }
  return { ...q, id: ++state.questSeq, giver, deadline: state.day + 5 + Math.floor(Math.random() * 4), progress: 0 };
}
const questText = q => q.type === "deliver" ? `Bring ${q.n} ${itemInfo(q.item).name}` : q.type === "slay" ? `Defeat ${q.n} ${MONSTERS[q.item].name}s in the mine`
  : q.type === "mine" ? `Mine ${q.n} ${ORES[q.item].name}` : `Catch ${q.n} fish`;
const questProgress = q => (q.type === "deliver" ? Math.min(q.n, state.inv[q.item] || 0) : q.progress);
function refreshBoard() { state.board = Array.from({ length: 4 }, genQuest); }
function completeQuest(q) {
  state.quests = state.quests.filter(x => x.id !== q.id);
  state.money += q.reward; addFriend(q.giver, 30);
  say(`Quest complete: ${questText(q)}! +$${q.reward} (${VILLAGERS[q.giver].name} is grateful)`, 4.5); audio.beep(1000, 0.2, "triangle"); audio.beep(1300, 0.3, "triangle");
  checkWin();
}
function questEvent(type, id, n = 1) {
  for (const q of [...state.quests]) if (q.type === type && (type === "fish" || q.item === id)) {
    q.progress += n;
    if (q.progress >= q.n) completeQuest(q); else say(`Quest: ${questText(q)} (${q.progress}/${q.n})`, 2);
  }
}
function turnIn(i) {
  const q = state.quests.filter(x => x.type === "deliver")[i];
  if (!q) return;
  if ((state.inv[q.item] || 0) < q.n) return say(`You need ${q.n} ${itemInfo(q.item).name}.`);
  state.inv[q.item] -= q.n; completeQuest(q);
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
const DANCE_KEYS = { a: "left", arrowleft: "left", w: "up", arrowup: "up", d: "right", arrowright: "right", s: "down", arrowdown: "down" };
function startDance() {
  const dirs = ["left", "up", "right", "down"];
  state.ui = { type: "dance", i: 0, score: 0, seq: Array.from({ length: 8 }, () => dirs[Math.floor(Math.random() * 4)]), t: 1.5, wait: 0.9, fb: "Get ready!", done: false };
}
function updateDance(dt) {
  const ui = state.ui;
  if (ui.done) return;
  if (ui.wait > 0) { ui.wait -= dt; return; }
  if ((ui.t -= dt) <= 0) danceJudge(null);
}
function danceJudge(dir) {
  const ui = state.ui;
  if (dir && dir === ui.seq[ui.i]) { ui.score++; ui.fb = "Perfect!"; audio.beep(600 + ui.i * 50, 0.1, "triangle"); }
  else { ui.fb = dir ? "Oops!" : "Too slow!"; audio.beep(150, 0.15, "sawtooth"); }
  ui.i++; ui.wait = 0.3; ui.t = Math.max(0.85, 1.4 - ui.i * 0.06);
  if (ui.i >= 8) {
    ui.done = true; const prize = ui.score * 35, p = partner();
    state.money += prize; state.fest.done = true; addFriend(p, ui.score * 10);
    ui.fb = `Score ${ui.score}/8 — you earn $${prize}! ${VILLAGERS[p].name} enjoyed the dance.`; audio.beep(1000, 0.25, "triangle");
  }
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
  if (f.id === "flowerdance" || f.id === "stardance") { startDance(); return ""; }
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
  let e = edibleEnergy(id);
  if (e && hasPerk("naturalist") && (CROPS[id] || FORAGE[id])) e *= 3;
  if (!e || !state.inv[id]) return;
  if (state.energy >= 100 && state.hp >= maxHp()) return say("You're not hungry.");
  state.inv[id]--; state.energy = Math.min(100, state.energy + e); state.hp = Math.min(maxHp(), state.hp + e); say(`Ate ${itemInfo(id).name}: +${e} energy & health`); audio.beep(440, 0.1, "sine");
}

// ---------------------------------------------------------------- interaction & menus
function interact() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const id = npcNear(x, y), tile = tileAt(x, y);
  if (petNear(x, y) && !id) return petPet();
  if (id === "zed") { state.ui = { type: "merchant", mode: "buy" }; audio.beep(520, 0.05); }
  else if (id) { tip("talk", "Talk once a day and give gifts (option 2) to raise friendship. Check what people like in the inventory's Friends tab."); state.ui = { type: "talk", id, mode: "menu", text: "", n: 0 }; audio.beep(520, 0.05); }
  else if (tile.kind === "bin") state.ui = { type: "bin" };
  else if (tile.kind === "home") state.ui = { type: "home" };
  else if (tile.kind === "board") { tip("board", "Accept up to 3 quests. Press J to see your journal; delivery quests are handed in here."); state.ui = { type: "board" }; audio.beep(480, 0.05); }
  else if (tile.kind === "plot") say(state.build[tile.plot] === "pending" ? `${BUILDINGS[tile.plot].name}: under construction (ready tomorrow).` : `Empty plot — buy a ${BUILDINGS[tile.plot].name} at the shop (Farm page).`, 3.5);
  else if (tile.kind === "centre") { state.ui = { type: "centre", bundle: null }; audio.beep(480, 0.05); }
  else if (tile.kind === "built" && tile.plot === "greenhouse") enterGreenhouse();
  else if (tile.kind === "built") say(tile.plot === "coop" ? `Coop: ${state.chickens}/${MAX_CHICKENS} chickens.` : tile.plot === "barn" ? `Barn: ${state.cows}/${MAX_COWS} cows.` : "Silo: 25% chance of a bonus crop at harvest.", 3);
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
    state.ui = { type: "shop", page: 0 }; audio.beep(500, 0.05); tip("shop", "Press Tab to flip pages: seeds, upgrades, farm buildings and gifts.");
  }
}

function sellStack(id, mult = 1) {
  const v = Math.round((state.inv[id] || 0) * sellPrice(id) * mult);
  state.money += v; state.inv[id] = 0; if (v > 0) state.tut.sold = true; return v;
}
function checkWin() {
  if (!state.won && state.money >= GOAL) { state.won = true; say(`You saved $${GOAL} and bought the new barn! You win (keep playing!)`, 6); audio.beep(1200, 0.4, "triangle"); }
}

const upgrade = (name, list, level, apply) => level < list.length
  ? { label: `${name} Lv${level + 1} -> Lv${level + 2}`, cost: list[level].cost, mats: list[level].mats, buy: apply }
  : { label: `${name} maxed`, cost: Infinity };
const buildItem = id => {
  const st = state.build[id], b = BUILDINGS[id];
  return st === "built" ? { label: `${b.name} (built)`, cost: Infinity }
    : st === "pending" ? { label: `${b.name} (under construction)`, cost: Infinity }
    : { label: `Build ${b.name}`, cost: b.cost, mats: b.mats, buy: () => { state.build[id] = "pending"; say(`${b.name} will be ready tomorrow!`); } };
};
const SHOP = page => page === 0
  ? CROP_IDS.map(k => ({ label: `5x ${k} seeds [${seasonTag(k)}]`, cost: CROPS[k].seed * 5, buy: () => { state.seeds[k] += 5; } }))
  : page === 1 ? [
    upgrade("Hoe", HOE_UPGRADES, state.hoeLevel, () => { state.hoeLevel++; }),
    upgrade("Watering can", CAN_UPGRADES, state.canLevel, () => { state.canLevel++; state.water = maxWater(); }),
    upgrade("Pickaxe", PICK_UPGRADES, state.pickLevel, () => { state.pickLevel++; }),
    upgrade("Sword", SWORD_UPGRADES, state.swordLevel, () => { state.swordLevel++; }),
  ] : page === 2 ? [
    buildItem("coop"), buildItem("barn"), buildItem("silo"), buildItem("greenhouse"),
    state.build.coop !== "built" ? { label: "Chicken (build a coop first)", cost: Infinity }
      : state.chickens < MAX_CHICKENS ? { label: `Chicken (${state.chickens}/${MAX_CHICKENS})`, cost: CHICKEN_COST, buy: () => { state.chickens++; makeAnimals(); } } : { label: "Coop full", cost: Infinity },
    state.build.barn !== "built" ? { label: "Cow (build a barn first)", cost: Infinity }
      : state.cows < MAX_COWS ? { label: `Cow (${state.cows}/${MAX_COWS}) — gives milk daily`, cost: COW_COST, buy: () => { state.cows++; makeAnimals(); } } : { label: "Barn full", cost: Infinity },
    ...SPRINKLER_SHOP.map(sp => ({ label: `${itemInfo(sp.id).name} (${sp.id === "qsprinkler" ? "8" : "4"} tiles; P to place)`, cost: sp.cost, mats: sp.mats, buy: () => addItem(sp.id) })),
    state.horse ? { label: "Horse (owned — H to ride)", cost: Infinity }
      : state.build.barn !== "built" ? { label: "Horse (build a barn first)", cost: Infinity }
      : { label: "Horse (ride with H, 1.8x speed)", cost: HORSE_COST, buy: () => { state.horse = true; say("You got a horse! Press H to ride."); } },
  ] : [
    { label: "Bouquet (give to someone at 8+ hearts to start dating)", cost: 200, buy: () => addItem("bouquet") },
    { label: "Wedding Pendant (give to your partner at 10 hearts)", cost: 1500, buy: () => addItem("pendant") },
    { label: "Energy Tonic (+60 energy)", cost: 60, buy: () => addItem("tonic") },
    ...(state.pet ? [{ label: `${state.pet.name} is your pet`, cost: Infinity }]
      : Object.entries(PETS).map(([kind, p]) => ({ label: `Adopt a ${kind} (${p.name})`, cost: PET_COST, buy: () => { state.pet = { kind, name: p.name, pts: 0, petted: false }; placePet(); say(`${p.name} joins your farm!`); } }))),
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
    if (k === "tab") return void (ui.page = (ui.page + 1) % SHOP_PAGES.length);
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
  } else if (ui.type === "map") {
    if (close || k === "n") return void (state.ui = null);
    const id = ["farm", "town", "forest", "beach", "desert"][num];
    if (id) travelTo(id);
  } else if (ui.type === "perk") {
    const opt = PERKS[ui.skill][ui.tier][num];
    if (!opt) return;
    state.perks[`${ui.skill}${ui.tier}`] = opt.id; state.pendingPerks.shift(); state.ui = null;
    say(`${SKILLS[ui.skill].name} perk chosen: ${opt.name}!`, 4); audio.beep(1100, 0.3, "triangle");
  } else if (ui.type === "centre") {
    if (close) { if (ui.bundle) ui.bundle = null; else state.ui = null; return; }
    if (!ui.bundle) { const b = BUNDLES[num]; if (b) ui.bundle = b.id; }
    else { const b = BUNDLES.find(x => x.id === ui.bundle), id = b.items[num]; if (id) depositItem(b, id); }
  } else if (ui.type === "ending") {
    state.ui = null;
  } else if (ui.type === "board") {
    if (close) return void (state.ui = null);
    if (num >= 0 && num <= 3 && state.board[num]) {
      if (state.quests.length >= 3) return say("You can only carry 3 quests. Finish one first.");
      state.quests.push({ ...state.board[num] }); state.board.splice(num, 1); say("Quest accepted!"); audio.beep(700, 0.1, "triangle");
    } else if (["a", "b", "c"].includes(k)) turnIn(k.charCodeAt(0) - 97);
  } else if (ui.type === "journal") {
    if (close || k === "j") state.ui = null;
  } else if (ui.type === "dance") {
    if (ui.done) { state.ui = null; checkWin(); }
    else if (DANCE_KEYS[k] && ui.wait <= 0) danceJudge(DANCE_KEYS[k]);
  } else if (ui.type === "home") {
    if (close) return void (state.ui = null);
    if (num === 0) sleep(); else if (num === 1) state.ui = { type: "cook" };
  } else if (ui.type === "cook") {
    if (close) return void (state.ui = null);
    const id = state.recipes[num];
    if (id) cook(id);
  } else if (ui.type === "inv") {
    if (["i", "escape"].includes(k) || (k === "e")) state.ui = null;
    else if (["tab", "arrowright"].includes(k)) ui.tab = (ui.tab + 1) % 3;
    else if (k === "arrowleft") ui.tab = (ui.tab + 2) % 3;
    else if (ui.tab === 0 && num >= 0 && invItems()[num]) eat(invItems()[num][0]);
  } else if (ui.type === "pause") {
    if (k === "escape" || k === "1") state.ui = null;
    else if (k === "2") { save(); state.ui = null; say("Game saved."); }
    else if (k === "3") audio.toggleMute();
    else if (k === "4") { state.tut.on = !state.tut.on; if (state.tut.on && state.tut.step >= TUT_DONE.length) state.tut.step = 0; }
    else if (k === "5") { state.ui = null; scene = "title"; titleSel = 0; audio.startMusic("title"); }
  } else if (ui.type === "talk") talkKey(k, num);
}

function talkKey(k, num) {
  const ui = state.ui, f = state.friend[ui.id], v = VILLAGERS[ui.id];
  if (k === "escape" || k === "e") return void (state.ui = null);
  if (ui.mode === "menu") {
    if (num === 0) {
      const h = hearts(ui.id), tier = h < 3 ? v.low : h < 6 ? v.mid : v.high;
      const pool = state.spouse === ui.id ? SPOUSE_LINES : [v.season[seasonOf(state.day)], ...tier];
      ui.text = `${v.name}: ${pool[(state.day + ui.n++) % pool.length]}`;
      if (!f.talked) { f.talked = true; addFriend(ui.id, 20); }
    } else if (num === 1) { ui.mode = "gift"; ui.text = ""; }
    else if (num === 2 && ui.id === "rosa") { const r = festEntry(); if (r !== "") ui.text = r ?? "Rosa: No festival entries today."; }
  } else if (ui.mode === "gift") {
    const it = invItems()[num];
    if (!it) return;
    const [id] = it, name = itemInfo(id).name;
    if (id === "bouquet" || id === "pendant") return giveSpecial(ui, id);
    if (f.gifted) return void (ui.text = `${v.name}: You already gave me something today!`);
    state.inv[id]--; f.gifted = true;
    let pts = 20, line = `${v.name}: Oh, a ${name}. Thanks!`;
    if (v.loves.includes(id)) { pts = 80; line = `${v.name}: A ${name}?! I LOVE it! Thank you!!`; }
    else if (v.likes.includes(id)) { pts = 45; line = `${v.name}: A ${name}! That's really nice of you.`; }
    else if (v.hates.includes(id)) { pts = -20; line = `${v.name}: Ugh... a ${name}? No thanks.`; }
    addFriend(ui.id, pts); ui.text = line; ui.mode = "menu"; audio.beep(pts > 0 ? 880 : 150, 0.15, "triangle");
  }
}
function giveSpecial(ui, id) {
  const v = VILLAGERS[ui.id], h = hearts(ui.id);
  ui.mode = "menu";
  if (id === "bouquet") {
    if (state.spouse || state.engaged) return void (ui.text = `${v.name}: That's sweet, but you're already committed!`);
    if (state.dating && state.dating !== ui.id) return void (ui.text = `${v.name}: You're already seeing someone else...`);
    if (state.dating === ui.id) return void (ui.text = `${v.name}: We're already dating, silly! Maybe a pendant next?`);
    if (h < 8) return void (ui.text = `${v.name}: That's lovely... but I don't know you well enough yet. (needs 8 hearts)`);
    state.inv.bouquet--; state.dating = ui.id; addFriend(ui.id, 50);
    ui.text = `${v.name}: A bouquet?! I'd love to be closer to you. We're dating now!`; audio.beep(990, 0.25, "triangle");
  } else {
    if (state.dating !== ui.id) return void (ui.text = `${v.name}: Oh... we're not at that stage. (give a bouquet first)`);
    if (h < 10) return void (ui.text = `${v.name}: I'm honored, but not quite yet. (needs 10 hearts)`);
    state.inv.pendant--; state.engaged = { id: ui.id, day: state.day + 3 };
    ui.text = `${v.name}: Yes!! Let's marry in 3 days — day ${state.day + 3}!`; audio.beep(1200, 0.4, "triangle");
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
  let extra = "";
  if (state.spouse) {                                                                // spouse waters some crops
    let n = 0;
    for (const row of maps.farm.tiles) for (const t of row) if (n < 12 && t.crop && !t.wet) { t.wet = true; n++; }
    if (n) extra += ` ${VILLAGERS[state.spouse].name} watered ${n} crops.`;
  }
  const F = maps.farm;                                                               // sprinklers & greenhouse water crops overnight
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
    const lvl = F.tiles[y][x].sprinkler; if (!lvl) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || (lvl === 1 && dx && dy)) continue;
      const t = F.tiles[y + dy]?.[x + dx]; if (t?.t === 1) t.wet = true;
    }
  }
  for (const row of maps.greenhouse.tiles) for (const t of row) if (t.t === 1) t.wet = true;
  for (const m of Object.values(maps)) for (const row of m.tiles) for (const tile of row) {
    if (tile.crop && tile.wet) { tile.crop.age++; if (hasPerk("agri") && Math.random() < 0.25) tile.crop.age++; }
    tile.wet = false;
  }
  state.day++; state.minutes = 6 * 60; state.energy = 100;
  state.map = "farm"; state.px = 7 * T; state.py = 7 * T; state.fx = 0; state.fy = 1; fishing = null; state.ui = null;
  for (const id in state.friend) { state.friend[id].talked = false; state.friend[id].gifted = false; }
  state.hp = maxHp(); invuln = 0; monsters = [];
  const expired = state.quests.filter(q => q.deadline < state.day);
  if (expired.length) { state.quests = state.quests.filter(q => q.deadline >= state.day); extra += ` ${expired.length} quest(s) expired.`; }
  refreshBoard();
  state.mounted = false; extra += petDigs();
  addItem("egg", state.chickens); addItem("milk", state.cows);
  for (const [id] of PLOTS) if (state.build[id] === "pending") {                      // buildings finish overnight
    state.build[id] = "built";
    const o = maps.farm.objects.find(x => x.plot === id); if (o) o.sprite = id;
    for (const row of maps.farm.tiles) for (const t of row) if (t.plot === id) t.kind = "built";
    extra += ` Your ${BUILDINGS[id].name} is finished!`;
  }
  if (state.engaged && state.day >= state.engaged.day) {
    const v = VILLAGERS[state.engaged.id]; state.spouse = state.engaged.id; state.dating = null; state.engaged = null; state.friend[state.spouse].pts = 1000;
    extra += ` You married ${v.name}! They now live on the farm.`; audio.beep(1200, 0.5, "triangle");
  }
  const s = seasonOf(state.day);
  if (s !== old) {
    let withered = 0;
    for (const [name, m] of Object.entries(maps)) if (name !== "greenhouse") for (const row of m.tiles) for (const tile of row) if (tile.crop && !CROPS[tile.crop.type].seasons.includes(s)) { delete tile.crop; withered++; }
    extra = ` ${SEASONS[s].name} begins!${withered ? ` ${withered} crop(s) withered.` : ""}`;
  }
  audio.startMusic(mood());
  state.rain = Math.random() < (s === 3 ? 0.3 : 0.2);
  if (state.rain) tip("rain", "Rain waters your tilled soil for free today.");
  if (state.day >= 3) tip("map", "Press N for the world map. You can fast travel to places you have visited.");
  if (state.rain) for (const row of maps.farm.tiles) for (const tile of row) if (tile.t === 1) tile.wet = true;
  state.water = maxWater(); spawnForage(); startFestival();
  if (state.fest) { const f = FESTIVALS.find(x => x.id === state.fest.id); extra += ` Today: ${f.name}! ${f.desc}.`; }
  if (merchantHere()) extra += " Zed the merchant is in Town today.";
  save();
  say(`Day ${state.day}${state.rain ? (s === 3 ? " — snowing" : " — raining") : ""}.${state.chickens ? ` ${state.chickens} egg(s)` : ""}${state.cows ? ` ${state.cows} milk` : ""}${state.chickens || state.cows ? " collected." : ""}${extra}`, extra ? 7 : 3);
}

// ---------------------------------------------------------------- update
function goMap(to, tx, ty) {
  state.visited[to] = true;
  if (to === "town") tip("town", "The Town has a shop (seeds, upgrades, farm buildings), a quest board and villagers to befriend.");
  state.map = to; state.px = tx * T + 2; state.py = ty * T; state.fade = 0.4; fishing = null;
  say(maps[to].name, 1.5); audio.beep(440, 0.08, "triangle"); audio.startMusic(areaMood());
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
  updateNpcs(dt); updateFishing(dt); updatePet(dt);
  if (state.tip && (state.tip.t -= dt) <= 0) state.tip = null;
  updateTutorial(dt);
  if (!state.ui && !fishing && state.pendingPerks.length) openPerk();
  if (state.energy < 25) tip("energy", "Low energy! Eat food (open the inventory with I, then press a number) or sleep at home.");
  slashCool -= dt; invuln -= dt; if (slash && (slash.t -= dt) <= 0) slash = null;
  for (const c of animals) {
    const w = c.kind === "cow" ? 20 : 12, h = c.kind === "cow" ? 14 : 10, sp = c.kind === "cow" ? 12 : 20;
    c.t -= dt;
    if (c.t <= 0) { c.t = 1 + Math.random() * 3; c.vx = (Math.random() - .5) * sp; c.vy = (Math.random() - .5) * sp; }
    c.x = Math.max(c.r.x0 * T, Math.min((c.r.x1 + 1) * T - w, c.x + c.vx * dt));
    c.y = Math.max(c.r.y0 * T, Math.min((c.r.y1 + 1) * T - h, c.y + c.vy * dt));
  }
  if (state.ui?.type === "dance") updateDance(dt);
  if (state.ui) { moving = false; return; }
  updateMonsters(dt);

  const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  moving = !!(dx || dy);
  if (moving && fishing) {
    if (fishing.phase === "wait") { fishing = null; say("Reeled in."); } else moving = false;   // can't walk mid-reel
  }
  if (moving) {
    walkT += dt;
    if (dx && dy) { state.fx = 0; state.fy = dy; } else { state.fx = dx; state.fy = dy; }
    const sp = (state.mounted ? 125 : 70) * dt;
    state.tut.dist += sp;
    for (const [mx, my] of [[dx * sp, 0], [0, dy * sp]]) {
      const nx = state.px + mx, ny = state.py + my;
      const corners = [[nx + 3, ny + 6], [nx + 9, ny + 6], [nx + 3, ny + 13], [nx + 9, ny + 13]];
      if (!corners.some(([cx, cy]) => blocked(Math.floor(cx / T), Math.floor(cy / T))) && !npcOverlap(nx, ny)) { state.px = nx; state.py = ny; }
    }
  }
  const fx = Math.floor((state.px + 6) / T), fy = Math.floor((state.py + 10) / T), here = tileAt(fx, fy);
  if (here?.forage) {                                                              // walk over forage to pick it up
    tip("forage", "Wild forage respawns every morning. Walk over it to pick it up, and sell or gift it.");
    const dbl = Math.random() < 0.04 * (skillLevel("foraging") - 1) + (hasPerk("gatherer") ? 0.2 : 0);
    addItem(here.forage, dbl ? 2 : 1); gainXp("foraging", 4); say(`Found ${FORAGE[here.forage].name}!${dbl ? " (x2!)" : ""}`); audio.beep(760, 0.1, "triangle"); delete here.forage;
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
let rec = null, uiLines = [];                                                      // text drawn by menus, kept for tap hit-testing
const txt = (s, x, y, c = "#fff", align = "left") => { ctx.fillStyle = c; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.textAlign = "left"; if (rec) rec.push({ s, x, y, align }); };

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
    else if (tile.t === 2) base = tile.water === "ocean" ? S.ocean[frame] : S.water[frame];
    else if (tile.t === 15) base = S.ghfloor[v];
    else if (tile.t === 16) base = S.ghwall;
    else if (tile.t === 14) base = S.sand[state.map === "beach" ? "beach" : "desert"][v];
    else if (tile.t === 7) base = S.pen;
    else if (tile.t === 8) base = S.path[v];
    else if (tile.t === 11) base = S.cave[v];
    else if (tile.t === 12 || tile.t === 13) base = S.cfloor[v];
    else base = S.grass[season][v];
    ctx.drawImage(base, x * T, y * T);
    if (tile.t === 13) ctx.drawImage(S.node[tile.ore], x * T, y * T);
    if (tile.kind === "ladder") ctx.drawImage(S.ladder, x * T, y * T);
    if (tile.kind === "mexit") ctx.drawImage(S.mexit, x * T, y * T);
    if (tile.sprinkler) ctx.drawImage(S.icon[tile.sprinkler === 2 ? "qsprinkler" : "sprinkler"], x * T, y * T);
    if (tile.crop) ctx.drawImage(S.crop[tile.crop.type][cropStage(tile.crop)], x * T, y * T);
    if (tile.forage) ctx.drawImage(S.icon[tile.forage], x * T, y * T + Math.round(Math.sin(clock * 3 + x) * 0.6));
    if (tile.fegg) ctx.drawImage(S.icon.fegg, x * T, y * T + Math.round(Math.sin(clock * 4 + x) * 0.8));
    if (tile.t === 3) {
      const img = tile.deco === "palm" ? S.palm : tile.deco === "cactus" ? S.cactus : tile.rock ? S.rock : S.tree[season];
      things.push({ img, x: x * T, y: (y + 1) * T - img.height, sort: (y + 1) * T });
    }
  }
  if (state.map === "town" && festivalToday()) {                                    // festival pennants
    const cols = ["#e84a6a", "#ffd23f", "#3a9ae8", "#3ddc97"];
    ctx.fillStyle = "#ddd"; ctx.fillRect(x0 * T, 12 * T + 2, (x1 - x0 + 1) * T, 1);
    for (let x = x0; x <= x1; x++) { ctx.fillStyle = cols[x % 4]; ctx.fillRect(x * T + 3, 12 * T + 3, 8, 3); ctx.fillRect(x * T + 4, 12 * T + 6, 6, 2); ctx.fillRect(x * T + 6, 12 * T + 8, 2, 1); }
  }
  for (const o of m.objects) {
    const img = S.bldg[o.sprite === "centre" && state.restored ? "centreOk" : o.sprite];
    if (o.x * T > camX + W || (o.x + 3) * T < camX) continue;
    things.push({ img, x: o.x * T, y: (o.y + o.h) * T - img.height, sort: (o.y + o.h) * T });
  }
  for (const [id, n] of Object.entries(npcs)) if (n.map === state.map) {
    const f = n.moving ? 1 + (Math.floor(clock * 6) % 2) : 0;
    things.push({ img: S.npc[id][n.dir][f], x: Math.round(n.x), y: Math.round(n.y) - 1, sort: n.y + 14 });
  }
  if (state.map === "farm") for (const c of animals) things.push({ img: c.kind === "cow" ? S.cow : S.chicken, x: Math.round(c.x), y: Math.round(c.y), sort: c.y + (c.kind === "cow" ? 14 : 10), flip: c.vx < 0 });
  if (state.map === "mine") for (const mon of monsters) things.push({ img: S.mon[mon.type][Math.floor(clock * 4) % 2], x: Math.round(mon.x), y: Math.round(mon.y), sort: mon.y + 14, hurt: mon.hurt > 0 });
  const dir = state.fy > 0 ? 0 : state.fy < 0 ? 1 : state.fx > 0 ? 2 : 3;
  const pf = moving ? 1 + (Math.floor(walkT * 8) % 2) : 0;
  if (petObj && petObj.map === state.map && state.map !== "mine") things.push({ img: S.pet[state.pet.kind][petObj.moving ? Math.floor(clock * 8) % 2 : 0], x: Math.round(petObj.x), y: Math.round(petObj.y), sort: petObj.y + 11, flip: petObj.dir < 0 });
  if (state.mounted) {
    const side = dir >= 2, img = side ? S.horse.side : dir === 0 ? S.horse.front : S.horse.back;
    things.push({ img, x: Math.round(state.px) - (side ? 8 : 1), y: Math.round(state.py) - (side ? 3 : 6), sort: state.py + 14, flip: dir === 3 });
  }
  things.push({ img: S.player[dir][pf], x: Math.round(state.px) - 2, y: Math.round(state.py) - 1 - (state.mounted ? 7 : 0), sort: state.py + 14.5 });
  things.sort((a, b) => a.sort - b.sort);
  for (const t of things) {
    if (t.hurt) ctx.globalAlpha = 0.55;
    if (t.flip) { ctx.save(); ctx.translate(t.x + t.img.width, t.y); ctx.scale(-1, 1); ctx.drawImage(t.img, 0, 0); ctx.restore(); }
    else ctx.drawImage(t.img, t.x, t.y);
    ctx.globalAlpha = 1;
  }
  if (slash) {                                                                      // sword arc
    const a = Math.atan2(slash.fy, slash.fx), p = 1 - slash.t / 0.18, cx = state.px + 6, cy = state.py + 8;
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 15, a - 1.1 + p * 1.2, a - 0.1 + p * 1.2); ctx.stroke(); ctx.lineWidth = 1;
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
  } else if (state.map !== "greenhouse") {
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
  ctx.fillStyle = "#400"; ctx.fillRect(W - 66, 3, 62, 7); ctx.fillStyle = state.hp > 30 ? "#e03a3a" : "#ff8a3a"; ctx.fillRect(W - 66, 3, Math.max(0, state.hp) / maxHp() * 62, 7); txt("HP", W - 80, 10, "#f99");
  if (state.quests.length) txt(`J: ${state.quests.length} quest${state.quests.length > 1 ? "s" : ""}`, W - 4, 23, "#cfe8ff", "right");
  if (invuln > 0.6) { ctx.fillStyle = "rgba(220,30,30,.25)"; ctx.fillRect(0, 0, W, H); }
  if (state.fest) {
    const f = FESTIVALS.find(x => x.id === state.fest.id);
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 14, 170, 11);
    txt(state.fest.done ? `* ${f.name}: done!` : `* ${f.name}: ${state.fest.progress}/${f.goal}`, 4, 23, "#ffd23f");
  }

  const items = invItems(), bag = items.slice(0, 6).map(([k, n]) => `${n} ${itemInfo(k).name}`).join(", ");
  if (bag) { const t = `Bag: ${bag}${items.length > 6 ? "…" : ""}`; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(2, H - 38, ctx.measureText(t).width + 4, 12); txt(t, 4, H - 28, "#cfe8ff"); }
  const tile = inBounds(tx, ty) ? tileAt(tx, ty) : null, id = tile && npcNear(tx, ty);
  const hint = !tile ? "" : petNear(tx, ty) && !id ? `E: pet ${state.pet.name}` : id ? `E: ${id === "zed" ? "trade with Zed" : "talk to " + VILLAGERS[id].name}` : tile.crop && tile.crop.age >= CROPS[tile.crop.type].days ? "Space: harvest" : tile.kind === "home" ? "E: sleep / cook" : tile.kind === "centre" ? "E: community centre" : tile.kind === "built" && tile.plot === "greenhouse" ? "E: enter greenhouse"
    : tile.kind === "bin" ? "E: sell goods" : tile.kind === "shop" ? "E: shop" : tile.kind === "mine" ? "E: enter mine" : tile.kind === "ladder" ? "E: go down" : tile.kind === "mexit" ? "E: leave mine"
    : tile.t === 2 && TOOLS[state.sel] === "rod" ? "Space: fish" : tile.t === 13 && TOOLS[state.sel] === "pick" ? "Space: mine" : "";
  if (hint) { const w = ctx.measureText(hint).width + 4; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(W - w - 2, H - 38, w, 12); txt(hint, W - 4, H - 28, "#ffd23f", "right"); }

  const sw = 80;
  TOOLS.forEach((t, i) => {
    const x = 2 + i * sw, sel = i === state.sel;
    ctx.fillStyle = sel ? "#ffd23f" : "#3b3550"; ctx.fillRect(x, H - 22, sw - 2, 20);
    const icon = t === "seeds" ? S.icon[curSeed()] : S.icon[t];
    ctx.drawImage(icon, x + 1, H - 20);
    const label = t === "hoe" ? `Hoe L${state.hoeLevel + 1}` : t === "can" ? `Can L${state.canLevel + 1}` : t === "rod" ? "Rod" : t === "pick" ? `Pick L${state.pickLevel + 1}` : t === "sword" ? `Sword L${state.swordLevel + 1}` : `${curSeed()} x${state.seeds[curSeed()]}`;
    ctx.font = "8px monospace"; txt(`${i + 1} ${label}`, x + 18, H - 9, sel ? "#000" : "#fff"); ctx.font = "9px monospace";
  });

  if (fishing?.phase === "reel") {                                                  // timing bar
    const bx = W / 2 - 70, by = H - 66;
    ctx.fillStyle = "rgba(0,0,0,.8)"; ctx.fillRect(bx - 40, by - 14, 220, 30);
    txt(`${FISH[fishing.fish].name} on the line! Space in the green`, W / 2, by - 4, "#fff", "center");
    ctx.fillStyle = "#334"; ctx.fillRect(bx, by + 2, 140, 8);
    ctx.fillStyle = "#3ddc97"; ctx.fillRect(bx + fishing.zone * 140, by + 2, fishing.width * 140, 8);
    ctx.fillStyle = "#fff"; ctx.fillRect(bx + fishing.cursor * 140 - 1, by, 3, 12);
  }
  if (state.tut.on && state.tut.step < TUT_DONE.length && !state.ui) {
    const lines = wrap(`Tutorial ${state.tut.step + 1}/${TUT_DONE.length}: ${TUT_STEPS()[state.tut.step]}`, 440), top = H - 44 - lines.length * 11;
    ctx.fillStyle = "rgba(20,60,50,.88)"; ctx.fillRect(10, top, 460, lines.length * 11 + 5); ctx.strokeStyle = "#3ddc97"; ctx.strokeRect(10.5, top + .5, 459, lines.length * 11 + 4);
    lines.forEach((l, i) => txt(l, 16, top + 10 + i * 11, "#e8fff4"));
  }
  if (state.tip && !state.ui) {
    const lines = wrap(`TIP: ${state.tip.text}`, 440);
    ctx.fillStyle = "rgba(60,40,10,.9)"; ctx.fillRect(10, 40, 460, lines.length * 11 + 5); ctx.strokeStyle = "#ffd23f"; ctx.strokeRect(10.5, 40.5, 459, lines.length * 11 + 4);
    lines.forEach((l, i) => txt(l, 16, 50 + i * 11, "#fff2c8"));
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
  const ui = state.ui;
  if (!ui) { uiLines = []; return; }
  rec = [];
  drawUiInner(ui);
  uiLines = rec; rec = null;
}
function drawUiInner(ui) {
  ctx.font = "9px monospace";
  if (ui.type === "shop") {
    panel(40, 22, 400, 214, `SHOP: ${SHOP_PAGES[ui.page]} (page ${ui.page + 1}/${SHOP_PAGES.length})  $${state.money}  Tab: next  E: close`);
    SHOP(ui.page).forEach((it, i) => {
      const ok = it.cost !== Infinity && state.money >= it.cost && hasMats(it.mats);
      txt(`${i + 1}. ${it.label}${it.cost === Infinity ? "" : "  $" + it.cost}${it.mats ? " + " + matsText(it.mats) : ""}`, 48, 36 + (i + 1) * 14, it.cost === Infinity ? "#777" : ok ? "#fff" : "#f87171");
    });
    txt(`Now: ${SEASONS[seasonOf(state.day)].name}. Out-of-season crops wither when the season changes. Ore and stone come from the mine.`, 48, 228, "#9aa");
  } else if (ui.type === "bin") {
    panel(60, 30, 360, 200, "SELL  (number sells a stack, A sells all, E to close)");
    const items = invItems();
    if (!items.length) txt("Nothing to sell — harvest, forage, fish or mine!", 68, 56, "#777");
    items.slice(0, 9).forEach(([id, n], i) => { ctx.drawImage(S.icon[id], 68, 41 + (i + 1) * 14 - 10, 12, 12); txt(`${i + 1}. ${n}x ${itemInfo(id).name}  = $${n * sellPrice(id)}`, 84, 40 + (i + 1) * 14); });
  } else if (ui.type === "merchant") {
    panel(60, 30, 360, 200, `ZED THE MERCHANT  $${state.money}  (${ui.mode.toUpperCase()} — Tab to switch, E to close)`);
    if (ui.mode === "buy") merchantBuy().forEach((it, i) => txt(`${i + 1}. ${it.label}${it.cost === Infinity ? "" : "  $" + it.cost}`, 68, 40 + (i + 1) * 14, it.cost === Infinity ? "#777" : state.money >= it.cost ? "#fff" : "#f87171"));
    else {
      txt("Zed pays 1.5x for everything:", 68, 52, "#8f8");
      invItems().slice(0, 9).forEach(([id, n], i) => { ctx.drawImage(S.icon[id], 68, 55 + (i + 1) * 14 - 10, 12, 12); txt(`${i + 1}. ${n}x ${itemInfo(id).name} = $${Math.round(n * sellPrice(id) * 1.5)}`, 84, 54 + (i + 1) * 14); });
    }
  } else if (ui.type === "map") drawMap();
  else if (ui.type === "perk") {
    const opts = PERKS[ui.skill][ui.tier];
    panel(50, 60, 380, 130, `${SKILLS[ui.skill].name} level ${ui.tier}: choose a perk`);
    opts.forEach((o, i) => { txt(`${i + 1}. ${o.name}`, 62, 92 + i * 34, "#ffd23f"); txt(o.desc, 76, 105 + i * 34, "#cfe8ff"); });
    txt("This choice is permanent.", 62, 176, "#9aa");
  } else if (ui.type === "centre") drawCentre(ui);
  else if (ui.type === "ending") drawEnding();
  else if (ui.type === "board") {
    panel(30, 18, 420, 226, "TOWN BOARD  (1-4 accept, A/B/C turn in, E close)");
    state.board.forEach((q, i) => {
      txt(`${i + 1}. ${questText(q)}  — $${q.reward}  (due day ${q.deadline}, for ${VILLAGERS[q.giver].name})`.slice(0, 74), 38, 38 + i * 13, "#fff");
    });
    if (!state.board.length) txt("The board is empty. Check back tomorrow.", 38, 38, "#777");
    txt(`Your quests (${state.quests.length}/3):`, 38, 100, "#ffd23f");
    const deliverIdx = {};
    state.quests.forEach((q, i) => {
      const L = q.type === "deliver" ? String.fromCharCode(65 + state.quests.filter(x => x.type === "deliver").indexOf(q)) : "-";
      txt(`${L}. ${questText(q)} (${questProgress(q)}/${q.n}) $${q.reward}  due day ${q.deadline}`.slice(0, 74), 38, 114 + i * 13, q.type === "deliver" && questProgress(q) >= q.n ? "#8f8" : "#cfe8ff");
    });
    txt("Deliver quests: bring the items here and press A/B/C. Others complete automatically.", 38, 232, "#9aa");
  } else if (ui.type === "journal") {
    panel(40, 40, 400, 170, "QUEST JOURNAL  (J / E to close)");
    if (!state.quests.length) txt("No active quests. Visit the board in Town (next to the plaza).", 50, 66, "#777");
    state.quests.forEach((q, i) => {
      txt(`${questText(q)}  (${questProgress(q)}/${q.n})`, 50, 64 + i * 28, "#fff");
      txt(`Reward $${q.reward} — for ${VILLAGERS[q.giver].name} — due day ${q.deadline}${q.type === "deliver" ? " — turn in at the board" : ""}`, 50, 76 + i * 28, "#9aa");
    });
  } else if (ui.type === "dance") drawDance(ui);
  else if (ui.type === "home") {
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
    panel(140, 66, 200, 124, "PAUSED");
    ["1. Resume", "2. Save game", `3. Music: ${audio.isMuted() ? "off" : "on"}`, `4. Tutorial hints: ${state.tut.on ? "on" : "off"}`, "5. Quit to title"].forEach((s, i) => txt(s, 160, 94 + i * 16));
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

function drawMap() {
  panel(30, 14, 420, 232, "WORLD MAP  (number = fast travel, 30 min; N / E: close)");
  const here = state.map === "greenhouse" ? "farm" : state.map === "mine" ? "forest" : state.map;
  const box = { forest: [190, 38, 100, 40], town: [190, 104, 100, 40], farm: [58, 104, 100, 40], desert: [322, 104, 100, 40], beach: [190, 170, 100, 40] };
  ctx.strokeStyle = "#665f88"; ctx.lineWidth = 2;
  for (const [a, b] of [["farm", "town"], ["town", "desert"], ["forest", "town"], ["town", "beach"]]) {
    const A = box[a], B = box[b]; ctx.beginPath(); ctx.moveTo(A[0] + A[2] / 2, A[1] + A[3] / 2); ctx.lineTo(B[0] + B[2] / 2, B[1] + B[3] / 2); ctx.stroke();
  }
  ctx.lineWidth = 1;
  const fill = { forest: "#2e6b3a", town: "#7a5a3a", farm: "#4a8a3a", desert: "#b8884a", beach: "#3a7ab8" };
  for (const [id, [x, y, w, h]] of Object.entries(box)) {
    const seen = state.visited[id], cur = id === here;
    ctx.fillStyle = seen ? fill[id] : "#3a3a48"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cur ? `rgba(255,255,255,${0.6 + 0.4 * Math.sin(clock * 6)})` : "#14121f"; ctx.lineWidth = cur ? 3 : 1; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 1;
    txt(seen ? maps[id].name : "???", x + w / 2, y + 15, "#fff", "center");
    const who = Object.entries(npcs).filter(([, n]) => n.map === id).map(([k]) => (k === "zed" ? "Zed" : VILLAGERS[k].name));
    if (seen && who.length) txt(who.join(", ").slice(0, 20), x + w / 2, y + 30, "#ffe9a8", "center");
    if (cur) txt("YOU", x + w / 2, y - 3, "#ffd23f", "center");
  }
  if (state.build.greenhouse === "built") txt("+ Greenhouse", 108, 156, "#9aa", "center");
  txt("+ Mine (Forest)", 340, 62, "#9aa", "center");
  txt("1. Farm   2. Town   3. Forest   4. Beach   5. Desert", 240, 232, "#fff", "center");
}
function drawCentre(ui) {
  const done = BUNDLES.filter(bundleDone).length;
  panel(30, 18, 420, 226, `COMMUNITY CENTRE ${state.restored ? "(restored!)" : `(${done}/${BUNDLES.length} bundles)`}  E: ${ui.bundle ? "back" : "close"}`);
  if (!ui.bundle) {
    BUNDLES.forEach((b, i) => txt(`${i + 1}. ${b.name}  ${bundleCount(b)}/${b.take}  — reward $${b.reward}${bundleDone(b) ? "  DONE" : ""}`, 40, 42 + i * 16, bundleDone(b) ? "#8f8" : "#fff"));
    txt(`Complete all bundles to restore the centre and win $${RESTORE_PRIZE}!`, 40, 42 + BUNDLES.length * 16 + 10, "#ffd23f");
    txt("Pick a bundle, then press an item's number to deposit it (any " + "N of the list).", 40, 42 + BUNDLES.length * 16 + 24, "#9aa");
  } else {
    const b = BUNDLES.find(x => x.id === ui.bundle), dep = state.bundles[b.id] || [];
    txt(`${b.name}: deposit any ${b.take} (${dep.length}/${b.take})  reward $${b.reward}`, 40, 40, "#ffd23f");
    b.items.slice(0, 9).forEach((id, i) => {
      const got = dep.includes(id), have = state.inv[id] || 0;
      ctx.drawImage(S.icon[id], 40, 46 + i * 16, 12, 12);
      txt(`${i + 1}. ${itemInfo(id).name}  ${got ? "- deposited" : have ? `(you have ${have})` : ""}`, 58, 56 + i * 16, got ? "#8f8" : have ? "#fff" : "#777");
    });
  }
}
function drawEnding() {
  panel(50, 30, 380, 200, "THE COMMUNITY CENTRE IS RESTORED!");
  const lines = [`The whole valley gathers to celebrate what you've built.`, ``, `Days played: ${state.day}   Money: $${state.money}   Fish caught: ${state.caught}`,
    `Skills: ${Object.keys(SKILLS).map(k => `${SKILLS[k].name} ${skillLevel(k)}`).join(", ")}`, `Married: ${state.spouse ? VILLAGERS[state.spouse].name : "no"}   Pet: ${state.pet ? state.pet.name : "none"}   Horse: ${state.horse ? "yes" : "no"}`, ``,
    `You received $${RESTORE_PRIZE} as a thank-you.`, `Thanks for playing Tiny Valley! Keep farming as long as you like.`, ``, `(press any key)`];
  lines.forEach((l, i) => wrap(l, 360).forEach(w => txt(w, 60, 54 + i * 14, i === 7 ? "#ffd23f" : "#fff")));
}
function drawArrow(dir, cx, cy, size, color) {
  const rot = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir];
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(0, -size); ctx.lineTo(0, -size / 2.5); ctx.lineTo(-size, -size / 2.5); ctx.lineTo(-size, size / 2.5); ctx.lineTo(0, size / 2.5); ctx.lineTo(0, size); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawDance(ui) {
  const p = partner(), v = VILLAGERS[p];
  panel(110, 50, 260, 170, `${festivalToday()?.name ?? "Dance"} — with ${v.name}`);
  ctx.drawImage(S.player[0][0], 160 + Math.sin(clock * 6) * 4, 140); ctx.drawImage(S.npc[p][0][0], 304 - Math.sin(clock * 6) * 4, 140);
  txt(`Match the arrow! (WASD / arrows)  ${Math.min(ui.i + 1, 8)}/8`, 240, 80, "#cfe8ff", "center");
  if (!ui.done && ui.wait <= 0) {
    const frac = Math.max(0, ui.t / Math.max(0.85, 1.4 - ui.i * 0.06));
    drawArrow(ui.seq[ui.i], 240, 112, 16, "#ffd23f");
    ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(240, 112, 14 + frac * 14, 0, 7); ctx.stroke();
  }
  txt(ui.fb, 240, 180, ui.fb.startsWith("Perfect") ? "#8f8" : "#fff", "center");
  txt(`Score ${ui.score}`, 240, 196, "#ffd23f", "center");
  if (ui.done) txt("Press any key", 240, 212, "#9aa", "center");
}

function drawInventory(ui) {
  panel(30, 14, 420, 230, `${["[ITEMS]  friends  skills", " items  [FRIENDS]  skills", " items  friends  [SKILLS]"][ui.tab]}   (Tab: switch, I/E: close)`);
  let y = 40;
  if (ui.tab === 0) {
    const row = (t, c = "#fff") => { txt(t, 40, y, c); y += 12; };
    row(`Hoe L${state.hoeLevel + 1}  Can L${state.canLevel + 1} (${maxWater()})  Pick L${state.pickLevel + 1}  Sword L${state.swordLevel + 1}`, "#cfe8ff");
    row(`Fish caught ${state.caught}  Mine best ${state.mineBest}F`, "#cfe8ff");
    y += 2; row("Seeds (Q switches)        Season  Sell", "#ffd23f");
    CROP_IDS.forEach((k, i) => {
      ctx.drawImage(S.icon[k], 40, y - 10, 12, 12);
      const c = i === state.seedSel ? "#ffd23f" : state.seeds[k] ? "#fff" : "#777";
      txt(`${k} x${state.seeds[k]}`, 56, y, c); txt(seasonTag(k), 140, y, c); txt(`$${CROPS[k].price}`, 190, y, c); y += 12;
    });
    let ry = 40;
    const items = invItems(); let total = 0;
    for (const [id, n] of items) total += n * sellPrice(id);
    txt("Bag (number = eat)", 250, ry, "#ffd23f"); ry += 12;
    if (!items.length) txt("(empty)", 250, ry, "#777");
    items.slice(0, 11).forEach(([id, n], i) => {
      ctx.drawImage(S.icon[id], 250, ry - 10, 12, 12);
      txt(`${i < 9 ? i + 1 + "." : "  "} ${n}x ${itemInfo(id).name}`.slice(0, 26), 266, ry, edibleEnergy(id) ? "#fff" : "#aab"); ry += 12;
    });
    if (items.length > 11) { txt(`…and ${items.length - 11} more`, 250, ry, "#777"); ry += 12; }
    if (items.length) txt(`Worth $${total}`, 250, ry + 2, "#8f8");
  } else if (ui.tab === 2) {
    for (const [id, sk] of Object.entries(SKILLS)) {
      const lv = skillLevel(id), xp = state.xp[id], lo = XP_TABLE[lv - 1], hi = XP_TABLE[lv] ?? lo + 1, frac = lv >= 10 ? 1 : (xp - lo) / (hi - lo);
      txt(`${sk.name}  Lv ${lv}${lv >= 10 ? " (max)" : `  (${xp}/${hi} xp)`}`, 40, y, "#fff");
      ctx.fillStyle = "#334"; ctx.fillRect(40, y + 3, 160, 6); ctx.fillStyle = "#3ddc97"; ctx.fillRect(40, y + 3, 160 * frac, 6);
      txt(sk.perk, 40, y + 20, "#9aa"); y += 36;
    }
    txt(`Max HP ${maxHp()}`, 40, y, "#ff7a9c");
    const chosen = Object.entries(state.perks).map(([k, id]) => { const sk = k.replace(/\d+$/, ''), tier = k.slice(sk.length); return PERKS[sk][tier].find(p => p.id === id).name; });
    txt(`Perks: ${chosen.length ? chosen.join(", ") : "none yet (levels 5 and 10)"}`.slice(0, 70), 40, y + 12, "#ffd23f");
  } else {
    for (const [id, v] of Object.entries(VILLAGERS)) {
      ctx.drawImage(S.npc[id][0][0], 40, y - 12);
      txt(`${v.name} (${v.job})`, 60, y - 2); txt(`${"*".repeat(hearts(id))}${".".repeat(10 - hearts(id))}  ${hearts(id)}/10`, 60, y + 8, "#ff7a9c");
      txt(`Loves: ${v.loves.slice(0, 3).map(i => itemInfo(i).name).join(", ")}`, 215, y - 2, "#8f8"); txt(`Likes: ${v.likes.slice(0, 3).map(i => itemInfo(i).name).join(", ")}`, 215, y + 8, "#cfe8ff");
      y += 24;
    }
    y += 2;
    const rel = state.spouse ? `Married to ${VILLAGERS[state.spouse].name}` : state.engaged ? `Engaged to ${VILLAGERS[state.engaged.id].name} — wedding on day ${state.engaged.day}` : state.dating ? `Dating ${VILLAGERS[state.dating].name}` : "Single (8 hearts + bouquet to date, 10 + pendant to marry)";
    txt(rel, 40, y, "#ff7a9c");
    txt(`Recipes: ${state.recipes.map(r => DISHES[r].name).join(", ")}`.slice(0, 74), 40, y + 12, "#ffd23f");
    txt(`Chickens ${state.chickens}/${MAX_CHICKENS}  Cows ${state.cows}/${MAX_COWS}  Goal $${state.money}/${GOAL}  Zed every ${MERCHANT.every}th day`, 40, y + 24, "#cfe8ff");
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

// ---------------------------------------------------------------- pointer / touch input
// Menu lines that start with "N. " (or "A. ") are tappable; the hotbar and title menu are too.
function hitUi(cx, cy) {
  ctx.font = "9px monospace";
  for (const e of uiLines) {
    if (cy < e.y - 9 || cy > e.y + 3) continue;
    const total = ctx.measureText(e.s).width, x0 = e.align === "center" ? e.x - total / 2 : e.align === "right" ? e.x - total : e.x, re = /\S.*?(?=\s{3,}|$)/g;
    let m;
    while ((m = re.exec(e.s))) {
      const sx = x0 + ctx.measureText(e.s.slice(0, m.index)).width, ex = sx + ctx.measureText(m[0]).width, k = /^([1-9A-C])\.\s/.exec(m[0]);
      if (k && cx >= sx - 2 && cx <= ex + 2) return k[1].toLowerCase();
    }
  }
  return null;
}
canvas.addEventListener("pointerdown", e => {
  const r = canvas.getBoundingClientRect(), cx = (e.clientX - r.left) * W / r.width, cy = (e.clientY - r.top) * H / r.height;
  if (scene === "title") {
    const opts = titleOptions(), i = Math.floor((cy - 98) / 16);
    if (i >= 0 && i < opts.length && cx > W / 2 - 70 && cx < W / 2 + 70) { titleSel = i; dispatchKey("enter"); }
    return;
  }
  if (state.ui) { const k = hitUi(cx, cy); if (k) dispatchKey(k); return; }
  if (cy >= H - 24 && cy <= H - 2) { const i = Math.floor((cx - 2) / 80); if (i >= 0 && i < TOOLS.length) dispatchKey(String(i + 1)); }
});
initTouch();
let lastUiOpen = null, lastTitle = null;
function syncBodyClasses() {
  const uiOpen = scene === "game" && !!state?.ui, title = scene === "title";
  if (uiOpen !== lastUiOpen) { document.body.classList.toggle("ui-open", uiOpen); lastUiOpen = uiOpen; }
  if (title !== lastTitle) { document.body.classList.toggle("scene-title", title); lastTitle = title; }
}

// ---------------------------------------------------------------- boot
if (location.search.includes("debug")) window.__farm = {
  S, get state() { return state; }, get maps() { return maps; }, get npcs() { return npcs; }, get fishing() { return fishing; },
  sleep, useTool, startGame, goMap, enterMine, interact, cook, eat, startFestival, festProgress, swing, get monsters() { return monsters; }, get animals() { return animals; }, travelTo, hasPerk, openPerk, startDance, danceJudge, giveSpecial, placePet, depositItem, toggleMount, placeSprinkler, genQuest, refreshBoard, questEvent, gainXp, skillLevel, turnIn, completeQuest,
};
particles = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 60 + Math.random() * 60 }));
let last = performance.now();
(function frame(now) {
  update(Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now;
  ctx.font = "9px monospace";
  if (scene === "title") drawTitle(); else drawWorld();
  syncBodyClasses();
  requestAnimationFrame(frame);
})(last);
