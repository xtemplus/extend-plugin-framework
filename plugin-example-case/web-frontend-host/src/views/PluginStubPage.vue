<template>
  <div class="plugin-stub">
    <p>此页由清单 <code>routeDeclarations</code> + 宿主 <code>adaptRouteDeclarations</code> 注入。</p>
    <p v-if="metaTitle">title（meta）：{{ metaTitle }}</p>
    <p v-if="hostTag">meta.hostTransformTag：{{ hostTag }}</p>
  </div>
</template>

<script>
export default {
  name: 'PluginStubPage',
  computed: {
    metaTitle() {
      const m = this.$route && this.$route.meta
      return m && m.title
    },
    hostTag() {
      const m = this.$route && this.$route.meta
      return m && m.hostTransformTag
    }
  }
}
</script>

<style scoped>
.plugin-stub {
  padding: 1rem;
  max-width: 40rem;
}
</style>
