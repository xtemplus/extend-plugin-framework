<template>
  <button type="button" class="toolbar-demo-btn" @click="onClick">插件按钮</button>
</template>

<script>
export default {
  name: 'DemoToolbar',
  props: {
    page: { type: String, default: '' }
  },
  methods: {
    onClick() {
      window.alert('来自插件工具栏（demo）' + (this.page ? ` · page=${this.page}` : ''))
    }
  }
}
</script>

<style scoped>
.toolbar-demo-btn {
  padding: 6px 12px;
  cursor: pointer;
}
</style>
