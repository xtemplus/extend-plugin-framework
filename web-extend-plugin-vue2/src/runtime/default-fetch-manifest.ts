import { unwrapNestedManifestBody } from './manifest-body'

export async function defaultFetchWebPluginManifest(ctx: {
  manifestUrl: string
  credentials: RequestCredentials
}) {
  const { manifestUrl, credentials } = ctx
  try {
    const res = await fetch(manifestUrl, { credentials })
    if (!res.ok) {
      return { ok: false, status: res.status, data: null as Record<string, unknown> | null }
    }
    const body = await res.json()
    const data = unwrapNestedManifestBody(body)
    if (!data || typeof data !== 'object') {
      return {
        ok: false,
        error: new Error('[wep] invalid manifest response body'),
        data: null as Record<string, unknown> | null
      }
    }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e, data: null as Record<string, unknown> | null }
  }
}
