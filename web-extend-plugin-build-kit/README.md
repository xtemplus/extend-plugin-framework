# web-extend-plugin-build-kit

Vue 2.7 前端扩展插件：**校验 manifest**、**打成可部署目录**、可选 **Vite / Webpack 预设**（var 全局、`vue` 与宿主一致、dev ping + SSE）。

**要求：** Node.js ≥ 18.12。主入口 **`web-extend-plugin-build-kit`** 仅含校验与 pack；**不要**从主包导入构建预设，请用子路径 **`/vite`** 或 **`/webpack`**，以免拉取未安装的构建工具。

---

## 安装

```bash
npm add -D web-extend-plugin-build-kit vue
# 二选一：
npm add -D vite @vitejs/plugin-vue2 vite-plugin-css-injected-by-js
# 或
npm add -D webpack webpack-cli webpack-dev-server vue-loader@^15 vue-template-compiler css-loader style-loader
```

（Vite / Webpack 相关 peer 均为 optional，按栈安装即可。）

## CLI：`web-fp-kit`

| 命令 | 说明 |
|------|------|
| `web-fp-kit validate <manifest.json> …` | 校验；默认 Schema 在包内 `schema/` |
| `web-fp-kit validate … --schema <path>` | 自定义 Schema |
| `web-fp-kit pack` | 当前目录：`manifest.json` + `dist/` → `dist-pack/<id>/` |
| `web-fp-kit pack --cwd <dir>` | 指定插件根目录 |

示例：`manifest.json` 中 `entry` 一般为 `dist/main.js`；**pack 前需已有 `dist/`**。

```json
{
  "scripts": {
    "validate:manifest": "web-fp-kit validate manifest.json",
    "build": "vite build",
    "pack": "npm run validate:manifest && npm run build && web-fp-kit pack"
  }
}
```

（Webpack 工程把 `build` 换成 `webpack build --mode production`，本地调试用 `webpack serve --mode development`。）

## Vite

```javascript
import { defineWebExtendPluginViteConfig } from 'web-extend-plugin-build-kit/vite'

export default defineWebExtendPluginViteConfig({
  entry: 'src/plugin-entry.js',
  libName: 'MyPlugin',
  devPort: 5188
})
```

宿主 dev 映射需与 **`devPublicOrigin`**（默认 `VITE_PLUGIN_DEV_ORIGIN` 或 `http://localhost:{devPort}`）一致。

## Webpack

```javascript
import { defineWebExtendPluginWebpackConfig } from 'web-extend-plugin-build-kit/webpack'

export default defineWebExtendPluginWebpackConfig({
  entry: 'src/plugin-entry.js',
  libName: 'MyPlugin',
  devPort: 5188
})
```

配置宜为 ESM（如 `webpack.config.mjs` 或根目录 `"type": "module"`）。

## 部署与 API

将 **`dist-pack/<id>/`** 拷到宿主 **`plugins/web/<id>/`**。

```javascript
import { validateManifestFile, packPluginBundle, printPackResult, presetVersion } from 'web-extend-plugin-build-kit'

validateManifestFile('manifest.json')
printPackResult(packPluginBundle(process.cwd()))
```

