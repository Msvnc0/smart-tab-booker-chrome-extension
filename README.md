# Smart Tab Booker 🔖

**Smart Tab Booker** is a powerful, privacy-focused Chrome extension designed to help you organize your browsing sessions. Save open tabs as bookmarks with a single click, manage them efficiently, and automate backups to prevent data loss.

## 🚀 Key Features

### Core Features
*   **One-Click Save:** Instantly save all open tabs in your current window to a specific bookmark folder.
*   **One-Click Restore:** Reopen backed up tabs from bookmarks with a single click. Tab groups are automatically recreated.
*   **Auto-Backup:** Configure automatic backups (Daily, Weekly, Monthly) to save your tabs in the background without user intervention.
*   **Smart Selection:** View all open tabs in a list and choose exactly which ones you want to save.
*   **Multi-Language Support:** Fully localized in 18 languages including English, Turkish, German, French, Spanish, Italian, Portuguese (BR), Russian, Japanese, Chinese (Simplified), Korean, Polish, Dutch, Indonesian, Vietnamese, Arabic (RTL), Hindi, and Thai.
*   **Dark Mode:** Built-in dark theme support for comfortable viewing in low-light environments.
*   **Privacy First:** All data is stored locally in your browser. No external servers, no tracking.

### New in v1.5 ⭐
*   **Security:** Blocked `javascript:` URLs in validation to prevent potential XSS.
*   **Bug Fixes:** Fixed UTC/timezone mismatch - `extractDateFromFolderName` now uses UTC for consistent date comparison across timezones.
*   **Bug Fixes:** Fixed `restoreSuccess` and `manyTabsWarning` i18n placeholder format mismatch. Now uses positional `$1` via `chrome.i18n.getMessage()`.
*   **Bug Fixes:** Fixed Turkish locale `selectBackupDefault` still showing English text (`-- Yedek seçin --`).
*   **UX Fix:** Auto-backup settings panel now correctly expands when auto-backup is enabled.
*   **Stability:** Orphan windows are now properly closed if restore operations fail mid-process.
*   **Validation:** Input fields for cleanup days (1-365), tab threshold (5-100), and reminder days (1-30) now have proper min/max bounds.
*   **i18n:** Added missing `selectBackupDefault` translation key across all 18 languages.
*   **Code Quality:** Replaced magic number `50` tab warning threshold with `MANY_TABS_THRESHOLD` constant.
*   **Code Quality:** Added `tabCounterSpan` to CONSTANTS for proper DOM reference.
*   **Code Quality:** Consolidated duplicate `parsePreviewTitle`/`parseBookmarkTitle` into a single robust version.
*   **Code Quality:** Fixed `setupAlarm` async callback handling in `updateSchedule` message handler.
*   **Code Quality:** Simplified `filterDuplicateTabs` by removing dead code branch.
*   **Code Quality:** Improved error handling in `ToolsManager.loadBackups` with user-visible error message.
*   **Code Quality:** Fixed collapsible header icon sync on popup state restore.

### v1.4
*   **Restore Feature:** Reopen backed up tabs from bookmarks in a new window.
*   **Tab Groups Preservation:** Chrome tab groups are automatically recreated when restoring.
*   **Three-Tab UI:** Clean tab interface for Backup, Restore, and Tools.
*   **Backup Preview & Selective Restore:** Double-click a backup to preview and restore individual tabs.
*   **Backup Comparison:** Compare two backups to see added, removed, and common URLs.
*   **Export & Import:** Export backups as JSON or CSV. Import backup data from JSON files.
*   **Backup Statistics:** View total backups, saved tabs, and top domains.
*   **Smart Triggers:** Auto-backup on tab threshold and backup reminders.
*   **Context Menu:** Right-click to backup current tab or all tabs.
*   **Backup Notes:** Add notes to manual backups.
*   **Search & Filter:** Search backups by name in the Restore panel.

### v1.3
*   **Keyboard Shortcut:** Quick backup with `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`). Customize via `chrome://extensions/shortcuts`.
*   **Tab Groups Support:** Preserve your Chrome tab groups as bookmark folders when backing up.
*   **Duplicate Detection:** Automatically detects duplicate URLs and lets you choose whether to include them.
*   **Auto Cleanup:** Automatically delete old backups after a specified number of days.
*   **Multiple Daily Times:** Set up to 5 different backup times for daily backups.

## 📋 Changelog

### v1.5 (2026-04-06)
- 🔒 Blocked `javascript:` URLs in validation to prevent potential XSS
- 🐛 Fixed auto cleanup deleting backups at wrong time due to UTC/timezone mismatch in date parsing
- 🐛 Fixed `restoreSuccess` and `manyTabsWarning` i18n placeholder format mismatch (positional `$1`)
- 🐛 Fixed Turkish locale `selectBackupDefault` still showing English text
- 🐛 Fixed auto-backup settings panel not expanding when auto-backup is enabled on popup open
- 🐛 Fixed orphan browser windows left open when restore operations fail
- 🐛 Fixed `validate_keys.js` syntax error (extra closing brace)
- 🐛 Fixed missing `selectBackupDefault` i18n key in all 18 locale files
- 🔒 Added input validation for cleanup days (1-365), tab threshold (5-100), and reminder days (1-30)
- 🛡️ Added `backupInProgress` check in `performAutoBackup` to prevent concurrent backup conflicts
- 🧹 Replaced magic number `50` with `MANY_TABS_THRESHOLD` constant
- 🧹 Added `tabCounterSpan` to CONSTANTS for proper DOM reference
- 🧹 Consolidated duplicate `parsePreviewTitle`/`parseBookmarkTitle` functions
- 🧹 Fixed `setupAlarm` async callback handling in `updateSchedule` message handler
- 🧹 Simplified `filterDuplicateTabs` by removing dead code branch
- 🧹 Improved error handling in `ToolsManager.loadBackups` with user-visible error message
- 🧹 Fixed collapsible header icon sync on popup state restore

