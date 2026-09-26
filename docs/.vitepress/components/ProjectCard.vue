<script setup lang="ts">
defineProps<{
  title: string
  description: string
  tags?: string[]
  link?: string
}>()
</script>

<template>
  <article class="project-card">
    <h3>
      <a v-if="link" :href="link" target="_blank" rel="noreferrer">{{ title }}</a>
      <template v-else>{{ title }}</template>
    </h3>
    <p>{{ description }}</p>
    <div v-if="tags?.length" class="project-tags" aria-label="项目标签">
      <span v-for="tag in tags" :key="tag">{{ tag }}</span>
    </div>
  </article>
</template>
