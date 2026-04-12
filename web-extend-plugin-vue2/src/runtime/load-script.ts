/**
 * 动态加载脚本（去重与并发合并）。
 */

const loadScriptMemo = new Map<string, Promise<void>>()

function markScriptOwnership(script: HTMLScriptElement, pluginId?: string) {
  if (pluginId) {
    script.setAttribute('data-plugin-asset', pluginId)
  }
}

export function clearLoadedScriptMemo(src?: string) {
  if (typeof src === 'string' && src) {
    loadScriptMemo.delete(src)
    return
  }
  loadScriptMemo.clear()
}

export function loadScript(src: string, pluginId?: string): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('loadScript: no document'))
  }
  if (loadScriptMemo.has(src)) {
    return loadScriptMemo.get(src)!
  }
  const p = new Promise<void>((resolve, reject) => {
    const scripts = document.getElementsByTagName('script')
    for (let i = 0; i < scripts.length; i++) {
      const el = scripts[i]
      if (el.src === src) {
        markScriptOwnership(el, pluginId)
        if (el.getAttribute('data-wep-loaded') === 'true') {
          resolve()
          return
        }
        el.addEventListener(
          'load',
          () => {
            el.setAttribute('data-wep-loaded', 'true')
            resolve()
          },
          { once: true }
        )
        el.addEventListener('error', () => reject(new Error('loadScript failed: ' + src)), { once: true })
        return
      }
    }
    const s = document.createElement('script')
    s.async = true
    s.src = src
    markScriptOwnership(s, pluginId)
    s.onload = () => {
      s.setAttribute('data-wep-loaded', 'true')
      resolve()
    }
    s.onerror = () => reject(new Error('loadScript failed: ' + src))
    document.head.appendChild(s)
  })
  loadScriptMemo.set(src, p)
  p.catch(() => loadScriptMemo.delete(src))
  return p
}
