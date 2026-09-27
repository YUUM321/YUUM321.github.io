<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { advance, canTurn, COLUMNS, ROWS, levelFor, newGame, stepDuration } from '../games/snake'
import type { Direction } from '../games/snake'

const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const board = ref<SVGSVGElement>()
const mainButton = ref<HTMLButtonElement>()
const game = ref(newGame())
const mode = ref<'ready' | 'running' | 'paused' | 'over'>('ready')
const elapsed = ref(0)
const best = ref(0)
const level = computed(() => levelFor(game.value.score))
const progress = computed(() => level.value === 6 ? 5 : (game.value.score % 50) / 10)
const time = computed(() => `${String(Math.floor(elapsed.value / 60)).padStart(2, '0')}:${String(elapsed.value % 60).padStart(2, '0')}`)
const status = computed(() => ({ ready: '待机', running: '游戏中', paused: '已暂停', over: game.value.won ? '已通关' : '本局结束' })[mode.value])
const mainLabel = computed(() => ({ ready: '开始游戏', running: '暂停游戏', paused: '继续游戏', over: '再玩一次' })[mode.value])
const overlayTitle = computed(() => mode.value === 'ready' ? '贪吃蛇' : mode.value === 'paused' ? '休息一下' : game.value.won ? '完美通关' : '游戏结束')
const directions: { key: Direction; symbol: string; label: string }[] = [
  { key: 'up', symbol: '↑', label: '向上' }, { key: 'left', symbol: '←', label: '向左' },
  { key: 'right', symbol: '→', label: '向右' }, { key: 'down', symbol: '↓', label: '向下' }
]
const arrows: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
const turns: Direction[] = []
let frame = 0
let previousTime = 0
let activeMilliseconds = 0
let accumulator = 0
let previousOverflow = ''
let touchStart: { x: number; y: number } | null = null

function storeBest() {
  if (game.value.score <= best.value) return
  best.value = game.value.score
  try { localStorage.setItem('mio-snake-best', String(best.value)) } catch {}
}

function runFrame(now: number) {
  if (mode.value !== 'running') return
  const delta = now - previousTime
  previousTime = now
  activeMilliseconds += delta
  elapsed.value = Math.floor(activeMilliseconds / 1000)
  // Avoid a burst of unseen moves after a slow frame.
  accumulator += Math.min(delta, 250)
  const interval = stepDuration(game.value.score)
  if (accumulator >= interval) {
    accumulator %= interval
    game.value = advance(game.value, turns.shift() ?? game.value.direction)
    storeBest()
    if (game.value.ended) { mode.value = 'over'; return }
  }
  frame = requestAnimationFrame(runFrame)
}

function pause() {
  if (mode.value !== 'running') return
  mode.value = 'paused'
  cancelAnimationFrame(frame)
  turns.length = 0
}

function resume() {
  mode.value = 'running'
  previousTime = performance.now()
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(runFrame)
  void nextTick(() => board.value?.focus())
}

function restart() {
  cancelAnimationFrame(frame)
  game.value = newGame()
  elapsed.value = 0
  activeMilliseconds = 0
  accumulator = 0
  turns.length = 0
  resume()
}

function primaryAction() {
  if (mode.value === 'running') pause()
  else if (mode.value === 'paused') resume()
  else restart()
}

function steer(direction: Direction) {
  if (mode.value !== 'running' || turns.length >= 2) return
  const from = turns.at(-1) ?? game.value.direction
  if (direction !== from && canTurn(from, direction)) turns.push(direction)
}

function handleKeys(event: KeyboardEvent) {
  const direction = arrows[event.key] ?? arrows[event.key.toLowerCase()]
  if (direction) {
    event.preventDefault()
    if (!event.repeat) steer(direction)
  } else if ((event.code === 'Space' || event.key === 'Enter') && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault()
    if (!event.repeat) primaryAction()
  } else if (event.key.toLowerCase() === 'p') {
    event.preventDefault()
    if (!event.repeat && (mode.value === 'running' || mode.value === 'paused')) primaryAction()
  }
}

