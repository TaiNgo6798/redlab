/// <reference types="vite/client" />
import { MOCK_TICKETS } from '../domains/ticket-sync/mock/mockTickets'
import { generateTotp, OTP_STEP_SECONDS } from '../../utils/totp'
import { getDateRange, getWorkingDays, type RedmineTimeEntry, type TimeScope } from '../../utils/api'
import { DEFAULT_SETTINGS, type CachedStats, type Stats } from '../shared/types/index'

type StorageChanges = Record<string, chrome.storage.StorageChange>
type StorageListener = (changes: StorageChanges, areaName: string) => void
type StorageKeys = string | string[] | Record<string, unknown> | null | undefined
type MessageHandler = (message: Record<string, any>) => Promise<unknown>
type ApiHandler = (...args: any[]) => Promise<unknown>

interface Authenticator {
  id: string
  name: string
  secret: string
}

const HOURS_PER_DAY = 6.5
const PROJECT = { id: 42, name: 'Orbit Platform' }
const ME = { id: 1, login: 'mia.chen', name: 'Mia Chen' }
const TEAM = [
  ME,
  { id: 2, login: 'jonas.weber', name: 'Jonas Weber' },
  { id: 3, login: 'priya.nair', name: 'Priya Nair' },
  { id: 4, login: 'samuel.okafor', name: 'Samuel Okafor' },
  { id: 5, login: 'lena.fischer', name: 'Lena Fischer' },
  { id: 6, login: 'diego.ramos', name: 'Diego Ramos' },
]
const LOAD_FACTORS = [0.82, 1.04, 0.95, 0.71, 0.88, 0.6]

function timeEntries(scope: TimeScope, users = TEAM): RedmineTimeEntry[] {
  const { from, to } = getDateRange(scope)
  const workingDays = Math.max(1, getWorkingDays(from, to))
  const start = new Date(from)
  const entries: RedmineTimeEntry[] = []
  let id = 1
  for (const [userIndex, user] of users.entries()) {
    const perDay = HOURS_PER_DAY * LOAD_FACTORS[userIndex % LOAD_FACTORS.length]
    for (let day = 0; day < workingDays; day++) {
      const spentOn = new Date(start)
      spentOn.setDate(start.getDate() + day)
      entries.push({ id: id++, hours: Math.round(perDay * 4) / 4, spent_on: spentOn.toISOString().slice(0, 10), user, project: PROJECT })
    }
  }
  return entries
}

function monthStats(): Stats {
  const entries = timeEntries('month')
  const hoursByUser = new Map<number, number>()
  for (const entry of entries) hoursByUser.set(entry.user.id, (hoursByUser.get(entry.user.id) ?? 0) + entry.hours)
  const expectedHours = getWorkingDays(getDateRange('month').from, getDateRange('month').to) * HOURS_PER_DAY
  const loggedHours = hoursByUser.get(ME.id) ?? 0
  return {
    user: ME,
    loggedHours,
    expectedHours,
    remainingHours: Math.max(0, expectedHours - loggedHours),
    todayLoggedHours: 3.75,
    ranking: TEAM.map(user => ({ id: user.id, name: user.name, hours: hoursByUser.get(user.id) ?? 0 })).sort((a, b) => b.hours - a.hours),
    settings: {
      badgeDisplayType: DEFAULT_SETTINGS.badgeDisplayType,
      rankingDisplayType: DEFAULT_SETTINGS.rankingDisplayType,
      badgeTimeScope: DEFAULT_SETTINGS.badgeTimeScope,
      rankingExpectedHours: expectedHours,
      projectId: String(PROJECT.id),
      hoursPerDay: HOURS_PER_DAY,
    },
  }
}

const storageListeners = new Set<StorageListener>()

