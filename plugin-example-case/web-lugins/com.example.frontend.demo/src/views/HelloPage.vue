<template>
  <div class="hello-page">
    <h2>Plugin Route Page</h2>
    <p class="meta">com.example.frontend.demo</p>
    <p class="hint">This page demonstrates how a plugin can consume host-exposed components and modules.</p>

    <section class="card">
      <h3>Host Component: Element UI</h3>
      <component
        :is="hostButton"
        v-if="hostButton"
        type="primary"
        size="mini"
        @click="handleHostButtonClick"
      >
        Click to use host message
      </component>
      <p v-else class="warn">Host component <code>el-button</code> is not available.</p>
    </section>

    <section class="card">
      <h3>Host Component: Custom Business Component</h3>
      <component
        :is="hostPagination"
        v-if="hostPagination"
        :total="48"
        :page.sync="pageNum"
        :limit.sync="pageSize"
      />
      <p v-else class="warn">Host component <code>app.pagination</code> is not available.</p>
    </section>

    <section class="card">
      <h3>Host Modules</h3>
      <button class="plugin-btn" type="button" @click="inspectHostModules">Inspect host modules</button>
      <pre class="code">{{ moduleSummary }}</pre>
    </section>
  </div>
</template>

<script>
export default {
  name: 'DemoHelloPage',
  props: {
    hostApi: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      pageNum: 1,
      pageSize: 10,
      moduleSummary: ''
    }
  },
  computed: {
    hostButton() {
      return this.hostApi && typeof this.hostApi.getHostComponent === 'function'
        ? this.hostApi.getHostComponent('el-button')
        : null
    },
    hostPagination() {
      return this.hostApi && typeof this.hostApi.getHostComponent === 'function'
        ? this.hostApi.getHostComponent('app.pagination')
        : null
    }
  },
  methods: {
    handleHostButtonClick() {
      const message = this.hostApi && typeof this.hostApi.getHostModule === 'function'
        ? this.hostApi.getHostModule('message')
        : null

      if (typeof message === 'function') {
        message({
          type: 'success',
          message: 'This toast is rendered by the host Element UI message module.'
        })
        return
      }

      window.console.log('[demo-plugin] host message module is unavailable')
    },
    inspectHostModules() {
      const getHostModule = this.hostApi && typeof this.hostApi.getHostModule === 'function'
        ? this.hostApi.getHostModule.bind(this.hostApi)
        : null

      const summary = {
        request: typeof (getHostModule ? getHostModule('request') : undefined),
        download: typeof (getHostModule ? getHostModule('download') : undefined),
        router: typeof (getHostModule ? getHostModule('router') : undefined),
        store: typeof (getHostModule ? getHostModule('store') : undefined),
        message: typeof (getHostModule ? getHostModule('message') : undefined)
      }

      this.moduleSummary = JSON.stringify(summary, null, 2)
    }
  },
  mounted() {
    this.inspectHostModules()
  }
}
</script>

<style scoped>
.hello-page {
  padding: 16px;
  display: grid;
  gap: 12px;
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
  margin: 0;
  font-size: 0.875rem;
  color: #475569;
}
.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
}
.card h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}
.plugin-btn {
  border: 0;
  background: #0f172a;
  color: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
}
.plugin-btn:hover {
  background: #1e293b;
}
.warn {
  margin: 0;
  color: #b45309;
}
.code {
  margin: 12px 0 0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: #334155;
  overflow: auto;
}
code {
  font-size: 0.9em;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
