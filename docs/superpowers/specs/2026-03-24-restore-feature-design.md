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
│ Klasör Seç: [Dropdown ▼]            │
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

### Etkileşim Akışı

1. Kullanıcı "Geri Yükle" sekmesine tıklar
2. Dropdown'dan yedek klasörünü seçer
3. Listedeki yedekler görünür
4. Kullanıcı:
   - **Tümünü Aç**: Seçili yedekteki tüm sekmeleri yeni pencerede açar
   - **Seçilileri Aç**: Checkbox ile seçilen yedekleri açar (birden fazla yedek birleştirilebilir)

## Teknik Tasarım

### Yeni Modül: RestoreManager (popup.js)

```javascript
const RestoreManager = {
    init() { ... },
    loadBackupFolders() { ... },
    loadBackups(folderId) { ... },
    restoreAll(backupId) { ... },
    restoreSelected(backupIds) { ... }
};
```

### Background Service Worker (background.js)

```javascript
async function restoreFromBookmarks(folderId, options) {
    options = {
        newWindow: true,
        preserveGroups: true
    };
    // 1. Klasördeki bookmark'ları al
    // 2. Alt klasörleri kontrol et (tab groups için)
    // 3. Yeni pencere oluştur
    // 4. Sekmeleri aç
    // 5. Tab groups oluştur (varsa)
}
```

### Tab Groups Geri Yükleme Mantığı

1. Yedek klasöründeki alt klasörleri tespit et
2. Her alt klasör için:
   - Sekmeleri aç
   - Açılan sekme ID'lerini topla
   - chrome.tabs.group() ile grup oluştur
   - chrome.tabGroups.update() ile grup adını ayarla

### Storage Değişiklikleri

Yeni anahtar gerekmiyor. Mevcut yapı yeterli:
- `backupFolderId`: Ana yedek klasörü
- `preserveTabGroups`: Grup koruma ayarı

### Mesajlaşma

```javascript
// popup -> background
{
    action: 'restoreBackup',
    backupId: '12345',
    options: {
        newWindow: true,
        preserveGroups: true
    }
}

// background -> popup (response)
{
    success: true,
    tabsOpened: 12,
    groupsCreated: 3
}
```

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|------------|
| `popup.html` | Sekme yapısı, geri yükleme UI |
| `popup.css` | Sekme stilleri, liste stilleri |
| `popup.js` | RestoreManager modülü, sekme geçişi |
| `background.js` | restoreFromBookmarks, restoreTabsWithGroups |
| `_locales/*/messages.json` | Yeni çeviri anahtarları |

## Yeni Çeviri Anahtarları

```
restoreTab          = Geri Yükle
selectBackupFolder  = Yedek Klasörü Seç
restoreAll          = Tümünü Aç
restoreSelected     = Seçilileri Aç
noBackupsFound      = Yedek bulunamadı
restoreSuccess      = {count} sekme açıldı
restoreFailed       = Geri yükleme başarısız
tabsOpened          = sekme
```

## Hata Durumları

1. **Klasör seçili değil**: Dropdown'da "Klasör seçin" placeholder, butonlar disabled
2. **Yedek yok**: "Bu klasörde yedek bulunamadı" mesajı
3. **Bookmark erişim hatası**: Hata mesajı göster, retry seçeneği
4. **Çok fazla sekme**: Uyarı göster (örn: "50+ sekme açılacak, devam edilsin mi?")

## Test Senaryoları

1. Basit yedek geri yükleme (tek klasör, grup yok)
2. Tab groups ile geri yükleme
3. Birden fazla yedek seçerek açma
4. Boş klasör durumu
5. Büyük yedek (50+ sekme) performansı

## Implementasyon Sırası

1. UI iskeleti (sekmeler, dropdown, liste)
2. Backend fonksiyonları (restoreFromBookmarks)
3. Tab groups geri yükleme
4. Checkbox/seçim mantığı
5. Hata yönetimi
6. Çeviriler
7. Test

## Riskler ve Önlemler

| Risk | Önlem |
|------|-------|
| Çok fazla sekme açma | Uyarı dialog'u ekle (50+ için) |
| Tab group API uyumsuzluğu | Try-catch, fallback olarak grup olmadan aç |
| Bookmark yapısı bozuk | Validation, hata mesajı |

## Başarı Kriterleri

- [ ] Kullanıcı yedekleri görüntüleyebilir
- [ ] Tek tıkla tüm sekmeler açılır
- [ ] Tab groups doğru şekilde oluşturulur
- [ ] Seçili yedekler açılabilir
- [ ] Hata durumları doğru yönetilir
- [ ] 18 dil desteği çalışır