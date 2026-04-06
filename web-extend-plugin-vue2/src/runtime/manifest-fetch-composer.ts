/**
 * 清单拉取函数的组合工具：缓存、埋点等以**中间件**形式扩展，不侵入 `bootstrapPlugins` 核心逻辑，
 * 可组合的 `fetchManifest` 包装；入参/出参与 `resolveRuntimeOptions({ fetchManifest })` 一致。
 */
import { defaultManifestFetchCache } from '../core/public-config-defaults'

export type FetchWebPluginManifestContext = {
  manifestUrl: string
  credentials: RequestCredentials
}

export type FetchWebPluginManifestResult = {
  ok: boolean
  status?: number
  data?: { hostPluginApiVersion?: string; plugins?: object[] } | null
  error?: unknown
}

export type FetchWebPluginManifestFn = (ctx: FetchWebPluginManifestContext) => Promise<FetchWebPluginManifestResult>

export type ManifestFetchCacheOptions = {
  ttlMs?: number
  storage?: 'memory' | 'session' | 'local'
  storageKeyPrefix?: string
  cacheKey?: (ctx: FetchWebPluginManifestContext) => string
  shouldCache?: (result: FetchWebPluginManifestResult) => boolean
  maxEntries?: number
  now?: () => number
}

export function wrapManifestFetchWithCache(inner: FetchWebPluginManifestFn, options: ManifestFetchCacheOptions = {}) {
  return composeManifestFetch(inner, manifestFetchCacheMiddleware(options))
}

export function manifestFetchCacheMiddleware(options: ManifestFetchCacheOptions = {}) {
  const ttlMs = typeof options.ttlMs === 'number' && Number.isFinite(options.ttlMs) ? options.ttlMs : 0
  if (ttlMs <= 0) {
    return (next: FetchWebPluginManifestFn) => next
  }

  const storage = options.storage || 'memory'
  const prefix = options.storageKeyPrefix || defaultManifestFetchCache.storageKeyPrefix
  const maxEntries =
    typeof options.maxEntries === 'number' && options.maxEntries > 0
      ? options.maxEntries
      : defaultManifestFetchCache.maxEntries
  const getNow = typeof options.now === 'function' ? options.now : () => Date.now()
  const cacheKeyFn =
    typeof options.cacheKey === 'function'
      ? options.cacheKey
      : (ctx: FetchWebPluginManifestContext) => `${String(ctx.manifestUrl)}\0${String(ctx.credentials)}`

  const shouldCache =
    typeof options.shouldCache === 'function'
      ? options.shouldCache
      : (r: FetchWebPluginManifestResult) => !!(r && r.ok === true && r.data != null)

  const memory = new Map<string, { expiresAt: number; result: FetchWebPluginManifestResult; lastRead: number }>()

  function cloneResult(r: FetchWebPluginManifestResult): FetchWebPluginManifestResult {
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(r)
      }
    } catch {
      /* ignore */
    }
    try {
      return JSON.parse(JSON.stringify(r)) as FetchWebPluginManifestResult
    } catch {
      return { ...r, data: r.data }
    }
  }

  function touchMemory(key: string) {
    const e = memory.get(key)
    if (e) {
      e.lastRead = getNow()
    }
  }

  function pruneMemory() {
    if (memory.size <= maxEntries) {
      return
    }
    const entries = [...memory.entries()].sort((a, b) => a[1].lastRead - b[1].lastRead)
    const drop = memory.size - maxEntries
    for (let i = 0; i < drop; i++) {
      memory.delete(entries[i][0])
    }
  }

  function readWebStorage(store: Storage, key: string): FetchWebPluginManifestResult | null {
    try {
      const raw = store.getItem(key)
      if (!raw) {
        return null
      }
      const o = JSON.parse(raw) as { expiresAt?: number; result?: FetchWebPluginManifestResult }
      if (!o || typeof o !== 'object') {
        return null
      }
      const exp = o.expiresAt
      const res = o.result
      if (typeof exp !== 'number' || getNow() > exp) {
        store.removeItem(key)
        return null
      }
      return res as FetchWebPluginManifestResult
    } catch {
      return null
    }
  }

  function writeWebStorage(store: Storage, key: string, result: FetchWebPluginManifestResult, expiresAt: number) {
    try {
      store.setItem(key, JSON.stringify({ expiresAt, result }))
    } catch {
      /* Quota / 不可序列化 */
    }
  }

  return (next: FetchWebPluginManifestFn) => {
    return async (ctx: FetchWebPluginManifestContext) => {
      const key = cacheKeyFn(ctx)
      const now = getNow()

      if (storage === 'memory') {
        const hit = memory.get(key)
        if (hit && hit.expiresAt > now) {
          touchMemory(key)
          return cloneResult(hit.result)
        }
      } else if (storage === 'session' && typeof sessionStorage !== 'undefined') {
        const sk = `${prefix}:${key}`
        const hit = readWebStorage(sessionStorage, sk)
        if (hit) {
          return cloneResult(hit)
        }
      } else if (storage === 'local' && typeof localStorage !== 'undefined') {
        const sk = `${prefix}:${key}`
        const hit = readWebStorage(localStorage, sk)
        if (hit) {
          return cloneResult(hit)
        }
      }

      const result = await next(ctx)

      if (!shouldCache(result)) {
        return result
      }

      const expiresAt = now + ttlMs
      const frozen = cloneResult(result)

      if (storage === 'memory') {
        memory.set(key, { expiresAt, result: frozen, lastRead: now })
        pruneMemory()
      } else if (storage === 'session' && typeof sessionStorage !== 'undefined') {
        writeWebStorage(sessionStorage, `${prefix}:${key}`, frozen, expiresAt)
      } else if (storage === 'local' && typeof localStorage !== 'undefined') {
        writeWebStorage(localStorage, `${prefix}:${key}`, frozen, expiresAt)
      }

      return result
    }
  }
}

export function composeManifestFetch(
  inner: FetchWebPluginManifestFn,
  ...middlewares: Array<(next: FetchWebPluginManifestFn) => FetchWebPluginManifestFn>
): FetchWebPluginManifestFn {
  if (typeof inner !== 'function') {
    throw new Error('[web-extend-plugin-vue2] composeManifestFetch 需要 inner 为函数')
  }
  let f: FetchWebPluginManifestFn = inner
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const mw = middlewares[i]
    if (typeof mw !== 'function') {
      throw new Error('[web-extend-plugin-vue2] composeManifestFetch 中间件须为函数')
    }
    f = mw(f)
  }
  return f
}
