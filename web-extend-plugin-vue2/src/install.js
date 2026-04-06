/**
 * 注册全局 `ExtensionPoint` 并异步拉取清单、激活插件。
 */
import ExtensionPoint from './components/ExtensionPoint.js'
import { createHostApi } from './create-host-api.js'
import { bootstrapPlugins, resolveRuntimeOptions } from './plugin-runtime.js'
import { setWebExtendPluginEnv } from './build-env.js'

/**
 * @param {*} Vue
 * @param {*} router
 * @param {Record<string, unknown>} [options] 传给 `resolveRuntimeOptions`；可含 `env` 以读取 `VITE_*`
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
