/**
 * 稳定对外 API：具名导出 + {@link WebExtendPluginVue2} 聚合对象。
 * 语义化版本内保持本文件导出的符号与聚合结构兼容。
 *
 * `PluginRuntime` 与 `manifest-fetch-composer` 通过 namespace 绑定到 `WebExtendPluginVue2.runtime`，避免具名导出与聚合对象重复列举。
 *
 * @module public
 */

import * as pluginRuntime from './PluginRuntime.js'
import * as manifestComposer from './runtime/manifest-fetch-composer.js'
import { createHostApi } from './createHostApi.js'
import { disposeWebPlugin } from './dispose-plugin.js'
import { registries } from './registries.js'
import { createRequestBridge } from './bridge.js'
import { HOST_PLUGIN_API_VERSION } from './constants.js'
import { setWebExtendPluginEnv } from './bundled-env.js'
import { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
import { installWebExtendPluginVue2 } from './install.js'
import { default as ExtensionPoint } from './components/ExtensionPoint.js'
import {
  createVueCliAxiosInstallOptions,
  manifestPathForVueCliApiBase,
  presetVueCliAxios,
  unwrapTableStyleManifestBody
} from './presets/vue-cli-axios.js'

export {
  createHostApi,
  disposeWebPlugin,
  registries,
  createRequestBridge,
  HOST_PLUGIN_API_VERSION,
  setWebExtendPluginEnv,
  defaultWebExtendPluginRuntime,
  installWebExtendPluginVue2,
  ExtensionPoint,
  createVueCliAxiosInstallOptions,
  manifestPathForVueCliApiBase,
  presetVueCliAxios,
  unwrapTableStyleManifestBody
}

export const {
  bootstrapPlugins,
  defaultFetchWebPluginManifest,
  resolveRuntimeOptions
} = pluginRuntime

export const {
  composeManifestFetch,
  manifestFetchCacheMiddleware,
  wrapManifestFetchWithCache
} = manifestComposer

/**
 * 根命名空间：宿主可通过 `WebExtendPluginVue2.presets.vueCliAxios` 等路径发现能力，避免仅依赖散落的具名导出。
 * @type {Readonly<{
 *   install: typeof installWebExtendPluginVue2,
 *   runtime: Readonly<{ bootstrapPlugins: typeof pluginRuntime.bootstrapPlugins, resolveRuntimeOptions: typeof pluginRuntime.resolveRuntimeOptions, defaultFetchWebPluginManifest: typeof pluginRuntime.defaultFetchWebPluginManifest, composeManifestFetch: typeof manifestComposer.composeManifestFetch, manifestFetchCacheMiddleware: typeof manifestComposer.manifestFetchCacheMiddleware, wrapManifestFetchWithCache: typeof manifestComposer.wrapManifestFetchWithCache }>,
 *   host: Readonly<{ createHostApi: typeof createHostApi, disposeWebPlugin: typeof disposeWebPlugin, createRequestBridge: typeof createRequestBridge, registries: typeof registries }>,
 *   config: Readonly<{ defaultWebExtendPluginRuntime: typeof defaultWebExtendPluginRuntime, setWebExtendPluginEnv: typeof setWebExtendPluginEnv }>,
 *   constants: Readonly<{ HOST_PLUGIN_API_VERSION: typeof HOST_PLUGIN_API_VERSION }>,
 *   components: Readonly<{ ExtensionPoint: typeof ExtensionPoint }>,
 *   presets: Readonly<{ vueCliAxios: typeof presetVueCliAxios }>
 * }>}
 */
export const WebExtendPluginVue2 = Object.freeze({
  install: installWebExtendPluginVue2,
  runtime: Object.freeze({
    bootstrapPlugins: pluginRuntime.bootstrapPlugins,
    resolveRuntimeOptions: pluginRuntime.resolveRuntimeOptions,
    defaultFetchWebPluginManifest: pluginRuntime.defaultFetchWebPluginManifest,
    composeManifestFetch: manifestComposer.composeManifestFetch,
    manifestFetchCacheMiddleware: manifestComposer.manifestFetchCacheMiddleware,
    wrapManifestFetchWithCache: manifestComposer.wrapManifestFetchWithCache
  }),
  host: Object.freeze({
    createHostApi,
    disposeWebPlugin,
    createRequestBridge,
    registries
  }),
  config: Object.freeze({
    defaultWebExtendPluginRuntime,
    setWebExtendPluginEnv
  }),
  constants: Object.freeze({
    HOST_PLUGIN_API_VERSION
  }),
  components: Object.freeze({
    ExtensionPoint
  }),
  presets: Object.freeze({
    vueCliAxios: presetVueCliAxios
  })
})
