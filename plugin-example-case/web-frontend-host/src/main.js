import Vue from 'vue'
import App from './App.vue'
import { router } from './router'
import { bootstrapPlugins, createHostApi, resolveRuntimeOptions } from 'web-extend-plugin-vue2'

window.Vue = Vue

Vue.config.productionTip = false

new Vue({
  router,
  render: (h) => h(App),
  created() {
    // 固定非开发态：不走隐式 dev 映射与 dev SSE，插件入口以清单 entryUrl 为准
    const runtime = resolveRuntimeOptions({
      isDev: false
    })
    bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit), runtime).catch((e) =>
      console.warn('[host] bootstrapPlugins', e)
    )
  }
}).$mount('#app')
