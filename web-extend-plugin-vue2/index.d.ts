/**
 * 公共 API 的 TypeScript 声明；IDE 补全以本文件为准。
 */

/** 清单侧路由声明（PRD），需配合 `adaptRouteDeclarations` */
export type RouteDeclaration = {
  path: string
  name?: string
  title?: string
  meta?: Record<string, unknown>
  children?: RouteDeclaration[]
  /** 由宿主在 `adaptRouteDeclarations` 中解析为 Vue 组件 */
  componentRef: string
}

/** `bootstrapPlugins` 调用 `activator` 时的第二参数 */
export type PluginActivateContext = {
  /** 清单条目的浅拷贝且已 `Object.freeze`，请勿就地修改嵌套对象 */
  pluginRecord: Readonly<Record<string, unknown>>
}

/**
 * 与 `vue-router` RouteConfig 兼容的宽松对象形态（未安装 vue 类型时仍可用）。
 * 安装 `vue` / `vue-router` 类型后可在业务代码中收窄。
 */
export type VueRouteConfig = Record<string, unknown>

/** 在合成 `name` / `meta.pluginId` 之前转换插件提交的 `RouteConfig` */
export type TransformRoutesFn = (ctx: {
  pluginId: string
  router: unknown
  routes: ReadonlyArray<VueRouteConfig>
}) => VueRouteConfig[]

/** 接管路由注册；由宿主决定是否调用 `applyInternalRegister` */
export type InterceptRegisterRoutesFn = (ctx: {
  pluginId: string
  router: unknown
  routes: ReadonlyArray<VueRouteConfig>
  /** 与默认 `registerRoutes` 相同的包装 + `router.addRoute` */
  applyInternalRegister: (routes: VueRouteConfig[]) => void
}) => void

/** PRD → `RouteConfig` */
export type AdaptRouteDeclarationsFn = (ctx: {
  pluginId: string
  router: unknown
  declarations: ReadonlyArray<RouteDeclaration>
}) => VueRouteConfig[]

/** 将插件 `registerMenuItems` 提交的数据并入宿主用于渲染侧栏/目录的 state（映射规则由宿主实现） */
export type ApplyPluginMenuItemsFn = (ctx: {
  pluginId: string
  /** 已在各条上附带 `pluginId`，并按 `order` 升序 */
  items: Array<Record<string, unknown>>
}) => void

/** 卸载插件时移除该插件贡献的菜单数据 */
export type RevokePluginMenuItemsFn = (pluginId: string) => void

/** 宿主在 `resolveRuntimeOptions({ hostContext })` 中注入；经浅冻结后由 `hostApi.hostContext` 只读暴露 */
export type HostContext = Readonly<Record<string, unknown>>

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

/** 宿主传入 `createHostApi` 的 `hostKit`（及 `resolveRuntimeOptions` 中同类字段） */
/** {@link createVueCliAxiosQuickInstallOptions} / {@link installVueCliAxiosWebPlugins} 的宿主侧依赖 */
export type VueCliAxiosQuickDeps = {
  request: (config: Record<string, unknown>) => Promise<unknown>
  hostLayoutComponent: unknown
  store?: unknown
  hostContext?: Record<string, unknown>
  applyPluginMenuItems?: (ctx: { pluginId: string; items: Array<Record<string, unknown>> }) => void
  revokePluginMenuItems?: (pluginId: string) => void
}

export type HostKitOptions = {
  /** `getBridge().request` 允许的URL路径前缀，须以 `/` 开头 */
  bridgeAllowedPathPrefixes?: string[]
  /** 非空时子路由挂到该命名父路由下（需 vue-router ≥3.5 的 `addRoute`） */
  pluginRoutesParentName?: string
  transformRoutes?: TransformRoutesFn
  interceptRegisterRoutes?: InterceptRegisterRoutesFn
  adaptRouteDeclarations?: AdaptRouteDeclarationsFn
  /** 必填：插件调用 `registerMenuItems` 时由此写入宿主菜单/路由树等数据结构 */
  applyPluginMenuItems?: ApplyPluginMenuItemsFn
  /** 建议与 `applyPluginMenuItems` 成对配置；`disposeWebPlugin` 会调用以撤销该插件菜单 */
  revokePluginMenuItems?: RevokePluginMenuItemsFn
  /** 由引导流程浅冻结后传入各插件的 `hostApi.hostContext` */
  hostContext?: HostContext
}