### v1.4 (2026-04-01)
- ✨ Added Restore feature - reopen backed up tabs from bookmarks
- ✨ Added Tab Groups preservation - groups recreated on restore
- ✨ Added three-tab UI (Backup, Restore, Tools)
- ✨ Added backup preview with selective restore (double-click)
- ✨ Added backup comparison tool (added/removed/common URLs)
- ✨ Added Export JSON/CSV and Import from file
- ✨ Added backup statistics (total backups, tabs, top domains)
- ✨ Added Smart Triggers (tab threshold, reminders)
- ✨ Added context menu (right-click to backup tab or all tabs)
- ✨ Added backup notes for manual backups
- ✨ Added search & filter in Restore panel
- 🐛 Fixed restore panel not loading backups on folder select
- 🐛 Fixed subfolder bookmarks lost when restoring without tab groups
- 🐛 Fixed pinned tab state lost in preview and selective restore
- 🐛 Fixed export/import not working in Tools panel
- 🐛 Fixed stale selection when changing restore folders
- 🌐 Updated translations for all 18 languages

### v1.3 (2026-03-15)
- ✨ Added keyboard shortcut for quick backup (`Ctrl+Shift+B`)
- ✨ Added Tab Groups support - preserve groups as folders
- ✨ Added duplicate URL detection with toggle option
- ✨ Added auto cleanup for old backups
- ✨ Added multiple backup times for daily schedules (max 5)
- 🌐 Added 8 new languages: Korean, Polish, Dutch, Indonesian, Vietnamese, Arabic (RTL support), Hindi, Thai (now 18 total)
- 🎨 Better UI organization with toggleable settings
- 🎨 Improved language selector with globe icon and native names

### v1.2
- Added custom interval option
- Added dark mode support
- Added 10 language translations

### v1.0
- Initial release
- Manual and automatic backup
- Smart tab selection
- Multi-language support

## 📂 Project Structure

```text
smart-tab-booker/
├── _locales/               # Internationalization (i18n) strings
├── images/                 # Application icons
├── scripts/                # Utility and build scripts
├── background.js           # Service worker (alarms, backup logic)
├── popup.html              # Extension popup interface
├── popup.js                # UI Logic
├── popup.css               # Styling (variables, dark mode)
└── manifest.json           # Chrome Extension Manifest V3
```

## 🛠️ Installation

### From Chrome Web Store
[![Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png)](https://chromewebstore.google.com/detail/smart-tab-booker/dbcnahemhkclgkgnfjedofcifjahnmln)
[Download Smart Tab Booker](https://chromewebstore.google.com/detail/smart-tab-booker/dbcnahemhkclgkgnfjedofcifjahnmln)

### For Developers (Load Unpacked)
1.  Clone this repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/smart-tab-booker.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **"Developer mode"** in the top-right corner.
4.  Click **"Load unpacked"**.
5.  Select the `smart-tab-booker` directory.

## 📦 Building the Package

To create a `.zip` file for the Chrome Web Store:

```bash
cd smart-tab-booker/scripts
python package_extension.py
```

This script creates an optimized `smart-tab-booker.zip` in the root directory, excluding development files.

## 🎯 Usage

1. **Click the extension icon** to open the popup
2. Switch between **Backup**, **Restore**, and **Tools** tabs
3. **Backup:** Select a folder, choose tabs, click "Backup Now" or use `Ctrl+Shift+B`
4. **Restore:** Select a backup folder, choose a backup, click "Restore All"
5. **Tools:** Export/import backups, view statistics, configure smart triggers

### Backup
1. Select a backup folder from your bookmarks
2. Choose tabs to backup (all are selected by default)
3. Optionally add a note for the backup
4. Click "Backup Now" or use `Ctrl+Shift+B` for quick backup

### Restore
1. Switch to the **Restore** tab
2. Select the folder containing your backups
3. Choose a backup from the list
4. Click "Restore All" to reopen tabs in a new window
5. Double-click a backup to preview and selectively restore individual tabs
6. Tab groups are automatically recreated if they were preserved during backup

### Tools
1. **Export:** Select a folder and backup, then export as JSON or CSV
2. **Import:** Select a folder, choose a JSON file, and import tabs
3. **Statistics:** View total backups, total tabs, and top domains
4. **Smart Triggers:** Configure tab threshold auto-backup and reminders

### Auto Backup Settings
1. Enable "Auto Backup" toggle
2. Select interval (Daily, Weekly, Monthly, or Custom)
3. Set backup time(s)
4. Configure additional options:
   - **Preserve Tab Groups**: Keep your tab groups organized in folders
   - **Auto Cleanup**: Delete backups older than X days
   - **Include Duplicates**: Backup all tabs including duplicate URLs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.