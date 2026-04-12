# web-extend-plugin-vue2

Vue 2 host runtime for web plugin bootstrap, route registration, host API injection, and extension points.

## Install

```bash
npm i web-extend-plugin-vue2@0.3.5
```

Peer dependencies:

- `vue >= 2.6.0 < 3`
- `vue-router >= 3.5.0 < 4`

Published package:

- `web-extend-plugin-vue2@0.3.5`

## Public API

The package now exposes named exports only.

Core runtime:

- `installWebExtendPluginVue2`
- `bootstrapPlugins`
- `resolveRuntimeOptions`
- `ensurePluginHostRoute`
- `createHostApi`
- `disposeWebPlugin`
- `getActivatedPluginIds`
- `getRegisteredTopRouteNamesForPlugin`
- `getContributedRoutesForPlugin`

Utilities:

- `createRequestBridge`
- `createVueCliAxiosInstallOptions`
- `registerHostComponents`
- `registerVueGlobalComponents`
- `registerHostModules`
- `composeManifestFetch`
- `manifestFetchCacheMiddleware`
- `wrapManifestFetchWithCache`
- `setWebExtendPluginEnv`

Constants:

- `HOST_PLUGIN_API_VERSION`
- `RUNTIME_CONSOLE_LABEL`
- `defaultWebExtendPluginRuntime`
- `defaultManifestFetchCache`
- `defaultManifestMode`
- `routeSynthNamePrefix`
- `peerMinimumVersions`
- `webExtendPluginEnvKeys`

Components:

- `ExtensionPoint`

## Quick start

```js
import { installWebExtendPluginVue2, setWebExtendPluginEnv } from 'web-extend-plugin-vue2'

setWebExtendPluginEnv(import.meta.env)

installWebExtendPluginVue2(Vue, router, {
  manifestBase: '/fp-api'
}).catch(console.warn)
```

## Vue CLI + axios

```js
import { installWebExtendPluginVue2, createVueCliAxiosInstallOptions } from 'web-extend-plugin-vue2'
import request from '@/utils/request'
import Layout from '@/layout'
import store from '@/store'

installWebExtendPluginVue2(
  Vue,
  router,
  createVueCliAxiosInstallOptions(
    { request },
    {
      manifestBase: process.env.VUE_APP_BASE_API,
      manifestListPath: '/frontend-plugins',
      hostLayoutComponent: Layout,
      hostContext: { router, store },
      ensurePluginHostRoute: true,
      pluginRoutesParentName: 'pluginHost'
    }
  )
).catch(console.warn)
```

## Host exposes

Preferred host integration uses concrete component/module exposes instead of relying on `hostCapabilities`.

```js
import {
  installWebExtendPluginVue2,
  createVueCliAxiosInstallOptions,
  registerHostComponents,
  registerVueGlobalComponents,
  registerHostModules
} from 'web-extend-plugin-vue2'

registerVueGlobalComponents(Vue, {
  include: (name) => /^El[A-Z]/.test(name),
  mapName: (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
})

registerHostComponents({
  'app.pagination': Pagination,
  'app.dict-tag': DictTag
})

registerHostModules({
  request,
  download
})
```

Plugins should depend on stable expose names such as `el-button`, `app.pagination`, or `request`.

## Important runtime options

- `manifestBase`: API prefix, default `/fp-api`
- `manifestListPath`: manifest path segment, default `/api/frontend-plugins`
- `manifestMode`: `api` or `static`
- `staticManifestUrl`: required when `manifestMode` is `static`
- `devManifestFallback`: whether dev mode falls back to a static manifest
- `devFallbackStaticManifestUrl`: default `/web-plugins/plugins.manifest.json`
- `allowedScriptHosts`: allowed remote script hosts
- `bridgeAllowedPathPrefixes`: allowed bridge request path prefixes
- `hostLayoutComponent`: layout component for plugin shell route
- `pluginMountPath`: shell mount path, default `/plugin`
- `pluginRoutesParentName`: explicit parent route name for child plugin routes
- `ensurePluginHostRoute`: when `true`, auto-registers the shell route
- `hostContext`: readonly host dependencies injected into `hostApi.hostContext`
- `hostCapabilities`: optional legacy metadata; prefer `registerHostComponents` and `registerHostModules`

## Notes

- `pluginRoutesParentName` has no implicit default. Pass it explicitly when you want child routes mounted under a named parent route.
- `installWebExtendPluginVue2` no longer accepts install-only wrapper options. Runtime environment injection should use `setWebExtendPluginEnv(...)`.
- Vue CLI preset helpers were reduced to a single builder: `createVueCliAxiosInstallOptions`.
