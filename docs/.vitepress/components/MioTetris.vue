<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

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
const nextPieces = ref<PieceSource[]>([pieces[2], pieces[0]])
const current = ref(createPiece(false))
const machine = ref<HTMLElement>()
const started = ref(false)
const paused = ref(false)
const lines = ref(0)
const best = ref(0)
const elapsed = ref(0)
const level = computed(() => Math.min(10, 1 + Math.floor(lines.value / 5)))
const running = computed(() => started.value && !paused.value && !gameOver.value)
const time = computed(() => `${String(Math.floor(elapsed.value / 60)).padStart(2, '0')}:${String(elapsed.value % 60).padStart(2, '0')}`)
const stateLabel = computed(() => gameOver.value ? '本局结束' : !started.value ? '待机' : paused.value ? '已暂停' : '游戏中')
const actionLabel = computed(() => gameOver.value ? '再玩一次' : !started.value ? '开始游戏' : paused.value ? '继续游戏' : '暂停游戏')
let timer = 0
let previousTime = 0
let activeTime = 0
let fallTime = 0

function randomPiece(): PieceSource {
  return pieces[Math.floor(Math.random() * pieces.length)]
}

function createPiece(randomize = true): Piece {
  const source = nextPieces.value.shift() || randomPiece()
  nextPieces.value.push(randomize ? randomPiece() : pieces[1])
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
    lines.value += cleared
    if (score.value > best.value) {
      best.value = score.value
      try { localStorage.setItem('mio-tetris-best', String(best.value)) } catch {}
    }
    board.value = [...Array.from({ length: cleared }, () => Array<number>(width).fill(0)), ...remaining]
  }
  current.value = createPiece()
  if (!fits(current.value)) gameOver.value = true
}

function tick() {
  if (!running.value) return
  if (fits(current.value, current.value.x, current.value.y + 1)) current.value.y += 1
  else lockPiece()
}

function move(distance: number) {
  if (running.value && fits(current.value, current.value.x + distance)) current.value.x += distance
}

function rotate() {
  if (!running.value) return
  const shape = current.value.shape[0].map((_, column) => current.value.shape.map(row => row[column]).reverse())
  if (fits(current.value, current.value.x, current.value.y, shape)) current.value.shape = shape
}

function drop() {
  if (!running.value) return
  while (fits(current.value, current.value.x, current.value.y + 1)) current.value.y += 1
  tick()
  fallTime = 0
}

function restart() {
  board.value = emptyBoard()
  score.value = 0
  lines.value = 0
  elapsed.value = 0
  activeTime = 0
  fallTime = 0
  gameOver.value = false
  started.value = true
  paused.value = false
  nextPieces.value = [randomPiece(), randomPiece()]
  current.value = createPiece()
  resume()
}

function frame(now: number) {
  if (!running.value) return
  const delta = now - previousTime
  previousTime = now
  activeTime += delta
  elapsed.value = Math.floor(activeTime / 1000)
  fallTime += Math.min(delta, 250)
  if (fallTime >= Math.max(140, 650 - (level.value - 1) * 55)) { fallTime = 0; tick() }
  timer = requestAnimationFrame(frame)
}

function pause() {
  if (!running.value) return
  paused.value = true
  cancelAnimationFrame(timer)
}

function resume() {
  paused.value = false
  previousTime = performance.now()
  cancelAnimationFrame(timer)
  timer = requestAnimationFrame(frame)
  void nextTick(() => machine.value?.focus({ preventScroll: true }))
}

function primaryAction() {
  if (!started.value || gameOver.value) restart()
  else if (paused.value) resume()
  else pause()
}

function visibilityChange() { if (document.hidden) pause() }

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
  if (event.key.toLowerCase() === 'p' || (event.key === 'Enter' && event.target === machine.value)) {
    event.preventDefault()
    if (!event.repeat) primaryAction()
    return
  }
  if (event.target instanceof HTMLButtonElement && event.key === ' ') return
  const actions: Record<string, () => void> = {
    ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowDown: tick,
    ArrowUp: rotate, z: rotate, Z: rotate, ' ': drop
  }
  const action = actions[event.key]
  if (action) { event.preventDefault(); action() }
}

