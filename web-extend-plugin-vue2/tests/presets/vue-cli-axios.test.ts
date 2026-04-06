import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createVueCliAxiosInstallOptions,
  createVueCliAxiosQuickInstallOptions,
  defaultVueCliJavaManifestListPath,
  resolveManifestPathUnderApiBase,
  unwrapNestedManifestBody,
  presetVueCliAxios
} from '../../src/presets/vue-cli-axios'

describe('presetVueCliAxios', () => {
  it('exposes stable', () => {
    expect(presetVueCliAxios.id).toBe('vue-cli-axios')
    expect(presetVueCliAxios.createInstallOptions).toBe(createVueCliAxiosInstallOptions)
    expect(presetVueCliAxios.createQuickInstallOptions).toBe(createVueCliAxiosQuickInstallOptions)
    expect(presetVueCliAxios.defaultJavaManifestListPath).toBe(defaultVueCliJavaManifestListPath)
    expect(presetVueCliAxios.manifestPathForApiBase).toBe(resolveManifestPathUnderApiBase)
    expect(presetVueCliAxios.unwrapManifestBody).toBe(unwrapNestedManifestBody)
  })
})

describe('unwrapNestedManifestBody', () => {
  it('accepts flat plugins', () => {
    const b = unwrapNestedManifestBody({ plugins: [{ id: 'a' }] })!
    expect((b as { plugins: unknown[] }).plugins).toHaveLength(1)
  })
  it('unwraps data.plugins', () => {
    const b = unwrapNestedManifestBody({ code: 200, data: { plugins: [] } })!
    expect((b as { plugins: unknown[] }).plugins).toEqual([])
  })
})

describe('resolveManifestPathUnderApiBase', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('strips api base from pathname', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    const p = resolveManifestPathUnderApiBase(
      'http://localhost/dev-api/api/frontend-plugins',
      '/dev-api'
    )
    expect(p).toBe('/api/frontend-plugins')
  })
})

describe('createVueCliAxiosInstallOptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('throws without request', () => {
    expect(() => createVueCliAxiosInstallOptions({} as { request: () => Promise<unknown> })).toThrow()
  })

  it('returns fetchManifest that uses request', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    const request = vi.fn(() => Promise.resolve({ plugins: [] }))
    const opts = createVueCliAxiosInstallOptions({ request }, { manifestBase: '/dev-api' })
    expect(typeof opts.fetchManifest).toBe('function')
    const r = (await (opts.fetchManifest as (c: unknown) => Promise<{ ok: boolean }>)({
      manifestUrl: 'http://localhost/dev-api/api/frontend-plugins',
      credentials: 'include'
    }))!
    expect(r.ok).toBe(true)
    expect(request).toHaveBeenCalledWith({ url: '/api/frontend-plugins', method: 'get' })
  })

  it('static mode uses fetch and not request', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:8080' } })
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ hostPluginApiVersion: '1.0.0', plugins: [{ id: 'p1', entryUrl: '/x.js' }] })
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const request = vi.fn()
    const opts = createVueCliAxiosInstallOptions(
      { request },
      { manifestMode: 'static', manifestBase: '/dev-api' }
    )
    expect(opts.manifestMode).toBe('static')
    const url = 'http://localhost:8080/web-plugins/plugins.manifest.json'
    const r = (await (opts.fetchManifest as (c: unknown) => Promise<{ ok: boolean; data?: unknown }>)({
      manifestUrl: url,
      credentials: 'include'
    }))!
    expect(r.ok).toBe(true)
    expect(request).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    })
    expect((r.data as { plugins: unknown[] }).plugins).toHaveLength(1)
  })
})

describe('createVueCliAxiosQuickInstallOptions', () => {
  it('merges hostContext with router and store', () => {
    const router = { r: 1 }
    const store = { s: 1 }
    const request = vi.fn(() => Promise.resolve({ plugins: [] }))
    const opts = createVueCliAxiosQuickInstallOptions(
      router,
      {
        request,
        hostLayoutComponent: {},
        store,
        hostContext: { i18n: 'x' }
      },
      { manifestListPath: '/custom-list' }
    ) as { hostContext: Record<string, unknown>; manifestListPath: string }
    expect(opts.hostContext.router).toBe(router)
    expect(opts.hostContext.store).toBe(store)
    expect(opts.hostContext.i18n).toBe('x')
    expect(opts.manifestListPath).toBe('/custom-list')
  })

  it('defaults manifestListPath to defaultVueCliJavaManifestListPath', () => {
    const request = vi.fn(() => Promise.resolve({ plugins: [] }))
    const opts = createVueCliAxiosQuickInstallOptions(
      { navigate: vi.fn() },
      { request, hostLayoutComponent: {} },
      {}
    ) as { manifestListPath: string }
    expect(opts.manifestListPath).toBe(defaultVueCliJavaManifestListPath)
  })
})
