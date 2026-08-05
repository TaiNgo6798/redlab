// Background service worker for RedLab

import {
  getCurrentUser,
  getTimeEntries,
  calculateTotalHours,
  getWorkingDays,
  getDateRange,
  getMembersTimeEntries,
  getProjects,
  getResolvedTickets,
  getGitlabUser,
  searchGitlabMRs,
  getGitlabMR,
  getMRLatestPipelineStatus,
  checkMRDiscussions,
  getOtherUserMRs,
  buildRanking,
  type TimeScope,
  type DisplayType,
  type UserHours,
} from './utils/api';
import { Authenticator } from '@otplib/core';
import { createDigest } from '@otplib/plugin-crypto-js';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';
import { Buffer } from 'buffer/';
import { fetchAndProcessTickets, ticketStateKey } from './utils/ticketSyncEngine';
import {
  hasOriginPermission,
  permissionErrorMessage,
} from './utils/permissions';

;(globalThis as unknown as { Buffer?: typeof Buffer | undefined }).Buffer = Buffer;

// ============== Types ==============

interface Settings {
  redmineUrl: string;
  redmineApiKey: string;
  gitlabUrl: string;
  gitlabToken: string;
  badgeDisplayType: DisplayType;
  rankingDisplayType: DisplayType;
  badgeTimeScope: TimeScope;
  hoursPerDay: number;
  projectId: string | null;
}

type StatsErrorKind = 'not_configured' | 'permission' | 'other';

interface Stats {
  user: {
    id: number;
    login: string;
    name: string;
  };
  loggedHours: number;
  expectedHours: number;
  remainingHours: number;
  todayLoggedHours: number;
  ranking: UserHours[];
  settings: Settings & { rankingExpectedHours: number };
  error?: string;
  errorKind?: StatsErrorKind;
}

interface CachedStats {
  lastSyncedAt: number;
  stats: Stats;
}

interface OtpAuthenticator {
  id: string;
  name: string;
  secret: string;
}

interface OtpCode {
  id: string;
  name: string;
  secret: string;
  code: string;
}

// ============== Constants ==============

const DEFAULT_SETTINGS: Settings = {
  redmineUrl: '',
  redmineApiKey: '',
  gitlabUrl: '',
  gitlabToken: '',
  badgeDisplayType: 'logged', // 'logged' or 'remaining' - for badge
  rankingDisplayType: 'logged', // 'logged' or 'remaining' - for ranking
  badgeTimeScope: 'month', // 'today', 'week', 'month' - for badge display
  hoursPerDay: 6.5,
  projectId: null
};

// Update interval in minutes
const UPDATE_INTERVAL = 1;
const OTP_STORAGE_KEY = 'otpAuthenticators';
const OTP_STEP_SECONDS = 30;

type OtpAuthenticatorGenerator = {
  options: { step?: number; digits?: number };
  generate: (secret: string) => string;
};

let otpAuthenticator: OtpAuthenticatorGenerator | null = null;

// ============== Alarms ==============

// Initialize alarms
chrome.alarms.create('updateBadge', { periodInMinutes: UPDATE_INTERVAL });
chrome.alarms.create('ticketSync', { periodInMinutes: 5 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBadge') {
    void updateBadge();
  } else if (alarm.name === 'ticketSync') {
    void runTicketSyncBackground();
  }
});

// ============== Storage Listeners ==============

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    void chrome.storage.local.remove('cachedStats');
    void updateBadge();
  }
});

// ============== Message Listeners ==============

// Listen for messages from UI contexts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    void updateBadge().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'getStats') {
    void getStats().then(stats => sendResponse(stats));
    return true;
  }
  if (message.action === 'getCachedStats') {
    void getCache().then(cached => sendResponse(cached));
    return true;
  }
  if (message.action === 'getOtpCodes') {
    void getOtpCodes().then(codes => sendResponse(codes));
    return true;
  }
  if (message.action === 'addOtpAuthenticator') {
    void addOtpAuthenticator(message.name, message.secret).then(response => sendResponse(response));
    return true;
  }
  if (message.action === 'updateOtpAuthenticator') {
    void updateOtpAuthenticator(message.id, message.name, message.secret).then(response => sendResponse(response));
    return true;
  }
  if (message.action === 'removeOtpAuthenticator') {
    void removeOtpAuthenticator(message.id).then(response => sendResponse(response));
    return true;
  }
  if (message.action === 'exportOtpAuthenticators') {
    void exportOtpAuthenticators().then(response => sendResponse(response));
    return true;
  }
  if (message.action === 'importOtpAuthenticators') {
    void importOtpAuthenticators(message.items).then(response => sendResponse(response));
    return true;
  }

  // Handle API requests from UI contexts
  if (message.type === 'API_REQUEST') {
    const { action, args } = message;
    
    // Create a map of functions to call
    const apiFunctions: Record<string, any> = {
      getCurrentUser,
      getTimeEntries,
      getProjects,
      getMembersTimeEntries,
      getResolvedTickets,
      getGitlabUser,
      searchGitlabMRs,
      getGitlabMR,
      getMRLatestPipelineStatus,
      checkMRDiscussions,
      getOtherUserMRs,
    };

    if (apiFunctions[action]) {
      apiFunctions[action](...args)
        .then((result: any) => {
          if (result && result.error) {
             sendResponse({ error: result.error });
          } else {
             sendResponse(result);
          }
        })
        .catch((error: Error) => sendResponse({ error: error.message }));
      return true;
    }
  }
});