onMounted(() => {
  try {
    const saved = Number(localStorage.getItem('mio-tetris-best'))
    if (Number.isSafeInteger(saved) && saved >= 0) best.value = saved
  } catch {}
  window.addEventListener('blur', pause)
  document.addEventListener('visibilitychange', visibilityChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('blur', pause)
  document.removeEventListener('visibilitychange', visibilityChange)
  cancelAnimationFrame(timer)
})
</script>

<template>
  <div class="mio-tetris-page">
    <section ref="machine" class="mio-tetris" aria-label="俄罗斯方块掌机" tabindex="-1" @keydown="keydown">
      <header class="machine-header">
        <div class="machine-brand"><b>mio</b><span>POCKET / 02</span></div>
        <a :href="withBase('/')" class="machine-home" aria-label="返回首页" title="返回首页">↗</a>
      </header>
      <section class="machine-screen" aria-label="游戏屏幕">
        <div class="screen-title"><h1>TETRIS</h1><span role="status"><i :class="{ active: running }" />{{ stateLabel }}</span></div>
        <dl class="machine-stats">
          <div><dt>分数 / SCORE</dt><dd>{{ String(score).padStart(4, '0') }}</dd></div>
          <div><dt>最高 / BEST</dt><dd>{{ String(best).padStart(4, '0') }}</dd></div>
          <div><dt>时间 / TIME</dt><dd>{{ time }}</dd></div>
        </dl>
        <div class="tetris-play">
          <div class="tetris-display">
            <div class="tetris-board" role="img" aria-label="俄罗斯方块游戏区域">
              <template v-for="(row, rowIndex) in displayBoard" :key="rowIndex">
                <span v-for="(cell, columnIndex) in row" :key="columnIndex" :class="{ filled: cell }" />
              </template>
            </div>
            <div v-if="!running" class="game-overlay">
              <span>{{ gameOver ? 'GAME OVER' : started ? 'PAUSED' : 'HIDDEN GAME / 404' }}</span>
              <h2>{{ gameOver ? '游戏结束' : started ? '休息一下' : '俄罗斯方块' }}</h2>
              <p v-if="gameOver || started">{{ gameOver ? `得分 ${score} · 消除 ${lines} 行` : '计时已停，准备好再继续。' }}</p>
              <small>{{ gameOver ? '按 START 再来一局' : started ? '按 START 继续' : '按 START 开始' }}</small>
            </div>
          </div>
          <aside class="tetris-next" aria-label="接下来两个方块">
            <span>NEXT</span>
            <div v-for="(piece, index) in nextPieces" :key="index" class="tetris-preview">
              <template v-for="(row, rowIndex) in preview(piece)" :key="rowIndex">
                <i v-for="(cell, columnIndex) in row" :key="columnIndex" :class="{ filled: cell }" />
              </template>
            </div>
            <dl><dt>消除 / LINES</dt><dd>{{ String(lines).padStart(2, '0') }}</dd></dl>
            <div class="screen-mark" aria-hidden="true">404<br /><span>PLAY ON.</span></div>
          </aside>
        </div>
        <div class="level-label"><span>LEVEL {{ String(level).padStart(2, '0') }}</span><span>{{ level === 10 ? '最高速度' : `${lines % 5} / 5 · 消行升级` }}</span></div>
        <progress :value="level === 10 ? 5 : lines % 5" max="5" aria-label="本级进度" />
      </section>
      <div class="machine-controls">
        <div class="machine-dpad" role="group" aria-label="方向控制">
          <i />
          <button class="up" type="button" aria-label="旋转" :disabled="!running" @click="rotate">↻</button>
          <button class="left" type="button" aria-label="向左" :disabled="!running" @click="move(-1)">←</button>
          <button class="right" type="button" aria-label="向右" :disabled="!running" @click="move(1)">→</button>
          <button class="down" type="button" aria-label="快速落下" :disabled="!running" @click="drop">↓</button>
        </div>
        <div class="machine-actions">
          <div><button class="primary" type="button" :aria-label="actionLabel" @click="primaryAction">{{ running ? 'Ⅱ' : '▷' }}</button><span>{{ running ? 'PAUSE' : 'START' }}</span></div>
          <div><button type="button" aria-label="重新开始" @click="restart">↺</button><span>RESET</span></div>
        </div>
      </div>
      <footer class="machine-footer"><p>← → 移动 · ↑ 旋转 · ↓ 加速<br />空格落下 · P 暂停</p><div class="machine-speaker" aria-hidden="true"><i v-for="n in 5" :key="n" /></div></footer>
    </section>
  </div>
</template>

<style scoped>
.mio-tetris-page { padding: 28px 14px 48px; }
.mio-tetris { width: min(100%, 400px); margin: 0 auto; padding: 16px 20px 18px; border: 1px solid var(--vp-c-text-2); border-radius: 14px 14px 36px 14px; background: var(--vp-c-bg); color: var(--vp-c-text-1); box-shadow: 5px 6px 0 color-mix(in srgb, var(--vp-c-text-1) 12%, var(--vp-c-bg)), 0 20px 60px #00000009; outline: none; }
.machine-header, .machine-brand, .screen-title, .level-label, .machine-footer { display: flex; align-items: center; justify-content: space-between; }
.machine-brand { gap: 12px; }
.machine-brand b { font-size: 20px; letter-spacing: -.7px; }
.machine-brand span { color: var(--vp-c-text-3); font: 9px var(--vp-font-family-mono); letter-spacing: .1em; }
.machine-home { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--vp-c-divider); border-radius: 50%; color: var(--vp-c-text-2); font-size: 18px; text-decoration: none; }
.machine-home:hover { background: var(--vp-c-bg-soft); }
.machine-screen { margin-top: 14px; padding: 12px; border: 1px solid var(--vp-c-text-3); border-radius: 5px; background: var(--vp-c-bg-alt); box-shadow: inset 0 0 0 3px var(--vp-c-bg); }
.screen-title h1 { margin: 0; font: 11px var(--vp-font-family-mono); letter-spacing: .2em; }
.screen-title > span { display: flex; align-items: center; gap: 6px; color: var(--vp-c-text-2); font-size: 10px; }
.screen-title i { width: 5px; height: 5px; border: 1px solid currentColor; border-radius: 50%; }
.screen-title i.active { background: currentColor; }
.machine-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0 10px; }
.machine-stats > div + div { padding-left: 12px; border-left: 1px solid var(--vp-c-divider); }
.machine-stats dt, .tetris-next dt { color: var(--vp-c-text-3); font: 8px/1.4 var(--vp-font-family-mono); }
.machine-stats dd { margin: 3px 0 0; font: 21px/1.2 var(--vp-font-family-mono); font-variant-numeric: tabular-nums; }
.tetris-play { display: grid; grid-template-columns: minmax(0, 1fr) 66px; gap: 14px; }
.tetris-display { position: relative; min-width: 0; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); }
.tetris-board { display: grid; grid-template: repeat(16, 1fr) / repeat(10, 1fr); aspect-ratio: 10 / 16; overflow: hidden; }
.tetris-board > span { position: relative; margin: 1px; border-radius: 1px; }
.tetris-board > span:not(.filled)::after { content: ''; position: absolute; width: 1px; height: 1px; background: var(--vp-c-text-1); opacity: .12; top: 50%; left: 50%; }
.filled { background: var(--vp-c-text-1); box-shadow: inset 0 0 0 2px var(--vp-c-bg), inset 0 0 0 3px var(--vp-c-text-1); }
.tetris-next > span { display: block; margin: 1px 0 8px; font: 9px var(--vp-font-family-mono); letter-spacing: .12em; color: var(--vp-c-text-2); }
.tetris-preview { display: grid; grid-template: repeat(4, 1fr) / repeat(4, 1fr); aspect-ratio: 1; padding: 5px; margin-bottom: 10px; border: 1px solid var(--vp-c-divider); border-radius: 2px; background: var(--vp-c-bg); }
.tetris-preview i { margin: .5px; }
.tetris-preview .filled { box-shadow: inset 0 0 0 1px var(--vp-c-bg), inset 0 0 0 2px var(--vp-c-text-1); }
.tetris-next dl { margin: 18px 0 0; }
.tetris-next dd { margin: 4px 0 0; font: 22px var(--vp-font-family-mono); }
.screen-mark { margin-top: 22px; color: var(--vp-c-text-3); font: 24px/1 var(--vp-font-family-mono); letter-spacing: .05em; opacity: .5; }
.screen-mark span { font-size: 7px; letter-spacing: .1em; }
.game-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; text-align: center; background: color-mix(in srgb, var(--vp-c-bg) 89%, transparent); pointer-events: none; }
.game-overlay > span { color: var(--vp-c-text-3); font: 7px var(--vp-font-family-mono); letter-spacing: .1em; }
.game-overlay h2 { margin: 13px 0 8px; font-size: 22px; font-weight: 500; letter-spacing: .06em; }
.game-overlay p { margin: 0; color: var(--vp-c-text-2); font-size: 10px; }
.game-overlay small { margin-top: 23px; padding: 6px 10px; border: 1px solid var(--vp-c-divider); font: 9px var(--vp-font-family-mono); }
.level-label { margin-top: 10px; color: var(--vp-c-text-2); font: 9px/1.5 var(--vp-font-family-mono); }
progress { display: block; width: 100%; height: 3px; margin-top: 5px; appearance: none; border: 0; background: var(--vp-c-divider); color: var(--vp-c-text-1); }
progress::-webkit-progress-bar { background: var(--vp-c-divider); }
progress::-webkit-progress-value { background: var(--vp-c-text-1); }
progress::-moz-progress-bar { background: var(--vp-c-text-1); }
.machine-controls { display: flex; justify-content: space-between; align-items: center; margin: 16px 8px 0; }
.machine-dpad { display: grid; grid-template: repeat(3, 30px) / repeat(3, 30px); gap: 2px; }
.machine-dpad button { border: 1px solid var(--vp-c-text-3); border-radius: 3px; color: var(--vp-c-text-1); font: 18px var(--vp-font-family-mono); cursor: pointer; touch-action: manipulation; }
.machine-dpad button:disabled { opacity: .45; cursor: default; }
.machine-dpad .up { grid-area: 1 / 2; }.machine-dpad .left { grid-area: 2 / 1; }.machine-dpad .right { grid-area: 2 / 3; }.machine-dpad .down { grid-area: 3 / 2; }
.machine-dpad > i { grid-area: 2 / 2; align-self: center; justify-self: center; width: 9px; height: 9px; border: 1px solid var(--vp-c-divider); border-radius: 50%; }
.machine-actions { display: flex; gap: 15px; }
.machine-actions > div { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.machine-actions > div:last-child { padding-top: 15px; }
.machine-actions button { width: 43px; height: 43px; border: 1px solid var(--vp-c-text-2); border-radius: 50%; color: var(--vp-c-text-1); font-size: 23px; cursor: pointer; touch-action: manipulation; box-shadow: 0 3px 0 var(--vp-c-divider); }
.machine-actions .primary { background: var(--vp-c-text-1); color: var(--vp-c-bg); }
.machine-actions span { color: var(--vp-c-text-3); font: 8px var(--vp-font-family-mono); letter-spacing: .1em; }
.machine-actions button:active, .machine-dpad button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
.machine-footer { margin-top: 12px; }
.machine-footer p { margin: 0; color: var(--vp-c-text-3); font-size: 9px; line-height: 1.7; }
.machine-speaker { display: flex; gap: 5px; padding-right: 10px; transform: rotate(-20deg); }
.machine-speaker i { display: block; width: 2px; height: 20px; border-radius: 2px; background: var(--vp-c-divider); }
@media (max-width: 420px) {
  .mio-tetris-page { padding-top: 20px; }
  .mio-tetris { padding: 14px 16px 17px; }
  .machine-stats dd { font-size: 18px; }
  .tetris-play { grid-template-columns: minmax(0, 1fr) 54px; gap: 10px; }
  .game-overlay h2 { font-size: 19px; }
  .machine-controls { margin-inline: 4px; }
}
@media (max-height: 760px) and (min-width: 600px) {
  .mio-tetris-page { padding-top: 14px; }
  .mio-tetris { width: 330px; padding: 12px 18px 14px; }
  .machine-screen { margin-top: 10px; padding: 10px; }
  .tetris-play { grid-template-columns: minmax(0, 160px) 56px; justify-content: space-between; }
  .machine-stats dd { font-size: 18px; }
  .machine-controls { margin-top: 12px; }
  .machine-dpad { grid-template: repeat(3, 26px) / repeat(3, 26px); }
  .machine-footer { margin-top: 8px; }
  .game-overlay h2 { font-size: 19px; }
}
</style>
