import { defineWebExtendPluginViteConfig } from 'web-extend-plugin-build-kit/vite'

export default defineWebExtendPluginViteConfig({
  entry: 'src/plugin-entry.js',
  libName: '{{libName}}',
  devPort: {{devPort}}
})
