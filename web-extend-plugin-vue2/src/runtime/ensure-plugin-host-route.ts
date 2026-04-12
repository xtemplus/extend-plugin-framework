/**
 * 在需要时补注册插件宿主父路由。
 */
import { defaultWebExtendPluginRuntime } from '../core/public-config-defaults'
import { resolveRuntimeOptions } from './resolve-runtime-options'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VueRouterLike = any

function routeNameExists(router: VueRouterLike, name: string): boolean {
  if (!name) {
    return false
  }
  if (typeof router.getRoutes === 'function') {
    return router.getRoutes().some((route: { name?: string | symbol }) => route.name === name)
  }
  return walkRouteNames(router.options && router.options.routes, name)
}

function walkRouteNames(routes: unknown[] | undefined, name: string): boolean {
  if (!Array.isArray(routes)) {
    return false
  }
  for (const route of routes) {
    if (route && typeof route === 'object' && (route as Record<string, unknown>).name === name) {
      return true
    }
    const children =
      route && typeof route === 'object' ? ((route as Record<string, unknown>).children as unknown[] | undefined) : undefined
    if (walkRouteNames(children, name)) {
      return true
    }
  }
  return false
}

function normalizeMountPath(value: unknown): string {
  const mountDefault = defaultWebExtendPluginRuntime.pluginMountPath
  const raw = String(value || mountDefault).trim().replace(/\/$/, '') || mountDefault
  return raw.startsWith('/') ? raw : `/${raw}`
}

function resolveRouteMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : { requiresConfig: true, hidden: true }
}

export function ensurePluginHostRoute(router: VueRouterLike, options: Record<string, unknown>) {
  const opts =
    options && typeof options === 'object' && ('manifestBase' in options || 'ensurePluginHostRoute' in options)
      ? options
      : resolveRuntimeOptions(options)

  if (opts.ensurePluginHostRoute !== true || !router || typeof router.addRoute !== 'function') {
    return
  }

  const parentName = String(opts.pluginRoutesParentName || '').trim()
  if (!parentName || routeNameExists(router, parentName)) {
    return
  }

  const Layout = opts.hostLayoutComponent
  if (!Layout) {
    console.warn(
      '[wep] missing hostLayoutComponent; plugin host route was not auto-registered'
    )
    return
  }

  router.addRoute({
    path: normalizeMountPath(opts.pluginMountPath),
    name: parentName,
    component: Layout,
    redirect: 'noredirect',
    meta: resolveRouteMeta(opts.pluginHostRouteMeta),
    children: []
  })
}
