export const T = 16, SEASON_LEN = 10;
export const GOAL = 8000, EGG_PRICE = 15, CHICKEN_COST = 250;
export const PEN = { x0: 40, y0: 6, x1: 48, y1: 10 };                            // chicken pen on the farm
export const PASTURE = { x0: 26, y0: 7, x1: 36, y1: 12 };                        // cow pasture
export const MAX_CHICKENS = 6, MAX_COWS = 3, COW_COST = 500;
// Farm buildings stand on pre-marked plots; they are finished the morning after you pay.
export const BUILDINGS = {
  coop: { name: "Coop", cost: 300, mats: { wood: 30, stone: 20 } },
  barn: { name: "Barn", cost: 600, mats: { wood: 60, stone: 40, copper: 5 } },
  silo: { name: "Silo", cost: 250, mats: { wood: 20, stone: 15 } },
  greenhouse: { name: "Greenhouse", cost: 1500, mats: { wood: 80, stone: 50, copper: 15, iron: 10 } },   // grows crops all year, auto-watered
};
export const SPRINKLER_SHOP = [
  { id: "sprinkler", cost: 200, mats: { iron: 2 } },       // waters the 4 tiles around it each night
  { id: "qsprinkler", cost: 450, mats: { gold: 2 } },      // waters all 8 tiles around it
];
export const HORSE_COST = 1500, PET_COST = 250;
export const PETS = { dog: { name: "Rex" }, cat: { name: "Mochi" } };
export const SWORD_UPGRADES = [{ cost: 200, mats: { copper: 6 } }, { cost: 450, mats: { iron: 6 } }];
export const SWORD_DAMAGE = [1, 2, 3];
export const MONSTERS = {
  slime:    { name: "Slime",    hp: 3, dmg: 8,  speed: 20, drop: "slime",   minFloor: 1, weight: 5 },
  bat:      { name: "Bat",      hp: 2, dmg: 6,  speed: 46, drop: "batwing", minFloor: 3, weight: 3 },
  skeleton: { name: "Skeleton", hp: 8, dmg: 14, speed: 28, drop: "bone",    minFloor: 8, weight: 2 },
};
export const MISC = {
  milk:    { name: "Milk",            price: 50 },
  wood:    { name: "Wood",            price: 3 },
  hay:     { name: "Hay",             price: 5 },
  slime:   { name: "Slime",           price: 8 },
  batwing: { name: "Bat Wing",        price: 15 },
  bone:    { name: "Bone",            price: 30 },
  bouquet: { name: "Bouquet",         price: 100 },
  pendant: { name: "Wedding Pendant", price: 750 },
  tonic:   { name: "Energy Tonic",    price: 30 },
  pearl:   { name: "Pearl",           price: 250 },
  coin:    { name: "Ancient Coin",    price: 120 },
  relic:   { name: "Old Relic",       price: 180 },
  sprinkler:  { name: "Sprinkler",         price: 100 },
  qsprinkler: { name: "Quality Sprinkler", price: 250 },
};
export const HEART_REWARDS = [{ hearts: 3, money: 75 }, { hearts: 6, money: 200 }, { hearts: 9, money: 400 }];

// Tool upgrades: each level reaches one more tile (hoe/can) or breaks harder rock (pickaxe); materials come from the mine.
export const HOE_UPGRADES = [{ cost: 200, mats: { copper: 5 } }, { cost: 500, mats: { iron: 5 } }];
export const CAN_UPGRADES = [{ cap: 40, cost: 150, mats: { copper: 5 } }, { cap: 80, cost: 400, mats: { iron: 5 } }];
export const AXE_UPGRADES = [{ cost: 200, mats: { copper: 5 } }, { cost: 500, mats: { iron: 5 } }];
export const PICK_UPGRADES = [{ cost: 150, mats: { copper: 6 } }, { cost: 350, mats: { iron: 6 } }];

