# web-extend-plugin-vue2

面向 **Vue 2.6+** / **Vue Router 3.x** 宿主的 **Web 前端扩展插件**运行时。在浏览器中拉取插件清单、加载入口脚本、注入 **`hostApi`**（路由 / 菜单 / 扩展点 / 受控请求桥等），并提供 **`ExtensionPoint`** 在布局中挂载插件视图。与后端清单服务、静态资源目录约定配套使用（如 `extend-plugin-framework` 中的 `plugin-web-starter`）。

## 包形态与兼容性

- **发布入口为预构建的 `dist/`（CJS + ESM）**，不含 `.vue` 源码、**运行时无 `import.meta` 语法**，避免 Vue CLI / Webpack 4 宿主再配 `transpileDependencies`、Babel `import.meta` 补丁等与版本强耦合的改动。包内存在模块顶层初始化（如 `registries` 的 `Vue.observable`），**不**声明 `sideEffects: false`，以免宿主打包器误裁剪。
- **Webpack 4 / Vue CLI 4**：`package.json` **不**再声明 `module` 字段，默认解析 **`main` → `dist/index.cjs`**，由 Webpack 正常注入 `require`，避免误选 `index.mjs` 后在浏览器中出现 `require is not defined`。支持 `package.json` **`exports`** 的 Webpack 5、Vite、Rollup 等仍通过 **`import` 条件**使用 `dist/index.mjs`。
- **peer**：`vue` `>=2.6.14 <3`，`vue-router` `>=3.2.0 <4`（与 2.6 / 2.7 主流栈对齐，减轻版本地狱）。
- **Vite 宿主**：通过 `env: import.meta.env` 或 `setWebExtendPluginEnv(import.meta.env)` 注入环境，即可读取文档中的 `VITE_*` 键。

## 安装

```bash
npm add web-extend-plugin-vue2 vue@^2.7 vue-router@^3.6
```

（Vue 2.6 项目请将 `vue` / `vue-template-compiler` 与 `vue-router` 保持与现有工程一致即可。）

## 推荐：一键接入

```js
import Vue from 'vue'
import router from './router'
import { installWebExtendPluginVue2 } from 'web-extend-plugin-vue2'

// Vue CLI：manifestBase 常与 VUE_APP_* 接口前缀一致
installWebExtendPluginVue2(Vue, router, {
  manifestBase: process.env.VUE_APP_BASE_API
}).catch(console.warn)

// Vite：传入 env 以支持 VITE_* 环境变量
// installWebExtendPluginVue2(Vue, router, {
//   env: import.meta.env,
//   manifestBase: import.meta.env.VITE_FRONTEND_PLUGIN_BASE
// }).catch(console.warn)
```

布局中使用：`<ExtensionPoint point-id="..." />`（已由 `installWebExtendPluginVue2` 全局注册）。

## 进阶：按需组合

```js
import Vue from 'vue'
import {
  bootstrapPlugins,
  createHostApi,
  resolveRuntimeOptions,
  ExtensionPoint
} from 'web-extend-plugin-vue2'

Vue.component('ExtensionPoint', ExtensionPoint)

const runtime = resolveRuntimeOptions({
  // 按需覆盖，见 defaultWebExtendPluginRuntime
})

bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit), runtime).catch(console.warn)
```

清单请求 URL 为 **`manifestBase` + `manifestListPath`**（默认 `/fp-api` + `/api/frontend-plugins`）。工厂请使用 **`(id, r, kit) => createHostApi(id, r, kit)`**，以便 bridge 白名单等配置生效。

## 配置与默认值

**优先级（后者覆盖前者）**：`resolveRuntimeOptions` 传入对象中的显式字段 → **注入环境**（`setWebExtendPluginEnv` / `globalThis.__WEP_ENV__` / `install` 的 `env`）→ `process.env`（Webpack `DefinePlugin` 等）→ **`defaultWebExtendPluginRuntime`**。

**环境变量命名**：文档以 **`VITE_*`** 为准；每个键都有等价的 **`PLUGIN_*`**（把前缀 `VITE_` 换成 `PLUGIN_`）。在 **Webpack** 中可将同名键通过 `DefinePlugin` 挂到 `process.env`；在 **Vite** 中请使用 `installWebExtendPluginVue2(..., { env: import.meta.env })` 或先调用 `setWebExtendPluginEnv(import.meta.env)`，并在 `defineConfig` 中配置 `envPrefix`（如含 `PLUGIN_`）以便变量进入 `import.meta.env`。

**`isDev`**：未在对象里写 `isDev` 时，先判断注入环境中的 `DEV === true`，否则使用 `process.env.NODE_ENV === 'development'`。

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

- **`setWebExtendPluginEnv(env)`**：Vite 入口显式注入与 `import.meta.env` 同形态对象。
- **`HOST_PLUGIN_API_VERSION`**：宿主与插件约定的 API 版本字符串（与后端清单字段对齐），非 `resolveRuntimeOptions` 配置项。

## 发布与本地开发

- **npm 发布的包**：`prepublishOnly` 会执行 `npm run build && npm test`，打包容器内已含 **`dist/`**；宿主安装时**不会**再跑构建，也**不需要**本包的 Rollup（避免依赖安装阶段因缺少 devDependencies 而失败）。
- **从仓库 / `file:` 路径引用**：请先在包目录执行 **`npm install && npm run build`**，保证存在 `dist/`，或将 **`dist/` 纳入版本库**后再被其它项目引用。

## 卸载

```js
import { disposeWebPlugin } from 'web-extend-plugin-vue2'

disposeWebPlugin('your.plugin.id')
```

Vue Router 3 无公开 `removeRoute`，动态路由卸载后可能需整页刷新。

## 版本纪要

### 0.2.1

- **Webpack 4 / Vue CLI**：去掉 `package.json` 的 `module` 字段，默认走 **`main`（CJS）**，避免误解析 `index.mjs` 导致浏览器端 `require is not defined`。
- **`exports`**：补充 `default` 指向 CJS，便于仅部分实现 `exports` 条件的工具链兜底。
- **语法兼容**：源码避免 `??` 等 Webpack 4 解析 `node_modules` 内 CJS 时可能不支持的语法，便于无 `transpileDependencies` 开箱接入。

## 仓库与协议

- 源码：[extend-plugin-framework / web-extend-plugin-vue2](https://github.com/xtemplus/extend-plugin-framework/tree/master/web-extend-plugin-vue2)
- 许可证：Apache-2.0
