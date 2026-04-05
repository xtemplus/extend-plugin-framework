/**
 * 按 `pluginId` 收集 `onTeardown` 回调，供 `disposeWebPlugin` 统一执行。
 *
 * @module teardown-registry
 */

/** @type {Map<string, Function[]>} */
const byPlugin = new Map()

/**
 * 登记插件卸载时要执行的同步回调（建议只做解绑、清定时器等轻量逻辑）。
 * @param {string} pluginId
 * @param {() => void} fn
 */
export function registerPluginTeardown(pluginId, fn) {
  if (typeof fn !== 'function') {
    return
  }
  let arr = byPlugin.get(pluginId)
  if (!arr) {
    arr = []
    byPlugin.set(pluginId, arr)
  }
  arr.push(fn)
}

/**
 * 执行并清空该插件已登记的全部 teardown；调用后 Map 中不再保留该 id。
 * @param {string} pluginId
 */
export function runPluginTeardowns(pluginId) {
  const arr = byPlugin.get(pluginId)
  if (!arr) {
    return
  }
  byPlugin.delete(pluginId)
  for (const fn of arr) {
    try {
      fn()
    } catch (e) {
      console.warn('[plugins] teardown failed', pluginId, e)
    }
  }
}
