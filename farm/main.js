import {
  T, SEASON_LEN, GOAL, CHICKEN_COST, MAX_CHICKENS, MAX_COWS, COW_COST, HOE_UPGRADES, CAN_UPGRADES, PICK_UPGRADES, SWORD_UPGRADES, SWORD_DAMAGE,
  PEN, PASTURE, BUILDINGS, MONSTERS, MISC, HEART_REWARDS, CROPS, FORAGE, FISH, ORES, DISHES, START_RECIPES, VILLAGERS, MERCHANT,
  FESTIVALS, SPOUSE_LINES, SKILLS, XP_TABLE, PERKS, TRAVEL, BUNDLES, RESTORE_PRIZE, SPRINKLER_SHOP, HORSE_COST, PET_COST, PETS, itemInfo, edibleEnergy,
} from "./data.js";
import { SEASONS, buildSprites, hash } from "./sprites.js";
import { upgradeTown, generateWorld, makeMine, makeHouse, makeCellar, PLOTS, HOMES, makeHome, upgradeHomes, STORES, makeStore, upgradeStores } from "./world.js";
import { HOUSE, HOUSE_ENERGY, HOUSE_BUILD_DAYS, CHEST_CAP, CELLAR_CAP } from "./data.js";
import * as audio from "./audio.js";
import { initTouch, dispatchKey, stick } from "./touch.js";
import { initView, canvasPoint } from "./view.js";
import { tr, tf, lang, untranslated } from "./i18n.js";
import { HELP_HU } from "./hu.js";
import { makeIntro } from "./intro.js";
import { AXE_UPGRADES, MACHINES, machineRecipe } from "./data.js";
import { BIRTHDAYS, BIRTHDAY_MULT, HEART_EVENTS, FAMILY, FAMILY_LINES, FINALE } from "./events.js";
import { createCutscenes } from "./cutscene.js";
import { COLS, defaultSlots, ensureSlot, canHold, syncSlots, sortSlots, usedSlots, count as slotCount } from "./pack.js";
import { makeBuilder, toSpriteLook } from "./builder.js";
import { makePerson, PLAYER_LOOK } from "./art.js";
import { setSun, sunShift, sunStretch, grassDeco, waterSparkle, drawSwaying, emit, ripple, clearFx, updateFx, drawFx, vignette, sunGlow, windowGlow, litWindows } from "./fx.js";
import { settings, setSetting, onSetting, CTRL_SIZES } from "./settings.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const SLOT_KEYS = { 1: "tinyvalley-save-v10", 2: "tinyvalley-save-slot2", 3: "tinyvalley-save-slot3", 0: "tinyvalley-save-auto" };   // slot 1 keeps the original key
const META_KEY = "tinyvalley-save-meta";
const TOOL_NAMES = { axe: "Axe", hoe: "Hoe", can: "Watering Can", rod: "Fishing Rod", pick: "Pickaxe", sword: "Sword" };
const CROP_IDS = Object.keys(CROPS);
const BLOCKING = [2, 3, 4, 5, 6, 10, 11, 13, 16, 18, 19];
const FORAGE_COUNT = { farm: 8, town: 4, forest: 22, beach: 14, desert: 12, island: 12 };
const SHOP_PAGES = ["Seeds", "Upgrades", "Farm", "Gifts", "House", "Workshop", "Buildings"];
const OLIVER_PAGES = [0, 1, 2, 3], CARPENTER_PAGES = [6, 4, 5];

const S = buildSprites({
  crops: CROP_IDS, forage: Object.keys(FORAGE),
  fish: Object.fromEntries(Object.entries(FISH).map(([k, v]) => [k, v.color])),
  ores: Object.fromEntries(Object.entries(ORES).map(([k, v]) => [k, v.color])),
  dishes: Object.fromEntries(Object.entries(DISHES).map(([k, v]) => [k, v.color])), misc: Object.keys(MISC),
  npcs: { ...Object.fromEntries(Object.entries(VILLAGERS).map(([k, v]) => [k, v.look ?? { hair: v.pal.h, shirt: v.pal.r, pants: v.pal.b }])), zed: MERCHANT.look ?? { hair: MERCHANT.pal.h, shirt: MERCHANT.pal.r, pants: MERCHANT.pal.b } },
});

let fullMsgT = 0, stepT = 0, actAnim = null, petObj = null, scene = "title", titleSel = 0, maps, state, animals = [], monsters = [], slash = null, slashCool = 0, invuln = 0, npcs = {}, clock = 0, walkT = 0, moving = false, particles = [], fishing = null;

const seasonOf = day => Math.floor((day - 1) / SEASON_LEN) % 4;
const dayOfSeason = day => ((day - 1) % SEASON_LEN) + 1;
const yearOf = day => Math.floor((day - 1) / (SEASON_LEN * 4)) + 1;
const seasonTag = k => CROPS[k].seasons.map(s => SEASONS[s].name.slice(0, 2)).join("/");
const maxWater = () => CAN_UPGRADES[state.canLevel - 1]?.cap ?? 20;
const birthdayOf = id => { const b = BIRTHDAYS[id]; return b && seasonOf(state.day) === b.s && dayOfSeason(state.day) === b.d; };
const todaysBirthday = () => Object.keys(BIRTHDAYS).find(birthdayOf);
const hearts = id => Math.min(10, Math.floor(state.friend[id].pts / 100));
const readMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; } };
function slotMeta(n) {                                                               // summary of a save without parsing the whole thing
  const m = readMeta()[n]; if (m) return m;
  try { const raw = localStorage.getItem(SLOT_KEYS[n]); if (!raw) return null; const st = JSON.parse(raw).state; return { name: st.name || "", day: st.day, money: st.money, t: 0 }; } catch { return null; }
}
const hasSave = () => [1, 2, 3, 0].some(n => slotMeta(n));
const lastSave = () => [1, 2, 3, 0].map(n => [n, slotMeta(n)]).filter(([, m]) => m).sort((a, b) => b[1].t - a[1].t)[0]?.[0] ?? 1;
const cur = () => maps[state.map];
const tileAt = (x, y) => cur().tiles[y]?.[x];
const inBounds = (x, y) => x >= 0 && y >= 0 && x < cur().w && y < cur().h;
const hourNow = () => state.minutes / 60;
const mood = () => ["spring", "summer", "fall", "winter"][seasonOf(state.day)];
const festivalToday = () => FESTIVALS.find(f => f.season === seasonOf(state.day) && f.day === dayOfSeason(state.day)) ?? null;
const partner = () => state.spouse ?? "rosa";
const areaMood = () => (state.map === "island" ? "beach" : ["mine", "beach", "desert"].includes(state.map) ? state.map : mood());

// ---- skills ----
const skillLevel = id => XP_TABLE.filter(x => state.xp[id] >= x).length;                  // 1..10
const hasPerk = id => Object.values(state.perks).includes(id);
const maxEnergy = () => 100 + HOUSE_ENERGY * state.house;
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
  if (state.fest?.id === "market") m += 0.25;
  return m;
}
const sellPrice = id => Math.round(itemInfo(id).price * sellMult(id));
const merchantHere = () => state.day % MERCHANT.every === 0;
const curSlot = () => state.slots[state.sel] || null;
const curTool = () => { const sl = curSlot(); return !sl ? "none" : sl.k === "tool" ? sl.id : sl.k === "seed" ? "seeds" : "item"; };
const curSeed = () => { const sl = curSlot(); return sl?.k === "seed" ? sl.id : CROP_IDS[state.seedSel]; };
function selectSlot(i) {
  if (i < 0 || i >= state.slots.length) return;
  state.sel = i; state.row = Math.floor(i / COLS); const sl = state.slots[i];
  if (sl?.k === "seed") state.seedSel = Math.max(0, CROP_IDS.indexOf(sl.id));
}
const cycleRow = () => { const rows = state.pack / COLS; if (rows > 1) selectSlot(((state.row + 1) % rows) * COLS + (state.sel % COLS)); };

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
    axeLevel: 0, care: { coop: { fed: 0, pts: 0 }, barn: { fed: 0, pts: 0 } }, petted: { day: 0, n: 0 }, house: 0, houseWork: null, chest: {}, cellarChest: {}, pack: 12, slots: null, row: 0,
    name: "", look: { skin: PLAYER_LOOK.skin, hair: PLAYER_LOOK.hair, hairStyle: PLAYER_LOOK.hairStyle, eye: PLAYER_LOOK.eye, shirt: PLAYER_LOOK.shirt, pants: PLAYER_LOOK.pants },
  };
}

function newGame() {
  maps = generateWorld();
  state = defaultState(); state.slots = defaultSlots(state.pack); syncSlots(state, overflowDrop);
  refreshBoard(); spawnForage(); makeAnimals();
}

const careOf = b => (state.care ??= { coop: { fed: 0, pts: 0 }, barn: { fed: 0, pts: 0 } })[b];
const animalHearts = b => Math.min(10, Math.floor(careOf(b).pts / 100));
const hungry = b => (b === "coop" ? state.chickens : state.cows) > 0 && careOf(b).fed !== state.day;
function feedAnimals(b) {                                                           // E on the coop / barn: put out hay
  const n = b === "coop" ? state.chickens : state.cows, c = careOf(b);
  if (!n) return say(b === "coop" ? "The coop is empty. Buy chickens at the shop." : "The barn is empty. Buy cows at the shop.", 3);
  if (c.fed === state.day) return say(tf("{0} hearts — they are fed for today.", animalHearts(b)), 3);
  if ((state.inv.hay || 0) < n) return say(tf("You need {0} hay to feed them (buy hay at the shop's Farm page).", n), 4);
  state.inv.hay -= n; c.fed = state.day; c.pts = Math.min(1000, c.pts + 15); tip("hay", "Feed your animals hay every day: fed and happy animals give more eggs and milk.");
  audio.beep(480, 0.1, "triangle"); say(tf("You fed the {0}. They look happy!", tr(b === "coop" ? "chickens" : "cows")), 3);
}
function petAnimal(x, y) {                                                          // pet the animal under the cursor (5 per day)
  const a = animals.find(c => Math.abs(c.x + (c.kind === "cow" ? 10 : 6) - (x * T + 8)) < 14 && Math.abs(c.y + (c.kind === "cow" ? 8 : 5) - (y * T + 8)) < 12);
  if (!a) return false;
  const b = a.kind === "cow" ? "barn" : "coop", pd = state.petted ??= { day: 0, n: 0 };
  if (pd.day !== state.day) { pd.day = state.day; pd.n = 0; }
  emit("star", a.x + 8, a.y);
  if (pd.n >= 5) { say(tf("The {0} enjoys it. (hearts: {1})", tr(a.kind), animalHearts(b)), 2.5); return true; }
  pd.n++; careOf(b).pts = Math.min(1000, careOf(b).pts + 8); audio.beep(700, 0.06, "sine"); say(tf("You pet the {0}. ({1} hearts)", tr(a.kind), animalHearts(b)), 2.5); return true;
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
    const area = name === "beach" || name === "desert" || name === "island" ? name : null;
    const ids = Object.keys(FORAGE).filter(k => (area ? FORAGE[k].area === area : !FORAGE[k].area && FORAGE[k].seasons.includes(season)));
    for (const row of m.tiles) for (const t of row) delete t.forage;
    for (let i = 0, placed = 0; i < 500 && placed < Math.round((FORAGE_COUNT[name] || 0) * (hasPerk("tracker") ? 1.5 : 1)); i++) {
      const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), t = m.tiles[y][x];
      if ((t.t === 0 || t.t === 14) && !t.crop && !t.forage) { t.forage = ids[Math.floor(Math.random() * ids.length)]; placed++; }
    }
    if (name === "island") {                                                         // buried treasure to dig up with the hoe
      for (const row of m.tiles) for (const t of row) delete t.dig;
      for (let i = 0, placed = 0; i < 500 && placed < 10; i++) {
        const x = 1 + Math.floor(Math.random() * (m.w - 2)), y = 1 + Math.floor(Math.random() * (m.h - 2)), t = m.tiles[y][x];
        if (t.t === 14 && !t.forage && !t.dig) { t.dig = true; placed++; }
      }
    }
  }
}

function writeSave(n) {
  try {
    localStorage.setItem(SLOT_KEYS[n], JSON.stringify({ maps, state }));
    const meta = readMeta(); meta[n] = { name: state.name || "", day: state.day, money: state.money, t: Date.now() };
    localStorage.setItem(META_KEY, JSON.stringify(meta)); return true;
  } catch { return false; }
}
const save = () => writeSave(state.slot || 1);
function ensureAxe() {                                                               // saves from before the axe existed get one
  if (state.slots.some(s => s?.k === "tool" && s.id === "axe")) return;
  let i = state.slots.indexOf(null);
  if (i < 0) { i = state.slots.map((s, j) => (s && s.k !== "tool" ? j : -1)).filter(j => j >= 0).pop(); const s = state.slots[i]; overflowDrop(s.k, s.id, slotCount(state, s)); }
  state.slots[i] = { k: "tool", id: "axe" };
}
function ensureHouseMaps() {                                                         // saves from before the interiors existed (or after an upgrade)
  if (!maps.house || maps.house.level !== state.house) maps.house = makeHouse(state.house);
  if (!maps.cellar) maps.cellar = makeCellar();
  if (maps.town && !maps.town.v2) upgradeTown(maps.town);
  if (maps.town?.w >= 64) { upgradeHomes(maps.town); upgradeStores(maps.town); for (const k of Object.keys(STORES)) maps["store_" + k] ??= makeStore(k); for (const k of Object.keys(HOMES)) if (maps["home_" + k]?.v !== 3) maps["home_" + k] = makeHome(k); }                           // older saves get the village upgrade too
}
function load(n = lastSave()) {
  try {
    const s = JSON.parse(localStorage.getItem(SLOT_KEYS[n]));
    if (!s?.maps || !s?.state) return false;
    const d = defaultState();
    maps = s.maps;
    state = { ...d, ...s.state, seeds: { ...d.seeds, ...s.state.seeds }, xp: { ...d.xp, ...s.state.xp }, tut: { ...d.tut, ...s.state.tut }, visited: { ...d.visited, ...s.state.visited }, tips: { ...s.state.tips }, perks: { ...s.state.perks }, build: { ...s.state.build }, friend: { ...d.friend, ...s.state.friend }, ui: null };
    if (!Array.isArray(s.state.slots)) { state.pack = 36; state.slots = defaultSlots(36); }      // saves from before backpack slots keep a full-size bag
    state.sel = Math.max(0, Math.min(state.pack - 1, state.sel | 0)); state.row = Math.floor(state.sel / COLS);
    state.slot = n === 0 ? state.slot || 1 : n; ensureAxe(); for (const id of Object.keys(VILLAGERS)) state.friend[id] ??= { pts: 0, talked: false, gifted: false, rewards: 0 }; syncSlots(state, overflowDrop); ensureHouseMaps(); makeAnimals(); return true;
  } catch (e) { console.warn("Could not load the save:", e); return false; }
}

const applyLook = () => { S.player = makePerson(toSpriteLook(state.look)); };
function startGame(cont, skipIntro, slot) {
  const fresh = !(cont && load(slot ?? lastSave()));
  if (fresh) { newGame(); state.slot = slot || 1; }
  fishing = null; monsters = []; placePet();
  if (state.map === "mine") spawnMonsters();
  applyLook();
  if (fresh && !skipIntro) {                                                          // new game: build your farmer, then the story intro
    scene = "builder"; audio.startMusic("title");
    builder.begin({ look: state.look, name: "" }, res => {
      state.look = res.look; state.name = res.name; applyLook();
      scene = "intro"; intro.begin(() => { scene = "game"; audio.startMusic(areaMood()); save(); });
    });
    return;
  }
  scene = "game";
  audio.startMusic(areaMood());
}

// ---------------------------------------------------------------- input
const keys = new Set();
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(k)) e.preventDefault();
  if (!keys.has(k)) {
    if (scene === "builder" && builder.editing && !setUi) builder.key(k);                 // typing a name: letters must not trigger shortcuts
    else if (setUi) settingsKey(k);
    else if (k === "o") openSettings();
    else if (k === "m") audio.toggleMute();
    else if (slotUi) slotKey(k);
    else if (scene === "title") titleKey(k);
    else if (scene === "intro") intro.key(k);
    else if (scene === "builder") builder.key(k);
    else if (cuts.active) cuts.key(k);
    else if (state.ui) uiKey(k);
    else if (fishing && (k === " " || k === "escape")) fishKey(k);
    else if (/^[0-9=-]$/.test(k)) selectSlot(state.row * COLS + (k === "0" ? 9 : k === "-" ? 10 : k === "=" ? 11 : Number(k) - 1));
    else if (k === "tab") cycleRow();
    else if (k === "q") cycleSeed();
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

function cycleSeed() {                                                              // Q: jump to the next seed packet in the backpack
  const at = state.slots.map((sl, i) => (sl?.k === "seed" ? i : -1)).filter(i => i >= 0);
  if (!at.length) return say("No seeds — buy some at the shop.");
  selectSlot(at.find(i => i > state.sel) ?? at[0]);
}

const titleOptions = () => [...(hasSave() ? ["Continue"] : []), "New Game", ...(hasSave() ? ["Load Game"] : []), "Settings"];
function titleKey(k) {
  const opts = titleOptions();
  if (k === "arrowup" || k === "w") titleSel = (titleSel + opts.length - 1) % opts.length;
  else if (k === "arrowdown" || k === "s") titleSel = (titleSel + 1) % opts.length;
  else if (k === "enter" || k === " ") {
    audio.beep(600, 0.1, "triangle");
    const o = opts[titleSel];
    if (o === "Continue") return startGame(true);
    if (o === "New Game") { slotUi = { mode: "new", sel: 0 }; return; }
    if (o === "Load Game") { slotUi = { mode: "load", sel: 0 }; return; }
    return openSettings();
  }
  audio.startMusic("title");
}

const say = (m, t = 2.5) => { state.msg = tr(m); state.msgT = t; };
const later = (m, delay, t = 4) => setTimeout(() => { if (state) say(m, t); }, delay);
const addItem = (id, n = 1) => {
  if (!ensureSlot(state, "item", id)) { dropItem("item", id, n); return false; }                 // backpack full: it falls on the ground
  state.inv[id] = (state.inv[id] || 0) + n; return true;
};
const addSeeds = (k, n) => {
  if (!ensureSlot(state, "seed", k)) { dropItem("seed", k, n); return false; }
  state.seeds[k] += n; return true;
};
function dropItem(k, id, n) {                                                       // put a stack on a free tile next to the player
  const m = cur(), px = Math.floor((state.px + 6) / T), py = Math.floor((state.py + 10) / T);
  for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = px + dx, y = py + dy, t = inBounds(x, y) ? m.tiles[y][x] : null;
    if (t && !BLOCKING.includes(t.t) && !t.drop && !t.forage && !t.crop && !t.kind && !t.sprinkler && !t.machine && !m.warps.some(w => x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h)) {
      t.drop = { k, id, n }; say("Your inventory is full! It fell on the ground.", 3.5); return true;
    }
  }
  say("Your inventory is full — something was lost!", 3.5); return false;
}
const overflowDrop = (k, id, n) => { (k === "seed" ? state.seeds : state.inv)[id] = 0; dropItem(k, id, n); };
const holds = (k, id) => canHold(state, k, id);
const full = () => say("Your inventory is full!");
const invItems = () => Object.entries(state.inv).filter(([, n]) => n > 0).sort((a, b) => itemInfo(a[0]).name.localeCompare(itemInfo(b[0]).name));
const matsText = mats => Object.entries(mats || {}).map(([id, n]) => `${n} ${tr(itemInfo(id).name)}`).join(", ");
const hasMats = mats => Object.entries(mats || {}).every(([id, n]) => (state.inv[id] || 0) >= n);

