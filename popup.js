console.log('Popup script loaded');

const CONSTANTS = {
    SELECTORS: {
        FOLDER_SELECT: 'folderSelect',
        STATUS_MESSAGE: 'statusMessage',
        BACKUP_BTN: 'backupBtn',
        LAST_BACKUP_TIME: 'lastBackupTime',
        DARK_MODE_TOGGLE: 'darkModeToggle',
        AUTO_BACKUP_TOGGLE: 'autoBackupToggle',
        AUTO_BACKUP_SETTINGS: 'autoBackupSettings',
        HOUR_SELECT: 'backupTimeHour',
        MINUTE_SELECT: 'backupTimeMinute',
        LANGUAGE_SELECT: 'languageSelect',
        TAB_LIST_CONTAINER: 'tabListContainer',
        INTERVAL_SELECT: 'intervalSelect',
        CUSTOM_INTERVAL_INPUT: 'customIntervalInput',
        CUSTOM_INTERVAL_UNIT: 'customIntervalUnit',
        SAVE_SETTINGS_BTN: 'saveSettingsBtn',
        CUSTOM_INTERVAL_CONTAINER: 'customIntervalContainer',
        TIME_CONTAINER: 'timeContainer',
        MULTI_TIME_CONTAINER: 'multiTimeContainer',
        TIME_LIST: 'timeList',
        ADD_TIME_BTN: 'addTimeBtn',
        PRESERVE_GROUPS_TOGGLE: 'preserveGroupsToggle',
        AUTO_CLEANUP_TOGGLE: 'autoCleanupToggle',
        CLEANUP_SETTINGS: 'cleanupSettings',
        CLEANUP_DAYS: 'cleanupDays',
        SHORTCUT_LINK: 'shortcutLink',
        INCLUDE_DUPLICATES_TOGGLE: 'includeDuplicatesToggle',
        RESTORE_TAB: 'restoreTab',
        RESTORE_FOLDER_SELECT: 'restoreFolderSelect',
        RESTORE_LIST: 'restoreList',
        RESTORE_ALL_BTN: 'restoreAllBtn',
        RESTORE_SELECTED_BTN: 'restoreSelectedBtn'
    },
    STORAGE: {
        BACKUP_FOLDER_ID: 'backupFolderId',
        BACKUP_ENABLED: 'backupEnabled',
        BACKUP_INTERVAL: 'backupInterval',
        CUSTOM_INTERVAL: 'customInterval',
        CUSTOM_UNIT: 'customUnit',
        BACKUP_TIME: 'backupTime',
        LAST_BACKUP_TIME: 'lastBackupTime',
        DARK_MODE: 'darkMode',
        SELECTED_LANGUAGE: 'selectedLanguage',
        PRESERVE_TAB_GROUPS: 'preserveTabGroups',
        AUTO_CLEANUP_ENABLED: 'autoCleanupEnabled',
        AUTO_CLEANUP_DAYS: 'autoCleanupDays',
        BACKUP_TIMES: 'backupTimes',
        INCLUDE_DUPLICATES: 'includeDuplicates'
    },
    MAX_BACKUP_TIMES: 5
};

const DOM = {
    get: (id) => document.getElementById(id),
    getAll: (selector) => document.querySelectorAll(selector),
    create: (tag) => document.createElement(tag)
};