/** `resolveRuntimeOptions` 全量运行时选项（在默认字段基础上的扩展；未列字段见 README） */
export type WebExtendPluginRuntimeOptions = HostKitOptions &
  Record<string, unknown> & {
    manifestBase?: string
    manifestListPath?: string
    /** 默认 `api`；`static` 时用 `staticManifestUrl` 拉取聚合 JSON，不请求 Java 清单接口 */
    manifestMode?: 'api' | 'static'
    /** 静态清单 URL（绝对或站点内路径），`manifestMode: 'static'` 时必填（或配置环境变量） */
    staticManifestUrl?: string
    /** `manifestMode=api` 且开发环境：API 失败或 `plugins` 为空时是否尝试 `devFallbackStaticManifestUrl`（默认 true） */
    devManifestFallback?: boolean
    /** 开发回退静态清单路径，默认 `/web-plugins/plugins.manifest.json` */
    devFallbackStaticManifestUrl?: string
    manifestFetchCredentials?: RequestCredentials
    /** 宿主 Layout，传入后自动注册 `pluginMountPath` 壳路由 */
    hostLayoutComponent?: unknown
    /** 插件 URL 前缀，默认 `/plugin` */
    pluginMountPath?: string
    /** 壳路由 meta */
    pluginHostRouteMeta?: Record<string, unknown>
    /** 是否执行自动壳路由注册，默认 true */
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
    /** 插件通过 `hostApi.hostContext` 只读访问（浅冻结拷贝）；如 `{ store, i18n }` */
    hostContext?: Record<string, unknown>
    /** 调用 `activator` 之前；抛出异常将跳过该插件并计入失败 */
    onBeforePluginActivate?: OnBeforePluginActivateFn
    /** `activator` 成功返回后 */
    onAfterPluginActivate?: OnAfterPluginActivateFn
    /** `activator` 抛错后；用于埋点/降级，不应再抛错（再抛仅记录 warn） */
    onPluginActivateError?: OnPluginActivateErrorFn
  }

