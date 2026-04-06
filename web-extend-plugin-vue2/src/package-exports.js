/**
 * 包对外稳定导出与 `WebExtendPluginVue2` 命名空间。
 */
import * as pluginRuntime from './plugin-runtime.js'
import * as manifestComposer from './runtime/manifest-fetch-composer.js'
import { createHostApi } from './create-host-api.js'
import { disposeWebPlugin } from './dispose-web-plugin.js'
import { registries } from './plugin-registries.js'
import { createRequestBridge } from './request-bridge.js'
import { HOST_PLUGIN_API_VERSION, RUNTIME_CONSOLE_LABEL } from './constants.js'
import { setWebExtendPluginEnv } from './build-env.js'
import { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
import { installWebExtendPluginVue2 } from './install.js'
import { default as ExtensionPoint } from './components/ExtensionPoint.js'
import {
  createVueCliAxiosInstallOptions,
  resolveManifestPathUnderApiBase,
  presetVueCliAxios,
  unwrapNestedManifestBody
} from './presets/vue-cli-axios.js'

export {
  createHostApi,
  disposeWebPlugin,
  registries,
  createRequestBridge,
  HOST_PLUGIN_API_VERSION,
  RUNTIME_CONSOLE_LABEL,
  setWebExtendPluginEnv,
  defaultWebExtendPluginRuntime,
  installWebExtendPluginVue2,
  ExtensionPoint,
  createVueCliAxiosInstallOptions,
  resolveManifestPathUnderApiBase,
  presetVueCliAxios,
  unwrapNestedManifestBody
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
    HOST_PLUGIN_API_VERSION,
    RUNTIME_CONSOLE_LABEL
  }),
  components: Object.freeze({
    ExtensionPoint
  }),
  presets: Object.freeze({
    vueCliAxios: presetVueCliAxios
  })
})
