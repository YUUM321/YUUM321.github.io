import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'mio',
  description: 'mio 的个人网站：文章、项目、笔记与碎片。',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'mio',
    sidebar: false,
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/blog/' },
      { text: '项目', link: '/projects/' },
      { text: '笔记', link: '/notes/' },
      { text: '碎片', link: '/fragments/' },
      { text: '关于', link: '/about' }
    ],
    sidebarMenuLabel: '目录',
    returnToTopLabel: '返回顶部',
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '更新于' },
    outline: {
      level: [2, 3],
      label: '本页内容'
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询条件',
            footerButtonText: '关闭',
            selectText: '选择',
            navigateText: '切换'
          }
        }
      }
    },
    appearance: true,
    footer: {
      copyright: 'mio'
    }
  }
})
