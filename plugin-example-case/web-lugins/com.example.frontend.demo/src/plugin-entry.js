import HelloPage from './views/HelloPage.vue'
import SlotADemo from './components/SlotADemo.vue'
import SlotBDemo from './components/SlotBDemo.vue'
import ToolbarDemo from './components/ToolbarDemo.vue'

function activate(hostApi, context) {
  if (typeof window === 'undefined' || !window.Vue) {
    console.error('[demo-plugin] window.Vue is required')
    return
  }

  const pr = context && context.pluginRecord
  const decls = pr && Array.isArray(pr.routeDeclarations) ? pr.routeDeclarations : []
  if (decls.length) {
    hostApi.registerRoutes(decls)
  }

  hostApi.registerMenuItems([
    { id: 'demo-fe-menu', label: '插件 Hello 页', path: '/plugin/hello', order: 40 },
    ...(decls.length
      ? [{ id: 'demo-fe-stub', label: '清单 PRD 页', path: '/plugin/stub-from-manifest', order: 41 }]
      : [])
  ])

  hostApi.registerRoutes([
    {
      path: '/plugin/hello',
      name: 'plugin-hello',
      component: HelloPage
    }
  ])

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
