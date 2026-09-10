import type { ReactNode } from 'react'
import { Button, Input, Popconfirm, Progress, Typography, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useOtpManager } from '../hooks/useOtpManager'

const { Text } = Typography

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
              <Button type="primary" icon={<PlusOutlined />} onClick={otp.saveAuthenticator} className="flex-1">{otp.editingId ? 'Save' : 'Add'}</Button>
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
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-bg-card p-3">
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-normal">{item.name}</span>
                <button type="button" className="inline-block cursor-pointer rounded px-1 py-1 text-left transition hover:text-white/20" onClick={async () => { try { await navigator.clipboard.writeText(item.code); message.success('Copied') } catch { message.error('Failed to copy') } }}>
                  <span className="block text-[28px] font-bold tracking-[0.3em]">{item.code}</span>
                </button>
              </div>
              <div className="flex items-center gap-1 self-center">
                <Progress type="circle" percent={(timeRemaining / otp.stepSeconds) * 100} size={36} format={() => String(timeRemaining)} strokeWidth={10} strokeColor="#22d3ee" railColor="rgba(255,255,255,0.12)" className="[&_.ant-progress-text]:text-[16px] [&_.ant-progress-text]:font-semibold [&_.ant-progress-text]:text-text-primary" />
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => otp.editAuthenticator(item)} />
                <Popconfirm title="Remove authenticator?" description={`This will remove ${item.name}.`} okText="Remove" cancelText="Cancel" okButtonProps={{ danger: true, className: 'remove-confirm-button' }} onConfirm={() => otp.removeAuthenticator(item.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      </OtpPanelCard>
    </main>
  )
}
