// 麥克風權限請求
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('requestBtn');
  const status = document.getElementById('status');

  btn.addEventListener('click', async function() {
    btn.textContent = '請求中...';
    btn.disabled = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      status.className = 'status success';
      status.textContent = '✅ 權限已授予！可以關閉此頁面，回到側邊欄使用語音輸入。';
      btn.textContent = '已授權 ✓';
    } catch (err) {
      btn.textContent = '授權麥克風';
      btn.disabled = false;
      status.className = 'status error';
      if (err.name === 'NotAllowedError') {
        status.textContent = '❌ 權限被拒絕。請點擊網址列的 🔒 圖示 → 網站設定 → 麥克風 → 允許';
      } else {
        status.textContent = '❌ ' + err.message;
      }
    }
  });
});
