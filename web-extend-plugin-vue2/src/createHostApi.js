/**
 * 构造供插件 activator 调用的宿主 API（路由、菜单、扩展点、资源注入等）。
 * 与打包工具无关；Webpack 宿主需已配置 `vue-loader` 以编译本包内的 `.vue` 依赖。
 *
 * @module createHostApi
 */
import Vue from 'vue'
import { HOST_PLUGIN_API_VERSION } from './constants.js'
import { createRequestBridge } from './bridge.js'
import { defaultWebExtendPluginRuntime } from './default-runtime-config.js'
import { registries } from './registries.js'
import { registerPluginTeardown } from './teardown-registry.js'

/** 扩展点列表项 key 递增，避免用 Date.now() 导致列表重排时误卸载组件 */
let slotItemKeySeq = 0
/** 无 name 的动态路由合成名递增，避免多次 registerRoutes 重名 */
let routeSynthSeq = 0

/**
 * @typedef {object} RegisterSlotEntry
 * @property {import('vue').Component} component
 * @property {number} [priority]
 */

/**
 * @typedef {object} HostApi
 * @property {string} hostPluginApiVersion 宿主实现的协议版本
 * @property {(routes: import('vue-router').RouteConfig[]) => void} registerRoutes 注册路由；无 `name` 时自动生成稳定合成名；优先 `router.addRoute`
 * @property {(items: object[]) => void} registerMenuItems 注册菜单并按 `order` 排序
 * @property {(pointId: string, components: RegisterSlotEntry[]) => void} registerSlotComponents 向扩展点挂载组件
 * @property {(urls?: string[]) => void} registerStylesheetUrls 注入 `link[rel=stylesheet]`，带 `data-plugin-asset`
 * @property {(urls?: string[]) => void} registerScriptUrls 顺序注入外链脚本
 * @property {() => void} registerSanitizedHtmlSnippet MVP 未实现，调用即抛错
 * @property {() => ReturnType<typeof createRequestBridge>} getBridge 受控 `fetch` 代理
 * @property {(pluginId: string, fn: () => void) => void} onTeardown 注册卸载回调；由 `disposeWebPlugin(pluginId)` 触发
 */

/**
 * @typedef {object} HostKitOptions
 * @property {string[]} [bridgeAllowedPathPrefixes] 覆盖 `getBridge().request` 允许的 URL 前缀；默认见 `defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes`
 */

/**
 * 创建单个插件在宿主侧的 API 句柄，传入插件 `activator(hostApi)`。
 *
 * `bootstrapPlugins` 始终以 `(pluginId, router, hostKitOptions)` 调用工厂；请使用 `(id, r, kit) => createHostApi(id, r, kit)` 传入 `bridgeAllowedPathPrefixes`。
 * 单参工厂 `(id) => createHostApi(id, router)` 仍可用（忽略后两个实参），此时 bridge 仅用包内默认前缀。
 *
 * @param {string} pluginId 与 manifest.id 一致
 * @param {import('vue-router').default} router 宿主 Vue Router 实例（vue-router@3）
 * @param {HostKitOptions} [hostKitOptions]
 * @returns {HostApi}
 */
export function createHostApi(pluginId, router, hostKitOptions = {}) {
  const bridgePrefixes =
    Array.isArray(hostKitOptions.bridgeAllowedPathPrefixes) &&
    hostKitOptions.bridgeAllowedPathPrefixes.length > 0
      ? hostKitOptions.bridgeAllowedPathPrefixes
      : defaultWebExtendPluginRuntime.bridgeAllowedPathPrefixes
  const bridge = createRequestBridge({ allowedPathPrefixes: bridgePrefixes })

  /**
   * 注入样式表；`disposeWebPlugin` 会按 `data-plugin-asset` 移除对应节点。
   * @param {string} href
   */
  function injectStylesheet(href) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-plugin-asset', pluginId)
    document.head.appendChild(link)
  }

  /**
   * 注入外链脚本（用于插件额外资源，非清单主入口）。
   * @param {string} src
   * @returns {Promise<void>}
   */
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

    /**
     * 动态注册路由。Vue Router 3.5+ 推荐 `addRoute`；若不存在则回退已弃用的 `addRoutes`。
     * @param {import('vue-router').RouteConfig[]} routes
     */
    registerRoutes(routes) {
      const wrapped = routes.map((r) => ({
        ...r,
        name: r.name || `__wep_${pluginId}_${routeSynthSeq++}`,
        meta: { ...(r.meta || {}), pluginId }
      }))
      if (typeof router.addRoute === 'function') {
        for (const r of wrapped) {
          router.addRoute(r)
        }
      } else {
        router.addRoutes(wrapped)
      }
    },

    /**
     * 写入全局菜单注册表（响应式）；按 `order` 升序排列。
     * @param {object[]} items
     */
    registerMenuItems(items) {
      for (const item of items) {
        registries.menus.push({ ...item, pluginId })
      }
      registries.menus.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    },

    /**
     * 向指定扩展点 id 注册 Vue 组件；`ExtensionPoint` 按 `priority` 降序渲染。
     * @param {string} pointId
     * @param {RegisterSlotEntry[]} components
     */
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
          priority: c.priority ?? 0,
          key: `${pluginId}-${pointId}-${++slotItemKeySeq}`
        })
      }
      list.sort((a, b) => b.priority - a.priority)
      registries.slotRevision++
    },

    /**
     * @param {string[]|undefined} urls
     */
    registerStylesheetUrls(urls) {
      for (const u of urls || []) {
        if (typeof u === 'string' && u) {
          injectStylesheet(u)
        }
      }
    },

    /**
     * 串行加载多个脚本，失败仅告警不中断宿主。
     * @param {string[]|undefined} urls
     */
    registerScriptUrls(urls) {
      const chain = (urls || []).filter((u) => typeof u === 'string' && u).reduce(
        (p, u) => p.then(() => injectScript(u)),
        Promise.resolve()
      )
      chain.catch((e) => console.warn('[plugins] registerScriptUrls', pluginId, e))
    },

    registerSanitizedHtmlSnippet() {
      throw new Error('registerSanitizedHtmlSnippet is not enabled in MVP')
    },

    getBridge: () => bridge,

    /**
     * 插件卸载前清理逻辑；第一个参数为预留与协议对齐，实际以创建 API 时的 `pluginId` 为准。
     * @param {string} _pluginId 预留，与 manifest.id 一致时可传入
     * @param {() => void} fn
     */
    onTeardown(_pluginId, fn) {
      if (typeof fn === 'function') {
        registerPluginTeardown(pluginId, fn)
      }
    }
  }
}
