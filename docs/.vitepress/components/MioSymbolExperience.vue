<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { useSymbolInteractions } from '../composables/symbolInteractions'

const { active } = useSymbolInteractions()
const route = useRoute()
const canvas = ref<HTMLCanvasElement>()
const alphabet = '01×+≡∷∴∵/\\<>[]{}#%░▒▓█▁▂▃▄▅▆▇▦▥←↑→↓'
const frames = '.mio-dashboard-card,.mio-dashboard__visuals,.mio-about__section,.mio-about-columns>div,.mio-timeline>li,.mio-site-stats>div,.mio-current-list>li,.mio-interest-map>span,.mio-empty,.mio-feed__entry,.mio-visual-card,.mio-visual-grid__card,.mio-visual-dialog__card,.vp-doc pre,.vp-doc blockquote,.vp-doc table,.mio-tetris,.mio-symbol-stat'
const small = 'a,button,.mio-symbol-stat,.mio-site-stats>div,.mio-current-list>li,.mio-interest-map>span,.mio-about-columns>div,.mio-timeline>li,.mio-feed__entry'
const introDuration = 2200
type Trail = { x: number; y: number; vertical: boolean; normal: number; length: number; born: number; variant: number }
type ScrambleNode = { node: Text; original: string; wrapper: HTMLSpanElement; cells: HTMLSpanElement[] }
type Scramble = { element: Element; nodes: ScrambleNode[]; born: number; variant: number }
type FramePulse = { element: Element; born: number; variant: number }
let trails: Trail[] = []
let scrambles: Scramble[] = []
let framePulses: FramePulse[] = []
const lastFramePulse = new WeakMap<Element, number>()
let hovered: Element | null = null
let pointer = { x: 0, y: 0 }
let lastMove = 0
let raf = 0
let lastPaint = 0
let intro = 0
let width = 0
let height = 0
let ink = '#202124'
let paper = '#fff'
let mounted = false
let titlePixels: { x: number; y: number; seed: number }[] = []
const hash = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
const symbol = (seed: number, phase: number) => alphabet[Math.floor(hash(seed + Math.floor(phase)) * alphabet.length)]

function palette() {
  const style = getComputedStyle(document.documentElement)
  ink = style.getPropertyValue('--vp-c-text-1').trim() || '#202124'
  paper = style.getPropertyValue('--vp-c-bg').trim() || '#fff'
}
function resize() {
  if (!canvas.value) return
  width = window.innerWidth
  height = window.innerHeight
  const ratio = Math.min(devicePixelRatio || 1, 2)
  canvas.value.width = Math.ceil(width * ratio)
  canvas.value.height = Math.ceil(height * ratio)
  canvas.value.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
}
function makeTitle() {
  const raster = document.createElement('canvas')
  raster.width = 84
  raster.height = 32
  const context = raster.getContext('2d')!
  context.font = 'bold 36px monospace'
  context.fillText('mio', 9, 27)
  const data = context.getImageData(0, 0, 84, 32).data
  titlePixels = []
  for (let y = 0; y < 32; y++) for (let x = 0; x < 84; x++) {
    if (data[(y * 84 + x) * 4 + 3] > 100) titlePixels.push({ x, y, seed: y * 84 + x })
  }
}

