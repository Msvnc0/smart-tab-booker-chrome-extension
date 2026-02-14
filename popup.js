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
        TIME_CONTAINER: 'timeContainer'
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
        SELECTED_LANGUAGE: 'selectedLanguage'
    }
};

const DOM = {
    get: (id) => document.getElementById(id),
    getAll: (selector) => document.querySelectorAll(selector),
    create: (tag) => document.createElement(tag)
};

// --- Modules ---

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
        let lang = uiLang.split('-')[0];
        const supported = ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt_BR', 'ru', 'ja', 'zh_CN'];

        if (uiLang.startsWith('pt')) lang = 'pt_BR';
        if (uiLang.startsWith('zh')) lang = 'zh_CN';

        return supported.includes(lang) ? lang : 'en';
    },

    async load(lang) {
        try {
            const url = `_locales/${lang}/messages.json`;
            const response = await fetch(url);
            this.translations = await response.json();
            this.updateUI();

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
    init() {
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

            container.appendChild(this.createControls(tabs.length));
            container.appendChild(this.createTabList(tabs));
            this.updateCounter(tabs.length);
        });
    },

    createControls(totalTabs) {
        const controlDiv = DOM.create('div');
        controlDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 5px;';

        const btnGroup = DOM.create('div');
        const selectAll = this.createActionBtn(Localization.get("selectAll"), () => this.toggleAll(true));
        const deselectAll = this.createActionBtn(Localization.get("deselectAll"), () => this.toggleAll(false));

        btnGroup.append(selectAll, document.createTextNode('|'), deselectAll);

        const counter = DOM.create('span');
        counter.id = 'tabCounterSpan';
        counter.style.cssText = 'font-size: 12px; font-weight: bold;';

        controlDiv.append(btnGroup, counter);
        return controlDiv;
    },

    createActionBtn(text, onClick) {
        const btn = DOM.create('button');
        btn.textContent = text;
        btn.style.cssText = 'background: none; border: none; color: #007bff; cursor: pointer; padding: 0 5px; font-size: 12px;';
        btn.addEventListener('click', onClick);
        return btn;
    },

    createTabList(tabs) {
        const scrollContainer = DOM.create('div');
        scrollContainer.style.cssText = 'max-height: 150px; overflow-y: auto;';
        scrollContainer.id = 'tabScrollContainer';

        tabs.forEach(tab => {
            const row = DOM.create('div');
            row.style.cssText = 'display: flex; align-items: center; padding: 2px 0;';

            const checkbox = DOM.create('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.className = 'tab-checkbox';
            checkbox.dataset.title = tab.title;
            checkbox.dataset.url = tab.url;
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', () => this.updateCounter(tabs.length));

            const icon = this.createFavicon(tab.favIconUrl);
            const label = this.createLabel(tab);

            row.append(checkbox, icon, label);
            scrollContainer.appendChild(row);
        });

        return scrollContainer;
    },

    createFavicon(url) {
        if (!url) return document.createTextNode('');
        const img = DOM.create('img');
        img.src = url;
        img.style.cssText = 'width: 16px; height: 16px; margin-right: 5px;';
        img.onerror = () => { img.style.display = 'none'; };
        return img;
    },

    createLabel(tab) {
        const label = DOM.create('span');
        label.textContent = tab.title;
        label.title = tab.url;
        label.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; cursor: default; flex: 1;';
        return label;
    },

    toggleAll(checked) {
        DOM.getAll('.tab-checkbox').forEach(cb => cb.checked = checked);
        // We need total count, best to pull from container or store state. 
        // Simple way: count checkboxes
        const total = DOM.getAll('.tab-checkbox').length;
        this.updateCounter(total);
    },

    updateCounter(total) {
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

const UI = {
    init() {
        this.populateTimeDropdowns();
        this.setupEventListeners();
    },

    populateTimeDropdowns() {
        const hourSelect = DOM.get(CONSTANTS.SELECTORS.HOUR_SELECT);
        const minuteSelect = DOM.get(CONSTANTS.SELECTORS.MINUTE_SELECT);

        for (let i = 0; i < 24; i++) {
            const val = i.toString().padStart(2, '0');
            const opt = DOM.create('option');
            opt.value = val;
            opt.textContent = val;
            hourSelect.appendChild(opt);
        }
        for (let i = 0; i < 60; i++) {
            const val = i.toString().padStart(2, '0');
            const opt = DOM.create('option');
            opt.value = val;
            opt.textContent = val;
            minuteSelect.appendChild(opt);
        }
    },

    setupEventListeners() {
        DOM.get(CONSTANTS.SELECTORS.LANGUAGE_SELECT).addEventListener('change', async (e) => {
            const newLang = e.target.value;
            await SettingsManager.save({ [CONSTANTS.STORAGE.SELECTED_LANGUAGE]: newLang });
            await Localization.load(newLang);
            TabManager.loadOpenTabs(); // Reload to translate "Selected"
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

        DOM.get(CONSTANTS.SELECTORS.BACKUP_BTN).addEventListener('click', this.handleBackupClick.bind(this));
        DOM.get(CONSTANTS.SELECTORS.SAVE_SETTINGS_BTN).addEventListener('click', this.handleSaveSettings.bind(this));
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
        const hour = DOM.get(CONSTANTS.SELECTORS.HOUR_SELECT).value;
        const minute = DOM.get(CONSTANTS.SELECTORS.MINUTE_SELECT).value;

        const settings = {
            [CONSTANTS.STORAGE.BACKUP_ENABLED]: enabled,
            [CONSTANTS.STORAGE.BACKUP_INTERVAL]: interval
        };

        if (interval === 'custom') {
            if (!customVal || customVal < 1) {
                this.showStatus(Localization.get("invalidValue"), 'error');
                return;
            }
            settings[CONSTANTS.STORAGE.CUSTOM_INTERVAL] = parseInt(customVal);
            settings[CONSTANTS.STORAGE.CUSTOM_UNIT] = customUnit;
        } else {
            settings[CONSTANTS.STORAGE.BACKUP_TIME] = `${hour}:${minute}`;
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
        // Restore Dark Mode
        if (settings[CONSTANTS.STORAGE.DARK_MODE]) {
            this.toggleDarkMode(true);
            DOM.get(CONSTANTS.SELECTORS.DARK_MODE_TOGGLE).checked = true;
        }

        // Restore Auto Backup Toggle
        const isEnabled = settings[CONSTANTS.STORAGE.BACKUP_ENABLED] !== false;
        DOM.get(CONSTANTS.SELECTORS.AUTO_BACKUP_TOGGLE).checked = isEnabled;
        this.toggleAutoBackupUI(isEnabled);

        // Restore Interval
        const interval = settings[CONSTANTS.STORAGE.BACKUP_INTERVAL] || 'daily';
        // Handle legacy 'off' if present in storage, default to daily if off (since we utilize toggle now)
        const safeInterval = interval === 'off' ? 'daily' : interval;

        DOM.get(CONSTANTS.SELECTORS.INTERVAL_SELECT).value = safeInterval;
        this.toggleIntervalUI(safeInterval);

        if (safeInterval === 'custom') {
            DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_INPUT).value = settings[CONSTANTS.STORAGE.CUSTOM_INTERVAL] || '';
            DOM.get(CONSTANTS.SELECTORS.CUSTOM_INTERVAL_UNIT).value = settings[CONSTANTS.STORAGE.CUSTOM_UNIT] || 'minutes';
        } else {
            const savedTime = settings[CONSTANTS.STORAGE.BACKUP_TIME] || '09:00';
            const [h, m] = savedTime.split(':');
            DOM.get(CONSTANTS.SELECTORS.HOUR_SELECT).value = h;
            DOM.get(CONSTANTS.SELECTORS.MINUTE_SELECT).value = m;
        }

        this.updateLastBackupTime(); // Initial load
    }
};

// --- Main ---

document.addEventListener('DOMContentLoaded', async () => {
    UI.init();

    const settings = await SettingsManager.load();
    await Localization.init(settings[CONSTANTS.STORAGE.SELECTED_LANGUAGE]);

    UI.restoreState(settings);

    BookmarkManager.init(settings[CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
    TabManager.init();
});
