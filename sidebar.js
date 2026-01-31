// 狀態管理
let allTabs = [];
let allGroups = [];
let currentWindowId = null;
let contextMenuTabId = null;
let draggedTabId = null;
let shortcuts = [];
let settings = {
  theme: 'blue'
};

// 預設快捷網站
const defaultShortcuts = [
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', favicon: 'https://www.youtube.com/favicon.ico', isDefault: true }
];

// DOM 元素
const searchInput = document.getElementById('searchInput');
const newTabBtn = document.getElementById('newTabBtn');
const pinnedTabList = document.getElementById('pinnedTabList');
const normalTabList = document.getElementById('normalTabList');
const groupedTabs = document.getElementById('groupedTabs');
const tabCount = document.getElementById('tabCount');
const contextMenu = document.getElementById('contextMenu');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const shortcutsList = document.getElementById('shortcutsList');
const addShortcutBtn = document.getElementById('addShortcutBtn');
const shortcutModal = document.getElementById('shortcutModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addCurrentTabBtn = document.getElementById('addCurrentTabBtn');
const saveShortcutBtn = document.getElementById('saveShortcutBtn');
const shortcutNameInput = document.getElementById('shortcutName');
const shortcutUrlInput = document.getElementById('shortcutUrl');
const pinnedTabsSection = document.getElementById('pinnedTabs');
const helpBtn = document.getElementById('helpBtn');
const helpPanel = document.getElementById('helpPanel');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// 初始化
async function init() {
  const window = await chrome.windows.getCurrent();
  currentWindowId = window.id;

  await loadSettings();
  await loadShortcuts();
  await loadTabs();
  setupEventListeners();
  setupTabListeners();
  setupSettingsListeners();
  setupShortcutListeners();
  setupHelpListeners();
  setupFullscreenListeners();
}

// 載入所有分頁
async function loadTabs() {
  allTabs = await chrome.tabs.query({ windowId: currentWindowId });

  try {
    allGroups = await chrome.tabGroups.query({ windowId: currentWindowId });
  } catch (e) {
    allGroups = [];
  }

  renderTabs();
}

// 渲染分頁列表
function renderTabs(filterText = '') {
  const filter = filterText.toLowerCase();

  // 過濾分頁
  let filteredTabs = allTabs;
  if (filter) {
    filteredTabs = allTabs.filter(tab =>
      tab.title.toLowerCase().includes(filter) ||
      tab.url.toLowerCase().includes(filter)
    );
  }

  // 分類分頁
  const pinnedTabs = filteredTabs.filter(tab => tab.pinned);
  const groupedTabsMap = {};
  const ungroupedTabs = [];

  filteredTabs.filter(tab => !tab.pinned).forEach(tab => {
    if (tab.groupId && tab.groupId !== -1) {
      if (!groupedTabsMap[tab.groupId]) {
        groupedTabsMap[tab.groupId] = [];
      }
      groupedTabsMap[tab.groupId].push(tab);
    } else {
      ungroupedTabs.push(tab);
    }
  });

  // 渲染固定分頁
  pinnedTabList.innerHTML = pinnedTabs.map(tab => createTabHTML(tab)).join('');

  // 顯示或隱藏固定分頁區塊
  if (pinnedTabsSection) {
    pinnedTabsSection.style.display = pinnedTabs.length > 0 ? 'block' : 'none';
  }

  // 渲染群組分頁
  groupedTabs.innerHTML = allGroups.map(group => {
    const tabs = groupedTabsMap[group.id] || [];
    if (tabs.length === 0) return '';

    return `
      <div class="tab-group" data-group-id="${group.id}">
        <div class="group-header group-${group.color}" onclick="toggleGroup(${group.id})">
          <div class="group-color group-${group.color}"></div>
          <span class="group-title">${group.title || '未命名群組'}</span>
          <span class="group-count">${tabs.length}</span>
          <span class="group-toggle" id="toggle-${group.id}">▼</span>
        </div>
        <div class="group-tabs" id="group-tabs-${group.id}" style="border-color: var(--group-${group.color}, #6b7280);">
          ${tabs.map(tab => createTabHTML(tab)).join('')}
        </div>
      </div>
    `;
  }).join('');

  // 渲染一般分頁
  normalTabList.innerHTML = ungroupedTabs.map(tab => createTabHTML(tab)).join('');

  // 更新分頁數量
  tabCount.textContent = filteredTabs.length;

  // 綁定事件
  bindTabEvents();
}

// 建立分頁 HTML
function createTabHTML(tab) {
  const faviconUrl = tab.favIconUrl || `chrome://favicon/size/16@2x/${tab.url}`;
  const isActive = tab.active ? 'active' : '';
  const indicators = [];

  if (tab.audible) indicators.push('🔊');
  if (tab.mutedInfo?.muted) indicators.push('🔇');
  if (tab.discarded) indicators.push('💤');

  // 從 URL 提取網域
  let domain = '';
  try {
    domain = new URL(tab.url).hostname;
  } catch (e) {
    domain = tab.url;
  }

  return `
    <div class="tab-item ${isActive}"
         data-tab-id="${tab.id}"
         draggable="true"
         title="${tab.title}\n${tab.url}">
      <img class="tab-favicon" src="${faviconUrl}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23666%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'"/>
      <div class="tab-info">
        <span class="tab-title">${escapeHtml(tab.title || '新分頁')}</span>
        <span class="tab-url">${escapeHtml(domain)}</span>
      </div>
      ${indicators.length > 0 ? `<div class="tab-indicators">${indicators.map(i => `<span class="indicator">${i}</span>`).join('')}</div>` : ''}
      <button class="tab-close" data-tab-id="${tab.id}" title="關閉分頁">×</button>
    </div>
  `;
}

// HTML 跳脫
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 綁定分頁事件
function bindTabEvents() {
  // 點擊分頁
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.classList.contains('tab-close')) return;
      const tabId = parseInt(item.dataset.tabId);
      await chrome.tabs.update(tabId, { active: true });
    });

    // 右鍵選單
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, parseInt(item.dataset.tabId));
    });

    // 拖曳事件
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
  });

  // 關閉按鈕
  document.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tabId = parseInt(btn.dataset.tabId);
      await chrome.tabs.remove(tabId);
    });
  });
}

