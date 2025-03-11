// State management
let currentFolderId = null;
let currentPath = [];
let selectedFile = null;

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const username = document.getElementById('username');
const loginRequired = document.getElementById('login-required');
const mainContent = document.getElementById('main-content');
const filesContainer = document.getElementById('files-container');
const breadcrumb = document.getElementById('breadcrumb');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const newFolderBtn = document.getElementById('new-folder-btn');

// Bootstrap modals
const newFolderModal = new bootstrap.Modal(document.getElementById('new-folder-modal'));
const fileOptionsModal = new bootstrap.Modal(document.getElementById('file-options-modal'));
const renameModal = new bootstrap.Modal(document.getElementById('rename-modal'));

// API endpoints
const API = {
  FILES: '/api/files',
  FOLDERS: '/api/folders',
  UPLOAD: '/api/files/upload',
  DOWNLOAD: '/api/files/download',
  SEARCH: '/api/files/search'
};

// Check login status on page load
checkLoginStatus();

// Event listeners
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') handleSearch();
});
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
newFolderBtn.addEventListener('click', () => newFolderModal.show());
document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolder);

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFileDrop(e.dataTransfer.files);
});

// Functions
async function checkLoginStatus() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    
    if (data.success) {
      showLoggedInState(data.user);
      loadFiles();
    } else {
      showLoggedOutState();
    }
  } catch (error) {
    console.error('Error checking login status:', error);
    showLoggedOutState();
  }
}

function showLoggedInState(user) {
  loginBtn.classList.add('d-none');
  userInfo.classList.remove('d-none');
  username.textContent = user.username || user.firstName;
  loginRequired.classList.add('d-none');
  mainContent.classList.remove('d-none');
}

function showLoggedOutState() {
  loginBtn.classList.remove('d-none');
  userInfo.classList.add('d-none');
  loginRequired.classList.remove('d-none');
  mainContent.classList.add('d-none');
}

async function handleLogin() {
  alert('Please run the application locally and follow the terminal instructions to login.');
}

async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout');
    const data = await response.json();
    
    if (data.success) {
      showLoggedOutState();
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

async function loadFiles(folderId = null) {
  try {
    const url = new URL(API.FILES, window.location.origin);
    if (folderId) url.searchParams.append('folder_id', folderId);
    
    const response = await fetch(url);
    const files = await response.json();
    
    displayFiles(files);
    updateBreadcrumb();
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

function displayFiles(files) {
  filesContainer.innerHTML = files.map(file => `
    <div class="file-item list-group-item list-group-item-action d-flex justify-content-between align-items-center"
         data-id="${file.id}"
         data-is-folder="${file.is_folder}"
         onclick="handleFileClick(event, '${file.id}')">
      <div>
        <i class="bi ${file.is_folder ? 'bi-folder-fill folder-icon' : 'bi-file-earmark file-icon'} me-2"></i>
        ${file.name}
      </div>
      <div class="text-muted small">
        ${!file.is_folder ? formatFileSize(file.size) : ''}
      </div>
    </div>
  `).join('');
}

function updateBreadcrumb() {
  breadcrumb.innerHTML = `
    <li class="breadcrumb-item ${!currentFolderId ? 'active' : ''}" 
        data-folder-id="" 
        onclick="navigateToFolder(null)">
      Home
    </li>
    ${currentPath.map((folder, index) => `
      <li class="breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}"
          data-folder-id="${folder.id}"
          onclick="navigateToFolder('${folder.id}')">
        ${folder.name}
      </li>
    `).join('')}
  `;
}

function navigateToFolder(folderId) {
  currentFolderId = folderId;
  if (!folderId) {
    currentPath = [];
  } else {
    const index = currentPath.findIndex(f => f.id === folderId);
    if (index >= 0) {
      currentPath = currentPath.slice(0, index + 1);
    }
  }
  loadFiles(folderId);
}

async function handleFileClick(event, fileId) {
  const fileElement = event.currentTarget;
  const isFolder = fileElement.dataset.isFolder === 'true';
  
  if (isFolder) {
    currentFolderId = fileId;
    currentPath.push({
      id: fileId,
      name: fileElement.textContent.trim()
    });
    loadFiles(fileId);
  } else {
    selectedFile = {
      id: fileId,
      name: fileElement.textContent.trim()
    };
    fileOptionsModal.show();
  }
}

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  
  try {
    const url = new URL(API.SEARCH, window.location.origin);
    url.searchParams.append('query', query);
    
    const response = await fetch(url);
    const files = await response.json();
    
    displayFiles(files);
  } catch (error) {
    console.error('Error searching files:', error);
  }
}

async function handleFileUpload() {
  const files = fileInput.files;
  if (!files.length) return;
  
  handleFileDrop(files);
}

async function handleFileDrop(files) {
  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('parent_folder', currentFolderId);
      }
      
      const response = await fetch(API.UPLOAD, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        loadFiles(currentFolderId);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }
}

async function handleCreateFolder() {
  const folderName = document.getElementById('folder-name').value.trim();
  if (!folderName) return;
  
  try {
    const response = await fetch(API.FOLDERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        parent_folder: currentFolderId
      })
    });
    
    if (response.ok) {
      newFolderModal.hide();
      document.getElementById('folder-name').value = '';
      loadFiles(currentFolderId);
    }
  } catch (error) {
    console.error('Error creating folder:', error);
  }
}

// Utility functions
function formatFileSize(bytes) {
  if (!bytes) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
} 