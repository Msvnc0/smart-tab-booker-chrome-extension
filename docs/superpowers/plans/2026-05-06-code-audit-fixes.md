# Code Audit Fixes — Bug, Dead Code, Code Quality

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 bugs, remove all dead code, and resolve code quality issues identified in the code audit of Smart Tab Booker v1.5.

**Architecture:** Direct file edits to `background.js`, `popup.js`, `popup.css`, `popup.html`, `scripts/package_extension.py`, and all 18 `_locales/*/messages.json` files. No new files, no restructuring — only cleanup and bug fixes.

**Tech Stack:** Vanilla JS (Chrome Extension Manifest V3), CSS, Python (packaging script)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `background.js` | Modify | Fix catch variable bugs, date inconsistency, shadowed variables, dead CONSTANTS |
| `popup.js` | Modify | Fix catch variable bug, remove dead code, improve rendering performance |
| `popup.css` | Modify | Remove unused CSS classes, consolidate dark mode overrides |
| `popup.html` | Modify | Minor inline style cleanup where CSS classes exist |
| `scripts/package_extension.py` | Modify | Add AGENTS.md to exclude list |
| `_locales/*/messages.json` (18 files) | Modify | Remove unused i18n keys |

---

## Task 1: Fix catch block wrong variable names (BUG-01)

**Files:**
- Modify: `background.js:608, 636, 653, 656`
- Modify: `popup.js:741`

5 `catch (err)` blocks reference undefined `e` instead of `err`. This causes `ReferenceError` at runtime.

- [ ] **Step 1: Fix background.js `restoreTabsFlat` catch block (line 608)**

```js
// BEFORE (line 608):
} catch (err) {
    console.warn('Failed to create tab:', bm.url, e);
}

// AFTER:
} catch (err) {
    console.warn('Failed to create tab:', bm.url, err);
}
```

- [ ] **Step 2: Fix background.js `restoreTabsWithGroups` — tab creation catch (line 636)**

```js
// BEFORE (line 636):
} catch (err) {
    console.warn('Failed to create tab:', bm.url, e);
}

// AFTER:
} catch (err) {
    console.warn('Failed to create tab:', bm.url, err);
}
```

- [ ] **Step 3: Fix background.js `restoreTabsWithGroups` — group creation catch (line 653)**

```js
// BEFORE (line 653):
} catch (err) {
    console.warn('Failed to create tab group:', e);
}

// AFTER:
} catch (err) {
    console.warn('Failed to create tab group:', err);
}
```

- [ ] **Step 4: Fix background.js `restoreTabsWithGroups` — folder processing catch (line 656)**

```js
// BEFORE (line 656):
} catch (err) {
    console.warn('Failed to process folder:', folder.title, e);
}

// AFTER:
} catch (err) {
    console.warn('Failed to process folder:', folder.title, err);
}
```

- [ ] **Step 5: Fix popup.js `restoreTabsList` catch block (line 741)**

```js
// BEFORE (line 741):
} catch (err) {
    console.warn('Failed to restore tab:', tab.url, e);
}

// AFTER:
} catch (err) {
    console.warn('Failed to restore tab:', tab.url, err);
}
```

- [ ] **Step 6: Commit**

```bash
git add background.js popup.js
git commit -m "fix: correct catch block variable name e -> err in 5 locations"
```

---

## Task 2: Fix date UTC/local inconsistency in generateBackupFolderName (BUG-02)

**Files:**
- Modify: `background.js:435-444`

`toISOString()` gives UTC date but `getHours()`/`getMinutes()` give local time. This produces folder names like `Backup_2026-01-01_01-30` when local time is 01:30 on Jan 2 (UTC is still Jan 1). Switch entirely to UTC for consistency with `extractDateFromFolderName`.

- [ ] **Step 1: Replace `generateBackupFolderName` function**

