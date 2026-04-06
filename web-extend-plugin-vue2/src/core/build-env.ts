/**
 * 与具体打包器解耦的运行时环境读取：优先显式注入，其次 `globalThis.__WEP_ENV__`，再读 `process.env`。
 * Vite 宿主建议在入口调用 `setWebExtendPluginEnv(import.meta.env)`。
 */

let _injected: Record<string, unknown> | null = null

/**
 * 注入与 `import.meta.env` 同形态的对象（键如 `VITE_*`、`DEV`）。
 */
export function setWebExtendPluginEnv(env: Record<string, unknown> | null | undefined) {
  _injected = env && typeof env === 'object' ? env : null
}

function getEnvObject(): Record<string, unknown> | null {
  if (_injected) {
    return _injected
  }
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : undefined
    const raw = g as unknown as { __WEP_ENV__?: unknown } | undefined
    if (raw && raw.__WEP_ENV__ && typeof raw.__WEP_ENV__ === 'object') {
      return raw.__WEP_ENV__ as Record<string, unknown>
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * 读取注入环境中的字符串配置（`VITE_*` / `PLUGIN_*` 等价键由调用方传入）。
 */
export function readInjectedEnvKey(key: string): string | undefined {
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

export function readInjectedEnvDev(): boolean {
  const o = getEnvObject()
  return !!(o && o.DEV === true)
}
