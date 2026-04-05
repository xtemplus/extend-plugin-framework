<template>
  <div class="home">
    <section class="card">
      <h2>扩展点 demo.slot-a</h2>
      <ExtensionPoint point-id="app.host.demo.slot-a" />
    </section>
    <section class="card">
      <h2>扩展点 demo.slot-b</h2>
      <ExtensionPoint point-id="app.host.demo.slot-b" />
    </section>
    <section class="card toolbar-card">
      <h2>工具栏 demo.toolbar</h2>
      <div class="toolbar-row">
        <ExtensionPoint point-id="app.host.demo.toolbar" />
      </div>
    </section>
    <p class="hint">
      启动
      <code>plugin-web-starter</code>
      ，将清单目录指向含本 demo 的
      <code>plugins/web</code>
      ，并运行示例插件工程
      <code>web-lugins/com.example.frontend.demo</code>
      的 Vite（5188）后刷新本页，即可看到菜单与扩展点。
    </p>
  </div>
</template>

<script>
import { ExtensionPoint } from '@extend-plugin-framework/web-extend-plugin-vue2'

export default {
  name: 'Home',
  components: { ExtensionPoint }
}
</script>

<style scoped>
.home {
  max-width: 960px;
}
.card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.card h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
}
.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-height: 36px;
}
.hint {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}
.hint code {
  font-size: 12px;
  background: #f1f5f9;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
</style>
