/**
 * 从注入环境与 `process.env` 解析 `VITE_*` / `PLUGIN_*` 键。
 */
import { readInjectedEnvDev, readInjectedEnvKey } from '../core/build-env'

function readProcessEnv(key: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env && key in process.env) {
      const v = process.env[key]
      if (v !== undefined && v !== '') {
        return String(v)
      }
    }
  } catch {
    /* ignore */
  }
  return undefined
}

function viteKeyToPluginAlternate(viteStyleKey: string): string | null {
  if (typeof viteStyleKey !== 'string' || !viteStyleKey.startsWith('VITE_')) {
    return null
  }
  return `PLUGIN_${viteStyleKey.slice(5)}`
}

export function resolveBundledEnv(key: string, fallback = ''): string {
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

export function resolveBundledIsDev(): boolean {
  try {
    if (readInjectedEnvDev()) {
      return true
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}
