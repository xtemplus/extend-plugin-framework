import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createVueCliAxiosInstallOptions,
  manifestPathForVueCliApiBase,
  unwrapTableStyleManifestBody,
  presetVueCliAxios
} from '../../src/presets/vue-cli-axios.js'

describe('presetVueCliAxios', () => {
  it('exposes stable facade', () => {
    expect(presetVueCliAxios.id).toBe('vue-cli-axios')
    expect(presetVueCliAxios.createInstallOptions).toBe(createVueCliAxiosInstallOptions)
    expect(presetVueCliAxios.manifestPathForApiBase).toBe(manifestPathForVueCliApiBase)
    expect(presetVueCliAxios.unwrapManifestBody).toBe(unwrapTableStyleManifestBody)
  })
})

describe('unwrapTableStyleManifestBody', () => {
  it('accepts flat plugins', () => {
    const b = unwrapTableStyleManifestBody({ plugins: [{ id: 'a' }] })
    expect(b.plugins).toHaveLength(1)
  })
  it('unwraps data.plugins', () => {
    const b = unwrapTableStyleManifestBody({ code: 200, data: { plugins: [] } })
    expect(b.plugins).toEqual([])
  })
})

describe('manifestPathForVueCliApiBase', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('strips api base from pathname', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    const p = manifestPathForVueCliApiBase('http://localhost/dev-api/api/frontend-plugins', '/dev-api')
    expect(p).toBe('/api/frontend-plugins')
  })
})

describe('createVueCliAxiosInstallOptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('throws without request', () => {
    expect(() => createVueCliAxiosInstallOptions({})).toThrow()
  })

  it('returns fetchManifest that uses request', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    const request = vi.fn(() => Promise.resolve({ plugins: [] }))
    const opts = createVueCliAxiosInstallOptions({ request }, { manifestBase: '/dev-api' })
    expect(typeof opts.fetchManifest).toBe('function')
    const r = await opts.fetchManifest({
      manifestUrl: 'http://localhost/dev-api/api/frontend-plugins',
      credentials: 'include'
    })
    expect(r.ok).toBe(true)
    expect(request).toHaveBeenCalledWith({ url: '/api/frontend-plugins', method: 'get' })
  })
})
