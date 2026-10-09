// Tiny translation layer. English text stays in the source; `tr()` swaps in Hungarian at draw time.
// Strings are matched exactly first, then against `{0}`-style templates (captured parts are translated too).
import { settings, onSetting } from "./settings.js";
import { HU } from "./hu.js";

const exact = new Map(), patterns = [];
for (const [en, hu] of Object.entries(HU)) {
  if (!/\{\d\}/.test(en)) { exact.set(en, hu); continue; }
  const lits = en.split(/\{\d\}/), esc = lits.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  let i = 0; const src = "^" + esc.reduce((a, l, n) => a + (n ? `(.*?)` : "") + l, "") + "$";
  patterns.push({ re: new RegExp(src, "s"), hu, weight: lits.join("").length });
}
patterns.sort((a, b) => b.weight - a.weight);                                       // most specific templates first

const SEASON_TAG = { Sp: "Ta", Su: "Ny", Fa: "Ős", Wi: "Té" }, SEASON_3 = { Spr: "Tav", Sum: "Nyár", Fal: "Ősz", Win: "Tél" };
const cache = new Map(), outputs = new Set();                                         // outputs: strings we produced, never translated twice
export const untranslated = new Set();                                              // filled in debug runs to spot gaps

export const lang = () => settings().lang;
onSetting(k => { if (k === "lang") cache.clear(); });

const fill = (tpl, args) => tpl.replace(/\{(\d)\}/g, (_, i) => args[i] ?? "");

function lookup(s) {
  if (exact.has(s)) return exact.get(s);
  for (const p of patterns) { const m = p.re.exec(s); if (m) return fill(p.hu, m.slice(1).map(tr)); }
  // Generic compositions (item counts, menu prefixes, lists, "Name (Role)") built from translated parts.
  let m;
  if ((m = /^((?:>|\d+\.|[A-C]\.)\s+)(.+)$/s.exec(s))) return m[1] + tr(m[2]);
  if ((m = /^(\d+x?)( ?)([A-Za-z].*)$/s.exec(s))) return m[1] + (m[1].endsWith("x") ? " " : m[2]) + tr(m[3]);
  if ((m = /^(.+) x(\d+)$/s.exec(s))) return `${tr(m[1])} x${m[2]}`;
  if ((m = /^(.+?)(\s{2,}\$.*)$/s.exec(s))) { const a = tr(m[1]); return a === m[1] ? null : a + m[2]; }       // "Label  $price"
  if (s.endsWith("…")) { const r = tr(s.slice(0, -1)); return r === s.slice(0, -1) ? null : r + "…"; }
  if (s.includes(" + ")) { const parts = s.split(" + "), out = parts.map(tr); if (out.some((x, i) => x !== parts[i])) return out.join(" + "); }
  if (s.includes(", ")) { const parts = s.split(", "), out = parts.map(tr); return out.every((x, i) => x === parts[i]) ? null : out.join(", "); }
  if ((m = /^(.+?) \((.+)\)$/s.exec(s))) { const a = tr(m[1]), b = tr(m[2]); return a === m[1] && b === m[2] ? null : `${a} (${b})`; }
  if ((m = /^(.+?) — (.+)$/s.exec(s))) { const a = tr(m[1]), b = tr(m[2]); return a === m[1] && b === m[2] ? null : `${a} — ${b}`; }
  if ((m = /^(.+?): (.+)$/s.exec(s))) { const a = tr(m[1]), b = tr(m[2]); return a === m[1] && b === m[2] ? null : `${a}: ${b}`; }
  const tag = /^(Sp|Su|Fa|Wi)(\/(Sp|Su|Fa|Wi))*$/.test(s); if (tag) return s.split("/").map(x => SEASON_TAG[x]).join("/");
  const d = /^(Spr|Sum|Fal|Win) (\d+)$/.exec(s); if (d) return `${SEASON_3[d[1]]} ${d[2]}`;
  return null;
}

export function tr(s) {
  if (settings().lang !== "hu" || typeof s !== "string" || s.length < 2) return s;
  if (outputs.has(s)) return s;
  let r = cache.get(s);
  if (r !== undefined) return r;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);                                          // keep leading/trailing blanks
  const core = lookup(m[2]);
  r = core === null ? s : m[1] + core + m[3];
  if (core === null) { if (/[A-Za-z]{3}/.test(s) && untranslated.size < 3000) untranslated.add(s); } else outputs.add(r);
  if (cache.size < 4000) cache.set(s, r);
  return r;
}

// Forward formatting for strings the game composes itself: tf("Day {0}", n).
export function tf(key, ...args) { return fill(settings().lang === "hu" ? HU[key] ?? key : key, args); }
