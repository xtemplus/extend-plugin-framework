/**
 * 对外配置单一入口：`resolveRuntimeOptions` / 文档 / 其它模块的默认值与环境键名均由此引用。
 * 宿主通过 `resolveRuntimeOptions(partial)` 覆盖的对象形状见 `defaultWebExtendPluginRuntime`。
 */

/** 与 `package.json` 的 peer 下限一致；`npm run test:peer-min` / CI matrix 须与此保持同步 */
export const peerMinimumVersions = {
  vue: '2.6.14',
  vueRouter: '3.5.4'
} as const

// ---------------------------------------------------------------------------
// 协议与品牌（发布契约；与清单 `hostPluginApiVersion` 对齐 semver 主版本，一般不随宿主覆盖）
// ---------------------------------------------------------------------------

export const HOST_PLUGIN_API_VERSION = '1.0.0'

/** 控制台日志与首次引导横幅使用的短名称 */
export const RUNTIME_CONSOLE_LABEL = 'web-extend-plugin-vue2'

// ---------------------------------------------------------------------------
// 与 `build-env` / `resolveBundledEnv` 配套的键名（单一事实来源，便于检索与文档）
// ---------------------------------------------------------------------------

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
  /** 清单路径备选：部分宿主单独使用 */
  manifestPathAlt: 'VUE_APP_WEB_PLUGIN_MANIFEST_PATH'
} as const

// ---------------------------------------------------------------------------
// `manifestMode` 未配置且环境未指定时的默认值
// ---------------------------------------------------------------------------

export const defaultManifestMode = 'api' as const

// ---------------------------------------------------------------------------
// `manifest-fetch-composer` 中间件默认（中间件 options 可逐项覆盖）
// ---------------------------------------------------------------------------

export const defaultManifestFetchCache = {
  storageKeyPrefix: 'wep.manifestFetch.v1',
  maxEntries: 50
} as const

// ---------------------------------------------------------------------------
// 路由合成名前缀（`createHostApi` 为无 name 的路由生成 `__wep_${pluginId}_${seq}`）
// ---------------------------------------------------------------------------

export const routeSynthNamePrefix = '__wep_'

// ---------------------------------------------------------------------------
// 宿主可通过 `resolveRuntimeOptions` 覆盖的运行时默认值（与 README / index.d.ts 描述一致）
// ---------------------------------------------------------------------------

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
  /** 与 `hostLayoutComponent` 同时使用时默认父路由 name */
  pluginRoutesParentName: '__wepPluginHost',
  /** 插件壳路径（与菜单、ensurePluginHostRoute 一致） */
  pluginMountPath: '/plugin',
  /** `manifestMode=api` 且开发环境下，API 失败或 plugins 为空时尝试的静态 JSON（可放于 `public/web-plugins/`） */
  devFallbackStaticManifestUrl: '/web-plugins/plugins.manifest.json'
}
