// render.js — draws the world: sky, ridges, ground grid, lake, towns, runway and rings.
// One job: paint one frame of the chase view from the flight state. No game logic here.

import { groundHeightFt, isLakeAt, projectAhead, ISLAND } from './terrain.js';
import { drawAircraftSprite } from './aircraft.js';

function skyGradient(ctx, w, h, horizonY) {
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(10, horizonY));
  g.addColorStop(0, '#2f6fd0');
  g.addColorStop(0.55, '#7fb2e8');
  g.addColorStop(1, '#cfe6f7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, Math.max(10, horizonY));
}

// Two parallax ridge layers above the horizon, shifting with heading.
export function drawRidgeLayers(ctx, state, w, h, horizonY) {
  const layers = [
    { amp: 46, base: 0, colour: '#5d7fa8', shift: 0.35 },
    { amp: 26, base: 14, colour: '#7d9cbd', shift: 0.6 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.colour;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= w; x += 16) {
      const worldX = (x - w / 2) * 6 + state.headingDeg * 34 * layer.shift + state.positionXFt * 0.02;
      const y = horizonY - layer.base
        - Math.abs(Math.sin(worldX * 0.004) * 0.6 + Math.sin(worldX * 0.0013 + 2) * 0.4) * layer.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, horizonY);
    ctx.closePath();
    ctx.fill();
  }
}

