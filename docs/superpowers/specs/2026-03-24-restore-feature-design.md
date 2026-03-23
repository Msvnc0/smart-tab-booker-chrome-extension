# Geri Yükleme (Restore) Özelliği - Design Spec

**Tarih:** 2026-03-24
**Durum:** Draft
**Öncelik:** High

## Özet

Smart Tab Booker eklentisine, yedeklenmiş sekmeleri geri yükleme yeteneği eklenir. Kullanıcılar yer imlerinde saklanan yedeklerden sekmeleri tekrar açabilir.

## Hedefler

- Yedeklenmiş sekmeleri tek tıkla geri yükleme
- Tab groups desteği ile geri yükleme
- Seçili sekmeleri açma opsiyonu
- Yeni pencerede açma

## Kapsam Dışı

- Cloud sync / export-import (sonraki özellik)
- Otomatik geri yükleme
- Sekme geçmişi / scroll pozisyonu geri yükleme

## UI Tasarımı

### Popup Sekme Yapısı

Popup üst kısmında iki sekme:

```
┌─────────────────────────────────────┐
│  [Yedekle]  [Geri Yükle]            │
├─────────────────────────────────────┤
│  ... içerik ...                     │
└─────────────────────────────────────┘
```

### Geri Yükleme Sekmesi İçeriği

```
┌─────────────────────────────────────┐
│ Yedek Klasörü: [Dropdown ▼]         │
│               (kaydedilmiş ayar)    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ☐ Backup_2026-03-24_09-30       │ │
│ │    12 sekme                     │ │
│ │ ☐ Backup_2026-03-23_18-45       │ │
│ │    8 sekme                      │ │
│ │ ☐ Backup_2026-03-22_14-00       │ │
│ │    15 sekme                     │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Tümünü Aç]  [Seçilileri Aç]       │
└─────────────────────────────────────┘
```

**Dropdown açıklaması:** Mevcut yedekleme için seçilen klasör (`backupFolderId`) otomatik olarak seçilir. Kullanıcı farklı bir klasör seçebilir.

### Etkileşim Akışı

1. Kullanıcı "Geri Yükle" sekmesine tıklar
2. Dropdown'dan yedek klasörünü seçer (varsayılan: kaydedilmiş klasör)
3. Listedeki yedekler görünür
4. Kullanıcı:
   - **Tümünü Aç**: Seçili satırdaki yedekteki tüm sekmeleri yeni pencerede açar
   - **Seçilileri Aç**: Checkbox ile seçilen yedekleri açar
     - Her yedek için **ayrı pencere** açılır
     - Birden fazla yedek seçilirse, her biri kendi penceresinde açılır

## Teknik Tasarım

### Yeni CONSTANTS Tanımları (popup.js)

```javascript
SELECTORS: {
    // ... mevcut ...
    RESTORE_TAB: 'restoreTab',
    RESTORE_FOLDER_SELECT: 'restoreFolderSelect',
    RESTORE_LIST: 'restoreList',
    RESTORE_ALL_BTN: 'restoreAllBtn',
    RESTORE_SELECTED_BTN: 'restoreSelectedBtn'
},

STORAGE: {
    // ... mevcut ...
    // Yeni anahtar gerekmiyor, mevcut backupFolderId kullanılır
}
```

### Yeni Modül: RestoreManager (popup.js)

