import { defineWebExtendPluginViteConfig } from 'web-extend-plugin-build-kit/vite'

/** devPublicOrigin 默认读 VITE_PLUGIN_DEV_ORIGIN（见 .env.development），须与宿主 VITE_WEB_PLUGIN_DEV_ORIGIN 一致 */
export default defineWebExtendPluginViteConfig({
  entry: 'src/plugin-entry.js',
  libName: 'FrontendDemoPlugin',
  devPort: 5188
})
