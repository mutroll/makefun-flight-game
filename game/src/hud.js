// hud.js — the cockpit instruments and every screen around the flight:
// mission select, pause, debrief, and the in-flight HUD.
// One job: show altitude, speed, heading, fuel, damage and objectives big and legible.

import { MISSIONS, missionGrade } from './missions.js';

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = 'rgba(6,22,40,' + (alpha || 0.72) + ')';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,200,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bigReadout(ctx, x, y, label, value, unit, accent) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = accent || '#ffffff';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(value, x, y + 36);
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(unit, x + ctx.measureText(value).width + 90, y + 36);
}

// Compass strip across the top centre.
export function drawCompassStrip(ctx, headingDeg, w) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,22,40,0.72)';
  ctx.fillRect(w / 2 - 190, 12, 380, 34);
  ctx.strokeStyle = 'rgba(140,200,255,0.45)';
  ctx.strokeRect(w / 2 - 190, 12, 380, 34);
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 15) {
    const hdg = (Math.round(headingDeg) + d + 360) % 360;
    const x = w / 2 + d * 3;
    ctx.fillStyle = d === 0 ? '#ffe27a' : '#cfe6ff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(d % 45 === 0 ? String(hdg).padStart(3, '0') + '°' : '·', x, 35);
  }
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath();
  ctx.moveTo(w / 2, 46); ctx.lineTo(w / 2 - 6, 38); ctx.lineTo(w / 2 + 6, 38);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Artificial horizon: a small lit attitude ball.
export function drawAttitudeBall(ctx, state, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate((-state.bankDeg * Math.PI) / 180);
  ctx.translate(0, state.pitchDeg * 1.6);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-r, -r, r * 2, r);
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(-r, 0, r * 2, r);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r, -1.5, r * 2, 3);
  ctx.restore();
  ctx.strokeStyle = '#cfe6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x, y + 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#cfe6ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', x, y + r + 14);
}

