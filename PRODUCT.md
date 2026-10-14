# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers on teams that log time in Redmine and merge code in GitLab. Any such developer, on any Redmine or GitLab host; there is no company-specific default. They open the Chrome side panel several times a day, beside whatever page they are working on, to check hours and merge-request status without leaving the current tab.

## Product Purpose

RedLab is a Chrome extension (Manifest V3 side panel) that keeps Redmine time tracking and GitLab merge-request status in one place. Tagline: "You aren't lazy, you just forget to log it!" Success means the user never ends a day or week with unlogged hours, and never leaves a resolved ticket waiting on a merge request they forgot about.

## Positioning

Resolved Redmine tickets are matched to their GitLab merge requests, with CI, conflict, review, and draft status readable in one glance, beside whatever page the user is on. Neither Redmine nor GitLab shows this join on its own.

## Operating Context

- Lives in the Chrome side panel; the extension badge shows logged or remaining hours.
- Four views: Time Log (overview), Ticket Sync, OTP Resolver, Settings. The active view persists across panel opens.
- Redmine supplies logged hours, expected and remaining hours, leaderboard ranking, and resolved tickets. GitLab supplies merge-request search, discussions, and pipelines.
- A background service worker refreshes stats on alarms, proxies API calls for the side panel, and caches results in chrome.storage.local.
- Settings save on blur. Settings can be exported and imported as a file.
- OTP codes are local TOTP authenticators stored in the extension.

## Capabilities and Constraints

- Credentials are local-only: keys stay in Chrome storage, and requests go only to the hosts the user configured via optional host permissions.
- The panel must work at the Chrome side panel minimum width (320px); the layout is a single column.
- Stack: React, Ant Design, Tailwind v4 (`@theme` tokens in `styles/global.css`), Vite with CRXJS. Observed in code; not yet confirmed as binding.
- Terminology: Time Log, Ticket Sync, OTP Resolver, Settings; ticket groups are ready / conflicts / failed CI / open review / open to merge / draft; "resolved sub-tasks" and "no-code tickets" are separate buckets.
- A "Preview all status cases" mock modal exists for Ticket Sync, useful for reviewing every card state without live data.
- Published on the Chrome Web Store; releases via GitHub Actions. Version bumps on pre-commit.

## Brand Commitments

- Name: RedLab. Wordmark splits "Red" in Redmine red and "Lab" in GitLab orange (tokens `--color-brand-red`, `--color-brand-orange`). Observed in code; the user did not confirm it as binding in the init interview.
- Dark-only interface today. Observed; not confirmed as binding.
- Voice: short, direct, slightly playful (README tagline), no marketing fluff.

## Evidence on Hand

- Screenshots: `assets/timelog.png`, `assets/ticket-sync.png`, `assets/ticket_sync_groups.png`, `assets/otp.png`, `assets/small_promo_440x280.png`.
- Chrome Web Store listing: https://chromewebstore.google.com/detail/redlab/pimegpjllpdeeflnmfgkkoleobfncbjb
- Privacy policy: https://pitogram.cc/policies/privacy
- No testimonials, user counts, or benchmarks exist; do not fabricate any.

## Product Principles

1. Glanceable first: the answer to "am I behind on hours?" and "is my MR blocked?" must be readable in under two seconds at 320px.
2. Nothing leaves the device except calls to the user's own configured hosts.
3. Status over decoration: every ticket group and chip encodes a real GitLab or Redmine state; no invented states.
4. Work beside the page, never instead of it: the panel complements Redmine and GitLab tabs rather than replacing them.
5. Zero-config honesty: empty, error, and unconfigured states say exactly what is missing and link to Settings.
