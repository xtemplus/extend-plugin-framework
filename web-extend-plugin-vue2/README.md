# web-extend-plugin-vue2

面向 **Vue 2.7** 宿主的 **Web 前端扩展插件**运行时（npm 包）。在浏览器中拉取插件清单、加载入口脚本、向插件注入 **`hostApi`**（路由 / 菜单 / 扩展点 / 受控请求桥等），并提供 **`ExtensionPoint`** 组件在布局中挂载插件视图。与后端清单服务、静态资源目录约定配套使用（如 `extend-plugin-framework` 中的 `plugin-web-starter`）。

## 安装

```bash
npm add web-extend-plugin-vue2 vue@^2.7 vue-router@^3.6
```

## 最小接入

```js
import Vue from 'vue'
import {
  bootstrapPlugins,
  createHostApi,
  resolveRuntimeOptions,
  ExtensionPoint
} from 'web-extend-plugin-vue2'

Vue.component('ExtensionPoint', ExtensionPoint) // 布局：<ExtensionPoint point-id="..." />

const runtime = resolveRuntimeOptions({
  // 按需覆盖，见 defaultWebExtendPluginRuntime
})

bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit), runtime).catch(console.warn)
```

清单请求 URL 为 **`manifestBase` + `manifestListPath`**（默认 `/fp-api` + `/api/frontend-plugins`）。工厂请使用 **`(id, r, kit) => createHostApi(id, r, kit)`**，以便 bridge 白名单等配置生效；若仍写 `(id) => createHostApi(id, router)`，仅清单侧配置会随 `runtime` 变化，bridge 仍为内置默认。

## 配置与默认值

**优先级（后者覆盖前者）**：`resolveRuntimeOptions` 传入对象中的显式字段 → 环境变量 → **`defaultWebExtendPluginRuntime`**（可通过 `import { defaultWebExtendPluginRuntime } from 'web-extend-plugin-vue2'` 展开后再改）。

**环境变量命名**：文档以 **`VITE_*`** 为准；每个键都有等价的 **`PLUGIN_*`**（把前缀 `VITE_` 换成 `PLUGIN_`）。读取时 **`VITE_*` 优先**。Vite 需在 `defineConfig({ envPrefix: ['VITE_', 'PLUGIN_'] })` 中声明 `PLUGIN_` 才会进入 `import.meta.env`；Webpack 用 `DefinePlugin` 注入 `process.env` 即可。

**`isDev`**：无对应 `VITE_*`。未在对象里写 `isDev` 时，取 `import.meta.env.DEV === true`（Vite）或 `process.env.NODE_ENV === 'development'`（Webpack）。

### `resolveRuntimeOptions` / `defaultWebExtendPluginRuntime` 字段

