export const T = 16, SEASON_LEN = 10;
export const GOAL = 3000, EGG_PRICE = 15, CHICKEN_COST = 250, MAX_CHICKENS = 4;
export const HOE_UPGRADES = [{ cost: 200 }, { cost: 500 }];                      // each level reaches one more tile
export const CAN_UPGRADES = [{ cap: 40, cost: 150 }, { cap: 80, cost: 400 }];
export const PEN = { x0: 36, y0: 5, x1: 44, y1: 10 };                            // chicken pen on the farm
export const HEART_REWARDS = [{ hearts: 3, money: 75 }, { hearts: 6, money: 200 }, { hearts: 9, money: 400 }];

export const CROPS = {
  turnip:  { days: 4, price: 20, seed: 5,  seasons: [0, 2] },
  carrot:  { days: 5, price: 35, seed: 10, seasons: [0, 1] },
  tomato:  { days: 6, price: 30, seed: 20, seasons: [1], regrow: 2 },            // keeps producing
  pumpkin: { days: 7, price: 90, seed: 25, seasons: [2] },
  cabbage: { days: 5, price: 50, seed: 15, seasons: [0, 3] },
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
  carp:    { name: "Carp",    price: 30,  where: ["pond", "lake"], seasons: [0, 1, 2, 3], diff: 1, color: "#c98a3a" },
  bluegill:{ name: "Bluegill",price: 25,  where: ["pond"],         seasons: [0, 1, 2],    diff: 1, color: "#4a8fc4" },
  perch:   { name: "Perch",   price: 40,  where: ["pond", "lake"], seasons: [2, 3],       diff: 2, color: "#9bbf4a" },
  bass:    { name: "Bass",    price: 60,  where: ["lake"],         seasons: [0, 1, 2],    diff: 2, color: "#4f7a4f" },
  trout:   { name: "Trout",   price: 80,  where: ["lake"],         seasons: [0, 2, 3],    diff: 3, color: "#d4849a" },
  catfish: { name: "Catfish", price: 100, where: ["lake"],         seasons: [1, 2],       diff: 3, color: "#7a7a8a" },
};

export function itemInfo(id) {
  if (CROPS[id]) return { name: id[0].toUpperCase() + id.slice(1), price: CROPS[id].price };
  if (FORAGE[id]) return FORAGE[id];
  if (FISH[id]) return FISH[id];
  if (id === "egg") return { name: "Egg", price: EGG_PRICE };
  return { name: id, price: 0 };
}

// Schedules: from hour h onward the villager stands at (x,y) tile in `map`; map:null = out of sight.
export const VILLAGERS = {
  rosa: {
    name: "Rosa", job: "Baker", pal: { h: "#8e44ad", r: "#f08fb4", b: "#c2578a" },
    loves: ["pumpkin", "daffodil"], likes: ["carrot", "egg", "grape", "cabbage"], hates: ["mushroom", "catfish"],
    sched: [{ h: 6, map: "town", x: 24, y: 13 }, { h: 12, map: "town", x: 14, y: 13 }, { h: 18, map: "town", x: 34, y: 13 }, { h: 23, map: null }],
    low: ["Welcome to the valley! I'm Rosa — I run the bakery.", "Water your crops every day, newcomer.", "Nice weather for farming, isn't it?"],
    mid: ["Your farm is coming along nicely!", "I'd love to bake with your pumpkins sometime.", "Tomatoes keep fruiting after the first harvest."],
    high: ["You're the best thing to happen to this town.", "Come by the bakery any time — there's always a seat for you.", "I saved you a loaf. Don't tell Oliver."],
    season: ["Spring means daffodils. My favorite!", "Summer tomatoes make the sweetest sauce.", "Autumn pumpkins... perfection.", "Cabbage is the only crop that survives winter."],
  },
  oliver: {
    name: "Oliver", job: "Shopkeeper", pal: { h: "#3b2a20", r: "#3a7a5a", b: "#2f4f6f" },
    loves: ["tomato", "trout"], likes: ["turnip", "cabbage", "bass", "grape"], hates: ["egg", "berry"],
    sched: [{ h: 9, map: "town", x: 19, y: 8 }, { h: 20, map: null }],
    low: ["Welcome to the shop. Seeds and upgrades inside.", "Out-of-season crops wither when the season changes. Plan ahead.", "Business is slow, but I like it that way."],
    mid: ["Upgrade your hoe and can to work several tiles at once.", "Chickens lay eggs every night. Cheap income!", "I've been saving the good seeds for you."],
    high: ["You keep this shop in business. Thank you, friend.", "If I could farm like you, I'd close up shop tomorrow.", "Take care of yourself out there."],
    season: ["Spring seeds sell fastest.", "Summer is tomato season. Stock up!", "Fall's pumpkins pay the best.", "Winter's quiet. I do my accounting."],
  },
  mina: {
    name: "Mina", job: "Angler", pal: { h: "#d4a017", r: "#2d7da8", b: "#3a5ba8" },
    loves: ["catfish", "bass"], likes: ["perch", "bluegill", "carp", "berry", "trout"], hates: ["holly", "turnip"],
    sched: [{ h: 6, map: "forest", x: 11, y: 19 }, { h: 19, map: null }],
    low: ["Shh! You'll scare the fish.", "Face the water with your rod and press Space to cast.", "The lake has bigger fish than your farm pond."],
    mid: ["When you see the '!', press Space right away.", "Time the bar — press Space while the cursor is in the green.", "Trout are tricky, but they sell well."],
    high: ["You've got the patience of a true angler.", "I caught a catfish this big once. Honest!", "Fishing with you is the best part of my day."],
    season: ["Spring bass are biting.", "Summer catfish hide in the shade.", "Autumn trout run upstream.", "Winter fish are slow, but so am I."],
  },
  ben: {
    name: "Ben", job: "Retired farmer", pal: { h: "#cfcfcf", r: "#8a6a3a", b: "#5a4a3a" },
    loves: ["blackberry", "snowyam"], likes: ["cabbage", "mushroom", "pumpkin", "leek"], hates: ["carp", "grape"],
    sched: [{ h: 6, map: "town", x: 38, y: 13 }, { h: 10, map: "forest", x: 30, y: 26 }, { h: 15, map: "town", x: 8, y: 13 }, { h: 20, map: "town", x: 40, y: 13 }, { h: 24, map: null }],
    low: ["Back in my day we hoed by hand. Uphill. Both ways.", "The forest is full of free food if you look.", "Hm. A new farmer. We'll see."],
    mid: ["Not bad for a beginner, I'll admit.", "Walk through forage to pick it up. Forest has the most.", "Mushrooms in fall, holly in winter. Remember that."],
    high: ["You remind me of myself, forty years ago.", "This old farm is in good hands with you.", "Take my advice: never skip watering."],
    season: ["Leeks and daffodils pop up in spring.", "Berries and grapes in summer.", "Mushrooms and blackberries in fall.", "Holly and snow yams in winter. Dress warm."],
  },
};
