# AGENTS.md

## Project Overview

Cross-browser extension (Manifest V3) for backing up and restoring browser tabs as bookmarks. Works on Chrome, Brave, Helium, Firefox, and Firefox-based browsers (Zen Browser, Waterfox, etc.). No build step, no bundler, no npm.

## Architecture

- **`background.js`** — Service worker. Owns all browser API interactions: alarms, bookmarks, backup/restore logic, context menus. Receives commands via `browser.runtime.onMessage`. Uses `browser.*` namespace throughout (polyfill maps to `chrome.*` on Chromium).
- **`popup.js`** — UI layer. Communicates with background.js exclusively through `browser.runtime.sendMessage`. Never calls `browser.bookmarks` or `browser.alarms` directly.
- **`popup.html` / `popup.css`** — Popup UI with three tabs (Backup, Restore, Tools). CSS uses custom properties for dark mode.
- **`browser-polyfill.js`** — Mozilla webextension-polyfill v0.12.0. Maps `browser.*` → `chrome.*` on Chromium browsers. No-op on Firefox (native `browser.*`).
- **`browser-detect.js`** — Runtime feature detection. `BrowserDetect.isFirefox`, `BrowserDetect.supportsTabGroups`, `BrowserDetect.NEW_TAB_URLS`, `BrowserDetect.shortcutUrl`.
- **`_locales/`** — 18 languages. Chrome i18n (`__MSG_*__` in manifest) + runtime fetch-based localization in popup.js (`Localization` module).

### Key Pattern

`CONSTANTS` object is defined **independently** in both `background.js` and `popup.js` with overlapping `STORAGE` keys. Changes to storage key names or alarm constants must be updated in **both** files.

### Cross-Browser Pattern

All API calls use `browser.*` namespace. The polyfill (`browser-polyfill.js`) makes this work on Chrome by mapping `browser.*` → `chrome.*` + converting callbacks to promises. On Firefox, `browser.*` is native and the polyfill is a no-op.

Feature detection via `BrowserDetect`:
- `supportsTabGroups` — true on Chrome/Zen Browser, false on vanilla Firefox
- `isFirefox` — true on Firefox and Firefox-based browsers
- `NEW_TAB_URLS` — array of new-tab URLs for all supported browsers
- `shortcutUrl` — browser-specific keyboard shortcut settings page

Tab groups: On Firefox (no `browser.tabGroups` API), group folders are saved as bookmark folders and restored as flat tabs. On Chrome/Zen Browser, full group save/restore with colors.

## Packaging

```bash
# Chrome/Brave/Helium
python scripts/package_extension.py --chrome

# Firefox/Zen Browser
python scripts/package_extension.py --firefox
```

Creates `smart-tab-booker-v1.6-chrome.zip` or `smart-tab-booker-v1.6-firefox.zip` in the project root. Version is read from `manifest.json`. Firefox package uses `manifest-firefox.json` (renamed to `manifest.json` in the zip).

## Conventions

- No framework, no transpilation. All JS is vanilla and runs directly in browser extension contexts.
- All API calls use `browser.*` namespace (not `chrome.*`). The polyfill handles the mapping.
- Backup folders are named `Backup_YYYY-MM-DD_HH-MM (note)`. Date parsing in `extractDateFromFolderName` uses UTC — do not switch to local time.
- Pinned tabs are stored as bookmarks with `[PIN] ` prefix. Parsed by `parseBookmarkTitle` in both background.js and popup.js — keep in sync.
- Tab group folders use `[color]title` format. Parsed by `extractGroupColor` / `extractGroupCleanTitle`.
- URL validation (`isValidUrl`) blocks `javascript:`, `chrome://`, `chrome-extension://`, `moz-extension://`, `about:`, `file://` — only `http://` and `https://` pass.
- `backupInProgress` guard prevents concurrent backups in background.js.
- `importScripts('browser-polyfill.js', 'browser-detect.js')` is called conditionally at top of `background.js` (only in service worker context where `browser` is undefined).
- `popup.html` loads scripts in order: `browser-polyfill.js` → `browser-detect.js` → `popup.js`.

## What Not To Do

- Do not add npm, a bundler, or a package.json. This is a plain JS extension loaded unpacked.
- Do not call `browser.bookmarks`, `browser.alarms`, or `browser.tabs` from popup.js — delegate to background.js via messages.
- Do not use `chrome.*` API namespace — use `browser.*` everywhere. The polyfill handles Chrome.
- Do not modify `_locales/` files without updating all 18 locales.
- Do not add `tabGroups` permission to `manifest-firefox.json` — Firefox doesn't support it.
- No test runner exists. If adding tests, choose and document the framework in this file.