const Localization = {
    translations: {},

    async init(initialLang) {
        let lang = initialLang;
        if (!lang) {
            lang = this.detectLanguage();
        }
        await this.load(lang);
    },

    detectLanguage() {
        const uiLang = chrome.i18n.getUILanguage();
        let lang = uiLang.split('-')[0].toLowerCase();
        const supported = ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt_BR', 'ru', 'ja', 'zh_CN', 'ko', 'pl', 'nl', 'id', 'vi', 'ar', 'hi', 'th'];

        if (uiLang.toLowerCase().startsWith('pt')) lang = 'pt_BR';
        if (uiLang.toLowerCase().startsWith('zh')) lang = 'zh_CN';

        return supported.includes(lang) ? lang : 'en';
    },

    async load(lang) {
        try {
            const url = `_locales/${lang}/messages.json`;
            const response = await fetch(url);
            this.translations = await response.json();
            this.updateUI();

            const direction = lang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.setAttribute('dir', direction);
            document.documentElement.setAttribute('lang', lang);

            const langSelect = DOM.get(CONSTANTS.SELECTORS.LANGUAGE_SELECT);
            if (langSelect) langSelect.value = lang;
        } catch (e) {
            console.error('Failed to load translations', e);
            if (lang !== 'en') await this.load('en');
        }
    },

    updateUI() {
        DOM.getAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.get(key);
        });
    },

    get(key) {
        if (this.translations[key] && this.translations[key].message) {
            return this.translations[key].message;
        }
        return chrome.i18n.getMessage(key) || key;
    }
};

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

const TabManager = {
    includeDuplicates: false,

    init(includeDuplicates = false) {
        this.includeDuplicates = includeDuplicates;
        this.loadOpenTabs();
    },

    loadOpenTabs() {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const container = DOM.get(CONSTANTS.SELECTORS.TAB_LIST_CONTAINER);
            container.innerHTML = '';

            if (tabs.length === 0) {
                container.textContent = "No open tabs.";
                return;
            }

            const duplicates = this.includeDuplicates ? new Set() : this.findDuplicates(tabs);
            container.appendChild(this.createControls(tabs.length, duplicates));
            container.appendChild(this.createTabList(tabs, duplicates));
            this.updateCounter(tabs.length);
        });
    },

    findDuplicates(tabs) {
        const urlCounts = new Map();
        const duplicates = new Set();

        tabs.forEach(tab => {
            if (tab.url) {
                const count = urlCounts.get(tab.url) || 0;
                urlCounts.set(tab.url, count + 1);
                if (count >= 1) {
                    duplicates.add(tab.url);
                }
            }
        });

        return duplicates;
    },

    createControls(totalTabs, duplicates) {
        const controlDiv = DOM.create('div');
        controlDiv.className = 'tab-controls';

        const btnGroup = DOM.create('div');
        const selectAll = this.createActionBtn(Localization.get("selectAll"), () => this.toggleAll(true));
        const deselectAll = this.createActionBtn(Localization.get("deselectAll"), () => this.toggleAll(false));

        btnGroup.append(selectAll, document.createTextNode(' | '), deselectAll);

        const counter = DOM.create('span');
        counter.id = 'tabCounterSpan';

        let dupInfo = '';
        if (duplicates.size > 0) {
            dupInfo = ` <span class="duplicate-info">(${duplicates.size} ${Localization.get("duplicateWarning")})</span>`;
        }

        controlDiv.innerHTML = btnGroup.outerHTML + `<span id="tabCounterSpan"></span>${dupInfo}`;
        return controlDiv;
    },

    createActionBtn(text, onClick) {
        const btn = DOM.create('button');
        btn.textContent = text;
        btn.className = 'action-btn';
        btn.addEventListener('click', onClick);
        return btn;
    },

    createTabList(tabs, duplicates) {
        const scrollContainer = DOM.create('div');
        scrollContainer.className = 'tab-scroll-container';

        if (this.includeDuplicates) {
            tabs.forEach(tab => {
                if (!tab.url) return;
                const row = this.createTabRow(tab, false, 0);
                scrollContainer.appendChild(row);
            });
        } else {
            const urlGroups = new Map();
            tabs.forEach(tab => {
                if (!tab.url) return;
                if (!urlGroups.has(tab.url)) {
                    urlGroups.set(tab.url, []);
                }
                urlGroups.get(tab.url).push(tab);
            });

            urlGroups.forEach((groupTabs, url) => {
                const isDuplicate = duplicates.has(url);

                groupTabs.forEach((tab, index) => {
                    const row = this.createTabRow(tab, isDuplicate, index, groupTabs.length);
                    scrollContainer.appendChild(row);
                });
            });
        }

        return scrollContainer;
    },

    createTabRow(tab, isDuplicate, index, groupSize = 1) {
        const row = DOM.create('div');
        row.className = isDuplicate ? 'tab-row duplicate' : 'tab-row';

        const checkbox = DOM.create('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.includeDuplicates ? true : (index === 0 || !isDuplicate);
        checkbox.className = 'tab-checkbox';
        checkbox.dataset.title = tab.title;
        checkbox.dataset.url = tab.url;
        checkbox.addEventListener('change', () => this.updateCounter());

        const icon = this.createFavicon(tab.favIconUrl);
        const label = this.createLabel(tab);

        row.append(checkbox, icon, label);

        if (!this.includeDuplicates && isDuplicate && index === 0) {
            const badge = DOM.create('span');
            badge.className = 'duplicate-badge';
            badge.textContent = `${groupSize}x`;
            badge.title = `${groupSize} tabs with same URL`;
            row.appendChild(badge);
        }

        return row;
    },

    createFavicon(url) {
        if (!url) return document.createTextNode('');
        const img = DOM.create('img');
        img.src = url;
        img.className = 'favicon';
        img.onerror = () => { img.style.display = 'none'; };
        return img;
    },

    createLabel(tab) {
        const label = DOM.create('span');
        label.textContent = tab.title;
        label.title = tab.url;
        label.className = 'tab-label';
        return label;
    },

    toggleAll(checked) {
        DOM.getAll('.tab-checkbox').forEach(cb => cb.checked = checked);
        this.updateCounter();
    },

    updateCounter() {
        const total = DOM.getAll('.tab-checkbox').length;
        const selected = DOM.getAll('.tab-checkbox:checked').length;
        const span = DOM.get('tabCounterSpan');
        if (!span) return;

        let msg = Localization.get("tabCounter");
        if (!msg || msg === "tabCounter") msg = `Selected: $SELECTED$ / $TOTAL$`;

        msg = msg.replace('$SELECTED$', selected).replace('$TOTAL$', total)
            .replace('$1', selected).replace('$2', total);

        span.textContent = msg;
    },

    getSelectedTabs() {
        const selected = [];
        DOM.getAll('.tab-checkbox:checked').forEach(cb => {
            selected.push({ title: cb.dataset.title, url: cb.dataset.url });
        });
        return selected;
    }
};

