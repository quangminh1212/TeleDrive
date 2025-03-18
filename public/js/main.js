/**
 * Main JavaScript file for TeleDrive
 */

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
          const fileSize = formatFileSize(file.size);
          
          const fileItem = document.createElement('div');
          fileItem.className = 'file-preview-item';
          
          let fileIcon = getFileIcon(file.type);
          
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

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on file type
 * @param {string} mimeType - File MIME type
 * @returns {string} - Icon HTML
 */
function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  } else if (mimeType.startsWith('video/')) {
    return '🎬';
  } else if (mimeType.startsWith('audio/')) {
    return '🎵';
  } else if (mimeType.includes('pdf')) {
    return '📄';
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return '📝';
  } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return '📊';
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return '📽️';
  } else if (mimeType.includes('text/')) {
    return '📄';
  } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return '🗜️';
  } else {
    return '📁';
  }
} 