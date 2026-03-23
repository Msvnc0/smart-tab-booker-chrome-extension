const CONSTANTS = {
    ALARM: {
        NAME: 'autoBackup',
        NAME_PREFIX: 'autoBackup_',
        DEFAULT_TIME: '09:00'
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
        INCLUDE_DUPLICATES: 'includeDuplicates'
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
    MAX_BACKUP_TIMES: 5
};

console.log('Background service worker loaded');

function isValidUrl(url) {
    if (!url) return false;
    if (url.startsWith('chrome://')) return false;
    if (url.startsWith('chrome-extension://')) return false;
    if (url.startsWith('about:')) return false;
    if (url.startsWith('file://')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(handleCommand);

function handleInstalled() {
    console.log('Smart Tab Booker installed');
    chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_INTERVAL], (result) => {
        if (!result[CONSTANTS.STORAGE.BACKUP_INTERVAL]) {
            chrome.storage.local.set({ [CONSTANTS.STORAGE.BACKUP_INTERVAL]: 'weekly' });
        }
        setupAlarm();
    });
}

function handleAlarm(alarm) {
    if (alarm.name === CONSTANTS.ALARM.NAME || alarm.name.startsWith(CONSTANTS.ALARM.NAME_PREFIX)) {
        console.log('Auto backup alarm triggered:', alarm.name);
        performAutoBackup();
    }
}

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

function handleCommand(command) {
    if (command === 'quick-backup') {
        console.log('Quick backup shortcut triggered');
        performQuickBackup();
    }
}

// --- Quick Backup ---

async function performQuickBackup() {
    const result = await chrome.storage.local.get([CONSTANTS.STORAGE.BACKUP_FOLDER_ID]);
    const folderId = result[CONSTANTS.STORAGE.BACKUP_FOLDER_ID];
    
    if (!folderId) {
        console.warn('No backup folder selected for quick backup.');
        return;
    }
    
    try {
        await performBackup(folderId);
        console.log('Quick backup completed successfully');
    } catch (err) {
        console.error('Quick backup failed:', err);
    }
}

// --- Alarm Management ---

function setupAlarm() {
    chrome.alarms.clearAll(() => {
        getBackupSettings((settings) => {
            if (!isBackupEnabled(settings)) {
                console.log('Auto backup is disabled.');
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
    const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);
    const now = new Date();
    const nextFire = new Date(now);

    nextFire.setHours(targetHour, targetMinute, 0, 0);

    if (nextFire <= now) {
        nextFire.setDate(nextFire.getDate() + 1);
    }

    return nextFire.getTime();
}

// --- Backup Operations ---

function performAutoBackup() {
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

async function performBackup(parentId, explicitTabs) {
    if (!parentId) throw new Error('No folder selected');

    const settings = await chrome.storage.local.get([
        CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS,
        CONSTANTS.STORAGE.INCLUDE_DUPLICATES
    ]);

    let tabs;
    
    if (explicitTabs && settings[CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]) {
        const selectedUrls = new Set(explicitTabs.map(t => t.url));
        tabs = await chrome.tabs.query({});
        tabs = tabs.filter(tab => selectedUrls.has(tab.url));
    } else {
        tabs = explicitTabs || await chrome.tabs.query({});
    }
    
    if (!tabs || tabs.length === 0) throw new Error('No open tabs to backup');

    if (!settings[CONSTANTS.STORAGE.INCLUDE_DUPLICATES]) {
        tabs = filterDuplicateTabs(tabs);
    }

    const folderName = generateBackupFolderName();
    const backupFolder = await chrome.bookmarks.create({
        parentId: parentId,
        title: folderName
    });

    if (settings[CONSTANTS.STORAGE.PRESERVE_TAB_GROUPS]) {
        await saveTabsWithGroups(backupFolder.id, tabs);
    } else {
        await saveTabsAsBookmarks(backupFolder.id, tabs);
    }

    await updateLastBackupTime();
    await cleanupOldBackups(parentId);
}

function filterDuplicateTabs(tabs) {
    const seenUrls = new Set();
    const filtered = [];

    for (const tab of tabs) {
        if (tab.url && tab.url.startsWith('http')) {
            if (!seenUrls.has(tab.url)) {
                seenUrls.add(tab.url);
                filtered.push(tab);
            }
        } else {
            filtered.push(tab);
        }
    }

    console.log(`Filtered ${tabs.length - filtered.length} duplicate tabs`);
    return filtered;
}

function generateBackupFolderName() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    return `Backup_${dateStr}_${timeStr}`;
}

async function saveTabsAsBookmarks(parentId, tabs) {
    const bookmarkPromises = tabs
        .filter(tab => tab.url && tab.url.startsWith('http'))
        .map(tab => chrome.bookmarks.create({
            parentId: parentId,
            title: tab.title || tab.url,
            url: tab.url
        }));

    await Promise.all(bookmarkPromises);
}

async function saveTabsWithGroups(parentId, tabs) {
    const groups = await chrome.tabGroups.query({});
    const tabGroupMap = new Map();
    
    groups.forEach(group => {
        tabGroupMap.set(group.id, group.title || 'Unnamed Group');
    });

    const groupedTabs = new Map();
    const ungroupedTabs = [];

    tabs.forEach(tab => {
        if (tab.url && tab.url.startsWith('http')) {
            if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
                const groupTitle = tabGroupMap.get(tab.groupId) || 'Unnamed Group';
                if (!groupedTabs.has(groupTitle)) {
                    groupedTabs.set(groupTitle, []);
                }
                groupedTabs.get(groupTitle).push(tab);
            } else {
                ungroupedTabs.push(tab);
            }
        }
    });

    for (const [groupTitle, groupTabs] of groupedTabs) {
        const groupFolder = await chrome.bookmarks.create({
            parentId: parentId,
            title: groupTitle
        });
        await saveTabsAsBookmarks(groupFolder.id, groupTabs);
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

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
    const match = folderName.match(/Backup_(\d{4}-\d{2}-\d{2})/);
    if (match) {
        return new Date(match[1]);
    }
    return null;
}

async function updateLastBackupTime() {
    await chrome.storage.local.set({ [CONSTANTS.STORAGE.LAST_BACKUP_TIME]: Date.now() });
}

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