```javascript
const RestoreManager = {
    selectedBackups: [],
    
    init(savedFolderId) {
        this.loadBackupFolders(savedFolderId);
        this.setupEventListeners();
    },
    
    loadBackupFolders(savedFolderId) {
        chrome.bookmarks.getTree((nodes) => {
            // Dropdown'ı doldur, savedFolderId'yi selected yap
        });
    },
    
    loadBackups(folderId) {
        chrome.bookmarks.getChildren(folderId, (children) => {
            // Backup_... ile başlayan klasörleri listele
            // Her biri için sekme sayısını hesapla
        });
    },
    
    restoreAll(backupId) {
        chrome.runtime.sendMessage({
            action: 'restoreBackup',
            backupId: backupId,
            options: { newWindow: true, preserveTabGroups: true }
        }, this.handleResponse.bind(this));
    },
    
    restoreSelected(backupIds) {
        // Her backupId için ayrı restoreBackup mesajı gönder
        // Her biri yeni pencerede açılır
    },
    
    handleResponse(response) {
        if (response.success) {
            UI.showStatus(Localization.get("restoreSuccess")
                .replace('$count$', response.tabsOpened), 'success');
        } else {
            UI.showStatus(Localization.get("restoreFailed"), 'error');
        }
    }
};
```

### Background Service Worker (background.js)

```javascript
async function restoreFromBookmarks(folderId, options = {}) {
    const { newWindow = true, preserveTabGroups = true } = options;
    
    const children = await chrome.bookmarks.getChildren(folderId);
    if (children.length === 0) {
        return { success: false, error: 'noBookmarks' };
    }
    
    const tabsToOpen = children
        .filter(b => b.url && isValidUrl(b.url))
        .map(b => ({ url: b.url, title: b.title }));
    
    if (tabsToOpen.length === 0) {
        return { success: false, error: 'noValidUrls' };
    }
    
    const window = await chrome.windows.create({ focused: true });
    let groupsCreated = 0;
    
    if (preserveTabGroups) {
        groupsCreated = await restoreTabsWithGroups(window.id, children);
    } else {
        await restoreTabsFlat(window.id, tabsToOpen);
    }
    
    return { success: true, tabsOpened: tabsToOpen.length, groupsCreated };
}

function isValidUrl(url) {
    if (!url) return false;
    if (url.startsWith('chrome://')) return false;
    if (url.startsWith('chrome-extension://')) return false;
    if (url.startsWith('about:')) return false;
    if (url.startsWith('file://')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

async function restoreTabsFlat(windowId, tabs) {
    for (const tab of tabs) {
        await chrome.tabs.create({ windowId, url: tab.url });
    }
    chrome.tabs.remove((await chrome.tabs.query({ windowId }))[0].id);
}

async function restoreTabsWithGroups(windowId, bookmarks) {
    const folders = bookmarks.filter(b => !b.url);
    const singleBookmarks = bookmarks.filter(b => b.url && isValidUrl(b.url));
    
    let groupsCreated = 0;
    
    for (const folder of folders) {
        const folderBookmarks = await chrome.bookmarks.getChildren(folder.id);
        const validTabs = folderBookmarks.filter(b => b.url && isValidUrl(b.url));
        
        if (validTabs.length === 0) continue;
        
        const tabIds = [];
        for (const bm of validTabs) {
            const tab = await chrome.tabs.create({ windowId, url: bm.url });
            tabIds.push(tab.id);
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
    }
    
    if (singleBookmarks.length > 0) {
        await restoreTabsFlat(windowId, singleBookmarks);
    }
    
    const tabs = await chrome.tabs.query({ windowId });
    if (tabs.length > 0 && tabs[0].url === 'chrome://newtab/') {
        chrome.tabs.remove(tabs[0].id);
    }
    
    return groupsCreated;
}
```

### Mesajlaşma

```javascript
// popup -> background
{
    action: 'restoreBackup',
    backupId: '12345',
    options: {
        newWindow: true,
        preserveTabGroups: true
    }
}

// background -> popup (response)
{
    success: true,
    tabsOpened: 12,
    groupsCreated: 3
}
```

### handleMessage Güncellemesi (background.js)

