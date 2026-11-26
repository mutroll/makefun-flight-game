// input.js — keyboard and mouse pilot controls. One job: turn raw device
// events into the boolean input set the flight model consumes each tick.

export function createInputState() {
  return {
    pitchUp: false,
    pitchDown: false,
    bankLeft: false,
    bankRight: false,
    throttleUp: false,
    throttleDown: false,
    flaps: false,
    gear: false,
    mouseSteerX: 0, // -1..1, from pointer position while the mouse is held
    mouseSteerY: 0,
    mouseHeld: false,
  };
}

const KEY_ACTIONS = {
  ArrowUp: 'pitchDown',
  KeyW: 'pitchUp',
  ArrowDown: 'pitchUp',
  KeyS: 'pitchDown',
  ArrowLeft: 'bankLeft',
  KeyA: 'bankLeft',
  ArrowRight: 'bankRight',
  KeyD: 'bankRight',
  ShiftLeft: 'throttleUp',
  ShiftRight: 'throttleUp',
  ControlLeft: 'throttleDown',
  ControlRight: 'throttleDown',
  KeyF: 'flaps',
  KeyG: 'gear',
};

// Bind keyboard + mouse on the canvas. onAction fires for one-shot keys:
// 'select1' | 'select2' | 'select3' | 'restart' | 'pause' | 'mute' | 'start'.
export function bindPilotInput(canvas, input, onAction) {
  const down = (event) => {
    const action = KEY_ACTIONS[event.code];
    if (action) {
      input[action] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Digit1') onAction('select1');
    if (event.code === 'Digit2') onAction('select2');
    if (event.code === 'Digit3') onAction('select3');
    if (event.code === 'KeyR') onAction('restart');
    if (event.code === 'KeyP' || event.code === 'Escape') onAction('pause');
    if (event.code === 'KeyM') onAction('mute');
    if (event.code === 'Enter' || event.code === 'Space') onAction('start');
  };
  const up = (event) => {
    const action = KEY_ACTIONS[event.code];
    if (action) {
      input[action] = false;
      event.preventDefault();
    }
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  canvas.addEventListener('pointerdown', (event) => {
    input.mouseHeld = true;
    updateMouseSteer(event);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (input.mouseHeld) updateMouseSteer(event);
  });
  const release = () => {
    input.mouseHeld = false;
    input.mouseSteerX = 0;
    input.mouseSteerY = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  function updateMouseSteer(event) {
    const rect = canvas.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    input.mouseSteerX = Math.max(-1, Math.min(1, nx * 2));
    input.mouseSteerY = Math.max(-1, Math.min(1, ny * 2));
  }
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}

// Fold the mouse steer into the boolean inputs: push the stick toward the pointer.
export function applyMouseSteer(input) {
  if (!input.mouseHeld) return;
  if (input.mouseSteerX < -0.18) input.bankLeft = true;
  if (input.mouseSteerX > 0.18) input.bankRight = true;
  if (input.mouseSteerY < -0.18) input.pitchUp = true;
  if (input.mouseSteerY > 0.18) input.pitchDown = true;
}
