/**
 * 运行时引导相关 API 的聚合导出（实现位于 `./runtime/`）。
 */
export { resolveRuntimeOptions } from './runtime/resolve-runtime-options.js'
export { defaultFetchWebPluginManifest } from './runtime/default-fetch-manifest.js'
export { bootstrapPlugins } from './runtime/bootstrap-plugins.js'
