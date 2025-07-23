/**
 * Google Drive-like File Manager for TeleDrive
 * Implements modern file management interface with Google Drive UX patterns
 */

class GDriveManager {
    constructor() {
        this.currentView = 'grid'; // 'grid' or 'list'
        this.currentPath = '/';
        this.selectedFiles = new Set();
        this.files = [];
        this.searchQuery = '';
        this.searchFilters = {
            type: '',
            size: '',
            date: ''
        };
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.contextMenu = null;
        this.draggedItems = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupContextMenu();
        this.setupKeyboardShortcuts();
        this.setupKeyboardNavigation();
        this.setupModal();
        this.setupInterfaceToggle();
        this.setupSearchFilters();
        this.setupBulkOperations();
        this.setupNewButtons();

        // Luôn sử dụng giao diện Google Drive mặc định
        localStorage.setItem('use-gdrive-interface', 'true');

        // Force show Google Drive interface on initialization
        setTimeout(() => {
            this.showGDriveInterface();
            this.loadFiles();
            this.forceRefreshInterface(); // Đảm bảo giao diện được hiển thị đúng
        }, 200);
    }

    setupEventListeners() {
        // View toggle buttons
        const gridBtn = document.querySelector('[data-view="grid"]');
        const listBtn = document.querySelector('[data-view="list"]');
        
        if (gridBtn) {
            gridBtn.addEventListener('click', () => this.setView('grid'));
        }
        if (listBtn) {
            listBtn.addEventListener('click', () => this.setView('list'));
        }

        // Search functionality
        const searchInput = document.querySelector('.gdrive-search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value;

                // Debounce search to avoid too many API calls
                searchTimeout = setTimeout(() => {
                    this.searchFiles(query);
                }, 300);
            });
        }

        // File selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.gdrive-file-card, .gdrive-list-item')) {
                this.handleFileClick(e);
            } else if (!e.target.closest('.gdrive-context-menu')) {
                this.clearSelection();
                this.hideContextMenu();
            }
        });

        // Double click to open files
        document.addEventListener('dblclick', (e) => {
            const fileElement = e.target.closest('.gdrive-file-card, .gdrive-list-item');
            if (fileElement) {
                this.openFile(fileElement.dataset.fileId);
            }
        });
    }

    setView(viewType) {
        this.currentView = viewType;
        
        // Update view toggle buttons
        document.querySelectorAll('.gdrive-view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`).classList.add('active');
        
        // Re-render files with new view
        this.renderFiles();
        
        // Save preference
        localStorage.setItem('gdrive-view', viewType);
    }

    handleFileClick(e) {
        const fileElement = e.target.closest('.gdrive-file-card, .gdrive-list-item');
        const fileId = fileElement.dataset.fileId;
        
        if (e.ctrlKey || e.metaKey) {
            // Multi-select with Ctrl/Cmd
            this.toggleFileSelection(fileId, fileElement);
        } else if (e.shiftKey && this.selectedFiles.size > 0) {
            // Range select with Shift
            this.selectFileRange(fileId);
        } else {
            // Single select
            this.clearSelection();
            this.selectFile(fileId, fileElement);
        }
    }

    selectFile(fileId, element) {
        this.selectedFiles.add(fileId);
        element.classList.add('selected');
        this.updateSelectionUI();
    }

    toggleFileSelection(fileId, element) {
        if (this.selectedFiles.has(fileId)) {
            this.selectedFiles.delete(fileId);
            element.classList.remove('selected');
        } else {
            this.selectedFiles.add(fileId);
            element.classList.add('selected');
        }
        this.updateSelectionUI();
    }

    clearSelection() {
        this.selectedFiles.clear();
        document.querySelectorAll('.gdrive-file-card, .gdrive-list-item').forEach(el => {
            el.classList.remove('selected');
        });
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const count = this.selectedFiles.size;
        const bulkToolbar = document.getElementById('gdriveBulkToolbar');
        const selectionCount = document.querySelector('.selection-count');

        if (bulkToolbar) {
            if (count > 0) {
                bulkToolbar.style.display = 'flex';
                if (selectionCount) {
                    selectionCount.textContent = `${count} item${count > 1 ? 's' : ''} selected`;
                }
            } else {
                bulkToolbar.style.display = 'none';
            }
        }
    }

    renderFiles() {
        const container = document.getElementById('gdriveFilesDisplay') ||
                         document.querySelector('.files-display') ||
                         document.querySelector('#filesDisplay');
        if (!container) return;

        if (this.currentView === 'grid') {
            this.renderGridView(container);
        } else {
            this.renderListView(container);
        }
    }

    renderGridView(container) {
        container.innerHTML = '';
        container.className = 'gdrive-files-display gdrive-grid-view';
        
        if (!this.files || this.files.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        // Group files by type: folders first, then files
        const folders = this.files.filter(file => file.type === 'folder');
        const files = this.files.filter(file => file.type !== 'folder');
        
        // Sort folders and files separately
        const sortedFolders = this.sortFiles(folders);
        const sortedFiles = this.sortFiles(files);
        
        // Combine: folders first, then files
        const sortedItems = [...sortedFolders, ...sortedFiles];
        
        sortedItems.forEach(file => {
            const isSelected = this.selectedFiles.has(file.id);
            
            const fileCard = document.createElement('div');
            fileCard.className = `gdrive-file-card ${isSelected ? 'selected' : ''}`;
            fileCard.dataset.fileId = file.id;
            fileCard.tabIndex = 0;
            
            // Enhanced hover effects for Google Drive-like appearance
            fileCard.innerHTML = `
                <div class="gdrive-file-icon">
                    <i class="icon ${this.getFileIcon(file)}"></i>
                </div>
                <div class="gdrive-file-name">${this.escapeHtml(file.name)}</div>
                <div class="gdrive-file-meta">
                    <span class="gdrive-file-modified">${this.formatDate(file.modified || file.date)}</span>
                    ${file.size ? `<span class="gdrive-file-size">${this.formatFileSize(file.size)}</span>` : ''}
                </div>
                <div class="gdrive-file-actions">
                    <button class="gdrive-btn-ghost gdrive-action-btn" data-action="share" title="Share">
                        <i class="icon icon-share"></i>
                    </button>
                    <button class="gdrive-btn-ghost gdrive-action-btn" data-action="more" title="More actions">
                        <i class="icon icon-more"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(fileCard);
            
            // Setup file click and context menu
            fileCard.addEventListener('click', (e) => {
                if (e.target.closest('.gdrive-action-btn')) return;
                this.handleFileClick(e);
            });
            
            // Setup right-click for context menu
            fileCard.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.selectFile(file.id, fileCard);
                this.showContextMenu(e.clientX, e.clientY, file.id);
            });
            
            // Setup double-click to open
            fileCard.addEventListener('dblclick', () => {
                this.openFile(file.id);
            });
            
            // Set up hover effects for action buttons
            const actionButtons = fileCard.querySelectorAll('.gdrive-action-btn');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = button.dataset.action;
                    
                    if (action === 'share') {
                        this.shareFiles([file.id]);
                    } else if (action === 'more') {
                        this.showContextMenu(e.clientX, e.clientY, file.id);
                    }
                });
            });
        });
    }

    renderListView(container) {
        container.innerHTML = '';
        container.className = 'gdrive-files-display gdrive-list-view';
        
        if (!this.files || this.files.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        // Create header for list view
        const headerRow = document.createElement('div');
        headerRow.className = 'gdrive-list-header';
        headerRow.innerHTML = `
            <div class="gdrive-list-cell gdrive-list-name-header" data-sort="name">
                <span>Name</span>
                <i class="icon icon-sort${this.sortBy === 'name' ? (this.sortOrder === 'asc' ? ' icon-sort-asc' : ' icon-sort-desc') : ''}"></i>
            </div>
            <div class="gdrive-list-cell gdrive-list-owner-header" data-sort="owner">
                <span>Owner</span>
                <i class="icon icon-sort${this.sortBy === 'owner' ? (this.sortOrder === 'asc' ? ' icon-sort-asc' : ' icon-sort-desc') : ''}"></i>
            </div>
            <div class="gdrive-list-cell gdrive-list-modified-header" data-sort="modified">
                <span>Last modified</span>
                <i class="icon icon-sort${this.sortBy === 'modified' ? (this.sortOrder === 'asc' ? ' icon-sort-asc' : ' icon-sort-desc') : ''}"></i>
            </div>
            <div class="gdrive-list-cell gdrive-list-size-header" data-sort="size">
                <span>File size</span>
                <i class="icon icon-sort${this.sortBy === 'size' ? (this.sortOrder === 'asc' ? ' icon-sort-asc' : ' icon-sort-desc') : ''}"></i>
            </div>
        `;
        container.appendChild(headerRow);
        
        // Add click handlers for sorting
        const sortHeaders = headerRow.querySelectorAll('[data-sort]');
        sortHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.dataset.sort;
                if (this.sortBy === sortField) {
                    // Toggle sort order if already sorting by this field
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    // New sort field, default to ascending
                    this.sortBy = sortField;
                    this.sortOrder = 'asc';
                }
                
                // Re-render with new sort
                this.renderFiles();
            });
        });
        
        // Group files by type: folders first, then files
        const folders = this.files.filter(file => file.type === 'folder');
        const files = this.files.filter(file => file.type !== 'folder');
        
        // Sort folders and files separately
        const sortedFolders = this.sortFiles(folders);
        const sortedFiles = this.sortFiles(files);
        
        // Combine: folders first, then files
        const sortedItems = [...sortedFolders, ...sortedFiles];
        
        // Create file rows
        sortedItems.forEach(file => {
            const isSelected = this.selectedFiles.has(file.id);
            
            const fileRow = document.createElement('div');
            fileRow.className = `gdrive-list-item ${isSelected ? 'selected' : ''}`;
            fileRow.dataset.fileId = file.id;
            fileRow.tabIndex = 0;
            
            fileRow.innerHTML = `
                <div class="gdrive-list-cell gdrive-list-name">
                    <div class="gdrive-list-icon">
                        <i class="icon ${this.getFileIcon(file)}"></i>
                    </div>
                    <span class="gdrive-list-title">${this.escapeHtml(file.name)}</span>
                </div>
                <div class="gdrive-list-cell gdrive-list-owner">
                    <span>Me</span>
                </div>
                <div class="gdrive-list-cell gdrive-list-modified">
                    <span>${this.formatDate(file.modified || file.date)}</span>
                </div>
                <div class="gdrive-list-cell gdrive-list-size">
                    <span>${file.size ? this.formatFileSize(file.size) : '—'}</span>
                </div>
            `;
            
            container.appendChild(fileRow);
            
            // Setup file click and context menu
            fileRow.addEventListener('click', (e) => {
                this.handleFileClick(e);
            });
            
            // Setup right-click for context menu
            fileRow.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.selectFile(file.id, fileRow);
                this.showContextMenu(e.clientX, e.clientY, file.id);
            });
            
            // Setup double-click to open
            fileRow.addEventListener('dblclick', () => {
                this.openFile(file.id);
            });
        });
    }

    getFileIcon(file) {
        if (file.type === 'folder') return 'icon-folder';
        
        // Detect file type from extension
        const ext = file.name.split('.').pop().toLowerCase();
        
        // Map extensions to icons
        switch (ext) {
            // Documents
            case 'pdf': return 'icon-pdf';
            case 'doc': case 'docx': return 'icon-word';
            case 'xls': case 'xlsx': case 'csv': return 'icon-excel';
            case 'ppt': case 'pptx': return 'icon-powerpoint';
            case 'txt': case 'rtf': return 'icon-file-text';
            
            // Images
            case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'webp': return 'icon-image';
            
            // Videos
            case 'mp4': case 'avi': case 'mov': case 'wmv': case 'mkv': case 'flv': return 'icon-video';
            
            // Audio
            case 'mp3': case 'wav': case 'ogg': case 'flac': case 'm4a': return 'icon-audio';
            
            // Archives
            case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return 'icon-archive';
            
            // Code
            case 'html': case 'css': case 'js': case 'py': case 'java': case 'php': case 'json': case 'xml': return 'icon-code';
            
            // Executable
            case 'exe': case 'bat': case 'cmd': case 'sh': return 'icon-executable';
            
            // Default
            default: return 'icon-file';
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '-';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    filterFiles() {
        // Implementation for filtering files based on search query
        // This will be expanded in the next iteration
        console.log('Filtering files with query:', this.searchQuery);
    }

    async loadFiles(sessionId = null) {
        try {
            this.showLoading(true);

            const params = new URLSearchParams();
            if (sessionId) {
                params.append('session_id', sessionId);
            }
            params.append('view', this.currentView);
            params.append('sort', this.sortBy);
            params.append('order', this.sortOrder);
            if (this.searchQuery) {
                params.append('q', this.searchQuery);
            }

            const response = await fetch(`/api/files/test`);
            const data = await response.json();

            if (data.success) {
                this.files = data.files;
                this.currentSessionId = sessionId;
                this.updateBreadcrumb(data.path, data.session_info);
                this.renderFiles();

                // Update session info if available
                if (data.session_info) {
                    this.updateSessionInfo(data.session_info);
                }
            } else {
                this.showError('Failed to load files: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading files:', error);
            this.showError('Failed to load files. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async searchFiles(query) {
        try {
            this.showLoading(true);
            this.searchQuery = query;

            if (!query.trim()) {
                // If search is empty, reload current files
                await this.loadFiles(this.currentSessionId);
                return;
            }

            const params = new URLSearchParams();
            params.append('q', query);
            params.append('sort', this.sortBy);
            params.append('order', this.sortOrder);
            if (this.currentSessionId) {
                params.append('session_id', this.currentSessionId);
            }

            const response = await fetch(`/api/files/test`);
            const data = await response.json();

            if (data.success) {
                this.files = data.files;
                this.renderFiles();
                this.updateSearchResults(data.total, query);
            } else {
                this.showError('Search failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error searching files:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const container = document.querySelector('.files-display');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 200px; color: var(--text-secondary);">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
                        <div>Loading files...</div>
                    </div>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.querySelector('.files-display');
        if (!container) return;

        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 200px; color: var(--error);">
                <div style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
    }

    updateBreadcrumb(path, sessionInfo) {
        const breadcrumb = document.getElementById('gdriveBreadcrumb');
        if (!breadcrumb) return;

        let breadcrumbHTML = '';

        if (sessionInfo) {
            // We're inside a session
            breadcrumbHTML = `
                <div class="gdrive-breadcrumb-item" onclick="gdriveManager.loadFiles()">
                    <i class="icon icon-cloud"></i>
                    <span>My Drive</span>
                </div>
                <span class="gdrive-breadcrumb-separator">›</span>
                <div class="gdrive-breadcrumb-item current">
                    <i class="icon icon-folder"></i>
                    <span>${sessionInfo.name}</span>
                </div>
            `;
        } else {
            // We're at the root level
            breadcrumbHTML = `
                <div class="gdrive-breadcrumb-item current">
                    <i class="icon icon-cloud"></i>
                    <span>My Drive</span>
                </div>
            `;
        }

        breadcrumb.innerHTML = breadcrumbHTML;
    }

    updateSessionInfo(sessionInfo) {
        const sessionInfoElement = document.getElementById('sessionInfo');
        const sessionName = document.getElementById('sessionName');
        const totalFiles = document.getElementById('totalFiles');
        const totalSize = document.getElementById('totalSize');

        if (sessionInfoElement && sessionInfo) {
            sessionInfoElement.style.display = 'block';
            if (sessionName) sessionName.textContent = sessionInfo.name;
            if (totalFiles) totalFiles.textContent = `${sessionInfo.total_files} files`;
            if (totalSize) totalSize.textContent = this.formatFileSize(sessionInfo.total_size);
        } else if (sessionInfoElement) {
            sessionInfoElement.style.display = 'none';
        }
    }

    updateSearchResults(total, query) {
        // Update UI to show search results
        const breadcrumb = document.getElementById('gdriveBreadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <div class="gdrive-breadcrumb-item" onclick="gdriveManager.loadFiles()">
                    <i class="icon icon-cloud"></i>
                    <span>My Drive</span>
                </div>
                <span class="gdrive-breadcrumb-separator">›</span>
                <div class="gdrive-breadcrumb-item current">
                    <i class="icon icon-search"></i>
                    <span>Search results for "${query}" (${total} items)</span>
                </div>
            `;
        }
    }

    setupDragAndDrop() {
        const container = document.querySelector('.files-display');
        if (!container) return;

        // File drag start
        container.addEventListener('dragstart', (e) => {
            const fileElement = e.target.closest('.gdrive-file-card, .gdrive-list-item');
            if (fileElement) {
                const fileId = fileElement.dataset.fileId;
                this.draggedItems = this.selectedFiles.has(fileId)
                    ? Array.from(this.selectedFiles)
                    : [fileId];

                e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedItems));
                e.dataTransfer.effectAllowed = 'move';

                // Add visual feedback
                fileElement.style.opacity = '0.5';
            }
        });

        // File drag end
        container.addEventListener('dragend', (e) => {
            const fileElement = e.target.closest('.gdrive-file-card, .gdrive-list-item');
            if (fileElement) {
                fileElement.style.opacity = '';
            }
        });

        // Drop zone setup
        this.setupDropZone();
    }

    setupDropZone() {
        const dropZone = document.querySelector('.files-display');
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dropZone.addEventListener('dragover', (e) => {
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files);
            }
        });
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('gdriveContextMenu');
        if (!contextMenu) return;

        // Right-click on files
        document.addEventListener('contextmenu', (e) => {
            const fileElement = e.target.closest('.gdrive-file-card, .gdrive-list-item');
            if (fileElement) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, fileElement.dataset.fileId);
            }
        });

        // Context menu item clicks
        contextMenu.addEventListener('click', (e) => {
            const contextItem = e.target.closest('.gdrive-context-item');
            const action = contextItem ? contextItem.dataset.action : null;
            if (action) {
                this.handleContextAction(action);
                this.hideContextMenu();
            }
        });

        // Hide context menu on outside click
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+A - Select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            }

            // Delete key - Delete selected files
            if (e.key === 'Delete' && this.selectedFiles.size > 0) {
                this.deleteSelectedFiles();
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
                this.hideContextMenu();
            }

            // Ctrl+C - Copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.selectedFiles.size > 0) {
                this.copySelectedFiles();
            }

            // Ctrl+V - Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                this.pasteFiles();
            }
        });
    }

    showContextMenu(x, y, fileId) {
        const contextMenu = document.getElementById('gdriveContextMenu');
        if (!contextMenu) return;

        // Select the file if not already selected
        if (!this.selectedFiles.has(fileId)) {
            this.clearSelection();
            const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
            if (fileElement) {
                this.selectFile(fileId, fileElement);
            }
        }

        // Position and show context menu
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';

        // Adjust position if menu goes off screen
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${y - rect.height}px`;
        }
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('gdriveContextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    handleContextAction(action) {
        const selectedIds = Array.from(this.selectedFiles);

        switch (action) {
            case 'open':
                if (selectedIds.length === 1) {
                    this.openFile(selectedIds[0]);
                }
                break;
            case 'download':
                this.downloadFiles(selectedIds);
                break;
            case 'rename':
                if (selectedIds.length === 1) {
                    this.renameFile(selectedIds[0]);
                }
                break;
            case 'copy':
                this.copySelectedFiles();
                break;
            case 'move':
                this.moveFiles(selectedIds);
                break;
            case 'share':
                this.shareFiles(selectedIds);
                break;
            case 'star':
                this.toggleStarFiles(selectedIds);
                break;
            case 'delete':
                this.deleteSelectedFiles();
                break;
        }
    }

    openFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        if (file.type === 'folder' || fileId.startsWith('session_')) {
            this.navigateToFolder(fileId);
        } else {
            this.showFilePreview(file);
        }
    }

    showFilePreview(file) {
        const modal = document.getElementById('gdriveModal');
        const title = document.getElementById('gdriveModalTitle');
        const body = document.getElementById('gdriveModalBody');

        if (!modal || !title || !body) return;

        this.currentPreviewFile = file;
        this.currentPreviewIndex = this.files.findIndex(f => f.id === file.id);

        title.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span>${this.escapeHtml(file.name)}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="gdrive-btn-ghost" onclick="gdriveManager.showPreviousFile()" ${this.currentPreviewIndex <= 0 ? 'disabled' : ''}>
                        <i class="icon icon-chevron-left"></i>
                    </button>
                    <button class="gdrive-btn-ghost" onclick="gdriveManager.showNextFile()" ${this.currentPreviewIndex >= this.files.length - 1 ? 'disabled' : ''}>
                        <i class="icon icon-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Create preview content based on file type
        let previewContent = '';
        if (file.type === 'image') {
            previewContent = `
                <div class="gdrive-preview-container">
                    <img src="${file.preview_url || file.download_url}"
                         style="max-width: 100%; max-height: 70vh; object-fit: contain;"
                         alt="${this.escapeHtml(file.name)}"
                         onload="this.style.opacity=1"
                         style="opacity: 0; transition: opacity 0.3s;">
                    <div class="gdrive-preview-info">
                        <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                        <p><strong>Modified:</strong> ${this.formatDate(file.modified)}</p>
                    </div>
                </div>
            `;
        } else if (file.type === 'video') {
            previewContent = `
                <div class="gdrive-preview-container">
                    <video controls style="max-width: 100%; max-height: 70vh;">
                        <source src="${file.preview_url || file.download_url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="gdrive-preview-info">
                        <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                        <p><strong>Modified:</strong> ${this.formatDate(file.modified)}</p>
                    </div>
                </div>
            `;
        } else if (file.type === 'audio') {
            previewContent = `
                <div class="gdrive-preview-container" style="text-align: center; padding: 40px;">
                    <div style="font-size: 64px; margin-bottom: 24px;">${this.getFileIcon(file)}</div>
                    <h3>${this.escapeHtml(file.name)}</h3>
                    <audio controls style="width: 100%; max-width: 400px; margin: 20px 0;">
                        <source src="${file.preview_url || file.download_url}" type="audio/mpeg">
                        Your browser does not support the audio tag.
                    </audio>
                    <div class="gdrive-preview-info">
                        <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                        <p><strong>Modified:</strong> ${this.formatDate(file.modified)}</p>
                    </div>
                </div>
            `;
        } else if (file.type === 'document' && file.name.toLowerCase().endsWith('.pdf')) {
            previewContent = `
                <div class="gdrive-preview-container">
                    <iframe src="${file.preview_url || file.download_url}"
                            style="width: 100%; height: 70vh; border: none;">
                    </iframe>
                    <div class="gdrive-preview-info">
                        <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                        <p><strong>Modified:</strong> ${this.formatDate(file.modified)}</p>
                    </div>
                </div>
            `;
        } else {
            previewContent = `
                <div class="gdrive-preview-container" style="text-align: center; padding: 40px;">
                    <div style="font-size: 64px; margin-bottom: 24px;">${this.getFileIcon(file)}</div>
                    <h3>${this.escapeHtml(file.name)}</h3>
                    <div class="gdrive-preview-info">
                        <p><strong>Type:</strong> ${this.capitalizeFirst(file.type)}</p>
                        <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                        <p><strong>Modified:</strong> ${this.formatDate(file.modified)}</p>
                    </div>
                    <div style="margin-top: 24px;">
                        <button class="gdrive-btn-primary" onclick="window.open('${file.download_url}', '_blank')">
                            <i class="icon icon-download"></i>
                            Download
                        </button>
                        <button class="gdrive-btn-secondary" onclick="gdriveManager.shareFiles(['${file.id}'])" style="margin-left: 12px;">
                            <i class="icon icon-share"></i>
                            Share
                        </button>
                    </div>
                </div>
            `;
        }

        body.innerHTML = previewContent;
        modal.classList.add('show');

        // Setup keyboard navigation for modal
        this.setupModalKeyboardNavigation();
    }

    showNextFile() {
        if (this.currentPreviewIndex < this.files.length - 1) {
            const nextFile = this.files[this.currentPreviewIndex + 1];
            this.showFilePreview(nextFile);
        }
    }

    showPreviousFile() {
        if (this.currentPreviewIndex > 0) {
            const prevFile = this.files[this.currentPreviewIndex - 1];
            this.showFilePreview(prevFile);
        }
    }

    setupModalKeyboardNavigation() {
        const modal = document.getElementById('gdriveModal');
        if (!modal) return;

        const handleKeyDown = (e) => {
            if (!modal.classList.contains('show')) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.showPreviousFile();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.showNextFile();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideModal();
                    break;
            }
        };

        // Remove existing listener if any
        document.removeEventListener('keydown', this.modalKeyHandler);
        this.modalKeyHandler = handleKeyDown;
        document.addEventListener('keydown', this.modalKeyHandler);
    }

    selectAll() {
        this.clearSelection();
        this.files.forEach(file => {
            this.selectedFiles.add(file.id);
            const element = document.querySelector(`[data-file-id="${file.id}"]`);
            if (element) {
                element.classList.add('selected');
            }
        });
        this.updateSelectionUI();
    }

    handleFileUpload(files) {
        console.log('Uploading files:', files);
        // Implementation for file upload will be added
    }

    downloadFiles(fileIds) {
        fileIds.forEach(fileId => {
            const file = this.files.find(f => f.id === fileId);
            if (file && file.download_url) {
                // Open download URL in new tab
                window.open(file.download_url, '_blank');
            }
        });
    }

    deleteSelectedFiles() {
        if (this.selectedFiles.size === 0) return;

        const count = this.selectedFiles.size;
        const message = count === 1
            ? 'Are you sure you want to delete this item?'
            : `Are you sure you want to delete these ${count} items?`;

        if (confirm(message)) {
            console.log('Deleting files:', Array.from(this.selectedFiles));
            // Implementation for file deletion will be added
        }
    }

    copySelectedFiles() {
        console.log('Copying files:', Array.from(this.selectedFiles));
        // Implementation for file copying will be added
    }

    pasteFiles() {
        console.log('Pasting files');
        // Implementation for file pasting will be added
    }

    renameFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const newName = prompt('Enter new name:', file.name);
        if (newName && newName !== file.name) {
            console.log('Renaming file:', fileId, 'to:', newName);
            // Implementation for file renaming will be added
        }
    }

    moveFiles(fileIds) {
        console.log('Moving files:', fileIds);
        // Implementation for file moving will be added
    }

    shareFiles(fileIds) {
        console.log('Sharing files:', fileIds);
        // Implementation for file sharing will be added
    }

    toggleStarFiles(fileIds) {
        console.log('Toggling star for files:', fileIds);
        // Implementation for starring files will be added
    }

    navigateToFolder(folderId) {
        if (folderId.startsWith('session_')) {
            // Navigate to session folder
            const sessionId = folderId.replace('session_', '');
            this.loadFiles(sessionId);
        } else {
            // Navigate to regular folder (not implemented yet)
            console.log('Navigating to folder:', folderId);
        }
    }

    setupModal() {
        const modal = document.getElementById('gdriveModal');
        const closeBtn = document.getElementById('gdriveModalClose');

        if (!modal || !closeBtn) return;

        // Close modal on close button click
        closeBtn.addEventListener('click', () => {
            this.hideModal();
        });

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.hideModal();
            }
        });
    }

    hideModal() {
        const modal = document.getElementById('gdriveModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Integration with existing TeleDrive functionality
    showGDriveInterface() {
        console.log('Showing Google Drive interface');

        // Hide Windows Explorer interface elements
        const explorerElements = [
            document.querySelector('.explorer-ribbon'),
            document.querySelector('.files-container'),
            document.getElementById('detailsPane')
        ];

        explorerElements.forEach(el => {
            if (el) el.style.display = 'none';
        });

        // Show Google Drive interface elements
        const gdriveLayout = document.getElementById('gdriveLayout');
        const gdriveToolbar = document.getElementById('gdriveToolbar');
        const gdriveBreadcrumb = document.getElementById('gdriveBreadcrumb');
        const gdriveFilesDisplay = document.getElementById('gdriveFilesDisplay');
        const gdriveSidebar = document.getElementById('gdriveSidebar');

        if (gdriveLayout) gdriveLayout.style.display = 'block';
        if (gdriveToolbar) gdriveToolbar.style.display = 'flex';
        if (gdriveBreadcrumb) gdriveBreadcrumb.style.display = 'flex';
        if (gdriveFilesDisplay) gdriveFilesDisplay.style.display = 'flex';
        if (gdriveSidebar) gdriveSidebar.style.display = 'flex';

        // Update breadcrumb
        this.updateBreadcrumb(this.currentPath);

        // Hide welcome screen if visible
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) welcomeScreen.style.display = 'none';

        // Clear any previous files
        if (gdriveFilesDisplay) {
            gdriveFilesDisplay.innerHTML = '';
        }

        // Mark this interface as active
        localStorage.setItem('use-gdrive-interface', 'true');

        // Update toggle button
        const toggleBtn = document.getElementById('toggleInterfaceBtn');
        if (toggleBtn) {
            toggleBtn.title = 'Switch to Classic View';
            toggleBtn.innerHTML = '<i class="icon icon-layout"></i>';
        }

        // Refresh files display
        this.renderFiles();
        
        // Resize handler
        this.handleWindowResize();
        window.addEventListener('resize', () => this.handleWindowResize());

        // Force refresh all elements after a short delay
        setTimeout(() => {
            this.forceRefreshInterface();
        }, 50);
    }

    hideGDriveInterface() {
        // Hide Google Drive style interface elements
        const layout = document.getElementById('gdriveLayout');
        const toolbar = document.getElementById('gdriveToolbar');
        const breadcrumb = document.getElementById('gdriveBreadcrumb');
        const sidebar = document.getElementById('gdriveSidebar');

        if (layout) layout.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (breadcrumb) breadcrumb.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';

        // Show old interface elements
        const oldToolbar = document.querySelector('.toolbar');
        const filesContainer = document.getElementById('filesContainer');

        if (oldToolbar) oldToolbar.style.display = 'flex';
        if (filesContainer) filesContainer.style.display = 'block';
    }

    setupInterfaceToggle() {
        const toggleBtn = document.getElementById('toggleInterfaceBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const currentlyUsingGDrive = localStorage.getItem('use-gdrive-interface') === 'true';
                const newState = !currentlyUsingGDrive;

                console.log(`🔄 Toggling interface: ${currentlyUsingGDrive} -> ${newState}`);

                localStorage.setItem('use-gdrive-interface', newState.toString());
                this.toggleInterface(newState);

                // Update button text
                toggleBtn.innerHTML = newState
                    ? '<i class="icon icon-layout"></i> Classic'
                    : '<i class="icon icon-layout"></i> Modern';

                toggleBtn.title = newState
                    ? 'Switch to Classic View'
                    : 'Switch to Modern View';
            });

            // Set initial button state
            const currentState = localStorage.getItem('use-gdrive-interface') === 'true';
            toggleBtn.innerHTML = currentState
                ? '<i class="icon icon-layout"></i> Classic'
                : '<i class="icon icon-layout"></i> Modern';

            toggleBtn.title = currentState
                ? 'Switch to Classic View'
                : 'Switch to Modern View';
        }
    }

    // Method to switch between interfaces
    toggleInterface(useGDrive = true) {
        const toggleBtn = document.getElementById('toggleInterfaceBtn');

        if (useGDrive) {
            this.showGDriveInterface();
            // Apply Google Drive view to files display
            this.setView(this.currentView);

            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="icon icon-layout"></i> Classic';
                toggleBtn.title = 'Switch to Classic View';
            }
        } else {
            this.hideGDriveInterface();

            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="icon icon-layout"></i> Modern';
                toggleBtn.title = 'Switch to Modern View';
            }

            // Trigger the original TeleDrive interface
            if (typeof window.loadSessions === 'function') {
                window.loadSessions();
            }
        }

        localStorage.setItem('use-gdrive-interface', useGDrive.toString());
    }

    // Integration methods to work with existing TeleDrive functionality
    integrateWithExistingInterface() {
        // Hook into existing session loading
        const originalLoadSessions = window.loadSessions;
        if (originalLoadSessions) {
            window.loadSessions = () => {
                const useGDrive = localStorage.getItem('use-gdrive-interface') !== 'false';
                if (useGDrive) {
                    this.loadFiles();
                } else {
                    originalLoadSessions();
                }
            };
        }

        // Hook into existing file display
        const originalDisplayFiles = window.displayFiles;
        if (originalDisplayFiles) {
            window.displayFiles = (files, sessionId) => {
                const useGDrive = localStorage.getItem('use-gdrive-interface') !== 'false';
                if (useGDrive) {
                    // Convert existing file format to Google Drive format
                    this.files = this.convertToGDriveFormat(files, sessionId);
                    this.renderFiles();
                } else {
                    originalDisplayFiles(files, sessionId);
                }
            };
        }
    }

    convertToGDriveFormat(files, sessionId) {
        if (!Array.isArray(files)) return [];

        return files.map(file => ({
            id: `${sessionId}_${file.message_id || file.id}`,
            name: file.file_name || file.name || 'Unknown',
            type: this.detectFileType(file.file_name || file.name || ''),
            size: file.file_size || file.size || 0,
            modified: file.date || file.modified || '',
            session_id: sessionId,
            message_id: file.message_id || file.id,
            download_url: file.download_url || `/api/file/download/${sessionId}/${file.message_id || file.id}`,
            preview_url: file.preview_url || `/api/file/preview/${sessionId}/${file.message_id || file.id}`,
            thumbnail: this.getFileIcon({type: this.detectFileType(file.file_name || file.name || '')}),
            starred: false,
            shared: false
        }));
    }

    detectFileType(filename) {
        if (!filename) return 'file';

        const ext = filename.toLowerCase().split('.').pop();
        const typeMap = {
            // Images
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
            'bmp': 'image', 'webp': 'image', 'svg': 'image',
            // Videos
            'mp4': 'video', 'avi': 'video', 'mkv': 'video', 'mov': 'video',
            'wmv': 'video', 'flv': 'video', 'webm': 'video',
            // Audio
            'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio',
            'ogg': 'audio', 'wma': 'audio',
            // Documents
            'pdf': 'document', 'doc': 'document', 'docx': 'document',
            'txt': 'document', 'rtf': 'document',
            // Archives
            'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive'
        };

        return typeMap[ext] || 'file';
    }

    getEmptyStateHTML() {
        if (this.searchQuery) {
            // Search with no results
            return `
                <div class="gdrive-empty">
                    <i class="icon icon-search gdrive-empty-icon"></i>
                    <div class="gdrive-empty-text">Không tìm thấy kết quả nào</div>
                    <div class="gdrive-empty-subtext">Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc</div>
                </div>
            `;
        } else {
            // Empty folder
            return `
                <div class="gdrive-empty">
                    <i class="icon icon-folder gdrive-empty-icon"></i>
                    <div class="gdrive-empty-text">Thư mục này trống</div>
                    <div class="gdrive-empty-subtext">Tải lên tệp hoặc tạo thư mục mới</div>
                    <div style="margin-top: 16px;">
                        <button class="gdrive-btn-primary" id="emptyStateUploadBtn">
                            <i class="icon icon-upload" style="margin-right: 8px;"></i>
                            Tải lên tệp
                        </button>
                    </div>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Enhanced keyboard navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const focusedElement = document.activeElement;
            const isFileElement = focusedElement &&
                (focusedElement.classList.contains('gdrive-file-card') ||
                 focusedElement.classList.contains('gdrive-list-item'));

            if (isFileElement) {
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.openFile(focusedElement.dataset.fileId);
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        this.focusNextFile(focusedElement);
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        e.preventDefault();
                        this.focusPreviousFile(focusedElement);
                        break;
                }
            }
        });
    }

    focusNextFile(currentElement) {
        const allFiles = document.querySelectorAll('.gdrive-file-card, .gdrive-list-item');
        const currentIndex = Array.from(allFiles).indexOf(currentElement);
        const nextIndex = (currentIndex + 1) % allFiles.length;
        if (allFiles[nextIndex]) allFiles[nextIndex].focus();
    }

    focusPreviousFile(currentElement) {
        const allFiles = document.querySelectorAll('.gdrive-file-card, .gdrive-list-item');
        const currentIndex = Array.from(allFiles).indexOf(currentElement);
        const prevIndex = currentIndex === 0 ? allFiles.length - 1 : currentIndex - 1;
        if (allFiles[prevIndex]) allFiles[prevIndex].focus();
    }

    // Performance optimization for large file lists
    renderFilesVirtualized() {
        // For future implementation - virtual scrolling for large datasets
        // This would be useful when dealing with thousands of files
        console.log('Virtual rendering not implemented yet');
    }

    setupSearchFilters() {
        const filterBtn = document.getElementById('searchFilterBtn');
        const filtersDropdown = document.getElementById('gdriveSearchFilters');
        const applyBtn = document.getElementById('applyFiltersBtn');
        const clearBtn = document.getElementById('clearFiltersBtn');

        if (!filterBtn || !filtersDropdown) return;

        // Toggle filters dropdown with immediate response
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const isVisible = filtersDropdown.style.display === 'block';
            const newVisibility = !isVisible;

            // Immediate display change
            if (newVisibility) {
                filtersDropdown.style.display = 'block';
                filtersDropdown.style.visibility = 'visible';
                filtersDropdown.style.opacity = '1';
                filterBtn.classList.add('active');
            } else {
                filtersDropdown.style.display = 'none';
                filtersDropdown.style.visibility = 'hidden';
                filtersDropdown.style.opacity = '0';
                filterBtn.classList.remove('active');
            }

            console.log(`🔍 Search filters dropdown: ${newVisibility ? 'shown' : 'hidden'} (display: ${filtersDropdown.style.display})`);

            // Force reflow to ensure immediate visual update
            filtersDropdown.offsetHeight;
        });

        // Close dropdown when clicking outside with immediate response
        document.addEventListener('click', (e) => {
            if (!filtersDropdown.contains(e.target) && e.target !== filterBtn && !filterBtn.contains(e.target)) {
                filtersDropdown.style.display = 'none';
                filtersDropdown.style.visibility = 'hidden';
                filtersDropdown.style.opacity = '0';
                filterBtn.classList.remove('active');
                console.log('🔍 Search filters dropdown: hidden (clicked outside)');
            }
        });

        // Apply filters
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySearchFilters();
                filtersDropdown.style.display = 'none';
                filterBtn.classList.remove('active');
            });
        }

        // Clear filters
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearchFilters();
            });
        }

        // Auto-apply on filter change
        const filterSelects = filtersDropdown.querySelectorAll('.gdrive-filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                this.updateFilterButtonState();
            });
        });
    }

    applySearchFilters() {
        const typeFilterEl = document.getElementById('fileTypeFilter');
        const sizeFilterEl = document.getElementById('sizeFilter');
        const dateFilterEl = document.getElementById('dateFilter');
        const typeFilter = typeFilterEl ? typeFilterEl.value : '';
        const sizeFilter = sizeFilterEl ? sizeFilterEl.value : '';
        const dateFilter = dateFilterEl ? dateFilterEl.value : '';

        this.searchFilters = {
            type: typeFilter,
            size: sizeFilter,
            date: dateFilter
        };

        // Apply filters to current files
        this.filterFiles();
        this.updateFilterButtonState();
    }

    clearSearchFilters() {
        // Reset filter dropdowns
        const typeFilter = document.getElementById('fileTypeFilter');
        const sizeFilter = document.getElementById('sizeFilter');
        const dateFilter = document.getElementById('dateFilter');

        if (typeFilter) typeFilter.value = '';
        if (sizeFilter) sizeFilter.value = '';
        if (dateFilter) dateFilter.value = '';

        this.searchFilters = {
            type: '',
            size: '',
            date: ''
        };

        // Reload files without filters
        this.loadFiles(this.currentSessionId);
        this.updateFilterButtonState();
    }

    updateFilterButtonState() {
        const filterBtn = document.getElementById('searchFilterBtn');
        if (!filterBtn) return;

        const hasActiveFilters = Object.values(this.searchFilters).some(filter => filter !== '');
        filterBtn.classList.toggle('active', hasActiveFilters);
    }

    filterFiles() {
        let filteredFiles = [...this.files];

        // Apply type filter
        if (this.searchFilters.type) {
            filteredFiles = filteredFiles.filter(file => file.type === this.searchFilters.type);
        }

        // Apply size filter
        if (this.searchFilters.size) {
            filteredFiles = filteredFiles.filter(file => {
                const size = file.size || 0;
                switch (this.searchFilters.size) {
                    case 'small': return size < 1024 * 1024; // < 1MB
                    case 'medium': return size >= 1024 * 1024 && size < 10 * 1024 * 1024; // 1-10MB
                    case 'large': return size >= 10 * 1024 * 1024 && size < 100 * 1024 * 1024; // 10-100MB
                    case 'huge': return size >= 100 * 1024 * 1024; // > 100MB
                    default: return true;
                }
            });
        }

        // Apply date filter
        if (this.searchFilters.date) {
            const now = new Date();
            filteredFiles = filteredFiles.filter(file => {
                if (!file.modified) return false;
                const fileDate = new Date(file.modified);
                const diffTime = now - fileDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                switch (this.searchFilters.date) {
                    case 'today': return diffDays <= 1;
                    case 'week': return diffDays <= 7;
                    case 'month': return diffDays <= 30;
                    case 'year': return diffDays <= 365;
                    default: return true;
                }
            });
        }

        // Update files and re-render
        this.files = filteredFiles;
        this.renderFiles();

        // Update breadcrumb to show filter info
        this.updateFilteredBreadcrumb();
    }

    updateFilteredBreadcrumb() {
        const breadcrumb = document.getElementById('gdriveBreadcrumb');
        if (!breadcrumb) return;

        const activeFilters = [];
        if (this.searchFilters.type) activeFilters.push(`Type: ${this.capitalizeFirst(this.searchFilters.type)}`);
        if (this.searchFilters.size) activeFilters.push(`Size: ${this.searchFilters.size}`);
        if (this.searchFilters.date) activeFilters.push(`Date: ${this.searchFilters.date}`);

        if (activeFilters.length > 0) {
            const filterText = activeFilters.join(', ');
            breadcrumb.innerHTML += `
                <span class="gdrive-breadcrumb-separator">›</span>
                <div class="gdrive-breadcrumb-item current">
                    <i class="icon icon-filter"></i>
                    <span>Filtered (${filterText})</span>
                </div>
            `;
        }
    }

    setupBulkOperations() {
        // Bulk download
        const bulkDownloadBtn = document.getElementById('bulkDownloadBtn');
        if (bulkDownloadBtn) {
            bulkDownloadBtn.addEventListener('click', () => {
                this.downloadFiles(Array.from(this.selectedFiles));
            });
        }

        // Bulk share
        const bulkShareBtn = document.getElementById('bulkShareBtn');
        if (bulkShareBtn) {
            bulkShareBtn.addEventListener('click', () => {
                this.shareFiles(Array.from(this.selectedFiles));
            });
        }

        // Bulk star
        const bulkStarBtn = document.getElementById('bulkStarBtn');
        if (bulkStarBtn) {
            bulkStarBtn.addEventListener('click', () => {
                this.toggleStarFiles(Array.from(this.selectedFiles));
            });
        }

        // Bulk move
        const bulkMoveBtn = document.getElementById('bulkMoveBtn');
        if (bulkMoveBtn) {
            bulkMoveBtn.addEventListener('click', () => {
                this.moveFiles(Array.from(this.selectedFiles));
            });
        }

        // Bulk delete
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.deleteSelectedFiles();
            });
        }

        // Clear selection
        const clearSelectionBtn = document.getElementById('clearSelectionBtn');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
    }

    // Enhanced bulk operations with progress tracking
    async bulkDownloadFiles(fileIds) {
        if (fileIds.length === 0) return;

        const progressContainer = this.showBulkProgress('Downloading files...');

        try {
            for (let i = 0; i < fileIds.length; i++) {
                const fileId = fileIds[i];
                const file = this.files.find(f => f.id === fileId);

                if (file && file.download_url) {
                    // Update progress
                    this.updateBulkProgress(progressContainer, i + 1, fileIds.length, `Downloading ${file.name}...`);

                    // Download file
                    window.open(file.download_url, '_blank');

                    // Small delay to prevent overwhelming the browser
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            this.hideBulkProgress(progressContainer);
            this.showNotification('Downloads started successfully', 'success');
        } catch (error) {
            this.hideBulkProgress(progressContainer);
            this.showNotification('Error downloading files', 'error');
            console.error('Bulk download error:', error);
        }
    }

    showBulkProgress(title) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'gdrive-bulk-progress';
        progressContainer.innerHTML = `
            <div class="gdrive-bulk-progress-content">
                <h4>${title}</h4>
                <div class="gdrive-bulk-progress-bar">
                    <div class="gdrive-bulk-progress-fill" style="width: 0%"></div>
                </div>
                <div class="gdrive-bulk-progress-text">Starting...</div>
            </div>
        `;

        document.body.appendChild(progressContainer);
        return progressContainer;
    }

    updateBulkProgress(container, current, total, text) {
        const percentage = Math.round((current / total) * 100);
        const progressFill = container.querySelector('.gdrive-bulk-progress-fill');
        const progressText = container.querySelector('.gdrive-bulk-progress-text');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = text;
    }

    hideBulkProgress(container) {
        setTimeout(() => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 1000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `gdrive-notification gdrive-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    setupNewButtons() {
        // Setup New button in toolbar
        const newBtn = document.getElementById('newBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                console.log('🆕 New button clicked');
                this.showNewFileMenu();
            });
        }

        // Setup New button in sidebar
        const sidebarNewBtn = document.getElementById('sidebarNewBtn');
        if (sidebarNewBtn) {
            sidebarNewBtn.addEventListener('click', () => {
                console.log('🆕 Sidebar New button clicked');
                this.showNewFileMenu();
            });
        }
    }

    showNewFileMenu() {
        // Create a simple new file menu
        const menu = document.createElement('div');
        menu.className = 'gdrive-new-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #dadce0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(60, 64, 67, 0.15);
            padding: 16px;
            z-index: 1000;
            min-width: 200px;
        `;

        menu.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #202124;">Create New</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="gdrive-btn-ghost" onclick="alert('Folder creation not implemented yet'); this.parentElement.parentElement.remove();" style="justify-content: flex-start; padding: 8px 12px;">
                    <i class="icon icon-folder" style="margin-right: 8px;"></i>
                    Folder
                </button>
                <button class="gdrive-btn-ghost" onclick="alert('File upload not implemented yet'); this.parentElement.parentElement.remove();" style="justify-content: flex-start; padding: 8px 12px;">
                    <i class="icon icon-upload" style="margin-right: 8px;"></i>
                    File upload
                </button>
                <button class="gdrive-btn-ghost" onclick="this.parentElement.parentElement.remove();" style="justify-content: flex-start; padding: 8px 12px; color: #5f6368;">
                    Cancel
                </button>
            </div>
        `;

        document.body.appendChild(menu);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (menu.parentNode) {
                menu.parentNode.removeChild(menu);
            }
        }, 10000);
    }

    // Force refresh interface to ensure all elements are visible
    forceRefreshInterface() {
        console.log('Forcing refresh of Google Drive interface');
        
        // Re-apply all display settings
        const gdriveLayout = document.getElementById('gdriveLayout');
        const gdriveToolbar = document.getElementById('gdriveToolbar');
        const gdriveBreadcrumb = document.getElementById('gdriveBreadcrumb');
        const gdriveFilesDisplay = document.getElementById('gdriveFilesDisplay');
        const gdriveSidebar = document.getElementById('gdriveSidebar');
        
        // Ensure everything is visible
        if (gdriveLayout) {
            gdriveLayout.style.display = 'block';
            // Force reflow
            void gdriveLayout.offsetWidth;
        }
        
        if (gdriveToolbar) {
            gdriveToolbar.style.display = 'flex';
            // Force reflow
            void gdriveToolbar.offsetWidth;
        }
        
        if (gdriveBreadcrumb) {
            gdriveBreadcrumb.style.display = 'flex';
            // Force reflow
            void gdriveBreadcrumb.offsetWidth;
        }
        
        if (gdriveFilesDisplay) {
            // Reset class to ensure proper display
            gdriveFilesDisplay.className = this.currentView === 'list' 
                ? 'gdrive-files-display gdrive-list-view'
                : 'gdrive-files-display gdrive-grid-view';
            
            // Force reflow
            void gdriveFilesDisplay.offsetWidth;
        }
        
        if (gdriveSidebar) {
            gdriveSidebar.style.display = 'block';
            // Force reflow
            void gdriveSidebar.offsetWidth;
        }
        
        // Hide windows explorer elements
        const explorerElements = [
            document.querySelector('.explorer-ribbon'),
            document.querySelector('.files-container'),
            document.getElementById('detailsPane'),
            document.getElementById('welcomeScreen')
        ];
        
        explorerElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Update view toggle buttons
        const gridBtn = document.querySelector('[data-view="grid"]');
        const listBtn = document.querySelector('[data-view="list"]');
        
        if (gridBtn && listBtn) {
            if (this.currentView === 'grid') {
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                gridBtn.classList.remove('active');
                listBtn.classList.add('active');
            }
        }
        
        // Re-render files
        this.renderFiles();
        
        // Apply responsive layout
        this.handleWindowResize();
    }

    // Test search filters dropdown functionality
    testSearchFiltersDropdown() {
        return new Promise((resolve) => {
            const filterBtn = document.getElementById('searchFilterBtn');
            const filtersDropdown = document.getElementById('gdriveSearchFilters');

            if (!filterBtn || !filtersDropdown) {
                resolve({ success: false, message: 'Elements not found' });
                return;
            }

            console.log('🧪 Testing search filters dropdown...');

            // Test show
            filterBtn.click();

            // Check immediately after click
            setTimeout(() => {
                const isVisible = filtersDropdown.style.display === 'block';
                const hasVisibility = filtersDropdown.style.visibility === 'visible';
                const hasOpacity = filtersDropdown.style.opacity === '1';

                console.log(`Dropdown state: display=${filtersDropdown.style.display}, visibility=${filtersDropdown.style.visibility}, opacity=${filtersDropdown.style.opacity}`);

                if (isVisible && hasVisibility && hasOpacity) {
                    // Test hide
                    filterBtn.click();

                    setTimeout(() => {
                        const isHidden = filtersDropdown.style.display === 'none';
                        resolve({
                            success: isHidden,
                            message: isHidden ? 'Dropdown show/hide working' : 'Dropdown hide failed'
                        });
                    }, 50);
                } else {
                    resolve({
                        success: false,
                        message: `Dropdown show failed: display=${isVisible}, visibility=${hasVisibility}, opacity=${hasOpacity}`
                    });
                }
            }, 50);
        });
    }

    // Analytics and usage tracking (optional)
    trackUserAction(action, data = {}) {
        // Optional: Track user interactions for analytics
        console.log('User action:', action, data);
    }

    handleWindowResize() {
        // Adjust interface elements based on screen size
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        
        // Get Google Drive elements
        const gdriveLayout = document.getElementById('gdriveLayout');
        const gdriveSidebar = document.getElementById('gdriveSidebar');
        const gdriveFilesDisplay = document.getElementById('gdriveFilesDisplay');
        
        // Adjust view based on screen size
        if (isMobile) {
            // Mobile view
            if (gdriveSidebar) {
                gdriveSidebar.style.display = 'none';
            }
            
            // Change to grid view with fewer columns on small screens
            if (gdriveFilesDisplay) {
                gdriveFilesDisplay.classList.remove('gdrive-list-view');
                gdriveFilesDisplay.classList.add('gdrive-grid-view');
                gdriveFilesDisplay.style.gridTemplateColumns = 'repeat(2, 1fr)';
            }
        } else if (isTablet) {
            // Tablet view
            if (gdriveSidebar) {
                gdriveSidebar.style.width = '200px';
            }
            
            // Change to grid view with more columns
            if (gdriveFilesDisplay) {
                gdriveFilesDisplay.classList.remove('gdrive-list-view');
                gdriveFilesDisplay.classList.add('gdrive-grid-view');
                gdriveFilesDisplay.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
        } else {
            // Desktop view
            if (gdriveSidebar) {
                gdriveSidebar.style.width = '256px';
                gdriveSidebar.style.display = 'block';
            }
            
            // Use current view setting for desktop
            if (gdriveFilesDisplay) {
                if (this.currentView === 'list') {
                    gdriveFilesDisplay.classList.remove('gdrive-grid-view');
                    gdriveFilesDisplay.classList.add('gdrive-list-view');
                } else {
                    gdriveFilesDisplay.classList.remove('gdrive-list-view');
                    gdriveFilesDisplay.classList.add('gdrive-grid-view');
                    gdriveFilesDisplay.style.gridTemplateColumns = 'repeat(4, 1fr)';
                }
            }
        }
    }

    sortFiles(files) {
        if (!files || files.length === 0) return [];
        
        return [...files].sort((a, b) => {
            // Apply sorting based on current sort field and order
            switch (this.sortBy) {
                case 'name':
                    if (this.sortOrder === 'asc') {
                        return a.name.localeCompare(b.name);
                    } else {
                        return b.name.localeCompare(a.name);
                    }
                
                case 'modified':
                    const aDate = new Date(a.modified || a.date || 0);
                    const bDate = new Date(b.modified || b.date || 0);
                    if (this.sortOrder === 'asc') {
                        return aDate - bDate;
                    } else {
                        return bDate - aDate;
                    }
                
                case 'size':
                    const aSize = a.size || 0;
                    const bSize = b.size || 0;
                    if (this.sortOrder === 'asc') {
                        return aSize - bSize;
                    } else {
                        return bSize - aSize;
                    }
                
                case 'type':
                    if (this.sortOrder === 'asc') {
                        return (a.type || '').localeCompare(b.type || '');
                    } else {
                        return (b.type || '').localeCompare(a.type || '');
                    }
                
                case 'owner':
                    // Since we don't have actual owner info, we'll just use alphabetical
                    if (this.sortOrder === 'asc') {
                        return (a.owner || 'Me').localeCompare(b.owner || 'Me');
                    } else {
                        return (b.owner || 'Me').localeCompare(a.owner || 'Me');
                    }
                
                default:
                    return 0;
            }
        });
    }
}

// Initialize the Google Drive manager when DOM is loaded
let gdriveManager;
document.addEventListener('DOMContentLoaded', () => {
    gdriveManager = new GDriveManager();
});
