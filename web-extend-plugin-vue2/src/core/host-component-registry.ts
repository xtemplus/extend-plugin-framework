export type HostExposeMeta = {
  title?: string
  description?: string
}

export type HostComponentMeta = HostExposeMeta

export type HostComponentEntry = HostComponentMeta & {
  component: unknown
}

export type HostComponentRegistry =
  | Record<string, unknown | HostComponentEntry>
  | Array<(HostComponentEntry & { name: string })>

export type HostModuleMeta = HostExposeMeta

export type HostModuleEntry = HostModuleMeta & {
  module: unknown
}

export type HostModuleRegistry =
  | Record<string, unknown | HostModuleEntry>
  | Array<(HostModuleEntry & { name: string })>

export type RegisterVueGlobalComponentsOptions = {
  source?: Record<string, unknown>
  include?: (name: string, component: unknown) => boolean
  mapName?: (name: string, component: unknown) => string | null | undefined
  meta?: HostComponentMeta | ((name: string, component: unknown) => HostComponentMeta | undefined)
}

export type HostUiCapability = {
  framework?: string
  componentLibrary?: string
}

export type HostCapabilities = Readonly<
  Record<string, unknown> & {
    ui?: HostUiCapability
    modules?: Readonly<Record<string, HostModuleMeta>>
    components?: Readonly<Record<string, HostComponentMeta>>
  }
>

type InternalExposeRecord<TMeta extends HostExposeMeta> = {
  value: unknown
  meta: TMeta
}

const hostComponentsRegistry: Record<string, InternalExposeRecord<HostComponentMeta>> = Object.create(null)
const hostModulesRegistry: Record<string, InternalExposeRecord<HostModuleMeta>> = Object.create(null)

function normalizeExposeMeta<TMeta extends HostExposeMeta>(raw: Record<string, unknown>): TMeta {
  const meta: HostExposeMeta = {}
  if (typeof raw.title === 'string' && raw.title.trim()) {
    meta.title = raw.title.trim()
  }
  if (typeof raw.description === 'string' && raw.description.trim()) {
    meta.description = raw.description.trim()
  }
  return meta as TMeta
}

function normalizeHostComponentEntry(entry: unknown): HostComponentEntry | null {
  if (!entry) {
    return null
  }
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    const record = entry as Record<string, unknown>
    if ('component' in record) {
      return {
        component: record.component,
        ...normalizeExposeMeta<HostComponentMeta>(record)
      }
    }
  }
  return { component: entry }
}

function normalizeHostModuleEntry(entry: unknown): HostModuleEntry | null {
  if (!entry) {
    return null
  }
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    const record = entry as Record<string, unknown>
    if ('module' in record) {
      return {
        module: record.module,
        ...normalizeExposeMeta<HostModuleMeta>(record)
      }
    }
  }
  return { module: entry }
}

function normalizeNamedEntries<TEntry>(
  input: Record<string, unknown> | Array<TEntry & { name: string }>,
  normalizeEntry: (entry: unknown) => TEntry | null
): Array<{ name: string; entry: TEntry }> {
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        const name = typeof item.name === 'string' ? item.name.trim() : ''
        const entry = normalizeEntry(item)
        if (!name || !entry) {
          return null
        }
        return { name, entry }
      })
      .filter(Boolean) as Array<{ name: string; entry: TEntry }>
  }

  return Object.entries(input || {})
    .map(([rawName, rawEntry]) => {
      const name = String(rawName).trim()
      const entry = normalizeEntry(rawEntry)
      if (!name || !entry) {
        return null
      }
      return { name, entry }
    })
    .filter(Boolean) as Array<{ name: string; entry: TEntry }>
}

function cloneMetaMap<TMeta extends HostExposeMeta>(
  registry: Record<string, InternalExposeRecord<TMeta>>
): Readonly<Record<string, TMeta>> {
  const out: Record<string, TMeta> = {}
  for (const [name, entry] of Object.entries(registry)) {
    out[name] = { ...entry.meta }
  }
  return out
}

function resolveVueGlobalComponentSource(VueRuntime: unknown): Record<string, unknown> | undefined {
  if (!VueRuntime || typeof VueRuntime !== 'object' || Array.isArray(VueRuntime)) {
    return undefined
  }
  const maybeOptions = (VueRuntime as Record<string, unknown>).options
  if (!maybeOptions || typeof maybeOptions !== 'object' || Array.isArray(maybeOptions)) {
    return undefined
  }
  const maybeComponents = (maybeOptions as Record<string, unknown>).components
  return maybeComponents && typeof maybeComponents === 'object' && !Array.isArray(maybeComponents)
    ? (maybeComponents as Record<string, unknown>)
    : undefined
}

function resolveHostComponentMeta(
  metaInput: RegisterVueGlobalComponentsOptions['meta'],
  name: string,
  component: unknown
): HostComponentMeta {
  const raw = typeof metaInput === 'function' ? metaInput(name, component) : metaInput
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? normalizeExposeMeta<HostComponentMeta>(raw as Record<string, unknown>)
    : {}
}

export function registerHostComponents(input: HostComponentRegistry): Readonly<Record<string, HostComponentMeta>> {
  const entries = normalizeNamedEntries(input, normalizeHostComponentEntry)
  for (const { name, entry } of entries) {
    hostComponentsRegistry[name] = {
      value: entry.component,
      meta: normalizeExposeMeta<HostComponentMeta>(entry as Record<string, unknown>)
    }
  }
  return getAllHostComponentMeta()
}

