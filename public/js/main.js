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

  // Authentication State
  let isAuthenticated = false;
  let currentUser = null;
  let sessionId = localStorage.getItem('sessionId');

  // Check authentication status
  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status', {
        headers: {
          'Authorization': sessionId || ''
        }
      });
      const data = await response.json();
      
      if (data.authenticated) {
        isAuthenticated = true;
        currentUser = data.user;
        updateUIForAuthenticatedUser();
      } else {
        showLoginModal();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showLoginModal();
    }
  }

  // Update UI for authenticated user
  function updateUIForAuthenticatedUser() {
    const userProfile = document.querySelector('.user-profile');
    const username = userProfile.querySelector('.username');
    
    username.textContent = currentUser.name;
    if (currentUser.avatar) {
      userProfile.querySelector('.avatar').src = currentUser.avatar;
    }
    
    loadUserFiles();
  }

  // Show login modal
  function showLoginModal() {
    // Create login modal if it doesn't exist
    if (!document.getElementById('loginModal')) {
      const modalHTML = `
        <div class="modal fade" id="loginModal" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Login with Telegram</h5>
              </div>
              <div class="modal-body">
                <p>Enter your phone number to connect with Telegram:</p>
                <div class="mb-3">
                  <input type="tel" class="form-control" id="phoneNumber" placeholder="+84123456789">
                  <div class="form-text">We'll send a code to this number</div>
                </div>
                <div id="confirmCodeContainer" class="mb-3 d-none">
                  <input type="text" class="form-control" id="confirmCode" placeholder="Enter code">
                </div>
                <div id="loginMessage" class="alert alert-info d-none"></div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="telegramLoginBtn">Send Code</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer.firstElementChild);
      
      // Add event listener for login button
      document.getElementById('telegramLoginBtn').addEventListener('click', handleTelegramLogin);
    }
    
    // Show the modal
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
  }

  // Handle Telegram login
  async function handleTelegramLogin() {
    const phoneNumber = document.getElementById('phoneNumber').value;
    const messageElement = document.getElementById('loginMessage');
    const loginButton = document.getElementById('telegramLoginBtn');
    
    if (!phoneNumber) {
      messageElement.textContent = 'Please enter a valid phone number';
      messageElement.classList.remove('d-none', 'alert-info');
      messageElement.classList.add('alert-danger');
      return;
    }
    
    try {
      messageElement.textContent = 'Authenticating...';
      messageElement.classList.remove('d-none', 'alert-danger');
      messageElement.classList.add('alert-info');
      loginButton.disabled = true;
      
      // In a real implementation, this would involve a multi-step process with Telegram API
      // For this demo, we're simulating the login
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        sessionId = data.sessionId;
        currentUser = data.user;
        isAuthenticated = true;
        
        // Save session ID to localStorage
        localStorage.setItem('sessionId', sessionId);
        
        // Update UI
        messageElement.textContent = 'Login successful! Redirecting...';
        messageElement.classList.remove('alert-danger');
        messageElement.classList.add('alert-success');
        
        // Close modal after a delay
        setTimeout(() => {
          bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
          updateUIForAuthenticatedUser();
        }, 1500);
      } else {
        messageElement.textContent = data.error || 'Authentication failed';
        messageElement.classList.remove('alert-info');
        messageElement.classList.add('alert-danger');
        loginButton.disabled = false;
      }
    } catch (error) {
      console.error('Login error:', error);
      messageElement.textContent = 'Connection error. Please try again.';
      messageElement.classList.remove('alert-info');
      messageElement.classList.add('alert-danger');
      loginButton.disabled = false;
    }
  }

  // Load user files
  async function loadUserFiles() {
    if (!isAuthenticated || !sessionId) return;
    
    try {
      const response = await fetch('/api/files', {
        headers: {
          'Authorization': sessionId
        }
      });
      
      const data = await response.json();
      renderFiles(data.files);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  // Render files in the grid
  function renderFiles(files) {
    const filesGrid = document.querySelector('.files-grid');
    
    // Clear existing files
    filesGrid.innerHTML = '';
    
    if (!files || files.length === 0) {
      filesGrid.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-cloud-upload fs-1 text-muted"></i>
          <p class="mt-3">No files yet. Upload your first file!</p>
        </div>
      `;
      return;
    }
    
    // Add file items
    files.forEach(file => {
      const fileIcon = getFileIcon(file.mimeType);
      const fileSize = formatFileSize(file.size);
      const dateFormatted = new Date(file.uploaded).toLocaleDateString();
      
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.dataset.id = file.id;
      fileItem.dataset.type = file.mimeType.split('/')[0];
      
      fileItem.innerHTML = `
        <i class="${fileIcon} file-icon"></i>
        <p class="file-name">${file.name}</p>
        <p class="file-info">${fileSize} • ${dateFormatted}</p>
      `;
      
      filesGrid.appendChild(fileItem);
    });
    
    // Re-attach click events
    attachFileEvents();
  }

  // Get appropriate icon for file type
  function getFileIcon(mimeType) {
    if (!mimeType) return 'bi bi-file';
    
    if (mimeType.startsWith('image/')) {
      return 'bi bi-file-image';
    } else if (mimeType.startsWith('video/')) {
      return 'bi bi-file-play';
    } else if (mimeType.startsWith('audio/')) {
      return 'bi bi-file-music';
    } else if (mimeType.includes('pdf')) {
      return 'bi bi-file-pdf';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'bi bi-file-word';
    } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return 'bi bi-file-excel';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return 'bi bi-file-ppt';
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      return 'bi bi-file-zip';
    } else {
      return 'bi bi-file-earmark';
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Attach events to file items
  function attachFileEvents() {
    const fileItems = document.querySelectorAll('.file-item');
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'), {
      keyboard: true
    });
    
    fileItems.forEach(item => {
      item.addEventListener('click', () => {
        const fileId = item.dataset.id;
        const fileName = item.querySelector('.file-name').textContent;
        const fileType = item.dataset.type;
        
        // Update modal content
        const previewTitle = document.querySelector('#previewModal .modal-title');
        const previewContainer = document.querySelector('.file-preview-container');
        
        previewTitle.textContent = fileName;
        previewContainer.innerHTML = '';
        
        // Add download link to button
        const downloadBtn = document.querySelector('#previewModal .btn-primary');
        downloadBtn.onclick = () => {
          window.location.href = `/api/files/${fileId}?token=${sessionId}`;
        };
        
        // Show different preview based on file type
        if (fileType === 'image') {
          previewContainer.innerHTML = `
            <img src="/api/files/${fileId}?token=${sessionId}" class="img-fluid" alt="${fileName}">
          `;
        } else if (fileType === 'video') {
          previewContainer.innerHTML = `
            <video controls class="w-100">
              <source src="/api/files/${fileId}?token=${sessionId}" type="video/mp4">
              Your browser does not support video playback.
            </video>
          `;
        } else if (fileType === 'audio') {
          previewContainer.innerHTML = `
            <audio controls class="w-100">
              <source src="/api/files/${fileId}?token=${sessionId}">
              Your browser does not support audio playback.
            </audio>
          `;
        } else {
          // Generic file preview
          previewContainer.innerHTML = `
            <div class="text-center p-5">
              <i class="${getFileIcon(fileType)} fs-1 mb-3"></i>
              <p>${fileName}</p>
              <button class="btn btn-primary mt-3" onclick="window.location.href='/api/files/${fileId}?token=${sessionId}'">
                <i class="bi bi-download"></i> Download
              </button>
            </div>
          `;
        }
        
        previewModal.show();
      });
    });
  }

  // Handle file upload
  const uploadInput = document.getElementById('upload-input');
  const uploadProgress = document.querySelector('.upload-progress');
  const uploadItems = document.querySelector('.upload-progress-items');

  if (uploadInput) {
    uploadInput.addEventListener('change', async (e) => {
      if (!isAuthenticated) {
        showLoginModal();
        return;
      }
      
      const files = Array.from(e.target.files);
      
      // Show progress container
      uploadProgress.style.display = 'block';
      
      for (const file of files) {
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
        
        // Upload file
        await uploadFile(file, uploadItem);
      }
      
      // Reload files list after all uploads
      loadUserFiles();
    });
  }

  // Upload single file
  async function uploadFile(file, uploadItem) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const xhr = new XMLHttpRequest();
      
      // Setup progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          
          uploadItem.querySelector('.progress-bar').style.width = `${percentComplete}%`;
          uploadItem.querySelector('small').textContent = `${percentComplete}%`;
        }
      });
      
      // Handle completion
      xhr.onload = function() {
        if (xhr.status === 200) {
          // Success
          uploadItem.querySelector('.progress-bar').classList.add('bg-success');
          
          // Remove item after delay
          setTimeout(() => {
            uploadItem.classList.add('fade-out');
            setTimeout(() => {
              uploadItem.remove();
              
              // Hide container if empty
              if (!uploadItems.children.length) {
                uploadProgress.style.display = 'none';
              }
            }, 500);
          }, 1000);
        } else {
          // Error
          uploadItem.querySelector('.progress-bar').classList.add('bg-danger');
          uploadItem.querySelector('small').textContent = 'Error';
        }
      };
      
      // Handle error
      xhr.onerror = function() {
        uploadItem.querySelector('.progress-bar').classList.add('bg-danger');
        uploadItem.querySelector('small').textContent = 'Failed';
      };
      
      // Send request
      xhr.open('POST', '/api/upload', true);
      xhr.setRequestHeader('Authorization', sessionId);
      xhr.send(formData);
      
      // Wait for completion
      return new Promise((resolve) => {
        xhr.onloadend = resolve;
      });
    } catch (error) {
      console.error('Upload error:', error);
      uploadItem.querySelector('.progress-bar').classList.add('bg-danger');
      uploadItem.querySelector('small').textContent = 'Failed';
    }
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
      if (view === 'list') {
        filesContainer.classList.remove('grid-view');
        filesContainer.classList.add('list-view');
      } else {
        filesContainer.classList.remove('list-view');
        filesContainer.classList.add('grid-view');
      }
    });
  });

  // Initialize
  checkAuthStatus();
}); 