const BookmarkManager = {
    init(savedId) {
        chrome.bookmarks.getTree((nodes) => {
            const select = DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT);
            const defaultText = Localization.get("selectDefault");
            select.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
            this.processNodes(nodes, 0, savedId);
        });

        DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.BACKUP_FOLDER_ID]: e.target.value })
                .then(() => UI.showStatus(Localization.get("folderSaved"), 'success'));
        });
    },

    processNodes(nodes, depth, savedId) {
        const select = DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT);
        for (const node of nodes) {
            if (!node.url && node.id !== '0') {
                const option = DOM.create('option');
                option.value = node.id;
                option.textContent = this.formatTitle(node, depth);
                if (node.id === savedId) option.selected = true;
                select.appendChild(option);
            }
            if (node.children) {
                this.processNodes(node.children, depth + 1, savedId);
            }
        }
    },

    formatTitle(node, depth) {
        let title = node.title;
        if (node.id === '1') title = Localization.get("bookmarksBar") || 'Bookmarks Bar';
        if (node.id === '2') title = Localization.get("otherBookmarks") || 'Other Bookmarks';

        const indent = '\u00A0\u00A0'.repeat(depth * 2);
        const prefix = depth > 0 ? '└─ ' : '';
        return indent + prefix + title;
    }
};

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

