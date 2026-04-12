{
  "name": "{{packageName}}",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:watch": "vite build --watch",
    "validate:manifest": "web-ext-kit validate manifest.json",
    "pack": "npm run validate:manifest && npm run build && web-ext-kit pack --clean"
  },
  "devDependencies": {
    "web-extend-plugin-build-kit": "{{buildKitVersion}}",
    "@vitejs/plugin-vue2": "^2.3.3",
    "vite": "^5.4.11",
    "vite-plugin-css-injected-by-js": "^4.0.1",
    "vue": "^2.7.16"
  }
}
