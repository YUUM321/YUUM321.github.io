<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

type Suit = '♠' | '♥' | '♦' | '♣'
type Card = { id: number; rank: number; suit: Suit; faceUp: boolean }
type Source = { pile: 'tableau'; column: number; index: number } | { pile: 'waste' }

const suits: Suit[] = ['♠', '♥', '♦', '♣']
const stock = ref<Card[]>([])
const waste = ref<Card[]>([])
const tableau = ref<Card[][]>(Array.from({ length: 7 }, () => []))
const foundations = ref<Card[][]>(Array.from({ length: 4 }, () => []))
const selected = ref<Source | null>(null)
const moves = ref(0)
const elapsed = ref(0)
const recycleCount = ref(0)
const won = ref(false)
let clock = 0

const time = computed(() => `${String(Math.floor(elapsed.value / 60)).padStart(2, '0')}:${String(elapsed.value % 60).padStart(2, '0')}`)
const rankNames = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const isRed = (card: Card) => card.suit === '♥' || card.suit === '♦'
const cardLabel = (card: Card) => `${rankNames[card.rank]}${card.suit}`

function newGame() {
  const deck: Card[] = suits.flatMap((suit, suitIndex) => Array.from({ length: 13 }, (_, index) => ({ id: suitIndex * 13 + index, rank: index + 1, suit, faceUp: false })))
  for (let index = deck.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[swap]] = [deck[swap], deck[index]]
  }
  tableau.value = Array.from({ length: 7 }, (_, column) => deck.splice(0, column + 1).map((card, index, pile) => ({ ...card, faceUp: index === pile.length - 1 })))
  stock.value = deck
  waste.value = []
  foundations.value = Array.from({ length: 4 }, () => [])
  selected.value = null
  moves.value = 0
  elapsed.value = 0
  recycleCount.value = 0
  won.value = false
}

function draw() {
  selected.value = null
  if (stock.value.length) {
    for (let count = 0; count < 3 && stock.value.length; count++) {
      const card = stock.value.pop()!
      waste.value.push({ ...card, faceUp: true })
    }
  } else if (waste.value.length) {
    stock.value = waste.value.reverse().map(card => ({ ...card, faceUp: false }))
    waste.value = []
    recycleCount.value++
  }
}

function sourceCards(source: Source): Card[] {
  return source.pile === 'waste' ? (waste.value.length ? [waste.value.at(-1)!] : []) : tableau.value[source.column].slice(source.index)
}

function canPlace(cards: Card[], target: { pile: 'tableau'; column: number } | { pile: 'foundation'; index: number }) {
  const card = cards[0]
  if (!card) return false
  if (target.pile === 'foundation') {
    const pile = foundations.value[target.index]
    return cards.length === 1 && (pile.length ? pile.at(-1)!.suit === card.suit && pile.at(-1)!.rank + 1 === card.rank : card.rank === 1)
  }
  const pile = tableau.value[target.column]
  const top = pile.at(-1)
  return top ? top.faceUp && isRed(top) !== isRed(card) && top.rank === card.rank + 1 : card.rank === 13
}

function removeSource(source: Source): Card[] {
  if (source.pile === 'waste') return [waste.value.pop()!]
  const moved = tableau.value[source.column].splice(source.index)
  const newlyExposed = tableau.value[source.column].at(-1)
  if (newlyExposed) newlyExposed.faceUp = true
  return moved
}

function completeMove(target: { pile: 'tableau'; column: number } | { pile: 'foundation'; index: number }) {
  if (!selected.value) return false
  const cards = sourceCards(selected.value)
  if (!canPlace(cards, target)) return false
  const moved = removeSource(selected.value)
  if (target.pile === 'tableau') tableau.value[target.column].push(...moved)
  else foundations.value[target.index].push(...moved)
  selected.value = null
  moves.value++
  won.value = foundations.value.every(pile => pile.length === 13)
  return true
}

function selectTableau(column: number, index: number) {
  const card = tableau.value[column][index]
  if (!card?.faceUp) return
  if (selected.value?.pile === 'tableau' && selected.value.column === column && selected.value.index === index) {
    selected.value = null
    return
  }
  if (selected.value && completeMove({ pile: 'tableau', column })) return
  selected.value = { pile: 'tableau', column, index }
}

