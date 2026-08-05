import type { z } from 'zod'
import type { settingsSchema } from '../utils/schema'
import type { ConnectionStatus, RedmineProject } from '../../../shared/types/index'

export type Settings = z.infer<typeof settingsSchema>
export type SettingsFormData = z.input<typeof settingsSchema>

export interface SettingsViewProps {
  settings: SettingsFormData
  projects: RedmineProject[]
  onSettingsChange: (updates: Partial<SettingsFormData>) => void
  onTestConnection: () => void
  onTestGitlabConnection: () => void
  onUrlBlur: () => void
  onRedmineApiKeyBlur: () => void
  onGitlabUrlBlur: () => void
  onGitlabTokenBlur: () => void
  onExportSettings: () => void
  onImportSettings: (file: File) => Promise<void>
  redmineConnectionStatus: ConnectionStatus
  gitlabConnectionStatus: ConnectionStatus
  saveStatus: ConnectionStatus
  validationErrors: Record<string, string>
}
