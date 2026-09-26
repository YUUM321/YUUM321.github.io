import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'
import MioHome from '../components/MioHome.vue'
import MioLayout from '../components/MioLayout.vue'
import MioCollection from '../components/MioCollection.vue'
import MioAbout from '../components/MioAbout.vue'
import MioTetris from '../components/MioTetris.vue'

export default {
  extends: DefaultTheme,
  Layout: MioLayout,
  enhanceApp({ app }) {
    app.component('MioHome', MioHome)
    app.component('MioCollection', MioCollection)
  app.component('MioAbout', MioAbout)
  app.component('MioTetris', MioTetris)
  }
} satisfies Theme
