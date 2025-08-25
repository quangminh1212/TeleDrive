// TeleDrive Web Interface JavaScript

// Global variables
let toastTimeout;

// Initialize when DOM is loaded

// Simple language helper
function L(vi, en) { try { return (window.current_lang === 'vi') ? vi : en; } catch (_) { return en; } }

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Setup global event listeners
    setupGlobalEventListeners();

    // Initialize tooltips and other UI components
    initializeUIComponents();

    console.log('TeleDrive Web Interface initialized');
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Close context menus and dropdowns when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) {
            hideAllContextMenus();
        }
        if (!e.target.closest('.user-menu')) {
            hideUserDropdown();
        }
    });

    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllContextMenus();
            hideUserDropdown();
            hideLoading();
        }
    });

    // Handle search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

// Initialize UI components
function initializeUIComponents() {
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(addRippleEffect);

    // Initialize file drag and drop
    initializeFileDragDrop();

    // Initialize context menus
    initializeContextMenus();

    // Initialize file actions
    initializeFileActions();

    // Initialize view toggle (grid/list)
    initializeViewToggle();

    // Initialize breadcrumb navigation
    initializeBreadcrumbs();
}

// Add ripple effect to buttons
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Initialize file drag and drop with enhanced functionality
function initializeFileDragDrop() {
    // Global drag drop for file uploads
    const dropZones = document.querySelectorAll('.files-container, .scan-form');

    // Prevent default browser behavior for drag events document-wide
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZones.forEach(zone => {
            zone.addEventListener(eventName, highlight, false);
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZones.forEach(zone => {
            zone.addEventListener(eventName, unhighlight, false);
        });
    });

    function highlight(e) {
        const target = getDropTarget(e.target);
        if (target) target.classList.add('drag-over');

        // Show drop placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.classList.add('active');
    }

    function unhighlight(e) {
        const target = getDropTarget(e.target);
        if (target) target.classList.remove('drag-over');

        // Hide drop placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.classList.remove('active');
    }

    // Find appropriate drop target parent element
    function getDropTarget(element) {
        if (element.classList.contains('files-container')) return element;
        if (element.classList.contains('scan-form')) return element;
        if (element.classList.contains('folder-card')) return element;
        return element.closest('.files-container, .scan-form, .folder-card');
    }

    // Handle file drop
    dropZones.forEach(zone => {
        zone.addEventListener('drop', handleFileDrop, false);
    });

    // Initialize folder drag & drop
    initializeFolderDragDrop();
}

// Handle file drop
function handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        // Check if dropped on a folder card
        const folderCard = e.target.closest('.folder-card');
        let targetFolder = null;

        if (folderCard) {
            targetFolder = folderCard.dataset.folderId;
        } else if (window.currentFolder) {
            targetFolder = window.currentFolder;
        }

        uploadFiles(files, targetFolder);
        showToast(`Uploading ${files.length} file(s)${targetFolder ? ' to folder' : ''}`, 'info');
    }
}

// Initialize folder drag & drop functionality
function initializeFolderDragDrop() {
    const fileCards = document.querySelectorAll('.file-card[data-type="folder"]');

    fileCards.forEach(card => {
        // Make folders draggable
        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', card.dataset.folderId);
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');

            // Create drag image
            const dragIcon = document.createElement('div');
            dragIcon.classList.add('drag-icon');
            dragIcon.innerHTML = '<span class="material-icons">folder</span>';
            document.body.appendChild(dragIcon);
            e.dataTransfer.setDragImage(dragIcon, 20, 20);

            // Remove drag icon after dragstart
            setTimeout(() => {
                document.body.removeChild(dragIcon);
            }, 0);
        });

        card.addEventListener('dragend', function() {
            card.classList.remove('dragging');
        });

        // Handle folder drop target
        card.addEventListener('drop', function(e) {
            const sourceId = e.dataTransfer.getData('text/plain');
            const targetId = card.dataset.folderId;

            // Prevent dropping folder into itself
            if (sourceId !== targetId) {
                moveFolder(sourceId, targetId);
            }
        });
    });

    // Make all folder areas drop targets for other folders
    const folderContainers = document.querySelectorAll('.files-container');
    folderContainers.forEach(container => {
        container.addEventListener('drop', function(e) {
            // Handle only if data is folder ID and not files
            if (e.dataTransfer.types.includes('text/plain') && e.dataTransfer.files.length === 0) {
                const sourceId = e.dataTransfer.getData('text/plain');
                moveFolder(sourceId, window.currentFolder || 'root');
            }
        });
    });
}

// Upload files function with folder support
function uploadFiles(files, targetFolder = null) {
    if (!files || files.length === 0) {
        showToast(window.I18N?.['toast.no_files_selected'] || 'No files selected', 'error');
        return;
    }

    const formData = new FormData();

    // Add files to form data
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    // Add target folder if specified, otherwise use current folder
    if (targetFolder) {
        formData.append('folder_id', targetFolder);
    } else if (window.currentFolder) {
        formData.append('folder_id', window.currentFolder);
    }

    // Track upload progress
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    let uploadedSize = 0;

    // Create and show progress element
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-container';
    progressContainer.innerHTML = `
        <div class="upload-progress-header">
            <span>Uploading ${files.length} file(s)</span>
            <button class="btn-close" onclick="this.parentNode.parentNode.remove()">×</button>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="upload-progress-info">
            <span class="upload-file-name">Preparing...</span>
            <span class="upload-size">0% (0/${formatFileSize(totalSize)})</span>
        </div>
    `;

    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        toastContainer.appendChild(progressContainer);
    } else {
        document.body.appendChild(progressContainer);
    }

    // Show loading state
    showLoading(window.I18N?.['loading.processing'] || L('Đang tải lên tệp...', 'Uploading files...'));

    // Upload files with progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            uploadedSize = e.loaded;

            // Update progress bar
            const progressFill = progressContainer.querySelector('.progress-fill');
            if (progressFill) progressFill.style.width = percent + '%';

            // Update info
            const fileInfo = progressContainer.querySelector('.upload-size');
            if (fileInfo) {
                fileInfo.textContent = `${percent}% (${formatFileSize(uploadedSize)}/${formatFileSize(totalSize)})`;
            }
        }
    });

    xhr.addEventListener('load', function() {
        hideLoading();

        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    // Update progress container to success state
                    progressContainer.classList.add('upload-success');
                    progressContainer.querySelector('.upload-progress-header').innerHTML = `<span>Upload Complete</span>`;
                    progressContainer.querySelector('.upload-file-name').textContent = `${files.length} file(s) uploaded successfully`;

                    // Auto-remove progress after delay
                    setTimeout(() => {
                        progressContainer.remove();
                    }, 5000);

                    // Refresh file list
                    if (typeof refreshFiles === 'function') {
                        refreshFiles();
                    } else {
                        location.reload();
                    }
                } else {
                    showUploadError(progressContainer, 'Upload failed: ' + (data.error || 'Unknown error'));
                }
            } catch (e) {
                showUploadError(progressContainer, 'Invalid response from server');
            }
        } else {
            showUploadError(progressContainer, `Server error: ${xhr.status}`);
        }
    });

    xhr.addEventListener('error', function() {
        hideLoading();
        showUploadError(progressContainer, 'Connection error');
    });

    xhr.addEventListener('abort', function() {
        hideLoading();
        showUploadError(progressContainer, 'Upload aborted');
    });

    xhr.send(formData);
}

// Helper function to show upload errors
function showUploadError(progressContainer, errorMessage) {
    progressContainer.classList.add('upload-error');
    progressContainer.querySelector('.upload-progress-header').innerHTML = `<span>Upload Failed</span>`;
    progressContainer.querySelector('.upload-file-name').textContent = errorMessage;
    showToast(errorMessage, 'error');
}

// Handle search
function handleSearch(query) {
    if (query.trim() === '') {
        // Show all files
        document.querySelectorAll('.file-card').forEach(card => {
            card.style.display = 'flex';
        });
        return;
    }

    // Filter files
    document.querySelectorAll('.file-card').forEach(card => {
        const filename = card.dataset.filename || '';
        const isMatch = filename.toLowerCase().includes(query.toLowerCase());
        card.style.display = isMatch ? 'flex' : 'none';
    });
}

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    // Clear existing toast timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Add icon based on type
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    toast.innerHTML = `
        <span class="material-icons">${icons[type] || 'info'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <span class="material-icons">close</span>
        </button>
    `;

    // Add to container
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);

        // Auto-remove after duration
        toastTimeout = setTimeout(() => {
            toast.remove();
        }, duration);
    }
}

// Loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.querySelector('.loading-text').textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Context menu functionality
function initializeContextMenus() {
    // Setup file/folder context menus
    document.querySelectorAll('.file-card').forEach(card => {
        card.addEventListener('contextmenu', function(e) {
            e.preventDefault();

            // Hide any visible context menus
            hideAllContextMenus();

            // Create context menu
            const contextMenu = createContextMenu(card);

            // Position context menu
            positionContextMenu(contextMenu, e.pageX, e.pageY);

            // Show context menu
            document.body.appendChild(contextMenu);
        });
    });

    // Close context menu when clicking elsewhere
    document.addEventListener('click', hideAllContextMenus);
    document.addEventListener('scroll', hideAllContextMenus);
}

// Create a context menu based on item type
function createContextMenu(fileCard) {
    const isFolder = fileCard.dataset.type === 'folder';
    const filename = fileCard.dataset.filename;
    const fileId = fileCard.dataset.fileId;
    const folderId = fileCard.dataset.folderId;

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    // Common menu items
    let menuItems = '';

    if (isFolder) {
        menuItems += `
            <div class="context-menu-item" onclick="openFolder('${folderId}')">
                <span class="material-icons">folder_open</span>
                <span>Open</span>
            </div>
            <div class="context-menu-item" onclick="renameFolder('${folderId}')">
                <span class="material-icons">edit</span>
                <span>Rename</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" onclick="shareFolder('${folderId}')">
                <span class="material-icons">share</span>
                <span>Share</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item danger" onclick="deleteFolder('${folderId}')">
                <span class="material-icons">delete</span>
                <span>Delete</span>
            </div>
        `;
    } else {
        // File specific menu
        menuItems += `
            <div class="context-menu-item" onclick="previewFile('${filename}')">
                <span class="material-icons">visibility</span>
                <span>Preview</span>
            </div>
            <div class="context-menu-item" onclick="downloadFile('${filename}')">
                <span class="material-icons">download</span>
                <span>Download</span>
            </div>
            <div class="context-menu-item" onclick="renameFile('${fileId}')">
                <span class="material-icons">edit</span>
                <span>Rename</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" onclick="shareFile('${fileId}')">
                <span class="material-icons">share</span>
                <span>Share</span>
            </div>
            <div class="context-menu-item" onclick="copyFileLink('${fileId}')">
                <span class="material-icons">link</span>
                <span>Copy link</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" onclick="moveFileToFolder('${fileId}')">
                <span class="material-icons">drive_file_move</span>
                <span>Move to...</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item danger" onclick="deleteFile('${filename}')">
                <span class="material-icons">delete</span>
                <span>Delete</span>
            </div>
        `;
    }

    menu.innerHTML = menuItems;
    return menu;
}

// Position context menu
function positionContextMenu(menu, x, y) {
    // First append to get dimensions
    document.body.appendChild(menu);

    // Get menu dimensions
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Adjust position if menu would go outside window
    if (x + menuWidth > windowWidth) {
        x = windowWidth - menuWidth - 10;
    }

    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 10;
    }

    // Set menu position
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