// 拖曳功能
function handleDragStart(e) {
  draggedTabId = parseInt(e.target.dataset.tabId);
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedTabId = null;
  document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e) {
  e.preventDefault();
  const targetTabId = parseInt(e.target.closest('.tab-item')?.dataset.tabId);

  if (draggedTabId && targetTabId && draggedTabId !== targetTabId) {
    const targetTab = allTabs.find(t => t.id === targetTabId);
    if (targetTab) {
      await chrome.tabs.move(draggedTabId, { index: targetTab.index });
    }
  }
}

// 群組展開/收合
window.toggleGroup = function(groupId) {
  const tabsContainer = document.getElementById(`group-tabs-${groupId}`);
  const toggleIcon = document.getElementById(`toggle-${groupId}`);

  if (tabsContainer) {
    tabsContainer.classList.toggle('collapsed');
    toggleIcon?.classList.toggle('collapsed');
  }
};

// 右鍵選單
function showContextMenu(e, tabId) {
  contextMenuTabId = tabId;
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.classList.add('visible');
}

function hideContextMenu() {
  contextMenu.classList.remove('visible');
  contextMenuTabId = null;
}

// 右鍵選單動作
async function handleContextMenuAction(action) {
  if (!contextMenuTabId) return;

  const tab = allTabs.find(t => t.id === contextMenuTabId);
  if (!tab) return;

  switch (action) {
    case 'reload':
      await chrome.tabs.reload(contextMenuTabId);
      break;

    case 'duplicate':
      await chrome.tabs.duplicate(contextMenuTabId);
      break;

    case 'copyUrl':
      await navigator.clipboard.writeText(tab.url);
      break;

    case 'pin':
      await chrome.tabs.update(contextMenuTabId, { pinned: !tab.pinned });
      break;

    case 'mute':
      await chrome.tabs.update(contextMenuTabId, { muted: !tab.mutedInfo?.muted });
      break;

    case 'newGroup':
      const groupId = await chrome.tabs.group({ tabIds: contextMenuTabId });
      await chrome.tabGroups.update(groupId, { title: '新群組' });
      break;

    case 'removeFromGroup':
      if (tab.groupId && tab.groupId !== -1) {
        await chrome.tabs.ungroup(contextMenuTabId);
      }
      break;

    case 'closeOthers':
      const otherTabs = allTabs.filter(t => t.id !== contextMenuTabId && !t.pinned);
      await chrome.tabs.remove(otherTabs.map(t => t.id));
      break;

    case 'closeRight':
      const rightTabs = allTabs.filter(t => t.index > tab.index && !t.pinned);
      await chrome.tabs.remove(rightTabs.map(t => t.id));
      break;

    case 'close':
      await chrome.tabs.remove(contextMenuTabId);
      break;
  }

  hideContextMenu();
}

