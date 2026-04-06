/**
 * 构造插件 `activator(hostApi)` 使用的宿主 API：路由、菜单、扩展点、资源与受控请求桥。
 */
import Vue from 'vue'
import { HOST_PLUGIN_API_VERSION } from './constants.js'
import { createRequestBridge } from './request-bridge.js'
import { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
import { registries } from './plugin-registries.js'
import { registerPluginTeardown } from './plugin-teardown-registry.js'

let slotItemKeySeq = 0
let routeSynthSeq = 0

/**
 * @param {unknown[]} nodes
 */
function analyzeRouteInputTree(nodes) {
  let hasDecl = false
  let hasCfg = false
  /** @param {unknown} r */
  function walk(r) {
    if (!r || typeof r !== 'object') {
      return
    }
    const o = /** @type {Record<string, unknown>} */ (r)
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

/**
 * 单插件在宿主侧的 API 句柄。工厂请传 `(id, router, kit) => createHostApi(id, r, kit)` 以便 bridge 白名单等到位。
 *
 * @param {string} pluginId
 * @param {import('vue-router').default} router
 * @param {Record<string, unknown>} [hostKitOptions] 与 `resolveRuntimeOptions` 中路由/bridge 等字段一致
 */
export function createHostApi(pluginId, router, hostKitOptions = {}) {
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

  /** @param {import('vue-router').RouteConfig[]} rawRouteConfigs */
  function applyInternalRegister(rawRouteConfigs) {
    const wrapped = rawRouteConfigs.map((r) => ({
      ...r,
      name: r.name || `__wep_${pluginId}_${routeSynthSeq++}`,
      meta: { ...(r.meta || {}), pluginId }
    }))
    if (typeof router.addRoute === 'function') {
      if (parentName) {
        for (const r of wrapped) {
          router.addRoute(parentName, r)
        }
      } else {
        for (const r of wrapped) {
          router.addRoute(r)
        }
      }
    } else {
      if (parentName) {
        console.warn(
          '[wep] pluginRoutesParentName requires vue-router 3.5+ addRoute; falling back to top-level addRoutes'
        )
      }
      router.addRoutes(wrapped)
    }
  }

  function injectStylesheet(href) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-plugin-asset', pluginId)
    document.head.appendChild(link)
  }

  /** @param {string} src */
  function injectScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.async = true
      s.src = src
      s.setAttribute('data-plugin-asset', pluginId)
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('script failed: ' + src))
      document.head.appendChild(s)
    })
  }

  return {
    hostPluginApiVersion: HOST_PLUGIN_API_VERSION,

    registerRoutes(routes) {
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
      let /** @type {import('vue-router').RouteConfig[]} */ configs
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
          declarations: /** @type {unknown[]} */ (list)
        })
      } else {
        configs = /** @type {import('vue-router').RouteConfig[]} */ (/** @type {unknown} */ (list))
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

    registerMenuItems(items) {
      for (const item of items) {
        registries.menus.push({ ...item, pluginId })
      }
      registries.menus.sort(
        (a, b) => (a.order != null ? a.order : 0) - (b.order != null ? b.order : 0)
      )
    },

    registerSlotComponents(pointId, components) {
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

    registerStylesheetUrls(urls) {
      for (const u of urls || []) {
        if (typeof u === 'string' && u) {
          injectStylesheet(u)
        }
      }
    },

    registerScriptUrls(urls) {
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

    onTeardown(_pluginId, fn) {
      if (typeof fn === 'function') {
        registerPluginTeardown(pluginId, fn)
      }
    }
  }
}
