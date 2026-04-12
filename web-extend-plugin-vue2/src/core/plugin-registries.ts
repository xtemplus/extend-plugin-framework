/**
 * Host-side reactive registries for extension-point slot components.
 * Menus/sidebar mapping stays on the host and is not duplicated here.
 */

export type SlotRegistryItem = {
  pluginId: string
  component: import('vue').Component
  priority: number
  key: string
}

export type PluginRegistriesShape = {
  slots: Record<string, SlotRegistryItem[]>
  slotRevision: number
  __wepObservedBy__?: unknown
}

export const registries: PluginRegistriesShape = {
  slots: {},
  slotRevision: 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ensureRegistriesReactive(VueLike: any): PluginRegistriesShape {
  if (!VueLike || typeof VueLike.observable !== 'function') {
    return registries
  }
  if (registries.__wepObservedBy__ === VueLike) {
    return registries
  }

  VueLike.observable(registries)
  Object.defineProperty(registries, '__wepObservedBy__', {
    value: VueLike,
    configurable: true,
    enumerable: false,
    writable: true
  })
  return registries
}
