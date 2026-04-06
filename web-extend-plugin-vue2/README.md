# web-extend-plugin-vue2

面向 **Vue 2.6+** 与 **Vue Router 3** 的 Web 插件运行时：浏览器中拉取**插件清单**、加载入口脚本、执行 `activator(hostApi)`，并提供 **`ExtensionPoint`**、菜单/路由注册表与受控 **`getBridge()`**。发布物为预构建的 **`dist/`**（CJS/ESM），类型见根目录 **`index.d.ts`**。

**Peer：`vue` ^2.6.14 \<3，`vue-router` ^3.5 \<4**（依赖 `router.addRoute`）。**

---

## 如何使用

**一键接入**（注册全局 `ExtensionPoint` 并异步拉清单）：

```js
import { installWebExtendPluginVue2 } from 'web-extend-plugin-vue2'

installWebExtendPluginVue2(Vue, router, {
  manifestBase: '/fp-api', // 或与网关一致的前缀
  env: import.meta.env // Vite：可选，便于读取 VITE_*
}).catch(console.warn)
```

**Vue CLI + 已有 axios `request`**（开箱：`/plugin` 壳路由 + Layout 由框架注册；清单可走 Java，开发态可自动回退 `public/web-plugins/plugins.manifest.json`）：

```js
import { installWebExtendPluginVue2, createVueCliAxiosInstallOptions } from 'web-extend-plugin-vue2'
import request from '@/utils/request'
import Layout from '@/layout'

installWebExtendPluginVue2(
  Vue,
  router,
  createVueCliAxiosInstallOptions({ request }, { hostLayoutComponent: Layout })
).catch(console.warn)
```

默认插件父路由 **`name`** 为 **`__wepPluginHost`**，路径 **`/plugin`**；插件内 `registerRoutes` 使用相对 `path`（如 `plugin-b-sample`）即可，全路径为 `/plugin/...`。自定义：`pluginRoutesParentName`、`pluginMountPath`。

**静态清单模式**（无需 Java `frontend-plugins`，将聚合 JSON 放入宿主 `public` 等静态目录）：

```js
installWebExtendPluginVue2(
  Vue,
  router,
  createVueCliAxiosInstallOptions({ request }, {
    manifestMode: 'static',
    staticManifestUrl: '/web-plugins/plugins.manifest.json'
  })
).catch(console.warn)
```

JSON 体与 Java 清单接口一致（含 `hostPluginApiVersion`、`plugins[].id` / `entryUrl` 等），参见设计文档或示例 `plugins.manifest.json`。

### 开发态开箱即用（默认 API + 静态回退）

保持 **`manifestMode` 默认 `api`**、宿主仍只写 `createVueCliAxiosInstallOptions({ request }, { manifestBase, manifestListPath, ... })` 即可。当 **`isDev === true`** 时，若后端清单**请求失败**或 **`plugins` 为空**，框架会**自动**再拉取 **`devFallbackStaticManifestUrl`**（默认 **`/web-plugins/plugins.manifest.json`**）。把该文件放在宿主 **`public/web-plugins/`** 下即可与「不打后端 / 后端无插件」场景联调，无需在业务里切换 `manifestMode`。

插件源码热更新：配置 **`PLUGIN_WEB_PLUGIN_DEV_ORIGIN`**（Vue CLI 推荐 `PLUGIN_*` 进 `process.env`）与 **`PLUGIN_WEB_PLUGIN_DEV_IDS`**（或与 **`VITE_*`** 等价键），与原先隐式 dev 映射行为一致。关闭回退：`devManifestFallback: false` 或环境变量 **`VITE_WEB_PLUGIN_DEV_MANIFEST_FALLBACK=0`**。

**按需组合**（自行注册 `ExtensionPoint`、控制引导时机）：

```js
import {
  bootstrapPlugins,
  createHostApi,
  resolveRuntimeOptions,
  ExtensionPoint
} from 'web-extend-plugin-vue2'

Vue.component('ExtensionPoint', ExtensionPoint)
const runtime = resolveRuntimeOptions({ manifestBase: '/fp-api' })
bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit), runtime).catch(console.warn)
```

清单请求地址：**`manifestBase` + `manifestListPath`**（默认路径段为 `/api/frontend-plugins`）。工厂请使用 **`(id, r, kit) => createHostApi(id, r, kit)`**，以便 `bridgeAllowedPathPrefixes` 等传入 `hostApi`。

---

## 主要配置（`resolveRuntimeOptions` / `install` 同源字段）

