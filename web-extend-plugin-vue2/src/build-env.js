/**
 * 与具体打包器解耦的运行时环境读取：优先显式注入，其次 `globalThis.__WEP_ENV__`，再读 `process.env`。
 * Vite 宿主建议在入口调用 `setWebExtendPluginEnv(import.meta.env)`。
 */

/** @type {Record<string, unknown> | null} */
let _injected = null

/**
 * 注入与 `import.meta.env` 同形态的对象（键如 `VITE_*`、`DEV`）。
 * @param {Record<string, unknown> | null | undefined} env
 */
export function setWebExtendPluginEnv(env) {
  _injected = env && typeof env === 'object' ? env : null
}

/**
 * @returns {Record<string, unknown> | null}
 */
function getEnvObject() {
  if (_injected) {
    return _injected
  }
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : undefined
    if (g && g.__WEP_ENV__ && typeof g.__WEP_ENV__ === 'object') {
      return g.__WEP_ENV__
    }
  } catch (_) {
    /* ignore */
  }
  return null
}

/**
 * 读取注入环境中的字符串配置（`VITE_*` / `PLUGIN_*` 等价键由调用方传入）。
 * @param {string} key
 * @returns {string|undefined}
 */
export function readInjectedEnvKey(key) {
  const o = getEnvObject()
  if (!o || !(key in o)) {
    return undefined
  }
  const v = o[key]
  if (v === undefined || v === '') {
    return undefined
  }
  return String(v)
}

/** @returns {boolean} */
export function readInjectedEnvDev() {
  const o = getEnvObject()
  return !!(o && o.DEV === true)
}
