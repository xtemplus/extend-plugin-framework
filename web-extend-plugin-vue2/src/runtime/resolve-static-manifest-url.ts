/**
 * 将静态清单配置路径解析为用于 fetch 的绝对 URL（浏览器）。
 */
export function resolveStaticManifestUrlForFetch(url: string, origin: string): string {
  const u = String(url || '').trim()
  if (!u) {
    return ''
  }
  if (/^https?:\/\//i.test(u)) {
    return u
  }
  const o = String(origin || '').trim()
  if (!o) {
    return u.startsWith('/') ? u : `/${u}`
  }
  try {
    const pathPart = u.startsWith('/') ? u : `/${u}`
    return new URL(pathPart, o).href
  } catch {
    return u
  }
}
