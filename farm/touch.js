// Touch controls: a virtual joystick and buttons that dispatch ordinary keyboard events, so the game code stays input-agnostic.
const send = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
export const dispatchKey = (key, hold = 60) => { send("keydown", key); setTimeout(() => send("keyup", key), hold); };

export function initTouch() {
  const forced = location.search.includes("touch");
  const touch = forced || matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (!touch) return false;
  document.body.classList.add("touch");

  for (const b of document.querySelectorAll("#controls [data-key]")) {
    const key = b.dataset.key;
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add("down"); send("keydown", key); });
    const up = () => { b.classList.remove("down"); send("keyup", key); };
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  }

  const stick = document.getElementById("stick"), knob = document.getElementById("knob"), held = new Set();
  let pointer = null;
  const apply = want => {
    for (const k of ["w", "a", "s", "d"]) {
      if (want.has(k) && !held.has(k)) { held.add(k); send("keydown", k); }
      else if (!want.has(k) && held.has(k)) { held.delete(k); send("keyup", k); }
    }
  };
  const move = e => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy) || 1, lim = Math.min(d, R * 0.7);
    knob.style.transform = `translate(${dx / d * lim}px, ${dy / d * lim}px)`;
    const thr = R * 0.25, want = new Set();
    if (dx > thr) want.add("d"); if (dx < -thr) want.add("a"); if (dy > thr) want.add("s"); if (dy < -thr) want.add("w");
    apply(want);
  };
  const end = () => { pointer = null; knob.style.transform = ""; apply(new Set()); };
  stick.addEventListener("pointerdown", e => { e.preventDefault(); pointer = e.pointerId; stick.setPointerCapture(e.pointerId); move(e); });
  stick.addEventListener("pointermove", e => { if (e.pointerId === pointer) move(e); });
  stick.addEventListener("pointerup", end); stick.addEventListener("pointercancel", end);
  new MutationObserver(() => { if (document.body.classList.contains("ui-open")) end(); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  document.getElementById("fs")?.addEventListener("click", () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.(); else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  });
  for (const ev of ["contextmenu", "gesturestart"]) document.addEventListener(ev, e => e.preventDefault());
  return true;
}
