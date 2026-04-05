import { describe, it, expect, vi } from 'vitest'
import {
  composeManifestFetch,
  manifestFetchCacheMiddleware,
  wrapManifestFetchWithCache
} from '../../src/runtime/manifest-fetch-composer.js'

describe('composeManifestFetch', () => {
  it('returns inner when no middlewares', async () => {
    const inner = vi.fn(async () => ({ ok: true, data: { plugins: [] } }))
    const f = composeManifestFetch(inner)
    const r = await f({ manifestUrl: 'http://a', credentials: 'include' })
    expect(r.ok).toBe(true)
    expect(inner).toHaveBeenCalledTimes(1)
  })

  it('composes left-to-right outer first', async () => {
    const calls = []
    const inner = vi.fn(async () => {
      calls.push('inner')
      return { ok: true, data: { plugins: [] } }
    })
    const a = (next) => async (ctx) => {
      calls.push('a-in')
      const r = await next(ctx)
      calls.push('a-out')
      return r
    }
    const b = (next) => async (ctx) => {
      calls.push('b-in')
      const r = await next(ctx)
      calls.push('b-out')
      return r
    }
    const f = composeManifestFetch(inner, a, b)
    await f({ manifestUrl: 'x', credentials: 'omit' })
    expect(calls).toEqual(['a-in', 'b-in', 'inner', 'b-out', 'a-out'])
  })
})

describe('manifestFetchCacheMiddleware', () => {
  it('ttl 0 is no-op', async () => {
    const inner = vi.fn(async () => ({ ok: true, data: { plugins: [1] } }))
    const f = wrapManifestFetchWithCache(inner, { ttlMs: 0 })
    await f({ manifestUrl: 'u', credentials: 'include' })
    await f({ manifestUrl: 'u', credentials: 'include' })
    expect(inner).toHaveBeenCalledTimes(2)
  })

  it('caches successful responses in memory', async () => {
    const inner = vi.fn(async () => ({ ok: true, data: { plugins: [{ id: 'x' }] } }))
    const f = wrapManifestFetchWithCache(inner, { ttlMs: 60_000, now: () => 1000 })
    const ctx = { manifestUrl: 'http://h/api/list', credentials: 'include' }
    const r1 = await f(ctx)
    const r2 = await f(ctx)
    expect(r1.data.plugins).toHaveLength(1)
    expect(r2.data.plugins).toHaveLength(1)
    expect(inner).toHaveBeenCalledTimes(1)
  })

  it('does not cache failed responses by default', async () => {
    const inner = vi.fn(async () => ({ ok: false, data: null }))
    const f = wrapManifestFetchWithCache(inner, { ttlMs: 60_000 })
    await f({ manifestUrl: 'u', credentials: 'include' })
    await f({ manifestUrl: 'u', credentials: 'include' })
    expect(inner).toHaveBeenCalledTimes(2)
  })
})
