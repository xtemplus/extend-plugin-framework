import {
  defaultWebExtendPluginRuntime,
  webExtendPluginEnvKeys
} from '../core/public-config-defaults'
import type { HostCapabilities } from '../core/host-component-registry'
import type { HostBridgeOptions } from '../host/install-host-bridge'
import type { PluginRouteSnapshot } from '../host/plugin-route-snapshots'
import { resolveBundledEnv, resolveBundledIsDev } from './env-resolve'
import { resolveManifestModeFromInputs, resolveStaticManifestUrlFromInputs } from './manifest-mode'
import { ensureLeadingPath, normalizeHost } from './path-host-utils'

const DEF = defaultWebExtendPluginRuntime
const EK = webExtendPluginEnvKeys

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

type ManifestOptionsInput = {
  baseUrl?: unknown
  listPath?: unknown
  source?: unknown
  staticUrl?: unknown
  credentials?: RequestCredentials
  fetch?: unknown
}

type HostRouteOptionsInput = {
  enabled?: unknown
  layout?: unknown
  mountPath?: unknown
  parentName?: unknown
  meta?: unknown
}

type HostOptionsInput = {
  bridge?: unknown
  context?: unknown
  capabilities?: unknown
  scriptHosts?: unknown
  requestPathPrefixes?: unknown
  route?: HostRouteOptionsInput
}

type DevManifestFallbackOptionsInput = {
  enabled?: unknown
  staticUrl?: unknown
}

type DevOptionsInput = {
  enabled?: unknown
  origin?: unknown
  pluginIds?: unknown
  pluginMap?: unknown
  entryPath?: unknown
  pingPath?: unknown
  reloadSsePath?: unknown
  pingTimeoutMs?: unknown
  manifestFallback?: DevManifestFallbackOptionsInput
  bootstrapSummary?: unknown
}

type HooksOptionsInput = {
  transformRoutes?: unknown
  interceptRegisterRoutes?: unknown
  adaptRouteDeclarations?: unknown
  onRoutesContributed?: unknown
  beforeActivate?: unknown
  afterActivate?: unknown
  onActivateError?: unknown
}

export type WebExtendPluginRuntimeOptions = {
  manifest?: ManifestOptionsInput
  host?: HostOptionsInput
  dev?: DevOptionsInput
  hooks?: HooksOptionsInput
}

export type ResolvedWebExtendPluginRuntimeOptions = {
  manifestBase: string
  manifestListPath: string
  manifestMode: 'api' | 'static'
  staticManifestUrl: string
  devManifestFallback: boolean
  devFallbackStaticManifestUrl: string
  manifestFetchCredentials: RequestCredentials
  isDev: boolean
  webPluginDevOrigin: string
  webPluginDevIds: string[]
  webPluginDevMapJson: string
  webPluginDevEntryPath: string
  devPingPath: string
  devReloadSsePath: string
  devPingTimeoutMs: number
  defaultImplicitDevPluginIds: string[]
  allowedScriptHosts: string[]
  bridgeAllowedPathPrefixes: string[]
  bootstrapSummary?: boolean
  hostLayoutComponent?: unknown
  pluginMountPath: string
  pluginHostRouteMeta?: Record<string, unknown>
  ensurePluginHostRoute: boolean
  pluginRoutesParentName: string
  fetchManifest?: (ctx: {
    manifestUrl: string
    credentials: RequestCredentials
  }) => Promise<unknown>
  transformRoutes?: unknown
  interceptRegisterRoutes?: unknown
  adaptRouteDeclarations?: unknown
  onPluginRoutesContributed?: OnPluginRoutesContributedFn
  hostContext?: Record<string, unknown>
  hostCapabilities?: HostCapabilities
  hostBridge?: HostBridgeOptions
  onBeforePluginActivate?: OnBeforePluginActivateFn
  onAfterPluginActivate?: OnAfterPluginActivateFn
  onPluginActivateError?: OnPluginActivateErrorFn
}