function gaugeBar(ctx, x, y, w, label, pct, colour) {
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, Math.max(0, w * pct), 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(x, y, w, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(Math.round(pct * 100) + '%', x + w + 8, y + 11);
}

// The full in-flight HUD.
export function drawFlightHud(ctx, state, progress, target, w, h, muted) {
  // Top-left instrument block.
  panel(ctx, 16, 12, 330, 108);
  bigReadout(ctx, 30, 34, 'ALTITUDE', String(Math.round(state.altitudeFt)), 'FT');
  bigReadout(ctx, 190, 34, 'SPEED', String(Math.round(state.speedKt)), 'KT');
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('HEADING', 30, 100);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(String(Math.round(state.headingDeg)).padStart(3, '0') + '°', 118, 102);
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('V/S ' + (state.verticalSpeedFpm >= 0 ? '+' : '') + Math.round(state.verticalSpeedFpm) + ' FPM', 210, 100);

  drawCompassStrip(ctx, state.headingDeg, w);
  drawAttitudeBall(ctx, state, w - 78, 172, 42);

  // Top-right: fuel, damage, throttle.
  panel(ctx, w - 330, 12, 314, 108);
  gaugeBar(ctx, w - 314, 44, 170, 'FUEL', state.fuelPct / 100, state.fuelPct < 25 ? '#ff5a4e' : '#39c26a');
  gaugeBar(ctx, w - 314, 78, 170, 'DAMAGE', state.damagePct / 100, state.damagePct > 60 ? '#ff5a4e' : '#ffb02e');
  gaugeBar(ctx, w - 314, 112, 170, 'THROTTLE', state.throttlePct / 100, '#4aa8ff');
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((state.flapsDown ? 'FLAPS ● ' : 'FLAPS ○ ') + (state.gearDown ? 'GEAR ●' : 'GEAR ○'), w - 128, 44);
  ctx.fillText(muted ? 'MUTED (M)' : 'SOUND ON (M)', w - 128, 78);

  // Mission objective banner, bottom centre.
  const mission = MISSIONS.find((m) => m.id === progress.missionId);
  panel(ctx, w / 2 - 320, h - 84, 640, 68);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(mission.number + ' · ' + mission.name + '   —   ' + target.label, w / 2, h - 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(mission.goal, w / 2, h - 38);
  ctx.fillStyle = '#9fc6ee';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('SCORE ' + progress.score + '   •   TIME ' + formatTime(progress.elapsedSeconds)
    + '   •   RINGS ' + progress.ringsHit + '/' + progress.rings.length, w / 2, h - 20);

  if (state.stalled) {
    ctx.textAlign = 'center';
    ctx.fillStyle = Math.floor(Date.now() / 300) % 2 ? '#ff5a4e' : '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('⚠ STALL — NOSE DOWN, FULL THROTTLE ⚠', w / 2, 150);
  }
  if (state.fuelPct < 25 && state.fuelPct > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb02e';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('LOW FUEL — ' + Math.round(state.fuelPct) + '% LEFT', w / 2, 178);
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Mission select / title screen. Returns the three card rectangles for click hits.
export function drawMissionSelect(ctx, w, h, selectedId) {
  ctx.fillStyle = 'rgba(6,18,36,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('KESTREL RUN', w / 2, 108);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Island flights in the Kestrel K-7 — rings, runways and one storm', w / 2, 146);
  ctx.fillStyle = '#9fc6ee';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Click a mission or press 1 / 2 / 3 — then fly with W A S D or arrow keys, Shift throttle up, Ctrl throttle down', w / 2, 176);
  ctx.fillText('Mouse: hold and drag to steer  •  F flaps  •  G gear  •  P pause  •  R restart', w / 2, 200);

  const cards = [];
  const cardW = 340, cardH = 250, gap = 36;
  const totalW = cardW * 3 + gap * 2;
  let x = (w - totalW) / 2;
  const y = 250;
  for (const m of MISSIONS) {
    const selected = m.id === selectedId;
    ctx.fillStyle = selected ? 'rgba(38,90,150,0.92)' : 'rgba(10,34,60,0.92)';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffe27a' : 'rgba(140,200,255,0.5)';
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(m.number, x + cardW / 2, y + 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(m.name, x + cardW / 2, y + 92);
    ctx.fillStyle = '#cfe6ff';
    ctx.font = '15px/1.45 system-ui, sans-serif';
    wrapText(ctx, m.goal, x + cardW / 2, y + 128, cardW - 44, 22);
    ctx.fillStyle = '#9fc6ee';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('PAR ' + formatTime(m.parSeconds) + '   •   PRESS ' + m.number, x + cardW / 2, y + cardH - 22);
    cards.push({ id: m.id, x, y, w: cardW, h: cardH });
    x += cardW + gap;
  }
  ctx.fillStyle = '#9fc6ee';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Fuel and damage turn every sortie into decisions — land gently or not at all.', w / 2, y + cardH + 44);
  return cards;
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineH;
    } else line = test;
  }
  ctx.fillText(line, cx, yy);
}

// Pause overlay.
export function drawPaused(ctx, w, h) {
  ctx.fillStyle = 'rgba(6,18,36,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('P or Esc to resume  •  R to restart the mission', w / 2, h / 2 + 30);
}

// Debrief screen after a mission ends.
export function drawDebrief(ctx, state, progress, w, h) {
  ctx.fillStyle = 'rgba(6,18,36,0.72)';
  ctx.fillRect(0, 0, w, h);
  const mission = MISSIONS.find((m) => m.id === progress.missionId);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText(missionGrade(progress), w / 2, 170);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(mission.name, w / 2, 214);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(progress.outcomeDetail, w / 2, 252);
  panel(ctx, w / 2 - 260, 290, 520, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('SCORE  ' + progress.score, w / 2, 332);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Time  ' + formatTime(progress.elapsedSeconds) + '    •    Rings  ' + progress.ringsHit + '/' + progress.rings.length, w / 2, 366);
  ctx.fillText('Fuel left  ' + Math.round(state.fuelPct) + '%    •    Damage  ' + Math.round(state.damagePct) + '%', w / 2, 396);
  ctx.fillStyle = '#9fc6ee';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('R — fly again    •    1 / 2 / 3 — another mission', w / 2, 490);
}
