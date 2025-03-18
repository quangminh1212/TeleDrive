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