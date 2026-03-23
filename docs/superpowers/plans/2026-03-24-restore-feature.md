# Geri Yükleme (Restore) Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add restore functionality to reopen backed up tabs from bookmarks.

**Architecture:** Two-tab popup UI with RestoreManager module in popup.js and restoreFromBookmarks function in background.js. Uses existing CONSTANTS pattern and Chrome Bookmarks/Tabs/TabGroups APIs.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JS, Chrome APIs

---

## File Structure

| File | Purpose |
|------|---------|
| `popup.html` | Add tab structure and restore UI |
| `popup.css` | Tab styles, restore list styles, dark mode |
| `popup.js` | Add RestoreManager module, CONSTANTS, tab switching |
| `background.js` | Add restoreFromBookmarks, restoreTabsWithGroups, handleMessage case |
| `_locales/*/messages.json` | Add translation keys (18 files) |

---

## Task 1: Update CONSTANTS in popup.js

**Files:**
- Modify: `popup.js:1-49`

- [ ] **Step 1: Add new SELECTORS constants**

Find `CONSTANTS.SELECTORS` object (starts at line ~8). Add after `INCLUDE_DUPLICATES_TOGGLE` (line ~30):

```javascript
RESTORE_TAB: 'restoreTab',
RESTORE_FOLDER_SELECT: 'restoreFolderSelect',
RESTORE_LIST: 'restoreList',
RESTORE_ALL_BTN: 'restoreAllBtn',
RESTORE_SELECTED_BTN: 'restoreSelectedBtn'
```

- [ ] **Step 2: Verify no syntax errors**

Check that CONSTANTS object is properly closed with commas.

- [ ] **Step 3: Commit**

```bash
git add popup.js
git commit -m "feat: add restore feature constants"
```

---

## Task 2: Add RestoreManager Module to popup.js

**Files:**
- Modify: `popup.js` (after BookmarkManager module, before TimeManager - around line 347)

- [ ] **Step 1: Find correct insertion point**

Read popup.js and find `BookmarkManager` object (ends around line 347). Insert RestoreManager after it.

- [ ] **Step 2: Add RestoreManager module**

