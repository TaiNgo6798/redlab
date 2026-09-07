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
  getUserMRs,
  getRedmineIssue,
  buildRanking,
  type TimeScope,
  type UserHours,
} from './utils/api';
import { fetchAndProcessTickets } from './utils/ticketSyncEngine';
import {
  hasOriginPermission,
  httpOrigin,
  originMismatchMessage,
  permissionErrorMessage,
} from './utils/permissions';
import { generateTotp, OTP_STEP_SECONDS } from './utils/totp';
import { getActiveTab, injectedFillOtp } from './utils/otpPage';
import {
  DEFAULT_SETTINGS,
  parseTimelogSyncInterval,
  type CachedStats,
  type Settings,
  type Stats,
} from './sidepanel/shared/types/index';

interface OtpFillTarget {
  origin: string;
  selector: string;
}

interface OtpAuthenticator {
  id: string;
  name: string;
  secret: string;
  fillTarget?: OtpFillTarget;
}

enum AlarmName {
  UpdateBadge = 'updateBadge',
  TicketSync = 'ticketSync',
}

const OTP_STORAGE_KEY = 'otpAuthenticators';

// ============== Alarms ==============

void scheduleBadgeAlarm();
chrome.alarms.create(AlarmName.TicketSync, { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AlarmName.UpdateBadge) {
    void updateBadge();
  } else if (alarm.name === AlarmName.TicketSync) {
    void runTicketSyncBackground();
  }
});

// ============== Storage Listeners ==============

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;

  const intervalChanged = changes.timelogSyncInterval !== undefined;
  const onlyIntervalChanged = intervalChanged && Object.keys(changes).length === 1;
  if (intervalChanged) void scheduleBadgeAlarm();
  if (onlyIntervalChanged) return;

  void chrome.storage.local.remove('cachedStats');
  void updateBadge();
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
  if (message.action === 'setOtpFillTarget') {
    void setOtpFillTarget(message.id, message.origin, message.selector).then(response => sendResponse(response));
    return true;
  }
  if (message.action === 'fillOtp') {
    void fillOtp(message.id).then(response => sendResponse(response));
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
      getUserMRs,
      getRedmineIssue,
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
 * Paint the icon badge from the same stats object the sidebar cache uses.
 */
function paintBadge(stats: Stats): void {
  if (stats.errorKind === 'not_configured') {
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    return;
  }

  if (stats.error) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({
      color: stats.errorKind === 'permission' ? '#FFA726' : '#FF0000',
    });
    return;
  }

  const displayHours = stats.settings.badgeDisplayType === 'remaining'
    ? stats.remainingHours
    : stats.loggedHours;

  let color: string;
  if (stats.settings.badgeDisplayType === 'remaining') {
    color = displayHours > 0 ? '#FF6B6B' : '#4CAF50';
  } else {
    const progress = stats.loggedHours / stats.expectedHours;
    color = progress >= 1 ? '#4CAF50' : progress >= 0.8 ? '#FFA726' : '#FF6B6B';
  }

  chrome.action.setBadgeText({ text: formatBadgeText(displayHours) });
  chrome.action.setBadgeBackgroundColor({ color });
}

/**
 * Update the extension badge with current hours
 */