// ============== Lifecycle Events ==============

// Initial update on install/startup
chrome.runtime.onInstalled.addListener(() => {
  void updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  void updateBadge();
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.windowId) return;

  void chrome.sidePanel.open({ windowId: tab.windowId });
});

// ============== Badge Update ==============

/**
 * Update the extension badge with current hours
 */
async function updateBadge(): Promise<void> {
  try {
    const settings = await getSettings();

    if (!settings.redmineUrl || !settings.redmineApiKey) {
      chrome.action.setBadgeText({ text: '?' });
      chrome.action.setBadgeBackgroundColor({ color: '#888888' });
      return;
    }

    if (!(await hasOriginPermission(settings.redmineUrl))) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FFA726' });
      return;
    }

    const user = await getCurrentUser(settings.redmineUrl, settings.redmineApiKey);
    const entries = await getTimeEntries(
      settings.redmineUrl,
      settings.redmineApiKey,
      user.id,
      settings.badgeTimeScope
    );

    const loggedHours = calculateTotalHours(entries);
    let displayHours: number;

    if (settings.badgeDisplayType === 'remaining') {
      const expectedHours = calculateExpectedHours(settings.badgeTimeScope, settings.hoursPerDay);
      displayHours = Math.max(0, expectedHours - loggedHours);
    } else {
      displayHours = loggedHours;
    }

    // Format for badge (max 4 chars)
    const badgeText = formatBadgeText(displayHours);

    // Color based on display type and progress
    let color: string;
    if (settings.badgeDisplayType === 'remaining') {
      color = displayHours > 0 ? '#FF6B6B' : '#4CAF50';
    } else {
      const expectedHours = calculateExpectedHours(settings.badgeTimeScope, settings.hoursPerDay);
      const progress = loggedHours / expectedHours;
      color = progress >= 1 ? '#4CAF50' : progress >= 0.8 ? '#FFA726' : '#FF6B6B';
    }

    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color });

  } catch (error) {
    console.error('Failed to update badge:', error);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
}

/**
 * Run ticket sync in the background
 */
