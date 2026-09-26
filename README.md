# YUUM321.github.io

基于 [VitePress](https://vitepress.dev/) 的个人技术博客。仓库采用单仓库方案：`main` 只保存 Markdown 源码、配置和工作流；GitHub Actions 构建后直接部署到 GitHub Pages，不提交静态构建产物。

## 本地开发

要求：Node.js 22（与部署环境一致）。

```bash
npm install
npm run docs:dev
```

构建并本地预览：

```bash
npm run docs:build
npm run docs:preview
```

## 内容结构

```text
docs/
├── blog/                 # 按时间发布的文章
├── notes/                # 学习与查阅笔记
├── projects/             # 项目展示页面
├── fragments/            # 短篇记录
├── about.md
├── index.md              # 首页
└── .vitepress/
    ├── components/       # 自定义 Vue 组件
    ├── theme/            # 主题入口和自定义 CSS
    └── config.ts         # VitePress 配置
```

## 部署

推送到 `main` 会触发 `.github/workflows/deploy.yml`。在仓库设置中将 **Settings → Pages → Build and deployment → Source** 设为 **GitHub Actions**（若 GitHub 未自动启用）。部署成功后的访问地址是：<https://YUUM321.github.io/>。

## 写作约定

- 正文放在对应栏目目录，首页与栏目列表通过 `docs/.vitepress/content.data.ts` 自动收集，目录的 `index.md` 不作为正文收录。
- Markdown frontmatter 可设置 `title`、`date: YYYY-MM-DD` 和 `draft: true`；草稿不出现在列表里，但仍会被 VitePress 构建，不用于存放私密内容。
- 列表优先按日期倒序，无日期的内容排在后面。站点导航统一配置在 `docs/.vitepress/config.ts`。
- 自定义 Vue 组件放在 `docs/.vitepress/components/`；全局样式放在 `docs/.vitepress/theme/custom.css`。
