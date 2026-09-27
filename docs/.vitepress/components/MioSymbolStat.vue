<script setup lang="ts">
defineProps<{ label: string; value: number; href: string }>()
</script>

<template>
  <div class="mio-symbol-stat">
    <dt>{{ label }}</dt>
    <dd><a :href="href" :aria-label="`${label} ${value}`">{{ value }}</a></dd>
  </div>
</template>
