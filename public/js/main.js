// Theme switcher
document.addEventListener('DOMContentLoaded', () => {
  const themeSwitch = document.getElementById('theme-switch');
  const htmlElement = document.documentElement;
  
  // Set initial theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  htmlElement.setAttribute('data-bs-theme', savedTheme);
  themeSwitch.checked = savedTheme === 'dark';

  themeSwitch.addEventListener('change', () => {
    const theme = themeSwitch.checked ? 'dark' : 'light';
    htmlElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  });

  // Mobile menu
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !e.target.closest('.sidebar') && 
        !e.target.closest('#menu-toggle') &&
        sidebar.classList.contains('show')) {
      sidebar.classList.remove('show');
    }
  });

  // File preview
  const fileItems = document.querySelectorAll('.file-item');
  const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
  
  fileItems.forEach(item => {
    item.addEventListener('click', () => {
      // Get file info
      const fileName = item.querySelector('.file-name').textContent;
      const fileType = item.dataset.type;
      
      // Update modal content based on file type
      const previewContainer = document.querySelector('.file-preview-container');
      const previewTitle = document.querySelector('#previewModal .modal-title');
      
      previewTitle.textContent = fileName;
      
      // Clear previous preview
      previewContainer.innerHTML = '';
      
      // Show preview based on file type
      if (fileType === 'image') {
        const img = document.createElement('img');
        img.src = item.dataset.url;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '80vh';
        previewContainer.appendChild(img);
      } else if (fileType === 'video') {
        const video = document.createElement('video');
        video.src = item.dataset.url;
        video.controls = true;
        video.style.maxWidth = '100%';
        previewContainer.appendChild(video);
      } else {
        // For other file types, show icon and info
        previewContainer.innerHTML = `
          <div class="text-center">
            <i class="bi bi-file-earmark fs-1 mb-3"></i>
            <p>${fileName}</p>
          </div>
        `;
      }
      
      previewModal.show();
    });
  });

  // File upload
  const uploadInput = document.getElementById('upload-input');
  const uploadProgress = document.querySelector('.upload-progress');
  const uploadItems = document.querySelector('.upload-progress-items');

  if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      
      files.forEach(file => {
        // Create upload item
        const uploadItem = document.createElement('div');
        uploadItem.className = 'upload-item';
        uploadItem.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-truncate">${file.name}</span>
            <small>0%</small>
          </div>
          <div class="progress" style="height: 4px;">
            <div class="progress-bar" role="progressbar" style="width: 0%"></div>
          </div>
        `;
        
        uploadItems.appendChild(uploadItem);
        
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // Remove item after completion
            setTimeout(() => {
              uploadItem.remove();
              
              // Hide progress container if empty
              if (!uploadItems.children.length) {
                uploadProgress.style.display = 'none';
              }
            }, 1000);
          }
          
          uploadItem.querySelector('.progress-bar').style.width = `${progress}%`;
          uploadItem.querySelector('small').textContent = `${Math.round(progress)}%`;
        }, 200);
      });
      
      // Show progress container
      uploadProgress.style.display = 'block';
    });
  }

  // View options
  const viewOptions = document.querySelectorAll('.view-options button');
  const filesContainer = document.querySelector('.files-container');
  
  viewOptions.forEach(option => {
    option.addEventListener('click', () => {
      const view = option.dataset.view;
      
      // Update active state
      viewOptions.forEach(btn => btn.classList.remove('active'));
      option.classList.add('active');
      
      // Update view
      filesContainer.className = `files-container ${view}-view`;
    });
  });
}); 