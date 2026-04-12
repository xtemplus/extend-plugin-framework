# web-extend-plugin-build-kit

Vue 2.7 前端插件构建工具包，提供三类能力：

- `web-ext-kit create`：创建前端插件模板工程
- `web-ext-kit validate`：校验 `manifest.json`
- `web-ext-kit pack`：将插件工程打包为宿主可部署的 `dist-pack/<id>/`

同时提供 Vite / Webpack 预设，用于统一插件构建约定。

要求：

- Node.js `>=18.12`
- 主入口 `web-extend-plugin-build-kit` 仅暴露校验、打包与创建能力
- 构建预设请从子路径导入：`web-extend-plugin-build-kit/vite` 或 `web-extend-plugin-build-kit/webpack`

---

## 安装

### 从 npm 安装

```bash
npm add -D web-extend-plugin-build-kit vue

# Vite 工程
npm add -D vite @vitejs/plugin-vue2 vite-plugin-css-injected-by-js

# 或 Webpack 工程
npm add -D webpack webpack-cli webpack-dev-server vue-loader@^15 vue-template-compiler css-loader style-loader
```

说明：

- Vite / Webpack 相关 peerDependencies 均为 optional，按你的构建栈安装即可。
- 新生成模板默认使用 Vite。

### 本地安装

如果你正在本地联调 `web-extend-plugin-build-kit`，可以直接把当前工作区包安装到目标插件工程：

```bash
npm install -D E:\self_project\extend-plugin-framework\web-extend-plugin-build-kit
```

或者在 `package.json` 中写成：

```json
{
  "devDependencies": {
    "web-extend-plugin-build-kit": "file:../extend-plugin-framework/web-extend-plugin-build-kit"
  }
}
```

适用场景：

- 你在本地开发 `web-extend-plugin-build-kit`
- 你希望新生成的插件工程立即验证本地未发布改动
- 你不想等待 npm 发包

---

## CLI

命令统一为 `web-ext-kit`。

| 命令 | 说明 |
|------|------|
| `web-ext-kit create <project-name> ...` | 创建 Vue 2.7 + Vite application 插件模板 |
| `web-ext-kit validate <manifest.json> ...` | 校验 manifest，默认使用包内 schema |
| `web-ext-kit validate ... --schema <path>` | 指定自定义 schema |
| `web-ext-kit pack` | 将当前工程的 `manifest.json` + `dist/` 打包到 `dist-pack/<id>/` |
| `web-ext-kit pack --cwd <dir>` | 指定插件工程根目录 |
| `web-ext-kit pack --clean` | pack 完成后删除工程根目录 `dist/`，最终只保留 `dist-pack/` |

---

## 创建模板

### 标准用法

```bash
npx web-ext-kit create my-plugin --plugin-id com.example.frontend.my-plugin --dev-port 5188
cd my-plugin
npm install
npm run dev
```

首版内置模板特点：

- Vue 2.7 + Vite
- application 类型路由骨架
- 默认包含 `manifest.json`、`vite.config.js`、`src/plugin-entry.js`
- 默认 `npm run pack` 只保留 `dist-pack/`

### 使用本地 build kit 创建模板

如果你的 `web-extend-plugin-build-kit` 还没有发布到 npm，或者你需要验证本地改动，可以直接执行源码里的 CLI：

```bash
node E:\self_project\extend-plugin-framework\web-extend-plugin-build-kit\src\cli.mjs create my-plugin ^
  --plugin-id com.example.frontend.my-plugin ^
  --target-dir E:\self_project\my-plugin
```

创建完成后，进入生成工程，再把依赖切到本地包：

```bash
cd E:\self_project\my-plugin
npm install -D E:\self_project\extend-plugin-framework\web-extend-plugin-build-kit
npm install
```

这样生成工程里的 `web-ext-kit`、`vite preset`、`pack --clean` 都会直接使用你当前工作区的实现。

### 常用参数

```bash
web-ext-kit create <project-name> ^
  --plugin-id com.example.frontend.demo ^
  --plugin-name "Demo Plugin" ^
  --lib-name DemoPlugin ^
  --dev-port 5188 ^
  --target-dir E:\workspace\demo-plugin
```

---

## 推荐脚本

生成模板后的默认脚本如下：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:watch": "vite build --watch",
    "validate:manifest": "web-ext-kit validate manifest.json",
    "pack": "npm run validate:manifest && npm run build && web-ext-kit pack --clean"
  }
}
```

说明：

- `build` 会先产出临时 `dist/`
- `pack --clean` 会把 `dist/` 复制到 `dist-pack/<id>/dist/` 后清理工程根目录 `dist/`
- 所以最终结果只保留 `dist-pack/`

---

## Vite 预设

```javascript
import { defineWebExtendPluginViteConfig } from 'web-extend-plugin-build-kit/vite'

export default defineWebExtendPluginViteConfig({
  entry: 'src/plugin-entry.js',
  libName: 'MyPlugin',
  devPort: 5188
})
```

开发模式下，宿主 dev 映射需要与 `devPublicOrigin` 保持一致。默认读取：

- `VITE_PLUGIN_DEV_ORIGIN`
- 或 `http://localhost:{devPort}`

---

## Webpack 预设

```javascript
import { defineWebExtendPluginWebpackConfig } from 'web-extend-plugin-build-kit/webpack'

export default defineWebExtendPluginWebpackConfig({
  entry: 'src/plugin-entry.js',
  libName: 'MyPlugin',
  devPort: 5188
})
```

建议使用 ESM 配置，例如：

- `webpack.config.mjs`
- 或根目录声明 `"type": "module"`

---

## 部署

将打包产物：

```text
dist-pack/<plugin-id>/
```

拷贝到宿主目录：

```text
plugins/web/<plugin-id>/
```

`dist-pack/<plugin-id>/` 内会包含：

- `manifest.json`
- `dist/main.js`

---

## API

```javascript
import {
  createPluginTemplate,
  validateManifestFile,
  packPluginBundle,
  printPackResult,
  presetVersion
} from 'web-extend-plugin-build-kit'

validateManifestFile('manifest.json')
printPackResult(packPluginBundle(process.cwd(), { cleanSourceDist: true }))
```

---

## 本地联调建议

如果你同时在开发“模板生成器”和“生成出来的插件工程”，推荐流程是：

1. 在 `web-extend-plugin-build-kit` 仓库里修改代码
2. 用源码 CLI 直接生成临时插件工程
3. 在插件工程里安装本地 `web-extend-plugin-build-kit`
4. 执行 `npm run pack` 验证最终产物只剩 `dist-pack/`

这套流程比先发 npm 再测试更可靠，也更适合现在这个阶段。
