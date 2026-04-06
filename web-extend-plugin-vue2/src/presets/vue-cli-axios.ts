/**
 * Vue CLI + 统一 axios（如 RuoYi `utils/request`）场景的 `install` 预设。
 */
import { fetchStaticManifestViaHttp } from '../runtime/fetch-static-manifest'
import { unwrapNestedManifestBody } from '../runtime/manifest-body'
import { resolveManifestModeFromInputs, resolveStaticManifestUrlFromInputs } from '../runtime/manifest-mode'

export { unwrapNestedManifestBody }

export function resolveManifestPathUnderApiBase(manifestUrl: string, apiBase?: string) {
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
  const u = new URL(manifestUrl, window.location.origin)
  let path = u.pathname + u.search
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

  const manifestMode = resolveManifestModeFromInputs(extraManifestMode)
  const staticManifestUrl = resolveStaticManifestUrlFromInputs(extraStaticManifestUrl)

  const fetchManifestApi = async (ctx: { manifestUrl: string; credentials: RequestCredentials }) => {
    try {
      const url = resolveManifestPathUnderApiBase(ctx.manifestUrl, stripBase)
      const body = await request({
        url,
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
    } catch (e) {
      return { ok: false, error: e, data: null }
    }
  }

  const fetchManifestStatic = (ctx: { manifestUrl: string; credentials: RequestCredentials }) =>
    fetchStaticManifestViaHttp(ctx)

  const fetchManifest =
    typeof userFetchManifest === 'function'
      ? userFetchManifest
      : manifestMode === 'static'
        ? fetchManifestStatic
        : fetchManifestApi

  const opts: Record<string, unknown> = {
    manifestBase: stripBase || undefined,
    bridgeAllowedPathPrefixes: bridgePrefixesFromVueCliEnv(),
    manifestMode,
    staticManifestUrl,
    ...restExtra,
    fetchManifest
  }

  const listPath =
    typeof process !== 'undefined' && process.env && process.env.VUE_APP_WEB_PLUGIN_MANIFEST_PATH
  if (listPath && opts.manifestListPath === undefined && extra.manifestListPath === undefined) {
    opts.manifestListPath = String(listPath)
  }

  return opts
}

export const presetVueCliAxios = Object.freeze({
  id: 'vue-cli-axios',
  description: 'Vue CLI + axios request for API manifest; optional manifestMode=static uses fetch',
  createInstallOptions: createVueCliAxiosInstallOptions,
  manifestPathForApiBase: resolveManifestPathUnderApiBase,
  unwrapManifestBody: unwrapNestedManifestBody
})
