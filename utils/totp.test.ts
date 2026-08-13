import { describe, it, expect } from 'vitest'
import { generateTotp } from './totp'

// RFC 6238 Appendix B — SHA-1, secret "12345678901234567890"
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('generateTotp', () => {
  it('matches RFC 6238 SHA-1 vectors', async () => {
    expect(await generateTotp(RFC_SECRET, 59 * 1000)).toBe('287082')
    expect(await generateTotp(RFC_SECRET, 1111111109 * 1000)).toBe('081804')
    expect(await generateTotp(RFC_SECRET, 1111111111 * 1000)).toBe('050471')
  })

  it('rejects an empty or garbage secret', async () => {
    await expect(generateTotp('')).rejects.toThrow()
    await expect(generateTotp('????')).rejects.toThrow()
  })
})
