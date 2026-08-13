import { useCallback, useEffect, useState } from 'react'

export type OtpStatusType = 'error' | 'success'

export interface OtpCode {
  id: string
  name: string
  secret: string
  code: string
}

export function useOtpManager() {
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [codes, setCodes] = useState<OtpCode[]>([])
  const [stepSeconds, setStepSeconds] = useState(30)
  const [status, setStatus] = useState<{ type: OtpStatusType; message: string } | null>(null)
  const [currentTick, setCurrentTick] = useState(Date.now())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const loadOtpCodes = useCallback(async () => {
    const result = await chrome.runtime.sendMessage({ action: 'getOtpCodes' }) as any
    setCodes(Array.isArray(result?.codes) ? result.codes : [])
    if (typeof result?.stepSeconds === 'number' && result.stepSeconds > 0) setStepSeconds(result.stepSeconds)
  }, [])

  useEffect(() => {
    void loadOtpCodes()
    const interval = setInterval(() => { void loadOtpCodes() }, 1000)
    return () => clearInterval(interval)
  }, [loadOtpCodes])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const saveAuthenticator = useCallback(async () => {
    const trimmedName = name.trim()
    const trimmedSecret = secret.trim().replace(/\s+/g, '')
    if (!trimmedName || !trimmedSecret) {
      setStatus({ type: 'error', message: 'Name and secret are required.' })
      return
    }

    const result = editingId
      ? await chrome.runtime.sendMessage({ action: 'updateOtpAuthenticator', id: editingId, name: trimmedName, secret: trimmedSecret }) as any
      : await chrome.runtime.sendMessage({ action: 'addOtpAuthenticator', name: trimmedName, secret: trimmedSecret }) as any

    if (!result?.ok) {
      setStatus({ type: 'error', message: result?.error || 'Failed to save authenticator.' })
      return
    }

    setName('')
    setSecret('')
    setEditingId(null)
    setIsFormOpen(false)
    setStatus({ type: 'success', message: editingId ? 'Authenticator updated.' : 'Authenticator added.' })
    await loadOtpCodes()
  }, [editingId, loadOtpCodes, name, secret])

  const editAuthenticator = useCallback((item: OtpCode) => {
    setEditingId(item.id)
    setName(item.name)
    setSecret(item.secret)
    setIsFormOpen(true)
    setStatus(null)
  }, [])

  const removeAuthenticator = useCallback(async (id: string) => {
    const result = await chrome.runtime.sendMessage({ action: 'removeOtpAuthenticator', id }) as any
    if (!result?.ok) {
      setStatus({ type: 'error', message: result?.error || 'Failed to remove authenticator.' })
      return
    }

    if (editingId === id) {
      setEditingId(null)
      setName('')
      setSecret('')
    }
    setStatus({ type: 'success', message: 'Authenticator removed.' })
    await loadOtpCodes()
  }, [editingId, loadOtpCodes])

  return {
    name,
    secret,
    codes,
    stepSeconds,
    status,
    currentTick,
    editingId,
    isFormOpen,
    setName,
    setSecret,
    setStatus,
    setEditingId,
    setIsFormOpen,
    saveAuthenticator,
    editAuthenticator,
    removeAuthenticator,
  }
}
