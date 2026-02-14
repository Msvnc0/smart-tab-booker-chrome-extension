const CONSTANTS = {
    ALARM: {
        NAME: 'autoBackup',
        DEFAULT_TIME: '09:00'
    },
    STORAGE: {
        BACKUP_INTERVAL: 'backupInterval',
        BACKUP_ENABLED: 'backupEnabled',
        CUSTOM_INTERVAL: 'customInterval',
        CUSTOM_UNIT: 'customUnit',
        BACKUP_TIME: 'backupTime',
        BACKUP_FOLDER_ID: 'backupFolderId',
        LAST_BACKUP_TIME: 'lastBackupTime'
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
    }
};

console.log('Background service worker loaded');

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);

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
    if (alarm.name === CONSTANTS.ALARM.NAME) {
        console.log('Auto backup alarm triggered');
        performAutoBackup();
    }
}

function handleMessage(request, sender, sendResponse) {
    if (request.action === 'manualBackup') {
        performBackup(request.folderId, request.tabs)
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true; // Async response
    } else if (request.action === 'updateSchedule') {
        setupAlarm();
        sendResponse({ success: true });
    }
}

// --- Alarm Management ---

function setupAlarm() {
    chrome.alarms.clear(CONSTANTS.ALARM.NAME, (wasCleared) => {
        getBackupSettings((settings) => {
            if (!isBackupEnabled(settings)) {
                console.log('Auto backup is disabled.');
                return;
            }

            const alarmInfo = calculateAlarmInfo(settings);
            if (alarmInfo) {
                console.log(`Setting alarm:`, alarmInfo);
                chrome.alarms.create(CONSTANTS.ALARM.NAME, alarmInfo);
            }
        });
    });
}

function getBackupSettings(callback) {
    const keys = [
        CONSTANTS.STORAGE.BACKUP_ENABLED,
        CONSTANTS.STORAGE.BACKUP_INTERVAL,
        CONSTANTS.STORAGE.CUSTOM_INTERVAL,
        CONSTANTS.STORAGE.CUSTOM_UNIT,
        CONSTANTS.STORAGE.BACKUP_TIME
    ];
    chrome.storage.local.get(keys, callback);
}

function isBackupEnabled(settings) {
    const isEnabled = settings[CONSTANTS.STORAGE.BACKUP_ENABLED] !== false;
    const interval = settings[CONSTANTS.STORAGE.BACKUP_INTERVAL];
    return isEnabled && interval !== 'off';
}

function calculateAlarmInfo(settings) {
    const interval = settings[CONSTANTS.STORAGE.BACKUP_INTERVAL];

    if (interval === 'custom') {
        return calculateCustomAlarm(settings);
    } else {
        return calculateStandardAlarm(settings);
    }
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
    let periodInMinutes = CONSTANTS.INTERVALS.WEEKLY; // Default

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

    const tabs = explicitTabs || await chrome.tabs.query({});
    if (!tabs || tabs.length === 0) throw new Error('No open tabs to backup');

    const folderName = generateBackupFolderName();
    const backupFolder = await chrome.bookmarks.create({
        parentId: parentId,
        title: folderName
    });

    await saveTabsAsBookmarks(backupFolder.id, tabs);

    await updateLastBackupTime();
}

function generateBackupFolderName() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
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

async function updateLastBackupTime() {
    await chrome.storage.local.set({ [CONSTANTS.STORAGE.LAST_BACKUP_TIME]: Date.now() });
}