```js
// BEFORE (lines 435-444):
function generateBackupFolderName(note = '') {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    let name = `Backup_${dateStr}_${timeStr}`;
    if (note) {
        name += ` (${note})`;
    }
    return name;
}

// AFTER:
function generateBackupFolderName(note = '') {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}-${String(now.getUTCMinutes()).padStart(2, '0')}`;
    let name = `Backup_${dateStr}_${timeStr}`;
    if (note) {
        name += ` (${note})`;
    }
    return name;
}
```

- [ ] **Step 2: Commit**

```bash
git add background.js
git commit -m "fix: use UTC consistently in generateBackupFolderName"
```

---

## Task 3: Fix shadowed catch variables (BUG-06)

**Files:**
- Modify: `background.js:594`
- Modify: `popup.js:754`

Inner `catch (err)` shadows outer `catch (err)`. Rename inner variables to `removeErr`.

- [ ] **Step 1: Fix background.js `restoreFromBookmarks` inner catch (line 594)**

```js
// BEFORE (line 594):
try { await chrome.windows.remove(window.id); } catch (err) { console.error('Failed to remove window:', err); }

// AFTER:
try { await chrome.windows.remove(window.id); } catch (removeErr) { console.error('Failed to remove window:', removeErr); }
```

- [ ] **Step 2: Fix popup.js `restoreTabsList` inner catch (line 754)**

```js
// BEFORE (line 754):
try { await chrome.windows.remove(window.id); } catch (err) { console.error('Failed to remove window:', err); }

// AFTER:
try { await chrome.windows.remove(window.id); } catch (removeErr) { console.error('Failed to remove window:', removeErr); }
```

- [ ] **Step 3: Commit**

```bash
git add background.js popup.js
git commit -m "fix: rename shadowed catch variables to removeErr"
```

---

## Task 4: Fix cleanupOldBackups cutoffDate timezone inconsistency (QUALITY-07)

**Files:**
- Modify: `background.js:512`

`extractDateFromFolderName` returns UTC milliseconds via `Date.UTC()`, but `cutoffDate` is created with `new Date(...)` which uses local timezone. This causes off-by-one-day errors near midnight.

- [ ] **Step 1: Fix `cleanupOldBackups` to use UTC for cutoff**

```js
// BEFORE (line 512):
const cutoffDate = new Date(Date.now() - cleanupDays * 24 * 60 * 60 * 1000);

