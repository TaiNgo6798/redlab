import type { ReactNode } from 'react'
import { Button, Input, Popconfirm, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useOtpManager } from '../hooks/useOtpManager'

const { Text } = Typography

function remainingBarColor(secondsLeft: number): string {
  if (secondsLeft <= 3) return 'var(--color-danger)'
  if (secondsLeft <= 7) return 'var(--color-warning)'
  return 'var(--color-accent-light)'
}

function formatOtpCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
}

async function copyOtpCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    message.success('Copied')
  } catch {
    message.error('Failed to copy')
  }
}

function OtpPanelCard({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return (
    <PanelCard className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2"><span className="w-6 flex-shrink-0 text-center text-[18px] leading-none">{icon}</span><h2 className="m-0 text-sm font-semibold">{title}</h2></div>
        {action}
      </div>
      {children}
    </PanelCard>
  )
}

export function OtpView() {
  const otp = useOtpManager()
  const timeRemaining = otp.stepSeconds - Math.floor((otp.currentTick / 1000) % otp.stepSeconds)

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      {otp.isFormOpen && (
        <OtpPanelCard title={otp.editingId ? 'Edit Authenticator' : 'Add Authenticator'} icon="🔐">
          <div className="flex flex-col gap-3">
            <Input placeholder="Name (e.g. GitHub)" value={otp.name} onChange={(e) => otp.setName(e.target.value)} />
            <Input placeholder="Secret code" value={otp.secret} onChange={(e) => otp.setSecret(e.target.value)} />
            <div className="flex gap-2">
              <Button type="primary" onClick={otp.saveAuthenticator} className="flex-1">{otp.editingId ? 'Save' : 'Add'}</Button>
              <Button onClick={() => { otp.setEditingId(null); otp.setName(''); otp.setSecret(''); otp.setStatus(null); otp.setIsFormOpen(false) }}>Cancel</Button>
            </div>
            {otp.status && <Text type={otp.status.type === 'error' ? 'danger' : 'success'} className="text-xs">{otp.status.message}</Text>}
          </div>
        </OtpPanelCard>
      )}

      <OtpPanelCard title="Live OTP Codes" icon="⏳" action={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { otp.setEditingId(null); otp.setName(''); otp.setSecret(''); otp.setStatus(null); otp.setIsFormOpen(true) }} title="Add authenticator" />}>
        <div className="flex flex-col gap-2">
          {otp.codes.length === 0 && <Text type="secondary" className="text-sm">No authenticator yet.</Text>}
          {otp.codes.map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-lg border border-white/10 bg-bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <span className="truncate text-xs font-bold text-text-primary">{item.name}</span>
                <div className="flex items-center gap-0.5 text-xs text-text-secondary flex-shrink-0 [&_.ant-btn]:h-auto! [&_.ant-btn]:px-1.5! [&_.ant-btn]:py-0.5! [&_.ant-btn]:text-[11px]!">
                  <Button
                    type="text"
                    size="small"
                    className="text-text-secondary! hover:text-text-primary!"
                    onClick={() => otp.editAuthenticator(item)}
                  >
                    Edit
                  </Button>
                  <span className="text-white/20 select-none">|</span>
                  <Popconfirm
                    title="Remove authenticator?"
                    description={`This will remove ${item.name}.`}
                    okText="Remove"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true, className: 'remove-confirm-button' }}
                    onConfirm={() => otp.removeAuthenticator(item.id)}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      className="text-danger! hover:opacity-80"
                    >
                      Del
                    </Button>
                  </Popconfirm>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="group inline-flex items-center gap-1.5 cursor-pointer rounded text-left transition hover:text-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
                  onClick={() => copyOtpCode(item.code)}
                >
                  <span className="font-mono text-2xl font-bold tracking-wider tabular-nums text-text-primary group-hover:text-accent-light transition">
                    {formatOtpCode(item.code)}
                  </span>
                </button>
                <span className="text-xs font-bold text-text-secondary tabular-nums flex-shrink-0">
                  {timeRemaining}s
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeRemaining / otp.stepSeconds) * 100}%`,
                    backgroundColor: remainingBarColor(timeRemaining),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </OtpPanelCard>
    </main>
  )
}
