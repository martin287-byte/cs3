# Tiny Platformer

A small browser platformer prototype (canvas + vanilla JS ES modules, no build step).

## Games
- `index.html` — platformer prototype
- `farm/index.html` — **Tiny Valley**, a Stardew-style farming game (desktop and mobile) with autotiled terrain, layered trees, detailed houses, shaded characters and a wooden Stardew-like HUD; frost and magma mine biomes, an island reached by boat with buried treasure, eight villagers, and nine festivals; with skill perks, a world map with fast travel, and a first-day tutorial plus contextual tips. Six scrolling areas plus a greenhouse; seasons, 9 crops, sprinklers, animals, a pet and a horse, foraging, fishing, mining and combat, cooking, five skills, a quest board, six villagers with schedules, gifts, dating and marriage, festivals and a community-centre ending. New games start with a character builder (name, skin, hair style and colour, eyes, shirt, pants, facial hair, random button, on-screen keyboard for the name) and you can change your look any time at the farmhouse wardrobe. Villagers greet you by name (first chat of the day, tone depends on friendship) and the ending congratulates you by name. Then comes a short story intro (skippable with Esc or the Skip button). The touch joystick is analog: it appears under your thumb, speed follows how far you push, and it follows your thumb past its edge. Day and night, weather and seasons have extra visual polish (swaying grass and trees, glinting water, lit windows at night, dust and tool particles). Available in English and Hungarian (magyar): open Settings with the ⚙ button, the `O` key, the title menu or the pause menu (language, music, sound effects, tutorial hints, touch-control size, vibration); a Hungarian browser is detected automatically. Add `?debug` for a `window.__farm` test hook and `?touch=1` to force the touch controls on a desktop. It installs as a PWA (manifest + service worker).

## Run
    python3 -m http.server 8000   # then open http://localhost:8000

## Controls
Arrows / A D move · Space / W / Up jump (hold for higher) · R restart level

## Make it yours
- Levels live in `src/levels.js` as ASCII grids (`#` solid, `^` spike, `o` coin, `P` start, `G` goal).
- Physics constants are at the top of `src/main.js`.

## Mobile
Open `farm/index.html` over http(s) on a phone (landscape works best). Touch anywhere on the left side of the screen to get a floating joystick under your thumb; A/E are the action buttons and the ☰ button opens the shortcut grid (inventory, quests, seeds, menu, map, ride, place, music). In portrait the shortcuts are always shown. On a phone held upright the game is rotated 90° by default so it fills the screen (tilt the phone sideways; works with rotation lock on): the ⟳ button cycles upright / rotated right / rotated left, also in Settings. The ⚙ button next to fullscreen opens Settings (control size, vibration, language). Menu lines and the hotbar can be tapped directly, buttons give a small vibration on Android, the screen stays awake while you play, and the game autosaves and pauses its music when you switch away. Use "Add to Home Screen" to install it fullscreen; it also works offline after the first load.

## Hosting
`.github/workflows/pages.yml` publishes the `farm/` folder to GitHub Pages on every push. One-time setup: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. The game is then served at `https://<user>.github.io/<repo>/`, installable as a home-screen app on phones.
