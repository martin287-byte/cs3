import { LEVELS, TILE } from "./levels.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const keys = new Set();
addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === "r") loadLevel(levelIndex);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
const left = () => keys.has("arrowleft") || keys.has("a");
const right = () => keys.has("arrowright") || keys.has("d");
const jumpKey = () => keys.has(" ") || keys.has("arrowup") || keys.has("w");

const GRAVITY = 900, MAX_FALL = 420, RUN = 110, JUMP = 300;
const COYOTE = 0.1, BUFFER = 0.12;

let levelIndex = 0, grid, cols, rows, player, coins, goal, score = 0, deaths = 0, state = "play";

function loadLevel(i) {
  levelIndex = i;
  const rowsData = LEVELS[i];
  rows = rowsData.length; cols = rowsData[0].length;
  grid = []; coins = []; goal = null;
  for (let y = 0; y < rows; y++) {
    grid.push([]);
    for (let x = 0; x < cols; x++) {
      const c = rowsData[y][x] ?? ".";
      grid[y].push(c === "#" || c === "^" ? c : ".");
      if (c === "o") coins.push({ x: x * TILE + 8, y: y * TILE + 8, got: false });
      if (c === "G") goal = { x: x * TILE, y: y * TILE };
      if (c === "P") player = { x: x * TILE + 2, y: y * TILE, w: 12, h: 14, vx: 0, vy: 0, ground: 0, buf: 0, face: 1 };
    }
  }
  state = "play";
}

const solidAt = (tx, ty) => tx < 0 || tx >= cols ? true : ty < 0 ? false : ty >= rows ? false : grid[ty][tx] === "#";

function moveAxis(p, dx, dy) {
  p.x += dx; p.y += dy;
  const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + p.w - 0.01) / TILE);
  const y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + p.h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidAt(tx, ty)) continue;
    if (dx > 0) p.x = tx * TILE - p.w, p.vx = 0;
    else if (dx < 0) p.x = (tx + 1) * TILE, p.vx = 0;
    else if (dy > 0) p.y = ty * TILE - p.h, p.vy = 0, p.ground = COYOTE;
    else if (dy < 0) p.y = (ty + 1) * TILE, p.vy = 0;
    return;
  }
}

function hits(p, tx, ty) {
  return p.x < (tx + 1) * TILE - 3 && p.x + p.w > tx * TILE + 3 && p.y < (ty + 1) * TILE && p.y + p.h > ty * TILE + 6;
}

function die() { deaths++; loadLevel(levelIndex); }

function update(dt) {
  if (state !== "play") {
    if (state === "win" && jumpKey()) { score = 0; deaths = 0; loadLevel(0); keys.delete(" "); }
    return;
  }
  const p = player;
  const dir = (right() ? 1 : 0) - (left() ? 1 : 0);
  if (dir) p.face = dir;
  p.vx = dir * RUN;
  p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
  p.ground = Math.max(0, p.ground - dt);
  if (jumpKey()) { if (!p.held) p.buf = BUFFER; p.held = true; } else { p.held = false; }
  p.buf = Math.max(0, p.buf - dt);
  if (p.buf > 0 && p.ground > 0) { p.vy = -JUMP; p.ground = 0; p.buf = 0; }
  if (!jumpKey() && p.vy < -120) p.vy = -120; // variable jump height

  moveAxis(p, p.vx * dt, 0);
  moveAxis(p, 0, p.vy * dt);

  if (p.y > rows * TILE + 64) return die();
  const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + p.w) / TILE);
  const y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + p.h) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++)
    if (grid[ty]?.[tx] === "^" && hits(p, tx, ty)) return die();

  for (const c of coins) if (!c.got && Math.abs(c.x - (p.x + 6)) < 9 && Math.abs(c.y - (p.y + 7)) < 10) { c.got = true; score++; }
  if (goal && Math.abs(goal.x - p.x) < 12 && Math.abs(goal.y - p.y) < 16) {
    if (levelIndex + 1 < LEVELS.length) loadLevel(levelIndex + 1); else state = "win";
  }
}

function draw(t) {
  ctx.fillStyle = "#1d1b2e"; ctx.fillRect(0, 0, W, H);
  const camX = Math.max(0, Math.min(cols * TILE - W, player.x - W / 2));
  const camY = Math.max(0, Math.min(rows * TILE - H, player.y - H / 2 + 20));
  ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));

  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const c = grid[y][x];
    if (c === "#") { ctx.fillStyle = "#4b3f72"; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); ctx.fillStyle = "#6a5a9e"; ctx.fillRect(x * TILE, y * TILE, TILE, 3); }
    else if (c === "^") {
      ctx.fillStyle = "#e0405a"; ctx.beginPath();
      ctx.moveTo(x * TILE, (y + 1) * TILE); ctx.lineTo(x * TILE + 8, y * TILE + 4); ctx.lineTo((x + 1) * TILE, (y + 1) * TILE); ctx.fill();
    }
  }
  for (const c of coins) if (!c.got) {
    const w = Math.abs(Math.sin(t / 250 + c.x)) * 4 + 2;
    ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, 5, 0, 0, 7); ctx.fill();
  }
  if (goal) {
    ctx.fillStyle = "#ccc"; ctx.fillRect(goal.x + 6, goal.y - 8, 2, 24);
    ctx.fillStyle = "#3ddc97"; ctx.fillRect(goal.x + 8, goal.y - 8, 10, 7);
  }
  const p = player;
  ctx.fillStyle = "#ff7b54"; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
  ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(p.x) + (p.face > 0 ? 7 : 2), Math.round(p.y) + 3, 3, 3);
  ctx.restore();

  ctx.fillStyle = "#fff"; ctx.font = "10px monospace";
  ctx.fillText(`Level ${levelIndex + 1}/${LEVELS.length}   Coins ${score}   Deaths ${deaths}`, 8, 14);
  if (state === "win") {
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffd23f"; ctx.font = "20px monospace"; ctx.textAlign = "center";
    ctx.fillText("You win!", W / 2, H / 2 - 8);
    ctx.fillStyle = "#fff"; ctx.font = "10px monospace";
    ctx.fillText(`Coins ${score} · Deaths ${deaths} · Space to play again`, W / 2, H / 2 + 12);
    ctx.textAlign = "left";
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  update(dt); draw(now);
  requestAnimationFrame(frame);
}
loadLevel(0);
requestAnimationFrame(frame);
