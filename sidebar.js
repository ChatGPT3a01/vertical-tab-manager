// 狀態管理
let allTabs = [];
let allGroups = [];
let currentWindowId = null;
let contextMenuTabId = null;
let draggedTabId = null;
let shortcuts = [];
let settings = {
  theme: 'blue',
  aiProvider: 'google',
  aiModel: 'gemini-2.5-flash',
  aiApiKey: ''
};

// AI 模型選項
const aiModels = {
  google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (推薦)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (預覽)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (預覽)' }
  ],
  openai: [
    { id: 'gpt-5.2', name: 'GPT-5.2 (最新)' },
    { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro (最強)' },
    { id: 'gpt-5.1', name: 'GPT-5.1' }
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (推薦)' },
    { id: 'qwen/qwen-3-32b', name: 'Qwen 3 32B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (快速)' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout (多模態)' }
  ]
};

// 語音識別
let recognition = null;
let isRecording = false;

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

// AI 相關 DOM 元素
const aiProvider = document.getElementById('aiProvider');
const aiModel = document.getElementById('aiModel');
const aiApiKey = document.getElementById('aiApiKey');
const toggleApiKey = document.getElementById('toggleApiKey');
const saveAiSettings = document.getElementById('saveAiSettings');
const toggleAiSection = document.getElementById('toggleAiSection');
const aiContent = document.getElementById('aiContent');
const aiInput = document.getElementById('aiInput');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const sendAiBtn = document.getElementById('sendAiBtn');
const voiceLang = document.getElementById('voiceLang');
const aiResponse = document.getElementById('aiResponse');
const resizeHandle = document.getElementById('resizeHandle');
const normalTabs = document.getElementById('normalTabs');

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
  setupAiListeners();
  setupSpeechRecognition();
  setupResizeHandle();
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
    // 載入 AI 設定到 UI
    if (aiProvider) {
      aiProvider.value = settings.aiProvider || 'google';
      updateModelOptions();
      if (aiModel) aiModel.value = settings.aiModel || 'gemini-3-flash';
      if (aiApiKey) aiApiKey.value = settings.aiApiKey || '';
    }
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

// ===== 可拖曳分隔線功能 =====

function setupResizeHandle() {
  if (!resizeHandle) return;

  let isResizing = false;
  let startY = 0;
  let startHeight = 0;
  const aiSection = document.getElementById('aiSection');
  const container = document.querySelector('.container');

  // 載入儲存的高度
  loadAiSectionHeight();

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = aiSection.offsetHeight;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const deltaY = startY - e.clientY;
    const newHeight = Math.max(100, Math.min(startHeight + deltaY, window.innerHeight - 200));
    aiSection.style.height = newHeight + 'px';
    aiSection.style.minHeight = newHeight + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 儲存高度
      saveAiSectionHeight(aiSection.offsetHeight);
    }
  });

  // 觸控支援
  resizeHandle.addEventListener('touchstart', (e) => {
    isResizing = true;
    startY = e.touches[0].clientY;
    startHeight = aiSection.offsetHeight;
    resizeHandle.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;
    const deltaY = startY - e.touches[0].clientY;
    const newHeight = Math.max(100, Math.min(startHeight + deltaY, window.innerHeight - 200));
    aiSection.style.height = newHeight + 'px';
    aiSection.style.minHeight = newHeight + 'px';
  });

  document.addEventListener('touchend', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('dragging');
      saveAiSectionHeight(aiSection.offsetHeight);
    }
  });
}

// 儲存 AI 區塊高度
async function saveAiSectionHeight(height) {
  try {
    await chrome.storage.local.set({ aiSectionHeight: height });
  } catch (e) {
    console.error('儲存高度失敗:', e);
  }
}

// 載入 AI 區塊高度
async function loadAiSectionHeight() {
  try {
    const data = await chrome.storage.local.get('aiSectionHeight');
    if (data.aiSectionHeight) {
      const aiSection = document.getElementById('aiSection');
      if (aiSection) {
        aiSection.style.height = data.aiSectionHeight + 'px';
        aiSection.style.minHeight = data.aiSectionHeight + 'px';
      }
    }
  } catch (e) {
    console.error('載入高度失敗:', e);
  }
}

// ===== AI 助手功能 =====

// 更新模型選項
function updateModelOptions() {
  if (!aiModel || !aiProvider) return;
  const provider = aiProvider.value;
  const models = aiModels[provider] || [];
  aiModel.innerHTML = models.map(m =>
    `<option value="${m.id}">${m.name}</option>`
  ).join('');
}

// 設定 AI 事件監聽
function setupAiListeners() {
  // 服務切換時更新模型列表
  if (aiProvider) {
    aiProvider.addEventListener('change', () => {
      updateModelOptions();
      settings.aiProvider = aiProvider.value;
      settings.aiModel = aiModel.value;
    });
  }

  // 模型切換
  if (aiModel) {
    aiModel.addEventListener('change', () => {
      settings.aiModel = aiModel.value;
    });
  }

  // 顯示/隱藏 API Key
  if (toggleApiKey) {
    toggleApiKey.addEventListener('click', () => {
      aiApiKey.type = aiApiKey.type === 'password' ? 'text' : 'password';
    });
  }

  // 儲存 AI 設定
  if (saveAiSettings) {
    saveAiSettings.addEventListener('click', async () => {
      settings.aiProvider = aiProvider.value;
      settings.aiModel = aiModel.value;
      settings.aiApiKey = aiApiKey.value;
      await saveSettings();
      // 視覺反饋
      const originalText = saveAiSettings.textContent;
      saveAiSettings.textContent = '✅ 已儲存！';
      saveAiSettings.style.backgroundColor = '#22c55e';
      setTimeout(() => {
        saveAiSettings.textContent = originalText;
        saveAiSettings.style.backgroundColor = '';
      }, 1500);
    });
  }

  // 展開/收合 AI 區塊
  if (toggleAiSection) {
    toggleAiSection.addEventListener('click', () => {
      aiContent.classList.toggle('collapsed');
      toggleAiSection.classList.toggle('collapsed');
    });
  }

  // 快捷按鈕
  document.querySelectorAll('.ai-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleQuickAction(btn.dataset.action);
    });
  });

  // 發送按鈕
  if (sendAiBtn) {
    sendAiBtn.addEventListener('click', () => {
      sendAiQuery(aiInput.value);
    });
  }

  // Enter 發送
  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAiQuery(aiInput.value);
      }
    });
  }

  // 語音按鈕
  if (voiceInputBtn) {
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
  }
}

