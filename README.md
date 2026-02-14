# Smart Tab Booker 🔖

**Smart Tab Booker** is a powerful, privacy-focused Chrome extension designed to help you organize your browsing sessions. Save open tabs as bookmarks with a single click, manage them efficiently, and automate backups to prevent data loss.

![Main Screenshot](../brain/b011bd4c-b757-4b5c-a53b-afa43ead4597/screenshot_1_main_1770988885563.png)

## 🚀 Key Features

*   **One-Click Save:** Instantly save all open tabs in your current window to a specific bookmark folder.
*   **Auto-Backup:** configure automatic backups (Daily, Weekly, Monthly) to save your tabs in the background without user intervention.
*   **Smart Selection:** View all open tabs in a list and choose exactly which ones you want to save.
*   **Multi-Language Support:** Fully localized in 10 languages including English, Turkish, German, French, Spanish, Italian, Portuguese, Russian, Japanese, and Chinese.
*   **Dark Mode:** Built-in dark theme support for comfortable viewing in low-light environments.
*   **Privacy First:** All data is stored locally in your browser. No external servers, no tracking.

## 📂 Project Structure

The project structure is organized for maintainability and scalability:

```text
smart-tab-booker/
├── _locales/               # Internationalization (i18n) strings
├── icons/                  # Application icons
├── scripts/                # Utility and build scripts (Python)
├── background.js           # Service worker (alarms, backup logic) - Modularized
├── popup.html              # Extension popup interface
├── popup.js                # UI Logic (Split into Managers: localization, settings, tabs)
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
This script creates a optimized `smart-tab-booker.zip` in the root directory, excluding development files.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
