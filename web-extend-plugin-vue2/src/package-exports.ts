/**
 * 包对外稳定导出与 `WebExtendPluginVue2` 命名空间。
 */
import * as pluginRuntime from './runtime/public-api'
import * as manifestComposer from './runtime/manifest-fetch-composer'
import { createHostApi } from './host/create-host-api'
import { disposeWebPlugin } from './host/dispose-web-plugin'
import { registries } from './core/plugin-registries'
import { createRequestBridge } from './host/request-bridge'
import { HOST_PLUGIN_API_VERSION, RUNTIME_CONSOLE_LABEL } from './core/constants'
import { setWebExtendPluginEnv } from './core/build-env'
import { defaultWebExtendPluginRuntime } from './core/default-runtime-config'
import { installWebExtendPluginVue2 } from './host/install'
import ExtensionPoint from './components/ExtensionPoint'
import {
  createVueCliAxiosInstallOptions,
  resolveManifestPathUnderApiBase,
  presetVueCliAxios,
  unwrapNestedManifestBody
} from './presets/vue-cli-axios'

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
  resolveRuntimeOptions,
  ensurePluginHostRoute
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
    ensurePluginHostRoute: pluginRuntime.ensurePluginHostRoute,
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
