/**
 * 在宿主布局中声明扩展点；插件通过 `hostApi.registerSlotComponents(pointId, ...)` 注入组件。
 * 使用纯 render 函数，便于 Rollup 发布 dist，宿主无需再转译 .vue。
 */
import { registries } from '../registries.js'

const SlotErrorBoundary = {
  name: 'SlotErrorBoundary',
  props: { label: String },
  data() {
    return { error: null }
  },
  errorCaptured(err) {
    this.error = err && err.message ? err.message : String(err)
    console.error('[ExtensionPoint] render error in', this.label, err)
    return false
  },
  render(h) {
    if (this.error) {
      return h(
        'div',
        { class: 'plugin-point-error', style: { color: '#c00', fontSize: '12px' } },
        `[插件 ${this.label}] 渲染失败`
      )
    }
    const d = this.$slots.default
    return d && d[0] ? d[0] : h('span')
  }
}

export default {
  name: 'ExtensionPoint',
  components: { SlotErrorBoundary },
  props: {
    pointId: { type: String, required: true },
    slotProps: { type: Object, default: () => ({}) }
  },
  computed: {
    items() {
      void registries.slotRevision
      return registries.slots[this.pointId] || []
    },
    forwardProps() {
      return this.slotProps || {}
    }
  },
  render(h) {
    return h(
      'div',
      {
        class: 'extension-point',
        style: { minHeight: '8px' },
        attrs: { 'data-point-id': this.pointId }
      },
      this.items.map((item) =>
        h(
          SlotErrorBoundary,
          {
            key: item.key,
            props: { label: item.pluginId }
          },
          [h(item.component, { props: this.forwardProps })]
        )
      )
    )
  }
}
