/**
 * 卸载单个插件：执行 teardown、清理注册表与 activator、移除带 `data-plugin-asset` 的 DOM。
 * 注意：Vue Router 3 无公开 `removeRoute`，动态路由通常需整页刷新或宿主自行维护。
 */
import Vue from 'vue'
import { revokePluginMenusIfConfigured } from '../core/host-menu-integration'
import { registries } from '../core/plugin-registries'
import { runPluginTeardowns } from '../core/plugin-teardown-registry'

export function disposeWebPlugin(pluginId: string) {
  if (!pluginId || typeof pluginId !== 'string') {
    return
  }

  runPluginTeardowns(pluginId)
  revokePluginMenusIfConfigured(pluginId)

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
