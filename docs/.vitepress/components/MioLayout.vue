<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useRoute, withBase } from 'vitepress'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const route = useRoute()
const open = ref(true)
const desktop = ref(true)
const panel = ref<HTMLElement>()
const recentActivity = ref<{ date: string; repo: string; url: string }[]>([])
const preferenceKey = 'mio-profile-expanded'
let media: MediaQueryList | undefined
let titleControl: HTMLAnchorElement | null = null
let previousOverflow = ''
let locked = false

function setScrollLock() {
  if (!desktop.value && open.value && !locked) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    locked = true
  } else if ((desktop.value || !open.value) && locked) {
    document.body.style.overflow = previousOverflow
    locked = false
  }
}

function syncViewport() {
  desktop.value = media?.matches ?? true
  let saved = true
  try { saved = localStorage.getItem(preferenceKey) !== 'false' } catch {}
  open.value = desktop.value && saved
  setScrollLock()
}

async function setOpen(value: boolean, restoreFocus = true) {
  open.value = value
  titleControl?.setAttribute('aria-expanded', String(value))
  if (desktop.value) {
    try { localStorage.setItem(preferenceKey, String(value)) } catch {}
  }
  setScrollLock()
  await nextTick()
  if (value && !desktop.value) panel.value?.focus()
  else if (!value && restoreFocus) titleControl?.focus()
}

function toggleFromTitle(event: MouseEvent) {
  event.preventDefault()
  void setOpen(!open.value)
}

function toggleFromTitleKey(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    void setOpen(!open.value)
  }
}

function connectTitleControl() {
  titleControl = document.querySelector<HTMLAnchorElement>('.VPNavBarTitle .title')
  if (!titleControl) return
  titleControl.removeAttribute('href')
  titleControl.setAttribute('role', 'button')
  titleControl.setAttribute('tabindex', '0')
  titleControl.setAttribute('aria-controls', 'mio-profile-panel')
  titleControl.setAttribute('aria-expanded', String(open.value))
  titleControl.setAttribute('aria-label', '展开个人区域')
  titleControl.addEventListener('click', toggleFromTitle)
  titleControl.addEventListener('keydown', toggleFromTitleKey)
}

async function loadRecentActivity() {
  try {
    const response = await fetch('https://api.github.com/users/YUUM321/events/public?per_page=3')
    if (!response.ok) return
    const events = await response.json() as { repo?: { name?: string; url?: string }; created_at?: string }[]
    recentActivity.value = events
      .filter(event => event.repo?.name && event.created_at && event.repo.name !== 'YUUM321/YUUM321.github.io')
      .map(event => ({
        date: new Date(event.created_at as string).toISOString().slice(5, 10).replace('-', '.'),
        repo: (event.repo?.name as string).replace(/^YUUM321\//, ''),
        url: (event.repo?.url as string).replace('api.github.com/repos', 'github.com')
      }))
  } catch {}
}

function handlePanelKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    void setOpen(false)
  }
  if (event.key === 'Tab' && !desktop.value) {
    // The profile currently has one interactive control: its close button.
    event.preventDefault()
    panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
  }
}

watch(() => route.path, () => {
  if (!desktop.value && open.value) void setOpen(false, false)
})

onMounted(() => {
  media = window.matchMedia('(min-width: 960px)')
  syncViewport()
  media.addEventListener('change', syncViewport)
  connectTitleControl()
  void loadRecentActivity()
})
onBeforeUnmount(() => {
  media?.removeEventListener('change', syncViewport)
  titleControl?.removeEventListener('click', toggleFromTitle)
  titleControl?.removeEventListener('keydown', toggleFromTitleKey)
  if (locked) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <div class="mio-shell" :class="{ 'profile-open': open }">
    <DefaultTheme.Layout>
      <template #nav-bar-content-after>
        <a class="mio-github" href="https://github.com/YUUM321" target="_blank" rel="noreferrer" aria-label="GitHub：YUUM321（新窗口）" title="GitHub">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.86c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
        </a>
      </template>
      <template #layout-top>
        <div v-if="open && !desktop" class="mio-profile-backdrop" @click="setOpen(false)" />
        <aside v-if="open" id="mio-profile-panel" ref="panel" class="mio-profile-panel" :role="desktop ? undefined : 'dialog'" :aria-modal="desktop ? undefined : true" aria-labelledby="mio-profile-heading" tabindex="-1" @keydown="handlePanelKey">
          <div class="mio-profile-panel__header">
            <button class="mio-profile-close" type="button" aria-label="关闭" @click="setOpen(false)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
          </div>
          <div class="mio-profile-identity">
            <div class="mio-avatar"><img :src="withBase('/images/mio-avatar.png')" alt="mio 的头像" /></div>
            <h2 id="mio-profile-heading">mio</h2>
          </div>
          <section class="mio-profile-section" aria-labelledby="mio-now-title">
            <h3 id="mio-now-title">最近在做</h3>
            <ul><li>KWS</li><li>Linux 驱动</li><li>BPS</li></ul>
          </section>
          <section v-if="recentActivity.length" class="mio-profile-section" aria-labelledby="mio-recent-title">
            <h3 id="mio-recent-title">最近活动</h3>
            <ul class="mio-recent-activity"><li v-for="item in recentActivity" :key="`${item.date}-${item.repo}`"><time>{{ item.date }}</time><a :href="item.url" target="_blank" rel="noreferrer">{{ item.repo }}</a></li></ul>
          </section>
          <div class="mio-profile-links"><a href="https://github.com/YUUM321" target="_blank" rel="noreferrer">GitHub ↗</a></div>
          <p class="mio-profile-updated">更新于 2026.09</p>
        </aside>
      </template>
    </DefaultTheme.Layout>
  </div>
</template>

