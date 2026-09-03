import '../styles/global.css'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { antdTheme } from '../styles/antd-theme'
import type { ViewName } from './shared/types/index'
import { AppHeader } from './shared/components/AppHeader'
import { OverviewView } from './domains/overview/components/OverviewView'
import { SettingsView } from './domains/settings/components/SettingsView'
import { OtpView } from './domains/otp/components/OtpView'
import { TicketSyncView } from './domains/ticket-sync/components/TicketSyncView'
import { MockTicketsModal } from './domains/ticket-sync/components/MockTicketsModal'
import { useOverviewData } from './domains/overview/hooks/useOverviewData'
import { useSettingsManager } from './domains/settings/hooks/useSettingsManager'
import { useTicketSync } from './domains/ticket-sync/hooks/useTicketSync'

function App() {
  const [view, setView] = useState<ViewName>('overview')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMockModalOpen, setIsMockModalOpen] = useState(false)

  const overview = useOverviewData()
  const settings = useSettingsManager()
  const ticketSync = useTicketSync()

  useEffect(() => {
    chrome.storage.local.get(['activeView'], (result) => {
      if (result.activeView) {
        setView(result.activeView as ViewName)
      }
      setIsLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (isLoaded) {
      void overview.loadData()
    }
  }, [overview.loadData, isLoaded])

  const handleSetView = (newView: ViewName) => {
    setView(newView)
    void chrome.storage.local.set({ activeView: newView })
    // Hooks stay mounted for the whole panel — re-load when entering a data view
    // so first-time credentials (or cleared ones) are picked up.
    if (newView === 'overview') {
      void overview.loadData()
    }
    if (newView === 'ticket-sync') {
      void ticketSync.refresh()
    }
  }

  if (!isLoaded) return null

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary p-3 text-text-primary">
      <AppHeader
        view={view}
        onOpenOverview={() => handleSetView('overview')}
        onOpenSettings={() => handleSetView('settings')}
        onOpenOtp={() => handleSetView('otp')}
        onOpenTicketSync={() => handleSetView('ticket-sync')}
        onOpenMockPreview={() => setIsMockModalOpen(true)}
      />

      {view === 'overview' && (
        <OverviewView
          currentSettings={overview.currentSettings}
          currentUser={overview.currentUser}
          rankingData={overview.rankingData}
          stats={overview.stats}
          lastSyncedAt={overview.lastSyncedAt}
          showState={overview.showState}
          errorMessage={overview.errorMessage}
          isSyncing={overview.isSyncing}
          onRetry={overview.loadData}
          onSync={() => overview.syncData()}
          onConfigure={() => handleSetView('settings')}
          syncInterval={settings.settings.timelogSyncInterval}
          onSyncIntervalChange={(interval) => settings.handleSettingsChange({ timelogSyncInterval: interval })}
        />
      )}

      {view === 'settings' && (
        <SettingsView
          settings={settings.settings}
          projects={settings.projects}
          onSettingsChange={settings.handleSettingsChange}
          onTestConnection={settings.testConnection}
          onTestGitlabConnection={settings.testGitlabConnection}
          onUrlBlur={settings.handleUrlBlur}
          onRedmineApiKeyBlur={settings.handleRedmineApiKeyBlur}
          onGitlabUrlBlur={settings.handleGitlabUrlBlur}
          onGitlabTokenBlur={settings.handleGitlabTokenBlur}
          onExportSettings={settings.exportSettings}
          onImportSettings={settings.importSettings}
          redmineConnectionStatus={settings.redmineConnectionStatus}
          gitlabConnectionStatus={settings.gitlabConnectionStatus}
          saveStatus={settings.saveStatus}
          validationErrors={settings.validationErrors}
        />
      )}

      {view === 'otp' && <OtpView />}

      {view === 'ticket-sync' && (
        <TicketSyncView
          tickets={ticketSync.tickets}
          showState={ticketSync.showState}
          isSyncing={ticketSync.isSyncing}
          syncProgress={ticketSync.syncProgress}
          error={ticketSync.error}
          onRefresh={ticketSync.refresh}
          onConfigure={() => handleSetView('settings')}
        />
      )}

      <MockTicketsModal
        open={isMockModalOpen}
        onClose={() => setIsMockModalOpen(false)}
      />
    </div>
  )
}

const container = document.getElementById('root') || document.body
const root = createRoot(container)
document.documentElement.classList.add('sidepanel')
root.render(
  <ConfigProvider theme={antdTheme}>
    <App />
  </ConfigProvider>
)