// ---------------------------------------------------------------- geometry & npcs
const targetTile = () => ({ x: Math.floor((state.px + 6) / T) + state.fx, y: Math.floor((state.py + 10) / T) + state.fy });
const lineTiles = n => {
  const { x, y } = targetTile();
  return Array.from({ length: n }, (_, i) => [x + state.fx * i, y + state.fy * i]).filter(([a, b]) => inBounds(a, b));
};
const blocked = (tx, ty) => !inBounds(tx, ty) || BLOCKING.includes(tileAt(tx, ty).t) || !!tileAt(tx, ty).machine;
const cropStage = c => (c.age >= CROPS[c.type].days ? 4 : Math.min(3, Math.floor(c.age / CROPS[c.type].days * 4)));
const npcOverlap = (nx, ny) => Object.values(npcs).some(n => n.map === state.map && Math.abs(n.x - nx) < 9 && Math.abs(n.y - ny) < 9);
const npcNear = (tx, ty) => Object.entries(npcs).find(([, n]) => n.map === state.map && Math.abs(n.x + 8 - (tx * T + 8)) < 10 && Math.abs(n.y + 8 - (ty * T + 8)) < 10)?.[0];

const NEWCOMERS = ["nora", "hugo", "lena", "theo", "hazel"];
const homeOf = id => Object.keys(HOMES).find(k => HOMES[k].who.includes(id));
function atHome(id, h) {                                                            // when a villager is "off", they are in their house (8:00-22:00)
  const k = homeOf(id);
  if (!k || !maps["home_" + k] || h < 8 || h >= 22 || (NEWCOMERS.includes(id) && maps.town.w < 64)) return { map: null };
  const [x, y] = (h >= 21 ? HOMES[k].nspots : HOMES[k].spots)[HOMES[k].who.indexOf(id)]; return { map: "home_" + k, x, y };
}
function scheduleFor(id) {
  const h = hourNow();
  if (id === "zed") return merchantHere() && h >= 8 && h < 22 ? { map: "town", x: MERCHANT.x, y: MERCHANT.y } : { map: null };
  if (state.spouse === id) return { map: "farm", x: 9, y: 8 };                                // lives on the farm
  if (NEWCOMERS.includes(id) && maps.town.w < 64) return { map: null };                  // they live in the enlarged town (older saves keep the small one)
  const v = VILLAGERS[id], sched = v.sched, inside = () => atHome(id, h);
  if (id === "hazel" && !maps.store_carpenter) return { map: null };
  if (h < sched[0].h) return inside();
  const fh = state.fest && FESTIVALS.find(x => x.id === state.fest.id)?.host;
  if (state.fest && h >= 10 && h < 18 && fh !== id) return { map: "town", ...v.gather };    // everyone attends festivals (the host stays put)
  if (h >= 20 && homeOf(id)) return inside();                                       // evenings are spent at home
  let entry = sched[0];
  for (const e of sched) if (e.h <= h) entry = e;
  return entry.map ? entry : inside();
}
function updateNpcs(dt) {
  for (const id of [...Object.keys(VILLAGERS), "zed"]) {
    const tgt = scheduleFor(id), n = (npcs[id] ??= { map: null, x: 0, y: 0, dir: 0, moving: false });
    n.moving = false;
    if (!tgt.map) { n.map = null; continue; }
    const tx = tgt.x * T, ty = tgt.y * T;
    if (n.map !== tgt.map || maps[tgt.map]?.indoor) { n.map = tgt.map; n.x = tx; n.y = ty; continue; }              // indoors they simply move between rooms
    const dx = tx - n.x, dy = ty - n.y, sp = 30 * dt;
    if (Math.abs(dx) > 1) { n.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); n.dir = dx > 0 ? 2 : 3; n.moving = true; }
    else if (Math.abs(dy) > 1) { n.y += Math.sign(dy) * Math.min(sp, Math.abs(dy)); n.dir = dy > 0 ? 0 : 1; n.moving = true; }
  }
}

// ---------------------------------------------------------------- tools
const treeHit = {};                                                                  // when each tree was last hit (for the shake)
const shakeOff = (x, y) => { const t = treeHit[`${state.map}:${x},${y}`]; return t && clock - t < 0.25 ? Math.round(Math.sin(clock * 70) * 1.5) : 0; };
function chop(tile, x, y) {
  if (tile.sapling) return say("A young tree is growing here.");
  if (!(tile.t === 3 && !tile.rock && tile.deco !== "cactus")) return say(tile.deco === "cactus" ? "Ouch! Cacti are too prickly to chop." : tile.rock ? "Use the pickaxe on rocks." : "Nothing to chop here.");
  if (state.energy < 2) return say("Too tired to chop!");
  state.energy -= 2; actAnim = { t: 0.2, tool: "axe", fx: state.fx, fy: state.fy };
  tile.hp = (tile.hp ?? 6) - (1 + state.axeLevel);
  treeHit[`${state.map}:${x},${y}`] = clock; emit("wood", x * T + 8, y * T + 10); audio.beep(170, 0.06, "square");
  if (tile.hp > 0) return;
  const palm = tile.deco === "palm"; delete tile.hp; delete tile.deco; tile.t = palm ? 14 : 0;
  tile.sapling = { day: state.day + 6 + Math.floor(Math.random() * 3), deco: palm ? "palm" : undefined };   // trees grow back
  const wood = 8 + Math.floor(Math.random() * 5) + Math.floor((skillLevel("foraging") - 1) / 3);
  addItem("wood", wood); gainXp("foraging", 7); emit("wood", x * T + 8, y * T + 4); emit("wood", x * T + 8, y * T + 8); say(tf("Timber! +{0} wood.", wood)); audio.beep(120, 0.2, "sawtooth");
}
function placeMachine(id) {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const tile = tileAt(x, y);
  if (state.map !== "farm") return say("Place machines on your farm.");
  if (tile.t !== 0 && tile.t !== 1 || tile.crop || tile.forage || tile.drop || tile.kind || tile.sprinkler || tile.machine || tile.sapling) return say("Can't place that here.");
  tile.machine = { type: id.slice(2) }; state.inv[id]--; audio.beep(420, 0.1, "square"); say(tf("{0} placed. Press E next to it to load it.", tr(MACHINES[id.slice(2)].name)), 3);
}
function machineUse(tile) {                                                         // E on a machine: collect, check or load
  const m = tile.machine, def = MACHINES[m.type];
  if (m.out && state.day >= m.ready) {
    if (!holds("item", m.out)) return full();
    addItem(m.out); say(tf("Collected {0}!", tr(itemInfo(m.out).name)), 3); gainXp("farming", 4); audio.beep(700, 0.1, "triangle"); delete m.out; return;
  }
  if (m.out) return say(tf("{0}: {1} ready in {2} day(s).", tr(def.name), tr(itemInfo(m.out).name), m.ready - state.day), 3);
  const pick = invItems().map(([id]) => [id, machineRecipe(m.type, id)]).filter(([, r]) => r).sort((a, b) => itemInfo(b[0]).price - itemInfo(a[0]).price)[0];
  if (!pick) return say(tf("{0}: {1}", tr(def.name), tr(def.desc)), 4);
  const [id, r] = pick; state.inv[id]--; m.out = r.out; m.ready = state.day + r.days; audio.beep(360, 0.1, "square");
  say(tf("Loaded {0}. Ready in {1} days.", tr(itemInfo(id).name), r.days), 3);
}
function pickupMachine(tile) {
  if (tile.machine.out) return say("Empty it first — it is still working.");
  addItem("m_" + tile.machine.type); delete tile.machine; say("Picked up the machine.");
}
function useSlotItem(id) {                                                          // Space on a food slot eats it
  if (id.startsWith("m_")) return placeMachine(id);
  if (edibleEnergy(id)) return eat(id);
  say(`${tr(itemInfo(id).name)}: ${tf("Sells for ${0}", sellPrice(id))}`, 2.5);
}
function useTool() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const tile = tileAt(x, y), tool = curTool();

  if (tile.crop && tile.crop.age >= CROPS[tile.crop.type].days) {          // harvest with any tool
    const c = CROPS[tile.crop.type];
    const bonus = state.build.silo === "built" && Math.random() < 0.25;
    gainXp("farming", 3 + Math.round(c.price / 20));
    emit("star", x * T + 8, y * T + 4);
    addItem(tile.crop.type, bonus ? 2 : 1); say(`Harvested ${tile.crop.type}!${bonus ? " (silo bonus!)" : ""}`); audio.beep(660, 0.12, "triangle");
    if (c.regrow) tile.crop.age = c.days - c.regrow; else delete tile.crop;
    return;
  }
  if (state.mounted) return say("Dismount first (press H).");
  if (tool === "none") return;
  if (tile.machine && (tool === "axe" || tool === "pick")) return pickupMachine(tile);
  if (tool === "axe") return chop(tile, x, y);
  if (tool === "item") return useSlotItem(curSlot().id);
  if (tool === "hoe" || tool === "can" || tool === "pick") {
    actAnim = { t: 0.2, tool, fx: state.fx, fy: state.fy };
    if (!(tool === "can" && state.water <= 0)) emit(tool === "hoe" ? "dirt" : tool === "can" ? "water" : "chip", x * T + 8, y * T + 9);
  }
  if (tool === "rod") return castRod(tile, x, y);
  if (tool === "pick") return mine(tile);
  if (tool === "sword") return swing();
  if (tool === "hoe") {
    if (tile.dig) {
      if (state.energy < 2) return say("Too tired to dig!");
      state.energy -= 2; delete tile.dig;
      const pool = [["coin", 35], ["relic", 20], ["pearl", 15], ["amethyst", 10], ["gold", 10], ["aquamarine", 6], ["ruby", 4]], tot = pool.reduce((a, [, w]) => a + w, 0);
      let r = Math.random() * tot, id = "coin";
      for (const [k, w] of pool) if ((r -= w) <= 0) { id = k; break; }
      addItem(id); say(`You dug up: ${itemInfo(id).name}!`, 3); audio.beep(700, 0.15, "triangle"); audio.beep(950, 0.2, "triangle"); return;
    }
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
      festProgress("derby"); festProgress("icefish");
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
  const ok = CROP_IDS.filter(k => CROPS[k].seasons.includes(season)), k = pick(ok); addSeeds(k, 3); return ` ${p.name} dug up 3 ${k} seeds!`;
}
function toggleMount() {
  if (!state.horse) return say("You don't have a horse. (Shop → Farm page; needs a barn)");
  if (state.mounted) { state.mounted = false; return say("Dismounted."); }
  if (["mine", "greenhouse", "house", "cellar"].includes(state.map) || cur().indoor) return say("No riding indoors.");
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
  state.restored = true; state.money += RESTORE_PRIZE; state.ui = null; audio.beep(1200, 0.6, "triangle");
  const done = () => { state.ui = { type: "ending" }; };
  if (state.map === "town" && !cuts.start(FINALE, done)) done(); else if (state.map !== "town") done();
}

