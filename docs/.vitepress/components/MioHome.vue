<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../content.data'
import MioIcon from './MioIcon.vue'
import MioVisualFragments from './MioVisualFragments.vue'

const now = ['KWS', 'Linux 驱动', 'BPS']
const labels: Record<string, string> = { blog: '文章', projects: '项目', notes: '笔记', fragments: '碎片' }
const activities = computed(() => data.slice(0, 6))
const lastUpdated = computed(() => activities.value[0]?.date.replaceAll('-', '.') || '')
const stats = computed(() => [
  { label: '文章', value: data.filter(item => item.category === 'blog').length, link: '/blog/' },
  { label: '项目', value: data.filter(item => item.category === 'projects').length, link: '/projects/' },
  { label: '笔记', value: data.filter(item => item.category === 'notes').length, link: '/notes/' },
  { label: '碎片', value: data.filter(item => item.category === 'fragments').length, link: '/fragments/' }
])

const githubActivity = ref<{ date: string; repo: string; text: string; url: string }[]>([])

function eventText(type: string) {
  return ({ PushEvent: '推送更新', CreateEvent: '创建', IssuesEvent: '更新议题', PullRequestEvent: '更新拉取请求' } as Record<string, string>)[type] || '更新'
}

onMounted(async () => {
  try {
    const response = await fetch('https://api.github.com/users/YUUM321/events/public?per_page=6')
    if (!response.ok) return
    const events = await response.json() as { type?: string; repo?: { name?: string; url?: string }; created_at?: string }[]
    githubActivity.value = events
      .filter(event => event.repo?.name && event.created_at && event.repo.name !== 'YUUM321/YUUM321.github.io')
      .slice(0, 4)
      .map(event => ({
        date: new Date(event.created_at as string).toISOString().slice(5, 10).replace('-', '.'),
        repo: (event.repo?.name as string).replace(/^YUUM321\//, ''),
        text: eventText(event.type || ''),
        url: (event.repo?.url as string).replace('api.github.com/repos', 'github.com')
      }))
  } catch {}
})
</script>

<template>
  <main class="mio-dashboard">
    <header class="mio-dashboard__intro">
      <h1>mio</h1>
      <time v-if="lastUpdated">更新于 {{ lastUpdated }}</time>
    </header>

    <div class="mio-dashboard__overview">
      <section class="mio-dashboard-card mio-dashboard-card--now" aria-labelledby="now-title">
        <h2 id="now-title">现在在做</h2>
        <ul><li v-for="item in now" :key="item">{{ item }}</li></ul>
      </section>
      <section class="mio-dashboard-card mio-dashboard-card--stats" aria-labelledby="stats-title">
        <h2 id="stats-title">内容</h2>
        <dl><div v-for="item in stats" :key="item.label"><dt>{{ item.label }}</dt><dd><a :href="withBase(item.link)">{{ item.value }}</a></dd></div></dl>
      </section>
    </div>

    <div class="mio-dashboard__activity-grid">
      <section class="mio-dashboard-card mio-dashboard-card--activity" aria-labelledby="activity-title">
        <h2 id="activity-title">最近活动</h2>
        <div v-if="activities.length" class="mio-dashboard-list">
          <a v-for="item in activities" :key="item.url" :href="withBase(item.url)">
            <time v-if="item.date">{{ item.date.replaceAll('-', '.') }}</time>
            <MioIcon :name="item.category" />
            <span>{{ item.title }}</span>
            <small>{{ labels[item.category] }}</small>
          </a>
        </div>
      </section>

      <section v-if="githubActivity.length" class="mio-dashboard-card mio-dashboard-card--github" aria-labelledby="github-title">
        <h2 id="github-title">GitHub 活动</h2>
        <div class="mio-dashboard-list mio-dashboard-list--github">
          <a v-for="item in githubActivity" :key="`${item.date}-${item.repo}`" :href="item.url" target="_blank" rel="noreferrer">
            <time>{{ item.date }}</time><span>{{ item.repo }}</span><small>{{ item.text }}</small>
          </a>
        </div>
      </section>
    </div>

    <section class="mio-dashboard__visuals" aria-labelledby="visual-title">
      <div class="mio-dashboard__section-heading"><h2 id="visual-title">影像碎片</h2><a :href="withBase('/fragments/')">碎片 ↗</a></div>
      <MioVisualFragments compact :limit="4" />
    </section>
  </main>
</template>
