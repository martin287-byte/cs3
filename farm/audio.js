// Sound effects and a small procedural background-music generator (WebAudio, no assets).
let ctx, master, muted = false, timer = null, step = 0, mood = null, seed = 1;
try { muted = localStorage.getItem("tinyvalley-muted") === "1"; } catch {}

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("tinyvalley-muted", muted ? "1" : "0"); } catch {}
  if (master) master.gain.value = muted ? 0 : 1;
}

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, delay = 0) {
  const c = ac(), t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

export function beep(f = 440, d = 0.08, type = "square", vol = 0.04) {
  try { tone(f, d, type, vol); } catch {}
}

const SCALES = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };
const MOODS = {
  title:  { root: 261.63, scale: "major", prog: [0, -3, -7, -5], bpm: 84, lead: "triangle" },
  spring: { root: 261.63, scale: "major", prog: [0, -3, -7, -5], bpm: 96, lead: "triangle" },
  summer: { root: 293.66, scale: "major", prog: [0, -5, -3, -7], bpm: 108, lead: "sine" },
  fall:   { root: 220.0,  scale: "minor", prog: [0, -4, -2, -5], bpm: 80, lead: "triangle" },
  winter: { root: 233.08, scale: "minor", prog: [0, -2, -4, -7], bpm: 66, lead: "sine" },
  mine:   { root: 196.0,  scale: "minor", prog: [0, -2, -5, -4], bpm: 58, lead: "sine" },
  beach:  { root: 329.63, scale: "major", prog: [0, -5, -3, -7], bpm: 92, lead: "sine" },
  desert: { root: 246.94, scale: "minor", prog: [0, -2, -5, -4], bpm: 70, lead: "triangle" },
};
const hz = (root, semis) => root * 2 ** (semis / 12);
const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

function tick() {
  const m = MOODS[mood]; if (!m) return;
  const s = step % 32, chord = m.prog[Math.floor(s / 8)], inBar = s % 8;
  const sc = SCALES[m.scale];
  if (inBar === 0) tone(hz(m.root, chord - 12), 1.4, "triangle", 0.09);
  if (inBar === 4) tone(hz(m.root, chord - 5), 0.8, "triangle", 0.05);
  if (rnd() < (inBar % 2 === 0 ? 0.55 : 0.25)) {
    const deg = sc[Math.floor(rnd() * sc.length)] + (rnd() < 0.3 ? 12 : 0);
    tone(hz(m.root, chord + deg), 0.55, m.lead, 0.045);
  }
  step++;
}

export function startMusic(name) {
  if (!MOODS[name] || mood === name) return;
  try { ac(); } catch { return; }
  stopMusic(); mood = name; step = 0; seed = 7;
  timer = setInterval(tick, 30000 / MOODS[name].bpm);                            // eighth notes
}
export function stopMusic() { if (timer) clearInterval(timer); timer = null; mood = null; }
export function setPaused(p) { try { if (!ctx) return; if (p) ctx.suspend(); else if (!muted) ctx.resume(); } catch {} }
