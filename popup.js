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
        LANGUAGE_SELECT: 'languageSelect',
        TAB_LIST_CONTAINER: 'tabListContainer',
        INTERVAL_SELECT: 'intervalSelect',
        CUSTOM_INTERVAL_INPUT: 'customIntervalInput',
        CUSTOM_INTERVAL_UNIT: 'customIntervalUnit',
        SAVE_SETTINGS_BTN: 'saveSettingsBtn',
        CUSTOM_INTERVAL_CONTAINER: 'customIntervalContainer',
        TIME_CONTAINER: 'timeContainer',
        TIME_LIST: 'timeList',
        ADD_TIME_BTN: 'addTimeBtn',
        PRESERVE_GROUPS_TOGGLE: 'preserveGroupsToggle',
    COLLAPSE_GROUPS_TOGGLE: 'collapseGroupsToggle',
    COLLAPSE_GROUPS_ROW: 'collapseGroupsRow',
        AUTO_CLEANUP_TOGGLE: 'autoCleanupToggle',
        CLEANUP_SETTINGS: 'cleanupSettings',
        CLEANUP_DAYS: 'cleanupDays',
        SHORTCUT_LINK: 'shortcutLink',
        INCLUDE_DUPLICATES_TOGGLE: 'includeDuplicatesToggle',
        RESTORE_FOLDER_SELECT: 'restoreFolderSelect',
        RESTORE_LIST: 'restoreList',
        RESTORE_ALL_BTN: 'restoreAllBtn',
        RESTORE_SELECTED_BTN: 'restoreSelectedBtn',
        RESTORE_PRESERVE_GROUPS_TOGGLE: 'restorePreserveGroupsToggle',
        ALL_WINDOWS_TOGGLE: 'allWindowsToggle',
        BACKUP_NOTE_INPUT: 'backupNoteInput',
        DOMAIN_FILTER_INPUT: 'domainFilterInput',
        CLEAR_FILTER_BTN: 'clearFilterBtn',
        SEARCH_INPUT: 'searchInput',
        RESTORE_PREVIEW: 'restorePreview',
        COMPARE_SELECT1: 'compareSelect1',
        COMPARE_SELECT2: 'compareSelect2',
        COMPARE_BTN: 'compareBtn',
        COMPARE_RESULT: 'compareResult',
        EXPORT_JSON_BTN: 'exportJsonBtn',
        EXPORT_CSV_BTN: 'exportCsvBtn',
        TOOLS_FOLDER_SELECT: 'toolsFolderSelect',
        TOOLS_BACKUP_SELECT: 'toolsBackupSelect',
        EXPORT_STATUS: 'exportStatus',
        IMPORT_FILE: 'importFile',
        IMPORT_BTN: 'importBtn',
        IMPORT_STATUS: 'importStatus',
        STATS_CONTAINER: 'statsContainer',
        TAB_THRESHOLD_TOGGLE: 'tabThresholdToggle',
        TAB_THRESHOLD_INPUT: 'tabThresholdInput',
        REMINDER_TOGGLE: 'reminderToggle',
        REMINDER_DAYS_INPUT: 'reminderDaysInput',
        RESTORE_STATUS_MESSAGE: 'restoreStatusMessage',
        AUTO_BACKUP_HEADER: 'autoBackupHeader',
        AUTO_BACKUP_BODY: 'autoBackupBody',
        TAB_COUNTER_SPAN: 'tabCounterSpan'
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
        INCLUDE_DUPLICATES: 'includeDuplicates',
        ALL_WINDOWS: 'allWindows',
        COLLAPSE_GROUPS: 'collapseGroups',
        TAB_THRESHOLD: 'tabThreshold',
        TAB_THRESHOLD_ENABLED: 'tabThresholdEnabled',
        REMINDER_ENABLED: 'reminderEnabled',
        REMINDER_DAYS: 'reminderDays',
        BACKUP_STATS: 'backupStats'
    },
    MAX_BACKUP_TIMES: 5,
    MANY_TABS_THRESHOLD: 50
};

const DOM = {
    get: (id) => document.getElementById(id),
    getAll: (selector) => document.querySelectorAll(selector),
    create: (tag) => document.createElement(tag)
};

function sendMessage(request) {
    return browser.runtime.sendMessage(request);
}

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
        const uiLang = browser.i18n.getUILanguage();
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

        DOM.getAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.get(key);
        });
    },

    get(key, substitutions) {
        if (this.translations[key] && this.translations[key].message) {
            let msg = this.translations[key].message;
            if (substitutions) {
                substitutions.forEach((sub, i) => {
                    msg = msg.replace(`$${i + 1}`, sub);
                });
            }
            return msg;
        }
        const chromeMsg = browser.i18n.getMessage(key, substitutions);
        return chromeMsg || key;
    }
};

const SettingsManager = {
    async load() {
        const keys = Object.values(CONSTANTS.STORAGE);
        return browser.storage.local.get(keys);
    },

    async save(settings) {
        return browser.storage.local.set(settings);
    }
};

