import { describe, expect, it } from 'vitest'
import { parseTimelogSyncInterval, TimelogSyncInterval } from './index'

describe('parseTimelogSyncInterval', () => {
  it('keeps a known interval', () => {
    expect(parseTimelogSyncInterval(TimelogSyncInterval.FiveMinutes)).toBe(TimelogSyncInterval.FiveMinutes)
    expect(parseTimelogSyncInterval(60)).toBe(TimelogSyncInterval.OneHour)
  })

  it('defaults unknown values to 1 minute', () => {
    expect(parseTimelogSyncInterval(undefined)).toBe(TimelogSyncInterval.OneMinute)
    expect(parseTimelogSyncInterval(7)).toBe(TimelogSyncInterval.OneMinute)
    expect(parseTimelogSyncInterval('1')).toBe(TimelogSyncInterval.OneMinute)
  })
})
