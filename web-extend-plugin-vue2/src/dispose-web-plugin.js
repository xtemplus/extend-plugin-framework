/**
 * 卸载单个插件：执行 teardown、清理注册表与 activator、移除带 `data-plugin-asset` 的 DOM。
 * 注意：Vue Router 3 无公开 `removeRoute`，动态路由通常需整页刷新或宿主自行维护。
 */
import Vue from 'vue'
import { registries } from './plugin-registries.js'
import { runPluginTeardowns } from './plugin-teardown-registry.js'

/**
 * @param {string} pluginId 与 manifest `id` 一致
 */
export function disposeWebPlugin(pluginId) {
  if (!pluginId || typeof pluginId !== 'string') {
    return
  }

  runPluginTeardowns(pluginId)

  for (let i = registries.menus.length - 1; i >= 0; i--) {
    if (registries.menus[i].pluginId === pluginId) {
      registries.menus.splice(i, 1)
    }
  }

  const slots = registries.slots
  for (const pointId of Object.keys(slots)) {
    const list = slots[pointId]
    if (!Array.isArray(list)) {
      continue
    }
    const next = list.filter((x) => x.pluginId !== pluginId)
    if (next.length === 0) {
      Vue.delete(slots, pointId)
    } else if (next.length !== list.length) {
      Vue.set(slots, pointId, next)
    }
  }
  registries.slotRevision++

  if (typeof window !== 'undefined' && window.__PLUGIN_ACTIVATORS__) {
    delete window.__PLUGIN_ACTIVATORS__[pluginId]
  }

  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-plugin-asset]').forEach((el) => {
      if (el.getAttribute('data-plugin-asset') === pluginId) {
        el.remove()
      }
    })
  }
}
