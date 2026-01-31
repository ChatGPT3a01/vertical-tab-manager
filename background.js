// 點擊擴充功能圖示時開啟側邊欄
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// 設定點擊行為為開啟側邊欄
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
