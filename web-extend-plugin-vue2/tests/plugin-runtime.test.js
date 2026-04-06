import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  bootstrapPlugins,
  defaultFetchWebPluginManifest,
  resolveRuntimeOptions
} from '../src/plugin-runtime.js'

describe('fetchManifest', () => {
  it('resolveRuntimeOptions passes through fetchManifest', () => {
    const fn = async () => ({ ok: true, data: { plugins: [] } })
    const o = resolveRuntimeOptions({ fetchManifest: fn })
    expect(o.fetchManifest).toBe(fn)
  })

  it('resolveRuntimeOptions passes through routing hooks when provided', () => {
    const transformRoutes = () => []
    const interceptRegisterRoutes = () => {}
    const adaptRouteDeclarations = () => []
    const o = resolveRuntimeOptions({
      transformRoutes,
      interceptRegisterRoutes,
      adaptRouteDeclarations
    })
    expect(o.transformRoutes).toBe(transformRoutes)
    expect(o.interceptRegisterRoutes).toBe(interceptRegisterRoutes)
    expect(o.adaptRouteDeclarations).toBe(adaptRouteDeclarations)
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

  it('passes frozen pluginRecord to activator as second argument', async () => {
    const activator = vi.fn()
    global.window = {
      __PLUGIN_ACTIVATORS__: {
        t1: activator
      }
    }
    const fetchManifest = vi.fn(async () => ({
      ok: true,
      data: { plugins: [{ id: 't1', extra: 1 }] }
    }))
    const factory = vi.fn(() => ({}))
    await bootstrapPlugins(
      {},
      factory,
      resolveRuntimeOptions({
        manifestBase: 'http://localhost',
        manifestListPath: '/api/x',
        fetchManifest,
        transformRoutes: (ctx) => ctx.routes
      })
    )
    expect(factory).toHaveBeenCalledWith(
      't1',
      {},
      expect.objectContaining({
        transformRoutes: expect.any(Function),
        bridgeAllowedPathPrefixes: expect.any(Array)
      })
    )
    expect(activator).toHaveBeenCalledTimes(1)
    const ctx = activator.mock.calls[0][1]
    expect(ctx).toEqual({
      pluginRecord: expect.objectContaining({ id: 't1', extra: 1 })
    })
    expect(Object.isFrozen(ctx.pluginRecord)).toBe(true)
    vi.unstubAllGlobals()
    delete global.window
  })
})
