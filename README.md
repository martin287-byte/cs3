# Tiny Platformer

A small browser platformer prototype (canvas + vanilla JS ES modules, no build step).

## Games
- `index.html` — platformer prototype
- `farm/index.html` — Stardew-style farming prototype

## Run
    python3 -m http.server 8000   # then open http://localhost:8000

## Controls
Arrows / A D move · Space / W / Up jump (hold for higher) · R restart level

## Make it yours
- Levels live in `src/levels.js` as ASCII grids (`#` solid, `^` spike, `o` coin, `P` start, `G` goal).
- Physics constants are at the top of `src/main.js`.
