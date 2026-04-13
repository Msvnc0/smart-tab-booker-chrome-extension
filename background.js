const CONSTANTS = {
    ALARM: {
        NAME: 'autoBackup',
        NAME_PREFIX: 'autoBackup_',
        DEFAULT_TIME: '09:00',
        REMINDER: 'backupReminder'
    },
    STORAGE: {
        BACKUP_INTERVAL: 'backupInterval',
        BACKUP_ENABLED: 'backupEnabled',
        CUSTOM_INTERVAL: 'customInterval',
        CUSTOM_UNIT: 'customUnit',
        BACKUP_TIME: 'backupTime',
        BACKUP_FOLDER_ID: 'backupFolderId',
        LAST_BACKUP_TIME: 'lastBackupTime',
        PRESERVE_TAB_GROUPS: 'preserveTabGroups',
        AUTO_CLEANUP_ENABLED: 'autoCleanupEnabled',
        AUTO_CLEANUP_DAYS: 'autoCleanupDays',
        BACKUP_TIMES: 'backupTimes',
        INCLUDE_DUPLICATES: 'includeDuplicates',
        ALL_WINDOWS: 'allWindows',
        TAB_THRESHOLD: 'tabThreshold',
        TAB_THRESHOLD_ENABLED: 'tabThresholdEnabled',
        REMINDER_ENABLED: 'reminderEnabled',
        REMINDER_DAYS: 'reminderDays',
        BACKUP_STATS: 'backupStats'
    },
    INTERVALS: {
        DAILY: 1440,
        WEEKLY: 10080,
        MONTHLY: 43200
    },
    UNITS: {
        HOURS: 'hours',
        DAYS: 'days',
        MINUTES: 'minutes'
    },
    MAX_BACKUP_TIMES: 5,
    // Timeouts
    BADGE_CLEAR_TIMEOUT: 2500,
    THRESHOLD_DEBOUNCE_MS: 5000,
    ONE_HOUR_MS: 3600000,
    // Limits
    MAX_TOP_DOMAINS: 10
};

console.log('Background service worker loaded');

let backupInProgress = false;

function isValidUrl(url) {
    if (!url) return false;
    if (url.startsWith('chrome://')) return false;
    if (url.startsWith('chrome-extension://')) return false;
    if (url.startsWith('about:')) return false;
    if (url.startsWith('file://')) return false;
    if (url.startsWith('javascript:')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(handleCommand);
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
chrome.tabs.onCreated.addListener(checkTabThreshold);

function handleInstalled() {
    console.log('Smart Tab Booker installed');
    chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_INTERVAL], (result) => {
        if (!result[CONSTANTS.STORAGE.BACKUP_INTERVAL]) {
            chrome.storage.local.set({ [CONSTANTS.STORAGE.BACKUP_INTERVAL]: 'weekly' });
        }
        setupAlarm();
    });
    chrome.contextMenus.create({
        id: 'backup-current-tab',
        title: chrome.i18n.getMessage('contextMenuBackupTab') || 'Backup this tab',
        contexts: ['page']
    });
    chrome.contextMenus.create({
        id: 'backup-all-tabs',
        title: chrome.i18n.getMessage('contextMenuBackupAll') || 'Backup all tabs',
        contexts: ['page']
    });
}

function handleAlarm(alarm) {
    if (alarm.name === CONSTANTS.ALARM.NAME || alarm.name.startsWith(CONSTANTS.ALARM.NAME_PREFIX)) {
        console.log('Auto backup alarm triggered:', alarm.name);
        performAutoBackup();
    } else if (alarm.name === CONSTANTS.ALARM.REMINDER) {
        checkBackupReminder();
    }
}

