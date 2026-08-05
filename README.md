# RedLab

> *You aren't lazy, you just forget to log it!*

**RedLab** is a Chrome extension (Manifest V3) for **Redmine** time tracking and **GitLab** ticket/MR status. Track hours, compare with your team, sync resolved tickets to merge requests, and keep OTP codes handy — all in the side panel.

<p align="center">
  <img src="assets/timelog.png" width="400" alt="RedLab overview" />
</p>

**GitHub:** [TaiNgo6798/redlab](https://github.com/TaiNgo6798/redlab)  
**Privacy policy:** [pitogram.cc/policies/privacy](https://pitogram.cc/policies/privacy)

## Supported platforms

| Platform | What RedLab uses it for |
|----------|-------------------------|
| **Redmine** | Logged hours, expected/remaining, leaderboards, resolved tickets |
| **GitLab** | Ticket Sync (MR status, conflicts, pipelines, review feedback) |

## Features

- **Overview & leaderboard** — Logged vs expected vs remaining hours, progress bar, period filters (today / week / month / history ranges)
- **Chrome badge** — Hours on the extension icon (logged or remaining, per settings)
- **Ticket Sync** — Resolved Redmine tickets matched to GitLab MRs; groups for ready / conflicts / failed CI / open review / open to merge / draft
- **OTP** — Local TOTP authenticators in the side panel
- **Settings** — Redmine URL + API key, GitLab URL + token, hours-per-day, badge/ranking display, settings import/export
- **Local-only credentials** — Keys stay in Chrome storage; calls go only to your configured hosts

## Install (developer)

```bash
git clone https://github.com/TaiNgo6798/redlab.git
cd redlab
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder (or the repo root after build, depending on your CRXJS setup — use `dist/` for the built package)

## Configuration

1. Open the RedLab side panel
2. Open **Settings**
3. **Redmine:** base URL (no trailing slash) + API key  
4. **GitLab (Ticket Sync):** base URL + personal access token  
5. Set hours per day and badge preferences  
6. Fields save on blur

## Development

```bash
npm run build        # production build → dist/
npm run dev          # watch rebuild
npm run type-check
npm run test
npm run lint
npm run lint:fix
```

| Hook | Behavior |
|------|----------|
| pre-commit | version bump (`npm run bump`) + sync `manifest.json` |
| pre-push | `npm run lint` |

## Tech stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript |
| UI | React 19, Ant Design |
| Build | Vite 7 + CRXJS (Manifest V3) |
| Styles | Tailwind CSS 4, custom dark theme |
| Quality | ESLint 9, Vitest, Husky |

## Architecture (short)

```
sidepanel  ──messages──▶  background service worker  ──▶  Redmine / GitLab APIs
     │                            │
     ▼                            ▼
 chrome.storage.sync         chrome.storage.local
 (settings)                  (cached stats / ticket groups)
```

- **background.ts** — alarms, badge, API proxy, ticket-sync notifications  
- **sidepanel/** — overview, settings, OTP, ticket-sync views  
- **utils/api.ts** — Redmine + GitLab HTTP  
- **utils/ticketSyncEngine.ts** — resolve tickets ↔ MRs and group evaluation  

## Privacy

Credentials and caches stay on your device. See the [privacy policy](https://pitogram.cc/policies/privacy).

## License

MIT
