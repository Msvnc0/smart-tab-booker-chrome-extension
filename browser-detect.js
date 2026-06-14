const BrowserDetect = {
    get isFirefox() {
        return typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getBrowserInfo === 'function';
    },
    get supportsTabGroups() {
        return typeof browser !== 'undefined' && browser.tabGroups && typeof browser.tabGroups.query === 'function';
    },
    NEW_TAB_URLS: ['chrome://newtab/', 'about:newtab/', 'about:home/'],
    get shortcutUrl() {
        return this.isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';
    }
};