import { settings, onSetting } from "./settings.js";
// Touch controls: a floating joystick and buttons that dispatch ordinary keyboard events, so the game code stays input-agnostic.
const send = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
export const dispatchKey = (key, hold = 60) => { send("keydown", key); setTimeout(() => send("keyup", key), hold); };
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

  // Floating stick: it appears under the thumb anywhere in the left zone and returns home when released.
  const zone = document.getElementById("zone"), stick = document.getElementById("stick"), knob = document.getElementById("knob"), held = new Set();
  let pointer = null, cx = 0, cy = 0;
  const apply = want => {
    for (const k of ["w", "a", "s", "d"]) {
      if (want.has(k) && !held.has(k)) { held.add(k); send("keydown", k); }
      else if (!want.has(k) && held.has(k)) { held.delete(k); send("keyup", k); }
    }
  };
  const move = e => {
    const R = stick.offsetWidth / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy) || 1, lim = Math.min(d, R * 0.7);
    knob.style.transform = `translate(${dx / d * lim}px, ${dy / d * lim}px)`;
    const thr = R * 0.22, want = new Set();
    if (dx > thr) want.add("d"); if (dx < -thr) want.add("a"); if (dy > thr) want.add("s"); if (dy < -thr) want.add("w");
    apply(want);
  };
  const end = () => {
    pointer = null; knob.style.transform = ""; apply(new Set());
    stick.classList.remove("on"); stick.style.left = stick.style.top = stick.style.bottom = "";
  };
  zone.addEventListener("pointerdown", e => {
    e.preventDefault(); body.classList.remove("more-open");
    pointer = e.pointerId; zone.setPointerCapture(e.pointerId);
    const R = stick.offsetWidth / 2;
    cx = Math.max(R, Math.min(innerWidth - R, e.clientX)); cy = Math.max(R, Math.min(innerHeight - R, e.clientY));
    stick.style.left = `${cx - R}px`; stick.style.top = `${cy - R}px`; stick.style.bottom = "auto"; stick.classList.add("on");
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
