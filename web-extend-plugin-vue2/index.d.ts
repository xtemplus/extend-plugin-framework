export type RouteDeclaration = {
  path: string
  name?: string
  title?: string
  meta?: Record<string, unknown>
  children?: RouteDeclaration[]
  componentRef: string
}

export type VueRouteConfig = Record<string, unknown>

export type PluginRouteSnapshot = {
  path?: string
  name?: string | symbol
  meta?: Record<string, unknown>
  children?: PluginRouteSnapshot[]
  [key: string]: unknown
}

export type TransformRoutesFn = (ctx: {
  pluginId: string
  router: unknown
  routes: ReadonlyArray<VueRouteConfig>
}) => VueRouteConfig[]

export type InterceptRegisterRoutesFn = (ctx: {
  pluginId: string
  router: unknown
  routes: ReadonlyArray<VueRouteConfig>
  applyInternalRegister: (routes: VueRouteConfig[]) => void
}) => void

export type AdaptRouteDeclarationsFn = (ctx: {
  pluginId: string
  router: unknown
  declarations: ReadonlyArray<RouteDeclaration>
}) => VueRouteConfig[]

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

export type HostContext = Readonly<
  Record<string, unknown> & {
    capabilities?: HostCapabilities
  }
>

export type OnBeforePluginActivateFn = (ctx: {
  pluginId: string
  router: unknown
  pluginRecord: Readonly<Record<string, unknown>>
}) => void | Promise<void>

export type OnAfterPluginActivateFn = (ctx: {
  pluginId: string
  router: unknown
  pluginRecord: Readonly<Record<string, unknown>>
  hostApi: unknown
}) => void | Promise<void>

export type OnPluginActivateErrorFn = (ctx: {
  pluginId: string
  error: unknown
  pluginRecord: Readonly<Record<string, unknown>>
  hostApi: unknown
}) => void | Promise<void>

export type OnPluginRoutesContributedFn = (ctx: {
  pluginId: string
  router: unknown
  routes: ReadonlyArray<VueRouteConfig>
  contributedRoutes: ReadonlyArray<PluginRouteSnapshot>
}) => void | Promise<void>

export type HostKitOptions = {
  bridgeAllowedPathPrefixes?: string[]
  pluginRoutesParentName?: string
  transformRoutes?: TransformRoutesFn
  interceptRegisterRoutes?: InterceptRegisterRoutesFn
  adaptRouteDeclarations?: AdaptRouteDeclarationsFn
  onPluginRoutesContributed?: OnPluginRoutesContributedFn
  hostContext?: HostContext
}

export type PluginManifestHostCapabilities = Readonly<
  Record<string, unknown> & {
    modules?: string[]
    components?: string[]
    ui?: Record<string, unknown>
  }
>

export type WebExtendPluginManifestRecord = Readonly<
  Record<string, unknown> & {
    id: string
    priority?: unknown
    entryUrl?: string
    engines?: { host?: string }
    hostCapabilities?: PluginManifestHostCapabilities
  }
>

export type WebExtendPluginRuntimeOptions = HostKitOptions &
  Record<string, unknown> & {
    manifestBase?: string
    manifestListPath?: string
    manifestMode?: 'api' | 'static'
    staticManifestUrl?: string
    devManifestFallback?: boolean
    devFallbackStaticManifestUrl?: string
    manifestFetchCredentials?: RequestCredentials
    hostLayoutComponent?: unknown
    pluginMountPath?: string
    pluginHostRouteMeta?: Record<string, unknown>
    ensurePluginHostRoute?: boolean
    isDev?: boolean
    webPluginDevOrigin?: string
    webPluginDevIds?: string
    webPluginDevMapJson?: string
    webPluginDevEntryPath?: string
    devPingPath?: string
    devReloadSsePath?: string
    devPingTimeoutMs?: number
    defaultImplicitDevPluginIds?: string[]
    allowedScriptHosts?: string[]
    bootstrapSummary?: boolean
    fetchManifest?: ManifestFetchFn
    hostContext?: Record<string, unknown>
    hostCapabilities?: HostCapabilities
    onBeforePluginActivate?: OnBeforePluginActivateFn
    onAfterPluginActivate?: OnAfterPluginActivateFn
    onPluginActivateError?: OnPluginActivateErrorFn
  }