function handleMessage(request, sender, sendResponse) {
    if (request.action === 'manualBackup') {
        performBackup(request.folderId, request.tabs, request.note || '')
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'updateSchedule') {
        setupAlarm(() => sendResponse({ success: true }));
        return true;
    } else if (request.action === 'restoreBackup') {
        restoreFromBookmarks(request.backupId, request.options)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'restoreTabs') {
        restoreTabsList(request.tabs)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'exportBackup') {
        exportBackupAsFile(request.backupId, request.format)
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'importBackup') {
        importBackupFromFile(request.data, request.folderId)
            .then(count => sendResponse({ success: true, count }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'getStats') {
        chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_STATS], (result) => {
            sendResponse(result[CONSTANTS.STORAGE.BACKUP_STATS] || {});
        });
        return true;
    } else {
        sendResponse({ success: false, error: 'Unknown action' });
    }
}

function handleCommand(command) {
    if (command === 'quick-backup') {
        console.log('Quick backup shortcut triggered');
        performQuickBackup();
    }
}

function handleContextMenuClick(info, tab) {
    if (info.menuItemId === 'backup-current-tab') {
        backupSingleTab(tab);
    } else if (info.menuItemId === 'backup-all-tabs') {
        performQuickBackup();
    }
}

async function backupSingleTab(tab) {
    if (!tab || !tab.url || !isValidUrl(tab.url)) {
        showBadge('!', '#F44336');
        return;
    }
    const result = await chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
    const folderId = result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID];
    if (!folderId) {
        showBadge('!', '#F44336');
        return;
    }
    try {
        await performBackup(folderId, [{ title: tab.title, url: tab.url, pinned: tab.pinned, groupId: tab.groupId }]);
        showBadge('\u2713', '#4CAF50');
    } catch (err) {
        console.error('Single tab backup failed:', err);
        showBadge('!', '#F44336');
    }
}

// --- Pinned Tab Support ---

function formatBookmarkTitle(tab) {
    const title = tab.title || tab.url;
    if (tab.pinned) {
        return '[PIN] ' + title;
    }
    return title;
}

function parseBookmarkTitle(title) {
    if (!title || typeof title !== 'string') return { pinned: false, cleanTitle: '' };
    const pinned = title.startsWith('[PIN] ');
    const cleanTitle = pinned ? title.replace(/^\[PIN\] /, '') : title;
    return { pinned, cleanTitle };
}

// --- Tab Group Colors ---

function extractGroupColor(folderTitle) {
    const match = folderTitle.match(/^\[(\w+)\]/);
    return match ? match[1] : null;
}

function extractGroupCleanTitle(folderTitle) {
    return folderTitle.replace(/^\[\w+\]/, '');
}

// --- Quick Backup ---

async function performQuickBackup() {
    const result = await chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
    const folderId = result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID];

    if (!folderId) {
        showBadge('!', '#F44336');
        return;
    }

    try {
        await performBackup(folderId);
        showBadge('\u2713', '#4CAF50');
    } catch (err) {
        console.error('Quick backup failed:', err);
        showBadge('!', '#F44336');
    }
}

function showBadge(text, color) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), CONSTANTS.BADGE_CLEAR_TIMEOUT);
}

// --- Alarm Management ---

function setupAlarm(onComplete) {
    chrome.alarms.clearAll(() => {
        getBackupSettings((settings) => {
            if (!isBackupEnabled(settings)) {
                console.log('Auto backup is disabled.');
                chrome.alarms.create(CONSTANTS.ALARM.REMINDER, { periodInMinutes: 360 });
                if (onComplete) onComplete();
                return;
            }

            const alarmInfos = calculateAlarmInfos(settings);
            alarmInfos.forEach((alarmInfo, index) => {
                if (alarmInfo) {
                    const alarmName = alarmInfos.length > 1
                        ? `${CONSTANTS.ALARM.NAME_PREFIX}${index}`
                        : CONSTANTS.ALARM.NAME;
                    console.log(`Setting alarm [${alarmName}]:`, alarmInfo);
                    chrome.alarms.create(alarmName, alarmInfo);
                }
            });

            chrome.alarms.create(CONSTANTS.ALARM.REMINDER, { periodInMinutes: 360 });
            if (onComplete) onComplete();
        });
    });
}

