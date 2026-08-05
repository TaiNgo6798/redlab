import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentUser, getProjects, type RedmineProject } from '../../../../utils/api'
import type { StatusType } from '../../../shared/types/index'
import { DEFAULT_SETTINGS } from '../consts/defaultSettings'
import type { Settings, SettingsFormData } from '../types/index'
import { settingsSchema } from '../utils/schema'
import { serializeSettings } from '../utils/serializeSettings'

type FieldErrors = Record<string, string>

function toFormData(saved: Partial<Settings>): SettingsFormData {
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
  }
}

function fieldErrorsFromZod(error: { issues: { path: PropertyKey[]; message: string }[] }): FieldErrors {
  const errs: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !errs[key]) errs[key] = issue.message
  }
  return errs
}

function validateSettings(data: SettingsFormData): { ok: true; data: Settings } | { ok: false; errors: FieldErrors } {
  const result = settingsSchema.safeParse(data)
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, errors: fieldErrorsFromZod(result.error) }
}

function originFromUrl(url: string): string {
  return `${url.trim().replace(/\/$/, '')}/*`
}

export function useSettingsManager() {
  const [settings, setSettings] = useState<SettingsFormData>(DEFAULT_SETTINGS)
  const [projects, setProjects] = useState<RedmineProject[]>([])
  const [connectionStatus, setConnectionStatus] = useState<{ message: string; type: StatusType }>({ message: '', type: 'loading' })
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: StatusType }>({ message: '', type: 'loading' })
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({})

  const initialLoadComplete = useRef(false)
  const previousUrl = useRef('')
  const previousGitlabUrl = useRef('')
  const serializedSettingsRef = useRef('')
  const isSavingRef = useRef(false)
  // Always read latest settings inside async callbacks without re-creating them.
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const flashSave = useCallback((message: string, type: StatusType, ms = 2000) => {
    setSaveStatus({ message, type })
    if (message) setTimeout(() => setSaveStatus({ message: '', type: 'loading' }), ms)
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
        const hasPermission = await chrome.permissions.contains({ origins: [originFromUrl(saved.redmineUrl)] })
        if (hasPermission) setProjects(await getProjects(saved.redmineUrl, saved.redmineApiKey))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }

    initialLoadComplete.current = true
  }, [])

  const saveSettingsData = useCallback(async (data: SettingsFormData = settingsRef.current) => {
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
    const redmineUrl = settings.redmineUrl?.trim().replace(/\/$/, '') || ''
    const redmineApiKey = settings.redmineApiKey?.trim() || ''
    if (!redmineUrl || !redmineApiKey) {
      setConnectionStatus({ message: 'Please enter URL and API key', type: 'error' })
      return
    }
    setConnectionStatus({ message: 'Testing...', type: 'loading' })

    try {
      const origin = originFromUrl(redmineUrl)
      const alreadyGranted = await chrome.permissions.contains({ origins: [origin] })
      if (!alreadyGranted) {
        const granted = await chrome.permissions.request({ origins: [origin] })
        if (!granted) {
          setConnectionStatus({ message: 'Permission denied — allow access to connect', type: 'error' })
          return
        }
      }
      const user = await getCurrentUser(redmineUrl, redmineApiKey)
      setConnectionStatus({ message: `Connected as ${user.login}`, type: 'success' })
      setProjects(await getProjects(redmineUrl, redmineApiKey))
    } catch (error) {
      setConnectionStatus({ message: error instanceof Error ? error.message : 'Connection failed', type: 'error' })
    }
  }, [settings.redmineUrl, settings.redmineApiKey])

  const handleSettingsChange = useCallback((updates: Partial<SettingsFormData>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const handleUrlBlur = useCallback(async () => {
    const data = settingsRef.current
    const newUrl = data.redmineUrl?.trim().replace(/\/$/, '') || ''
    if (!newUrl || newUrl === previousUrl.current) return

    const field = settingsSchema.shape.redmineUrl.safeParse(data.redmineUrl)
    if (field.success) {
      const origin = originFromUrl(newUrl)
      const alreadyGranted = await chrome.permissions.contains({ origins: [origin] })
      if (!alreadyGranted) {
        const granted = await chrome.permissions.request({ origins: [origin] }).catch(() => false)
        if (!granted) flashSave('Permission denied — grant access to enable syncing', 'error', 3000)
      }
      if (previousUrl.current) {
        void chrome.permissions.remove({ origins: [originFromUrl(previousUrl.current)] }).catch(() => {})
      }
    }
    void saveSettingsData(data)
  }, [saveSettingsData, flashSave])

  const handleRedmineApiKeyBlur = useCallback(async () => {
    void saveSettingsData()
  }, [saveSettingsData])

  const handleGitlabUrlBlur = useCallback(async () => {
    const data = settingsRef.current
    const newUrl = data.gitlabUrl?.trim().replace(/\/$/, '') || ''
    if (newUrl === previousGitlabUrl.current) return

    let canSave = true
    if (newUrl) {
      try {
        new URL(newUrl)
        const origin = originFromUrl(newUrl)
        const alreadyGranted = await chrome.permissions.contains({ origins: [origin] })
        if (!alreadyGranted) {
          const granted = await chrome.permissions.request({ origins: [origin] }).catch(() => false)
          if (!granted) {
            flashSave('Permission denied — grant access to enable GitLab syncing', 'error', 3000)
            canSave = false
          }
        }
      } catch {
        canSave = false
      }
    }

    if (!canSave) return
    if (previousGitlabUrl.current) {
      void chrome.permissions.remove({ origins: [originFromUrl(previousGitlabUrl.current)] }).catch(() => {})
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

  // Auto-save non-URL fields after a short debounce.
  useEffect(() => {
    if (!initialLoadComplete.current) return
    const currentSerialized = serializeSettings(settings)
    if (currentSerialized === serializedSettingsRef.current) return

    const timeoutId = setTimeout(() => {
      const newUrl = settings.redmineUrl?.trim().replace(/\/$/, '') || ''
      const urlChanged = newUrl !== previousUrl.current && newUrl !== ''
      if (!urlChanged) void saveSettingsData(settings)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [settings, saveSettingsData])

  const exportSettings = useCallback(async () => {
    try {
      const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS) as Settings
      const result = await chrome.runtime.sendMessage({ action: 'exportOtpAuthenticators' }) as any
      const otpItems = Array.isArray(result?.items)
        ? result.items.map((item: any) => ({ name: item.name, secret: item.secret }))
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
      const text = await file.text()
      const json = JSON.parse(text)
      const validSettings = settingsSchema.parse(json)

      if (Array.isArray(json.otpAuthenticators) && json.otpAuthenticators.length > 0) {
        await chrome.runtime.sendMessage({ action: 'importOtpAuthenticators', items: json.otpAuthenticators })
      }

      await chrome.storage.sync.set(validSettings)
      setSettings(validSettings)
      setValidationErrors({})
      previousUrl.current = validSettings.redmineUrl || ''
      previousGitlabUrl.current = validSettings.gitlabUrl || ''
      serializedSettingsRef.current = serializeSettings(validSettings)

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
    connectionStatus,
    saveStatus,
    validationErrors,
    handleSettingsChange,
    handleUrlBlur,
    handleRedmineApiKeyBlur,
    handleGitlabUrlBlur,
    handleGitlabTokenBlur,
    testConnection,
    exportSettings,
    importSettings,
  }
}
