/**
 * 宿主侧插件引导：拉取清单、dev 映射、加载入口脚本、调用 activator。
 * 实现已拆至 `src/runtime/` 下各模块；本文件保留模块说明与对外类型约定，并 re-export 稳定 API。
 *
 * **Webpack 宿主**：用 `DefinePlugin` 注入 `process.env.VITE_*` 或 **`PLUGIN_*`**（等价键），或 `resolveRuntimeOptions` 显式传参。
 * **Vite 宿主**：入口调用 `setWebExtendPluginEnv(import.meta.env)`，或 `installWebExtendPluginVue2(..., { env: import.meta.env })`。
 *
 * @module PluginRuntime
 */

/**
 * @typedef {object} WebExtendPluginRuntimeOptions
 * @property {string} [manifestBase] 清单服务 URL 前缀
 * @property {string} [manifestListPath] 清单接口路径（以 `/` 开头），拼在 manifestBase 后
 * @property {RequestCredentials} [manifestFetchCredentials] 清单 fetch 的 credentials
 * @property {boolean} [isDev] 开发模式
 * @property {string} [webPluginDevOrigin] 插件 dev origin
 * @property {string} [webPluginDevIds] 逗号分隔 id，隐式 dev 映射
 * @property {string} [webPluginDevMapJson] 显式 dev 映射 JSON
 * @property {string} [webPluginDevEntryPath] 隐式 dev 入口路径（相对插件 dev origin）
 * @property {string} [devPingPath] dev 存活探测路径
 * @property {string} [devReloadSsePath] dev 热更新 SSE 路径
 * @property {number} [devPingTimeoutMs] 探测超时
 * @property {string[]} [defaultImplicitDevPluginIds] 无 `webPluginDevIds`/env 时用于隐式 dev 的 id；包内默认 `[]`
 * @property {string[]} [allowedScriptHosts] 允许加载脚本的主机名
 * @property {string[]} [bridgeAllowedPathPrefixes] bridge.request 白名单前缀
 * @property {boolean} [bootstrapSummary] bootstrap 结束是否打印摘要
 * @property {FetchWebPluginManifestFn} [fetchManifest] 由宿主拉取清单（如 axios/request）；未传则内部 `fetch(manifestUrl)`
 */

/**
 * @typedef {object} FetchWebPluginManifestContext
 * @property {string} manifestUrl `manifestBase` + `manifestListPath` 拼好的完整 URL（同源时常为绝对路径字符串）
 * @property {RequestCredentials} credentials 与 `manifestFetchCredentials` 一致
 */

/**
 * @typedef {object} FetchWebPluginManifestResult
 * @property {boolean} ok
 * @property {number} [status] HTTP 状态码（`ok === false` 且非网络错误时可带）
 * @property {{ hostPluginApiVersion?: string, plugins?: object[] }|null} [data] 与后端清单 JSON 一致；`plugins` 为插件条目数组
 * @property {unknown} [error]
 */

/**
 * @callback FetchWebPluginManifestFn
 * @param {FetchWebPluginManifestContext} ctx
 * @returns {Promise<FetchWebPluginManifestResult>}
 */

export { resolveRuntimeOptions } from './runtime/resolve-runtime-options.js'
export { defaultFetchWebPluginManifest } from './runtime/default-fetch-manifest.js'
export { bootstrapPlugins } from './runtime/bootstrap-plugins.js'