function getBackupSettings(callback) {
    const keys = [
        CONSTANTS.STORAGE.BACKUP_ENABLED,
        CONSTANTS.STORAGE.BACKUP_INTERVAL,
        CONSTANTS.STORAGE.CUSTOM_INTERVAL,
        CONSTANTS.STORAGE.CUSTOM_UNIT,
        CONSTANTS.STORAGE.BACKUP_TIME,
        CONSTANTS.STORAGE.BACKUP_TIMES
    ];
    chrome.storage.local.get(keys, callback);
}

function isBackupEnabled(settings) {
    const isEnabled = settings[CONSTANTS.STORAGE.BACKUP_ENABLED] !== false;
    const interval = settings[CONSTANTS.STORAGE.BACKUP_INTERVAL];
    return isEnabled && interval !== 'off';
}

function calculateAlarmInfos(settings) {
    const interval = settings[CONSTANTS.STORAGE.BACKUP_INTERVAL];

    if (interval === 'custom') {
        return [calculateCustomAlarm(settings)];
    } else if (interval === 'daily') {
        return calculateDailyAlarms(settings);
    } else {
        return [calculateStandardAlarm(settings)];
    }
}

function calculateDailyAlarms(settings) {
    const backupTimes = settings[CONSTANTS.STORAGE.BACKUP_TIMES];

    if (backupTimes && Array.isArray(backupTimes) && backupTimes.length > 0) {
        return backupTimes.map(timeStr => {
            const nextFireTime = calculateNextFireTime(timeStr);
            return {
                when: nextFireTime,
                periodInMinutes: CONSTANTS.INTERVALS.DAILY
            };
        });
    }

    return [calculateStandardAlarm(settings)];
}

function calculateCustomAlarm(settings) {
    let multiplier = 1;
    switch (settings[CONSTANTS.STORAGE.CUSTOM_UNIT]) {
        case CONSTANTS.UNITS.HOURS: multiplier = 60; break;
        case CONSTANTS.UNITS.DAYS: multiplier = 1440; break;
        default: multiplier = 1;
    }

    const periodInMinutes = (parseInt(settings[CONSTANTS.STORAGE.CUSTOM_INTERVAL]) || 60) * multiplier;
    return periodInMinutes > 0 ? { periodInMinutes } : null;
}

function calculateStandardAlarm(settings) {
    let periodInMinutes = CONSTANTS.INTERVALS.WEEKLY;

    switch (settings[CONSTANTS.STORAGE.BACKUP_INTERVAL]) {
        case 'daily': periodInMinutes = CONSTANTS.INTERVALS.DAILY; break;
        case 'weekly': periodInMinutes = CONSTANTS.INTERVALS.WEEKLY; break;
        case 'monthly': periodInMinutes = CONSTANTS.INTERVALS.MONTHLY; break;
    }

    const nextFireTime = calculateNextFireTime(settings[CONSTANTS.STORAGE.BACKUP_TIME]);

    return {
        when: nextFireTime,
        periodInMinutes: periodInMinutes
    };
}

function calculateNextFireTime(targetTimeStr = CONSTANTS.ALARM.DEFAULT_TIME) {
    if (!targetTimeStr || typeof targetTimeStr !== 'string' || !targetTimeStr.includes(':')) {
        targetTimeStr = CONSTANTS.ALARM.DEFAULT_TIME;
    }
    const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);
    const now = new Date();
    const nextFire = new Date();

    nextFire.setHours(targetHour, targetMinute, 0, 0);

    if (nextFire <= now) {
        nextFire.setDate(nextFire.getDate() + 1);
    }

    return nextFire.getTime();
}

// --- Backup Operations ---

function performAutoBackup() {
    if (backupInProgress) {
        console.log('Auto backup skipped: backup already in progress');
        return;
    }
    chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID], (result) => {
        const folderId = result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID];
        if (folderId) {
            performBackup(folderId)
                .then(() => console.log('Auto backup success'))
                .catch(err => console.error('Auto backup failed', err));
        } else {
            console.warn('No backup folder selected for auto backup.');
        }
    });
}

