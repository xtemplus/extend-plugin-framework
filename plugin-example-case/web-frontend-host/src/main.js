import Vue from 'vue'
import App from './App.vue'
import { router } from './router'
import { bootstrapPlugins, createHostApi, resolveRuntimeOptions } from 'web-extend-plugin-vue2'
import PluginStubPage from './views/PluginStubPage.vue'

window.Vue = Vue

Vue.config.productionTip = false

new Vue({
  router,
  render: (h) => h(App),
  created() {
    // 固定非开发态：不走隐式 dev 映射与 dev SSE，插件入口以清单 entryUrl 为准
    const runtime = resolveRuntimeOptions({
      isDev: false,
      adaptRouteDeclarations: ({ declarations }) =>
        declarations.map((d) => {
          if (d.componentRef === 'demo:HostStub') {
            return {
              path: d.path,
              name: d.name,
              meta: {
                ...(typeof d.meta === 'object' && d.meta ? d.meta : {}),
                ...(d.title ? { title: d.title } : {})
              },
              component: PluginStubPage
            }
          }
          throw new Error('[host] unknown componentRef: ' + d.componentRef)
        }),
      transformRoutes: ({ routes }) =>
        routes.map((r) => ({
          ...r,
          meta: { ...(r.meta || {}), hostTransformTag: 'demo' }
        }))
    })
    bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit), runtime).catch((e) =>
      console.warn('[host] bootstrapPlugins', e)
    )
  }
}).$mount('#app')
