import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  bootstrapPlugins,
  defaultFetchWebPluginManifest,
  resolveRuntimeOptions
} from '../src/runtime/public-api'

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

  it('resolveRuntimeOptions passes through menu hooks when provided', () => {
    const applyPluginMenuItems = () => {}
    const revokePluginMenuItems = () => {}
    const o = resolveRuntimeOptions({ applyPluginMenuItems, revokePluginMenuItems })
    expect(o.applyPluginMenuItems).toBe(applyPluginMenuItems)
    expect(o.revokePluginMenuItems).toBe(revokePluginMenuItems)
  })

  it('resolveRuntimeOptions passes hostContext and lifecycle hooks', () => {
    const hostContext = { a: 1 }
    const onBeforePluginActivate = () => {}
    const onAfterPluginActivate = () => {}
    const onPluginActivateError = () => {}
    const o = resolveRuntimeOptions({
      hostContext,
      onBeforePluginActivate,
      onAfterPluginActivate,
      onPluginActivateError
    })
    expect(o.hostContext).toBe(hostContext)
    expect(o.onBeforePluginActivate).toBe(onBeforePluginActivate)
    expect(o.onAfterPluginActivate).toBe(onAfterPluginActivate)
    expect(o.onPluginActivateError).toBe(onPluginActivateError)
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
    expect((r.data as { plugins: unknown[] }).plugins).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith('https://x.test/m', { credentials: 'include' })
    vi.unstubAllGlobals()
  })
})

describe('bootstrapPlugins with fetchManifest', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    global.window = {} as Window & typeof globalThis
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    infoSpy.mockRestore()
    delete (global as { window?: unknown }).window
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
    } as unknown as Window & typeof globalThis
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
        bridgeAllowedPathPrefixes: expect.any(Array),
        hostContext: expect.any(Object)
      })
    )
    expect(activator).toHaveBeenCalledTimes(1)
    const ctx = activator.mock.calls[0][1] as { pluginRecord: object }
    expect(ctx).toEqual({
      pluginRecord: expect.objectContaining({ id: 't1', extra: 1 })
    })
    expect(Object.isFrozen(ctx.pluginRecord)).toBe(true)
    vi.unstubAllGlobals()
    delete (global as { window?: unknown }).window
  })

  it('onBeforePluginActivate throw skips activator', async () => {
    const activator = vi.fn()
    global.window = {
      __PLUGIN_ACTIVATORS__: {
        skipme: activator
      }
    } as unknown as Window & typeof globalThis
    const onBeforePluginActivate = vi.fn(() => {
      throw new Error('gate')
    })
    const fetchManifest = vi.fn(async () => ({
      ok: true,
      data: { plugins: [{ id: 'skipme' }] }
    }))
    await bootstrapPlugins(
      {},
      () => ({}),
      resolveRuntimeOptions({
        manifestBase: 'http://localhost',
        manifestListPath: '/api/x',
        fetchManifest,
        onBeforePluginActivate
      })
    )
    expect(onBeforePluginActivate).toHaveBeenCalled()
    expect(activator).not.toHaveBeenCalled()
    delete (global as { window?: unknown }).window
  })

  it('onAfterPluginActivate runs after successful activator', async () => {
    const activator = vi.fn()
    global.window = {
      __PLUGIN_ACTIVATORS__: {
        okp: activator
      }
    } as unknown as Window & typeof globalThis
    const onAfterPluginActivate = vi.fn()
    const fetchManifest = vi.fn(async () => ({
      ok: true,
      data: { plugins: [{ id: 'okp' }] }
    }))
    await bootstrapPlugins(
      {},
      () => ({ x: 1 }),
      resolveRuntimeOptions({
        manifestBase: 'http://localhost',
        manifestListPath: '/api/x',
        fetchManifest,
        onAfterPluginActivate
      })
    )
    expect(activator).toHaveBeenCalledTimes(1)
    expect(onAfterPluginActivate).toHaveBeenCalledTimes(1)
    expect(onAfterPluginActivate.mock.calls[0][0].pluginId).toBe('okp')
    expect(onAfterPluginActivate.mock.calls[0][0].hostApi).toEqual({ x: 1 })
    delete (global as { window?: unknown }).window
  })
})
