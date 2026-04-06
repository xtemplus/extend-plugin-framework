import { describe, it, expect, beforeEach } from 'vitest'
import { setWebExtendPluginEnv } from '../src/core/build-env'
import { resolveRuntimeOptions } from '../src/runtime/public-api'

describe('build-env + resolveRuntimeOptions', () => {
  beforeEach(() => {
    setWebExtendPluginEnv(null)
  })

  it('reads VITE_FRONTEND_PLUGIN_BASE from setWebExtendPluginEnv', () => {
    setWebExtendPluginEnv({ VITE_FRONTEND_PLUGIN_BASE: '/from-injected' })
    const o = resolveRuntimeOptions({})
    expect(o.manifestBase).toBe('/from-injected')
  })

  it('explicit resolveRuntimeOptions wins over injected env', () => {
    setWebExtendPluginEnv({ VITE_FRONTEND_PLUGIN_BASE: '/from-injected' })
    const o = resolveRuntimeOptions({ manifestBase: '/explicit' })
    expect(o.manifestBase).toBe('/explicit')
  })
})
