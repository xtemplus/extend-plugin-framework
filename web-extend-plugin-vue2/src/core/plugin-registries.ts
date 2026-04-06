/**
 * 宿主侧响应式注册表：扩展点槽位（供布局与 `ExtensionPoint` 消费）。
 * 菜单数据由宿主在 `applyPluginMenuItems` 中自行并入其路由/菜单 state，框架不维护平行菜单列表。
 */
import Vue from 'vue'

export type SlotRegistryItem = {
  pluginId: string
  component: import('vue').Component
  priority: number
  key: string
}

export type PluginRegistriesShape = {
  slots: Record<string, SlotRegistryItem[]>
  /** 槽位变更计数；缓解 Vue2 对动态 `Vue.set(slots, key)` 的依赖收集不完整。 */
  slotRevision: number
}

export const registries = Vue.observable<PluginRegistriesShape>({
  slots: {},
  slotRevision: 0
})