const TimeManager = {
    times: ['09:00'],

    init(savedTimes) {
        this.times = savedTimes && savedTimes.length > 0 ? savedTimes : ['09:00'];
        this.render();
        this.setupEventListeners();
    },

    setupEventListeners() {
        DOM.get(CONSTANTS.SELECTORS.ADD_TIME_BTN).addEventListener('click', () => this.addTime());
    },

    render() {
        const container = DOM.get(CONSTANTS.SELECTORS.TIME_LIST);
        container.innerHTML = '';

        this.times.forEach((time, index) => {
            const row = DOM.create('div');
            row.className = 'time-row';

            const hourSelect = this.createHourSelect(time);
            const minuteSelect = this.createMinuteSelect(time);
            
            hourSelect.addEventListener('change', (e) => this.updateTime(index, e.target.value, minuteSelect.value));
            minuteSelect.addEventListener('change', (e) => this.updateTime(index, hourSelect.value, e.target.value));

            row.appendChild(hourSelect);
            row.appendChild(document.createTextNode(':'));
            row.appendChild(minuteSelect);

            if (this.times.length > 1) {
                const removeBtn = DOM.create('button');
                removeBtn.textContent = '×';
                removeBtn.className = 'remove-time-btn';
                removeBtn.addEventListener('click', () => this.removeTime(index));
                row.appendChild(removeBtn);
            }

            container.appendChild(row);
        });

        const addBtn = DOM.get(CONSTANTS.SELECTORS.ADD_TIME_BTN);
        if (this.times.length >= CONSTANTS.MAX_BACKUP_TIMES) {
            addBtn.classList.add('hidden');
        } else {
            addBtn.classList.remove('hidden');
        }
    },

    createHourSelect(time) {
        const select = DOM.create('select');
        select.className = 'time-select';
        const [h] = time.split(':');
        
        for (let i = 0; i < 24; i++) {
            const val = i.toString().padStart(2, '0');
            const opt = DOM.create('option');
            opt.value = val;
            opt.textContent = val;
            if (val === h) opt.selected = true;
            select.appendChild(opt);
        }
        return select;
    },

    createMinuteSelect(time) {
        const select = DOM.create('select');
        select.className = 'time-select';
        const [, m] = time.split(':');
        
        for (let i = 0; i < 60; i++) {
            const val = i.toString().padStart(2, '0');
            const opt = DOM.create('option');
            opt.value = val;
            opt.textContent = val;
            if (val === m) opt.selected = true;
            select.appendChild(opt);
        }
        return select;
    },

    addTime() {
        if (this.times.length >= CONSTANTS.MAX_BACKUP_TIMES) return;
        this.times.push('12:00');
        this.render();
    },

    removeTime(index) {
        this.times.splice(index, 1);
        this.render();
    },

    updateTime(index, hour, minute) {
        this.times[index] = `${hour}:${minute}`;
    },

    getTimes() {
        return this.times;
    }
};

