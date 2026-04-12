import * as pluginRuntime from './runtime/public-api'
import * as manifestComposer from './runtime/manifest-fetch-composer'
import { createHostApi } from './host/create-host-api'
import { disposeWebPlugin } from './host/dispose-web-plugin'
import { getRegisteredTopRouteNamesForPlugin } from './host/plugin-route-registry'
import { getContributedRoutesForPlugin } from './host/plugin-route-snapshots'
import { registries } from './core/plugin-registries'
import {
  getAllHostComponentMeta,
  getAllHostModuleMeta,
  getHostComponent,
  getHostComponentMeta,
  getHostModule,
  getHostModuleMeta,
  registerVueGlobalComponents,
  registerHostModules,
  registerHostComponents
} from './core/host-component-registry'
import { createRequestBridge } from './host/request-bridge'
import {
  HOST_PLUGIN_API_VERSION,
  RUNTIME_CONSOLE_LABEL,
  defaultManifestFetchCache,
  defaultManifestMode,
  defaultWebExtendPluginRuntime,
  routeSynthNamePrefix,
  peerMinimumVersions,
  webExtendPluginEnvKeys
} from './core/public-config-defaults'
import { setWebExtendPluginEnv } from './core/build-env'
import { installWebExtendPluginVue2 } from './host/install'
import { installHostBridge } from './host/install-host-bridge'
import ExtensionPoint from './components/ExtensionPoint'
import { createVueCliAxiosInstallOptions } from './presets/vue-cli-axios'

// Public exports are intentionally grouped by role:
// - core runtime
// - manifest fetch composition
// - host bridge / registry helpers
// - public constants
export {
  getRegisteredTopRouteNamesForPlugin,
  getContributedRoutesForPlugin,
  createHostApi,
  disposeWebPlugin,
  registries,
  registerVueGlobalComponents,
  registerHostModules,
  registerHostComponents,
  getHostModule,
  getHostModuleMeta,
  getAllHostModuleMeta,
  getHostComponent,
  getHostComponentMeta,
  getAllHostComponentMeta,
  createRequestBridge,
  HOST_PLUGIN_API_VERSION,
  RUNTIME_CONSOLE_LABEL,
  setWebExtendPluginEnv,
  defaultWebExtendPluginRuntime,
  webExtendPluginEnvKeys,
  defaultManifestFetchCache,
  defaultManifestMode,
  routeSynthNamePrefix,
  peerMinimumVersions,
  installWebExtendPluginVue2,
  installHostBridge,
  ExtensionPoint,
  createVueCliAxiosInstallOptions
}

export const {
  bootstrapPlugins,
  defaultFetchWebPluginManifest,
  resolveRuntimeOptions,
  ensurePluginHostRoute,
  getActivatedPluginIds
} = pluginRuntime

export const {
  composeManifestFetch,
  manifestFetchCacheMiddleware,
  wrapManifestFetchWithCache
} = manifestComposer
