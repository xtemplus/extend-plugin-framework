/**
 * 宿主侧响应式注册表：插件菜单与扩展点槽位（供布局与 `ExtensionPoint` 消费）。
 */
import Vue from 'vue'

/**
 * @type {{
 *   menus: object[],
 *   slots: Record<string, Array<{ pluginId: string, component: import('vue').Component, priority: number, key: string }>>
 * }}
 */
export const registries = Vue.observable({
  menus: [],
  slots: {},
  /** 槽位变更计数；缓解 Vue2 对动态 `Vue.set(slots, key)` 的依赖收集不完整。 */
  slotRevision: 0
})
