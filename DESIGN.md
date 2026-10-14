---
name: RedLab
description: Night-shift console for Redmine hours and GitLab merge requests, in a 320px Chrome side panel.
colors:
  night-navy: "#1a1a2e"
  deep-slate: "#16213e"
  harbor-blue: "#0f3460"
  pitch-navy: "#0d1b2a"
  abyss: "#0b1322"
  modal-ink: "#080d1a"
  signal-teal: "#007990"
  signal-teal-bright: "#00a3b8"
  signal-teal-pressed: "#006578"
  fog-white: "#e8eaed"
  ash: "#a0a0a0"
  go-green: "#4CAF50"
  caution-amber: "#FFA726"
  alarm-coral: "#FF6B6B"
  status-open: "#7dd3fc"
  status-open-tint: "#38bdf8"
  status-merged: "#6ee7b7"
  status-merged-tint: "#34d399"
  status-merged-deep: "#10b981"
  status-draft: "#cbd5e1"
  status-draft-tint: "#94a3b8"
  status-draft-deep: "#64748b"
  status-review: "#fde68a"
  status-review-tint: "#fbbf24"
  status-failed: "#fda4af"
  status-failed-tint: "#fb7185"
  status-new: "#c4b5fd"
  status-new-tint: "#a78bfa"
  medal-gold: "#FFD700"
  medal-silver: "#C0C0C0"
  medal-bronze: "#CD7F32"
  redmine-red: "#B11612"
  redmine-red-on-dark: "#E85D58"
  gitlab-orange: "#FC6D26"
  hairline-faint: "rgba(255, 255, 255, 0.06)"
  hairline-fill: "rgba(255, 255, 255, 0.08)"
  hairline-soft: "rgba(255, 255, 255, 0.09)"
  hairline: "rgba(255, 255, 255, 0.1)"
  hairline-strong: "rgba(255, 255, 255, 0.12)"
  hairline-bright: "rgba(255, 255, 255, 0.14)"
  hairline-hover: "rgba(255, 255, 255, 0.2)"
  hairline-hover-strong: "rgba(255, 255, 255, 0.25)"
  scrim: "rgba(0, 0, 0, 0.78)"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.1
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.1
  statistic:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  title-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  title-compact:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  2xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-teal}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.md}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.signal-teal-bright}"
    textColor: "{colors.fog-white}"
  button-default:
    backgroundColor: "{colors.harbor-blue}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.md}"
    height: "40px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.harbor-blue}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.md}"
    height: "40px"
  panel-card:
    backgroundColor: "{colors.deep-slate}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  chip-status:
    textColor: "{colors.status-open}"
    rounded: "{rounded.xl}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-count:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.ash}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    typography: "{typography.label}"
---

# Design System: RedLab

## Overview

**Creative North Star: "The Night-Shift Console"**

RedLab is a dimmed operator console that lives in a 320px Chrome side panel. Everything sits on layered navy, one teal signal color marks what is interactive or important, and a small set of status lamps (green, sky, amber, coral) tells the user whether an hour goal or a merge request needs attention. Nothing glows at rest; light is spent only where a state changed.

The panel is dense by necessity and calm by choice. Labels are tiny uppercase tracking, numbers are the biggest thing on screen, and cards are flat slabs separated by thin white hairlines rather than heavy shadows. The one deliberate flourish is the Today ring on the Time Log view: an arc gauge with an electric spark animation when syncing, the single place the console is allowed to feel alive.

**Key Characteristics:**
- Dark-only: four navy depths stacked from page to card to control.
- One accent: signal teal for focus, links, the active tab, and the "remaining hours" number.
- Status lamps are translucent tints (15% fill, 20% border) of a named status hue, never solid fills.
- Numbers lead, labels whisper: 10px uppercase labels under 20 to 24px bold figures.
- Single column, 12px gutters, 16px card padding; everything works at 320px.

## Colors

A navy ladder for surfaces, one teal signal, and translucent status tints that stay readable on every navy step.

