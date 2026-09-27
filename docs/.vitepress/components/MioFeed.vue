<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../content.data'
import MioIcon from './MioIcon.vue'

const props = defineProps<{ category?: string; limit?: number }>()
const selected = ref('all')
const types = [
  { key: 'all', label: '全部' },
  { key: 'blog', label: '文章' },
  { key: 'projects', label: '项目' },
  { key: 'notes', label: '笔记' },
  { key: 'fragments', label: '碎片' }
]
const category = computed(() => props.category || selected.value)
const entries = computed(() => {
  const items = data.filter(entry => category.value === 'all' || entry.category === category.value)
  return props.limit ? items.slice(0, props.limit) : items
})
const label = (key: string) => types.find(type => type.key === key)?.label || key
</script>

<template>
  <div class="mio-feed">
    <div v-if="!props.category" class="mio-filters" aria-label="按内容类型筛选">
      <button v-for="type in types" :key="type.key" type="button" :aria-pressed="selected === type.key" @click="selected = type.key">{{ type.label }}</button>
    </div>
    <div v-if="entries.length" class="mio-feed__list">
      <a v-for="entry in entries" :key="entry.url" :href="withBase(entry.url)" class="mio-feed__entry">
        <MioIcon :name="entry.category" />
        <span class="mio-feed__title">{{ entry.title }}</span>
        <span class="mio-feed__category">{{ label(entry.category) }}</span>
        <time v-if="entry.date" :datetime="entry.date">{{ entry.date }}</time>
        <MioIcon name="chevron" />
      </a>
    </div>
    <div v-else class="mio-empty" role="status">
      <MioIcon :name="category === 'all' ? 'blog' : category" />
      <p>{{ category === 'all' ? '暂无已发布内容' : `暂无${label(category)}` }}</p>
    </div>
  </div>
</template>
