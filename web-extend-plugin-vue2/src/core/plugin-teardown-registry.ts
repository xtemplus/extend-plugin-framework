/**
 * 按插件 id 收集 `onTeardown` 回调，供 `disposeWebPlugin` 统一执行。
 */

const _byPlugin = new Map<string, Array<() => void>>()

export function registerPluginTeardown(pluginId: string, fn: () => void) {
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

export function runPluginTeardowns(pluginId: string) {
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
