import { Button } from 'antd'
import { BranchesOutlined, KeyOutlined, SettingOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { ViewName } from '../types/index'

interface AppHeaderProps {
  view: ViewName
  onOpenOverview: () => void
  onOpenSettings: () => void
  onOpenOtp: () => void
  onOpenTicketSync: () => void
}

const VIEW_TITLES: Record<ViewName, string> = {
  overview: 'Time Log',
  settings: 'Settings',
  otp: 'OTP Resolver',
  'ticket-sync': 'Ticket Sync',
}

export function AppHeader({ view, onOpenOverview, onOpenSettings, onOpenOtp, onOpenTicketSync }: AppHeaderProps) {
  return (
    <header className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="text-base font-bold tracking-wide leading-none">
            <span style={{ color: '#B11612' }}>Red</span><span style={{ color: '#FC6D26' }}>Lab</span>
          </div>
          <div className="h-3.5 w-[1px] bg-white/20 rounded-full"></div>
          <h1 className="gradient-text m-0 truncate text-sm font-bold leading-none tracking-wide">
            {VIEW_TITLES[view]}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button type={view === 'overview' ? 'primary' : 'text'} size="small" icon={<ClockCircleOutlined />} onClick={onOpenOverview} title="Time Log" />
        <Button type={view === 'ticket-sync' ? 'primary' : 'text'} size="small" icon={<BranchesOutlined />} onClick={onOpenTicketSync} title="Ticket Sync" />
        <Button type={view === 'otp' ? 'primary' : 'text'} size="small" icon={<KeyOutlined />} onClick={onOpenOtp} title="OTP Resolver" />
        <Button type={view === 'settings' ? 'primary' : 'text'} size="small" icon={<SettingOutlined />} onClick={onOpenSettings} title="Settings" />
      </div>
    </header>
  )
}
