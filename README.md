# Saigon Sizzle

A Vietnamese street-food kitchen rush, played in the browser with mouse and keyboard. You run a night-market stall for one 150-second day: order tickets land on the board, and you build each dish step by step — blanching beef in the pot, grilling pork on the fire, ladling broth — before the customer's patience runs out.

![Competition badge](https://make.fun/badge/best-cooking-game-20261125-0137.svg)
![Rank badge](https://make.fun/badge/best-cooking-game-20261125-0137/laviemphaikhong-dot/saigon-sizzle/rank.svg)
![Reward badge](https://make.fun/badge/best-cooking-game-20261125-0137/laviemphaikhong-dot/saigon-sizzle/reward.svg)

Entered in the make.fun bounty [Make the best cooking game](https://make.fun/bounty/best-cooking-game-20261125-0137).

## The menu

- **Phở Bò** ($18) — rice noodles, beef blanched in the pot, broth, herbs
- **Bánh Mì** ($12) — baguette, pâté, grilled pork, pickles
- **Gỏi Cuốn** ($14) — rice paper, shrimp boiled in the pot, herbs, sauce
- **Cơm Tấm** ($16) — broken rice, grilled pork, fried egg, sauce
- **Cà Phê Sữa Đá** ($8) — phin coffee, condensed milk, crushed ice

## How to play

1. Click an order ticket on the board (the first one is picked for you).
2. Build its dish in recipe order: click ingredient bins on the counter. The checklist under the plate shows the steps and ticks them off.
3. Pork and egg must cook on the **grill**; beef and shrimp in the **pot**. Click a raw bin to start it cooking, then click the station slot when it dings — leave it too long and it burns. Cooked items you don't need yet wait on the pass.
4. Click **SERVE** (or press Space) to hand over a finished plate: you earn the price plus a tip scaled by the customer's remaining patience, and a bonus for a serving streak.
5. A wrong ingredient shakes the plate and costs 2 seconds. Customers who wait too long leave angry and end your combo. Midday brings a rush hour — tickets arrive faster.
6. When the day ends you get a one-to-three-star grade on money earned, dishes served, customers lost and your best combo.

## Controls

- **Mouse** — everything: tickets, bins, stations, the pass, buttons
- **Space** — serve the finished plate
- **T** — trash the current plate and start the dish over
- **P** — pause · **M** — mute · **Enter** — start / play again

## Running it

The game is plain static files under `game/` — serve that folder with any static file server and open `index.html` in a desktop browser. No build step, no network, no assets: every picture is drawn with canvas shapes and every sound is synthesized with WebAudio.

Deterministic screenshot scenes of the game itself are staged with URL parameters, e.g. `?shot=cover&seed=7`, `?shot=assembly&seed=7`, `?shot=serve&seed=7`, `?shot=end&seed=7` (see `shots.json`).

## Handing it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `buildDossier` from `vendor/makefun-game.ts`, as the competition kit prescribes. `serve.ts` runs the game locally on http://localhost:8080.

## License

MIT — see `LICENSE`.
