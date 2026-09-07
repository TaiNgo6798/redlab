# Chrome Web Store listing

Paste these fields into the Chrome Web Store developer dashboard.
The live listing is not stored in git.
CWS strips markdown in the detailed description — paste the plain-text block as-is.

## Short description

Must stay ≤ 132 characters. Current length: 112.

    Redmine time tracking and GitLab merge-request sync. Hours, team leaderboard, ticket status, and local OTP fill.

## Detailed description

Paste this whole block. Do not convert it to markdown.

    Chrome side panel for teams that use Redmine and GitLab every day.

    If you log hours in Redmine and merge code in GitLab, RedLab keeps both in one place:

    Time tracking — logged vs expected vs remaining hours, period filters (today / week / month), and a team leaderboard

    Chrome badge — hours on the extension icon (logged or remaining)

    Ticket Sync — resolved Redmine tickets matched to GitLab merge requests, grouped as ready, conflicts, failed CI, open review, open to merge, or draft

    OTP — local one-time codes in the side panel. Click a code to copy it. Or pick the login field on the page, save it with that authenticator, and hit Fill. Fill only runs when you click it, only on the site you bound, and only into that field.

    How to fill an OTP:
    1. Open the login or 2FA page.
    2. Open RedLab → OTP.
    3. Click Set target, allow that site if asked, then click the input on the page.
    4. Click Fill when the code is showing.

    Your Redmine API key, GitLab token, and OTP secrets stay on your device. Requests go only to the hosts you configure. Fill never runs by itself and never injects into a site you did not allow.

    Install: https://chromewebstore.google.com/detail/redlab/pimegpjllpdeeflnmfgkkoleobfncbjb

    Source: https://github.com/TaiNgo6798/redlab

    Privacy: see the extension listing’s privacy policy URL

## Single purpose

    Help teams that use Redmine and GitLab track time, see ticket-to-merge-request status, and fill local OTP codes into the login page they choose.

## Permission justifications

Paste one field per permission. Be specific — “required for functionality” gets rejected.

### storage

    Stores Redmine and GitLab settings, display preferences, cached hours and ticket status, and local OTP authenticators (including the optional fill target the user picks). Nothing is synced to a RedLab server.

### alarms

    Refreshes the toolbar badge hours and Ticket Sync in the background so the side panel is not required to stay open.

### sidePanel

    RedLab’s UI is a Chrome side panel. This permission opens that panel from the toolbar icon.

### tabs

    Reads the URL of the active tab only when the user clicks Set target or Fill on an OTP. That is how RedLab knows which site to ask permission for and whether the saved target matches the page. Side-panel clicks do not grant activeTab, so tabs is required. RedLab does not read other tabs, does not log history, and does not track browsing.

### scripting

    After the user clicks Set target or Fill, and only on a site they allowed, RedLab runs a short script in that tab: highlight and capture the chosen input, or write the current OTP into it. It does not inject on page load, does not run on other sites, and does not submit the form.

### optional host permission (*://*/*)

    Host access is optional and requested per site. Test Connection in Settings asks for the Redmine or GitLab origin so the extension can call those APIs. Set target on OTP asks for that one origin so Fill can write the code. RedLab never requests all sites at once.

## Privacy practices (data use)

Match the dashboard checkboxes to the product. If a box is not listed, leave it unchecked.

- Personally identifiable information: no
- Health: no
- Financial and payment: no
- Authentication information: yes — Redmine API key, GitLab token, and OTP secrets, stored only in Chrome storage on the device
- Personal communications: no
- Location: no
- Web history: no — the active tab URL is read at click time for OTP pick/fill and is not stored as history
- Website content: yes — only the input the user picks, and only when they click Set target or Fill
- User activity: no
- Website content sold: no
- Data used to determine creditworthiness: no
- Remote code: no

Certify: data is used only to provide the extension’s features, not sold, not used for unrelated purposes.

## Share blurb

Paste in Slack, chat, or a Redmine / GitLab forum:

    Chrome side panel for Redmine + GitLab: hours, team leaderboard, ticket-to-merge-request status, and OTP fill.

    https://chromewebstore.google.com/detail/redlab/pimegpjllpdeeflnmfgkkoleobfncbjb
