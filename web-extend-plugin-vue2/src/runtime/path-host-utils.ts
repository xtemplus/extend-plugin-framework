/**
 * 路径与脚本主机名校验工具。
 */

export function ensureLeadingPath(p: string): string {
  const t = String(p || '').trim()
  if (!t) {
    return '/'
  }
  return t.startsWith('/') ? t : `/${t}`
}

export function normalizeHost(hostname: string): string {
  if (!hostname) {
    return ''
  }
  const h = hostname.toLowerCase()
  if (h.startsWith('[') && h.endsWith(']')) {
    return h.slice(1, -1)
  }
  return h
}

export function buildAllowedScriptHostsSet(hostnames: string[]): Set<string> {
  const s = new Set<string>()
  for (const h of hostnames) {
    const n = normalizeHost(h)
    if (n) {
      s.add(n)
    }
  }
  return s
}

export function isScriptHostAllowed(url: string, hostSet: Set<string>): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    const u = new URL(url, window.location.origin)
    const h = normalizeHost(u.hostname)
    return hostSet.has(h)
  } catch {
    return false
  }
}
