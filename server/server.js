// Tiny Valley server: serves the game files and relays messages between the two players of a room.
//   npm install && npm start            (PORT=8080 by default, serves ../farm)
// Protocol (JSON text frames). Control messages are prefixed "srv:"; everything else is forwarded to the other player untouched.
//   client -> {t:"srv:host"}            server -> {t:"srv:hosted", code}
//   client -> {t:"srv:join", code}      server -> {t:"srv:joined"} (guest) and {t:"srv:peer"} (host)
//   server -> {t:"srv:error", msg}  /  {t:"srv:peerleft"}
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(process.env.WEB_ROOT || path.join(here, "..", "farm"));
const PORT = Number(process.env.PORT || 8080);
const MAX_MSG = 1024 * 1024, MAX_ROOMS = 500, ROOM_TTL = 6 * 3600 * 1000, RATE = 400;      // bytes, rooms, ms, messages/second per player
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end(`ok rooms=${rooms.size}\n`); }
  let rel = decodeURIComponent(url.pathname); if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(WEB_ROOT, "." + rel);
  if (!file.startsWith(WEB_ROOT + path.sep) && file !== WEB_ROOT) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" }); res.end(data);
  });
});

const rooms = new Map();                                                                  // code -> { host, guest, made }
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => { for (let i = 0; i < 50; i++) { let c = ""; for (let k = 0; k < 4; k++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; if (!rooms.has(c)) return c; } return null; };
const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });
wss.on("connection", ws => {
  ws.isAlive = true; ws.room = null; ws.role = null; ws.count = 0;
  ws.on("pong", () => { ws.isAlive = true; });
  const rate = setInterval(() => { ws.count = 0; }, 1000);
  ws.on("message", (data, isBinary) => {
    if (isBinary || ++ws.count > RATE) return;
    const text = data.toString();
    if (ws.room) {                                                                         // paired: forward untouched
      const r = rooms.get(ws.room); const other = r && (ws.role === "host" ? r.guest : r.host);
      if (other && other.readyState === 1) other.send(text);
      return;
    }
    let m; try { m = JSON.parse(text); } catch { return; }
    if (m.t === "srv:host") {
      if (rooms.size >= MAX_ROOMS) return send(ws, { t: "srv:error", msg: "Server is full, try again later." });
      const code = newCode(); if (!code) return send(ws, { t: "srv:error", msg: "No free room codes." });
      rooms.set(code, { host: ws, guest: null, made: Date.now() }); ws.room = code; ws.role = "host"; send(ws, { t: "srv:hosted", code });
    } else if (m.t === "srv:join") {
      const code = String(m.code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), r = rooms.get(code);
      if (!r) return send(ws, { t: "srv:error", msg: "No room with that code." });
      if (r.guest) return send(ws, { t: "srv:error", msg: "That room is already full." });
      r.guest = ws; ws.room = code; ws.role = "guest"; send(ws, { t: "srv:joined" }); send(r.host, { t: "srv:peer" });
    }
  });
  ws.on("close", () => {
    clearInterval(rate);
    const r = ws.room && rooms.get(ws.room); if (!r) return;
    const other = ws.role === "host" ? r.guest : r.host;
    send(other, { t: "srv:peerleft" }); if (other) other.close();
    rooms.delete(ws.room);
  });
});
setInterval(() => {                                                                         // drop dead connections and stale rooms
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  for (const [c, r] of rooms) if (Date.now() - r.made > ROOM_TTL) { r.host?.close(); r.guest?.close(); rooms.delete(c); }
}, 25000).unref();

server.listen(PORT, () => console.log(`Tiny Valley on http://localhost:${PORT}  (serving ${WEB_ROOT})`));
