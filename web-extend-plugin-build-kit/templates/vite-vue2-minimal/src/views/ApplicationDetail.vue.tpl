<template>
  <div class="application-detail">
    <h2>Nested Route Demo</h2>
    <p class="meta">Route name: <code>plugin-{{routeNameBase}}-detail</code></p>
    <p class="hint">URL: <code>/plugin/{{routeBase}}/detail</code> under the host plugin layout.</p>
    <p class="hint">This page shows that route trees with <code>children</code> work without extra host wrappers.</p>
  </div>
</template>

<script>
export default {
  name: '{{libName}}DetailPage'
}
</script>

<style scoped>
.application-detail {
  padding: 0 16px 16px;
}
h2 {
  margin: 0 0 8px;
  font-size: 1.15rem;
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
