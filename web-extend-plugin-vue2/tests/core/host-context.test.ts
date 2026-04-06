import { describe, it, expect } from 'vitest'
import { freezeShallowHostContext } from '../../src/core/host-context'

describe('freezeShallowHostContext', () => {
  it('returns frozen empty object for non-objects', () => {
    expect(freezeShallowHostContext(undefined)).toEqual({})
    expect(freezeShallowHostContext(null)).toEqual({})
    expect(freezeShallowHostContext([])).toEqual({})
    expect(Object.isFrozen(freezeShallowHostContext({}))).toBe(true)
  })

  it('shallow copies and freezes top-level keys', () => {
    const inner = { n: 1 }
    const src = { a: 1, inner }
    const out = freezeShallowHostContext(src)
    expect(out).toEqual({ a: 1, inner })
    expect(Object.isFrozen(out)).toBe(true)
    expect(() => {
      ;(out as { a?: number }).a = 2
    }).toThrow()
    inner.n = 2
    expect((out.inner as { n: number }).n).toBe(2)
  })
})
