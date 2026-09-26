<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type PieceSource = { shape: number[][]; color: number }
type Piece = PieceSource & { x: number; y: number }

const width = 10
const height = 16
const pieces: PieceSource[] = [
  { shape: [[1, 1, 1, 1]], color: 1 },
  { shape: [[1, 1], [1, 1]], color: 2 },
  { shape: [[0, 1, 0], [1, 1, 1]], color: 3 },
  { shape: [[0, 1, 1], [1, 1, 0]], color: 4 },
  { shape: [[1, 1, 0], [0, 1, 1]], color: 5 },
  { shape: [[1, 0, 0], [1, 1, 1]], color: 6 },
  { shape: [[0, 0, 1], [1, 1, 1]], color: 7 }
]

const emptyBoard = () => Array.from({ length: height }, () => Array<number>(width).fill(0))
const board = ref(emptyBoard())
const score = ref(0)
const gameOver = ref(false)
const nextPieces = ref<PieceSource[]>([randomPiece(), randomPiece()])
const current = ref(createPiece())
let timer: number | undefined

function randomPiece(): PieceSource {
  return pieces[Math.floor(Math.random() * pieces.length)]
}

function createPiece(): Piece {
  const source = nextPieces.value.shift() || randomPiece()
  nextPieces.value.push(randomPiece())
  return { shape: source.shape.map(row => [...row]), color: source.color, x: 3, y: 0 }
}

function fits(piece: Piece, x = piece.x, y = piece.y, shape = piece.shape) {
  return shape.every((row, rowIndex) => row.every((cell, columnIndex) => {
    if (!cell) return true
    const targetX = x + columnIndex
    const targetY = y + rowIndex
    return targetX >= 0 && targetX < width && targetY < height && (targetY < 0 || board.value[targetY][targetX] === 0)
  }))
}

function lockPiece() {
  const piece = current.value
  piece.shape.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (cell && piece.y + rowIndex >= 0) board.value[piece.y + rowIndex][piece.x + columnIndex] = piece.color
  }))
  const remaining = board.value.filter(row => row.some(cell => cell === 0))
  const cleared = height - remaining.length
  if (cleared) {
    score.value += cleared * 100
    board.value = [...Array.from({ length: cleared }, () => Array<number>(width).fill(0)), ...remaining]
  }
  current.value = createPiece()
  if (!fits(current.value)) gameOver.value = true
}

function tick() {
  if (gameOver.value) return
  if (fits(current.value, current.value.x, current.value.y + 1)) current.value.y += 1
  else lockPiece()
}

function move(distance: number) {
  if (!gameOver.value && fits(current.value, current.value.x + distance)) current.value.x += distance
}

function rotate() {
  if (gameOver.value) return
  const shape = current.value.shape[0].map((_, column) => current.value.shape.map(row => row[column]).reverse())
  if (fits(current.value, current.value.x, current.value.y, shape)) current.value.shape = shape
}

function drop() {
  if (gameOver.value) return
  while (fits(current.value, current.value.x, current.value.y + 1)) current.value.y += 1
  tick()
}

function restart() {
  board.value = emptyBoard()
  score.value = 0
  gameOver.value = false
  nextPieces.value = [randomPiece(), randomPiece()]
  current.value = createPiece()
}

function preview(piece: PieceSource) {
  return Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, column) => piece.shape[row]?.[column] ? piece.color : 0))
}

const displayBoard = computed(() => {
  const visible = board.value.map(row => [...row])
  const piece = current.value
  piece.shape.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    const y = piece.y + rowIndex
    const x = piece.x + columnIndex
    if (cell && y >= 0 && y < height && x >= 0 && x < width) visible[y][x] = piece.color
  }))
  return visible
})

function keydown(event: KeyboardEvent) {
  const actions: Record<string, () => void> = {
    ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowDown: tick,
    ArrowUp: rotate, z: rotate, Z: rotate, ' ': drop
  }
  const action = actions[event.key]
  if (action) { event.preventDefault(); action() }
}

onMounted(() => {
  window.addEventListener('keydown', keydown)
  timer = window.setInterval(tick, 650)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keydown)
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <main class="mio-tetris" aria-label="俄罗斯方块">
    <header><span>404</span><time>{{ score }}</time><button type="button" aria-label="重新开始" title="重新开始" @click="restart">↻</button></header>
    <div class="mio-tetris__play">
      <div class="mio-tetris__board" :class="{ 'is-over': gameOver }">
        <template v-for="(row, rowIndex) in displayBoard" :key="rowIndex">
          <span v-for="(cell, columnIndex) in row" :key="columnIndex" :class="[`tone-${cell}`, { filled: cell }]" />
        </template>
        <button v-if="gameOver" type="button" @click="restart">再来一次</button>
      </div>
      <aside class="mio-tetris__next" aria-label="接下来两个方块">
        <span>接下来</span>
        <div v-for="(piece, index) in nextPieces" :key="index" class="mio-tetris__preview">
          <template v-for="(row, rowIndex) in preview(piece)" :key="rowIndex">
            <i v-for="(cell, columnIndex) in row" :key="columnIndex" :class="[`tone-${cell}`, { filled: cell }]" />
          </template>
        </div>
      </aside>
    </div>
    <nav aria-label="游戏控制">
      <button type="button" aria-label="向左" @click="move(-1)">←</button><button type="button" aria-label="旋转" @click="rotate">↻</button><button type="button" aria-label="向右" @click="move(1)">→</button><button type="button" aria-label="落下" @click="drop">↓</button>
    </nav>
  </main>
</template>