// 設定語音識別
function setupSpeechRecognition() {
  // Chrome 擴充功能側邊欄不支援語音識別，隱藏按鈕
  if (voiceInputBtn) {
    voiceInputBtn.style.display = 'none';
  }
  const langSelect = document.querySelector('.ai-lang-select');
  if (langSelect) {
    langSelect.style.display = 'none';
  }
}

// 切換語音輸入
async function toggleVoiceInput() {
  if (!recognition) {
    showAiMessage('❌ 此瀏覽器不支援語音識別', true);
    return;
  }

  if (isRecording) {
    recognition.stop();
  } else {
    // 先請求麥克風權限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 釋放資源
      recognition.lang = voiceLang.value;
      recognition.start();
    } catch (error) {
      console.error('麥克風權限錯誤:', error);
      if (error.name === 'NotAllowedError') {
        showAiMessage('❌ 麥克風權限被拒絕\n\n請點擊網址列左側的 🔒 圖示 → 網站設定 → 麥克風 → 允許', true);
      } else if (error.name === 'NotFoundError') {
        showAiMessage('❌ 找不到麥克風裝置', true);
      } else {
        showAiMessage('❌ 無法啟用語音輸入: ' + error.message, true);
      }
    }
  }
}

// 處理快捷動作
async function handleQuickAction(action) {
  const prompts = {
    summary: '請幫我摘要以下網頁內容，用繁體中文回答，重點條列式呈現：',
    conclusion: '請從以下網頁內容中提取主要結論和重點，用繁體中文回答：',
    translate: '請將以下網頁內容翻譯成繁體中文，保持原意：'
  };

  const prompt = prompts[action];
  if (prompt) {
    await sendAiQuery(prompt, true);
  }
}

// 發送 AI 查詢
async function sendAiQuery(query, includePageContent = true) {
  if (!query.trim()) {
    showAiMessage('請輸入問題', true);
    return;
  }

  if (!settings.aiApiKey) {
    showAiMessage('❌ 請先在設定中輸入 API Key', true);
    return;
  }

  // 顯示載入狀態
  aiResponse.innerHTML = '';
  aiResponse.classList.add('loading');
  disableAiInputs(true);

  try {
    let pageContent = '';
    if (includePageContent) {
      pageContent = await getPageContent();
      if (!pageContent) {
        showAiMessage('❌ 無法取得頁面內容（系統頁面不支援）', true);
        return;
      }
    }

    const fullPrompt = includePageContent ? `${query}\n\n網頁內容：\n${pageContent}` : query;
    const response = await callAI(fullPrompt);

    showAiMessage(response);
    aiInput.value = '';
  } catch (error) {
    console.error('AI 請求失敗:', error);
    showAiMessage(`❌ ${error.message}`, true);
  } finally {
    aiResponse.classList.remove('loading');
    disableAiInputs(false);
  }
}

// 取得頁面內容
async function getPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 檢查是否為系統頁面
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') ||
        tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      return null;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // 移除 script 和 style 標籤
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        return clone.innerText.substring(0, 15000); // 限制長度
      }
    });

    return results[0]?.result || '';
  } catch (error) {
    console.error('取得頁面內容失敗:', error);
    return null;
  }
}

// 呼叫 AI API
async function callAI(prompt) {
  const provider = settings.aiProvider;
  const model = settings.aiModel;
  const apiKey = settings.aiApiKey;

  let url, headers, body;

  switch (provider) {
    case 'google':
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      };
      break;

    case 'openai':
      url = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      body = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      };
      break;

    case 'groq':
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      body = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 2048
      };
      break;

    default:
      throw new Error('不支援的 AI 服務');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 錯誤 (${response.status})`);
  }

  const data = await response.json();

  // 解析回應
  switch (provider) {
    case 'google':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '無回應';
    case 'openai':
    case 'groq':
      return data.choices?.[0]?.message?.content || '無回應';
    default:
      return '無回應';
  }
}

// 顯示 AI 訊息
function showAiMessage(message, isError = false) {
  aiResponse.classList.remove('loading');
  aiResponse.innerHTML = `<div class="${isError ? 'ai-error' : 'ai-result'}">${escapeHtml(message)}</div>`;
}

// 禁用/啟用 AI 輸入
function disableAiInputs(disabled) {
  document.querySelectorAll('.ai-action-btn').forEach(btn => btn.disabled = disabled);
  if (aiInput) aiInput.disabled = disabled;
  if (sendAiBtn) sendAiBtn.disabled = disabled;
  if (voiceInputBtn) voiceInputBtn.disabled = disabled;
}

// 啟動
init();
