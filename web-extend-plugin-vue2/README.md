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
- `installHostBridge`
- `registerHostComponents` (legacy)
- `registerVueGlobalComponents` (legacy)
- `registerHostModules` (legacy)
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
  manifest: {
    baseUrl: '/fp-api'
  }
}).catch(console.warn)
```

Minimal host config usually starts with only:

```js
installWebExtendPluginVue2(Vue, router, {
  manifest: {
    baseUrl: '/fp-api',
    listPath: '/api/frontend-plugins'
  },
  host: {
    bridge: {
      modules: { request }
    }
  }
})
```

Add development options or advanced hooks only when the default flow is not enough.

## Vue CLI + axios

```js
import { installWebExtendPluginVue2, createVueCliAxiosInstallOptions } from 'web-extend-plugin-vue2'
import request from '@/utils/request'
import Layout from '@/layout'
import store from '@/store'
import Pagination from '@/components/Pagination'

installWebExtendPluginVue2(
  Vue,
  router,
  createVueCliAxiosInstallOptions(
    { request },
    {
      manifest: {
        listPath: '/frontend-plugins'
      },
      host: {
        context: { router, store },
        bridge: {
          modules: {
            request,
            router,
            store
          },
          components: {
            'app.pagination': Pagination
          }
        },
        route: {
          enabled: true,
          layout: Layout,
          parentName: 'pluginHost'
        }
      }
    }
  )
).catch(console.warn)
```

## Recommended host bridge

Preferred integration is:

- host native Vue globals stay native in plugins, for example `this.$router`, `this.$route`, `this.$store`
- host UI globals stay native in plugins, for example `this.$message`
- extra host business capabilities are exposed through `this.$host`
- extra host components can be registered as direct aliases such as `<app-pagination />`

```js
import {
  installWebExtendPluginVue2,
  createVueCliAxiosInstallOptions
} from 'web-extend-plugin-vue2'

installWebExtendPluginVue2(
  Vue,
  router,
  createVueCliAxiosInstallOptions(
    { request },
    {
      host: {
        bridge: {
          modules: {
            request,
            download,
            bus: Vue.prototype.$bus
          },
          components: {
            'app.pagination': Pagination,
            'app.dict-tag': DictTag
          }
        },
      }
    }
  )
)
```

Then plugin pages can use:

- `this.$message(...)`
- `this.$router.push(...)`
- `this.$host.request(...)`
- `<el-button />`
- `<app-pagination />`

## Legacy registry APIs

The registry-style APIs remain exported for compatibility inside the framework package, but they are no longer the recommended model for plugin development in this project.

Avoid building new plugin pages around:

- `registerHostComponents(...)`
- `registerHostModules(...)`
- `registerVueGlobalComponents(...)`
- `hostApi.getHostComponent(...)`
- `hostApi.getHostModule(...)`

Prefer the host bridge model instead:

- native host globals stay native
- extra business capabilities go through `this.$host`
- extra components are registered as direct aliases

## Runtime options

Core options most hosts need:

- `manifest.baseUrl`: API prefix, default `/fp-api`
- `manifest.listPath`: manifest path segment, default `/api/frontend-plugins`
- `manifest.source`: `api` or `static`
- `manifest.staticUrl`: required when `manifest.source` is `static`
- `host.scriptHosts`: allowed remote script hosts
- `host.requestPathPrefixes`: allowed bridge request path prefixes
- `host.bridge`: preferred way to expose host modules and host components
- `host.context`: readonly host dependencies injected into `hostApi.hostContext`
- `host.capabilities`: optional metadata; prefer `host.bridge` for real capability exposure

Host route integration options:

- `host.route.layout`: layout component for plugin shell route
- `host.route.mountPath`: shell mount path, default `/plugin`
- `host.route.parentName`: explicit parent route name for child plugin routes
- `host.route.enabled`: when `true`, auto-registers the shell route
- `host.route.meta`: meta assigned to the auto-created shell route

Development-only options:

- `dev.enabled`: explicit dev mode override
- `dev.origin`: local plugin dev server origin
- `dev.pluginIds`: plugin ids using the local dev entry
- `dev.pluginMap`: explicit plugin id to dev entry map
- `dev.entryPath`: implicit dev entry path
- `dev.pingPath`: dev server health-check path
- `dev.reloadSsePath`: SSE path for dev reload notifications
- `dev.pingTimeoutMs`: dev server ping timeout
- `dev.manifestFallback.enabled`: whether dev mode falls back to a static manifest
- `dev.manifestFallback.staticUrl`: default `/web-plugins/plugins.manifest.json`
- `dev.bootstrapSummary`: whether to print bootstrap summary logs

Advanced hooks:

- `manifest.fetch`: override manifest loading
- `hooks.transformRoutes`: mutate routes before registration
- `hooks.interceptRegisterRoutes`: take over the default route registration flow
- `hooks.adaptRouteDeclarations`: convert declaration-style routes into Vue Router configs
- `hooks.onRoutesContributed`: observe contributed routes after registration
- `hooks.beforeActivate`: hook before activation
- `hooks.afterActivate`: hook after activation
- `hooks.onActivateError`: hook on activation failure

## Notes

- `host.route.parentName` has no implicit default. Pass it explicitly when you want child routes mounted under a named parent route.
- `installWebExtendPluginVue2` no longer accepts install-only wrapper options. Runtime environment injection should use `setWebExtendPluginEnv(...)`.
- Vue CLI preset helpers were reduced to a single builder: `createVueCliAxiosInstallOptions`.
- If you are unsure where to start, configure only the core options first. Most projects do not need the advanced hooks.
