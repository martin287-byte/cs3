// Two-player peer-to-peer mode: you see each other walk around, chat, send emotes and gift items.
// Each player keeps their own farm and save; there is no server (see net.js for the connection codes).
import { createNet } from "./net.js";
import { createCoop } from "./coop.js";

const CSS = `
#mp { position: fixed; z-index: 60; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(94vw, 440px); max-height: 92vh; overflow: auto; box-sizing: border-box;
  background: #2c1a0c; color: #f2ead8; border: 3px solid #cb9450; border-radius: 10px; padding: 12px 14px; font: 13px/1.4 monospace; box-shadow: 0 6px 30px #000a; display: none; }
#mp h2 { margin: 0 0 8px; font-size: 15px; color: #ffd23f; }
#mp p { margin: 6px 0; opacity: .9; } #mp .dim { opacity: .65; font-size: 11px; }
#mp button, #mp select, #mp input, #mp textarea { font: inherit; color: #fff; background: #4a3220; border: 2px solid #93622f; border-radius: 6px; padding: 6px 9px; margin: 2px 2px 2px 0; }
#mp button { cursor: pointer; } #mp button.main { background: #5a8a3a; border-color: #8ad04a; } #mp button.warn { background: #8a3a3a; border-color: #d86a6a; }
#mp textarea { width: 100%; box-sizing: border-box; height: 74px; resize: none; font-size: 11px; word-break: break-all; }
#mp input[type=text] { width: 62%; } #mp input[type=number] { width: 60px; } #mp select { max-width: 55%; }
#mp .row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
#mp .ok { color: #8f8; } #mp .bad { color: #f88; }
`;

const COLOR = /^#[0-9a-f]{6}$/i, STYLES = ["short", "long", "bun", "cap", "bald"];
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").slice(0, n);
const num = (v, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; };
function cleanLook(l = {}) {
  const o = {}; for (const k of ["skin", "hair", "eye", "shirt", "pants"]) if (COLOR.test(l[k] || "")) o[k] = l[k];
  o.hairStyle = STYLES.includes(l.hairStyle) ? l.hairStyle : "short"; o.beard = !!l.beard; return o;
}

