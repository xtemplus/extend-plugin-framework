/**
 * Vue CLI + 统一 axios（如 RuoYi `utils/request`）场景的 `install` 预设。
 */

/**
 * @typedef {object} VueCliAxiosPresetDeps
 * @property {(config: { url: string, method?: string }) => Promise<unknown>} request
 */

/**
 * 将完整 manifest URL 转为相对 `apiBase` 的请求 path，供 axios `baseURL` 拼接。
 * @param {string} manifestUrl
 * @param {string} [apiBase]
 */
export function resolveManifestPathUnderApiBase(manifestUrl, apiBase) {
  const base = String(
    apiBase !== undefined
      ? apiBase
      : (typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API) || ''
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
 * 将裸 `{ plugins }` 与 `{ code, data: { plugins } }` 式响应解包为清单对象。
 * @param {unknown} body
 * @returns {object|null}
 */
export function unwrapNestedManifestBody(body) {
  if (!body || typeof body !== 'object') {
    return null
  }
  const o = /** @type {Record<string, unknown>} */ (body)
  if (Array.isArray(o.plugins)) {
    return o
  }
  const d = o.data
  if (d && typeof d === 'object') {
    const inner = /** @type {Record<string, unknown>} */ (d)
    if (Array.isArray(inner.plugins)) {
      return inner
    }
    if ('plugins' in inner) {
      return inner
    }
  }
  return d !== undefined && d !== null && typeof d === 'object' ? /** @type {object} */ (d) : o
}

function bridgePrefixesFromVueCliEnv() {
  const base = (
    typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API
      ? String(process.env.VUE_APP_BASE_API)
      : ''
  ).replace(/\/$/, '')
  const raw = [base ? `${base}/` : '', '/api/', '/dev-api/'].filter(Boolean)
  return [...new Set(raw)]
}

/**
 * @param {VueCliAxiosPresetDeps} deps
 * @param {Record<string, unknown>} [extra]
 */
export function createVueCliAxiosInstallOptions(deps, extra = {}) {
  const { request } = deps
  if (typeof request !== 'function') {
    throw new Error('[wep] createVueCliAxiosInstallOptions requires deps.request')
  }
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

  const fetchManifest = async (ctx) => {
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

  const opts = {
    manifestBase: stripBase || undefined,
    bridgeAllowedPathPrefixes: bridgePrefixesFromVueCliEnv(),
    fetchManifest,
    ...extra
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
  description: 'Vue CLI + unified axios request; manifest uses host request()',
  createInstallOptions: createVueCliAxiosInstallOptions,
  manifestPathForApiBase: resolveManifestPathUnderApiBase,
  unwrapManifestBody: unwrapNestedManifestBody
})
