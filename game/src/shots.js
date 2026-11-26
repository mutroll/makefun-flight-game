// shots.js — screenshot staging: deterministic frozen frames for the maker's
// screenshots. One job: read ?shot= from the URL and preset a readable scene.
// These are real renders of the game's own code — the sim is simply started at a
// chosen moment and paused, exactly as a pilot would pause mid-flight.

import { createFlightState } from './flight.js';
import { createMissionProgress } from './missions.js';

export const SHOT_NAMES = ['cover', 'ring', 'select', 'landing'];

// Returns null for normal play, or a staging preset for a screenshot.
export function shotPreset() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot || !SHOT_NAMES.includes(shot)) return null;
  return { shot };
}

// Build the flight state + mission progress for a staged shot.
export function stagedScene(shot) {
  if (shot === 'select') {
    return { screen: 'menu', state: createFlightState(), progress: createMissionProgress('ring-run'), selectedId: 'ring-run' };
  }
  if (shot === 'cover') {
    const state = createFlightState();
    state.altitudeFt = 1400;
    state.speedKt = 188;
    state.headingDeg = 90;
    state.pitchDeg = 1;
    state.bankDeg = 4;
    state.throttlePct = 74;
    // On the Runway 09 centreline, flying east down the strip: the runway
    // stretches ahead below, and ring 1 sits ahead-left in the same frame.
    state.positionXFt = -4200;
    state.positionZFt = 2000;
    state.verticalSpeedFpm = 120;
    state.fuelPct = 82;
    const progress = createMissionProgress('ring-run');
    progress.elapsedSeconds = 47;
    progress.score = 250;
    return { screen: 'flying', state, progress, selectedId: 'ring-run' };
  }
  if (shot === 'ring') {
    const state = createFlightState();
    state.altitudeFt = 2950;
    state.speedKt = 205;
    state.headingDeg = 334;
    state.pitchDeg = 2;
    state.bankDeg = 18;
    state.throttlePct = 86;
    // Just short of ring 4, banked into the turn toward it.
    state.positionXFt = 200;
    state.positionZFt = 10800;
    state.verticalSpeedFpm = 260;
    state.fuelPct = 64;
    const progress = createMissionProgress('ring-run');
    progress.nextRingIndex = 3;
    progress.ringsHit = 3;
    progress.elapsedSeconds = 132;
    progress.score = 830;
    return { screen: 'flying', state, progress, selectedId: 'ring-run' };
  }
  // landing: short final for Runway 09, gear down, flaps down.
  const state = createFlightState();
  state.altitudeFt = 320;
  state.speedKt = 128;
  state.headingDeg = 90;
  state.pitchDeg = -3;
  state.bankDeg = 0;
  state.throttlePct = 38;
  state.positionXFt = -3600;
  state.positionZFt = 2400;
  state.verticalSpeedFpm = -420;
  state.fuelPct = 41;
  state.flapsDown = true;
  state.gearDown = true;
  const progress = createMissionProgress('island-landing');
  progress.elapsedSeconds = 96;
  progress.score = 0;
  return { screen: 'flying', state, progress, selectedId: 'island-landing' };
}
