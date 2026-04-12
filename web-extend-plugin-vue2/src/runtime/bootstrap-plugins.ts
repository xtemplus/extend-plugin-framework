/**
 * 拉取插件清单、加载入口脚本并调用各插件 `activator`。
 */
import semver from 'semver'
import { HOST_PLUGIN_API_VERSION, webExtendPluginEnvKeys } from '../core/public-config-defaults'
import { setPluginBootstrapRouter } from '../host/plugin-bootstrap-router'
import { disposeWebPlugin } from '../host/dispose-web-plugin'
import { defaultFetchWebPluginManifest } from './default-fetch-manifest'
import { buildImplicitWebPluginDevMap, mergeDevMaps, parseWebPluginDevMapExplicit } from './dev-map'
import { startPluginDevSseForMap } from './dev-reload-sse'
import { resolveBundledEnv, resolveBundledIsDev } from './env-resolve'
import { loadScript } from './load-script'
import { buildAllowedScriptHostsSet, isScriptHostAllowed } from './path-host-utils'
import { printRuntimeBannerOnce } from './print-runtime-banner'
import { fetchStaticManifestViaHttp } from './fetch-static-manifest'
import { ensurePluginHostRoute } from './ensure-plugin-host-route'
import { freezeShallowHostContext } from '../core/host-context'
import { resolveRuntimeOptions } from './resolve-runtime-options'
import { resolveStaticManifestUrlForFetch } from './resolve-static-manifest-url'
import {
  clearActivatedPluginIds,
  markPluginActivated,
  markPluginDeactivated
} from './plugin-activation-registry'

function shouldShowBootstrapSummary(opts: { bootstrapSummary?: boolean }) {
  if (opts.bootstrapSummary === true) {
    return true
  }
  if (opts.bootstrapSummary === false) {
    return false
  }
  const env = resolveBundledEnv(webExtendPluginEnvKeys.pluginsBootstrapSummary, '')
  if (env === '0' || env === 'false') {
    return false
  }
  if (env === '1' || env === 'true') {
    return true
  }
  return resolveBundledIsDev()
}

async function loadPluginEntry(
  p: { id: string },
  entryUrl: string | undefined,
  devMap: Record<string, string> | null,
  hostSet: Set<string>
) {
  const devEntry = devMap && typeof devMap[p.id] === 'string' ? devMap[p.id].trim() : ''
  if (devEntry) {
    if (!isScriptHostAllowed(devEntry, hostSet)) {
      console.warn('[wep] dev entry URL not allowed', p.id, devEntry)
      return
    }
    try {
      await import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        devEntry
      )
    } catch (e) {
      console.warn('[wep] dev import failed, trying manifest entryUrl', p.id, e)
      if (entryUrl && isScriptHostAllowed(entryUrl, hostSet)) {
        await loadScript(entryUrl, p.id)
      }
      return
    }
    return
  }
  if (!entryUrl || !isScriptHostAllowed(entryUrl, hostSet)) {
    console.warn('[wep] skip (entryUrl not allowed)', p.id, entryUrl)
    return
  }
  await loadScript(entryUrl, p.id)
}

type ManifestPluginEntry = {
  id: string
  priority?: unknown
  engines?: { host?: string }
  entryUrl?: string
}

type ManifestBody = {
  hostPluginApiVersion?: string
  plugins?: ManifestPluginEntry[]
}

type ManifestFetchResult = {
  ok: boolean
  status?: number
  data?: ManifestBody | null
  error?: unknown
}