function selectWaste() {
  if (!waste.value.length) return
  if (selected.value?.pile === 'waste') { selected.value = null; return }
  selected.value = { pile: 'waste' }
}

function foundationClick(index: number) {
  if (selected.value) completeMove({ pile: 'foundation', index })
}

function cardClass(card: Card) {
  const isSelected = selected.value?.pile === 'waste'
    ? waste.value.at(-1)?.id === card.id
    : selected.value?.pile === 'tableau'
      ? tableau.value[selected.value.column][selected.value.index]?.id === card.id
      : false
  return { 'is-red': isRed(card), 'is-selected': isSelected }
}

onMounted(() => {
  newGame()
  clock = window.setInterval(() => { if (!won.value) elapsed.value++ }, 1000)
})
onBeforeUnmount(() => window.clearInterval(clock))
</script>

<template>
  <div class="mio-solitaire-page">
    <main class="solitaire-case">
      <header class="solitaire-header">
        <div class="solitaire-brand"><b>mio</b><span>POCKET / 03</span></div>
        <a :href="withBase('/')" class="solitaire-home" aria-label="返回首页" title="返回首页">↗</a>
      </header>

      <section class="solitaire-screen" aria-label="纸牌接龙游戏">
        <div class="solitaire-title"><h1>SOLITAIRE</h1><span><i :class="{ active: !won }" />{{ won ? '已通关' : '三张抽牌' }}</span></div>
        <dl class="solitaire-stats">
          <div><dt>步数 / MOVES</dt><dd>{{ String(moves).padStart(3, '0') }}</dd></div>
          <div><dt>时间 / TIME</dt><dd>{{ time }}</dd></div>
          <div><dt>回收 / REDEALS</dt><dd>{{ String(recycleCount).padStart(2, '0') }}</dd></div>
        </dl>

        <div class="solitaire-top-row">
          <div class="solitaire-pair">
            <button class="card-slot stock-slot" type="button" :aria-label="stock.length ? `牌库，剩余 ${stock.length} 张，抽三张` : waste.length ? '收回废牌堆' : '牌库为空'" :disabled="!stock.length && !waste.length" @click="draw">
              <span v-if="stock.length" class="card-back"><i>m</i></span><span v-else class="slot-mark">{{ waste.length ? '↺' : '·' }}</span>
            </button>
            <div class="waste-stack" :class="{ 'waste-empty': !waste.length }" aria-label="废牌堆">
              <button v-if="!waste.length" class="waste-empty-slot" type="button" aria-label="空废牌堆" disabled><span class="slot-mark">·</span></button>
              <button v-for="(card, index) in waste.slice(-3)" :key="card.id" class="playing-card waste-card" :class="cardClass(card)" :style="{ left: `${index * 12}px`, zIndex: index + 1 }" type="button" :aria-label="index === Math.min(2, waste.length - 1) ? `废牌堆顶牌 ${cardLabel(card)}` : `废牌 ${cardLabel(card)}`" :disabled="index !== Math.min(2, waste.length - 1)" @click="selectWaste"><b>{{ rankNames[card.rank] }}<i>{{ card.suit }}</i></b><strong>{{ card.suit }}</strong><b class="card-corner-bottom">{{ rankNames[card.rank] }}<i>{{ card.suit }}</i></b></button>
            </div>
          </div>
          <div class="foundation-row" aria-label="收牌区">
            <button v-for="(pile, index) in foundations" :key="index" class="card-slot foundation-slot" type="button" :aria-label="pile.length ? `收牌堆 ${cardLabel(pile[pile.length - 1])}` : '空收牌堆'" @click="foundationClick(index)">
              <span v-if="pile.length" class="playing-card" :class="{ 'is-red': isRed(pile[pile.length - 1]) }"><b>{{ rankNames[pile[pile.length - 1].rank] }}<i>{{ pile[pile.length - 1].suit }}</i></b><strong>{{ pile[pile.length - 1].suit }}</strong><b class="card-corner-bottom">{{ rankNames[pile[pile.length - 1].rank] }}<i>{{ pile[pile.length - 1].suit }}</i></b></span>
              <span v-else class="slot-mark">{{ ['♠', '♥', '♦', '♣'][index] }}</span>
            </button>
          </div>
        </div>

        <div class="tableau" :style="{ minHeight: `calc(var(--tableau-base-height) + ${Math.max(0, Math.max(...tableau.map(pile => pile.length)) - 7) * 19}px)` }" aria-label="七列牌桌">
          <div v-for="(pile, column) in tableau" :key="column" class="tableau-column" :aria-label="`第 ${column + 1} 列`">
            <button v-if="!pile.length" class="empty-column" type="button" :aria-label="`第 ${column + 1} 列为空，放置 K`" @click="completeMove({ pile: 'tableau', column })"><span>·</span></button>
            <button v-for="(card, index) in pile" :key="card.id" class="playing-card tableau-card" :class="[card.faceUp ? cardClass(card) : 'card-facedown']" :style="{ top: `${index * 19}px`, zIndex: index + 1 }" type="button" :aria-label="card.faceUp ? cardLabel(card) : '暗牌'" :disabled="!card.faceUp" @click="selectTableau(column, index)">
              <template v-if="card.faceUp"><b>{{ rankNames[card.rank] }}<i>{{ card.suit }}</i></b><strong>{{ card.suit }}</strong><b class="card-corner-bottom">{{ rankNames[card.rank] }}<i>{{ card.suit }}</i></b></template>
              <span v-else class="card-back"><i>m</i></span>
            </button>
          </div>
        </div>
        <div v-if="won" class="win-note" role="status">漂亮的一局。所有牌都已归位。</div>
      </section>

      <div class="solitaire-actions">
        <button type="button" aria-label="新牌局" title="新牌局" @click="newGame">↺</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.mio-solitaire-page { padding: 28px 14px 48px; }