async function updateBadge(): Promise<void> {
  try {
    paintBadge(await getStats());
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
    
    const tickets = await fetchAndProcessTickets(
      settings.redmineUrl,
      settings.redmineApiKey,
      settings.gitlabUrl,
      settings.gitlabToken
    );
    
    const result = await chrome.storage.local.get(['knownTicketStates']);
    const knownTicketStates = (result.knownTicketStates || {}) as Record<string, string>;
    const newKnownStates: Record<string, string> = { ...knownTicketStates };
    
    let notificationsCount = 0;

    for (const ticket of tickets) {
      const ticketKey = ticket.id !== null ? String(ticket.id) : (ticket.mrs[0]?.url || 'unknown');
      const problemFlags: string[] = [];
      for (const mr of ticket.mrs) {
        if (mr.has_conflicts && !problemFlags.includes('conflict')) problemFlags.push('conflict');
        if (mr.has_failed_pipeline && !problemFlags.includes('test_failed')) problemFlags.push('test_failed');
        if (mr.has_open_review && !problemFlags.includes('review')) problemFlags.push('review');
      }

      const currentState = problemFlags.sort().join(',');
      const previousState = knownTicketStates[ticketKey];
      newKnownStates[ticketKey] = currentState;

      if (currentState && currentState !== previousState) {
        notificationsCount++;
        if (notificationsCount <= 3) {
          const label = problemFlags.join(', ');
          chrome.notifications.create(`ticket-sync-${ticketKey}-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'public/icons/icon128.png',
            title: `Ticket Sync: ${ticket.title}`,
            message: `${ticket.id !== null ? `Ticket #${ticket.id}` : 'MR'}: ${ticket.title} has updates (${label})`,
            priority: 2
          });
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
      cachedTickets: tickets,
      knownTicketStates: newKnownStates
    });
    
  } catch (err) {
    console.error('Background ticket sync failed:', err);
  }
}

function readString(value: object, key: string): string {
  return key in value && typeof (value as Record<string, unknown>)[key] === 'string'
    ? (value as Record<string, string>)[key]
    : '';
}

function parseFillTarget(value: unknown): OtpFillTarget | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const origin = readString(value, 'origin');
  const selector = readString(value, 'selector');
  if (!selector || httpOrigin(origin) !== origin) return undefined;
  return { origin, selector };
}

function parseOtpAuthenticator(item: unknown): OtpAuthenticator | null {
  if (typeof item !== 'object' || item === null) return null;
  const id = readString(item, 'id');
  const name = readString(item, 'name');
  const secret = readString(item, 'secret');
  if (!id || !name || !secret) return null;
  const authenticator: OtpAuthenticator = { id, name, secret };
  const fillTarget = parseFillTarget('fillTarget' in item ? item.fillTarget : undefined);
  if (fillTarget) authenticator.fillTarget = fillTarget;
  return authenticator;
}

async function getOtpAuthenticators(): Promise<OtpAuthenticator[]> {
  const result = await chrome.storage.local.get(OTP_STORAGE_KEY);
  const saved = result[OTP_STORAGE_KEY];
  if (!Array.isArray(saved)) return [];
  return saved.flatMap((item) => {
    const parsed = parseOtpAuthenticator(item);
    return parsed ? [parsed] : [];
  });
}

async function parseOtpInput(name: string, secret: string): Promise<{ ok: true; name: string; secret: string } | { ok: false; error: string }> {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedSecret = normalizeSecretInput(secret);
  if (!trimmedName || !trimmedSecret) {
    return { ok: false, error: 'Name and secret are required.' };
  }

  try {
    await generateTotp(trimmedSecret);
  } catch {
    return { ok: false, error: 'Invalid secret format.' };
  }

  return { ok: true, name: trimmedName, secret: trimmedSecret };
}

async function addOtpAuthenticator(name: string, secret: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = await parseOtpInput(name, secret);
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

  const parsed = await parseOtpInput(name, secret);
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

async function setOtpFillTarget(id: string, origin: string, selector: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedId = typeof id === 'string' ? id.trim() : '';
  const trimmedSelector = typeof selector === 'string' ? selector.trim() : '';
  const parsedOrigin = typeof origin === 'string' ? httpOrigin(origin) : null;
  if (!trimmedId) return { ok: false, error: 'Invalid authenticator id.' };
  if (!parsedOrigin || !trimmedSelector) return { ok: false, error: 'Invalid fill target.' };

  const current = await getOtpAuthenticators();
  const index = current.findIndex(item => item.id === trimmedId);
  if (index < 0) return { ok: false, error: 'Authenticator not found.' };

  const next = [...current];
  next[index] = { ...next[index], fillTarget: { origin: parsedOrigin, selector: trimmedSelector } };
  await chrome.storage.local.set({ [OTP_STORAGE_KEY]: next });
  return { ok: true };
}

async function fillOtp(id: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedId = typeof id === 'string' ? id.trim() : '';
  if (!trimmedId) return { ok: false, error: 'Invalid authenticator id.' };

  const authenticator = (await getOtpAuthenticators()).find(item => item.id === trimmedId);
  if (!authenticator) return { ok: false, error: 'Authenticator not found.' };
  if (!authenticator.fillTarget) return { ok: false, error: 'Invalid fill target.' };

  const tab = await getActiveTab();
  if (!tab?.id) return { ok: false, error: 'No page to fill.' };

  const origin = httpOrigin(tab.url ?? '');
  if (origin !== authenticator.fillTarget.origin) {
    return { ok: false, error: originMismatchMessage(authenticator.fillTarget.origin) };
  }

  let code: string;
  try {
    code = await generateTotp(authenticator.secret);
  } catch {
    return { ok: false, error: 'Invalid secret' };
  }

  try {
    const injection = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectedFillOtp,
      args: [authenticator.fillTarget.selector, code],
    });
    const result = injection[0]?.result;
    if (!result?.ok) return { ok: false, error: result?.error || 'No matching field on this page.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Cannot fill this page.' };
  }
}

async function exportOtpAuthenticators(): Promise<{ ok: boolean; items: { name: string; secret: string }[] }> {
  const items = await getOtpAuthenticators();
  return { ok: true, items: items.map(({ name, secret }) => ({ name, secret })) };
}

async function importOtpAuthenticators(items: unknown): Promise<{ ok: boolean; error?: string; count?: number }> {
  if (!Array.isArray(items)) return { ok: false, error: 'Invalid import file format.' };

  const normalized: OtpAuthenticator[] = [];
  for (const item of items) {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    const secret = normalizeSecretInput(typeof item?.secret === 'string' ? item.secret : '');
    if (!name || !secret) continue;
    try {
      await generateTotp(secret);
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

async function getOtpCodes(): Promise<{ stepSeconds: number; generatedAt: number; codes: { id: string; name: string; secret: string; code: string; fillOrigin?: string }[] }> {
  const authenticators = await getOtpAuthenticators();
  const codes = await Promise.all(authenticators.map(async (item) => {
    const fillOrigin = item.fillTarget?.origin;
    try {
      return { id: item.id, name: item.name, secret: item.secret, code: await generateTotp(item.secret), fillOrigin };
    } catch {
      return { id: item.id, name: item.name, secret: item.secret, code: 'Invalid secret', fillOrigin };
    }
  }));

  return {
    stepSeconds: OTP_STEP_SECONDS,
    generatedAt: Date.now(),
    codes,
  };
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
        badgeDisplayType: settings.badgeDisplayType,
        rankingDisplayType: settings.rankingDisplayType,
        badgeTimeScope: settings.badgeTimeScope,
        rankingExpectedHours,
        projectId: settings.projectId,
        hoursPerDay: settings.hoursPerDay,
      },
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
  return {
    ...DEFAULT_SETTINGS,
    ...result,
    timelogSyncInterval: parseTimelogSyncInterval(result.timelogSyncInterval),
  };
}

async function scheduleBadgeAlarm(): Promise<void> {
  const settings = await getSettings();
  await chrome.alarms.create(AlarmName.UpdateBadge, {
    periodInMinutes: parseTimelogSyncInterval(settings.timelogSyncInterval),
  });
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
