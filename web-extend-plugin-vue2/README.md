# web-extend-plugin-vue2

面向 **Vue 2.6+** 与 **Vue Router 3** 的 Web 插件运行时：浏览器中拉取**插件清单**、加载入口脚本、执行 `activator(hostApi)`，并提供 **`ExtensionPoint`**、菜单/路由注册表与受控 **`getBridge()`**。发布物为预构建的 **`dist/`**（CJS/ESM），类型见根目录 **`index.d.ts`**。

**Peer：`vue` ^2.6.14 \<3，`vue-router` ^3.2 \<4。**

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

**Vue CLI + 已有 axios `request`**（清单走宿主登录态）：

```js
import { installWebExtendPluginVue2, createVueCliAxiosInstallOptions } from 'web-extend-plugin-vue2'
import request from '@/utils/request'

installWebExtendPluginVue2(Vue, router, createVueCliAxiosInstallOptions({ request })).catch(console.warn)
```

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
| `manifestFetchCredentials` | 拉清单时 `fetch` 的 `credentials`，默认 `include` |
| `fetchManifest` | 自定义清单请求 `(ctx) => Promise<{ ok, data?, error? }>` |
| `bridgeAllowedPathPrefixes` | `hostApi.getBridge().request(path)` 允许的 path 前缀 |
| `allowedScriptHosts` | 允许加载插件脚本的主机名白名单 |
| `isDev` / `webPluginDevOrigin` 等 | 开发态隐式 dev 入口与 SSE，见类型定义 |
| `pluginRoutesParentName` | 插件子路由挂到的**已有**命名父路由 |
| `adaptRouteDeclarations` / `transformRoutes` / `interceptRegisterRoutes` | 路由 PRD 适配与宿主扩展流水线 |

环境：Vite 可在入口调用 **`setWebExtendPluginEnv(import.meta.env)`**，或在 options 里传 **`env`**。键名支持 **`VITE_*`** 与等价 **`PLUGIN_*`**（实现内会解析）。

---

## 功能示例）

**布局里开槽**（插件通过 `hostApi.registerSlotComponents('your.point.id', [...])` 注入组件）：

```vue
<ExtensionPoint point-id="app.toolbar.demo" />
```

**读全局菜单**（插件 `registerMenuItems` 写入响应式表）：

```js
import { registries } from 'web-extend-plugin-vue2'
// computed: { menus() { return registries.menus } }
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
