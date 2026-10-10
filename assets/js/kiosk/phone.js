// The phone picked up out of the snow plays Snake: arrows or WASD, the
// keypad's 2 4 6 8 (5 starts and pauses), or a swipe across its screen. The
// best score is kept in this browser when it lets us; a short beep for food.

import { createSnake, drawSnake } from './snake.js';

const TURNS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const DIGITS = { 2: 'up', 8: 'down', 4: 'left', 6: 'right', 5: 'start' };
const BEST = 'snake-best';

let audio = null;
function beep(win) {
  const Context = win?.AudioContext || win?.webkitAudioContext;
  if (!Context) return;
  audio ??= new Context();
  if (audio.state === 'suspended') audio.resume();
  const now = audio.currentTime;
  const tone = audio.createOscillator();
  tone.type = 'square';
  tone.frequency.value = 1320;
  const level = audio.createGain();
  level.gain.setValueAtTime(0.06, now);
  level.gain.setValueAtTime(0, now + 0.06);
  tone.connect(level).connect(audio.destination);
  tone.start(now);
  tone.stop(now + 0.07);
}

// Starts the game on a rendered phone (ui.js renderPhone); returns stop().
export function startPhone(root, { win = globalThis.window, storage = globalThis.localStorage } = {}) {
  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d');
  let game = createSnake();
  let mode = 'title';   // title, play, pause, over
  let timer = 0;
  let best = 0;
  try {
    best = Number(storage?.getItem(BEST)) || 0;
  } catch {
    best = 0;
  }

  const draw = () => drawSnake(context, canvas.width, canvas.height, game.state, { title: mode === 'title', best });
  const halt = () => {
    win.clearTimeout(timer);
    timer = 0;
  };
  function tick() {
    const score = game.state.score;
    game.step();
    if (game.state.score > score) beep(win);
    if (game.state.over) {
      mode = 'over';
      halt();
      if (game.state.score > best) {
        best = game.state.score;
        try {
          storage?.setItem(BEST, String(best));
        } catch {
          // no storage: the record lasts as long as the page
        }
      }
    } else {
      // a little faster with every bite
      timer = win.setTimeout(tick, Math.max(70, 150 - game.state.score * 3));
    }
    draw();
  }
  function play() {
    if (mode === 'title' || mode === 'over') game = createSnake();
    mode = 'play';
    halt();
    timer = win.setTimeout(tick, 150);
    draw();
  }
  function press(action) {
    if (action === 'start') {
      if (mode === 'play') {
        mode = 'pause';
        halt();
      } else {
        play();
      }
      return;
    }
    if (!TURNS[action]) return;
    if (mode !== 'play') play();
    game.turn(TURNS[action]);
  }

  const onKey = event => {
    const action = KEYS[event.code] || (event.code === 'Space' ? 'start' : DIGITS[event.key]);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    press(action);
  };
  const onClick = event => {
    const key = event.target.closest('[data-phone-key]')?.dataset.phoneKey;
    if (key) press(DIGITS[key]);
  };
  let swipe = null;
  const onDown = event => { swipe = { x: event.clientX, y: event.clientY }; };
  const onUp = event => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      if (mode !== 'play') play();
      return;
    }
    press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  // first in line, so the arrows steer the snake and not the camera
  win.addEventListener('keydown', onKey, true);
  root.addEventListener('click', onClick);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  draw();
  return () => {
    halt();
    win.removeEventListener('keydown', onKey, true);
    root.removeEventListener('click', onClick);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
  };
}
