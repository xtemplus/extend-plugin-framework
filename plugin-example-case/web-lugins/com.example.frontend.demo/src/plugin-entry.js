import HelloPage from './views/HelloPage.vue'
import SlotADemo from './components/SlotADemo.vue'
import SlotBDemo from './components/SlotBDemo.vue'
import ToolbarDemo from './components/ToolbarDemo.vue'

function activate(hostApi) {
  if (typeof window === 'undefined' || !window.Vue) {
    console.error('[demo-plugin] window.Vue is required')
    return
  }

  hostApi.registerMenuItems([
    { id: 'demo-fe-menu', label: '插件 Hello 页', path: '/plugin/hello', order: 40 }
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
