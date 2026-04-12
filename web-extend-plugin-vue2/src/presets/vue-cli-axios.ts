import { webExtendPluginEnvKeys } from '../core/public-config-defaults'
import { fetchStaticManifestViaHttp } from '../runtime/fetch-static-manifest'
import { unwrapNestedManifestBody } from '../runtime/manifest-body'
import { resolveManifestModeFromInputs, resolveStaticManifestUrlFromInputs } from '../runtime/manifest-mode'

function resolveManifestPathUnderApiBase(manifestUrl: string, apiBase?: string) {
  const base = String(
    apiBase !== undefined
      ? apiBase
      : typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API
        ? String(process.env.VUE_APP_BASE_API)
        : ''
  ).replace(/\/$/, '')

  if (typeof window === 'undefined') {
    return '/api/frontend-plugins'
  }

  const url = new URL(manifestUrl, window.location.origin)
  let path = url.pathname + url.search
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || '/'
  }
  return path
}

function bridgePrefixesFromVueCliEnv(): string[] {
  const base = (
    typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API
      ? String(process.env.VUE_APP_BASE_API)
      : ''
  ).replace(/\/$/, '')
  const raw = [base ? `${base}/` : '', '/api/', '/dev-api/'].filter(Boolean)
  return [...new Set(raw)]
}

function asRecord<T extends Record<string, unknown>>(value: unknown): T | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined
}

export function createVueCliAxiosInstallOptions(
  deps: { request: (config: { url: string; method?: string }) => Promise<unknown> },
  extra: Record<string, unknown> = {}
) {
  const { request } = deps
  if (typeof request !== 'function') {
    throw new Error('[wep] createVueCliAxiosInstallOptions requires deps.request')
  }

  const manifest = asRecord<Record<string, unknown>>(extra.manifest) || {}
  const host = asRecord<Record<string, unknown>>(extra.host) || {}
  const mergedHost = { ...host }

  const envBase = (
    typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API
      ? String(process.env.VUE_APP_BASE_API)
      : ''
  ).replace(/\/$/, '')

  const userBase =
    manifest.baseUrl !== undefined && String(manifest.baseUrl).trim() !== ''
      ? String(manifest.baseUrl).replace(/\/$/, '')
      : ''

  const stripBase = userBase || envBase

  const fetchManifestApi = async (ctx: { manifestUrl: string; credentials: RequestCredentials }) => {
    try {
      const body = await request({
        url: resolveManifestPathUnderApiBase(ctx.manifestUrl, stripBase),
        method: 'get'
      })
      const data = unwrapNestedManifestBody(body)
      if (!data || typeof data !== 'object') {
        return { ok: false, error: new Error('[wep] invalid manifest response'), data: null }
      }
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error, data: null }
    }
  }

  const manifestSource = resolveManifestModeFromInputs(manifest.source)
  const staticUrl = resolveStaticManifestUrlFromInputs(manifest.staticUrl)

  const fetchManifest =
    typeof manifest.fetch === 'function'
      ? manifest.fetch
      : manifestSource === 'static'
        ? fetchStaticManifestViaHttp
        : fetchManifestApi

  const listPath =
    typeof process !== 'undefined' &&
    process.env &&
    process.env[webExtendPluginEnvKeys.manifestPathAlt]
      ? String(process.env[webExtendPluginEnvKeys.manifestPathAlt])
      : undefined

  if (mergedHost.requestPathPrefixes === undefined) {
    mergedHost.requestPathPrefixes = bridgePrefixesFromVueCliEnv()
  }

  return {
    ...extra,
    manifest: {
      ...manifest,
      baseUrl: stripBase || undefined,
      listPath: manifest.listPath !== undefined ? manifest.listPath : listPath,
      source: manifestSource,
      staticUrl,
      fetch: fetchManifest
    },
    host: mergedHost
  }
}
