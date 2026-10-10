// Backpack slots (Stardew-style). Item and seed COUNTS still live in state.inv / state.seeds; this module keeps a slot
// layout on top of them: each slot is null or { k: "tool" | "item" | "seed", id }. The hotbar is one row (12 slots) of it.
import { CROPS, FORAGE, FISH, ORES, DISHES, itemInfo } from "./data.js";

export const COLS = 12;
export const TOOL_IDS = ["hoe", "can", "rod", "pick", "sword"];

export const defaultSlots = n => { const s = Array(n).fill(null); TOOL_IDS.forEach((id, i) => { s[i] = { k: "tool", id }; }); return s; };
export const count = (st, s) => (s.k === "item" ? st.inv[s.id] || 0 : s.k === "seed" ? st.seeds[s.id] || 0 : 1);
export const hasSlot = (st, k, id) => st.slots.some(s => s && s.k === k && s.id === id);
export const canHold = (st, k, id) => hasSlot(st, k, id) || st.slots.includes(null);
export const usedSlots = st => st.slots.filter(Boolean).length;

// Makes sure a stack has a slot (placing it in the first free one). Returns false when the backpack is full.
export function ensureSlot(st, k, id) {
  if (hasSlot(st, k, id)) return true;
  const i = st.slots.indexOf(null); if (i < 0) return false;
  st.slots[i] = { k, id }; return true;
}

// Brings the layout in line with the counts: empties finished stacks, places new ones, hands overflow to `overflow`.
export function syncSlots(st, overflow) {
  const sl = st.slots;
  for (let i = 0; i < sl.length; i++) { const s = sl[i]; if (s && s.k !== "tool" && count(st, s) <= 0) sl[i] = null; }
  const have = new Set(sl.filter(Boolean).map(s => s.k + ":" + s.id));
  for (const [k, dict] of [["item", st.inv], ["seed", st.seeds]]) for (const id of Object.keys(dict)) {
    if (!(dict[id] > 0) || have.has(k + ":" + id)) continue;
    const i = sl.indexOf(null);
    if (i < 0) overflow(k, id, dict[id]); else { sl[i] = { k, id }; have.add(k + ":" + id); }
  }
}

const cat = s => (s.k === "tool" ? 0 : s.k === "seed" ? 1 : CROPS[s.id] ? 2 : FORAGE[s.id] ? 3 : FISH[s.id] ? 4 : ORES[s.id] ? 5 : DISHES[s.id] ? 6 : 7);
const nm = s => (s.k === "item" ? itemInfo(s.id).name : s.id);
// "Organize": tools first (fixed order), then seeds, crops, forage, fish, ore, dishes and the rest, each alphabetical.
export function sortSlots(st) {
  const all = st.slots.filter(Boolean);
  all.sort((a, b) => cat(a) - cat(b) || (a.k === "tool" ? TOOL_IDS.indexOf(a.id) - TOOL_IDS.indexOf(b.id) : nm(a).localeCompare(nm(b))));
  st.slots = [...all, ...Array(st.slots.length - all.length).fill(null)];
}
