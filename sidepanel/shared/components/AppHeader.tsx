import { Button, Tooltip } from 'antd'
import {
  BranchesOutlined,
  KeyOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ViewName } from '../types/index'

interface AppHeaderProps {
  view: ViewName
  onOpenOverview: () => void
  onOpenSettings: () => void
  onOpenOtp: () => void
  onOpenTicketSync: () => void
  onOpenMockPreview?: () => void
}

const VIEW_TITLES: Record<ViewName, string> = {
  overview: 'Time Log',
  settings: 'Settings',
  otp: 'OTP Resolver',
  'ticket-sync': 'Ticket Sync',
}

export function AppHeader({
  view,
  onOpenOverview,
  onOpenSettings,
  onOpenOtp,
  onOpenTicketSync,
  onOpenMockPreview,
}: AppHeaderProps) {
  return (
    <header className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <div className="text-sm font-bold leading-none">
            <span style={{ color: 'var(--color-brand-red-on-dark)' }}>Red</span>
            <span style={{ color: 'var(--color-brand-orange)' }}>Lab</span>
          </div>
          <div className="hidden h-3.5 w-[1px] rounded-full bg-white/20 min-[360px]:block"></div>
          <div className="flex items-center gap-1 min-w-0">
            <h1 className="m-0 truncate text-accent-light text-[13px] font-bold leading-none min-[360px]:text-sm">
              {VIEW_TITLES[view]}
            </h1>
            {view === 'ticket-sync' && onOpenMockPreview && (
              <Tooltip title="Preview all status cases" placement="bottom">
                <Button
                  type="text"
                  size="small"
                  className="h-4 w-3 p-0 flex items-center justify-center text-white/30 hover:text-accent-light transition-colors"
                  icon={<ExclamationCircleOutlined className="text-[11px]" />}
                  onClick={onOpenMockPreview}
                  aria-label="Preview all status cases"
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button type={view === 'overview' ? 'primary' : 'text'} size="small" icon={<ClockCircleOutlined />} onClick={onOpenOverview} title="Time Log" />
        <Button type={view === 'ticket-sync' ? 'primary' : 'text'} size="small" icon={<BranchesOutlined />} onClick={onOpenTicketSync} title="Ticket Sync" />
        <Button type={view === 'otp' ? 'primary' : 'text'} size="small" icon={<KeyOutlined />} onClick={onOpenOtp} title="OTP Resolver" />
        <Button type={view === 'settings' ? 'primary' : 'text'} size="small" icon={<SettingOutlined />} onClick={onOpenSettings} title="Settings" />
      </div>
    </header>
  )
}

