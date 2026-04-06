/**
 * 拉取插件清单、加载入口脚本并调用各插件 `activator`。
 */
import semver from 'semver'
import { HOST_PLUGIN_API_VERSION } from '../core/constants'
import { setRevokePluginMenuItems } from '../core/host-menu-integration'
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

function shouldShowBootstrapSummary(opts: { bootstrapSummary?: boolean }) {
  if (opts.bootstrapSummary === true) {
    return true
  }
  if (opts.bootstrapSummary === false) {
    return false
  }
  const env = resolveBundledEnv('VITE_PLUGINS_BOOTSTRAP_SUMMARY', '')
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
        await loadScript(entryUrl)
      }
      return
    }
    return
  }
  if (!entryUrl || !isScriptHostAllowed(entryUrl, hostSet)) {
    console.warn('[wep] skip (entryUrl not allowed)', p.id, entryUrl)
    return
  }
  await loadScript(entryUrl)
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
  const opts = resolveRuntimeOptions(runtimeOptions || {})
  setRevokePluginMenuItems(
    typeof opts.revokePluginMenuItems === 'function' ? opts.revokePluginMenuItems : undefined
  )
  ensurePluginHostRoute(router, opts)
  const base = String(opts.manifestBase).replace(/\/$/, '')
  const isStatic = opts.manifestMode === 'static'
  let manifestUrl: string
  if (isStatic) {
    const raw = String(opts.staticManifestUrl || '').trim()
    if (!raw) {
      console.warn('[wep] manifestMode=static requires non-empty staticManifestUrl (or env VITE_WEB_PLUGIN_STATIC_MANIFEST_URL)')
      if (shouldShowBootstrapSummary(opts)) {
        console.info('[wep] bootstrap_summary', { ok: false, reason: 'static_manifest_url_missing' })
      }
      return
    }
    manifestUrl = resolveStaticManifestUrlForFetch(raw, window.location.origin)
  } else {
    manifestUrl = `${base}${opts.manifestListPath}`
  }
  const hostSet = buildAllowedScriptHostsSet(opts.allowedScriptHosts)
  const explicit = parseWebPluginDevMapExplicit(opts)

  const manifestCtx = {
    manifestUrl,
    credentials: opts.manifestFetchCredentials
  }
  const [primaryResult, implicit] = await Promise.all([
    (async () => {
      try {
        if (typeof opts.fetchManifest === 'function') {
          return await opts.fetchManifest(manifestCtx)
        }
        return await defaultFetchWebPluginManifest(manifestCtx)
      } catch (e) {
        return { ok: false, error: e, data: null }
      }
    })(),
    buildImplicitWebPluginDevMap(opts, hostSet)
  ])

  let manifestResult = primaryResult
  let manifestUrlUsed = manifestUrl
  if (!isStatic && opts.devManifestFallback && opts.isDev) {
    const dataObj =
      primaryResult.ok && primaryResult.data && typeof primaryResult.data === 'object'
        ? (primaryResult.data as { plugins?: unknown[] })
        : null
    const plen = dataObj && Array.isArray(dataObj.plugins) ? dataObj.plugins.length : 0
    const needFallback = !primaryResult.ok || plen === 0
    const fallbackRaw = String(opts.devFallbackStaticManifestUrl || '').trim()
    if (needFallback && fallbackRaw) {
      const fallbackUrl = resolveStaticManifestUrlForFetch(fallbackRaw, window.location.origin)
      const fallbackCtx = {
        manifestUrl: fallbackUrl,
        credentials: opts.manifestFetchCredentials
      }
      const fr = await fetchStaticManifestViaHttp(fallbackCtx)
      const fdata =
        fr.ok && fr.data && typeof fr.data === 'object' ? (fr.data as { plugins?: unknown[] }) : null
      const flen = fdata && Array.isArray(fdata.plugins) ? fdata.plugins.length : 0
      if (fr.ok && flen > 0) {
        manifestResult = fr
        manifestUrlUsed = fallbackUrl
        console.info('[wep] dev manifest fallback', { url: fallbackUrl, plugins: flen })
      }
    }
  }

  const devMap = mergeDevMaps(implicit, explicit)
  startPluginDevSseForMap(devMap, opts.isDev, hostSet, opts.devReloadSsePath)

  const frozenHostContext = freezeShallowHostContext(
    opts.hostContext !== undefined ? opts.hostContext : undefined
  )

  const hostKit: Record<string, unknown> = {
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
    ...(typeof opts.applyPluginMenuItems === 'function'
      ? { applyPluginMenuItems: opts.applyPluginMenuItems }
      : {}),
    ...(typeof opts.revokePluginMenuItems === 'function'
      ? { revokePluginMenuItems: opts.revokePluginMenuItems }
      : {})
  }

  if (!manifestResult.ok) {
    if (manifestResult.error) {
      console.warn('[wep] fetch manifest failed', manifestResult.error)
    } else {
      const label = isStatic ? 'static manifest' : 'manifest HTTP'
      console.warn(`[wep] ${label}`, manifestResult.status, manifestUrlUsed)
    }
    if (shouldShowBootstrapSummary(opts)) {
      console.info('[wep] bootstrap_summary', { ok: false, reason: 'manifest_fetch' })
    }
    return
  }
  const data = manifestResult.data as { hostPluginApiVersion?: string; plugins?: object[] } | null | undefined
  if (!data) {
    if (shouldShowBootstrapSummary(opts)) {
      console.info('[wep] bootstrap_summary', { ok: false, reason: 'manifest_empty_body' })
    }
    return
  }

  const apiVer = data.hostPluginApiVersion
  if (apiVer) {
    const coerced = semver.coerce(apiVer)
    const maj = coerced ? coerced.major : 0
    const range = `^${maj}.0.0`
    if (!semver.satisfies(HOST_PLUGIN_API_VERSION, range, { includePrerelease: true })) {
      console.warn('[wep] host API version mismatch', {
        host: HOST_PLUGIN_API_VERSION,
        manifest: apiVer
      })
    }
  }

  window.__PLUGIN_ACTIVATORS__ = window.__PLUGIN_ACTIVATORS__ || {}

  const plugins = data.plugins || []
  if (plugins.length === 0) {
    const hint = isStatic ? 'check static JSON file and plugins[]' : 'check backend and URL'
    console.info('[wep] empty plugin manifest — ' + hint, manifestUrlUsed)
  }

  const summary = {
    manifestCount: plugins.length,
    activated: 0,
    skipEngines: 0,
    skipLoad: 0,
    skipNoActivator: 0,
    activateFail: 0
  }

  for (const p of plugins as Array<{ id: string; engines?: { host?: string }; entryUrl?: string }>) {
    const range = p.engines && p.engines.host
    if (range && !semver.satisfies(HOST_PLUGIN_API_VERSION, range, { includePrerelease: true })) {
      console.warn('[wep] skip plugin (engines.host)', p.id, range)
      summary.skipEngines++
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

  if (shouldShowBootstrapSummary(opts)) {
    console.info('[wep] bootstrap_summary', { ok: true, ...summary })
  }
}
