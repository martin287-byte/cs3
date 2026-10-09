# Tiny Platformer

A small browser platformer prototype (canvas + vanilla JS ES modules, no build step).

## Games
- `index.html` — platformer prototype
- `farm/index.html` — **Tiny Valley**, a Stardew-style farming game: a large scrolling Farm (coop, barn, silo, chickens, cows), Town, Forest and a multi-floor Mine with monsters and a sword; seasons, 9 crops, foraging, fishing, ores and tool upgrades, cooking, four villagers with schedules, gifts, dating and marriage, a travelling merchant, six festivals including dances, title screen, procedural music and pixel art. Add `?debug` to the URL for a `window.__farm` test hook.

## Run
    python3 -m http.server 8000   # then open http://localhost:8000

## Controls
Arrows / A D move · Space / W / Up jump (hold for higher) · R restart level

## Make it yours
- Levels live in `src/levels.js` as ASCII grids (`#` solid, `^` spike, `o` coin, `P` start, `G` goal).
- Physics constants are at the top of `src/main.js`.
