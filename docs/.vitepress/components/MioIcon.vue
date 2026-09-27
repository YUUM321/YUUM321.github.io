<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g v-if="name === 'blog'"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></g>
    <g v-else-if="name === 'projects'"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m9 9-3 3 3 3m6-6 3 3-3 3"/></g>
    <g v-else-if="name === 'notes'"><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v15M5 8h3M16 8h3"/></g>
    <g v-else-if="name === 'fragments'"><path d="M7 3 5 21M15 3l-2 18M3 8h17M2 16h17"/></g>
    <g v-else-if="name === 'arrow'"><path d="M7 17 17 7M7 7h10v10"/></g>
    <g v-else-if="name === 'chevron'"><path d="m9 5 7 7-7 7"/></g>
    <g v-else><path d="M5 5h14v14H5zM5 10h14M10 10v9"/></g>
  </svg>
</template>
