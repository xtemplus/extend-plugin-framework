/**
 * 合并用户、环境与默认配置得到运行时选项。
 */

import {
  defaultWebExtendPluginRuntime,
  webExtendPluginEnvKeys
} from '../core/public-config-defaults'
import type { HostCapabilities } from '../core/host-component-registry'
import type { PluginRouteSnapshot } from '../host/plugin-route-snapshots'
import { resolveBundledEnv, resolveBundledIsDev } from './env-resolve'
import { resolveManifestModeFromInputs, resolveStaticManifestUrlFromInputs } from './manifest-mode'
import { ensureLeadingPath, normalizeHost } from './path-host-utils'

const DEF = defaultWebExtendPluginRuntime
const EK = webExtendPluginEnvKeys

/** 宿主注入、插件只读的依赖载体（如 Vuex、i18n、业务 API）；勿放不可序列化且会随插件变化的闭包 secrets */
export type OnBeforePluginActivateFn = (ctx: {
  pluginId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any
  pluginRecord: Readonly<Record<string, unknown>>
}) => void | Promise<void>

export type OnAfterPluginActivateFn = (ctx: {
  pluginId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any
  pluginRecord: Readonly<Record<string, unknown>>
  hostApi: unknown
}) => void | Promise<void>

export type OnPluginActivateErrorFn = (ctx: {
  pluginId: string
  error: unknown
  pluginRecord: Readonly<Record<string, unknown>>
  hostApi: unknown
}) => void | Promise<void>

export type OnPluginRoutesContributedFn = (ctx: {
  pluginId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any
  routes: ReadonlyArray<Record<string, unknown>>
  contributedRoutes: ReadonlyArray<PluginRouteSnapshot>
}) => void | Promise<void>

function resolveManifestCredentials(
  userVal: RequestCredentials | undefined,
  envKey: string,
  fallback: RequestCredentials
): RequestCredentials {
  if (userVal !== undefined) {
    const s = String(userVal)
    if (s === 'include' || s === 'omit' || s === 'same-origin') {
      return s as RequestCredentials
    }
  }
  const e = resolveBundledEnv(envKey, '')
  if (e === 'include' || e === 'omit' || e === 'same-origin') {
    return e
  }
  return fallback
}

