import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  bootstrapPlugins,
  defaultFetchWebPluginManifest,
  resolveRuntimeOptions
} from '../src/PluginRuntime.js'

describe('fetchManifest', () => {
  it('resolveRuntimeOptions passes through fetchManifest', () => {
    const fn = async () => ({ ok: true, data: { plugins: [] } })
    const o = resolveRuntimeOptions({ fetchManifest: fn })
    expect(o.fetchManifest).toBe(fn)
  })

  it('defaultFetchWebPluginManifest uses global fetch', async () => {
    const res = new Response(JSON.stringify({ plugins: [{ id: 'a' }] }), { status: 200 })
    const fetchMock = vi.fn(() => Promise.resolve(res))
    vi.stubGlobal('fetch', fetchMock)
    const r = await defaultFetchWebPluginManifest({
      manifestUrl: 'https://x.test/m',
      credentials: 'include'
    })
    expect(r.ok).toBe(true)
    expect(r.data.plugins).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith('https://x.test/m', { credentials: 'include' })
    vi.unstubAllGlobals()
  })
})

describe('bootstrapPlugins with fetchManifest', () => {
  let infoSpy

  beforeEach(() => {
    global.window = {}
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    infoSpy.mockRestore()
    delete global.window
    vi.unstubAllGlobals()
  })

  it('uses custom fetchManifest when provided', async () => {
    const fetchManifest = vi.fn(async () => ({
      ok: true,
      data: { plugins: [] }
    }))
    await bootstrapPlugins(
      {},
      () => ({}),
      resolveRuntimeOptions({
        manifestBase: 'http://localhost',
        manifestListPath: '/api/x',
        fetchManifest
      })
    )
    expect(fetchManifest).toHaveBeenCalledWith({
      manifestUrl: 'http://localhost/api/x',
      credentials: 'include'
    })
  })
})
