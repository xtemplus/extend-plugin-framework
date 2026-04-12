/**
 * 记录当前已成功激活的插件 id，供宿主做只读观测。
 */

const activatedPluginIds = new Set<string>()

export function clearActivatedPluginIds() {
  activatedPluginIds.clear()
}

export function markPluginActivated(pluginId: string) {
  if (!pluginId) {
    return
  }
  activatedPluginIds.add(pluginId)
}

export function markPluginDeactivated(pluginId: string) {
  if (!pluginId) {
    return
  }
  activatedPluginIds.delete(pluginId)
}

export function getActivatedPluginIds(): string[] {
  return [...activatedPluginIds]
}
