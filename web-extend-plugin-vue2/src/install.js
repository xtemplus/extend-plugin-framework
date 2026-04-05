/**
 * 一键接入：注册 `ExtensionPoint` 并执行 `bootstrapPlugins`。
 * @module install
 */
import ExtensionPoint from './components/ExtensionPoint.js'
import { createHostApi } from './createHostApi.js'
import { bootstrapPlugins, resolveRuntimeOptions } from './PluginRuntime.js'
import { setWebExtendPluginEnv } from './bundled-env.js'

/**
 * 注册全局组件 `ExtensionPoint` 并异步引导插件清单。
 *
 * @param {*} Vue
 * @param {*} router  vue-router 实例
 * @param {Record<string, unknown>} [options] 传给 `resolveRuntimeOptions` 的字段；可含 `env`（Vite 传入 `import.meta.env`）以读取 `VITE_*`。
 * @returns {Promise<void>}
 */
export function installWebExtendPluginVue2(Vue, router, options) {
  const opts = options || {}
  const { env: injectedEnv, ...runtimeUser } = opts
  if (injectedEnv && typeof injectedEnv === 'object') {
    setWebExtendPluginEnv(injectedEnv)
  }
  if (Vue && ExtensionPoint) {
    Vue.component('ExtensionPoint', ExtensionPoint)
  }
  const runtime = resolveRuntimeOptions(runtimeUser)
  return bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit), runtime)
}
