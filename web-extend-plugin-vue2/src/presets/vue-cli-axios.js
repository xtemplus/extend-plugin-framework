/**
 * 预设：Vue CLI + 统一 axios（如若依 `utils/request`）。
 * 对外以 {@link presetVueCliAxios} 聚合；亦保留具名函数便于 tree-shaking。
 *
 * @module presets/vue-cli-axios
 */

/**
 * @typedef {object} VueCliAxiosInstallPresetDeps
 * @property {(config: { url: string, method?: string, [key: string]: unknown }) => Promise<unknown>} request 宿主 axios 封装（已含 baseURL、Token 等）
 */

/**
 * 将 `manifestBase + manifestListPath` 转为相对 `VUE_APP_BASE_API` 的路径（供 axios baseURL 拼接）。
 * @param {string} manifestUrl
 * @param {string} [apiBase]
 */
export function manifestPathForVueCliApiBase(manifestUrl, apiBase) {
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
 * 兼容裸清单 JSON 与常见 `{ code, data: { plugins } }` 包装。
 * @param {unknown} body
 * @returns {object|null}
 */
export function unwrapTableStyleManifestBody(body) {
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
 * 生成可直接传给 `installWebExtendPluginVue2` 的 options（含 fetchManifest、manifestBase、bridge 前缀）。
 * @param {VueCliAxiosInstallPresetDeps} deps
 * @param {Record<string, unknown>} [extra] 合并覆盖，如 `manifestListPath`、`env` 等
 * @returns {Record<string, unknown>}
 */
export function createVueCliAxiosInstallOptions(deps, extra = {}) {
  const { request } = deps
  if (typeof request !== 'function') {
    throw new Error('[web-extend-plugin-vue2] createVueCliAxiosInstallOptions({ request }) 需要宿主 request 函数')
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
      const url = manifestPathForVueCliApiBase(ctx.manifestUrl, stripBase)
      const body = await request({
        url,
        method: 'get'
      })
      const data = unwrapTableStyleManifestBody(body)
      if (!data || typeof data !== 'object') {
        return {
          ok: false,
          error: new Error('[web-plugin] 清单响应格式无效'),
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

/**
 * Vue CLI + axios 预设的**对外聚合入口**（与具名导出函数等价，便于按需查阅与扩展多预设）。
 * @type {Readonly<{ id: string, description: string, createInstallOptions: typeof createVueCliAxiosInstallOptions, manifestPathForApiBase: typeof manifestPathForVueCliApiBase, unwrapManifestBody: typeof unwrapTableStyleManifestBody }>}
 */
export const presetVueCliAxios = Object.freeze({
  id: 'vue-cli-axios',
  description: 'Vue CLI + 统一 axios 实例（如若依 utils/request），清单走宿主 request',
  createInstallOptions: createVueCliAxiosInstallOptions,
  manifestPathForApiBase: manifestPathForVueCliApiBase,
  unwrapManifestBody: unwrapTableStyleManifestBody
})
