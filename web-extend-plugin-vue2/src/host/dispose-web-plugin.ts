/**
 * 卸载单个插件：执行 teardown、移除该插件登记的动态路由、清理注册表与 activator、移除带 `data-plugin-asset` 的 DOM。
 * 优先使用 `addRoute()` 返回的 disposer；必要时回退 `router.removeRoute(name)`。
 */
import Vue from 'vue'
import { getPluginBootstrapRouter } from './plugin-bootstrap-router'
import { removeRegisteredRoutesForPlugin } from './plugin-route-registry'
import { registries } from '../core/plugin-registries'
import { runPluginTeardowns } from '../core/plugin-teardown-registry'
import { clearLoadedScriptMemo } from '../runtime/load-script'

export function disposeWebPlugin(pluginId: string) {
  if (!pluginId || typeof pluginId !== 'string') {
    return
  }

  runPluginTeardowns(pluginId)
  removeRegisteredRoutesForPlugin(getPluginBootstrapRouter(), pluginId)

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
        if (el.tagName === 'SCRIPT') {
          const src = (el as HTMLScriptElement).src
          if (src) {
            clearLoadedScriptMemo(src)
          }
        }
        el.remove()
      }
    })
  }
}
