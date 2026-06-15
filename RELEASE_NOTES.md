# Release Notes

## v1.6 - Chrome / Firefox

### New
- Firefox Add-ons (AMO) submission readiness
- AMO listing screenshots (light/dark mode)

### Fixed
- Replaced all `innerHTML` assignments with safe DOM APIs (`replaceChildren`, `textContent`, `DOM.create`) to address AMO security warnings
- Removed `tabGroups` permission from Firefox manifest (not supported on Firefox)
- Added `data_collection_permissions: required none` to Firefox manifest (AMO requirement)
- Set `strict_min_version` to 142.0 for `data_collection_permissions` compatibility

### Downloads
- **Chrome/Brave/Helium:** smart-tab-booker-v1.6-chrome.zip
- **Firefox/Zen Browser/Waterfox:** smart-tab-booker-v1.6-firefox.zip