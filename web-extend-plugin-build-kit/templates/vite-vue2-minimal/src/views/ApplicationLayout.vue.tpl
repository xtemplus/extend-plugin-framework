<template>
  <div class="application-layout">
    <nav class="subnav">
      <router-link :to="{ name: 'plugin-{{routeNameBase}}-index' }" active-class="is-active">
        Overview
      </router-link>
      <router-link :to="{ name: 'plugin-{{routeNameBase}}-detail' }" active-class="is-active">
        Detail
      </router-link>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
  name: '{{libName}}Layout'
}
</script>

<style scoped>
.application-layout {
  padding: 0;
}
.subnav {
  display: flex;
  gap: 12px;
  padding: 0 16px 12px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 12px;
}
.subnav a {
  font-size: 14px;
  color: #606266;
  text-decoration: none;
}
.subnav a.is-active {
  color: #409eff;
  font-weight: 500;
}
</style>