function wake() {
  if (!raf && active.value && !document.hidden) raf = requestAnimationFrame(draw)
}
function targetFor(target: EventTarget | null) {
  if (!(target instanceof Element) || target.closest('.mio-symbol-toggle,dialog,.mio-snake__controls,.machine-controls')) return null
  return target.closest(`${small},${frames}`)
}
function isSmall(element: Element) {
  if (element.matches('.mio-visual-card,.mio-visual-grid__card,.mio-visual-dialog__card')) return false
  const rect = element.getBoundingClientRect()
  return element.matches(small) || rect.height < 76
}
function scramble(element: Element) {
  if (scrambles.some(job => job.element === element)) return
  const textRoot = element.matches('.mio-symbol-stat,.mio-site-stats>div') ? element.querySelector('dd') || element : element
  const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT)
  const candidates: { node: Text; original: string }[] = []
  while (walker.nextNode() && candidates.length < 8) {
    const node = walker.currentNode as Text
    if (!node.data.trim() || node.data.length > 64 || node.parentElement?.closest('svg,[aria-hidden="true"],.mio-scramble-wrap,script,style')) continue
    if (scrambles.some(job => job.nodes.some(item => item.node === node))) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    if (range.getClientRects().length !== 1) continue
    candidates.push({ node, original: node.data })
  }
  if (!candidates.length) return
  const nodes = candidates.map(({ node, original }) => prepareText(node, original))
  const numeric = nodes.every(item => /^[\s\d.,:/%-]+$/.test(item.original))
  const variant = numeric ? 0 : element.matches('.mio-current-list>li,.mio-interest-map>span') ? 2 : 1
  scrambles.push({ element, nodes, born: performance.now(), variant })
  while (scrambles.length > 6) restoreText(scrambles.shift()!)
  palette(); wake()
}
function disturb(element: Element, x: number, y: number, speed: number) {
  const rect = element.getBoundingClientRect()
  const distances = [Math.abs(y - rect.top), Math.abs(x - rect.right), Math.abs(y - rect.bottom), Math.abs(x - rect.left)]
  const nearest = Math.min(...distances)
  if (nearest > 36) return
  const edge = distances.indexOf(nearest)
  const vertical = edge === 1 || edge === 3
  const variant = element.matches('.mio-visual-card,.mio-visual-grid__card') ? 2 : element.matches('.vp-doc pre,.vp-doc table,.mio-empty') ? 1 : 0
  trails.push({ x: vertical ? (edge === 1 ? rect.right : rect.left) : Math.max(rect.left, Math.min(rect.right, x)), y: vertical ? Math.max(rect.top, Math.min(rect.bottom, y)) : (edge === 0 ? rect.top : rect.bottom), vertical, normal: edge === 0 || edge === 3 ? -1 : 1, length: Math.min(90, 46 + speed), born: performance.now(), variant })
  trails = trails.slice(-9)
  palette(); wake()
}
function pulseFrame(element: Element) {
  const rect = element.getBoundingClientRect()
  const now = performance.now()
  if (rect.width < 220 || rect.height < 100 || now - (lastFramePulse.get(element) ?? -2000) < 1100) return
  lastFramePulse.set(element, now)
  const variant = element.matches('.vp-doc pre,.vp-doc table,.mio-empty') ? 1
    : element.matches('.mio-visual-dialog__card,.mio-dashboard__visuals') ? 2
    : 0
  framePulses.push({ element, born: now, variant })
  framePulses = framePulses.slice(-3)
  palette(); wake()
}
function over(event: PointerEvent) {
  if (!active.value || event.pointerType === 'touch') return
  const target = targetFor(event.target)
  if (target === hovered) return
  hovered = target
  pointer = { x: event.clientX, y: event.clientY }
  if (!target || intro) return
  if (isSmall(target)) scramble(target)
  else { pulseFrame(target); disturb(target, pointer.x, pointer.y, 8) }
}
function move(event: PointerEvent) {
  if (!active.value || intro || event.pointerType === 'touch') return
  const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
  if (distance < 2 || performance.now() - lastMove < 24) return
  lastMove = performance.now()
  pointer = { x: event.clientX, y: event.clientY }
  const target = targetFor(event.target)
  if (target && !isSmall(target)) disturb(target, pointer.x, pointer.y, distance)
}
function leave() { hovered = null }
function click(event: MouseEvent) {
  if (!active.value) return
  if (intro && performance.now() - intro > 150) { intro = 0; wake() }
  const target = targetFor(event.target)
  if (target && isSmall(target)) scramble(target)
  else if (target) pulseFrame(target)
}
function focus(event: FocusEvent) {
  if (!active.value || intro) return
  const target = targetFor(event.target)
  if (target && isSmall(target)) scramble(target)
}
function glyph(context: CanvasRenderingContext2D, text: string, x: number, y: number, opacity: number, size = 12) {
  context.globalAlpha = Math.max(0, Math.min(1, opacity))
  context.font = `${size}px Consolas, monospace`
  context.fillStyle = ink
  context.fillText(text, x, y)
}
function drawTrail(context: CanvasRenderingContext2D, trail: Trail, now: number) {
  const p = (now - trail.born) / 360
  const opacity = (1 - p) ** 1.5 * .95
  for (let offset = -trail.length / 2; offset < trail.length / 2; offset += 9) {
    const falloff = 1 - Math.abs(offset) / (trail.length / 2)
    const displacement = trail.normal * (3 + hash(offset + 50) * 5 * (1 - p))
    const x = trail.x + (trail.vertical ? displacement : offset)
    const y = trail.y + (trail.vertical ? offset : displacement)
    if (trail.variant === 0) glyph(context, '/+×≡'[Math.floor(hash(offset + 40) * 4)], x, y, opacity * falloff, 12)
    else if (trail.variant === 1) {
      context.globalAlpha = opacity * falloff
      context.strokeStyle = ink
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + (trail.vertical ? 9 : 3), y + (trail.vertical ? 3 : -9)); context.stroke()
    } else glyph(context, '░▒▥'[Math.floor(hash(offset + 70) * 3)], x, y, opacity * falloff, 11)
  }
}
function drawFrame(context: CanvasRenderingContext2D, pulse: FramePulse, now: number) {
  const rect = pulse.element.getBoundingClientRect()
  const p = (now - pulse.born) / 950
  const envelope = Math.sin(Math.PI * p) ** .7
  const perimeter = 2 * (rect.width + rect.height)
  context.save()
  // Keep border effects away from the readable interior.
  context.beginPath()
  context.rect(rect.x - 12, rect.y - 12, rect.width + 24, rect.height + 24)
  context.rect(rect.x + 4, rect.y + 4, Math.max(0, rect.width - 8), Math.max(0, rect.height - 8))
  context.clip('evenodd')
  for (let d = 0; d < perimeter; d += 12) {
    let x = rect.x, y = rect.y, vertical = false
    if (d < rect.width) x += d
    else if (d < rect.width + rect.height) { x += rect.width; y += d - rect.width; vertical = true }
    else if (d < 2 * rect.width + rect.height) { x += 2 * rect.width + rect.height - d; y += rect.height }
    else { y += perimeter - d; vertical = true }
    const density = .4 + .6 * hash(d + Math.floor(p * 5))
    const opacity = envelope * density * .85
    if (pulse.variant === 0) glyph(context, '+/=[]'[Math.floor(hash(d) * 5)], x - 3, y + 4, opacity, 11)
    else if (pulse.variant === 1) {
      context.globalAlpha = opacity
      context.fillStyle = ink
      const length = 3 + hash(d) * 7
      context.fillRect(x - (vertical ? length / 2 : 1), y - (vertical ? 1 : length / 2), vertical ? length : 2, vertical ? 2 : length)
    } else if (pulse.variant === 2) glyph(context, '░▒▥▦'[Math.floor((hash(d) * 4 + p * 3) % 4)], x - 4, y + 4, opacity, 12)

  }
  context.restore()
}
function prepareText(node: Text, original: string): ScrambleNode {
  const wrapper = document.createElement('span')
  wrapper.className = 'mio-scramble-wrap'
  wrapper.style.cssText = 'position:relative;display:inline-block;vertical-align:baseline;white-space:pre;font:inherit;letter-spacing:inherit;'
  const source = document.createElement('span')
  // Keep the real text in flow, with its native font, baseline and accessible name.
  source.style.cssText = 'opacity:0;font:inherit;letter-spacing:inherit;'
  node.replaceWith(wrapper)
  source.append(node)
  wrapper.append(source)
  const origin = wrapper.getBoundingClientRect()
  const cells: HTMLSpanElement[] = []
  let offset = 0
  for (const char of Array.from(original)) {
    const range = document.createRange()
    range.setStart(node, offset)
    offset += char.length
    range.setEnd(node, offset)
    const rect = range.getBoundingClientRect()
    const cell = document.createElement('span')
    cell.setAttribute('aria-hidden', 'true')
    cell.style.cssText = `position:absolute;top:0;left:${rect.left - origin.left}px;width:${rect.width}px;white-space:pre;line-height:inherit;font:inherit;pointer-events:none;`
    cell.textContent = char
    wrapper.append(cell)
    cells.push(cell)
  }
  return { node, original, wrapper, cells }
}
function restoreText(job: Scramble) {
  for (const { node, wrapper } of job.nodes) {
    // Vue can update or remove the original node during navigation; never restore
    // a saved string over newer content or reinsert a removed node.
    if (wrapper.parentNode && wrapper.contains(node)) wrapper.replaceWith(node)
    else wrapper.remove()
  }
}
function updateScramble(job: Scramble, now: number) {
  const p = (now - job.born) / 600
  const resolved = Math.max(0, (p - .22) / .78)
  for (const { original, cells } of job.nodes) {
    const chars = Array.from(original)
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      const rank = job.variant === 0 ? (chars.length - i) / chars.length : job.variant === 2 ? (Math.abs(i - (chars.length - 1) / 2) + .5) / Math.max(1, chars.length / 2) : (i + 1) / chars.length
      const settled = /\s/.test(char) || rank <= resolved
      const set = job.variant === 0 ? '0123456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%+/=<>[]{}_*'
      cells[i].style.textAlign = settled ? 'left' : 'center'
      cells[i].textContent = settled ? char : set[Math.floor(hash(i + Math.floor(p * 12)) * set.length)]
    }
  }
}
function clearScrambles() {
  for (const job of scrambles) restoreText(job)
  scrambles = []
}
function draw(now: number) {
  raf = 0
  if (!active.value || !canvas.value || document.hidden) return
  if (now - lastPaint < 32) { wake(); return }
  lastPaint = now
  const context = canvas.value.getContext('2d')!
  context.clearRect(0, 0, width, height)
  framePulses = framePulses.filter(pulse => pulse.element.isConnected && now - pulse.born < 950)
  for (const pulse of framePulses) drawFrame(context, pulse, now)
  trails = trails.filter(trail => now - trail.born < 360)
  for (const trail of trails) drawTrail(context, trail, now)
  scrambles = scrambles.filter(job => {
    const valid = job.element.isConnected && now - job.born < 600 && job.nodes.every(item => item.node.data === item.original && item.wrapper.contains(item.node))
    if (!valid) restoreText(job)
    return valid
  })
  for (const job of scrambles) updateScramble(job, now)
  if (intro) {
    const p = (now - intro) / introDuration
    if (p >= 1) intro = 0
    else {
      context.globalAlpha = p < .78 ? .96 : .96 * (1 - p) / .22
      context.fillStyle = paper
      context.fillRect(0, 0, width, height)
      const unit = Math.min(8, width / 100)
      const originX = (width - 84 * unit) / 2
      const originY = height / 2 - 20 * unit
      const assembled = Math.min(1, p / .28)
      const scatter = p > .75 ? ((p - .75) / .25) ** 2 : 0
      for (const pixel of titlePixels) {
        const spread = (1 - assembled) ** 3 + scatter
        const x = originX + pixel.x * unit + (hash(pixel.seed) - .5) * width * spread
        const y = originY + pixel.y * unit + (hash(pixel.seed + 7) - .5) * height * spread
        glyph(context, symbol(pixel.seed, p < .28 ? p * 20 : 5), x, y, Math.min(1, p * 8) * (1 - scatter), Math.max(6, unit + 1))
      }
      context.globalAlpha = Math.min(1, p * 5) * (p < .78 ? 1 : (1 - p) / .22)
      context.fillStyle = ink
      context.font = '10px Consolas, monospace'
      context.textAlign = 'center'
      context.fillText('[ SYMBOL MODE / ON ]', width / 2, originY + 37 * unit)
      context.textAlign = 'left'
    }
  }
  context.globalAlpha = 1
  if (framePulses.length || trails.length || scrambles.length || intro) wake()
}
function clear() {
  cancelAnimationFrame(raf)
  raf = 0
  hovered = null
  trails = []
  framePulses = []
  clearScrambles()
  intro = 0
  canvas.value?.getContext('2d')?.clearRect(0, 0, width, height)
}
watch(active, async enabled => {
  clear()
  if (mounted) document.documentElement.classList.toggle('mio-symbol-mode', enabled)
  if (!enabled || !mounted) return
  await nextTick()
  resize(); palette(); makeTitle()
  intro = performance.now()
  wake()
})
watch(() => route.path, async () => {
  clear()
  if (!active.value) return
  await nextTick()
  const heading = document.querySelector('.VPContent h1,.mio-about__name')
  if (heading) scramble(heading)
})
function visibility() { if (document.hidden) clear() }
function scroll() { hovered = null; trails = []; framePulses = []; clearScrambles(); wake() }
onMounted(() => {
  mounted = true
  if (active.value) {
    document.documentElement.classList.add('mio-symbol-mode')
    resize(); palette(); makeTitle()
    intro = performance.now()
    wake()
  }
  document.addEventListener('pointerover', over, { passive: true })
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerleave', leave)
  document.addEventListener('click', click, true)
  document.addEventListener('focusin', focus)
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('resize', resize)
  window.addEventListener('scroll', scroll, { passive: true })
})
onBeforeUnmount(() => {
  clear()
  document.documentElement.classList.remove('mio-symbol-mode')
  document.removeEventListener('pointerover', over)
  document.removeEventListener('pointermove', move)
  document.removeEventListener('pointerleave', leave)
  document.removeEventListener('click', click, true)
  document.removeEventListener('focusin', focus)
  document.removeEventListener('visibilitychange', visibility)
  window.removeEventListener('resize', resize)
  window.removeEventListener('scroll', scroll)
})
</script>

<template>
  <Teleport to="body"><canvas v-if="active" ref="canvas" class="mio-symbol-experience" aria-hidden="true" /></Teleport>
</template>

<style scoped>
.mio-symbol-experience { position: fixed; z-index: 150; inset: 0; width: 100%; height: 100%; pointer-events: none; }
</style>