export const CROPS = {
  turnip:   { days: 4, price: 20, seed: 5,  seasons: [0, 2] },
  potato:   { days: 5, price: 40, seed: 12, seasons: [0] },
  carrot:   { days: 5, price: 35, seed: 10, seasons: [0, 1] },
  tomato:   { days: 6, price: 30, seed: 20, seasons: [1], regrow: 2 },           // keeps producing
  corn:     { days: 8, price: 85, seed: 22, seasons: [1, 2], regrow: 3 },
  pumpkin:  { days: 7, price: 90, seed: 25, seasons: [2] },
  eggplant: { days: 5, price: 45, seed: 15, seasons: [2], regrow: 3 },
  cabbage:  { days: 5, price: 50, seed: 15, seasons: [0, 3] },
  kale:     { days: 4, price: 45, seed: 12, seasons: [3] },
};

export const FORAGE = {
  leek:       { name: "Wild Leek",   price: 25, seasons: [0] },
  daffodil:   { name: "Daffodil",    price: 30, seasons: [0] },
  berry:      { name: "Spice Berry", price: 20, seasons: [1] },
  grape:      { name: "Wild Grape",  price: 40, seasons: [1] },
  mushroom:   { name: "Mushroom",    price: 35, seasons: [2] },
  blackberry: { name: "Blackberry",  price: 25, seasons: [2] },
  holly:      { name: "Holly",       price: 45, seasons: [3] },
  snowyam:    { name: "Snow Yam",    price: 50, seasons: [3] },
  shell:      { name: "Seashell",    price: 25, seasons: [0, 1, 2, 3], area: "beach" },
  coral:      { name: "Coral",       price: 60, seasons: [0, 1, 2, 3], area: "beach" },
  urchin:     { name: "Sea Urchin",  price: 80, seasons: [0, 1, 2, 3], area: "beach" },
  cactusfruit:{ name: "Cactus Fruit",price: 75, seasons: [0, 1, 2, 3], area: "desert" },
  sandrose:   { name: "Sand Rose",   price: 110,seasons: [0, 1, 2, 3], area: "desert" },
  coconut:    { name: "Coconut",     price: 70, seasons: [0, 1, 2, 3], area: "island" },
  starfruit:  { name: "Starfruit",   price: 120,seasons: [0, 1, 2, 3], area: "island" },
};

export const FISH = {
  carp:     { name: "Carp",     price: 30,  where: ["pond", "lake"], seasons: [0, 1, 2, 3], diff: 1, color: "#c98a3a" },
  bluegill: { name: "Bluegill", price: 25,  where: ["pond"],         seasons: [0, 1, 2],    diff: 1, color: "#4a8fc4" },
  goldfish: { name: "Goldfish", price: 45,  where: ["pond"],         seasons: [1],          diff: 1, color: "#f0a020" },
  perch:    { name: "Perch",    price: 40,  where: ["pond", "lake"], seasons: [2, 3],       diff: 2, color: "#9bbf4a" },
  bass:     { name: "Bass",     price: 60,  where: ["lake"],         seasons: [0, 1, 2],    diff: 2, color: "#4f7a4f" },
  pike:     { name: "Pike",     price: 70,  where: ["lake"],         seasons: [0, 3],       diff: 2, color: "#5f9a8a" },
  trout:    { name: "Trout",    price: 80,  where: ["lake"],         seasons: [0, 2, 3],    diff: 3, color: "#d4849a" },
  salmon:   { name: "Salmon",   price: 90,  where: ["lake"],         seasons: [2],          diff: 3, color: "#f07a6a" },
  catfish:  { name: "Catfish",  price: 100, where: ["lake"],         seasons: [1, 2],       diff: 3, color: "#7a7a8a" },
  sardine:  { name: "Sardine",  price: 40,  where: ["ocean"],        seasons: [0, 1, 2, 3], diff: 1, color: "#9ab8d8" },
  octopus:  { name: "Octopus",  price: 120, where: ["ocean"],        seasons: [0, 3],       diff: 2, color: "#c0506a" },
  tuna:     { name: "Tuna",     price: 110, where: ["ocean"],        seasons: [1, 2],       diff: 3, color: "#3a5a9a" },
  pufferfish:{ name: "Pufferfish",price: 150,where: ["ocean"],       seasons: [1],          diff: 3, color: "#e0c050" },
  lionfish: { name: "Lionfish", price: 140, where: ["deep"],         seasons: [0, 1, 2, 3], diff: 3, color: "#d85a3a" },
  swordfish:{ name: "Swordfish",price: 220, where: ["deep"],         seasons: [1, 2],       diff: 3, color: "#5a7aa8" },
  sandfish: { name: "Sandfish", price: 90,  where: ["oasis"],        seasons: [0, 1, 2, 3], diff: 2, color: "#d8b070" },
};