// 設定事件監聽
function setupEventListeners() {
  // 搜尋
  searchInput.addEventListener('input', (e) => {
    renderTabs(e.target.value);
  });

  // 新增分頁
  newTabBtn.addEventListener('click', async () => {
    await chrome.tabs.create({});
  });

  // 隱藏右鍵選單
  document.addEventListener('click', hideContextMenu);

  // 右鍵選單項目
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      handleContextMenuAction(item.dataset.action);
    });
  });

  // 鍵盤快捷鍵
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
      searchInput.value = '';
      renderTabs();
    }

    // Ctrl+F 聚焦搜尋
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// 設定分頁變更監聽
function setupTabListeners() {
  // 分頁建立
  chrome.tabs.onCreated.addListener(() => loadTabs());

  // 分頁移除
  chrome.tabs.onRemoved.addListener(() => loadTabs());

  // 分頁更新
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' ||
        changeInfo.title ||
        changeInfo.favIconUrl ||
        changeInfo.pinned !== undefined ||
        changeInfo.mutedInfo) {
      loadTabs();
    }
  });

  // 分頁啟用
  chrome.tabs.onActivated.addListener(() => loadTabs());

  // 分頁移動
  chrome.tabs.onMoved.addListener(() => loadTabs());

  // 分頁附加
  chrome.tabs.onAttached.addListener(() => loadTabs());

  // 分頁分離
  chrome.tabs.onDetached.addListener(() => loadTabs());

  // 群組更新
  try {
    chrome.tabGroups.onCreated.addListener(() => loadTabs());
    chrome.tabGroups.onRemoved.addListener(() => loadTabs());
    chrome.tabGroups.onUpdated.addListener(() => loadTabs());
  } catch (e) {
    // 某些瀏覽器可能不支援 tabGroups API
  }
}

// ===== 教學面板功能 =====

function setupHelpListeners() {
  // 開啟教學面板
  helpBtn.addEventListener('click', () => {
    helpPanel.classList.add('visible');
  });

  // 關閉教學面板
  closeHelpBtn.addEventListener('click', () => {
    helpPanel.classList.remove('visible');
  });

  // ESC 關閉教學面板
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpPanel.classList.contains('visible')) {
      helpPanel.classList.remove('visible');
    }
  });
}

// ===== 全螢幕功能 =====

let isFullscreen = false;

// 切換全螢幕
async function toggleFullscreen() {
  try {
    const window = await chrome.windows.getCurrent();

    if (window.state === 'fullscreen') {
      // 退出全螢幕
      await chrome.windows.update(window.id, { state: 'maximized' });
      isFullscreen = false;
    } else {
      // 進入全螢幕
      await chrome.windows.update(window.id, { state: 'fullscreen' });
      isFullscreen = true;
    }

    updateFullscreenIcon();
  } catch (e) {
    console.error('切換全螢幕失敗:', e);
  }
}

// 更新全螢幕圖示
function updateFullscreenIcon() {
  const icon = document.getElementById('fullscreenIcon');
  if (icon) {
    if (isFullscreen) {
      // 退出全螢幕圖示
      icon.innerHTML = '<path d="M4 4H2v2h2V4zm10 0h-2v2h2V4zM4 10H2v2h2v-2zm10 0h-2v2h2v-2zM6 2H4v2h2V2zm0 10H4v2h2v-2zm8-10h-2v2h2V2zm0 10h-2v2h2v-2z"/>';
    } else {
      // 進入全螢幕圖示
      icon.innerHTML = '<path d="M2 2h4v2H4v2H2V2zm8 0h4v4h-2V4h-2V2zM4 10H2v4h4v-2H4v-2zm8 2v2h4v-4h-2v2h-2z"/>';
    }
  }
}

// 檢查當前全螢幕狀態
async function checkFullscreenState() {
  try {
    const window = await chrome.windows.getCurrent();
    isFullscreen = window.state === 'fullscreen';
    updateFullscreenIcon();
  } catch (e) {
    console.error('檢查全螢幕狀態失敗:', e);
  }
}

// 設定全螢幕事件監聽
function setupFullscreenListeners() {
  // 點擊全螢幕按鈕
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // 初始化時檢查狀態
  checkFullscreenState();

  // 監聽視窗狀態變化（當使用者按 F11 時）
  chrome.windows.onBoundsChanged?.addListener?.(checkFullscreenState);
}

// ===== 設定功能 =====

// 載入設定
async function loadSettings() {
  try {
    const data = await chrome.storage.local.get('settings');
    if (data.settings) {
      settings = { ...settings, ...data.settings };
    }
    applyTheme(settings.theme);
  } catch (e) {
    console.error('載入設定失敗:', e);
  }
}

// 儲存設定
async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings });
  } catch (e) {
    console.error('儲存設定失敗:', e);
  }
}

