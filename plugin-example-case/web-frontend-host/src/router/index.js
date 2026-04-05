import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

export const router = new VueRouter({
  mode: 'history',
  base: import.meta.env.BASE_URL,
  routes: [
    { path: '/', name: 'home', component: Home, meta: { title: '首页' } }
  ]
})

router.afterEach((to) => {
  const t = to.meta && to.meta.title
  if (t) {
    document.title = `${t} · 示例宿主`
  }
})
