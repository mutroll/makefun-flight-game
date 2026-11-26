// main.js — Kestrel Run entry point: the game loop, screen state machine,
// ground/crash handling, click-to-start missions and the screenshot freeze.
// One job: own the loop and wire flight, missions, rendering, HUD, input and audio.

import { createFlightState, stepFlight, clampFlightValue } from './flight.js';
import { groundHeightFt, isOverRunway, ISLAND } from './terrain.js';
import { createMissionProgress, currentTarget, stepMission, stormGustKt, missionById } from './missions.js';
import { drawWorldFrame } from './render.js';
import { drawFlightHud, drawMissionSelect, drawPaused, drawDebrief } from './hud.js';
import { createInputState, bindPilotInput, applyMouseSteer } from './input.js';
import { createSoundEngine, ensureAudio, updateEngineHum, playRingChime, playTouchdown, playCrash, playClick, setMuted } from './audio.js';
import { shotPreset, stagedScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280;
const H = 720;

const game = {
  screen: 'menu', // 'menu' | 'flying' | 'paused' | 'debrief'
  state: createFlightState(),
  progress: createMissionProgress('ring-run'),
  selectedId: 'ring-run',
  input: createInputState(),
  audio: createSoundEngine(),
  cards: [],
  frozen: false,
  lastEvent: null,
  crashTimer: 0,
};

function startMission(missionId) {
  game.progress = createMissionProgress(missionId);
  game.state = createFlightState();
  game.selectedId = missionId;
  // Each mission starts airborne on a sensible approach line.
  if (missionId === 'island-landing') {
    game.state.positionXFt = -6800;
    game.state.positionZFt = 2400;
    game.state.headingDeg = 90;
    game.state.altitudeFt = 1800;
    game.state.speedKt = 165;
    game.state.throttlePct = 55;
  } else if (missionId === 'storm-courier') {
    game.state.positionXFt = 0;
    game.state.positionZFt = 1200;
    game.state.headingDeg = 24;
    game.state.altitudeFt = 2600;
    game.state.speedKt = 195;
    game.state.throttlePct = 78;
  } else {
    game.state.positionXFt = -400;
    game.state.positionZFt = 900;
    game.state.headingDeg = 18;
    game.state.altitudeFt = 2400;
    game.state.speedKt = 185;
    game.state.throttlePct = 72;
  }
  game.screen = 'flying';
  game.crashTimer = 0;
  ensureAudio(game.audio);
  playClick(game.audio);
}

function endToDebrief() {
  game.screen = 'debrief';
}

function handleAction(action) {
  if (action === 'select1') startMission('ring-run');
  else if (action === 'select2') startMission('island-landing');
  else if (action === 'select3') startMission('storm-courier');
  else if (action === 'restart') startMission(game.selectedId);
  else if (action === 'pause') {
    if (game.screen === 'flying') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'flying';
  } else if (action === 'mute') {
    setMuted(game.audio, !game.audio.muted);
  } else if (action === 'start') {
    if (game.screen === 'menu') startMission(game.selectedId);
    else if (game.screen === 'debrief') startMission(game.selectedId);
  }
}

bindPilotInput(canvas, game.input, handleAction);

canvas.addEventListener('click', (event) => {
  ensureAudio(game.audio);
  if (game.screen !== 'menu') return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);
  for (const card of game.cards) {
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      startMission(card.id);
      return;
    }
  }
});

// Ground contact: landing on a runway (judged by the mission) or a crash in the terrain.
function handleGroundContact(dt) {
  const s = game.state;
  const groundFt = groundHeightFt(s.positionXFt, s.positionZFt);
  if (s.altitudeFt > groundFt + 2) return;
  s.altitudeFt = groundFt;
  s.onGround = true;
  const overHome = isOverRunway(ISLAND.homeRunway, s.positionXFt, s.positionZFt);
  const overFar = isOverRunway(ISLAND.farRunway, s.positionXFt, s.positionZFt);
  if (overHome || overFar) {
    // Let the mission judge the touchdown; a gentle one ends the sortie well.
    const before = game.progress.outcome;
    stepMission(game.progress, s, 0);
    if (game.progress.outcome === 'landed' || game.progress.outcome === 'complete') {
      playTouchdown(game.audio);
      s.speedKt = Math.max(0, s.speedKt - 60 * dt);
      if (s.speedKt < 5) endToDebrief();
      return;
    }
    if (game.progress.outcome === 'crashed') {
      if (before !== 'crashed') playCrash(game.audio);
      s.damagePct = 100;
      game.crashTimer += dt;
      if (game.crashTimer > 1.2) endToDebrief();
      return;
    }
    s.speedKt = Math.max(0, s.speedKt - 80 * dt);
    return;
  }
  // Terrain strike: damage spikes and the sortie is over.
  if (!game.progress.outcome) {
    s.damagePct = clampFlightValue(s.damagePct + 60 * dt, 0, 100);
    game.progress.outcome = 'crashed';
    game.progress.outcomeDetail = 'Terrain strike — the Kestrel came down in the hills.';
    playCrash(game.audio);
  }
  game.crashTimer += dt;
  if (game.crashTimer > 1.2) endToDebrief();
}