/** 插件 `activator` 收到的宿主 API */
export interface HostApi {
  /** 宿主实现的 Host API 协议版本，与清单 `hostPluginApiVersion` 对齐 */
  readonly hostPluginApiVersion: string
  /** 宿主注入上下文（`resolveRuntimeOptions.hostContext` 的浅冻结快照）；无则 `{}` */
  readonly hostContext: HostContext
  /**
   * 动态注册路由。含 PRD 时使用 `componentRef` 树；否则传入 `RouteConfig` 数组。
   * 流水线：`adaptRouteDeclarations` → `transformRoutes` → `interceptRegisterRoutes` 或默认注册。
   */
  registerRoutes(routes: VueRouteConfig[] | RouteDeclaration[]): void
  /**
   * 向宿主登记侧栏/目录菜单意图；由 `applyPluginMenuItems` 写入宿主 state。
   * 未配置 `applyPluginMenuItems` 时调用会抛错。
   */
  registerMenuItems(items: Record<string, unknown>[]): void
  registerSlotComponents(
    pointId: string,
    components: Array<{ component: unknown; priority?: number }>
  ): void
  registerStylesheetUrls(urls?: string[]): void
  registerScriptUrls(urls?: string[]): void
  registerSanitizedHtmlSnippet(): void
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

/** 命名空间聚合对象，按领域分组 */
export const WebExtendPluginVue2: Readonly<{
  install: (Vue: unknown, router: unknown, options?: WebExtendPluginRuntimeOptions) => Promise<void>
  runtime: Readonly<{
    /** 拉取清单并依次 `activator(hostApi, { pluginRecord })` */
    bootstrapPlugins: (
      router: unknown,
      createHostApiFactory: (id: string, r: unknown, kit?: HostKitOptions) => HostApi,
      runtimeOptions?: WebExtendPluginRuntimeOptions
    ) => Promise<void>
    resolveRuntimeOptions: (user?: WebExtendPluginRuntimeOptions) => WebExtendPluginRuntimeOptions
    ensurePluginHostRoute: (router: unknown, opts: WebExtendPluginRuntimeOptions) => void
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
    createHostApi: (pluginId: string, router: unknown, hostKit?: HostKitOptions) => HostApi
    disposeWebPlugin: (pluginId: string) => void
    createRequestBridge: (config?: { allowedPathPrefixes?: string[] }) => {
      request: (path: string, init?: RequestInit) => Promise<Response>
    }
    registries: unknown
  }>
  config: Readonly<{
    defaultWebExtendPluginRuntime: Record<string, unknown>
    setWebExtendPluginEnv: (env: Record<string, unknown> | null | undefined) => void
    webExtendPluginEnvKeys: Readonly<Record<string, string>>
    defaultManifestFetchCache: Readonly<{ storageKeyPrefix: string; maxEntries: number }>
    defaultManifestMode: string
    routeSynthNamePrefix: string
    peerMinimumVersions: Readonly<{ vue: string; vueRouter: string }>
  }>
  constants: Readonly<{ HOST_PLUGIN_API_VERSION: string; RUNTIME_CONSOLE_LABEL: string }>
  components: Readonly<{ ExtensionPoint: unknown }>
  presets: Readonly<{
    vueCliAxios: Readonly<{
      id: string
      description: string
      createInstallOptions: (
        deps: { request: (config: Record<string, unknown>) => Promise<unknown> },
        extra?: Record<string, unknown>
      ) => Record<string, unknown>
      createQuickInstallOptions: (
        router: unknown,
        deps: VueCliAxiosQuickDeps,
        extra?: Record<string, unknown>
      ) => Record<string, unknown>
      defaultJavaManifestListPath: string
      manifestPathForApiBase: (manifestUrl: string, apiBase?: string) => string
      unwrapManifestBody: (body: unknown) => object | null
    }>
  }>
}>

export const defaultWebExtendPluginRuntime: Record<string, unknown>

/** 与 `resolveRuntimeOptions` / `build-env` 读取逻辑一致的环境变量键（文档与宿主检索用） */
export const webExtendPluginEnvKeys: Readonly<Record<string, string>>

export const defaultManifestFetchCache: Readonly<{ storageKeyPrefix: string; maxEntries: number }>

export const defaultManifestMode: 'api'

/** 无 name 的路由由 `createHostApi` 合成的名称前缀 */
export const routeSynthNamePrefix: string

/** 与 package.json peer 下限一致，供 CI / `test:peer-min` 对齐 */
export const peerMinimumVersions: Readonly<{ vue: string; vueRouter: string }>

/** 拉取清单并依次激活插件；浏览器环境执行 */
export function bootstrapPlugins(
  router: unknown,
  createHostApiFactory: (id: string, r: unknown, kit?: HostKitOptions) => HostApi,
  runtimeOptions?: WebExtendPluginRuntimeOptions
): Promise<void>

/** 合并默认配置、环境变量与显式传入字段 */
export function resolveRuntimeOptions(user?: WebExtendPluginRuntimeOptions): WebExtendPluginRuntimeOptions

export function ensurePluginHostRoute(router: unknown, opts: WebExtendPluginRuntimeOptions): void

export function defaultFetchWebPluginManifest(ctx: {
  manifestUrl: string
  credentials: RequestCredentials
}): Promise<{ ok: boolean; status?: number; data?: unknown; error?: unknown }>

/** 构造单个插件在宿主侧的 `hostApi`，供 `activator(hostApi, context)` 使用 */
export function createHostApi(pluginId: string, router: unknown, hostKit?: HostKitOptions): HostApi

export function disposeWebPlugin(pluginId: string): void
export const registries: unknown

export function createRequestBridge(config?: {
  allowedPathPrefixes?: string[]
}): { request: (path: string, init?: RequestInit) => Promise<Response> }

export const HOST_PLUGIN_API_VERSION: string
/** 控制台日志前缀用的短名称 */
export const RUNTIME_CONSOLE_LABEL: string
export function setWebExtendPluginEnv(env: Record<string, unknown> | null | undefined): void

/** 注册全局 `ExtensionPoint` 并异步 `bootstrapPlugins` */
export function installWebExtendPluginVue2(
  Vue: unknown,
  router: unknown,
  options?: WebExtendPluginRuntimeOptions
): Promise<void>

/** Vue CLI + axios 一键安装；默认 `exposeGlobalVue: true` 写入 `window.Vue` */
export function installVueCliAxiosWebPlugins(
  Vue: unknown,
  router: unknown,
  deps: VueCliAxiosQuickDeps,
  extra?: WebExtendPluginRuntimeOptions & { exposeGlobalVue?: boolean }
): Promise<void>

export const ExtensionPoint: unknown

/** 常见 Java 清单路径段，与 `manifestBase` 拼接 */
export const defaultVueCliJavaManifestListPath: string

export function createVueCliAxiosQuickInstallOptions(
  router: unknown,
  deps: VueCliAxiosQuickDeps,
  extra?: Record<string, unknown>
): Record<string, unknown>

export function createVueCliAxiosInstallOptions(
  deps: { request: (config: Record<string, unknown>) => Promise<unknown> },
  extra?: Record<string, unknown>
): Record<string, unknown>
/** 将完整 manifest URL 转为相对 axios `baseURL` 的请求路径 */
export function resolveManifestPathUnderApiBase(manifestUrl: string, apiBase?: string): string
/** 解包裸清单或与 `{ data: { plugins } }` 包装的响应体 */
export function unwrapNestedManifestBody(body: unknown): object | null
export const presetVueCliAxios: Readonly<{
  id: string
  description: string
  createInstallOptions: typeof createVueCliAxiosInstallOptions
  createQuickInstallOptions: typeof createVueCliAxiosQuickInstallOptions
  defaultJavaManifestListPath: typeof defaultVueCliJavaManifestListPath
  manifestPathForApiBase: typeof resolveManifestPathUnderApiBase
  unwrapManifestBody: typeof unwrapNestedManifestBody
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
