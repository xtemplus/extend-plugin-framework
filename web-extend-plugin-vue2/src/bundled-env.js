/**
 * 不依赖 `import.meta`，兼容 Webpack 4/5、Vue CLI、Vite、Rspack 等宿主。
 * - Webpack / Vue CLI：依赖构建时注入的 `process.env`（如 `VUE_APP_*`、`DefinePlugin` 注入的 `VITE_*`）。
 * - Vite：在入口调用 `setWebExtendPluginEnv(import.meta.env)`，或 `installWebExtendPluginVue2(..., { env: import.meta.env })`。
 * - 也可在入口前设置 `globalThis.__WEP_ENV__ = import.meta.env`（与 setWebExtendPluginEnv 二选一即可）。
 *
 * @module bundled-env
 */

/** @type {Record<string, unknown> | null} */
let _explicitEnv = null

/**
 * 显式注入与 `import.meta.env` 同形态的对象（推荐 Vite 宿主在入口调用一次）。
 * @param {Record<string, unknown> | null | undefined} env
 */
export function setWebExtendPluginEnv(env) {
  _explicitEnv = env && typeof env === 'object' ? env : null
}

/**
 * @returns {Record<string, unknown> | null}
 */
function getInjectedEnvObject() {
  if (_explicitEnv) {
    return _explicitEnv
  }
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : undefined
    if (g && g.__WEP_ENV__ && typeof g.__WEP_ENV__ === 'object') {
      return g.__WEP_ENV__
    }
  } catch (_) {}
  return null
}

/**
 * 从注入环境读取字符串配置键（`VITE_*` / `PLUGIN_*` 等）。
 * @param {string} key
 * @returns {string|undefined}
 */
export function readInjectedEnvKey(key) {
  const o = getInjectedEnvObject()
  if (!o || !(key in o)) {
    return undefined
  }
  const v = o[key]
  if (v === undefined || v === '') {
    return undefined
  }
  return String(v)
}

/**
 * @returns {boolean}
 */
export function readInjectedEnvDev() {
  const o = getInjectedEnvObject()
  return !!(o && o.DEV === true)
}
