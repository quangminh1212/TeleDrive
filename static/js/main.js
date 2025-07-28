// TeleDrive Main JavaScript - Google Drive-like functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    initializeSidebar();
    initializeSearch();
    initializeNewButton();
    initializeUploadModal();
    initializeModals();
    initializeToasts();
    initializeDragDrop();
}

// Sidebar functionality
function initializeSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }
    
    // Mobile sidebar toggle
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
    
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        }
    });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            filterFiles(query);
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
    }
}

function filterFiles(query) {
    const fileItems = document.querySelectorAll('.file-item');
    
    fileItems.forEach(item => {
        const fileName = item.querySelector('.file-name').textContent.toLowerCase();
        const fileType = item.dataset.fileType.toLowerCase();
        
        if (fileName.includes(query) || fileType.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function performSearch(query) {
    showToast(`Searching for: ${query}`, 'info');
    // Implement advanced search functionality here
}

// New button dropdown
function initializeNewButton() {
    const newBtn = document.getElementById('newBtn');
    const newMenu = document.getElementById('newMenu');
    
    if (newBtn && newMenu) {
        newBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown(newMenu, newBtn);
        });
        
        // Menu item handlers
        const uploadFile = document.getElementById('uploadFile');
        const uploadFolder = document.getElementById('uploadFolder');
        const newFolder = document.getElementById('newFolder');
        const scanChannel = document.getElementById('scanChannel');
        
        if (uploadFile) {
            uploadFile.addEventListener('click', function() {
                hideDropdown(newMenu);
                openUploadModal();
            });
        }
        
        if (uploadFolder) {
            uploadFolder.addEventListener('click', function() {
                hideDropdown(newMenu);
                showToast('Folder upload coming soon!', 'info');
            });
        }
        
        if (newFolder) {
            newFolder.addEventListener('click', function() {
                hideDropdown(newMenu);
                createNewFolder();
            });
        }
        
        if (scanChannel) {
            scanChannel.addEventListener('click', function() {
                hideDropdown(newMenu);
                window.location.href = '/scan';
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            hideDropdown(newMenu);
        });
    }
}

function toggleDropdown(dropdown, button) {
    const rect = button.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function hideDropdown(dropdown) {
    dropdown.style.display = 'none';
}

// Upload modal functionality
function initializeUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModal = document.getElementById('closeUploadModal');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadLink = uploadArea?.querySelector('.upload-link');
    
    if (closeUploadModal) {
        closeUploadModal.addEventListener('click', function() {
            hideModal(uploadModal);
        });
    }
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        if (uploadLink) {
            uploadLink.addEventListener('click', function(e) {
                e.stopPropagation();
                fileInput.click();
            });
        }
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFileUpload(this.files);
            }
        });
    }
}

function openUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    showModal(uploadModal);
}

function handleFileUpload(files) {
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    uploadProgress.style.display = 'block';
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            setTimeout(() => {
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
                showToast(`Successfully uploaded ${files.length} file(s)`, 'success');
                hideModal(document.getElementById('uploadModal'));
                
                // Refresh file list
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }, 500);
        }
        
        progressFill.style.width = progress + '%';
        progressText.textContent = `Uploading... ${Math.round(progress)}%`;
    }, 200);
    
    // Actual upload logic would go here
    uploadFiles(files);
}

function uploadFiles(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Upload successful:', data);
        } else {
            showToast('Upload failed: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showToast('Upload failed: Network error', 'error');
    });
}

// Drag and drop functionality
function initializeDragDrop() {
    const uploadArea = document.getElementById('uploadArea');
    const mainContent = document.querySelector('.main-content');
    
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        uploadArea.addEventListener('drop', handleDrop, false);
    }
    
    // Global drag and drop
    if (mainContent) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            mainContent.addEventListener(eventName, preventDefaults, false);
        });
        
        mainContent.addEventListener('drop', function(e) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                openUploadModal();
                setTimeout(() => {
                    handleFileUpload(files);
                }, 100);
            }
        });
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    e.target.classList.add('dragover');
}

function unhighlight(e) {
    e.target.classList.remove('dragover');
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files);
    }
}

// Modal functionality
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });
}

function showModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Toast notifications
function initializeToasts() {
    // Toast container is already in HTML
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Utility functions
function createNewFolder() {
    const folderName = prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
        showToast(`Creating folder: ${folderName}`, 'info');
        // Implement folder creation logic here
    }
}

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// API helper functions
function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    return fetch(endpoint, mergedOptions)
        .then(response => response.json())
        .catch(error => {
            console.error('API call failed:', error);
            showToast('Network error occurred', 'error');
            throw error;
        });
}

// Export functions for use in other scripts
window.TeleDrive = {
    showToast,
    showLoading,
    hideLoading,
    showModal,
    hideModal,
    apiCall
};