function swipeStart(event: TouchEvent) {
  const touch = event.touches[0]
  touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function swipeEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touchStart || !touch) return
  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return
  steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
}

function onVisibilityChange() { if (document.hidden) pause() }

onMounted(() => {
  try {
    const saved = Number(localStorage.getItem('mio-snake-best'))
    if (Number.isInteger(saved) && saved >= 0 && saved <= COLUMNS * ROWS * 10) best.value = saved
  } catch {}
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
  mainButton.value?.focus()
  window.addEventListener('blur', pause)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('blur', pause)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="mio-snake" aria-labelledby="snake-title" @cancel.prevent="emit('close')" @keydown="handleKeys">
      <div class="mio-snake__case" :data-state="mode">
        <header class="mio-snake__header">
          <div class="mio-snake__brand"><b>mio</b><span>POCKET / 01</span></div>
          <button class="mio-snake__close" type="button" aria-label="关闭游戏" @click="emit('close')">×</button>
        </header>

        <section class="mio-snake__screen" aria-label="游戏屏幕">
          <div class="mio-snake__screen-title"><h2 id="snake-title">SNAKE</h2><span class="mio-snake__status" role="status"><i :class="{ active: mode === 'running' }" />{{ status }}</span></div>
          <dl class="mio-snake__stats">
            <div><dt>分数 / SCORE</dt><dd data-score>{{ String(game.score).padStart(4, '0') }}</dd></div>
            <div><dt>最高 / BEST</dt><dd>{{ String(best).padStart(4, '0') }}</dd></div>
            <div><dt>时间 / TIME</dt><dd data-time>{{ time }}</dd></div>
          </dl>

          <div class="mio-snake__display">
            <svg ref="board" class="mio-snake__board" viewBox="0 0 320 256" role="img" aria-label="贪吃蛇游戏区域，使用方向键或 WASD 移动" tabindex="0" @touchstart.passive="swipeStart" @touchend="swipeEnd" @touchcancel="touchStart = null">
              <defs><pattern id="snake-grid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r=".6" fill="currentColor" opacity=".14" /></pattern></defs>
              <rect width="320" height="256" fill="url(#snake-grid)" />
              <g class="mio-snake__body" :opacity="mode === 'ready' ? .18 : 1">
                <rect v-for="(cell, index) in game.body" :key="index" :data-snake-head="index === 0 ? '' : undefined" :x="cell.x * 16 + 1.5" :y="cell.y * 16 + 1.5" width="13" height="13" rx="1.3" fill="currentColor" :opacity="index === 0 ? 1 : .7" />
                <g class="mio-snake__eyes" :transform="`translate(${game.body[0].x * 16 + 8} ${game.body[0].y * 16 + 8}) rotate(${{ right: 0, down: 90, left: 180, up: 270 }[game.direction]})`">
                  <circle cx="3" cy="-3" r="1" /><circle cx="3" cy="3" r="1" />
                </g>
              </g>
              <g v-if="game.food" :transform="`translate(${game.food.x * 16 + 8} ${game.food.y * 16 + 8})`" :opacity="mode === 'ready' ? .18 : 1" class="mio-snake__food">
                <circle r="5" fill="none" stroke="currentColor" stroke-width="1" /><circle r="2" fill="currentColor" />
              </g>
            </svg>
            <div v-if="mode !== 'running'" class="mio-snake__overlay">
              <span class="mio-snake__eyebrow">{{ mode === 'ready' ? 'HIDDEN GAME UNLOCKED' : mode === 'paused' ? 'PAUSED' : game.won ? 'ALL CLEAR' : 'GAME OVER' }}</span>
              <h3>{{ overlayTitle }}</h3>
              <p v-if="mode === 'paused'">计时已停，准备好再继续。</p>
              <p v-else-if="mode === 'over'">得分 {{ game.score }} · 用时 {{ time }}</p>
              <span class="mio-snake__prompt">{{ mode === 'ready' ? '按 START 开始' : mode === 'paused' ? '按 START 继续' : '按 START 再来一局' }}</span>
            </div>
          </div>

          <div class="mio-snake__progress-label"><span>LEVEL {{ String(level).padStart(2, '0') }}</span><span>{{ level === 6 ? '最高速度' : `${progress} / 5 · 吃满升级` }}</span></div>
          <progress class="mio-snake__progress" :value="progress" max="5" aria-label="本级进度" />
        </section>

        <div class="mio-snake__controls">
          <div class="mio-snake__dpad" role="group" aria-label="方向控制">
            <span class="mio-snake__dpad-center" />
            <button v-for="direction in directions" :key="direction.key" :class="`mio-snake__direction--${direction.key}`" type="button" :aria-label="direction.label" :disabled="mode !== 'running'" @click="steer(direction.key)">{{ direction.symbol }}</button>
          </div>
          <div class="mio-snake__actions">
            <div><button ref="mainButton" type="button" class="mio-snake__action mio-snake__action--primary" :aria-label="mainLabel" @click="primaryAction">{{ mode === 'running' ? 'Ⅱ' : '▷' }}</button><span>{{ mode === 'running' ? 'PAUSE' : 'START' }}</span></div>
            <div><button type="button" class="mio-snake__action" aria-label="重新开始" @click="restart">↺</button><span>RESET</span></div>
          </div>
        </div>
        <footer class="mio-snake__footer"><p>方向键 / WASD · 空格暂停<br />手机可按方向键或滑动屏幕</p><div class="mio-snake__speaker" aria-hidden="true"><i v-for="n in 5" :key="n" /></div></footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.mio-snake {
  width: min(440px, calc(100vw - 28px));
  max-width: none;
  max-height: calc(100dvh - 24px);
  margin: auto;
  padding: 0;
  overflow: auto;
  border: 1px solid var(--vp-c-text-2);
  border-radius: 14px 14px 36px 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 5px 6px 0 color-mix(in srgb, var(--vp-c-text-1) 12%, var(--vp-c-bg)), 0 24px 90px #0002;
  overscroll-behavior: contain;
}
.mio-snake::backdrop { background: #15151a55; backdrop-filter: blur(5px); }
.mio-snake__case { padding: 18px 22px 20px; }
.mio-snake__header, .mio-snake__brand, .mio-snake__screen-title, .mio-snake__progress-label, .mio-snake__footer { display: flex; align-items: center; justify-content: space-between; }
.mio-snake__brand { gap: 12px; }
.mio-snake__brand b { font-size: 20px; letter-spacing: -.7px; }
.mio-snake__brand span { color: var(--vp-c-text-3); font: 9px var(--vp-font-family-mono); letter-spacing: .1em; }
.mio-snake__close { width: 30px; height: 30px; border: 1px solid var(--vp-c-divider); border-radius: 50%; color: var(--vp-c-text-2); font-size: 21px; cursor: pointer; }
.mio-snake__close:hover { color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); }
.mio-snake__screen { margin-top: 14px; padding: 12px; border: 1px solid var(--vp-c-text-3); border-radius: 5px; background: var(--vp-c-bg-alt); box-shadow: inset 0 0 0 3px var(--vp-c-bg); }
.mio-snake__screen-title h2 { margin: 0; font: 11px var(--vp-font-family-mono); letter-spacing: .2em; }
.mio-snake__status { display: flex; align-items: center; gap: 6px; color: var(--vp-c-text-2); font-size: 10px; }
.mio-snake__status i { width: 5px; height: 5px; border: 1px solid currentColor; border-radius: 50%; }
.mio-snake__status i.active { background: currentColor; }
.mio-snake__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0 10px; }
.mio-snake__stats > div + div { padding-left: 12px; border-left: 1px solid var(--vp-c-divider); }
.mio-snake__stats dt { color: var(--vp-c-text-3); font: 8px/1.4 var(--vp-font-family-mono); }
.mio-snake__stats dd { margin: 3px 0 0; font: 21px/1.2 var(--vp-font-family-mono); font-variant-numeric: tabular-nums; }
.mio-snake__display { position: relative; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); }
.mio-snake__board { display: block; width: 100%; aspect-ratio: 5 / 4; touch-action: none; user-select: none; outline-offset: 3px; }
.mio-snake__board:focus-visible { outline: 1px solid var(--vp-c-text-3); }
.mio-snake__eyes { fill: var(--vp-c-bg); }
.mio-snake__overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; text-align: center; background: color-mix(in srgb, var(--vp-c-bg) 86%, transparent); pointer-events: none; }
.mio-snake__eyebrow { color: var(--vp-c-text-3); font: 8px var(--vp-font-family-mono); letter-spacing: .16em; }
.mio-snake__overlay h3 { margin: 13px 0 8px; font-size: 27px; font-weight: 500; letter-spacing: .14em; }
.mio-snake__overlay p { margin: 0; color: var(--vp-c-text-2); font-size: 11px; }
.mio-snake__prompt { margin-top: 23px; padding: 6px 12px; border: 1px solid var(--vp-c-divider); font: 10px var(--vp-font-family-mono); }
.mio-snake__progress-label { margin-top: 10px; color: var(--vp-c-text-2); font: 9px/1.5 var(--vp-font-family-mono); }
.mio-snake__progress { display: block; width: 100%; height: 3px; margin-top: 5px; appearance: none; border: 0; background: var(--vp-c-divider); color: var(--vp-c-text-1); }
.mio-snake__progress::-webkit-progress-bar { background: var(--vp-c-divider); }
.mio-snake__progress::-webkit-progress-value { background: var(--vp-c-text-1); }
.mio-snake__progress::-moz-progress-bar { background: var(--vp-c-text-1); }
.mio-snake__controls { display: flex; justify-content: space-between; align-items: center; margin: 17px 12px 0; }
.mio-snake__dpad { display: grid; grid-template: repeat(3, 30px) / repeat(3, 30px); gap: 2px; }
.mio-snake__dpad button { border: 1px solid var(--vp-c-text-3); border-radius: 3px; color: var(--vp-c-text-1); font: 18px var(--vp-font-family-mono); cursor: pointer; touch-action: manipulation; }
.mio-snake__dpad button:disabled { opacity: .45; cursor: default; }
.mio-snake__direction--up { grid-area: 1 / 2; }
.mio-snake__direction--left { grid-area: 2 / 1; }
.mio-snake__direction--right { grid-area: 2 / 3; }
.mio-snake__direction--down { grid-area: 3 / 2; }
.mio-snake__dpad-center { grid-area: 2 / 2; align-self: center; justify-self: center; width: 9px; height: 9px; border: 1px solid var(--vp-c-divider); border-radius: 50%; }
.mio-snake__actions { display: flex; gap: 15px; }
.mio-snake__actions > div { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.mio-snake__actions > div:last-child { padding-top: 15px; }
.mio-snake__action { width: 43px; height: 43px; border: 1px solid var(--vp-c-text-2); border-radius: 50%; color: var(--vp-c-text-1); font-size: 23px; cursor: pointer; touch-action: manipulation; box-shadow: 0 3px 0 var(--vp-c-divider); }
.mio-snake__action--primary { background: var(--vp-c-text-1); color: var(--vp-c-bg); }
.mio-snake__actions span { color: var(--vp-c-text-3); font: 8px var(--vp-font-family-mono); letter-spacing: .1em; }
.mio-snake__action:active, .mio-snake__dpad button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
.mio-snake__footer { margin-top: 12px; }
.mio-snake__footer p { margin: 0; color: var(--vp-c-text-3); font-size: 9px; line-height: 1.7; }
.mio-snake__speaker { display: flex; gap: 5px; padding-right: 10px; transform: rotate(-20deg); }
.mio-snake__speaker i { display: block; width: 2px; height: 20px; border-radius: 2px; background: var(--vp-c-divider); }
@media (max-width: 420px) {
  .mio-snake__case { padding: 14px 16px 17px; }
  .mio-snake__stats dd { font-size: 18px; }
  .mio-snake__controls { margin-inline: 4px; }
  .mio-snake__overlay h3 { font-size: 24px; }
}
@media (max-height: 720px) and (min-width: 600px) {
  .mio-snake { width: 382px; }
  .mio-snake__case { padding: 12px 18px 14px; }
  .mio-snake__controls { margin-top: 12px; }
}
</style>
