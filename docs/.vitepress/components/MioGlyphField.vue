<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSymbolInteractions } from '../composables/symbolInteractions'

const props = withDefaults(defineProps<{
  kind: 'panel' | 'image' | 'stat'
  src?: string
  text?: string
  autoplay?: boolean
}>(), { autoplay: false })
const { active } = useSymbolInteractions()
const canvas = ref<HTMLCanvasElement>()
const playing = ref(false)
const glyphs = ['·:˙', '+×/\\', '=≡<>', '░∷∴', '▒#%','▓▥▦', '█▆▇']
let frame = 0
let generation = 0
let sample: HTMLImageElement | null = null
let disposed = false

function stop() {
  generation++
  cancelAnimationFrame(frame)
  playing.value = false
}

async function play(reverse = false) {
  stop()
  if (!active.value || !canvas.value || document.hidden) return
  const token = generation
  const target = canvas.value
  // Read pixels only from the same image that the user is opening. If it cannot
  // be sampled (e.g. a remote image without CORS), use a neutral character field.
  if (props.kind === 'image' && props.src && !sample) {
    const image = new Image()
    image.src = props.src
    try { await image.decode(); sample = image } catch {}
    if (disposed || generation !== token || !active.value) return
  }
  const bounds = target.getBoundingClientRect()
  const width = bounds.width
  const height = bounds.height
  if (!width || !height) return
  const context = target.getContext('2d')
  if (!context) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  target.width = Math.ceil(width * dpr)
  target.height = Math.ceil(height * dpr)
  context.scale(dpr, dpr)
  const styles = getComputedStyle(target)
  const ink = styles.getPropertyValue('--vp-c-text-1').trim() || '#202124'
  const paper = styles.getPropertyValue('--vp-c-bg').trim() || '#fff'
  const dark = document.documentElement.classList.contains('dark')
  const cell = props.kind === 'stat' ? 5 : props.kind === 'image' ? Math.max(7, width / 64) : 10
  const rowHeight = cell * 1.3
  const columns = Math.ceil(width / cell)
  const rows = Math.ceil(height / rowHeight)
  let pixels: Uint8ClampedArray | undefined
  if (props.kind !== 'panel') {
    const raster = document.createElement('canvas')
    raster.width = columns
    raster.height = rows
    const source = raster.getContext('2d', { willReadFrequently: true })!
    source.fillStyle = props.kind === 'image' && dark ? '#000' : '#fff'
    source.fillRect(0, 0, columns, rows)
    if (props.kind === 'stat') {
      source.fillStyle = '#000'
      source.font = `600 ${Math.min(height - 2, 36) / rowHeight}px Consolas, monospace`
      source.textBaseline = 'bottom'
      source.fillText(props.text || '0', 0, rows)
    } else if (sample) {
      const scale = Math.min(width / sample.naturalWidth, height / sample.naturalHeight)
      const w = sample.naturalWidth * scale / cell
      const h = sample.naturalHeight * scale / rowHeight
      source.drawImage(sample, (columns - w) / 2, (rows - h) / 2, w, h)
    }
    try { pixels = source.getImageData(0, 0, columns, rows).data } catch {}
  }
  playing.value = true
  const duration = props.kind === 'image' ? 760 : props.kind === 'panel' ? (reverse ? 300 : 520) : 460
  const started = performance.now()
  let lastDraw = -1
  function draw(now: number) {
    if (!active.value || generation !== token || document.hidden) { stop(); return }
    const progress = Math.min(1, (now - started) / duration)
    if (progress >= 1) { stop(); return }
    // Character fields update at 30 fps; no work remains between interactions.
    const step = Math.floor((now - started) / 33)
    if (step !== lastDraw) {
      lastDraw = step
      context!.clearRect(0, 0, width, height)
      context!.font = `${cell + 1}px Consolas, monospace`
      context!.textBaseline = 'middle'
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const noise = ((x * 73 + y * 151 + x * y * 19) % 101) / 100
          const position = props.kind === 'panel' ? x / columns : (y / rows * .72 + x / columns * .28)
          const scan = reverse ? 1 - progress : progress
          const distance = position - scan
          const edge = Math.max(0, 1 - Math.abs(distance) / .22)
          const dissolve = Math.max(0, Math.min(1, (position - progress * 1.4 + .4) * 5))
          const opacity = props.kind === 'panel' ? edge * Math.min(1, (1 - progress) * 5) : dissolve
          if (opacity < .02) continue
          let density = noise * .55
          if (pixels) {
            const offset = (y * columns + x) * 4
            const light = (pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722) / 255
            density = props.kind === 'image' && dark ? light : 1 - light
          }
          context!.globalAlpha = opacity
          context!.fillStyle = paper
          context!.fillRect(x * cell, y * rowHeight, cell + .5, rowHeight + .5)
          if (density < .06 && edge < .45) continue
          const shift = edge > .6 ? (step + x + y) % 3 : 0
          const index = Math.min(glyphs.length - 1, Math.max(0, Math.round(density * 6) - shift))
          context!.fillStyle = ink
          context!.globalAlpha = opacity * (props.kind === 'panel' ? .65 : .88)
          const group = glyphs[index]
          context!.fillText(group[(x + y + Math.floor(step / 3)) % group.length], x * cell, y * rowHeight + rowHeight / 2)
        }
      }
      context!.globalAlpha = 1
    }
    frame = requestAnimationFrame(draw)
  }
  frame = requestAnimationFrame(draw)
}

onMounted(() => { if (props.autoplay) void play() })
onBeforeUnmount(() => { disposed = true; stop() })
defineExpose({ play, stop })
</script>

<template>
  <canvas ref="canvas" class="mio-glyph-field" :class="{ 'is-playing': playing }" aria-hidden="true" />
</template>

<style scoped>
.mio-glyph-field { position: absolute; z-index: 3; inset: 0; display: block; width: 100%; height: 100%; pointer-events: none; opacity: 0; }
.mio-glyph-field.is-playing { opacity: 1; }
</style>
