# Changelog

All notable changes to Smart Tab Booker will be documented in this file.

## [1.6.0] - 2026-06-14

### Added
- **Firefox/Zen Browser Support** — Full compatibility with Firefox and Firefox-based browsers (Zen Browser, Waterfox, etc.) via webextension-polyfill
- **Dual Packaging** — `package_extension.py` now accepts `--chrome` or `--firefox` flag to build browser-specific packages
- **Firefox Manifest** — Separate `manifest-firefox.json` with `browser_specific_settings` for AMO submission
- **Runtime Feature Detection** — `BrowserDetect` module detects `isFirefox` and `supportsTabGroups` at runtime
- **Tab Groups Graceful Fallback** — On browsers without tab groups API, backups save groups as folders and restores flatten them into tabs

### Changed
- All `chrome.*` API calls replaced with `browser.*` namespace (webextension-polyfill handles Chrome↔Firefox mapping)
- Callback-based API patterns converted to async/await (`sendMessage`, `SettingsManager`, `TabManager`, message handlers)
- `chrome.runtime.lastError` patterns removed in favor of promise rejection
- Keyboard shortcut link now opens `about:addons` on Firefox, `chrome://extensions/shortcuts` on Chrome
- New tab detection supports both `chrome://newtab/` and `about:newtab/` / `about:home/`
- URL validation now blocks `moz-extension://` URLs on Firefox
- Tab groups toggles hidden on browsers without tab groups support
- Packaging script reads version from `manifest.json` instead of hardcoding

### Technical
- Added `browser-polyfill.js` (Mozilla webextension-polyfill v0.12.0)
- Added `browser-detect.js` for runtime browser feature detection
- Added `manifest-firefox.json` (no `tabGroups` permission, `background.scripts`, `browser_specific_settings.gecko`)
- `popup.html` loads `browser-polyfill.js` and `browser-detect.js` before `popup.js`
- `background.js` loads polyfill via conditional `importScripts` in service worker
- Fixed bug in `restoreTabsWithGroups` Firefox fallback where nested bookmarks in group folders were silently dropped (`isValidUrl(b.url)` → `isValidUrl(sub.url)`)

---

## [1.4.0] - 2026-04-01

### Added
- **Restore Feature** - Reopen backed up tabs from bookmarks with a single click
- **Tab Groups Preservation** - Tab groups are recreated when restoring backups
- **Three-Tab UI** - Easy switching between Backup, Restore, and Tools modes
- **50+ Tab Warning** - Confirmation dialog when restoring large backups
- **Restore Folder Selection** - Choose which backup folder to restore from
- **Backup Search & Filter** - Search backups by name in the Restore panel
- **Backup Comparison** - Compare two backups to see added, removed, and common URLs
- **Backup Preview** - Double-click a backup to preview and selectively restore individual tabs
- **Export JSON/CSV** - Export backups as JSON or CSV files from the Tools panel
- **Import from File** - Import backup data from JSON files
- **Backup Statistics** - View total backups, total tabs, and top domains
- **Smart Triggers** - Tab threshold auto-backup and backup reminders
- **Context Menu** - Right-click to backup current tab or all tabs
- **Backup Notes** - Add notes to manual backups

### Fixed
- **Restore panel not loading backups** - Backups now load automatically when a saved folder is selected
- **Restore buttons not working** - Fixed selectedBackup not being set when entering the Restore tab
- **Stale backup selection** - Changing the restore folder now properly resets the selection and disables buttons
- **Subfolder bookmarks lost on restore** - When "Preserve Tab Groups" is disabled, bookmarks inside subfolders are no longer silently dropped during restore
- **Pinned tab state lost in preview** - Preview now correctly parses [PIN] prefix and preserves pinned state when restoring selected tabs
- **Compare dropdown stale data** - Switching to an empty folder now clears the compare dropdowns
- **Export/Import broken in Tools** - Tools panel now has its own folder and backup selectors, no longer depends on Restore panel state

### Improved
- Updated translations for all 18 languages with restore, tools, and smart trigger strings
- Independent Tools panel with dedicated folder/backup selection for export and import

---

## [1.3.0] - 2026-03-15

### Added
- **Keyboard Shortcut** - Quick backup with `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`). Can be customized via `chrome://extensions/shortcuts`
- **Tab Groups Support** - Preserve Chrome tab groups as bookmark folders when backing up (toggle in settings)
- **Duplicate URL Detection** - Automatically detects duplicate URLs in open tabs with visual indicators. Toggle to include or exclude duplicates
- **Auto Cleanup** - Automatically delete old backups after a specified number of days (configurable: 1-365 days)
- **Multiple Daily Backup Times** - Set up to 5 different backup times for daily backups

### Improved
- Better UI organization with collapsible settings sections
- Added 8 new languages: Korean, Polish, Dutch, Indonesian, Vietnamese, Arabic (with RTL support), Hindi, Thai (now 18 total)
- Improved language selector with globe icon and native language names
- Alphabetically sorted language dropdown
- RTL (Right-to-Left) support for Arabic language
- Dark mode styling improvements

### Technical
- Added `tabGroups` permission for tab group support
- Added `commands` API for keyboard shortcuts
- Improved backup logic with duplicate filtering

---

## [1.2.0]

### Added
- Custom interval option for auto backups (minutes, hours, days)
- Dark mode support
- Translations for 10 languages (EN, TR, DE, FR, ES, IT, PT-BR, RU, JA, ZH-CN)

---

## [1.0.0]

### Added
- Manual backup of open tabs to bookmarks
- Automatic backup scheduling (Daily, Weekly, Monthly)
- Smart tab selection with select/deselect all
- Backup folder selection
- Last backup time display
- Multi-language support (English, Turkish)
- Privacy-focused: all data stored locally