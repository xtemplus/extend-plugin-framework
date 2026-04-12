/**
 * 记录各插件通过 registerRoutes 挂到 router 上的顶层路由，
 * 优先使用官方 `addRoute()` 返回的 disposer 做卸载；仅在 disposer 不可用时回退到 name。
 */

type RegisteredTopRoute = {
  name: string
  dispose?: (() => void) | undefined
}

const pluginIdToTopRoutes = new Map<string, RegisteredTopRoute[]>()

export function recordPluginTopRoutes(pluginId: string, routes: RegisteredTopRoute[]) {
  if (!pluginId || routes.length === 0) {
    return
  }

  const normalized = routes.filter((route) => route && route.name)
  if (normalized.length === 0) {
    return
  }

  const cur = pluginIdToTopRoutes.get(pluginId) || []
  pluginIdToTopRoutes.set(pluginId, cur.concat(normalized))
}

function tryRemoveRouteByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any,
  pluginId: string,
  name: string
) {
  if (!router || typeof router.removeRoute !== 'function') {
    console.warn('[wep] route disposer unavailable，且 router.removeRoute 不可用，动态路由可能残留', pluginId, name)
    return
  }

  try {
    router.removeRoute(name)
  } catch (e) {
    console.warn('[wep] removeRoute fallback failed', name, e)
  }
}

/**
 * 从 matcher 移除该插件登记过的顶层路由（含其子树）。
 * 优先走 `router.addRoute()` 返回的 disposer；仅在 disposer 不可用时回退 `router.removeRoute(name)`。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function removeRegisteredRoutesForPlugin(router: any, pluginId: string) {
  const routes = pluginIdToTopRoutes.get(pluginId)
  if (!routes || routes.length === 0) {
    return
  }

  for (let i = routes.length - 1; i >= 0; i--) {
    const route = routes[i]

    if (typeof route.dispose === 'function') {
      try {
        route.dispose()
        continue
      } catch (e) {
        console.warn('[wep] route disposer failed', route.name, e)
      }
    }

    tryRemoveRouteByName(router, pluginId, route.name)
  }

  pluginIdToTopRoutes.delete(pluginId)
}

/** 调试或宿主高级场景：查询已登记 name（勿依赖顺序语义） */
export function getRegisteredTopRouteNamesForPlugin(pluginId: string): string[] {
  return (pluginIdToTopRoutes.get(pluginId) || []).map((route) => route.name)
}