// Hide all context menus
function hideAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(menu => {
        menu.remove();
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// API helpers
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Move folder to another folder
function moveFolder(sourceId, targetId) {
    showLoading(L('Đang di chuyển thư mục...','Moving folder...'));

    apiRequest('/api/folders/move', {
        method: 'POST',
        body: JSON.stringify({
            folder_id: sourceId,
            target_folder_id: targetId
        })
    })
    .then(response => {
        hideLoading();
        if (response.success) {
            showToast(L('Đã di chuyển thư mục thành công','Folder moved successfully'), 'success');
            // Refresh file list
            if (typeof refreshFiles === 'function') {
                refreshFiles();
            } else {
                location.reload();
            }
        } else {
            showToast(L('Di chuyển thư mục thất bại: ','Failed to move folder: ') + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast(L('Lỗi khi di chuyển thư mục: ','Error moving folder: ') + error.message, 'error');
    });
}

// File operations
function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = `/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(L(`Đang tải xuống ${filename}`,`Downloading ${filename}`), 'success');
}

function previewFile(filename) {
    // Create preview modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content file-preview-modal">
            <div class="modal-header">
                <h3>File Preview: ${filename}</h3>
                <button class="modal-close" onclick="closePreviewModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="preview-container" id="preview-container">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading preview...</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closePreviewModal()">Close</button>
                <button class="btn btn-primary" onclick="downloadFile('${filename}')">Download</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load preview content
    loadPreviewContent(filename);
}

function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
        showLoading('Deleting file...');

        apiRequest('/api/delete_file', {
            method: 'POST',
            body: JSON.stringify({ filename: filename })
        })
            .then(response => {
                hideLoading();
                if (response.success) {
                    showToast(L(`Đã xóa tệp ${filename} thành công`,`File ${filename} deleted successfully`), 'success');
                    // Remove file card from UI
                    const fileCard = document.querySelector(`[data-filename="${filename}"]`);
                    if (fileCard) {
                        fileCard.remove();
                    }
                    // Refresh stats
                    if (typeof loadStats === 'function') {
                        loadStats();
                    }
                } else {
                    showToast(`Error deleting file: ${response.error}`, 'error');
                }
            })
            .catch(error => {
                hideLoading();
                showToast((window.current_lang==='vi'?`Lỗi khi xóa tệp: ${error.message}`:`Error deleting file: ${error.message}`), 'error');
            });
    }
}

// Rename a folder
function renameFolder(folderId) {
    const folderCard = document.querySelector(`.file-card[data-folder-id="${folderId}"]`);
    if (!folderCard) return;

    const currentName = folderCard.querySelector('.file-name').textContent.trim();
    const newName = prompt('Enter new folder name:', currentName);

    if (newName && newName !== currentName) {
        showLoading('Renaming folder...');

        apiRequest('/api/rename_folder', {
            method: 'POST',
            body: JSON.stringify({
                folder_id: folderId,
                new_name: newName
            })
        })
        .then(response => {
            hideLoading();
            if (response.success) {
                showToast(L('Đã đổi tên thư mục thành công','Folder renamed successfully'), 'success');
                // Update folder name in UI
                const folderName = folderCard.querySelector('.file-name');
                if (folderName) {
                    folderName.textContent = newName;
                } else {
                    // Refresh if can't update directly
                    location.reload();
                }
            } else {
                showToast(L('Đổi tên thư mục thất bại: ','Failed to rename folder: ') + (response.error || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            hideLoading();
            showToast(L('Lỗi khi đổi tên thư mục: ','Error renaming folder: ') + error.message, 'error');
        });
    }
}

// Delete a folder
function deleteFolder(folderId) {
    const folderCard = document.querySelector(`.file-card[data-folder-id="${folderId}"]`);
    if (!folderCard) return;

    const folderName = folderCard.querySelector('.file-name').textContent.trim();

    if (confirm(`Are you sure you want to delete the folder "${folderName}" and all its contents? This action cannot be undone.`)) {
        showLoading('Deleting folder...');

        apiRequest('/api/delete_folder', {
            method: 'POST',
            body: JSON.stringify({
                folder_id: folderId
            })
        })
        .then(response => {
            hideLoading();
            if (response.success) {
                showToast(`Folder "${folderName}" deleted successfully`, 'success');
                // Remove folder card from UI
                folderCard.remove();
                // Refresh stats
                if (typeof loadStats === 'function') {
                    loadStats();
                }
            } else {
                showToast(`Error deleting folder: ${response.error || 'Unknown error'}`, 'error');
            }
        })
        .catch(error => {
            hideLoading();
            showToast(`Error deleting folder: ${error.message}`, 'error');
        });
    }
}

// Share a file
function shareFile(fileId) {
    showLoading('Preparing share...');

    apiRequest('/api/get_share_link', {
        method: 'POST',
        body: JSON.stringify({
            file_id: fileId
        })
    })
    .then(response => {
        hideLoading();
        if (response.success && response.share_link) {
            showShareModal(response.share_link, response.file_name);
        } else {
            showToast('Failed to create share link: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Error creating share link: ' + error.message, 'error');
    });
}

// Share a folder
function shareFolder(folderId) {
    showLoading('Preparing share...');

    apiRequest('/api/get_folder_share_link', {
        method: 'POST',
        body: JSON.stringify({
            folder_id: folderId
        })
    })
    .then(response => {
        hideLoading();
        if (response.success && response.share_link) {
            showShareModal(response.share_link, response.folder_name, true);
        } else {
            showToast('Failed to create share link: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Error creating share link: ' + error.message, 'error');
    });
}

// Show share modal with link
function showShareModal(shareLink, itemName, isFolder = false) {
    const modalId = 'share-modal-' + Date.now();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isFolder ? 'Share Folder' : 'Share File'}: ${itemName}</h3>
                <button class="modal-close" onclick="document.getElementById('${modalId}').remove();">&times;</button>
            </div>
            <div class="modal-body">
                <p>Anyone with the link below can access this ${isFolder ? 'folder' : 'file'}:</p>
                <div class="share-url-container">
                    <input type="text" class="share-url-input" id="share-url-${modalId}" value="${shareLink}" readonly />
                    <button class="btn btn-primary" onclick="copyShareLink('share-url-${modalId}')">
                        <span class="material-icons">content_copy</span>
                        Copy
                    </button>
                </div>

                <div class="share-options" style="margin-top: 20px;">
                    <h4>Share Options</h4>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="share-require-password-${modalId}" />
                            Require password
                        </label>

                        <div id="password-fields-${modalId}" style="display: none; margin-top: 10px;">
                            <input type="password" class="form-input" id="share-password-${modalId}" placeholder="Enter password" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Link expiration:</label>
                        <select class="form-select" id="share-expiration-${modalId}">
                            <option value="never">Never</option>
                            <option value="1day">1 day</option>
                            <option value="7days">7 days</option>
                            <option value="30days">30 days</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove();">Close</button>
                <button class="btn btn-primary" onclick="updateShareSettings('${modalId}', ${isFolder}, '${itemName}')">
                    Update Settings
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listener for password checkbox
    const passwordCheckbox = document.getElementById(`share-require-password-${modalId}`);
    const passwordFields = document.getElementById(`password-fields-${modalId}`);

    if (passwordCheckbox && passwordFields) {
        passwordCheckbox.addEventListener('change', function() {
            passwordFields.style.display = this.checked ? 'block' : 'none';
        });
    }
}

// Copy share link to clipboard
function copyShareLink(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.select();
    document.execCommand('copy');

    // Show feedback
    showToast(window.I18N?.['toast.link_copied'] || 'Link copied to clipboard', 'success');
}

// Update share settings
function updateShareSettings(modalId, isFolder, itemName) {
    const requirePassword = document.getElementById(`share-require-password-${modalId}`).checked;
    const password = requirePassword ? document.getElementById(`share-password-${modalId}`).value : '';
    const expiration = document.getElementById(`share-expiration-${modalId}`).value;

    if (requirePassword && !password) {
        showToast((current_lang==='vi'?'Vui lòng nhập mật khẩu':'Please enter a password'), 'warning');
        return;
    }

    showLoading('Updating share settings...');

    apiRequest('/api/update_share_settings', {
        method: 'POST',
        body: JSON.stringify({
            share_url: document.getElementById(`share-url-${modalId}`).value,
            require_password: requirePassword,
            password: password,
            expiration: expiration
        })
    })
    .then(response => {
        hideLoading();
        if (response.success) {
            document.getElementById(modalId).remove();
            showToast('Share settings updated successfully', 'success');
        } else {
            showToast('Failed to update share settings: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Error updating share settings: ' + error.message, 'error');
    });
}

// Copy file link to clipboard
function copyFileLink(fileId) {
    const fileCard = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
    if (!fileCard) return;

    const fileName = fileCard.dataset.filename;

    apiRequest('/api/get_direct_link', {
        method: 'POST',
        body: JSON.stringify({
            file_id: fileId
        })
    })
    .then(response => {
        if (response.success && response.direct_link) {
            // Create a temporary input element to copy the link
            const tempInput = document.createElement('input');
            tempInput.value = response.direct_link;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);

            showToast(`Link for "${fileName}" copied to clipboard`, 'success');
        } else {
            showToast('Failed to get direct link: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        showToast('Error getting direct link: ' + error.message, 'error');
    });
}

// Move file to another folder
function moveFileToFolder(fileId) {
    showFolderSelectionModal(fileId);
}

// Show folder selection modal
function showFolderSelectionModal(fileId) {
    const modalId = 'folder-select-modal-' + Date.now();

    // Create modal structure
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Move to Folder</h3>
                <button class="modal-close" onclick="document.getElementById('${modalId}').remove();">&times;</button>
            </div>
            <div class="modal-body">
                <div class="folder-tree-container" id="folder-tree-${modalId}">
                    <div class="loading-placeholder">${(window.current_lang||'en')==='vi'?'Đang tải danh sách thư mục...':'Loading folders...'}</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove();">Cancel</button>
                <button class="btn btn-primary" id="move-confirm-btn-${modalId}" disabled>Move</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load folder tree
    loadFolderTree(modalId, fileId);

    // Add event listener for move button
    document.getElementById(`move-confirm-btn-${modalId}`).addEventListener('click', function() {
        const selectedFolder = document.querySelector(`#folder-tree-${modalId} .folder-tree-item.selected`);
        if (selectedFolder) {
            const targetFolderId = selectedFolder.dataset.folderId;
            moveFile(fileId, targetFolderId, modalId);
        }
    });
}

// Load folder tree for selection
function loadFolderTree(modalId, fileId) {
    const treeContainer = document.getElementById(`folder-tree-${modalId}`);

    apiRequest('/api/get_folder_tree')
        .then(response => {
            if (response.success && response.folders) {
                treeContainer.innerHTML = buildFolderTreeHtml(response.folders, fileId);

                // Add click event listeners to folder items
                document.querySelectorAll(`#folder-tree-${modalId} .folder-tree-item`).forEach(item => {
                    item.addEventListener('click', function(e) {
                        e.stopPropagation(); // Prevent parent folder clicks

                        // Deselect all folders
                        document.querySelectorAll(`#folder-tree-${modalId} .folder-tree-item`).forEach(i => {
                            i.classList.remove('selected');
                        });

                        // Select clicked folder
                        this.classList.add('selected');

                        // Enable move button
                        document.getElementById(`move-confirm-btn-${modalId}`).disabled = false;
                    });

                    // Add click event for expand/collapse
                    const expandIcon = item.querySelector('.folder-expand-icon');
                    if (expandIcon) {
                        expandIcon.addEventListener('click', function(e) {
                            e.stopPropagation(); // Don't select the folder when clicking expand icon

                            const folderItem = this.closest('.folder-tree-item');
                            const subFolder = folderItem.nextElementSibling;

                            if (subFolder && subFolder.classList.contains('folder-tree-children')) {
                                const isExpanded = subFolder.style.display !== 'none';
                                subFolder.style.display = isExpanded ? 'none' : 'block';
                                this.textContent = isExpanded ? 'chevron_right' : 'expand_more';
                            }
                        });
                    }
                });
            } else {
                treeContainer.innerHTML = `<div class="error-message">Failed to load folders</div>`;
            }
        })
        .catch(error => {
            treeContainer.innerHTML = `<div class="error-message">Error loading folders: ${error.message}</div>`;
        });
}

// Build HTML for folder tree
function buildFolderTreeHtml(folders, fileId, level = 0) {
    let html = '';

    folders.forEach(folder => {
        // Skip the folder that contains the file (can't move to self)
        const isCurrentFolder = folder.files && folder.files.some(file => file.id === fileId);
        const isDisabled = isCurrentFolder ? 'disabled' : '';

        // Create folder item
        html += `
            <div class="folder-tree-item ${isDisabled}" data-folder-id="${folder.id}" style="padding-left: ${level * 20}px">
                ${folder.children && folder.children.length > 0 ?
                    `<span class="material-icons folder-expand-icon">chevron_right</span>` :
                    `<span class="folder-expand-spacer"></span>`
                }
                <span class="material-icons folder-icon">folder</span>
                <span class="folder-name">${folder.name}</span>
            </div>
        `;

        // Add children if any
        if (folder.children && folder.children.length > 0) {
            html += `<div class="folder-tree-children" style="display: none">`;
            html += buildFolderTreeHtml(folder.children, fileId, level + 1);
            html += `</div>`;
        }
    });

    return html;
}

// Move file to selected folder
function moveFile(fileId, targetFolderId, modalId) {
    showLoading(L('Đang di chuyển tệp...','Moving file...'));

    apiRequest('/api/move_file', {
        method: 'POST',
        body: JSON.stringify({
            file_id: fileId,
            target_folder_id: targetFolderId
        })
    })
    .then(response => {
        hideLoading();
        if (response.success) {
            document.getElementById(modalId).remove();
            showToast('File moved successfully', 'success');

            // Remove file card from UI if we're in a folder view
            const fileCard = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
            if (fileCard) {
                fileCard.remove();
            }

            // Refresh stats
            if (typeof loadStats === 'function') {
                loadStats();
            }
        } else {
            showToast('Failed to move file: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Error moving file: ' + error.message, 'error');
    });
}

function loadPreviewContent(filename) {
    const container = document.getElementById('preview-container');
    const fileExt = filename.split('.').pop().toLowerCase();

    // Determine preview type based on file extension
    if (['json'].includes(fileExt)) {
        loadJsonPreview(filename, container);
    } else if (['csv'].includes(fileExt)) {
        loadCsvPreview(filename, container);
    } else if (['xlsx', 'xls'].includes(fileExt)) {
        loadExcelPreview(filename, container);
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
        loadImagePreview(filename, container);
    } else if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileExt)) {
        loadVideoPreview(filename, container);
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(fileExt)) {
        loadAudioPreview(filename, container);
    } else if (['txt', 'md', 'py', 'js', 'html', 'css', 'xml', 'log'].includes(fileExt)) {
        loadTextPreview(filename, container);
    } else if (['pdf'].includes(fileExt)) {
        loadPdfPreview(filename, container);
    } else {
        // Generic file info preview
        loadGenericPreview(filename, container);
    }
}

