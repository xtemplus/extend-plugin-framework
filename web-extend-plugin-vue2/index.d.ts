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

/** Host bridge config exposed to plugins. */
export type HostBridgeOptions = {
  /** Host modules exposed on `this.$host`. */
  modules?: Record<string, unknown>
  /** Host components auto-registered as global aliases. */
  components?: Record<string, unknown | { component: unknown }>
}

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

/** Host-side injections consumed by `createHostApi()`. */
export type HostKitOptions = {
  /** Backend path prefixes allowed by the request bridge. */
  bridgeAllowedPathPrefixes?: string[]
  /** Parent route name used when mounting plugin child routes. */
  pluginRoutesParentName?: string
  /** Route transform hook before registration. */
  transformRoutes?: TransformRoutesFn
  /** Intercepts the default route registration flow. */
  interceptRegisterRoutes?: InterceptRegisterRoutesFn
  /** Converts declaration-style routes into Vue Router configs. */
  adaptRouteDeclarations?: AdaptRouteDeclarationsFn
  /** Called after plugin routes are contributed. */
  onPluginRoutesContributed?: OnPluginRoutesContributedFn
  /** Readonly host context passed to plugins. */
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

export type RuntimeManifestOptions = {
  /** Manifest source mode. */
  source?: 'api' | 'static'
  /** API-mode manifest service base path. */
  baseUrl?: string
  /** API-mode manifest path. */
  listPath?: string
  /** Manifest URL in static mode. */
  staticUrl?: string
  /** Fetch credentials used for manifest loading. */
  credentials?: RequestCredentials
  /** Optional manifest fetch override. */
  fetch?: ManifestFetchFn
}

export type RuntimeHostRouteOptions = {
  /** Enables auto-registration of the plugin host route. */
  enabled?: boolean
  /** Host layout component used by the plugin shell route. */
  layout?: unknown
  /** Shared mount path for plugin pages. */
  mountPath?: string
  /** Parent route name used for plugin child routes. */
  parentName?: string
  /** Meta assigned to the auto-created plugin host route. */
  meta?: Record<string, unknown>
}

export type RuntimeHostOptions = HostKitOptions & {
  /** Host modules/components auto-installed into the Vue runtime. */
  bridge?: HostBridgeOptions
  /** Host context passed to plugins. */
  context?: Record<string, unknown>
  /** Host capability metadata passed to plugins. */
  capabilities?: HostCapabilities
  /** Allowed hosts for remote plugin scripts. */
  scriptHosts?: string[]
  /** Allowed backend path prefixes for the request bridge. */
  requestPathPrefixes?: string[]
  /** Plugin host route configuration. */
  route?: RuntimeHostRouteOptions
}

export type RuntimeDevManifestFallbackOptions = {
  /** Enables manifest fallback in development mode. */
  enabled?: boolean
  /** Static manifest URL used by the development fallback. */
  staticUrl?: string
}

export type RuntimeDevOptions = {
  /** Explicitly marks runtime as development mode. */
  enabled?: boolean
  /** Local plugin dev server origin. */
  origin?: string
  /** Plugin ids using the local dev entry. */
  pluginIds?: string[] | string
  /** Explicit plugin id -> dev entry mapping. */
  pluginMap?: Record<string, string> | string
  /** Entry path used by implicit dev mode. */
  entryPath?: string
  /** Ping path used to detect the dev server. */
  pingPath?: string
  /** SSE path used for dev reload notifications. */
  reloadSsePath?: string
  /** Ping timeout in milliseconds. */
  pingTimeoutMs?: number
  /** Development manifest fallback config. */
  manifestFallback?: RuntimeDevManifestFallbackOptions
  /** Whether to print bootstrap summary logs. */
  bootstrapSummary?: boolean
}

export type RuntimeHooksOptions = {
  /** Route transform hook before registration. */
  transformRoutes?: TransformRoutesFn
  /** Intercepts the default route registration flow. */
  interceptRegisterRoutes?: InterceptRegisterRoutesFn
  /** Converts declaration-style routes into Vue Router configs. */
  adaptRouteDeclarations?: AdaptRouteDeclarationsFn
  /** Called after plugin routes are contributed. */
  onRoutesContributed?: OnPluginRoutesContributedFn
  /** Hook called before plugin activation. */
  beforeActivate?: OnBeforePluginActivateFn
  /** Hook called after plugin activation. */
  afterActivate?: OnAfterPluginActivateFn
  /** Hook called when plugin activation fails. */
  onActivateError?: OnPluginActivateErrorFn
}

export type WebExtendPluginRuntimeOptions = {
  manifest?: RuntimeManifestOptions
  host?: RuntimeHostOptions
  dev?: RuntimeDevOptions
  hooks?: RuntimeHooksOptions
}

export type ResolvedWebExtendPluginRuntimeOptions = Record<string, unknown> & {
  manifestBase: string
  manifestListPath: string
  manifestMode: 'api' | 'static'
  staticManifestUrl: string
  devManifestFallback: boolean
  devFallbackStaticManifestUrl: string
  manifestFetchCredentials: RequestCredentials
  isDev: boolean
  webPluginDevOrigin: string
  webPluginDevIds: string[]
  webPluginDevMapJson: string
  webPluginDevEntryPath: string
  devPingPath: string
  devReloadSsePath: string
  devPingTimeoutMs: number
  defaultImplicitDevPluginIds: string[]
  allowedScriptHosts: string[]
  bridgeAllowedPathPrefixes: string[]
  bootstrapSummary?: boolean
  hostLayoutComponent?: unknown
  pluginMountPath: string
  pluginHostRouteMeta?: Record<string, unknown>
  ensurePluginHostRoute: boolean
  pluginRoutesParentName: string
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

/** Manifest fetch cache options. */
export type ManifestFetchCacheOptions = {
  /** Cache lifetime in milliseconds. */
  ttlMs?: number
  /** Cache storage backend. */
  storage?: 'memory' | 'session' | 'local'
  /** Key prefix when using Web Storage. */
  storageKeyPrefix?: string
  /** Custom cache key builder. */
  cacheKey?: (ctx: ManifestFetchContext) => string
  /** Controls which results may be cached. */
  shouldCache?: (result: ManifestFetchResult) => boolean
  /** Max number of in-memory cache entries. */
  maxEntries?: number
  /** Custom clock, usually for tests. */
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

export function resolveRuntimeOptions(user?: WebExtendPluginRuntimeOptions): ResolvedWebExtendPluginRuntimeOptions

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

export function installHostBridge(
  Vue: unknown,
  options?: HostBridgeOptions
): Readonly<Record<string, unknown>>

export const ExtensionPoint: unknown

export function createVueCliAxiosInstallOptions(
  deps: { request: (config: Record<string, unknown>) => Promise<unknown> },
  extra?: WebExtendPluginRuntimeOptions
): WebExtendPluginRuntimeOptions

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
