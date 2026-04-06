/**
 * 插件访问后端的受控通道：`fetch` 仅允许落在配置的路径前缀下（默认 `/api/`），默认 `credentials: 'same-origin'`。
 */
import { defaultWebExtendPluginRuntime } from '../core/default-runtime-config'
import { ensureLeadingPath } from '../runtime/path-host-utils'

export function createRequestBridge(config: { allowedPathPrefixes?: string[] } = {}) {
  const raw =
    Array.isArray(config.allowedPathPrefixes) && config.allowedPathPrefixes.length > 0
      ? config.allowedPathPrefixes
      : defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes
  const allowedPathPrefixes = raw.map((p) => ensureLeadingPath(p))

  return {
    async request(path: string, init: RequestInit = {}) {
      if (typeof path !== 'string' || !path.startsWith('/')) {
        throw new Error('[wep:bridge] path must start with /')
      }
      const allowed = allowedPathPrefixes.some((p) => path.startsWith(p))
      if (!allowed) {
        throw new Error('[wep:bridge] path not allowed: ' + path)
      }
      return fetch(path, {
        credentials: 'same-origin',
        ...init
      })
    }
  }
}
