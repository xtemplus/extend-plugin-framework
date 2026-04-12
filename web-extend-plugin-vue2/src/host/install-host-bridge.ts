type HostBridgeComponentEntry = {
  component: unknown
}

export type HostBridgeOptions = {
  modules?: Record<string, unknown>
  components?: Record<string, unknown | HostBridgeComponentEntry>
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input)
}

function normalizeComponent(entry: unknown): unknown {
  if (isRecord(entry) && 'component' in entry) {
    return entry.component
  }
  return entry
}

function toComponentAlias(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function installHostBridge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VueRuntime: any,
  options: HostBridgeOptions = {}
): Readonly<Record<string, unknown>> {
  if (!VueRuntime || typeof VueRuntime.component !== 'function' || !VueRuntime.prototype) {
    throw new Error('[wep] installHostBridge requires a Vue 2 runtime constructor')
  }

  const modules =
    options.modules && isRecord(options.modules) ? Object.freeze({ ...options.modules }) : Object.freeze({})

  VueRuntime.prototype.$host = modules

  const componentEntries =
    options.components && isRecord(options.components) ? Object.entries(options.components) : []

  for (const [rawName, rawEntry] of componentEntries) {
    const alias = toComponentAlias(String(rawName))
    const component = normalizeComponent(rawEntry)
    if (!alias || component == null) {
      continue
    }
    VueRuntime.component(alias, component)
  }

  return modules
}