// Mining: node hardness must be <= pickaxe level (0..2)
export const ORES = {
  stone:    { name: "Stone",      price: 2,   hard: 0, color: "#8a8893" },
  copper:   { name: "Copper Ore", price: 20,  hard: 0, color: "#d9803a" },
  iron:     { name: "Iron Ore",   price: 40,  hard: 1, color: "#b9b4c4" },
  gold:     { name: "Gold Ore",   price: 80,  hard: 2, color: "#ffd23f" },
  amethyst: { name: "Amethyst",   price: 150, hard: 2, color: "#b06ae0" },
  aquamarine:{ name: "Aquamarine", price: 200, hard: 2, color: "#6ad8f0" },
  ruby:     { name: "Ruby",        price: 320, hard: 2, color: "#e0405a" },
};

// Cooking. "@fish" / "@forage" accept any fish / forage item.
export const DISHES = {
  friedegg: { name: "Fried Egg",    price: 35,  energy: 25, need: [["egg", 1]],                                  color: "#ffe27a" },
  stew:     { name: "Turnip Stew",  price: 70,  energy: 40, need: [["turnip", 2]],                               color: "#c98a3a" },
  soup:     { name: "Veggie Soup",  price: 120, energy: 60, need: [["carrot", 1], ["tomato", 1], ["cabbage", 1]], color: "#e0583a" },
  pie:      { name: "Pumpkin Pie",  price: 220, energy: 80, need: [["pumpkin", 1], ["egg", 1]],                  color: "#e98a15" },
  fishstew: { name: "Fish Stew",    price: 110, energy: 55, need: [["@fish", 1], ["potato", 1]],                 color: "#6aa8f0" },
  salad:    { name: "Forest Salad", price: 90,  energy: 45, need: [["@forage", 3]],                              color: "#5fae4f" },
  pancakes: { name: "Pancakes",    price: 80,  energy: 50, need: [["egg", 1], ["milk", 1]],                    color: "#e0b070" },
  sushi:    { name: "Sushi",       price: 140, energy: 50, need: [["@fish", 2]],                                color: "#f07a6a" },
  cactusjam:{ name: "Cactus Jam",   price: 150, energy: 55, need: [["cactusfruit", 2]],                          color: "#d84a8a" },
  ratatouille:{ name: "Ratatouille", price: 180, energy: 70, need: [["eggplant", 1], ["tomato", 1], ["carrot", 1]],   color: "#a8402a" },
  pudding:  { name: "Coconut Pudding", price: 170, energy: 65, need: [["coconut", 1], ["milk", 1], ["egg", 1]],     color: "#f4ecd0" },
  cornbread:{ name: "Cornbread",    price: 130, energy: 60, need: [["corn", 2], ["egg", 1]],                     color: "#f0c040" },
};
export const START_RECIPES = ["friedegg", "stew"];

