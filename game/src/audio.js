// audio.js — procedural sound: engine hum, ring chimes, touchdown and crash.
// One job: synthesise every sound with WebAudio oscillators, no audio files.
// The context is created lazily on the first user gesture, so autoplay rules never bite.

export function createSoundEngine() {
  return {
    context: null,
    masterGain: null,
    engineOsc: null,
    engineGain: null,
    muted: false,
  };
}

export function ensureAudio(engine) {
  if (engine.context) {
    if (engine.context.state === 'suspended') engine.context.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    engine.context = new Ctx();
    engine.masterGain = engine.context.createGain();
    engine.masterGain.gain.value = 0.5;
    engine.masterGain.connect(engine.context.destination);
    engine.engineOsc = engine.context.createOscillator();
    engine.engineOsc.type = 'sawtooth';
    engine.engineOsc.frequency.value = 62;
    engine.engineGain = engine.context.createGain();
    engine.engineGain.gain.value = 0.0;
    const filter = engine.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engine.engineOsc.connect(filter);
    filter.connect(engine.engineGain);
    engine.engineGain.connect(engine.masterGain);
    engine.engineOsc.start();
  } catch (err) {
    engine.context = null;
  }
}

// Engine hum follows throttle and speed; call every frame while flying.
export function updateEngineHum(engine, throttlePct, speedKt, flying) {
  if (!engine.context || !engine.engineOsc) return;
  const target = engine.muted || !flying ? 0 : 0.028 + (throttlePct / 100) * 0.05;
  engine.engineGain.gain.setTargetAtTime(target, engine.context.currentTime, 0.15);
  engine.engineOsc.frequency.setTargetAtTime(52 + throttlePct * 0.9 + speedKt * 0.12, engine.context.currentTime, 0.2);
}

function blip(engine, freqHz, durationSec, type, volume) {
  if (!engine.context || engine.muted) return;
  const t = engine.context.currentTime;
  const osc = engine.context.createOscillator();
  const gain = engine.context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqHz, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);
  osc.connect(gain);
  gain.connect(engine.masterGain);
  osc.start(t);
  osc.stop(t + durationSec + 0.05);
}

export function playRingChime(engine) {
  blip(engine, 880, 0.35, 'sine', 0.22);
  setTimeout(() => blip(engine, 1318, 0.4, 'sine', 0.18), 90);
}

export function playTouchdown(engine) {
  blip(engine, 180, 0.25, 'triangle', 0.3);
  setTimeout(() => blip(engine, 120, 0.3, 'triangle', 0.22), 120);
}

export function playCrash(engine) {
  if (!engine.context || engine.muted) return;
  const t = engine.context.currentTime;
  const noise = engine.context.createBufferSource();
  const buffer = engine.context.createBuffer(1, engine.context.sampleRate * 0.5, engine.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  noise.buffer = buffer;
  const gain = engine.context.createGain();
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  noise.connect(gain);
  gain.connect(engine.masterGain);
  noise.start(t);
  blip(engine, 70, 0.5, 'sine', 0.35);
}

export function playClick(engine) {
  blip(engine, 660, 0.08, 'square', 0.08);
}

export function setMuted(engine, muted) {
  engine.muted = muted;
  if (engine.masterGain) engine.masterGain.gain.value = muted ? 0 : 0.5;
}