async function runTicketSyncBackground(): Promise<void> {
  try {
    const settings = await getSettings();
    
    if (!settings.redmineUrl || !settings.redmineApiKey || !settings.gitlabUrl || !settings.gitlabToken) {
      return;
    }

    if (!(await hasOriginPermission(settings.redmineUrl))) return;
    if (!(await hasOriginPermission(settings.gitlabUrl))) return;
    
    const groupedTickets = await fetchAndProcessTickets(
      settings.redmineUrl,
      settings.redmineApiKey,
      settings.gitlabUrl,
      settings.gitlabToken
    );
    
    const result = await chrome.storage.local.get(['knownTicketStates']);
    const knownTicketStates = (result.knownTicketStates || {}) as Record<number, string>;
    const newKnownStates = { ...knownTicketStates };
    
    const targetStates = ['conflicts', 'review', 'ready', 'test_failed'];
    let notificationsCount = 0;
    const seenTicketIds = new Set<number>();

    for (const group of groupedTickets) {
      for (const ticket of group.tickets) {
        if (seenTicketIds.has(ticket.id)) continue;
        seenTicketIds.add(ticket.id);

        const previousState = knownTicketStates[ticket.id];
        const currentState = ticketStateKey(ticket.evaluations);
        newKnownStates[ticket.id] = currentState;

        const isNotifiable = ticket.evaluations.some((e) => targetStates.includes(e));
        if (currentState !== previousState && isNotifiable) {
          notificationsCount++;
          if (notificationsCount <= 3) {
            const label = ticket.evaluations
              .map((key) => groupedTickets.find((g) => g.key === key)?.label ?? key)
              .join(' + ');
            chrome.notifications.create(`ticket-sync-${ticket.id}-${Date.now()}`, {
              type: 'basic',
              iconUrl: 'public/icons/icon128.png',
              title: `Ticket Sync: ${label}`,
              message: `Ticket #${ticket.id}: ${ticket.title} is now "${label}"`,
              priority: 2
            });
          }
        }
      }
    }
    
    if (notificationsCount > 3) {
      chrome.notifications.create(`ticket-sync-summary-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'public/icons/icon128.png',
        title: 'Multiple Ticket Updates',
        message: `You have ${notificationsCount} tickets with new updates.`,
        priority: 2
      });
    }
    
    await chrome.storage.local.set({ 
      cachedTicketGroups: groupedTickets,
      knownTicketStates: newKnownStates
    });
    
  } catch (err) {
    console.error('Background ticket sync failed:', err);
  }
}

async function getOtpAuthenticators(): Promise<OtpAuthenticator[]> {
  const result = await chrome.storage.local.get(OTP_STORAGE_KEY);
  const saved = result[OTP_STORAGE_KEY];
  if (!Array.isArray(saved)) return [];

  return saved.filter(
    (item): item is OtpAuthenticator =>
      typeof item?.id === 'string' &&
      typeof item?.name === 'string' &&
      typeof item?.secret === 'string'
  );
}

function parseOtpInput(name: string, secret: string): { ok: true; name: string; secret: string } | { ok: false; error: string } {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedSecret = normalizeSecretInput(secret);
  if (!trimmedName || !trimmedSecret) {
    return { ok: false, error: 'Name and secret are required.' };
  }

  try {
    getOtpAuthenticator().generate(trimmedSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const invalidSecretError = /base32|secret|input|invalid/i.test(message);
    return { ok: false, error: invalidSecretError ? 'Invalid secret format.' : 'Failed to generate OTP in background.' };
  }

  return { ok: true, name: trimmedName, secret: trimmedSecret };
}

async function addOtpAuthenticator(name: string, secret: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = parseOtpInput(name, secret);
  if (!parsed.ok) return parsed;

  const current = await getOtpAuthenticators();
  await chrome.storage.local.set({
    [OTP_STORAGE_KEY]: [...current, { id: crypto.randomUUID(), name: parsed.name, secret: parsed.secret }],
  });
  return { ok: true };
}

async function updateOtpAuthenticator(id: string, name: string, secret: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedId = typeof id === 'string' ? id.trim() : '';
  if (!trimmedId) return { ok: false, error: 'Name and secret are required.' };

  const parsed = parseOtpInput(name, secret);
  if (!parsed.ok) return parsed;

  const current = await getOtpAuthenticators();
  const index = current.findIndex(item => item.id === trimmedId);
  if (index < 0) return { ok: false, error: 'Authenticator not found.' };

  const next = [...current];
  next[index] = { ...next[index], name: parsed.name, secret: parsed.secret };
  await chrome.storage.local.set({ [OTP_STORAGE_KEY]: next });
  return { ok: true };
}

async function removeOtpAuthenticator(id: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedId = typeof id === 'string' ? id.trim() : '';
  if (!trimmedId) return { ok: false, error: 'Invalid authenticator id.' };
  const current = await getOtpAuthenticators();
  const next = current.filter(item => item.id !== trimmedId);
  await chrome.storage.local.set({ [OTP_STORAGE_KEY]: next });
  return { ok: true };
}

async function exportOtpAuthenticators(): Promise<{ ok: boolean; items: OtpAuthenticator[] }> {
  const items = await getOtpAuthenticators();
  return { ok: true, items };
}

async function importOtpAuthenticators(items: unknown): Promise<{ ok: boolean; error?: string; count?: number }> {
  if (!Array.isArray(items)) return { ok: false, error: 'Invalid import file format.' };

  const normalized: OtpAuthenticator[] = [];
  for (const item of items) {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    const secret = normalizeSecretInput(typeof item?.secret === 'string' ? item.secret : '');
    if (!name || !secret) continue;
    try {
      getOtpAuthenticator().generate(secret);
      normalized.push({ id: String(crypto.randomUUID()), name, secret });
    } catch {
      continue;
    }
  }

  if (normalized.length === 0) return { ok: false, error: 'No valid authenticator found in import file.' };

  const current = await getOtpAuthenticators();
  const existingKey = new Set(current.map(item => `${item.name}::${item.secret}`));
  const toAdd = normalized.filter(item => !existingKey.has(`${item.name}::${item.secret}`));

  if (toAdd.length === 0) return { ok: true, count: 0 };

  await chrome.storage.local.set({ [OTP_STORAGE_KEY]: [...current, ...toAdd] });
  return { ok: true, count: toAdd.length };
}

function normalizeSecretInput(rawSecret: string): string {
  if (typeof rawSecret !== 'string') return '';
  const value = rawSecret.trim();
  if (!value) return '';

  if (value.startsWith('otpauth://')) {
    try {
      const url = new URL(value);
      const paramSecret = url.searchParams.get('secret') || '';
      return paramSecret.replace(/[\s-]+/g, '').toUpperCase();
    } catch {
      return '';
    }
  }

  return value.replace(/[\s-]+/g, '').toUpperCase();
}

async function getOtpCodes(): Promise<{ stepSeconds: number; generatedAt: number; codes: OtpCode[] }> {
  const otp = getOtpAuthenticator();
  const authenticators = await getOtpAuthenticators();
  const codes = authenticators.map((item) => {
    try {
      return { id: item.id, name: item.name, secret: item.secret, code: otp.generate(item.secret) };
    } catch {
      return { id: item.id, name: item.name, secret: item.secret, code: 'Invalid secret' };
    }
  });

  return {
    stepSeconds: OTP_STEP_SECONDS,
    generatedAt: Date.now(),
    codes,
  };
}

function getOtpAuthenticator(): OtpAuthenticatorGenerator {
  if (otpAuthenticator) return otpAuthenticator;

  const auth = new Authenticator({
    createDigest,
    keyDecoder,
    keyEncoder,
  });
  auth.options = { step: OTP_STEP_SECONDS, digits: 6 };
  otpAuthenticator = auth;
  return otpAuthenticator;
}

/**
 * Get current stats for the side panel
 */
async function getStats(): Promise<Stats> {
  try {
    const settings = await getSettings();

    if (!settings.redmineUrl || !settings.redmineApiKey) {
      return { error: 'Not configured', errorKind: 'not_configured' } as unknown as Stats;
    }

    if (!(await hasOriginPermission(settings.redmineUrl))) {
      return {
        error: permissionErrorMessage(['Redmine']),
        errorKind: 'permission',
      } as unknown as Stats;
    }

    const user = await getCurrentUser(settings.redmineUrl, settings.redmineApiKey);

    // Fetch today's entries specifically
    const todayEntries = await getTimeEntries(
      settings.redmineUrl,
      settings.redmineApiKey,
      user.id,
      'today'
    );
    const todayLoggedHours = calculateTotalHours(todayEntries);

    // Use the existing entries for main scope (from settings.badgeTimeScope)
    let entries;
    if (settings.badgeTimeScope === 'today') {
      entries = todayEntries;
    } else {
      entries = await getTimeEntries(
        settings.redmineUrl,
        settings.redmineApiKey,
        user.id,
        settings.badgeTimeScope
      );
    }

    const loggedHours = calculateTotalHours(entries);
    const expectedHours = calculateExpectedHours(settings.badgeTimeScope, settings.hoursPerDay);
    const remainingHours = Math.max(0, expectedHours - loggedHours);

    // Leaderboard is always monthly for now
    const rankingExpectedHours = calculateExpectedHours('month', settings.hoursPerDay);

    // Fetch ranking if project is configured
    let ranking: UserHours[] = [];
    if (settings.projectId) {
      try {
        const memberEntries = await getMembersTimeEntries(
          settings.redmineUrl,
          settings.redmineApiKey,
          settings.projectId,
          'month'
        );
        ranking = buildRanking(memberEntries);
      } catch (err) {
        console.error('Failed to fetch ranking:', err);
      }
    }

    const stats: Stats = {
      user,
      loggedHours,
      expectedHours,
      remainingHours,
      todayLoggedHours,
      ranking,
      settings: {
        ...settings,
        rankingExpectedHours
      }
    };

    await saveCache(stats);

    return stats;
  } catch (error) {
    console.error('Failed to get stats:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' } as unknown as Stats;
  }
}

// ============== Utility Functions ==============

/**
 * Calculate expected hours based on scope and hours per day
 */
function calculateExpectedHours(scope: TimeScope, hoursPerDay: number): number {
  const { from, to } = getDateRange(scope);
  const workingDays = getWorkingDays(from, to);
  return workingDays * hoursPerDay;
}

/**
 * Get settings from storage
 */
async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...result };
}

/**
 * Save stats to local cache with timestamp
 */
async function saveCache(stats: Stats): Promise<void> {
  await chrome.storage.local.set({
    cachedStats: {
      lastSyncedAt: Date.now(),
      stats
    }
  });
}

/**
 * Read cached stats from local storage
 */
async function getCache(): Promise<CachedStats | null> {
  const { cachedStats } = await chrome.storage.local.get('cachedStats');
  return (cachedStats as CachedStats) || null;
}

/**
 * Format hours for badge display (max 4 chars)
 */
function formatBadgeText(hours: number): string {
  if (hours >= 100) {
    return Math.round(hours).toString();
  }
  return hours.toFixed(1);
}