```javascript
const RestoreManager = {
    selectedBackup: null,
    tabCount: 0,

    init(savedFolderId) {
        this.loadBackupFolders(savedFolderId);
        this.setupEventListeners();
        this.updateButtonStates(false);
    },

    loadBackupFolders(savedFolderId) {
        chrome.bookmarks.getTree((nodes) => {
            const select = DOM.get(CONSTANTS.SELECTORS.RESTORE_FOLDER_SELECT);
            const defaultText = Localization.get("selectBackupFolder");
            select.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
            this.processFolderNodes(nodes, 0, savedFolderId, select);
        });
    },

    processFolderNodes(nodes, depth, savedId, select) {
        for (const node of nodes) {
            if (!node.url && node.id !== '0') {
                const option = DOM.create('option');
                option.value = node.id;
                option.textContent = this.formatFolderTitle(node, depth);
                if (node.id === savedId) option.selected = true;
                select.appendChild(option);
            }
            if (node.children) {
                this.processFolderNodes(node.children, depth + 1, savedId, select);
            }
        }
    },

    formatFolderTitle(node, depth) {
        let title = node.title;
        if (node.id === '1') title = Localization.get("bookmarksBar") || 'Bookmarks Bar';
        if (node.id === '2') title = Localization.get("otherBookmarks") || 'Other Bookmarks';
        const indent = '\u00A0\u00A0'.repeat(depth * 2);
        const prefix = depth > 0 ? '└─ ' : '';
        return indent + prefix + title;
    },

    setupEventListeners() {
        DOM.get(CONSTANTS.SELECTORS.RESTORE_FOLDER_SELECT).addEventListener('change', (e) => {
            this.loadBackups(e.target.value);
        });

        DOM.get(CONSTANTS.SELECTORS.RESTORE_ALL_BTN).addEventListener('click', () => {
            if (this.selectedBackup) {
                this.confirmAndRestore(this.selectedBackup.id, this.tabCount);
            }
        });
    },

    updateButtonStates(hasSelection) {
        const allBtn = DOM.get(CONSTANTS.SELECTORS.RESTORE_ALL_BTN);
        allBtn.disabled = !hasSelection;
    },

    loadBackups(folderId) {
        if (!folderId) {
            this.updateButtonStates(false);
            return;
        }

        chrome.bookmarks.getChildren(folderId, (children) => {
            if (chrome.runtime.lastError) {
                this.showFolderDeletedError();
                return;
            }

            const container = DOM.get(CONSTANTS.SELECTORS.RESTORE_LIST);
            container.innerHTML = '';

            const backups = children.filter(c => !c.url && c.title && c.title.startsWith('Backup_'));

            if (backups.length === 0) {
                container.innerHTML = `<div class="no-backups">${Localization.get("noBackupsFound")}</div>`;
                this.updateButtonStates(false);
                return;
            }

            this.updateButtonStates(true);
            this.renderBackups(container, backups);
        });
    },

    async renderBackups(container, backups) {
        for (const backup of backups) {
            const count = await this.countBookmarks(backup.id);
            const item = this.createBackupItem(backup, count);
            container.appendChild(item);
        }
    },

    countBookmarks(folderId) {
        return new Promise((resolve) => {
            chrome.bookmarks.getChildren(folderId, async (children) => {
                let count = children.filter(c => c.url && c.url.startsWith('http')).length;
                
                const subfolders = children.filter(c => !c.url);
                for (const subfolder of subfolders) {
                    const subCount = await this.countBookmarks(subfolder.id);
                    count += subCount;
                }
                
                resolve(count);
            });
        });
    },

    createBackupItem(backup, count) {
        const item = DOM.create('div');
        item.className = 'restore-item';
        item.dataset.id = backup.id;
        item.dataset.count = count;

        const radio = DOM.create('input');
        radio.type = 'radio';
        radio.name = 'backupSelect';
        radio.className = 'restore-radio';
        radio.value = backup.id;

        const label = DOM.create('label');
        label.className = 'restore-label';

        const title = DOM.create('span');
        title.className = 'restore-title';
        title.textContent = backup.title;

        const countSpan = DOM.create('span');
        countSpan.className = 'restore-count';
        countSpan.textContent = `${count} ${Localization.get("tabsCount")}`;

        label.append(title, countSpan);
        item.append(radio, label);

        item.addEventListener('click', () => {
            radio.checked = true;
            this.selectedBackup = backup;
            this.tabCount = count;
            this.updateButtonStates(true);
        });

        return item;
    },

    confirmAndRestore(backupId, tabCount) {
        if (tabCount >= 50) {
            const warning = Localization.get("manyTabsWarning").replace('$count$', tabCount);
            if (!confirm(warning)) {
                return;
            }
        }
        this.restoreBackup(backupId);
    },

    restoreBackup(backupId) {
        this.showProgress(true);
        chrome.runtime.sendMessage({
            action: 'restoreBackup',
            backupId: backupId,
            options: { newWindow: true, preserveTabGroups: true }
        }, (response) => {
            this.showProgress(false);
            this.handleResponse(response);
        });
    },

    showProgress(show) {
        const allBtn = DOM.get(CONSTANTS.SELECTORS.RESTORE_ALL_BTN);
        allBtn.disabled = show;
        if (show) {
            allBtn.textContent = Localization.get("restoring") || 'Restoring...';
        } else {
            allBtn.textContent = Localization.get("restoreAll");
        }
    },

    handleResponse(response) {
        if (chrome.runtime.lastError) {
            UI.showStatus(Localization.get("restoreFailed"), 'error');
            return;
        }
        if (response && response.success) {
            const msg = Localization.get("restoreSuccess").replace('$count$', response.tabsOpened);
            UI.showStatus(msg, 'success');
        } else {
            UI.showStatus(Localization.get("restoreFailed") + (response ? ': ' + response.error : ''), 'error');
        }
    },

    showFolderDeletedError() {
        const container = DOM.get(CONSTANTS.SELECTORS.RESTORE_LIST);
        container.innerHTML = `<div class="no-backups error">${Localization.get("folderDeleted")}</div>`;
        this.updateButtonStates(false);
    }
};
```

- [ ] **Step 3: Commit**

```bash
git add popup.js
git commit -m "feat: add RestoreManager module"
```

---

## Task 3: Add Restore Functions to background.js

**Files:**
- Modify: `background.js`

- [ ] **Step 1: Add isValidUrl helper function**

Find line 34 (`console.log('Background service worker loaded');`). Insert after line 34:

