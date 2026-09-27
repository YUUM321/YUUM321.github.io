import { computed, inject, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'

const preferenceKey = 'mio-symbol-interactions'
type SymbolInteractions = {
  active: ComputedRef<boolean>
  toggle: () => void
}
const key: InjectionKey<SymbolInteractions> = Symbol('mio-symbol-interactions')

// Each layout owns its state, keeping SSR requests and mounted apps isolated.
export function provideSymbolInteractions() {
  const requested = ref(false)
  const active = computed(() => requested.value)
  const syncPreference = (event: StorageEvent) => {
    if (event.key === preferenceKey || event.key === null) requested.value = event.newValue === 'on'
  }
  const toggle = () => {
    requested.value = !requested.value
    try { localStorage.setItem(preferenceKey, requested.value ? 'on' : 'off') } catch {}
  }

  onMounted(() => {
    try { requested.value = localStorage.getItem(preferenceKey) === 'on' } catch {}
    window.addEventListener('storage', syncPreference)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('storage', syncPreference)
  })
  const interactions = { active, toggle }
  provide(key, interactions)
  return interactions
}

export function useSymbolInteractions() {
  return inject(key, { active: computed(() => false), toggle() {} })
}
