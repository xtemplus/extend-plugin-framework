/**
 * Vue 2 宿主 Web 扩展插件运行时公共入口。
 * 推荐使用 `installWebExtendPluginVue2`；亦支持按需组合 `bootstrapPlugins` + `ExtensionPoint`。
 */
export { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
export { bootstrapPlugins, resolveRuntimeOptions } from './PluginRuntime.js'
export { createHostApi } from './createHostApi.js'
export { disposeWebPlugin } from './dispose-plugin.js'
export { registries } from './registries.js'
export { createRequestBridge } from './bridge.js'
export { HOST_PLUGIN_API_VERSION } from './constants.js'
export { setWebExtendPluginEnv } from './bundled-env.js'
export { installWebExtendPluginVue2 } from './install.js'
export { default as ExtensionPoint } from './components/ExtensionPoint.js'
