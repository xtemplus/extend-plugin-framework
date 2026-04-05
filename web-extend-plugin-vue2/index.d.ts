/**
 * 稳定对外 API 的 TypeScript 声明（宿主需自行安装 vue / vue-router 类型时可再收紧 any）。
 */

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

export const WebExtendPluginVue2: Readonly<{
  install: (Vue: unknown, router: unknown, options?: Record<string, unknown>) => Promise<void>
  runtime: Readonly<{
    bootstrapPlugins: (
      router: unknown,
      createHostApiFactory: (id: string, r: unknown, kit?: unknown) => unknown,
      runtimeOptions?: Record<string, unknown>
    ) => Promise<void>
    resolveRuntimeOptions: (user?: Record<string, unknown>) => Record<string, unknown>
    defaultFetchWebPluginManifest: (ctx: {
      manifestUrl: string
      credentials: RequestCredentials
    }) => Promise<{ ok: boolean; status?: number; data?: unknown; error?: unknown }>
    composeManifestFetch: (
      inner: ManifestFetchFn,
      ...middlewares: Array<(next: ManifestFetchFn) => ManifestFetchFn>
    ) => ManifestFetchFn
    manifestFetchCacheMiddleware: (options?: ManifestFetchCacheOptions) => (next: ManifestFetchFn) => ManifestFetchFn
    wrapManifestFetchWithCache: (inner: ManifestFetchFn, options?: ManifestFetchCacheOptions) => ManifestFetchFn
  }>
  host: Readonly<{
    createHostApi: (pluginId: string, router: unknown, hostKit?: unknown) => unknown
    disposeWebPlugin: (pluginId: string) => void
    createRequestBridge: (config?: { allowedPathPrefixes?: string[] }) => {
      request: (path: string, init?: RequestInit) => Promise<Response>
    }
    registries: unknown
  }>
  config: Readonly<{
    defaultWebExtendPluginRuntime: Record<string, unknown>
    setWebExtendPluginEnv: (env: Record<string, unknown> | null | undefined) => void
  }>
  constants: Readonly<{ HOST_PLUGIN_API_VERSION: string }>
  components: Readonly<{ ExtensionPoint: unknown }>
  presets: Readonly<{
    vueCliAxios: Readonly<{
      id: string
      description: string
      createInstallOptions: (
        deps: { request: (config: Record<string, unknown>) => Promise<unknown> },
        extra?: Record<string, unknown>
      ) => Record<string, unknown>
      manifestPathForApiBase: (manifestUrl: string, apiBase?: string) => string
      unwrapManifestBody: (body: unknown) => object | null
    }>
  }>
}>

export const defaultWebExtendPluginRuntime: Record<string, unknown>
export function bootstrapPlugins(
  router: unknown,
  createHostApiFactory: (id: string, r: unknown, kit?: unknown) => unknown,
  runtimeOptions?: Record<string, unknown>
): Promise<void>
export function resolveRuntimeOptions(user?: Record<string, unknown>): Record<string, unknown>
export function defaultFetchWebPluginManifest(ctx: {
  manifestUrl: string
  credentials: RequestCredentials
}): Promise<{ ok: boolean; status?: number; data?: unknown; error?: unknown }>
export function createHostApi(pluginId: string, router: unknown, hostKit?: unknown): unknown
export function disposeWebPlugin(pluginId: string): void
export const registries: unknown
export function createRequestBridge(config?: {
  allowedPathPrefixes?: string[]
}): { request: (path: string, init?: RequestInit) => Promise<Response> }
export const HOST_PLUGIN_API_VERSION: string
export function setWebExtendPluginEnv(env: Record<string, unknown> | null | undefined): void
export function installWebExtendPluginVue2(
  Vue: unknown,
  router: unknown,
  options?: Record<string, unknown>
): Promise<void>
export const ExtensionPoint: unknown

export function createVueCliAxiosInstallOptions(
  deps: { request: (config: Record<string, unknown>) => Promise<unknown> },
  extra?: Record<string, unknown>
): Record<string, unknown>
export function manifestPathForVueCliApiBase(manifestUrl: string, apiBase?: string): string
export function unwrapTableStyleManifestBody(body: unknown): object | null
export const presetVueCliAxios: Readonly<{
  id: string
  description: string
  createInstallOptions: typeof createVueCliAxiosInstallOptions
  manifestPathForApiBase: typeof manifestPathForVueCliApiBase
  unwrapManifestBody: typeof unwrapTableStyleManifestBody
}>

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
