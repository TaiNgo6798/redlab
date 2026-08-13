import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import { Button, Input, InputNumber, Statistic, Typography } from 'antd'
import { DownloadOutlined, EyeInvisibleOutlined, EyeOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import { GlassSelect } from '../../../shared/components/GlassSelect'
import { PanelCard } from '../../../shared/components/PanelCard'
import type { ConnectionStatus, RedmineProject, Settings } from '../../../shared/types/index'

const { Text } = Typography

function StatusMessage({ message, type }: { message: string; type: 'loading' | 'success' | 'error' }) {
  if (!message) return null
  const colorClass = type === 'success' ? 'text-success' : type === 'error' ? 'text-danger' : 'text-text-secondary'
  return <Text className={`block text-xs ${colorClass}`}>{message}</Text>
}

function SettingsPanelCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <PanelCard className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2"><span className="w-6 flex-shrink-0 text-center text-[18px] leading-none">{icon}</span><h2 className="m-0 text-sm font-semibold">{title}</h2></div>
      </div>
      {children}
    </PanelCard>
  )
}

function FieldHelp({ error, children }: { error?: string; children: ReactNode }) {
  if (error) return <Text type="danger" className="mt-1.5 block text-xs">{error}</Text>
  return <Text type="secondary" className="mt-1.5 block text-xs">{children}</Text>
}

