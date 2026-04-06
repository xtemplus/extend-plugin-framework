/**
 * `resolveRuntimeOptions` 的默认值来源；宿主可只覆盖部分字段。
 */
export const defaultWebExtendPluginRuntime = {
  manifestBase: '/fp-api',
  manifestListPath: '/api/frontend-plugins',
  manifestFetchCredentials: 'include' as RequestCredentials,
  devPingPath: '/__web_plugin_dev_ping',
  devReloadSsePath: '/__web_plugin_reload_stream',
  webPluginDevEntryPath: '/src/plugin-entry.js',
  devPingTimeoutMs: 500,
  defaultImplicitDevPluginIds: [] as string[],
  allowedScriptHosts: ['localhost', '127.0.0.1', '::1'],
  bridgeAllowedPathPrefixes: ['/api/'],
  /** 与 `hostLayoutComponent` 同时使用时默认父路由 name；`createHostApi.registerRoutes` 挂载其子路由 */
  pluginRoutesParentName: '__wepPluginHost',
  /** 插件壳路径（与菜单里 /plugin/... 前缀一致） */
  pluginMountPath: '/plugin',
  /** `manifestMode=api` 且开发环境下，API 失败或 plugins 为空时尝试此静态 JSON（宿主可放于 public/web-plugins/） */
  devFallbackStaticManifestUrl: '/web-plugins/plugins.manifest.json'
}