export const EGG = { name: "Egg", price: EGG_PRICE };
// ---- artisan machines: craft them, place them, put ingredients in, collect the goods days later ----------------
export const MACHINES = {
  jar:   { name: "Preserves Jar",      cost: { wood: 20, stone: 30 },             desc: "Turns crops and fruit into pickles and jam in 3 days." },
  keg:   { name: "Keg",                cost: { wood: 30, copper: 3, iron: 1 },    desc: "Turns crops into juice (4 days) and fruit into wine (6 days)." },
  press: { name: "Cheese Press",       cost: { wood: 45, stone: 45 },             desc: "Turns milk into cheese in 3 days." },
  mayo:  { name: "Mayonnaise Machine", cost: { wood: 15, stone: 15, copper: 1 },  desc: "Turns eggs into mayonnaise in 2 days." },
};
export const FRUIT = ["berry", "grape", "blackberry", "starfruit", "cactusfruit", "coconut"];
// Product ids are generated: "pickle:turnip", "jam:grape", "juice:corn", "wine:grape", plus "cheese" and "mayo".
export const ARTISAN = {
  pickle: { fmt: n => `Pickled ${n}`, price: p => 2 * p + 50, energy: 8 },
  jam:    { fmt: n => `${n} Jam`,     price: p => 2 * p + 50, energy: 10 },
  juice:  { fmt: n => `${n} Juice`,   price: p => Math.round(2.25 * p), energy: 12 },
  wine:   { fmt: n => `${n} Wine`,    price: p => 3 * p, energy: 0 },
};
export const isArtisan = id => id === "cheese" || id === "mayo" || (typeof id === "string" && id.includes(":") && !!ARTISAN[id.split(":")[0]]);
export function machineRecipe(type, id) {                                           // -> { out, days } or null
  if (type === "jar") return CROPS[id] || id === "mushroom" ? { out: `pickle:${id}`, days: 3 } : FRUIT.includes(id) ? { out: `jam:${id}`, days: 3 } : null;
  if (type === "keg") return CROPS[id] ? { out: `juice:${id}`, days: 4 } : FRUIT.includes(id) ? { out: `wine:${id}`, days: 6 } : null;
  if (type === "press") return id === "milk" ? { out: "cheese", days: 3 } : null;
  if (type === "mayo") return id === "egg" ? { out: "mayo", days: 2 } : null;
  return null;
}
export function itemInfo(id) {
  if (typeof id === "string" && id.startsWith("m_") && MACHINES[id.slice(2)]) return { name: MACHINES[id.slice(2)].name, price: 0 };
  if (id === "cheese") return { name: "Cheese", price: 200 };
  if (id === "mayo") return { name: "Mayonnaise", price: 190 };
  if (isArtisan(id)) { const [k, base] = id.split(":"), b = itemInfo(base); return { name: ARTISAN[k].fmt(b.name), price: ARTISAN[k].price(b.price) }; }
  if (CROPS[id]) return { name: id[0].toUpperCase() + id.slice(1), price: CROPS[id].price };
  return FORAGE[id] || FISH[id] || ORES[id] || DISHES[id] || MISC[id] || (id === "egg" ? EGG : { name: id, price: 0 });
}
export function edibleEnergy(id) {
  if (id === "cheese") return 25;
  if (id === "mayo") return 5;
  if (isArtisan(id)) return ARTISAN[id.split(":")[0]].energy;
  if (DISHES[id]) return DISHES[id].energy;
  if (id === "tonic") return 60;
  if (id === "milk") return 15;
  if (CROPS[id] || FORAGE[id]) return 6;
  if (FISH[id]) return 4;
  return id === "egg" ? 3 : 0;
}

// Festivals: each has a season and day. Dances are played through Rosa (or your spouse).
export const FESTIVALS = [
  { id: "egghunt",     name: "Egg Hunt",       season: 0, day: 8, goal: 10, prize: 200, desc: "Collect 10 festival eggs in Town" },
  { id: "flowerdance", name: "Flower Dance",   season: 0, day: 9, goal: 1,  prize: 0,   desc: "Talk to Rosa in Town to dance" },
  { id: "luau",        name: "Beach Luau",     season: 1, day: 4, goal: 1,  prize: 200, host: "marlo", desc: "Give Marlo a cooked dish on the beach" },
  { id: "derby",       name: "Fishing Derby",  season: 1, day: 8, goal: 5,  prize: 300, desc: "Catch 5 fish today" },
  { id: "fair",        name: "Harvest Fair",   season: 2, day: 8, goal: 3,  prize: 250, desc: "Show Rosa 3 different crops (talk to her)" },
  { id: "market",      name: "Farmers' Market",season: 2, day: 4, goal: 0,  prize: 0,   desc: "Everything you sell is worth 25% more today" },
  { id: "icefish",     name: "Ice Fishing",    season: 3, day: 4, goal: 3,  prize: 350, desc: "Catch 3 fish today" },
  { id: "feast",       name: "Winter Feast",   season: 3, day: 8, goal: 1,  prize: 150, desc: "Give Rosa a cooked dish (talk to her)" },
  { id: "stardance",   name: "Starlight Dance",season: 3, day: 9, goal: 1,  prize: 0,   desc: "Talk to Rosa in Town to dance" },
];
export const SPOUSE_LINES = [
  "Good morning, love! Ready for another day on the farm?", "I watered a few crops for you. Don't work too hard!",
  "I'm so lucky to share this farm with you.", "Dinner tonight? I'll cook something nice.", "The valley feels like home because of you.",
];

