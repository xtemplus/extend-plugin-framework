/**
 * 构造插件 `activator(hostApi)` 使用的宿主 API：路由、扩展点、资源与受控请求桥。
 */
import Vue from 'vue'
import type { Component } from 'vue'
import type { RouteConfig } from 'vue-router'
import {
  HOST_PLUGIN_API_VERSION,
  defaultWebExtendPluginRuntime,
  routeSynthNamePrefix
} from '../core/public-config-defaults'
import {
  getHostComponent,
  getHostComponentMeta,
  getHostModule,
  getHostModuleMeta
} from '../core/host-component-registry'
import { ensureRegistriesReactive, registries } from '../core/plugin-registries'
import { registerPluginTeardown } from '../core/plugin-teardown-registry'
import { createRequestBridge } from './request-bridge'
import type { HostContext } from '../core/host-context'
import { recordPluginTopRoutes } from './plugin-route-registry'
import {
  type PluginRouteSnapshot,
  recordContributedRoutesForPlugin,
  getContributedRoutesForPlugin,
  clearContributedRoutesForPlugin
} from './plugin-route-snapshots'

let slotItemKeySeq = 0
let routeSynthSeq = 0

type RegisteredTopRoute = {
  name: string
  dispose?: (() => void) | undefined
}

function decorateRouteTreeWithPluginMeta(pluginId: string, route: RouteConfig): RouteConfig {
  const meta =
    route.meta && typeof route.meta === 'object' && !Array.isArray(route.meta)
      ? (route.meta as Record<string, unknown>)
      : {}
  const wepMeta =
    meta.__wep && typeof meta.__wep === 'object' && !Array.isArray(meta.__wep)
      ? (meta.__wep as Record<string, unknown>)
      : {}

  const nextChildren = Array.isArray(route.children)
    ? route.children.map((child) => decorateRouteTreeWithPluginMeta(pluginId, child as RouteConfig))
    : route.children

  return {
    ...route,
    meta: {
      ...meta,
      __wep: {
        ...wepMeta,
        pluginId
      }
    },
    ...(nextChildren ? { children: nextChildren } : {})
  }
}

function analyzeRouteInputTree(nodes: unknown[]) {
  let hasDecl = false
  let hasCfg = false
  function walk(r: unknown) {
    if (!r || typeof r !== 'object') {
      return
    }
    const o = r as Record<string, unknown>
    const cfg = o.component != null || o.components != null
    const decl = typeof o.componentRef === 'string'
    if (cfg) {
      hasCfg = true
    } else if (decl) {
      hasDecl = true
    }
    const ch = o.children
    if (Array.isArray(ch)) {
      for (const c of ch) {
        walk(c)
      }
    }
  }
  for (const n of nodes) {
    walk(n)
  }
  return { hasDecl, hasCfg }
}

export type HostKitOptions = Record<string, unknown> & {
  bridgeAllowedPathPrefixes?: string[]
  pluginRoutesParentName?: string
  transformRoutes?: (ctx: {
    pluginId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router: any
    routes: ReadonlyArray<RouteConfig>
  }) => RouteConfig[]
  interceptRegisterRoutes?: (ctx: {
    pluginId: string
    router: any
    routes: ReadonlyArray<RouteConfig>
    applyInternalRegister: (routes: RouteConfig[]) => void
  }) => void
  adaptRouteDeclarations?: (ctx: {
    pluginId: string
    router: any
    declarations: ReadonlyArray<object>
  }) => RouteConfig[]
  /** 由 bootstrap 注入的浅冻结上下文；勿在 `createHostApi` 外重复设置 */
  hostContext?: HostContext
  /** 后置钩子：插件贡献的路由注册完成后触发 */
  onPluginRoutesContributed?: (ctx: {
    pluginId: string
    router: any
    routes: ReadonlyArray<RouteConfig>
    contributedRoutes: ReadonlyArray<PluginRouteSnapshot>
  }) => void
}

