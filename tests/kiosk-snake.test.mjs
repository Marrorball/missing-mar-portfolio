import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnake, drawSnake } from '../assets/js/kiosk/snake.js';

// a random that always puts the food in the same free spot
const fixed = value => () => value;

test('a new game: three cells long, heading right, the food off the snake', () => {
  const game = createSnake({ cols: 20, rows: 12, random: fixed(0.5) });
  const { snake, dir, food, score, over } = game.state;
  assert.equal(snake.length, 3);
  assert.deepEqual(dir, [1, 0]);
  assert.ok(!snake.some(([x, y]) => x === food[0] && y === food[1]));
  assert.equal(score, 0);
  assert.equal(over, false);
});

test('each step moves the head one cell the way it heads', () => {
  const game = createSnake({ cols: 20, rows: 12, random: fixed(0.99) });
  const [hx, hy] = game.state.snake[0];
  game.step();
  assert.deepEqual(game.state.snake[0], [hx + 1, hy]);
  assert.equal(game.state.snake.length, 3);
});

test('it cannot turn straight back into itself', () => {
  const game = createSnake({ cols: 20, rows: 12, random: fixed(0.99) });
  game.turn([-1, 0]);
  game.step();
  assert.deepEqual(game.state.dir, [1, 0]);
  game.turn([0, 1]);
  game.step();
  assert.deepEqual(game.state.dir, [0, 1]);
});

test('eating grows it and counts', () => {
  const game = createSnake({ cols: 20, rows: 12, random: fixed(0.99) });
  const [hx, hy] = game.state.snake[0];
  game.state.food = [hx + 1, hy];
  game.step();
  assert.equal(game.state.snake.length, 4);
  assert.equal(game.state.score, 1);
  assert.notDeepEqual(game.state.food, [hx + 1, hy]);
});

test('it goes through the edge and comes out the other side', () => {
  const game = createSnake({ cols: 20, rows: 12, random: fixed(0.99) });
  game.state.snake = [[19, 5], [18, 5], [17, 5]];
  game.step();
  assert.deepEqual(game.state.snake[0], [0, 5]);
  assert.equal(game.state.over, false);
});

test('running into itself ends the game', () => {
  const game = createSnake({ cols: 20, rows: 12, random: fixed(0.99) });
  game.state.snake = [[5, 5], [5, 6], [4, 6], [4, 5], [4, 4], [5, 4]];
  game.state.dir = [0, -1];
  game.turn([-1, 0]);
  game.step();
  assert.equal(game.state.over, true);
});

test('the screen shows the score, and the title before a game', () => {
  const texts = [];
  const context = new Proxy({ fillText: text => texts.push(String(text)), measureText: text => ({ width: String(text).length * 8 }) },
    { get: (target, key) => (key in target ? target[key] : () => {}), set: () => true });
  const game = createSnake({ random: fixed(0.5) });
  drawSnake(context, 420, 280, game.state, { title: true, best: 7 });
  assert.ok(texts.some(text => /ЗМЕЙКА/.test(text)));
  assert.ok(texts.some(text => /7/.test(text)), 'the best score');
  drawSnake(context, 420, 280, game.state);
  assert.ok(texts.some(text => /^0$|Счёт/.test(text)));
});