```javascript
function handleMessage(request, sender, sendResponse) {
    if (request.action === 'manualBackup') {
        // ... mevcut ...
    } else if (request.action === 'updateSchedule') {
        // ... mevcut ...
    } else if (request.action === 'restoreBackup') {
        restoreFromBookmarks(request.backupId, request.options)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
}
```

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|------------|
| `popup.html` | Sekme yapısı, geri yükleme UI |
| `popup.css` | Sekme stilleri, liste stilleri, dark mode desteği |
| `popup.js` | RestoreManager modülü, CONSTANTS güncellemesi, sekme geçişi |
| `background.js` | restoreFromBookmarks, restoreTabsWithGroups, handleMessage |
| `_locales/*/messages.json` | Yeni çeviri anahtarları (18 dil) |

## Yeni Çeviri Anahtarları

```
restoreTab          = Geri Yükle
selectBackupFolder  = Yedek Klasörü Seç
restoreAll          = Tümünü Aç
restoreSelected     = Seçilileri Aç
noBackupsFound      = Yedek bulunamadı
restoreSuccess      = $count$ sekme açıldı
restoreFailed       = Geri yükleme başarısız
tabsCount           = sekme
manyTabsWarning     = $count$ sekme açılacak. Devam edilsin mi?
folderDeleted       = Seçili klasör silinmiş
```

## Hata Durumları

| Durum | Davranış |
|-------|----------|
| Klasör seçili değil | Dropdown'da placeholder, butonlar disabled |
| Klasör silinmiş | "Seçili klasör silinmiş" hata mesajı, dropdown sıfırla |
| Yedek yok | "Bu klasörde yedek bulunamadı" mesajı |
| Geçersiz URL'ler | chrome://, about:, file:// URL'ler atlanır |
| Bookmark erişim hatası | Hata mesajı göster |
| Çok fazla sekme (50+) | Onay dialog'u: "X sekme açılacak. Devam?" |
| Tab group oluşturma hatası | Grup olmadan devam et, konsola log |

## Dark Mode Desteği

Mevcut `.dark-mode` sınıfı kullanılır:

```css
.tab-button { }
.tab-button.active { }
.dark-mode .tab-button { }
.dark-mode .tab-button.active { }

.restore-list { }
.dark-mode .restore-list { }

.restore-item:hover { }
.dark-mode .restore-item:hover { }
```

## Test Senaryoları

1. Basit yedek geri yükleme (tek klasör, grup yok)
2. Tab groups ile geri yükleme
3. Birden fazla yedek seçerek açma (ayrı pencereler)
4. Boş klasör durumu
5. Silinmiş klasör durumu
6. Büyük yedek (50+ sekme) - onay dialog
7. Geçersiz URL'ler içeren yedek
8. Dark mode görsel test
9. i18n - farklı dillerde test

## Implementasyon Sırası

1. CONSTANTS güncellemesi
2. UI iskeleti (sekmeler, dropdown, liste) + dark mode
3. Backend fonksiyonları (restoreFromBookmarks, isValidUrl)
4. Tab groups geri yükleme
5. Checkbox/seçim mantığı
6. Hata yönetimi (silinmiş klasör, geçersiz URL, 50+ uyarı)
7. Çeviriler (18 dil)
8. Test

## Riskler ve Önlemler

| Risk | Önlem |
|------|-------|
| Çok fazla sekme açma | 50+ için onay dialog'u |
| Tab group API hatası | Try-catch, fallback |
| Silinmiş klasör | getTree kontrolü, hata mesajı |
| Geçersiz URL'ler | isValidUrl filtresi |
| Dark mode tutarsızlığı | Mevcut CSS değişkenlerini kullan |

## Başarı Kriterleri

- [ ] Kullanıcı yedekleri görüntüleyebilir
- [ ] Tek tıkla tüm sekmeler açılır
- [ ] Tab groups doğru şekilde oluşturulur
- [ ] Seçili yedekler ayrı pencerelerde açılır
- [ ] Silinmiş klasör durumu yönetilir
- [ ] Geçersiz URL'ler atlanır
- [ ] 50+ sekme için uyarı gösterilir
- [ ] Hata durumları doğru yönetilir
- [ ] Dark mode çalışır
- [ ] 18 dil desteği çalışır