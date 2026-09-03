import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentUser, getGitlabUser, getProjects, type RedmineProject } from '../../../../utils/api'
import {
  ensureOriginPermission,
  hasOriginPermission,
  revokeOriginPermission,
} from '../../../../utils/permissions'
import {
  DEFAULT_SETTINGS,
  parseTimelogSyncInterval,
  type ConnectionStatus,
  type Settings,
  type StatusType,
} from '../../../shared/types/index'

type FieldErrors = Record<string, string>

const EMPTY_STATUS: ConnectionStatus = { message: '', type: 'loading' }

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function urlError(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return 'URL must start with https://'
    return null
  } catch {
    return 'Please enter a valid URL'
  }
}

export function validateSettings(data: Settings): { ok: true; data: Settings } | { ok: false; errors: FieldErrors } {
  const redmineUrl = data.redmineUrl.trim().replace(/\/$/, '')
  const redmineApiKey = data.redmineApiKey.trim()
  const gitlabUrl = data.gitlabUrl.trim().replace(/\/$/, '')
  const gitlabToken = data.gitlabToken.trim()
  const errors: FieldErrors = {}

  if (!redmineUrl) errors.redmineUrl = 'API URL is required'
  else {
    const err = urlError(redmineUrl)
    if (err) errors.redmineUrl = err
  }
  if (!redmineApiKey) errors.redmineApiKey = 'API Key is required'
  if (gitlabUrl) {
    const err = urlError(gitlabUrl)
    if (err) errors.gitlabUrl = err
  }
  if (data.hoursPerDay < 1) errors.hoursPerDay = 'Minimum 1 hour per day'
  else if (data.hoursPerDay > 24) errors.hoursPerDay = 'Maximum 24 hours per day'

  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    data: {
      ...data,
      redmineUrl,
      redmineApiKey,
      gitlabUrl,
      gitlabToken,
      timelogSyncInterval: parseTimelogSyncInterval(data.timelogSyncInterval),
    },
  }
}

function toFormData(saved: Partial<Settings>): Settings {
  return {
    redmineUrl: saved.redmineUrl || '',
    redmineApiKey: saved.redmineApiKey || '',
    gitlabUrl: saved.gitlabUrl || '',
    gitlabToken: saved.gitlabToken || '',
    badgeDisplayType: saved.badgeDisplayType || 'logged',
    rankingDisplayType: saved.rankingDisplayType || 'logged',
    badgeTimeScope: saved.badgeTimeScope || 'month',
    hoursPerDay: saved.hoursPerDay || 6.5,
    projectId: saved.projectId ?? null,
    timelogSyncInterval: parseTimelogSyncInterval(saved.timelogSyncInterval),
  }
}

function serializeSettings(s: Settings): string {
  return JSON.stringify({
    redmineUrl: s.redmineUrl.trim().replace(/\/$/, ''),
    redmineApiKey: s.redmineApiKey.trim(),
    gitlabUrl: s.gitlabUrl.trim().replace(/\/$/, ''),
    gitlabToken: s.gitlabToken.trim(),
    badgeDisplayType: s.badgeDisplayType,
    rankingDisplayType: s.rankingDisplayType,
    badgeTimeScope: s.badgeTimeScope,
    hoursPerDay: s.hoursPerDay,
    projectId: s.projectId,
    timelogSyncInterval: s.timelogSyncInterval,
  })
}

