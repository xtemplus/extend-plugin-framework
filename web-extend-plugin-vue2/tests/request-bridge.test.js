import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRequestBridge } from '../src/request-bridge.js'

describe('createRequestBridge', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('allows paths under /api/', async () => {
    const bridge = createRequestBridge()
    await bridge.request('/api/channels')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/channels',
      expect.objectContaining({ credentials: 'same-origin' })
    )
  })

  it('rejects paths outside allowlist', async () => {
    const bridge = createRequestBridge()
    await expect(bridge.request('/fp-api/x')).rejects.toThrow(/not allowed/)
    await expect(bridge.request('http://evil.com/api/x')).rejects.toThrow()
  })

  it('honors custom allowedPathPrefixes', async () => {
    const bridge = createRequestBridge({ allowedPathPrefixes: ['/fp-api/'] })
    await bridge.request('/fp-api/frontend-plugins')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/fp-api/frontend-plugins',
      expect.objectContaining({ credentials: 'same-origin' })
    )
  })
})
