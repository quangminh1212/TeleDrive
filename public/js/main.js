/**
 * TeleDrive - Main JavaScript
 */

// Utility functions
const Utils = {
  // Format file size (e.g. 1.5 MB)
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Get file icon based on MIME type
  getFileIcon: function(mimeType) {
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('image/')) return '🖼️';
    else if (mimeType.startsWith('video/')) return '🎬';
    else if (mimeType.startsWith('audio/')) return '🎵';
    else if (mimeType.includes('pdf')) return '📑';
    else if (mimeType.includes('word')) return '📝';
    else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    else if (mimeType.includes('text/')) return '📝';
    else if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    
    return '📄';
  },
  
  // Truncate text to a certain length
  truncateText: function(text, maxLength = 30) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - 3) + '...';
  },
  
  // Get file type category from MIME type
  getFileCategory: function(mimeType) {
    if (!mimeType) return 'other';
    
    if (mimeType.startsWith('image/')) return 'photos';
    else if (mimeType.startsWith('video/')) return 'videos';
    else if (mimeType.startsWith('audio/')) return 'audio';
    else if (mimeType.includes('pdf') || 
            mimeType.includes('word') || 
            mimeType.includes('text/') || 
            mimeType.includes('excel') || 
            mimeType.includes('spreadsheet') ||
            mimeType.includes('presentation') || 
            mimeType.includes('powerpoint')) {
      return 'documents';
    }
    
    return 'other';
  },
  
  // Show notification
  showNotification: function(message, type = 'info') {
    // Check if notification container exists, otherwise create it
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3';
    notification.style.color = 'white';
    notification.style.padding = '15px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.cursor = 'pointer';
    notification.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.float = 'right';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '10px';
    closeBtn.onclick = function() {
      container.removeChild(notification);
    };
    
    notification.appendChild(closeBtn);
    container.appendChild(notification);
    
    // Auto close after 5 seconds
    setTimeout(() => {
      if (container.contains(notification)) {
        container.removeChild(notification);
      }
    }, 5000);
  }
};

