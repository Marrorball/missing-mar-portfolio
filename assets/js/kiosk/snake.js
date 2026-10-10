// «Змейка» on the phone someone lost in the snow, the way it played on the
// green screens of the early 2000s: the snake goes through the edges and
// only running into itself ends the game. The rules are pure and tested;
// drawSnake paints the LCD.

const OPPOSITE = ([ax, ay], [bx, by]) => ax === -bx && ay === -by;

export function createSnake({ cols = 20, rows = 12, random = Math.random } = {}) {
  const middle = Math.floor(rows / 2);
  const state = {
    cols,
    rows,
    snake: [[5, middle], [4, middle], [3, middle]],
    dir: [1, 0],
    food: [0, 0],
    score: 0,
    over: false
  };
  let next = state.dir;

  function placeFood() {
    const taken = new Set(state.snake.map(([x, y]) => `${x},${y}`));
    const free = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) if (!taken.has(`${x},${y}`)) free.push([x, y]);
    }
    state.food = free[Math.min(free.length - 1, Math.floor(random() * free.length))] || [0, 0];
  }
  placeFood();

  return {
    state,
    // a turn waits for the next step, and never folds the snake back on itself
    turn(direction) {
      if (!state.over && !OPPOSITE(direction, state.dir)) next = direction;
    },
    step() {
      if (state.over) return;
      state.dir = next;
      const [hx, hy] = state.snake[0];
      const head = [(hx + state.dir[0] + cols) % cols, (hy + state.dir[1] + rows) % rows];
      const eats = head[0] === state.food[0] && head[1] === state.food[1];
      const body = eats ? state.snake : state.snake.slice(0, -1);
      if (body.some(([x, y]) => x === head[0] && y === head[1])) {
        state.over = true;
        return;
      }
      state.snake = [head, ...body];
      if (eats) {
        state.score += 1;
        placeFood();
      }
    }
  };
}

const LCD = '#a9c26a';
const INK = '#22301a';
const FONT = '"PT Mono", "Courier New", monospace';

function centred(context, text, x, y, size) {
  context.font = `700 ${Math.round(size)}px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x, y);
}

// The phone's green screen: the score along the top, the field under a rule,
// square segments, a small diamond of food; the title or «game over» on top.
export function drawSnake(context, width, height, state, { title = false, best = 0 } = {}) {
  context.fillStyle = LCD;
  context.fillRect(0, 0, width, height);
  context.fillStyle = INK;
  const bar = Math.round(height * 0.14);
  context.font = `700 ${Math.round(bar * 0.8)}px ${FONT}`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(String(state.score), width * 0.03, bar / 2);
  context.fillRect(0, bar, width, Math.max(2, height * 0.008));

  const cell = Math.min(width / state.cols, (height - bar - 4) / state.rows);
  const left = (width - cell * state.cols) / 2;
  const top = bar + 4 + (height - bar - 4 - cell * state.rows) / 2;
  if (!title) {
    const gap = Math.max(1, cell * 0.12);
    for (const [x, y] of state.snake) context.fillRect(left + x * cell + gap / 2, top + y * cell + gap / 2, cell - gap, cell - gap);
    const [fx, fy] = state.food;
    const cx = left + (fx + 0.5) * cell;
    const cy = top + (fy + 0.5) * cell;
    context.beginPath();
    context.moveTo(cx, cy - cell * 0.4);
    context.lineTo(cx + cell * 0.4, cy);
    context.lineTo(cx, cy + cell * 0.4);
    context.lineTo(cx - cell * 0.4, cy);
    context.closePath();
    context.fill();
  }
  if (title || state.over) {
    context.fillStyle = 'rgba(169, 194, 106, 0.85)';
    context.fillRect(width * 0.08, height * 0.26, width * 0.84, height * 0.6);
    context.fillStyle = INK;
    if (title) {
      centred(context, 'ЗМЕЙКА', width / 2, height * 0.42, height * 0.16);
      centred(context, 'нажми 5', width / 2, height * 0.6, height * 0.08);
      if (best) centred(context, `Рекорд ${best}`, width / 2, height * 0.74, height * 0.07);
    } else {
      centred(context, 'ИГРА ОКОНЧЕНА', width / 2, height * 0.42, height * 0.1);
      centred(context, `Счёт ${state.score}`, width / 2, height * 0.58, height * 0.08);
      centred(context, '5 — ещё раз', width / 2, height * 0.73, height * 0.07);
    }
  }
}