export function registerHostModules(input: HostModuleRegistry): Readonly<Record<string, HostModuleMeta>> {
  const entries = normalizeNamedEntries(input, normalizeHostModuleEntry)
  for (const { name, entry } of entries) {
    hostModulesRegistry[name] = {
      value: entry.module,
      meta: normalizeExposeMeta<HostModuleMeta>(entry as Record<string, unknown>)
    }
  }
  return getAllHostModuleMeta()
}

export function registerVueGlobalComponents(
  VueRuntime: unknown,
  options: RegisterVueGlobalComponentsOptions = {}
): Readonly<Record<string, HostComponentMeta>> {
  const source =
    options.source && typeof options.source === 'object' && !Array.isArray(options.source)
      ? options.source
      : resolveVueGlobalComponentSource(VueRuntime)

  if (!source) {
    return getAllHostComponentMeta()
  }

  const registry: Record<string, HostComponentEntry> = {}
  for (const [rawName, component] of Object.entries(source)) {
    const sourceName = String(rawName).trim()
    if (!sourceName || component == null) {
      continue
    }
    if (typeof options.include === 'function' && !options.include(sourceName, component)) {
      continue
    }

    const mappedName =
      typeof options.mapName === 'function' ? options.mapName(sourceName, component) : sourceName
    const exposeName = typeof mappedName === 'string' ? mappedName.trim() : ''
    if (!exposeName) {
      continue
    }

    registry[exposeName] = {
      component,
      ...resolveHostComponentMeta(options.meta, sourceName, component)
    }
  }

  return registerHostComponents(registry)
}

export function getHostComponent(name: string): unknown {
  const key = typeof name === 'string' ? name.trim() : ''
  if (!key) {
    return undefined
  }
  const record = hostComponentsRegistry[key]
  return record ? record.value : undefined
}

export function getHostModule(name: string): unknown {
  const key = typeof name === 'string' ? name.trim() : ''
  if (!key) {
    return undefined
  }
  const record = hostModulesRegistry[key]
  return record ? record.value : undefined
}

export function getHostComponentMeta(name: string): HostComponentMeta | undefined {
  const key = typeof name === 'string' ? name.trim() : ''
  const record = key ? hostComponentsRegistry[key] : undefined
  const meta = record ? record.meta : undefined
  return meta ? { ...meta } : undefined
}

export function getHostModuleMeta(name: string): HostModuleMeta | undefined {
  const key = typeof name === 'string' ? name.trim() : ''
  const record = key ? hostModulesRegistry[key] : undefined
  const meta = record ? record.meta : undefined
  return meta ? { ...meta } : undefined
}

export function getAllHostComponentMeta(): Readonly<Record<string, HostComponentMeta>> {
  return cloneMetaMap(hostComponentsRegistry)
}

export function getAllHostModuleMeta(): Readonly<Record<string, HostModuleMeta>> {
  return cloneMetaMap(hostModulesRegistry)
}

export function normalizeHostCapabilities(input: unknown): HostCapabilities | undefined {
  const moduleMeta = getAllHostModuleMeta()
  const componentMeta = getAllHostComponentMeta()

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const fallback: Record<string, unknown> = {}
    if (Object.keys(moduleMeta).length > 0) {
      fallback.modules = moduleMeta
    }
    if (Object.keys(componentMeta).length > 0) {
      fallback.components = componentMeta
    }
    return Object.keys(fallback).length > 0 ? (Object.freeze(fallback) as HostCapabilities) : undefined
  }

  const raw = input as Record<string, unknown>
  const normalized: Record<string, unknown> = { ...raw }

  if (raw.ui && typeof raw.ui === 'object' && !Array.isArray(raw.ui)) {
    const uiRaw = raw.ui as Record<string, unknown>
    const ui: HostUiCapability = {}
    if (typeof uiRaw.framework === 'string' && uiRaw.framework.trim()) {
      ui.framework = uiRaw.framework.trim()
    }
    if (typeof uiRaw.componentLibrary === 'string' && uiRaw.componentLibrary.trim()) {
      ui.componentLibrary = uiRaw.componentLibrary.trim()
    }
    normalized.ui = ui
  }

  const mergedModules: Record<string, HostModuleMeta> = { ...moduleMeta }
  if (raw.modules && typeof raw.modules === 'object' && !Array.isArray(raw.modules)) {
    for (const [name, meta] of Object.entries(raw.modules as Record<string, unknown>)) {
      if (!name.trim()) {
        continue
      }
      mergedModules[name.trim()] =
        meta && typeof meta === 'object' && !Array.isArray(meta)
          ? {
              ...(mergedModules[name.trim()] || {}),
              ...normalizeExposeMeta<HostModuleMeta>(meta as Record<string, unknown>)
            }
          : { ...(mergedModules[name.trim()] || {}) }
    }
  }

  const mergedComponents: Record<string, HostComponentMeta> = { ...componentMeta }
  if (raw.components && typeof raw.components === 'object' && !Array.isArray(raw.components)) {
    for (const [name, meta] of Object.entries(raw.components as Record<string, unknown>)) {
      if (!name.trim()) {
        continue
      }
      mergedComponents[name.trim()] =
        meta && typeof meta === 'object' && !Array.isArray(meta)
          ? {
              ...(mergedComponents[name.trim()] || {}),
              ...normalizeExposeMeta<HostComponentMeta>(meta as Record<string, unknown>)
            }
          : { ...(mergedComponents[name.trim()] || {}) }
    }
  }

  if (Object.keys(mergedModules).length > 0) {
    normalized.modules = mergedModules
  }
  if (Object.keys(mergedComponents).length > 0) {
    normalized.components = mergedComponents
  }

  return Object.freeze(normalized) as HostCapabilities
}
