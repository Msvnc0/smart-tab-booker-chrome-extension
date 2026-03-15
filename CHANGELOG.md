# Changelog

All notable changes to Smart Tab Booker will be documented in this file.

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