```javascript
function isValidUrl(url) {
    if (!url) return false;
    if (url.startsWith('chrome://')) return false;
    if (url.startsWith('chrome-extension://')) return false;
    if (url.startsWith('about:')) return false;
    if (url.startsWith('file://')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}
```

- [ ] **Step 2: Add restore functions after updateLastBackupTime**

Find `updateLastBackupTime` function (around line 377). Add after it:

```javascript
async function restoreFromBookmarks(folderId, options = {}) {
    const { newWindow = true, preserveTabGroups = true } = options;

    try {
        const children = await chrome.bookmarks.getChildren(folderId);
        if (children.length === 0) {
            return { success: false, error: 'noBookmarks' };
        }

        const window = await chrome.windows.create({ focused: true });
        let groupsCreated = 0;
        let tabsOpened = 0;

        if (preserveTabGroups) {
            const result = await restoreTabsWithGroups(window.id, children);
            groupsCreated = result.groupsCreated;
            tabsOpened = result.tabsOpened;
        } else {
            const validBookmarks = children.filter(b => b.url && isValidUrl(b.url));
            tabsOpened = validBookmarks.length;
            await restoreTabsFlat(window.id, validBookmarks);
        }

        const tabs = await chrome.tabs.query({ windowId: window.id });
        const newTab = tabs.find(t => t.url === 'chrome://newtab/');
        if (newTab) {
            await chrome.tabs.remove(newTab.id);
        }

        return { success: true, tabsOpened, groupsCreated };
    } catch (err) {
        console.error('Restore failed:', err);
        return { success: false, error: err.message };
    }
}

async function restoreTabsFlat(windowId, bookmarks) {
    for (const bm of bookmarks) {
        try {
            await chrome.tabs.create({ windowId, url: bm.url });
        } catch (e) {
            console.warn('Failed to create tab:', bm.url, e);
        }
    }
}

async function restoreTabsWithGroups(windowId, bookmarks) {
    const folders = bookmarks.filter(b => !b.url);
    const singleBookmarks = bookmarks.filter(b => b.url && isValidUrl(b.url));

    let groupsCreated = 0;
    let tabsOpened = 0;

    for (const folder of folders) {
        try {
            const folderBookmarks = await chrome.bookmarks.getChildren(folder.id);
            const validTabs = folderBookmarks.filter(b => b.url && isValidUrl(b.url));

            if (validTabs.length === 0) continue;

            const tabIds = [];
            for (const bm of validTabs) {
                try {
                    const tab = await chrome.tabs.create({ windowId, url: bm.url });
                    tabIds.push(tab.id);
                    tabsOpened++;
                } catch (e) {
                    console.warn('Failed to create tab:', bm.url, e);
                }
            }

            if (tabIds.length > 0) {
                try {
                    const groupId = await chrome.tabs.group({ tabIds });
                    await chrome.tabGroups.update(groupId, { title: folder.title });
                    groupsCreated++;
                } catch (e) {
                    console.warn('Failed to create tab group:', e);
                }
            }
        } catch (e) {
            console.warn('Failed to process folder:', folder.title, e);
        }
    }

    if (singleBookmarks.length > 0) {
        await restoreTabsFlat(windowId, singleBookmarks);
        tabsOpened += singleBookmarks.length;
    }

    return { groupsCreated, tabsOpened };
}
```

- [ ] **Step 3: Update handleMessage function**

Find `handleMessage` function (around line 58). Replace with:

```javascript
function handleMessage(request, sender, sendResponse) {
    if (request.action === 'manualBackup') {
        performBackup(request.folderId, request.tabs)
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'updateSchedule') {
        setupAlarm();
        sendResponse({ success: true });
    } else if (request.action === 'restoreBackup') {
        restoreFromBookmarks(request.backupId, request.options)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add background.js
git commit -m "feat: add restore functions to background.js"
```

---

## Task 4: Verify Manifest Permissions

**Files:**
- Read: `manifest.json`

- [ ] **Step 1: Read manifest.json**

```bash
Read manifest.json
```

Verify that line 7-13 contains:
```json
"permissions": [
    "tabs",
    "bookmarks",
    "storage",
    "alarms",
    "tabGroups"
]
```

All required permissions are present. No changes needed.

---

## Task 5: Add Tab UI to popup.html

**Files:**
- Modify: `popup.html`

- [ ] **Step 1: Add tab container after line 47**

Find line 47 (`</div>` that closes `.header`). Insert AFTER line 47, BEFORE line 49 (`<div class="section">`):

