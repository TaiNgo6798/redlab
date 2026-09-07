import { describe, expect, it } from 'vitest'
import { httpOrigin, originHost, originMismatchMessage } from './permissions'

describe('httpOrigin', () => {
  it('keeps http(s) origins and drops the rest', () => {
    expect(httpOrigin('https://gitlab.example.com/users/sign_in')).toBe('https://gitlab.example.com')
    expect(httpOrigin('https://gitlab.example.com')).toBe('https://gitlab.example.com')
    expect(httpOrigin('chrome://extensions')).toBeNull()
    expect(httpOrigin('not a url')).toBeNull()
  })
})

describe('originHost', () => {
  it('names the bound host', () => {
    expect(originHost('https://gitlab.example.com')).toBe('gitlab.example.com')
    expect(originMismatchMessage('https://gitlab.example.com')).toBe('This OTP is bound to gitlab.example.com')
  })
})
