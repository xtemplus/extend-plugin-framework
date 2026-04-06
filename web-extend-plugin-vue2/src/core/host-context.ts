/**
 * 宿主通过 `resolveRuntimeOptions({ hostContext })` 注入的只读上下文，
 * 经浅拷贝 + 浅冻结后挂到 `hostApi.hostContext`，供插件访问 store/i18n 等而不污染 HostApi 顶层命名。
 */
export function freezeShallowHostContext(input: unknown): Readonly<Record<string, unknown>> {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return Object.freeze({})
  }
  return Object.freeze({ ...(input as Record<string, unknown>) })
}