export const MERCHANT = { name: "Zed", pal: { h: "#222222", r: "#e0a030", b: "#6a3fa0" }, look: { hair: "#222222", hairStyle: "cap", cap: "#6a3fa0", skin: "#e0b088", shirt: "#e0a030", pants: "#6a3fa0" }, every: 5, x: 22, y: 14 };   // visits every 5th day

// Schedules: from hour h onward the villager stands at (x,y) tile in `map`; map:null = out of sight.
// `gather` is where they stand during festivals (10:00-18:00). `recipes` unlock at the given heart level.
export const SKILLS = {
  farming:  { name: "Farming",  perk: "+3% crop sale price per level" },
  fishing:  { name: "Fishing",  perk: "wider catch zone, +3% fish price per level" },
  mining:   { name: "Mining",   perk: "extra ore chance; cheaper swings at Lv4 / Lv8" },
  foraging: { name: "Foraging", perk: "double-find chance, +3% forage price per level" },
  combat:   { name: "Combat",   perk: "+5 max HP per level, tougher at Lv3 / Lv6 / Lv9" },
};
export const XP_TABLE = [0, 50, 120, 220, 350, 520, 740, 1000, 1350, 1800];     // XP needed for levels 1..10

export const VILLAGERS = {
  rosa: {
    look: { hair: "#7a3a9a", hairStyle: "long", skin: "#f4c9a0", shirt: "#f08fb4", pants: "#c2578a", shoes: "#5a2a3a" },
    name: "Rosa", job: "Baker", pal: { h: "#8e44ad", r: "#f08fb4", b: "#c2578a" }, gather: { x: 24, y: 13 },
    loves: ["pumpkin", "daffodil", "pie"], likes: ["carrot", "egg", "grape", "cabbage", "cornbread"], hates: ["mushroom", "catfish", "stone"],
    recipes: { 2: "soup", 3: "pancakes", 4: "pie" },
    sched: [{ h: 6, map: "town", x: 24, y: 13 }, { h: 12, map: "town", x: 14, y: 13 }, { h: 18, map: "town", x: 34, y: 13 }, { h: 23, map: null }],
    low: ["Welcome to the valley! I'm Rosa — I run the bakery.", "Water your crops every day, newcomer.", "Nice weather for farming, isn't it?"],
    mid: ["Your farm is coming along nicely!", "I'd love to bake with your pumpkins sometime.", "Cook at your farmhouse — E on the door."],
    high: ["You're the best thing to happen to this town.", "Come by the bakery any time — there's always a seat for you.", "I saved you a loaf. Don't tell Oliver."],
    season: ["Spring means daffodils. My favorite!", "Summer tomatoes make the sweetest sauce.", "Autumn pumpkins... perfection.", "Cabbage and kale survive winter."],
  },
  oliver: {
    look: { hair: "#3b2a20", hairStyle: "cap", cap: "#2f6a4a", skin: "#e8b890", shirt: "#3a7a5a", pants: "#2f4f6f" },
    name: "Oliver", job: "Shopkeeper", pal: { h: "#3b2a20", r: "#3a7a5a", b: "#2f4f6f" }, gather: { x: 20, y: 13 },
    loves: ["tomato", "trout", "gold"], likes: ["turnip", "cabbage", "bass", "grape", "stew"], hates: ["egg", "berry"],
    recipes: {},
    sched: [{ h: 9, map: "town", x: 19, y: 8 }, { h: 20, map: null }],
    low: ["Welcome to the shop. Seeds and upgrades inside.", "Out-of-season crops wither when the season changes. Plan ahead.", "Upgrades need ore from the mine. Bring copper!"],
    mid: ["Upgrade your hoe and can to work several tiles at once.", "Chickens lay eggs every night. Cheap income!", "I've been saving the good seeds for you."],
    high: ["You keep this shop in business. Thank you, friend.", "If I could farm like you, I'd close up shop tomorrow.", "Take care of yourself out there."],
    season: ["Spring seeds sell fastest.", "Summer is tomato and corn season.", "Fall's pumpkins pay the best.", "Winter's quiet. I do my accounting."],
  },
  mina: {
    look: { hair: "#e0b030", hairStyle: "bun", skin: "#f6d0a8", shirt: "#2d8aa8", pants: "#3a5ba8" },
    name: "Mina", job: "Angler", pal: { h: "#d4a017", r: "#2d7da8", b: "#3a5ba8" }, gather: { x: 26, y: 13 },
    loves: ["catfish", "bass", "fishstew", "salmon"], likes: ["perch", "bluegill", "carp", "berry", "trout", "pike"], hates: ["holly", "turnip"],
    recipes: { 2: "fishstew" },
    sched: [{ h: 6, map: "forest", x: 11, y: 19 }, { h: 19, map: null }],
    low: ["Shh! You'll scare the fish.", "Face the water with your rod and press Space to cast.", "The lake has bigger fish than your farm pond."],
    mid: ["When you see the '!', press Space right away.", "Time the bar — press Space while the cursor is in the green.", "Trout are tricky, but they sell well."],
    high: ["You've got the patience of a true angler.", "I caught a catfish this big once. Honest!", "Fishing with you is the best part of my day."],
    season: ["Spring bass and pike are biting.", "Summer catfish hide in the shade.", "Autumn salmon run upstream.", "Winter fish are slow, but so am I."],
  },
  ben: {
    look: { hair: "#d0d0d0", hairStyle: "short", beard: "#dcdcdc", skin: "#e8bc94", shirt: "#8a6a3a", pants: "#5a4a3a" },
    name: "Ben", job: "Retired farmer", pal: { h: "#cfcfcf", r: "#8a6a3a", b: "#5a4a3a" }, gather: { x: 28, y: 13 },
    loves: ["blackberry", "snowyam", "amethyst"], likes: ["cabbage", "mushroom", "pumpkin", "leek", "salad", "copper", "iron"], hates: ["carp", "grape"],
    recipes: { 2: "salad", 5: "cornbread" },
    sched: [{ h: 6, map: "town", x: 38, y: 13 }, { h: 10, map: "forest", x: 30, y: 26 }, { h: 15, map: "town", x: 8, y: 13 }, { h: 20, map: "town", x: 40, y: 13 }, { h: 24, map: null }],
    low: ["Back in my day we hoed by hand. Uphill. Both ways.", "The forest is full of free food if you look.", "Hm. A new farmer. We'll see."],
    mid: ["Not bad for a beginner, I'll admit.", "There's a mine in the forest. Bring a pickaxe.", "Mushrooms in fall, holly in winter. Remember that."],
    high: ["You remind me of myself, forty years ago.", "This old farm is in good hands with you.", "Take my advice: never skip watering."],
    season: ["Leeks and daffodils pop up in spring.", "Berries and grapes in summer.", "Mushrooms and blackberries in fall.", "Holly and snow yams in winter. Dress warm."],
  },
  marlo: {
    look: { hair: "#6a3a1a", hairStyle: "short", skin: "#c88a5a", shirt: "#e8e0c8", pants: "#2a6a8a" },
    name: "Marlo", job: "Beach fisher", pal: { h: "#6a3a1a", r: "#e8e0c8", b: "#2a6a8a" }, gather: { x: 30, y: 13 },
    loves: ["tuna", "sushi", "pufferfish"], likes: ["sardine", "octopus", "shell", "coral", "bass"], hates: ["bone", "slime"],
    recipes: { 2: "sushi" },
    sched: [{ h: 6, map: "beach", x: 22, y: 16 }, { h: 20, map: null }],
    low: ["The ocean's big, friend. Big fish out there.", "Ocean fish bite differently. Be quick!", "Care for a chat? The tide's patient."],
    mid: ["Tuna in summer, octopus in winter.", "Collect shells and coral along the shore.", "Pufferfish are tricky — but pay great."],
    high: ["You fish like you were born on the water.", "Stay for sunset. It's the best part.", "I'd sail anywhere with you."],
    season: ["Spring tides bring sardines.", "Summer means tuna and pufferfish.", "Autumn tuna are fat and slow.", "Winter octopus hide in the rocks."],
  },
  dune: {
    look: { hair: "#2a2a2a", hairStyle: "long", skin: "#c07848", shirt: "#d8803a", pants: "#8a4a2a" },
    name: "Dune", job: "Desert nomad", pal: { h: "#2a2a2a", r: "#d8803a", b: "#8a4a2a" }, gather: { x: 32, y: 13 },
    loves: ["sandrose", "amethyst", "cactusjam"], likes: ["cactusfruit", "gold", "sandfish", "corn", "pancakes"], hates: ["holly", "salmon"],
    recipes: { 2: "cactusjam" },
    sched: [{ h: 7, map: "desert", x: 26, y: 11 }, { h: 21, map: null }],
    low: ["Hello, traveler. The sand keeps many secrets.", "Mind the sun. Water is life out here.", "Cactus fruit is sweeter than it looks."],
    mid: ["The oasis holds a fish found nowhere else.", "Sand roses sell for a fortune.", "I walk this desert every day. It never looks the same."],
    high: ["You're the first stranger I've trusted in years.", "Come, I'll show you the best dunes.", "The desert is kinder with good company."],
    season: ["Spring brings a rare cool breeze.", "Summer here is no joke. Stay hydrated.", "Autumn nights are bright with stars.", "Even desert winters bite at night."],
  },
  iris: {
    look: { hair: "#4a8a4a", hairStyle: "long", skin: "#f0c8a0", shirt: "#7ac07a", pants: "#5a8a5a", shoes: "#4a3a2a" },
    name: "Iris", job: "Botanist", pal: { h: "#4a8a4a", r: "#7ac07a", b: "#5a8a5a" }, gather: { x: 34, y: 13 },
    loves: ["daffodil", "kale", "ratatouille"], likes: ["corn", "grape", "leek", "eggplant", "salad", "starfruit"], hates: ["bone", "slime", "batwing"],
    recipes: { 2: "ratatouille" },
    sched: [{ h: 8, map: "forest", x: 34, y: 9 }, { h: 19, map: null }],
    low: ["Oh! I didn't hear you over the birdsong.", "Plants talk if you listen long enough.", "The forest soil is rich. Better than your farm, probably."],
    mid: ["Ever tried kale in winter? Underrated.", "A greenhouse lets you grow anything, any time.", "I keep a notebook of every flower in the valley."],
    high: ["You've got a gardener's heart.", "Let me show you my secret mushroom patch some day.", "Everything blooms nicer when you're around."],
    season: ["Spring is the busiest season for botanists.", "Summer sun makes everything grow wild.", "Autumn colors are my favorite palette.", "Winter sleep is just plants gathering strength."],
  },
  quill: {
    look: { hair: "#2a3a6a", hairStyle: "short", skin: "#f2cfaa", shirt: "#e8d8f0", pants: "#4a4a6a", shoes: "#2a2a3a" },
    name: "Quill", job: "Writer", pal: { h: "#2a3a6a", r: "#e8d8f0", b: "#4a4a6a" }, gather: { x: 36, y: 13 },
    loves: ["pearl", "pudding", "coin"], likes: ["pie", "pancakes", "coconut", "relic", "tomato"], hates: ["slime", "bone"],
    recipes: { 2: "pudding" },
    sched: [{ h: 8, map: "town", x: 12, y: 13 }, { h: 14, map: "town", x: 26, y: 13 }, { h: 21, map: null }],
    low: ["Shh, I'm in the middle of a sentence.", "I write about this valley. Don't worry, you're only a footnote.", "Writer's block is the real monster."],
    mid: ["You might make it into chapter two.", "I hear there's an island past the beach. Material!", "Treasure hunters make the best characters."],
    high: ["I've written you a whole chapter. It's too flattering to show you.", "Every story needs someone like you.", "Come back tomorrow. I'll read you the ending."],
    season: ["Spring is for new beginnings. Cliché, but true.", "Summer afternoons are for notebooks and lemonade.", "Autumn is when the words flow best.", "Winter nights are for finishing manuscripts."],
  },
};

