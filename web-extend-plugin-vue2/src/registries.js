/**
 * 宿主全局响应式注册表：菜单与扩展点槽位，供布局与 `ExtensionPoint` 订阅。
 *
 * @module registries
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
  /** 扩展点 id → 已注册组件列表（内容区 / 工具栏等共用模型） */
  slots: {},
  /**
   * 每次变更 slots 时递增，供 ExtensionPoint 计算属性显式依赖。
   * Vue 2 对「先访问不存在的 slots[key]、后 Vue.set 补 key」的依赖收集不可靠，会导致扩展点不刷新。
   */
  slotRevision: 0
})
