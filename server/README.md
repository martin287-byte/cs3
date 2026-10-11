# Tiny Valley server

A small Node.js server that (1) serves the game from `../farm` and (2) relays messages between the two players of a co-op room.
It keeps no game state: the host's browser is the authority for the shared farm, the server only forwards messages.

```
cd server
npm install
npm start                # http://localhost:8080   (PORT=3000 npm start for another port)
```

Open `http://<your-machine>:8080` on both devices. In the game press **K** (or pause menu → *7. Multiplayer*):
one player picks **Create online room** and shares the 4-letter code, the other picks **Join online room** and types it.
The server address is filled in from the page address; if you host the game elsewhere (e.g. GitHub Pages) paste your
server's `ws://` / `wss://` address into the box. Use `wss://` when the game page is served over https.

Notes
- Two players per room, up to 500 rooms, 1 MB per message, rooms expire after 6 hours.
- There is no login or encryption beyond what you put in front of it (use a reverse proxy with TLS for the internet).
- `GET /healthz` returns `ok rooms=<n>`.
- Without a server the game can also connect peer to peer by swapping two text codes.
