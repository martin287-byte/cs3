import { settings, onSetting } from "./settings.js";
// Touch controls: a floating joystick and buttons that dispatch ordinary keyboard events, so the game code stays input-agnostic.
const send = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
export const dispatchKey = (key, hold = 60) => { send("keydown", key); setTimeout(() => send("keyup", key), hold); };
export const stick = { x: 0, y: 0 };                                                // analog movement vector read by the game loop
const buzz = ms => { try { if (settings().haptics) navigator.vibrate?.(ms); } catch {} };

export function initTouch() {
  const forced = location.search.includes("touch");
  const touch = forced || matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (!touch) return false;
  const body = document.body; body.classList.add("touch");
  const scale = () => document.documentElement.style.setProperty("--cs", settings().ctrl);
  scale(); onSetting(k => { if (k === "ctrl") scale(); });

  for (const b of document.querySelectorAll("#controls [data-key]")) {
    const key = b.dataset.key, extra = !!b.closest("#extras");
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add("down"); buzz(8); send("keydown", key); });
    const up = () => { b.classList.remove("down"); send("keyup", key); if (extra) body.classList.remove("more-open"); };
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  }
  document.getElementById("gear")?.addEventListener("click", () => { buzz(8); dispatchKey("o"); });
  document.getElementById("more")?.addEventListener("click", () => { buzz(8); body.classList.toggle("more-open"); });

  // Floating analog stick: it appears under the thumb anywhere in the left zone, follows the thumb when dragged
  // past its edge (so it never "runs out"), and reports a vector (length 0..1) instead of fixed WASD presses.
  const zone = document.getElementById("zone"), stickEl = document.getElementById("stick"), knob = document.getElementById("knob");
  let pointer = null, cx = 0, cy = 0;
  const DEAD = 0.14, CURVE = 1.3;                                                   // small deadzone; gentle curve for fine control near the centre
  const place = () => {
    const R = stickEl.offsetWidth / 2;
    cx = Math.max(R, Math.min(innerWidth - R, cx)); cy = Math.max(R, Math.min(innerHeight - R, cy));
    stickEl.style.left = `${cx - R}px`; stickEl.style.top = `${cy - R}px`; stickEl.style.bottom = "auto";
  };
  const move = e => {
    const R = stickEl.offsetWidth / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
    if (d > R) { const k = (d - R) / d; cx += dx * k; cy += dy * k; place(); dx = e.clientX - cx; dy = e.clientY - cy; d = Math.hypot(dx, dy); }
    const lim = Math.min(d, R * 0.75);
    knob.style.transform = d ? `translate(${dx / d * lim}px, ${dy / d * lim}px)` : "";
    let m = Math.min(1, d / (R * 0.85));
    m = m < DEAD ? 0 : Math.pow((m - DEAD) / (1 - DEAD), CURVE);
    stick.x = d ? dx / d * m : 0; stick.y = d ? dy / d * m : 0;
  };
  const end = () => {
    pointer = null; knob.style.transform = ""; stick.x = stick.y = 0;
    stickEl.classList.remove("on"); stickEl.style.left = stickEl.style.top = stickEl.style.bottom = "";
  };
  zone.addEventListener("pointerdown", e => {
    e.preventDefault(); body.classList.remove("more-open");
    pointer = e.pointerId; zone.setPointerCapture(e.pointerId);
    cx = e.clientX; cy = e.clientY; place(); stickEl.classList.add("on");
    move(e);
  });
  zone.addEventListener("pointermove", e => { if (e.pointerId === pointer) move(e); });
  zone.addEventListener("pointerup", end); zone.addEventListener("pointercancel", end);
  new MutationObserver(() => {
    if (!body.classList.contains("ui-open") && !body.classList.contains("scene-title")) return;
    end(); if (body.classList.contains("more-open")) body.classList.remove("more-open");   // guarded: rewriting the class would re-trigger this observer forever
  }).observe(body, { attributes: true, attributeFilter: ["class"] });

  document.getElementById("fs")?.addEventListener("click", () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.(); else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  });
  for (const ev of ["contextmenu", "gesturestart"]) document.addEventListener(ev, e => e.preventDefault());

  // Keep the screen awake while playing (needs a user gesture; re-acquired after the tab returns).
  let lock = null;
  const wake = async () => { try { if (!lock && document.visibilityState === "visible") { lock = await navigator.wakeLock?.request("screen"); lock?.addEventListener("release", () => { lock = null; }); } } catch {} };
  addEventListener("pointerdown", wake, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wake(); else end(); });
  return true;
}