| 字段 | 作用 |
|------|------|
| `manifestBase` | 清单服务 URL 前缀（无尾 `/`），默认 `/fp-api` |
| `manifestListPath` | 清单路径段（以 `/` 开头），拼在 `manifestBase` 后 |
| `manifestMode` | 默认 `api`；设为 `static` 时从 `staticManifestUrl` 用浏览器 `fetch` 拉取聚合 JSON（不经后端 list）。环境变量：`VITE_WEB_PLUGIN_MANIFEST_MODE` / `PLUGIN_WEB_PLUGIN_MANIFEST_MODE` |
| `staticManifestUrl` | 静态聚合清单地址，如 `/web-plugins/plugins.manifest.json`。环境变量：`VITE_WEB_PLUGIN_STATIC_MANIFEST_URL` / `PLUGIN_WEB_PLUGIN_STATIC_MANIFEST_URL` |
| `devManifestFallback` | 开发态 API 失败或空列表时是否回退静态 JSON（`manifestMode=api` 时默认开启）。`VITE_WEB_PLUGIN_DEV_MANIFEST_FALLBACK` |
| `devFallbackStaticManifestUrl` | 回退地址，默认 `/web-plugins/plugins.manifest.json`。`VITE_WEB_PLUGIN_DEV_FALLBACK_MANIFEST_URL` |
| `manifestFetchCredentials` | 拉清单时 `fetch` 的 `credentials`，默认 `include` |
| `fetchManifest` | 自定义清单请求 `(ctx) => Promise<{ ok, data?, error? }>` |
| `bridgeAllowedPathPrefixes` | `hostApi.getBridge().request(path)` 允许的 path 前缀 |
| `allowedScriptHosts` | 允许加载插件脚本的主机名白名单 |
| `isDev` / `webPluginDevOrigin` 等 | 开发态隐式 dev 入口与 SSE，见类型定义 |
| `hostLayoutComponent` | 传入后自动注册 `/plugin` + Layout 壳（`addRoute`），无需在宿主路由表手写 `/plugin` |
| `pluginMountPath` / `pluginHostRouteMeta` / `ensurePluginHostRoute` | 壳路径（默认 `/plugin`）、meta、是否自动注册（默认 true） |
| `pluginRoutesParentName` | 壳路由的 **name**，插件子项挂在其下；未传且传入 `hostLayoutComponent` 时默认为 **`__wepPluginHost`** |
| `adaptRouteDeclarations` / `transformRoutes` / `interceptRegisterRoutes` | 路由 PRD 适配与宿主扩展流水线 |
| `applyPluginMenuItems` / `revokePluginMenuItems` | **菜单**：插件 `registerMenuItems` 仅触发回调，由宿主并入自己的侧栏/权限路由等数据结构；卸载时撤销 |
| `hostContext` | **依赖注入（推荐）**：普通对象，引导时做**浅拷贝并浅冻结**后挂到 **`hostApi.hostContext`**，插件只读使用 `store` / `router` / 宿主开放 API 等，不污染 `HostApi` 顶层方法名 |
| `onBeforePluginActivate` / `onAfterPluginActivate` / `onPluginActivateError` | **生命周期**：激活前（可 `throw` 跳过该插件）、成功后、抛错后；便于埋点、门禁、监控，各宿主同一套签名即可接入 |

环境：Vite 可在入口调用 **`setWebExtendPluginEnv(import.meta.env)`**，或在 options 里传 **`env`**。键名支持 **`VITE_*`** 与等价 **`PLUGIN_*`**（实现内会解析）。

### 宿主接入约定（跨项目统一）

1. **菜单**：实现 `applyPluginMenuItems` + `revokePluginMenuItems`，菜单字段→本地侧栏结构的映射留在宿主。  
2. **宿主能力**：通过 **`hostContext`** 注入（如 `{ store, router, getDict }`），插件内使用 **`hostApi.hostContext.store`**，避免 `Vue.prototype` 魔法与命名冲突。  
3. **拦截激活**：在 **`onBeforePluginActivate`** 中做权限/租户校验，不通过则 **`throw`**；错误用 **`onPluginActivateError`** 上报，勿在 error 钩子里再抛异常。

---

## 功能示例）

**布局里开槽**（插件通过 `hostApi.registerSlotComponents('your.point.id', [...])` 注入组件）：

```vue
<ExtensionPoint point-id="app.toolbar.demo" />
```

**侧栏菜单**（框架不维护菜单列表；`registries` 仅含扩展点 `slots`）：

```js
// resolveRuntimeOptions / install options 中提供：
applyPluginMenuItems: ({ pluginId, items }) => {
  // 将 items 映射为宿主侧栏数据结构（如 Vuex、与后端路由同形的树等）
},
revokePluginMenuItems: (pluginId) => {
  // 从宿主 state 移除该插件贡献的菜单项
}
```

插件侧仍为 `hostApi.registerMenuItems([{ path, title, order, ... }])`；是否显示、图标、层级样式全部由宿主决定。

**宿主上下文（插件读宿主能力）**：

```js
// install / resolveRuntimeOptions
hostContext: {
  store,
  router,
  // 仅暴露你愿意让插件调用的键；勿放入密钥
}
// 插件 activator 内：hostApi.hostContext.store / .router
```

**路由扩展（宿主）**：在 `resolveRuntimeOptions` 里提供 `transformRoutes` 或 `adaptRouteDeclarations`，插件在 `activator` 第二个参数中取冻结的 **`pluginRecord`**（可含清单里的 `routeDeclarations`）。

**卸载插件**：

```js
import { disposeWebPlugin } from 'web-extend-plugin-vue2'
disposeWebPlugin('com.your.plugin.id')
```

---

## API 浏览

- **具名导出**：与下述命名空间指向同一实现，便于 tree-shaking。
- **`WebExtendPluginVue2`**：`install`、`runtime`（含 `bootstrapPlugins`、`resolveRuntimeOptions`、`wrapManifestFetchWithCache` 等）、`host`、`config`、`constants`、`components`、`presets`（`vueCliAxios`）。

更细的签名与说明以 **`index.d.ts`** 为准。

---

## 仓库

<https://github.com/xtemplus/extend-plugin-framework/tree/master/web-extend-plugin-vue2> · Apache-2.0
