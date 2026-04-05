/**
 * 默认清单 HTTP 拉取（未配置 `fetchManifest` 时）。
 * @module runtime/default-fetch-manifest
 */

/**
 * @typedef {object} FetchWebPluginManifestContext
 * @property {string} manifestUrl
 * @property {RequestCredentials} credentials
 */

/**
 * @typedef {object} FetchWebPluginManifestResult
 * @property {boolean} ok
 * @property {number} [status]
 * @property {{ hostPluginApiVersion?: string, plugins?: object[] }|null} [data]
 * @property {unknown} [error]
 */

/**
 * @callback FetchWebPluginManifestFn
 * @param {FetchWebPluginManifestContext} ctx
 * @returns {Promise<FetchWebPluginManifestResult>}
 */

/**
 * 默认清单请求（未配置 `fetchManifest` 时）。
 * @param {FetchWebPluginManifestContext} ctx
 * @returns {Promise<FetchWebPluginManifestResult>}
 */
export async function defaultFetchWebPluginManifest(ctx) {
  const { manifestUrl, credentials } = ctx
  try {
    const res = await fetch(manifestUrl, { credentials })
    if (!res.ok) {
      return { ok: false, status: res.status, data: null }
    }
    const data = await res.json()
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e, data: null }
  }
}
