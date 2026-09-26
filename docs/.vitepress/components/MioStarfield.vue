<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement>()
let disposeSky: (() => void) | undefined
let disposed = false

const paused = ref(false)
const meteors = ref<{ id: number; style: Record<string, string> }[]>([])
let motion: MediaQueryList | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let nextMeteorId = 0

function createMeteor() {
  const bounds = canvas.value?.getBoundingClientRect()
  const width = bounds?.width || window.innerWidth
  const height = bounds?.height || window.innerHeight
  // Choose a visible point along the path anywhere in the sky, not just its upper-right corner.
  const centerX = width * (.06 + Math.random() * .88)
  const centerY = height * (.06 + Math.random() * .88)
  const angle = (18 + Math.random() * 54) * Math.PI / 180
  const distance = Math.min(width, height, 850) * (.28 + Math.random() * .38)
  const dx = Math.cos(angle) * distance * (Math.random() < .5 ? -1 : 1)
  const dy = Math.sin(angle) * distance
  return {
    id: nextMeteorId++,
    style: {
      left: `${centerX - dx * .35}px`,
      top: `${centerY - dy * .35}px`,
      '--meteor-length': `${Math.min(width * .42, 90 + Math.random() * 125)}px`,
      '--meteor-width': `${.6 + Math.random() * .45}px`,
      '--meteor-core': `${1.2 + Math.random() * .7}px`,
      '--meteor-dx': `${dx}px`,
      '--meteor-dy': `${dy}px`,
      '--meteor-angle': `${Math.atan2(-dy, -dx) * 180 / Math.PI}deg`,
      '--meteor-duration': `${.85 + Math.random() * .8}s`,
      '--meteor-opacity': `${.55 + Math.random() * .3}`
    }
  }
}

function scheduleMeteor() {
  clearTimeout(timer)
  if (paused.value || disposed) return
  // Exponential intervals allow natural quiet gaps and close successive passes.
  const delay = 250 - Math.log1p(-Math.random()) * 1800
  timer = setTimeout(() => {
    if (paused.value || disposed) return
    if (meteors.value.length < 4) meteors.value.push(createMeteor())
    scheduleMeteor()
  }, delay)
}

function finishMeteor(id: number) {
  meteors.value = meteors.value.filter(meteor => meteor.id !== id)
}

function syncMotion() {
  paused.value = document.hidden || Boolean(motion?.matches)
  meteors.value = []
  scheduleMeteor()
}

onMounted(async () => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncMotion)
  document.addEventListener('visibilitychange', syncMotion)
  syncMotion()
  try {
    const { mountSky } = await import('../sky/render')
    if (disposed || !canvas.value) return
    disposeSky = mountSky(canvas.value)
  } catch (error) {
    console.error('Unable to load the sky chart:', error)
  }
})

onBeforeUnmount(() => {
  disposed = true
  disposeSky?.()
  clearTimeout(timer)
  motion?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', syncMotion)
})
</script>

<template>
  <div class="mio-starfield" :class="{ 'is-paused': paused }" aria-hidden="true">
    <canvas ref="canvas" class="mio-sky-canvas" />
    <span v-for="meteor in meteors" :key="meteor.id" class="mio-meteor" :style="meteor.style" @animationend.self="finishMeteor(meteor.id)" />
  </div>
</template>

<style scoped>
.mio-starfield {
  --star-ink: 38, 38, 38;
  position: fixed;
  inset: 0;
  top: var(--vp-nav-height);
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  contain: strict;
}

.dark .mio-starfield { --star-ink: 222, 222, 222; }

.mio-sky-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.mio-meteor {
  position: absolute;
  width: var(--meteor-length);
  height: var(--meteor-width);
  transform-origin: left center;
  opacity: 0;
  animation: mio-meteor-pass var(--meteor-duration) linear both;
}

.mio-meteor::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(var(--star-ink), .85), rgba(var(--star-ink), .32) 28%, rgba(var(--star-ink), .08) 65%, transparent);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  content: '';
}

.mio-meteor::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--meteor-core);
  height: var(--meteor-core);
  border-radius: 50%;
  background: rgba(var(--star-ink), .85);
  transform: translate(-50%, -50%);
  content: '';
}

@keyframes mio-meteor-pass {
  0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(var(--meteor-angle)) scaleX(.3); }
  16% { opacity: var(--meteor-opacity); }
  58% { opacity: var(--meteor-opacity); }
  100% { opacity: 0; transform: translate3d(var(--meteor-dx), var(--meteor-dy), 0) rotate(var(--meteor-angle)) scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .mio-meteor { display: none; }
}

@media print {
  .mio-starfield { display: none; }
}
</style>
