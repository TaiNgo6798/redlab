import type { SettingsFormData } from '../types/index'

export function serializeSettings(s: SettingsFormData): string {
  return JSON.stringify({
    redmineUrl: s.redmineUrl?.trim().replace(/\/$/, '') || '',
    redmineApiKey: s.redmineApiKey?.trim() || '',
    gitlabUrl: s.gitlabUrl?.trim().replace(/\/$/, '') || '',
    gitlabToken: s.gitlabToken?.trim() || '',
    badgeDisplayType: s.badgeDisplayType,
    rankingDisplayType: s.rankingDisplayType,
    badgeTimeScope: s.badgeTimeScope,
    hoursPerDay: s.hoursPerDay,
    projectId: s.projectId,
  })
}
