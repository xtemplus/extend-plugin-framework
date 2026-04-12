import { createExtensionPointComponent } from '../components/ExtensionPoint'
import { ensureRegistriesReactive } from '../core/plugin-registries'
import { createHostApi } from './create-host-api'
import { installHostBridge } from './install-host-bridge'
import { bootstrapPlugins, resolveRuntimeOptions } from '../runtime/public-api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installWebExtendPluginVue2(Vue: any, router: any, options?: Record<string, unknown>) {
  const runtime = resolveRuntimeOptions(options)
  if (Vue) {
    ensureRegistriesReactive(Vue)
    Vue.component('ExtensionPoint', createExtensionPointComponent(Vue))
    if (runtime.hostBridge && typeof runtime.hostBridge === 'object') {
      installHostBridge(Vue, runtime.hostBridge)
    }
  }

  return bootstrapPlugins(router, createHostApi, runtime)
}
