// Birthdays and heart events. Seasons: 0 Spring .. 3 Winter; days 1..SEASON_LEN. Event lines are plain strings so they can be translated.
export const BIRTHDAYS = {
  rosa: { s: 0, d: 3 }, oliver: { s: 0, d: 8 }, mina: { s: 1, d: 2 }, ben: { s: 1, d: 7 },
  marlo: { s: 2, d: 1 }, dune: { s: 2, d: 6 }, iris: { s: 3, d: 4 }, quill: { s: 3, d: 9 },
  nora: { s: 0, d: 6 },
  hugo: { s: 1, d: 4 },
  lena: { s: 2, d: 3 },
  theo: { s: 3, d: 1 },
};
export const BIRTHDAY_MULT = 3;
// 4-heart and 8-heart scenes: three lines each, then a reward ({ pts, money, item }).
export const HEART_EVENTS = {
  rosa: {
    4: { lines: ["Rosa is staring at a tray of burnt rolls.", "Rosa: Oh! I got so busy chatting that I forgot the oven. Don't tell anyone.", "Rosa: Here — take a few of the good ones as a thank-you for keeping my secret."], reward: { pts: 30, item: "pancakes" } },
    8: { lines: ["Rosa has set a small table behind the bakery.", "Rosa: I never share my grandmother's recipe, but I trust you. Sugar first, then patience.", "Rosa: Promise me you'll bake something wonderful with it. Take this, you earned it."], reward: { pts: 50, money: 300 } },
  },
  oliver: {
    4: { lines: ["Oliver is rearranging the same shelf for the third time.", "Oliver: Business is slow and I'm talking to jars of seeds. Thanks for stopping by.", "Oliver: A good customer deserves a bonus. Here's a little something on the house."], reward: { pts: 30, money: 150 } },
    8: { lines: ["Oliver closes the shop early and hangs a sign on the door.", "Oliver: I used to dream of a farm of my own. Now I sell seeds to people who do the dreaming for me.", "Oliver: You're doing it right. Here, a share of my best stock."], reward: { pts: 50, item: "tonic" } },
  },
  mina: {
    4: { lines: ["Mina is sitting on the dock with a tangled fishing line.", "Mina: Three hours, no bites, and now this. The lake is laughing at me.", "Mina: You help me untangle it, and I'll give you my lucky bait."], reward: { pts: 30, item: "bass" } },
    8: { lines: ["Mina points at the water. Something huge and silver moves under the surface.", "Mina: Every year it shows up and I never catch it. Today I just wanted someone to see it with me.", "Mina: Thanks for being here. Take this — for your next big fish."], reward: { pts: 50, money: 300 } },
  },
  ben: {
    4: { lines: ["Ben is leaning on his old fence, looking at an empty field.", "Ben: Forty years I farmed this. Now my knees say no and the field says yes.", "Ben: Keep the soil good. Take this — it was always lucky for me."], reward: { pts: 30, item: "gold" } },
    8: { lines: ["Ben carries a faded photo out onto the porch.", "Ben: That's me and my late spouse the first spring here. The farm started as a promise.", "Ben: You remind me of us. Please take care of this valley."], reward: { pts: 50, money: 400 } },
  },
  marlo: {
    4: { lines: ["Marlo is gutting fish on the sand and humming off key.", "Marlo: Sorry — nobody's listened to my singing in years. Not even the gulls.", "Marlo: Take some of today's catch, friend. Singing is hungry work."], reward: { pts: 30, item: "sardine" } },
    8: { lines: ["Marlo stands at the shore as the sun goes down.", "Marlo: The sea gave me everything, and took a boat or two. I'd do it all again.", "Marlo: Here's a pearl I found years ago. It belongs with someone who looks at the horizon."], reward: { pts: 50, item: "pearl" } },
  },
  dune: {
    4: { lines: ["Dune draws a map in the sand with a stick.", "Dune: The desert has no roads, only memory. I will teach you the way to the oasis.", "Dune: Carry this. It is a small thing, but it remembers the way home."], reward: { pts: 30, item: "sandrose" } },
    8: { lines: ["Dune lights a fire and the sky fills with stars.", "Dune: Where I come from, a guest who shares a fire is family.", "Dune: Take this stone. If you ever feel lost, hold it and think of the stars."], reward: { pts: 50, item: "amethyst" } },
  },
  iris: {
    4: { lines: ["Iris kneels over a tiny seedling, shielding it from the wind.", "Iris: This one has never grown here before. I think it likes you being nearby.", "Iris: Please accept a few of my kale seeds for your farm."], reward: { pts: 30, money: 120 } },
    8: { lines: ["Iris shows you a hidden clearing full of glowing flowers.", "Iris: I've never shown anyone this. It only blooms when someone kind walks through.", "Iris: Take a flower for your table. The valley is lucky to have you."], reward: { pts: 50, item: "daffodil" } },
  },
  quill: {
    4: { lines: ["Quill has crumpled pages scattered around the bench.", "Quill: The hero walks into the tavern and then — nothing. I'm stuck on the same page.", "Quill: Talking helped. Take this, a stolen coin from chapter two."], reward: { pts: 30, item: "coin" } },
    8: { lines: ["Quill reads aloud from a new page, voice trembling.", "Quill: 'The farmer woke before dawn and the valley woke with them.' Do you like it?", "Quill: I wrote you into the book. Take this — you've earned your own chapter."], reward: { pts: 50, money: 350 } },
  },
  nora: {
    4: { lines: ["Nora is sorting bandages and humming a lullaby.", "Nora: Oh! A long shift. Everyone seems to trip over their own boots today.", "Nora: Here, a free tonic from the clinic. Don't tell the others."], reward: { pts: 30, item: "tonic" } },
    8: { lines: ["Nora sits on the clinic steps at dusk, staring at the sky.", "Nora: I became a nurse because my family needed one. I never asked if I wanted it. But I do.", "Nora: Thank you for listening. Take this, you deserve it."], reward: { pts: 50, money: 300 } },
  },
  hugo: {
    4: { lines: ["Hugo hammers a glowing blade and stops when he sees you.", "Hugo: Eh, don't stand so close. Sparks.", "Hugo: Take this. It's a scrap of gold from a failed project."], reward: { pts: 30, item: "gold" } },
    8: { lines: ["Hugo shows you a dusty anvil in the back room.", "Hugo: My father's. I haven't lit this fire in years. It felt wrong to do it alone.", "Hugo: You made it feel right. Take this, and thank you."], reward: { pts: 50, money: 400 } },
  },
  lena: {
    4: { lines: ["Lena is balancing a tower of books and a cup of tea.", "Lena: Oh, don't mind the mess. I'm reorganising by mood now.", "Lena: A bookmark for you. It's hand-painted. Please treat it kindly."], reward: { pts: 30, item: "coin" } },
    8: { lines: ["Lena closes the library early and lights a small lantern.", "Lena: There's a poem in the margins of the oldest book here. I think it was left for whoever needed it.", "Lena: It's yours now. Take this, as a thank-you."], reward: { pts: 50, item: "amethyst" } },
  },
  theo: {
    4: { lines: ["Theo is dusting a clay pot with a tiny brush.", "Theo: This is eight hundred years old. And I broke it. Twice.", "Theo: Take this coin, it's from the same dig. It's lucky."], reward: { pts: 30, item: "coin" } },
    8: { lines: ["Theo unrolls an old map across the museum floor.", "Theo: The island holds more than a few buried coins. Someone once lived there, you know.", "Theo: Take this. And promise to bring me every strange thing you find."], reward: { pts: 50, item: "pearl" } },
  },
};
