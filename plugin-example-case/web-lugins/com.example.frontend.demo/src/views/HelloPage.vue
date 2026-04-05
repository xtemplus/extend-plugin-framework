<template>
  <div class="hello-page">
    <h2>来自前端插件的路由页</h2>
    <p class="meta">com.example.frontend.demo</p>
    <p class="hint">13331本文件组件 <code>HelloPage.vue</code> 构建产出。</p>
    <p class="hint">code> 构建产出。</p>
  </div>
</template>

<script>
export default {
  name: 'DemoHelloPage'
}
</script>

<style scoped>
.hello-page {
  padding: 16px;
}
h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}
.meta {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}
.hint {
  margin-top: 12px;
  font-size: 0.8125rem;
  color: #475569;
}
code {
  font-size: 0.9em;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
