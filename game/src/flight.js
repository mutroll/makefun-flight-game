// flight.js — the flight model: throttle, pitch, bank, lift, stall, fuel and damage.
// One job: turn pilot inputs into a believable aircraft state each tick.
// Units: speed in knots, altitude in feet, heading in degrees, distances in feet.

export function createFlightState() {
  return {
    altitudeFt: 2400,
    speedKt: 185,
    headingDeg: 42,
    pitchDeg: 0,
    bankDeg: 0,
    throttlePct: 72,
    positionXFt: 0,
    positionZFt: 0,
    verticalSpeedFpm: 0,
    fuelPct: 100,
    damagePct: 0,
    flapsDown: false,
    gearDown: false,
    stalled: false,
    onGround: false,
  };
}

// Clamp a number into [lo, hi].
export function clampFlightValue(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

// Advance the flight state by dt seconds using the pilot's current inputs.
// inputs: { pitchUp, pitchDown, bankLeft, bankRight, throttleUp, throttleDown,
//           flaps, gear } — all booleans. windKt is a crosswind in knots.
export function stepFlight(state, inputs, dt, windKt) {
  const s = state;
  if (inputs.throttleUp) s.throttlePct = clampFlightValue(s.throttlePct + 26 * dt, 0, 100);
  if (inputs.throttleDown) s.throttlePct = clampFlightValue(s.throttlePct - 34 * dt, 0, 100);

  // Target speed follows the throttle; flaps and gear add drag.
  let targetSpeed = 42 + s.throttlePct * 2.55;
  if (s.flapsDown) targetSpeed -= 28;
  if (s.gearDown) targetSpeed -= 14;
  s.speedKt += (targetSpeed - s.speedKt) * Math.min(1, 0.55 * dt);

  // Pitch: nose up climbs, nose down dives. Authority fades at very low speed.
  const authority = clampFlightValue(s.speedKt / 120, 0.25, 1);
  if (inputs.pitchUp) s.pitchDeg = clampFlightValue(s.pitchDeg + 16 * authority * dt, -6, 14);
  if (inputs.pitchDown) s.pitchDeg = clampFlightValue(s.pitchDeg - 20 * authority * dt, -16, 14);
  if (!inputs.pitchUp && !inputs.pitchDown) s.pitchDeg *= Math.max(0, 1 - 0.9 * dt);

  // Bank rolls the aircraft and turns the heading; steep banks bleed speed.
  if (inputs.bankLeft) s.bankDeg = clampFlightValue(s.bankDeg - 55 * dt, -52, 52);
  if (inputs.bankRight) s.bankDeg = clampFlightValue(s.bankDeg + 55 * dt, -52, 52);
  if (!inputs.bankLeft && !inputs.bankRight) s.bankDeg *= Math.max(0, 1 - 1.6 * dt);
  const turnRate = -s.bankDeg * 0.42 * (s.speedKt / 180);
  s.headingDeg = (s.headingDeg + turnRate * dt + 360) % 360;
  if (Math.abs(s.bankDeg) > 38) s.speedKt -= 9 * dt;

  // Stall: below 72 kt the wing stops flying and the nose drops.
  s.stalled = s.speedKt < 72 && s.altitudeFt > 0;
  if (s.stalled) {
    s.pitchDeg = clampFlightValue(s.pitchDeg - 10 * dt, -16, 14);
    s.damagePct = clampFlightValue(s.damagePct + 0.4 * dt, 0, 100);
  }

  // Vertical speed from pitch and speed; climb costs speed, diving gains it.
  const climbFpm = Math.sin((s.pitchDeg * Math.PI) / 180) * s.speedKt * 101;
  s.verticalSpeedFpm = climbFpm;
  s.altitudeFt += climbFpm * (dt / 60);
  if (s.pitchDeg > 4) s.speedKt -= s.pitchDeg * 0.55 * dt;
  if (s.pitchDeg < -6) s.speedKt += 6 * dt;

  // Move over the ground along the heading, pushed sideways by the wind.
  const headingRad = (s.headingDeg * Math.PI) / 180;
  const groundSpeedFps = s.speedKt * 1.68781;
  s.positionXFt += Math.sin(headingRad) * groundSpeedFps * dt;
  s.positionZFt += Math.cos(headingRad) * groundSpeedFps * dt;
  s.positionXFt += windKt * 1.68781 * dt * 0.4;

  // Fuel burns faster at high throttle; empty tanks mean a glider.
  s.fuelPct = clampFlightValue(s.fuelPct - (0.055 + s.throttlePct * 0.0011) * dt, 0, 100);
  if (s.fuelPct <= 0) s.throttlePct = 0;

  if (s.altitudeFt < 0) s.altitudeFt = 0;
  return s;
}

// Gentle-landing test used by the landing missions: slow, level, gear down,
// descending softly while over the runway strip.
export function landingQuality(state, overRunway, descentFpm) {
  if (!overRunway) return 'not-over-runway';
  if (state.speedKt > 165) return 'too-fast';
  if (Math.abs(state.bankDeg) > 14) return 'not-level';
  if (!state.gearDown) return 'gear-up';
  if (descentFpm < -950) return 'too-hard';
  if (state.altitudeFt > 60) return 'too-high';
  return 'landed';
}

// Score a ring pass: true when the aircraft is inside the ring's tube.
export function passedThroughRing(state, ring) {
  const dx = state.positionXFt - ring.xFt;
  const dz = state.positionZFt - ring.zFt;
  const horizontalFt = Math.hypot(dx, dz);
  const verticalFt = Math.abs(state.altitudeFt - ring.altitudeFt);
  return horizontalFt < 260 && verticalFt < ring.radiusFt;
}
