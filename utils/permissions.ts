/** Host-permission helpers for optional origins (Redmine / GitLab / OTP fill). */

export function originPattern(url: string): string {
  return `${url.trim().replace(/\/$/, '')}/*`
}

export function httpOrigin(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

export function originHost(origin: string): string {
  try {
    return new URL(origin).host
  } catch {
    return origin
  }
}

export function originMismatchMessage(origin: string): string {
  return `This OTP is bound to ${originHost(origin)}`
}

export async function hasOriginPermission(url: string): Promise<boolean> {
  if (!url.trim()) return false
  return chrome.permissions.contains({ origins: [originPattern(url)] })
}

/** Request host access if missing. Must run from a user gesture when not already granted. */
export async function ensureOriginPermission(url: string): Promise<boolean> {
  if (!url.trim()) return false
  const origin = originPattern(url)
  const alreadyGranted = await chrome.permissions.contains({ origins: [origin] })
  if (alreadyGranted) return true
  try {
    return await chrome.permissions.request({ origins: [origin] })
  } catch {
    return false
  }
}

export async function revokeOriginPermission(url: string): Promise<void> {
  if (!url.trim()) return
  try {
    await chrome.permissions.remove({ origins: [originPattern(url)] })
  } catch {
    // ignore — origin may already be gone
  }
}

/** User-facing copy when host permission is missing. Keep wording free of UI control-flow. */
export function permissionErrorMessage(services: string[]): string {
  if (services.length === 0) return 'Permission not granted.'
  if (services.length === 1) {
    return `Permission not granted. Open settings and test the connection to allow ${services[0]} access.`
  }
  return `Permission not granted. Open settings and test the connections to allow ${services.join(' and ')} access.`
}
