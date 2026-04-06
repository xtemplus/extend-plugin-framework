import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveRuntimeOptions } from '../../src/runtime/resolve-runtime-options'

describe('resolveRuntimeOptions dev manifest fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('enables devManifestFallback in api mode when isDev', () => {
    const o = resolveRuntimeOptions({ isDev: true, manifestMode: 'api' })
    expect(o.devManifestFallback).toBe(true)
    expect(o.devFallbackStaticManifestUrl).toBe('/web-plugins/plugins.manifest.json')
  })

  it('disables devManifestFallback when manifestMode is static', () => {
    const o = resolveRuntimeOptions({ isDev: true, manifestMode: 'static', staticManifestUrl: '/x.json' })
    expect(o.devManifestFallback).toBe(false)
  })

  it('respects devManifestFallback: false', () => {
    const o = resolveRuntimeOptions({ isDev: true, manifestMode: 'api', devManifestFallback: false })
    expect(o.devManifestFallback).toBe(false)
  })

  it('defaults pluginRoutesParentName when hostLayoutComponent set', () => {
    const L = {}
    const o = resolveRuntimeOptions({ hostLayoutComponent: L })
    expect(o.pluginRoutesParentName).toBe('__wepPluginHost')
    expect(o.pluginMountPath).toBe('/plugin')
  })

  it('empty pluginRoutesParentName without layout', () => {
    const o = resolveRuntimeOptions({})
    expect(o.pluginRoutesParentName).toBe('')
  })
})
