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

## 实时星空背景

`docs/.vitepress/sky/` 使用 XHIP / d3-celestial 的 5,044 颗恒星数据，由 Astronomy Engine 根据设备当前时间和深圳（22.5431°N、114.0579°E）计算地平坐标，每 10 秒更新。画面是天顶视角、北上东左的立体投影裁切，亮度与尺寸按视星等分级。

背景始终显示理想恒星图，不模拟日光、天气或光污染，也不包含太阳、月亮及行星。闪烁和流星属于装饰动效，星星本身不随机漂移。页面隐藏时暂停动画；系统减少动态效果时保留静态星图和定时星位更新。

数据来源与授权保留在 `docs/public/sky/`；坐标测试运行 `node --experimental-strip-types --test tests/sky.test.mjs`。

## 贪吃蛇彩蛋

连续点击侧栏头像 5 次打开黑白掌机（相邻点击间隔不超过 750 毫秒）。支持方向键、WASD、屏幕方向键及触屏滑动；空格或 P 暂停，Esc 退出。每吃到 5 个光点升一级，最高 6 级；计时不包含暂停时间，本机最高分保存在浏览器。切换窗口或切到后台自动暂停。

游戏按需加载。规则检查：`node --experimental-strip-types --test tests/snake.test.mjs`。

## 部署

推送到 `main` 会触发 `.github/workflows/deploy.yml`。在仓库设置中将 **Settings → Pages → Build and deployment → Source** 设为 **GitHub Actions**（若 GitHub 未自动启用）。部署成功后的访问地址是：<https://YUUM321.github.io/>。

## 写作约定

- 正文放在对应栏目目录，首页与栏目列表通过 `docs/.vitepress/content.data.ts` 自动收集，目录的 `index.md` 不作为正文收录。
- Markdown frontmatter 可设置 `title`、`date: YYYY-MM-DD` 和 `draft: true`；草稿不出现在列表里，但仍会被 VitePress 构建，不用于存放私密内容。
- 列表优先按日期倒序，无日期的内容排在后面。站点导航统一配置在 `docs/.vitepress/config.ts`。
- 自定义 Vue 组件放在 `docs/.vitepress/components/`；全局样式放在 `docs/.vitepress/theme/custom.css`。
