/**
 * 构造插件 `activator(hostApi)` 使用的宿主 API。
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

type RouteRegistrationDeps = {
  pluginId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any
  parentName: string
  hostKitOptions: HostKitOptions
}

function getBridgePrefixes(hostKitOptions: HostKitOptions): string[] {
  return Array.isArray(hostKitOptions.bridgeAllowedPathPrefixes) &&
    hostKitOptions.bridgeAllowedPathPrefixes.length > 0
    ? hostKitOptions.bridgeAllowedPathPrefixes
    : defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes
}

function resolveHostRuntime(hostKitOptions: HostKitOptions) {
  const hostContext: HostContext =
    hostKitOptions.hostContext != null && typeof hostKitOptions.hostContext === 'object'
      ? (hostKitOptions.hostContext as HostContext)
      : Object.freeze({})
  const hostVue = (hostContext as Record<string, unknown>).Vue
  return {
    hostContext,
    VueRuntime: hostVue || Vue
  }
}

function normalizeParentRouteName(hostKitOptions: HostKitOptions): string {
  return typeof hostKitOptions.pluginRoutesParentName === 'string'
    ? hostKitOptions.pluginRoutesParentName.trim()
    : ''
}

function normalizeUrls(urls?: string[]): string[] {
  return Array.isArray(urls)
    ? urls
        .filter((url): url is string => typeof url === 'string')
        .map((url) => url.trim())
        .filter(Boolean)
    : []
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

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') {
      return
    }
    const record = node as Record<string, unknown>
    const hasRouteConfig = record.component != null || record.components != null
    const hasRouteDecl = typeof record.componentRef === 'string'
    if (hasRouteConfig) {
      hasCfg = true
    } else if (hasRouteDecl) {
      hasDecl = true
    }
    if (Array.isArray(record.children)) {
      for (const child of record.children) {
        walk(child)
      }
    }
  }

  for (const node of nodes) {
    walk(node)
  }
  return { hasDecl, hasCfg }
}

function rollbackRegisteredTopRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any,
  routes: RegisteredTopRoute[]
) {
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

function decorateTopRoutes(pluginId: string, rawRouteConfigs: RouteConfig[]): RouteConfig[] {
  return rawRouteConfigs.map((route) => ({
    ...decorateRouteTreeWithPluginMeta(pluginId, route),
    name: route.name || `${routeSynthNamePrefix}${pluginId}_${routeSynthSeq++}`
  }))
}

function createRouteRegistrar({ pluginId, router, parentName, hostKitOptions }: RouteRegistrationDeps) {
  function addTopRoute(route: RouteConfig): RegisteredTopRoute {
    const dispose = parentName ? router.addRoute(parentName, route) : router.addRoute(route)
    return {
      name: String(route.name),
      dispose: typeof dispose === 'function' ? dispose : undefined
    }
  }

  return function applyInternalRegister(rawRouteConfigs: RouteConfig[]) {
    if (typeof router.addRoute !== 'function') {
      throw new Error('[wep] vue-router 3.5+ required: please use router.addRoute')
    }
    const wrapped = decorateTopRoutes(pluginId, rawRouteConfigs)
    const registeredTopRoutes: RegisteredTopRoute[] = []
    try {
      for (const route of wrapped) {
        registeredTopRoutes.push(addTopRoute(route))
      }
    } catch (e) {
      rollbackRegisteredTopRoutes(router, registeredTopRoutes)
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
}

function injectStylesheet(pluginId: string, href: string) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.setAttribute('data-plugin-asset', pluginId)
  document.head.appendChild(link)
}

function injectScript(pluginId: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = src
    script.setAttribute('data-plugin-asset', pluginId)
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('script failed: ' + src))
    document.head.appendChild(script)
  })
}

function resolveRouteConfigs(
  pluginId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any,
  hostKitOptions: HostKitOptions,
  routes: unknown[]
): RouteConfig[] {
  const { hasDecl, hasCfg } = analyzeRouteInputTree(routes)
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
      declarations: routes as object[]
    })
  } else {
    configs = routes as RouteConfig[]
  }

  return typeof hostKitOptions.transformRoutes === 'function'
    ? hostKitOptions.transformRoutes({
        pluginId,
        router,
        routes: configs
      })
    : configs
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
  hostContext?: HostContext
  onPluginRoutesContributed?: (ctx: {
    pluginId: string
    router: any
    routes: ReadonlyArray<RouteConfig>
    contributedRoutes: ReadonlyArray<PluginRouteSnapshot>
  }) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHostApi(pluginId: string, router: any, hostKitOptions: HostKitOptions = {}) {
  const bridge = createRequestBridge({ allowedPathPrefixes: getBridgePrefixes(hostKitOptions) })
  const parentName = normalizeParentRouteName(hostKitOptions)
  const applyInternalRegister = createRouteRegistrar({
    pluginId,
    router,
    parentName,
    hostKitOptions
  })
  const { hostContext, VueRuntime } = resolveHostRuntime(hostKitOptions)

  ensureRegistriesReactive(VueRuntime)

  registerPluginTeardown(pluginId, () => {
    clearContributedRoutesForPlugin(pluginId)
  })

  return {
    hostPluginApiVersion: HOST_PLUGIN_API_VERSION,
    hostContext,

    registerRoutes(routes: unknown[]) {
      const list = Array.isArray(routes) ? routes : []
      if (list.length === 0) {
        return
      }
      const configs = resolveRouteConfigs(pluginId, router, hostKitOptions, list)
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
      for (const componentEntry of components) {
        list.push({
          pluginId,
          component: componentEntry.component,
          priority: componentEntry.priority != null ? componentEntry.priority : 0,
          key: `${pluginId}-${pointId}-${++slotItemKeySeq}`
        })
      }
      list.sort((a, b) => b.priority - a.priority)
      registries.slotRevision++
    },

    registerStylesheetUrls(urls?: string[]) {
      for (const url of normalizeUrls(urls)) {
        injectStylesheet(pluginId, url)
      }
    },

    registerScriptUrls(urls?: string[]) {
      const chain = normalizeUrls(urls).reduce(
        (promise, url) => promise.then(() => injectScript(pluginId, url)),
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
