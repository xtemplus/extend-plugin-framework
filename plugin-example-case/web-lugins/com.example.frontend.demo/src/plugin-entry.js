import HelloPage from './views/HelloPage.vue'
import SlotADemo from './components/SlotADemo.vue'
import SlotBDemo from './components/SlotBDemo.vue'
import ToolbarDemo from './components/ToolbarDemo.vue'

function createHostAwarePage(hostApi) {
  return {
    name: 'HostAwareHelloPage',
    render(h) {
      return h(HelloPage, {
        props: {
          hostApi
        }
      })
    }
  }
}

function activate(hostApi, context) {
  if (typeof window === 'undefined' || !window.Vue) {
    console.error('[demo-plugin] window.Vue is required')
    return
  }

  const pr = context && context.pluginRecord
  const decls = pr && Array.isArray(pr.routeDeclarations) ? pr.routeDeclarations : []

  const routes = [...decls]
  routes.push({
    path: '/plugin/hello',
    name: 'plugin-hello',
    component: createHostAwarePage(hostApi),
    meta: {
      title: 'Plugin Hello Page',
      order: 40
    }
  })

  hostApi.registerRoutes(routes)

  hostApi.registerSlotComponents('app.host.demo.slot-a', [
    { priority: 5, component: SlotADemo }
  ])

  hostApi.registerSlotComponents('app.host.demo.slot-b', [
    { priority: 5, component: SlotBDemo }
  ])

  hostApi.registerSlotComponents('app.host.demo.toolbar', [
    { priority: 5, component: ToolbarDemo }
  ])
}

window.__PLUGIN_ACTIVATORS__ = window.__PLUGIN_ACTIVATORS__ || {}
window.__PLUGIN_ACTIVATORS__['com.example.frontend.demo'] = activate
