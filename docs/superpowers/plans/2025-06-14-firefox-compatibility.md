# Firefox/Zen Browser Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Smart Tab Booker work as a native Firefox extension (AMO-publishable) while maintaining full Chrome/Brave/Helium compatibility, using webextension-polyfill + runtime feature detection.

**Architecture:** Single codebase using `browser.*` API namespace. `webextension-polyfill` maps `browser.*` → `chrome.*` on Chrome (no-op on Firefox/Zen). Two manifest files — `manifest.json` (Chrome) and `manifest-firefox.json` (Firefox). `BrowserDetect` module provides runtime feature detection for tab groups and browser-specific URLs. Packaging script builds separate ZIPs per target.

**Tech Stack:** Vanilla JS (no build step), webextension-polyfill (downloaded as static file), Python packaging script.

**Spec:** `docs/superpowers/specs/2025-06-14-firefox-compatibility-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `browser-polyfill.js` | Create (download) | Maps `browser.*` → `chrome.*` on Chrome, no-op on Firefox |
| `browser-detect.js` | Create | Runtime feature detection: `isFirefox`, `supportsTabGroups` |
| `manifest.json` | Modify | Add `importScripts('browser-polyfill.js')` note, no structural change |
| `manifest-firefox.json` | Create | Firefox-specific manifest (no `tabGroups`, `browser_specific_settings`, `background.scripts`) |
| `background.js` | Modify | `chrome.*` → `browser.*`, add `importScripts`, feature detection, URL fixes |
| `popup.js` | Modify | `chrome.*` → `browser.*`, simplify `sendMessage`, feature detection, URL fixes |
| `popup.html` | Modify | Add polyfill + browser-detect script tags |
| `popup.css` | Modify | Add rule to hide tab groups toggle when unsupported |
| `scripts/package_extension.py` | Modify | Add `--target` flag for Chrome/Firefox packaging |

---

### Task 1: Download and Add `browser-polyfill.js`

**Files:**
- Create: `browser-polyfill.js`

This task downloads the Mozilla webextension-polyfill library. No tests needed — this is a vendored dependency.

- [ ] **Step 1: Download the polyfill**

Run:
```powershell
cd D:\Opencode\smart-tab-booker
Invoke-WebRequest -Uri "https://github.com/mozilla/webextension-polyfill/releases/download/1.0.0/browser-polyfill.min.js" -OutFile "browser-polyfill.js"
```

If the URL above fails (version may change), go to https://github.com/mozilla/webextension-polyfill/releases and download `browser-polyfill.min.js` from the latest release, saving it as `browser-polyfill.js` in the project root.

- [ ] **Step 2: Verify the file**

Run:
```powershell
cd D:\Opencode\smart-tab-booker
(Get-Content browser-polyfill.js -First 3) -join "`n"
(Get-Item browser-polyfill.js).Length
```

Expected: First line contains `browser` or `globalThis` or `typeof`, file size ~20-30KB. The file must define `browser` on the `globalThis`/`window` scope.

- [ ] **Step 3: Commit**

```bash
git add browser-polyfill.js
git commit -m "feat: add webextension-polyfill for Firefox compatibility"
```

---

### Task 2: Create `browser-detect.js`

**Files:**
- Create: `browser-detect.js`

This module provides runtime feature detection used by both `background.js` and `popup.js`.

- [ ] **Step 1: Create the file**

Create `browser-detect.js` in the project root:

```js
const BrowserDetect = {
    get isFirefox() {
        return typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getBrowserInfo === 'function';
    },
    get supportsTabGroups() {
        return typeof browser !== 'undefined' && browser.tabGroups && typeof browser.tabGroups.query === 'function';
    },
    NEW_TAB_URLS: ['chrome://newtab/', 'about:newtab/', 'about:home/'],
    get shortcutUrl() {
        return this.isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';
    }
};
```

**Explanation:**
- `isFirefox` uses `browser.runtime.getBrowserInfo` which is a Firefox-only API
- `supportsTabGroups` checks if `browser.tabGroups.query` exists (true on Chrome, true on Zen Browser if it implements tab groups, false on vanilla Firefox)
- `NEW_TAB_URLS` is a shared constant for detecting new-tab pages across browsers
- `shortcutUrl` returns the browser-specific keyboard shortcut settings page

- [ ] **Step 2: Commit**

```bash
git add browser-detect.js
git commit -m "feat: add BrowserDetect module for runtime feature detection"
```

---

### Task 3: Create `manifest-firefox.json`

**Files:**
- Create: `manifest-firefox.json`
- Read: `manifest.json`

- [ ] **Step 1: Create the Firefox manifest**

Create `manifest-firefox.json` — identical to `manifest.json` except: remove `tabGroups` permission, add `browser_specific_settings`, change `background` from `service_worker` to `scripts`:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "default_locale": "en",
  "version": "1.5",
  "description": "__MSG_extDesc__",
  "permissions": [
    "tabs",
    "bookmarks",
    "storage",
    "alarms",
    "contextMenus"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "background": {
    "scripts": ["browser-polyfill.js", "browser-detect.js", "background.js"]
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "commands": {
    "quick-backup": {
      "suggested_key": {
        "default": "Ctrl+Shift+B",
        "mac": "Command+Shift+B"
      },
      "description": "__MSG_quickBackupDesc__"
    }
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "smart-tab-booker@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

Key differences from `manifest.json`:
1. `tabGroups` permission removed (Firefox doesn't support it)
2. `background` uses `scripts` array instead of `service_worker` (polyfill loads before background.js)
3. `browser_specific_settings.gecko` added (required for AMO submission)
4. `browser-detect.js` included in `background.scripts`

- [ ] **Step 2: Commit**

```bash
git add manifest-firefox.json
git commit -m "feat: add Firefox-specific manifest for AMO submission"
```

---

### Task 4: Convert `background.js` — Namespace Swap + importScripts

**Files:**
- Modify: `background.js`

This is the largest change — converting all `chrome.*` calls to `browser.*` and adding polyfill import. The polyfill makes `browser.*` work on Chrome by mapping to `chrome.*`, so this is a safe global replacement.

- [ ] **Step 1: Add `importScripts` at the very top of `background.js`**

Before line 1 (`const CONSTANTS = {`), add:

```js
importScripts('browser-polyfill.js', 'browser-detect.js');
```

This is needed because Chrome MV3 service workers don't have `<script>` tags. Firefox manifest will load these via `background.scripts`, so this `importScripts` call will only execute on Chrome. It's safe to call on Firefox too — `importScripts` exists in Firefox service workers but the files are already loaded, so it's a no-op.

Wait — actually, Firefox MV3 with `background.scripts` loads them in order before `background.js` runs. Calling `importScripts` again on Firefox is harmless but unnecessary. To be safe and avoid double-loading, wrap it:

```js
if (typeof browser === 'undefined') {
    importScripts('browser-polyfill.js', 'browser-detect.js');
}
```

This way: on Chrome, `browser` is undefined (polyfill hasn't loaded yet), so `importScripts` runs. On Firefox, `browser` is natively defined, so `importScripts` is skipped.

Add this as the very first line of `background.js`, before `const CONSTANTS`.

- [ ] **Step 2: Replace all `chrome.` API calls with `browser.` in `background.js`**

This is a mechanical global find-and-replace. Every `chrome.runtime.`, `chrome.storage.`, `chrome.bookmarks.`, `chrome.tabs.`, `chrome.alarms.`, `chrome.contextMenus.`, `chrome.action.`, `chrome.windows.`, `chrome.commands.`, `chrome.i18n.` becomes `browser.runtime.`, `browser.storage.`, etc.

**Do NOT replace:**
- `chrome://newtab/` string literals (these are URL strings, not API calls)
- `chrome://extensions/shortcuts` string literals
- `chrome-extension://` string literals in `isValidUrl`

Specific replacements (line numbers from audit):

| Line(s) | Before | After |
|---------|--------|------|
| 52 | `url.startsWith('chrome://')` | `url.startsWith('chrome://')` — **keep as-is** |
| 53 | `url.startsWith('chrome-extension://')` | `url.startsWith('chrome-extension://')` — **keep as-is** |
| 60 | `chrome.runtime.onInstalled.addListener` | `browser.runtime.onInstalled.addListener` |
| 61 | `chrome.alarms.onAlarm.addListener` | `browser.alarms.onAlarm.addListener` |
| 62 | `chrome.runtime.onMessage.addListener` | `browser.runtime.onMessage.addListener` |
| 63 | `chrome.commands.onCommand.addListener` | `browser.commands.onCommand.addListener` |
| 64 | `chrome.contextMenus.onClicked.addListener` | `browser.contextMenus.onClicked.addListener` |
| 65 | `chrome.tabs.onCreated.addListener` | `browser.tabs.onCreated.addListener` |
| 69 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 71 | `chrome.storage.local.set` | `browser.storage.local.set` |
| 75 | `chrome.contextMenus.create` | `browser.contextMenus.create` |
| 77 | `chrome.i18n.getMessage` | `browser.i18n.getMessage` |
| 80 | `chrome.contextMenus.create` | `browser.contextMenus.create` |
| 82 | `chrome.i18n.getMessage` | `browser.i18n.getMessage` |
| 135 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 140 | `chrome.bookmarks.getTree` | `browser.bookmarks.getTree` |
| 145-147 | `chrome.bookmarks.getChildren` + `chrome.runtime.lastError` | See Task 6 |
| 190 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 236 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 254 | `chrome.action.setBadgeText` | `browser.action.setBadgeText` |
| 255 | `chrome.action.setBadgeBackgroundColor` | `browser.action.setBadgeBackgroundColor` |
| 256 | `chrome.action.setBadgeText` | `browser.action.setBadgeText` |
| 262 | `chrome.alarms.clearAll` | `browser.alarms.clearAll` |
| 266 | `chrome.alarms.create` | `browser.alarms.create` |
| 278 | `chrome.alarms.create` | `browser.alarms.create` |
| 282 | `chrome.alarms.create` | `browser.alarms.create` |
| 297 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 387 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 407 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 419 | `chrome.tabs.query` | `browser.tabs.query` |
| 430 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 443 | `chrome.bookmarks.removeTree` | `browser.bookmarks.removeTree` |
| 482 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 496 | `chrome.tabGroups.query` | `browser.tabGroups.query` |
| 507 | `chrome.tabGroups.TAB_GROUP_ID_NONE` | See Task 5 |
| 521 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 536 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 548 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 554 | `chrome.bookmarks.removeTree` | `browser.bookmarks.removeTree` |
| 573 | `chrome.storage.local.set` | `browser.storage.local.set` |
| 583 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 593 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 601 | `chrome.windows.create` | `browser.windows.create` |
| 612 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 618 | `chrome.tabs.query` | `browser.tabs.query` |
| 621 | `chrome.tabs.remove` | `browser.tabs.remove` |
| 628 | `chrome.windows.remove` | `browser.windows.remove` |
| 639 | `chrome.tabs.create` | `browser.tabs.create` |
| 657 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 666 | `chrome.tabs.create` | `browser.tabs.create` |
| 676 | `chrome.tabs.group` | `browser.tabs.group` |
| 683 | `chrome.tabGroups.update` | `browser.tabGroups.update` |
| 710-720 | `chrome.storage.local.get` + `chrome.tabs.query` | `browser.storage.local.get` + `browser.tabs.query` |
| 740 | `chrome.storage.local.get` | `browser.storage.local.get` |
| 766 | `chrome.windows.create` | `browser.windows.create` |
| 772 | `chrome.tabs.create` | `browser.tabs.create` |
| 779 | `chrome.tabs.query` | `browser.tabs.query` |
| 782 | `chrome.tabs.remove` | `browser.tabs.remove` |
| 788 | `chrome.windows.remove` | `browser.windows.remove` |
| 797 | `chrome.bookmarks.get` | `browser.bookmarks.get` |
| 832 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 860 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 883 | `chrome.bookmarks.removeTree` | `browser.bookmarks.removeTree` |
| 893 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 899 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 910 | `chrome.bookmarks.create` | `browser.bookmarks.create` |
| 924, 934, 951, 966 | `chrome.bookmarks.getChildren` | `browser.bookmarks.getChildren` |
| 998 | `chrome.storage.local.set` | `browser.storage.local.set` |

**Approach:** Do a careful find-and-replace, skipping string literals that contain `chrome://`. After replacement, verify no `chrome.` API calls remain (only `chrome://` URL strings should have `chrome`).

- [ ] **Step 3: Verify no `chrome.` API calls remain**

Run:
```powershell
cd D:\Opencode\smart-tab-booker
Select-String -Path background.js -Pattern 'chrome\.' | Where-Object { $_.Line -notmatch 'chrome://' -and $_.Line -notmatch 'chrome-extension://' }
```

Expected: **zero results**. If any remain, fix them.

- [ ] **Step 4: Commit**

```bash
git add background.js
git commit -m "feat: convert background.js chrome.* API calls to browser.* namespace"
```

---

### Task 5: Add Feature Detection for Tab Groups in `background.js`

**Files:**
- Modify: `background.js`

- [ ] **Step 1: Guard `saveTabsWithGroups` with feature detection**

In `background.js`, find the `saveTabsWithGroups` function (starts around line 495). Add a feature detection guard at the top:

```js
async function saveTabsWithGroups(parentId, tabs) {
    if (!BrowserDetect.supportsTabGroups) {
        return saveTabsAsBookmarks(parentId, tabs);
    }
    const groups = await browser.tabGroups.query({});
    // ... rest unchanged
```

- [ ] **Step 2: Guard `restoreTabsWithGroups` with feature detection**

Find the `restoreTabsWithGroups` function (starts around line 648). Add a feature detection guard:

```js
async function restoreTabsWithGroups(windowId, bookmarks) {
    if (!BrowserDetect.supportsTabGroups) {
        const flatBookmarks = [];
        for (const b of bookmarks) {
            if (b.url && isValidUrl(b.url)) {
                flatBookmarks.push(b);
            } else if (!b.url) {
                const subBookmarks = await browser.bookmarks.getChildren(b.id);
                for (const sub of subBookmarks) {
                    if (sub.url && isValidUrl(sub.url)) {
                        flatBookmarks.push(sub);
                    }
                }
            }
        }
        return restoreTabsFlat(windowId, flatBookmarks);
    }
    // ... rest unchanged
```

This flattens group folders into a flat bookmark list on Firefox, then calls `restoreTabsFlat` which opens all tabs without grouping.

- [ ] **Step 3: Replace `chrome.tabGroups.TAB_GROUP_ID_NONE` in `saveTabsWithGroups`**

In `saveTabsWithGroups`, find the line:
```js
if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
```

Replace with:
```js
if (tab.groupId && tab.groupId !== (browser.tabGroups ? browser.tabGroups.TAB_GROUP_ID_NONE : -1)) {
```

Wait — `saveTabsWithGroups` is already guarded by `supportsTabGroups`, so `browser.tabGroups` will exist when this code runs. But to be safe and consistent:

```js
if (tab.groupId && tab.groupId !== (browser.tabGroups ? browser.tabGroups.TAB_GROUP_ID_NONE : -1)) {
```

- [ ] **Step 4: Commit**

```bash
git add background.js
git commit -m "feat: add tab groups feature detection in background.js"
```

---

### Task 6: Fix Browser-Specific URLs in `background.js`

**Files:**
- Modify: `background.js`

- [ ] **Step 1: Update `isValidUrl` to block `moz-extension://`**

Find the `isValidUrl` function (around line 50). Add `moz-extension://` check:

```js
function isValidUrl(url) {
    if (!url) return false;
    if (url.startsWith('chrome://')) return false;
    if (url.startsWith('chrome-extension://')) return false;
    if (url.startsWith('moz-extension://')) return false;
    if (url.startsWith('about:')) return false;
    if (url.startsWith('file://')) return false;
    if (url.startsWith('javascript:')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}
```

- [ ] **Step 2: Update new-tab detection to use `BrowserDetect.NEW_TAB_URLS`**

Find the two locations where `chrome://newtab/` is hardcoded:

**Location 1** (around line 619, inside `restoreFromBookmarks`):
```js
const newTab = tabs.find(t => t.url === 'chrome://newtab/');
```
Replace with:
```js
const newTab = tabs.find(t => BrowserDetect.NEW_TAB_URLS.includes(t.url));
```

**Location 2** (around line 780, inside `restoreTabsList`):
```js
const newTab = allTabs.find(t => t.url === 'chrome://newtab/');
```
Replace with:
```js
const newTab = allTabs.find(t => BrowserDetect.NEW_TAB_URLS.includes(t.url));
```

- [ ] **Step 3: Commit**

```bash
git add background.js
git commit -m "feat: add moz-extension URL filter and cross-browser new tab detection"
```

---

### Task 7: Fix `chrome.runtime.lastError` Pattern in `background.js`

**Files:**
- Modify: `background.js`

The only `lastError` usage in `background.js` is in the `getBookmarkChildren` handler (lines 145-147).

- [ ] **Step 1: Convert `getBookmarkChildren` handler to try/catch**

Find in `messageHandlers` (around line 144):

```js
getBookmarkChildren(request, sendResponse) {
    chrome.bookmarks.getChildren(request.folderId, (children) => {
        if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
        }
        sendResponse({ success: true, children: children || [] });
    });
},
```

Replace with:

```js
getBookmarkChildren(request, sendResponse) {
    browser.bookmarks.getChildren(request.folderId)
        .then(children => {
            sendResponse({ success: true, children: children || [] });
        })
        .catch(err => {
            sendResponse({ success: false, error: err.message });
        });
},
```

- [ ] **Step 2: Convert `getStats` handler to use promises**

Find (around line 134):

```js
getStats(request, sendResponse) {
    chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_STATS], (result) => {
        sendResponse(result[CONSTANTS.STORAGE.BACKUP_STATS] || {});
    });
},
```

Replace with:

```js
getStats(request, sendResponse) {
    browser.storage.local.get([CONSTANTS.STORAGE.BACKUP_STATS])
        .then(result => {
            sendResponse(result[CONSTANTS.STORAGE.BACKUP_STATS] || {});
        });
},
```

- [ ] **Step 3: Convert `getBookmarkTree` handler to use promises**

Find (around line 139):

```js
getBookmarkTree(request, sendResponse) {
    chrome.bookmarks.getTree((nodes) => {
        sendResponse({ success: true, tree: nodes });
    });
},
```

Replace with:

```js
getBookmarkTree(request, sendResponse) {
    browser.bookmarks.getTree()
        .then(nodes => {
            sendResponse({ success: true, tree: nodes });
        });
},
```

- [ ] **Step 4: Commit**

```bash
git add background.js
git commit -m "feat: convert lastError and callback patterns to promises in background.js"
```

---

### Task 8: Convert `popup.js` — Namespace Swap + Simplify sendMessage

**Files:**
- Modify: `popup.js`

- [ ] **Step 1: Replace all `chrome.` API calls with `browser.` in `popup.js`**

Same mechanical replacement as Task 4. Replace:
- `chrome.runtime.sendMessage` → `browser.runtime.sendMessage`
- `chrome.runtime.lastError` → **remove** (see Step 2 for each site)
- `chrome.storage.local.get` → `browser.storage.local.get`
- `chrome.storage.local.set` → `browser.storage.local.set`
- `chrome.tabs.query` → `browser.tabs.query`
- `chrome.i18n.getUILanguage` → `browser.i18n.getUILanguage`
- `chrome.i18n.getMessage` → `browser.i18n.getMessage`
- `chrome.tabGroups.TAB_GROUP_ID_NONE` → See Step 3

**Do NOT replace** string literals like `chrome://extensions/shortcuts` (handled in Task 10).

- [ ] **Step 2: Simplify `sendMessage` and remove `lastError` patterns**

**`sendMessage` function (around line 93-101):**

Before:
```js
function sendMessage(request) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(request, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        });
    });
}
```

After:
```js
function sendMessage(request) {
    return browser.runtime.sendMessage(request);
}
```

**`handleResponse` method (around line 847-858):**

Before:
```js
handleResponse(response) {
    if (chrome.runtime.lastError) {
        this.showStatus(Localization.get("restoreFailed"), 'error');
        return;
    }
    if (response && response.success) {
```

After:
```js
handleResponse(response) {
    if (response && response.success) {
```

**`exportBackup` method (around line 1065-1087):**

Before:
```js
chrome.runtime.sendMessage({ action: 'exportBackup', backupId, format }, (response) => {
    if (chrome.runtime.lastError) {
        this.showExportStatus(Localization.get("exportFailedMsg") + ': ' + chrome.runtime.lastError.message, 'error');
        return;
    }
    if (response && response.success) {
```

After — convert to async/await:
```js
try {
    const response = await browser.runtime.sendMessage({ action: 'exportBackup', backupId, format });
    if (response && response.success) {
```

And close the try block at the end of the function:
```js
    } else {
        this.showExportStatus(Localization.get("exportFailedMsg") + ': ' + (response ? response.error : ''), 'error');
    }
} catch (err) {
    this.showExportStatus(Localization.get("exportFailedMsg") + ': ' + err.message, 'error');
}
```

**`importBackup` method (around line 1111-1114):**

Before:
```js
chrome.runtime.sendMessage({ action: 'importBackup', data, folderId }, (response) => {
    if (chrome.runtime.lastError) {
        statusEl.textContent = (Localization.get("importFailed") || 'Import failed') + ': ' + chrome.runtime.lastError.message;
        statusEl.style.color = 'red';
```

After — convert to async/await:
```js
try {
    const response = await browser.runtime.sendMessage({ action: 'importBackup', data, folderId });
    if (response && response.success) {
```

And close with catch:
```js
    } else {
        statusEl.textContent = (Localization.get("importFailed") || 'Import failed') + ': ' + (response ? response.error : '');
        statusEl.style.color = 'red';
    }
} catch (err) {
    statusEl.textContent = (Localization.get("importFailed") || 'Import failed') + ': ' + err.message;
    statusEl.style.color = 'red';
}
```

**`handleBackupClick` method (around line 1327-1341):**

Before:
```js
chrome.runtime.sendMessage({ action: 'manualBackup', folderId, tabs, note }, (response) => {
    btn.disabled = false;
    btn.textContent = Localization.get("backupBtn");

    if (chrome.runtime.lastError) {
        this.showStatus(Localization.get("backupFailed") + chrome.runtime.lastError.message, 'error');
    } else if (response && response.success) {
```

After — convert to async/await:
```js
try {
    const response = await browser.runtime.sendMessage({ action: 'manualBackup', folderId, tabs, note });
    btn.disabled = false;
    btn.textContent = Localization.get("backupBtn");

    if (response && response.success) {
```

And close with catch:
```js
    } else if (response && response.error === 'Backup already in progress') {
        this.showStatus(Localization.get("backupInProgress") || 'Backup already in progress', 'error');
    } else {
        this.showStatus(Localization.get("backupFailed") + (response ? response.error : Localization.get("unknownError")), 'error');
    }
} catch (err) {
    btn.disabled = false;
    btn.textContent = Localization.get("backupBtn");
    this.showStatus(Localization.get("backupFailed") + err.message, 'error');
}
```

**Other callback-based `sendMessage` calls (lines 683, 823, 1388, 1483):**

These already use the `sendMessage()` wrapper (which now returns a promise). After the `sendMessage` simplification in Step 2, they automatically use the promise version. No additional changes needed for these — they already `await sendMessage(...)` or `.then()`.

- [ ] **Step 3: Fix `chrome.tabGroups.TAB_GROUP_ID_NONE` in `TabManager.getSelectedTabs`**

Find around line 400:
```js
groupId: cb.dataset.groupId ? parseInt(cb.dataset.groupId, 10) : (chrome.tabGroups ? chrome.tabGroups.TAB_GROUP_ID_NONE : -1)
```

Replace with:
```js
groupId: cb.dataset.groupId ? parseInt(cb.dataset.groupId, 10) : (BrowserDetect.supportsTabGroups ? browser.tabGroups.TAB_GROUP_ID_NONE : -1)
```

- [ ] **Step 4: Convert `SettingsManager` callback patterns to async/await**

Find (around line 173-185):
```js
const SettingsManager = {
    async load() {
        return new Promise(resolve => {
            const keys = Object.values(CONSTANTS.STORAGE);
            chrome.storage.local.get(keys, resolve);
        });
    },

    save(settings) {
        return new Promise(resolve => {
            chrome.storage.local.set(settings, resolve);
        });
    }
};
```

After:
```js
const SettingsManager = {
    async load() {
        const keys = Object.values(CONSTANTS.STORAGE);
        return browser.storage.local.get(keys);
    },

    async save(settings) {
        return browser.storage.local.set(settings);
    }
};
```

- [ ] **Step 5: Convert `TabManager.loadOpenTabs` callback to async**

Find (around line 202):
```js
chrome.tabs.query(queryOpts, (allTabs) => {
```

Convert to async:
```js
const allTabs = await browser.tabs.query(queryOpts);
```

This requires making the enclosing function `async` if it isn't already. The `loadOpenTabs` method should become `async loadOpenTabs()`.

- [ ] **Step 6: Verify no `chrome.` API calls remain**

Run:
```powershell
cd D:\Opencode\smart-tab-booker
Select-String -Path popup.js -Pattern 'chrome\.' | Where-Object { $_.Line -notmatch 'chrome://' -and $_.Line -notmatch 'chrome-extension://' }
```

Expected: **zero results** (except possibly `chrome.tabGroups` which should have been replaced with `browser.tabGroups` or `BrowserDetect.supportsTabGroups`).

- [ ] **Step 7: Commit**

```bash
git add popup.js
git commit -m "feat: convert popup.js chrome.* API calls to browser.* and simplify callbacks"
```

---

### Task 9: Add Browser-Specific URL Handling in `popup.js`

**Files:**
- Modify: `popup.js`

- [ ] **Step 1: Fix shortcut link URL**

Find around line 1193:
```js
chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
```

Replace with:
```js
browser.tabs.create({ url: BrowserDetect.shortcutUrl });
```

- [ ] **Step 2: Commit**

```bash
git add popup.js
git commit -m "feat: use BrowserDetect for browser-specific URLs in popup.js"
```

---

### Task 10: Update `popup.html` — Add Polyfill and Browser-Detect Scripts

**Files:**
- Modify: `popup.html`

- [ ] **Step 1: Add script tags before `popup.js`**

Find line 287:
```html
    <script src="popup.js"></script>
```

Replace with:
```html
    <script src="browser-polyfill.js"></script>
    <script src="browser-detect.js"></script>
    <script src="popup.js"></script>
```

The polyfill must load first so `browser.*` API is available when `popup.js` runs. `browser-detect.js` must load before `popup.js` so `BrowserDetect` is available.

- [ ] **Step 2: Commit**

```bash
git add popup.html
git commit -m "feat: add browser-polyfill and browser-detect scripts to popup.html"
```

---

### Task 11: Hide Tab Groups Toggles on Firefox (CSS + JS)

**Files:**
- Modify: `popup.css`
- Modify: `popup.js`

When `BrowserDetect.supportsTabGroups` is false, the "Preserve Tab Groups" and "Restore Preserve Groups" toggles should be hidden.

- [ ] **Step 1: Add CSS class for hiding unsupported features**

Add to `popup.css`:

```css
.unsupported-feature {
    display: none !important;
}
```

- [ ] **Step 2: Add feature detection in `popup.js` initialization**

In `popup.js`, find the initialization section (where DOM elements are set up). Add after `BrowserDetect` is available:

```js
if (!BrowserDetect.supportsTabGroups) {
    const preserveGroups = DOM.get(CONSTANTS.SELECTORS.PRESERVE_GROUPS_TOGGLE);
    const restorePreserveGroups = DOM.get(CONSTANTS.SELECTORS.RESTORE_PRESERVE_GROUPS_TOGGLE);
    if (preserveGroups) preserveGroups.closest('.setting-row').classList.add('unsupported-feature');
    if (restorePreserveGroups) restorePreserveGroups.closest('.setting-row').classList.add('unsupported-feature');
}
```

This finds the toggle's parent `.setting-row` and hides the entire row when tab groups aren't supported.

- [ ] **Step 3: Commit**

```bash
git add popup.css popup.js
git commit -m "feat: hide tab groups toggles on browsers without tab groups support"
```

---

### Task 12: Update Packaging Script for Dual Target

**Files:**
- Modify: `scripts/package_extension.py`

- [ ] **Step 1: Add `--target` argument and dual packaging logic**

Replace the entire `package_extension.py` with:

```python
import zipfile
import os
import sys
import json
import shutil

def package_extension(target='chrome'):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    with open(os.path.join(project_dir, 'manifest.json'), 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version', '1.0')

    exclude_dirs = {'.git', '__pycache__', 'scripts', 'docs'}
    exclude_files = {'.gitignore', '.DS_Store', 'CHANGELOG.md', 'README.md',
                     'STORE_LISTING.md', 'validate_keys.js', 'package_extension.py',
                     'AGENTS.md'}
    if target == 'chrome':
        exclude_files.add('manifest-firefox.json')
    elif target == 'firefox':
        exclude_files.add('manifest.json')
    exclude_patterns = ['smart-tab-booker-v']

    output_zip = os.path.join(project_dir, f'smart-tab-booker-v{version}-{target}.zip')

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_dir):
            rel_root = os.path.relpath(root, project_dir)
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                if file in exclude_files:
                    continue
                if any(p in file for p in exclude_patterns) and file.endswith('.zip'):
                    continue

                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, project_dir)

                if target == 'firefox' and file == 'manifest-firefox.json':
                    arcname = os.path.join(os.path.dirname(arcname), 'manifest.json') if os.path.dirname(arcname) else 'manifest.json'

                print(f"Adding {arcname}")
                zipf.write(file_path, arcname)

    size_kb = os.path.getsize(output_zip) / 1024
    print(f"\nPackaging complete!")
    print(f"Target: {target}")
    print(f"Created: {output_zip} ({size_kb:.1f} KB)")

if __name__ == '__main__':
    target = 'chrome'
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower().strip('--')
        if arg in ('firefox', 'ff'):
            target = 'firefox'
        elif arg in ('chrome', 'cr'):
            target = 'chrome'
        else:
            print(f"Unknown target: {arg}. Use 'chrome' or 'firefox'.")
            sys.exit(1)
    package_extension(target)
```

**Key changes:**
- Accepts `--chrome` (default) or `--firefox` argument
- Chrome build: excludes `manifest-firefox.json`, uses `manifest.json`
- Firefox build: excludes `manifest.json`, renames `manifest-firefox.json` → `manifest.json` in the ZIP
- Output filename includes target: `smart-tab-booker-v1.5-chrome.zip` or `smart-tab-booker-v1.5-firefox.zip`

- [ ] **Step 2: Test packaging for both targets**

Run:
```powershell
cd D:\Opencode\smart-tab-booker
python scripts\package_extension.py --chrome
python scripts\package_extension.py --firefox
```

Verify both ZIPs are created and contain correct manifests.

- [ ] **Step 3: Commit**

```bash
git add scripts/package_extension.py
git commit -m "feat: add --target flag to packaging script for Chrome/Firefox builds"
```

---

### Task 13: Final Verification — No Remaining `chrome.` API Calls

**Files:**
- All JS files

- [ ] **Step 1: Search for any remaining `chrome.` API calls**

Run:
```powershell
cd D:\Opencode\smart-tab-booker
Select-String -Path background.js, popup.js -Pattern 'chrome\.' | Where-Object { $_.Line -notmatch 'chrome://' -and $_.Line -notmatch 'chrome-extension://' }
```

Expected: **zero results**. If any remain, fix them.

- [ ] **Step 2: Verify `browser-polyfill.js` loads correctly**

Check that `browser-polyfill.js` exists in project root and is a valid JS file (not empty, starts with valid JS).

- [ ] **Step 3: Verify `browser-detect.js` exists and exports `BrowserDetect`**

- [ ] **Step 4: Verify `manifest-firefox.json` has no `tabGroups` permission**

Run:
```powershell
Select-String -Path manifest-firefox.json -Pattern 'tabGroups'
```

Expected: **zero results**.

- [ ] **Step 5: Verify `manifest.json` still has `tabGroups` permission**

Run:
```powershell
Select-String -Path manifest.json -Pattern 'tabGroups'
```

Expected: **one result** (the Chrome manifest keeps `tabGroups`).

---

## Self-Review Checklist

**1. Spec coverage:**

| Spec Section | Task |
|-------------|------|
| §1 Add browser-polyfill.js | Task 1 |
| §2 Create manifest-firefox.json | Task 3 |
| §3 Create browser-detect.js | Task 2 |
| §4 Convert chrome.* → browser.* | Task 4, Task 8 |
| §5 Feature detection for tab groups | Task 5 |
| §6 Browser-specific URL handling | Task 6, Task 9 |
| §7 Remove lastError pattern | Task 7, Task 8 |
| §8 Packaging script update | Task 12 |
| §9 popup.html script tags | Task 10 |
| (Additional) Hide tab groups toggles | Task 11 |

All spec sections covered. ✅

**2. Placeholder scan:** No TBD, TODO, or placeholder patterns found. ✅

**3. Type consistency:** `BrowserDetect.supportsTabGroups` used consistently in Task 5 (background.js) and Task 8/11 (popup.js). `BrowserDetect.NEW_TAB_URLS` used in Task 6. `BrowserDetect.shortcutUrl` used in Task 9. All consistent. ✅