function asRecord<T extends Record<string, unknown>>(value: unknown): T | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined
}

function normalizeHostBridge(userVal: unknown): HostBridgeOptions | undefined {
  const raw = asRecord<Record<string, unknown>>(userVal)
  if (!raw) {
    return undefined
  }

  const normalized: HostBridgeOptions = {}
  if (raw.modules && typeof raw.modules === 'object' && !Array.isArray(raw.modules)) {
    normalized.modules = { ...(raw.modules as Record<string, unknown>) }
  }
  if (raw.components && typeof raw.components === 'object' && !Array.isArray(raw.components)) {
    normalized.components = { ...(raw.components as Record<string, unknown>) }
  }

  return normalized.modules || normalized.components ? normalized : undefined
}

function resolveManifestCredentials(
  userVal: RequestCredentials | undefined,
  envKey: string,
  fallback: RequestCredentials
): RequestCredentials {
  if (userVal !== undefined) {
    const normalized = String(userVal)
    if (normalized === 'include' || normalized === 'omit' || normalized === 'same-origin') {
      return normalized as RequestCredentials
    }
  }

  const envValue = resolveBundledEnv(envKey, '')
  if (envValue === 'include' || envValue === 'omit' || envValue === 'same-origin') {
    return envValue
  }
  return fallback
}

function resolvePositiveInt(userVal: unknown, envKey: string, fallback: number): number {
  if (typeof userVal === 'number' && Number.isFinite(userVal) && userVal > 0) {
    return Math.floor(userVal)
  }
  const raw = resolveBundledEnv(envKey, '')
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function resolveAllowedScriptHosts(value: unknown): string[] {
  const raw = normalizeStringList(value)
  return raw.length > 0 ? raw.map(normalizeHost).filter(Boolean) : []
}

function resolvePathPrefixes(value: unknown): string[] {
  const raw = normalizeStringList(value)
  return raw.length > 0 ? raw.map((item) => ensureLeadingPath(item)).filter(Boolean) : []
}

function resolveBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) {
    return value
  }
  return undefined
}

function resolveManifestInput(user: WebExtendPluginRuntimeOptions): ManifestOptionsInput {
  return asRecord<ManifestOptionsInput>(user.manifest) || {}
}

function resolveHostInput(user: WebExtendPluginRuntimeOptions): HostOptionsInput {
  return asRecord<HostOptionsInput>(user.host) || {}
}

function resolveDevInput(user: WebExtendPluginRuntimeOptions): DevOptionsInput {
  return asRecord<DevOptionsInput>(user.dev) || {}
}

function resolveHooksInput(user: WebExtendPluginRuntimeOptions): HooksOptionsInput {
  return asRecord<HooksOptionsInput>(user.hooks) || {}
}

function resolveDevPluginIds(dev: DevOptionsInput): string[] {
  const explicit = normalizeStringList(dev.pluginIds)
  if (explicit.length > 0) {
    return explicit
  }
  const fromEnv = normalizeStringList(resolveBundledEnv(EK.webPluginDevIds, ''))
  if (fromEnv.length > 0) {
    return fromEnv
  }
  const implicit = normalizeStringList(resolveBundledEnv(EK.implicitDevIds, ''))
  return implicit.length > 0 ? implicit : [...DEF.defaultImplicitDevPluginIds]
}

function resolveDevManifestFallback(dev: DevOptionsInput, manifestMode: 'api' | 'static', isDev: boolean): boolean {
  if (manifestMode === 'static') {
    return false
  }
  const direct = resolveBoolean(dev.manifestFallback && (dev.manifestFallback as DevManifestFallbackOptionsInput).enabled)
  if (direct !== undefined) {
    return direct
  }
  const envFlag = resolveBundledEnv(EK.devManifestFallback, '')
  if (envFlag === '0' || envFlag === 'false') {
    return false
  }
  if (envFlag === '1' || envFlag === 'true') {
    return true
  }
  return false
}

