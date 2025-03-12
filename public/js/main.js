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
  let sessionId = localStorage.getItem('sessionId');
  let username = localStorage.getItem('username');
  let currentUser = null;
  let useWebClientUpload = true; // Đặt mặc định là true khi mở trực tiếp
  let useTelegramBot = false;
  
  // Biến để nhận biết khi nào đang mở trực tiếp
  const isDirectOpen = window.location.protocol === 'file:';

  // Check authentication status
  async function checkAuthStatus() {
    try {
      // Nếu mở trực tiếp, hiển thị UI mặc định thay vì gọi API
      if (isDirectOpen) {
        console.log('Mở file trực tiếp, hiển thị UI mặc định');
        updateUIForDirectOpen();
        return;
      }

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
        checkTelegramAuthStatus();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Xử lý khi không thể kết nối đến máy chủ
      updateUIForDirectOpen();
    }
  }
  
  // Cập nhật UI khi mở trực tiếp không có máy chủ
  function updateUIForDirectOpen() {
    const loginStatus = document.getElementById('loginStatus');
    if (!loginStatus) return;
    
    // Hiển thị nút login và thông báo
    loginStatus.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <strong>Mở trực tiếp:</strong> Một số tính năng sẽ không hoạt động. Hãy chạy server Node.js để có trải nghiệm đầy đủ.
      </div>
      <button class="btn btn-primary telegram-login-btn" onclick="openTelegramLogin()">
        <i class="bi bi-telegram"></i> <span>Đăng nhập Web</span>
      </button>
      <button class="btn btn-info telegram-api-login-btn ms-2" onclick="openTelegramApiLogin()">
        <i class="bi bi-shield-lock"></i> <span>API Đăng nhập</span>
      </button>
    `;
    
    // Thêm dữ liệu mẫu để hiển thị giao diện
    const filesContainer = document.querySelector('.files-grid');
    if (filesContainer) {
      renderSampleFiles();
    }
  }
  
  // Hiển thị dữ liệu mẫu để demo giao diện
  function renderSampleFiles() {
    const filesContainer = document.querySelector('.files-grid');
    if (!filesContainer) return;
    
    const sampleFiles = [
      { name: 'document.pdf', type: 'application/pdf', size: 1.2 * 1024 * 1024, modifiedAt: new Date() - 86400000 * 7 },
      { name: 'image.jpg', type: 'image/jpeg', size: 2.5 * 1024 * 1024, modifiedAt: new Date() - 86400000 * 2 },
      { name: 'video.mp4', type: 'video/mp4', size: 15 * 1024 * 1024, modifiedAt: new Date() - 86400000 * 5 },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 0.8 * 1024 * 1024, modifiedAt: new Date() - 86400000 },
      { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 3.2 * 1024 * 1024, modifiedAt: new Date() - 86400000 * 10 },
    ];
    
    filesContainer.innerHTML = '';
    
    sampleFiles.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.dataset.type = file.type.split('/')[0];
      
      const modifiedDaysAgo = Math.round((new Date() - file.modifiedAt) / (1000 * 60 * 60 * 24));
      
      fileItem.innerHTML = `
        <i class="bi ${getFileIcon(file.type)} file-icon"></i>
        <p class="file-name">${file.name}</p>
        <p class="file-info">${formatFileSize(file.size)} • ${modifiedDaysAgo} ngày trước</p>
      `;
      
      filesContainer.appendChild(fileItem);
    });
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

  // Telegram Web Integration
  let telegramLoggedIn = localStorage.getItem('telegramLoggedIn') === 'true';

  // Kiểm tra trạng thái đăng nhập Telegram
  function checkTelegramAuthStatus() {
    if (telegramLoggedIn) {
      document.querySelector('.telegram-login-btn').classList.add('d-none');
      document.querySelector('.user-info').classList.remove('d-none');
      loadUserFiles();
    } else {
      document.querySelector('.telegram-login-btn').classList.remove('d-none');
      document.querySelector('.user-info').classList.add('d-none');
    }
  }

  // Xử lý khi người dùng đăng nhập bằng Telegram Web
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'telegram_login_success') {
      telegramLoggedIn = true;
      localStorage.setItem('telegramLoggedIn', 'true');
      
      // Cập nhật giao diện
      checkTelegramAuthStatus();
      
      // Thông báo thành công
      showNotification('Đăng nhập thành công!', 'success');
    }
  });

  // Mở cửa sổ đăng nhập Telegram Web
  function openTelegramLogin() {
    const width = 800;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const loginWindow = window.open('/telegram-login', 'telegram-login', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`);
    
    // Focus vào cửa sổ mới
    if (loginWindow) loginWindow.focus();
  }

  // Mở cửa sổ đăng nhập Telegram API
  function openTelegramApiLogin() {
    const width = 450;
    const height = 650;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const loginWindow = window.open('/telegram-api-login', 'telegram-api-login', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`);
    
    // Focus vào cửa sổ mới
    if (loginWindow) loginWindow.focus();
  }

  // Đăng xuất khỏi Telegram
  function logoutTelegram() {
    // Đóng dropdown
    document.querySelector('.user-dropdown').classList.add('d-none');
    
    // Xóa trạng thái đăng nhập
    localStorage.removeItem('telegramLoggedIn');
    
    // Cập nhật giao diện
    checkTelegramAuthStatus();
    
    // Hiển thị thông báo
    showNotification('Đã đăng xuất khỏi Telegram', 'info');
  }

  // Hiển thị thông báo
  function showNotification(message, type = 'info') {
    // Tạo container nếu chưa có
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
    
    // Tạo toast
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Nội dung toast
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'info' ? 'info-circle' : 'exclamation-circle'}"></i> 
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    
    // Thêm vào container
    toastContainer.appendChild(toast);
    
    // Sử dụng Bootstrap để hiển thị toast
    const bsToast = new bootstrap.Toast(toast, {
      autohide: true,
      delay: 5000
    });
    bsToast.show();
    
    // Xóa toast sau khi ẩn
    toast.addEventListener('hidden.bs.toast', function() {
      toast.remove();
    });
  }

  // Tạo container cho toast nếu chưa có
  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
  }

  // Load user files
  async function loadUserFiles() {
    const filesGrid = document.querySelector('.files-grid');
    if (!filesGrid) return;
    
    // Hiển thị trạng thái đang tải
    filesGrid.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">Đang tải danh sách tệp...</p>
      </div>
    `;
    
    try {
      // Gọi API để lấy danh sách tệp
      const response = await fetch('/api/files');
      const data = await response.json();
      
      // Nếu không có tệp nào
      if (!data.files || data.files.length === 0) {
        filesGrid.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-cloud-upload fs-1 text-muted"></i>
            <p class="mt-3">Bạn chưa có tệp nào. Hãy tải lên tệp đầu tiên!</p>
          </div>
        `;
        return;
      }
      
      // Hiển thị danh sách tệp
      renderFiles(data.files);
    } catch (error) {
      console.error('Error loading files:', error);
      filesGrid.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
          <p class="mt-3">Không thể tải danh sách tệp. Vui lòng thử lại sau.</p>
        </div>
      `;
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

  // Hàm lấy icon dựa vào loại file
  function getFileIcon(fileType) {
    const type = fileType.split('/')[0];
    const extension = fileType.split('/')[1];
    
    switch (type) {
      case 'image':
        return 'bi-file-earmark-image';
      case 'video':
        return 'bi-file-earmark-play';
      case 'audio':
        return 'bi-file-earmark-music';
      case 'application':
        if (fileType.includes('pdf')) return 'bi-file-earmark-pdf';
        if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('sheet')) 
          return 'bi-file-earmark-excel';
        if (fileType.includes('presentation') || fileType.includes('powerpoint')) 
          return 'bi-file-earmark-slides';
        if (fileType.includes('document') || fileType.includes('word')) 
          return 'bi-file-earmark-word';
        if (fileType.includes('zip') || fileType.includes('compressed') || fileType.includes('archive')) 
          return 'bi-file-earmark-zip';
        return 'bi-file-earmark';
      default:
        return 'bi-file-earmark';
    }
  }
  
  // Hàm format kích thước file
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

  // Kiểm tra cấu hình Telegram khi trang được tải
  async function checkTelegramConfig() {
    try {
      const response = await fetch('/api/telegram/config');
      const config = await response.json();
      
      console.log('Telegram config:', config);
      
      // Cập nhật biến toàn cục
      useTelegramBot = config.useTelegramBot;
      useWebClientUpload = config.useWebClientUpload;
      
      // Hiển thị thông tin cấu hình trong giao diện nếu cần
      const configInfo = document.getElementById('configInfo');
      if (configInfo) {
        if (config.useTelegramBot) {
          configInfo.innerHTML = '<div class="alert alert-success">Đã kết nối với Telegram Bot</div>';
        } else if (config.useWebClientUpload) {
          configInfo.innerHTML = '<div class="alert alert-info">Sử dụng Web Client để upload file lên Telegram</div>';
        } else {
          configInfo.innerHTML = '<div class="alert alert-warning">Chưa cấu hình Telegram Bot</div>';
        }
      }
      
      // Cập nhật đường dẫn upload folder
      const uploadFolderPath = document.getElementById('uploadFolderPath');
      if (uploadFolderPath && config.uploadPath) {
        uploadFolderPath.textContent = config.uploadPath;
      }
    } catch (error) {
      console.error('Error checking Telegram config:', error);
    }
  }

  // Hàm xử lý upload file
  async function uploadFile(file, uploadItem) {
    const formData = new FormData();
    formData.append('file', file);
    
    const progressBar = uploadItem.querySelector('.progress-bar');
    const statusText = uploadItem.querySelector('small');
    
    try {
      // Sử dụng XMLHttpRequest để theo dõi tiến trình
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Theo dõi tiến trình
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = `${percentComplete}%`;
            statusText.textContent = `${percentComplete}%`;
          }
        });
        
        // Xử lý khi hoàn thành
        xhr.onload = function() {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.success) {
                progressBar.classList.add('bg-success');
                statusText.textContent = 'Đã lưu cục bộ';
                
                // Hiển thị thông báo đồng bộ với Telegram
                if (data.file.webClientUpload && data.file.showTelegramGuide) {
                  // Kiểm tra nếu người dùng đã đăng nhập vào Telegram
                  const isTelegramLoggedIn = localStorage.getItem('telegramWebLoggedIn') === 'true';
                  
                  // Cập nhật giao diện uploadItem để thêm nút đồng bộ với Telegram
                  const uploadItemContainer = uploadItem.querySelector('.d-flex');
                  
                  // Tạo biểu tượng Telegram
                  const telegramIcon = document.createElement('button');
                  telegramIcon.className = 'ms-2 btn btn-sm btn-outline-primary';
                  telegramIcon.innerHTML = '<i class="bi bi-telegram"></i>';
                  telegramIcon.title = 'Đồng bộ lên Telegram';
                  
                  // Sự kiện click mở hướng dẫn đồng bộ lên Telegram
                  telegramIcon.addEventListener('click', () => {
                    const telegramUploadGuideModal = new bootstrap.Modal(document.getElementById('telegramUploadGuideModal'));
                    
                    // Cập nhật đường dẫn file cần upload trong modal
                    const uploadFolderPath = document.getElementById('uploadFolderPath');
                    if (uploadFolderPath) {
                      uploadFolderPath.textContent = data.file.path;
                    }
                    
                    telegramUploadGuideModal.show();
                  });
                  
                  uploadItemContainer.appendChild(telegramIcon);
                  
                  // Nếu chưa đăng nhập Telegram, hiện modal hướng dẫn đăng nhập
                  if (!isTelegramLoggedIn) {
                    setTimeout(() => {
                      const shouldOpenTelegram = confirm('Bạn chưa đăng nhập Telegram Web. Đăng nhập ngay để đồng bộ file lên Telegram?');
                      if (shouldOpenTelegram) {
                        openTelegramLogin();
                      } else {
                        showNotification('Bạn có thể đồng bộ file lên Telegram bằng cách nhấp vào biểu tượng Telegram bên cạnh file', 'info');
                      }
                    }, 500);
                  } else {
                    // Đã đăng nhập, hiện modal hướng dẫn đồng bộ file
                    setTimeout(() => {
                      const telegramUploadGuideModal = new bootstrap.Modal(document.getElementById('telegramUploadGuideModal'));
                      
                      // Cập nhật đường dẫn file cần upload trong modal
                      const uploadFolderPath = document.getElementById('uploadFolderPath');
                      if (uploadFolderPath) {
                        uploadFolderPath.textContent = data.file.path;
                      }
                      
                      telegramUploadGuideModal.show();
                    }, 500);
                  }
                }
                
                // Cập nhật danh sách file
                loadUserFiles();
                
                // Xóa item sau 5 giây
                setTimeout(() => {
                  uploadItem.classList.add('fade-out');
                  setTimeout(() => {
                    uploadItem.remove();
                  }, 500);
                }, 5000);
                
                resolve(data);
              } else {
                progressBar.classList.add('bg-danger');
                statusText.textContent = data.error || 'Upload failed';
                reject(new Error(data.error || 'Upload failed'));
              }
            } catch (error) {
              progressBar.classList.add('bg-danger');
              statusText.textContent = 'Error parsing response';
              reject(error);
            }
          } else {
            progressBar.classList.add('bg-danger');
            statusText.textContent = `Error: ${xhr.status}`;
            reject(new Error(`HTTP error ${xhr.status}`));
          }
        };
        
        // Xử lý lỗi
        xhr.onerror = function() {
          progressBar.classList.add('bg-danger');
          statusText.textContent = 'Network error';
          reject(new Error('Network error'));
        };
        
        // Gửi request
        xhr.open('POST', '/api/upload', true);
        xhr.setRequestHeader('Authorization', sessionId || '');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error:', error);
      progressBar.classList.add('bg-danger');
      statusText.textContent = 'Error';
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
  checkTelegramAuthStatus();

  // Kiểm tra cấu hình Telegram
  checkTelegramConfig();

  // Xử lý đăng xuất
  document.querySelector('.user-info')?.addEventListener('click', () => {
    if (confirm('Bạn có muốn đăng xuất khỏi TeleDrive không?')) {
      logoutTelegram();
    }
  });

  // Xử lý menu dropdown khi click vào avatar
  document.addEventListener('DOMContentLoaded', function() {
    const userInfo = document.querySelector('.user-info');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userInfo && userDropdown) {
      // Mở/đóng dropdown khi click vào avatar
      userInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('d-none');
      });
      
      // Đóng dropdown khi click bên ngoài
      document.addEventListener('click', function() {
        userDropdown.classList.add('d-none');
      });
      
      // Ngăn dropdown đóng khi click vào nó
      userDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
    
    // Chạy kiểm tra đăng nhập Telegram
    checkTelegramAuthStatus();
  });

  // Kiểm tra trạng thái đăng nhập Telegram Web
  function checkTelegramWebLoginStatus() {
    // Thử đọc cookie hoặc localStorage từ Telegram Web
    // Đây là phương pháp đơn giản, cần cải thiện để phát hiện chính xác
    const isTelegramWebLoggedIn = localStorage.getItem('telegramWebLoggedIn') === 'true';
    
    if (isTelegramWebLoggedIn) {
      // Cập nhật giao diện nếu đã đăng nhập
      updateUIForTelegramLogin();
    } else {
      // Hiển thị nút đăng nhập Telegram
      const loginBtn = document.querySelector('.telegram-login-btn');
      if (loginBtn) {
        loginBtn.classList.remove('d-none');
      }
    }
  }

  // Cập nhật giao diện sau khi đăng nhập Telegram Web thành công
  function updateUIForTelegramLogin() {
    const loginBtn = document.querySelector('.telegram-login-btn');
    const userInfo = document.querySelector('.user-info');
    
    if (loginBtn && userInfo) {
      loginBtn.classList.add('d-none');
      userInfo.classList.remove('d-none');
    }
    
    // Hiển thị thông báo thành công
    showNotification('Đã kết nối với Telegram Web thành công!', 'success');
  }

  // Kiểm tra trạng thái sau khi cửa sổ Telegram đóng
  function checkTelegramAfterWindowClosed() {
    // Giả định đăng nhập thành công sau khi cửa sổ đóng
    // Trong thực tế, cần cơ chế kiểm tra tốt hơn
    localStorage.setItem('telegramWebLoggedIn', 'true');
    updateUIForTelegramLogin();
    
    // Tải lại danh sách file
    loadUserFiles();
  }

  // Lắng nghe thông báo từ cửa sổ đăng nhập Telegram
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'telegram_login_success') {
      localStorage.setItem('telegramWebLoggedIn', 'true');
      updateUIForTelegramLogin();
      
      // Tải lại danh sách file
      loadUserFiles();
    }
  });
}); 