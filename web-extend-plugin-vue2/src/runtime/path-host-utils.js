/**
 * 路径与脚本主机名校验工具。
 * @module runtime/path-host-utils
 */

/**
 * @param {string} p
 */
export function ensureLeadingPath(p) {
  const t = String(p || '').trim()
  if (!t) {
    return '/'
  }
  return t.startsWith('/') ? t : `/${t}`
}

/**
 * @param {string} hostname
 */
export function normalizeHost(hostname) {
  if (!hostname) {
    return ''
  }
  const h = hostname.toLowerCase()
  if (h.startsWith('[') && h.endsWith(']')) {
    return h.slice(1, -1)
  }
  return h
}

/**
 * @param {string[]} hostnames
 * @returns {Set<string>}
 */
export function buildAllowedScriptHostsSet(hostnames) {
  const s = new Set()
  for (const h of hostnames) {
    const n = normalizeHost(h)
    if (n) {
      s.add(n)
    }
  }
  return s
}

/**
 * @param {string} url
 * @param {Set<string>} hostSet
 */
export function isScriptHostAllowed(url, hostSet) {
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