function coercePriority(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function sortByPriority(plugins: ManifestPluginEntry[]) {
  return plugins
    .map((entry, index) => ({
      entry,
      priority: coercePriority(entry.priority),
      index
    }))
    .sort((a, b) => {
      const aHas = a.priority !== null
      const bHas = b.priority !== null
      if (!aHas && !bHas) {
        return a.index - b.index
      }
      if (!aHas) {
        return 1
      }
      if (!bHas) {
        return -1
      }
      if (a.priority! !== b.priority!) {
        return a.priority! - b.priority!
      }
      return a.index - b.index
    })
    .map((decorated) => decorated.entry)
}

function logBootstrapSummary(enabled: boolean, payload: { ok: boolean; reason?: string } & Record<string, unknown>) {
  if (enabled) {
    console.info('[wep] bootstrap_summary', payload)
  }
}

function getManifestBody(result: ManifestFetchResult): ManifestBody | null {
  return result.ok && result.data && typeof result.data === 'object' ? result.data : null
}

function getManifestPluginCount(result: ManifestFetchResult): number {
  const body = getManifestBody(result)
  return body && Array.isArray(body.plugins) ? body.plugins.length : 0
}

async function fetchManifestSafely(
  fetchManifest: ((ctx: { manifestUrl: string; credentials: RequestCredentials }) => Promise<ManifestFetchResult>) | undefined,
  manifestCtx: { manifestUrl: string; credentials: RequestCredentials }
): Promise<ManifestFetchResult> {
  try {
    if (typeof fetchManifest === 'function') {
      return await fetchManifest(manifestCtx)
    }
    return await defaultFetchWebPluginManifest(manifestCtx)
  } catch (error) {
    return { ok: false, error, data: null }
  }
}

function buildHostKit(opts: Record<string, unknown>) {
  const frozenHostContext = freezeShallowHostContext(
    opts.hostContext !== undefined ? opts.hostContext : undefined,
    opts.hostCapabilities && typeof opts.hostCapabilities === 'object' ? opts.hostCapabilities : undefined
  )

  return {
    hostContext: frozenHostContext,
    bridgeAllowedPathPrefixes: opts.bridgeAllowedPathPrefixes,
    ...(opts.pluginRoutesParentName ? { pluginRoutesParentName: opts.pluginRoutesParentName } : {}),
    ...(typeof opts.transformRoutes === 'function' ? { transformRoutes: opts.transformRoutes } : {}),
    ...(typeof opts.interceptRegisterRoutes === 'function'
      ? { interceptRegisterRoutes: opts.interceptRegisterRoutes }
      : {}),
    ...(typeof opts.adaptRouteDeclarations === 'function'
      ? { adaptRouteDeclarations: opts.adaptRouteDeclarations }
      : {}),
    ...(typeof opts.onPluginRoutesContributed === 'function'
      ? { onPluginRoutesContributed: opts.onPluginRoutesContributed }
      : {})
  }
}

function resolveManifestRequest(
  opts: Record<string, unknown>
): { isStatic: boolean; manifestUrl: string } | null {
  const isStatic = opts.manifestMode === 'static'
  if (isStatic) {
    const raw = String(opts.staticManifestUrl || '').trim()
    if (!raw) {
      return null
    }
    return {
      isStatic,
      manifestUrl: resolveStaticManifestUrlForFetch(raw, window.location.origin)
    }
  }

  const base = String(opts.manifestBase).replace(/\/$/, '')
  return {
    isStatic,
    manifestUrl: `${base}${opts.manifestListPath}`
  }
}

function isResolvedRuntimeOptions(input: unknown): input is Record<string, unknown> {
  return !!(
    input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    ('manifestBase' in (input as Record<string, unknown>) ||
      'manifestListPath' in (input as Record<string, unknown>) ||
      'fetchManifest' in (input as Record<string, unknown>))
  )
}

export async function bootstrapPlugins(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createHostApiFactory: (pluginId: string, router: any, hostKit?: Record<string, unknown>) => unknown,
  runtimeOptions?: Record<string, unknown>
) {
  if (typeof window === 'undefined') {
    console.warn('[wep] bootstrapPlugins skipped (no window)')
    return
  }
  printRuntimeBannerOnce()
  clearActivatedPluginIds()
  const opts = isResolvedRuntimeOptions(runtimeOptions) ? runtimeOptions : resolveRuntimeOptions(runtimeOptions)
  const showBootstrapSummary = shouldShowBootstrapSummary(opts)
  setPluginBootstrapRouter(router)
  ensurePluginHostRoute(router, opts)
  const manifestRequest = resolveManifestRequest(opts)
  if (!manifestRequest) {
    console.warn('[wep] manifestMode=static requires non-empty staticManifestUrl (or env VITE_WEB_PLUGIN_STATIC_MANIFEST_URL)')
    logBootstrapSummary(showBootstrapSummary, { ok: false, reason: 'static_manifest_url_missing' })
    return
  }
  const { isStatic, manifestUrl } = manifestRequest
  const hostSet = buildAllowedScriptHostsSet(opts.allowedScriptHosts)
  const explicit = parseWebPluginDevMapExplicit(opts)

  const manifestCtx = {
    manifestUrl,
    credentials: opts.manifestFetchCredentials
  }
  const [primaryResult, implicit] = await Promise.all([
    fetchManifestSafely(
      typeof opts.fetchManifest === 'function'
        ? (opts.fetchManifest as (ctx: { manifestUrl: string; credentials: RequestCredentials }) => Promise<ManifestFetchResult>)
        : undefined,
      manifestCtx
    ),
    buildImplicitWebPluginDevMap(opts, hostSet)
  ])

  let manifestResult = primaryResult
  let manifestUrlUsed = manifestUrl
  if (!isStatic && opts.devManifestFallback && opts.isDev) {
    const needFallback = !primaryResult.ok || getManifestPluginCount(primaryResult) === 0
    const fallbackRaw = String(opts.devFallbackStaticManifestUrl || '').trim()
    if (needFallback && fallbackRaw) {
      const fallbackUrl = resolveStaticManifestUrlForFetch(fallbackRaw, window.location.origin)
      const fallbackCtx = {
        manifestUrl: fallbackUrl,
        credentials: opts.manifestFetchCredentials
      }
      const fr = await fetchStaticManifestViaHttp(fallbackCtx)
      const flen = getManifestPluginCount(fr)
      if (fr.ok && flen > 0) {
        manifestResult = fr
        manifestUrlUsed = fallbackUrl
        console.info('[wep] dev manifest fallback', { url: fallbackUrl, plugins: flen })
      }
    }
  }

  const devMap = mergeDevMaps(implicit, explicit)
  startPluginDevSseForMap(devMap, opts.isDev, hostSet, opts.devReloadSsePath)

  const hostKit = buildHostKit(opts)

  if (!manifestResult.ok) {
    if (manifestResult.error) {
      console.warn('[wep] fetch manifest failed', manifestResult.error)
    } else {
      const label = isStatic ? 'static manifest' : 'manifest HTTP'
      console.warn(`[wep] ${label}`, manifestResult.status, manifestUrlUsed)
    }
    logBootstrapSummary(showBootstrapSummary, { ok: false, reason: 'manifest_fetch' })
    return
  }
  const data = getManifestBody(manifestResult)
  if (!data) {
    logBootstrapSummary(showBootstrapSummary, { ok: false, reason: 'manifest_empty_body' })
    return
  }

  const apiVer = data.hostPluginApiVersion
  if (apiVer) {
    const coerced = semver.coerce(apiVer)
    const maj = coerced ? coerced.major : 0
    const range = `^${maj}.0.0`
    if (!semver.satisfies(HOST_PLUGIN_API_VERSION, range, { includePrerelease: true })) {
      console.warn('[wep] manifest host API version mismatch; skip bootstrap', {
        host: HOST_PLUGIN_API_VERSION,
        manifest: apiVer
      })
      logBootstrapSummary(showBootstrapSummary, {
        ok: false,
        reason: 'manifest_host_api_version_mismatch'
      })
      return
    }
  }

  window.__PLUGIN_ACTIVATORS__ = window.__PLUGIN_ACTIVATORS__ || {}

  const originalPlugins = data.plugins || []
  const plugins = sortByPriority(originalPlugins)
  if (plugins.length === 0) {
    const hint = isStatic ? 'check static JSON file and plugins[]' : 'check backend and URL'
    console.info('[wep] empty plugin manifest — ' + hint, manifestUrlUsed)
  }

  const summary = {
    manifestCount: originalPlugins.length,
    activated: 0,
    skipApiVersion: 0,
    skipLoad: 0,
    skipNoActivator: 0,
    activateFail: 0
  }

  for (const p of plugins) {
    const range = p.engines && p.engines.host
    if (range && !semver.satisfies(HOST_PLUGIN_API_VERSION, range, { includePrerelease: true })) {
      console.warn('[wep] skip plugin (engines.host)', p.id, range, {
        host: HOST_PLUGIN_API_VERSION
      })
      summary.skipApiVersion++
      continue
    }
    const entryUrl = p.entryUrl
    try {
      await loadPluginEntry(p, entryUrl, devMap, hostSet)
    } catch (e) {
      console.warn('[wep] script load failed', p.id, e)
      summary.skipLoad++
      continue
    }
    const activator = window.__PLUGIN_ACTIVATORS__![p.id]
    if (typeof activator !== 'function') {
      console.warn('[wep] no activator for', p.id)
      summary.skipNoActivator++
      continue
    }

    const pluginRecord = Object.freeze({ ...p })

    try {
      if (typeof opts.onBeforePluginActivate === 'function') {
        await Promise.resolve(
          opts.onBeforePluginActivate({
            pluginId: p.id,
            router,
            pluginRecord
          })
        )
      }
    } catch (e) {
      console.warn('[wep] activate skipped (onBeforePluginActivate)', p.id, e)
      summary.activateFail++
      continue
    }

    const hostApi = createHostApiFactory(p.id, router, hostKit)
    try {
      await Promise.resolve(activator(hostApi, { pluginRecord }))
      markPluginActivated(p.id)
      const teardownCapableHostApi = hostApi as { onTeardown?: (pluginId: string, fn: () => void) => void }
      if (typeof teardownCapableHostApi.onTeardown === 'function') {
        teardownCapableHostApi.onTeardown(p.id, () => markPluginDeactivated(p.id))
      }
      summary.activated++
      if (typeof opts.onAfterPluginActivate === 'function') {
        await Promise.resolve(
          opts.onAfterPluginActivate({
            pluginId: p.id,
            router,
            pluginRecord,
            hostApi
          })
        )
      }
    } catch (e) {
      console.error('[wep] activate failed', p.id, e)
      try {
        disposeWebPlugin(p.id)
      } catch (disposeErr) {
        console.warn('[wep] rollback failed after activation error', p.id, disposeErr)
      }
      summary.activateFail++
      if (typeof opts.onPluginActivateError === 'function') {
        try {
          await Promise.resolve(
            opts.onPluginActivateError({
              pluginId: p.id,
              error: e,
              pluginRecord,
              hostApi
            })
          )
        } catch (hookErr) {
          console.warn('[wep] onPluginActivateError hook failed', p.id, hookErr)
        }
      }
    }
  }

  logBootstrapSummary(showBootstrapSummary, { ok: true, ...summary })
}
