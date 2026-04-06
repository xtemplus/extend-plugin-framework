/**
 * 开发模式插件 URL 映射（显式 JSON + 隐式 dev 探测）。
 * @module runtime/dev-map
 */
import { isScriptHostAllowed } from './path-host-utils.js'

/**
 * @param {{ isDev: boolean, webPluginDevMapJson?: string|null }} opts
 */
export function parseWebPluginDevMapExplicit(opts) {
  if (!opts.isDev) {
    return null
  }
  const raw = opts.webPluginDevMapJson
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null
  }
  try {
    const map = JSON.parse(String(raw))
    return map && typeof map === 'object' ? map : null
  } catch {
    console.warn('[wep] invalid webPluginDevMapJson / VITE_WEB_PLUGIN_DEV_MAP')
    return null
  }
}

/**
 * @param {Record<string, string>} implicit
 * @param {Record<string, string>|null} explicit
 */
export function mergeDevMaps(implicit, explicit) {
  const i = implicit && typeof implicit === 'object' ? implicit : {}
  const e = explicit && typeof explicit === 'object' ? explicit : {}
  return { ...i, ...e }
}

/**
 * @param {object} opts
 * @param {boolean} opts.isDev
 * @param {string|undefined|null} opts.webPluginDevOrigin
 * @param {string|undefined|null} opts.webPluginDevIds
 * @param {string[]} opts.defaultImplicitDevPluginIds
 * @param {string} opts.devPingPath
 * @param {number} opts.devPingTimeoutMs
 * @param {string} opts.webPluginDevEntryPath
 * @param {Set<string>} hostSet
 */
export async function buildImplicitWebPluginDevMap(opts, hostSet) {
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
  const map = {}
  for (const id of ids) {
    map[id] = `${base}${pathPart}`
  }
  if (ids.length) {
    console.info('[wep] plugin dev server', base, '→ implicit entries', pathPart, ids.join(', '))
  }
  return map
}
