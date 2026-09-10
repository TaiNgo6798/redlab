# CLAUDE.md

Guidance for working in this repository.

## Project Overview

**RedLab** (`TaiNgo6798/redlab`) is a Chrome extension (Manifest V3) for:

- Redmine time tracking (hours, leaderboard, badge)
- GitLab Ticket Sync (resolved tickets ↔ MRs)
- Local OTP (TOTP) codes

## Commands

```bash
npm run build        # → dist/
npm run type-check
npm run test
npm run lint
npm run lint:fix
npm run dev          # watch rebuild
npm run bump         # version patch (also on pre-commit)
```

There is no `npm run deploy` script — load `dist/` unpacked, or use the GitHub Actions Chrome Web Store publish workflow.

## Architecture

### Entry points

1. **background.ts** — service worker:
   - Redmine stats + badge via `chrome.alarms`
   - Proxies API calls from the side panel (`API_REQUEST`)
   - Ticket sync background refresh + notifications
   - Caches in `chrome.storage.local`

2. **sidepanel/** — React UI domains:
   - `overview/` — hours, periods, leaderboard
   - `settings/` — Redmine + GitLab + display prefs, import/export
   - `ticket-sync/` — MR/ticket groups and chips
   - `otp/` — authenticators

### Data flow

```
sidepanel ──▶ background.ts ──▶ Redmine / GitLab APIs
    │                │
    ▼                ▼
chrome.storage   chrome.storage
  .sync            .local
```

### Key modules

- **utils/api.ts** — Redmine + GitLab HTTP (dual-mode: background vs `apiCall` proxy)
- **utils/ticketSyncEngine.ts** — fetch resolved tickets, match MRs, multi-group evaluation
- **utils/ticketSyncRules.ts** — problem rules + `ticketStateKey`
- **styles/** — dark theme + Ant Design theme

### Storage (summary)

**chrome.storage.sync** — redmineUrl, redmineApiKey, gitlabUrl, gitlabToken, badge/ranking prefs, hoursPerDay, projectId, …

**chrome.storage.local** — cachedStats, cachedTicketGroups, knownTicketStates, OTP authenticators

## Redmine API

Base URL: `https://your-instance.com` (no trailing slash). Auth: `X-Redmine-API-Key`.

## GitLab API

Base URL: `https://your-gitlab.com` (no trailing slash). Auth: `PRIVATE-TOKEN`.

Ticket Sync uses MR search, discussions, optional single-MR detail, and pipelines when `head_pipeline` is missing.

## Development notes

- Pre-commit bumps version and keeps `manifest.json` in sync
- Pre-push runs lint
- Side panel HMR via Vite/CRXJS; service worker needs manual reload after background changes