// File API
const FileAPI = {
  // List files
  listFiles: function(options = {}) {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options.search) params.append('search', options.search);
    if (options.tag) params.append('tag', options.tag);
    if (options.type) params.append('type', options.type);
    if (options.trash) params.append('trash', 'true');
    
    return fetch(`/api/files?${params.toString()}`)
      .then(response => response.json());
  },
  
  // Upload file
  uploadFile: function(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', '/api/files/upload', true);
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });
      
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error occurred during upload'));
      };
      
      xhr.send(formData);
    });
  },
  
  // Download file
  downloadFile: function(fileId) {
    window.location.href = `/api/files/${fileId}/download`;
  },
  
  // Share file
  shareFile: function(fileId, expiresInHours = 24) {
    return fetch(`/api/files/${fileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresInHours }),
    })
      .then(response => response.json());
  },
  
  // Delete file
  deleteFile: function(fileId, permanent = false) {
    return fetch(`/api/files/${fileId}${permanent ? '?permanent=true' : ''}`, {
      method: 'DELETE',
    })
      .then(response => response.json());
  },
  
  // Restore file from trash
  restoreFile: function(fileId) {
    return fetch(`/api/files/${fileId}/restore`, {
      method: 'POST',
    })
      .then(response => response.json());
  },
  
  // Update file metadata
  updateFile: function(fileId, metadata) {
    return fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    })
      .then(response => response.json());
  },
};

// User API
const UserAPI = {
  // Get current user
  getCurrentUser: function() {
    return fetch('/api/auth/me')
      .then(response => response.json());
  },
  
  // Update user settings
  updateSettings: function(settings) {
    return fetch('/api/auth/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })
      .then(response => response.json());
  },
};

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // This code will run on all pages
  console.log('TeleDrive initialized');
});

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('nav ul');
  
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('show');
    });
  }
  
  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') return;
      
      e.preventDefault();
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (navMenu && navMenu.classList.contains('show')) {
          navMenu.classList.remove('show');
        }
      }
    });
  });
  
  // Handle file upload preview if on dashboard
  const fileInput = document.getElementById('file-upload');
  const filePreview = document.getElementById('file-preview');
  
  if (fileInput && filePreview) {
    fileInput.addEventListener('change', function() {
      // Clear previous preview
      filePreview.innerHTML = '';
      
      if (this.files && this.files.length > 0) {
        for (let i = 0; i < this.files.length; i++) {
          const file = this.files[i];
          const fileSize = Utils.formatFileSize(file.size);
          
          const fileItem = document.createElement('div');
          fileItem.className = 'file-preview-item';
          
          let fileIcon = Utils.getFileIcon(file.type);
          
          fileItem.innerHTML = `
            <div class="file-icon">${fileIcon}</div>
            <div class="file-info">
              <div class="file-name">${file.name}</div>
              <div class="file-size">${fileSize}</div>
            </div>
          `;
          
          filePreview.appendChild(fileItem);
        }
      }
    });
  }
});

// Xử lý upload file
function handleFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const uploadForm = document.getElementById('uploadForm');
  const uploadBtn = document.getElementById('uploadBtn');
  
  if (!fileInput || !uploadForm) return;
  
  // Thêm container cho thông báo và thanh tiến trình
  let uploadStatusContainer;
  if (!document.getElementById('uploadStatusContainer')) {
    uploadStatusContainer = document.createElement('div');
    uploadStatusContainer.id = 'uploadStatusContainer';
    uploadStatusContainer.className = 'upload-status-container';
    uploadForm.parentNode.insertBefore(uploadStatusContainer, uploadForm.nextSibling);
  } else {
    uploadStatusContainer = document.getElementById('uploadStatusContainer');
  }
  
  uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const files = fileInput.files;
    
    if (files.length === 0) {
      showNotification('Vui lòng chọn ít nhất một file để tải lên', 'error');
      return;
    }
    
    // Vô hiệu hóa nút upload
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải lên...';
    
    // Xử lý từng file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await uploadFile(file, uploadStatusContainer);
    }
    
    // Reset form
    uploadForm.reset();
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Tải lên';
    
    // Làm mới danh sách file
    if (typeof refreshFilesList === 'function') {
      refreshFilesList();
    }
  });
}

// Tải lên một file
async function uploadFile(file, statusContainer) {
  // Định dạng kích thước file
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Tạo item hiển thị trạng thái upload
  const uploadItem = document.createElement('div');
  uploadItem.className = 'upload-item';
  uploadItem.innerHTML = `
    <div class="upload-item-header">
      <span class="filename">${file.name}</span>
      <span class="filesize">(${formatSize(file.size)})</span>
      <span class="status">Đang chuẩn bị...</span>
    </div>
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: 0%"></div>
    </div>
    <div class="upload-actions">
      <button class="btn-cancel" data-filename="${file.name}">Hủy</button>
      <button class="btn-retry" data-filename="${file.name}" style="display: none;">Thử lại</button>
    </div>
  `;
  
  statusContainer.appendChild(uploadItem);
  
  const progressBarFill = uploadItem.querySelector('.progress-bar-fill');
  const statusText = uploadItem.querySelector('.status');
  const cancelBtn = uploadItem.querySelector('.btn-cancel');
  const retryBtn = uploadItem.querySelector('.btn-retry');
  
  // Xử lý nút hủy
  let isCancelled = false;
  cancelBtn.addEventListener('click', function() {
    isCancelled = true;
    statusText.textContent = 'Đã hủy';
    uploadItem.classList.add('cancelled');
    // Xóa item sau 3 giây
    setTimeout(() => {
      uploadItem.remove();
    }, 3000);
  });
  
  // Xử lý nút thử lại
  retryBtn.addEventListener('click', function() {
    // Ẩn nút thử lại, reset trạng thái
    retryBtn.style.display = 'none';
    statusText.textContent = 'Đang tải lên...';
    uploadItem.classList.remove('error');
    progressBarFill.style.width = '0%';
    
    // Tải lên lại file
    uploadFile(file, statusContainer);
  });
  
  // Nếu đã hủy, không tiếp tục
  if (isCancelled) return;
  
  try {
    // Tạo FormData để gửi file
    const formData = new FormData();
    formData.append('file', file);
    
    // Cập nhật UI
    statusText.textContent = 'Đang tải lên...';
    progressBarFill.style.width = '5%';
    
    // Gửi request với XMLHttpRequest để theo dõi tiến trình
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload', true);
    
    // Theo dõi tiến trình
    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBarFill.style.width = `${percent}%`;
        statusText.textContent = `Đang tải lên... ${percent}%`;
      }
    });
    
    // Xử lý khi hoàn thành
    xhr.addEventListener('load', function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        statusText.textContent = 'Tải lên thành công';
        progressBarFill.style.width = '100%';
        uploadItem.classList.add('success');
        
        // Xóa item sau 5 giây
        setTimeout(() => {
          uploadItem.remove();
        }, 5000);
      } else {
        let errorMessage = 'Tải lên thất bại';
        try {
          const response = JSON.parse(xhr.responseText);
          errorMessage = response.error || errorMessage;
        } catch (e) {
          console.error('Không thể phân tích phản hồi lỗi', e);
        }
        
        statusText.textContent = errorMessage;
        uploadItem.classList.add('error');
        progressBarFill.style.width = '100%';
        progressBarFill.style.backgroundColor = '#f44336';
        retryBtn.style.display = 'inline-block';
      }
    });
    
    // Xử lý lỗi
    xhr.addEventListener('error', function() {
      statusText.textContent = 'Lỗi kết nối';
      uploadItem.classList.add('error');
      progressBarFill.style.width = '100%';
      progressBarFill.style.backgroundColor = '#f44336';
      retryBtn.style.display = 'inline-block';
    });
    
    // Xử lý timeout
    xhr.addEventListener('timeout', function() {
      statusText.textContent = 'Quá thời gian kết nối';
      uploadItem.classList.add('error');
      progressBarFill.style.width = '100%';
      progressBarFill.style.backgroundColor = '#f44336';
      retryBtn.style.display = 'inline-block';
    });
    
    // Gửi request
    xhr.send(formData);
  } catch (error) {
    console.error('Lỗi khi tải lên file:', error);
    statusText.textContent = `Lỗi: ${error.message}`;
    uploadItem.classList.add('error');
    progressBarFill.style.width = '100%';
    progressBarFill.style.backgroundColor = '#f44336';
    retryBtn.style.display = 'inline-block';
  }
}

// Hiển thị thông báo
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
      <button class="close-notification">&times;</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Xử lý nút đóng
  const closeBtn = notification.querySelector('.close-notification');
  closeBtn.addEventListener('click', function() {
    notification.remove();
  });
  
  // Tự động đóng sau 5 giây
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
  handleFileUpload();
  
  // Thêm CSS nếu chưa có
  if (!document.getElementById('upload-styles')) {
    const style = document.createElement('style');
    style.id = 'upload-styles';
    style.innerHTML = `
      .upload-status-container {
        margin-top: 20px;
      }
      .upload-item {
        background-color: #f9f9f9;
        border-radius: 4px;
        padding: 10px;
        margin-bottom: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .upload-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }
      .filename {
        font-weight: bold;
        margin-right: 5px;
      }
      .filesize {
        color: #666;
      }
      .status {
        margin-left: auto;
      }
      .progress-bar {
        height: 6px;
        background-color: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 5px;
      }
      .progress-bar-fill {
        height: 100%;
        background-color: #4caf50;
        width: 0;
        transition: width 0.3s;
      }
      .upload-actions {
        display: flex;
        justify-content: flex-end;
      }
      .upload-actions button {
        border: none;
        padding: 3px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 5px;
      }
      .btn-cancel {
        background-color: #f44336;
        color: white;
      }
      .btn-retry {
        background-color: #2196f3;
        color: white;
      }
      .upload-item.success .status {
        color: #4caf50;
      }
      .upload-item.error .status {
        color: #f44336;
      }
      .upload-item.cancelled .status {
        color: #ff9800;
      }
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
        z-index: 9999;
      }
      .notification-content {
        display: flex;
        align-items: center;
      }
      .notification.info {
        background-color: #2196f3;
        color: white;
      }
      .notification.success {
        background-color: #4caf50;
        color: white;
      }
      .notification.error {
        background-color: #f44336;
        color: white;
      }
      .notification.warning {
        background-color: #ff9800;
        color: white;
      }
      .close-notification {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        margin-left: 10px;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
}); 