import { createContentLoader } from 'vitepress'

export interface Entry {
  title: string
  url: string
  category: string
  date: string
  kind?: string
  cover?: string
  caption?: string
}

declare const data: Entry[]
export { data }

export default createContentLoader(['blog/**/*.md', 'projects/**/*.md', 'notes/**/*.md', 'fragments/**/*.md'], {
  includeSrc: true,
  transform(pages): Entry[] {
    return pages
      .filter(page => !page.url.endsWith('/') && !/\/index(?:\.html)?$/.test(page.url) && !page.frontmatter.draft)
      .map(page => {
        const rawDate = page.frontmatter.date
        const parsedDate = rawDate ? new Date(rawDate) : null
        return {
          title: String(page.frontmatter.title || page.src?.match(/^#\s+(.+)$/m)?.[1] || page.url.split('/').pop()),
          url: page.url,
          category: page.url.split('/')[1],
          date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : '',
          kind: page.frontmatter.kind ? String(page.frontmatter.kind) : undefined,
          cover: page.frontmatter.cover ? String(page.frontmatter.cover) : undefined,
          caption: page.frontmatter.caption ? String(page.frontmatter.caption) : undefined
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'))
  }
})
