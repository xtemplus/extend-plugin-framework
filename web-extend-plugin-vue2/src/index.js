/**
 * Vue 2.7 宿主 Web 扩展插件运行时公共入口。
 * @see README 中 Webpack 宿主需配置 DefinePlugin 或显式 `resolveRuntimeOptions`
 */
export { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
export { bootstrapPlugins, resolveRuntimeOptions } from './PluginRuntime.js'
export { createHostApi } from './createHostApi.js'
export { disposeWebPlugin } from './dispose-plugin.js'
export { registries } from './registries.js'
export { createRequestBridge } from './bridge.js'
export { HOST_PLUGIN_API_VERSION } from './constants.js'
export { default as ExtensionPoint } from './components/ExtensionPoint.vue'