/**
 * 单插件在宿主侧的 API 句柄。工厂请传 `(id, router, kit) => createHostApi(id, r, kit)` 以便 bridge 白名单等到位。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHostApi(pluginId: string, router: any, hostKitOptions: HostKitOptions = {}) {
  const bridgePrefixes =
    Array.isArray(hostKitOptions.bridgeAllowedPathPrefixes) &&
    hostKitOptions.bridgeAllowedPathPrefixes.length > 0
      ? hostKitOptions.bridgeAllowedPathPrefixes
      : defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes

  const bridge = createRequestBridge({ allowedPathPrefixes: bridgePrefixes })

  const parentName =
    typeof hostKitOptions.pluginRoutesParentName === 'string'
      ? hostKitOptions.pluginRoutesParentName.trim()
      : ''

  function rollbackRegisteredTopRoutes(routes: RegisteredTopRoute[]) {
    for (let i = routes.length - 1; i >= 0; i--) {
      const route = routes[i]

      if (typeof route.dispose === 'function') {
        try {
          route.dispose()
          continue
        } catch (e) {
          console.warn('[wep] rollback route disposer failed', route.name, e)
        }
      }

      if (typeof router.removeRoute === 'function') {
        try {
          router.removeRoute(route.name)
        } catch (e) {
          console.warn('[wep] rollback removeRoute failed', route.name, e)
        }
      }
    }
  }

  function applyInternalRegister(rawRouteConfigs: RouteConfig[]) {
    const wrapped = rawRouteConfigs.map((r) => ({
      ...decorateRouteTreeWithPluginMeta(pluginId, r),
      name: r.name || `${routeSynthNamePrefix}${pluginId}_${routeSynthSeq++}`
    }))
    if (typeof router.addRoute !== 'function') {
      throw new Error('[wep] vue-router 3.5+ 必需：请使用 router.addRoute（不再支持 addRoutes）')
    }
    const registeredTopRoutes: RegisteredTopRoute[] = []
    try {
      if (parentName) {
        for (const r of wrapped) {
          const dispose = router.addRoute(parentName, r)
          registeredTopRoutes.push({
            name: String(r.name),
            dispose: typeof dispose === 'function' ? dispose : undefined
          })
        }
      } else {
        for (const r of wrapped) {
          const dispose = router.addRoute(r)
          registeredTopRoutes.push({
            name: String(r.name),
            dispose: typeof dispose === 'function' ? dispose : undefined
          })
        }
      }
    } catch (e) {
      rollbackRegisteredTopRoutes(registeredTopRoutes)
      throw e
    }
    recordPluginTopRoutes(pluginId, registeredTopRoutes)
    const contributedRoutes = recordContributedRoutesForPlugin(pluginId, wrapped)
    if (contributedRoutes.length > 0 && typeof hostKitOptions.onPluginRoutesContributed === 'function') {
      hostKitOptions.onPluginRoutesContributed({
        pluginId,
        router,
        routes: wrapped,
        contributedRoutes
      })
    }
  }

  function injectStylesheet(href: string) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-plugin-asset', pluginId)
    document.head.appendChild(link)
  }

  function injectScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.async = true
      s.src = src
      s.setAttribute('data-plugin-asset', pluginId)
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('script failed: ' + src))
      document.head.appendChild(s)
    })
  }

  const hostContext: HostContext =
    hostKitOptions.hostContext != null && typeof hostKitOptions.hostContext === 'object'
      ? (hostKitOptions.hostContext as HostContext)
      : Object.freeze({})
  const hostVue = hostContext && (hostContext as Record<string, unknown>).Vue
  const VueRuntime = hostVue || Vue

  ensureRegistriesReactive(VueRuntime)

  registerPluginTeardown(pluginId, () => {
    clearContributedRoutesForPlugin(pluginId)
  })

  return {
    hostPluginApiVersion: HOST_PLUGIN_API_VERSION,

    /** 宿主注入的只读依赖（store、router、开放能力等），见 `resolveRuntimeOptions.hostContext` */
    hostContext,

    registerRoutes(routes: unknown[]) {
      const list = Array.isArray(routes) ? routes : []
      if (list.length === 0) {
        return
      }
      const { hasDecl, hasCfg } = analyzeRouteInputTree(list)
      if (hasDecl && hasCfg) {
        throw new Error(
          '[wep] registerRoutes: cannot mix RouteDeclaration (componentRef) with RouteConfig (component)'
        )
      }
      let configs: RouteConfig[]
      if (hasDecl) {
        const adapt = hostKitOptions.adaptRouteDeclarations
        if (typeof adapt !== 'function') {
          throw new Error(
            '[wep] registerRoutes: RouteDeclaration (componentRef) requires adaptRouteDeclarations on the host'
          )
        }
        configs = adapt({
          pluginId,
          router,
          declarations: list as object[]
        })
      } else {
        configs = list as RouteConfig[]
      }

      if (typeof hostKitOptions.transformRoutes === 'function') {
        configs = hostKitOptions.transformRoutes({
          pluginId,
          router,
          routes: configs
        })
      }

      if (typeof hostKitOptions.interceptRegisterRoutes === 'function') {
        hostKitOptions.interceptRegisterRoutes({
          pluginId,
          router,
          routes: configs,
          applyInternalRegister
        })
      } else {
        applyInternalRegister(configs)
      }
    },

    registerSlotComponents(pointId: string, components: Array<{ component: Component; priority?: number }>) {
      if (!pointId) {
        return
      }
      if (!registries.slots[pointId]) {
        VueRuntime.set(registries.slots, pointId, [])
      }
      const list = registries.slots[pointId]
      for (const c of components) {
        list.push({
          pluginId,
          component: c.component,
          priority: c.priority != null ? c.priority : 0,
          key: `${pluginId}-${pointId}-${++slotItemKeySeq}`
        })
      }
      list.sort((a, b) => b.priority - a.priority)
      registries.slotRevision++
    },

    registerStylesheetUrls(urls?: string[]) {
      for (const u of urls || []) {
        if (typeof u === 'string' && u) {
          injectStylesheet(u)
        }
      }
    },

    registerScriptUrls(urls?: string[]) {
      const chain = (urls || []).filter((u) => typeof u === 'string' && u).reduce(
        (p, u) => p.then(() => injectScript(u)),
        Promise.resolve()
      )
      chain.catch((e) => console.warn('[wep] registerScriptUrls', pluginId, e))
    },

    registerSanitizedHtmlSnippet() {
      throw new Error('registerSanitizedHtmlSnippet is not enabled')
    },

    getContributedRoutes: () => getContributedRoutesForPlugin(pluginId),

    getHostModule,

    getHostModuleMeta,

    getHostComponent,

    getHostComponentMeta,

    getBridge: () => bridge,

    onTeardown(_pluginId: string, fn: () => void) {
      if (typeof fn === 'function') {
        registerPluginTeardown(pluginId, fn)
      }
    }
  }
}
