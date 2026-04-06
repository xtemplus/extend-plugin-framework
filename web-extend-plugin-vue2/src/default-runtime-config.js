/**
 * `resolveRuntimeOptions` 的默认值来源；宿主可只覆盖部分字段。
 */
export const defaultWebExtendPluginRuntime = {
  manifestBase: '/fp-api',
  manifestListPath: '/api/frontend-plugins',
  manifestFetchCredentials: 'include',
  devPingPath: '/__web_plugin_dev_ping',
  devReloadSsePath: '/__web_plugin_reload_stream',
  webPluginDevEntryPath: '/src/plugin-entry.js',
  devPingTimeoutMs: 500,
  defaultImplicitDevPluginIds: [],
  allowedScriptHosts: ['localhost', '127.0.0.1', '::1'],
  bridgeAllowedPathPrefixes: ['/api/']
}
