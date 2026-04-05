/**
 * 从注入环境与 `process.env` 解析 VITE_/PLUGIN_ 键。
 * @module runtime/env-resolve
 */
import { readInjectedEnvDev, readInjectedEnvKey } from '../bundled-env.js'

/**
 * @param {string} key
 * @returns {string|undefined}
 */
function readProcessEnv(key) {
  try {
    if (typeof process !== 'undefined' && process.env && key in process.env) {
      const v = process.env[key]
      if (v !== undefined && v !== '') {
        return String(v)
      }
    }
  } catch (_) {}
  return undefined
}

/**
 * @param {string} viteStyleKey
 * @returns {string|null}
 */
function viteKeyToPluginAlternate(viteStyleKey) {
  if (typeof viteStyleKey !== 'string' || !viteStyleKey.startsWith('VITE_')) {
    return null
  }
  return `PLUGIN_${viteStyleKey.slice(5)}`
}

/**
 * @param {string} key
 * @param {string} [fallback='']
 */
export function resolveBundledEnv(key, fallback = '') {
  const alt = viteKeyToPluginAlternate(key)
  const inj = readInjectedEnvKey(key)
  const fromInjected =
    inj === undefined || inj === null ? (alt ? readInjectedEnvKey(alt) : undefined) : inj
  const proc = readProcessEnv(key)
  const fromProcess =
    proc === undefined || proc === null ? (alt ? readProcessEnv(alt) : undefined) : proc
  const first = fromInjected === undefined || fromInjected === null ? fromProcess : fromInjected
  return first === undefined || first === null ? fallback : first
}

/**
 * @returns {boolean}
 */
export function resolveBundledIsDev() {
  try {
    if (readInjectedEnvDev()) {
      return true
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true
    }
  } catch (_) {}
  return false
}