// 套用主題
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  // 更新主題按鈕狀態
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// 設定面板事件
function setupSettingsListeners() {
  // 開啟設定面板
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('visible');
  });

  // 關閉設定面板
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('visible');
  });

  // 主題切換
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.theme = btn.dataset.theme;
      applyTheme(settings.theme);
      saveSettings();
    });
  });

  // 點擊外部關閉設定面板
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
      settingsPanel.classList.remove('visible');
    }
  });

  // 開啟 Chrome 設定連結
  const openSettingsLink = document.getElementById('openSettingsLink');
  if (openSettingsLink) {
    openSettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'chrome://settings/appearance' });
    });
  }
}

// ===== 快捷網站功能 =====

// 載入快捷網站
async function loadShortcuts() {
  try {
    const data = await chrome.storage.local.get('shortcuts');
    if (data.shortcuts && data.shortcuts.length > 0) {
      shortcuts = data.shortcuts;
    } else {
      shortcuts = [...defaultShortcuts];
      await saveShortcuts();
    }
    renderShortcuts();
  } catch (e) {
    console.error('載入快捷網站失敗:', e);
    shortcuts = [...defaultShortcuts];
    renderShortcuts();
  }
}

// 儲存快捷網站
async function saveShortcuts() {
  try {
    await chrome.storage.local.set({ shortcuts });
  } catch (e) {
    console.error('儲存快捷網站失敗:', e);
  }
}

// 渲染快捷網站
function renderShortcuts() {
  const html = shortcuts.map(shortcut => {
    const isYoutube = shortcut.id === 'youtube' || shortcut.url.includes('youtube.com');
    return `
      <div class="shortcut-item ${isYoutube ? 'youtube' : ''}" data-id="${shortcut.id}" data-url="${shortcut.url}">
        <img class="shortcut-favicon" src="${shortcut.favicon || `chrome://favicon/size/16@2x/${shortcut.url}`}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23666%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'"/>
        <span class="shortcut-name">${escapeHtml(shortcut.name)}</span>
        ${!shortcut.isDefault ? `<button class="shortcut-delete" data-id="${shortcut.id}" title="刪除">×</button>` : ''}
      </div>
    `;
  }).join('');

  // 加入作者資訊
  const authorHtml = `
    <div class="author-info">
      作者：阿亮老師 |
      <a href="https://www.youtube.com/@Liang-yt02" target="_blank">YouTube</a> |
      <a href="https://www.facebook.com/groups/2754139931432955" target="_blank">3A科技研究社</a>
    </div>
  `;

  shortcutsList.innerHTML = html + authorHtml;
  bindShortcutEvents();
}

// 綁定快捷網站事件
function bindShortcutEvents() {
  // 點擊開啟網站
  document.querySelectorAll('.shortcut-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('shortcut-delete')) return;
      const url = item.dataset.url;
      chrome.tabs.create({ url });
    });
  });

  // 刪除快捷網站
  document.querySelectorAll('.shortcut-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      removeShortcut(id);
    });
  });
}

// 新增快捷網站
function addShortcut(name, url, favicon) {
  const id = 'shortcut_' + Date.now();
  shortcuts.push({ id, name, url, favicon });
  saveShortcuts();
  renderShortcuts();
}

// 從目前分頁新增快捷
async function addCurrentTabAsShortcut() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    addShortcut(tab.title, tab.url, tab.favIconUrl);
    hideShortcutModal();
  }
}

// 移除快捷網站
function removeShortcut(id) {
  shortcuts = shortcuts.filter(s => s.id !== id);
  saveShortcuts();
  renderShortcuts();
}

// 顯示新增快捷對話框
function showShortcutModal() {
  shortcutNameInput.value = '';
  shortcutUrlInput.value = '';
  shortcutModal.classList.add('visible');
}

// 隱藏對話框
function hideShortcutModal() {
  shortcutModal.classList.remove('visible');
}

// 快捷網站事件監聽
function setupShortcutListeners() {
  addShortcutBtn.addEventListener('click', showShortcutModal);
  closeModalBtn.addEventListener('click', hideShortcutModal);

  addCurrentTabBtn.addEventListener('click', addCurrentTabAsShortcut);

  saveShortcutBtn.addEventListener('click', () => {
    const name = shortcutNameInput.value.trim();
    const url = shortcutUrlInput.value.trim();
    if (name && url) {
      // 確保網址有協議
      const fullUrl = url.startsWith('http') ? url : 'https://' + url;
      addShortcut(name, fullUrl, null);
      hideShortcutModal();
    }
  });

  // 點擊外部關閉對話框
  shortcutModal.addEventListener('click', (e) => {
    if (e.target === shortcutModal) {
      hideShortcutModal();
    }
  });
}

// 啟動
init();
