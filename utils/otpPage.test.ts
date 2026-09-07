import { describe, expect, it } from 'vitest'
import { injectedCancelOtpPick, injectedFillOtp, injectedPickOtpInput } from './otpPage'

describe('injected page functions', () => {
  it('use the same cancel event in pick and cancel', () => {
    expect(injectedPickOtpInput.toString()).toContain('redlab-otp-cancel')
    expect(injectedCancelOtpPick.toString()).toContain('redlab-otp-cancel')
  })

  it('keep fill errors inside the serialized fill function', () => {
    const source = injectedFillOtp.toString()
    expect(source).toContain('No matching field on this page.')
    expect(source).toContain('Too many matches, re-pick.')
  })
})
