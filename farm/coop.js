// Shared-farm co-op on top of the multiplayer link. The host's game is the authority for the world:
//  - the farm (and greenhouse) tiles, farm buildings, animals, chests, bundles, tool levels and the clock are shared;
//  - money is shared as +/- changes; inventory, skills, friendships and quests stay personal;
//  - the day only ends when both players are in bed (or one passes out), and the host runs the overnight update.
// The guest's own farm is kept aside while connected and written back to their save, so nothing of theirs is lost.
const SHARED = ["build", "chickens", "cows", "care", "house", "houseWork", "chest", "cellarChest", "bundles", "restored", "won", "hoeLevel", "canLevel", "pickLevel", "swordLevel", "axeLevel", "petted"];
const MAPS = ["farm", "greenhouse"];
const CHUNK = 400;

export function createCoop(d) {
  const net = d.net;
  let on = false, role = null, loaded = false, backup = null, scanT = 0, timeT = 0, hostReady = false, guestReady = false;
  let shadow = { tiles: {}, objs: {}, keys: {}, money: 0 };

  const S = () => d.state(), M = () => d.maps();
  const tileStr = t => JSON.stringify(t);
  function initShadow() {
    shadow = { tiles: {}, objs: {}, keys: {}, money: S().money };
    for (const name of MAPS) { const m = M()[name]; if (!m) continue; shadow.tiles[name] = m.tiles.flat().map(tileStr); shadow.objs[name] = JSON.stringify(m.objects); }
    for (const k of SHARED) shadow.keys[k] = JSON.stringify(S()[k] ?? null);
  }
  function scan() {                                                                        // send whatever changed since last time
    if (!loaded) return;
    for (const name of MAPS) {
      const m = M()[name]; if (!m) continue; const sh = shadow.tiles[name]; let idx = [], vals = [], i = 0;
      for (const row of m.tiles) for (const t of row) { const s = tileStr(t); if (sh[i] !== s) { sh[i] = s; idx.push(i); vals.push(s); if (idx.length >= CHUNK) { net.send({ t: "cd", map: name, i: idx, s: vals }); idx = []; vals = []; } } i++; }
      if (idx.length) net.send({ t: "cd", map: name, i: idx, s: vals });
      const os = JSON.stringify(m.objects); if (os !== shadow.objs[name]) { shadow.objs[name] = os; net.send({ t: "co", map: name, s: os }); }
    }
    for (const k of SHARED) { const s = JSON.stringify(S()[k] ?? null); if (s !== shadow.keys[k]) { shadow.keys[k] = s; net.send({ t: "cx", k, s }); } }
    if (S().money !== shadow.money) { net.send({ t: "cm", d: S().money - shadow.money }); shadow.money = S().money; }
  }
  function applyKey(k, s) {
    if (!SHARED.includes(k)) return; const v = JSON.parse(s); S()[k] = v; shadow.keys[k] = s;
    if (k === "chickens" || k === "cows") d.makeAnimals();
  }
  function applyTiles(name, idx, vals) {
    const m = M()[name]; if (!m) return;
    for (let n = 0; n < idx.length; n++) { const i = idx[n]; if (!(i >= 0 && i < m.w * m.h) || typeof vals[n] !== "string") continue; const t = JSON.parse(vals[n]); if (t && typeof t === "object") { m.tiles[Math.floor(i / m.w)][i % m.w] = t; if (shadow.tiles[name]) shadow.tiles[name][i] = vals[n]; } }
  }

  function sendSnapshot() {                                                                // host -> guest
    const s = S();
    net.send({ t: "cs0", keys: Object.fromEntries(SHARED.map(k => [k, JSON.stringify(s[k] ?? null)])), money: s.money, time: { day: s.day, minutes: s.minutes, rain: s.rain, fest: s.fest } });
    for (const name of MAPS) {
      const m = M()[name]; if (!m) continue; const flat = m.tiles.flat().map(tileStr);
      for (let i = 0; i < flat.length; i += CHUNK) net.send({ t: "cd", map: name, i: flat.slice(i, i + CHUNK).map((_, k) => i + k), s: flat.slice(i, i + CHUNK) });
      net.send({ t: "co", map: name, s: JSON.stringify(m.objects) });
    }
    net.send({ t: "cdone" });
  }
  function takeBackup() {
    const s = S();
    backup = { keys: Object.fromEntries(SHARED.map(k => [k, JSON.stringify(s[k] ?? null)])), money: s.money, day: s.day, minutes: s.minutes, rain: s.rain, fest: s.fest ? JSON.stringify(s.fest) : null, farm: JSON.stringify(M().farm), gh: JSON.stringify(M().greenhouse) };
  }
  function restore() {                                                                     // guest leaves: their own farm comes back
    if (!backup) return; const s = S(), m = M(), b = backup; backup = null;
    for (const k of SHARED) s[k] = JSON.parse(b.keys[k]);
    m.farm = JSON.parse(b.farm); m.greenhouse = JSON.parse(b.gh); s.money = b.money; s.day = b.day; s.minutes = b.minutes; s.rain = b.rain; s.fest = b.fest ? JSON.parse(b.fest) : null;
    d.makeAnimals(); s.map = "farm"; s.px = 7 * d.T; s.py = 8 * d.T; s.ui = null; d.say(d.tr("You are back on your own farm."), 4);
  }

  function closeWait() { const s = S(); if (s.ui?.type === "waitsleep") s.ui = null; }
  function runNewDay() {                                                                   // host only
    hostReady = guestReady = false; closeWait(); d.sleepNow(); scan();
    const s = S(); net.send({ t: "cnewday", day: s.day, minutes: s.minutes, rain: s.rain, fest: s.fest });
  }

  const api = {
    get active() { return on && loaded; }, get role() { return role; },
    start(r) { on = true; role = r; loaded = r === "host"; hostReady = guestReady = false; if (r === "host") { initShadow(); sendSnapshot(); } },
    stop() { if (!on) return; const was = role; on = loaded = false; role = null; closeWait(); if (was === "guest") restore(); },
    saveView() {
      if (!on || role !== "guest" || !backup) return null;
      const st = { ...S() }; for (const k of SHARED) st[k] = JSON.parse(backup.keys[k]);
      st.money = backup.money; st.day = backup.day; st.minutes = backup.minutes; st.rain = backup.rain; st.fest = backup.fest ? JSON.parse(backup.fest) : null;
      return { maps: { ...M(), farm: JSON.parse(backup.farm), greenhouse: JSON.parse(backup.gh) }, state: st };
    },
    update(dt) {
      if (!api.active) return;
      if ((scanT -= dt) <= 0) { scanT = 0.35; scan(); }
      if (role === "host" && (timeT -= dt) <= 0) { timeT = 1; const s = S(); net.send({ t: "ctime", day: s.day, minutes: s.minutes, rain: s.rain, fest: s.fest }); }
    },
    gate(forced) {                                                                         // called instead of sleeping directly
      if (!api.active) return d.sleepNow();
      if (role === "host") { hostReady = true; if (guestReady || forced) runNewDay(); else S().ui = { type: "waitsleep" }; }
      else { net.send(forced ? { t: "cforce" } : { t: "cready", r: true }); S().ui = { type: "waitsleep" }; }
    },
    cancelWait() { if (role === "host") hostReady = false; else net.send({ t: "cready", r: false }); closeWait(); },
    message(m) {
      if (!on) return false;
      switch (m.t) {
        case "cs0": {
          if (role !== "guest") return true;
          takeBackup(); const s = S();
          for (const k of SHARED) s[k] = JSON.parse(m.keys[k] ?? "null");
          s.money = Number(m.money) || 0; Object.assign(s, { day: m.time.day, minutes: m.time.minutes, rain: !!m.time.rain, fest: m.time.fest ?? null });
          initShadow(); return true;
        }
        case "cd": if (typeof m.map === "string" && Array.isArray(m.i) && Array.isArray(m.s)) applyTiles(m.map, m.i, m.s); return true;
        case "co": { const mm = M()[m.map]; if (mm && MAPS.includes(m.map)) { mm.objects = JSON.parse(m.s); shadow.objs[m.map] = m.s; } return true; }
        case "cx": applyKey(m.k, m.s); return true;
        case "cm": { const dm = Number(m.d) || 0; S().money += dm; shadow.money += dm; return true; }
        case "cdone": {
          if (role !== "guest") return true;
          loaded = true; initShadow(); d.makeAnimals(); const s = S(); s.map = "farm"; s.px = 7 * d.T; s.py = 8 * d.T; s.ui = null;
          d.say(d.tr("You joined your friend's farm! Your own farm is kept safe."), 5); return true;
        }
        case "ctime": if (role === "guest" && loaded) { const s = S(); s.minutes = Number(m.minutes) || s.minutes; s.rain = !!m.rain; s.fest = m.fest ?? null; if (m.day > s.day) { s.day = m.day; d.guestWake(); } } return true;
        case "cready": if (role === "host") { guestReady = !!m.r; if (guestReady && hostReady) runNewDay(); } return true;
        case "cforce": if (role === "host") runNewDay(); return true;
        case "cnewday": if (role === "guest" && loaded) { const s = S(); closeWait(); s.minutes = m.minutes; s.rain = !!m.rain; s.fest = m.fest ?? null; if (m.day > s.day) { s.day = m.day; d.guestWake(); } } return true;
      }
      return false;
    },
  };
  return api;
}