export function resolveRuntimeOptions(
  user: WebExtendPluginRuntimeOptions = {}
): ResolvedWebExtendPluginRuntimeOptions {
  const manifest = resolveManifestInput(user)
  const host = resolveHostInput(user)
  const hostRoute = asRecord<HostRouteOptionsInput>(host.route) || {}
  const dev = resolveDevInput(user)
  const devFallback = asRecord<DevManifestFallbackOptionsInput>(dev.manifestFallback) || {}
  const hooks = resolveHooksInput(user)
  const normalizedHostBridge = normalizeHostBridge(host.bridge)

  const manifestBaseRaw =
    manifest.baseUrl !== undefined && String(manifest.baseUrl).trim() !== ''
      ? String(manifest.baseUrl)
      : resolveBundledEnv(EK.manifestBase, DEF.manifestBase) || DEF.manifestBase

  const manifestListPath = ensureLeadingPath(
    manifest.listPath !== undefined && String(manifest.listPath).trim() !== ''
      ? manifest.listPath
      : resolveBundledEnv(EK.manifestListPath, DEF.manifestListPath)
  )

  const allowedScriptHosts = (() => {
    const explicit = resolveAllowedScriptHosts(host.scriptHosts)
    if (explicit.length > 0) {
      return explicit
    }
    const fromEnv = resolveAllowedScriptHosts(resolveBundledEnv(EK.allowedScriptHosts, ''))
    return fromEnv.length > 0 ? fromEnv : [...DEF.allowedScriptHosts]
  })()

  const bridgeAllowedPathPrefixes = (() => {
    const explicit = resolvePathPrefixes(host.requestPathPrefixes)
    if (explicit.length > 0) {
      return explicit
    }
    const fromEnv = resolvePathPrefixes(resolveBundledEnv(EK.bridgePrefixes, ''))
    return fromEnv.length > 0 ? fromEnv : [...DEF.bridgeAllowedPathPrefixes]
  })()

  const manifestMode = resolveManifestModeFromInputs(manifest.source)
  const staticManifestUrl = resolveStaticManifestUrlFromInputs(manifest.staticUrl)
  const isDev = resolveBoolean(dev.enabled) !== undefined ? Boolean(dev.enabled) : resolveBundledIsDev()

  const devFallbackStaticManifestUrl = (() => {
    if (devFallback.staticUrl !== undefined && String(devFallback.staticUrl).trim() !== '') {
      return String(devFallback.staticUrl).trim()
    }
    const envValue = resolveBundledEnv(EK.devFallbackManifestUrl, '')
    return envValue ? envValue.trim() : String(DEF.devFallbackStaticManifestUrl).trim()
  })()

  const pluginRoutesParentName =
    hostRoute.parentName !== undefined && String(hostRoute.parentName).trim() !== ''
      ? String(hostRoute.parentName).trim()
      : ''

  const pluginMountRaw =
    hostRoute.mountPath !== undefined && String(hostRoute.mountPath).trim() !== ''
      ? String(hostRoute.mountPath).trim()
      : String(resolveBundledEnv(EK.mountPath, '') || DEF.pluginMountPath).trim()

  const pluginMountPath = ensureLeadingPath(pluginMountRaw || DEF.pluginMountPath)
  const pluginHostRouteMeta = asRecord<Record<string, unknown>>(hostRoute.meta)
  const ensurePluginHostRoute = resolveBoolean(hostRoute.enabled) === true

  const webPluginDevMapJson = (() => {
    if (dev.pluginMap && typeof dev.pluginMap === 'object' && !Array.isArray(dev.pluginMap)) {
      return JSON.stringify(dev.pluginMap)
    }
    return dev.pluginMap !== undefined ? String(dev.pluginMap || '') : resolveBundledEnv(EK.webPluginDevMap, '')
  })()

  return {
    manifestBase: manifestBaseRaw.replace(/\/$/, '') || DEF.manifestBase.replace(/\/$/, ''),
    manifestListPath,
    manifestMode,
    staticManifestUrl,
    devManifestFallback: resolveDevManifestFallback(dev, manifestMode, isDev),
    devFallbackStaticManifestUrl,
    manifestFetchCredentials: resolveManifestCredentials(
      manifest.credentials,
      EK.manifestCredentials,
      DEF.manifestFetchCredentials
    ),
    isDev,
    webPluginDevOrigin:
      dev.origin !== undefined ? String(dev.origin || '').trim() : resolveBundledEnv(EK.webPluginDevOrigin, ''),
    webPluginDevIds: resolveDevPluginIds(dev),
    webPluginDevMapJson,
    webPluginDevEntryPath: ensureLeadingPath(
      dev.entryPath !== undefined && String(dev.entryPath).trim() !== ''
        ? String(dev.entryPath)
        : resolveBundledEnv(EK.devEntry, DEF.webPluginDevEntryPath)
    ),
    devPingPath: ensureLeadingPath(
      dev.pingPath !== undefined && String(dev.pingPath).trim() !== ''
        ? String(dev.pingPath)
        : resolveBundledEnv(EK.devPing, DEF.devPingPath)
    ),
    devReloadSsePath: ensureLeadingPath(
      dev.reloadSsePath !== undefined && String(dev.reloadSsePath).trim() !== ''
        ? String(dev.reloadSsePath)
        : resolveBundledEnv(EK.devSse, DEF.devReloadSsePath)
    ),
    devPingTimeoutMs: resolvePositiveInt(dev.pingTimeoutMs, EK.devPingTimeout, DEF.devPingTimeoutMs),
    defaultImplicitDevPluginIds: [...DEF.defaultImplicitDevPluginIds],
    allowedScriptHosts,
    bridgeAllowedPathPrefixes,
    bootstrapSummary: resolveBoolean(dev.bootstrapSummary),
    hostLayoutComponent: hostRoute.layout,
    pluginMountPath,
    pluginHostRouteMeta,
    ensurePluginHostRoute,
    pluginRoutesParentName,
    ...(typeof manifest.fetch === 'function' ? { fetchManifest: manifest.fetch } : {}),
    ...(typeof hooks.transformRoutes === 'function' ? { transformRoutes: hooks.transformRoutes } : {}),
    ...(typeof hooks.interceptRegisterRoutes === 'function'
      ? { interceptRegisterRoutes: hooks.interceptRegisterRoutes }
      : {}),
    ...(typeof hooks.adaptRouteDeclarations === 'function'
      ? { adaptRouteDeclarations: hooks.adaptRouteDeclarations }
      : {}),
    ...(typeof hooks.onRoutesContributed === 'function'
      ? { onPluginRoutesContributed: hooks.onRoutesContributed as OnPluginRoutesContributedFn }
      : {}),
    ...(asRecord<Record<string, unknown>>(host.context) ? { hostContext: asRecord<Record<string, unknown>>(host.context)! } : {}),
    ...(asRecord<HostCapabilities>(host.capabilities) ? { hostCapabilities: asRecord<HostCapabilities>(host.capabilities)! } : {}),
    ...(normalizedHostBridge ? { hostBridge: normalizedHostBridge } : {}),
    ...(typeof hooks.beforeActivate === 'function'
      ? { onBeforePluginActivate: hooks.beforeActivate as OnBeforePluginActivateFn }
      : {}),
    ...(typeof hooks.afterActivate === 'function'
      ? { onAfterPluginActivate: hooks.afterActivate as OnAfterPluginActivateFn }
      : {}),
    ...(typeof hooks.onActivateError === 'function'
      ? { onPluginActivateError: hooks.onActivateError as OnPluginActivateErrorFn }
      : {})
  }
}
