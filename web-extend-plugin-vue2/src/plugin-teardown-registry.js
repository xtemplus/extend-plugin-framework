/**
 * 按插件 id 收集 `onTeardown` 回调，供 `disposeWebPlugin` 统一执行。
 */

/** @type {Map<string, Array<() => void>>} */
const _byPlugin = new Map()

/**
 * @param {string} pluginId
 * @param {() => void} fn
 */
export function registerPluginTeardown(pluginId, fn) {
  if (typeof fn !== 'function') {
    return
  }
  let list = _byPlugin.get(pluginId)
  if (!list) {
    list = []
    _byPlugin.set(pluginId, list)
  }
  list.push(fn)
}

/**
 * @param {string} pluginId
 */
export function runPluginTeardowns(pluginId) {
  const list = _byPlugin.get(pluginId)
  if (!list) {
    return
  }
  _byPlugin.delete(pluginId)
  for (const fn of list) {
    try {
      fn()
    } catch (e) {
      console.warn('[wep] teardown failed', pluginId, e)
    }
  }
}