function resolvePositiveInt(userVal: number | undefined, envKey: string, fallback: number): number {
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

/** 合并用户、环境变量与 `defaultWebExtendPluginRuntime`，得到完整运行时选项（宿主可只传需要覆盖的字段）。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveRuntimeOptions(user: Record<string, any> = {}) {
  const manifestBaseRaw =
    user.manifestBase !== undefined && user.manifestBase !== ''
      ? String(user.manifestBase)
      : resolveBundledEnv(EK.manifestBase, DEF.manifestBase) || DEF.manifestBase

  const manifestListPath = ensureLeadingPath(
    user.manifestListPath !== undefined && user.manifestListPath !== ''
      ? user.manifestListPath
      : resolveBundledEnv(EK.manifestListPath, DEF.manifestListPath)
  )

  const defaultImplicitDevPluginIds = Array.isArray(user.defaultImplicitDevPluginIds)
    ? user.defaultImplicitDevPluginIds.map(String).filter(Boolean)
    : (() => {
        const e = resolveBundledEnv(EK.implicitDevIds, '')
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
      ? user.allowedScriptHosts.map((h: string) => normalizeHost(String(h))).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv(EK.allowedScriptHosts, '')
          if (e) {
            return e
              .split(',')
              .map((s: string) => normalizeHost(s.trim()))
              .filter(Boolean)
          }
          return [...DEF.allowedScriptHosts]
        })()

  const bridgeAllowedPathPrefixes =
    Array.isArray(user.bridgeAllowedPathPrefixes) && user.bridgeAllowedPathPrefixes.length > 0
      ? user.bridgeAllowedPathPrefixes.map((p: string) => ensureLeadingPath(p)).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv(EK.bridgePrefixes, '')
          if (e) {
            return e
              .split(',')
              .map((s: string) => ensureLeadingPath(s.trim()))
              .filter(Boolean)
          }
          return [...DEF.bridgeAllowedPathPrefixes]
        })()

  const manifestMode = resolveManifestModeFromInputs(user.manifestMode)
  const staticManifestUrl = resolveStaticManifestUrlFromInputs(user.staticManifestUrl)

  const isDevResolved = user.isDev !== undefined ? user.isDev : resolveBundledIsDev()

  const devFallbackStaticManifestUrl = (() => {
    if (user.devFallbackStaticManifestUrl !== undefined && String(user.devFallbackStaticManifestUrl).trim() !== '') {
      return String(user.devFallbackStaticManifestUrl).trim()
    }
    const e = resolveBundledEnv(EK.devFallbackManifestUrl, '')
    if (e) {
      return e.trim()
    }
    return String(DEF.devFallbackStaticManifestUrl).trim()
  })()

  const hostLayoutComponent = user.hostLayoutComponent

  const pluginRoutesParentName =
    user.pluginRoutesParentName !== undefined && String(user.pluginRoutesParentName).trim() !== ''
      ? String(user.pluginRoutesParentName).trim()
      : ''

  const pluginMountRaw =
    user.pluginMountPath !== undefined && String(user.pluginMountPath).trim() !== ''
      ? String(user.pluginMountPath).trim()
      : String(resolveBundledEnv(EK.mountPath, '') || DEF.pluginMountPath).trim()

  const pluginMountPath = ensureLeadingPath(pluginMountRaw || DEF.pluginMountPath)

  const pluginHostRouteMeta =
    user.pluginHostRouteMeta !== undefined && user.pluginHostRouteMeta !== null
      ? user.pluginHostRouteMeta
      : undefined

  const ensurePluginHostRoute = user.ensurePluginHostRoute === true

  const devManifestFallback = (() => {
    if (manifestMode === 'static') {
      return false
    }
    if (user.devManifestFallback === false) {
      return false
    }
    if (user.devManifestFallback === true) {
      return true
    }
    const envFlag = resolveBundledEnv(EK.devManifestFallback, '')
    if (envFlag === '0' || envFlag === 'false') {
      return false
    }
    if (envFlag === '1' || envFlag === 'true') {
      return true
    }
    return !!isDevResolved
  })()

  return {
    manifestBase: manifestBaseRaw.replace(/\/$/, '') || DEF.manifestBase.replace(/\/$/, ''),
    manifestListPath,
    manifestMode,
    staticManifestUrl,
    devManifestFallback,
    devFallbackStaticManifestUrl,
    manifestFetchCredentials: resolveManifestCredentials(
      user.manifestFetchCredentials,
      EK.manifestCredentials,
      DEF.manifestFetchCredentials
    ),
    isDev: isDevResolved,
    webPluginDevOrigin:
      user.webPluginDevOrigin !== undefined
        ? user.webPluginDevOrigin
        : resolveBundledEnv(EK.webPluginDevOrigin, ''),
    webPluginDevIds:
      user.webPluginDevIds !== undefined ? user.webPluginDevIds : resolveBundledEnv(EK.webPluginDevIds, ''),
    webPluginDevMapJson:
      user.webPluginDevMapJson !== undefined
        ? user.webPluginDevMapJson
        : resolveBundledEnv(EK.webPluginDevMap, ''),
    webPluginDevEntryPath: ensureLeadingPath(
      user.webPluginDevEntryPath !== undefined && user.webPluginDevEntryPath !== ''
        ? user.webPluginDevEntryPath
        : resolveBundledEnv(EK.devEntry, DEF.webPluginDevEntryPath)
    ),
    devPingPath: ensureLeadingPath(
      user.devPingPath !== undefined && user.devPingPath !== ''
        ? user.devPingPath
        : resolveBundledEnv(EK.devPing, DEF.devPingPath)
    ),
    devReloadSsePath: ensureLeadingPath(
      user.devReloadSsePath !== undefined && user.devReloadSsePath !== ''
        ? user.devReloadSsePath
        : resolveBundledEnv(EK.devSse, DEF.devReloadSsePath)
    ),
    devPingTimeoutMs: resolvePositiveInt(user.devPingTimeoutMs, EK.devPingTimeout, DEF.devPingTimeoutMs),
    defaultImplicitDevPluginIds,
    allowedScriptHosts,
    bridgeAllowedPathPrefixes,
    bootstrapSummary: user.bootstrapSummary,
    hostLayoutComponent,
    pluginMountPath,
    pluginHostRouteMeta,
    ensurePluginHostRoute,
    pluginRoutesParentName,
    ...(typeof user.fetchManifest === 'function' ? { fetchManifest: user.fetchManifest } : {}),
    ...(typeof user.transformRoutes === 'function' ? { transformRoutes: user.transformRoutes } : {}),
    ...(typeof user.interceptRegisterRoutes === 'function'
      ? { interceptRegisterRoutes: user.interceptRegisterRoutes }
      : {}),
    ...(typeof user.adaptRouteDeclarations === 'function'
      ? { adaptRouteDeclarations: user.adaptRouteDeclarations }
      : {}),
    ...(typeof user.onPluginRoutesContributed === 'function'
      ? { onPluginRoutesContributed: user.onPluginRoutesContributed as OnPluginRoutesContributedFn }
      : {}),
    ...(user.hostContext !== undefined &&
    user.hostContext !== null &&
    typeof user.hostContext === 'object' &&
    !Array.isArray(user.hostContext)
      ? { hostContext: user.hostContext as Record<string, unknown> }
      : {}),
    ...(user.hostCapabilities !== undefined &&
    user.hostCapabilities !== null &&
    typeof user.hostCapabilities === 'object' &&
    !Array.isArray(user.hostCapabilities)
      ? { hostCapabilities: user.hostCapabilities as HostCapabilities }
      : {}),
    ...(typeof user.onBeforePluginActivate === 'function'
      ? { onBeforePluginActivate: user.onBeforePluginActivate as OnBeforePluginActivateFn }
      : {}),
    ...(typeof user.onAfterPluginActivate === 'function'
      ? { onAfterPluginActivate: user.onAfterPluginActivate as OnAfterPluginActivateFn }
      : {}),
    ...(typeof user.onPluginActivateError === 'function'
      ? { onPluginActivateError: user.onPluginActivateError as OnPluginActivateErrorFn }
      : {})
  }
}
