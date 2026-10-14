// Player settings that must work before a game exists (title screen), kept apart from the save file.
const KEY = "tinyvalley-settings";
const defaults = () => ({ lang: /^hu\b/i.test(navigator.language || "") ? "hu" : "en", sfx: true, haptics: true, ctrl: 1, screen: "cw", text: 0.75 });
let cfg = defaults();
try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
const listeners = [];

export const settings = () => cfg;
export function setSetting(k, v) {
  cfg[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
  for (const f of listeners) f(k, v);
}
export const onSetting = f => listeners.push(f);
export const TEXT_SIZES = [0.65, 0.75, 1];                                          // canvas text scale presets (small / medium / large)
export const CTRL_SIZES = [0.85, 1, 1.2];                                            // touch-control scale presets
