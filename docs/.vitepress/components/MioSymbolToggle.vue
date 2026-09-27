<script setup lang="ts">
import { computed } from 'vue'
import { useSymbolInteractions } from '../composables/symbolInteractions'

const { active, toggle } = useSymbolInteractions()
const hint = computed(() => `符号交互 · ${active.value ? '已开启' : '已关闭'}`)
</script>

<template>
  <div class="mio-symbol-toggle">
    <button type="button" role="switch" aria-label="符号交互" :aria-checked="active" :title="hint" @click="toggle">
      <span :key="String(active)" class="mio-symbol-toggle__matrix" aria-hidden="true"><i>░</i><i>▒</i><i>█</i></span>
      <span class="mio-symbol-toggle__dot" aria-hidden="true" />
    </button>
    <span class="mio-symbol-toggle__hint" aria-hidden="true">{{ hint }}</span>
    <span class="visually-hidden" role="status">{{ hint }}</span>
  </div>
</template>

<style scoped>
.mio-symbol-toggle { position: relative; display: flex; flex-shrink: 0; align-items: center; margin-left: 10px; }
button { position: relative; display: grid; place-items: center; width: 38px; height: 34px; border: 1px solid var(--vp-c-divider); border-radius: 5px; color: var(--vp-c-text-3); cursor: pointer; }
button:hover, button[aria-checked="true"] { color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); border-color: var(--vp-c-text-3); }
button[aria-disabled="true"] { opacity: .55; cursor: default; }
.mio-symbol-toggle__matrix { display: flex; font: 12px/1 var(--vp-font-family-mono); }
.mio-symbol-toggle__matrix i { font-style: normal; }
button[aria-checked="true"] i { animation: mio-symbol-switch 450ms steps(4, end) both; }
button[aria-checked="true"] i:nth-child(2) { animation-delay: 60ms; }
button[aria-checked="true"] i:nth-child(3) { animation-delay: 120ms; }
.mio-symbol-toggle__dot { position: absolute; right: 3px; bottom: 3px; width: 3px; height: 3px; border: 1px solid currentColor; }
button[aria-checked="true"] .mio-symbol-toggle__dot { background: currentColor; }
.mio-symbol-toggle__hint { position: absolute; top: calc(100% + 12px); right: 0; width: max-content; max-width: min(260px, 80vw); padding: 7px 10px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-2); font-size: 11px; line-height: 1.5; opacity: 0; pointer-events: none; }
.mio-symbol-toggle:hover .mio-symbol-toggle__hint, .mio-symbol-toggle:focus-within .mio-symbol-toggle__hint { opacity: 1; }
@keyframes mio-symbol-switch { 0% { opacity: .15; transform: translateY(3px); } 50% { opacity: .65; transform: translateY(-2px); } 100% { opacity: 1; transform: none; } }
@media (max-width: 599px) { .mio-symbol-toggle { margin-left: 4px; } button { width: 32px; } .mio-symbol-toggle__matrix { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { button[aria-checked="true"] i { animation: none; } }
</style>