function tick(dt) {
  if (game.screen !== 'flying' || game.frozen) return;
  const s = game.state;
  applyMouseSteer(game.input);
  // Flaps and gear are toggles on key press edges, handled in the input layer's
  // boolean state: holding F/G keeps them down, which is forgiving for new pilots.
  s.flapsDown = game.input.flaps;
  s.gearDown = game.input.gear;
  const gust = stormGustKt(game.progress, performance.now() / 1000);
  const wind = game.progress.windKt + gust;
  stepFlight(s, game.input, dt, wind);
  if (s.damagePct >= 100 && !game.progress.outcome) {
    game.progress.outcome = 'crashed';
    game.progress.outcomeDetail = 'Airframe failure — too much damage to keep flying.';
    playCrash(game.audio);
  }
  const event = stepMission(game.progress, s, dt);
  if (event === 'ring-hit' || event === 'ring-complete') playRingChime(game.audio);
  if (event === 'landed') playTouchdown(game.audio);
  if (event === 'crashed' || event === 'out-of-fuel') playCrash(game.audio);
  if (event === 'ring-complete' || event === 'landed') {
    game.lastEvent = event;
    setTimeout(() => { if (game.screen === 'flying') endToDebrief(); }, 900);
  }
  if (game.progress.outcome === 'out-of-fuel' && s.altitudeFt <= 2) {
    game.crashTimer += dt;
    if (game.crashTimer > 1.2) endToDebrief();
  }
  handleGroundContact(dt);
  updateEngineHum(game.audio, s.throttlePct, s.speedKt, true);
}

function render() {
  ctx.clearRect(0, 0, W, H);
  if (game.screen === 'menu') {
    // Menu flies over a gentle establishing shot of the island.
    const backdrop = createFlightState();
    backdrop.altitudeFt = 2600;
    backdrop.speedKt = 170;
    backdrop.headingDeg = 40;
    backdrop.positionZFt = 6000;
    // Menu backdrop: scenery only, no mission rings or target, so the cards stay clean.
    drawWorldFrame(ctx, backdrop, { rings: [] }, null, W, H);
    game.cards = drawMissionSelect(ctx, W, H, game.selectedId);
    return;
  }
  const target = currentTarget(game.progress);
  drawWorldFrame(ctx, game.state, game.progress, target, W, H);
  drawFlightHud(ctx, game.state, game.progress, target, W, H, game.audio.muted);
  if (game.screen === 'paused') drawPaused(ctx, W, H);
  if (game.screen === 'debrief') drawDebrief(ctx, game.state, game.progress, W, H);
}

// Screenshot staging: freeze the sim on a chosen frame.
const preset = shotPreset();
if (preset) {
  const scene = stagedScene(preset.shot);
  game.screen = scene.screen;
  game.state = scene.state;
  game.progress = scene.progress;
  game.selectedId = scene.selectedId;
  game.frozen = true;
  document.title = 'Kestrel Run — shot: ' + preset.shot;
}

let lastNow = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
  lastNow = now;
  tick(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for the maker's own play-tests: read state, force a mission, report status.
window.__kestrel = {
  game,
  startMission,
  status() {
    return {
      screen: game.screen,
      mission: game.progress.missionId,
      altitudeFt: Math.round(game.state.altitudeFt),
      speedKt: Math.round(game.state.speedKt),
      headingDeg: Math.round(game.state.headingDeg),
      fuelPct: Math.round(game.state.fuelPct),
      outcome: game.progress.outcome,
      score: game.progress.score,
    };
  },
};