// AFTER:
const cutoffDate = Date.now() - cleanupDays * 24 * 60 * 60 * 1000;
```

Also update the comparison on line 519:

```js
// BEFORE (line 519):
if (folderDate && folderDate < cutoffDate) {

// AFTER (same, but now cutoffDate is a number, not a Date object — comparison still works correctly):
if (folderDate && folderDate < cutoffDate) {
```

No change needed on line 519 since `extractDateFromFolderName` already returns a number (UTC timestamp) and `cutoffDate` is now also a number.

- [ ] **Step 2: Commit**

```bash
git add background.js
git commit -m "fix: use consistent UTC timestamp comparison in cleanupOldBackups"
```

---

## Task 5: Remove unused CONSTANTS from background.js (DEAD-04)

**Files:**
- Modify: `background.js:38`

`MAX_BACKUP_TIMES: 5` is never used in background.js.

- [ ] **Step 1: Remove the unused constant**

```js
// BEFORE (line 38):
    MAX_BACKUP_TIMES: 5,
    // Timeouts

// AFTER:
    // Timeouts
```

- [ ] **Step 2: Commit**

```bash
git add background.js
git commit -m "cleanup: remove unused MAX_BACKUP_TIMES from background.js CONSTANTS"
```

---

## Task 6: Remove unused CSS classes (DEAD-01)

**Files:**
- Modify: `popup.css`

Remove CSS classes that have no corresponding HTML/JS usage:

- `.preview-row` and `.preview-row input[type="checkbox"]` — only `.restore-preview-row` is used
- `.preview-label` — never used in HTML or JS
- `.collapse-header`, `.collapse-header .collapse-arrow`, `.collapse-header.collapsed .collapse-arrow` — HTML uses `.collapsible-header` + `.collapse-icon`
- `.compare-section`, `.compare-section h4`, `.compare-section .compare-added`, `.compare-section .compare-removed`, `.compare-section .compare-common`, `.compare-item` — JS uses inline styles
- `.search-input` — HTML uses `#searchInput` with inline styles
- `.tools-section` — never used in HTML
- `.filter-row`, `.filter-row input` — never used in HTML

- [ ] **Step 1: Remove `.preview-row` rules (lines 410-411, 417-419)**

Delete these lines:
```css
.preview-row,
.restore-preview-row {
```
Replace with:
```css
.restore-preview-row {
```

And delete:
```css
.preview-row input[type="checkbox"],
.restore-preview-row input[type="checkbox"] {
```
Replace with:
```css
.restore-preview-row input[type="checkbox"] {
```

- [ ] **Step 2: Remove `.preview-label` rule (lines 423-429)**

Delete entirely:
```css
.preview-label {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}
```

- [ ] **Step 3: Remove `.compare-section` rules (lines 431-451)**

Delete entirely:
```css
.compare-section {
    margin-top: 4px;
}

.compare-section h4 {
    font-size: 11px;
    margin: 4px 0 2px 0;
    font-weight: 600;
}

.compare-section .compare-added { color: #4CAF50; }
.compare-section .compare-removed { color: #F44336; }
.compare-section .compare-common { color: #888; }

.compare-item {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 1px 0;
}
```

Also delete the dark-mode overrides for these:
```css
.dark-mode .compare-section .compare-added { color: #66BB6A; }
.dark-mode .compare-section .compare-removed { color: #ef5350; }
.dark-mode .compare-section .compare-common { color: #777; }
```

- [ ] **Step 4: Remove `.collapse-header` rules (lines 506-521)**

Delete entirely:
```css
.collapse-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
}

.collapse-header .collapse-arrow {
    transition: transform 0.2s;
    font-size: 12px;
}

.collapse-header.collapsed .collapse-arrow {
    transform: rotate(-90deg);
}
```

- [ ] **Step 5: Remove `.search-input` rule (lines 494-504)**

Delete entirely:
```css
.search-input {
    width: 100%;
    padding: 6px 8px;
    font-size: 12px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    box-sizing: border-box;
    margin-bottom: 8px;
    background-color: var(--bg-color);
    color: var(--text-color);
}
```

And its dark-mode override:
```css
.dark-mode .search-input {
    background-color: var(--bg-color);
    color: var(--text-color);
    border-color: var(--input-border);
}
```

- [ ] **Step 6: Remove `.tools-section` rule (lines 483-486)**

Change:
```css
.section + .section,
.tools-section {
    margin-bottom: 12px;
}
```
To:
```css
.section + .section {
    margin-bottom: 12px;
}
```

- [ ] **Step 7: Remove `.filter-row` rules (lines 523-537)**

Delete entirely:
```css
.filter-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
}

.filter-row input {
    flex: 1;
    padding: 5px 8px;
    font-size: 12px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    background-color: var(--bg-color);
    color: var(--text-color);
}
```

And its dark-mode override:
```css
.dark-mode .filter-row input {
    background-color: var(--bg-color);
    color: var(--text-color);
    border-color: var(--input-border);
}
```

- [ ] **Step 8: Commit**

```bash
git add popup.css
git commit -m "cleanup: remove unused CSS classes (preview-row, compare-section, collapse-header, search-input, filter-row, tools-section)"
```

---

## Task 7: Remove unused i18n keys from all 18 locales (DEAD-02)

**Files:**
- Modify: `_locales/en/messages.json`
- Modify: `_locales/tr/messages.json`
- Modify: `_locales/de/messages.json`
- Modify: `_locales/fr/messages.json`
- Modify: `_locales/es/messages.json`
- Modify: `_locales/it/messages.json`
- Modify: `_locales/pt_BR/messages.json`
- Modify: `_locales/ru/messages.json`
- Modify: `_locales/ja/messages.json`
- Modify: `_locales/zh_CN/messages.json`
- Modify: `_locales/ko/messages.json`
- Modify: `_locales/pl/messages.json`
- Modify: `_locales/nl/messages.json`
- Modify: `_locales/id/messages.json`
- Modify: `_locales/vi/messages.json`
- Modify: `_locales/ar/messages.json`
- Modify: `_locales/hi/messages.json`
- Modify: `_locales/th/messages.json`

The following keys are defined in messages.json but never referenced in `popup.js`, `popup.html`, or `background.js` (verified by searching for `Localization.get("keyName")`, `chrome.i18n.getMessage("keyName")`, and `data-i18n="keyName"`):

- `windowLabel` — no reference
- `pinnedTab` — no reference
- `added` — `compareAdded` is used instead
- `removed` — `compareRemoved` is used instead
- `common` — `compareCommonLabel` is used instead
- `noBackupSelected` — no reference
- `exportSelectFolder` — no reference
- `backupTimeLabel` — no reference
- `invalidTime` — no reference

Before removing, first verify no references exist across all files. Then remove these 9 keys from each of the 18 locale files.

- [ ] **Step 1: Verify no references exist**

```bash
cd D:\Opencode\smart-tab-booker
rg -l "windowLabel|pinnedTab|\"added\"|\"removed\"|\"common\"|noBackupSelected|exportSelectFolder|backupTimeLabel|invalidTime" --include="*.js" --include="*.html" --include="*.json"
```

Only `_locales/*/messages.json` files should appear. If any `.js` or `.html` files appear, that key is still in use — skip it.

- [ ] **Step 2: Remove all 9 unused keys from `_locales/en/messages.json`**

Delete these entries from the JSON object:
```json
    "windowLabel": { ... },
    "pinnedTab": { ... },
    "added": { ... },
    "removed": { ... },
    "common": { ... },
    "noBackupSelected": { ... },
    "exportSelectFolder": { ... },
    "backupTimeLabel": { ... },
    "invalidTime": { ... },
```

- [ ] **Step 3: Remove the same 9 keys from all other 17 locale files**

For each file in `_locales/{tr,de,fr,es,it,pt_BR,ru,ja,zh_CN,ko,pl,nl,id,vi,ar,hi,th}/messages.json`, remove the same 9 key entries.

- [ ] **Step 4: Validate JSON is valid in all files**

```bash
cd D:\Opencode\smart-tab-booker
python -c "import json, glob; [json.load(open(f)) for f in glob.glob('_locales/*/messages.json')]; print('All JSON valid')"
```

- [ ] **Step 5: Commit**

```bash
git add _locales/
git commit -m "cleanup: remove 9 unused i18n keys from all 18 locales"
```

---

## Task 8: Remove dead wrapper methods in popup.js (DEAD-03)

**Files:**
- Modify: `popup.js:402-405` — `BookmarkManager.processNodes`
- Modify: `popup.js:471-473` — `RestoreManager.processFolderNodes`
- Modify: `popup.js:1061-1063` — `ToolsManager.processNodes`

All three are single-line wrappers that just call `BookmarkTreeHelper.populateFolderSelect`. Inline the call at each call site and remove the wrapper.

- [ ] **Step 1: Inline `BookmarkManager.processNodes` call**

In `BookmarkManager.init` (line 393), replace:
```js
this.processNodes(nodes, 0, savedId);
```
With:
```js
BookmarkTreeHelper.populateFolderSelect(select, nodes, 0, savedId);
```

Then delete the `processNodes` method (lines 402-405):
```js
// DELETE:
processNodes(nodes, depth, savedId) {
    const select = DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT);
    BookmarkTreeHelper.populateFolderSelect(select, nodes, depth, savedId);
}
```

- [ ] **Step 2: Inline `RestoreManager.processFolderNodes` call**

In `RestoreManager.loadBackupFolders` (line 463), replace:
```js
this.processFolderNodes(nodes, 0, savedFolderId, select);
```
With:
```js
BookmarkTreeHelper.populateFolderSelect(select, nodes, 0, savedFolderId);
```

Then delete the `processFolderNodes` method (lines 471-473):
```js
// DELETE:
processFolderNodes(nodes, depth, savedId, select) {
    BookmarkTreeHelper.populateFolderSelect(select, nodes, depth, savedId);
}
```

- [ ] **Step 3: Inline `ToolsManager.processNodes` call**

In `ToolsManager.loadFolderTree` (line 1053), replace:
```js
this.processNodes(nodes, 0, savedFolderId, select);
```
With:
```js
BookmarkTreeHelper.populateFolderSelect(select, nodes, 0, savedFolderId);
```

Then delete the `processNodes` method (lines 1061-1063):
```js
// DELETE:
processNodes(nodes, depth, savedId, select) {
    BookmarkTreeHelper.populateFolderSelect(select, nodes, depth, savedId);
}
```

- [ ] **Step 4: Commit**

```bash
git add popup.js
git commit -m "refactor: inline dead wrapper methods, call BookmarkTreeHelper directly"
```

---

## Task 9: Parallelize RestoreManager.renderBackups for performance (QUALITY-05)

**Files:**
- Modify: `popup.js:547-553`

Current code counts bookmarks sequentially (N+1 problem). Use `Promise.all` to count in parallel.

- [ ] **Step 1: Replace `renderBackups` with parallel version**

```js
// BEFORE (lines 547-553):
async renderBackups(container, backups) {
    for (const backup of backups) {
        const count = await this.countBookmarks(backup.id);
        const item = this.createBackupItem(backup, count);
        container.appendChild(item);
    }
},

// AFTER:
async renderBackups(container, backups) {
    const counts = await Promise.all(backups.map(b => this.countBookmarks(b.id)));
    backups.forEach((backup, i) => {
        const item = this.createBackupItem(backup, counts[i]);
        container.appendChild(item);
    });
},
```

- [ ] **Step 2: Commit**

```bash
git add popup.js
git commit -m "perf: parallelize bookmark counting in renderBackups with Promise.all"
```

---

## Task 10: Move inline styles to CSS classes in popup.js (QUALITY-03 — partial)

**Files:**
- Modify: `popup.css`
- Modify: `popup.js`

Move the most frequently repeated inline styles in `popup.js` to CSS classes. This improves dark mode compatibility and maintainability.

- [ ] **Step 1: Add CSS classes for restore preview elements**

Add to `popup.css` before the RTL section:

```css
.restore-preview-loading {
    font-size: 12px;
    color: #888;
}

.restore-preview-header {
    font-size: 12px;
    margin-bottom: 6px;
    font-weight: bold;
}

.restore-preview-label {
    font-size: 11px;
    margin-left: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
    max-width: 280px;
}

.compare-result-error {
    color: red;
}

.compare-section-heading {
    font-weight: bold;
    font-size: 12px;
    margin-bottom: 4px;
}

.compare-section-list {
    max-height: 100px;
    overflow-y: auto;
}

.compare-section-item {
    font-size: 11px;
    padding: 2px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dark-mode .restore-preview-loading {
    color: #888;
}

.dark-mode .compare-result-error {
    color: #f44336;
}
```

- [ ] **Step 2: Update popup.js `togglePreview` loading message (line 625)**

```js
// BEFORE:
preview.innerHTML = `<div style="font-size:12px;color:#888;">${Localization.get("loadingPreview")}</div>`;

// AFTER:
preview.innerHTML = `<div class="restore-preview-loading">${Localization.get("loadingPreview")}</div>`;
```

- [ ] **Step 3: Update popup.js `loadBackupPreview` header (line 671)**

```js
// BEFORE:
header.style.cssText = 'font-size:12px;margin-bottom:6px;font-weight:bold;';

// AFTER:
header.className = 'restore-preview-header';
```

- [ ] **Step 4: Update popup.js `loadBackupPreview` span style (line 690)**

```js
// BEFORE:
span.style.cssText = 'font-size:11px;margin-left:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:280px;';

// AFTER:
span.className = 'restore-preview-label';
```

- [ ] **Step 5: Update popup.js `loadBackupPreview` empty state (line 666)**

```js
// BEFORE:
container.innerHTML = `<div style="font-size:12px;color:#888;">${Localization.get("noBookmarksPreview")}</div>`;

// AFTER:
container.innerHTML = `<div class="restore-preview-loading">${Localization.get("noBookmarksPreview")}</div>`;
```

- [ ] **Step 6: Update popup.js `compareBackups` — error messages (lines 738, 744)**

```js
// BEFORE (line 738):
result.innerHTML = `<div style="color:red;">${Localization.get("selectTwoBackups")}</div>`;

// AFTER:
result.innerHTML = `<div class="compare-result-error">${Localization.get("selectTwoBackups")}</div>`;
```

```js
// BEFORE (line 744):
result.innerHTML = `<div style="color:red;">${Localization.get("selectDiffBackups")}</div>`;

// AFTER:
result.innerHTML = `<div class="compare-result-error">${Localization.get("selectDiffBackups")}</div>`;
```

- [ ] **Step 7: Update popup.js `compareBackups` — renderSection (lines 764-780)**

Replace the `renderSection` inner function:

```js
// BEFORE:
const renderSection = (title, items, color) => {
    const section = DOM.create('div');
    section.style.marginBottom = '8px';

    const heading = DOM.create('div');
    heading.style.cssText = `font-weight:bold;color:${color};font-size:12px;margin-bottom:4px;`;
    heading.textContent = `${title} (${items.length})`;
    section.appendChild(heading);

    const list = DOM.create('div');
    list.style.cssText = 'max-height:100px;overflow-y:auto;';
    items.forEach(url => {
        const row = DOM.create('div');
        row.style.cssText = 'font-size:11px;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        row.textContent = url;
        row.title = url;
        list.appendChild(row);
    });
    section.appendChild(list);
    result.appendChild(section);
};

// AFTER:
const renderSection = (title, items, color) => {
    const section = DOM.create('div');
    section.style.marginBottom = '8px';

    const heading = DOM.create('div');
    heading.className = 'compare-section-heading';
    heading.style.color = color;
    heading.textContent = `${title} (${items.length})`;
    section.appendChild(heading);

    const list = DOM.create('div');
    list.className = 'compare-section-list';
    items.forEach(url => {
        const row = DOM.create('div');
        row.className = 'compare-section-item';
        row.textContent = url;
        row.title = url;
        list.appendChild(row);
    });
    section.appendChild(list);
    result.appendChild(section);
};
```

- [ ] **Step 8: Commit**

```bash
git add popup.css popup.js
git commit -m "refactor: move inline styles to CSS classes for better dark mode support"
```

---

## Task 11: Move stats container inline styles to CSS classes (QUALITY-03 — continued)

**Files:**
- Modify: `popup.css`
- Modify: `popup.js:1555-1597`

- [ ] **Step 1: Add stats-related CSS classes**

Add to `popup.css`:

```css
.stats-detail-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 11px;
    color: #666;
}

.stats-domain-header {
    font-weight: bold;
    font-size: 12px;
    margin-top: 8px;
    margin-bottom: 4px;
}

.dark-mode .stats-detail-row {
    color: #999;
}
```

Note: `.stat-row` already exists in CSS. We'll use it as-is and only add `.stats-detail-row` for the domain rows.

- [ ] **Step 2: Update popup.js `loadStats` — stat rows (lines 1555-1568)**

```js
// BEFORE:
const addRow = (label, value) => {
    const row = DOM.create('div');
    row.className = 'stat-row';
    row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--input-border, #ddd);font-size:12px;';

    const labelEl = DOM.create('span');
    labelEl.textContent = label;
    labelEl.style.fontWeight = 'bold';

    const valueEl = DOM.create('span');
    valueEl.textContent = value;

    row.append(labelEl, valueEl);
    container.appendChild(row);
};

// AFTER:
const addRow = (label, value) => {
    const row = DOM.create('div');
    row.className = 'stat-row';

    const labelEl = DOM.create('span');
    labelEl.textContent = label;
    labelEl.className = 'stat-label';

    const valueEl = DOM.create('span');
    valueEl.textContent = value;
    valueEl.className = 'stat-value';

    row.append(labelEl, valueEl);
    container.appendChild(row);
};
```

- [ ] **Step 3: Update popup.js `loadStats` — domain header (lines 1579-1582)**

```js
// BEFORE:
domainHeader.style.cssText = 'font-weight:bold;font-size:12px;margin-top:8px;margin-bottom:4px;';

// AFTER:
domainHeader.className = 'stats-domain-header';
```

- [ ] **Step 4: Update popup.js `loadStats` — domain rows (lines 1585-1587)**

```js
// BEFORE:
row.className = 'stat-row';
row.style.cssText = 'display:flex;justify-content:space-between;padding:2px 0;font-size:11px;color:#666;';

// AFTER:
row.className = 'stats-detail-row';
```

- [ ] **Step 5: Commit**

```bash
git add popup.css popup.js
git commit -m "refactor: move stats inline styles to CSS classes"
```

---

## Task 12: Add AGENTS.md to packaging exclude list (QUALITY-10)

**Files:**
- Modify: `scripts/package_extension.py:10`

- [ ] **Step 1: Add AGENTS.md to exclude_files set**

```python
# BEFORE (line 10):
exclude_files = {'.gitignore', '.DS_Store', 'CHANGELOG.md', 'README.md',
                 'STORE_LISTING.md', 'validate_keys.js', 'package_extension.py'}

# AFTER:
exclude_files = {'.gitignore', '.DS_Store', 'CHANGELOG.md', 'README.md',
                 'STORE_LISTING.md', 'validate_keys.js', 'package_extension.py',
                 'AGENTS.md'}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/package_extension.py
git commit -m "chore: exclude AGENTS.md from extension package"
```

---

## Task 13: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Verify no remaining references to undefined `e` in catch blocks**

```bash
rg "catch \(err\)" background.js popup.js
```

Then manually check each result does not use `e` inside the catch body.

- [ ] **Step 2: Verify no remaining unused CSS classes**

```bash
rg "preview-row|collapse-header|compare-section|search-input|filter-row|tools-section" popup.css
```

Should return no matches.

- [ ] **Step 3: Verify all JSON locale files are valid**

```bash
python -c "import json, glob; errors=[]; [errors.append(f) for f in glob.glob('_locales/*/messages.json') if not json.load(open(f))]; print('All valid' if not errors else errors)"
```

- [ ] **Step 4: Verify no broken references in JS**

```bash
rg "processNodes|processFolderNodes" popup.js
```

Should return no matches (all inlined).

- [ ] **Step 5: Verify removed i18n keys are truly gone**

```bash
rg "windowLabel|pinnedTab|\"added\"|\"removed\"|\"common\"|noBackupSelected|exportSelectFolder|backupTimeLabel|invalidTime" _locales/en/messages.json
```

Should return no matches.

---

## Summary of Changes

| Task | Type | Files |
|---|---|---|
| 1 | Bug fix (P0) | `background.js`, `popup.js` |
| 2 | Bug fix (P0) | `background.js` |
| 3 | Bug fix (P1) | `background.js`, `popup.js` |
| 4 | Bug fix (P1) | `background.js` |
| 5 | Dead code | `background.js` |
| 6 | Dead code | `popup.css` |
| 7 | Dead code | 18 `_locales/*/messages.json` |
| 8 | Dead code | `popup.js` |
| 9 | Performance | `popup.js` |
| 10 | Code quality | `popup.css`, `popup.js` |
| 11 | Code quality | `popup.css`, `popup.js` |
| 12 | Code quality | `scripts/package_extension.py` |
| 13 | Verification | — |
