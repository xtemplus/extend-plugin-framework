import { describe, it, expect, beforeEach } from 'vitest'
import { setWebExtendPluginEnv } from './bundled-env.js'
import { resolveRuntimeOptions } from './PluginRuntime.js'

describe('bundled-env + resolveRuntimeOptions', () => {
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
