// Screen rotation for phones held upright: the whole page is turned 90° so the 16:9 game fills the screen
// (tilt the phone sideways to play). Works even when the OS rotation lock is on.
import { settings, setSetting, onSetting } from "./settings.js";

export const view = { rot: 0 };                                                       // 0, 90 (clockwise) or -90 (counter-clockwise)
const root = document.documentElement;

export function applyView() {
  const w = innerWidth, h = innerHeight, mode = settings().screen, body = document.body;
  const rot = body.classList.contains("touch") && h > w && mode !== "normal" ? (mode === "ccw" ? -90 : 90) : 0;
  view.rot = rot;
  const lw = rot ? h : w, lh = rot ? w : h;                                            // size of the (possibly rotated) layout frame
  const set = (k, v) => root.style.setProperty(k, `${v}px`);
  set("--vw", lw / 100); set("--vh", lh / 100); set("--lw", lw); set("--lh", lh); set("--sw", w); set("--sh", h);
  body.classList.toggle("rot-cw", rot === 90); body.classList.toggle("rot-ccw", rot === -90);
  body.classList.toggle("land", lw >= lh); body.classList.toggle("port", lw < lh);
}

// Screen (client) coordinates -> coordinates inside the rotated layout frame.
export function toLocal(cx, cy) {
  if (view.rot === 90) return { x: cy, y: innerWidth - cx };
  if (view.rot === -90) return { x: innerHeight - cy, y: cx };
  return { x: cx, y: cy };
}
export const localSize = () => (view.rot ? { w: innerHeight, h: innerWidth } : { w: innerWidth, h: innerHeight });

// Pointer position on a canvas in its own logical pixels (W x H), whatever the rotation.
export function canvasPoint(e, canvas, W, H) {
  const r = canvas.getBoundingClientRect();
  if (view.rot === 90) return { x: (e.clientY - r.top) * W / r.height, y: (r.right - e.clientX) * H / r.width };
  if (view.rot === -90) return { x: (r.bottom - e.clientY) * W / r.height, y: (e.clientX - r.left) * H / r.width };
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}

export function initView() {
  applyView();
  addEventListener("resize", applyView); addEventListener("orientationchange", () => setTimeout(applyView, 120));
  onSetting(k => { if (k === "screen") applyView(); });
  document.getElementById("rot")?.addEventListener("click", () => {                  // one-tap cycle: normal -> clockwise -> counter-clockwise
    const order = ["normal", "cw", "ccw"]; setSetting("screen", order[(order.indexOf(settings().screen) + 1) % 3]);
  });
}