export function createMultiplayer(d) {
  const net = createNet(); const coop = createCoop({ net, state: d.state, maps: d.maps, T: d.T, tr: d.tr, say: d.say, makeAnimals: d.makeAnimals, sleepNow: d.sleepNow, guestWake: d.guestWake });
  let coopWanted = (() => { try { return localStorage.getItem("tinyvalley-coop") !== "0"; } catch { return true; } })(), selfEmote = null, remote = null, view = "menu", sendT = 0, msg = "", code = "", reply = "";
  const chatLog = [];                                                                      // { text, t } shown on the canvas
  const tr = d.tr;
  const logLine = (text, color = "#fff") => { chatLog.push({ text: clean(text, 90), color, t: 9 }); if (chatLog.length > 6) chatLog.shift(); };

  const root = document.createElement("div"); root.id = "mp";
  const style = document.createElement("style"); style.textContent = CSS; document.head.append(style); document.body.append(root);
  for (const ev of ["keydown", "keyup"]) root.addEventListener(ev, e => { e.stopPropagation(); if (ev === "keydown" && e.key === "Escape") api.close(); });

  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };
  const btn = (label, fn, cls = "") => el("button", { textContent: tr(label), className: cls, onclick: fn });
  const copy = async text => { try { await navigator.clipboard.writeText(text); msg = tr("Copied!"); } catch { msg = tr("Select the text and copy it."); } render(); };

  const defaultServer = () => { try { const s = localStorage.getItem("tinyvalley-server"); if (s) return s; } catch {} return /^https?:/.test(location.protocol) ? (location.protocol === "https:" ? "wss://" : "ws://") + location.host : "ws://localhost:8080"; };
  let serverUrl = defaultServer(), roomCode = "";
  const saveServer = u => { serverUrl = u.trim(); try { localStorage.setItem("tinyvalley-server", serverUrl); } catch {} };
  async function doRelayHost(url) { saveServer(url); msg = tr("Connecting to the server…"); roomCode = ""; render(); try { roomCode = await net.relayHost(serverUrl); msg = tr("Waiting for your friend to join with this room code…"); } catch (e) { msg = tr("Could not start: ") + tr(e.message); } render(); }
  async function doRelayJoin(url, codeText) { saveServer(url); msg = tr("Connecting to the server…"); render(); try { await net.relayJoin(serverUrl, codeText.trim()); } catch (e) { msg = tr("Could not start: ") + tr(e.message); render(); } }
  const coopBox = () => { const cb = el("input", { type: "checkbox", checked: coopWanted, onchange: () => { coopWanted = cb.checked; try { localStorage.setItem("tinyvalley-coop", coopWanted ? "1" : "0"); } catch {} } }); return el("p", {}, el("label", {}, cb, document.createTextNode(" " + tr("Share my farm (co-op): your friend plays on your farm"))), el("br"), el("span", { className: "dim", textContent: tr("Money, farm, animals and the clock are shared; the day ends when both of you are in bed. Your friend's own farm is kept safe.") })); };
  async function doHost() { view = "host"; msg = tr("Creating your code…"); code = ""; render(); try { code = await net.host(); msg = tr("Send this code to your friend, then paste their reply below."); } catch (e) { msg = tr("Could not start: ") + e.message; } render(); }
  async function doJoin(text) { try { msg = tr("Creating the reply…"); render(); reply = await net.join(text); msg = tr("Send this reply code to the host. The game connects when they paste it."); } catch (e) { msg = tr("That code did not work."); } render(); }
  async function doAccept(text) { try { await net.accept(text); msg = tr("Connecting…"); } catch (e) { msg = tr("That reply did not work."); } render(); }

  function giftRow() {
    const sel = el("select"), qty = el("input", { type: "number", min: 1, value: 1 });
    for (const [id, n] of Object.entries(d.state().inv).filter(([id, n]) => n > 0 && !id.startsWith("m_")).sort()) sel.append(el("option", { value: id, textContent: `${n}x ${tr(d.itemInfo(id).name)}` }));
    const send = btn("Send gift", () => {
      const id = sel.value, n = Math.floor(num(qty.value, 1, 99)), have = d.state().inv[id] || 0;
      if (!id || have < n) { msg = tr("You don't have that many."); return render(); }
      d.state().inv[id] -= n; net.send({ t: "gift", id, n }); logLine(`${tr("You sent")} ${n}x ${tr(d.itemInfo(id).name)}`, "#ffd23f"); msg = tr("Gift sent!"); render();
    });
    return el("div", { className: "row" }, sel, qty, send);
  }

  function render() {
    root.replaceChildren(); root.append(el("h2", { textContent: tr("Multiplayer — 2 players") }));
    const status = net.status;
    if (status === "open" && remote) {
      root.append(el("p", { className: "ok", textContent: `${tr("Connected to")} ${remote.name} — ${remote.map ? tr(d.mapName(remote.map)) : ""}` }));
      if (coop.active) root.append(el("p", { className: "ok", textContent: tr(coop.role === "host" ? "Co-op: your friend is playing on your farm." : "Co-op: you are playing on your friend's farm.") }));
      const chat = el("input", { type: "text", placeholder: tr("Say something…"), maxLength: 80 });
      const go = () => { const t = clean(chat.value, 80).trim(); if (t) { net.send({ t: "chat", text: t }); logLine(`${d.state().name || tr("You")}: ${t}`, "#cfe8ff"); chat.value = ""; } };
      chat.onkeydown = e => { if (e.key === "Enter") go(); };
      root.append(el("div", { className: "row" }, chat, btn("Send", go, "main")));
      root.append(el("div", { className: "row" }, ...["👋", "♥", "!", "?", "♪"].map(e => el("button", { textContent: e, onclick: () => { net.send({ t: "emote", e }); selfEmote = { e, t: 2.5 }; } }))));
      root.append(el("p", { className: "dim", textContent: tr("Send an item to your friend:") }), giftRow());
      root.append(el("div", { className: "row" }, btn("Disconnect", () => { api.disconnect(); }, "warn"), btn("Close", () => api.close())));
      root.append(el("p", { className: "dim", textContent: tr(coop.active ? "Your own farm and save are kept safe while you play together. Press K to open this panel, Enter to chat." : "You each keep your own farm and save. Press K to open this panel, Enter to chat.") }));
      window.__mpFocusChat = () => chat.focus();
    } else if (view === "menu") {
      root.append(el("p", { textContent: tr("Play together on one farm, or just walk around the village side by side, chat and trade items.") }), coopBox());
      root.append(el("p", { className: "dim", textContent: tr("Online room (needs a Tiny Valley server — see the server folder):") }));
      root.append(el("div", { className: "row" }, btn("Create online room", () => { view = "rhost"; msg = ""; roomCode = ""; render(); }, "main"), btn("Join online room", () => { view = "rjoin"; msg = ""; render(); }, "main")));
      root.append(el("p", { className: "dim", textContent: tr("No server (peer to peer): swap two short codes.") }));
      root.append(el("div", { className: "row" }, btn("Host with codes", doHost), btn("Join with codes", () => { view = "join"; msg = ""; reply = ""; render(); }), btn("Close", () => api.close())));
    } else if (view === "rhost") {
      const url = el("input", { type: "text", value: serverUrl, placeholder: "ws://your-server:8080" });
      root.append(el("p", { textContent: tr("Server address:") }), url);
      if (roomCode) root.append(el("p", { className: "ok", textContent: tr("Room code:") + "  " + roomCode, style: "font-size:22px;letter-spacing:4px" }));
      root.append(el("div", { className: "row" }, btn("Create room", () => doRelayHost(url.value), "main"), btn("Back", () => { net.close(); view = "menu"; render(); })));
      root.append(el("p", { className: /could|not|full/i.test(msg) ? "bad" : "dim", textContent: msg }));
    } else if (view === "rjoin") {
      const url = el("input", { type: "text", value: serverUrl, placeholder: "ws://your-server:8080" }), codeIn = el("input", { type: "text", placeholder: "ABCD", maxLength: 4, style: "width:70px;text-transform:uppercase" });
      root.append(el("p", { textContent: tr("Server address:") }), url, el("p", { textContent: tr("Room code:") }), el("div", { className: "row" }, codeIn, btn("Join", () => doRelayJoin(url.value, codeIn.value), "main"), btn("Back", () => { net.close(); view = "menu"; render(); })));
      root.append(el("p", { className: /could|not|full/i.test(msg) ? "bad" : "dim", textContent: msg }));
      root.append(el("p", { className: "dim", textContent: tr("Both players need this game open. Works over the internet in most cases; very strict networks may block it.") }));
    } else if (view === "host") {
      root.append(el("p", { textContent: tr("1. Copy your code and send it to your friend.") }), el("textarea", { readOnly: true, value: code, onclick: e => e.target.select() }), btn("Copy", () => copy(code)));
      const ta = el("textarea", { placeholder: tr("2. Paste your friend's reply code here") });
      root.append(el("p", { textContent: tr("2. Paste your friend's reply code:") }), ta, el("div", { className: "row" }, btn("Connect", () => doAccept(ta.value), "main"), btn("Back", () => { net.close(); view = "menu"; render(); })));
      root.append(el("p", { className: msg.includes("not") ? "bad" : "dim", textContent: msg }));
    } else if (view === "join") {
      const ta = el("textarea", { placeholder: tr("Paste the host's code here") });
      root.append(el("p", { textContent: tr("1. Paste the host's code:") }), ta, el("div", { className: "row" }, btn("Create reply", () => doJoin(ta.value), "main"), btn("Back", () => { net.close(); view = "menu"; render(); })));
      if (reply) root.append(el("p", { textContent: tr("2. Send this reply to the host:") }), el("textarea", { readOnly: true, value: reply, onclick: e => e.target.select() }), btn("Copy", () => copy(reply)));
      root.append(el("p", { className: msg.includes("not") ? "bad" : "dim", textContent: msg }));
    }
  }

  net.onopen = () => { net.send({ t: "hi", name: d.state().name || "Farmer", look: d.state().look, coop: net.role === "host" && coopWanted }); view = "live"; msg = ""; render(); d.say("Connected!", 2.5); };
  net.onclose = () => { if (remote) d.say(tr("Your friend left the game."), 3.5); coop.stop(); remote = null; view = "menu"; render(); };
  net.onmessage = m => {
    if (!m || typeof m !== "object") return;
    if (m.t === "hi") {
      const look = cleanLook(m.look); let sprites = null; try { sprites = d.makeSprites(look); } catch {}
      remote = { dx: 0, dy: 0, dm: null, name: clean(m.name, 14) || "Friend", look, sprites, map: null, mapName: "", x: 0, y: 0, fx: 0, fy: 1, mv: false, say: null, emote: null, walk: 0 };
      logLine(`${remote.name} ${tr("joined the game.")}`, "#8f8");
      if (net.role === "guest" && m.coop) coop.start("guest"); else if (net.role === "host" && coopWanted) coop.start("host");
      render();
    } else if (!remote) return;
    else if (coop.message(m)) return;
    else if (m.t === "p") {
      remote.map = clean(m.m, 20); remote.x = num(m.x, -64, 4000); remote.y = num(m.y, -64, 4000); remote.fx = Math.sign(num(m.fx, -1, 1)); remote.fy = Math.sign(num(m.fy, -1, 1)); remote.mv = !!m.mv;
      if (remote.mapName !== remote.map) { remote.mapName = remote.map; if (view === "live") render(); }
    } else if (m.t === "chat") { const t = clean(m.text, 80); remote.say = { text: t, t: 6 }; logLine(`${remote.name}: ${t}`, "#ffe9a8"); }
    else if (m.t === "emote") { const e = clean(m.e, 2); if (e) remote.emote = { e, t: 2.5 }; }
    else if (m.t === "gift") {
      const n = Math.floor(num(m.n, 1, 99)), id = clean(m.id, 40); let info = null; try { info = d.itemInfo(id); } catch {}
      if (info?.name && id) { d.addItem(id, n); logLine(`${remote.name} ${tr("sent you")} ${n}x ${tr(info.name)}!`, "#ffd23f"); d.say(`${remote.name}: ${n}x ${tr(info.name)}`, 3.5); }
    }
  };

  const api = {
    get remote() { return remote; }, get connected() { return net.status === "open" && !!remote; }, get selfEmote() { return selfEmote; },
    open() { root.style.display = "block"; if (net.status === "idle") view = "menu"; render(); },
    close() { root.style.display = "none"; }, get isOpen() { return root.style.display === "block"; },
    toggle() { root.style.display === "block" ? api.close() : api.open(); },
    focusChat() { api.open(); setTimeout(() => window.__mpFocusChat?.(), 30); },
    disconnect() { coop.stop(); net.close(); remote = null; view = "menu"; render(); },
    get coop() { return coop; }, sleepGate: f => coop.gate(f), saveView: () => coop.saveView(),
    update(dt) {                                                                           // send our position ~10x a second, age bubbles
      coop.update(dt);
      for (const l of chatLog) l.t -= dt; while (chatLog.length && chatLog[0].t <= 0) chatLog.shift();
      if (remote) { for (const k of ["say", "emote"]) if (remote[k] && (remote[k].t -= dt) <= 0) remote[k] = null; if (remote.mv) remote.walk += dt * 8; }
      if (selfEmote && (selfEmote.t -= dt) <= 0) selfEmote = null;
      if (remote) { const k = Math.min(1, dt * 14); if (remote.dm !== remote.map || Math.hypot(remote.x - remote.dx, remote.y - remote.dy) > 80) { remote.dx = remote.x; remote.dy = remote.y; remote.dm = remote.map; } else { remote.dx += (remote.x - remote.dx) * k; remote.dy += (remote.y - remote.dy) * k; } }
      const s = d.state();
      if (!api.connected || (sendT -= dt) > 0) return; sendT = 0.1;
      net.send({ t: "p", m: s.map, x: Math.round(s.px), y: Math.round(s.py), fx: s.fx, fy: s.fy, mv: d.moving() });
    },
    drawLog(ctx, W, H) {
      ctx.font = "9px monospace"; ctx.textAlign = "left";
      chatLog.forEach((l, i) => { const y = H - 70 - (chatLog.length - 1 - i) * 11; ctx.globalAlpha = Math.min(1, l.t / 2); ctx.fillStyle = "#000"; ctx.fillText(l.text, 9, y + 1); ctx.fillStyle = l.color; ctx.fillText(l.text, 8, y); }); ctx.globalAlpha = 1;
      if (api.connected) { ctx.fillStyle = "#8f8"; ctx.fillText("● " + remote.name, 8, 12 + 24); }
    },
  };
  return api;
}
