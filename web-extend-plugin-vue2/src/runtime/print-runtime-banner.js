import { HOST_PLUGIN_API_VERSION, RUNTIME_CONSOLE_LABEL } from '../constants.js'

let _printed = false

/** 在首次引导插件时打印一行运行时标识（非大块 ASCII art）。 */
export function printRuntimeBannerOnce() {
  if (_printed) {
    return
  }
  _printed = true
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info(`[wep] ${RUNTIME_CONSOLE_LABEL} · host API ${HOST_PLUGIN_API_VERSION}`)
  }
}