// Sun and drifting clouds, placed deterministically from the heading.
export function drawSkyObjects(ctx, state, w, h, horizonY) {
  const sunX = w * 0.78 - state.headingDeg * 2.4;
  const sunY = Math.max(40, horizonY - 190);
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255,244,190,0.95)');
  glow.addColorStop(0.35, 'rgba(255,220,120,0.55)');
  glow.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 95, sunY - 95, 190, 190);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (let i = 0; i < 7; i++) {
    const cx = ((i * 317 + 140 - state.headingDeg * 6 - state.positionXFt * 0.01) % (w + 260) + w + 260) % (w + 260) - 130;
    const cy = 46 + ((i * 67) % 150) + Math.sin(i * 2.1) * 12;
    if (cy > horizonY - 30) continue;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 62 + (i % 3) * 18, 15 + (i % 2) * 6, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34, cy + 6, 40, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Ground: green gradient, perspective grid, fields, lake and town blocks.
export function drawGround(ctx, state, w, h, horizonY) {
  const g = ctx.createLinearGradient(0, horizonY, 0, h);
  g.addColorStop(0, '#7fae5a');
  g.addColorStop(0.5, '#5d9142');
  g.addColorStop(1, '#3f6e2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  const vanishX = w / 2 - state.bankDeg * 2.2;
  ctx.strokeStyle = 'rgba(30,60,25,0.35)';
  ctx.lineWidth = 1;
  // Longitudinal lines fanning from the vanishing point.
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(vanishX + i * 26, horizonY);
    ctx.lineTo(vanishX + i * 170, h);
    ctx.stroke();
  }
  // Lateral lines, closer together near the horizon.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = horizonY + (h - horizonY) * t * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Patchwork fields: projected quads at fixed world spots.
  const fields = [
    [-4200, 5200, '#93a94e'], [3600, 6800, '#7fa04e'], [-2600, 9800, '#8fae4e'],
    [5200, 11000, '#a3ad52'], [-5600, 14200, '#93a94e'], [1800, 15800, '#7fa04e'],
  ];
  for (const [fx, fz, colour] of fields) {
    const p = projectAhead(state, fx, fz, groundHeightFt(fx, fz), w, h);
    if (p.behind || p.y < horizonY || p.y > h) continue;
    const s = Math.max(10, 1500 * p.scale);
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(p.x - s / 2, p.y - s / 4, s, s / 2);
    ctx.globalAlpha = 1;
  }

  // The lake, west of the island.
  const lake = projectAhead(state, -9500, 9000, 40, w, h);
  if (!lake.behind && lake.y > horizonY - 40) {
    const s = Math.max(30, 9000 * lake.scale);
    ctx.fillStyle = '#3f8fd2';
    ctx.beginPath();
    ctx.ellipse(lake.x, Math.min(h - 20, lake.y), s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(lake.x - s * 0.2, Math.min(h - 20, lake.y) - s * 0.06, s * 0.4, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A runway drawn as a perspective trapezoid with centreline, threshold and number.
export function drawRunway(ctx, state, runway, label, w, h, horizonY) {
  const rad = (runway.headingDeg * Math.PI) / 180;
  const halfLen = runway.lengthFt / 2;
  const halfWid = runway.widthFt / 2;
  const corners = [
    [-halfWid, -halfLen], [halfWid, -halfLen], [halfWid, halfLen], [-halfWid, halfLen],
  ].map(([across, along]) => {
    const x = runway.xFt + across * Math.cos(rad) + along * Math.sin(rad);
    const z = runway.zFt - across * Math.sin(rad) + along * Math.cos(rad);
    return projectAhead(state, x, z, 4, w, h);
  });
  if (corners.some((c) => c.behind)) return;
  // Draw the full quad and let the canvas clip it: the near end often sits
  // below the viewport on final approach, and that is still runway ahead.
  ctx.fillStyle = '#3a3f46';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Centreline dashes.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo((corners[0].x + corners[1].x) / 2, (corners[0].y + corners[1].y) / 2);
  ctx.lineTo((corners[2].x + corners[3].x) / 2, (corners[2].y + corners[3].y) / 2);
  ctx.stroke();
  // Threshold label at the near end, only when it is on screen.
  const near = corners[2];
  const far = corners[0];
  const labelX = (near.x + far.x) / 2;
  const labelY = (near.y + far.y) / 2;
  if (labelX > 40 && labelX < w - 40 && labelY > horizonY && labelY < h - 10) {
    const size = Math.max(13, Math.min(30, 90000 / Math.max(800, corners[0].distFt || 4000)));
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(size) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, labelX, labelY);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#ffe27a';
    ctx.fillText('RUNWAY ' + label, labelX, labelY + 20);
  }
}

// A glowing target ring with its number and distance.
export function drawRing(ctx, state, ring, w, h, horizonY) {
  const p = projectAhead(state, ring.xFt, ring.zFt, ring.altitudeFt, w, h);
  if (p.behind || p.y < 20 || p.y > h) return;
  const r = Math.max(14, ring.radiusFt * p.scale * 1.15);
  ctx.save();
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#39ff88';
  ctx.lineWidth = Math.max(4, r * 0.09);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(6,43,22,0.55)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(13, r * 0.30), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(Math.max(16, r * 0.5)) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(ring.id), p.x, p.y);
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#d8ffe9';
  ctx.fillText(Math.round(p.distFt) + ' FT', p.x, p.y + r + 18);
  ctx.restore();
}

// Off-screen target arrow: points the pilot toward the next ring or runway.
export function drawTargetArrow(ctx, state, target, w, h) {
  if (!target || target.kind !== 'ring') return;
  const p = projectAhead(state, target.ring.xFt, target.ring.zFt, target.ring.altitudeFt, w, h);
  if (!p.behind) return;
  const dir = p.relDeg > 0 ? 1 : -1;
  const ax = w / 2 + dir * (w / 2 - 90);
  const ay = 150;
  ctx.fillStyle = '#39ff88';
  ctx.beginPath();
  ctx.moveTo(ax + dir * 26, ay);
  ctx.lineTo(ax - dir * 14, ay - 18);
  ctx.lineTo(ax - dir * 14, ay + 18);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RING ' + target.ring.id + ' ' + (dir > 0 ? '►' : '◄'), ax, ay + 40);
}

// One full world frame: sky, terrain, runway(s), rings, then the aircraft.
export function drawWorldFrame(ctx, state, progress, target, w, h) {
  const horizonY = h * 0.44 - state.pitchDeg * 9;
  ctx.save();
  ctx.translate(w / 2, horizonY);
  ctx.rotate((-state.bankDeg * Math.PI) / 180 * 0.55);
  ctx.translate(-w / 2, -horizonY);
  skyGradient(ctx, w, h, horizonY);
  drawSkyObjects(ctx, state, w, h, horizonY);
  drawRidgeLayers(ctx, state, w, h, horizonY);
  drawGround(ctx, state, w, h, horizonY);
  // Runways: home always, far when it is the target or nearby.
  drawRunway(ctx, state, ISLAND.homeRunway, '09', w, h, horizonY);
  drawRunway(ctx, state, ISLAND.farRunway, '27', w, h, horizonY);
  if (target && target.kind === 'ring') drawRing(ctx, state, target.ring, w, h, horizonY);
  ctx.restore();
  drawTargetArrow(ctx, state, target, w, h);
  drawAircraftSprite(ctx, state, w, h);
}
