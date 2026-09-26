<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../content.data'

type Filter = 'all' | 'thought' | 'dev' | 'game' | 'photo' | 'life'
type Wall = 'strip' | 'grid'

type Fragment = {
  id: string
  date: string
  text: string
  tag: Exclude<Filter, 'all'>
  image: string
  tone: string
  tilt: string
}

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'thought', label: '想法' },
  { key: 'dev', label: '技术' },
  { key: 'game', label: '游戏' },
  { key: 'photo', label: '影像' },
  { key: 'life', label: '生活' }
]

const walls: { key: Wall; label: string }[] = [
  { key: 'strip', label: '卡片带' },
  { key: 'grid', label: '网格' }
]

const props = withDefaults(defineProps<{ compact?: boolean; limit?: number }>(), {
  compact: false,
  limit: undefined
})

const fragmentKinds: Exclude<Filter, 'all'>[] = ['thought', 'dev', 'game', 'photo', 'life']
const tones: Record<Exclude<Filter, 'all'>, string> = { thought: 'rose', dev: 'blue', game: 'violet', photo: 'ochre', life: 'green' }
const tilts = ['-2deg', '2.5deg', '-1.5deg', '3deg', '-3deg']

const cards = computed<Fragment[]>(() => data
  .filter(item => item.category === 'fragments' && item.cover)
  .map((item, index) => {
    const tag = fragmentKinds.includes(item.kind as Exclude<Filter, 'all'>) ? item.kind as Exclude<Filter, 'all'> : 'photo'
    return {
      id: item.url,
      date: item.date.replaceAll('-', '.'),
      text: item.caption || item.title,
      tag,
      image: item.cover as string,
      tone: tones[tag],
      tilt: tilts[index % tilts.length]
    }
  }))

const filter = ref<Filter>('all')
const wall = ref<Wall>('strip')
const selectedId = ref<string | null>(null)
const track = ref<HTMLDivElement>()
const pointerStart = ref({ x: 0, scrollLeft: 0 })
const dragged = ref(false)
const dragging = ref(false)

const visible = computed(() => {
  const matched = filter.value === 'all' ? cards.value : cards.value.filter(card => card.tag === filter.value)
  return props.limit ? matched.slice(0, props.limit) : matched
})
const selected = computed(() => cards.value.find(card => card.id === selectedId.value))

function open(cardId: string) {
  if (!dragged.value) {
    selectedId.value = cardId
  }
}

function close() {
  selectedId.value = null
}

function random() {
  const pool = visible.value.length ? visible.value : cards.value
  if (!pool.length) return
  open(pool[Math.floor(Math.random() * pool.length)].id)
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

function startDrag(event: PointerEvent) {
  if (!track.value) return
  pointerStart.value = { x: event.clientX, scrollLeft: track.value.scrollLeft }
  dragged.value = false
  dragging.value = true
}

function drag(event: PointerEvent) {
  if (!track.value || !dragging.value) return
  const distance = event.clientX - pointerStart.value.x
  if (Math.abs(distance) > 10) dragged.value = true
  track.value.scrollLeft = pointerStart.value.scrollLeft - distance
}

function endDrag() {
  if (!dragging.value) return
  dragging.value = false
  window.setTimeout(() => { dragged.value = false }, 0)
}

function scrollWithWheel(event: WheelEvent) {
  if (!track.value) return
  track.value.scrollLeft += Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
}

onMounted(() => window.addEventListener('keydown', handleKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <section v-if="cards.length" class="mio-fragments" aria-label="碎片展示">
    <div v-if="!props.compact" class="mio-fragments__controls">
      <div class="mio-fragments__filters" aria-label="碎片类型筛选">
        <button v-for="item in filters" :key="item.key" type="button" :class="{ active: filter === item.key }" @click="filter = item.key">{{ item.label }}</button>
      </div>
      <button class="mio-fragments__random" type="button" aria-label="随机碎片" title="随机碎片" @click="random">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4"/><path d="M4 7h4c5 0 5 10 10 10h2"/><path d="m16 13 4 4-4 4"/><path d="M4 17h4c1.3 0 2.2-.7 3-1.7"/></svg>
      </button>
    </div>

    <section class="mio-visual-fragments" aria-labelledby="visual-fragments-title">
      <div v-if="!props.compact" class="mio-visual-fragments__heading">
        <h2 id="visual-fragments-title" class="visually-hidden">影像碎片</h2>
        <div class="mio-wall-switch" aria-label="影像碎片布局">
          <button v-for="item in walls" :key="item.key" type="button" :class="{ active: wall === item.key }" :aria-label="item.label" :title="item.label" @click="wall = item.key">
            <svg v-if="item.key === 'strip'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="6" width="7" height="12" rx="1"/><rect x="8.5" y="6" width="7" height="12" rx="1"/><rect x="14" y="6" width="7" height="12" rx="1"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>
          </button>
        </div>
      </div>

      <div v-if="wall === 'strip'" ref="track" class="mio-visual-fragments__track" aria-label="横向影像碎片卡片带" @pointerdown="startDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag" @wheel.prevent="scrollWithWheel">
        <button v-for="card in visible" :key="card.id" class="mio-visual-card" :class="`mio-visual-card--${card.tone}`" :style="{ '--mio-card-tilt': card.tilt }" type="button" :aria-label="`查看 ${card.date} 的碎片`" @click="open(card.id)">
          <img class="mio-visual-card__image" :src="withBase(card.image)" alt="" />
          <span class="mio-visual-card__meta"><time>{{ card.date }}</time><b>{{ card.text }}</b></span>
        </button>
      </div>

      <div v-else class="mio-visual-grid" aria-label="网格影像碎片">
        <button v-for="card in visible" :key="card.id" class="mio-visual-grid__card" :class="`mio-visual-card--${card.tone}`" type="button" :aria-label="`查看 ${card.date} 的碎片`" @click="open(card.id)">
          <img :src="withBase(card.image)" alt="" />
          <small>{{ card.date }}</small>
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="selected" class="mio-visual-dialog" role="dialog" aria-modal="true" :aria-label="`${selected.date} 的碎片，点击关闭`" @click="close">
        <div class="mio-visual-dialog__card" :class="`mio-visual-card--${selected.tone}`">
          <img :src="withBase(selected.image)" alt="" />
          <small>{{ selected.date }}</small>
        </div>
      </div>
    </Teleport>
  </section>
</template>
