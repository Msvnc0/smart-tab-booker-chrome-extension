# Firefox/Zen Browser Compatibility Design

**Date:** 2025-06-14
**Status:** Approved

## Goal

Make Smart Tab Booker work as a native Firefox extension (AMO-publishable) while maintaining full Chrome/Brave/Helium compatibility. Single codebase, two manifest files, runtime feature detection.

## Approach: webextension-polyfill + Feature Detection

Use Mozilla's `browser` API namespace (`browser.*`) throughout the codebase. The `webextension-polyfill` library makes this work on Chrome by mapping `browser.*` → `chrome.*` + converting callbacks to promises. On Firefox/Zen, `browser.*` is native — polyfill is a no-op.

**Why this approach:**
- Proven pattern used by uBlock Origin, Dark Reader, Bitwarden, Privacy Badger
- Firefox AMO review passes — `browser.*` is the native Firefox extension API
- Zero feature loss on Chrome — polyfill transparently maps everything
- Zen Browser's tab groups work via feature detection (`browser.tabGroups` exists → use it)

## Changes

### 1. Add `browser-polyfill.js`

- Download `browser-polyfill.min.js` from [mozilla/webextension-polyfill](https://github.com/mozilla/webextension-polyfill) (~25KB)
- Place in project root
- Load in `manifest.json` (Chrome): `background.service_worker` imports it first via `importScripts('browser-polyfill.js')`
- Load in `manifest-firefox.json` (Firefox): `background.scripts` includes it first
- Add `<script src="browser-polyfill.js"></script>` as first script in `popup.html`

### 2. Create `manifest-firefox.json`

Identical to `manifest.json` except:
- Remove `tabGroups` from permissions (Firefox doesn't support it, will reject)
- Add `browser_specific_settings.gecko` with extension ID and `strict_min_version: "109.0"`
- Change `background` from `service_worker` to `scripts: ["browser-polyfill.js", "background.js"]` (Firefox MV3 supports service workers since 109, but `scripts` is more reliable for polyfill loading)
- No other changes — permissions, commands, icons, locales all compatible

### 3. Create `browser-detect.js` (shared module)

```js
const BrowserDetect = {
  get isFirefox() {
    return typeof browser !== 'undefined' && browser.runtime && !!browser.runtime.getBrowserInfo;
  },
  get supportsTabGroups() {
    return !!(typeof browser !== 'undefined' && browser.tabGroups);
  }
};
```

- `isFirefox` — runtime detection for Firefox-specific behavior (URLs, UI)
- `supportsTabGroups` — checks if `browser.tabGroups` API exists (true on Chrome, true on Zen Browser, false on vanilla Firefox)

### 4. Convert all `chrome.*` → `browser.*`

Every API call in both `background.js` and `popup.js` changes namespace:
- `chrome.runtime.sendMessage` → `browser.runtime.sendMessage`
- `chrome.bookmarks.create` → `browser.bookmarks.create`
- `chrome.storage.local.get` → `browser.storage.local.get`
- `chrome.tabs.query` → `browser.tabs.query`
- `chrome.alarms.create` → `browser.alarms.create`
- `chrome.contextMenus.create` → `browser.contextMenus.create`
- `chrome.action.setBadgeText` → `browser.action.setBadgeText`
- `chrome.windows.create` → `browser.windows.create`
- `chrome.i18n.getMessage` → `browser.i18n.getMessage`
- etc.

This is a global find-and-replace — no logic changes, just namespace swap.

### 5. Feature Detection for Tab Groups

**`background.js` — `saveTabsWithGroups()`:**
```js
async function saveTabsWithGroups(parentId, tabs) {
  if (!BrowserDetect.supportsTabGroups) {
    return saveTabsAsBookmarks(parentId, tabs);
  }
  // existing group logic unchanged...
}
```

**`background.js` — `restoreTabsWithGroups()`:**
```js
async function restoreTabsWithGroups(windowId, bookmarks) {
  if (!BrowserDetect.supportsTabGroups) {
    return restoreTabsFlat(windowId, bookmarks.filter(b => b.url && isValidUrl(b.url)));
  }
  // existing group restore logic unchanged...
}
```

**`popup.js` — `TabManager.getSelectedTabs()` (line 400):**
```js
groupId: cb.dataset.groupId ? parseInt(cb.dataset.groupId, 10) : (BrowserDetect.supportsTabGroups ? browser.tabGroups.TAB_GROUP_ID_NONE : -1)
```

**`popup.js` — Preserve Groups toggle visibility:**
- In `SettingsManager.init()`, hide `preserveGroupsToggle` if `!BrowserDetect.supportsTabGroups`
- Same for `restorePreserveGroupsToggle`

### 6. Browser-Specific URL Handling

**`isValidUrl()` — add `moz-extension://`:**
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

**New tab detection (background.js lines 619, 780):**
```js
const newTabUrls = ['chrome://newtab/', 'about:newtab/', 'about:home/'];
const newTab = tabs.find(t => newTabUrls.includes(t.url));
```

**Shortcut link (popup.js line 1193):**
```js
const shortcutUrl = BrowserDetect.isFirefox
  ? 'about:addons'
  : 'chrome://extensions/shortcuts';
browser.tabs.create({ url: shortcutUrl });
```

### 7. Remove `chrome.runtime.lastError` Pattern

The `lastError` pattern is used in 5 locations. With `browser.*` API (promise-based), all of these are replaced by promise rejection handling.

**`popup.js` — `sendMessage` wrapper (lines 95-97):**
```js
// Before:
chrome.runtime.sendMessage(request, (response) => {
  if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
  resolve(response);
});
// After:
async function sendMessage(request) {
  return browser.runtime.sendMessage(request);
}
```

**`popup.js` — `handleResponse` (line 848):**
```js
// Before:
if (chrome.runtime.lastError) { reject(...); return; }
// After: removed — promise rejection handles errors
```

**`popup.js` — exportBackup callback (lines 1066-1067):**
```js
// Before:
if (chrome.runtime.lastError) { reject(...); return; }
// After: removed
```

**`popup.js` — importBackup callback (lines 1112-1113):**
```js
// Before:
if (chrome.runtime.lastError) { reject(...); return; }
// After: removed
```

**`popup.js` — handleBackupClick callback (lines 1331-1332):**
```js
// Before:
if (chrome.runtime.lastError) { reject(...); return; }
// After: removed
```

**`background.js` — getBookmarkChildren handler (lines 146-147):**
```js
// Before:
if (chrome.runtime.lastError) { sendResponse({ success: false, error: chrome.runtime.lastError.message }); return; }
// After: try/catch with await — error is caught naturally
```

All other callback-based API calls similarly convert to `await browser.*`:
- `browser.storage.local.get()` → returns promise
- `browser.bookmarks.getTree()` → returns promise
- `browser.tabs.query()` → returns promise
- etc.

This actually **simplifies** the code — removes many callback wrappers.

### 8. Packaging Script Update

Update `scripts/package_extension.py`:
- Accept `--target chrome` (default) or `--target firefox`
- Chrome: use `manifest.json`, exclude `manifest-firefox.json`, `browser-detect.js` source (only polyfill output)
- Firefox: copy `manifest-firefox.json` as `manifest.json`, exclude Chrome manifest, include `browser-polyfill.js` and `browser-detect.js`
- Both: exclude `docs/`, `scripts/`, `.git/`, etc. (same as current)
- Version string from `manifest.json` (shared version field)

### 9. `popup.html` Change

Add polyfill as first script:
```html
<script src="browser-polyfill.js"></script>
<script src="browser-detect.js"></script>
<script src="popup.js"></script>
```

## Files Modified

| File | Change |
|------|--------|
| `background.js` | `chrome.*` → `browser.*`, add `importScripts`, feature detection for tabGroups, URL fixes |
| `popup.js` | `chrome.*` → `browser.*`, simplify `sendMessage`, feature detection, URL fixes |
| `popup.html` | Add `browser-polyfill.js` and `browser-detect.js` script tags |
| `manifest.json` | Add `importScripts` in service worker, add `browser-polyfill.js` to web_accessible_resources if needed |
| `manifest-firefox.json` | New file — Firefox-specific manifest |
| `browser-polyfill.js` | New file — downloaded from npm/Mozilla |
| `browser-detect.js` | New file — feature detection module |
| `popup.css` | Possibly hide tab groups toggle when unsupported |
| `scripts/package_extension.py` | Add `--target` flag for Chrome/Firefox packaging |

## Files NOT Modified

- `_locales/` — no changes needed, i18n works identically
- `popup.css` — dark mode and layout unchanged (minor addition possible for toggle hiding)
- `images/` — unchanged

## Testing Checklist

- [ ] Chrome/Brave/Helium: all features work identically to current version
- [ ] Firefox: backup/restore works without tab groups
- [ ] Zen Browser: backup/restore works with tab groups (if API available)
- [ ] Tab groups toggle hidden on Firefox, visible on Chrome/Zen
- [ ] Shortcut link opens correct page per browser
- [ ] Scheduled backups work via `browser.alarms`
- [ ] Context menus work
- [ ] `about:newtab` and `chrome://newtab` both detected
- [ ] `moz-extension://` URLs filtered by `isValidUrl`
- [ ] AMO submission passes review