(function() {
  const STORAGE_KEY = 'tmpinData';
  const MENU_PIN = 'tmpin-pin';
  const MENU_UNPIN = 'tmpin-unpin';

  function getMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  function getData(callback) {
    chrome.storage.sync.get([STORAGE_KEY], function(result) {
      const data = result[STORAGE_KEY] || {
        groups: [
          {
            id: 'default',
            name: 'Default',
            pages: [],
            expanded: true
          }
        ]
      };
      callback(data);
    });
  }

  function saveData(data, callback) {
    chrome.storage.sync.set({ [STORAGE_KEY]: data }, function() {
      if (callback) callback();
    });
  }

  function isPinned(url, data) {
    return data.groups.some(group =>
      group.pages.some(page => page.url === url)
    );
  }

  function createMenus() {
    chrome.contextMenus.create({
      id: MENU_PIN,
      title: getMessage('contextMenuPin') || 'Pin this page',
      contexts: ['page', 'link']
    });

    chrome.contextMenus.create({
      id: MENU_UNPIN,
      title: getMessage('contextMenuUnpin') || 'Unpin this page',
      contexts: ['page', 'link']
    });
  }

  function updateMenuVisibility(tab) {
    if (!tab || !tab.url) return;

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
      chrome.contextMenus.update(MENU_PIN, { visible: false });
      chrome.contextMenus.update(MENU_UNPIN, { visible: false });
      return;
    }

    getData(function(data) {
      const pinned = isPinned(tab.url, data);

      chrome.contextMenus.update(MENU_PIN, { visible: !pinned });
      chrome.contextMenus.update(MENU_UNPIN, { visible: pinned });
    });
  }

  function pinPage(url, title, callback) {
    if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
      console.log(getMessage('cannotPinSpecialPage') || 'Cannot pin this page');
      if (callback) callback(false);
      return;
    }

    getData(function(data) {
      if (isPinned(url, data)) {
        if (callback) callback(false);
        return;
      }

      const defaultGroup = data.groups.find(g => g.id === 'default');
      if (defaultGroup) {
        defaultGroup.pages.unshift({
          url: url,
          title: title || url,
          pinnedAt: Date.now()
        });
      }

      saveData(data, function() {
        if (callback) callback(true);
      });
    });
  }

  function unpinPage(url, callback) {
    getData(function(data) {
      let found = false;

      data.groups.forEach(group => {
        const index = group.pages.findIndex(page => page.url === url);
        if (index !== -1) {
          group.pages.splice(index, 1);
          found = true;
        }
      });

      if (!found) {
        if (callback) callback(false);
        return;
      }

      saveData(data, function() {
        if (callback) callback(true);
      });
    });
  }

  function handleMenuClick(info, tab) {
    if (!tab || !tab.url) return;

    if (info.menuItemId === MENU_PIN) {
      const url = info.linkUrl || tab.url;
      const title = tab.title || url;

      pinPage(url, title, function(success) {
        if (success) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: getMessage('extensionName') || 'Tmpin',
            message: getMessage('pinnedSuccess') || 'Page pinned successfully'
          });
        }
      });
    } else if (info.menuItemId === MENU_UNPIN) {
      const url = info.linkUrl || tab.url;

      unpinPage(url, function(success) {
        if (success) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: getMessage('extensionName') || 'Tmpin',
            message: getMessage('unpinnedSuccess') || 'Page unpinned successfully'
          });
        }
      });
    }
  }

  function init() {
    createMenus();

    chrome.contextMenus.onClicked.addListener(handleMenuClick);

    chrome.tabs.onActivated.addListener(function(activeInfo) {
      chrome.tabs.get(activeInfo.tabId, function(tab) {
        updateMenuVisibility(tab);
      });
    });

    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
      if (changeInfo.url || changeInfo.status === 'complete') {
        updateMenuVisibility(tab);
      }
    });

    chrome.runtime.onInstalled.addListener(function() {
      createMenus();
    });
  }

  init();
})();