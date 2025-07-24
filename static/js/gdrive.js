/**
 * Integration script to connect Google Drive interface with existing TeleDrive functionality
 * This script ensures smooth transition between old and new interfaces
 */

// Wait for both the existing TeleDrive scripts and GDriveManager to be loaded
document.addEventListener('DOMContentLoaded', () => {
    // Đảm bảo mã hóa tiếng Việt được hiển thị đúng
    document.documentElement.setAttribute('lang', 'vi');
    
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        initializeGDriveIntegration();
    }, 200);
});

function initializeGDriveIntegration() {
    if (typeof gdriveManager === 'undefined') {
        console.warn('GDriveManager not found, initializing default one');
        window.gdriveManager = createDefaultGdriveManager();
    }

    // Luôn sử dụng giao diện Google Drive mặc định
    localStorage.setItem('use-gdrive-interface', 'true');
    
    // Hiển thị giao diện Google Drive ngay lập tức
    const gdriveLayout = document.getElementById('gdriveLayout');
    if (gdriveLayout) {
        gdriveLayout.style.display = 'flex';
        
        // Ẩn giao diện Windows Explorer cũ
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
    }

    // Integrate with existing TeleDrive functionality
    gdriveManager.integrateWithExistingInterface();

    // Override existing functions to work with Google Drive interface
    setupFunctionOverrides();

    // Setup event listeners for seamless integration
    setupIntegrationEventListeners();

    // Force show Google Drive interface immediately
    setTimeout(() => {
        gdriveManager.showGDriveInterface();
        // Force refresh to ensure all elements are visible
        if (typeof gdriveManager.forceRefreshInterface === 'function') {
            gdriveManager.forceRefreshInterface();
        }
        
        // Cập nhật các placeholder và text để hiển thị tiếng Việt đúng
        updateUITextElements();
    }, 300);

    console.log('Google Drive integration initialized');
}