export interface HostApi {
  readonly hostPluginApiVersion: string
  readonly hostContext: HostContext
  registerRoutes(routes: VueRouteConfig[] | RouteDeclaration[]): void
  registerSlotComponents(
    pointId: string,
    components: Array<{ component: unknown; priority?: number }>
  ): void
  registerStylesheetUrls(urls?: string[]): void
  registerScriptUrls(urls?: string[]): void
  registerSanitizedHtmlSnippet(): void
  getContributedRoutes(): PluginRouteSnapshot[]
  getHostModule(name: string): unknown
  getHostModuleMeta(name: string): HostModuleMeta | undefined
  getHostComponent(name: string): unknown
  getHostComponentMeta(name: string): HostComponentMeta | undefined
  getBridge(): {
    request(path: string, init?: RequestInit): Promise<Response>
  }
  onTeardown(_pluginId: string, fn: () => void): void
}

export type ManifestFetchContext = { manifestUrl: string; credentials: RequestCredentials }

export type ManifestFetchResult = {
  ok: boolean
  status?: number
  data?: unknown
  error?: unknown
}

export type ManifestFetchFn = (ctx: ManifestFetchContext) => Promise<ManifestFetchResult>

export type ManifestFetchCacheOptions = {
  ttlMs?: number
  storage?: 'memory' | 'session' | 'local'
  storageKeyPrefix?: string
  cacheKey?: (ctx: ManifestFetchContext) => string
  shouldCache?: (result: ManifestFetchResult) => boolean
  maxEntries?: number
  now?: () => number
}

export function getRegisteredTopRouteNamesForPlugin(pluginId: string): string[]
export function getContributedRoutesForPlugin(pluginId: string): PluginRouteSnapshot[]

export const defaultWebExtendPluginRuntime: Record<string, unknown>
export const webExtendPluginEnvKeys: Readonly<Record<string, string>>
export const defaultManifestFetchCache: Readonly<{ storageKeyPrefix: string; maxEntries: number }>
export const defaultManifestMode: 'api'
export const routeSynthNamePrefix: string
export const peerMinimumVersions: Readonly<{ vue: string; vueRouter: string }>

export function bootstrapPlugins(
  router: unknown,
  createHostApiFactory: (id: string, r: unknown, kit?: HostKitOptions) => HostApi,
  runtimeOptions?: WebExtendPluginRuntimeOptions
): Promise<void>

export function resolveRuntimeOptions(user?: WebExtendPluginRuntimeOptions): WebExtendPluginRuntimeOptions

export function ensurePluginHostRoute(router: unknown, opts: WebExtendPluginRuntimeOptions): void
export function getActivatedPluginIds(): string[]

export function defaultFetchWebPluginManifest(ctx: {
  manifestUrl: string
  credentials: RequestCredentials
}): Promise<{ ok: boolean; status?: number; data?: unknown; error?: unknown }>

export function createHostApi(pluginId: string, router: unknown, hostKit?: HostKitOptions): HostApi

export function disposeWebPlugin(pluginId: string): void
export const registries: unknown
export function registerHostModules(input: HostModuleRegistry): Readonly<Record<string, HostModuleMeta>>
export function registerHostComponents(input: HostComponentRegistry): Readonly<Record<string, HostComponentMeta>>
export function registerVueGlobalComponents(
  VueRuntime: unknown,
  options?: RegisterVueGlobalComponentsOptions
): Readonly<Record<string, HostComponentMeta>>
export function getHostModule(name: string): unknown
export function getHostModuleMeta(name: string): HostModuleMeta | undefined
export function getAllHostModuleMeta(): Readonly<Record<string, HostModuleMeta>>
export function getHostComponent(name: string): unknown
export function getHostComponentMeta(name: string): HostComponentMeta | undefined
export function getAllHostComponentMeta(): Readonly<Record<string, HostComponentMeta>>

export function createRequestBridge(config?: {
  allowedPathPrefixes?: string[]
}): { request: (path: string, init?: RequestInit) => Promise<Response> }

export const HOST_PLUGIN_API_VERSION: string
export const RUNTIME_CONSOLE_LABEL: string
export function setWebExtendPluginEnv(env: Record<string, unknown> | null | undefined): void

export function installWebExtendPluginVue2(
  Vue: unknown,
  router: unknown,
  options?: WebExtendPluginRuntimeOptions
): Promise<void>

export const ExtensionPoint: unknown

export function createVueCliAxiosInstallOptions(
  deps: { request: (config: Record<string, unknown>) => Promise<unknown> },
  extra?: Record<string, unknown>
): Record<string, unknown>

export function composeManifestFetch(
  inner: ManifestFetchFn,
  ...middlewares: Array<(next: ManifestFetchFn) => ManifestFetchFn>
): ManifestFetchFn

export function manifestFetchCacheMiddleware(
  options?: ManifestFetchCacheOptions
): (next: ManifestFetchFn) => ManifestFetchFn

export function wrapManifestFetchWithCache(
  inner: ManifestFetchFn,
  options?: ManifestFetchCacheOptions
): ManifestFetchFn
