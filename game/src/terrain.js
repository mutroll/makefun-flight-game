// terrain.js — the island world: ground height, runways, rings, towns and lakes.
// One job: answer "what is under / ahead of the aircraft" for physics and drawing.
// Everything is deterministic (pure sine/cosine hills), so every flight replays the same island.

export const ISLAND = {
  name: 'Kestrel Island',
  // Home runway (Runway 09) near the origin; far runway (Runway 27) to the north.
  homeRunway: { xFt: 0, zFt: 2400, headingDeg: 90, lengthFt: 5200, widthFt: 260 },
  farRunway: { xFt: 2600, zFt: 21800, headingDeg: 270, lengthFt: 5200, widthFt: 260 },
};

// Rolling-hill height in feet at world (x, z). Flat near the runways so landings are fair.
export function groundHeightFt(xFt, zFt) {
  const nearHome = Math.hypot(xFt - ISLAND.homeRunway.xFt, zFt - ISLAND.homeRunway.zFt);
  const nearFar = Math.hypot(xFt - ISLAND.farRunway.xFt, zFt - ISLAND.farRunway.zFt);
  let h = 420
    + 260 * Math.sin(xFt * 0.00021 + 1.7) * Math.cos(zFt * 0.00016)
    + 180 * Math.sin(xFt * 0.00053 - zFt * 0.00031 + 0.6)
    + 90 * Math.sin(xFt * 0.0011 + zFt * 0.0009);
  if (nearHome < 3400) h *= Math.max(0, (nearHome - 900) / 2500);
  if (nearFar < 3400) h *= Math.max(0, (nearFar - 900) / 2500);
  // A lake basin to the west and a ridge line to the east, for recognisable terrain.
  const lakeD = Math.hypot(xFt + 9500, zFt - 9000);
  if (lakeD < 5200) h = Math.min(h, 40 + lakeD * 0.05);
  const ridgeD = Math.abs(xFt - 11500);
  if (ridgeD < 2600) h += (1 - ridgeD / 2600) * 900;
  return Math.max(0, h);
}

// Is (x, z) on the lake? Used to paint water instead of grass.
export function isLakeAt(xFt, zFt) {
  return Math.hypot(xFt + 9500, zFt - 9000) < 4800;
}

// Is (x, z) inside a town block? Towns sit beside each runway for visual landmarks.
export function isTownAt(xFt, zFt) {
  const nearHomeTown = Math.hypot(xFt - 1800, zFt - 5200) < 1500;
  const nearFarTown = Math.hypot(xFt + 900, zFt - 19600) < 1500;
  return nearHomeTown || nearFarTown;
}

// Distance across the runway strip: 0 on the centreline. Also reports along-track feet.
export function runwayOffsetFt(runway, xFt, zFt) {
  const rad = (runway.headingDeg * Math.PI) / 180;
  const dx = xFt - runway.xFt;
  const dz = zFt - runway.zFt;
  return {
    acrossFt: -dx * Math.cos(rad) + dz * Math.sin(rad),
    alongFt: dx * Math.sin(rad) + dz * Math.cos(rad),
  };
}

export function isOverRunway(runway, xFt, zFt) {
  const o = runwayOffsetFt(runway, xFt, zFt);
  return Math.abs(o.acrossFt) < runway.widthFt / 2 && Math.abs(o.alongFt) < runway.lengthFt / 2;
}

// Ring course for the Ring Run mission: eight glowing rings arcing north over the island.
export function ringCourse() {
  const rings = [];
  const stops = [
    [600, 4200, 2600], [1800, 6800, 2900], [900, 9600, 2400], [-600, 12400, 3000],
    [800, 15200, 2600], [2400, 17800, 3100], [2600, 20600, 2600], [2600, 21800, 1800],
  ];
  for (let i = 0; i < stops.length; i++) {
    rings.push({ id: i + 1, xFt: stops[i][0], zFt: stops[i][1], altitudeFt: stops[i][2], radiusFt: 320 });
  }
  return rings;
}

// Courier checkpoints: five rings, then the far runway for the delivery landing.
export function courierCourse() {
  return [
    { id: 1, xFt: 1200, zFt: 5200, altitudeFt: 2800, radiusFt: 340 },
    { id: 2, xFt: -1400, zFt: 9800, altitudeFt: 2400, radiusFt: 340 },
    { id: 3, xFt: 3400, zFt: 13400, altitudeFt: 3000, radiusFt: 340 },
    { id: 4, xFt: 800, zFt: 17600, altitudeFt: 2600, radiusFt: 340 },
    { id: 5, xFt: 2600, zFt: 20600, altitudeFt: 2000, radiusFt: 340 },
  ];
}

// Project a world point into screen space from the chase camera.
// Returns { x, y, scale, behind } — scale shrinks with distance, behind when off-camera.
export function projectAhead(state, targetXFt, targetZFt, targetAltFt, viewW, viewH) {
  const dx = targetXFt - state.positionXFt;
  const dz = targetZFt - state.positionZFt;
  const distFt = Math.hypot(dx, dz);
  const bearingDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
  let relDeg = ((bearingDeg - state.headingDeg + 540) % 360) - 180;
  const horizonY = viewH * 0.44 - state.pitchDeg * 9;
  const focal = viewH * 1.15;
  const altDiffFt = targetAltFt - state.altitudeFt;
  const screenX = viewW / 2 + Math.tan((relDeg * Math.PI) / 180) * focal - state.bankDeg * 2.2;
  const screenY = horizonY - (altDiffFt / Math.max(300, distFt)) * focal * 0.9;
  return { x: screenX, y: screenY, scale: focal / Math.max(400, distFt), behind: Math.abs(relDeg) > 62, distFt, relDeg };
}