const TabManager = {
    includeDuplicates: false,

    init(includeDuplicates = false) {
        this.includeDuplicates = includeDuplicates;
        this.loadOpenTabs();
    },

    async loadOpenTabs() {
        const allWindowsToggle = DOM.get(CONSTANTS.SELECTORS.ALL_WINDOWS_TOGGLE);
        const domainFilterInput = DOM.get(CONSTANTS.SELECTORS.DOMAIN_FILTER_INPUT);
        const queryOpts = allWindowsToggle && allWindowsToggle.checked ? {} : { currentWindow: true };
        const domainFilter = domainFilterInput ? domainFilterInput.value.trim().toLowerCase() : '';

        const allTabs = await browser.tabs.query(queryOpts);
        let filteredTabs = allTabs;
        if (domainFilter) {
            filteredTabs = allTabs.filter(tab => {
                try {
                    const hostname = new URL(tab.url).hostname.toLowerCase();
                    return hostname.includes(domainFilter);
                } catch (e) {
                    return false;
                }
            });
        }

        const container = DOM.get(CONSTANTS.SELECTORS.TAB_LIST_CONTAINER);
        container.replaceChildren();

        if (filteredTabs.length === 0) {
            container.textContent = Localization.get("noOpenTabs");
            return;
        }

        const duplicates = this.includeDuplicates ? new Set() : this.findDuplicates(filteredTabs);
        container.appendChild(this.createControls(filteredTabs.length, duplicates));
        container.appendChild(this.createTabList(filteredTabs, duplicates));
        this.updateCounter(filteredTabs.length);
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
        btnGroup.append(
            this.createActionBtn(Localization.get("selectAll"), () => this.toggleAll(true)),
            document.createTextNode(' | '),
            this.createActionBtn(Localization.get("deselectAll"), () => this.toggleAll(false))
        );

        const counter = DOM.create('span');
        counter.id = 'tabCounterSpan';

        controlDiv.append(btnGroup, counter);

        if (duplicates.size > 0) {
            const dupInfo = DOM.create('span');
            dupInfo.className = 'duplicate-info';
            dupInfo.textContent = ` (${duplicates.size} ${Localization.get("duplicateWarning")})`;
            controlDiv.appendChild(dupInfo);
        }

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
        checkbox.dataset.pinned = tab.pinned ? 'true' : 'false';
        checkbox.dataset.tabId = tab.id || '';
        checkbox.dataset.groupId = tab.groupId != null ? String(tab.groupId) : '';
        checkbox.addEventListener('change', () => this.updateCounter());

        const icon = this.createFavicon(tab.favIconUrl);

        if (tab.pinned) {
            const pinIndicator = DOM.create('span');
            pinIndicator.textContent = '\uD83D\uDCCC';
            pinIndicator.className = 'pin-indicator';
            pinIndicator.style.marginRight = '4px';
            pinIndicator.style.fontSize = '12px';
            row.append(checkbox, pinIndicator, icon);
        } else {
            row.append(checkbox, icon);
        }

        const label = this.createLabel(tab);
        row.appendChild(label);

        if (!this.includeDuplicates && isDuplicate && index === 0) {
            const badge = DOM.create('span');
            badge.className = 'duplicate-badge';
            badge.textContent = `${groupSize}x`;
            badge.title = `${groupSize} ${Localization.get("duplicateGroupTooltip")}`;
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
        const span = DOM.get(CONSTANTS.SELECTORS.TAB_COUNTER_SPAN);
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
            selected.push({
                title: cb.dataset.title,
                url: cb.dataset.url,
                pinned: cb.dataset.pinned === 'true',
                groupId: cb.dataset.groupId ? parseInt(cb.dataset.groupId, 10) : (BrowserDetect.supportsTabGroups ? browser.tabGroups.TAB_GROUP_ID_NONE : -1)
            });
        });
        return selected;
    }
};

const BookmarkManager = {
    async init(savedId) {
        const response = await sendMessage({ action: 'getBookmarkTree' });
        if (!response || !response.success) return;

        const select = DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT);
        const defaultText = Localization.get("selectDefault");
        select.replaceChildren();
        const defaultOpt = DOM.create('option');
        defaultOpt.value = '';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = defaultText;
        select.appendChild(defaultOpt);
        BookmarkTreeHelper.populateFolderSelect(select, response.tree, 0, savedId);

        DOM.get(CONSTANTS.SELECTORS.FOLDER_SELECT).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.BACKUP_FOLDER_ID]: e.target.value })
                .then(() => UI.showStatus(Localization.get("folderSaved"), 'success'));
        });
    }
};

const BookmarkTreeHelper = {
    formatFolderTitle(node, depth) {
        let title = node.title;
        if (node.id === '1') title = Localization.get("bookmarksBar") || 'Bookmarks Bar';
        if (node.id === '2') title = Localization.get("otherBookmarks") || 'Other Bookmarks';
        const indent = '\u00A0\u00A0'.repeat(depth * 2);
        const prefix = depth > 0 ? '└─ ' : '';
        return indent + prefix + title;
    },

    populateFolderSelect(select, nodes, depth, savedId) {
        for (const node of nodes) {
            if (!node.url && node.id !== '0') {
                const option = DOM.create('option');
                option.value = node.id;
                option.textContent = this.formatFolderTitle(node, depth);
                if (node.id === savedId) option.selected = true;
                select.appendChild(option);
            }
            if (node.children) {
                this.populateFolderSelect(select, node.children, depth + 1, savedId);
            }
        }
    }
};