```html
        <div class="tab-container">
            <button id="backupTab" class="tab-button active" data-tab="backup">
                <span data-i18n="backupTab">Backup</span>
            </button>
            <button id="restoreTab" class="tab-button" data-tab="restore">
                <span data-i18n="restoreTab">Restore</span>
            </button>
        </div>
```

- [ ] **Step 2: Wrap backup content in panel div**

After adding tabs, the structure should be:
- Line 47: `</div>` (closes `.header`)
- NEW: tab-container
- Line 49-141: existing sections (folder select, tab list, auto backup settings, etc.)

Wrap lines 49-141 in a panel div. Add BEFORE line 49:

```html
        <div id="backupPanel" class="tab-panel active">
```

Add AFTER line 141 (before `<button id="saveSettingsBtn"`):

```html
        </div>
```

- [ ] **Step 3: Add restore panel after backup panel**

Find `</div>` that closes `#backupPanel` (after line ~141). Add AFTER it, BEFORE `<button id="saveSettingsBtn"`:

```html
        <div id="restorePanel" class="tab-panel">
            <div class="section">
                <label data-i18n="selectBackupFolder">Select Backup Folder:</label>
                <select id="restoreFolderSelect" class="folder-select">
                    <option value="" disabled selected>Loading...</option>
                </select>
            </div>
            
            <div class="section">
                <div id="restoreList" class="restore-list">
                    <div class="no-backups" data-i18n="selectFolderFirst">Select a folder to view backups</div>
                </div>
            </div>
            
            <div class="button-group">
                <button id="restoreAllBtn" class="primary-btn" disabled data-i18n="restoreAll">Restore All</button>
            </div>
            
            <div id="restoreStatusMessage" class="status-message"></div>
        </div>
```

- [ ] **Step 4: Commit**

```bash
git add popup.html
git commit -m "feat: add tab UI and restore panel to popup.html"
```

---

## Task 6: Add Styles to popup.css

**Files:**
- Modify: `popup.css`

- [ ] **Step 1: Add tab and restore styles**

Add to end of popup.css:

```css
.tab-container {
    display: flex;
    border-bottom: 1px solid var(--border-color, #ddd);
    margin-bottom: 12px;
}

.tab-button {
    flex: 1;
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    transition: all 0.2s ease;
}

.tab-button:hover {
    color: var(--primary-color, #4285f4);
}

.tab-button.active {
    color: var(--primary-color, #4285f4);
    border-bottom-color: var(--primary-color, #4285f4);
}

.tab-panel {
    display: none;
}

.tab-panel.active {
    display: block;
}

.restore-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 6px;
}

.restore-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-color, #eee);
    cursor: pointer;
    transition: background 0.15s ease;
}

.restore-item:last-child {
    border-bottom: none;
}

.restore-item:hover {
    background: var(--hover-bg, #f5f5f5);
}

.restore-radio {
    margin-right: 10px;
}

.restore-label {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.restore-title {
    font-weight: 500;
    font-size: 13px;
}

.restore-count {
    font-size: 11px;
    color: var(--text-secondary, #888);
    margin-top: 2px;
}

.no-backups {
    padding: 20px;
    text-align: center;
    color: var(--text-secondary, #888);
}

.no-backups.error {
    color: #d32f2f;
}

.button-group {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}
```

- [ ] **Step 2: Add dark mode styles**

Add after the above:

```css
.dark-mode .tab-container {
    border-bottom-color: var(--border-color, #444);
}

.dark-mode .tab-button {
    color: var(--text-secondary, #aaa);
}

.dark-mode .tab-button:hover,
.dark-mode .tab-button.active {
    color: var(--primary-color, #8ab4f8);
    border-bottom-color: var(--primary-color, #8ab4f8);
}

.dark-mode .restore-list {
    border-color: var(--border-color, #444);
}

.dark-mode .restore-item {
    border-bottom-color: var(--border-color, #333);
}

.dark-mode .restore-item:hover {
    background: var(--hover-bg, #2a2a2a);
}

.dark-mode .restore-count {
    color: var(--text-secondary, #888);
}

.dark-mode .no-backups {
    color: var(--text-secondary, #888);
}

.dark-mode .no-backups.error {
    color: #f44336;
}
```

- [ ] **Step 3: Commit**

```bash
git add popup.css
git commit -m "feat: add tab and restore list styles with dark mode"
```

