<template>
  <div class="extension-point" :data-point-id="pointId">
    <SlotErrorBoundary
      v-for="item in items"
      :key="item.key"
      :label="item.pluginId"
    >
      <component :is="item.component" v-bind="forwardProps" />
    </SlotErrorBoundary>
  </div>
</template>

<script>
/**
 * 在宿主布局中声明扩展点；插件通过 `hostApi.registerSlotComponents(pointId, ...)` 注入组件。
 * 使用 `Vue.observable` 注册表驱动重渲染；子树错误由边界组件捕获，避免拖垮整页。
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
  }
}
</script>

<style scoped>
.extension-point {
  min-height: 8px;
}
</style>
