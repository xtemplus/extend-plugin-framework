/**
 * 插件通过宿主访问后端的受控通道：仅允许配置的前缀路径，默认 `/api/`；强制默认 `same-origin` 携带 Cookie。
 * 前缀列表由 `createRequestBridge({ allowedPathPrefixes })` 传入，与 `defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes` 对齐。
 *
 * @module bridge
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
     * 发起受控 `fetch`。
     * @param {string} path 必须以 `/` 开头，且匹配某一 `allowedPathPrefixes` 前缀
     * @param {RequestInit} [init] 会与默认 `{ credentials: 'same-origin' }` 合并（后者可被覆盖）
     */
    async request(path, init = {}) {
      if (typeof path !== 'string' || !path.startsWith('/')) {
        throw new Error('[bridge] path must be a string starting with /')
      }
      const allowed = allowedPathPrefixes.some((p) => path.startsWith(p))
      if (!allowed) {
        throw new Error('[bridge] path not allowed: ' + path)
      }
      return fetch(path, {
        credentials: 'same-origin',
        ...init
      })
    }
  }
}