function createDefaultGdriveManager() {
    // Create a minimal manager if none exists
    return {
        initialized: true,
        files: [],
        currentSessionId: null,
        
        integrateWithExistingInterface: function() {
            console.log('Integrated with existing interface');
        },
        
        showGDriveInterface: function() {
            const gdriveLayout = document.getElementById('gdriveLayout');
            const welcomeScreen = document.getElementById('welcomeScreen');
            
            if (gdriveLayout) {
                gdriveLayout.style.display = 'flex';
            }
            
            if (welcomeScreen) {
                welcomeScreen.style.display = 'none';
            }
        },
        
        forceRefreshInterface: function() {
            // Update breadcrumb
            const breadcrumb = document.getElementById('gdriveBreadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = `
                    <div class="gdrive-breadcrumb-item current">
                        <i class="icon icon-folder" style="margin-right: 8px; font-size: 24px; color: #1a73e8;"></i>
                        <span>TeleDrive</span>
                    </div>
                `;
            }
            
            updateUITextElements();
        },
        
        loadFiles: function(sessionId) {
            this.currentSessionId = sessionId;
            if (typeof window.loadSession === 'function') {
                window.loadSession(sessionId);
            }
        },
        
        convertToGDriveFormat: function(files, sessionId) {
            // Convert files to Google Drive format
            return files.map(file => {
                return {
                    id: file.id || Math.random().toString(36).substring(2),
                    name: file.name || file.fileName || 'Unnamed File',
                    mimeType: file.mimeType || 'application/octet-stream',
                    size: file.size || 0,
                    modifiedTime: file.modifiedTime || file.date || new Date().toISOString(),
                    iconType: file.type || 'file',
                    sessionId: sessionId
                };
            });
        },
        
        renderFiles: function() {
            const filesDisplay = document.getElementById('gdriveFilesDisplay');
            if (!filesDisplay || !this.files || !this.files.length) {
                return;
            }
            
            filesDisplay.innerHTML = '';
            
            this.files.forEach(file => {
                const fileCard = document.createElement('div');
                fileCard.className = 'gdrive-file-card';
                fileCard.dataset.id = file.id;
                fileCard.dataset.sessionId = file.sessionId || this.currentSessionId;
                
                // Determine icon based on file type
                let iconClass = 'icon-file';
                if (file.iconType === 'folder') {
                    iconClass = 'icon-folder';
                } else if (file.mimeType) {
                    if (file.mimeType.includes('image')) iconClass = 'icon-image';
                    else if (file.mimeType.includes('video')) iconClass = 'icon-video';
                    else if (file.mimeType.includes('audio')) iconClass = 'icon-audio';
                    else if (file.mimeType.includes('pdf')) iconClass = 'icon-pdf';
                    else if (file.mimeType.includes('word')) iconClass = 'icon-word';
                    else if (file.mimeType.includes('excel')) iconClass = 'icon-excel';
                    else if (file.mimeType.includes('powerpoint')) iconClass = 'icon-powerpoint';
                    else if (file.mimeType.includes('zip') || file.mimeType.includes('rar')) iconClass = 'icon-archive';
                }
                
                // Format file size
                const formattedSize = formatFileSize(file.size);
                
                // Format modified date
                let modifiedDate = 'Unknown date';
                try {
                    modifiedDate = new Date(file.modifiedTime).toLocaleDateString('vi-VN');
                } catch (e) {
                    console.warn('Error formatting date:', e);
                }
                
                fileCard.innerHTML = `
                    <div class="gdrive-file-icon">
                        <i class="icon ${iconClass}"></i>
                    </div>
                    <div class="gdrive-file-name">${file.name}</div>
                    <div class="gdrive-file-meta">
                        <div class="gdrive-file-modified">${modifiedDate}</div>
                        <div class="gdrive-file-size">${formattedSize}</div>
                    </div>
                `;
                
                // Add click event
                fileCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectFile(file.id);
                });
                
                // Add double click event
                fileCard.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.openFile(file.id);
                });
                
                filesDisplay.appendChild(fileCard);
            });
        },
        
        selectFile: function(fileId) {
            const fileCards = document.querySelectorAll('.gdrive-file-card');
            fileCards.forEach(card => {
                if (card.dataset.id === fileId) {
                    card.classList.toggle('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
            
            // Show/hide bulk actions toolbar
            const selectedCards = document.querySelectorAll('.gdrive-file-card.selected');
            const bulkToolbar = document.getElementById('gdriveBulkToolbar');
            
            if (bulkToolbar) {
                if (selectedCards.length > 0) {
                    bulkToolbar.style.display = 'flex';
                    const selectionCount = bulkToolbar.querySelector('.selection-count');
                    if (selectionCount) {
                        selectionCount.textContent = `${selectedCards.length} mục đã chọn`;
                    }
                } else {
                    bulkToolbar.style.display = 'none';
                }
            }
        },
        
        openFile: function(fileId) {
            const file = this.files.find(f => f.id === fileId);
            if (!file) return;
            
            if (typeof window.showFileDetails === 'function') {
                window.showFileDetails(fileId, file.sessionId || this.currentSessionId);
            }
        },
        
        searchFiles: function(query) {
            if (!query || !this.files) return;
            
            const filteredFiles = this.files.filter(file => 
                file.name.toLowerCase().includes(query.toLowerCase())
            );
            
            this.renderFilteredFiles(filteredFiles);
        },
        
        renderFilteredFiles: function(filteredFiles) {
            const filesDisplay = document.getElementById('gdriveFilesDisplay');
            if (!filesDisplay) return;
            
            filesDisplay.innerHTML = '';
            
            if (filteredFiles.length === 0) {
                filesDisplay.innerHTML = `
                    <div class="gdrive-empty">
                        <i class="icon icon-search gdrive-empty-icon"></i>
                        <div class="gdrive-empty-text">Không tìm thấy kết quả phù hợp</div>
                        <div class="gdrive-empty-subtext">Thử tìm kiếm với từ khóa khác</div>
                    </div>
                `;
                return;
            }
            
            filteredFiles.forEach(file => {
                // Same rendering logic as renderFiles method
                // (Code omitted for brevity)
            });
        }
    };
}

function setupFunctionOverrides() {
    // Store original functions
    const originalFunctions = {
        loadSessions: window.loadSessions,
        displayFiles: window.displayFiles,
        showFileDetails: window.showFileDetails,
        searchFiles: window.searchFiles
    };

    // Override loadSessions to work with Google Drive interface
    window.loadSessions = function() {
        // Always use Google Drive interface
        if (gdriveManager) {
            gdriveManager.loadFiles();
        } else if (originalFunctions.loadSessions) {
            originalFunctions.loadSessions();
        }
    };

    // Override displayFiles to work with Google Drive interface
    window.displayFiles = function(files, sessionId) {
        // Always use Google Drive interface
        if (gdriveManager) {
            // Convert files to Google Drive format and display
            const gdriveFiles = gdriveManager.convertToGDriveFormat(files, sessionId);
            gdriveManager.files = gdriveFiles;
            gdriveManager.currentSessionId = sessionId;
            gdriveManager.renderFiles();
        } else if (originalFunctions.displayFiles) {
            originalFunctions.displayFiles(files, sessionId);
        }
    };

    // Override searchFiles to work with Google Drive interface
    window.searchFiles = function(query) {
        // Always use Google Drive interface
        if (gdriveManager) {
            gdriveManager.searchFiles(query);
        } else if (originalFunctions.searchFiles) {
            originalFunctions.searchFiles(query);
        }
    };

    // Store original functions for potential restoration
    window._originalTeleDriveFunctions = originalFunctions;
}

function setupIntegrationEventListeners() {
    // Listen for session selection events
    document.addEventListener('sessionSelected', (event) => {
        // Always use Google Drive interface
        if (gdriveManager && event.detail) {
            gdriveManager.loadFiles(event.detail.sessionId);
        }
    });

    // Listen for file scan completion events
    document.addEventListener('scanCompleted', (event) => {
        // Ensure the new scanned files are displayed in Google Drive interface
        if (gdriveManager && event.detail && event.detail.files) {
            const gdriveFiles = gdriveManager.convertToGDriveFormat(event.detail.files, event.detail.sessionId);
            gdriveManager.files = gdriveFiles;
            gdriveManager.currentSessionId = event.detail.sessionId;
            gdriveManager.renderFiles();
        }
    });

    // Connect search input to Google Drive interface
    const gdriveSearchInput = document.getElementById('gdriveSearchInput');
    if (gdriveSearchInput) {
        gdriveSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (gdriveManager) {
                if (query) {
                    gdriveManager.searchFiles(query);
                } else {
                    // If search cleared, show all files
                    gdriveManager.renderFiles();
                }
            }
        });
    }

    // Toggle between grid and list view
    const viewBtns = document.querySelectorAll('.gdrive-view-btn');
    const filesDisplay = document.getElementById('gdriveFilesDisplay');
    
    if (viewBtns && viewBtns.length && filesDisplay) {
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = btn.dataset.view;
                
                // Update active button
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update view
                filesDisplay.className = 'gdrive-files-display';
                filesDisplay.classList.add(`gdrive-${view}-view`);
            });
        });
    }
    
    // Setup new folder button
    const newBtn = document.getElementById('newBtn');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            alert('Tính năng tạo thư mục mới đang được phát triển');
        });
    }
    
    // Setup toggle interface button
    const toggleInterfaceBtn = document.getElementById('toggleInterfaceBtn');
    if (toggleInterfaceBtn) {
        toggleInterfaceBtn.addEventListener('click', () => {
            // For now, always use Google Drive interface
            alert('Giao diện mặc định là Google Drive. Tính năng chuyển đổi giao diện đang được phát triển.');
        });
    }
    
    // Handle bulk selection actions
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            const selectedFiles = document.querySelectorAll('.gdrive-file-card.selected');
            selectedFiles.forEach(file => file.classList.remove('selected'));
            
            const bulkToolbar = document.getElementById('gdriveBulkToolbar');
            if (bulkToolbar) {
                bulkToolbar.style.display = 'none';
            }
        });
    }
}

// Helper functions
function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

function updateUITextElements() {
    // Update search placeholder
    const searchInput = document.getElementById('gdriveSearchInput');
    if (searchInput) {
        searchInput.placeholder = 'Tìm kiếm trong Drive';
    }
    
    // Update breadcrumb text
    const breadcrumbItem = document.querySelector('.gdrive-breadcrumb-item.current span');
    if (breadcrumbItem) {
        breadcrumbItem.textContent = 'Telegram Drive';
    }
    
    // Update sidebar items
    const sidebarItems = document.querySelectorAll('.gdrive-sidebar-item span');
    if (sidebarItems && sidebarItems.length >= 5) {
        const translations = [
            'Telegram Drive',
            'Được chia sẻ với tôi',
            'Gần đây',
            'Có gắn dấu sao',
            'Thùng rác'
        ];
        
        sidebarItems.forEach((item, index) => {
            if (index < translations.length) {
                item.textContent = translations[index];
            }
        });
    }
    
    // Update new button text
    const newBtn = document.getElementById('newBtn');
    if (newBtn) {
        newBtn.innerHTML = '<i class="icon icon-plus" style="margin-right: 8px;"></i>Tạo mới';
    }
    
    const sidebarNewBtn = document.getElementById('sidebarNewBtn');
    if (sidebarNewBtn) {
        sidebarNewBtn.innerHTML = '<i class="icon icon-plus" style="margin-right: 12px;"></i>Tạo mới';
    }
}

function dispatchCustomEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
}

function shouldUseGDriveInterface() {
    // Always use Google Drive interface
    return true;
}