| 字段 | 类型 | 默认值 | 作用 |
|------|------|--------|------|
| `manifestBase` | `string` | `/fp-api` | 清单与代理前缀（不含尾部 `/`），与后端 context-path 对齐 |
| `manifestListPath` | `string` | `/api/frontend-plugins` | 清单接口路径（以 `/` 开头），完整请求 URL = `manifestBase` + `manifestListPath` |
| `manifestFetchCredentials` | `string` | `include` | 拉清单时 `fetch` 的 `credentials`：`include` / `same-origin` / `omit` |
| `isDev` | `boolean` | 见上 | 是否开发模式；影响隐式 dev 映射、SSE 等 |
| `webPluginDevOrigin` | `string` | `''` | 插件 dev 服务 origin，如 `http://localhost:5188`；空则不做隐式 dev ping |
| `webPluginDevIds` | `string` | `''` | 逗号分隔插件 id；有值且 ping 成功时生成隐式 dev 入口映射 |
| `webPluginDevMapJson` | `string` | `''` | JSON 字符串：`{ "插件id": "完整入口URL" }`，与隐式映射合并，**显式覆盖同 id** |
| `webPluginDevEntryPath` | `string` | `/src/plugin-entry.js` | 隐式映射里各 id 对应的入口路径（相对 `webPluginDevOrigin`）；Webpack dev 可改为 `/dist/main.js` 等 |
| `devPingPath` | `string` | `/__web_plugin_dev_ping` | 拼在 `webPluginDevOrigin` 后的存活探测路径 |
| `devReloadSsePath` | `string` | `/__web_plugin_reload_stream` | 插件 dev 热更新 SSE 路径（相对各 dev 入口的 origin） |
| `devPingTimeoutMs` | `number` | `500` | dev ping 超时（毫秒） |
| `defaultImplicitDevPluginIds` | `string[]` | `[]` | 未配置 `webPluginDevIds` 且未设对应 env 时，隐式 dev 使用的 id 列表 |
| `allowedScriptHosts` | `string[]` | `localhost`、`127.0.0.1`、`::1` | 允许加载插件脚本（`<script>` / 动态 `import`）的主机名 |
| `bridgeAllowedPathPrefixes` | `string[]` | `['/api/']` | `hostApi.getBridge().request(path)` 允许的 URL 前缀（须以 `/` 开头） |
| `bootstrapSummary` | `boolean` \| `undefined` | `undefined` | 是否打印 bootstrap 结束摘要；`undefined` 时由 `VITE_PLUGINS_BOOTSTRAP_SUMMARY` 或开发模式决定 |

### 环境变量一览（`PLUGIN_*` 同名等价）

| 环境变量（`PLUGIN_…` 同理） | 作用 |
|-----------------------------|------|
| `VITE_FRONTEND_PLUGIN_BASE` | `manifestBase` |
| `VITE_WEB_PLUGIN_MANIFEST_PATH` | `manifestListPath` |
| `VITE_WEB_PLUGIN_MANIFEST_CREDENTIALS` | `manifestFetchCredentials`（仅上述三取值） |
| `VITE_WEB_PLUGIN_DEV_ORIGIN` | `webPluginDevOrigin` |
| `VITE_WEB_PLUGIN_DEV_IDS` | `webPluginDevIds`（逗号分隔） |
| `VITE_WEB_PLUGIN_DEV_MAP` | `webPluginDevMapJson` |
| `VITE_WEB_PLUGIN_DEV_ENTRY` | `webPluginDevEntryPath` |
| `VITE_WEB_PLUGIN_DEV_PING_PATH` | `devPingPath` |
| `VITE_WEB_PLUGIN_DEV_SSE_PATH` | `devReloadSsePath` |
| `VITE_WEB_PLUGIN_DEV_PING_TIMEOUT_MS` | `devPingTimeoutMs`（正整数） |
| `VITE_WEB_PLUGIN_IMPLICIT_DEV_IDS` | 逗号分隔 → `defaultImplicitDevPluginIds`（仅当未在对象里传数组时） |
| `VITE_WEB_PLUGIN_ALLOWED_SCRIPT_HOSTS` | 逗号分隔主机名 → `allowedScriptHosts` |
| `VITE_WEB_PLUGIN_BRIDGE_PREFIXES` | 逗号分隔路径前缀 → `bridgeAllowedPathPrefixes` |
| `VITE_PLUGINS_BOOTSTRAP_SUMMARY` | `0`/`false` 关闭摘要；`1`/`true` 强制开启；未设时在开发模式默认开启 |

### 其它导出

- **`HOST_PLUGIN_API_VERSION`**：宿主与插件约定的 API 版本字符串（与后端清单字段对齐），非 `resolveRuntimeOptions` 配置项。

## 卸载

```js
import { disposeWebPlugin } from 'web-extend-plugin-vue2'

disposeWebPlugin('your.plugin.id')
```

Vue Router 3 无公开 `removeRoute`，动态路由卸载后可能需整页刷新。

## 仓库与协议

- 源码：[extend-plugin-framework / web-extend-plugin-vue2](https://github.com/xtemplus/extend-plugin-framework/tree/master/web-extend-plugin-vue2)
- 许可证：Apache-2.0
