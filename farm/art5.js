// Town landmarks: clinic, inn, library, smithy, fountain, lamp post, market stall.
import { mk, R, shade } from "./px.js";
import { drawHouse } from "./art.js";

const onHouse = (opts, paint) => { const c = drawHouse(opts), g = c.getContext("2d"); paint(g); return c; };
const clinic = () => onHouse({ wall: "#f4f0ec", roof: "#6aa8d8", trim: "#ffffff", shutter: "#d84a4a", chimney: false, label: "CLINIC" }, g => {
  R(g, "#3b2814", 40, 29, 12, 12); R(g, "#ffffff", 41, 30, 10, 10); R(g, "#d84a4a", 45, 31, 2, 8); R(g, "#d84a4a", 42, 34, 8, 2);
});
const inn = () => onHouse({ wall: "#a8683a", roof: "#6a3a22", trim: "#e8c890", shutter: "#2a5a3a", label: "INN" }, g => {
  R(g, "#3b2814", 40, 29, 13, 11); R(g, "#d8a860", 41, 30, 11, 9); R(g, "#7a4a22", 44, 30, 1, 4); R(g, "#f0d890", 41, 34, 11, 1);   // hanging sign + mug
  R(g, "#e8e0c8", 43, 35, 4, 4); R(g, "#fff", 43, 34, 4, 1); R(g, "#c8a060", 47, 36, 1, 2);
});
const library = () => onHouse({ wall: "#c8d4e0", roof: "#5a4a8a", trim: "#ffffff", shutter: "#8a5a30", chimney: false, label: "BOOKS" }, g => {
  R(g, "#3b2814", 40, 29, 12, 11); R(g, "#6a4a2a", 41, 30, 10, 9); for (const [x, c] of [[42, "#d84a4a"], [44, "#4a8ad8"], [46, "#4ab868"], [48, "#e8c040"]]) { R(g, c, x, 31, 2, 7); R(g, shade(c, 0.3), x, 31, 1, 7); }
});
const smithy = () => onHouse({ wall: "#8a8a92", roof: "#3a3a44", trim: "#b8b8c0", shutter: "#c86a2a", label: "SMITH" }, g => {
  R(g, "#3b2814", 40, 36, 14, 14); R(g, "#2a2a30", 41, 37, 12, 12); R(g, "#ff8a2a", 43, 43, 8, 5); R(g, "#ffd23f", 45, 45, 4, 3); R(g, "#6a6a74", 42, 40, 10, 2);
});
const townhall = () => onHouse({ wall: "#ddd4c0", roof: "#8a3a3a", trim: "#ffffff", shutter: "#3a5a8a", chimney: false, label: "HALL" }, g => {
  R(g, "#3b2814", 21, 8, 14, 3); R(g, "#f4e8c8", 22, 9, 12, 1); R(g, "#d84a4a", 27, 0, 1, 8); R(g, "#d84a4a", 28, 1, 5, 3); R(g, "#fff", 28, 2, 3, 1);
  for (const x of [8, 40]) { R(g, "#f4efe6", x, 28, 3, 24); R(g, "#c8c0b0", x + 2, 28, 1, 24); }
});
const museum = () => onHouse({ wall: "#c8c0d8", roof: "#4a6a8a", trim: "#f4f0ff", shutter: "#6a4a8a", chimney: false, label: "MUSEUM" }, g => {
  R(g, "#3b2814", 40, 29, 12, 11); R(g, "#f0e0a0", 41, 30, 10, 9); R(g, "#8a6a30", 44, 33, 4, 5); R(g, "#d8b84a", 45, 31, 2, 2); R(g, "#fff", 45, 31, 1, 1);
});
const post = () => onHouse({ wall: "#e0b080", roof: "#c84a3a", trim: "#fff4d8", shutter: "#3a6aa8", label: "POST" }, g => {
  R(g, "#3b2814", 40, 36, 10, 14); R(g, "#3a6aa8", 41, 37, 8, 12); R(g, "#1a3a68", 42, 40, 6, 2); R(g, "#fff", 43, 44, 4, 2);
});
const carpenter = () => onHouse({ wall: "#c8a070", roof: "#8a4a2a", trim: "#f4e4c0", shutter: "#3a6a4a", label: "WOOD" }, g => {
  R(g, "#3b2814", 40, 29, 13, 12); R(g, "#f0d8a0", 41, 30, 11, 10); R(g, "#8a8e99", 43, 31, 7, 2); for (let i = 0; i < 4; i++) R(g, "#6a6e79", 43 + i * 2, 33, 1, 3);        // a saw on the sign
  R(g, "#a8743c", 1, 50, 8, 2); R(g, "#c8935a", 1, 50, 8, 1); R(g, "#a8743c", 2, 47, 7, 2); R(g, "#c8935a", 2, 47, 7, 1);                                              // a stack of planks
});
const fountain = () => mk(34, 34, g => {
  R(g, "#4a4a56", 2, 12, 30, 20); R(g, "#8a8a98", 3, 12, 28, 18); R(g, "#b8b8c6", 3, 12, 28, 3); R(g, "#6a6a78", 3, 28, 28, 3);
  R(g, "#4a8ac8", 6, 16, 22, 10); R(g, "#7ac0f0", 6, 16, 22, 3); R(g, "#a8e0ff", 9, 21, 6, 1); R(g, "#a8e0ff", 18, 18, 7, 1);
  R(g, "#6a6a78", 14, 6, 6, 14); R(g, "#9a9aa8", 14, 6, 2, 14); R(g, "#4a4a56", 12, 4, 10, 3); R(g, "#9a9aa8", 12, 4, 10, 1);
  R(g, "#bfe8ff", 16, 0, 2, 5); R(g, "#d8f4ff", 13, 3, 1, 3); R(g, "#d8f4ff", 20, 3, 1, 3);
});
const lamp = () => mk(16, 32, g => {
  R(g, "#2a2a30", 7, 10, 2, 20); R(g, "#4a4a54", 7, 10, 1, 20); R(g, "#2a2a30", 5, 28, 6, 3); R(g, "#3a3a44", 5, 28, 6, 1);
  R(g, "#2a2a30", 4, 3, 8, 8); R(g, "#ffe08a", 5, 4, 6, 6); R(g, "#fff6c8", 6, 5, 2, 3); R(g, "#2a2a30", 3, 2, 10, 2); R(g, "#2a2a30", 6, 0, 4, 2);
});
const stall = () => mk(34, 30, g => {
  for (let i = 0; i < 30; i++) R(g, i % 6 < 3 ? "#e24b4b" : "#fff8f0", 2 + i, 4, 1, 8);
  R(g, "#3b2814", 2, 12, 30, 1); R(g, "#6a4020", 3, 12, 2, 16); R(g, "#6a4020", 29, 12, 2, 16);
  R(g, "#8a5a30", 2, 18, 30, 10); R(g, "#a8743c", 2, 18, 30, 2); R(g, "#6a4020", 2, 27, 30, 1);
  for (const [x, c] of [[6, "#e84a4a"], [11, "#ffd23f"], [16, "#7ac07a"], [21, "#e8884a"], [26, "#a85aa8"]]) { R(g, c, x, 15, 4, 4); R(g, shade(c, 0.3), x, 15, 1, 2); }
});
export function buildTownArt(S) { Object.assign(S.bldg, { clinic: clinic(), inn: inn(), library: library(), smithy: smithy(), carpenter: carpenter(), townhall: townhall(), museum: museum(), post: post(), fountain: fountain(), lamp: lamp(), stall: stall() }); }
