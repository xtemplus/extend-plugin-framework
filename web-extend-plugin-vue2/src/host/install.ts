import { createExtensionPointComponent } from '../components/ExtensionPoint'
import { ensureRegistriesReactive } from '../core/plugin-registries'
import { createHostApi } from './create-host-api'
import { bootstrapPlugins, resolveRuntimeOptions } from '../runtime/public-api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installWebExtendPluginVue2(Vue: any, router: any, options?: Record<string, unknown>) {
  if (Vue) {
    ensureRegistriesReactive(Vue)
    Vue.component('ExtensionPoint', createExtensionPointComponent(Vue))
  }

  const runtime = resolveRuntimeOptions(options || {})
  return bootstrapPlugins(router, (id, r, kit) => createHostApi(id, r, kit || {}), runtime)
}
