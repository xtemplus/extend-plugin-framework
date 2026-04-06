import path from 'path'
import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { presetVersion } from './meta.js'

export { presetVersion }

/**
 * @typedef {object} WebExtendPluginVitePresetOptions
 * @property {string} [entry='src/plugin-entry.js'] lib entry relative to project root
 * @property {string} [libName='WebExtendPlugin'] IIFE global name (build only)
 * @property {number} [devPort=5188] dev server port
 * @property {string} [devPublicOrigin] defaults to env VITE_PLUGIN_DEV_ORIGIN or http://localhost:{devPort}
 */

function webPluginDevPingPlugin() {
  return {
    name: 'web-fp-kit-dev-ping',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = req.url.split('?')[0]
        if (u !== '/__web_plugin_dev_ping') {
          return next()
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end('ok')
      })
    }
  }
}

function webPluginReloadSsePlugin() {
  return {
    name: 'web-fp-kit-reload-sse',
    apply: 'serve',
    configureServer(server) {
      const clients = new Set()
      const broadcastReload = () => {
        const dead = []
        for (const clientRes of clients) {
          try {
            clientRes.write('event: reload\ndata: {}\n\n')
          } catch {
            dead.push(clientRes)
          }
        }
        for (const r of dead) {
          clients.delete(r)
        }
      }
      server.watcher.on('change', broadcastReload)
      server.watcher.on('add', broadcastReload)
      server.watcher.on('unlink', broadcastReload)

      server.middlewares.use((req, res, next) => {
        const u = req.url.split('?')[0]
        if (u !== '/__web_plugin_reload_stream') {
          return next()
        }
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
        clients.add(res)
        const ping = setInterval(() => {
          try {
            res.write(': ping\n\n')
          } catch {
            clearInterval(ping)
            clients.delete(res)
          }
        }, 25000)
        req.on('close', () => {
          clearInterval(ping)
          clients.delete(res)
        })
      })
    }
  }
}

function vueFromWindowPlugin() {
  return {
    name: 'web-fp-kit-vue-from-window',
    apply: 'serve',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'vue') {
        return '\0virtual:host-vue'
      }
    },
    load(id) {
      if (id === '\0virtual:host-vue') {
        return 'export default window.Vue'
      }
    }
  }
}

/**
 * Vite config for Vue2.7 frontend plugins: IIFE build, dev ping/SSE, vue → window.Vue.
 * Peer deps: vite, @vitejs/plugin-vue2, vite-plugin-css-injected-by-js, vue.
 *
 * @param {WebExtendPluginVitePresetOptions} [options]
 */
export function defineWebExtendPluginViteConfig(options = {}) {
  const entry = options.entry || 'src/plugin-entry.js'
  const libName = options.libName || 'WebExtendPlugin'
  const devPort = options.devPort ?? 5188
  const devPublicOrigin =
    options.devPublicOrigin ||
    process.env.VITE_PLUGIN_DEV_ORIGIN ||
    `http://localhost:${devPort}`

  return defineConfig(({ command }) => {
    const root = process.cwd()
    const entryAbs = path.resolve(root, entry)

    return {
      plugins: [
        ...(command === 'serve'
          ? [vueFromWindowPlugin(), webPluginDevPingPlugin(), webPluginReloadSsePlugin()]
          : []),
        vue2(),
        ...(command === 'build' ? [cssInjectedByJsPlugin()] : [])
      ],
      server: {
        host: true,
        port: devPort,
        strictPort: true,
        cors: true,
        ...(command === 'serve' ? { origin: devPublicOrigin } : {})
      },
      build: {
        lib: {
          entry: entryAbs,
          name: libName,
          formats: ['iife'],
          fileName: () => 'main.js'
        },
        rollupOptions: {
          external: ['vue'],
          output: {
            globals: { vue: 'Vue' },
            inlineDynamicImports: true
          }
        },
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false
      }
    }
  })
}
