/**
 * 宿主可覆盖的默认运行时配置（路径、白名单、超时等）。
 * 使用方式：`resolveRuntimeOptions({ ...defaultWebExtendPluginRuntime, manifestListPath: '/api/my-plugins' })`
 * 或只传需要改动的字段：`resolveRuntimeOptions({ manifestListPath: '/api/my-plugins' })`。
 *
 * @module default-runtime-config
 */

/**
 * @typedef {typeof defaultWebExtendPluginRuntime} WebExtendPluginDefaultRuntime
 */

export const defaultWebExtendPluginRuntime = {
  /** 清单 HTTP 服务前缀（与后端 context-path 对齐），不含尾部 `/` */
  manifestBase: '/fp-api',

  /**
   * 拉取插件清单的 **路径段**（以 `/` 开头），拼在 `manifestBase` 之后。
   * 完整 URL：`{manifestBase}{manifestListPath}` → 默认 `/fp-api/api/frontend-plugins`
   */
  manifestListPath: '/api/frontend-plugins',

  /** 清单 `fetch` 的 `credentials`，需 Cookie 会话时用 `include` */
  manifestFetchCredentials: 'include',

  /** 插件 dev 服务存活探测路径（拼在 `webPluginDevOrigin` 后） */
  devPingPath: '/__web_plugin_dev_ping',

  /** 插件 dev 热更新 SSE 路径（拼在插件 dev 的 origin 后） */
  devReloadSsePath: '/__web_plugin_reload_stream',

  /** 隐式 dev 映射里，每个 id 对应的入口路径（相对插件 dev origin） */
  webPluginDevEntryPath: '/src/plugin-entry.js',

  /** `fetch(devPingUrl)` 超时毫秒数 */
  devPingTimeoutMs: 500,

  /**
   * **隐式 dev 映射**（可选）：开发模式下若 `webPluginDevOrigin` 上 ping 成功，运行时会为若干插件 id 自动生成
   * `{ id → origin + webPluginDevEntryPath }`，从而用 dev 服务入口替代清单里的 dist，便于热更新联调。
   *
   * 插件 id 来源优先级：`webPluginDevIds`（或 `VITE_WEB_PLUGIN_DEV_IDS`）→ 本字段。**默认 `[]`**，
   * 避免把仓库示例 id 写进通用宿主；联调时在 `.env` 里设 `VITE_WEB_PLUGIN_DEV_IDS=com.xxx,com.yyy`，
   * 或 `resolveRuntimeOptions({ defaultImplicitDevPluginIds: ['com.xxx'] })` 即可。
   */
  defaultImplicitDevPluginIds: [],

  /**
   * 允许通过 `<script>` / 动态 `import()` 加载的插件脚本所在主机名（小写），防误配公网 URL。
   */
  allowedScriptHosts: ['localhost', '127.0.0.1', '::1'],

  /**
   * `hostApi.getBridge().request(path)` 允许的 path 前缀；须以 `/` 开头。
   * 需与后端实际 API 前缀一致。
   */
  bridgeAllowedPathPrefixes: ['/api/']
}
