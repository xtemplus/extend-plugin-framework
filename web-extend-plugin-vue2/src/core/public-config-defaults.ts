/**
 * Public constants and runtime defaults consumed by resolveRuntimeOptions and
 * other runtime modules.
 */

export const peerMinimumVersions = {
  vue: '2.6.0',
  vueRouter: '3.5.0'
} as const

export const HOST_PLUGIN_API_VERSION = '1.0.0'

export const RUNTIME_CONSOLE_LABEL = 'web-extend-plugin-vue2'

export const webExtendPluginEnvKeys = {
  manifestBase: 'VITE_FRONTEND_PLUGIN_BASE',
  manifestListPath: 'VITE_WEB_PLUGIN_MANIFEST_PATH',
  implicitDevIds: 'VITE_WEB_PLUGIN_IMPLICIT_DEV_IDS',
  allowedScriptHosts: 'VITE_WEB_PLUGIN_ALLOWED_SCRIPT_HOSTS',
  bridgePrefixes: 'VITE_WEB_PLUGIN_BRIDGE_PREFIXES',
  devFallbackManifestUrl: 'VITE_WEB_PLUGIN_DEV_FALLBACK_MANIFEST_URL',
  manifestMode: 'VITE_WEB_PLUGIN_MANIFEST_MODE',
  staticManifestUrl: 'VITE_WEB_PLUGIN_STATIC_MANIFEST_URL',
  mountPath: 'VITE_WEB_PLUGIN_MOUNT_PATH',
  devEntry: 'VITE_WEB_PLUGIN_DEV_ENTRY',
  devPing: 'VITE_WEB_PLUGIN_DEV_PING_PATH',
  devSse: 'VITE_WEB_PLUGIN_DEV_SSE_PATH',
  devPingTimeout: 'VITE_WEB_PLUGIN_DEV_PING_TIMEOUT_MS',
  manifestCredentials: 'VITE_WEB_PLUGIN_MANIFEST_CREDENTIALS',
  devManifestFallback: 'VITE_WEB_PLUGIN_DEV_MANIFEST_FALLBACK',
  webPluginDevOrigin: 'VITE_WEB_PLUGIN_DEV_ORIGIN',
  webPluginDevIds: 'VITE_WEB_PLUGIN_DEV_IDS',
  webPluginDevMap: 'VITE_WEB_PLUGIN_DEV_MAP',
  pluginsBootstrapSummary: 'VITE_PLUGINS_BOOTSTRAP_SUMMARY',
  manifestPathAlt: 'VUE_APP_WEB_PLUGIN_MANIFEST_PATH'
} as const

export const defaultManifestMode = 'api' as const

export const defaultManifestFetchCache = {
  storageKeyPrefix: 'wep.manifestFetch.v1',
  maxEntries: 50
} as const

export const routeSynthNamePrefix = '__wep_'

export const defaultWebExtendPluginRuntime = {
  manifestBase: '/dev-api',
  manifestListPath: '/web-plugin',
  manifestFetchCredentials: 'include' as RequestCredentials,
  devPingPath: '/__web_plugin_dev_ping',
  devReloadSsePath: '/__web_plugin_reload_stream',
  webPluginDevEntryPath: '/src/plugin-entry.js',
  devPingTimeoutMs: 500,
  defaultImplicitDevPluginIds: [] as string[],
  allowedScriptHosts: ['localhost', '127.0.0.1', '::1'],
  bridgeAllowedPathPrefixes: ['/api/'],
  pluginMountPath: '/plugin',
  devFallbackStaticManifestUrl: ''
}