async function performBackup(parentId, explicitTabs, note = '') {
    if (!parentId) throw new Error('No folder selected');
    if (backupInProgress) {
        throw new Error('Backup already in progress');
    }
    backupInProgress = true;

    try {
        const settings = await chrome.storage.local.get([
            CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS,
            CONSTANTS.STORAGE.INCLUDE_DUPLICATES,
            CONSTANTS.STORAGE.ALL_WINDOWS
        ]);

        let tabs;

        if (explicitTabs) {
            tabs = explicitTabs.filter(t => isValidUrl(t.url));
        } else {
            const queryOpts = settings[CONSTANTS.STORAGE.ALL_WINDOWS] ? {} : { currentWindow: true };
            tabs = await chrome.tabs.query(queryOpts);
            tabs = tabs.filter(tab => isValidUrl(tab.url));
        }

        if (!tabs || tabs.length === 0) throw new Error('No open tabs to backup');

        if (!settings[CONSTANTS.STORAGE.INCLUDE_DUPLICATES]) {
            tabs = filterDuplicateTabs(tabs);
        }

        const folderName = generateBackupFolderName(note);
        const backupFolder = await chrome.bookmarks.create({
            parentId: parentId,
            title: folderName
        });

        try {
            if (settings[CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]) {
                await saveTabsWithGroups(backupFolder.id, tabs);
            } else {
                await saveTabsAsBookmarks(backupFolder.id, tabs);
            }
        } catch (saveErr) {
            try {
                await chrome.bookmarks.removeTree(backupFolder.id);
            } catch (err) {
                console.error('Failed to remove backup folder after error:', err);
            }
            throw saveErr;
        }

        await updateLastBackupTime();
        await cleanupOldBackups(parentId);
        await updateBackupStats(parentId);
    } finally {
        backupInProgress = false;
    }
}

function filterDuplicateTabs(tabs) {
    const seenUrls = new Set();
    return tabs.filter(tab => {
        if (!seenUrls.has(tab.url)) {
            seenUrls.add(tab.url);
            return true;
        }
        return false;
    });
}

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

async function saveTabsAsBookmarks(parentId, tabs) {
    const bookmarkPromises = tabs
        .map(tab => chrome.bookmarks.create({
            parentId: parentId,
            title: formatBookmarkTitle(tab),
            url: tab.url
        }));

    const results = await Promise.allSettled(bookmarkPromises);
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
        console.warn(`Failed to save ${failed.length} bookmarks`);
    }
}

async function saveTabsWithGroups(parentId, tabs) {
    const groups = await chrome.tabGroups.query({});
    const tabGroupMap = new Map();

    groups.forEach(group => {
        tabGroupMap.set(group.id, { title: group.title || 'Unnamed Group', color: group.color });
    });

    const groupedTabs = new Map();
    const ungroupedTabs = [];

    tabs.forEach(tab => {
        if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
            const groupInfo = tabGroupMap.get(tab.groupId) || { title: 'Unnamed Group', color: 'grey' };
            const groupKey = groupInfo.title;
            if (!groupedTabs.has(groupKey)) {
                groupedTabs.set(groupKey, { tabs: [], color: groupInfo.color });
            }
            groupedTabs.get(groupKey).tabs.push(tab);
        } else {
            ungroupedTabs.push(tab);
        }
    });

    for (const [groupTitle, groupData] of groupedTabs) {
        const folderTitle = `[${groupData.color}]${groupTitle}`;
        const groupFolder = await chrome.bookmarks.create({
            parentId: parentId,
            title: folderTitle
        });
        await saveTabsAsBookmarks(groupFolder.id, groupData.tabs);
    }

    if (ungroupedTabs.length > 0) {
        await saveTabsAsBookmarks(parentId, ungroupedTabs);
    }
}

// --- Auto Cleanup ---

