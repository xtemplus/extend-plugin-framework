/**
 * 开发模式下插件热更新 SSE（按 dev 映射中的 origin 连接）。
 */
import { normalizeHost } from './path-host-utils'

const pluginDevEventSources = new Map<string, EventSource>()

let pluginDevBeforeUnloadRegistered = false

function closeAllPluginDevEventSources() {
  for (const es of pluginDevEventSources.values()) {
    try {
      es.close()
    } catch {
      /* ignore */
    }
  }
  pluginDevEventSources.clear()
}

function ensurePluginDevBeforeUnload() {
  if (pluginDevBeforeUnloadRegistered || typeof window === 'undefined') {
    return
  }
  pluginDevBeforeUnloadRegistered = true
  window.addEventListener('beforeunload', closeAllPluginDevEventSources)
}

function isDevOriginAllowedForSse(origin: string, hostSet: Set<string>): boolean {
  try {
    const u = new URL(origin)
    return hostSet.has(normalizeHost(u.hostname))
  } catch {
    return false
  }
}

function startPluginDevReloadSse(origin: string, isDev: boolean, hostSet: Set<string>, ssePath: string) {
  if (!isDev || pluginDevEventSources.has(origin)) {
    return
  }
  if (!isDevOriginAllowedForSse(origin, hostSet)) {
    return
  }
  ensurePluginDevBeforeUnload()
  const base = origin.replace(/\/$/, '')
  const url = `${base}${ssePath}`
  try {
    const es = new EventSource(url)
    pluginDevEventSources.set(origin, es)
    es.addEventListener('reload', () => {
      window.location.reload()
    })
    es.onopen = () => {
      console.info('[wep] dev reload SSE', url)
    }
  } catch (e) {
    console.warn('[wep] EventSource failed', url, e)
  }
}

export function startPluginDevSseForMap(
  devMap: Record<string, string> | null | undefined,
  isDev: boolean,
  hostSet: Set<string>,
  ssePath: string
) {
  if (!isDev || !devMap || typeof window === 'undefined') {
    return
  }
  const origins = new Set<string>()
  for (const entry of Object.values(devMap)) {
    if (typeof entry !== 'string') {
      continue
    }
    const t = entry.trim()
    if (!t) {
      continue
    }
    try {
      origins.add(new URL(t, window.location.href).origin)
    } catch {
      /* skip */
    }
  }
  for (const o of origins) {
    startPluginDevReloadSse(o, isDev, hostSet, ssePath)
  }
}
