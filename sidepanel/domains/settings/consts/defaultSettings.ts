import type { Settings } from '../types/index'

export const DEFAULT_SETTINGS: Settings = {
  redmineUrl: '',
  redmineApiKey: '',
  gitlabUrl: '',
  gitlabToken: '',
  badgeDisplayType: 'logged',
  rankingDisplayType: 'logged',
  badgeTimeScope: 'month',
  hoursPerDay: 6.5,
  projectId: null,
}
