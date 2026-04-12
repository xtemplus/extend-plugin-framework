/**
 * 按插件记录已贡献路由的可序列化快照，避免宿主依赖 router 内部 matcher 形态。
 */

export type PluginRouteSnapshot = {
  path?: string
  name?: string | symbol
  meta?: Record<string, unknown>
  children?: PluginRouteSnapshot[]
  [key: string]: unknown
}

const contributedRoutesByPlugin = new Map<string, PluginRouteSnapshot[]>()

function sanitizeValue(value: unknown): unknown {
  if (value == null) {
    return value
  }
  if (typeof value === 'function') {
    return undefined
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined)
  }
  if (typeof value !== 'object') {
    return value
  }

  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'component' || key === 'components') {
      continue
    }
    const sanitized = sanitizeValue(raw)
    if (sanitized !== undefined) {
      out[key] = sanitized
    }
  }
  return out
}

export function sanitizeContributedRoutes(routes: unknown[]): PluginRouteSnapshot[] {
  return routes
    .map((route) => sanitizeValue(route))
    .filter((route): route is PluginRouteSnapshot => !!route && typeof route === 'object')
}

export function recordContributedRoutesForPlugin(pluginId: string, routes: unknown[]): PluginRouteSnapshot[] {
  const sanitized = sanitizeContributedRoutes(routes)
  const current = contributedRoutesByPlugin.get(pluginId) || []
  const next = current.concat(sanitized)
  contributedRoutesByPlugin.set(pluginId, next)
  return next.map((route) => sanitizeValue(route) as PluginRouteSnapshot)
}

export function getContributedRoutesForPlugin(pluginId: string): PluginRouteSnapshot[] {
  const routes = contributedRoutesByPlugin.get(pluginId) || []
  return routes.map((route) => sanitizeValue(route) as PluginRouteSnapshot)
}

export function clearContributedRoutesForPlugin(pluginId: string) {
  contributedRoutesByPlugin.delete(pluginId)
}
