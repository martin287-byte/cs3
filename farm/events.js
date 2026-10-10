// Birthdays and heart events. Seasons: 0 Spring .. 3 Winter; days 1..SEASON_LEN. Event lines are plain strings so they can be translated.
export const BIRTHDAYS = {
  rosa: { s: 0, d: 3 }, oliver: { s: 0, d: 8 }, mina: { s: 1, d: 2 }, ben: { s: 1, d: 7 },
  marlo: { s: 2, d: 1 }, dune: { s: 2, d: 6 }, iris: { s: 3, d: 4 }, quill: { s: 3, d: 9 },
  nora: { s: 0, d: 6 },
  hugo: { s: 1, d: 4 },
  lena: { s: 2, d: 3 },
  theo: { s: 3, d: 1 },
  hazel: { s: 1, d: 9 },
};
export const BIRTHDAY_MULT = 3;
// 4-heart and 8-heart scenes: three lines each, then a reward ({ pts, money, item }).
export const HEART_EVENTS = {
  rosa: {
    4: { lines: ["Rosa is staring at a tray of burnt rolls.", "Rosa: Oh! I got so busy chatting that I forgot the oven. Don't tell anyone.", "Rosa: Here — take a few of the good ones as a thank-you for keeping my secret."], reward: { pts: 30, item: "pancakes" } },
    8: { lines: ["Rosa has set a small table behind the bakery.", "Rosa: I never share my grandmother's recipe, but I trust you. Sugar first, then patience.", "Rosa: Promise me you'll bake something wonderful with it. Take this, you earned it."], reward: { pts: 50, money: 300 } },
    6: { lines: ["The bakery door bursts open. Smoke pours out, followed by Oliver carrying a tray.", {"at": ["oliver", 5, 0, 3]}, {"walk": ["oliver", 2, 0]}, {"emote": ["rosa", "!"]}, "Oliver: Rosa! Your caramel is on fire again!", "Rosa: It is not on fire. It's... dramatically toasted.", "Oliver: Dramatically toasted is a polite word for burnt.", "Rosa: You decide, farmer. Is a little char a crime?", "You: Add a pinch of salt and call it a speciality.", {"emote": ["rosa", "♥"]}, "Rosa: Salted caramel! Oliver, write that on the board!", "From that day on, 'dramatically toasted' was the bakery's best seller."], reward: { pts: 40, item: "pie" } },
    10: { lines: ["Rosa waits for you outside the bakery at sunset, holding a small wrapped loaf.", "Rosa: I never told anyone why I came to this valley.", "Rosa: I was a city baker. Every day the same queue, and nobody ever said thank you.", {"emote": ["rosa", "…"]}, "Rosa: Then you ate my first burnt loaf and asked for a second.", "Rosa: This valley became home because of people like you. Thank you.", "The loaf is still warm."], reward: { pts: 60, money: 600 } },
  },
  oliver: {
    4: { lines: ["Oliver is rearranging the same shelf for the third time.", "Oliver: Business is slow and I'm talking to jars of seeds. Thanks for stopping by.", "Oliver: A good customer deserves a bonus. Here's a little something on the house."], reward: { pts: 30, money: 150 } },
    8: { lines: ["Oliver closes the shop early and hangs a sign on the door.", "Oliver: I used to dream of a farm of my own. Now I sell seeds to people who do the dreaming for me.", "Oliver: You're doing it right. Here, a share of my best stock."], reward: { pts: 50, item: "tonic" } },
  },
  mina: {
    4: { lines: ["Mina is sitting on the dock with a tangled fishing line.", "Mina: Three hours, no bites, and now this. The lake is laughing at me.", "Mina: You help me untangle it, and I'll give you my lucky bait."], reward: { pts: 30, item: "bass" } },
    8: { lines: ["Mina points at the water. Something huge and silver moves under the surface.", "Mina: Every year it shows up and I never catch it. Today I just wanted someone to see it with me.", "Mina: Thanks for being here. Take this — for your next big fish."], reward: { pts: 50, money: 300 } },
    6: { lines: ["Mina sits on the dock, rod trembling, eyes locked on the water.", "Mina: Shh! Don't move. It's here. The silver one.", {"emote": ["mina", "!"]}, {"walk": ["mina", 1, -1]}, "A huge splash, and Mina is soaked from head to toe.", "Mina: It got away... again.", {"emote": ["mina", "♪"]}, "Mina: But I'm laughing, so I guess it was a good day."], reward: { pts: 40, item: "bass" } },
    10: { lines: ["Mina hands you a worn fishing rod wrapped in cloth.", "Mina: This was my grandfather's first rod. I caught my first fish with it, and my first disappointment.", "Mina: I want you to have it. Not to use. To remember that patience is a kind of friendship.", {"emote": ["mina", "♥"]}, "Mina: Cast something far for me, okay?"], reward: { pts: 60, money: 500 } },
  },
  ben: {
    4: { lines: ["Ben is leaning on his old fence, looking at an empty field.", "Ben: Forty years I farmed this. Now my knees say no and the field says yes.", "Ben: Keep the soil good. Take this — it was always lucky for me."], reward: { pts: 30, item: "gold" } },
    8: { lines: ["Ben carries a faded photo out onto the porch.", "Ben: That's me and my late spouse the first spring here. The farm started as a promise.", "Ben: You remind me of us. Please take care of this valley."], reward: { pts: 50, money: 400 } },
    6: { lines: ["Ben is repainting a worn-out scarecrow in front of his house.", "Ben: Forty summers it's guarded my field. Never lost a single crow fight.", "Ben: Iris says it's creepy. I say it's loyal.", {"emote": ["ben", "!"]}, "Ben: Hold the ladder, farmer.", {"walk": ["ben", 0, -1]}, "You hold the ladder while Ben fixes the scarecrow's hat.", "Ben: There. Good as new. Almost as handsome as me."], reward: { pts: 40, money: 250 } },
    10: { lines: ["Ben presses an old key into your hand as the sun sets over his empty field.", "Ben: This opens the old shed behind my house. It's yours now.", "Ben: I won't be farming much longer, but this valley needs hands like yours.", {"emote": ["ben", "…"]}, "Ben: Promise me the scarecrow stays.", "You: I promise.", "Ben: Good. Then I can rest easy."], reward: { pts: 60, item: "iron", money: 800 } },
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
    6: { lines: ["Iris kneels beside a seedling that glows faintly in the shade.", "Iris: Look. It only opens when it hears someone laugh.", "Iris: Go on, farmer. Tell it a joke.", "You: Why did the turnip blush? It saw the salad dressing!", {"emote": ["iris", "…"]}, "Iris: ...That was terrible.", "The bloom opens anyway.", {"emote": ["iris", "♥"]}, "Iris: It likes you."], reward: { pts: 40, item: "daffodil" } },
    10: { lines: ["Iris leads you into a clearing where hundreds of flowers glow in the dark.", "Iris: Grandpa Ben planted the first ones. I only learned to keep them alive.", "Iris: Every spring I plant one more. This year, I'd like to plant one with you.", "You kneel together and plant a single glowing seed.", {"emote": ["iris", "♥"]}, "Iris: Now the valley has a little bit of both of us."], reward: { pts: 60, money: 500 } },
  },
  quill: {
    4: { lines: ["Quill has crumpled pages scattered around the bench.", "Quill: The hero walks into the tavern and then — nothing. I'm stuck on the same page.", "Quill: Talking helped. Take this, a stolen coin from chapter two."], reward: { pts: 30, item: "coin" } },
    8: { lines: ["Quill reads aloud from a new page, voice trembling.", "Quill: 'The farmer woke before dawn and the valley woke with them.' Do you like it?", "Quill: I wrote you into the book. Take this — you've earned your own chapter."], reward: { pts: 50, money: 350 } },
    6: { lines: ["Quill paces in circles, muttering into a notebook.", "Quill: Chapter two. The farmer walks into the forest. And then... nothing!", {"emote": ["quill", "?"]}, "Quill: What would you do, truly?", "You: Pick up a strange glowing flower.", "Quill: A glowing flower! Yes! But what is it for?", "You: It opens when you tell it a joke.", "Quill: ...I'm writing that down."], reward: { pts: 40, item: "coin" } },
    10: { lines: ["Quill hands you a thick bound book. The cover reads: Tiny Valley.", "Quill: It's finished. Every chapter, every festival, every burnt loaf.", "Quill: You're on every page. I hope that's all right.", "You: It's perfect.", {"emote": ["quill", "♥"]}, "Quill: Then thank you for being the story."], reward: { pts: 60, money: 700 } },
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
  hazel: {
    4: { lines: ["Hazel is staring at a crooked shelf with her arms crossed.", "Hazel: I built that at midnight. In my defence, it was dark.", "Hazel: Take some planks. I've got too many and no more shelves."], reward: { pts: 30, item: "wood" } },
    8: { lines: ["Hazel unrolls a blueprint on the counter, with a tiny drawing of a cabin.", "Hazel: I always wanted to build a house for someone I care about. I'm still drawing it.", "Hazel: Take this for your next project. You inspire me."], reward: { pts: 50, money: 500 } },
  },
};

// Family ties: shown in the talk panel; gifts to one member are noticed by the other.
export const FAMILY = {
  rosa: [["oliver", "brother"]], oliver: [["rosa", "sister"]], ben: [["iris", "granddaughter"]], iris: [["ben", "grandfather"]],
  marlo: [["mina", "daughter"]], mina: [["marlo", "father"]], nora: [["hugo", "brother"]], hugo: [["nora", "sister"]],
  theo: [["lena", "niece"]], lena: [["theo", "uncle"]],
};
export const FAMILY_LINES = {
  rosa: "Oliver pretends he doesn't like my pastries, yet he eats half the tray.", oliver: "Rosa bakes, I count the coins. It's a family business, really.",
  ben: "Iris is always in the woods. She gets that from her grandmother.", iris: "Grandpa Ben tells the same farm stories every spring. I love them.",
  marlo: "Mina caught a bigger fish than me last week. I'm still proud. Mostly.", mina: "Dad says I fish like my mother. It's the best compliment.",
  nora: "Hugo works too hard. Make sure he eats something warm.", hugo: "My sister fusses over me. I pretend to hate it.",
  theo: "Lena has dragged half the museum's relics into her library. Don't tell her I know.", lena: "Uncle Theo tells me everything old is precious. Even his jokes.",
};

// The community-centre finale (played when the last bundle is handed in).
export const FINALE = ["The whole village gathers outside the restored community centre.", {"at": ["oliver", -3, 1, 2]}, {"at": ["rosa", 3, 1, 3]}, {"at": ["mina", -4, 2, 2]}, {"at": ["ben", 4, 2, 3]}, {"at": ["iris", -2, 3, 2]}, {"at": ["quill", 2, 3, 3]}, {"wait": 0.5}, {"emote": ["oliver", "♪"]}, "Oliver: I've stocked that shop for years and never seen the valley so alive.", "Rosa: I baked a pie for everyone. Don't ask how many burnt ones I made.", "Ben: Forty years I waited to see this place open again.", "Mina: Even the fish are celebrating. I can tell.", "Iris: Every flower in the valley is blooming today.", {"emote": ["quill", "♥"]}, "Quill: This is the final chapter. Or the first of a new one.", "You hold the key to the community centre as the whole village cheers."];