.solitaire-case { width: min(100%, 790px); margin: 0 auto; padding: 16px 20px 18px; border: 1px solid var(--vp-c-text-2); border-radius: 14px 14px 36px 14px; background: var(--vp-c-bg); color: var(--vp-c-text-1); box-shadow: 5px 6px 0 color-mix(in srgb, var(--vp-c-text-1) 12%, var(--vp-c-bg)), 0 20px 60px #00000009; }
.solitaire-header, .solitaire-brand, .solitaire-title, .solitaire-footer { display: flex; align-items: center; justify-content: space-between; }
.solitaire-brand { gap: 12px; }.solitaire-brand b { font-size: 20px; letter-spacing: -.7px; }.solitaire-brand span, .solitaire-footer { color: var(--vp-c-text-3); font: 9px var(--vp-font-family-mono); letter-spacing: .1em; }
.solitaire-home { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--vp-c-divider); border-radius: 50%; color: var(--vp-c-text-2); font-size: 18px; text-decoration: none; }
.solitaire-home:hover { background: var(--vp-c-bg-soft); }
.solitaire-screen { margin-top: 14px; padding: 12px; border: 1px solid var(--vp-c-text-3); border-radius: 5px; background: var(--vp-c-bg-alt); box-shadow: inset 0 0 0 3px var(--vp-c-bg); }
.solitaire-title h1 { margin: 0; font: 11px var(--vp-font-family-mono); letter-spacing: .2em; }.solitaire-title > span { display: flex; align-items: center; gap: 6px; color: var(--vp-c-text-2); font-size: 10px; }.solitaire-title i { width: 5px; height: 5px; border: 1px solid currentColor; border-radius: 50%; }.solitaire-title i.active { background: currentColor; }
.solitaire-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0 14px; }.solitaire-stats > div + div { padding-left: 12px; border-left: 1px solid var(--vp-c-divider); }.solitaire-stats dt { color: var(--vp-c-text-3); font: 8px/1.4 var(--vp-font-family-mono); }.solitaire-stats dd { margin: 3px 0 0; font: 21px/1.2 var(--vp-font-family-mono); font-variant-numeric: tabular-nums; }
.solitaire-top-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 13px; }.solitaire-pair, .foundation-row { display: flex; align-items: flex-start; gap: 6px; }.card-slot { position: relative; display: block; flex: 0 0 clamp(37px, 8vw, 62px); width: clamp(37px, 8vw, 62px); aspect-ratio: 5 / 7; padding: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--vp-c-text-2) 55%, transparent); border-radius: 5px; background: color-mix(in srgb, var(--vp-c-bg) 75%, transparent); cursor: pointer; }.card-slot:disabled { cursor: default; }.slot-mark { display: grid; width: 100%; height: 100%; place-items: center; color: var(--vp-c-text-3); font: 22px var(--vp-font-family-mono); opacity: .55; }
.playing-card { position: relative; display: block; width: clamp(37px, 8vw, 62px); aspect-ratio: 5 / 7; padding: 4px; border: 1px solid #c8c5bd; border-radius: 5px; background: #fbfaf6; color: #27272a; text-align: left; box-shadow: 0 2px 4px #00000010; cursor: pointer; }.playing-card.is-red { color: #bd4550; }.playing-card b { display: flex; flex-direction: column; align-items: center; width: fit-content; font: 700 clamp(8px, 1.5vw, 11px)/.95 var(--vp-font-family-mono); }.playing-card b i { font-style: normal; font-size: .85em; }.playing-card strong { position: absolute; inset: 0; display: grid; place-items: center; font: clamp(15px, 3vw, 24px)/1 serif; }.card-corner-bottom { position: absolute; right: 4px; bottom: 4px; transform: rotate(180deg); }.tableau { --tableau-base-height: clamp(180px, 28vw, 225px); display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: clamp(4px, 1.2vw, 9px); width: 100%; max-width: 520px; min-height: var(--tableau-base-height); margin: 0 auto; }.tableau-column { position: relative; min-height: var(--tableau-base-height); }.tableau-card { position: absolute; left: 0; width: 100%; min-width: 0; padding: 3px; }.tableau-card.is-selected { outline: 2px solid var(--vp-c-text-1); outline-offset: 1px; transform: translateY(-3px); }.tableau-card:disabled { cursor: default; }.empty-column { position: absolute; inset: 0 auto auto 0; width: 100%; aspect-ratio: 5 / 7; border: 1px dashed var(--vp-c-divider); border-radius: 5px; background: transparent; color: var(--vp-c-text-3); cursor: pointer; }.card-facedown { border-color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); }
.waste-stack { position: relative; flex: 0 0 calc(clamp(37px, 8vw, 62px) + 24px); width: calc(clamp(37px, 8vw, 62px) + 24px); height: clamp(52px, 11.2vw, 87px); }.waste-card { position: absolute; top: 0; }.waste-card:disabled { cursor: default; }.waste-empty-slot { position: absolute; inset: 0 auto auto 0; width: clamp(37px, 8vw, 62px); aspect-ratio: 5 / 7; padding: 0; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: transparent; }.tableau-card.is-selected { z-index: 20 !important; }.empty-column { z-index: 0; }
.card-back { position: absolute; inset: 4px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--vp-c-text-2) 60%, transparent); border-radius: 3px; background: repeating-linear-gradient(45deg, transparent 0 4px, color-mix(in srgb, var(--vp-c-text-2) 14%, transparent) 4px 5px); }.card-back i { display: grid; width: 24px; aspect-ratio: 1; place-items: center; border: 1px solid var(--vp-c-text-2); border-radius: 50%; color: var(--vp-c-text-1); font: italic 15px Georgia, serif; }
.win-note { margin-top: 8px; color: var(--vp-c-text-1); font-size: 10px; text-align: center; }.solitaire-actions { display: flex; justify-content: flex-end; margin: 11px 4px 0; }.solitaire-actions button { display: grid; width: 35px; height: 35px; place-items: center; border: 1px solid var(--vp-c-text-2); border-radius: 50%; color: var(--vp-c-text-1); font-size: 18px; cursor: pointer; }
@media (max-width: 480px) { .solitaire-case { padding: 13px 12px 15px; }.solitaire-screen { padding: 9px; }.solitaire-pair, .foundation-row { gap: 4px; }.tableau { gap: 3px; }.tableau-card { padding: 2px; } }
@media (max-width: 360px) { .card-slot { flex-basis: 32px; width: 32px; }.playing-card, .waste-empty-slot { width: 32px; }.waste-stack { flex-basis: 52px; width: 52px; height: 45px; } }
</style>
