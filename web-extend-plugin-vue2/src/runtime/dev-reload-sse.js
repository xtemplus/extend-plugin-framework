/**
 * 开发模式下插件热更新 SSE（按 dev 映射中的 origin 连接）。
 * @module runtime/dev-reload-sse
 */
import { normalizeHost } from './path-host-utils.js'

/** @type {Map<string, EventSource>} */
const pluginDevEventSources = new Map()

let pluginDevBeforeUnloadRegistered = false

function closeAllPluginDevEventSources() {
  for (const es of pluginDevEventSources.values()) {
    try {
      es.close()
    } catch (_) {}
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

/**
 * @param {string} origin
 * @param {Set<string>} hostSet
 */
function isDevOriginAllowedForSse(origin, hostSet) {
  try {
    const u = new URL(origin)
    return hostSet.has(normalizeHost(u.hostname))
  } catch {
    return false
  }
}

/**
 * @param {string} origin
 * @param {boolean} isDev
 * @param {Set<string>} hostSet
 * @param {string} ssePath
 */
function startPluginDevReloadSse(origin, isDev, hostSet, ssePath) {
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
      console.info('[plugins] plugin dev reload SSE:', url)
    }
  } catch (e) {
    console.warn('[plugins] EventSource failed', url, e)
  }
}

/**
 * @param {Record<string, string>|null|undefined} devMap
 * @param {boolean} isDev
 * @param {Set<string>} hostSet
 * @param {string} ssePath
 */
export function startPluginDevSseForMap(devMap, isDev, hostSet, ssePath) {
  if (!isDev || !devMap || typeof window === 'undefined') {
    return
  }
  const origins = new Set()
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
