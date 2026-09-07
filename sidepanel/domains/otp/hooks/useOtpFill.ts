import { useCallback, useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { ensureOriginPermission, httpOrigin } from '../../../../utils/permissions'
import {
  getActiveTab,
  injectedCancelOtpPick,
  injectedPickOtpInput,
} from '../../../../utils/otpPage'

type PickSession = { id: string; tabId: number }

export function useOtpFill(onTargetSaved: () => Promise<void>) {
  const [pickingId, setPickingId] = useState<string | null>(null)
  const sessionRef = useRef<PickSession | null>(null)

  const cancelPick = useCallback(async () => {
    const session = sessionRef.current
    sessionRef.current = null
    setPickingId(null)
    if (session == null) return
    try {
      await chrome.scripting.executeScript({ target: { tabId: session.tabId }, func: injectedCancelOtpPick })
    } catch {
      // tab may already be gone
    }
  }, [])

  const pickTarget = useCallback(async (id: string) => {
    if (sessionRef.current) await cancelPick()

    const tab = await getActiveTab()
    if (!tab?.id) {
      message.error('No page to pick from.')
      return
    }
    const origin = httpOrigin(tab.url ?? '')
    if (!origin) {
      message.error('Cannot pick on this page.')
      return
    }
    if (!(await ensureOriginPermission(origin))) {
      message.error('Permission not granted.')
      return
    }

    sessionRef.current = { id, tabId: tab.id }
    setPickingId(id)
    message.info('Click the OTP input on the page to select it.', 5)
    try {
      const injection = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectedPickOtpInput,
      })
      const result = injection[0]?.result
      if (sessionRef.current?.id !== id) return
      if (!result?.ok) return
      const saved = await chrome.runtime.sendMessage({
        action: 'setOtpFillTarget',
        id,
        origin,
        selector: result.selector,
      }) as { ok?: boolean; error?: string }
      if (!saved?.ok) {
        message.error(saved?.error || 'Failed to save fill target.')
        return
      }
      message.success('Target saved')
      await onTargetSaved()
    } catch {
      if (sessionRef.current?.id === id) message.error('Cannot pick on this page.')
    } finally {
      if (sessionRef.current?.id === id) {
        sessionRef.current = null
        setPickingId(null)
      }
    }
  }, [cancelPick, onTargetSaved])

  const fillCode = useCallback(async (item: { id: string; fillOrigin?: string }) => {
    if (!item.fillOrigin) return
    if (!(await ensureOriginPermission(item.fillOrigin))) {
      message.error('Permission not granted.')
      return
    }

    const result = await chrome.runtime.sendMessage({ action: 'fillOtp', id: item.id }) as { ok?: boolean; error?: string }
    if (!result?.ok) {
      message.error(result?.error || 'Cannot fill this page.')
      return
    }
    message.success('Filled')
  }, [])

  useEffect(() => () => { void cancelPick() }, [cancelPick])

  return { pickingId, pickTarget, cancelPick, fillCode }
}
