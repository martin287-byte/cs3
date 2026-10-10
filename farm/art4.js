// Artisan machine sprites (16x16, used both on the ground and as inventory icons) and generated icons for their products.
import { mk, R, shade, outline } from "./px.js";
import { MACHINES, ARTISAN, isArtisan } from "./data.js";

const jar = () => mk(16, 16, g => {
  R(g, "#8a5a30", 2, 12, 12, 3); R(g, "#6a4020", 2, 14, 12, 1); R(g, "#d8e8f0", 4, 4, 8, 9); R(g, "#a8c8d8", 4, 4, 8, 1); R(g, "#7ac07a", 5, 7, 6, 5); R(g, "#a8e0a0", 5, 7, 2, 4);
  R(g, "#c8a060", 3, 2, 10, 3); R(g, "#8a6a30", 3, 4, 10, 1); R(g, "#ffffff", 5, 5, 1, 4);
});
const keg = () => mk(16, 16, g => {
  R(g, "#5a3a1c", 2, 14, 3, 2); R(g, "#5a3a1c", 11, 14, 3, 2);
  R(g, "#8a5a30", 2, 3, 12, 11); R(g, "#a8743c", 3, 3, 3, 11); R(g, "#6a4020", 11, 3, 3, 11);
  R(g, "#4a4a56", 2, 5, 12, 1); R(g, "#4a4a56", 2, 11, 12, 1); R(g, "#c8935a", 5, 2, 6, 1);
  R(g, "#b8c0cc", 6, 8, 4, 2); R(g, "#7a8494", 7, 10, 2, 3); R(g, "#d84a4a", 7, 7, 2, 1);
});
const press = () => mk(16, 16, g => {
  R(g, "#6a4020", 1, 13, 14, 2); R(g, "#a8743c", 2, 10, 12, 3); R(g, "#d8b070", 3, 11, 10, 1);
  R(g, "#6a4020", 3, 2, 2, 9); R(g, "#6a4020", 11, 2, 2, 9); R(g, "#8a5a30", 3, 2, 10, 3);
  R(g, "#b8c0cc", 7, 4, 2, 5); R(g, "#7a8494", 5, 8, 6, 2); R(g, "#f0d060", 5, 10, 6, 2); R(g, "#e8c040", 6, 10, 2, 1);
});
const mayo = () => mk(16, 16, g => {
  R(g, "#e8e4d8", 3, 6, 10, 9); R(g, "#fff", 3, 6, 10, 2); R(g, "#b8b4a8", 3, 14, 10, 1);
  R(g, "#e0e8f0", 4, 1, 8, 6); R(g, "#a8b8c8", 6, 5, 4, 2); R(g, "#d8b84a", 5, 9, 6, 3); R(g, "#f4e48a", 6, 10, 3, 1); R(g, "#d84a4a", 11, 8, 1, 1);
});
const ART = { jar, keg, press, mayo };

// Average colour of an icon (ignoring the dark outline and transparent pixels): used to tint generated products.
function avgColor(cv) {
  try {
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200 || d[i] + d[i + 1] + d[i + 2] < 150) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const h = v => Math.round(v / n).toString(16).padStart(2, "0");
    return n ? `#${h(r)}${h(g)}${h(b)}` : "#c06060";
  } catch { return "#c06060"; }
}
const bottle = (col, label) => mk(16, 16, g => { R(g, "#5a4a3a", 6, 1, 4, 2); R(g, "#d8e8f0", 6, 3, 4, 3); R(g, "#d8e8f0", 4, 6, 8, 9); R(g, col, 5, 8, 6, 6); R(g, "#ffffff", 5, 7, 1, 6); R(g, label, 5, 10, 6, 2); });
const product = (kind, col) => mk(16, 16, g => {
  if (kind === "pickle" || kind === "jam") {
    R(g, "#d8e8f0", 4, 4, 8, 10); R(g, "#a8c8d8", 4, 4, 8, 1); R(g, col, 5, 6, 6, 7); R(g, shade("#ffffff", 0), 5, 5, 1, 7);
    R(g, kind === "jam" ? "#d84a6a" : "#c8a060", 3, 2, 10, 3); R(g, kind === "jam" ? "#f4efe6" : "#8a6a30", 3, 4, 10, 1);
    if (kind === "jam") { R(g, "#f4efe6", 4, 3, 2, 1); R(g, "#f4efe6", 10, 3, 2, 1); }
  } else if (kind === "juice") { R(g, "#e8eef4", 4, 2, 8, 12); R(g, col, 5, 5, 6, 8); R(g, "#ffffff", 5, 3, 1, 9); R(g, "#d84a4a", 9, 1, 1, 4); R(g, "#6a6a76", 4, 14, 8, 1); }
  else if (kind === "wine") { const c = shade(col, -0.45); R(g, "#2a2030", 6, 1, 4, 3); R(g, "#3a2e44", 5, 4, 6, 11); R(g, c, 5, 6, 6, 8); R(g, "#f0e8d0", 5, 8, 6, 3); R(g, "#8a2a3a", 7, 9, 2, 1); R(g, "#6a5a7a", 5, 4, 1, 10); }
});
const cheese = () => mk(16, 16, g => { R(g, "#e8b830", 2, 6, 12, 7); R(g, "#f8d860", 2, 6, 12, 2); R(g, "#c8941c", 2, 12, 12, 1); R(g, "#f8d860", 9, 4, 5, 2); R(g, "#c8941c", 5, 9, 2, 2); R(g, "#c8941c", 10, 8, 2, 2); R(g, "#fff3a8", 3, 7, 3, 1); });
const mayoJar = () => mk(16, 16, g => { R(g, "#e8eef4", 4, 4, 8, 10); R(g, "#f6f0d0", 5, 6, 6, 7); R(g, "#ffffff", 5, 5, 1, 8); R(g, "#d84a4a", 3, 2, 10, 3); R(g, "#f4efe6", 3, 4, 10, 1); R(g, "#ffe27a", 7, 8, 2, 2); });

export function buildMachineArt(S) {
  S.machine = {};
  for (const t of Object.keys(MACHINES)) { const a = ART[t](); S.icon["m_" + t] = a; S.machine[t] = outline(a); }
  const base = S.icon;
  S.icon = new Proxy(base, {                                                        // product icons are made on first use
    get(t, k) {
      if (typeof k !== "string" || k in t) return t[k];
      let ic = null;
      if (k === "cheese") ic = cheese(); else if (k === "mayo") ic = mayoJar();
      else if (isArtisan(k)) { const [kind, id] = k.split(":"); ic = product(kind, avgColor(t[id] || t.egg)); }
      if (ic) t[k] = ic; return t[k];
    },
  });
}
