/**
 * 将裸 `{ plugins }` 与 `{ code, data: { plugins } }` 式响应解包为清单对象。
 */
export function unwrapNestedManifestBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null
  }
  const o = body as Record<string, unknown>
  if (Array.isArray(o.plugins)) {
    return o
  }
  const d = o.data
  if (d && typeof d === 'object') {
    const inner = d as Record<string, unknown>
    if (Array.isArray(inner.plugins)) {
      return inner
    }
    if ('plugins' in inner) {
      return inner
    }
  }
  return d !== undefined && d !== null && typeof d === 'object' ? (d as Record<string, unknown>) : o
}
