/**
 * 清单拉取函数的组合工具：缓存、埋点等以**中间件**形式扩展，不侵入 `bootstrapPlugins` 核心逻辑，
 * 可组合的 `fetchManifest` 包装；入参/出参与 `resolveRuntimeOptions({ fetchManifest })` 一致。
 *
 * @module runtime/manifest-fetch-composer
 */

/**
 * @typedef {object} FetchWebPluginManifestContext
 * @property {string} manifestUrl
 * @property {RequestCredentials} credentials
 */

/**
 * @typedef {object} FetchWebPluginManifestResult
 * @property {boolean} ok
 * @property {number} [status]
 * @property {{ hostPluginApiVersion?: string, plugins?: object[] }|null} [data]
 * @property {unknown} [error]
 */

/**
 * @callback FetchWebPluginManifestFn
 * @param {FetchWebPluginManifestContext} ctx
 * @returns {Promise<FetchWebPluginManifestResult>}
 */

/**
 * 将内层 `fetchManifest` 包装为带缓存的版本。等价于
 * `composeManifestFetch(inner, manifestFetchCacheMiddleware(options))`。
 *
 * @param {FetchWebPluginManifestFn} inner 内层实现（如预设生成的 `fetchManifest` 或 `defaultFetchWebPluginManifest`）
 * @param {ManifestFetchCacheOptions} [options]
 * @returns {FetchWebPluginManifestFn}
 */
export function wrapManifestFetchWithCache(inner, options = {}) {
  return composeManifestFetch(inner, manifestFetchCacheMiddleware(options))
}

/**
 * @typedef {object} ManifestFetchCacheOptions
 * @property {number} [ttlMs] 缓存时长（毫秒）。`<= 0` 或未传时**不缓存**（直接透传 `inner`）。
 * @property {'memory'|'session'|'local'} [storage='memory'] `session`/`local` 依赖 `JSON.stringify`，仅适合可序列化的 `data`。
 * @property {string} [storageKeyPrefix='wep.manifestFetch.v1'] Web Storage 键前缀（仅 storage 非 memory 时生效）。
 * @property {(ctx: FetchWebPluginManifestContext) => string} [cacheKey] 默认 `manifestUrl + '\0' + credentials`。
 * @property {(result: FetchWebPluginManifestResult) => boolean} [shouldCache] 默认：`ok === true` 且 `data` 非空。
 * @property {number} [maxEntries=50] 仅 `memory`：超过条数时淘汰最久未读条目。
 * @property {() => number} [now] 测试注入时间戳。
 */

/**
 * 清单拉取**中间件工厂**：`next` 为内层 `fetchManifest`。
 *
 * @param {ManifestFetchCacheOptions} options
 * @returns {(next: FetchWebPluginManifestFn) => FetchWebPluginManifestFn}
 */
export function manifestFetchCacheMiddleware(options = {}) {
  const ttlMs = typeof options.ttlMs === 'number' && Number.isFinite(options.ttlMs) ? options.ttlMs : 0
  if (ttlMs <= 0) {
    return (next) => next
  }

  const storage = options.storage || 'memory'
  const prefix = options.storageKeyPrefix || 'wep.manifestFetch.v1'
  const maxEntries = typeof options.maxEntries === 'number' && options.maxEntries > 0 ? options.maxEntries : 50
  const getNow = typeof options.now === 'function' ? options.now : () => Date.now()
  const cacheKeyFn =
    typeof options.cacheKey === 'function'
      ? options.cacheKey
      : (ctx) => `${String(ctx.manifestUrl)}\0${String(ctx.credentials)}`

  const shouldCache =
    typeof options.shouldCache === 'function'
      ? options.shouldCache
      : (r) => !!(r && r.ok === true && r.data != null)

  /** @type {Map<string, { expiresAt: number, result: FetchWebPluginManifestResult, lastRead: number }>} */
  const memory = new Map()

  function cloneResult(r) {
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(r)
      }
    } catch (_) {}
    try {
      return JSON.parse(JSON.stringify(r))
    } catch (_) {
      return { ...r, data: r.data }
    }
  }

  function touchMemory(key) {
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

  function readWebStorage(store, key) {
    try {
      const raw = store.getItem(key)
      if (!raw) {
        return null
      }
      const o = JSON.parse(raw)
      if (!o || typeof o !== 'object') {
        return null
      }
      const exp = o.expiresAt
      const res = o.result
      if (typeof exp !== 'number' || getNow() > exp) {
        store.removeItem(key)
        return null
      }
      return /** @type {FetchWebPluginManifestResult} */ (res)
    } catch (_) {
      return null
    }
  }

  function writeWebStorage(store, key, result, expiresAt) {
    try {
      store.setItem(key, JSON.stringify({ expiresAt, result }))
    } catch (_) {
      /* Quota / 不可序列化 */
    }
  }

  return (next) => {
    return async (ctx) => {
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

/**
 * 自右向左组合中间件（与 Koa/Redux 习惯一致：`compose(f,g,h)(inner)` = f(g(h(inner))))。
 *
 * @param {FetchWebPluginManifestFn} inner 最内层拉取实现
 * @param {...function(FetchWebPluginManifestFn): FetchWebPluginManifestFn} middlewares 每个元素签名 `(next) => async (ctx) => result`
 * @returns {FetchWebPluginManifestFn}
 */
export function composeManifestFetch(inner, ...middlewares) {
  if (typeof inner !== 'function') {
    throw new Error('[web-extend-plugin-vue2] composeManifestFetch 需要 inner 为函数')
  }
  let f = inner
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const mw = middlewares[i]
    if (typeof mw !== 'function') {
      throw new Error('[web-extend-plugin-vue2] composeManifestFetch 中间件须为函数')
    }
    f = mw(f)
  }
  return f
}
