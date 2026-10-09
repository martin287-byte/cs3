export const T = 16, SEASON_LEN = 10;
export const GOAL = 3000, EGG_PRICE = 15, CHICKEN_COST = 250, MAX_CHICKENS = 4;
export const PEN = { x0: 36, y0: 5, x1: 44, y1: 10 };                            // chicken pen on the farm
export const HEART_REWARDS = [{ hearts: 3, money: 75 }, { hearts: 6, money: 200 }, { hearts: 9, money: 400 }];

// Tool upgrades: each level reaches one more tile (hoe/can) or breaks harder rock (pickaxe); materials come from the mine.
export const HOE_UPGRADES = [{ cost: 200, mats: { copper: 5 } }, { cost: 500, mats: { iron: 5 } }];
export const CAN_UPGRADES = [{ cap: 40, cost: 150, mats: { copper: 5 } }, { cap: 80, cost: 400, mats: { iron: 5 } }];
export const PICK_UPGRADES = [{ cost: 150, mats: { copper: 6 } }, { cost: 350, mats: { iron: 6 } }];

export const CROPS = {
  turnip:   { days: 4, price: 20, seed: 5,  seasons: [0, 2] },
  potato:   { days: 5, price: 40, seed: 12, seasons: [0] },
  carrot:   { days: 5, price: 35, seed: 10, seasons: [0, 1] },
  tomato:   { days: 6, price: 30, seed: 20, seasons: [1], regrow: 2 },           // keeps producing
  corn:     { days: 8, price: 70, seed: 22, seasons: [1, 2], regrow: 3 },
  pumpkin:  { days: 7, price: 90, seed: 25, seasons: [2] },
  eggplant: { days: 5, price: 60, seed: 15, seasons: [2], regrow: 2 },
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
};

// Mining: node hardness must be <= pickaxe level (0..2)
export const ORES = {
  stone:    { name: "Stone",      price: 2,   hard: 0, color: "#8a8893" },
  copper:   { name: "Copper Ore", price: 20,  hard: 0, color: "#d9803a" },
  iron:     { name: "Iron Ore",   price: 40,  hard: 1, color: "#b9b4c4" },
  gold:     { name: "Gold Ore",   price: 80,  hard: 2, color: "#ffd23f" },
  amethyst: { name: "Amethyst",   price: 150, hard: 2, color: "#b06ae0" },
};

// Cooking. "@fish" / "@forage" accept any fish / forage item.
export const DISHES = {
  friedegg: { name: "Fried Egg",    price: 35,  energy: 25, need: [["egg", 1]],                                  color: "#ffe27a" },
  stew:     { name: "Turnip Stew",  price: 70,  energy: 40, need: [["turnip", 2]],                               color: "#c98a3a" },
  soup:     { name: "Veggie Soup",  price: 120, energy: 60, need: [["carrot", 1], ["tomato", 1], ["cabbage", 1]], color: "#e0583a" },
  pie:      { name: "Pumpkin Pie",  price: 220, energy: 80, need: [["pumpkin", 1], ["egg", 1]],                  color: "#e98a15" },
  fishstew: { name: "Fish Stew",    price: 110, energy: 55, need: [["@fish", 1], ["potato", 1]],                 color: "#6aa8f0" },
  salad:    { name: "Forest Salad", price: 90,  energy: 45, need: [["@forage", 3]],                              color: "#5fae4f" },
  cornbread:{ name: "Cornbread",    price: 130, energy: 60, need: [["corn", 2], ["egg", 1]],                     color: "#f0c040" },
};
export const START_RECIPES = ["friedegg", "stew"];

export const EGG = { name: "Egg", price: EGG_PRICE };
export function itemInfo(id) {
  if (CROPS[id]) return { name: id[0].toUpperCase() + id.slice(1), price: CROPS[id].price };
  return FORAGE[id] || FISH[id] || ORES[id] || DISHES[id] || (id === "egg" ? EGG : id === "tonic" ? { name: "Energy Tonic", price: 30 } : { name: id, price: 0 });
}
export function edibleEnergy(id) {
  if (DISHES[id]) return DISHES[id].energy;
  if (id === "tonic") return 60;
  if (CROPS[id] || FORAGE[id]) return 6;
  if (FISH[id]) return 4;
  return id === "egg" ? 3 : 0;
}

