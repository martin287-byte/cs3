// Furniture for the extra farmhouse rooms: sofa (living room), desk (study) and crafting bench (workshop).
import { mk, R, shade, outline } from "./px.js";
const spr = (w, h, fn) => outline(mk(w, h, fn));
const sofa = () => spr(32, 24, g => {
  R(g, "#4a2a52", 1, 3, 30, 18); R(g, "#8a4a9a", 2, 4, 28, 9); R(g, "#a866b8", 2, 4, 28, 2);                         // back
  R(g, "#6a3a7a", 0, 10, 5, 12); R(g, "#6a3a7a", 27, 10, 5, 12); R(g, "#8a4a9a", 1, 10, 3, 4); R(g, "#8a4a9a", 28, 10, 3, 4);  // arms
  R(g, "#a866b8", 5, 13, 22, 8); R(g, "#c888d8", 5, 13, 22, 1); R(g, "#7a4a8a", 16, 14, 1, 7);                          // cushions
  R(g, "#f4e48a", 7, 8, 5, 4); R(g, "#d8b84a", 8, 9, 3, 2);                                                           // pillow
  R(g, "#3a2a1a", 2, 21, 3, 2); R(g, "#3a2a1a", 27, 21, 3, 2);
});
const desk = () => spr(32, 24, g => {
  R(g, "#6a4020", 1, 8, 30, 3); R(g, "#a8743c", 1, 8, 30, 1); R(g, "#8a5a30", 2, 11, 28, 2);
  R(g, "#6a4020", 2, 13, 3, 10); R(g, "#6a4020", 27, 13, 3, 10); R(g, "#8a5a30", 24, 13, 6, 9); R(g, "#d8b84a", 26, 16, 2, 1);
  R(g, "#f4efe6", 5, 3, 9, 6); R(g, "#d8d2c6", 5, 8, 9, 1); R(g, "#4a8ad8", 15, 5, 5, 4); R(g, "#d84a4a", 16, 4, 3, 1);   // papers and a book
  R(g, "#2a2a30", 22, 1, 2, 8); R(g, "#ffe08a", 20, 0, 6, 3); R(g, "#fff6c8", 21, 1, 2, 1);                                  // lamp
});
const bench = () => spr(32, 24, g => {
  R(g, "#5a3a1c", 1, 8, 30, 4); R(g, "#9a6a3c", 1, 8, 30, 1); R(g, "#6a4020", 2, 12, 3, 11); R(g, "#6a4020", 27, 12, 3, 11); R(g, "#7a5028", 2, 17, 28, 2);
  R(g, "#9aa0ac", 5, 4, 3, 5); R(g, "#6a4020", 5, 2, 3, 3); R(g, "#b8bcc6", 11, 6, 8, 2); R(g, "#d8803a", 22, 5, 4, 4); R(g, "#ffd23f", 23, 4, 2, 1);   // tools
  R(g, "#4a4a56", 24, 14, 4, 4); R(g, "#7a8494", 25, 15, 2, 2);
});
export function buildRoomArt(S) { Object.assign(S.bldg, { sofa: sofa(), desk: desk(), bench: bench() }); }
