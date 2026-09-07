export type OtpPickResult =
  | { ok: true; selector: string }
  | { ok: false; cancelled: true }

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tabs[0] ?? null
}

export function injectedPickOtpInput(): Promise<OtpPickResult> {
  const CANCEL = 'redlab-otp-cancel'
  const FLAG = '__redlabOtpPicking'
  const root = globalThis as typeof globalThis & { [FLAG]?: boolean }

  if (root[FLAG]) document.dispatchEvent(new CustomEvent(CANCEL))

  return new Promise((resolve) => {
    root[FLAG] = true
    const previousCursor = document.documentElement.style.cursor
    document.documentElement.style.cursor = 'crosshair'

    let highlighted: HTMLElement | null = null
    let previousOutline = ''

    function cssSelectorFor(el: Element): string {
      const parts: string[] = []
      let node: Element | null = el
      while (node) {
        const tag = node.tagName.toLowerCase()
        if (node.id) {
          parts.unshift(`#${CSS.escape(node.id)}`)
          break
        }
        const parent: Element | null = node.parentElement
        if (!parent) {
          parts.unshift(tag)
          break
        }
        const sameTag = Array.from(parent.children).filter(child => child.tagName === node!.tagName)
        const index = sameTag.indexOf(node) + 1
        parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${index})` : tag)
        node = parent
      }
      return parts.join(' > ')
    }

    function isPickable(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
      if (el instanceof HTMLTextAreaElement) return !el.disabled
      if (!(el instanceof HTMLInputElement) || el.disabled) return false
      return !['hidden', 'button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'color', 'range'].includes(el.type)
    }

    function highlight(el: HTMLElement | null) {
      if (highlighted) highlighted.style.outline = previousOutline
      highlighted = el
      if (el) {
        previousOutline = el.style.outline
        el.style.outline = '3px solid Highlight'
      }
    }

    function cleanup() {
      delete root[FLAG]
      document.documentElement.style.cursor = previousCursor
      highlight(null)
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener(CANCEL, onCancel)
    }

    function finish(result: OtpPickResult) {
      cleanup()
      resolve(result)
    }

    function onMove(event: MouseEvent) {
      highlight(isPickable(event.target) ? event.target : null)
    }

    function onClick(event: MouseEvent) {
      if (!isPickable(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      finish({ ok: true, selector: cssSelectorFor(event.target) })
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      finish({ ok: false, cancelled: true })
    }

    function onCancel() {
      finish({ ok: false, cancelled: true })
    }

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener(CANCEL, onCancel)
  })
}

export function injectedCancelOtpPick(): void {
  document.dispatchEvent(new CustomEvent('redlab-otp-cancel'))
}

export function injectedFillOtp(selector: string, code: string): { ok: true } | { ok: false; error: string } {
  const matches = Array.from(document.querySelectorAll(selector))
  if (matches.length === 0) return { ok: false, error: 'No matching field on this page.' }
  if (matches.length !== 1) return { ok: false, error: 'Too many matches, re-pick.' }
  const el = matches[0]
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return { ok: false, error: 'No matching field on this page.' }
  }

  function setValue(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(field, value)
    else field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function splitGroup(field: HTMLInputElement | HTMLTextAreaElement): HTMLInputElement[] | null {
    if (!(field instanceof HTMLInputElement) || field.maxLength !== 1) return null
    let node: HTMLElement | null = field.parentElement
    while (node && node !== document.documentElement) {
      const boxes = Array.from(node.querySelectorAll('input')).filter((input): input is HTMLInputElement => (
        input instanceof HTMLInputElement && input.maxLength === 1
      ))
      if (boxes.length === 6 && boxes.includes(field)) return boxes
      if (boxes.length > 6) return null
      node = node.parentElement
    }
    return null
  }

  const group = splitGroup(el)
  if (group) {
    const digits = code.split('')
    group.forEach((box, index) => setValue(box, digits[index] ?? ''))
    group[group.length - 1]?.focus()
    return { ok: true }
  }

  setValue(el, code)
  el.focus()
  return { ok: true }
}
