/**
 * 拉取插件清单、加载入口脚本并调用各插件 `activator`。
 */
import semver from 'semver'
import { HOST_PLUGIN_API_VERSION } from '../constants.js'
import { defaultFetchWebPluginManifest } from './default-fetch-manifest.js'
import {
  buildImplicitWebPluginDevMap,
  mergeDevMaps,
  parseWebPluginDevMapExplicit
} from './dev-map.js'
import { startPluginDevSseForMap } from './dev-reload-sse.js'
import { resolveBundledEnv, resolveBundledIsDev } from './env-resolve.js'
import { loadScript } from './load-script.js'
import { buildAllowedScriptHostsSet, isScriptHostAllowed } from './path-host-utils.js'
import { printRuntimeBannerOnce } from './print-runtime-banner.js'
import { resolveRuntimeOptions } from './resolve-runtime-options.js'

/**
 * @param {import('./resolve-runtime-options.js').WebExtendPluginRuntimeOptions|object} opts
 */
function shouldShowBootstrapSummary(opts) {
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

/**
 * @param {{ id: string }} p
 * @param {string} [entryUrl]
 * @param {Record<string, string>|null|undefined} devMap
 * @param {Set<string>} hostSet
 */
async function loadPluginEntry(p, entryUrl, devMap, hostSet) {
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

/**
 * @param {import('vue-router').default} router
 * @param {(pluginId: string, router: import('vue-router').default, hostKit?: object) => object} createHostApiFactory
 * @param {import('./resolve-runtime-options.js').WebExtendPluginRuntimeOptions} [runtimeOptions]
 */
export async function bootstrapPlugins(router, createHostApiFactory, runtimeOptions) {
  if (typeof window === 'undefined') {
    console.warn('[wep] bootstrapPlugins skipped (no window)')
    return
  }
  printRuntimeBannerOnce()
  const opts = resolveRuntimeOptions(runtimeOptions || {})
  const base = String(opts.manifestBase).replace(/\/$/, '')
  const manifestUrl = `${base}${opts.manifestListPath}`
  const hostSet = buildAllowedScriptHostsSet(opts.allowedScriptHosts)
  const explicit = parseWebPluginDevMapExplicit(opts)

  const manifestCtx = {
    manifestUrl,
    credentials: opts.manifestFetchCredentials
  }
  const [manifestResult, implicit] = await Promise.all([
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

  const devMap = mergeDevMaps(implicit, explicit)
  startPluginDevSseForMap(devMap, opts.isDev, hostSet, opts.devReloadSsePath)

  const hostKit = {
    bridgeAllowedPathPrefixes: opts.bridgeAllowedPathPrefixes,
    ...(opts.pluginRoutesParentName
      ? { pluginRoutesParentName: opts.pluginRoutesParentName }
      : {}),
    ...(typeof opts.transformRoutes === 'function' ? { transformRoutes: opts.transformRoutes } : {}),
    ...(typeof opts.interceptRegisterRoutes === 'function'
      ? { interceptRegisterRoutes: opts.interceptRegisterRoutes }
      : {}),
    ...(typeof opts.adaptRouteDeclarations === 'function'
      ? { adaptRouteDeclarations: opts.adaptRouteDeclarations }
      : {})
  }

  if (!manifestResult.ok) {
    if (manifestResult.error) {
      console.warn('[wep] fetch manifest failed', manifestResult.error)
    } else {
      console.warn('[wep] manifest HTTP', manifestResult.status, manifestUrl)
    }
    if (shouldShowBootstrapSummary(opts)) {
      console.info('[wep] bootstrap_summary', { ok: false, reason: 'manifest_fetch' })
    }
    return
  }
  /** @type {{ hostPluginApiVersion?: string, plugins?: object[] }} */
  const data = manifestResult.data
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
    console.info('[wep] empty plugin manifest — check backend and URL', manifestUrl)
  }

  const summary = {
    manifestCount: plugins.length,
    activated: 0,
    skipEngines: 0,
    skipLoad: 0,
    skipNoActivator: 0,
    activateFail: 0
  }

  for (const p of plugins) {
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
    const activator = window.__PLUGIN_ACTIVATORS__[p.id]
    if (typeof activator !== 'function') {
      console.warn('[wep] no activator for', p.id)
      summary.skipNoActivator++
      continue
    }
    const hostApi = createHostApiFactory(p.id, router, hostKit)
    try {
      const pluginRecord = Object.freeze({ ...p })
      activator(hostApi, { pluginRecord })
      summary.activated++
    } catch (e) {
      console.error('[wep] activate failed', p.id, e)
      summary.activateFail++
    }
  }

  if (shouldShowBootstrapSummary(opts)) {
    console.info('[wep] bootstrap_summary', { ok: true, ...summary })
  }
}
