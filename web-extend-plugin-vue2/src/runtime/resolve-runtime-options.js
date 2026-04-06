/**
 * 合并用户、环境与默认配置得到运行时选项。
 * @module runtime/resolve-runtime-options
 */

/**
 * @typedef {object} WebExtendPluginRuntimeOptions
 * @property {string} [manifestBase]
 * @property {string} [manifestListPath]
 * @property {RequestCredentials} [manifestFetchCredentials]
 * @property {boolean} [isDev]
 * @property {string} [webPluginDevOrigin]
 * @property {string} [webPluginDevIds]
 * @property {string} [webPluginDevMapJson]
 * @property {string} [webPluginDevEntryPath]
 * @property {string} [devPingPath]
 * @property {string} [devReloadSsePath]
 * @property {number} [devPingTimeoutMs]
 * @property {string[]} [defaultImplicitDevPluginIds]
 * @property {string[]} [allowedScriptHosts]
 * @property {string[]} [bridgeAllowedPathPrefixes]
 * @property {boolean} [bootstrapSummary]
 * @property {(ctx: { manifestUrl: string, credentials: RequestCredentials }) => Promise<{ ok: boolean, status?: number, data?: unknown, error?: unknown }>} [fetchManifest]
 * @property {string} [pluginRoutesParentName] 已存在的**命名路由** name；非空时 `registerRoutes` 通过 `router.addRoute(parentName, child)` 挂到该父级下（通常为带 Layout 的壳路由），子项 path 应为相对路径
 * @property {(ctx: { pluginId: string, router: import('vue-router').default, routes: ReadonlyArray<import('vue-router').RouteConfig> }) => import('vue-router').RouteConfig[]} [transformRoutes] 在合成 `name`/`meta.pluginId` 之前转换 `RouteConfig`
 * @property {(ctx: { pluginId: string, router: import('vue-router').default, routes: ReadonlyArray<import('vue-router').RouteConfig>, applyInternalRegister: (routes: import('vue-router').RouteConfig[]) => void }) => void} [interceptRegisterRoutes]
 * @property {(ctx: { pluginId: string, router: import('vue-router').default, declarations: ReadonlyArray<object> }) => import('vue-router').RouteConfig[]} [adaptRouteDeclarations] PRD（如含 `componentRef`）→ `RouteConfig`
 */

import { defaultWebExtendPluginRuntime } from '../default-runtime-config.js'
import { resolveBundledEnv, resolveBundledIsDev } from './env-resolve.js'
import { ensureLeadingPath, normalizeHost } from './path-host-utils.js'

const DEF = defaultWebExtendPluginRuntime

/**
 * @param {string|undefined} userVal
 * @param {string} envKey
 * @param {RequestCredentials} fallback
 */
function resolveManifestCredentials(userVal, envKey, fallback) {
  if (userVal !== undefined && userVal !== '') {
    const s = String(userVal)
    if (s === 'include' || s === 'omit' || s === 'same-origin') {
      return s
    }
  }
  const e = resolveBundledEnv(envKey, '')
  if (e === 'include' || e === 'omit' || e === 'same-origin') {
    return e
  }
  return fallback
}

/**
 * @param {number|undefined} userVal
 * @param {string} envKey
 * @param {number} fallback
 */
function resolvePositiveInt(userVal, envKey, fallback) {
  if (typeof userVal === 'number' && Number.isFinite(userVal) && userVal > 0) {
    return Math.floor(userVal)
  }
  const raw = resolveBundledEnv(envKey, '')
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n > 0) {
    return n
  }
  return fallback
}

/**
 * 合并用户、环境变量与 `defaultWebExtendPluginRuntime`，得到完整运行时选项（宿主可只传需要覆盖的字段）。
 * @param {WebExtendPluginRuntimeOptions} [user]
 * @returns {object}
 */