function loadJsonPreview(filename, container) {
    fetch(`/output/${filename}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = `
                <div class="json-preview">
                    <div class="preview-header">
                        <span class="file-type-badge json">JSON</span>
                        <span class="file-info">${Array.isArray(data) ? data.length : Object.keys(data).length} items</span>
                    </div>
                    <pre class="json-content">${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="preview-error">
                    <span class="material-icons">error</span>
                    <p>Error loading JSON preview: ${error.message}</p>
                </div>
            `;
        });
}

function loadCsvPreview(filename, container) {
    fetch(`/output/${filename}`)
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n').slice(0, 100); // Show first 100 lines
            const rows = lines.map(line => line.split(','));

            let tableHtml = '<div class="csv-preview"><div class="preview-header"><span class="file-type-badge csv">CSV</span><span class="file-info">' + (lines.length - 1) + ' rows</span></div><table class="csv-table"><thead>';

            if (rows.length > 0) {
                tableHtml += '<tr>';
                rows[0].forEach(header => {
                    tableHtml += `<th>${header.replace(/"/g, '')}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';

                for (let i = 1; i < Math.min(rows.length, 21); i++) {
                    tableHtml += '<tr>';
                    rows[i].forEach(cell => {
                        tableHtml += `<td>${cell.replace(/"/g, '')}</td>`;
                    });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table>';

                if (lines.length > 21) {
                    tableHtml += `<p class="preview-note">Showing first 20 rows of ${lines.length - 1} total rows</p>`;
                }
            }

            tableHtml += '</div>';
            container.innerHTML = tableHtml;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="preview-error">
                    <span class="material-icons">error</span>
                    <p>Error loading CSV preview: ${error.message}</p>
                </div>
            `;
        });
}

function loadExcelPreview(filename, container) {
    container.innerHTML = `
        <div class="excel-preview">
            <div class="preview-header">
                <span class="file-type-badge excel">EXCEL</span>
                <span class="file-info">Excel file</span>
            </div>
            <div class="preview-content">
                <span class="material-icons large">description</span>
                <p>Excel file preview</p>
                <p class="preview-note">Download the file to view its contents in Excel or a compatible application.</p>
            </div>
        </div>
    `;
}

function loadImagePreview(filename, container) {
    container.innerHTML = `
        <div class="image-preview">
            <div class="preview-header">
                <span class="file-type-badge image">IMAGE</span>
                <span class="file-info" id="image-info">Loading...</span>
            </div>
            <div class="image-viewer">
                <div class="image-container" id="image-container">
                    <img id="preview-image" src="/output/${filename}" alt="${filename}"
                         onload="handleImageLoad(this)" onerror="handleImageError(this)"
                         draggable="false">
                </div>
                <div class="image-controls">
                    <div class="control-group">
                        <button class="btn btn-small" onclick="rotateImage(-90)" title="Rotate Left">
                            <span class="material-icons">rotate_left</span>
                        </button>
                        <button class="btn btn-small" onclick="rotateImage(90)" title="Rotate Right">
                            <span class="material-icons">rotate_right</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="zoomImage(-0.2)" title="Zoom Out">
                            <span class="material-icons">zoom_out</span>
                        </button>
                        <span class="zoom-level" id="zoom-level">100%</span>
                        <button class="btn btn-small" onclick="zoomImage(0.2)" title="Zoom In">
                            <span class="material-icons">zoom_in</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="fitImageToScreen()" title="Fit to Screen">
                            <span class="material-icons">fit_screen</span>
                        </button>
                        <button class="btn btn-small" onclick="resetImageView()" title="Reset View">
                            <span class="material-icons">refresh</span>
                        </button>
                        <button class="btn btn-small" onclick="toggleFullscreen()" title="Fullscreen">
                            <span class="material-icons">fullscreen</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize image viewer state
    initializeImageViewer();
}

// Image viewer state
let imageViewerState = {
    zoom: 1,
    rotation: 0,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

function initializeImageViewer() {
    // Reset state
    imageViewerState = {
        zoom: 1,
        rotation: 0,
        panX: 0,
        panY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0
    };

    // Add event listeners for pan and zoom
    const container = document.getElementById('image-container');
    const image = document.getElementById('preview-image');

    if (container && image) {
        // Mouse events for panning
        container.addEventListener('mousedown', startImagePan);
        container.addEventListener('mousemove', panImage);
        container.addEventListener('mouseup', endImagePan);
        container.addEventListener('mouseleave', endImagePan);

        // Wheel event for zooming
        container.addEventListener('wheel', handleImageWheel);

        // Touch events for mobile
        container.addEventListener('touchstart', handleTouchStart);
        container.addEventListener('touchmove', handleTouchMove);
        container.addEventListener('touchend', handleTouchEnd);

        // Prevent context menu
        container.addEventListener('contextmenu', e => e.preventDefault());
    }
}

function handleImageLoad(img) {
    const fileInfo = document.getElementById('image-info');
    if (fileInfo) {
        const fileSize = formatFileSize(img.src.length * 0.75); // Rough estimate
        fileInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    }

    // Fit image to screen initially
    setTimeout(() => fitImageToScreen(), 100);
}

function handleImageError(img) {
    const container = img.parentElement;
    container.innerHTML = `
        <div class="preview-error">
            <span class="material-icons">broken_image</span>
            <p>Failed to load image</p>
        </div>
    `;
}

function zoomImage(delta) {
    const img = document.getElementById('preview-image');
    if (img) {
        currentZoom = Math.max(0.1, Math.min(5, currentZoom + delta));
        img.style.transform = `scale(${currentZoom})`;
    }
}

function resetImageZoom() {
    const img = document.getElementById('preview-image');
    if (img) {
        currentZoom = 1;
        img.style.transform = 'scale(1)';
    }
}

// Image manipulation functions
function zoomImage(delta) {
    const newZoom = Math.max(0.1, Math.min(5, imageViewerState.zoom + delta));
    imageViewerState.zoom = newZoom;
    updateImageTransform();
    updateZoomLevel();
}

function rotateImage(degrees) {
    imageViewerState.rotation += degrees;
    updateImageTransform();
}

function fitImageToScreen() {
    const container = document.getElementById('image-container');
    const image = document.getElementById('preview-image');

    if (!container || !image) return;

    const containerRect = container.getBoundingClientRect();
    const imageAspect = image.naturalWidth / image.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;

    let scale;
    if (imageAspect > containerAspect) {
        scale = (containerRect.width - 40) / image.naturalWidth;
    } else {
        scale = (containerRect.height - 40) / image.naturalHeight;
    }

    imageViewerState.zoom = Math.min(1, scale);
    imageViewerState.panX = 0;
    imageViewerState.panY = 0;
    updateImageTransform();
    updateZoomLevel();
}

function resetImageView() {
    imageViewerState.zoom = 1;
    imageViewerState.rotation = 0;
    imageViewerState.panX = 0;
    imageViewerState.panY = 0;
    updateImageTransform();
    updateZoomLevel();
}

function updateImageTransform() {
    const image = document.getElementById('preview-image');
    if (!image) return;

    const transform = `
        translate(${imageViewerState.panX}px, ${imageViewerState.panY}px)
        scale(${imageViewerState.zoom})
        rotate(${imageViewerState.rotation}deg)
    `;

    image.style.transform = transform;
    image.style.transformOrigin = 'center center';
}

function updateZoomLevel() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(imageViewerState.zoom * 100) + '%';
    }
}

// Pan functionality
function startImagePan(e) {
    if (e.button !== 0) return; // Only left mouse button
    imageViewerState.isDragging = true;
    imageViewerState.lastMouseX = e.clientX;
    imageViewerState.lastMouseY = e.clientY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
}

function panImage(e) {
    if (!imageViewerState.isDragging) return;

    const deltaX = e.clientX - imageViewerState.lastMouseX;
    const deltaY = e.clientY - imageViewerState.lastMouseY;

    imageViewerState.panX += deltaX;
    imageViewerState.panY += deltaY;

    imageViewerState.lastMouseX = e.clientX;
    imageViewerState.lastMouseY = e.clientY;

    updateImageTransform();
}

function endImagePan() {
    imageViewerState.isDragging = false;
    document.body.style.cursor = 'default';
}

// Wheel zoom
function handleImageWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomImage(delta);
}

// Touch events for mobile
let touchStartDistance = 0;
let touchStartZoom = 1;

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        touchStartDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        touchStartZoom = imageViewerState.zoom;
    } else if (e.touches.length === 1) {
        imageViewerState.isDragging = true;
        imageViewerState.lastMouseX = e.touches[0].clientX;
        imageViewerState.lastMouseY = e.touches[0].clientY;
    }
}

function handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );

        const scale = currentDistance / touchStartDistance;
        imageViewerState.zoom = Math.max(0.1, Math.min(5, touchStartZoom * scale));
        updateImageTransform();
        updateZoomLevel();
    } else if (e.touches.length === 1 && imageViewerState.isDragging) {
        const deltaX = e.touches[0].clientX - imageViewerState.lastMouseX;
        const deltaY = e.touches[0].clientY - imageViewerState.lastMouseY;

        imageViewerState.panX += deltaX;
        imageViewerState.panY += deltaY;

        imageViewerState.lastMouseX = e.touches[0].clientX;
        imageViewerState.lastMouseY = e.touches[0].clientY;

        updateImageTransform();
    }
}

function handleTouchEnd() {
    imageViewerState.isDragging = false;
}

// Fullscreen functionality
function toggleFullscreen() {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;

    if (!document.fullscreenElement) {
        modal.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function loadVideoPreview(filename, container) {
    const videoId = 'video-' + Date.now();
    container.innerHTML = `
        <div class="video-preview">
            <div class="preview-header">
                <span class="file-type-badge video">VIDEO</span>
                <span class="file-info" id="video-info-${videoId}">Loading video...</span>
            </div>
            <div class="video-player">
                <div class="video-container">
                    <video id="${videoId}" preload="metadata" onloadedmetadata="handleVideoLoad('${videoId}')" onerror="handleVideoError('${videoId}')">
                        <source src="/output/${filename}" type="video/${getVideoMimeType(filename)}">
                        Your browser does not support the video tag.
                    </video>
                </div>
                <div class="video-controls">
                    <div class="control-group">
                        <button class="btn btn-small" onclick="toggleVideoPlayback('${videoId}')" id="play-btn-${videoId}">
                            <span class="material-icons">play_arrow</span>
                        </button>
                        <button class="btn btn-small" onclick="stopVideo('${videoId}')">
                            <span class="material-icons">stop</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <span class="time-display" id="time-${videoId}">0:00 / 0:00</span>
                    </div>
                    <div class="control-group">
                        <label for="speed-${videoId}">Speed:</label>
                        <select id="speed-${videoId}" onchange="changeVideoSpeed('${videoId}', this.value)">
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="toggleVideoMute('${videoId}')" id="mute-btn-${videoId}">
                            <span class="material-icons">volume_up</span>
                        </button>
                        <input type="range" id="volume-${videoId}" min="0" max="1" step="0.1" value="1" onchange="changeVideoVolume('${videoId}', this.value)">
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="toggleVideoFullscreen('${videoId}')" title="Fullscreen">
                            <span class="material-icons">fullscreen</span>
                        </button>
                    </div>
                </div>
                <div class="video-progress">
                    <input type="range" id="progress-${videoId}" min="0" max="100" value="0" onchange="seekVideo('${videoId}', this.value)">
                </div>
            </div>
        </div>
    `;

    // Initialize video event listeners
    initializeVideoPlayer(videoId);
}

function loadAudioPreview(filename, container) {
    const audioId = 'audio-' + Date.now();
    container.innerHTML = `
        <div class="audio-preview">
            <div class="preview-header">
                <span class="file-type-badge audio">AUDIO</span>
                <span class="file-info" id="audio-info-${audioId}">Loading audio...</span>
            </div>
            <div class="audio-player">
                <div class="audio-visualizer">
                    <div class="audio-artwork">
                        <span class="material-icons">music_note</span>
                    </div>
                    <div class="audio-details">
                        <div class="track-title">${filename}</div>
                        <div class="track-duration" id="duration-${audioId}">--:--</div>
                    </div>
                </div>
                <audio id="${audioId}" preload="metadata" onloadedmetadata="handleAudioLoad('${audioId}')" onerror="handleAudioError('${audioId}')">
                    <source src="/output/${filename}" type="audio/${getAudioMimeType(filename)}">
                    Your browser does not support the audio tag.
                </audio>
                <div class="audio-progress">
                    <input type="range" id="audio-progress-${audioId}" min="0" max="100" value="0" onchange="seekAudio('${audioId}', this.value)">
                    <div class="time-info">
                        <span id="current-time-${audioId}">0:00</span>
                        <span id="total-time-${audioId}">0:00</span>
                    </div>
                </div>
                <div class="audio-controls">
                    <div class="control-group">
                        <button class="btn btn-small" onclick="skipAudio('${audioId}', -10)">
                            <span class="material-icons">replay_10</span>
                        </button>
                        <button class="btn btn-large" onclick="toggleAudioPlayback('${audioId}')" id="audio-play-btn-${audioId}">
                            <span class="material-icons">play_arrow</span>
                        </button>
                        <button class="btn btn-small" onclick="skipAudio('${audioId}', 10)">
                            <span class="material-icons">forward_10</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="toggleAudioMute('${audioId}')" id="audio-mute-btn-${audioId}">
                            <span class="material-icons">volume_up</span>
                        </button>
                        <input type="range" id="audio-volume-${audioId}" min="0" max="1" step="0.1" value="1" onchange="changeAudioVolume('${audioId}', this.value)">
                    </div>
                    <div class="control-group">
                        <label for="audio-speed-${audioId}">Speed:</label>
                        <select id="audio-speed-${audioId}" onchange="changeAudioSpeed('${audioId}', this.value)">
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize audio event listeners
    initializeAudioPlayer(audioId);
}

// Media helper functions
function getVideoMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime'
    };
    return mimeTypes[ext] || 'video/mp4';
}

function getAudioMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4'
    };
    return mimeTypes[ext] || 'audio/mpeg';
}

// Video player functions
function initializeVideoPlayer(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;

    video.addEventListener('timeupdate', () => updateVideoProgress(videoId));
    video.addEventListener('ended', () => handleVideoEnded(videoId));
    video.addEventListener('play', () => updateVideoPlayButton(videoId, true));
    video.addEventListener('pause', () => updateVideoPlayButton(videoId, false));
}

function handleVideoLoad(videoId) {
    const video = document.getElementById(videoId);
    const info = document.getElementById(`video-info-${videoId}`);

    if (video && info) {
        const duration = formatTime(video.duration);
        const dimensions = `${video.videoWidth}x${video.videoHeight}`;
        info.textContent = `${dimensions} • ${duration}`;
    }
}

function handleVideoError(videoId) {
    const info = document.getElementById(`video-info-${videoId}`);
    if (info) {
        info.textContent = 'Error loading video';
    }
}

function toggleVideoPlayback(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;

    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function stopVideo(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;

    video.pause();
    video.currentTime = 0;
}

function changeVideoSpeed(videoId, speed) {
    const video = document.getElementById(videoId);
    if (video) {
        video.playbackRate = parseFloat(speed);
    }
}

function toggleVideoMute(videoId) {
    const video = document.getElementById(videoId);
    const muteBtn = document.getElementById(`mute-btn-${videoId}`);

    if (!video || !muteBtn) return;

    video.muted = !video.muted;
    const icon = muteBtn.querySelector('.material-icons');
    icon.textContent = video.muted ? 'volume_off' : 'volume_up';
}

function changeVideoVolume(videoId, volume) {
    const video = document.getElementById(videoId);
    if (video) {
        video.volume = parseFloat(volume);
    }
}

function seekVideo(videoId, percentage) {
    const video = document.getElementById(videoId);
    if (video && video.duration) {
        video.currentTime = (percentage / 100) * video.duration;
    }
}

function updateVideoProgress(videoId) {
    const video = document.getElementById(videoId);
    const progress = document.getElementById(`progress-${videoId}`);
    const timeDisplay = document.getElementById(`time-${videoId}`);

    if (!video || !progress || !timeDisplay) return;

    if (video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        progress.value = percentage;

        const current = formatTime(video.currentTime);
        const total = formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${total}`;
    }
}

function updateVideoPlayButton(videoId, isPlaying) {
    const playBtn = document.getElementById(`play-btn-${videoId}`);
    if (playBtn) {
        const icon = playBtn.querySelector('.material-icons');
        icon.textContent = isPlaying ? 'pause' : 'play_arrow';
    }
}

function handleVideoEnded(videoId) {
    updateVideoPlayButton(videoId, false);
}

function toggleVideoFullscreen(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;

    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
}

// Audio player functions
function initializeAudioPlayer(audioId) {
    const audio = document.getElementById(audioId);
    if (!audio) return;

    audio.addEventListener('timeupdate', () => updateAudioProgress(audioId));
    audio.addEventListener('ended', () => handleAudioEnded(audioId));
    audio.addEventListener('play', () => updateAudioPlayButton(audioId, true));
    audio.addEventListener('pause', () => updateAudioPlayButton(audioId, false));
}

function handleAudioLoad(audioId) {
    const audio = document.getElementById(audioId);
    const info = document.getElementById(`audio-info-${audioId}`);
    const duration = document.getElementById(`duration-${audioId}`);
    const totalTime = document.getElementById(`total-time-${audioId}`);

    if (audio) {
        const durationText = formatTime(audio.duration);
        if (info) info.textContent = `Duration: ${durationText}`;
        if (duration) duration.textContent = durationText;
        if (totalTime) totalTime.textContent = durationText;
    }
}

function handleAudioError(audioId) {
    const info = document.getElementById(`audio-info-${audioId}`);
    if (info) {
        info.textContent = 'Error loading audio';
    }
}

function toggleAudioPlayback(audioId) {
    const audio = document.getElementById(audioId);
    if (!audio) return;

    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

function skipAudio(audioId, seconds) {
    const audio = document.getElementById(audioId);
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
}

function toggleAudioMute(audioId) {
    const audio = document.getElementById(audioId);
    const muteBtn = document.getElementById(`audio-mute-btn-${audioId}`);

    if (!audio || !muteBtn) return;

    audio.muted = !audio.muted;
    const icon = muteBtn.querySelector('.material-icons');
    icon.textContent = audio.muted ? 'volume_off' : 'volume_up';
}

function changeAudioVolume(audioId, volume) {
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.volume = parseFloat(volume);
    }
}

function changeAudioSpeed(audioId, speed) {
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.playbackRate = parseFloat(speed);
    }
}

