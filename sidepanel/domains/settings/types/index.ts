import type { z } from 'zod'
import type { settingsSchema } from '../utils/schema'
import type { RedmineProject, StatusType } from '../../../shared/types/index'

export type Settings = z.infer<typeof settingsSchema>
export type SettingsFormData = z.input<typeof settingsSchema>

export interface SettingsViewProps {
  settings: SettingsFormData
  projects: RedmineProject[]
  onSettingsChange: (updates: Partial<SettingsFormData>) => void
  onTestConnection: () => void
  onUrlBlur: () => void
  onRedmineApiKeyBlur: () => void
  onGitlabUrlBlur: () => void
  onGitlabTokenBlur: () => void
  onExportSettings: () => void
  onImportSettings: (file: File) => Promise<void>
  connectionStatus: { message: string; type: StatusType }
  saveStatus: { message: string; type: StatusType }
  validationErrors: Record<string, string>
}