export function resolveRuntimeOptions(user = {}) {
  const manifestBaseRaw =
    user.manifestBase !== undefined && user.manifestBase !== ''
      ? String(user.manifestBase)
      : resolveBundledEnv('VITE_FRONTEND_PLUGIN_BASE', DEF.manifestBase) || DEF.manifestBase

  const manifestListPath = ensureLeadingPath(
    user.manifestListPath !== undefined && user.manifestListPath !== ''
      ? user.manifestListPath
      : resolveBundledEnv('VITE_WEB_PLUGIN_MANIFEST_PATH', DEF.manifestListPath)
  )

  const defaultImplicitDevPluginIds = Array.isArray(user.defaultImplicitDevPluginIds)
    ? user.defaultImplicitDevPluginIds.map(String).filter(Boolean)
    : (() => {
        const e = resolveBundledEnv('VITE_WEB_PLUGIN_IMPLICIT_DEV_IDS', '')
        if (e) {
          return e
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        }
        return [...DEF.defaultImplicitDevPluginIds]
      })()

  const allowedScriptHosts =
    Array.isArray(user.allowedScriptHosts) && user.allowedScriptHosts.length > 0
      ? user.allowedScriptHosts.map((h) => normalizeHost(String(h))).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv('VITE_WEB_PLUGIN_ALLOWED_SCRIPT_HOSTS', '')
          if (e) {
            return e
              .split(',')
              .map((s) => normalizeHost(s.trim()))
              .filter(Boolean)
          }
          return [...DEF.allowedScriptHosts]
        })()

  const bridgeAllowedPathPrefixes =
    Array.isArray(user.bridgeAllowedPathPrefixes) && user.bridgeAllowedPathPrefixes.length > 0
      ? user.bridgeAllowedPathPrefixes.map((p) => ensureLeadingPath(p)).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv('VITE_WEB_PLUGIN_BRIDGE_PREFIXES', '')
          if (e) {
            return e
              .split(',')
              .map((s) => ensureLeadingPath(s.trim()))
              .filter(Boolean)
          }
          return [...DEF.bridgeAllowedPathPrefixes]
        })()

  return {
    manifestBase: manifestBaseRaw.replace(/\/$/, '') || DEF.manifestBase.replace(/\/$/, ''),
    manifestListPath,
    manifestFetchCredentials: resolveManifestCredentials(
      user.manifestFetchCredentials,
      'VITE_WEB_PLUGIN_MANIFEST_CREDENTIALS',
      DEF.manifestFetchCredentials
    ),
    isDev: user.isDev !== undefined ? user.isDev : resolveBundledIsDev(),
    webPluginDevOrigin:
      user.webPluginDevOrigin !== undefined ? user.webPluginDevOrigin : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_ORIGIN', ''),
    webPluginDevIds:
      user.webPluginDevIds !== undefined ? user.webPluginDevIds : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_IDS', ''),
    webPluginDevMapJson:
      user.webPluginDevMapJson !== undefined
        ? user.webPluginDevMapJson
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_MAP', ''),
    webPluginDevEntryPath: ensureLeadingPath(
      user.webPluginDevEntryPath !== undefined && user.webPluginDevEntryPath !== ''
        ? user.webPluginDevEntryPath
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_ENTRY', DEF.webPluginDevEntryPath)
    ),
    devPingPath: ensureLeadingPath(
      user.devPingPath !== undefined && user.devPingPath !== ''
        ? user.devPingPath
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_PING_PATH', DEF.devPingPath)
    ),
    devReloadSsePath: ensureLeadingPath(
      user.devReloadSsePath !== undefined && user.devReloadSsePath !== ''
        ? user.devReloadSsePath
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_SSE_PATH', DEF.devReloadSsePath)
    ),
    devPingTimeoutMs: resolvePositiveInt(user.devPingTimeoutMs, 'VITE_WEB_PLUGIN_DEV_PING_TIMEOUT_MS', DEF.devPingTimeoutMs),
    defaultImplicitDevPluginIds,
    allowedScriptHosts,
    bridgeAllowedPathPrefixes,
    bootstrapSummary: user.bootstrapSummary,
    pluginRoutesParentName:
      user.pluginRoutesParentName !== undefined && String(user.pluginRoutesParentName).trim() !== ''
        ? String(user.pluginRoutesParentName).trim()
        : '',
    ...(typeof user.fetchManifest === 'function' ? { fetchManifest: user.fetchManifest } : {}),
    ...(typeof user.transformRoutes === 'function' ? { transformRoutes: user.transformRoutes } : {}),
    ...(typeof user.interceptRegisterRoutes === 'function'
      ? { interceptRegisterRoutes: user.interceptRegisterRoutes }
      : {}),
    ...(typeof user.adaptRouteDeclarations === 'function'
      ? { adaptRouteDeclarations: user.adaptRouteDeclarations }
      : {})
  }
}
