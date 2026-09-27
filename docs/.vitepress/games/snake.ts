export const COLUMNS = 20
export const ROWS = 16
export type Direction = 'up' | 'down' | 'left' | 'right'
export interface Cell { x: number; y: number }
export interface SnakeState {
  body: Cell[]
  direction: Direction
  food: Cell | null
  score: number
  ended: boolean
  won: boolean
}

const moves: Record<Direction, Cell> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
}
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

export function canTurn(from: Direction, to: Direction) {
  return moves[from].x + moves[to].x !== 0 || moves[from].y + moves[to].y !== 0
}

export function placeFood(body: Cell[], random = Math.random): Cell | null {
  const occupied = new Set(body.map(cell => cell.y * COLUMNS + cell.x))
  const free: Cell[] = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) {
      if (!occupied.has(y * COLUMNS + x)) free.push({ x, y })
    }
  }
  return free.length ? free[Math.floor(random() * free.length)] : null
}

export function newGame(): SnakeState {
  return {
    body: [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }],
    direction: 'right', food: { x: 12, y: 8 }, score: 0, ended: false, won: false
  }
}

export function advance(state: SnakeState, requested = state.direction, random = Math.random): SnakeState {
  if (state.ended) return state
  const direction = canTurn(state.direction, requested) ? requested : state.direction
  const head = { x: state.body[0].x + moves[direction].x, y: state.body[0].y + moves[direction].y }
  const eating = state.food !== null && same(head, state.food)
  // The old tail leaves this cell during a non-growing move.
  const occupied = eating ? state.body : state.body.slice(0, -1)
  if (head.x < 0 || head.x >= COLUMNS || head.y < 0 || head.y >= ROWS || occupied.some(cell => same(cell, head))) {
    return { ...state, direction, ended: true }
  }
  const body = [head, ...state.body]
  if (!eating) body.pop()
  const food = eating ? placeFood(body, random) : state.food
  return { body, direction, food, score: state.score + (eating ? 10 : 0), ended: food === null, won: food === null }
}

export const levelFor = (score: number) => Math.min(6, 1 + Math.floor(score / 50))
export const stepDuration = (score: number) => 200 - (levelFor(score) - 1) * 22
