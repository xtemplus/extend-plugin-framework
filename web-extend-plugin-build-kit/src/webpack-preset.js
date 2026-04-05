import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { presetVersion } from './meta.js'

export { presetVersion }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

const { VueLoaderPlugin } = require('vue-loader')

/**
 * @typedef {object} WebExtendPluginWebpackPresetOptions
 * @property {string} [context] 项目根，默认 `process.cwd()`
 * @property {string} [entry='src/plugin-entry.js'] 相对 context
 * @property {string} [libName='WebExtendPlugin'] 输出 `library.name`（var 全局）
 * @property {number} [devPort=5188]
 * @property {boolean} [devServer=true] development 时是否启用 devServer（ping + SSE）
 */

/**
 * Webpack 5 + vue-loader@15 + Vue 2.7：与 Vite 预设行为对齐（IIFE/var、`vue` 外部化、dev 用 window.Vue、ping / SSE）。
 * 使用方需安装 peer：`webpack` `webpack-cli` `webpack-dev-server` `vue-loader@^15` `vue-template-compiler` `vue@^2.7` `css-loader` `style-loader`。
 *
 * `webpack.config.js`：
 * ```js
 * import { defineWebExtendPluginWebpackConfig } from 'web-extend-plugin-build-kit/webpack'
 * export default defineWebExtendPluginWebpackConfig({ libName: 'MyPlugin', devPort: 5188 })
 * ```
 *
 * 脚本：`webpack build --mode production`、`webpack serve --mode development`
 *
 * @param {WebExtendPluginWebpackPresetOptions} [options]
 * @returns {(env: unknown, argv: { mode?: string }) => import('webpack').Configuration}
 */
export function defineWebExtendPluginWebpackConfig(options = {}) {
  const shimPath = path.join(__dirname, 'shims', 'vue-from-window.cjs')
  const sseClients = new Set()

  return (env, argv) => {
    const mode = argv.mode || process.env.NODE_ENV || 'development'
    const isProd = mode === 'production'
    const root = options.context ? path.resolve(options.context) : process.cwd()
    const entryRel = options.entry || 'src/plugin-entry.js'
    const entryAbs = path.resolve(root, entryRel)
    const libName = options.libName || 'WebExtendPlugin'
    const devPort = options.devPort ?? 5188
    const useDevServer = !isProd && options.devServer !== false

    /** @type {import('webpack').Configuration} */
    const config = {
      mode,
      context: root,
      entry: entryAbs,
      output: {
        path: path.resolve(root, 'dist'),
        filename: 'main.js',
        clean: true,
        library: {
          type: 'var',
          name: libName
        }
      },
      externals: {
        vue: 'Vue'
      },
      resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: isProd
          ? {}
          : {
              vue$: shimPath
            }
      },
      module: {
        rules: [
          {
            test: /\.vue$/,
            loader: 'vue-loader'
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
          }
        ]
      },
      plugins: [
        new VueLoaderPlugin(),
        {
          apply(compiler) {
            if (!useDevServer) {
              return
            }
            let firstDone = true
            compiler.hooks.done.tap('web-fp-kit-webpack-reload', (stats) => {
              if (firstDone) {
                firstDone = false
                return
              }
              if (stats.hasErrors()) {
                return
              }
              for (const res of [...sseClients]) {
                try {
                  res.write('event: reload\ndata: {}\n\n')
                } catch {
                  sseClients.delete(res)
                }
              }
            })
          }
        }
      ],
      devtool: isProd ? false : 'eval-cheap-module-source-map'
    }

    if (useDevServer) {
      config.devServer = {
        port: devPort,
        hot: false,
        allowedHosts: 'all',
        headers: { 'Access-Control-Allow-Origin': '*' },
        setupMiddlewares(middlewares, devServer) {
          if (!devServer?.app) {
            return middlewares
          }
          const app = devServer.app

          app.get('/__web_plugin_dev_ping', (req, res) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.status(200).send('ok')
          })

          app.get('/__web_plugin_reload_stream', (req, res) => {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
              'Access-Control-Allow-Origin': '*'
            })
            if (typeof res.flushHeaders === 'function') {
              res.flushHeaders()
            }
            res.write(': dev\n\n')
            sseClients.add(res)
            const ping = setInterval(() => {
              try {
                res.write(': ping\n\n')
              } catch {
                clearInterval(ping)
                sseClients.delete(res)
              }
            }, 25000)
            req.on('close', () => {
              clearInterval(ping)
              sseClients.delete(res)
            })
          })

          return middlewares
        }
      }
    }

    return config
  }
}
