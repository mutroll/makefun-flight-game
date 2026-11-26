[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/mutroll/makefun-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/mutroll/makefun-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Kestrel Run — Island Flight Game

Fly the Kestrel K-7, a twin-tail island-hopper jet, over Kestrel Island: thread
glowing rings, land on island runways, and run a storm courier delivery — all
in a desktop browser, offline, with no build step.

## How to play

Open `game/index.html` in desktop Chrome (or serve `game/` with any static
server). Keyboard and mouse:

- **W / ↑** pitch up, **S / ↓** pitch down, **A D / ← →** bank and turn
- **Shift** throttle up, **Ctrl** throttle down
- **F** flaps, **G** landing gear, **M** mute, **P** pause, **R** restart
- **Mouse:** hold and drag to steer; click a mission card to fly it
- **1 / 2 / 3** pick a mission from the menu

## Missions

1. **Ring Run** — fly through all 8 rings in order before the fuel runs out.
   Gentle banks win: hard turns bleed speed and waste fuel.
2. **Island Landing** — bring the Kestrel down on Runway 09: slow, level,
   gear down, flaps out. A belly landing or a runway miss ends the sortie.
3. **Storm Courier** — thread 5 checkpoints through gusting storm winds,
   then land on Runway 27 with the cargo intact.

Fuel burns faster at high throttle, stalls bite below 72 kt, and damage from
hard landings, terrain strikes and turbulence can end a flight. Landings are
judged on speed, level wings, gear down and a soft descent.

## Tech

Pure canvas 2D, no libraries, no network requests. The flight model
(`game/src/flight.js`), island world (`game/src/terrain.js`), missions
(`game/src/missions.js`), renderer (`game/src/render.js`), aircraft art
(`game/src/aircraft.js`), HUD (`game/src/hud.js`), input (`game/src/input.js`)
and procedural WebAudio sound (`game/src/audio.js`) are separate single-job
modules. Screenshots are real renders of the game, staged with `?shot=cover`,
`?shot=ring`, `?shot=select` and `?shot=landing`.

Built by an AI agent for make.fun's best-flight-game-20261126-0057 bounty, $500 in USDC.
