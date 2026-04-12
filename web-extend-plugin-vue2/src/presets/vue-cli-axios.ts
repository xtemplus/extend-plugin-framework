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

export function createVueCliAxiosInstallOptions(
  deps: { request: (config: { url: string; method?: string }) => Promise<unknown> },
  extra: Record<string, unknown> = {}
) {
  const { request } = deps
  if (typeof request !== 'function') {
    throw new Error('[wep] createVueCliAxiosInstallOptions requires deps.request')
  }

  const {
    fetchManifest: userFetchManifest,
    manifestMode: extraManifestMode,
    staticManifestUrl: extraStaticManifestUrl,
    ...restExtra
  } = extra

  const envBase = (
    typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API
      ? String(process.env.VUE_APP_BASE_API)
      : ''
  ).replace(/\/$/, '')
  const userBase =
    extra.manifestBase !== undefined && String(extra.manifestBase).trim() !== ''
      ? String(extra.manifestBase).replace(/\/$/, '')
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
        return {
          ok: false,
          error: new Error('[wep] invalid manifest response'),
          data: null
        }
      }
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error, data: null }
    }
  }

  const manifestMode = resolveManifestModeFromInputs(extraManifestMode)
  const staticManifestUrl = resolveStaticManifestUrlFromInputs(extraStaticManifestUrl)

  const fetchManifest =
    typeof userFetchManifest === 'function'
      ? userFetchManifest
      : manifestMode === 'static'
        ? fetchStaticManifestViaHttp
        : fetchManifestApi

  const options: Record<string, unknown> = {
    manifestBase: stripBase || undefined,
    bridgeAllowedPathPrefixes: bridgePrefixesFromVueCliEnv(),
    manifestMode,
    staticManifestUrl,
    ...restExtra,
    fetchManifest
  }

  const listPath =
    typeof process !== 'undefined' &&
    process.env &&
    process.env[webExtendPluginEnvKeys.manifestPathAlt]

  if (listPath && options.manifestListPath === undefined && extra.manifestListPath === undefined) {
    options.manifestListPath = String(process.env[webExtendPluginEnvKeys.manifestPathAlt])
  }

  return options
}
