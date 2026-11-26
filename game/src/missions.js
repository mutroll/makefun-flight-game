// missions.js — the three sorties: their goals, progress, scoring and end states.
// One job: know what "done" means for each mission and track the pilot toward it.

import { ISLAND, ringCourse, courierCourse, isOverRunway } from './terrain.js';
import { landingQuality, passedThroughRing } from './flight.js';

export const MISSIONS = [
  {
    id: 'ring-run',
    number: 1,
    name: 'RING RUN',
    shortName: 'Ring Run',
    goal: 'Fly through all 8 rings in order before your fuel runs out.',
    tip: 'Gentle banks win: hard turns bleed speed and waste fuel.',
    parSeconds: 240,
  },
  {
    id: 'island-landing',
    number: 2,
    name: 'ISLAND LANDING',
    shortName: 'Island Landing',
    goal: 'Bring the Kestrel down on Runway 09 — slow, level, gear down.',
    tip: 'Drop flaps (F) and gear (G) early; aim for the numbers, not the grass.',
    parSeconds: 180,
  },
  {
    id: 'storm-courier',
    number: 3,
    name: 'STORM COURIER',
    shortName: 'Storm Courier',
    goal: 'Thread 5 checkpoints through the storm, then land on Runway 27.',
    tip: 'Gusts shove the nose around — small corrections, steady throttle.',
    parSeconds: 300,
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

// Fresh per-mission progress: rings/checkpoints hit, timer, outcome.
export function createMissionProgress(missionId) {
  const rings = missionId === 'ring-run' ? ringCourse()
    : missionId === 'storm-courier' ? courierCourse() : [];
  return {
    missionId,
    rings,
    nextRingIndex: 0,
    ringsHit: 0,
    elapsedSeconds: 0,
    score: 0,
    outcome: null, // 'complete' | 'crashed' | 'out-of-fuel' | 'landed' | null
    outcomeDetail: '',
    windKt: missionId === 'storm-courier' ? 26 : 6,
    gustPhase: 0,
  };
}

// Current target: the next ring, or the landing runway for landing missions.
export function currentTarget(progress) {
  if (progress.missionId === 'island-landing') {
    return { kind: 'runway', runway: ISLAND.homeRunway, label: 'RUNWAY 09' };
  }
  if (progress.missionId === 'storm-courier' && progress.nextRingIndex >= progress.rings.length) {
    return { kind: 'runway', runway: ISLAND.farRunway, label: 'RUNWAY 27' };
  }
  const ring = progress.rings[progress.nextRingIndex];
  if (!ring) return { kind: 'runway', runway: ISLAND.homeRunway, label: 'RUNWAY 09' };
  return { kind: 'ring', ring, label: 'RING ' + ring.id + ' / ' + progress.rings.length };
}

// Advance mission progress one tick. Returns an event string when something happens.
export function stepMission(progress, state, dt) {
  progress.elapsedSeconds += dt;
  progress.gustPhase += dt;
  if (progress.outcome) return null;

  if (state.fuelPct <= 0 && state.altitudeFt <= 2) {
    progress.outcome = 'out-of-fuel';
    progress.outcomeDetail = 'Tanks dry — the Kestrel glided to a stop in the grass.';
    return 'out-of-fuel';
  }

  const target = currentTarget(progress);
  if (target.kind === 'ring') {
    if (passedThroughRing(state, target.ring)) {
      progress.ringsHit += 1;
      progress.nextRingIndex += 1;
      progress.score += 250 + Math.max(0, 150 - Math.round(progress.elapsedSeconds));
      if (progress.nextRingIndex >= progress.rings.length && progress.missionId === 'ring-run') {
        progress.outcome = 'complete';
        progress.outcomeDetail = 'All 8 rings threaded — a clean run, pilot.';
        return 'ring-complete';
      }
      return 'ring-hit';
    }
    return null;
  }

  // Landing missions: touchdown is judged the moment the wheels meet the ground.
  if (state.altitudeFt <= 2 && state.onGround) {
    const runway = target.runway;
    const over = isOverRunway(runway, state.positionXFt, state.positionZFt);
    const quality = landingQuality(state, over, state.verticalSpeedFpm);
    if (quality === 'landed') {
      progress.outcome = progress.missionId === 'island-landing' ? 'landed' : 'complete';
      progress.score += 1000 + Math.max(0, 400 - Math.round(progress.elapsedSeconds * 2));
      progress.outcomeDetail = 'Wheels down on the centreline — textbook landing.';
      return 'landed';
    }
    if (quality === 'too-fast') progress.outcomeDetail = 'Too fast over the threshold — the Kestrel ran off the end.';
    else if (quality === 'gear-up') progress.outcomeDetail = 'Belly landing — the gear was still up.';
    else if (quality === 'too-hard') progress.outcomeDetail = 'Slammed down too hard — the airframe gave up.';
    else if (quality === 'not-level') progress.outcomeDetail = 'Banked on touchdown — a wing caught the runway.';
    else progress.outcomeDetail = 'Missed the runway — the Kestrel came down in the grass.';
    progress.outcome = 'crashed';
    return 'crashed';
  }
  return null;
}

// Storm gusts for the courier mission: a slow sine shove plus random buffets.
export function stormGustKt(progress, nowSeconds) {
  if (progress.missionId !== 'storm-courier') return 0;
  return Math.sin(nowSeconds * 0.7) * 14 + Math.sin(nowSeconds * 2.3) * 7;
}

// A short grade line for the debrief screen.
export function missionGrade(progress) {
  if (progress.outcome === 'complete' || progress.outcome === 'landed') {
    if (progress.elapsedSeconds <= missionById(progress.missionId).parSeconds) return 'ACE PILOT';
    return 'MISSION COMPLETE';
  }
  return 'SORTIE FAILED';
}
