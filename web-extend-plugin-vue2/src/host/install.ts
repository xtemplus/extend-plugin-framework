/**
 * 注册全局 `ExtensionPoint` 并异步拉取清单、激活插件。
 */
import ExtensionPoint from '../components/ExtensionPoint'
import { setWebExtendPluginEnv } from '../core/build-env'
import { createHostApi } from './create-host-api'
import { bootstrapPlugins, resolveRuntimeOptions } from '../runtime/public-api'

/**
 * @param Vue Vue 构造函数
 * @param router vue-router 实例
 * @param options 传给 `resolveRuntimeOptions`；可含 `env` 以读取 `VITE_*`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installWebExtendPluginVue2(Vue: any, router: any, options?: Record<string, unknown>) {
  const opts = options || {}
  const { env: injectedEnv, ...runtimeUser } = opts
  if (injectedEnv && typeof injectedEnv === 'object') {
    setWebExtendPluginEnv(injectedEnv as Record<string, unknown>)
  }
  if (Vue && ExtensionPoint) {
    Vue.component('ExtensionPoint', ExtensionPoint)
  }
  const runtime = resolveRuntimeOptions(runtimeUser)
  return bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit || {}), runtime)
}