async function cleanupOldBackups(parentId) {
    const settings = await chrome.storage.local.get([
        CONSTANTS.STORAGE.AUTO_CLEANUP_ENABLED,
        CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS
    ]);

    if (!settings[CONSTANTS.STORAGE.AUTO_CLEANUP_ENABLED]) {
        return;
    }

    const cleanupDays = settings[CONSTANTS.STORAGE.AUTO_CLEANUP_DAYS] || 30;
    const cutoffDate = new Date(Date.now() - cleanupDays * 24 * 60 * 60 * 1000);

    const children = await chrome.bookmarks.getChildren(parentId);

    for (const child of children) {
        if (child.title && child.title.startsWith('Backup_')) {
            const folderDate = extractDateFromFolderName(child.title);
            if (folderDate && folderDate < cutoffDate) {
                await chrome.bookmarks.removeTree(child.id);
                console.log(`Cleaned up old backup: ${child.title}`);
            }
        }
    }
}

function extractDateFromFolderName(folderName) {
    const match = folderName.match(/Backup_(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        return Date.UTC(year, month, day);
    }
    return null;
}

async function updateLastBackupTime() {
    await chrome.storage.local.set({ [CONSTANTS.STORAGE.LAST_BACKUP_TIME]: Date.now() });
}

// --- Restore Operations ---

async function restoreFromBookmarks(folderId, options = {}) {
    const { preserveTabGroups = true } = options;
    let window = null;

    try {
        const children = await chrome.bookmarks.getChildren(folderId);
        if (children.length === 0) {
            return { success: false, error: 'noBookmarks' };
        }

        const validBookmarks = children.filter(b => b.url && isValidUrl(b.url));
        const folders = children.filter(b => !b.url);

        let totalBookmarks = validBookmarks.length;
        for (const folder of folders) {
            const subChildren = await chrome.bookmarks.getChildren(folder.id);
            totalBookmarks += subChildren.filter(b => b.url && isValidUrl(b.url)).length;
        }

        if (totalBookmarks === 0) {
            return { success: false, error: 'noBookmarks' };
        }

        window = await chrome.windows.create({ focused: true });
        let groupsCreated = 0;
        let tabsOpened = 0;

        if (preserveTabGroups) {
            const result = await restoreTabsWithGroups(window.id, children);
            groupsCreated = result.groupsCreated;
            tabsOpened = result.tabsOpened;
        } else {
            const allBookmarks = [...validBookmarks];
            for (const folder of folders) {
                const subChildren = await chrome.bookmarks.getChildren(folder.id);
                allBookmarks.push(...subChildren.filter(b => b.url && isValidUrl(b.url)));
            }
            tabsOpened = await restoreTabsFlat(window.id, allBookmarks);
        }

        const tabs = await chrome.tabs.query({ windowId: window.id });
        const newTab = tabs.find(t => t.url === 'chrome://newtab/');
        if (newTab) {
            await chrome.tabs.remove(newTab.id);
        }

        return { success: true, tabsOpened, groupsCreated };
    } catch (err) {
        console.error('Restore failed:', err);
        if (window) {
            try { await chrome.windows.remove(window.id); } catch (err) { console.error('Failed to remove window:', err); }
        }
        return { success: false, error: err.message };
    }
}

async function restoreTabsFlat(windowId, bookmarks) {
    let opened = 0;
    for (const bm of bookmarks) {
        try {
            const parsed = parseBookmarkTitle(bm.title);
            await chrome.tabs.create({ windowId, url: bm.url, pinned: parsed.pinned });
            opened++;
        } catch (err) {
            console.warn('Failed to create tab:', bm.url, e);
        }
    }
    return opened;
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
                    const parsed = parseBookmarkTitle(bm.title);
                    const tab = await chrome.tabs.create({ windowId, url: bm.url, pinned: parsed.pinned });
                    tabIds.push(tab.id);
                    tabsOpened++;
                } catch (err) {
                    console.warn('Failed to create tab:', bm.url, e);
                }
            }

            if (tabIds.length > 0) {
                try {
                    const groupId = await chrome.tabs.group({ tabIds });
                    const color = extractGroupColor(folder.title);
                    const cleanTitle = extractGroupCleanTitle(folder.title);
                    const updateOpts = { title: cleanTitle };
                    if (color) {
                        updateOpts.color = color;
                    }
                    await chrome.tabGroups.update(groupId, updateOpts);
                    groupsCreated++;
                } catch (err) {
                    console.warn('Failed to create tab group:', e);
                }
            }
        } catch (err) {
            console.warn('Failed to process folder:', folder.title, e);
        }
    }

    if (singleBookmarks.length > 0) {
        tabsOpened += await restoreTabsFlat(windowId, singleBookmarks);
    }

    return { groupsCreated, tabsOpened };
}

