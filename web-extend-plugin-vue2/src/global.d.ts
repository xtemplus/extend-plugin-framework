export {}

declare global {
  interface Window {
    __PLUGIN_ACTIVATORS__?: Record<string, (api: unknown, ctx: unknown) => void | Promise<void>>
  }
}