export function SettingsView({
  settings,
  projects,
  onSettingsChange,
  onTestConnection,
  onTestGitlabConnection,
  onUrlBlur,
  onRedmineApiKeyBlur,
  onGitlabUrlBlur,
  onGitlabTokenBlur,
  onExportSettings,
  onImportSettings,
  redmineConnectionStatus,
  gitlabConnectionStatus,
  saveStatus,
  validationErrors,
}: {
  settings: Settings
  projects: RedmineProject[]
  onSettingsChange: (updates: Partial<Settings>) => void
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
}) {
  const [redmineApiKeyVisible, setRedmineApiKeyVisible] = useState(false)
  const [gitlabTokenVisible, setGitlabTokenVisible] = useState(false)
  const projectOptions = useMemo(() => projects.map(p => ({ label: p.name, value: p.id.toString() })), [projects])
  const displayOptions = [{ label: 'Logged Hours', value: 'logged' }, { label: 'Remaining Hours', value: 'remaining' }]
  const timeScopeOptions = [{ label: 'Today', value: 'today' }, { label: 'This Week', value: 'week' }, { label: 'This Month', value: 'month' }]
  const calculatedHours = useMemo(() => {
    const hoursPerDay = settings.hoursPerDay || 6.5
    return { weekly: hoursPerDay * 5, monthly: Math.round(hoursPerDay * 22) }
  }, [settings.hoursPerDay])

  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <SettingsPanelCard title="Redmine Connection" icon="🔌"><div className="flex flex-col gap-4"><div><Text strong className="mb-2 block">API URL</Text><Input placeholder="https://your-instance.com" autoComplete="url" status={validationErrors.redmineUrl ? 'error' : undefined} value={settings.redmineUrl} onChange={(e) => onSettingsChange({ redmineUrl: e.target.value })} onBlur={onUrlBlur} /><FieldHelp error={validationErrors.redmineUrl}>Base URL without trailing slash</FieldHelp></div><div><Text strong className="mb-2 block">API Key</Text><Input type={redmineApiKeyVisible ? 'text' : 'password'} placeholder="Your API key" autoComplete="off" status={validationErrors.redmineApiKey ? 'error' : undefined} value={settings.redmineApiKey} onChange={(e) => onSettingsChange({ redmineApiKey: e.target.value })} onBlur={onRedmineApiKeyBlur} suffix={<Button type="text" size="small" icon={redmineApiKeyVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setRedmineApiKeyVisible(!redmineApiKeyVisible)} />} /><FieldHelp error={validationErrors.redmineApiKey}>Find this in your account settings</FieldHelp></div><div className="flex flex-col gap-2 border-t border-white/10 pt-4"><Button icon={<SearchOutlined />} onClick={onTestConnection}>Test Connection</Button><StatusMessage {...redmineConnectionStatus} /></div></div></SettingsPanelCard>
      <SettingsPanelCard title="GitLab Connection" icon="🦊"><div className="flex flex-col gap-4"><div><Text strong className="mb-2 block">GitLab URL</Text><Input placeholder="https://git.example.com" autoComplete="url" status={validationErrors.gitlabUrl ? 'error' : undefined} value={settings.gitlabUrl} onChange={(e) => onSettingsChange({ gitlabUrl: e.target.value })} onBlur={onGitlabUrlBlur} /><FieldHelp error={validationErrors.gitlabUrl}>Base URL without trailing slash (must be https://)</FieldHelp></div><div><Text strong className="mb-2 block">Personal Access Token</Text><Input type={gitlabTokenVisible ? 'text' : 'password'} placeholder="Your GitLab token" autoComplete="off" status={validationErrors.gitlabToken ? 'error' : undefined} value={settings.gitlabToken} onChange={(e) => onSettingsChange({ gitlabToken: e.target.value })} onBlur={onGitlabTokenBlur} suffix={<Button type="text" size="small" icon={gitlabTokenVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setGitlabTokenVisible(!gitlabTokenVisible)} />} /><FieldHelp error={validationErrors.gitlabToken}>Required for Ticket Sync feature</FieldHelp></div><div className="flex flex-col gap-2 border-t border-white/10 pt-4"><Button icon={<SearchOutlined />} onClick={onTestGitlabConnection}>Test Connection</Button><StatusMessage {...gitlabConnectionStatus} /></div></div></SettingsPanelCard>
      <SettingsPanelCard title="Project" icon="📁"><Text strong className="mb-2 block">Default Project</Text><GlassSelect placeholder="Select a project..." value={settings.projectId || undefined} onChange={(value) => onSettingsChange({ projectId: value || null })} options={projectOptions} className="w-full" /><Text type="secondary" className="mt-1.5 block text-xs">Project to show in leaderboard by default</Text></SettingsPanelCard>
      <SettingsPanelCard title="Working Hours" icon="⏱️"><Text strong className="mb-2 block">Hours per Day</Text><InputNumber min={1} max={24} step={0.5} status={validationErrors.hoursPerDay ? 'error' : undefined} value={settings.hoursPerDay} onChange={(value) => onSettingsChange({ hoursPerDay: value ?? 6.5 })} className="w-full" /><FieldHelp error={validationErrors.hoursPerDay}>Expected hours per day (Mon–Fri)</FieldHelp><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-bg-card p-3"><Statistic className="otp-statistic-accent" title={<Text type="secondary" className="text-xs uppercase tracking-wider">Weekly</Text>} value={calculatedHours.weekly} suffix="h" /><Statistic className="otp-statistic-accent" title={<Text type="secondary" className="text-xs uppercase tracking-wider">Monthly</Text>} value={calculatedHours.monthly} suffix="h" /></div></SettingsPanelCard>
      <SettingsPanelCard title="Badge Display" icon="🎯"><div className="flex flex-col gap-4"><div><Text strong className="mb-2 block">Display</Text><GlassSelect value={settings.badgeDisplayType} onChange={(value) => onSettingsChange({ badgeDisplayType: value })} options={displayOptions} className="w-full" /><Text type="secondary" className="mt-1.5 block text-xs">What to show on the extension icon</Text></div><div><Text strong className="mb-2 block">Time Scope</Text><GlassSelect value={settings.badgeTimeScope} onChange={(value) => onSettingsChange({ badgeTimeScope: value })} options={timeScopeOptions} className="w-full" /><Text type="secondary" className="mt-1.5 block text-xs">Time period for your hours</Text></div></div></SettingsPanelCard>
      <SettingsPanelCard title="Ranking Display" icon="🏆"><div className="flex flex-col gap-4"><div><Text strong className="mb-2 block">Display</Text><GlassSelect value={settings.rankingDisplayType} onChange={(value) => onSettingsChange({ rankingDisplayType: value })} options={displayOptions} className="w-full" /><Text type="secondary" className="mt-1.5 block text-xs">What to show in leaderboard (always this month)</Text></div></div></SettingsPanelCard>
      <SettingsPanelCard title="Data Management" icon="💾">
        <div className="flex flex-col gap-3">
          <Text className="text-xs text-text-secondary">Export your settings to a JSON file for backup, or import them on another device.</Text>
          <div className="flex gap-2">
            <Button icon={<DownloadOutlined />} onClick={onExportSettings} className="flex-1">Export Settings</Button>
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} className="flex-1">Import Settings</Button>
            <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void onImportSettings(file)
                e.target.value = ''
              }
            }} />
          </div>
        </div>
      </SettingsPanelCard>
      <div className="min-h-5 text-center"><StatusMessage {...saveStatus} /></div>
    </main>
  )
}