// Festivals fall on day 8 of each season.
export const FESTIVAL_DAY = 8;
export const FESTIVALS = [
  { id: "egghunt", name: "Egg Hunt",     season: 0, goal: 10, prize: 200, desc: "Collect 10 festival eggs in Town" },
  { id: "derby",   name: "Fishing Derby",season: 1, goal: 5,  prize: 300, desc: "Catch 5 fish today" },
  { id: "fair",    name: "Harvest Fair", season: 2, goal: 3,  prize: 250, desc: "Show Rosa 3 different crops (talk to her)" },
  { id: "feast",   name: "Winter Feast", season: 3, goal: 1,  prize: 150, desc: "Give Rosa a cooked dish (talk to her)" },
];

export const MERCHANT = { name: "Zed", pal: { h: "#222222", r: "#e0a030", b: "#6a3fa0" }, every: 5, x: 22, y: 14 };   // visits every 5th day

// Schedules: from hour h onward the villager stands at (x,y) tile in `map`; map:null = out of sight.
// `gather` is where they stand during festivals (10:00-18:00). `recipes` unlock at the given heart level.
export const VILLAGERS = {
  rosa: {
    name: "Rosa", job: "Baker", pal: { h: "#8e44ad", r: "#f08fb4", b: "#c2578a" }, gather: { x: 24, y: 13 },
    loves: ["pumpkin", "daffodil", "pie"], likes: ["carrot", "egg", "grape", "cabbage", "cornbread"], hates: ["mushroom", "catfish", "stone"],
    recipes: { 2: "soup", 4: "pie" },
    sched: [{ h: 6, map: "town", x: 24, y: 13 }, { h: 12, map: "town", x: 14, y: 13 }, { h: 18, map: "town", x: 34, y: 13 }, { h: 23, map: null }],
    low: ["Welcome to the valley! I'm Rosa — I run the bakery.", "Water your crops every day, newcomer.", "Nice weather for farming, isn't it?"],
    mid: ["Your farm is coming along nicely!", "I'd love to bake with your pumpkins sometime.", "Cook at your farmhouse — E on the door."],
    high: ["You're the best thing to happen to this town.", "Come by the bakery any time — there's always a seat for you.", "I saved you a loaf. Don't tell Oliver."],
    season: ["Spring means daffodils. My favorite!", "Summer tomatoes make the sweetest sauce.", "Autumn pumpkins... perfection.", "Cabbage and kale survive winter."],
  },
  oliver: {
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
    name: "Ben", job: "Retired farmer", pal: { h: "#cfcfcf", r: "#8a6a3a", b: "#5a4a3a" }, gather: { x: 28, y: 13 },
    loves: ["blackberry", "snowyam", "amethyst"], likes: ["cabbage", "mushroom", "pumpkin", "leek", "salad", "copper", "iron"], hates: ["carp", "grape"],
    recipes: { 2: "salad", 5: "cornbread" },
    sched: [{ h: 6, map: "town", x: 38, y: 13 }, { h: 10, map: "forest", x: 30, y: 26 }, { h: 15, map: "town", x: 8, y: 13 }, { h: 20, map: "town", x: 40, y: 13 }, { h: 24, map: null }],
    low: ["Back in my day we hoed by hand. Uphill. Both ways.", "The forest is full of free food if you look.", "Hm. A new farmer. We'll see."],
    mid: ["Not bad for a beginner, I'll admit.", "There's a mine in the forest. Bring a pickaxe.", "Mushrooms in fall, holly in winter. Remember that."],
    high: ["You remind me of myself, forty years ago.", "This old farm is in good hands with you.", "Take my advice: never skip watering."],
    season: ["Leeks and daffodils pop up in spring.", "Berries and grapes in summer.", "Mushrooms and blackberries in fall.", "Holly and snow yams in winter. Dress warm."],
  },
};
