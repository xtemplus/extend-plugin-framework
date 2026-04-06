/**
 * 浏览器 fetch 静态 JSON 清单（与 defaultFetchWebPluginManifest 相同解包规则）。
 */
import { unwrapNestedManifestBody } from './manifest-body'

export async function fetchStaticManifestViaHttp(ctx: {
  manifestUrl: string
  credentials: RequestCredentials
}) {
  const { manifestUrl, credentials } = ctx
  try {
    const creds = credentials === 'omit' ? 'omit' : 'same-origin'
    const res = await fetch(manifestUrl, {
      method: 'GET',
      credentials: creds,
      cache: 'no-store'
    })
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: new Error('[wep] static manifest HTTP ' + res.status),
        data: null as Record<string, unknown> | null
      }
    }
    const body = await res.json()
    const data = unwrapNestedManifestBody(body)
    if (!data || typeof data !== 'object') {
      return {
        ok: false,
        error: new Error('[wep] invalid static manifest JSON'),
        data: null as Record<string, unknown> | null
      }
    }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e, data: null as Record<string, unknown> | null }
  }
}
