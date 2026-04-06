/**
 * Vue CLI + 统一 axios（如 RuoYi `utils/request`）场景的 `install` 预设。
 */
import { webExtendPluginEnvKeys } from '../core/public-config-defaults'
import { resolveBundledIsDev } from '../runtime/env-resolve'
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

/**
 * 常见 Java 清单路径：与 `VUE_APP_BASE_API` 拼接为 `${base}/frontend-plugins`。
 * 若后端使用 `/api/frontend-plugins` 段，请在 extra 中显式传入 `manifestListPath`。
 */
export const defaultVueCliJavaManifestListPath = '/frontend-plugins'

export type VueCliAxiosQuickDeps = {
  request: (config: { url: string; method?: string }) => Promise<unknown>
  hostLayoutComponent: unknown
  /** 写入 `hostContext.store`，便于插件访问 Vuex */
  store?: unknown
  /** 与 `router` / `store` 浅合并进 `hostContext` */
  hostContext?: Record<string, unknown>
  applyPluginMenuItems?: (ctx: { pluginId: string; items: Array<Record<string, unknown>> }) => void
  revokePluginMenuItems?: (pluginId: string) => void
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
    typeof process !== 'undefined' &&
    process.env &&
    process.env[webExtendPluginEnvKeys.manifestPathAlt]
  if (listPath && opts.manifestListPath === undefined && extra.manifestListPath === undefined) {
    opts.manifestListPath = String(process.env[webExtendPluginEnvKeys.manifestPathAlt])
  }

  return opts
}

/**
 * 少样板接入：`hostContext` 自动含 `router`（及可选 `store`）、`isDev` 与常见 `manifestListPath` 默认值。
 * 更多运行时字段仍可通过 `extra` 覆盖。
 */
export function createVueCliAxiosQuickInstallOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any,
  deps: VueCliAxiosQuickDeps,
  extra: Record<string, unknown> = {}
) {
  const {
    request,
    hostLayoutComponent,
    store,
    hostContext: depHostContext,
    applyPluginMenuItems,
    revokePluginMenuItems
  } = deps

  const { hostContext: extraHostContext, isDev: extraIsDev, manifestListPath: extraListPath, ...restExtra } =
    extra

  const hostContext: Record<string, unknown> = {
    router,
    ...(store !== undefined ? { store } : {}),
    ...(depHostContext && typeof depHostContext === 'object' ? depHostContext : {}),
    ...(extraHostContext && typeof extraHostContext === 'object' ? (extraHostContext as Record<string, unknown>) : {})
  }

  const manifestListPath =
    extraListPath !== undefined && String(extraListPath).trim() !== ''
      ? String(extraListPath)
      : defaultVueCliJavaManifestListPath

  return createVueCliAxiosInstallOptions(
    { request },
    {
      hostLayoutComponent,
      hostContext,
      applyPluginMenuItems,
      revokePluginMenuItems,
      isDev: extraIsDev !== undefined ? Boolean(extraIsDev) : resolveBundledIsDev(),
      manifestListPath,
      ...restExtra
    }
  )
}

export const presetVueCliAxios = Object.freeze({
  id: 'vue-cli-axios',
  description: 'Vue CLI + axios request for API manifest; optional manifestMode=static uses fetch',
  createInstallOptions: createVueCliAxiosInstallOptions,
  createQuickInstallOptions: createVueCliAxiosQuickInstallOptions,
  defaultJavaManifestListPath: defaultVueCliJavaManifestListPath,
  manifestPathForApiBase: resolveManifestPathUnderApiBase,
  unwrapManifestBody: unwrapNestedManifestBody
})