const UI = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        DOM.getAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        DOM.get(CONSTANTS.SELECTORS.LANGUAGE_SELECT).addEventListener('change', async (e) => {
            const newLang = e.target.value;
            await SettingsManager.save({ [CONSTANTS.STORAGE.SELECTED_LANGUAGE]: newLang });
            await Localization.load(newLang);
            TabManager.loadOpenTabs();
        });

        DOM.get(CONSTANTS.SELECTORS.DARK_MODE_TOGGLE).addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
            SettingsManager.save({ [CONSTANTS.STORAGE.DARK_MODE]: e.target.checked });
        });

        DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_TOGGLE).addEventListener('change', (e) => {
            this.toggleAutoBackupUI(e.target.checked);
        });

        DOM.get(CONSTANTS.SELECTORS.INTERVAL_SELECT).addEventListener('change', (e) => {
            this.toggleIntervalUI(e.target.value);
        });

        DOM.get(CONSTANTS.SELECTORS.PRESERVE_GROUPS_TOGGLE).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]: e.target.checked });
        });

        DOM.get(CONSTANTS.SELECTORS.AUTO_CLEANUP_TOGGLE).addEventListener('change', (e) => {
            this.toggleCleanupUI(e.target.checked);
        });

        DOM.get(CONSTANTS.SELECTORS.CLEANUP_DAYS).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS]: parseInt(e.target.value) || 30 });
        });

        DOM.get(CONSTANTS.SELECTORS.BACKUP_BTN).addEventListener('click', this.handleBackupClick.bind(this));
        DOM.get(CONSTANTS.SELECTORS.SAVE_SETTINGS_BTN).addEventListener('click', this.handleSaveSettings.bind(this));

        DOM.get(CONSTANTS.SELECTORS.SHORTCUT_LINK).addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        });

        DOM.get(CONSTANTS.SELECTORS.INCLUDE_DUPLICATES_TOGGLE).addEventListener('change', (e) => {
            const include = e.target.checked;
            TabManager.includeDuplicates = include;
            TabManager.loadOpenTabs();
            SettingsManager.save({ [CONSTANTS.STORAGE.INCLUDE_DUPLICATES]: include });
        });
    },

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

    toggleDarkMode(isDark) {
        if (isDark) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    },

    toggleAutoBackupUI(enabled) {
        const settingsDiv = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_SETTINGS);
        if (enabled) settingsDiv.classList.remove('hidden');
        else settingsDiv.classList.add('hidden');
    },

    toggleIntervalUI(interval) {
        const customContainer = DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_CONTAINER);
        const timeContainer = DOM.get(CONSTANTS.SELECTORS.TIME_CONTAINER);

        if (interval === 'custom') {
            customContainer.classList.remove('hidden');
            timeContainer.classList.add('hidden');
        } else {
            customContainer.classList.add('hidden');
            timeContainer.classList.remove('hidden');
        }
    },

    toggleCleanupUI(enabled) {
        const cleanupSettings = DOM.get(CONSTANTS.SELECTORS.CLEANUP_SETTINGS);
        if (enabled) cleanupSettings.classList.remove('hidden');
        else cleanupSettings.classList.add('hidden');
    },

    handleBackupClick() {
        const folderId = DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT).value;
        if (!folderId) {
            this.showStatus(Localization.get("selectFolderErr"), 'error');
            return;
        }

        const tabs = TabManager.getSelectedTabs();
        if (tabs.length === 0) {
            this.showStatus(Localization.get("noTabsSelected") || "No tabs selected!", 'error');
            return;
        }

        const btn = DOM.get(CONSTANTS.SELECTORS.BACKUP_BTN);
        btn.disabled = true;
        btn.textContent = Localization.get("backupBtnProgress");

        chrome.runtime.sendMessage({ action: 'manualBackup', folderId, tabs }, (response) => {
            btn.disabled = false;
            btn.textContent = Localization.get("backupBtn");

            if (chrome.runtime.lastError) {
                this.showStatus(Localization.get("backupFailed") + chrome.runtime.lastError.message, 'error');
            } else if (response && response.success) {
                this.showStatus(Localization.get("backupSuccess"), 'success');
                this.updateLastBackupTime();
            } else {
                this.showStatus(Localization.get("backupFailed") + (response ? response.error : 'Unknown error'), 'error');
            }
        });
    },

    handleSaveSettings() {
        const enabled = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_TOGGLE).checked;
        const interval = DOM.get(CONSTANTS.SELECTORS.INTERVAL_SELECT).value;
        const customVal = DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_INPUT).value;
        const customUnit = DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_UNIT).value;
        const preserveGroups = DOM.get(CONSTANTS.SELECTORS.PRESERVE_GROUPS_TOGGLE).checked;
        const autoCleanup = DOM.get(CONSTANTS.SELECTORS.AUTO_CLEANUP_TOGGLE).checked;
        const cleanupDays = parseInt(DOM.get(CONSTANTS.SELECTORS.CLEANUP_DAYS).value) || 30;

        const settings = {
            [CONSTANTS.STORAGE.BACKUP_ENABLED]: enabled,
            [CONSTANTS.STORAGE.BACKUP_INTERVAL]: interval,
            [CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]: preserveGroups,
            [CONSTANTS.STORAGE.AUTO_CLEANUP_ENABLED]: autoCleanup,
            [CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS]: cleanupDays
        };

        if (interval === 'custom') {
            if (!customVal || customVal < 1) {
                this.showStatus(Localization.get("invalidValue"), 'error');
                return;
            }
            settings[CONSTANTS.STORAGE.CUSTOM_INTERVAL] = parseInt(customVal);
            settings[CONSTANTS.STORAGE.CUSTOM_UNIT] = customUnit;
        } else if (interval === 'daily') {
            settings[CONSTANTS.STORAGE.BACKUP_TIMES] = TimeManager.getTimes();
            settings[CONSTANTS.STORAGE.BACKUP_TIME] = TimeManager.getTimes()[0];
        } else {
            settings[CONSTANTS.STORAGE.BACKUP_TIME] = TimeManager.getTimes()[0];
        }

        SettingsManager.save(settings).then(() => {
            chrome.runtime.sendMessage({ action: 'updateSchedule' });

            const btn = DOM.get(CONSTANTS.SELECTORS.SAVE_SETTINGS_BTN);
            btn.textContent = Localization.get("saved");
            setTimeout(() => btn.textContent = Localization.get("saveSettingsBtn"), 1500);
        });
    },

    showStatus(msg, type) {
        const el = DOM.get(CONSTANTS.SELECTORS.STATUS_MESSAGE);
        el.textContent = msg;
        el.style.color = type === 'error' ? 'red' : 'green';
        setTimeout(() => el.textContent = '', 3000);
    },

    updateLastBackupTime() {
        chrome.storage.local.get([CONSTANTS.STORAGE.LAST_BACKUP_TIME], (result) => {
            const time = result[CONSTANTS.STORAGE.LAST_BACKUP_TIME];
            if (time) {
                DOM.get(CONSTANTS.SELECTORS.LAST_BACKUP_TIME).textContent = new Date(time).toLocaleString(undefined, {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                });
            }
        });
    },

    restoreState(settings) {
        if (settings[CONSTANTS.STORAGE.DARK_MODE]) {
            this.toggleDarkMode(true);
            DOM.get(CONSTANTS.SELECTORS.DARK_MODE_TOGGLE).checked = true;
        }

        const isEnabled = settings[CONSTANTS.STORAGE.BACKUP_ENABLED] !== false;
        DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_TOGGLE).checked = isEnabled;
        this.toggleAutoBackupUI(isEnabled);

        const interval = settings[CONSTANTS.STORAGE.BACKUP_INTERVAL] || 'daily';
        const safeInterval = interval === 'off' ? 'daily' : interval;

        DOM.get(CONSTANTS.SELECTORS.INTERVAL_SELECT).value = safeInterval;
        this.toggleIntervalUI(safeInterval);

        if (safeInterval === 'custom') {
            DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_INPUT).value = settings[CONSTANTS.STORAGE.CUSTOM_INTERVAL] || '';
            DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_UNIT).value = settings[CONSTANTS.STORAGE.CUSTOM_UNIT] || 'minutes';
        } else {
            const savedTimes = settings[CONSTANTS.STORAGE.BACKUP_TIMES] || [settings[CONSTANTS.STORAGE.BACKUP_TIME] || '09:00'];
            TimeManager.init(savedTimes);
        }

        DOM.get(CONSTANTS.SELECTORS.PRESERVE_GROUPS_TOGGLE).checked = settings[CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS] || false;

        const cleanupEnabled = settings[CONSTANTS.STORAGE.AUTO_CLEANUP_ENABLED] || false;
        DOM.get(CONSTANTS.SELECTORS.AUTO_CLEANUP_TOGGLE).checked = cleanupEnabled;
        this.toggleCleanupUI(cleanupEnabled);
        DOM.get(CONSTANTS.SELECTORS.CLEANUP_DAYS).value = settings[CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS] || 30;

        const includeDuplicates = settings[CONSTANTS.STORAGE.INCLUDE_DUPLICATES] || false;
        DOM.get(CONSTANTS.SELECTORS.INCLUDE_DUPLICATES_TOGGLE).checked = includeDuplicates;

        this.updateLastBackupTime();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    UI.init();

    const settings = await SettingsManager.load();
    await Localization.init(settings[CONSTANTS.STORAGE.SELECTED_LANGUAGE]);

    UI.restoreState(settings);

    BookmarkManager.init(settings[CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
    TabManager.init(settings[CONSTANTS.STORAGE.INCLUDE_DUPLICATES] || false);
});