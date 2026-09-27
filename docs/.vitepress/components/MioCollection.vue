<script setup lang="ts">
import MioFeed from './MioFeed.vue'
import MioVisualFragments from './MioVisualFragments.vue'

const props = defineProps<{ title: string; category: string }>()
</script>

<template>
  <main class="mio-workspace">
    <header class="mio-page-header"><h1>{{ title }}</h1></header>
    <MioVisualFragments v-if="props.category === 'fragments'" />
    <MioFeed :category="props.category" />
  </main>
</template>
