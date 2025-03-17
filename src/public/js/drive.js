/**
 * Hàm khởi tạo
 */
document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo các sự kiện
  initEventListeners();
  
  // Tải danh sách file ban đầu
  loadFiles();
});

/**
 * Khởi tạo các sự kiện
 */
function initEventListeners() {
  // Nút đồng bộ file từ Telegram
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncFilesFromTelegram);
  }
  
  // Nút reset bot Telegram
  const resetBotBtn = document.getElementById('resetBotBtn');
  if (resetBotBtn) {
    resetBotBtn.addEventListener('click', resetTelegramBot);
  }
}

/**
 * Tải danh sách file
 */
async function loadFiles() {
  try {
    showLoadingSpinner();
    
    const response = await fetch('/api/files');
    const data = await response.json();
    
    if (data.success) {
      renderFiles(data.files);
    } else {
      showToast('error', `Lỗi: ${data.message}`);
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách file:', error);
    showToast('error', 'Đã xảy ra lỗi khi tải danh sách file');
  } finally {
    hideLoadingSpinner();
  }
}

/**
 * Hiển thị danh sách file
 */
function renderFiles(files) {
  const fileListContainer = document.getElementById('fileList');
  if (!fileListContainer) return;
  
  if (files.length === 0) {
    fileListContainer.innerHTML = '<div class="no-files">Không có file nào</div>';
    return;
  }
  
  fileListContainer.innerHTML = '';
  
  // Tạo HTML cho từng file
  files.forEach(file => {
    const fileEl = document.createElement('div');
    fileEl.className = 'file-item';
    fileEl.innerHTML = `
      <div class="file-icon">${getFileIcon(file.mimeType)}</div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">
          <span>${formatFileSize(file.size)}</span>
          <span>·</span>
          <span>${formatDate(file.uploadDate)}</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn btn-download" data-file-id="${file.id}">Tải xuống</button>
      </div>
    `;
    
    fileListContainer.appendChild(fileEl);
  });
  
  // Thêm sự kiện cho các nút
  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', () => {
      const fileId = btn.dataset.fileId;
      downloadFile(fileId);
    });
  });
}

/**
 * Đồng bộ file từ Telegram
 */
async function syncFilesFromTelegram() {
  try {
    showLoadingSpinner();
    
    const response = await fetch('/api/files/sync', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('success', `Đồng bộ thành công: ${data.added} file mới, ${data.updated} cập nhật`);
      loadFiles(); // Tải lại danh sách file
    } else {
      showToast('error', `Lỗi đồng bộ: ${data.message}`);
    }
  } catch (error) {
    console.error('Lỗi khi đồng bộ file:', error);
    showToast('error', 'Đã xảy ra lỗi khi đồng bộ file từ Telegram');
  } finally {
    hideLoadingSpinner();
  }
}

/**
 * Reset bot Telegram khi gặp lỗi
 */
async function resetTelegramBot() {
  try {
    showLoadingSpinner();
    
    const response = await fetch('/api/admin/reset-bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('success', 'Đã reset bot Telegram thành công');
      loadFiles(); // Tải lại danh sách file
    } else {
      showToast('error', `Lỗi: ${data.message}`);
    }
  } catch (error) {
    console.error('Lỗi khi reset bot:', error);
    showToast('error', 'Đã xảy ra lỗi khi reset bot Telegram');
  } finally {
    hideLoadingSpinner();
  }
}

/**
 * Hiển thị spinner khi đang tải
 */
function showLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'flex';
}

/**
 * Ẩn spinner khi đã tải xong
 */
function hideLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'none';
}

/**
 * Hiển thị thông báo
 */
function showToast(type, message) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Hiển thị toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

/**
 * Lấy icon cho loại file
 */
function getFileIcon(mimeType) {
  if (!mimeType) return '<i class="fas fa-file"></i>';
  
  if (mimeType.startsWith('image/')) {
    return '<i class="fas fa-file-image"></i>';
  } else if (mimeType.startsWith('video/')) {
    return '<i class="fas fa-file-video"></i>';
  } else if (mimeType.startsWith('audio/')) {
    return '<i class="fas fa-file-audio"></i>';
  } else if (mimeType === 'application/pdf') {
    return '<i class="fas fa-file-pdf"></i>';
  } else if (mimeType.includes('word') || mimeType === 'application/msword') {
    return '<i class="fas fa-file-word"></i>';
  } else if (mimeType.includes('excel') || mimeType === 'application/vnd.ms-excel') {
    return '<i class="fas fa-file-excel"></i>';
  } else if (mimeType.includes('zip') || mimeType === 'application/x-zip-compressed') {
    return '<i class="fas fa-file-archive"></i>';
  }
  
  return '<i class="fas fa-file"></i>';
}

/**
 * Format kích thước file
 */
function formatFileSize(size) {
  if (!size) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  
  return `${size.toFixed(2)} ${units[i]}`;
}

/**
 * Format ngày tháng
 */
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Tải file
 */
function downloadFile(fileId) {
  if (!fileId) return;
  
  window.location.href = `/api/files/${fileId}/download`;
} 