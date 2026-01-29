(function() {
  const STORAGE_KEY = 'tmpinData';
  let modalCallback = null;

  function getMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = getMessage(key);
    });

    document.querySelectorAll('[title^="__MSG_"]').forEach(el => {
      const title = el.getAttribute('title');
      const keyMatch = title.match(/__MSG_(.*?)__/);
      if (keyMatch) {
        const key = keyMatch[1];
        el.setAttribute('title', getMessage(key) || key);
      }
    });
  }

  function showModal(options) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMessage');
    const inputEl = document.getElementById('modalInput');
    const cancelBtn = document.getElementById('modalCancel');
    const confirmBtn = document.getElementById('modalConfirm');
    const closeBtn = document.getElementById('modalClose');

    titleEl.textContent = options.title || getMessage('notice') || 'Notice';
    messageEl.textContent = options.message || '';

    if (options.input) {
      inputEl.value = options.defaultValue || '';
      inputEl.placeholder = options.placeholder || getMessage('groupName') || 'Group name';
      inputEl.style.display = 'block';
      inputEl.focus();
    } else {
      inputEl.style.display = 'none';
    }

    cancelBtn.style.display = options.input ? 'block' : 'none';

    modalCallback = options.callback || null;

    function handleClose() {
      overlay.style.display = 'none';
      if (modalCallback) {
        modalCallback(options.input ? null : false);
      }
    }

    function handleConfirm() {
      overlay.style.display = 'none';
      if (modalCallback) {
        modalCallback(options.input ? inputEl.value : true);
      }
    }

    closeBtn.onclick = handleClose;
    cancelBtn.onclick = handleClose;
    confirmBtn.onclick = handleConfirm;

    overlay.onclick = function(e) {
      if (e.target === overlay) {
        handleClose();
      }
    };

    overlay.style.display = 'flex';
  }

  function showAlert(message, title) {
    return new Promise((resolve) => {
      showModal({
        title: title || getMessage('notice') || 'Notice',
        message: message,
        callback: resolve
      });
    });
  }

  function showPrompt(message, defaultValue, placeholder, title) {
    return new Promise((resolve) => {
      showModal({
        title: title || getMessage('input') || 'Input',
        message: message,
        input: true,
        defaultValue: defaultValue,
        placeholder: placeholder,
        callback: resolve
      });
    });
  }

  function showConfirm(message, title) {
    return new Promise((resolve) => {
      showModal({
        title: title || getMessage('confirm') || 'Confirm',
        message: message,
        callback: resolve
      });
    });
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

  function getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://favicon.im/${urlObj.hostname}`;
    } catch (e) {
      return '';
    }
  }

  function getDomainName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  }

  function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function renderGroups(data) {
    const groupsContainer = document.getElementById('groupsContainer');
    const emptyState = document.getElementById('emptyState');

    const hasPages = data.groups.some(group => group.pages.length > 0);

    if (!hasPages) {
      groupsContainer.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    groupsContainer.style.display = 'block';
    emptyState.style.display = 'none';

    groupsContainer.innerHTML = '';

    data.groups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'group-item';
      groupEl.dataset.groupId = group.id;

      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.dataset.groupId = group.id;
      groupHeader.onclick = function() {
        toggleGroup(group.id);
      };

      groupHeader.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
      });

      groupHeader.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
      });

      groupHeader.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetGroupId = group.id;

        if (draggedData.groupId !== targetGroupId) {
          movePage(draggedData.groupId, draggedData.pageIndex, targetGroupId, 0);
        }
      });

      const groupTitle = document.createElement('div');
      groupTitle.className = 'group-title';
      groupTitle.textContent = group.name;

      const groupActions = document.createElement('div');
      groupActions.className = 'group-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'group-action-btn';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Edit group';
      editBtn.onclick = function(e) {
        e.stopPropagation();
        editGroup(group.id);
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'group-action-btn delete';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Delete group';
      deleteBtn.onclick = function(e) {
        e.stopPropagation();
        deleteGroup(group.id);
      };

      const openAllBtn = document.createElement('button');
      openAllBtn.className = 'group-action-btn open-all';
      openAllBtn.innerHTML = '📂';
      openAllBtn.title = 'Open all links in new tabs';
      openAllBtn.onclick = function(e) {
        e.stopPropagation();
        openAllLinks(group.id);
      };

      groupActions.appendChild(editBtn);
      if (group.id !== 'default') {
        groupActions.appendChild(deleteBtn);
      }
      if (group.pages.length > 0) {
        groupActions.appendChild(openAllBtn);
      }

      groupHeader.appendChild(groupTitle);
      groupHeader.appendChild(groupActions);

      const groupList = document.createElement('div');
      groupList.className = 'group-list';
      groupList.dataset.groupId = group.id;

      groupList.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
      });

      groupList.addEventListener('dragleave', function(e) {
        if (e.target === this) {
          this.classList.remove('drag-over');
        }
      });

      groupList.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetGroupId = group.id;

        if (draggedData.groupId !== targetGroupId) {
          movePage(draggedData.groupId, draggedData.pageIndex, targetGroupId, group.pages.length);
        }
      });

      if (group.expanded) {
        renderGroupPages(group, groupList);
      }

      groupEl.appendChild(groupHeader);
      groupEl.appendChild(groupList);

      groupsContainer.appendChild(groupEl);
    });
  }

  function renderGroupPages(group, container) {
    container.innerHTML = '';

    if (group.pages.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.padding = '10px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.color = '#999';
      emptyMsg.style.fontSize = '12px';
      emptyMsg.textContent = getMessage('noPagesInGroup') || 'No pages in this group';
      container.appendChild(emptyMsg);
      return;
    }

    group.pages.forEach((page, index) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'pinned-item';
      pageEl.draggable = true;
      pageEl.dataset.groupId = group.id;
      pageEl.dataset.pageIndex = index;

      pageEl.addEventListener('dragstart', function(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
          groupId: group.id,
          pageIndex: index
        }));
        this.classList.add('dragging');
      });

      pageEl.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => {
          el.classList.remove('drag-over');
        });
      });

      pageEl.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
      });

      pageEl.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
      });

      pageEl.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetGroupId = group.id;
        const targetIndex = index;

        if (draggedData.groupId !== targetGroupId || draggedData.pageIndex !== targetIndex) {
          movePage(draggedData.groupId, draggedData.pageIndex, targetGroupId, targetIndex);
        }
      });

      const favicon = document.createElement('div');
      favicon.className = 'pinned-favicon';
      const faviconUrl = getFaviconUrl(page.url);
      if (faviconUrl) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.alt = '';
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.borderRadius = '3px';
        favicon.appendChild(img);
      } else {
        favicon.textContent = getDomainName(page.url).charAt(0).toUpperCase();
      }

      const info = document.createElement('div');
      info.className = 'pinned-info';

      const title = document.createElement('div');
      title.className = 'pinned-title';
      title.textContent = page.title || getDomainName(page.url);

      const url = document.createElement('div');
      url.className = 'pinned-url';
      url.textContent = page.url;

      info.appendChild(title);
      info.appendChild(url);

      const actions = document.createElement('div');
      actions.className = 'pinned-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = getMessage('deleteButtonTooltip') || 'Delete';
      deleteBtn.onclick = function(e) {
        e.stopPropagation();
        deletePage(group.id, index);
      };

      actions.appendChild(deleteBtn);

      pageEl.appendChild(favicon);
      pageEl.appendChild(info);
      pageEl.appendChild(actions);

      pageEl.onclick = function() {
        chrome.tabs.create({ url: page.url });
        window.close();
      };

      container.appendChild(pageEl);
    });
  }

  function toggleGroup(groupId) {
    getData(function(data) {
      const group = data.groups.find(g => g.id === groupId);
      if (group) {
        group.expanded = !group.expanded;
        saveData(data, function() {
          renderGroups(data);
        });
      }
    });
  }

  async function addGroup() {
    const name = await showPrompt('', '', getMessage('groupName') || 'Group name', getMessage('newGroup') || 'New Group');
    if (!name || !name.trim()) return;

    getData(function(data) {
      data.groups.push({
        id: generateId(),
        name: name.trim(),
        pages: [],
        expanded: true
      });

      saveData(data, function() {
        renderGroups(data);
      });
    });
  }

  async function editGroup(groupId) {
    getData(function(data) {
      const group = data.groups.find(g => g.id === groupId);
      if (group) {
        showPrompt('', group.name, getMessage('groupName') || 'Group name', getMessage('editGroup') || 'Edit Group').then(function(name) {
          if (name && name.trim()) {
            group.name = name.trim();
            saveData(data, function() {
              renderGroups(data);
            });
          }
        });
      }
    });
  }

  async function deleteGroup(groupId) {
    if (groupId === 'default') {
      await showAlert(getMessage('cannotDeleteDefaultGroup') || 'Cannot delete default group', getMessage('warning') || 'Warning');
      return;
    }

    const confirmed = await showConfirm(getMessage('confirmDeleteGroup') || 'Are you sure you want to delete this group? All pages in this group will be moved to Default group.', getMessage('deleteGroup') || 'Delete Group');
    if (!confirmed) {
      return;
    }

    getData(function(data) {
      const groupIndex = data.groups.findIndex(g => g.id === groupId);
      if (groupIndex !== -1) {
        const deletedGroup = data.groups[groupIndex];
        const defaultGroup = data.groups.find(g => g.id === 'default');

        if (defaultGroup) {
          defaultGroup.pages = defaultGroup.pages.concat(deletedGroup.pages);
        }

        data.groups.splice(groupIndex, 1);

        saveData(data, function() {
          renderGroups(data);
        });
      }
    });
  }

  function deletePage(groupId, pageIndex) {
    getData(function(data) {
      const group = data.groups.find(g => g.id === groupId);
      if (group) {
        group.pages.splice(pageIndex, 1);
        saveData(data, function() {
          renderGroups(data);
        });
      }
    });
  }

  function movePage(sourceGroupId, sourceIndex, targetGroupId, targetIndex) {
    getData(function(data) {
      const sourceGroup = data.groups.find(g => g.id === sourceGroupId);
      const targetGroup = data.groups.find(g => g.id === targetGroupId);

      if (sourceGroup && targetGroup) {
        const page = sourceGroup.pages.splice(sourceIndex, 1)[0];
        targetGroup.pages.splice(targetIndex, 0, page);

        saveData(data, function() {
          renderGroups(data);
        });
      }
    });
  }

  function openAllLinks(groupId) {
    getData(function(data) {
      const group = data.groups.find(g => g.id === groupId);
      if (group && group.pages.length > 0) {
        group.pages.forEach(page => {
          chrome.tabs.create({ url: page.url, active: false });
        });
        window.close();
      }
    });
  }

  async function pinCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;

      const tab = tabs[0];
      const url = tab.url;

      if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
        showAlert(getMessage('cannotPinSpecialPage') || 'Cannot pin this page', 'Warning');
        return;
      }

      getData(function(data) {
        const exists = data.groups.some(group =>
          group.pages.some(page => page.url === url)
        );

        if (exists) {
          showAlert(getMessage('alreadyPinned') || 'This page is already pinned', 'Notice');
          return;
        }

        const defaultGroup = data.groups.find(g => g.id === 'default');
        if (defaultGroup) {
          defaultGroup.pages.unshift({
            url: url,
            title: tab.title,
            pinnedAt: Date.now()
          });
        }

        saveData(data, function() {
          renderGroups(data);
          showAlert(getMessage('pinnedSuccess') || 'Page pinned successfully', 'Success');
        });
      });
    });
  }

  function loadData() {
    getData(function(data) {
      renderGroups(data);
    });
  }

  function init() {
    updateI18n();
    loadData();

    const pinBtn = document.getElementById('pinBtn');
    pinBtn.onclick = pinCurrentPage;

    const addGroupBtn = document.getElementById('addGroupBtn');
    addGroupBtn.onclick = addGroup;

    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'sync' && changes[STORAGE_KEY]) {
        loadData();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();