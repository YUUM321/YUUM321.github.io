import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderer, h } from 'vue'
import { provideSymbolInteractions, useSymbolInteractions } from '../docs/.vitepress/composables/symbolInteractions.ts'

const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null
})

function mount({ saved = null, reduced = false, blockedStorage = false } = {}) {
  const listeners = new Map()
  const motionListeners = new Set()
  const media = {
    matches: reduced,
    addEventListener: (_, fn) => motionListeners.add(fn),
    removeEventListener: (_, fn) => motionListeners.delete(fn)
  }
  let persisted = saved
  globalThis.window = {
    matchMedia: () => media,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name)
  }
  globalThis.localStorage = {
    getItem() { if (blockedStorage) throw Error('blocked'); return persisted },
    setItem(_, value) { if (blockedStorage) throw Error('blocked'); persisted = value }
  }
  let state
  let consumer
  const Child = { setup() { consumer = useSymbolInteractions(); return () => null } }
  const app = renderer.createApp({ setup() { state = provideSymbolInteractions(); return () => h(Child) } })
  app.mount({})
  return {
    state, consumer, persisted: () => persisted,
    motion(value) { media.matches = value; for (const fn of motionListeners) fn() },
    storage(key, value) { listeners.get('storage')?.({ key, newValue: value }) },
    cleanup() {
      app.unmount()
      assert.equal(motionListeners.size, 0)
      assert.equal(listeners.size, 0)
      delete globalThis.window
      delete globalThis.localStorage
    }
  }
}

test('symbols default off; toggling shares and persists the choice', () => {
  const app = mount()
  try {
    assert.equal(app.state.active.value, false)
    app.state.toggle()
    assert.equal(app.consumer.active.value, true)
    assert.equal(app.persisted(), 'on')
    app.state.toggle()
    assert.equal(app.persisted(), 'off')
  } finally { app.cleanup() }
})

test('saved preference is restored; another tab can turn it off or clear it', () => {
  const app = mount({ saved: 'on' })
  try {
    assert.equal(app.state.active.value, true)
    app.storage('unrelated-key', 'off')
    assert.equal(app.state.active.value, true)
    app.storage('mio-symbol-interactions', 'off')
    assert.equal(app.state.active.value, false)
    app.state.toggle()
    app.storage(null, null)
    assert.equal(app.state.active.value, false)
  } finally { app.cleanup() }
})

test('the explicit symbol-mode choice stays enabled regardless of the system motion setting', () => {
  const app = mount({ saved: 'on', reduced: true })
  try {
    assert.equal(app.state.active.value, true)
    app.state.toggle()
    assert.equal(app.persisted(), 'off')
    assert.equal(app.state.active.value, false)
  } finally { app.cleanup() }
})

test('unavailable storage does not break toggling or normal page use', () => {
  const app = mount({ blockedStorage: true })
  try {
    assert.equal(app.state.active.value, false)
    assert.doesNotThrow(() => app.state.toggle())
    assert.equal(app.state.active.value, true)
  } finally { app.cleanup() }
})
