import test from 'node:test'
import assert from 'node:assert/strict'
import { advance, canTurn, COLUMNS, ROWS, levelFor, newGame, placeFood, stepDuration } from '../docs/.vitepress/games/snake.ts'

test('moves forward without changing length or mutating its previous state', () => {
  const original = newGame()
  const next = advance(original)
  assert.deepEqual(next.body[0], { x: 8, y: 8 })
  assert.equal(next.body.length, 4)
  assert.deepEqual(original.body[0], { x: 7, y: 8 })
})
test('rejects reverse turns and accepts perpendicular turns', () => {
  assert.equal(canTurn('right', 'left'), false)
  assert.equal(canTurn('right', 'up'), true)
  assert.deepEqual(advance(newGame(), 'left').body[0], { x: 8, y: 8 })
})
test('eating adds a segment and ten points; food never spawns on the snake', () => {
  const state = { ...newGame(), food: { x: 8, y: 8 } }
  const next = advance(state, 'right', () => .5)
  assert.equal(next.score, 10)
  assert.equal(next.body.length, 5)
  assert(!next.body.some(cell => cell.x === next.food.x && cell.y === next.food.y))
})
test('walls and occupied body cells end the game', () => {
  assert(advance({ ...newGame(), body: [{ x: 19, y: 8 }, { x: 18, y: 8 }] }).ended)
  const body = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }]
  assert(advance({ ...newGame(), body }, 'up').ended)
})
test('moving into the vacating tail cell is legal', () => {
  const body = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 2 }]
  assert.equal(advance({ ...newGame(), body }, 'up').ended, false)
})
test('a full board wins without looping forever looking for food', () => {
  const full = Array.from({ length: COLUMNS * ROWS }, (_, i) => ({ x: i % COLUMNS, y: Math.floor(i / COLUMNS) }))
  assert.equal(placeFood(full), null)
  const state = { ...newGame(), body: full.slice(0, -1).reverse(), food: full.at(-1) }
  const result = advance(state)
  assert(result.won && result.ended && result.food === null)
  assert.equal(result.body.length, COLUMNS * ROWS)
})
test('difficulty advances every five foods and caps at level six', () => {
  assert.equal(levelFor(40), 1)
  assert.equal(levelFor(50), 2)
  assert.equal(levelFor(500), 6)
  assert.equal(stepDuration(0), 200)
  assert.equal(stepDuration(500), 90)
})