function seekAudio(audioId, percentage) {
    const audio = document.getElementById(audioId);
    if (audio && audio.duration) {
        audio.currentTime = (percentage / 100) * audio.duration;
    }
}

function updateAudioProgress(audioId) {
    const audio = document.getElementById(audioId);
    const progress = document.getElementById(`audio-progress-${audioId}`);
    const currentTime = document.getElementById(`current-time-${audioId}`);

    if (!audio || !progress || !currentTime) return;

    if (audio.duration) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        progress.value = percentage;
        currentTime.textContent = formatTime(audio.currentTime);
    }
}

function updateAudioPlayButton(audioId, isPlaying) {
    const playBtn = document.getElementById(`audio-play-btn-${audioId}`);
    if (playBtn) {
        const icon = playBtn.querySelector('.material-icons');
        icon.textContent = isPlaying ? 'pause' : 'play_arrow';
    }
}

function handleAudioEnded(audioId) {
    updateAudioPlayButton(audioId, false);
}

// Initialize file action buttons
function initializeFileActions() {
    // Handle select mode toggle
    const selectModeBtn = document.getElementById('select-mode-btn');
    if (selectModeBtn) {
        selectModeBtn.addEventListener('click', toggleSelectMode);
    }

    // Handle multi-select checkboxes
    document.querySelectorAll('.file-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedFilesCount();
            updateBulkActionButtonsState();
        });
    });

    // Handle bulk action buttons
    document.querySelectorAll('.bulk-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = btn.dataset.action;
            if (action) {
                performBulkAction(action);
            }
        });
    });
}

// Toggle between grid and list view
function initializeViewToggle() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const filesContainer = document.querySelector('.files-container');

    if (gridViewBtn && listViewBtn && filesContainer) {
        gridViewBtn.addEventListener('click', function() {
            filesContainer.classList.remove('files-list');
            filesContainer.classList.add('files-grid');

            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');

            localStorage.setItem('files-view', 'grid');
        });

        listViewBtn.addEventListener('click', function() {
            filesContainer.classList.remove('files-grid');
            filesContainer.classList.add('files-list');

            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');

            localStorage.setItem('files-view', 'list');
        });

        // Apply saved view preference
        const savedView = localStorage.getItem('files-view');
        if (savedView === 'list') {
            listViewBtn.click();
        } else {
            gridViewBtn.click();
        }
    }
}

// Initialize breadcrumbs for folder navigation
function initializeBreadcrumbs() {
    const breadcrumbs = document.querySelector('.breadcrumb');
    if (breadcrumbs) {
        breadcrumbs.addEventListener('click', function(e) {
            const breadcrumbItem = e.target.closest('.breadcrumb-item');
            if (breadcrumbItem) {
                const folderId = breadcrumbItem.dataset.folderId;
                if (folderId) {
                    e.preventDefault();
                    navigateToFolder(folderId);
                }
            }
        });
    }
}

// Toggle select mode for bulk operations
function toggleSelectMode() {
    const filesContainer = document.querySelector('.files-container');
    const bulkToolbar = document.querySelector('.bulk-toolbar');
    const selectModeBtn = document.getElementById('select-mode-btn');

    if (filesContainer && bulkToolbar && selectModeBtn) {
        const isSelectMode = filesContainer.classList.toggle('select-mode');

        // Show/hide checkboxes
        document.querySelectorAll('.file-checkbox').forEach(checkbox => {
            checkbox.style.display = isSelectMode ? 'flex' : 'none';
        });

        // Show/hide bulk toolbar
        bulkToolbar.style.display = isSelectMode ? 'flex' : 'none';

        // Update button
        selectModeBtn.classList.toggle('active', isSelectMode);
        selectModeBtn.querySelector('.material-icons').textContent =
            isSelectMode ? 'close' : 'check_box_outline_blank';

        // Reset selections if exiting select mode
        if (!isSelectMode) {
            document.querySelectorAll('.file-select-checkbox').forEach(cb => {
                cb.checked = false;
            });
            document.querySelectorAll('.file-card').forEach(card => {
                card.classList.remove('selected');
            });
        }

        // Update bulk info
        updateSelectedFilesCount();
    }
}

