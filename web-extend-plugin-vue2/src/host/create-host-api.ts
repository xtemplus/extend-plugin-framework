/**
 * 构造插件 `activator(hostApi)` 使用的宿主 API：路由、菜单、扩展点、资源与受控请求桥。
 */
import Vue from 'vue'
import type { Component } from 'vue'
import type { RouteConfig } from 'vue-router'
import { HOST_PLUGIN_API_VERSION } from '../core/constants'
import { registries } from '../core/plugin-registries'
import { registerPluginTeardown } from '../core/plugin-teardown-registry'
import { createRequestBridge } from './request-bridge'
import { defaultWebExtendPluginRuntime } from '../core/default-runtime-config'
import type {
  ApplyPluginMenuItemsFn,
  HostContext
} from '../runtime/resolve-runtime-options'

let slotItemKeySeq = 0
let routeSynthSeq = 0

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
  applyPluginMenuItems?: ApplyPluginMenuItemsFn
  /** 由 bootstrap 注入的浅冻结上下文；勿在 `createHostApi` 外重复设置 */
  hostContext?: HostContext
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

  function applyInternalRegister(rawRouteConfigs: RouteConfig[]) {
    const wrapped = rawRouteConfigs.map((r) => ({
      ...r,
      name: r.name || `__wep_${pluginId}_${routeSynthSeq++}`,
      meta: { ...(r.meta || {}), pluginId }
    }))
    if (typeof router.addRoute !== 'function') {
      throw new Error('[wep] vue-router 3.5+ 必需：请使用 router.addRoute（不再支持 addRoutes）')
    }
    if (parentName) {
      for (const r of wrapped) {
        router.addRoute(parentName, r)
      }
    } else {
      for (const r of wrapped) {
        router.addRoute(r)
      }
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

    registerMenuItems(items: Record<string, unknown>[]) {
      const apply = hostKitOptions.applyPluginMenuItems
      if (typeof apply !== 'function') {
        throw new Error(
          '[wep] registerMenuItems 需要宿主在 resolveRuntimeOptions 中提供 applyPluginMenuItems，将菜单数据并入宿主侧栏/目录 state（框架不再维护 registries.menus）'
        )
      }
      const list = Array.isArray(items) ? items : []
      const enriched = list.map((item) => ({ ...item, pluginId })) as Array<
        Record<string, unknown> & { pluginId: string }
      >
      enriched.sort(
        (a, b) => (a.order != null ? Number(a.order) : 0) - (b.order != null ? Number(b.order) : 0)
      )
      apply({ pluginId, items: enriched })
    },

    registerSlotComponents(pointId: string, components: Array<{ component: Component; priority?: number }>) {
      if (!pointId) {
        return
      }
      if (!registries.slots[pointId]) {
        Vue.set(registries.slots, pointId, [])
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

    getBridge: () => bridge,

    onTeardown(_pluginId: string, fn: () => void) {
      if (typeof fn === 'function') {
        registerPluginTeardown(pluginId, fn)
      }
    }
  }
}
