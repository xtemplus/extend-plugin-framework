/**
 * Vue CLI + axios 场景的一键安装：合并 hostContext、默认清单路径与 IIFE 全局 Vue。
 */
import { createVueCliAxiosQuickInstallOptions } from '../presets/vue-cli-axios'
import { installWebExtendPluginVue2 } from './install'

export type VueCliAxiosQuickInstallExtras = Record<string, unknown> & {
  /** 为 true（默认）时在浏览器写入 `window.Vue`，供 IIFE 插件入口与 build-kit 约定一致 */
  exposeGlobalVue?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installVueCliAxiosWebPlugins(
  Vue: any,
  router: any,
  deps: Parameters<typeof createVueCliAxiosQuickInstallOptions>[1],
  extra?: VueCliAxiosQuickInstallExtras
): ReturnType<typeof installWebExtendPluginVue2> {
  /** 避免输出 `?.`：Vue CLI 4 / Webpack 4 默认不转译 node_modules */
  const exposeGlobalVue = extra == null || extra.exposeGlobalVue !== false
  if (exposeGlobalVue && typeof window !== 'undefined') {
    ;(window as unknown as { Vue?: typeof Vue }).Vue = Vue
  }
  const { exposeGlobalVue: _skip, ...restExtra } = extra || {}
  const opts = createVueCliAxiosQuickInstallOptions(router, deps, restExtra)
  return installWebExtendPluginVue2(Vue, router, opts)
}
