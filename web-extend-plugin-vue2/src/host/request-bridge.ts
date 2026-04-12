/**
 * 插件访问后端的受控通道：`fetch` 仅允许落在配置的路径前缀下（默认 `/api/`），默认 `credentials: 'same-origin'`。
 */
import { defaultWebExtendPluginRuntime } from '../core/public-config-defaults'
import { ensureLeadingPath } from '../runtime/path-host-utils'

function normalizeBridgePath(input: string): string {
  if (typeof window === 'undefined') {
    throw new Error('[wep:bridge] window is unavailable')
  }
  if (typeof input !== 'string' || !input.startsWith('/')) {
    throw new Error('[wep:bridge] path must start with /')
  }
  if (input.includes('\\')) {
    throw new Error('[wep:bridge] path must not contain backslashes')
  }

  const url = new URL(input, window.location.origin)
  if (url.origin !== window.location.origin) {
    throw new Error('[wep:bridge] cross-origin path is not allowed')
  }

  const normalized = url.pathname
  const decodedPath = (() => {
    try {
      return decodeURIComponent(normalized)
    } catch {
      return normalized
    }
  })()
  const hasTraversalSegment = decodedPath
    .split('/')
    .filter(Boolean)
    .some((segment) => segment === '.' || segment === '..')
  if (hasTraversalSegment) {
    throw new Error('[wep:bridge] path traversal is not allowed')
  }

  return normalized + url.search
}

export function createRequestBridge(config: { allowedPathPrefixes?: string[] } = {}) {
  const raw =
    Array.isArray(config.allowedPathPrefixes) && config.allowedPathPrefixes.length > 0
      ? config.allowedPathPrefixes
      : defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes
  const allowedPathPrefixes = raw.map((p) => ensureLeadingPath(p))

  return {
    async request(path: string, init: RequestInit = {}) {
      const normalizedPath = normalizeBridgePath(path)
      const pathnameOnly = normalizedPath.split('?')[0]
      const allowed = allowedPathPrefixes.some((p) => pathnameOnly === p || pathnameOnly.startsWith(`${p.replace(/\/$/, '')}/`))
      if (!allowed) {
        throw new Error('[wep:bridge] path not allowed: ' + normalizedPath)
      }
      return fetch(normalizedPath, {
        credentials: 'same-origin',
        ...init
      })
    }
  }
}
