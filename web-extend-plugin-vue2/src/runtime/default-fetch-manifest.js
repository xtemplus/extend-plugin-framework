/**
 * 未配置 `fetchManifest` 时使用的清单 `fetch` 实现。
 * @param {{ manifestUrl: string, credentials: RequestCredentials }} ctx
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