function parseBookmarkTitle(title) {
    if (!title || typeof title !== 'string') return { pinned: false, cleanTitle: '' };
    const pinned = title.startsWith('[PIN] ');
    const cleanTitle = pinned ? title.replace(/^\[PIN\] /, '') : title;
    return { pinned, cleanTitle };
}

const RestoreManager = {
    selectedBackup: null,
    tabCount: 0,
    _initialized: false,
    _backups: [],

    init(savedFolderId) {
        this.selectedBackup = null;
        this.tabCount = 0;
        this.loadBackupFolders(savedFolderId);
        if (!this._initialized) {
            this.setupEventListeners();
            this._initialized = true;
        }
        this.updateButtonStates(false);
    },

    async loadBackupFolders(savedFolderId) {
        const response = await sendMessage({ action: 'getBookmarkTree' });
        if (!response || !response.success) return;

        const select = DOM.get(CONSTANTS.SELECTORS.RESTORE_FOLDER_SELECT);
        const defaultText = Localization.get("selectBackupFolder");
        select.replaceChildren();
        const defaultOpt = DOM.create('option');
        defaultOpt.value = '';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = defaultText;
        select.appendChild(defaultOpt);
        BookmarkTreeHelper.populateFolderSelect(select, response.tree, 0, savedFolderId);

        if (savedFolderId) {
            this.loadBackups(savedFolderId);
        }
    },

    setupEventListeners() {
        document.addEventListener('change', (e) => {
            if (e.target.id === CONSTANTS.SELECTORS.RESTORE_FOLDER_SELECT) {
                this.loadBackups(e.target.value);
            }
        });

        DOM.get(CONSTANTS.SELECTORS.RESTORE_ALL_BTN).addEventListener('click', () => {
            if (this.selectedBackup) {
                this.confirmAndRestore(this.selectedBackup.id, this.tabCount);
            }
        });

        DOM.get(CONSTANTS.SELECTORS.RESTORE_SELECTED_BTN).addEventListener('click', () => {
            this.restoreSelected();
        });

        DOM.get(CONSTANTS.SELECTORS.COMPARE_BTN).addEventListener('click', () => {
            this.compareBackups();
        });

        let searchDebounce = null;
        DOM.get(CONSTANTS.SELECTORS.SEARCH_INPUT).addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                this.filterBackups(e.target.value);
            }, 300);
        });
    },

    updateButtonStates(hasSelection) {
        const allBtn = DOM.get(CONSTANTS.SELECTORS.RESTORE_ALL_BTN);
        const selectedBtn = DOM.get(CONSTANTS.SELECTORS.RESTORE_SELECTED_BTN);
        allBtn.disabled = !hasSelection;
        selectedBtn.disabled = !hasSelection;
    },

    async loadBackups(folderId) {
        if (!folderId) {
            this.updateButtonStates(false);
            return;
        }

        this.selectedBackup = null;
        this.tabCount = 0;
        this.updateButtonStates(false);

        const response = await sendMessage({ action: 'getBookmarkChildren', folderId });
        if (!response || !response.success) {
            this.showFolderDeletedError();
            return;
        }

        const container = DOM.get(CONSTANTS.SELECTORS.RESTORE_LIST);
        container.replaceChildren();

        const backups = response.children.filter(c => !c.url && c.title && c.title.startsWith('Backup_'));

        this._backups = backups;

        if (backups.length === 0) {
            const noBackups = DOM.create('div');
            noBackups.className = 'no-backups';
            noBackups.textContent = Localization.get("noBackupsFound");
            container.replaceChildren(noBackups);
            this.updateButtonStates(false);
            this.loadCompareOptions([]);
            return;
        }

        this.renderBackups(container, backups);
        this.loadCompareOptions(backups);
    },

    async renderBackups(container, backups) {
        const counts = await Promise.all(backups.map(b => this.countBookmarks(b.id)));
        backups.forEach((backup, i) => {
            const item = this.createBackupItem(backup, counts[i]);
            container.appendChild(item);
        });
    },

    async countBookmarks(folderId) {
        const response = await sendMessage({ action: 'countBookmarks', folderId });
        return response && response.success ? response.count : 0;
    },

    createBackupItem(backup, count) {
        const item = DOM.create('div');
        item.className = 'restore-item';
        item.dataset.id = backup.id;
        item.dataset.count = count;
        item.dataset.title = (backup.title || '').toLowerCase();

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

        item.addEventListener('dblclick', () => {
            this.togglePreview(backup.id);
        });

        return item;
    },

    togglePreview(backupId) {
        const preview = DOM.get(CONSTANTS.SELECTORS.RESTORE_PREVIEW);
        const existingId = preview.dataset.backupId;

        if (existingId === backupId && !preview.classList.contains('hidden')) {
            preview.classList.add('hidden');
            preview.replaceChildren();
            preview.dataset.backupId = '';
            return;
        }

        preview.classList.remove('hidden');
        preview.dataset.backupId = backupId;
        const loadingEl = DOM.create('div');
        loadingEl.className = 'restore-preview-loading';
        loadingEl.textContent = Localization.get("loadingPreview");
        preview.replaceChildren(loadingEl);

        this.loadBackupPreview(backupId, preview);
    },

    async loadBackupPreview(backupId, container) {
        const response = await sendMessage({ action: 'getBackupPreview', backupId });
        container.replaceChildren();

        if (!response || !response.success || response.items.length === 0) {
            const noPreview = DOM.create('div');
            noPreview.className = 'restore-preview-loading';
            noPreview.textContent = Localization.get("noBookmarksPreview");
            container.replaceChildren(noPreview);
            return;
        }

        const items = response.items;

        const header = DOM.create('div');
        header.className = 'restore-preview-header';
        header.textContent = `${items.length} ${Localization.get("backupCountLabel")}`;
        container.appendChild(header);

        items.forEach(item => {
            const row = DOM.create('div');
            row.className = 'restore-preview-row';

            const cb = DOM.create('input');
            cb.type = 'checkbox';
            cb.className = 'restore-select-cb';
            cb.dataset.url = item.url;
            cb.dataset.title = item.title;
            cb.dataset.pinned = item.pinned ? 'true' : 'false';
            cb.checked = true;

            const span = DOM.create('span');
            span.textContent = (item.pinned ? '\uD83D\uDCCC ' : '') + (item.title || item.url);
            span.title = item.url;
            span.className = 'restore-preview-label';

            row.append(cb, span);
            container.appendChild(row);
        });
    },

    async restoreSelected() {
        const checkboxes = DOM.getAll('.restore-select-cb:checked');
        if (checkboxes.length === 0) {
            this.showStatus(Localization.get("noTabsRestore"), 'error');
            return;
        }

        const tabs = [];
        checkboxes.forEach(cb => {
            tabs.push({ url: cb.dataset.url, title: cb.dataset.title, pinned: cb.dataset.pinned === 'true' });
        });

        this.showProgress(true);

        const response = await browser.runtime.sendMessage({ action: 'restoreTabs', tabs });
        this.showProgress(false);
        this.handleResponse(response);
    },

    filterBackups(query) {
        const q = query.trim().toLowerCase();
        const items = DOM.getAll('.restore-item');
        items.forEach(item => {
            const title = item.dataset.title || '';
            if (!q || title.includes(q)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    },

    compareBackups() {
        const id1 = DOM.get(CONSTANTS.SELECTORS.COMPARE_SELECT1).value;
        const id2 = DOM.get(CONSTANTS.SELECTORS.COMPARE_SELECT2).value;

        if (!id1 || !id2) {
            const result = DOM.get(CONSTANTS.SELECTORS.COMPARE_RESULT);
            const errEl = DOM.create('div');
            errEl.className = 'compare-result-error';
            errEl.textContent = Localization.get("selectTwoBackups");
            result.replaceChildren(errEl);
            return;
        }

        if (id1 === id2) {
            const result = DOM.get(CONSTANTS.SELECTORS.COMPARE_RESULT);
            const errEl = DOM.create('div');
            errEl.className = 'compare-result-error';
            errEl.textContent = Localization.get("selectDiffBackups");
            result.replaceChildren(errEl);
            return;
        }

        Promise.all([
            this.getAllBookmarkUrls(id1),
            this.getAllBookmarkUrls(id2)
        ]).then(([urls1, urls2]) => {
            const set1 = new Set(urls1);
            const set2 = new Set(urls2);

            const added = [...set2].filter(u => !set1.has(u));
            const removed = [...set1].filter(u => !set2.has(u));
            const common = [...set1].filter(u => set2.has(u));

            const result = DOM.get(CONSTANTS.SELECTORS.COMPARE_RESULT);
            result.replaceChildren();

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

            renderSection(Localization.get("compareAdded"), added, '#4CAF50');
            renderSection(Localization.get("compareRemoved"), removed, '#F44336');
            renderSection(Localization.get("compareCommonLabel"), common, '#2196F3');
        });
    },

    loadCompareOptions(backups) {
        const select1 = DOM.get(CONSTANTS.SELECTORS.COMPARE_SELECT1);
        const select2 = DOM.get(CONSTANTS.SELECTORS.COMPARE_SELECT2);
        const compareBtn = DOM.get(CONSTANTS.SELECTORS.COMPARE_BTN);

        const label1 = select1.querySelector('option[disabled]');
        const label2 = select2.querySelector('option[disabled]');

        select1.replaceChildren();
        select2.replaceChildren();

        const opt1 = DOM.create('option');
        opt1.value = '';
        opt1.disabled = true;
        opt1.selected = true;
        opt1.textContent = label1 ? label1.textContent : 'Backup A';
        select1.appendChild(opt1);

        const opt2 = DOM.create('option');
        opt2.value = '';
        opt2.disabled = true;
        opt2.selected = true;
        opt2.textContent = label2 ? label2.textContent : 'Backup B';
        select2.appendChild(opt2);

        backups.forEach(backup => {
            const o1 = DOM.create('option');
            o1.value = backup.id;
            o1.textContent = backup.title;
            select1.appendChild(o1);

            const o2 = DOM.create('option');
            o2.value = backup.id;
            o2.textContent = backup.title;
            select2.appendChild(o2);
        });

        if (backups.length >= 2) {
            compareBtn.disabled = false;
        } else {
            compareBtn.disabled = true;
        }
    },

    async getAllBookmarkUrls(backupId) {
        const response = await sendMessage({ action: 'getAllBookmarkUrls', backupId });
        return response && response.success ? response.urls : [];
    },

    confirmAndRestore(backupId, tabCount) {
        if (tabCount >= CONSTANTS.MANY_TABS_THRESHOLD) {
            const warning = Localization.get("manyTabsWarning", [tabCount]);
            if (!confirm(warning)) {
                return;
            }
        }
        this.restoreBackup(backupId);
    },

    async restoreBackup(backupId) {
        this.showProgress(true);
        const preserveGroups = DOM.get(CONSTANTS.SELECTORS.RESTORE_PRESERVE_GROUPS_TOGGLE).checked;
        const response = await browser.runtime.sendMessage({
            action: 'restoreBackup',
            backupId: backupId,
            options: { preserveTabGroups: preserveGroups }
        });
        this.showProgress(false);
        this.handleResponse(response);
    },

    showProgress(show) {
        const allBtn = DOM.get(CONSTANTS.SELECTORS.RESTORE_ALL_BTN);
        const selectedBtn = DOM.get(CONSTANTS.SELECTORS.RESTORE_SELECTED_BTN);
        allBtn.disabled = show;
        selectedBtn.disabled = show;
        if (show) {
            allBtn.textContent = Localization.get("restoring") || 'Restoring...';
            selectedBtn.textContent = Localization.get("restoring") || 'Restoring...';
        } else {
            allBtn.textContent = Localization.get("restoreAll");
            selectedBtn.textContent = Localization.get("restoreSelected");
        }
    },

    handleResponse(response) {
        if (response && response.success) {
            let msg = Localization.get("restoreSuccess", [response.tabsOpened]);
            if (response.groupsCreated > 0) {
                msg += ' ' + Localization.get("tabGroupsCreated");
            } else if (BrowserDetect.isZenBrowser) {
                msg += ' ' + Localization.get("zenWorkspaceRestoreHint");
            }
            this.showStatus(msg, 'success');
        } else {
            this.showStatus(Localization.get("restoreFailed") + (response ? ': ' + response.error : ''), 'error');
        }
    },

    showStatus(msg, type) {
        const el = DOM.get(CONSTANTS.SELECTORS.RESTORE_STATUS_MESSAGE);
        el.textContent = msg;
        el.style.color = type === 'error' ? 'red' : 'green';
        setTimeout(() => el.textContent = '', 4000);
    },

    showFolderDeletedError() {
        const container = DOM.get(CONSTANTS.SELECTORS.RESTORE_LIST);
        const errEl = DOM.create('div');
        errEl.className = 'no-backups error';
        errEl.textContent = Localization.get("folderDeleted");
        container.replaceChildren(errEl);
        this.updateButtonStates(false);
    }
};

const TimeManager = {
    times: ['09:00'],
    _initialized: false,

    init(savedTimes) {
        this.times = savedTimes && savedTimes.length > 0 ? savedTimes : ['09:00'];
        this.render();
        if (!this._initialized) {
            this.setupEventListeners();
            this._initialized = true;
        }
    },

    setupEventListeners() {
        DOM.get(CONSTANTS.SELECTORS.ADD_TIME_BTN).addEventListener('click', () => this.addTime());
    },

    render() {
        const container = DOM.get(CONSTANTS.SELECTORS.TIME_LIST);
        container.replaceChildren();

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

const ToolsManager = {
    _initialized: false,

    init(savedFolderId) {
        this.loadFolderTree(savedFolderId);
        if (!this._initialized) {
            this.setupEventListeners();
            this._initialized = true;
        }
    },

    async loadFolderTree(savedFolderId) {
        const response = await sendMessage({ action: 'getBookmarkTree' });
        if (!response || !response.success) return;

        const select = DOM.get(CONSTANTS.SELECTORS.TOOLS_FOLDER_SELECT);
        const defaultText = Localization.get("selectBackupFolder") || 'Select Backup Folder';
        select.replaceChildren();
        const defaultOpt = DOM.create('option');
        defaultOpt.value = '';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = defaultText;
        select.appendChild(defaultOpt);
        BookmarkTreeHelper.populateFolderSelect(select, response.tree, 0, savedFolderId);

        if (savedFolderId) {
            this.loadBackups(savedFolderId);
        }
    },

    async loadBackups(folderId) {
        const select = DOM.get(CONSTANTS.SELECTORS.TOOLS_BACKUP_SELECT);
        const defaultText = Localization.get("selectBackupDefault") || '-- Select a backup --';
        select.replaceChildren();
        const defaultOpt = DOM.create('option');
        defaultOpt.value = '';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = defaultText;
        select.appendChild(defaultOpt);

        if (!folderId) return;

        const response = await sendMessage({ action: 'getBookmarkChildren', folderId });
        if (!response || !response.success) {
            const opt = DOM.create('option');
            opt.disabled = true;
            opt.textContent = Localization.get("folderDeleted") || 'Error loading backups';
            select.appendChild(opt);
            return;
        }

        const backups = response.children.filter(c => !c.url && c.title && c.title.startsWith('Backup_'));
        if (backups.length === 0) {
            const opt = DOM.create('option');
            opt.disabled = true;
            opt.textContent = Localization.get("noBackupsFound") || 'No backups found';
            select.appendChild(opt);
            return;
        }

        backups.forEach(backup => {
            const opt = DOM.create('option');
            opt.value = backup.id;
            opt.textContent = backup.title;
            select.appendChild(opt);
        });
    },

    setupEventListeners() {
        document.addEventListener('change', (e) => {
            if (e.target.id === CONSTANTS.SELECTORS.TOOLS_FOLDER_SELECT) {
                this.loadBackups(e.target.value);
            }
        });

        DOM.get(CONSTANTS.SELECTORS.EXPORT_JSON_BTN).addEventListener('click', () => {
            this.exportBackup('json');
        });

        DOM.get(CONSTANTS.SELECTORS.EXPORT_CSV_BTN).addEventListener('click', () => {
            this.exportBackup('csv');
        });

        DOM.get(CONSTANTS.SELECTORS.IMPORT_BTN).addEventListener('click', () => {
            this.importBackup();
        });
    },

    async exportBackup(format) {
        const backupId = DOM.get(CONSTANTS.SELECTORS.TOOLS_BACKUP_SELECT).value;
        if (!backupId) {
            this.showExportStatus(Localization.get("exportSelectBackup") || 'Please select a backup first', 'error');
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({ action: 'exportBackup', backupId, format });
            if (response && response.success) {
                const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
                const extension = format === 'csv' ? '.csv' : '.json';
                const blob = new Blob([response.data], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = DOM.create('a');
                a.href = url;
                const backupSelect = DOM.get(CONSTANTS.SELECTORS.TOOLS_BACKUP_SELECT);
                const selected = backupSelect.selectedIndex;
                const backupTitle = selected >= 0 ? backupSelect.options[selected].textContent : backupId;
                a.download = `${backupTitle}${extension}`;
                a.click();
                URL.revokeObjectURL(url);
                this.showExportStatus(Localization.get("exportComplete") || 'Export complete', 'success');
            } else {
                this.showExportStatus(Localization.get("exportFailedMsg") + ': ' + (response ? response.error : ''), 'error');
            }
        } catch (err) {
            this.showExportStatus(Localization.get("exportFailedMsg") + ': ' + err.message, 'error');
        }
    },

    async importBackup() {
        const fileInput = DOM.get(CONSTANTS.SELECTORS.IMPORT_FILE);
        const statusEl = DOM.get(CONSTANTS.SELECTORS.IMPORT_STATUS);
        const folderId = DOM.get(CONSTANTS.SELECTORS.TOOLS_FOLDER_SELECT).value;

        if (!folderId) {
            statusEl.textContent = Localization.get("importSelectFolder") || 'Please select a folder';
            statusEl.style.color = 'red';
            return;
        }

        const file = fileInput.files[0];
        if (!file) {
            statusEl.textContent = Localization.get("importSelectFile") || 'Please select a file';
            statusEl.style.color = 'red';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target.result;
            try {
                const response = await browser.runtime.sendMessage({ action: 'importBackup', data, folderId });
                if (response && response.success) {
                    const msg = (Localization.get("importSuccess") || 'Imported $count$ tabs').replace('$count$', response.count);
                    statusEl.textContent = msg;
                    statusEl.style.color = 'green';
                } else {
                    statusEl.textContent = (Localization.get("importFailed") || 'Import failed') + ': ' + (response ? response.error : '');
                    statusEl.style.color = 'red';
                }
                setTimeout(() => statusEl.textContent = '', 4000);
            } catch (err) {
                statusEl.textContent = (Localization.get("importFailed") || 'Import failed') + ': ' + err.message;
                statusEl.style.color = 'red';
            }
        };
        reader.readAsText(file);
    },

    showExportStatus(msg, type) {
        const el = DOM.get(CONSTANTS.SELECTORS.EXPORT_STATUS);
        if (!el) return;
        el.textContent = msg;
        el.style.color = type === 'error' ? 'red' : 'green';
        setTimeout(() => el.textContent = '', 4000);
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
            DOM.get(CONSTANTS.SELECTORS.COLLAPSE_GROUPS_ROW).style.display = e.target.checked ? 'block' : 'none';
        });

        DOM.get(CONSTANTS.SELECTORS.COLLAPSE_GROUPS_TOGGLE).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.COLLAPSE_GROUPS]: e.target.checked });
        });

        DOM.get(CONSTANTS.SELECTORS.AUTO_CLEANUP_TOGGLE).addEventListener('change', (e) => {
            this.toggleCleanupUI(e.target.checked);
        });

        DOM.get(CONSTANTS.SELECTORS.CLEANUP_DAYS).addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 30;
            val = Math.max(1, Math.min(365, val));
            e.target.value = val;
            SettingsManager.save({ [CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS]: val });
        });

        DOM.get(CONSTANTS.SELECTORS.BACKUP_BTN).addEventListener('click', this.handleBackupClick.bind(this));
        DOM.get(CONSTANTS.SELECTORS.SAVE_SETTINGS_BTN).addEventListener('click', this.handleSaveSettings.bind(this));

        DOM.get(CONSTANTS.SELECTORS.SHORTCUT_LINK).addEventListener('click', (e) => {
            e.preventDefault();
            browser.tabs.create({ url: BrowserDetect.shortcutUrl });
        });

        DOM.get(CONSTANTS.SELECTORS.INCLUDE_DUPLICATES_TOGGLE).addEventListener('change', (e) => {
            const include = e.target.checked;
            TabManager.includeDuplicates = include;
            TabManager.loadOpenTabs();
            SettingsManager.save({ [CONSTANTS.STORAGE.INCLUDE_DUPLICATES]: include });
        });

        DOM.get(CONSTANTS.SELECTORS.ALL_WINDOWS_TOGGLE).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.ALL_WINDOWS]: e.target.checked });
            TabManager.loadOpenTabs();
        });

        let domainFilterDebounce = null;
        DOM.get(CONSTANTS.SELECTORS.DOMAIN_FILTER_INPUT).addEventListener('input', () => {
            clearTimeout(domainFilterDebounce);
            domainFilterDebounce = setTimeout(() => {
                TabManager.loadOpenTabs();
            }, 300);
        });

        DOM.get(CONSTANTS.SELECTORS.CLEAR_FILTER_BTN).addEventListener('click', () => {
            DOM.get(CONSTANTS.SELECTORS.DOMAIN_FILTER_INPUT).value = '';
            TabManager.loadOpenTabs();
        });

        DOM.get(CONSTANTS.SELECTORS.TAB_THRESHOLD_TOGGLE).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.TAB_THRESHOLD_ENABLED]: e.target.checked });
        });

        DOM.get(CONSTANTS.SELECTORS.TAB_THRESHOLD_INPUT).addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 20;
            val = Math.max(5, Math.min(100, val));
            e.target.value = val;
            SettingsManager.save({ [CONSTANTS.STORAGE.TAB_THRESHOLD]: val });
        });

        DOM.get(CONSTANTS.SELECTORS.REMINDER_TOGGLE).addEventListener('change', (e) => {
            SettingsManager.save({ [CONSTANTS.STORAGE.REMINDER_ENABLED]: e.target.checked });
        });

        DOM.get(CONSTANTS.SELECTORS.REMINDER_DAYS_INPUT).addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 3;
            val = Math.max(1, Math.min(30, val));
            e.target.value = val;
            SettingsManager.save({ [CONSTANTS.STORAGE.REMINDER_DAYS]: val });
        });

        DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_HEADER).addEventListener('click', () => {
            const body = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_BODY);
            const header = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_HEADER);
            const icon = header.querySelector('.collapse-icon');
            body.classList.toggle('hidden');
            if (icon) icon.textContent = body.classList.contains('hidden') ? '▸' : '▾';
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
            browser.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID]).then((result) => {
                RestoreManager.init(result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
            });
        }

        if (tabName === 'tools') {
            browser.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID]).then((result) => {
                ToolsManager.init(result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
            });
            this.loadStats();
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
            if (!TimeManager._initialized) {
                TimeManager.init(TimeManager.times.length > 0 ? TimeManager.times : ['09:00']);
            }
        }
    },

    toggleCleanupUI(enabled) {
        const cleanupSettings = DOM.get(CONSTANTS.SELECTORS.CLEANUP_SETTINGS);
        if (enabled) cleanupSettings.classList.remove('hidden');
        else cleanupSettings.classList.add('hidden');
    },

    async handleBackupClick() {
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

        const note = DOM.get(CONSTANTS.SELECTORS.BACKUP_NOTE_INPUT).value || '';

        const btn = DOM.get(CONSTANTS.SELECTORS.BACKUP_BTN);
        btn.disabled = true;
        btn.textContent = Localization.get("backupBtnProgress");

        try {
            const response = await browser.runtime.sendMessage({ action: 'manualBackup', folderId, tabs, note });
            btn.disabled = false;
            btn.textContent = Localization.get("backupBtn");

            if (response && response.success) {
                this.showStatus(Localization.get("backupSuccess"), 'success');
                this.updateLastBackupTime();
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
    },

    handleSaveSettings() {
        const enabled = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_TOGGLE).checked;
        const interval = DOM.get(CONSTANTS.SELECTORS.INTERVAL_SELECT).value;
        const customVal = DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_INPUT).value;
        const customUnit = DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_UNIT).value;
        const preserveGroups = DOM.get(CONSTANTS.SELECTORS.PRESERVE_GROUPS_TOGGLE).checked;
        const collapseGroups = DOM.get(CONSTANTS.SELECTORS.COLLAPSE_GROUPS_TOGGLE).checked;
        const autoCleanup = DOM.get(CONSTANTS.SELECTORS.AUTO_CLEANUP_TOGGLE).checked;
        const cleanupDays = parseInt(DOM.get(CONSTANTS.SELECTORS.CLEANUP_DAYS).value) || 30;
        const includeDuplicates = DOM.get(CONSTANTS.SELECTORS.INCLUDE_DUPLICATES_TOGGLE).checked;
        const allWindows = DOM.get(CONSTANTS.SELECTORS.ALL_WINDOWS_TOGGLE).checked;
        const tabThresholdEnabled = DOM.get(CONSTANTS.SELECTORS.TAB_THRESHOLD_TOGGLE).checked;
        const tabThreshold = parseInt(DOM.get(CONSTANTS.SELECTORS.TAB_THRESHOLD_INPUT).value) || 20;
        const reminderEnabled = DOM.get(CONSTANTS.SELECTORS.REMINDER_TOGGLE).checked;
        const reminderDays = parseInt(DOM.get(CONSTANTS.SELECTORS.REMINDER_DAYS_INPUT).value) || 3;

        const settings = {
            [CONSTANTS.STORAGE.BACKUP_ENABLED]: enabled,
            [CONSTANTS.STORAGE.BACKUP_INTERVAL]: interval,
            [CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]: preserveGroups,
            [CONSTANTS.STORAGE.COLLAPSE_GROUPS]: collapseGroups,
            [CONSTANTS.STORAGE.AUTO_CLEANUP_ENABLED]: autoCleanup,
            [CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS]: cleanupDays,
            [CONSTANTS.STORAGE.INCLUDE_DUPLICATES]: includeDuplicates,
            [CONSTANTS.STORAGE.ALL_WINDOWS]: allWindows,
            [CONSTANTS.STORAGE.TAB_THRESHOLD_ENABLED]: tabThresholdEnabled,
            [CONSTANTS.STORAGE.TAB_THRESHOLD]: tabThreshold,
            [CONSTANTS.STORAGE.REMINDER_ENABLED]: reminderEnabled,
            [CONSTANTS.STORAGE.REMINDER_DAYS]: reminderDays
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
            browser.runtime.sendMessage({ action: 'updateSchedule' });

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
        browser.storage.local.get([CONSTANTS.STORAGE.LAST_BACKUP_TIME]).then((result) => {
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

        if (isEnabled) {
            const body = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_BODY);
            const header = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_HEADER);
            const icon = header.querySelector('.collapse-icon');
            body.classList.remove('hidden');
            if (icon) icon.textContent = '▾';
        } else {
            const body = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_BODY);
            const header = DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_HEADER);
            const icon = header.querySelector('.collapse-icon');
            body.classList.add('hidden');
            if (icon) icon.textContent = '▸';
        }

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
        DOM.get(CONSTANTS.SELECTORS.COLLAPSE_GROUPS_TOGGLE).checked = settings[CONSTANTS.STORAGE.COLLAPSE_GROUPS] || false;
        DOM.get(CONSTANTS.SELECTORS.COLLAPSE_GROUPS_ROW).style.display = (settings[CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]) ? 'block' : 'none';

        const cleanupEnabled = settings[CONSTANTS.STORAGE.AUTO_CLEANUP_ENABLED] || false;
        DOM.get(CONSTANTS.SELECTORS.AUTO_CLEANUP_TOGGLE).checked = cleanupEnabled;
        this.toggleCleanupUI(cleanupEnabled);
        DOM.get(CONSTANTS.SELECTORS.CLEANUP_DAYS).value = settings[CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS] || 30;

        const includeDuplicates = settings[CONSTANTS.STORAGE.INCLUDE_DUPLICATES] || false;
        DOM.get(CONSTANTS.SELECTORS.INCLUDE_DUPLICATES_TOGGLE).checked = includeDuplicates;

        const allWindows = settings[CONSTANTS.STORAGE.ALL_WINDOWS] || false;
        DOM.get(CONSTANTS.SELECTORS.ALL_WINDOWS_TOGGLE).checked = allWindows;

        const tabThresholdEnabled = settings[CONSTANTS.STORAGE.TAB_THRESHOLD_ENABLED] || false;
        DOM.get(CONSTANTS.SELECTORS.TAB_THRESHOLD_TOGGLE).checked = tabThresholdEnabled;

        const tabThreshold = settings[CONSTANTS.STORAGE.TAB_THRESHOLD] || 20;
        DOM.get(CONSTANTS.SELECTORS.TAB_THRESHOLD_INPUT).value = tabThreshold;

        const reminderEnabled = settings[CONSTANTS.STORAGE.REMINDER_ENABLED] || false;
        DOM.get(CONSTANTS.SELECTORS.REMINDER_TOGGLE).checked = reminderEnabled;

        const reminderDays = settings[CONSTANTS.STORAGE.REMINDER_DAYS] || 3;
        DOM.get(CONSTANTS.SELECTORS.REMINDER_DAYS_INPUT).value = reminderDays;

        this.updateLastBackupTime();
    },

    async loadStats() {
        const stats = await browser.runtime.sendMessage({ action: 'getStats' });
        const container = DOM.get(CONSTANTS.SELECTORS.STATS_CONTAINER);
        if (!container) return;

        container.replaceChildren();

        if (!stats || Object.keys(stats).length === 0) {
            const noStats = DOM.create('div');
            noStats.style.fontSize = '12px';
            noStats.style.color = '#888';
            noStats.textContent = Localization.get("noStats");
            container.replaceChildren(noStats);
            return;
        }

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

        addRow(Localization.get("totalBackups"), stats.totalBackups || 0);
        addRow(Localization.get("totalTabs"), stats.totalTabs || 0);

        if (stats.updatedAt) {
            addRow(Localization.get("lastUpdated"), new Date(stats.updatedAt).toLocaleString());
        }

        if (stats.topDomains && stats.topDomains.length > 0) {
            const domainHeader = DOM.create('div');
            domainHeader.className = 'stats-domain-header';
            domainHeader.textContent = Localization.get("topDomains") + ':';
            container.appendChild(domainHeader);

            stats.topDomains.forEach(d => {
                const row = DOM.create('div');
                row.className = 'stats-detail-row';

                const labelEl = DOM.create('span');
                labelEl.textContent = d.domain;

                const valueEl = DOM.create('span');
                valueEl.textContent = d.count;

                row.append(labelEl, valueEl);
                container.appendChild(row);
            });
        }
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
