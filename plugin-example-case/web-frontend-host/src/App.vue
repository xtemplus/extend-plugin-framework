<template>
  <div id="shell">
    <header class="top">
      <router-link class="brand" to="/">plugin-example 宿主</router-link>
      <nav class="nav">
        <router-link class="nav-link" to="/" exact>首页</router-link>
        <router-link
          v-for="item in menus"
          :key="item.id"
          class="nav-link"
          :to="item.path"
        >
          {{ item.label }}
        </router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script>
import { registries } from 'web-extend-plugin-vue2'

export default {
  name: 'App',
  computed: {
    menus() {
      return registries.menus
    }
  }
}
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
#app {
  min-height: 100vh;
}
#shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  padding: 0.65rem 1.25rem;
  background: #0f172a;
  color: #e2e8f0;
}
.brand {
  font-weight: 700;
  font-size: 1rem;
  color: #f8fafc;
  text-decoration: none;
}
.brand:hover {
  color: #fff;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
}
.nav-link {
  color: #94a3b8;
  text-decoration: none;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-size: 14px;
}
.nav-link:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}
.nav-link.router-link-active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
}
.main {
  flex: 1;
  padding: 1.25rem;
}
</style>