// Update the count of selected files
function updateSelectedFilesCount() {
    const bulkInfo = document.querySelector('.bulk-info');
    const checkboxes = document.querySelectorAll('.file-select-checkbox:checked');

    if (bulkInfo) {
        bulkInfo.textContent = `${checkboxes.length} item${checkboxes.length === 1 ? '' : 's'} selected`;
    }
}

// Enable/disable bulk action buttons based on selection
function updateBulkActionButtonsState() {
    const hasSelection = document.querySelectorAll('.file-select-checkbox:checked').length > 0;

    document.querySelectorAll('.bulk-action-btn').forEach(btn => {
        btn.disabled = !hasSelection;
    });
}

// Perform bulk actions on selected files
function performBulkAction(action) {
    const selectedFiles = Array.from(document.querySelectorAll('.file-select-checkbox:checked'))
        .map(checkbox => checkbox.closest('.file-card').dataset.fileId);

    if (selectedFiles.length === 0) {
        showToast(window.I18N?.['toast.no_files_selected'] || 'No files selected', 'warning');
        return;
    }

    switch(action) {
        case 'download':
            downloadMultipleFiles(selectedFiles);
            break;
        case 'move':
            moveMultipleFiles(selectedFiles);
            break;
        case 'delete':
            deleteMultipleFiles(selectedFiles);
            break;
        case 'share':
            shareMultipleFiles(selectedFiles);
            break;
        default:
            showToast(window.I18N?.['toast.action_not_implemented'] || 'Action not implemented', 'error');
    }
}

// Navigate to a folder
function navigateToFolder(folderId) {
    window.location.href = `/folders/${folderId}`;
}

// Open a folder (from context menu)
function openFolder(folderId) {
    navigateToFolder(folderId);
}

