# Smart Tab Booker 🔖

**Smart Tab Booker** is a powerful, privacy-focused Chrome extension designed to help you organize your browsing sessions. Save open tabs as bookmarks with a single click, manage them efficiently, and automate backups to prevent data loss.

## 🚀 Key Features

### Core Features
*   **One-Click Save:** Instantly save all open tabs in your current window to a specific bookmark folder.
*   **Auto-Backup:** Configure automatic backups (Daily, Weekly, Monthly) to save your tabs in the background without user intervention.
*   **Smart Selection:** View all open tabs in a list and choose exactly which ones you want to save.
*   **Multi-Language Support:** Fully localized in 18 languages including English, Turkish, German, French, Spanish, Italian, Portuguese (BR), Russian, Japanese, Chinese (Simplified), Korean, Polish, Dutch, Indonesian, Vietnamese, Arabic (RTL), Hindi, and Thai.
*   **Dark Mode:** Built-in dark theme support for comfortable viewing in low-light environments.
*   **Privacy First:** All data is stored locally in your browser. No external servers, no tracking.

### New in v1.3 ⭐
*   **Keyboard Shortcut:** Quick backup with `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`). Customize via `chrome://extensions/shortcuts`.
*   **Tab Groups Support:** Preserve your Chrome tab groups as bookmark folders when backing up.
*   **Duplicate Detection:** Automatically detects duplicate URLs and lets you choose whether to include them.
*   **Auto Cleanup:** Automatically delete old backups after a specified number of days.
*   **Multiple Daily Times:** Set up to 5 different backup times for daily backups.

## 📋 Changelog

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
2. **Select a backup folder** from your bookmarks
3. **Choose tabs to backup** (all are selected by default)
4. **Click "Backup Now"** or use `Ctrl+Shift+B` for quick backup

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