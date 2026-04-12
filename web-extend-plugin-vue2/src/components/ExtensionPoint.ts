import Vue from 'vue'
import { ensureRegistriesReactive, registries } from '../core/plugin-registries'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createExtensionPointComponent(VueLike: any = Vue) {
  ensureRegistriesReactive(VueLike)

  const SlotErrorBoundary = VueLike.extend({
    name: 'SlotErrorBoundary',
    props: { label: String },
    data() {
      return { error: null as string | null }
    },
    errorCaptured(err: Error | unknown) {
      this.error = err instanceof Error && err.message ? err.message : String(err)
      console.error('[wep:ExtensionPoint]', this.label, err)
      return false
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(h: any): any {
      if (this.error) {
        return h('div', { class: 'plugin-point-error' }, `[插件 ${this.label}] 渲染失败`)
      }
      const d = this.$slots.default
      return d && d[0] ? d[0] : h('span')
    }
  })

  return VueLike.extend({
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
      forwardProps(): Record<string, unknown> {
        return (this.slotProps as Record<string, unknown>) || {}
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(h: any): any {
      return h(
        'div',
        {
          class: 'extension-point',
          attrs: { 'data-point-id': this.pointId }
        },
        (this.items as Array<{ key: string; pluginId: string; component: unknown }>).map((item) =>
          h(
            SlotErrorBoundary,
            {
              key: item.key,
              props: { label: item.pluginId }
            },
            [h(item.component as object, { props: this.forwardProps })]
          )
        )
      )
    }
  })
}

export default createExtensionPointComponent()