// --- Smart Triggers ---

let thresholdDebounce = null;

async function checkTabThreshold() {
    if (thresholdDebounce) return;
    thresholdDebounce = setTimeout(() => { thresholdDebounce = null; }, CONSTANTS.THRESHOLD_DEBOUNCE_MS);

    const settings = await chrome.storage.local.get([
        CONSTANTS.STORAGE.TAB_THRESHOLD_ENABLED,
        CONSTANTS.STORAGE.TAB_THRESHOLD,
        CONSTANTS.STORAGE.BACKUP_FOLDER_ID,
        CONSTANTS.STORAGE.LAST_BACKUP_TIME
    ]);

    if (!settings[CONSTANTS.STORAGE.TAB_THRESHOLD_ENABLED]) return;

    const threshold = settings[CONSTANTS.STORAGE.TAB_THRESHOLD] || 50;
    const allTabs = await chrome.tabs.query({});
    const validTabs = allTabs.filter(t => isValidUrl(t.url));

    if (validTabs.length >= threshold) {
        const lastBackup = settings[CONSTANTS.STORAGE.LAST_BACKUP_TIME] || 0;
        const oneHourAgo = Date.now() - CONSTANTS.ONE_HOUR_MS;
        if (lastBackup < oneHourAgo) {
            const folderId = settings[CONSTANTS.STORAGE.BACKUP_FOLDER_ID];
            if (folderId) {
                try {
                    await performBackup(folderId, null, 'Tab Threshold');
                    console.log('Tab threshold auto backup performed');
                } catch (err) {
                    console.error('Tab threshold backup failed:', err);
                }
            }
        }
    }
}

async function checkBackupReminder() {
    const settings = await chrome.storage.local.get([
        CONSTANTS.STORAGE.REMINDER_ENABLED,
        CONSTANTS.STORAGE.REMINDER_DAYS,
        CONSTANTS.STORAGE.LAST_BACKUP_TIME
    ]);

    if (!settings[CONSTANTS.STORAGE.REMINDER_ENABLED]) return;

    const reminderDays = settings[CONSTANTS.STORAGE.REMINDER_DAYS] || 7;
    const lastBackup = settings[CONSTANTS.STORAGE.LAST_BACKUP_TIME] || 0;
    const cutoff = Date.now() - (reminderDays * 24 * 60 * 60 * 1000);

    if (lastBackup < cutoff) {
        showBadge('!', '#FF9800');
    }
}

// --- Restore Tabs List ---

async function restoreTabsList(tabs) {
    if (!tabs || tabs.length === 0) {
        return { success: false, error: 'No tabs to restore' };
    }

    let window = null;
    try {
        window = await chrome.windows.create({ focused: true });
        let tabsOpened = 0;

        for (const tab of tabs) {
            if (!isValidUrl(tab.url)) continue;
            try {
                await chrome.tabs.create({ windowId: window.id, url: tab.url, pinned: tab.pinned || false });
                tabsOpened++;
            } catch (err) {
                console.warn('Failed to restore tab:', tab.url, e);
            }
        }

        const allTabs = await chrome.tabs.query({ windowId: window.id });
        const newTab = allTabs.find(t => t.url === 'chrome://newtab/');
        if (newTab) {
            await chrome.tabs.remove(newTab.id);
        }

        return { success: true, tabsOpened };
    } catch (err) {
        if (window) {
            try { await chrome.windows.remove(window.id); } catch (err) { console.error('Failed to remove window:', err); }
        }
        return { success: false, error: err.message };
    }
}

// --- Export Backup ---

