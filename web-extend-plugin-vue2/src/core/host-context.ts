/**
 * 宿主通过 `resolveRuntimeOptions({ hostContext })` 注入的只读上下文，
 * 经浅拷贝 + 浅冻结后挂到 `hostApi.hostContext`，供插件访问 store/i18n 等而不污染 HostApi 顶层命名。
 */
import type { HostCapabilities } from './host-component-registry'
import { normalizeHostCapabilities } from './host-component-registry'

export type HostContext = Readonly<
  Record<string, unknown> & {
    capabilities?: HostCapabilities
  }
>

export function freezeShallowHostContext(
  input: unknown,
  explicitCapabilities?: HostCapabilities | Record<string, unknown>
): HostContext {
  const base =
    input != null && typeof input === 'object' && !Array.isArray(input)
      ? { ...(input as Record<string, unknown>) }
      : {}

  const mergedCapabilities = normalizeHostCapabilities(
    explicitCapabilities !== undefined ? explicitCapabilities : base.capabilities
  )

  if (mergedCapabilities) {
    base.capabilities = mergedCapabilities
  }

  return Object.freeze(base)
}
