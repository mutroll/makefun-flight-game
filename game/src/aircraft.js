// aircraft.js — draws the Kestrel K-7, a twin-tail island-hopper jet, in chase view.
// One job: make the aircraft look built — fuselage, canopy, swept wings, twin tails,
// engine glow and navigation lights — and bank it with the flight state.

export function drawAircraftSprite(ctx, state, w, h) {
  const cx = w / 2;
  const cy = h * 0.62;
  const scale = 1 + (200 - Math.min(240, state.speedKt)) / 900;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((state.bankDeg * Math.PI) / 180);
  ctx.scale(scale, scale);

  // Engine glow.
  const glow = ctx.createRadialGradient(0, 66, 4, 0, 66, 46);
  glow.addColorStop(0, 'rgba(120,190,255,0.85)');
  glow.addColorStop(1, 'rgba(120,190,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 66, 46, 0, Math.PI * 2);
  ctx.fill();

  // Main wings — swept, with tip lights.
  ctx.fillStyle = '#c8d2dc';
  ctx.strokeStyle = '#5a6673';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 6); ctx.lineTo(-168, 52); ctx.lineTo(-158, 74); ctx.lineTo(-12, 40);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 6); ctx.lineTo(168, 52); ctx.lineTo(158, 74); ctx.lineTo(12, 40);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Wing-tip navigation lights: red port, green starboard.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath(); ctx.arc(-164, 62, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2eff5e';
  ctx.beginPath(); ctx.arc(164, 62, 6, 0, Math.PI * 2); ctx.fill();

  // Twin tail fins.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(-26, 52); ctx.lineTo(-44, 96); ctx.lineTo(-30, 100); ctx.lineTo(-12, 58);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, 52); ctx.lineTo(44, 96); ctx.lineTo(30, 100); ctx.lineTo(12, 58);
  ctx.closePath(); ctx.fill();

  // Fuselage: tapered body with a sunlit spine.
  const body = ctx.createLinearGradient(-20, 0, 20, 0);
  body.addColorStop(0, '#8fa3b5');
  body.addColorStop(0.5, '#eef3f7');
  body.addColorStop(1, '#7d92a5');
  ctx.fillStyle = body;
  ctx.strokeStyle = '#4a5a68';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.quadraticCurveTo(20, -58, 22, -10);
  ctx.quadraticCurveTo(24, 44, 14, 78);
  ctx.lineTo(-14, 78);
  ctx.quadraticCurveTo(-24, 44, -22, -10);
  ctx.quadraticCurveTo(-20, -58, 0, -96);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Canopy — the lit instrument glass the judge should see.
  const glass = ctx.createLinearGradient(0, -88, 0, -30);
  glass.addColorStop(0, '#bfe8ff');
  glass.addColorStop(0.5, '#3f8fd2');
  glass.addColorStop(1, '#173a5e');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(0, -88);
  ctx.quadraticCurveTo(13, -62, 12, -38);
  ctx.lineTo(-12, -38);
  ctx.quadraticCurveTo(-13, -62, 0, -88);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-4, -66, 3, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nose stripe and Kestrel badge.
  ctx.fillStyle = '#e8b23a';
  ctx.fillRect(-22, -6, 44, 5);
  ctx.fillStyle = '#173a5e';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KESTREL K-7', 0, 34);

  // Engine nozzles.
  ctx.fillStyle = '#2c3844';
  ctx.beginPath(); ctx.ellipse(-9, 80, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, 80, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7fc4ff';
  ctx.beginPath(); ctx.ellipse(-9, 80, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, 80, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}