// Rename a file
function renameFile(fileId) {
    const fileCard = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
    if (!fileCard) return;

    const currentName = fileCard.dataset.filename;
    const newName = prompt('Enter new filename:', currentName);

    if (newName && newName !== currentName) {
        apiRequest('/api/rename_file', {
            method: 'POST',
            body: JSON.stringify({
                file_id: fileId,
                new_name: newName
            })
        })
        .then(response => {
            if (response.success) {
                showToast('File renamed successfully', 'success');
                // Refresh file list
                if (typeof refreshFiles === 'function') {
                    refreshFiles();
                } else {
                    location.reload();
                }
            } else {
                showToast('Failed to rename file: ' + (response.error || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            showToast('Error renaming file: ' + error.message, 'error');
        });
    }
}

// Utility function for time formatting
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function loadTextPreview(filename, container) {
    fetch(`/output/${filename}`)
        .then(response => response.text())
        .then(data => {
            const fileExt = filename.split('.').pop().toLowerCase();
            const lines = data.split('\n');
            const displayLines = lines.slice(0, 500); // Show first 500 lines

            container.innerHTML = `
                <div class="text-preview">
                    <div class="preview-header">
                        <span class="file-type-badge text">${fileExt.toUpperCase()}</span>
                        <span class="file-info">${lines.length} lines</span>
                    </div>
                    <pre class="text-content"><code>${displayLines.join('\n')}</code></pre>
                    ${lines.length > 500 ? '<p class="preview-note">Showing first 500 lines</p>' : ''}
                </div>
            `;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="preview-error">
                    <span class="material-icons">error</span>
                    <p>Error loading text preview: ${error.message}</p>
                </div>
            `;
        });
}

function loadPdfPreview(filename, container) {
    container.innerHTML = `
        <div class="pdf-preview">
            <div class="preview-header">
                <span class="file-type-badge pdf">PDF</span>
                <span class="file-info" id="pdf-info">Loading PDF...</span>
            </div>
            <div class="pdf-viewer">
                <div class="pdf-controls">
                    <div class="control-group">
                        <button class="btn btn-small" onclick="previousPdfPage()" id="prev-page" disabled>
                            <span class="material-icons">navigate_before</span>
                        </button>
                        <span class="page-info">
                            <input type="number" id="page-input" value="1" min="1" onchange="goToPdfPage(this.value)">
                            <span>of <span id="total-pages">-</span></span>
                        </span>
                        <button class="btn btn-small" onclick="nextPdfPage()" id="next-page" disabled>
                            <span class="material-icons">navigate_next</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="zoomPdf(-0.2)" title="Zoom Out">
                            <span class="material-icons">zoom_out</span>
                        </button>
                        <span class="zoom-level" id="pdf-zoom-level">100%</span>
                        <button class="btn btn-small" onclick="zoomPdf(0.2)" title="Zoom In">
                            <span class="material-icons">zoom_in</span>
                        </button>
                    </div>
                    <div class="control-group">
                        <button class="btn btn-small" onclick="fitPdfToWidth()" title="Fit Width">
                            <span class="material-icons">fit_screen</span>
                        </button>
                        <button class="btn btn-small" onclick="rotatePdf()" title="Rotate">
                            <span class="material-icons">rotate_right</span>
                        </button>
                        <button class="btn btn-small" onclick="downloadPdf('${filename}')" title="Download">
                            <span class="material-icons">download</span>
                        </button>
                    </div>
                </div>
                <div class="pdf-container" id="pdf-container">
                    <canvas id="pdf-canvas"></canvas>
                </div>
            </div>
        </div>
    `;

    // Initialize PDF viewer
    initializePdfViewer(filename);
}

// PDF.js viewer state
let pdfViewerState = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    rotation: 0,
    canvas: null,
    ctx: null
};

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function initializePdfViewer(filename) {
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');

    pdfViewerState.canvas = canvas;
    pdfViewerState.ctx = ctx;
    pdfViewerState.currentPage = 1;
    pdfViewerState.scale = 1.0;
    pdfViewerState.rotation = 0;

    // Load PDF
    const url = `/output/${filename}`;

    if (typeof pdfjsLib === 'undefined') {
        // Fallback to iframe if PDF.js is not available
        document.getElementById('pdf-container').innerHTML = `
            <iframe src="${url}" style="width: 100%; height: 500px; border: none;">
                <p>Your browser does not support PDF preview.
                   <a href="${url}" target="_blank">Click here to open the PDF</a>
                </p>
            </iframe>
        `;
        return;
    }

    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdfViewerState.pdfDoc = pdf;
        pdfViewerState.totalPages = pdf.numPages;

        // Update UI
        document.getElementById('total-pages').textContent = pdf.numPages;
        document.getElementById('pdf-info').textContent = `${pdf.numPages} pages`;

        // Enable navigation buttons
        updatePdfNavigationButtons();

        // Render first page
        renderPdfPage(1);

    }).catch(function(error) {
        console.error('Error loading PDF:', error);
        document.getElementById('pdf-container').innerHTML = `
            <div class="preview-error">
                <span class="material-icons">error</span>
                <p>Failed to load PDF</p>
                <a href="${url}" target="_blank" class="btn btn-primary">Open in new tab</a>
            </div>
        `;
    });
}

function renderPdfPage(pageNum) {
    if (!pdfViewerState.pdfDoc) return;

    pdfViewerState.pdfDoc.getPage(pageNum).then(function(page) {
        const viewport = page.getViewport({
            scale: pdfViewerState.scale,
            rotation: pdfViewerState.rotation
        });

        const canvas = pdfViewerState.canvas;
        const ctx = pdfViewerState.ctx;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        page.render(renderContext).promise.then(function() {
            // Update page input
            document.getElementById('page-input').value = pageNum;
            pdfViewerState.currentPage = pageNum;
            updatePdfNavigationButtons();
        });
    });
}

function previousPdfPage() {
    if (pdfViewerState.currentPage > 1) {
        renderPdfPage(pdfViewerState.currentPage - 1);
    }
}

function nextPdfPage() {
    if (pdfViewerState.currentPage < pdfViewerState.totalPages) {
        renderPdfPage(pdfViewerState.currentPage + 1);
    }
}

function goToPdfPage(pageNum) {
    const page = parseInt(pageNum);
    if (page >= 1 && page <= pdfViewerState.totalPages) {
        renderPdfPage(page);
    } else {
        document.getElementById('page-input').value = pdfViewerState.currentPage;
    }
}

function zoomPdf(delta) {
    const newScale = Math.max(0.5, Math.min(3.0, pdfViewerState.scale + delta));
    pdfViewerState.scale = newScale;
    renderPdfPage(pdfViewerState.currentPage);
    updatePdfZoomLevel();
}

function fitPdfToWidth() {
    const container = document.getElementById('pdf-container');
    const containerWidth = container.clientWidth - 40; // Account for padding

    if (pdfViewerState.pdfDoc) {
        pdfViewerState.pdfDoc.getPage(pdfViewerState.currentPage).then(function(page) {
            const viewport = page.getViewport({ scale: 1.0 });
            const scale = containerWidth / viewport.width;
            pdfViewerState.scale = scale;
            renderPdfPage(pdfViewerState.currentPage);
            updatePdfZoomLevel();
        });
    }
}

function rotatePdf() {
    pdfViewerState.rotation = (pdfViewerState.rotation + 90) % 360;
    renderPdfPage(pdfViewerState.currentPage);
}

function downloadPdf(filename) {
    const link = document.createElement('a');
    link.href = `/output/${filename}`;
    link.download = filename;
    link.click();
}

function updatePdfNavigationButtons() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) prevBtn.disabled = pdfViewerState.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = pdfViewerState.currentPage >= pdfViewerState.totalPages;
}

function updatePdfZoomLevel() {
    const zoomLevel = document.getElementById('pdf-zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(pdfViewerState.scale * 100) + '%';
    }
}

function loadGenericPreview(filename, container) {
    const fileExt = filename.split('.').pop().toLowerCase();
    const fileSize = 'Unknown size'; // We'll get this from file stats if available

    container.innerHTML = `
        <div class="generic-preview">
            <div class="preview-header">
                <span class="file-type-badge generic">${fileExt.toUpperCase()}</span>
                <span class="file-info">${fileSize}</span>
            </div>
            <div class="preview-content">
                <span class="material-icons large">insert_drive_file</span>
                <p>File: ${filename}</p>
                <p class="preview-note">Preview not available for this file type. Download to view contents.</p>
            </div>
        </div>
    `;
}

function closePreviewModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Theme and preferences
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');

    if (isDark) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
        sidebar.classList.remove('open');
    } else {
        sidebar.classList.add('open');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    // Ctrl/Cmd + N for new scan
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (window.location.pathname !== '/scan') {
            window.location.href = '/scan';
        }
    }

    // Ctrl/Cmd + , for settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (window.location.pathname !== '/settings') {
            window.location.href = '/settings';
        }
    }
});

// Bulk Operations
function downloadMultipleFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) return;

    if (fileIds.length === 1) {
        // Just download the single file directly
        const fileCard = document.querySelector(`.file-card[data-file-id="${fileIds[0]}"]`);
        if (fileCard) {
            downloadFile(fileCard.dataset.filename);
        }
        return;
    }

    showLoading(L('Đang chuẩn bị tải xuống...','Preparing download...'));

    apiRequest('/api/prepare_bulk_download', {
        method: 'POST',
        body: JSON.stringify({
            file_ids: fileIds
        })
    })
    .then(response => {
        hideLoading();
        if (response.success && response.download_link) {
            // Create a hidden download link
            const link = document.createElement('a');
            link.href = response.download_link;
            link.download = response.archive_name || 'teledrive_files.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast(`Downloading ${fileIds.length} files as ZIP archive`, 'success');
        } else {
            showToast('Failed to prepare download: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Error preparing download: ' + error.message, 'error');
    });
}

function moveMultipleFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) return;

    // If just one file, use the regular move function
    if (fileIds.length === 1) {
        moveFileToFolder(fileIds[0]);
        return;
    }

    // Show folder selection modal for multiple files
    const modalId = 'multi-folder-select-modal-' + Date.now();

    // Create modal structure
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Move ${fileIds.length} Files</h3>
                <button class="modal-close" onclick="document.getElementById('${modalId}').remove();">&times;</button>
            </div>
            <div class="modal-body">
                <div class="folder-tree-container" id="folder-tree-${modalId}">
                    <div class="loading-placeholder">${(window.current_lang||'en')==='vi'?'Đang tải danh sách thư mục...':'Loading folders...'}</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove();">Cancel</button>
                <button class="btn btn-primary" id="move-confirm-btn-${modalId}" disabled>Move</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load folder tree (using null for fileId to show all folders)
    loadFolderTree(modalId, null);

    // Add event listener for move button
    document.getElementById(`move-confirm-btn-${modalId}`).addEventListener('click', function() {
        const selectedFolder = document.querySelector(`#folder-tree-${modalId} .folder-tree-item.selected`);
        if (selectedFolder) {
            const targetFolderId = selectedFolder.dataset.folderId;
            moveMultipleFilesToFolder(fileIds, targetFolderId, modalId);
        }
    });
}

function moveMultipleFilesToFolder(fileIds, targetFolderId, modalId) {
    showLoading(L(`Đang di chuyển ${fileIds.length} tệp...`,`Moving ${fileIds.length} files...`));

    apiRequest('/api/move_multiple_files', {
        method: 'POST',
        body: JSON.stringify({
            file_ids: fileIds,
            target_folder_id: targetFolderId
        })
    })
    .then(response => {
        hideLoading();
        if (response.success) {
            document.getElementById(modalId).remove();
            showToast(L(`${fileIds.length} tệp đã được di chuyển thành công`,`${fileIds.length} files moved successfully`), 'success');

            // Remove file cards from UI
            fileIds.forEach(fileId => {
                const fileCard = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
                if (fileCard) {
                    fileCard.remove();
                }
            });

            // Exit select mode
            toggleSelectMode();

            // Refresh stats
            if (typeof loadStats === 'function') {
                loadStats();
            }
        } else {
            showToast(L('Di chuyển tệp thất bại: ','Failed to move files: ') + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast(L('Lỗi khi di chuyển tệp: ','Error moving files: ') + error.message, 'error');
    });
}

function deleteMultipleFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${fileIds.length} selected file(s)? This action cannot be undone.`)) {
        return;
    }

    showLoading((window.current_lang==='vi'?`Đang xóa ${fileIds.length} tệp...`:`Deleting ${fileIds.length} files...`));

    apiRequest('/api/delete_multiple_files', {
        method: 'POST',
        body: JSON.stringify({
            file_ids: fileIds
        })
    })
    .then(response => {
        hideLoading();
        if (response.success) {
            showToast(L(`${fileIds.length} tệp đã được xóa thành công`,`${fileIds.length} files deleted successfully`), 'success');

            // Remove file cards from UI
            fileIds.forEach(fileId => {
                const fileCard = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
                if (fileCard) {
                    fileCard.remove();
                }
            });

            // Exit select mode
            toggleSelectMode();

            // Refresh stats
            if (typeof loadStats === 'function') {
                loadStats();
            }
        } else {
            showToast(L('Xóa tệp thất bại: ','Failed to delete files: ') + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast(L('Lỗi khi xóa tệp: ','Error deleting files: ') + error.message, 'error');
    });
}

function shareMultipleFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) return;

    showLoading('Preparing share link...');

    apiRequest('/api/share_multiple_files', {
        method: 'POST',
        body: JSON.stringify({
            file_ids: fileIds
        })
    })
    .then(response => {
        hideLoading();
        if (response.success && response.share_link) {
            showShareModal(response.share_link, `${fileIds.length} files`, false, true);
        } else {
            showToast('Failed to create share link: ' + (response.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Error creating share link: ' + error.message, 'error');
    });
}

// Export functions for global use
window.TeleDrive = {
    showToast,
    hideToast: () => document.querySelectorAll('.toast').forEach(t => t.remove()),
    showLoading,
    hideLoading,
    formatFileSize,
    formatDate,
    downloadFile,
    previewFile,
    deleteFile,
    toggleTheme,
    toggleSidebar,
    toggleUserMenu,
    apiRequest,
    // File actions
    renameFile,
    shareFile,
    copyFileLink,
    moveFileToFolder,
    // Folder actions
    openFolder,
    renameFolder,
    deleteFolder,
    shareFolder,
    // Selection mode
    toggleSelectMode
};

// User Menu Functions
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function hideUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Initialize theme on load
initializeTheme();
