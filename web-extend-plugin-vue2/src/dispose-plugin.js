/**
 * 单插件卸载：与 `bootstrapPlugins` / `createHostApi` 对称，清理注册表与 DOM 副作用。
 *
 * @module dispose-plugin
 */
import Vue from 'vue'
import { registries } from './registries.js'
import { runPluginTeardowns } from './teardown-registry.js'

/**
 * 卸载指定 id 的插件：依次执行 teardown、移除菜单与扩展点条目、删除 activator、移除带 `data-plugin-asset` 的节点。
 *
 * **路由**：Vue Router 3 无公开 `removeRoute`，此处不改动 matcher；动态路由需整页刷新或自行维护路由表。
 *
 * @param {string} pluginId 与 manifest.id 一致
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