// ---------------------------------------------------------------- tutorial, tips, map
const isTouch = () => document.body.classList.contains("touch");
const TUT_STEPS = () => {
  const t = isTouch();
  return t ? [
    "Drag the left joystick to walk. The white square shows the tile you are facing.",
    "Tap 1 to take the hoe, face some grass and tap A to till the soil.",
    "Tap 7 for seeds (Q jumps to the next seed packet), then use them on the tilled soil.",
    "Tap 2 for the watering can and water your seeds. Refill it at any pond.",
    "Walk to your farmhouse door and tap E to go in, then tap E at the bed to sleep. Watered crops grow overnight!",
    "Tap A on ripe crops to harvest them, then sell them at the shipping bin next to your house (E).",
    "Explore east to reach the Town. Tap MAP any time for the world map and fast travel.",
  ] : [
    "Walk with WASD or the arrow keys. The white square shows the tile you are facing.",
    "Press 1 to take the hoe, face some grass and press Space to till the soil.",
    "Press 7 for seeds (Q jumps to the next seed packet), then use them on the tilled soil.",
    "Press 2 for the watering can and water your seeds. Refill it at any pond.",
    "Walk to your farmhouse door and press E to go in, then press E at the bed to sleep. Watered crops grow overnight!",
    "Press Space on ripe crops to harvest them, then sell them at the shipping bin next to your house (E).",
    "Explore east to reach the Town. Press N any time for the world map and fast travel.",
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
function rowBoat(dest) {
  if (dest === "island") {
    if (state.money < 50) return say("The boat ride to the island costs $50.");
    state.money -= 50; goMap("island", 20, 19); say("You row out to the island ($50). Dig for treasure with the hoe!", 4);
  } else goMap("beach", 38, 14);
  state.mounted = false; audio.beep(330, 0.2, "sine");
}
function travelTo(id) {
  if (id === "island" && state.money < 50 && state.map !== "island") return say("The boat ride to the island costs $50.");
  if (!state.visited[id]) return say("You haven't discovered that place yet.");
  if (state.map === id) return say("You're already here.");
  state.ui = null; state.mounted = false;
  if (id === "island") state.money -= 50;
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
function festEntry() {                                                       // the festival host takes entries (fair, feast, luau, dances)
  const fe = state.fest, f = fe && FESTIVALS.find(x => x.id === fe.id);
  if (!f || fe.done) return null;
  if (f.id === "fair") {
    const have = CROP_IDS.filter(k => (state.inv[k] || 0) > 0);
    if (have.length < 3) return "Rosa: Bring me three different crops for the fair!";
    for (const k of have.slice(0, 3)) state.inv[k]--;
    festPrize(); return "Rosa: Wonderful display! First prize!";
  }
  if (f.id === "flowerdance" || f.id === "stardance") { startDance(); return ""; }
  if (f.id === "feast" || f.id === "luau") {
    const host = VILLAGERS[f.host ?? "rosa"].name, dish = Object.keys(DISHES).find(k => (state.inv[k] || 0) > 0);
    if (!dish) return `${host}: Bring me a cooked dish for the ${f.name.toLowerCase()}!`;
    state.inv[dish]--; festPrize(); if (f.host) addFriend(f.host, 30); return `${host}: Mmm, ${DISHES[dish].name}! Delicious!`;
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
  const e = eatValue(id);
  if (!e || !state.inv[id]) return;
  if (state.energy >= maxEnergy() && state.hp >= maxHp()) return say("You're not hungry.");
  state.inv[id]--; state.energy = Math.min(maxEnergy(), state.energy + e); state.hp = Math.min(maxHp(), state.hp + e); say(`Ate ${itemInfo(id).name}: +${e} energy & health`); audio.beep(440, 0.1, "sine");
}

// ---------------------------------------------------------------- interaction & menus
const FLAVOR = { table: "A cosy table with fresh flowers.", plant: "Your plant looks happy.", counter: "A sturdy kitchen counter.", shelf: "A shelf full of books.", barrel: "A barrel. Empty for now.", crate: "A crate. Empty for now.",
  nbed: "A neatly made bed. It isn't yours.", nhearth: "A warm fire crackles in the hearth.",
  nstove: "Something smells delicious.", nmirror: "A tall mirror. You look good today.",
  nfridge: "A well-stocked fridge.", ndesk: "Papers and books cover the desk.",
  fountain: "A stone fountain. The villagers love to meet here.", lamp: "A street lamp. It lights up at dusk.", stall: "A market stall. The stallholder is away today.",
  library: "The library is quiet today. Quill says the best stories are about this valley.", inn: "The inn: the rooms are full of sleepy travellers.", hall: "Town hall. The mayor is away on valley business.", museum: "The museum is being restored. Bring relics from the island one day.", post: "The post office. No letters for you today.", smithy: "The smithy. Your tools are upgraded at Oliver's shop." };
const HINTS = { bed: "E: sleep", hearth: "E: cook", stove: "E: cook", chest: "E: storage", chest2: "E: storage", mirror: "E: wardrobe" };
function enterHouse() {
  state.mounted = false;
  if (state.houseWork) { state.ui = { type: "home" }; return say(`The builders are busy — you sleep in a tent until day ${state.houseWork.ready}.`, 4); }
  ensureHouseMaps(); tip("house", "The bed ends the day, the hearth cooks, the chest stores items and the mirror changes your look. Upgrade the house at the shop (House page).");
  goMap("house", maps.house.entry.x, maps.house.entry.y);
}
function openWardrobe() {                                                            // change name and looks
  state.ui = null; scene = "builder";
  builder.begin({ look: state.look, name: state.name, mode: "edit" }, res => { if (res) { state.look = res.look; state.name = res.name; applyLook(); } scene = "game"; });
}
function useSofa() {                                                                // living room: a nap on the sofa, once a day
  if (state.rested === state.day) return say("You already rested today.", 2.5);
  if (state.energy >= maxEnergy()) return say("You are not tired.", 2.5);
  state.rested = state.day; state.energy = Math.min(maxEnergy(), state.energy + 20); audio.beep(330, 0.2, "sine"); say("You relax on the sofa. (+20 energy)", 3);
}
function useDesk() {                                                                // study: read a book, once a day
  if (state.studied === state.day) return say("You already read today.", 2.5);
  const sk = Object.keys(SKILLS).sort((a, b) => skillLevel(a) - skillLevel(b))[0];
  state.studied = state.day; gainXp(sk, 25); audio.beep(600, 0.12, "triangle"); say(tf("You read a book about {0}. (+25 xp)", tr(SKILLS[sk].name).toLowerCase()), 3.5);
}
function openCarpenter() {
  const hz = npcs.hazel; if (!hz || hz.map !== state.map) return say("Hazel is not here right now.", 2.5);
  state.ui = { type: "shop", page: 6, pages: CARPENTER_PAGES }; audio.beep(500, 0.05); tip("carp", "Hazel builds farm buildings and house upgrades. Press Tab to flip pages: buildings, house, workshop.");
}
function enterStore(key) {
  const h = hourNow(), S0 = STORES[key]; state.mounted = false;
  if (h < S0.open[0] || h >= S0.open[1]) return say(tf("The carpentry is closed. (Open 9:00–17:00)"), 3);
  ensureHouseMaps(); tip("store", "You can visit Hazel's carpentry between 9:00 and 17:00. Buy farm buildings and house upgrades there.");
  goMap("store_" + key, maps["store_" + key].entry.x, maps["store_" + key].entry.y);
}
function enterHome(key) {
  const h = hourNow(), H = HOMES[key]; state.mounted = false;
  if (h < 8 || h >= 22) return say(tf("The door is locked. (Visit between 8:00 and 22:00)"), 3);
  ensureHouseMaps(); tip("homes", "You can visit the villagers' homes between 8:00 and 22:00. Residents are home when they aren't out in the village.");
  goMap("home_" + key, maps["home_" + key].entry.x, maps["home_" + key].entry.y);
}
function visitClinic() {                                                            // the village clinic: patch yourself up for a fee
  const h = hourNow(); if (h < 9 || h >= 17) return say("The clinic is closed. (Open 9:00–17:00)", 3);
  if (state.hp >= maxHp() && state.energy >= maxEnergy() - 10) return say("The nurse says you look perfectly healthy.", 3);
  if (state.money < 60) return say("A check-up costs $60.", 3);
  state.money -= 60; state.hp = maxHp(); state.energy = Math.min(maxEnergy(), state.energy + 40); audio.beep(660, 0.15, "triangle"); say("The nurse patches you up. (-$60, health restored, +40 energy)", 4);
}
function interact() {
  const { x, y } = targetTile();
  if (!inBounds(x, y)) return;
  const id = npcNear(x, y), tile = tileAt(x, y);
  if (petNear(x, y) && !id) return petPet();
  if (!id && state.map === "farm" && petAnimal(x, y)) return;
  if (id === "zed") { state.ui = { type: "merchant", mode: "buy" }; audio.beep(520, 0.05); }
  else if (id) { tip("talk", "Talk once a day and give gifts (option 2) to raise friendship. Check what people like in the inventory's Friends tab."); state.ui = { type: "talk", id, mode: "menu", text: "", n: 0 }; audio.beep(520, 0.05); }
  else if (tile.machine) machineUse(tile);
  else if (tile.kind === "bin") state.ui = { type: "bin" };
  else if (tile.kind === "home") enterHouse();
  else if (tile.kind === "bed") state.ui = { type: "home" };
  else if (tile.kind === "hearth" || tile.kind === "stove") state.ui = { type: "cook" };
  else if (tile.kind === "chest" || tile.kind === "chest2") { state.ui = { type: "chest", which: tile.kind === "chest2" ? "cellar" : "chest", mode: "store", page: 0 }; audio.beep(480, 0.05); }
  else if (tile.kind === "mirror") openWardrobe();
  else if (tile.kind === "sofa") useSofa();
  else if (tile.kind === "desk") useDesk();
  else if (tile.kind === "bench") { state.ui = { type: "shop", page: 5, only: 5, pages: [5] }; audio.beep(480, 0.05); }
  else if (tile.kind === "clinic") visitClinic();
  else if (tile.kind === "door") enterHome(tile.home);
  else if (tile.kind === "store") enterStore(tile.store);
  else if (tile.kind === "ccounter") openCarpenter();
  else if (FLAVOR[tile.kind]) say(FLAVOR[tile.kind], 2.5);
  else if (tile.kind === "board") { tip("board", "Accept up to 3 quests. Press J to see your journal; delivery quests are handed in here."); state.ui = { type: "board" }; audio.beep(480, 0.05); }
  else if (tile.kind === "plot") say(state.build[tile.plot] === "pending" ? `${BUILDINGS[tile.plot].name}: under construction (ready tomorrow).` : `Empty plot — ask Hazel the carpenter to build a ${BUILDINGS[tile.plot].name} (town, 9:00-17:00).`, 3.5);
  else if (tile.kind === "centre") { state.ui = { type: "centre", bundle: null }; audio.beep(480, 0.05); }
  else if (tile.kind === "built" && tile.plot === "greenhouse") enterGreenhouse();
  else if (tile.kind === "built" && (tile.plot === "coop" || tile.plot === "barn")) feedAnimals(tile.plot);
  else if (tile.kind === "built") say(tile.plot === "coop" ? `Coop: ${state.chickens}/${MAX_CHICKENS} chickens.` : tile.plot === "barn" ? `Barn: ${state.cows}/${MAX_COWS} cows.` : "Silo: 25% chance of a bonus crop at harvest.", 3);
  else if (tile.kind === "boat") rowBoat(tile.dest);
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
    state.ui = { type: "shop", page: 0 }; audio.beep(500, 0.05); tip("shop", "Press Tab to flip pages: seeds, tool upgrades, animals and gifts. Farm buildings and house upgrades are sold by Hazel the carpenter.");
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
const packItem = () => {                                                            // backpack: 12 -> 24 -> 36 slots
  const next = { 12: [24, 1000], 24: [36, 4000] }[state.pack];
  return next ? { label: `Backpack (${next[0]} slots)`, cost: next[1], buy: () => { state.slots.push(...Array(12).fill(null)); state.pack = next[0]; say(tf("Backpack upgraded: {0} slots!", next[0]), 3.5); } }
    : { label: `Backpack maxed (${state.pack} slots)`, cost: Infinity };
};
const houseShop = () => HOUSE.slice(1).map((h, i) => {
  const lvl = i + 1;
  if (state.house >= lvl) return { label: `${h.name} (built)`, cost: Infinity };
  if (state.houseWork?.to === lvl) return { label: `${h.name} (under construction, ready day ${state.houseWork.ready})`, cost: Infinity };
  if (state.houseWork || lvl > state.house + 1) return { label: `${h.name} (${state.houseWork ? "wait for the builders" : "needs " + HOUSE[lvl - 1].name})`, cost: Infinity };
  return { label: `Upgrade: ${h.name}`, cost: h.cost, mats: h.mats, buy: () => { state.houseWork = { to: lvl, ready: state.day + HOUSE_BUILD_DAYS }; say(tf("Oliver starts work on your {0}. Ready on day {1}!", tr(h.name), state.houseWork.ready), 4); } };
});
const workshop = () => Object.entries(MACHINES).map(([t, m]) => ({ label: m.name, cost: 0, mats: m.cost, slot: ["item", "m_" + t], buy: () => addItem("m_" + t) }));
const buildingsShop = () => ["coop", "barn", "silo", "greenhouse"].map(buildItem);
const SHOP = page => page === 6 ? buildingsShop() : page === 5 ? workshop() : page === 4 ? houseShop() : page === 0
  ? CROP_IDS.map(k => ({ label: `5x ${k} seeds [${seasonTag(k)}]`, cost: CROPS[k].seed * 5, slot: ["seed", k], buy: () => { addSeeds(k, 5); } }))
  : page === 1 ? [
    upgrade("Hoe", HOE_UPGRADES, state.hoeLevel, () => { state.hoeLevel++; }),
    upgrade("Watering can", CAN_UPGRADES, state.canLevel, () => { state.canLevel++; state.water = maxWater(); }),
    upgrade("Pickaxe", PICK_UPGRADES, state.pickLevel, () => { state.pickLevel++; }),
    upgrade("Sword", SWORD_UPGRADES, state.swordLevel, () => { state.swordLevel++; }),
    upgrade("Axe", AXE_UPGRADES, state.axeLevel, () => { state.axeLevel++; }),
    packItem(),
  ] : page === 2 ? [
    state.build.coop !== "built" ? { label: "Chicken (build a coop first)", cost: Infinity }
      : state.chickens < MAX_CHICKENS ? { label: `Chicken (${state.chickens}/${MAX_CHICKENS})`, cost: CHICKEN_COST, buy: () => { state.chickens++; makeAnimals(); } } : { label: "Coop full", cost: Infinity },
    state.build.barn !== "built" ? { label: "Cow (build a barn first)", cost: Infinity }
      : state.cows < MAX_COWS ? { label: `Cow (${state.cows}/${MAX_COWS}) — gives milk daily`, cost: COW_COST, buy: () => { state.cows++; makeAnimals(); } } : { label: "Barn full", cost: Infinity },
    ...SPRINKLER_SHOP.map(sp => ({ label: `${itemInfo(sp.id).name} (${sp.id === "qsprinkler" ? "8" : "4"} tiles; P to place)`, cost: sp.cost, mats: sp.mats, slot: ["item", sp.id], buy: () => addItem(sp.id) })),
    { label: "10x Hay (feed for animals)", cost: 40, slot: ["item", "hay"], buy: () => addItem("hay", 10) },
    state.horse ? { label: "Horse (owned — H to ride)", cost: Infinity }
      : state.build.barn !== "built" ? { label: "Horse (build a barn first)", cost: Infinity }
      : { label: "Horse (ride with H, 1.8x speed)", cost: HORSE_COST, buy: () => { state.horse = true; say("You got a horse! Press H to ride."); } },
  ] : [
    { label: "Bouquet (give to someone at 8+ hearts to start dating)", cost: 200, slot: ["item", "bouquet"], buy: () => addItem("bouquet") },
    { label: "Wedding Pendant (give to your partner at 10 hearts)", cost: 1500, slot: ["item", "pendant"], buy: () => addItem("pendant") },
    { label: "Energy Tonic (+60 energy)", cost: 60, slot: ["item", "tonic"], buy: () => addItem("tonic") },
    ...(state.pet ? [{ label: `${state.pet.name} is your pet`, cost: Infinity }]
      : Object.entries(PETS).map(([kind, p]) => ({ label: `Adopt a ${kind} (${p.name})`, cost: PET_COST, buy: () => { state.pet = { kind, name: p.name, pts: 0, petted: false }; placePet(); say(`${p.name} joins your farm!`); } }))),
  ];

function merchantBuy(i) {
  const unknown = Object.keys(DISHES).filter(k => !state.recipes.includes(k));
  const stock = [
    { label: "Energy Tonic (+60 energy)", cost: 60, buy: () => addItem("tonic") },
    { label: "Mystery seeds (5, in season)", cost: 90, buy: () => {
      const ok = CROP_IDS.filter(k => CROPS[k].seasons.includes(seasonOf(state.day))), k = ok[Math.floor(Math.random() * ok.length)];
      addSeeds(k, 5); say(`Got 5 ${k} seeds!`);
    } },
    unknown.length
      ? { label: "Recipe scroll (random recipe)", cost: 300, buy: () => { const r = unknown[Math.floor(Math.random() * unknown.length)]; state.recipes.push(r); say(`Learned ${DISHES[r].name}!`, 4); } }
      : { label: "Recipe scroll (sold out)", cost: Infinity },
  ];
  return i === undefined ? stock : stock[i];
}

function chestKey(ui, k, num, close) {
  const chest = ui.which === "cellar" ? state.cellarChest : state.chest, cap = ui.which === "cellar" ? CELLAR_CAP : CHEST_CAP(state.house);
  if (close) return void (state.ui = null);
  if (k === "tab") { ui.mode = ui.mode === "store" ? "take" : "store"; ui.page = 0; return; }
  const list = ui.mode === "store" ? invItems() : Object.entries(chest).filter(([, n]) => n > 0).sort((a, b) => itemInfo(a[0]).name.localeCompare(itemInfo(b[0]).name));
  if (k === "arrowright") return void (ui.page = Math.min(Math.max(0, Math.ceil(list.length / 9) - 1), ui.page + 1));
  if (k === "arrowleft") return void (ui.page = Math.max(0, ui.page - 1));
  const it = list[ui.page * 9 + num]; if (!it || num < 0) return;
  const [id, n] = it;
  if (ui.mode === "store") {
    if (!(id in chest) && Object.keys(chest).filter(x => chest[x] > 0).length >= cap) return say("The chest is full.");
    chest[id] = (chest[id] || 0) + n; state.inv[id] = 0; audio.beep(520, 0.05);
  } else { if (!holds("item", id)) return full(); addItem(id, n); delete chest[id]; audio.beep(620, 0.05); }
}
function uiKey(k) {
  const ui = state.ui, num = /^[1-9]$/.test(k) ? Number(k) - 1 : -1, close = k === "escape" || k === "e";
  if (ui.type === "chest") return chestKey(ui, k, num, close);
  if (ui.type === "shop") {
    if (close) return void (state.ui = null);
    if (k === "tab") { const ps = ui.pages || OLIVER_PAGES; if (ps.length > 1) ui.page = ps[(ps.indexOf(ui.page) + 1) % ps.length]; return; }
    const item = SHOP(ui.page)[num];
    if (!item || item.cost === Infinity) return;
    if (item.slot && !holds(...item.slot)) return full();
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
      if (num === 0 && !holds("item", "tonic")) return full();
      state.money -= item.cost; item.buy(); audio.beep(700, 0.1, "triangle");
    } else {
      const items = invItems();
      if (items[num]) { const v = sellStack(items[num][0], 1.5); say(`Zed pays $${v}`); audio.beep(880, 0.1, "triangle"); }
    }
  } else if (ui.type === "map") {
    if (close || k === "n") return void (state.ui = null);
    const id = ["farm", "town", "forest", "beach", "desert", "island"][num];
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
    else if (num === 2) openWardrobe();
  } else if (ui.type === "cook") {
    if (close) return void (state.ui = null);
    const id = state.recipes[num];
    if (id) cook(id);
  } else if (ui.type === "inv") {
    invKey(ui, k);
  } else if (ui.type === "pause") {
    if (k === "escape" || k === "1") state.ui = null;
    else if (k === "2") { save(); state.ui = null; say(tf("Game saved (slot {0}).", state.slot || 1)); }
    else if (k === "3") audio.toggleMute();
    else if (k === "4") { state.tut.on = !state.tut.on; if (state.tut.on && state.tut.step >= TUT_DONE.length) state.tut.step = 0; }
    else if (k === "5") { state.ui = null; openSettings(); }
    else if (k === "6") { state.ui = null; scene = "title"; titleSel = 0; audio.startMusic("title"); }
  } else if (ui.type === "talk") talkKey(k, num);
}

function talkKey(k, num) {
  const ui = state.ui, f = state.friend[ui.id], v = VILLAGERS[ui.id];
  if ((k === "escape" || k === "e") && ui.mode !== "event") return void (state.ui = null);
  if (ui.mode === "event") {                                                        // scripted heart event: any key moves on
    ui.i++;
    if (ui.i < ui.ev.lines.length) { ui.text = tr(ui.ev.lines[ui.i]); return; }
    const r = ui.ev.reward, g = [];
    if (r.money) { state.money += r.money; g.push(`$${r.money}`); }
    if (r.item) { addItem(r.item); g.push(tr(itemInfo(r.item).name)); }
    addFriend(ui.id, r.pts); ui.mode = "menu"; ui.text = tf("{0} gave you: {1}", v.name, g.join(", ")); audio.beep(990, 0.2, "triangle"); return;
  }
  if (ui.mode === "menu") {
    if (num === 0) {
      const lv = [10, 8, 6, 4].find(l => hearts(ui.id) >= l && HEART_EVENTS[ui.id]?.[l] && !f["ev" + l]);
      if (lv && state.spouse !== ui.id) { f["ev" + lv] = true; f.talked = true; startEventScene(ui.id, lv); return; }
      const h = hearts(ui.id), tier = h < 3 ? v.low : h < 6 ? v.mid : v.high;
      const pool = state.spouse === ui.id ? SPOUSE_LINES : [v.season[seasonOf(state.day)], ...tier, ...(h >= 3 && FAMILY_LINES[ui.id] ? [FAMILY_LINES[ui.id]] : [])];
      const first = !f.talked, line = tr(pool[(state.day + ui.n++) % pool.length]);
      const greet = !first || !state.name ? "" : state.spouse === ui.id ? tf("Hi, {0}, love.", state.name) : tf(h < 3 ? "Hello, {0}." : h < 6 ? "Hey, {0}!" : "{0}! Good to see you.", state.name);
      ui.text = `${v.name}: ${greet ? greet + " " : ""}${line}`;
      if (first) { f.talked = true; addFriend(ui.id, 20); }
    } else if (num === 1) { ui.mode = "gift"; ui.text = ""; }
    else if (num === 2 && ui.id === "hazel") { state.ui = { type: "shop", page: 6, pages: CARPENTER_PAGES }; audio.beep(500, 0.05); }
    else if (num === 2 && festHostFor(ui.id)) { const r = festEntry(); if (r !== "") ui.text = r ?? `${v.name}: No festival entries today.`; }
  } else if (ui.mode === "gift") {
    const it = invItems()[num];
    if (!it) return;
    const [id] = it, name = itemInfo(id).name;
    if (id === "bouquet" || id === "pendant") return giveSpecial(ui, id);
    if (f.gifted) return void (ui.text = `${v.name}: You already gave me something today!`);
    state.inv[id]--; f.gifted = true;
    let pts = 20, line = `${v.name}: Oh, a ${name}. Thanks!`;
    const bday = birthdayOf(ui.id);
    if (v.loves.includes(id)) { pts = 80; line = `${v.name}: A ${name}?! I LOVE it! Thank you!!`; }
    else if (v.likes.includes(id)) { pts = 45; line = `${v.name}: A ${name}! That's really nice of you.`; }
    else if (v.hates.includes(id)) { pts = -20; line = `${v.name}: Ugh... a ${name}? No thanks.`; }
    if (bday && pts > 0) { pts *= BIRTHDAY_MULT; line += ` ${tr("Birthday gift!")}`; }
    addFriend(ui.id, pts); ui.text = line; ui.mode = "menu";
    if (pts > 0) for (const [kin] of FAMILY[ui.id] || []) if (state.friend[kin]) addFriend(kin, 5);                 // family talk audio.beep(pts > 0 ? 880 : 150, 0.15, "triangle");
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
  state.day++; state.minutes = 6 * 60; state.energy = maxEnergy();
  for (const m of Object.values(maps)) for (const row of m.tiles) for (const tile of row) {                 // felled trees grow back
    if (tile.sapling && state.day >= tile.sapling.day && !tile.crop && !tile.forage && !tile.drop) { tile.t = 3; if (tile.sapling.deco) tile.deco = tile.sapling.deco; delete tile.sapling; }
  }
  state.map = "farm"; state.px = 7 * T; state.py = 7 * T; state.fx = 0; state.fy = 1; fishing = null; state.ui = null;
  for (const id in state.friend) { state.friend[id].talked = false; state.friend[id].gifted = false; }
  state.hp = maxHp(); invuln = 0; monsters = [];
  const expired = state.quests.filter(q => q.deadline < state.day);
  if (expired.length) { state.quests = state.quests.filter(q => q.deadline >= state.day); extra += ` ${expired.length} quest(s) expired.`; }
  refreshBoard();
  state.mounted = false; extra += petDigs();
  { const b = todaysBirthday(); if (b) extra += ` ${tf("Today is {0}'s birthday! Gifts mean more today.", VILLAGERS[b].name)}`; }
  for (const [b, n, item] of [["coop", state.chickens, "egg"], ["barn", state.cows, "milk"]]) if (n) {                 // care decides the harvest
    const c = careOf(b), fed = c.fed === state.day - 1;
    if (fed) { let out = n; for (let i = 0; i < n; i++) if (Math.random() < animalHearts(b) * 0.05) out++; addItem(item, out); if (out > n) extra += ` ${tf("Happy {0}: +{1} extra.", tr(item), out - n)}`; }
    else { c.pts = Math.max(0, c.pts - 20); extra += ` ${tf("Your {0} were hungry and gave nothing.", tr(b === "coop" ? "chickens" : "cows"))}`; }
  }
  if (state.build.silo === "built") { addItem("hay", 3); }
  for (const [id] of PLOTS) if (state.build[id] === "pending") {                      // buildings finish overnight
    state.build[id] = "built";
    const o = maps.farm.objects.find(x => x.plot === id); if (o) o.sprite = id;
    for (const row of maps.farm.tiles) for (const t of row) if (t.plot === id) t.kind = "built";
    extra += ` ${tf("Your {0} is finished!", tr(BUILDINGS[id].name))}`;
  }
  if (state.engaged && state.day >= state.engaged.day) {
    const v = VILLAGERS[state.engaged.id]; state.spouse = state.engaged.id; state.dating = null; state.engaged = null; state.friend[state.spouse].pts = 1000;
    extra += ` ${tf("You married {0}! They now live on the farm.", v.name)}`; audio.beep(1200, 0.5, "triangle");
  }
  if (state.houseWork && state.day >= state.houseWork.ready) {                         // Oliver finishes the house upgrade
    state.house = state.houseWork.to; state.houseWork = null; maps.house = makeHouse(state.house); state.energy = maxEnergy();
    extra += ` ${tf("Your {0} is finished!", tr(HOUSE[state.house].name))}`; audio.beep(1000, 0.3, "triangle");
  }
  if (state.spouse && state.house >= 2) { addItem("friedegg"); extra += ` ${tf("{0} made you breakfast.", VILLAGERS[state.spouse].name)}`; }
  ensureHouseMaps(); state.map = "house"; state.px = maps.house.spawn.x * T; state.py = maps.house.spawn.y * T; state.fx = 0; state.fy = 1; placePet();   // wake up in your own bed
  const s = seasonOf(state.day);
  if (s !== old) {
    let withered = 0;
    for (const [name, m] of Object.entries(maps)) if (name !== "greenhouse") for (const row of m.tiles) for (const tile of row) if (tile.crop && !CROPS[tile.crop.type].seasons.includes(s)) { delete tile.crop; withered++; }
    extra = ` ${tf("{0} begins!", tr(SEASONS[s].name))}${withered ? ` ${tf("{0} crop(s) withered.", withered)}` : ""}`;
  }
  audio.startMusic(mood());
  state.rain = Math.random() < (s === 3 ? 0.3 : 0.2);
  if (state.rain) tip("rain", "Rain waters your tilled soil for free today.");
  if (state.day >= 3) tip("map", "Press N for the world map. You can fast travel to places you have visited.");
  if (state.rain) for (const row of maps.farm.tiles) for (const tile of row) if (tile.t === 1) tile.wet = true;
  state.water = maxWater(); spawnForage(); startFestival();
  if (state.fest) { const f = FESTIVALS.find(x => x.id === state.fest.id); extra += ` ${tf("Today: {0}! {1}.", tr(f.name), tr(f.desc))}`; }
  if (merchantHere()) extra += ` ${tf("Zed the merchant is in Town today.")}`;
  save(); writeSave(0);                                                             // the daily autosave is kept separately from your slot
  say(`${state.name && state.day > 1 ? tf("Good morning, {0}! ", state.name) : ""}${tf("Day {0}", state.day)}${state.rain ? ` — ${tf(s === 3 ? "snowing" : "raining")}` : ""}.${state.chickens ? ` ${tf("{0} egg(s)", state.chickens)}` : ""}${state.cows ? ` ${tf("{0} milk", state.cows)}` : ""}${state.chickens || state.cows ? ` ${tf("collected.")}` : ""}${extra}`, extra ? 7 : 3);
}

// ---------------------------------------------------------------- update
function goMap(to, tx, ty) {
  state.visited[to] = true;
  if (to === "town") tip("town", "The Town has a shop (seeds, upgrades, animals), Hazel the carpenter (farm buildings, house upgrades), a quest board and villagers to befriend.");
  clearFx(); state.map = to; state.px = tx * T + 2; state.py = ty * T; state.fade = 0.4; fishing = null;
  say(maps[to].name, 1.5); audio.beep(440, 0.08, "triangle"); audio.startMusic(areaMood());
}

let camNow = { x: 0, y: 0, zoom: 1 }, camOverride = null, playerWalking = false;
const cuts = createCutscenes({
  ctx, W, H, T, S, state: () => state, npcs, VILLAGERS, tr, wrap, woodFrame, audio,
  cam: () => camNow, getCam: () => camOverride, setCam: c => { camOverride = c; }, setMoving: v => { playerWalking = v; moving = v; },
});
function startEventScene(id, lv) {                                                  // heart events and stories play as cutscenes
  const ev = HEART_EVENTS[id][lv], f = state.friend[id];
  state.ui = null;
  cuts.start([{ face: [id, "player"] }, { emote: [id, "!"] }, ...ev.lines, { emote: [id, "♥"] }], () => {
    const r = ev.reward, g = [];
    if (r.money) { state.money += r.money; g.push(`$${r.money}`); }
    if (r.item) { addItem(r.item); g.push(tr(itemInfo(r.item).name)); }
    addFriend(id, r.pts); say(tf("{0} gave you: {1}", VILLAGERS[id].name, g.join(", ")), 4); audio.beep(990, 0.2, "triangle");
  });
}
function update(dt) {
  clock += dt;
  if (scene === "intro" && !setUi) intro.update(dt);
  if (scene === "builder" && !setUi) builder.update(dt);
  if (scene !== "game" || setUi) return;
  if (cuts.active) { cuts.update(dt); walkT += dt; return; }
  state.msgT -= dt; state.fade = Math.max(0, state.fade - dt);
  if (state.map.startsWith("store_") && hourNow() >= STORES[state.map.slice(6)].open[1]) { const S0 = STORES[state.map.slice(6)]; goMap("town", S0.x + 1, S0.y + 2); say("It's closing time — you say goodbye and head out.", 3.5); }
  if (state.map.startsWith("home_") && hourNow() >= 22) { const H = HOMES[state.map.slice(5)]; goMap("town", H.x + 1, H.y + 2); say("It's late — you say goodnight and head out.", 3.5); }
  const snow = seasonOf(state.day) === 3, amb = !state.rain, sea = seasonOf(state.day);
  for (const p of particles) {                                                      // rain / snow / drifting petals and leaves
    if (amb) { p.y += (sea === 2 ? 14 : sea === 0 ? 9 : 2) * dt * (0.6 + p.v / 120); p.x += (Math.sin(clock * 1.5 + p.v) * 10 - 4) * dt; }
    else { p.y += p.v * (snow ? 0.4 : 1) * dt; p.x += (snow ? Math.sin(clock * 2 + p.v) * 8 : -6) * dt; }
    if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
    if (p.x < 0) p.x += W;
    if (p.x > W) p.x -= W;
  }
  syncSlots(state, overflowDrop);
  updateNpcs(dt); updateFishing(dt); updatePet(dt); updateFx(dt);
  if (state.tip && (state.tip.t -= dt) <= 0) state.tip = null;
  updateTutorial(dt);
  if (!state.ui && !fishing && state.pendingPerks.length) openPerk();
  if (state.energy < 25) tip("energy", "Low energy! Eat food (open the inventory with I, then press a number) or sleep at home.");
  if (actAnim && (actAnim.t -= dt) <= 0) actAnim = null;
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

  let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  if (stick.x || stick.y) { dx = stick.x; dy = stick.y; }                            // analog: speed follows how far the stick is pushed
  const len = Math.hypot(dx, dy), mag = Math.min(1, len);
  if (len > 1) { dx /= len; dy /= len; }                                            // diagonals are no faster than straight lines
  moving = len > 0.02;
  if (moving && fishing) {
    if (fishing.phase === "wait") { fishing = null; say("Reeled in."); } else moving = false;   // can't walk mid-reel
  }
  if (moving) {
    walkT += dt * (0.5 + 0.5 * mag);
    const ax = Math.abs(dx), ay = Math.abs(dy);                                     // face the dominant axis, with hysteresis so it doesn't flicker on diagonals
    let horiz = state.fx !== 0;
    if (horiz ? ay > ax * 1.25 : ax > ay * 1.25) horiz = !horiz;
    if (horiz) { state.fx = dx ? Math.sign(dx) : state.fx; state.fy = 0; } else { state.fy = dy ? Math.sign(dy) : state.fy; state.fx = 0; }
    const sp = (state.mounted ? 125 : 70) * dt;
    state.tut.dist += sp * mag;
    if ((stepT -= dt * mag) <= 0 && !state.rain && state.map !== "mine" && state.map !== "greenhouse" && !cur().indoor) { stepT = state.mounted ? 0.12 : 0.2; emit(seasonOf(state.day) === 3 ? "snow" : "dust", state.px + 6, state.py + 14); }
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
  if (here?.drop) {                                                                // dropped items are picked up by walking over them
    const d = here.drop;
    if (holds(d.k, d.id)) { delete here.drop; if (d.k === "seed") addSeeds(d.id, d.n); else addItem(d.id, d.n); say(tf("Picked up {0}.", d.k === "seed" ? tf("{0} seeds", tr(itemInfo(d.id).name)) : tr(itemInfo(d.id).name)), 2); audio.beep(760, 0.08, "triangle"); }
    else if (clock > fullMsgT) { fullMsgT = clock + 2.5; full(); }
  }
  if (here?.fegg) { delete here.fegg; audio.beep(900, 0.08, "triangle"); festProgress("egghunt"); }
  for (const w of cur().warps) if (fx >= w.x && fx < w.x + w.w && fy >= w.y && fy < w.y + w.h) { goMap(w.to, w.tx, w.ty); break; }

  state.minutes += dt * (10 / 3);                    // ~6 real minutes per 20h day
  if (state.minutes >= 26 * 60) { sleep(); say("You passed out... and woke up at home."); }
}

// ---------------------------------------------------------------- drawing
function wrap(text, maxW) {
  text = tr(text);
  const lines = []; let line = "";
  for (const w of text.split(" ")) {
    if (ctx.measureText(line + w).width > maxW && line) { lines.push(line.trimEnd()); line = ""; }
    line += w + " ";
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
let rec = null, uiLines = [];                                                      // text drawn by menus, kept for tap hit-testing
const txt = (s, x, y, c = "#fff", align = "left") => { s = tr(s); ctx.fillStyle = c; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.textAlign = "left"; if (rec) rec.push({ s, x, y, align }); };

const CLS = { 17: "H", 18: "X", 19: "H", 0: "g", 1: "s", 2: "w", 3: "g", 4: "g", 5: "g", 6: "g", 7: "p", 8: "r", 10: "g", 11: "W", 12: "f", 13: "f", 14: "d", 15: "G", 16: "X" };
const logicalW = img => img.width - 2 * (img.ox || 0), logicalH = img => img.height - 2 * (img.oy || 0);
function shadow(cx, cy, rx, ry, a = 0.26) {
  cx += sunShift(rx); rx *= sunStretch();                                           // shadows lean away from the sun
  ctx.fillStyle = `rgba(24,30,14,${a})`;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) { const k = 1 - (dy / ry) ** 2; if (k <= 0) continue; const half = Math.round(rx * Math.sqrt(k)); ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2, 1); }
}
function blit(t) {
  const ox = t.img.ox || 0, oy = t.img.oy || 0;
  if (t.flip) { ctx.save(); ctx.translate(Math.round(t.x) - ox + t.img.width, Math.round(t.y) - oy); ctx.scale(-1, 1); ctx.drawImage(t.img, 0, 0); ctx.restore(); }
  else ctx.drawImage(t.img, Math.round(t.x) - ox, Math.round(t.y) - oy);
}
function timeTint(hr) {                                                            // [r, g, b, alpha] for the time of day
  const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), k = (x, lo, hi) => Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  if (hr < 7) return lerp([255, 190, 140, 0.14], [255, 220, 180, 0], k(hr, 6, 7));
  if (hr < 17) return [0, 0, 0, 0];
  if (hr < 19) return lerp([255, 160, 70, 0], [255, 140, 60, 0.17], k(hr, 17, 19));
  if (hr < 21) return lerp([255, 140, 60, 0.17], [22, 24, 80, 0.46], k(hr, 19, 21));
  return lerp([22, 24, 80, 0.46], [10, 12, 56, 0.6], k(hr, 21, 26));
}

function drawWorld() {
  const m = cur(), season = seasonOf(state.day), frame = Math.floor(clock * 3) % 4, inMine = state.map === "mine";
  const zoom = m.zoom || 1, VW = W / zoom, VH = H / zoom, indoor = !!m.indoor;           // house interiors are drawn at 2x and centred
  const camAxis = (pos, size, view) => (size <= view ? -Math.floor((view - size) / 2) : Math.max(0, Math.min(size - view, Math.round(pos - view / 2))));
  const camX = camAxis(camOverride ? camOverride.x : state.px + 6, m.w * T, VW), camY = camAxis(camOverride ? camOverride.y : state.py + 10, m.h * T, VH);
  camNow = { x: camX, y: camY, zoom };
  ctx.fillStyle = "#0c0a10"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-camX, -camY);
  const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(m.w - 1, Math.ceil((camX + VW) / T));
  const y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(m.h - 1, Math.ceil((camY + VH) / T) + 1);
  const biome = inMine ? (state.mineFloor < 10 ? "stone" : state.mineFloor < 20 ? "frost" : "magma") : null, sandBiome = state.map === "desert" ? "desert" : "beach";
  const things = [], decoMap = !inMine && (state.map === "farm" || state.map === "town" || state.map === "forest");
  setSun(indoor ? 13 : hourNow());
  const cls = (xx, yy) => { const t = m.tiles[yy]?.[xx]; return t ? CLS[t.t] : null; };
  const m4 = (x, y, pred) => (pred(cls(x, y - 1), 1) ? 1 : 0) | (pred(cls(x + 1, y), 2) ? 2 : 0) | (pred(cls(x, y + 1), 4) ? 4 : 0) | (pred(cls(x - 1, y), 8) ? 8 : 0);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const tile = m.tiles[y][x], v8 = Math.floor(hash(x, y) * 8) % 8, v4 = v8 % 4;
    let base;
    switch (tile.t) {
      case 1: base = S.tile("soil", season, 0, m4(x, y, c => c !== null && c !== "s"), { wet: tile.wet }); break;
      case 2: base = S.tile(tile.water === "ocean" || tile.water === "deep" ? "ocean" : "water", season, 0, m4(x, y, c => c !== null && c !== "w"), { f: frame }); break;
      case 7: base = S.tile("pen", season, 0, m4(x, y, c => c !== null && c !== "p")); break;
      case 8: base = S.tile("path", season, v4, m4(x, y, c => c === "g"), { sandy: state.map === "beach" || state.map === "desert" || state.map === "island" }); break;
      case 11: base = S.tile("cwall", 0, v4, m4(x, y, (c, bit) => c === "f" && (bit === 1 || bit === 4)), { biome }); break;
      case 12: case 13: base = S.tile("cfloor", 0, v4, m4(x, y, c => c === "W"), { biome }); break;
      case 14: base = S.tile("sand", 0, v4, m4(x, y, c => c === "w"), { biome: sandBiome }); break;
      case 15: base = S.ghfloor[v4]; break;
      case 17: case 19: base = S.hfloor[m.style][v4]; break;
      case 18: base = S.hwall[m.style][y === 0 ? "top" : y === 1 && x > 0 && x < m.w - 1 ? "base" : "side"]; break;
      case 16: base = S.ghwall; break;
      default: base = (state.map === "beach" || state.map === "desert" || state.map === "island") && tile.t === 10 ? S.tile("sand", 0, v4, 0, { biome: sandBiome }) : S.tile("grass", season, v8, m4(x, y, c => c === "w"));
    }
    ctx.drawImage(base, x * T, y * T);
    if (tile.t === 2) waterSparkle(ctx, x, y, clock);
    else if (tile.t === 0 && !tile.forage && decoMap) grassDeco(ctx, x, y, season, clock);
    if (tile.t === 13) ctx.drawImage(S.node[tile.ore], x * T, y * T);
    if (tile.kind === "ladder") ctx.drawImage(S.ladder, x * T, y * T);
    if (tile.kind === "mexit") ctx.drawImage(S.mexit, x * T, y * T);
    if (tile.machine) { shadow(x * T + 8, y * T + 14, 6, 1.6, 0.25); ctx.drawImage(S.machine[tile.machine.type], x * T, y * T); if (tile.machine.out) { const rd = state.day >= tile.machine.ready; ctx.fillStyle = rd ? "#ffd23f" : "#8ac"; ctx.fillRect(x * T + 6, y * T - 2 + (rd ? Math.round(Math.sin(clock * 5)) : 0), 4, 3); } }
    if (tile.sprinkler) ctx.drawImage(S.icon[tile.sprinkler === 2 ? "qsprinkler" : "sprinkler"], x * T, y * T);
    if (tile.crop) { const ci = S.crop[tile.crop.type][cropStage(tile.crop)]; shadow(x * T + 8, y * T + 14, 5, 1.5, 0.2); ctx.drawImage(ci, x * T - ci.ox, (y + 1) * T - 24 - ci.oy); }
    if (tile.forage) ctx.drawImage(S.icon[tile.forage], x * T, y * T + Math.round(Math.sin(clock * 3 + x) * 0.6));
    if (tile.sapling) ctx.drawImage(S.icon.sapling, x * T, y * T);
    if (tile.drop) ctx.drawImage(S.icon[tile.drop.id], x * T, y * T + Math.round(Math.sin(clock * 4 + x) * 0.8));
    if (tile.dig) ctx.drawImage(S.icon.dig, x * T, y * T + (Math.sin(clock * 4 + x) > 0.8 ? -1 : 0));
    if (tile.fegg) ctx.drawImage(S.icon.fegg, x * T, y * T + Math.round(Math.sin(clock * 4 + x) * 0.8));
    if (tile.t === 3) {
      const img = tile.deco === "palm" ? S.palm : tile.deco === "cactus" ? S.cactus : tile.rock ? S.rock[Math.floor(hash(x, y, 2) * 2)] : S.tree[season][Math.floor(hash(x, y, 5) * 3)];
      const lw = logicalW(img), lh = logicalH(img), isTree = !tile.rock && !tile.deco;
      things.push({ img, x: x * T + 8 - lw / 2 + shakeOff(x, y), y: (y + 1) * T - lh, sort: (y + 1) * T, sway: isTree ? 1 : tile.deco === "palm" ? 1.3 : 0, sh: [x * T + 8, (y + 1) * T - 2, tile.rock ? 6 : lw * 0.36, isTree ? 4 : 3] });
    }
  }
  if (state.map === "town" && festivalToday()) {                                    // festival pennants
    const cols = ["#e84a6a", "#ffd23f", "#3a9ae8", "#3ddc97"];
    ctx.fillStyle = "#ddd"; ctx.fillRect(x0 * T, 12 * T + 2, (x1 - x0 + 1) * T, 1);
    for (let x = x0; x <= x1; x++) { ctx.fillStyle = cols[x % 4]; ctx.fillRect(x * T + 3, 12 * T + 3, 8, 3); ctx.fillRect(x * T + 4, 12 * T + 6, 6, 2); ctx.fillRect(x * T + 6, 12 * T + 8, 2, 1); }
  }
  for (const o of m.objects) {
    const key = o.sprite === "centre" && state.restored ? "centreOk" : o.sprite === "home" ? (state.houseWork ? "homeScaf" : state.house ? "home" + Math.min(3, state.house) : "home") : o.sprite;
    const img = S.bldg[key], ow = o.w || 3;
    if (o.x * T > camX + VW + 32 || (o.x + ow) * T < camX - 32) continue;
    if (o.flat) { ctx.drawImage(img, o.x * T, o.y * T); continue; }                  // rugs and mats lie under everything
    const lw = logicalW(img), lh = logicalH(img), ox = o.x * T + ow * T / 2 - lw / 2, oy = (o.y + o.h) * T - lh;
    things.push({ img, x: ox, y: oy, sort: (o.y + o.h) * T, sh: indoor ? null : [o.x * T + ow * T / 2, (o.y + o.h) * T - 1, Math.min(lw / 2, ow * T / 2 + 2), 3], flame: o.sprite === "hearth" ? [ox + 10, oy + 17] : null, smoke: ["home", "shop", "h1", "h2", "h3"].includes(o.sprite) ? [ox + 42, oy + 3] : null });
  }
  for (const [id, n] of Object.entries(npcs)) if (n.map === state.map) {
    const f = n.moving ? [1, 0, 2, 0][Math.floor(clock * 6) % 4] : 0;
    things.push({ img: S.npc[id][n.dir][f], x: n.x, y: n.y + 14 - 24, sort: n.y + 14, sh: [n.x + 8, n.y + 14, 5, 2] });
  }
  if (state.map === "farm") for (const c of animals) if (hungry(c.kind === "cow" ? "barn" : "coop")) things.push({ img: S.bubble, x: c.x + (c.kind === "cow" ? 8 : 3), y: c.y - 8, sort: c.y + 40 });
  if (state.map === "farm") for (const c of animals) things.push({ img: c.kind === "cow" ? S.cow[Math.abs(c.vx) + Math.abs(c.vy) > 1 ? Math.floor(clock * 3 + c.x) % 2 : 0] : S.chicken[Math.floor(clock * 1.5 + c.x * 0.3) % 5 === 0 ? 1 : 0], x: c.x, y: c.y, sort: c.y + (c.kind === "cow" ? 14 : 10), flip: c.vx < 0, sh: [c.x + (c.kind === "cow" ? 10 : 6), c.y + (c.kind === "cow" ? 13 : 9), c.kind === "cow" ? 8 : 5, 2] });
  if (state.map === "mine") for (const mon of monsters) things.push({ img: (S.monB[biome]?.[mon.type] ?? S.mon[mon.type])[Math.floor(clock * 4) % 2], x: mon.x, y: mon.y, sort: mon.y + 14, hurt: mon.hurt > 0, sh: [mon.x + 7, mon.y + 12, 5, 2] });
  const dir = state.fy > 0 ? 0 : state.fy < 0 ? 1 : state.fx > 0 ? 2 : 3;
  const pf = moving ? [1, 0, 2, 0][Math.floor(walkT * 8) % 4] : 0;
  if (petObj && petObj.map === state.map && state.map !== "mine") things.push({ img: S.pet[state.pet.kind][petObj.moving ? Math.floor(clock * 8) % 2 : 0], x: petObj.x, y: petObj.y, sort: petObj.y + 11, flip: petObj.dir < 0, sh: [petObj.x + 7, petObj.y + 10, 5, 2] });
  if (state.mounted) {
    const side = dir >= 2, img = side ? S.horse.side : dir === 0 ? S.horse.front : S.horse.back;
    things.push({ img, x: state.px - (side ? 8 : 1), y: state.py - (side ? 3 : 6), sort: state.py + 14, flip: dir === 3, sh: [state.px + 6, state.py + 14, 10, 3] });
  }
  things.push({ img: S.player[dir][pf], x: state.px - 2, y: state.py + 14 - 24 - (state.mounted ? 7 : 0), sort: state.py + 14.5, sh: state.mounted ? null : [state.px + 6, state.py + 14, 5, 2] });
  things.sort((a, b) => a.sort - b.sort);
  for (const t of things) if (t.sh) shadow(t.sh[0], t.sh[1], t.sh[2], t.sh[3]);
  for (const t of things) {
    if (t.hurt) ctx.globalAlpha = 0.55;
    if (t.sway) drawSwaying(ctx, t.img, t.x, t.y, clock, t.sway); else blit(t);
    if (t.flame) { ctx.drawImage(S.flame[Math.floor(clock * 6) % 3], Math.round(t.flame[0]), Math.round(t.flame[1])); windowGlow(ctx, t.flame[0] + 6, t.flame[1] + 4, 46, 0.9, clock); }
    ctx.globalAlpha = 1;
    if (t.smoke && !state.rain) for (let i = 0; i < 4; i++) {                       // chimney smoke
      const p = (clock * 0.35 + i * 0.25) % 1, sx = t.smoke[0] + Math.sin(p * 5 + i) * 2 + p * 5, sy = t.smoke[1] - p * 16;
      ctx.fillStyle = `rgba(235,235,240,${0.55 * (1 - p)})`; ctx.fillRect(Math.round(sx), Math.round(sy), 2 + Math.round(p * 2), 2 + Math.round(p * 2));
    }
  }
  if (actAnim) {                                                                    // tool swing
    const p = 1 - actAnim.t / 0.2, icon = S.icon[actAnim.tool], cx = state.px + 6 + actAnim.fx * 9, cy = state.py + 4 + actAnim.fy * 6;
    if (icon) {
      ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.rotate((actAnim.fx < 0 ? -1 : 1) * (-1.1 + p * 2.2) + (actAnim.fy < 0 ? Math.PI : 0)); ctx.drawImage(icon, -8, -15); ctx.restore();
    }
  }
  if (slash) {                                                                      // sword arc
    const a = Math.atan2(slash.fy, slash.fx), p = 1 - slash.t / 0.18, cx = state.px + 6, cy = state.py + 8;
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 15, a - 1.1 + p * 1.2, a - 0.1 + p * 1.2); ctx.stroke(); ctx.lineWidth = 1;
  }
  if (fishing) {                                                                    // line and bobber
    const bx = fishing.x * T + 8, by = fishing.y * T + 8 + (fishing.phase === "bite" ? Math.sin(clock * 30) * 1.5 : Math.sin(clock * 3));
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.moveTo(state.px + 6, state.py + 2); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = "#e33"; ctx.fillRect(bx - 1, by - 1, 3, 3); ctx.fillStyle = "#fff"; ctx.fillRect(bx - 1, by - 1, 3, 1);
    if (fishing.phase === "bite") txt("!", state.px + 6, state.py - 12, "#ffd23f", "center");
  }
  const { x, y } = targetTile();                                                    // target marker (corner brackets)
  ctx.strokeStyle = `rgba(255,255,255,${0.65 + 0.3 * Math.sin(clock * 6)})`;
  for (const [px0, py0, dx, dy] of [[x * T, y * T, 1, 1], [x * T + T, y * T, -1, 1], [x * T, y * T + T, 1, -1], [x * T + T, y * T + T, -1, -1]]) { ctx.beginPath(); ctx.moveTo(px0 + dx * 4, py0 + dy * .5); ctx.lineTo(px0 + dx * .5, py0 + dy * .5); ctx.lineTo(px0 + dx * .5, py0 + dy * 4); ctx.stroke(); }
  if (state.houseWork && state.map === "farm" && Math.random() < 0.1) emit(Math.random() < 0.5 ? "chip" : "dust", 6 * T + Math.random() * 3 * T, 6 * T + 6);
  if (state.rain && seasonOf(state.day) !== 3 && !inMine && !indoor && Math.random() < 0.5) ripple(camX + Math.random() * W, camY + Math.random() * H);
  drawFx(ctx);
  ctx.restore();

  if (inMine) {                                                                     // lantern light
    const lx = state.px + 6 - camX, ly = state.py + 8 - camY, g = ctx.createRadialGradient(lx, ly, 26, lx, ly, 118);
    g.addColorStop(0, "rgba(5,3,12,0)"); g.addColorStop(1, "rgba(5,3,12,.94)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (!indoor && state.map !== "greenhouse") {
    const hr = hourNow(), [tr, tg, tb, ta] = timeTint(hr);
    if (ta > 0.005) { ctx.fillStyle = `rgba(${Math.round(tr)},${Math.round(tg)},${Math.round(tb)},${ta})`; ctx.fillRect(0, 0, W, H); }
    sunGlow(ctx, W, H, state.rain ? 0 : hr);
    if (hr > 17.5 || hr < 6.5) {                                                    // lit windows: warm light pools around houses
      const st = hr < 6.5 ? 1 : Math.min(1, (hr - 17.5) / 2.5);
      for (const o of m.objects) {
        if (!["home", "shop", "h1", "h2", "h3", "centre", "clinic", "inn", "library", "smithy", "lamp", "townhall", "museum", "post"].includes(o.sprite)) continue;
        const img = S.bldg[o.sprite === "centre" && state.restored ? "centreOk" : o.sprite], ow = o.w || 3, lw = logicalW(img), lh = logicalH(img);
        const gx = o.x * T + ow * T / 2 - camX, gy = (o.y + o.h) * T - lh * 0.4 - camY;
        if (gx > -60 && gx < W + 60 && gy > -60 && gy < H + 60) {
          windowGlow(ctx, gx, gy, Math.max(40, lw * 0.9), st, clock);
          if (["home", "shop", "h1", "h2", "h3", "clinic", "inn", "library", "townhall", "museum", "post"].includes(o.sprite)) litWindows(ctx, o.x * T + ow * T / 2 - lw / 2 - camX, (o.y + o.h) * T - lh - camY, st);
        }
      }
    }
    if (hr > 19) {                                                                  // warm glow around the farmer at night
      const lx = state.px + 6 - camX, ly = state.py + 6 - camY, g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 70), a = Math.min(0.32, (hr - 19) / 4);
      g.addColorStop(0, `rgba(255,205,120,${a})`); g.addColorStop(1, "rgba(255,205,120,0)");
      ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (state.rain) {
      const snow = season === 3;
      if (!snow) { ctx.fillStyle = "rgba(20,30,70,.18)"; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = snow ? "#fff" : "#9ec9ff";
      for (const p of particles) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, snow ? 1 : 3);
    } else if (season !== 3) {                                                      // ambient: petals, fireflies, leaves
      for (let i = 0; i < 26; i++) {
        const p = particles[i];
        if (season === 0) { ctx.fillStyle = i % 3 ? "#ffd0e2" : "#fff"; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); }
        else if (season === 1) { if (hr > 19.5) { ctx.fillStyle = `rgba(255,240,130,${0.4 + 0.5 * Math.sin(clock * 3 + i)})`; ctx.fillRect(Math.round(p.x), Math.round(H * 0.3 + (p.y % (H * 0.6))), 2, 2); } }
        else { ctx.fillStyle = i % 2 ? "#e0702a" : "#c03a22"; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); ctx.fillStyle = "#f4b04a"; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      }
    }
  }
  if (indoor) { ctx.fillStyle = "rgba(255,190,110,.07)"; ctx.fillRect(0, 0, W, H); }
  if (!inMine) vignette(ctx, W, H, Math.max(0, Math.min(1, (hourNow() - 18) / 3)));
  if (state.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${state.fade / 0.4})`; ctx.fillRect(0, 0, W, H); }
  if (!cuts.active) drawHud(hourNow(), x, y);
}

function woodFrame(x, y, w, h, fill = "rgba(34,22,12,.93)") {
  ctx.fillStyle = "#2c1a0c"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#93622f"; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "#cb9450"; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
  ctx.fillStyle = "#603c1b"; ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
  ctx.fillStyle = "#3a2410"; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = fill; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
}
function weatherIcon(kind, x, y) {
  if (kind === "sun") { ctx.fillStyle = "#ffe36a"; ctx.fillRect(x + 4, y + 4, 8, 8); ctx.fillRect(x + 3, y + 5, 10, 6); ctx.fillRect(x + 5, y + 3, 6, 10); ctx.fillStyle = "#fff3a8"; ctx.fillRect(x + 5, y + 5, 3, 3); ctx.fillStyle = "#ffcf4a"; for (const [dx, dy] of [[7, 0], [7, 14], [0, 7], [14, 7], [2, 2], [12, 2], [2, 12], [12, 12]]) ctx.fillRect(x + dx, y + dy, 2, 2); }
  else if (kind === "moon") { ctx.fillStyle = "#f4efc0"; ctx.fillRect(x + 4, y + 2, 7, 12); ctx.fillRect(x + 3, y + 4, 9, 8); ctx.fillStyle = "#2a2440"; ctx.fillRect(x + 8, y + 3, 5, 9); ctx.fillStyle = "#fff"; ctx.fillRect(x + 13, y + 2, 1, 1); }
  else { ctx.fillStyle = "#dfe8f4"; ctx.fillRect(x + 2, y + 5, 12, 5); ctx.fillRect(x + 4, y + 3, 6, 3); ctx.fillStyle = "#aab8cc"; ctx.fillRect(x + 2, y + 9, 12, 1);
    if (kind === "rain") { ctx.fillStyle = "#5aa0f0"; for (const dx of [4, 8, 12]) ctx.fillRect(x + dx, y + 11, 1, 3); }
    else { ctx.fillStyle = "#fff"; for (const dx of [4, 8, 12]) ctx.fillRect(x + dx, y + 12, 2, 2); } }
}
let capSel = -1, capUntil = 0;
function drawHud(hr, tx, ty) {
  const s = seasonOf(state.day);
  ctx.font = "9px monospace";
  const hh = Math.floor(hr) % 24, mm = Math.floor(state.minutes % 60 / 10) * 10, h12 = ((hh + 11) % 12) + 1;
  const loc = cur().name, lw = Math.round(ctx.measureText(loc).width) + 14;
  woodFrame(4, 4, lw, 17); txt(loc, 11, 15, "#ffe9b0");                              // location chip
  const cx0 = W - 100;                                                              // clock panel
  woodFrame(cx0, 4, 96, 54);
  weatherIcon(state.rain ? (s === 3 ? "snow" : "rain") : hr >= 19 || hr < 6 ? "moon" : "sun", cx0 + 8, 10);
  txt(`${SEASONS[s].name.slice(0, 3)} ${dayOfSeason(state.day)}`, cx0 + 30, 18, "#ffe9b0"); txt(`Y${yearOf(state.day)}`, cx0 + 88, 18, "#c9a56a", "right");
  ctx.font = "bold 11px monospace"; txt(lang() === "hu" ? `${hh}:${String(mm).padStart(2, "0")}` : `${h12}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}`, cx0 + 48, 33, "#fff", "center"); ctx.font = "9px monospace";
  ctx.fillStyle = "#ffd23f"; ctx.fillRect(cx0 + 10, 39, 8, 8); ctx.fillStyle = "#c8960a"; ctx.fillRect(cx0 + 12, 41, 4, 4); ctx.fillStyle = "#fff3a8"; ctx.fillRect(cx0 + 11, 40, 2, 2);
  txt(`${state.money}`, cx0 + 24, 47, "#fff");
  if (state.quests.length) txt(`J: ${state.quests.length} quest${state.quests.length > 1 ? "s" : ""}`, W - 6, 69, "#ffe9b0", "right");
  if (state.fest) {
    const f = FESTIVALS.find(x => x.id === state.fest.id), t = f.goal === 0 ? `${f.name}: +25% sales` : state.fest.done ? `${f.name}: done!` : `${f.name}: ${state.fest.progress}/${f.goal}`;
    woodFrame(4, 24, Math.round(ctx.measureText(t).width) + 14, 15, "rgba(60,40,10,.95)"); txt(t, 11, 34, "#ffd23f");
  }
  const bar = (x, label, val, max, colors) => {                                     // Stardew-style vertical bars
    const bh = 60, pct = Math.max(0, Math.min(1, val / max));
    woodFrame(x, H - 104, 14, bh + 10, "#1a1008");
    ctx.fillStyle = "#101010"; ctx.fillRect(x + 4, H - 100, 6, bh + 2);
    const col = colors(pct), fh = Math.round(bh * pct);
    ctx.fillStyle = col[0]; ctx.fillRect(x + 4, H - 99 + bh - fh, 6, fh); ctx.fillStyle = col[1]; ctx.fillRect(x + 4, H - 99 + bh - fh, 2, fh);
    txt(label, x + 7, H - 106, "#ffe9b0", "center");
  };
  bar(W - 20, "E", state.energy, maxEnergy(), p => (p > 0.5 ? ["#4cc04a", "#8be07a"] : p > 0.25 ? ["#e0b030", "#f6d868"] : ["#d84a3a", "#f08a7a"]));
  if (state.hp < maxHp() || state.map === "mine") bar(W - 38, "HP", state.hp, maxHp(), p => (p > 0.3 ? ["#d83a3a", "#f07a7a"] : ["#ff7a2a", "#ffb070"]));
  if (invuln > 0.6) { ctx.fillStyle = "rgba(220,30,30,.25)"; ctx.fillRect(0, 0, W, H); }

  const tile = inBounds(tx, ty) ? tileAt(tx, ty) : null, id = tile && npcNear(tx, ty);
  const hint = !tile ? "" : petNear(tx, ty) && !id ? `E: pet ${state.pet.name}` : id ? `E: ${id === "zed" ? "trade with Zed" : "talk to " + VILLAGERS[id].name}` : tile.crop && tile.crop.age >= CROPS[tile.crop.type].days ? "Space: harvest" : tile.kind === "home" ? "E: enter house" : HINTS[tile.kind] ? HINTS[tile.kind] : tile.kind === "centre" ? "E: community centre" : tile.kind === "built" && tile.plot === "greenhouse" ? "E: enter greenhouse"
    : tile.kind === "bin" ? "E: sell goods" : tile.kind === "shop" ? "E: shop" : tile.kind === "mine" ? "E: enter mine" : tile.kind === "ladder" ? "E: go down" : tile.kind === "mexit" ? "E: leave mine"
    : tile.t === 2 && curTool() === "rod" ? "Space: fish" : tile.t === 13 && curTool() === "pick" ? "Space: mine" : tile.t === 3 && !tile.rock && tile.deco !== "cactus" && curTool() === "axe" ? "Space: chop" : "";
  if (hint) { const w = Math.round(ctx.measureText(hint).width) + 14; woodFrame(W - 44 - w, H - 56, w, 16, "rgba(60,44,12,.95)"); txt(hint, W - 51, H - 45, "#ffe27a", "right"); }

  const sw = 28, tx0 = Math.round((W - (COLS * sw - 2)) / 2), ty0 = H - 32, rows = state.pack / COLS;   // toolbar = one row of the backpack
  woodFrame(tx0 - 5, ty0 - 5, COLS * sw + 8, 36);
  for (let i = 0; i < COLS; i++) {
    const gi = state.row * COLS + i, slot = state.slots[gi], x = tx0 + i * sw, sel = gi === state.sel;
    slotBox(x, ty0, sel); if (slot) slotContent(slot, x, ty0);
    ctx.font = "7px monospace"; txt(i < 9 ? String(i + 1) : i === 9 ? "0" : i === 10 ? "-" : "=", x + 3, ty0 + 8, sel ? "#7a4a10" : "#7a5a30"); ctx.font = "9px monospace";
  }
  if (rows > 1) { woodFrame(tx0 - 30, ty0 - 2, 22, 30); ctx.font = "7px monospace"; txt("\u25b2\u25bc", tx0 - 19, ty0 + 10, "#ffe9b0", "center"); txt(`${state.row + 1}/${rows}`, tx0 - 19, ty0 + 21, "#c9a56a", "center"); ctx.font = "9px monospace"; }
  if (state.sel !== capSel) { capSel = state.sel; capUntil = clock + 1.8; }
  if (clock < capUntil && !state.ui && curSlot()) {
    const nm = slotName(curSlot()), w = Math.round(ctx.measureText(nm).width) + 12;
    woodFrame(Math.round(W / 2 - w / 2), ty0 - 24, w, 15, "rgba(40,26,14,.95)"); txt(nm, W / 2, ty0 - 13, "#fff", "center");
  }

  if (fishing?.phase === "reel") {                                                  // timing bar
    const bx = W / 2 - 70, by = H - 78;
    woodFrame(bx - 42, by - 16, 224, 36);
    txt(`${FISH[fishing.fish].name} on the line! Space in the green`, W / 2, by - 4, "#fff", "center");
    ctx.fillStyle = "#334"; ctx.fillRect(bx, by + 2, 140, 8);
    ctx.fillStyle = "#3ddc97"; ctx.fillRect(bx + fishing.zone * 140, by + 2, fishing.width * 140, 8);
    ctx.fillStyle = "#fff"; ctx.fillRect(bx + fishing.cursor * 140 - 1, by, 3, 12);
  }
  if (state.tut.on && state.tut.step < TUT_DONE.length && !state.ui) {
    const lines = wrap(`Tutorial ${state.tut.step + 1}/${TUT_DONE.length}: ${TUT_STEPS()[state.tut.step]}`, 326), top = state.fest ? 44 : 26;
    woodFrame(4, top, 350, lines.length * 11 + 12, "rgba(18,52,42,.95)");
    lines.forEach((l, i) => txt(l, 12, top + 14 + i * 11, "#e8fff4"));
  }
  if (state.tip && !state.ui) {
    const lines = wrap(`TIP: ${state.tip.text}`, 326);
    woodFrame(4, 92, 350, lines.length * 11 + 12, "rgba(60,44,12,.95)");
    lines.forEach((l, i) => txt(l, 12, 106 + i * 11, "#fff2c8"));
  }
  drawUi();
  if (state.msgT > 0) {
    const lines = wrap(state.msg, 420), top = state.ui ? H - 40 - lines.length * 11 : 26;   // keep clear of menu titles
    const mw = Math.min(430, Math.max(...lines.map(l => ctx.measureText(l).width)) + 22);
    woodFrame(Math.round(W / 2 - mw / 2), top - 2, mw, lines.length * 11 + 10);
    lines.forEach((l, i) => txt(l, W / 2, top + 9 + i * 11, "#fff", "center"));
  }
}

function panel(x, y, w, h, title) {
  woodFrame(x, y, w, h, "rgba(26,17,9,.95)");
  txt(title, x + 9, y + 16, "#3a2410"); txt(title, x + 8, y + 15, "#ffe08a");
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
    panel(40, 22, 400, 214, ui.only != null ? `WORKBENCH  (craft machines from materials)  E: close` : `${ui.pages ? "CARPENTER" : "SHOP"}: ${SHOP_PAGES[ui.page]} (page ${(ui.pages || OLIVER_PAGES).indexOf(ui.page) + 1}/${(ui.pages || OLIVER_PAGES).length})  $${state.money}  Tab: next  E: close`);
    if (ui.page === 4) {                                                             // what each house upgrade gives
      ctx.font = "9px monospace"; let dy = 142;
      HOUSE.slice(1).forEach(h => { txt(`${tr(h.name)}: ${tr(h.short)}`.slice(0, 74), 48, dy, state.house >= HOUSE.indexOf(h) ? "#8f8" : "#cfe8ff"); dy += 11; });
      txt(tf("Every upgrade adds +{0} max energy. Oliver needs 2 days to build.", HOUSE_ENERGY), 48, dy + 4, "#ffd23f");
    }
    if (ui.page === 5) { let dy = 112; for (const m of Object.values(MACHINES)) for (const l of wrap(`${tr(m.name)}: ${tr(m.desc)}`, 380)) { txt(l, 48, dy, "#cfe8ff"); dy += 11; } }
    SHOP(ui.page).forEach((it, i) => {
      const ok = it.cost !== Infinity && state.money >= it.cost && hasMats(it.mats);
      txt(`${i + 1}. ${it.label}${it.cost === Infinity || !it.cost ? "" : "  $" + it.cost}${it.mats ? " + " + matsText(it.mats) : ""}`, 48, 36 + (i + 1) * 14, it.cost === Infinity ? "#777" : ok ? "#fff" : "#f87171");
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
      txt(tr(`${i + 1}. ${questText(q)}  — $${q.reward}  (due day ${q.deadline}, for ${VILLAGERS[q.giver].name})`).slice(0, 76), 38, 48 + i * 13, "#fff");
    });
    if (!state.board.length) txt("The board is empty. Check back tomorrow.", 38, 48, "#777");
    txt(`Your quests (${state.quests.length}/3):`, 38, 112, "#ffd23f");
    const deliverIdx = {};
    state.quests.forEach((q, i) => {
      const L = q.type === "deliver" ? String.fromCharCode(65 + state.quests.filter(x => x.type === "deliver").indexOf(q)) : "-";
      txt(tr(`${L}. ${questText(q)} (${questProgress(q)}/${q.n}) $${q.reward}  due day ${q.deadline}`).slice(0, 76), 38, 126 + i * 13, q.type === "deliver" && questProgress(q) >= q.n ? "#8f8" : "#cfe8ff");
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
    panel(150, 76, 180, 90, "FARMHOUSE");
    txt("1. Sleep (end the day)", 160, 102); txt("2. Cook", 160, 118); txt("3. Wardrobe", 160, 134); txt("E: cancel", 160, 150, "#777");
  } else if (ui.type === "cook") {
    panel(40, 30, 400, 200, "KITCHEN  (number cooks, E to close)");
    state.recipes.slice(0, 9).forEach((id, i) => {
      const d = DISHES[id], ok = !!resolveNeed(d.need);
      ctx.drawImage(S.icon[id], 48, 40 + (i + 1) * 16 - 11, 12, 12);
      txt(`${i + 1}. ${tr(d.name)}: ${tr(needText(d.need))}  ($${d.price}, +${d.energy} ${tr("en")})`, 64, 40 + (i + 1) * 16, ok ? "#fff" : "#777");
    });
    txt("Eat food from the inventory (I, then a number). Befriend villagers to learn more recipes.", 48, 222, "#9aa");
  } else if (ui.type === "inv") drawInventory(ui);
  else if (ui.type === "pause") {
    panel(110, 62, 260, 140, "PAUSED");
    ["1. Resume", "2. Save game", `3. Music: ${audio.isMuted() ? "off" : "on"}`, `4. Tutorial hints: ${state.tut.on ? "on" : "off"}`, "5. Settings", "6. Quit to title"].forEach((s, i) => txt(s, 130, 90 + i * 16));
  } else if (ui.type === "chest") {
    const chest = ui.which === "cellar" ? state.cellarChest : state.chest, cap = ui.which === "cellar" ? CELLAR_CAP : CHEST_CAP(state.house), used = Object.keys(chest).filter(x => chest[x] > 0).length;
    const list = ui.mode === "store" ? invItems() : Object.entries(chest).filter(([, n]) => n > 0).sort((a, b) => itemInfo(a[0]).name.localeCompare(itemInfo(b[0]).name)), pages = Math.max(1, Math.ceil(list.length / 9));
    panel(40, 22, 400, 214, tf("{0} ({1}/{2} stacks)  Tab: {3}  E: close", tr(ui.which === "cellar" ? "CELLAR CHEST" : "STORAGE CHEST"), used, cap, tr(ui.mode === "store" ? "take" : "store")));
    txt(ui.mode === "store" ? "Press a number to store a stack from your bag." : "Press a number to take a stack from the chest.", 48, 56, "#ffd23f");
    list.slice(ui.page * 9, ui.page * 9 + 9).forEach(([id, n], i) => { ctx.drawImage(S.icon[id], 48, 70 + i * 15 - 10, 12, 12); txt(`${i + 1}. ${n}x ${itemInfo(id).name}`, 66, 70 + i * 15, "#fff"); });
    if (!list.length) txt(ui.mode === "store" ? "Your bag is empty." : "The chest is empty.", 48, 74, "#777");
    if (pages > 1) txt(`< ${ui.page + 1}/${pages} >`, 432, 228, "#c9a56a", "right");
  } else if (ui.type === "talk") {
    const v = VILLAGERS[ui.id], hh = hearts(ui.id), fe = festHostFor(ui.id);
    panel(50, 112, 380, 126, `${v.name} — ${v.job}`);
    for (let i = 0; i < 10; i++) drawHeart(300 + i * 12, 120, i < hh ? "#f0506a" : "#4a3a3a");
    { const kin = FAMILY[ui.id]?.[0]; if (kin) txt(tf("Family: {0} ({1})", VILLAGERS[kin[0]].name, tr(kin[1])), 114, 134, "#9aa"); }
    woodFrame(58, 128, 46, 62, "#7a5a36"); ctx.drawImage(S.npc[ui.id][0][0], 59, 134, 36, 52); ctx.drawImage(S.npc[ui.id][0][0], 59, 134, 0, 0);
    if (ui.mode === "event") txt("Press any key to continue", 114, 146, "#ffd23f");
    else if (ui.mode === "menu") txt(`1. Talk    2. Give gift${ui.id === "hazel" ? "    3. Buildings & house" : fe ? `    3. ${fe.id.endsWith("dance") ? "Join the dance" : "Festival entry"}` : ""}    E: leave`, 114, 146);
    else {
      txt("Pick a gift (number)  — E: leave", 114, 146, "#ffd23f");
      invItems().slice(0, 6).forEach(([id, n], i) => txt(`${i + 1}. ${n}x ${itemInfo(id).name}`, 114 + (i % 3) * 104, 162 + Math.floor(i / 3) * 12));
    }
    wrap(ui.text, 306).forEach((l, i) => txt(l, 114, 184 + i * 12, "#cfe8ff"));
  }
}
function drawHeart(x, y, c) {
  ctx.fillStyle = c;
  for (const [dx, dy, w] of [[1, 0, 2], [4, 0, 2], [0, 1, 7], [0, 2, 7], [1, 3, 5], [2, 4, 3], [3, 5, 1]]) ctx.fillRect(x + dx, y + dy, w, 1);
  ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(x + 1, y + 1, 1, 1);
}
const festHostFor = id => {
  const f = state.fest && !state.fest.done && FESTIVALS.find(x => x.id === state.fest.id);
  return f && (f.host ?? "rosa") === id && ["fair", "feast", "luau", "flowerdance", "stardance"].includes(f.id) ? f : null;
};

const MAP_COL = { 0: "#5aa04a", 1: "#8a6a40", 2: "#3a7ab8", 3: "#2e7a3e", 4: "#b8453d", 5: "#8a5a30", 6: "#3a6aa8", 7: "#c8b070", 8: "#dcc896", 10: "#b89a6a", 11: "#555560", 12: "#7a7a84", 14: "#ead49a", 15: "#bfe6ee", 16: "#6a8a94" };
let mapThumbs = null;
function mapThumb(id) {                                                             // one pixel per tile, coloured by terrain
  const key = `${state.day}:${state.build.greenhouse}:${id}`;
  if (mapThumbs?.[id]?.key === key) return mapThumbs[id].cv;
  const m = maps[id], cv = document.createElement("canvas"); cv.width = m.w; cv.height = m.h; const g = cv.getContext("2d");
  const sn = seasonOf(state.day), grass = ["#6cb85a", "#4fa84a", "#c8883a", "#dfe8ee"][sn];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = m.tiles[y][x];
    g.fillStyle = t.t === 0 ? grass : t.t === 3 ? (t.rock ? "#8a8a94" : t.deco === "palm" ? "#3a9a4a" : t.deco === "cactus" ? "#6a9a4a" : sn === 2 ? "#a8552a" : sn === 3 ? "#9ab8b0" : "#2e7a3e") : (MAP_COL[t.t] || grass);
    g.fillRect(x, y, 1, 1);
  }
  for (const o of m.objects) { g.fillStyle = o.sprite === "fountain" ? "#8ac8f0" : o.sprite === "lamp" ? "#ffe08a" : "#b8453d"; if (!["lamp", "fountain", "stall"].includes(o.sprite)) g.fillRect(o.x, o.y, o.w || 3, Math.max(1, o.h - 1)); }
  (mapThumbs ??= {})[id] = { key, cv }; return cv;
}
function drawMap() {
  panel(30, 14, 420, 232, "WORLD MAP  (number = fast travel, 30 min; N / E: close)");
  ctx.fillStyle = "#d8bf88"; ctx.fillRect(38, 32, 404, 198); ctx.fillStyle = "#c4a86e"; ctx.fillRect(38, 32, 404, 2); ctx.fillRect(38, 228, 404, 2); ctx.fillRect(38, 32, 2, 198); ctx.fillRect(440, 32, 2, 198);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = "rgba(120,90,40,.07)"; ctx.fillRect(40 + (i * 53) % 396, 36 + (i * 37) % 190, 14 + (i * 7) % 22, 3); }
  const here = state.map.startsWith("home_") || state.map.startsWith("store_") ? "town" : ["greenhouse", "house", "cellar"].includes(state.map) ? "farm" : state.map === "mine" ? "forest" : state.map;
  const cell = { forest: [240, 34], town: [240, 96], farm: [110, 96], desert: [370, 96], beach: [240, 158], island: [370, 158] };    // top-left y of each 56px-high cell; x is the centre
  const sc = id => Math.min(118 / maps[id].w, 46 / maps[id].h), mid = id => [cell[id][0], cell[id][1] + 11 + maps[id].h * sc(id) / 2];
  ctx.strokeStyle = "#8a5a30"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
  for (const [a, b] of [["farm", "town"], ["town", "desert"], ["forest", "town"], ["town", "beach"], ["beach", "island"]]) {
    const A = mid(a), B = mid(b); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineWidth = 1;
  for (const id of Object.keys(cell)) {
    const [cx, cy] = cell[id], seen = state.visited[id], cur = id === here, m = maps[id], k = sc(id), w = Math.round(m.w * k), h = Math.round(m.h * k), x = Math.round(cx - w / 2), y = cy + 11;
    ctx.fillStyle = "rgba(60,40,20,.35)"; ctx.fillRect(x + 2, y + 2, w, h);
    if (seen) ctx.drawImage(mapThumb(id), x, y, w, h); else { ctx.fillStyle = "#8a8a94"; ctx.fillRect(x, y, w, h); }
    ctx.strokeStyle = cur ? `rgba(255,255,255,${0.7 + 0.3 * Math.sin(clock * 6)})` : "#4a3220"; ctx.lineWidth = cur ? 2 : 1; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1); ctx.lineWidth = 1;
    txt(seen ? m.name : "???", cx, y - 3, "#3a2410", "center");
    if (seen) for (const [nid, n] of Object.entries(npcs)) if (n.map === id) { ctx.fillStyle = "#ff7a9c"; ctx.fillRect(x + Math.round(n.x / T * k) - 1, y + Math.round(n.y / T * k) - 1, 3, 3); }
    if (cur) { const px = x + Math.round(state.px / T * k), py = y + Math.round(state.py / T * k); ctx.fillStyle = "#14121f"; ctx.fillRect(px - 3, py - 3, 7, 7); ctx.fillStyle = Math.sin(clock * 8) > 0 ? "#ffd23f" : "#fff"; ctx.fillRect(px - 2, py - 2, 5, 5); }
  }
  if (state.build.greenhouse === "built") txt("+ Greenhouse", 110, 90, "#5a3a14", "center");
  txt("+ Mine (Forest)", 330, 56, "#5a3a14", "center");
  txt("pink dots = villagers", 48, 46, "#5a3a14");
  txt("1. Farm  2. Town  3. Forest  4. Beach  5. Desert  6. Island ($50)", 250, 222, "#2a1a08", "center");
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
  const lines = [state.name ? tf("Well done, {0}!", state.name) : "", `The whole valley gathers to celebrate what you've built.`, ``, `Days played: ${state.day}   Money: $${state.money}   Fish caught: ${state.caught}`,
    `Skills: ${Object.keys(SKILLS).map(k => `${tr(SKILLS[k].name)} ${skillLevel(k)}`).join(", ")}`, `Married: ${state.spouse ? VILLAGERS[state.spouse].name : tr("no")}   Pet: ${state.pet ? state.pet.name : tr("none")}   Horse: ${tr(state.horse ? "yes" : "no")}`, ``,
    `You received $${RESTORE_PRIZE} as a thank-you.`, `Thanks for playing Tiny Valley! Keep farming as long as you like.`, ``, `(press any key)`];
  let ey = 58;                                                                       // each wrapped row gets its own line
  lines.forEach((l, i) => { const rows = l ? wrap(l, 360) : [""]; rows.forEach(w => { txt(w, 60, ey, i === 7 ? "#ffd23f" : i === 0 ? "#ffe9b0" : "#fff"); ey += 13; }); });
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

// ---------------------------------------------------------------- backpack: slots, hotbar and the inventory screen
function slotBox(x, y, sel, size = 26, tint = false) {
  ctx.fillStyle = sel ? "#ffffff" : "#6a4420"; ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
  ctx.fillStyle = sel ? "#f4d68a" : tint ? "#c8a064" : "#b98d52"; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = sel ? "#ffe9a8" : tint ? "#dcb67c" : "#d2ab72"; ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
}
function slotContent(slot, x, y, off = 5, nums = true) {                           // icon plus level / count badge
  ctx.drawImage(S.icon[slot.id], x + off, y + off);
  let badge = "";
  if (slot.k === "tool") { const lvl = { hoe: state.hoeLevel, can: state.canLevel, pick: state.pickLevel, sword: state.swordLevel, axe: state.axeLevel }[slot.id] || 0; if (lvl > 0) badge = `L${lvl + 1}`; }
  else { const n = slotCount(state, slot); if (n > 1) badge = n > 999 ? "999+" : String(n); }
  if (slot.k === "seed") {                                                         // seed packets get a little paper packet so they differ from the crop
    const px = off === 5 ? x + 17 : x + 13, py = off === 5 ? y + 3 : y + 1;
    ctx.fillStyle = "#5a3a1c"; ctx.fillRect(px, py, 8, 11); ctx.fillStyle = "#ead6a2"; ctx.fillRect(px + 1, py + 1, 6, 9); ctx.fillStyle = "#c8a868"; ctx.fillRect(px + 1, py + 1, 6, 2);
    ctx.fillStyle = "#4aa84a"; ctx.fillRect(px + 3, py + 5, 2, 3); ctx.fillStyle = "#8ad87a"; ctx.fillRect(px + 2, py + 4, 1, 1); ctx.fillRect(px + 5, py + 4, 1, 1);
  }
  const r = off === 5 ? 25 : 21, b = off === 5 ? 24 : 20;
  if (badge && nums) { ctx.font = "7px monospace"; txt(badge, x + r, y + b, "#000", "right"); txt(badge, x + r - 1, y + b - 1, "#fff", "right"); ctx.font = "9px monospace"; }
  if (slot.k === "tool" && slot.id === "can") { const w = off === 5 ? 20 : 16; ctx.fillStyle = "#2a3a58"; ctx.fillRect(x + off - 2, y + (off === 5 ? 22 : 18), w, 3); ctx.fillStyle = "#5aa8f0"; ctx.fillRect(x + off - 2, y + (off === 5 ? 22 : 18), Math.round(w * state.water / maxWater()), 3); }
}
const slotName = slot => (slot.k === "tool" ? tr(TOOL_NAMES[slot.id]) : slot.k === "seed" ? tf("{0} seeds", tr(itemInfo(slot.id).name)) : tr(itemInfo(slot.id).name));
function eatValue(id) {
  let e = edibleEnergy(id);
  if (e && hasPerk("naturalist") && (CROPS[id] || FORAGE[id])) e *= 3;
  if (e && DISHES[id] && state.house >= 1) e = Math.round(e * 1.25);                 // kitchen upgrade
  return e;
}
const TOOL_DESC = { axe: "Chops trees for wood. Trees grow back after about a week. Upgrade it at the shop to chop faster.", hoe: "Tills the soil so you can plant seeds. Upgrade it at the shop to till several tiles at once.", rod: "Fish in ponds, the lake and the ocean. Press Space to cast, and again to hook the fish.", pick: "Breaks rocks and ore nodes. Upgrade it to mine harder ore.", sword: "Swing it at monsters in the mine." };
const ITEM_DESC = { wood: "Chopped from trees. Used to build and upgrade things.", hay: "Feed for your animals.", milk: "Fresh from your cows.", egg: "Fresh from your chickens.", tonic: "A strong drink that perks you right up.", bouquet: "Give it to someone you like a lot.", pendant: "A proposal gift for the one you love.", sprinkler: "Place it on your farm (press P). It waters nearby soil every night.", qsprinkler: "Place it on your farm (press P). It waters a wider area every night.", slime: "Dropped by monsters in the mine.", batwing: "Dropped by monsters in the mine.", bone: "Dropped by monsters in the mine.", pearl: "A rare treasure.", coin: "A rare treasure.", relic: "A rare treasure." };
function slotInfo(slot) {
  if (slot.k === "tool") {
    const lvl = { hoe: state.hoeLevel, can: state.canLevel, pick: state.pickLevel, sword: state.swordLevel, axe: state.axeLevel }[slot.id] || 0;
    return { name: slotName(slot) + (lvl ? ` L${lvl + 1}` : ""), desc: slot.id === "can" ? tf("Waters your crops. Holds {0} water. Refill it at any pond.", maxWater()) : tr(TOOL_DESC[slot.id]) };
  }
  const id = slot.id;
  if (slot.k === "seed") return { name: slotName(slot), desc: tf("Plant on tilled soil. Grows in {0} days. Season: {1}.", CROPS[id].days, seasonTag(id)) + (CROPS[id].regrow ? " " + tr("Keeps producing.") : ""), count: slotCount(state, slot) };
  const desc = ITEM_DESC[id] ? tr(ITEM_DESC[id]) : CROPS[id] ? tr("A crop grown on your farm. Sell it, cook with it or give it as a gift.") : FORAGE[id] ? tr("Found growing wild. Sell it, cook with it or give it as a gift.")
    : FISH[id] ? tr("Caught with a fishing rod. Great for cooking or selling.") : ORES[id] ? tr("Mined from rocks and ore nodes. Used for upgrades and building.") : DISHES[id] ? tr("A hearty cooked meal.") : tr("A curious find.");
  return { name: slotName(slot), desc, price: sellPrice(id), energy: eatValue(id), count: slotCount(state, slot) };
}

let invHits = [];
function invSlotTap(ui, i) {                                                        // pick an item up, then tap another slot to swap
  ui.cur = i; ui.trashAsk = null;
  if (ui.held == null) { if (state.slots[i]) { ui.held = i; audio.beep(520, 0.04, "triangle"); } return; }
  if (ui.held !== i) { const a = state.slots; [a[ui.held], a[i]] = [a[i], a[ui.held]]; audio.beep(640, 0.05, "triangle"); }
  ui.held = null;
}
function invUse(ui) {
  const sl = state.slots[ui.cur]; if (!sl) return;
  if (sl.k === "item") { if (eatValue(sl.id)) eat(sl.id); else say(`${slotName(sl)}: ${tf("Sells for ${0}", sellPrice(sl.id))}`, 2.5); }
  else { selectSlot(ui.cur); say(tf("{0} selected.", slotName(sl)), 2); }
}
function invTrash(ui) {
  const sl = state.slots[ui.cur]; if (!sl) return;
  if (sl.k === "tool") return say("Tools can't be trashed.", 2.5);
  if (ui.trashAsk !== ui.cur) { ui.trashAsk = ui.cur; return say(tf("Trash {0}? Press Trash again to confirm.", slotName(sl)), 3); }
  (sl.k === "seed" ? state.seeds : state.inv)[sl.id] = 0; ui.trashAsk = null; say(tf("Trashed {0}.", slotName(sl)), 2); audio.beep(200, 0.1, "sawtooth");
}
function invKey(ui, k) {
  const n = state.slots.length;
  if (k === "escape" || k === "e" || k === "i") { if (ui.held != null) { ui.held = null; return; } return void (state.ui = null); }
  if (k === "tab") { ui.tab = (ui.tab + 1) % 3; return; }
  if (ui.tab !== 0) { if (k === "arrowright") ui.tab = (ui.tab + 1) % 3; else if (k === "arrowleft") ui.tab = (ui.tab + 2) % 3; return; }
  ui.cur ??= state.sel;
  const move = d => { ui.cur = (ui.cur + d + n) % n; ui.trashAsk = null; };
  if (k === "arrowleft" || k === "a") move(-1);
  else if (k === "arrowright" || k === "d") move(1);
  else if (k === "arrowup" || k === "w") move(-COLS);
  else if (k === "arrowdown" || k === "s") move(COLS);
  else if (k === "enter" || k === " ") invSlotTap(ui, ui.cur);
  else if (k === "u") invUse(ui);
  else if (k === "t") invTrash(ui);
  else if (k === "r") { sortSlots(state); ui.held = null; audio.beep(600, 0.05, "triangle"); }
}
function invTap(cx, cy) {
  for (let i = invHits.length - 1; i >= 0; i--) { const r = invHits[i]; if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) { r.fn(); return true; } }
  return false;
}
const rawText = (s, x, y, c = "#fff", a = "left") => { ctx.fillStyle = c; ctx.textAlign = a; ctx.fillText(s, x, y); ctx.textAlign = "left"; };   // player-typed text is never translated
function invButton(x, y, w, label, hot, fn) {
  woodFrame(x, y, w, 16, hot ? "rgba(120,50,30,.97)" : "rgba(34,22,12,.95)"); txt(label, x + w / 2, y + 12, hot ? "#ffb0a0" : "#ffe9b0", "center"); invHits.push({ x, y, w, h: 16, fn });
}
function drawInventory(ui) {
  invHits = [];
  woodFrame(26, 6, 428, 258, "rgba(34,22,12,.95)");
  ["Items", "Friends", "Skills"].forEach((t, i) => {                                // tab bar
    const x = 36 + i * 78, on = ui.tab === i;
    ctx.fillStyle = on ? "#f4d68a" : "#8a5a30"; ctx.fillRect(x, on ? 8 : 11, 74, on ? 20 : 17); ctx.fillStyle = on ? "#ffe9a8" : "#a8743c"; ctx.fillRect(x + 1, on ? 9 : 12, 72, 3);
    txt(t, x + 37, 22, on ? "#5a3410" : "#ffe9b0", "center"); invHits.push({ x, y: 8, w: 74, h: 20, fn: () => { ui.tab = i; } });
  });
  ctx.fillStyle = "#ffd23f"; ctx.fillRect(360, 15, 7, 7); txt(`${state.money}`, 414, 22, "#fff", "right");
  woodFrame(424, 9, 24, 19, "rgba(120,50,30,.97)"); txt("X", 436, 22, "#ffd0c0", "center"); invHits.push({ x: 424, y: 9, w: 24, h: 19, fn: () => { if (ui.held != null) ui.held = null; else state.ui = null; } });   // close
  if (ui.tab === 0) drawPackTab(ui); else drawInvOther(ui);
}
function drawPackTab(ui) {
  const n = state.slots.length, rows = n / COLS, GX = 138, GY = 36, P = 25, SZ = 22;
  ui.cur = Math.max(0, Math.min(n - 1, ui.cur ?? state.sel));
  // character card
  woodFrame(32, 32, 100, 106, "rgba(90,130,60,.9)");
  ctx.fillStyle = "#9fcf6a"; ctx.fillRect(36, 36, 92, 98); ctx.fillStyle = "#86bd56"; for (let i = 0; i < 12; i++) ctx.fillRect(38 + (i * 37) % 86, 40 + (i * 53) % 90, 2, 1);
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(56, 120, 52, 6);
  const pimg = S.player[0][Math.floor(clock * 2) % 4 === 3 ? 1 : 0]; ctx.drawImage(pimg, 82 - 27 - (pimg.ox || 0) * 3, 124 - 72 - (pimg.oy || 0) * 3, pimg.width * 3, pimg.height * 3);
  ctx.font = "bold 10px monospace"; rawText(state.name || "Farmer", 82, 152, "#ffe9b0", "center"); ctx.font = "9px monospace";
  const se = seasonOf(state.day);
  txt(`${tr(SEASONS[se].name)} ${dayOfSeason(state.day)}, Y${yearOf(state.day)}`, 82, 165, "#cfe8ff", "center");
  txt(tf("Energy {0}/{1}", Math.round(state.energy), maxEnergy()), 82, 178, "#8be07a", "center"); txt(tf("Health {0}/{1}", Math.round(state.hp), maxHp()), 82, 190, "#f07a7a", "center");
  invButton(34, 198, 30, "Use", false, () => invUse(ui)); invButton(66, 198, 30, "Sort", false, () => { sortSlots(state); ui.held = null; audio.beep(600, 0.05, "triangle"); }); invButton(98, 198, 32, "Trash", ui.trashAsk === ui.cur, () => invTrash(ui));
  txt(tf("Bag {0}/{1}", usedSlots(state), n), 82, 228, usedSlots(state) >= n ? "#ff9a8a" : "#c9a56a", "center");
  if (state.pack < 36) txt("Bigger bag: shop", 82, 240, "#a98a5a", "center");
  // slot grid (the first row is the hotbar; Tab changes which row it shows)
  for (let i = 0; i < n; i++) {
    const x = GX + (i % COLS) * P, y = GY + Math.floor(i / COLS) * P, sl = state.slots[i], on = i === ui.cur;
    slotBox(x, y, on, SZ, i >= state.row * COLS && i < state.row * COLS + COLS);
    if (sl) { if (ui.held === i) ctx.globalAlpha = 0.4; slotContent(sl, x, y, 3); ctx.globalAlpha = 1; }
    if (i === state.sel) { ctx.strokeStyle = "#e84a3a"; ctx.strokeRect(x - 1.5, y - 1.5, SZ + 3, SZ + 3); }
    invHits.push({ x, y, w: P, h: P, fn: () => invSlotTap(ui, i) });
  }
  if (ui.held != null && state.slots[ui.held]) { const x = GX + (ui.cur % COLS) * P + 8, y = GY + Math.floor(ui.cur / COLS) * P + 8; slotContent(state.slots[ui.held], x, y, 0, false); }
  // details
  const DY = GY + rows * P + 8;
  woodFrame(GX - 3, DY, 318, 258 - DY - 22, "rgba(26,17,9,.96)");
  const sl = state.slots[ui.cur];
  if (ui.held != null && state.slots[ui.held]) {
    txt(tf("Holding {0}.", slotName(state.slots[ui.held])), GX + 6, DY + 16, "#ffd23f");
    wrap("Pick a slot and press Enter to put it there (items swap places).", 296).forEach((l, i) => txt(l, GX + 6, DY + 30 + i * 11, "#cfe8ff"));
  } else if (sl) {
    const info = slotInfo(sl); ctx.font = "bold 10px monospace"; txt(info.name, GX + 6, DY + 16, "#ffe9b0"); ctx.font = "9px monospace";
    if (info.count > 1) txt(`x${info.count}`, GX + 306, DY + 16, "#fff", "right");
    let ty = DY + 30; wrap(info.desc, 296).forEach(l => { txt(l, GX + 6, ty, "#fff"); ty += 11; });
    ty += 4;
    if (info.energy) { txt(tf("Restores {0} energy and health.", info.energy), GX + 6, ty, "#8be07a"); ty += 11; }
    if (info.price) txt(tf("Sells for ${0}", info.price), GX + 6, ty, "#ffd23f");
  } else txt("Empty slot", GX + 6, DY + 16, "#8a7a5a");
  const hint = state.msgT > 0 && state.msg ? state.msg : isTouch() ? "Tap an item, then another slot to swap." : "Enter: pick up / place · U: use · T: trash · R: sort";
  txt(hint, GX - 3, 258, state.msgT > 0 ? "#ffe9a8" : "#a98a5a");
}
function drawInvOther(ui) {
  let y = 44;
  if (ui.tab === 2) {
    for (const [id, sk] of Object.entries(SKILLS)) {
      const lv = skillLevel(id), xp = state.xp[id], lo = XP_TABLE[lv - 1], hi = XP_TABLE[lv] ?? lo + 1, frac = lv >= 10 ? 1 : (xp - lo) / (hi - lo);
      txt(`${sk.name}  Lv ${lv}${lv >= 10 ? " (max)" : `  (${xp}/${hi} xp)`}`, 40, y, "#fff");
      ctx.fillStyle = "#334"; ctx.fillRect(40, y + 3, 160, 6); ctx.fillStyle = "#3ddc97"; ctx.fillRect(40, y + 3, 160 * frac, 6);
      txt(sk.perk, 40, y + 20, "#9aa"); y += 36;
    }
    txt(`Max HP ${maxHp()}`, 40, y, "#ff7a9c");
    const chosen = Object.entries(state.perks).map(([k, id]) => { const sk = k.replace(/\d+$/, ''), tier = k.slice(sk.length); return PERKS[sk][tier].find(p => p.id === id).name; });
    txt(tr(`Perks: ${chosen.length ? chosen.join(", ") : "none yet (levels 5 and 10)"}`).slice(0, 70), 40, y + 12, "#ffd23f");
  } else {
    Object.entries(VILLAGERS).forEach(([id, v], i) => {
      const cx = 40 + (i % 2) * 205, cy = y + Math.floor(i / 2) * 24;
      ctx.drawImage(S.npc[id][0][0], cx - 1, cy - 12);
      txt(tr(`${v.name} (${v.job})`).slice(0, 22), cx + 22, cy - 2);
      { const b = BIRTHDAYS[id]; txt(`${birthdayOf(id) ? "* " : ""}${tr(SEASONS[b.s].name).slice(0, 3)} ${b.d}`, cx + 150, cy - 2, birthdayOf(id) ? "#ffd23f" : "#9aa"); }
      txt(`${"*".repeat(Math.min(10, hearts(id)))}${".".repeat(10 - hearts(id))}`, cx + 22, cy + 8, "#ff7a9c");
      txt(tr(v.loves.slice(0, 2).map(i => itemInfo(i).name).join(", ")).slice(0, 18), cx + 22 + 62, cy + 8, "#8f8");
    });
    y += Math.ceil(Object.keys(VILLAGERS).length / 2) * 24 - 4;
    y += 2;
    const rel = state.spouse ? `Married to ${VILLAGERS[state.spouse].name}` : state.engaged ? `Engaged to ${VILLAGERS[state.engaged.id].name} — wedding on day ${state.engaged.day}` : state.dating ? `Dating ${VILLAGERS[state.dating].name}` : "Single (8 hearts + bouquet to date, 10 + pendant to marry)";
    txt(rel, 40, y, "#ff7a9c");
    txt(tr(`Recipes: ${state.recipes.map(r => DISHES[r].name).join(", ")}`).slice(0, 74), 40, y + 12, "#ffd23f");
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
  for (let y = 11; y < 17; y++) for (let x = 0; x < 30; x++) ctx.drawImage(S.tile("grass", 0, Math.floor(hash(x, y, 4) * 8), 0), x * T, y * T);
  for (let x = 4; x < 12; x++) { ctx.drawImage(S.tile("soil", 0, 0, (x === 4 ? 8 : 0) | (x === 11 ? 2 : 0) | 1 | 4, { wet: true }), x * T, 12 * T); const ci = S.crop[CROP_IDS[x % CROP_IDS.length]][4]; ctx.drawImage(ci, x * T - ci.ox, 13 * T - 24 - ci.oy); }
  shadow(20 * T + 24, 11 * T - 1, 26, 3); blit({ img: S.bldg.home, x: 18 * T - 4, y: 11 * T - 56 }); for (const tx of [25, 1, 14]) { shadow(tx * T + 8, 11 * T - 2, 8, 3); blit({ img: S.tree[0][tx % 2], x: tx * T - 4, y: 11 * T - 34 }); }
  const wx = ((clock * 20) % (W + 30)) - 20; shadow(wx + 8, 14 * T + 14, 5, 2); blit({ img: S.player[2][[1, 0, 2, 0][Math.floor(clock * 6) % 4]], x: wx, y: 14 * T - 10 });
  shadow(15 * T + 6, 14 * T + 13, 5, 2); blit({ img: S.chicken[Math.floor(clock * 2) % 4 === 0 ? 1 : 0], x: 15 * T, y: 14 * T + 4 });
  ctx.font = "bold 30px monospace"; txt("TINY VALLEY", W / 2 + 2, 62, "#2b3b20", "center"); txt("TINY VALLEY", W / 2, 60, "#ffe9a8", "center");
  ctx.font = "10px monospace"; txt("a cozy farming adventure", W / 2, 78, "#2b3b20", "center");
  const opts = titleOptions(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(W / 2 - 70, 92, 140, opts.length * 16 + 10);
  opts.forEach((o, i) => txt(`${i === titleSel ? "> " : "  "}${o}`, W / 2, 108 + i * 16, i === titleSel ? "#ffd23f" : "#fff", "center"));
  ctx.font = "9px monospace"; txt("W/S select · Enter start · M toggles music · O settings", W / 2, H - 8, "#fff", "center");
  drawGear();
}

// ---------------------------------------------------------------- save slots (title screen)
let slotUi = null;
const slotLabel = n => {
  const m = slotMeta(n); if (!m) return tr("Empty slot");
  return `${m.name || "Farmer"} — ${tr(SEASONS[seasonOf(m.day)].name)} ${dayOfSeason(m.day)}, Y${yearOf(m.day)} — $${m.money}`;
};
function slotKey(k) {
  const list = slotUi.mode === "load" ? [1, 2, 3, 0] : [1, 2, 3];
  const go = n => {
    if (slotUi.mode === "load") { if (!slotMeta(n)) return audio.beep(150, 0.1, "sawtooth"); slotUi = null; return startGame(true, true, n); }
    if (slotMeta(n)) { slotUi.confirm = n; return; }
    slotUi = null; startGame(false, false, n);
  };
  if (slotUi.confirm != null) {
    if (k === "1" || k === "enter") { const n = slotUi.confirm; slotUi = null; startGame(false, false, n); }
    else if (k === "2" || k === "e" || k === "escape") slotUi.confirm = null;
    return;
  }
  if (k === "escape" || k === "e") { slotUi = null; return; }
  if (k === "arrowup" || k === "w") slotUi.sel = (slotUi.sel + list.length - 1) % list.length;
  else if (k === "arrowdown" || k === "s") slotUi.sel = (slotUi.sel + 1) % list.length;
  else if (k === "enter" || k === " ") go(list[slotUi.sel]);
  else if (/^[1-4]$/.test(k) && list[Number(k) - 1] != null) { slotUi.sel = Number(k) - 1; go(list[slotUi.sel]); }
}
function drawSlotUi() {
  rec = [];
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, H);
  woodFrame(50, 52, 380, 168); ctx.font = "bold 11px monospace";
  txt(slotUi.mode === "load" ? "LOAD GAME" : "NEW GAME — CHOOSE A SLOT", W / 2, 72, "#ffe9b0", "center"); ctx.font = "9px monospace";
  if (slotUi.confirm != null) {
    txt(tf("Slot {0} is in use. Overwrite it?", slotUi.confirm), W / 2, 112, "#ffb0a0", "center");
    txt("1. Yes, overwrite", 150, 142, "#fff"); txt("2. No", 150, 160, "#fff");
  } else {
    const list = slotUi.mode === "load" ? [1, 2, 3, 0] : [1, 2, 3];
    list.forEach((n, i) => txt(`${i + 1}. ${n === 0 ? tr("Autosave") + ": " : ""}${slotLabel(n)}`.slice(0, 66), 62, 100 + i * 22, slotUi.sel === i ? "#ffd23f" : slotMeta(n) ? "#fff" : "#8a7a5a"));
    txt("E: back", W / 2, 212, "#c9a56a", "center");
  }
  uiLines = rec; rec = null;
}

// ---------------------------------------------------------------- settings overlay (works on the title screen too)
let setUi = null;
const SIZE_NAMES = ["Small", "Medium", "Large"];
function openSettings() { setUi = { sel: 0 }; audio.beep(520, 0.06, "triangle"); }
function settingsRows() {
  const c = settings(), rows = [
    { id: "lang", label: `Language: ${c.lang === "hu" ? "Magyar" : "English"}`, go: () => setSetting("lang", c.lang === "hu" ? "en" : "hu") },
    { id: "music", label: `Music: ${audio.isMuted() ? "off" : "on"}`, go: () => audio.toggleMute() },
    { id: "sfx", label: `Sound effects: ${c.sfx ? "on" : "off"}`, go: () => setSetting("sfx", !c.sfx) },
  ];
  if (scene === "game" && state) rows.push({ id: "tut", label: `Tutorial hints: ${state.tut.on ? "on" : "off"}`, go: () => { state.tut.on = !state.tut.on; if (state.tut.on && state.tut.step >= TUT_DONE.length) state.tut.step = 0; } });
  rows.push({ id: "screen", label: `Phone screen: ${{ normal: "Upright", cw: "Rotated right", ccw: "Rotated left" }[c.screen] ?? "Upright"}`, go: () => setSetting("screen", { normal: "cw", cw: "ccw", ccw: "normal" }[c.screen] ?? "cw") });
  rows.push({ id: "ctrl", label: `Touch controls: ${SIZE_NAMES[CTRL_SIZES.indexOf(c.ctrl)] ?? "Medium"}`, go: () => setSetting("ctrl", CTRL_SIZES[(Math.max(0, CTRL_SIZES.indexOf(c.ctrl)) + 1) % CTRL_SIZES.length]) });
  rows.push({ id: "haptics", label: `Vibration: ${c.haptics ? "on" : "off"}`, go: () => setSetting("haptics", !c.haptics) });
  return rows;
}
function settingsKey(k) {
  const rows = settingsRows();
  if (k === "escape" || k === "e" || k === "o") { setUi = null; return; }
  if (k === "arrowup" || k === "w") setUi.sel = (setUi.sel + rows.length - 1) % rows.length;
  else if (k === "arrowdown" || k === "s") setUi.sel = (setUi.sel + 1) % rows.length;
  else if (k === "enter" || k === " " || k === "arrowleft" || k === "arrowright") rows[setUi.sel]?.go();
  else if (/^[1-9]$/.test(k) && rows[Number(k) - 1]) { setUi.sel = Number(k) - 1; rows[setUi.sel].go(); }
  else return;
  audio.beep(600, 0.05, "triangle");
}
function drawSettings() {
  rec = [];
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 0, W, H);
  const rows = settingsRows(), h = 52 + rows.length * 18, y0 = Math.round((H - h) / 2);
  woodFrame(100, y0, 280, h); ctx.font = "bold 11px monospace";
  txt("SETTINGS", W / 2, y0 + 18, "#ffe9b0", "center"); ctx.font = "9px monospace";
  rows.forEach((r, i) => txt(`${i + 1}. ${r.label}`, 118, y0 + 38 + i * 18, i === setUi.sel ? "#ffd23f" : "#fff"));
  txt("E / O: close", W / 2, y0 + h - 8, "#c9a56a", "center");
  uiLines = rec; rec = null;
}
// Gear button for mouse users (touch devices have an HTML one); top-right on the title, bottom-right in game.
const gearBox = title => ({ x: W - 20, y: title ? 4 : H - 20, w: 16, h: 16 });
const gearHit = (cx, cy, title) => { const g = gearBox(title); return cx >= g.x - 2 && cx <= g.x + g.w + 2 && cy >= g.y - 2 && cy <= g.y + g.h + 2; };
function drawGear() {
  if (isTouch() || setUi) return;
  const g = gearBox(scene === "title"), cx = g.x + 8, cy = g.y + 8;
  woodFrame(g.x, g.y, g.w, g.h);
  ctx.fillStyle = "#ffe9b0";
  for (let a = 0; a < 8; a++) { const r = a * Math.PI / 4; ctx.fillRect(Math.round(cx + Math.cos(r) * 4.5) - 1, Math.round(cy + Math.sin(r) * 4.5) - 1, 2, 2); }
  ctx.fillRect(cx - 3, cy - 3, 6, 6); ctx.fillStyle = "#3a2410"; ctx.fillRect(cx - 1, cy - 1, 2, 2);
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
  const { x: cx, y: cy } = canvasPoint(e, canvas, W, H);
  if (setUi) { const k = hitUi(cx, cy); if (k) dispatchKey(k); return; }
  if (slotUi) { const k = hitUi(cx, cy); if (k) dispatchKey(k); return; }
  if (scene === "intro") return intro.tap(cx, cy);
  if (scene === "builder") return builder.tap(cx, cy);
  if (!isTouch() && gearHit(cx, cy, scene === "title")) return openSettings();
  if (scene === "title") {
    const opts = titleOptions(), i = Math.floor((cy - 98) / 16);
    if (i >= 0 && i < opts.length && cx > W / 2 - 70 && cx < W / 2 + 70) { titleSel = i; dispatchKey("enter"); }
    return;
  }
  if (cuts.active) { cuts.key("enter"); return; }
  if (state.ui?.type === "inv" && invTap(cx, cy)) return;
  if (state.ui) { const k = hitUi(cx, cy); if (k) dispatchKey(k); return; }
  const tb0 = Math.round((W - (COLS * 28 - 2)) / 2);
  if (cy >= H - 36) {
    if (state.pack > COLS && cx >= tb0 - 30 && cx < tb0 - 6) return cycleRow();
    const i = Math.floor((cx - tb0) / 28); if (i >= 0 && i < COLS) selectSlot(state.row * COLS + i);
  }
});
initTouch(); initView();
// Static page labels follow the language setting.
const domText = [...document.querySelectorAll("#controls button[data-key], #rotate")].filter(el => el.id !== "more" && el.id !== "gear");
for (const el of domText) if (/[A-Za-z]{2,}/.test(el.textContent)) el.dataset.en = el.textContent;
const helpEl = document.getElementById("help"); if (helpEl) helpEl.dataset.en = helpEl.innerHTML;
function applyDom() {
  document.documentElement.lang = lang();
  for (const el of domText) if (el.dataset.en) el.textContent = tr(el.dataset.en);
  if (helpEl) helpEl.innerHTML = lang() === "hu" ? HELP_HU : helpEl.dataset.en;
}
onSetting(k => { if (k === "lang") applyDom(); }); applyDom();
// Phones kill backgrounded tabs: save and silence audio whenever the page is hidden.
const onHide = () => { if (document.visibilityState === "hidden" || document.visibilityState === undefined) { if (scene === "game" && state) save(); audio.setPaused(true); } else audio.setPaused(false); };
document.addEventListener("visibilitychange", onHide); addEventListener("pagehide", () => { if (scene === "game" && state) save(); });
let lastUiOpen = null, lastTitle = null, lastIntro = null, lastInv = null;
function syncBodyClasses() {
  const uiOpen = (scene === "game" && (!!state?.ui || cuts.active)) || !!setUi, title = scene === "title", inIntro = (scene === "intro" || scene === "builder") && !setUi;
  if (uiOpen !== lastUiOpen) { document.body.classList.toggle("ui-open", uiOpen); lastUiOpen = uiOpen; }
  if (title !== lastTitle) { document.body.classList.toggle("scene-title", title); lastTitle = title; }
  const invOpen = scene === "game" && state?.ui?.type === "inv" && !setUi;
  if (invOpen !== lastInv) { document.body.classList.toggle("inv-open", invOpen); lastInv = invOpen; }
  if (inIntro !== lastIntro) { document.body.classList.toggle("scene-intro", inIntro); lastIntro = inIntro; }
}

