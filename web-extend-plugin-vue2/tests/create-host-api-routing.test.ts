import { describe, it, expect, vi } from 'vitest'
import { createHostApi } from '../src/host/create-host-api'

function mockRouter(mode: string) {
  const addRoute = vi.fn()
  const addRoutes = vi.fn()
  if (mode === 'addRoute') {
    return { addRoute, addRoutes }
  }
  return {
    addRoutes
  }
}

describe('createHostApi routing pipeline', () => {
  it('applies transformRoutes before name/meta.pluginId wrap', () => {
    const router = mockRouter('addRoute')
    const transformRoutes = vi.fn(({ routes }) =>
      routes.map((r) => ({
        ...r,
        meta: { ...(r.meta || {}), pre: 1 }
      }))
    )
    const api = createHostApi('pid', router, { transformRoutes })

    const comp = { name: 'C' }
    api.registerRoutes([{ path: '/a', name: 'n1', component: comp }])

    expect(transformRoutes).toHaveBeenCalledTimes(1)
    const firstAdd = router.addRoute.mock.calls[0]
    expect(firstAdd.length).toBe(1)
    const arg = firstAdd[0]
    expect(arg.meta.pluginId).toBe('pid')
    expect(arg.meta.pre).toBe(1)
    expect(arg.name).toBe('n1')
  })

  it('throws when mixing PRD with RouteConfig', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('pid', router, {
      adaptRouteDeclarations: () => []
    })
    expect(() =>
      api.registerRoutes([
        { path: '/a', componentRef: 'x:y' },
        { path: '/b', component: {} }
      ])
    ).toThrow(/cannot mix/)
  })

  it('throws PRD without adaptRouteDeclarations', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('pid', router)
    expect(() => api.registerRoutes([{ path: '/a', componentRef: 'x:y' }])).toThrow(/adaptRouteDeclarations/)
  })

  it('uses adaptRouteDeclarations then transformRoutes', () => {
    const router = mockRouter('addRoute')
    const adaptRouteDeclarations = vi.fn(() => [{ path: '/z', component: { n: 'Z' } }])
    const transformRoutes = vi.fn(({ routes }) => routes.map((r) => ({ ...r, meta: { t: 1 } })))
    const api = createHostApi('pid', router, { adaptRouteDeclarations, transformRoutes })

    api.registerRoutes([{ path: '/x', componentRef: 'r:1' }])

    expect(adaptRouteDeclarations).toHaveBeenCalledTimes(1)
    expect(transformRoutes).toHaveBeenCalledTimes(1)
    const registered = router.addRoute.mock.calls[0][0]
    expect(registered.path).toBe('/z')
    expect(registered.meta.pluginId).toBe('pid')
    expect(registered.meta.t).toBe(1)
  })

  it('interceptRegisterRoutes must call applyInternalRegister to register', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('pid', router, {
      interceptRegisterRoutes: () => {
        /* deliberate no-op */
      }
    })
    api.registerRoutes([{ path: '/q', component: {} }])
    expect(router.addRoute).not.toHaveBeenCalled()
  })

  it('interceptRegisterRoutes can call applyInternalRegister', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('pid', router, {
      interceptRegisterRoutes: ({ routes, applyInternalRegister }) => {
        applyInternalRegister([...routes])
      }
    })
    api.registerRoutes([{ path: '/q', component: {} }])
    expect(router.addRoute).toHaveBeenCalled()
  })

  it('throws when addRoute missing (vue-router 3.5+ required)', () => {
    const router = mockRouter('legacy')
    const api = createHostApi('pid', router)
    expect(() => api.registerRoutes([{ path: '/legacy', component: {} }])).toThrow(/addRoute/)
  })

  it('uses pluginRoutesParentName with addRoute', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('pid', router, { pluginRoutesParentName: 'layout' })
    api.registerRoutes([{ path: 'child', component: {} }])
    expect(router.addRoute).toHaveBeenCalledWith('layout', expect.objectContaining({ path: 'child' }))
  })
})

describe('createHostApi hostContext', () => {
  it('exposes hostContext from hostKit', () => {
    const router = mockRouter('addRoute')
    const ctx = Object.freeze({ store: { x: 1 } })
    const api = createHostApi('p', router, { hostContext: ctx })
    expect(api.hostContext).toBe(ctx)
  })

  it('defaults hostContext to empty frozen object when omitted', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('p', router)
    expect(api.hostContext).toEqual({})
    expect(Object.isFrozen(api.hostContext)).toBe(true)
  })
})

describe('createHostApi registerMenuItems', () => {
  it('throws without applyPluginMenuItems', () => {
    const router = mockRouter('addRoute')
    const api = createHostApi('pid', router)
    expect(() => api.registerMenuItems([{ path: '/x' }])).toThrow(/applyPluginMenuItems/)
  })

  it('calls applyPluginMenuItems with sorted items and pluginId', () => {
    const router = mockRouter('addRoute')
    const applyPluginMenuItems = vi.fn()
    const api = createHostApi('pid', router, { applyPluginMenuItems })
    api.registerMenuItems([{ path: '/b', order: 2 }, { path: '/a', order: 1 }])
    expect(applyPluginMenuItems).toHaveBeenCalledWith({
      pluginId: 'pid',
      items: [
        expect.objectContaining({ path: '/a', order: 1, pluginId: 'pid' }),
        expect.objectContaining({ path: '/b', order: 2, pluginId: 'pid' })
      ]
    })
  })
})
