import { describe, it, expect } from 'vitest'
import { validateSettings } from './useSettingsManager'
import { DEFAULT_SETTINGS, TimelogSyncInterval } from '../../../shared/types/index'

describe('validateSettings', () => {
  it('accepts a valid https Redmine URL and trims slash', () => {
    const result = validateSettings({
      ...DEFAULT_SETTINGS,
      redmineUrl: 'https://bugtracker.example.com/',
      redmineApiKey: 'key',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.redmineUrl).toBe('https://bugtracker.example.com')
  })

  it('rejects missing URL, http URL, and empty API key', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS }).ok).toBe(false)
    expect(validateSettings({ ...DEFAULT_SETTINGS, redmineUrl: 'http://x.com', redmineApiKey: 'k' }).ok).toBe(false)
    expect(validateSettings({ ...DEFAULT_SETTINGS, redmineUrl: 'https://x.com', redmineApiKey: '' }).ok).toBe(false)
  })

  it('coerces an unknown auto-sync interval to 1 minute', () => {
    const result = validateSettings({
      ...DEFAULT_SETTINGS,
      redmineUrl: 'https://bugtracker.example.com',
      redmineApiKey: 'key',
      timelogSyncInterval: 7 as never,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.timelogSyncInterval).toBe(TimelogSyncInterval.OneMinute)
  })
})