### Primary
- **Signal Teal** (#007990): the only brand accent on the panel. Primary buttons, the active navigation tab, progress bar start, link color, and the "remaining" figure. Used on well under 10% of any screen.
- **Signal Teal Bright** (#00a3b8): hover and focus state of the accent, the current view title in the header, and OTP code numerals.
- **Signal Teal Pressed** (#006578): active/pressed state, and the solid leaderboard hour tags, where it keeps Fog White text above 4.5:1.

### Secondary (brand wordmark only)
- **Redmine Red** (#B11612) and **GitLab Orange** (#FC6D26): the brand reference colors, used exclusively in the "Red"/"Lab" wordmark. On the navy panel "Red" renders as **Redmine Red On Dark** (#E85D58) so the wordmark clears 4.5:1; the orange already does. They never color UI controls or status.

### Status
- **Go Green** (#4CAF50): success states and progress at 100%.
- **Caution Amber** (#FFA726): warnings, progress between 80% and 100%, review-needed chips.
- **Alarm Coral** (#FF6B6B): errors, conflicts, failed pipelines, destructive buttons.
- **Status lamps** come in pairs, a light text tone and a mid tint for the fill: **Open** (#7dd3fc on #38bdf8 at 20%), **Merged / Resolved** (#6ee7b7 on #34d399 at 20%; #10b981 for the "Ready to Test" badge, border and notice), **Draft / Other** (#cbd5e1 on #94a3b8 at 15%; #64748b for the sub-task badge), **Review / Feedback** (#fde68a on #fbbf24 at 20%; also the stale-data notice), **Failed / Conflict** (#fda4af on #fb7185 at 20%), **New** (#c4b5fd on #a78bfa at 20%). Every pair clears 6:1 on its row.
- **Medal Gold / Silver / Bronze** (#FFD700 / #C0C0C0 / #CD7F32): reserved tokens for leaderboard ranks 1 to 3; the current leaderboard uses medal emoji instead of colored cards.

### Neutral
- **Night Navy** (#1a1a2e): page background and scrollbar track.
- **Deep Slate** (#16213e): cards and dropdown bodies, often at 50% to 80% alpha over the page.
- **Harbor Blue** (#0f3460): inputs, default buttons, tags, scrollbar thumb, the deepest "card inside a card".
- **Pitch Navy** (#0d1b2a), **Abyss** (#0b1322), **Modal Ink** (#080d1a): sidebar, tooltips and popovers, modal shells. Each step darker than the last so overlays read as closer to the viewer.
- **Fog White** (#e8eaed): primary text. **Ash** (#a0a0a0): secondary text, placeholders, muted labels.
- **White hairlines**: `rgba(255,255,255,0.10)` for borders and dividers, `0.06` for subtle splits, `0.05` for faint fills, `0.08` to `0.12` for hover fills, `0.14` on tooltip edges, `0.20` to `0.25` for scrollbar thumbs on hover.
- **Scrim** (`rgba(0,0,0,0.78)` with 8px blur): the modal backdrop.

### Named Rules
**The One Signal Rule.** Signal teal is the only accent. If a second thing on screen needs emphasis, use size or weight, not a second hue.
**The Lamp Rule.** Status colors appear as tints: 15% to 20% fill, 20% to 30% border, full-strength text. Solid status fills exist only on the destructive confirm button.
**The Wordmark Rule.** Redmine red and GitLab orange belong to the logo and nowhere else.

## Typography

**Display Font:** system UI stack (-apple-system, Segoe UI, Roboto)
**Body Font:** same system stack
**Mono Font:** ui-monospace (merge-request IIDs, OTP codes)

**Character:** utilitarian and quiet. The system font keeps the panel native to the browser chrome around it; hierarchy comes from weight and tracking, not from a display face.

### Hierarchy
- **Headline** (700, 24px, 1.1): the big numbers: logged, expected, remaining hours; statistic values; today's hours inside the ring. Also 30px for the Today ring center.
- **Title** (600 to 700, 14px, 1.3): view title in the header (solid Signal Teal Bright; 13px below a 360px panel so "Ticket Sync" never truncates), card headings, the wordmark (14px, 700).
- **Figure / Statistic** (700, 18px to 20px): secondary numbers such as OTP statistic values and leaderboard medals; the 24px headline is reserved for the hour totals.
- **Glyph sizes**: 18px card-heading emoji.
- **Body** (400, 14px, 1.5): form labels, help text at 12px, ticket titles at 12px with truncation.
- **Label** (600 to 700, 10px to 12px, 0.05em tracking, UPPERCASE): group headers ("Ready to Test", "Active Tickets & MRs"), stat captions ("Logged", "Expected", "Daily Goal"), period captions.
- **Mono** (500, 11px): `!4120` merge-request numbers and TOTP codes.

### Named Rules
**The Whisper Label Rule.** Captions are 10 to 12px, uppercase, letter-spaced, secondary color. They never compete with the figure beneath them.
**The Solid Title Rule.** Text is always a solid color. The current view title is Signal Teal Bright; no gradient or clipped-background text anywhere.

## Layout

One column, always. The side panel is 320px minimum and the layout never gains a second column at wider widths. The page has 12px outer padding; cards carry 12px to 16px internal padding (24px on the hero Today card and empty states); vertical rhythm between cards is 16px. Inside a card, rows are 8px to 12px apart and inline clusters use 4px to 8px gaps.

The header is a single row: wordmark, a 1px divider, the view title, then four icon-only tab buttons right-aligned. Content is a vertical stack of sections. Stat triplets (logged / expected / remaining) are three centered columns separated by 1px vertical hairlines. Ticket cards stack vertically with group headers between them. Settings are a stack of titled cards with 16px between fields.

Scrollbars are custom and slim: 8px on the page, 5px inside modals, Harbor Blue thumb at 4px radius.

## Elevation & Depth

Ant Design styles are emitted into an `antd` cascade layer ordered below Tailwind utilities (`@layer theme, base, antd, components, utilities`), so a utility class on an Ant Design component always wins. Hand-written overrides in `global.css` stay unlayered and win over both.


Depth is tonal first, shadow second. The navy ladder (Night Navy → Deep Slate → Harbor Blue) carries most of the layering; thin white hairline borders define edges. Shadows are reserved for freestanding cards and overlays and are always soft, black, and low-contrast.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 10px 30px rgba(0,0,0,0.22)`): the standard panel card.
- **Hero card** (`box-shadow: 0 8px 32px rgba(0,0,0,0.30)`): the Today ring card.
- **Stat strip** (`box-shadow: 0 4px 16px rgba(0,0,0,0.20)`): the logged/expected/remaining triplet.
- **Dropdown** (`box-shadow: 0 12px 32px rgba(0,0,0,0.35)` with 12px backdrop blur): glass select menus.
- **Tooltip** (`0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)`, 8px blur): the one place an inner highlight is used.
- **Focus ring** (`0 0 0 3px rgba(0,121,144,0.28)`): teal halo on focused glass selects and inputs. Ant Design's default white focus shadows are removed globally.

### Named Rules
**The Dim Console Rule.** No element glows at rest. Glow (drop-shadow in teal) appears only during the sync animation on the Today ring.
**The Glass Is Rare Rule.** Backdrop blur is used on selects, dropdowns, and tooltips only, never on cards or the page.

## Shapes

Softly rounded slabs. Cards are 16px radius; controls and inputs are 8px (Ant Design `borderRadius: 8`, `borderRadiusLG: 12`); compact ticket rows and stat sub-panels are 12px; status chips are 6px; count badges and the compact period select are full pills. Borders are 1px white hairlines at 10% opacity, never colored except on status chips (status tint). The Today ring is a 160px circle with a 7.5 to 8.5px arc stroke. Icons are Ant Design outlined glyphs, 10px to 14px inside chips and 18px to 22px as feature icons.

## Components

### Buttons
- **Shape:** rounded (8px), 40px control height, no shadow on any variant.
- **Primary:** Signal Teal fill, Fog White text; hover Signal Teal Bright; active Signal Teal Pressed. Used for the one main action on a card ("Add", "Save", "Sync").
- **Default:** Harbor Blue fill, Fog White text, 10% white border ("Test Connection", "Export").
- **Text / icon:** transparent, Fog White glyph; hover fill `rgba(255,255,255,0.08)`. Header tabs are small text buttons that switch to primary when active.
- **Danger:** Alarm Coral text on text buttons; the confirm button in remove popovers is a solid Alarm Coral fill at 600 weight.
- **Focus:** no white halo; keyboard focus uses a 2px Signal Teal Bright outline with 2px offset on every link, button, and Ant Design button.

### Chips
- **Merge-request flag chips:** inline-flex, 4px gap, 2px 8px padding, 6px radius, 11px medium text on the status pair (open, merged, draft, has review, test failed, conflict). 11px icon on the left; "open" uses a 6px dot instead of an icon. On narrow rows the chip cluster wraps under the repo name rather than clipping.
- **Ticket status chips:** 6px radius, 2px 8px padding, 12px semibold, with a 6px dot in `currentColor`. Resolved = merged pair, in progress = open pair, feedback/review = review pair, new = new pair, other = draft pair.
- **Count badges:** full pill, 10% border, 5% white fill, 12px semibold, secondary text. Group-colored variants (emerald, slate) tint fill and border at 15% to 30%.
- **MR number pill:** 11px mono, Signal Teal Bright text on a 15% teal fill, 4px radius.

### Cards / Containers
- **Corner Style:** 16px (panel card), 12px (sub-panel), 10px to 12px (ticket row).
- **Background:** Deep Slate at 80% over the page; sub-panels use `rgba(255,255,255,0.05)` or Harbor Blue; ticket rows use Night Navy at 60% and brighten to 90% on hover.
- **Shadow Strategy:** card-rest shadow on panel cards, none on sub-panels or rows.
- **Border:** 1px white hairline at 10%; ticket rows at 5% that turns Signal Teal Bright at 40% on hover.
- **Internal Padding:** 16px standard, 12px on ticket cards, 24px on the hero and empty states.
- **Card heading row:** icon, 14px semibold title, 1px bottom hairline, 12px padding below.

### Inputs / Fields
- **Style:** Harbor Blue fill, 1px 10% white border, 8px radius, 40px tall, Ash placeholder.
- **Focus:** Signal Teal border and a 3px 20% teal halo; hover border Signal Teal.
- **Glass Select:** translucent Harbor Blue at 55% with 10px blur, 10px radius (full pill in the compact header variant), custom 2.2px-stroke chevron; the dropdown is Deep Slate at 96% with 12px radius, 6px padding, 40px tall options (32px compact), selected option in a 28% teal fill with Signal Teal Bright text.
- **Error:** Ant Design error status on the field plus a 12px Alarm Coral help line.

### Navigation
- **Style:** four icon-only small buttons in the header; the active view is a primary (teal) button, the rest are text buttons. The header bottom edge is a 10% white hairline. Footer is a single 12px secondary link with a GitHub glyph.

### Today Ring (signature)
A 160px SVG circular gauge inside the hero card: a Harbor Blue track and a teal-to-bright-teal gradient arc; the logged hours sit in the center in 30px bold with an 11px "TODAY" caption (the ring is a button, so its caption stays above the 10px floor). Clicking the ring reloads; while syncing, the arc jitters 7.5 to 8.5px, a white spark rotates around the ring with a teal drop-shadow, and a lightning icon flashes. Hover scales 1.02, active 0.98. Reduced-motion disables all three animations. Below the ring, a two-column `rgba(255,255,255,0.05)` strip shows Daily Goal and Remaining.

### Ticket Card (signature)
A panel card with a title line (status chip, `#id` link, truncated title), optional parent breadcrumb, then one row per merge request: 12px radius row with the mono MR pill, repo name, truncated title, and the state chip cluster on the right. A green "Mark to Testable" footer strip appears on ready-to-test tickets. Tickets that share an MR render on one card.

## Do's and Don'ts

### Do:
- **Do** keep every new element on the navy ladder: page Night Navy, card Deep Slate, control Harbor Blue.
- **Do** express status as a tint (15% to 20% fill, 20% to 30% border, full-strength text) in the established hue for that state.
- **Do** lead with the number: 20 to 30px bold figure, 10px uppercase caption beneath or beside it.
- **Do** separate with 1px `rgba(255,255,255,0.10)` hairlines before reaching for a shadow.
- **Do** design for 320px first; wrap, truncate, or stack rather than shrink text below 10px.

### Don't:
- **Don't** introduce a second accent hue; Signal Teal is the only one.
- **Don't** use Redmine red or GitLab orange outside the wordmark.
- **Don't** add glow, gradient fills, or backdrop blur to cards; glass is for selects, dropdowns, tooltips, and the modal scrim only.
- **Don't** use gradient or background-clipped text; titles and figures are solid.
- **Don't** add a light theme or white surfaces; the console is dark-only.
- **Don't** use solid status fills on chips; solid coral is reserved for the destructive confirm button.