export function useSettingsManager() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [projects, setProjects] = useState<RedmineProject[]>([])
  const [redmineConnectionStatus, setRedmineConnectionStatus] = useState<ConnectionStatus>(EMPTY_STATUS)
  const [gitlabConnectionStatus, setGitlabConnectionStatus] = useState<ConnectionStatus>(EMPTY_STATUS)
  const [saveStatus, setSaveStatus] = useState<ConnectionStatus>(EMPTY_STATUS)
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({})

  const initialLoadComplete = useRef(false)
  const previousUrl = useRef('')
  const previousGitlabUrl = useRef('')
  const serializedSettingsRef = useRef('')
  const isSavingRef = useRef(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const flashSave = useCallback((message: string, type: StatusType, ms = 2000) => {
    setSaveStatus({ message, type })
    if (message) setTimeout(() => setSaveStatus(EMPTY_STATUS), ms)
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS) as Settings
      const loaded = toFormData(saved)

      setSettings(loaded)
      previousUrl.current = loaded.redmineUrl
      previousGitlabUrl.current = loaded.gitlabUrl || ''
      serializedSettingsRef.current = serializeSettings(loaded)

      if (saved.redmineUrl && saved.redmineApiKey) {
        if (await hasOriginPermission(saved.redmineUrl)) {
          setProjects(await getProjects(saved.redmineUrl, saved.redmineApiKey))
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }

    initialLoadComplete.current = true
  }, [])

  const saveSettingsData = useCallback(async (data: Settings = settingsRef.current) => {
    if (isSavingRef.current) return false
    isSavingRef.current = true

    const validated = validateSettings(data)
    if (!validated.ok) {
      setValidationErrors(validated.errors)
      isSavingRef.current = false
      return false
    }

    setValidationErrors({})
    const toSave = validated.data

    try {
      await chrome.storage.sync.set(toSave)
      flashSave('Settings saved!', 'success')
      void chrome.runtime.sendMessage({ action: 'updateBadge' })
      serializedSettingsRef.current = serializeSettings(toSave)
      previousUrl.current = toSave.redmineUrl
      return true
    } catch (error) {
      flashSave(error instanceof Error ? error.message : 'Save failed', 'error', 3000)
      return false
    } finally {
      isSavingRef.current = false
    }
  }, [flashSave])

  const testConnection = useCallback(async () => {
    const redmineUrl = settingsRef.current.redmineUrl.trim().replace(/\/$/, '') || ''
    const redmineApiKey = settingsRef.current.redmineApiKey.trim() || ''
    if (!redmineUrl || !redmineApiKey) {
      setRedmineConnectionStatus({ message: 'Please enter URL and API key', type: 'error' })
      return
    }
    setRedmineConnectionStatus({ message: 'Testing...', type: 'loading' })

    try {
      const granted = await ensureOriginPermission(redmineUrl)
      if (!granted) {
        setRedmineConnectionStatus({ message: 'Permission denied — allow access to connect', type: 'error' })
        return
      }
      const user = await getCurrentUser(redmineUrl, redmineApiKey)
      setRedmineConnectionStatus({ message: `Connected as ${user.login}`, type: 'success' })
      setProjects(await getProjects(redmineUrl, redmineApiKey))
    } catch (error) {
      setRedmineConnectionStatus({ message: error instanceof Error ? error.message : 'Connection failed', type: 'error' })
    }
  }, [])

  const testGitlabConnection = useCallback(async () => {
    const gitlabUrl = settingsRef.current.gitlabUrl.trim().replace(/\/$/, '') || ''
    const gitlabToken = settingsRef.current.gitlabToken.trim() || ''
    if (!gitlabUrl || !gitlabToken) {
      setGitlabConnectionStatus({ message: 'Please enter URL and token', type: 'error' })
      return
    }
    setGitlabConnectionStatus({ message: 'Testing...', type: 'loading' })

    const granted = await ensureOriginPermission(gitlabUrl)
    if (!granted) {
      setGitlabConnectionStatus({ message: 'Permission denied — allow access to connect', type: 'error' })
      return
    }

    try {
      const user = await getGitlabUser(gitlabUrl, gitlabToken)
      setGitlabConnectionStatus({ message: `Connected as ${user.username}`, type: 'success' })
    } catch (error) {
      setGitlabConnectionStatus({
        message: error instanceof Error ? error.message : 'Connection failed',
        type: 'error',
      })
    }
  }, [])

  const handleSettingsChange = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const handleUrlBlur = useCallback(async () => {
    const data = settingsRef.current
    const newUrl = data.redmineUrl.trim().replace(/\/$/, '') || ''
    if (!newUrl || newUrl === previousUrl.current) return

    if (isHttpsUrl(newUrl)) {
      const granted = await ensureOriginPermission(newUrl)
      if (!granted) flashSave('Permission denied — grant access to enable syncing', 'error', 3000)
      if (previousUrl.current) {
        void revokeOriginPermission(previousUrl.current)
      }
    }
    void saveSettingsData(data)
  }, [saveSettingsData, flashSave])

  const handleRedmineApiKeyBlur = useCallback(async () => {
    void saveSettingsData()
  }, [saveSettingsData])

  const handleGitlabUrlBlur = useCallback(async () => {
    const data = settingsRef.current
    const newUrl = data.gitlabUrl.trim().replace(/\/$/, '') || ''
    if (newUrl === previousGitlabUrl.current) return

    let canSave = true
    if (newUrl) {
      if (!isHttpsUrl(newUrl)) {
        canSave = false
      } else {
        const granted = await ensureOriginPermission(newUrl)
        if (!granted) {
          flashSave('Permission denied — grant access to enable GitLab syncing', 'error', 3000)
          canSave = false
        }
      }
    }

    if (!canSave) return
    if (previousGitlabUrl.current) {
      void revokeOriginPermission(previousGitlabUrl.current)
    }
    previousGitlabUrl.current = newUrl
    void saveSettingsData(data)
  }, [saveSettingsData, flashSave])

  const handleGitlabTokenBlur = useCallback(async () => {
    void saveSettingsData()
  }, [saveSettingsData])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (!initialLoadComplete.current) return
    const currentSerialized = serializeSettings(settings)
    if (currentSerialized === serializedSettingsRef.current) return

    const timeoutId = setTimeout(() => {
      const newUrl = settings.redmineUrl.trim().replace(/\/$/, '') || ''
      const urlChanged = newUrl !== previousUrl.current && newUrl !== ''
      if (!urlChanged) void saveSettingsData(settings)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [settings, saveSettingsData])

  const exportSettings = useCallback(async () => {
    try {
      const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS) as Settings
      const result = await chrome.runtime.sendMessage({ action: 'exportOtpAuthenticators' }) as { items?: { name: string; secret: string }[] }
      const otpItems = Array.isArray(result?.items)
        ? result.items.map((item) => ({ name: item.name, secret: item.secret }))
        : []

      const json = JSON.stringify({ ...saved, otpAuthenticators: otpItems }, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'redlab-settings.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export settings:', error)
      flashSave('Failed to export settings', 'error', 3000)
    }
  }, [flashSave])

  const importSettings = useCallback(async (file: File) => {
    try {
      const json = JSON.parse(await file.text()) as Partial<Settings> & { otpAuthenticators?: unknown }
      const validated = validateSettings(toFormData(json))
      if (!validated.ok) {
        flashSave('Invalid settings file format', 'error', 3000)
        return
      }

      if (Array.isArray(json.otpAuthenticators) && json.otpAuthenticators.length > 0) {
        await chrome.runtime.sendMessage({ action: 'importOtpAuthenticators', items: json.otpAuthenticators })
      }

      await chrome.storage.sync.set(validated.data)
      setSettings(validated.data)
      setValidationErrors({})
      previousUrl.current = validated.data.redmineUrl || ''
      previousGitlabUrl.current = validated.data.gitlabUrl || ''
      serializedSettingsRef.current = serializeSettings(validated.data)
      settingsRef.current = validated.data

      flashSave('Settings imported successfully!', 'success', 3000)
      void chrome.runtime.sendMessage({ action: 'updateBadge' })
    } catch (error) {
      console.error('Failed to import settings:', error)
      flashSave('Invalid settings file format', 'error', 3000)
    }
  }, [flashSave])

  return {
    settings,
    projects,
    redmineConnectionStatus,
    gitlabConnectionStatus,
    saveStatus,
    validationErrors,
    handleSettingsChange,
    handleUrlBlur,
    handleRedmineApiKeyBlur,
    handleGitlabUrlBlur,
    handleGitlabTokenBlur,
    testConnection,
    testGitlabConnection,
    exportSettings,
    importSettings,
  }
}
