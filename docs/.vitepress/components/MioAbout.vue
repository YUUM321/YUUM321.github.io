<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../content.data'

const currently = ['KWS', 'Linux 驱动', 'BPS']

const timeline = [
  { year: '2026', text: 'KWS / Linux 驱动 / BPS' }
]

const uses = [
  { title: '硬件', items: ['STM32', 'ESP32', 'Raspberry Pi'] },
  { title: '软件', items: ['Linux', 'VS Code', 'Git', 'PyTorch', 'Godot'] },
  { title: '语言', items: ['中文', '日本語', 'English', 'Deutsch'] }
]

const totals = computed(() => ({
  blog: data.filter(item => item.category === 'blog').length,
  projects: data.filter(item => item.category === 'projects').length,
  notes: data.filter(item => item.category === 'notes').length,
  fragments: data.filter(item => item.category === 'fragments').length
}))
</script>

<template>
  <main class="mio-about">
    <header class="mio-about__intro">
      <p class="mio-about__name">Mio</p>
    </header>

    <section class="mio-about__section" aria-labelledby="currently-title">
      <h2 id="currently-title">现在在做</h2>
      <ul class="mio-current-list"><li v-for="item in currently" :key="item">{{ item }}</li></ul>
    </section>

    <section class="mio-about__section" aria-labelledby="timeline-title">
      <h2 id="timeline-title">变化轨迹</h2>
      <ol class="mio-timeline"><li v-for="item in timeline" :key="item.year"><time>{{ item.year }}</time><span>{{ item.text }}</span></li></ol>
    </section>

    <section class="mio-about__section" aria-labelledby="uses-title">
      <h2 id="uses-title">常用</h2>
      <div class="mio-about-columns"><div v-for="group in uses" :key="group.title"><h3>{{ group.title }}</h3><p>{{ group.items.join(' / ') }}</p></div></div>
    </section>

    <section class="mio-about__section" aria-labelledby="site-title">
      <h2 id="site-title">这个网站</h2>
      <dl class="mio-site-stats"><div><dt>文章</dt><dd>{{ totals.blog }}</dd></div><div><dt>项目</dt><dd>{{ totals.projects }}</dd></div><div><dt>笔记</dt><dd>{{ totals.notes }}</dd></div><div><dt>碎片</dt><dd>{{ totals.fragments }}</dd></div></dl>
    </section>

    <footer class="mio-about__contact"><a href="https://github.com/YUUM321" target="_blank" rel="noreferrer">GitHub ↗</a></footer>
  </main>
</template>
