/**
 * 开发模式插件 URL 映射。
 */
import { isScriptHostAllowed } from './path-host-utils'

function normalizeStringValue(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function normalizeStringList(value: unknown, fallback: string[] = []): string[] {
  const raw = normalizeStringValue(value)
  if (!raw) {
    return [...fallback]
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseWebPluginDevMapExplicit(opts: {
  isDev: boolean
  webPluginDevMapJson?: string | null
}): Record<string, string> | null {
  if (!opts.isDev) {
    return null
  }
  const raw = normalizeStringValue(opts.webPluginDevMapJson)
  if (!raw) {
    return null
  }
  try {
    const map = JSON.parse(raw) as unknown
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
    webPluginDevIds?: string[] | string | null
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

  const origin = normalizeStringValue(opts.webPluginDevOrigin)
  if (!origin || !isScriptHostAllowed(`${origin}/`, hostSet)) {
    return {}
  }

  const ids = normalizeStringList(opts.webPluginDevIds, opts.defaultImplicitDevPluginIds)
  if (ids.length === 0) {
    return {}
  }

  const base = origin.replace(/\/$/, '')
  const pingUrl = `${base}${opts.devPingPath}`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts.devPingTimeoutMs)
    const response = await fetch(pingUrl, {
      mode: 'cors',
      cache: 'no-store',
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!response.ok) {
      return {}
    }
    if ((await response.text()).trim() !== 'ok') {
      return {}
    }
  } catch {
    return {}
  }

  const entryUrl = `${base}${opts.webPluginDevEntryPath}`
  const map: Record<string, string> = {}
  for (const id of ids) {
    map[id] = entryUrl
  }
  console.info('[wep] plugin dev server', base, '-> implicit entries', opts.webPluginDevEntryPath, ids.join(', '))
  return map
}
