import { defineConfig, loadEnv } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiTarget = env.VITE_FP_API_PROXY_TARGET || 'http://localhost:8181'

  return {
    envPrefix: ['VITE_', 'PLUGIN_'],
    plugins: [vue2()],
    resolve: {
      dedupe: ['vue', 'vue-router', 'web-extend-plugin-vue2'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/fp-api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/fp-api/, '')
        }
      }
    }
  }
})
