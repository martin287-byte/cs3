# Tiny Platformer

A small browser platformer prototype (canvas + vanilla JS ES modules, no build step).

## Games
- `index.html` — platformer prototype
- `farm/index.html` — **Tiny Valley**, a Stardew-style farming game (desktop and mobile) with autotiled terrain, layered trees, detailed houses, shaded characters and a wooden Stardew-like HUD; frost and magma mine biomes, an island reached by boat with buried treasure, eight villagers, and nine festivals; with skill perks, a world map with fast travel, and a first-day tutorial plus contextual tips. Six scrolling areas plus a greenhouse; seasons, 9 crops, sprinklers, animals, a pet and a horse, foraging, fishing, mining and combat, cooking, five skills, a quest board, six villagers with schedules, gifts, dating and marriage, festivals and a community-centre ending. Add `?debug` for a `window.__farm` test hook and `?touch=1` to force the touch controls on a desktop. It installs as a PWA (manifest + service worker).

## Run
    python3 -m http.server 8000   # then open http://localhost:8000

## Controls
Arrows / A D move · Space / W / Up jump (hold for higher) · R restart level

## Make it yours
- Levels live in `src/levels.js` as ASCII grids (`#` solid, `^` spike, `o` coin, `P` start, `G` goal).
- Physics constants are at the top of `src/main.js`.

## Mobile
Open `farm/index.html` over http(s) on a phone (landscape works best). A virtual joystick, A/E action buttons and shortcut buttons appear automatically on touch devices; menu lines and the hotbar can be tapped directly. Use "Add to Home Screen" to install it fullscreen; it also works offline after the first load.
