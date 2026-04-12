import ApplicationLayout from './views/ApplicationLayout.vue'
import ApplicationPage from './views/ApplicationPage.vue'
import ApplicationDetail from './views/ApplicationDetail.vue'

function activate(hostApi) {
  hostApi.registerRoutes([
    {
      path: '{{routeBase}}',
      component: ApplicationLayout,
      redirect: { name: 'plugin-{{routeNameBase}}-index' },
      meta: { title: '{{pluginName}}', order: 36 },
      children: [
        {
          path: '',
          name: 'plugin-{{routeNameBase}}-index',
          meta: { title: 'Overview', order: 1 },
          component: ApplicationPage
        },
        {
          path: 'detail',
          name: 'plugin-{{routeNameBase}}-detail',
          meta: { title: 'Detail', order: 2 },
          component: ApplicationDetail
        }
      ]
    }
  ])
}

window.__PLUGIN_ACTIVATORS__ = window.__PLUGIN_ACTIVATORS__ || {}
window.__PLUGIN_ACTIVATORS__['{{pluginId}}'] = activate