---

## Task 7: Add Tab Switching Logic to popup.js

**Files:**
- Modify: `popup.js`

- [ ] **Step 1: Find UI.init function**

Find `UI` object (around line 451) and locate `setupEventListeners` method.

- [ ] **Step 2: Add tab click listeners to UI.setupEventListeners**

Add to the beginning of `setupEventListeners` method:

```javascript
DOM.getAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
    });
});
```

- [ ] **Step 3: Add switchTab method to UI**

Add `switchTab` method to `UI` object (after `setupEventListeners`):

```javascript
switchTab(tabName) {
    DOM.getAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    DOM.getAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}Panel`);
    });

    if (tabName === 'restore') {
        chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID], (result) => {
            RestoreManager.init(result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
        });
    }
},
```

- [ ] **Step 4: Commit**

```bash
git add popup.js
git commit -m "feat: add tab switching logic"
```

---

## Task 8: Add English Translations

**Files:**
- Modify: `_locales/en/messages.json`

- [ ] **Step 1: Add new translation keys**

Add to `_locales/en/messages.json` (before the closing `}`):

```json
,
"backupTab": {
    "message": "Backup",
    "description": "Backup tab label"
},
"restoreTab": {
    "message": "Restore",
    "description": "Restore tab label"
},
"selectBackupFolder": {
    "message": "Select Backup Folder:",
    "description": "Label for backup folder dropdown"
},
"restoreAll": {
    "message": "Restore All",
    "description": "Button to restore all tabs"
},
"noBackupsFound": {
    "message": "No backups found in this folder",
    "description": "Message when no backups exist"
},
"restoreSuccess": {
    "message": "$count$ tabs opened",
    "description": "Success message after restore",
    "placeholders": {
        "count": {
            "content": "$1",
            "example": "12"
        }
    }
},
"restoreFailed": {
    "message": "Restore failed",
    "description": "Error message when restore fails"
},
"tabsCount": {
    "message": "tabs",
    "description": "Label for tab count"
},
"restoring": {
    "message": "Restoring...",
    "description": "Progress message during restore"
},
"selectFolderFirst": {
    "message": "Select a folder to view backups",
    "description": "Placeholder when no folder selected"
},
"manyTabsWarning": {
    "message": "$count$ tabs will be opened. Continue?",
    "description": "Warning for large restore",
    "placeholders": {
        "count": {
            "content": "$1",
            "example": "50"
        }
    }
},
"folderDeleted": {
    "message": "Selected folder has been deleted",
    "description": "Error when backup folder is deleted"
}
```

- [ ] **Step 2: Commit**

```bash
git add _locales/en/messages.json
git commit -m "feat: add English translations for restore feature"
```

---

## Task 9: Add All Translations

**Files:**
- Modify: All `_locales/*/messages.json` files

- [ ] **Step 1: Add translations to each language file**

For each language file in `_locales/`, add the following keys before the closing `}`. Translate the `message` value appropriately for each language:

**Translation keys to add:**
```json
"backupTab": { "message": "Backup", "description": "Backup tab label" },
"restoreTab": { "message": "Restore", "description": "Restore tab label" },
"selectBackupFolder": { "message": "Select Backup Folder:", "description": "Label for backup folder dropdown" },
"restoreAll": { "message": "Restore All", "description": "Button to restore all tabs" },
"noBackupsFound": { "message": "No backups found in this folder", "description": "Message when no backups exist" },
"restoreSuccess": { "message": "$count$ tabs opened", "description": "Success message after restore", "placeholders": { "count": { "content": "$1", "example": "12" } } },
"restoreFailed": { "message": "Restore failed", "description": "Error message when restore fails" },
"tabsCount": { "message": "tabs", "description": "Label for tab count" },
"restoring": { "message": "Restoring...", "description": "Progress message during restore" },
"selectFolderFirst": { "message": "Select a folder to view backups", "description": "Placeholder when no folder selected" },
"manyTabsWarning": { "message": "$count$ tabs will be opened. Continue?", "description": "Warning for large restore", "placeholders": { "count": { "content": "$1", "example": "50" } } },
"folderDeleted": { "message": "Selected folder has been deleted", "description": "Error when backup folder is deleted" }
```

**Translations by language:**

| Key | en | tr | de | fr | es | it | pt_BR | ru | ja | zh_CN | ko | pl | nl | id | vi | ar | hi | th |
|-----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| backupTab | Backup | Yedekle | Sichern | Sauvegarder | Respaldar | Backup | Backup | Резерв. копия | バックアップ | 备份 | 백업 | Kopia zapas. | Back-up | Cadangkan | Sao lưu | نسخ احتياطي | बैकअप | สำรองข้อมูล |
| restoreTab | Restore | Geri Yükle | Wiederherst. | Restaurer | Restaurar | Ripristina | Restaurar | Восстановить | 復元 | 恢复 | 복원 | Przywróć | Herstellen | Pulihkan | Khôi phục | استعادة | पुनर्स्थापन | กู้คืน |
| restoreAll | Restore All | Tümünü Aç | Alle wiederherst. | Tout restaurer | Restaurar todo | Ripristina tutto | Restaurar tudo | Восстановить всё | すべて復元 | 全部恢复 | 모두 복원 | Przywróć wszystko | Alles herstellen | Pulihkan Semua | Khôi phục tất cả | استعادة الكل | सभी पुनर्स्थापित करें | กู้คืนทั้งหมด |
| noBackupsFound | No backups found in this folder | Bu klasörde yedek bulunamadı | Keine Backups in diesem Ordner | Aucune sauvegarde dans ce dossier | Sin respaldos en esta carpeta | Nessun backup in questa cartella | Nenhum backup nesta pasta | Нет резервных копий | バックアップが見つかりません | 此文件夹中未找到备份 | 백업 없음 | Brak kopii zapasowych | Geen back-ups gevonden | Tidak ada cadangan | Không tìm thấy bản sao lưu | لم يتم العثور على نسخ احتياطية | कोई बैकअप नहीं मिला | ไม่พบข้อมูลสำรอง |
| restoreFailed | Restore failed | Geri yükleme başarısız | Wiederherstellung fehlgeschlagen | Échec de la restauration | Error al restaurar | Ripristino fallito | Falha na restauração | Ошибка восстановления | 復元に失敗しました | 恢复失败 | 복원 실패 | Przywracanie nie powiodło się | Herstellen mislukt | Pemulihan gagal | Khôi phục thất bại | فشلت الاستعادة | पुनर्स्थापना विफल | กู้คืนล้มเหลว |
| tabsCount | tabs | sekme | Tabs | onglets | pestañas | schede | abas | вкладок | タブ | 个标签页 | 탭 | kart | tabbladen | tab | tab | علامات تبويب | टैब | แท็บ |
| restoring | Restoring... | Yükleniyor... | Wiederherstellung... | Restauration... | Restaurando... | Ripristino... | Restaurando... | Восстановление... | 復元中... | 恢复中... | 복원 중... | Przywracanie... | Herstellen... | Memulihkan... | Đang khôi phục... | جاري الاستعادة... | पुनर्स्थापना हो रही है... | กำลังกู้คืน... |
| selectFolderFirst | Select a folder to view backups | Yedekleri görmek için klasör seçin | Ordner wählen um Backups zu sehen | Sélectionnez un dossier | Selecciona una carpeta | Seleziona una cartella | Selecione uma pasta | Выберите папку | フォルダを選択 | 选择文件夹以查看备份 | 폴더 선택 | Wybierz folder | Selecteer een map | Pilih folder | Chọn thư mục | اختر مجلدًا | फ़ोल्डर चुनें | เลือกโฟลเดอร์ |
| manyTabsWarning | $count$ tabs will be opened. Continue? | $count$ sekme açılacak. Devam edilsin mi? | $count$ Tabs werden geöffnet. Fortfahren? | $count$ onglets seront ouverts. Continuer? | Se abrirán $count$ pestañas. ¿Continuar? | Verranno aperte $count$ schede. Continuare? | $count$ abas serão abertas. Continuar? | Откроется $count$ вкладок. Продолжить? | $count$個のタブが開きます。続けますか？ | 将打开 $count$ 个标签页。继续？ | $count$개 탭이 열립니다. 계속하시겠습니까? | Zostanie otwartych $count$ kart. Kontynuować? | $count$ tabbladen worden geopend. Doorgaan? | $count$ tab akan dibuka. Lanjutkan? | $count$ tab sẽ được mở. Tiếp tục? | سيتم فتح $count$ علامة تبويب. متابعة؟ | $count$ टैब खुलेंगे। जारी रखें? | จะเปิด $count$ แท็บ ดำเนินการต่อ? |
| folderDeleted | Selected folder has been deleted | Seçili klasör silinmiş | Ausgewählter Ordner wurde gelöscht | Le dossier sélectionné a été supprimé | La carpeta seleccionada ha sido eliminada | La cartella selezionata è stata eliminata | A pasta selecionada foi excluída | Выбранная папка удалена | 選択したフォルダが削除されました | 所选文件夹已删除 | 선택한 폴더가 삭제됨 | Wybrany folder został usunięty | Geselecteerde map is verwijderd | Folder yang dipilih telah dihapus | Thư mục đã chọn đã bị xóa | تم حذف المجلد المحدد | चयनित फ़ोल्डर हटा दिया गया | โฟลเดอร์ที่เลือกถูกลบแล้ว |
| selectBackupFolder | Select Backup Folder: | Yedek Klasörü Seç: | Sicherungsordner wählen: | Dossier de sauvegarde: | Carpeta de respaldo: | Cartella backup: | Pasta de backup: | Папка резерв. копии: | バックアップフォルダ: | 选择备份文件夹： | 백업 폴더 선택: | Wybierz folder kopii: | Back-upmap selecteren: | Pilih Folder Cadangan: | Chọn Thư mục Sao lưu: | اختر مجلد النسخ الاحتياطي: | बैकअप फ़ोल्डर चुनें: | เลือกโฟลเดอร์สำรอง: |
| restoreSuccess | $count$ tabs opened | $count$ sekme açıldı | $count$ Tabs geöffnet | $count$ onglets ouverts | $count$ pestañas abiertas | $count$ schede aperte | $count$ abas abertas | Открыто $count$ вкладок | $count$個のタブを開きました | 已打开 $count$ 个标签页 | $count$개 탭 열림 | Otwarto $count$ kart | $count$ tabbladen geopend | $count$ tab dibuka | Đã mở $count$ tab | تم فتح $count$ علامة تبويب | $count$ टैब खुले | เปิด $count$ แท็บแล้ว |

- [ ] **Step 2: Commit all locale changes**

```bash
git add _locales/
git commit -m "feat: add restore feature translations for all 18 languages"
```

---

## Task 10: Manual Testing

**Files:**
- None (testing only)

- [ ] **Step 1: Load extension in Chrome**

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the project directory

- [ ] **Step 2: Test basic restore**

1. Create a backup first (Backup tab)
2. Go to Restore tab
3. Select backup folder
4. Click "Restore All"
5. Verify tabs open in new window

- [ ] **Step 3: Test tab groups restore**

1. Create a backup with tab groups enabled
2. Restore that backup
3. Verify groups are recreated

- [ ] **Step 4: Test 50+ tab warning**

1. Create a backup with 50+ tabs
2. Try to restore
3. Verify warning dialog appears
4. Test both confirm and cancel

- [ ] **Step 5: Test dark mode**

1. Enable dark mode in extension settings
2. Switch to Restore tab
3. Verify styling is correct

- [ ] **Step 6: Test error cases**

1. Select empty folder → "No backups found" message
2. Delete backup folder from bookmarks → error handling

---

## Task 11: Final Commit and Version Bump

**Files:**
- Modify: `manifest.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update version in manifest.json**

Change version from "1.3" to "1.4":

```json
"version": "1.4"
```

- [ ] **Step 2: Update CHANGELOG.md**

Add new version entry:

```markdown
### v1.4 (2026-03-24)
- ✨ Added Restore feature - reopen backed up tabs from bookmarks
- ✨ Tab groups are preserved when restoring
- ✨ Two-tab UI for easy switching between backup and restore
- ✨ Warning dialog for large restores (50+ tabs)
- 🌐 Updated translations for all 18 languages
```

- [ ] **Step 3: Final commit**

```bash
git add manifest.json CHANGELOG.md
git commit -m "release: v1.4 with restore feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Update CONSTANTS | popup.js |
| 2 | Add RestoreManager module | popup.js |
| 3 | Add restore functions | background.js |
| 4 | Verify permissions | manifest.json |
| 5 | Add tab UI | popup.html |
| 6 | Add styles | popup.css |
| 7 | Add tab switching | popup.js |
| 8 | English translations | _locales/en/messages.json |
| 9 | All translations | _locales/*/messages.json (18 files) |
| 10 | Manual testing | - |
| 11 | Version bump | manifest.json, CHANGELOG.md |