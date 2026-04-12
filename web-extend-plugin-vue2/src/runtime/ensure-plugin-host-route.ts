/**
 * 当 `ensurePluginHostRoute === true` 且提供 `pluginRoutesParentName` + `hostLayoutComponent` 时，
 * 注册 `pluginMountPath` + Layout 的命名父路由，供 `router.addRoute(parentName, child)` 挂载插件页。
 */
import { defaultWebExtendPluginRuntime } from '../core/public-config-defaults'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VueRouterLike = any

function routeNameExists(router: VueRouterLike, name: string): boolean {
  if (!name) {
    return false
  }
  if (typeof router.getRoutes === 'function') {
    return router.getRoutes().some((r: { name?: string | symbol }) => r.name === name)
  }
  return walkRouteNames(router.options && router.options.routes, name)
}

function walkRouteNames(routes: unknown[] | undefined, name: string): boolean {
  if (!Array.isArray(routes)) {
    return false
  }
  for (const r of routes) {
    if (r && typeof r === 'object' && (r as Record<string, unknown>).name === name) {
      return true
    }
    const ch = r && typeof r === 'object' ? (r as Record<string, unknown>).children : null
    if (walkRouteNames(ch as unknown[] | undefined, name)) {
      return true
    }
  }
  return false
}

export function ensurePluginHostRoute(router: VueRouterLike, opts: Record<string, unknown>) {
  if (opts.ensurePluginHostRoute !== true) {
    return
  }
  if (!router || typeof router.addRoute !== 'function') {
    return
  }
  const parentName = String(opts.pluginRoutesParentName || '').trim()
  if (!parentName) {
    return
  }
  if (routeNameExists(router, parentName)) {
    return
  }
  const Layout = opts.hostLayoutComponent
  if (!Layout) {
    console.warn(
      '[wep] 缺少 hostLayoutComponent，未自动注册插件壳路由；请传入宿主 Layout，或在路由表中自行配置与 pluginRoutesParentName 一致的父路由'
    )
    return
  }
  const mountDefault = defaultWebExtendPluginRuntime.pluginMountPath
  let pathRaw = String(opts.pluginMountPath || mountDefault).trim().replace(/\/$/, '') || mountDefault
  if (!pathRaw.startsWith('/')) {
    pathRaw = `/${pathRaw}`
  }
  const meta =
    opts.pluginHostRouteMeta && typeof opts.pluginHostRouteMeta === 'object'
      ? { ...(opts.pluginHostRouteMeta as object) }
      : { requiresConfig: true, hidden: true }

  router.addRoute({
    path: pathRaw,
    name: parentName,
    component: Layout,
    redirect: 'noredirect',
    meta,
    children: []
  })
}
