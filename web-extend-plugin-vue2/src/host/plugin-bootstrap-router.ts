/**
 * 引导时注入的 router 引用，供 disposeWebPlugin 卸载插件动态路由。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bootstrapRouter: any

/** 由 bootstrapPlugins 在浏览器环境调用 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setPluginBootstrapRouter(router: any) {
  bootstrapRouter = router
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPluginBootstrapRouter(): any {
  return bootstrapRouter
}