async function exportBackupAsFile(backupId, format) {
    const node = await chrome.bookmarks.get(backupId);
    const bookmarkNode = node[0];
    if (!bookmarkNode) throw new Error('Backup not found');

    const urls = await collectBookmarkUrls(bookmarkNode);

    if (format === 'csv') {
        let csv = 'Title,URL,Pinned,Group\n';
        for (const item of urls) {
            const title = (item.title || '').replace(/"/g, '""');
            const group = (item.group || '').replace(/"/g, '""');
            csv += `"${title}","${item.url}","${item.pinned || false}","${group}"\n`;
        }
        return csv;
    }

    return JSON.stringify(urls, null, 2);
}

async function collectBookmarkUrls(node, group = '') {
    const results = [];

    if (node.url) {
        if (isValidUrl(node.url)) {
            const parsed = parseBookmarkTitle(node.title || '');
            results.push({
                title: parsed.cleanTitle,
                url: node.url,
                pinned: parsed.pinned,
                group: group
            });
        }
        return results;
    }

    const children = await chrome.bookmarks.getChildren(node.id);
    if (!children) return results;
    for (const child of children) {
        const childGroup = !child.url ? extractGroupCleanTitle(child.title || '') : group;
        const nested = await collectBookmarkUrls(child, childGroup || group);
        results.push(...nested);
    }

    return results;
}

// --- Import Backup ---

async function importBackupFromFile(jsonData, folderId) {
    let data;
    try {
        data = JSON.parse(jsonData);
    } catch (err) {
        throw new Error('Invalid JSON data');
    }

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No valid tab data found');
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const importFolder = await chrome.bookmarks.create({
        parentId: folderId,
        title: `Backup_${dateStr}_${timeStr} (Imported)`
    });

    const grouped = new Map();
    const ungrouped = [];

    for (const item of data) {
        if (!item.url || !isValidUrl(item.url)) continue;

        if (item.group) {
            if (!grouped.has(item.group)) {
                grouped.set(item.group, []);
            }
            grouped.get(item.group).push(item);
        } else {
            ungrouped.push(item);
        }
    }

    if (grouped.size === 0 && ungrouped.length === 0) {
        try {
            await chrome.bookmarks.removeTree(importFolder.id);
        } catch (err) {
            console.error('Failed to remove import folder:', err);
        }
        throw new Error('No valid URLs found in import data');
    }

    let count = 0;

    for (const [groupTitle, items] of grouped) {
        const groupFolder = await chrome.bookmarks.create({
            parentId: importFolder.id,
            title: groupTitle
        });
        for (const item of items) {
            const title = item.pinned ? `[PIN] ${item.title || item.url}` : (item.title || item.url);
            await chrome.bookmarks.create({
                parentId: groupFolder.id,
                title: title,
                url: item.url
            });
            count++;
        }
    }

    for (const item of ungrouped) {
        const title = item.pinned ? `[PIN] ${item.title || item.url}` : (item.title || item.url);
        await chrome.bookmarks.create({
            parentId: importFolder.id,
            title: title,
            url: item.url
        });
        count++;
    }

    return count;
}

// --- Backup Stats ---

async function updateBackupStats(parentId) {
    try {
        const children = await chrome.bookmarks.getChildren(parentId);
        const backupFolders = children.filter(c => c.title && c.title.startsWith('Backup_'));

        let totalTabs = 0;
        const domainMap = {};

        for (const folder of backupFolders) {
            const urls = await collectBookmarkUrls(folder);
            totalTabs += urls.length;

            for (const item of urls) {
                try {
                    const hostname = new URL(item.url).hostname;
                    domainMap[hostname] = (domainMap[hostname] || 0) + 1;
                } catch (err) {
                    console.warn('Failed to parse URL hostname:', err);
                }
            }
        }

        const topDomains = Object.entries(domainMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONSTANTS.MAX_TOP_DOMAINS)
            .map(([domain, count]) => ({ domain, count }));

        const stats = {
            totalBackups: backupFolders.length,
            totalTabs,
            topDomains,
            updatedAt: Date.now()
        };

        await chrome.storage.local.set({ [CONSTANTS.STORAGE.BACKUP_STATS]: stats });
    } catch (err) {
        console.error('Failed to update backup stats:', err);
    }
}