function storageArea(areaName: string, seed: Record<string, unknown>) {
  const data = new Map(Object.entries(seed))
  const read = (keys?: StorageKeys): Record<string, unknown> => {
    if (keys == null) return Object.fromEntries(data)
    if (typeof keys === 'string') return { [keys]: data.get(keys) }
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, data.get(key)]))
    return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, data.has(key) ? data.get(key) : fallback]))
  }
  const emit = (changes: StorageChanges) => {
    if (Object.keys(changes).length > 0) storageListeners.forEach(listener => listener(changes, areaName))
  }
  return {
    async get(keys?: StorageKeys, callback?: (items: Record<string, unknown>) => void) {
      const result = read(keys)
      callback?.(result)
      return result
    },
    async set(items: Record<string, unknown>) {
      const changes: StorageChanges = {}
      for (const [key, newValue] of Object.entries(items)) {
        changes[key] = { oldValue: data.get(key), newValue }
        data.set(key, newValue)
      }
      emit(changes)
    },
    async remove(keys: string | string[]) {
      const changes: StorageChanges = {}
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        if (data.has(key)) changes[key] = { oldValue: data.get(key) }
        data.delete(key)
      }
      emit(changes)
    },
  }
}

const authenticators: Authenticator[] = [
  { id: 'a1', name: 'GitLab', secret: 'JBSWY3DPEHPK3PXP' },
  { id: 'a2', name: 'Redmine SSO', secret: 'KRSXG5CTMVRXEZLU' },
]

async function otpCodes() {
  const codes = await Promise.all(authenticators.map(async item => ({ ...item, code: await generateTotp(item.secret) })))
  return { stepSeconds: OTP_STEP_SECONDS, generatedAt: Date.now(), codes }
}

const stats = monthStats()
const cachedStats: CachedStats = { lastSyncedAt: Date.now() - 4 * 60_000, stats }

const messageHandlers: Record<string, MessageHandler> = {
  updateBadge: async () => ({ success: true }),
  getStats: async () => stats,
  getCachedStats: async () => cachedStats,
  getOtpCodes: otpCodes,
  addOtpAuthenticator: async ({ name, secret }) => {
    authenticators.push({ id: `a${Date.now()}`, name, secret })
    return { ok: true }
  },
  updateOtpAuthenticator: async ({ id, name, secret }) => {
    const item = authenticators.find(entry => entry.id === id)
    if (!item) return { ok: false, error: 'Authenticator not found.' }
    Object.assign(item, { name, secret })
    return { ok: true }
  },
  removeOtpAuthenticator: async ({ id }) => {
    const index = authenticators.findIndex(entry => entry.id === id)
    if (index >= 0) authenticators.splice(index, 1)
    return { ok: true }
  },
  exportOtpAuthenticators: async () => ({ ok: true, items: authenticators.map(({ name, secret }) => ({ name, secret })) }),
  importOtpAuthenticators: async ({ items }) => {
    for (const item of items as Authenticator[]) authenticators.push({ id: `a${Date.now()}-${item.name}`, name: item.name, secret: item.secret })
    return { ok: true, count: items.length }
  },
}

const apiHandlers: Record<string, ApiHandler> = {
  getCurrentUser: async () => ME,
  getProjects: async () => [PROJECT, { id: 43, name: 'Billing Service' }],
  getTimeEntries: async (_url: string, _key: string, _userId: number, scope: TimeScope) => timeEntries(scope, [ME]),
  getMembersTimeEntries: async (_url: string, _key: string, _projectId: string, scope: TimeScope) => timeEntries(scope),
}

async function sendMessage(message: Record<string, any>) {
  if (message.type === 'API_REQUEST') {
    const handler = apiHandlers[message.action]
    return handler ? handler(...message.args) : { error: `Dev shim has no mock for ${message.action}` }
  }
  const handler = messageHandlers[message.action]
  return handler ? handler(message) : undefined
}

export function installChromeShim() {
  const shim = {
    storage: {
      sync: storageArea('sync', {
        ...DEFAULT_SETTINGS,
        redmineUrl: 'https://redmine.example.com',
        redmineApiKey: 'dev-shim',
        gitlabUrl: 'https://gitlab.example.com',
        gitlabToken: 'dev-shim',
        projectId: String(PROJECT.id),
      }),
      local: storageArea('local', { cachedStats, cachedTickets: MOCK_TICKETS }),
      onChanged: {
        addListener: (listener: StorageListener) => storageListeners.add(listener),
        removeListener: (listener: StorageListener) => storageListeners.delete(listener),
      },
    },
    runtime: { sendMessage },
    permissions: {
      contains: async () => true,
      request: async () => true,
      remove: async () => undefined,
    },
  }
  const target = (globalThis as Record<string, any>).chrome ?? ((globalThis as Record<string, any>).chrome = {})
  Object.assign(target, shim)
}