// Community centre: deposit `take` different items from each bundle's list to complete it.
export const BUNDLES = [
  { id: "crops",   name: "Crop Bundle",      take: 4, reward: 300, items: Object.keys(CROPS) },
  { id: "forage",  name: "Forager's Bundle", take: 4, reward: 300, items: ["leek", "daffodil", "berry", "grape", "mushroom", "blackberry", "holly", "snowyam"] },
  { id: "fish",    name: "Angler's Bundle",  take: 4, reward: 400, items: Object.keys(FISH) },
  { id: "mining",  name: "Miner's Bundle",   take: 4, reward: 400, items: ["copper", "iron", "gold", "amethyst"] },
  { id: "coast",   name: "Coast Bundle",     take: 4, reward: 400, items: ["shell", "coral", "urchin", "cactusfruit", "sandrose", "coconut", "starfruit"] },
  { id: "kitchen", name: "Kitchen Bundle",   take: 4, reward: 500, items: Object.keys(DISHES) },
  { id: "loot",    name: "Monster Bundle",   take: 3, reward: 500, items: ["slime", "batwing", "bone"] },
];
export const RESTORE_PRIZE = 3000;

// Skill perks: at level 5 and 10 of each skill you pick one of two perks.
export const PERKS = {
  farming:  { 5: [{ id: "tiller", name: "Tiller", desc: "Crops sell for 10% more" }, { id: "rancher", name: "Rancher", desc: "Eggs and milk sell for 30% more" }],
              10: [{ id: "agri", name: "Agriculturist", desc: "Watered crops have a 25% chance to grow an extra day" }, { id: "artisan", name: "Artisan", desc: "Cooked dishes sell for 40% more" }] },
  fishing:  { 5: [{ id: "fisher", name: "Fisher", desc: "Fish sell for 25% more" }, { id: "trapper", name: "Trapper", desc: "Fish bite twice as fast" }],
              10: [{ id: "angler", name: "Angler", desc: "A much wider catch zone" }, { id: "pirate", name: "Pirate", desc: "20% chance of a $60 treasure with each catch" }] },
  mining:   { 5: [{ id: "miner", name: "Miner", desc: "+20% chance of extra ore" }, { id: "geologist", name: "Geologist", desc: "8% chance a node also yields an amethyst" }],
              10: [{ id: "prospector", name: "Prospector", desc: "Mining costs 1 less energy" }, { id: "blacksmith", name: "Blacksmith", desc: "Ore sells for 40% more" }] },
  foraging: { 5: [{ id: "gatherer", name: "Gatherer", desc: "+20% chance to double a forage find" }, { id: "botanist", name: "Botanist", desc: "Forage sells for 25% more" }],
              10: [{ id: "tracker", name: "Tracker", desc: "50% more forage appears each day" }, { id: "naturalist", name: "Naturalist", desc: "Raw crops and forage restore 3x energy" }] },
  combat:   { 5: [{ id: "fighter", name: "Fighter", desc: "Sword damage +1" }, { id: "defender", name: "Defender", desc: "+25 max HP" }],
              10: [{ id: "brute", name: "Brute", desc: "Sword damage +1 more" }, { id: "acrobat", name: "Acrobat", desc: "Longer invulnerability after a hit" }] },
};
// Fast travel: where you arrive in each area.
export const TRAVEL = { farm: [7, 8], town: [21, 13], forest: [30, 28], beach: [21, 2], desert: [3, 15], island: [20, 19] };

// House upgrades (Oliver builds them overnight, ready in 2 days). Every level adds a room and +10 max energy.
export const HOUSE = [
  { name: "Cabin" },
  { id: "kitchen", name: "Kitchen", cost: 2000, mats: { wood: 50, stone: 20, copper: 8 }, desc: "A proper kitchen with a stove and a fridge. Cooked dishes restore 25% more energy." },
  { id: "bedroom", name: "Bedroom", cost: 5000, mats: { wood: 100, stone: 20, iron: 10 }, desc: "A second bedroom with a double bed. If you are married, breakfast is waiting every morning." },
  { id: "cellar", name: "Cellar", cost: 9000, mats: { wood: 150, stone: 40, gold: 8 }, desc: "A cool cellar under the house with a huge storage chest." },
];
export const HOUSE_ENERGY = 10;                                                     // max energy per house level
export const HOUSE_BUILD_DAYS = 2;
export const CHEST_CAP = lvl => 12 + 4 * lvl;                                         // stacks the house chest can hold
export const CELLAR_CAP = 40;
