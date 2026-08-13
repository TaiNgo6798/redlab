const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const DIGITS = 6

function decodeBase32(secret: string): Uint8Array {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '')
  if (!clean) throw new Error('invalid secret')

  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const idx = ALPHABET.indexOf(char)
    if (idx < 0) throw new Error('invalid secret')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 0xff)
    }
  }
  if (bytes.length === 0) throw new Error('invalid secret')
  return new Uint8Array(bytes)
}

/** RFC 6238 TOTP, SHA-1, 30s, 6 digits. */
export async function generateTotp(secret: string, at = Date.now()): Promise<string> {
  const keyBytes = decodeBase32(secret)
  const counter = Math.floor(Math.floor(at / 1000) / STEP_SECONDS)
  const msg = new ArrayBuffer(8)
  const view = new DataView(msg)
  view.setUint32(0, Math.floor(counter / 0x100000000))
  view.setUint32(4, counter >>> 0)

  const raw = new ArrayBuffer(keyBytes.byteLength)
  new Uint8Array(raw).set(keyBytes)
  const key = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg))
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0')
}

export const OTP_STEP_SECONDS = STEP_SECONDS
