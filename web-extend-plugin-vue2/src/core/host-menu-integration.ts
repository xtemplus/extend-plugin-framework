/**
 * `disposeWebPlugin` 使用的菜单撤销钩子：在 `bootstrapPlugins` 中用 `resolveRuntimeOptions` 结果注册。
 */

let revokePluginMenuItems: ((pluginId: string) => void) | undefined

export function setRevokePluginMenuItems(fn: ((pluginId: string) => void) | undefined) {
  revokePluginMenuItems = fn
}

export function revokePluginMenusIfConfigured(pluginId: string) {
  if (typeof revokePluginMenuItems === 'function') {
    try {
      revokePluginMenuItems(pluginId)
    } catch (e) {
      console.warn('[wep] revokePluginMenuItems failed', pluginId, e)
    }
  }
}