const intro = makeIntro({ ctx, W, H, S, txt, wrap, woodFrame, tr, tf, beep: audio.beep, isTouch, name: () => state?.name || "" });
const builder = makeBuilder({ ctx, W, H, S, txt, woodFrame, beep: audio.beep, lang, isTouch });

// ---------------------------------------------------------------- boot
if (location.search.includes("debug")) window.__farm = {
  S, get state() { return state; }, get maps() { return maps; }, get npcs() { return npcs; }, get fishing() { return fishing; },
  sleep, useTool, startGame: (cont, skip = true) => startGame(cont, skip), builder: () => builder, selectSlot, get slots() { return state.slots; }, dropItem, addItem, sortSlots: () => sortSlots(state), enterHouse, ensureHouseMaps, chestKey, get scene() { return scene; }, intro: () => intro, goMap, enterMine, interact, cook, eat, startFestival, festProgress, swing, get monsters() { return monsters; }, get animals() { return animals; }, makeAnimals, restoreCentre, get cuts() { return cuts; },  travelTo, hasPerk, openPerk, startDance, danceJudge, giveSpecial, openSettings, settingsKey, get setUi() { return setUi; }, untranslated, placePet, depositItem, toggleMount, placeSprinkler, genQuest, refreshBoard, questEvent, gainXp, skillLevel, turnIn, completeQuest,
};
particles = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 60 + Math.random() * 60 }));
let last = performance.now();
(function frame(now) {
  update(Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now;
  ctx.font = "9px monospace";
  if (scene === "title") drawTitle(); else if (scene === "intro") intro.draw(); else if (scene === "builder") builder.draw(); else { drawWorld(); cuts.draw(); if (!cuts.active) drawGear(); }
  if (slotUi) drawSlotUi();
  if (setUi) drawSettings();
  syncBodyClasses();
  requestAnimationFrame(frame);
})(last);
