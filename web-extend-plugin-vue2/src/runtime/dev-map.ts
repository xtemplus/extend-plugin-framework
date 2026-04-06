/**
 * 开发模式插件 URL 映射（显式 JSON + 隐式 dev 探测）。
 */
import { isScriptHostAllowed } from './path-host-utils'

export function parseWebPluginDevMapExplicit(opts: {
  isDev: boolean
  webPluginDevMapJson?: string | null
}): Record<string, string> | null {
  if (!opts.isDev) {
    return null
  }
  const raw = opts.webPluginDevMapJson
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null
  }
  try {
    const map = JSON.parse(String(raw)) as unknown
    return map && typeof map === 'object' ? (map as Record<string, string>) : null
  } catch {
    console.warn('[wep] invalid webPluginDevMapJson / VITE_WEB_PLUGIN_DEV_MAP')
    return null
  }
}

export function mergeDevMaps(
  implicit: Record<string, string>,
  explicit: Record<string, string> | null
): Record<string, string> {
  const i = implicit && typeof implicit === 'object' ? implicit : {}
  const e = explicit && typeof explicit === 'object' ? explicit : {}
  return { ...i, ...e }
}

export async function buildImplicitWebPluginDevMap(
  opts: {
    isDev: boolean
    webPluginDevOrigin?: string | null
    webPluginDevIds?: string | null
    defaultImplicitDevPluginIds: string[]
    devPingPath: string
    devPingTimeoutMs: number
    webPluginDevEntryPath: string
  },
  hostSet: Set<string>
): Promise<Record<string, string>> {
  if (!opts.isDev) {
    return {}
  }
  const origin =
    opts.webPluginDevOrigin === undefined || opts.webPluginDevOrigin === null
      ? ''
      : String(opts.webPluginDevOrigin).trim()
  if (!origin) {
    return {}
  }
  if (!isScriptHostAllowed(`${origin}/`, hostSet)) {
    return {}
  }

  const idsRaw = opts.webPluginDevIds
  const ids =
    idsRaw !== undefined && idsRaw !== null && String(idsRaw).trim() !== ''
      ? String(idsRaw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [...opts.defaultImplicitDevPluginIds]

  if (ids.length === 0) {
    return {}
  }

  const base = origin.replace(/\/$/, '')
  const pingUrl = `${base}${opts.devPingPath}`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts.devPingTimeoutMs)
    const r = await fetch(pingUrl, {
      mode: 'cors',
      cache: 'no-store',
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!r.ok) {
      return {}
    }
    const body = (await r.text()).trim()
    if (body !== 'ok') {
      return {}
    }
  } catch {
    return {}
  }

  const pathPart = opts.webPluginDevEntryPath
  const map: Record<string, string> = {}
  for (const id of ids) {
    map[id] = `${base}${pathPart}`
  }
  if (ids.length) {
    console.info('[wep] plugin dev server', base, '→ implicit entries', pathPart, ids.join(', '))
  }
  return map
}
