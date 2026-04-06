/**
 * 插件访问后端的受控通道：`fetch` 仅允许落在配置的路径前缀下（默认 `/api/`），默认 `credentials: 'same-origin'`。
 */
import { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
import { ensureLeadingPath } from './runtime/path-host-utils.js'

/**
 * @param {{ allowedPathPrefixes?: string[] }} [config]
 */
export function createRequestBridge(config = {}) {
  const raw =
    Array.isArray(config.allowedPathPrefixes) && config.allowedPathPrefixes.length > 0
      ? config.allowedPathPrefixes
      : defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes
  const allowedPathPrefixes = raw.map((p) => ensureLeadingPath(p))

  return {
    /**
     * @param {string} path 必须以 `/` 开头，且匹配某一白名单前缀
     * @param {RequestInit} [init]
     */
    async request(path, init = {}) {
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
