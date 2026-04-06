import { describe, it, expect, vi } from 'vitest'
import { ensurePluginHostRoute } from '../../src/runtime/ensure-plugin-host-route'

describe('ensurePluginHostRoute', () => {
  const Layout = { name: 'HostLayout' }

  it('adds /plugin shell when name absent', () => {
    const addRoute = vi.fn()
    const getRoutes = vi.fn(() => [])
    const router = { addRoute, getRoutes, options: { routes: [] } }
    ensurePluginHostRoute(router, {
      ensurePluginHostRoute: true,
      pluginRoutesParentName: '__wepPluginHost',
      pluginMountPath: '/plugin',
      hostLayoutComponent: Layout
    })
    expect(addRoute).toHaveBeenCalledTimes(1)
    const cfg = addRoute.mock.calls[0][0]
    expect(cfg.path).toBe('/plugin')
    expect(cfg.name).toBe('__wepPluginHost')
    expect(cfg.component).toBe(Layout)
    expect(cfg.redirect).toBe('noredirect')
  })

  it('skips when route name already exists', () => {
    const addRoute = vi.fn()
    const getRoutes = vi.fn(() => [{ name: '__wepPluginHost' }])
    const router = { addRoute, getRoutes }
    ensurePluginHostRoute(router, {
      pluginRoutesParentName: '__wepPluginHost',
      hostLayoutComponent: Layout
    })
    expect(addRoute).not.toHaveBeenCalled()
  })

  it('skips when ensurePluginHostRoute false', () => {
    const addRoute = vi.fn()
    const router = { addRoute, getRoutes: () => [] }
    ensurePluginHostRoute(router, {
      ensurePluginHostRoute: false,
      pluginRoutesParentName: '__wepPluginHost',
      hostLayoutComponent: Layout
    })
    expect(addRoute).not.toHaveBeenCalled()
  })
})
