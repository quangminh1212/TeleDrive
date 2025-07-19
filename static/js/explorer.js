/**
 * Windows Explorer Style File Manager
 * Extends TeleDrive with Windows Explorer UI/UX
 */

class WindowsExplorer {
    constructor() {
        this.currentPath = 'C:\\VF';
        this.currentView = 'icons'; // icons, list, details
        this.currentSort = 'name';
        this.currentSortOrder = 'asc';
        this.selectedItems = new Set();
        this.files = [];
        this.breadcrumbs = [];
        this.navigationHistory = [];
        this.historyIndex = -1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateBreadcrumbs();
        this.loadFiles();
    }

    setupEventListeners() {
        // Navigation controls
        this.setupNavigationControls();
        
        // Address bar
        this.setupAddressBar();
        
        // Search
        this.setupSearch();
        
        // Toolbar
        this.setupToolbar();
        
        // View modes
        this.setupViewModes();
        
        // File operations
        this.setupFileOperations();
    }

    setupNavigationControls() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const upBtn = document.getElementById('upBtn');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.navigateBack());
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => this.navigateForward());
        }

        if (upBtn) {
            upBtn.addEventListener('click', () => this.navigateUp());
        }
    }

    setupAddressBar() {
        const breadcrumbPath = document.getElementById('breadcrumbPath');
        const addressInput = document.getElementById('addressInput');

        if (breadcrumbPath) {
            breadcrumbPath.addEventListener('click', (e) => {
                if (e.target.closest('.path-segment')) {
                    const segment = e.target.closest('.path-segment');
                    const path = segment.dataset.path;
                    this.navigateToPath(path);
                } else {
                    this.showAddressInput();
                }
            });
        }

        if (addressInput) {
            addressInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.navigateToPath(e.target.value);
                    this.hideAddressInput();
                } else if (e.key === 'Escape') {
                    this.hideAddressInput();
                }
            });

            addressInput.addEventListener('blur', () => {
                this.hideAddressInput();
            });
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('explorerSearch');
        const clearBtn = document.getElementById('clearExplorerSearch');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                this.performSearch(query);
                this.toggleClearButton(query.length > 0);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.performSearch('');
                this.toggleClearButton(false);
            });
        }
    }

    setupToolbar() {
        // Sort dropdown
        this.setupSortDropdown();
        
        // View dropdown
        this.setupViewDropdown();
        
        // More options dropdown
        this.setupMoreOptionsDropdown();
        
        // File operations
        this.setupFileOperations();
    }

    setupSortDropdown() {
        const sortDropdown = document.getElementById('sortDropdown');
        const sortMenu = document.getElementById('sortMenu');

        if (sortDropdown && sortMenu) {
            sortDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(sortMenu);
            });

            sortMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (item) {
                    const sortType = item.dataset.sort;
                    if (['name', 'modified', 'type', 'size'].includes(sortType)) {
                        this.currentSort = sortType;
                    } else if (['asc', 'desc'].includes(sortType)) {
                        this.currentSortOrder = sortType;
                    }
                    this.updateSortIndicators();
                    this.sortAndDisplayFiles();
                    this.closeDropdown(sortMenu);
                }
            });
        }
    }

    setupViewDropdown() {
        const viewDropdown = document.getElementById('viewDropdown');
        const viewMenu = document.getElementById('viewMenu');

        if (viewDropdown && viewMenu) {
            viewDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(viewMenu);
            });

            viewMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (item) {
                    const viewMode = item.dataset.view;
                    this.setViewMode(viewMode);
                    this.updateViewIndicators();
                    this.closeDropdown(viewMenu);
                }
            });
        }
    }

    setupMoreOptionsDropdown() {
        const moreOptions = document.getElementById('moreOptions');
        const moreMenu = document.getElementById('moreMenu');

        if (moreOptions && moreMenu) {
            moreOptions.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(moreMenu);
            });

            // Handle menu items
            const selectAllBtn = document.getElementById('selectAllBtn');
            const selectNoneBtn = document.getElementById('selectNoneBtn');
            const propertiesBtn = document.getElementById('propertiesBtn');

            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', () => {
                    this.selectAll();
                    this.closeDropdown(moreMenu);
                });
            }

            if (selectNoneBtn) {
                selectNoneBtn.addEventListener('click', () => {
                    this.selectNone();
                    this.closeDropdown(moreMenu);
                });
            }

            if (propertiesBtn) {
                propertiesBtn.addEventListener('click', () => {
                    this.showProperties();
                    this.closeDropdown(moreMenu);
                });
            }
        }
    }

    setupFileOperations() {
        const newFolderBtn = document.getElementById('newFolderBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => this.createNewFolder());
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadFiles());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshFiles());
        }
    }

    setupViewModes() {
        // List header sorting
        const listHeader = document.getElementById('listHeader');
        if (listHeader) {
            listHeader.addEventListener('click', (e) => {
                const headerCell = e.target.closest('.header-cell');
                if (headerCell) {
                    const sortType = headerCell.dataset.sort;
                    if (sortType) {
                        if (this.currentSort === sortType) {
                            this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
                        } else {
                            this.currentSort = sortType;
                            this.currentSortOrder = 'asc';
                        }
                        this.updateSortIndicators();
                        this.sortAndDisplayFiles();
                    }
                }
            });
        }
    }

    // Navigation methods
    navigateBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const path = this.navigationHistory[this.historyIndex];
            this.navigateToPath(path, false);
        }
    }

    navigateForward() {
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.historyIndex++;
            const path = this.navigationHistory[this.historyIndex];
            this.navigateToPath(path, false);
        }
    }

    navigateUp() {
        const parentPath = this.getParentPath(this.currentPath);
        if (parentPath) {
            this.navigateToPath(parentPath);
        }
    }

    navigateToPath(path, addToHistory = true) {
        if (addToHistory) {
            // Remove any forward history
            this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
            this.navigationHistory.push(path);
            this.historyIndex = this.navigationHistory.length - 1;
        }
        
        this.currentPath = path;
        this.updateBreadcrumbs();
        this.updateNavigationButtons();
        this.loadFiles();
    }

    getParentPath(path) {
        if (path === 'C:\\' || path === '') return null;
        const parts = path.split('\\').filter(p => p);
        if (parts.length <= 1) return 'C:\\';
        return parts.slice(0, -1).join('\\') + '\\';
    }

    // UI Update methods
    updateBreadcrumbs() {
        const breadcrumbPath = document.getElementById('breadcrumbPath');
        if (!breadcrumbPath) return;

        const parts = this.currentPath.split('\\').filter(p => p);
        let html = `
            <span class="path-segment" data-path="">
                <i class="icon icon-computer"></i>
                <span>PC này</span>
            </span>
        `;

        let currentPath = '';
        parts.forEach((part, index) => {
            currentPath += part + '\\';
            html += `
                <i class="icon icon-chevron-right path-separator"></i>
                <span class="path-segment" data-path="${currentPath}">
                    ${index === 0 ? '<i class="icon icon-drive"></i>' : ''}
                    <span>${part}${index === 0 ? ' (' + part + ')' : ''}</span>
                </span>
            `;
        });

        breadcrumbPath.innerHTML = html;
    }

    updateNavigationButtons() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');

        if (backBtn) {
            backBtn.disabled = this.historyIndex <= 0;
        }

        if (forwardBtn) {
            forwardBtn.disabled = this.historyIndex >= this.navigationHistory.length - 1;
        }
    }
}

    // Address bar methods
    showAddressInput() {
        const breadcrumbPath = document.getElementById('breadcrumbPath');
        const addressInput = document.getElementById('addressInput');

        if (breadcrumbPath && addressInput) {
            breadcrumbPath.style.display = 'none';
            addressInput.style.display = 'block';
            addressInput.value = this.currentPath;
            addressInput.focus();
            addressInput.select();
        }
    }

    hideAddressInput() {
        const breadcrumbPath = document.getElementById('breadcrumbPath');
        const addressInput = document.getElementById('addressInput');

        if (breadcrumbPath && addressInput) {
            breadcrumbPath.style.display = 'flex';
            addressInput.style.display = 'none';
        }
    }

    // Search methods
    performSearch(query) {
        if (!query.trim()) {
            this.displayFiles(this.files);
            return;
        }

        const filteredFiles = this.files.filter(file =>
            file.name.toLowerCase().includes(query.toLowerCase())
        );
        this.displayFiles(filteredFiles);
    }

    toggleClearButton(show) {
        const clearBtn = document.getElementById('clearExplorerSearch');
        if (clearBtn) {
            clearBtn.style.display = show ? 'block' : 'none';
        }
    }

    // Dropdown methods
    toggleDropdown(menu) {
        const isOpen = menu.classList.contains('show');
        this.closeAllDropdowns();
        if (!isOpen) {
            menu.classList.add('show');
        }
    }

    closeDropdown(menu) {
        menu.classList.remove('show');
    }

    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    // View mode methods
    setViewMode(mode) {
        this.currentView = mode;
        const filesDisplay = document.getElementById('filesDisplay');
        const listHeader = document.getElementById('listHeader');

        if (filesDisplay) {
            filesDisplay.className = 'files-display';
            if (mode === 'list' || mode === 'details') {
                filesDisplay.classList.add('list-view');
                if (listHeader) listHeader.style.display = 'grid';
            } else {
                filesDisplay.classList.add('icon-view');
                if (listHeader) listHeader.style.display = 'none';
            }
        }

        this.displayFiles(this.files);
    }

    updateViewIndicators() {
        document.querySelectorAll('#viewMenu .dropdown-item').forEach(item => {
            const icon = item.querySelector('.icon');
            if (item.dataset.view === this.currentView) {
                icon.style.visibility = 'visible';
            } else {
                icon.style.visibility = 'hidden';
            }
        });
    }

    updateSortIndicators() {
        // Update sort menu
        document.querySelectorAll('#sortMenu .dropdown-item').forEach(item => {
            const icon = item.querySelector('.icon');
            const sortType = item.dataset.sort;

            if (sortType === this.currentSort || sortType === this.currentSortOrder) {
                icon.style.visibility = 'visible';
            } else {
                icon.style.visibility = 'hidden';
            }
        });

        // Update list header
        document.querySelectorAll('.header-cell').forEach(cell => {
            const indicator = cell.querySelector('.sort-indicator');
            cell.classList.remove('active');

            if (cell.dataset.sort === this.currentSort) {
                cell.classList.add('active');
                if (indicator) {
                    indicator.textContent = this.currentSortOrder === 'asc' ? '↑' : '↓';
                }
            }
        });
    }

    // File operations
    sortAndDisplayFiles() {
        const sortedFiles = [...this.files].sort((a, b) => {
            let aVal, bVal;

            switch (this.currentSort) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'modified':
                    aVal = new Date(a.modified || 0);
                    bVal = new Date(b.modified || 0);
                    break;
                case 'type':
                    aVal = a.type || '';
                    bVal = b.type || '';
                    break;
                case 'size':
                    aVal = a.size || 0;
                    bVal = b.size || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return this.currentSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        this.displayFiles(sortedFiles);
    }

    selectAll() {
        this.selectedItems.clear();
        this.files.forEach(file => this.selectedItems.add(file.id));
        this.updateFileSelection();
        this.updateStatusBar();
    }

    selectNone() {
        this.selectedItems.clear();
        this.updateFileSelection();
        this.updateStatusBar();
    }

    updateFileSelection() {
        document.querySelectorAll('.file-item, .file-card').forEach(element => {
            const fileId = element.dataset.fileId;
            if (this.selectedItems.has(fileId)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    createNewFolder() {
        // Implementation for creating new folder
        console.log('Create new folder');
    }

    uploadFiles() {
        // Implementation for file upload
        console.log('Upload files');
    }

    refreshFiles() {
        this.loadFiles();
    }

    showProperties() {
        // Implementation for showing properties
        console.log('Show properties');
    }

    // File loading and display
    async loadFiles() {
        try {
            // Mock data for now - replace with actual API call
            const mockFiles = [
                { name: 'Documents', isFolder: true, size: null, modified: '2025-01-15T10:30:00Z' },
                { name: 'Report.pdf', isFolder: false, size: 1024000, modified: '2025-01-14T15:45:00Z' },
                { name: 'Image.jpg', isFolder: false, size: 2048000, modified: '2025-01-13T09:20:00Z' },
                { name: 'Presentation.pptx', isFolder: false, size: 5120000, modified: '2025-01-12T14:20:00Z' },
                { name: 'Spreadsheet.xlsx', isFolder: false, size: 512000, modified: '2025-01-11T11:15:00Z' },
                { name: 'Video.mp4', isFolder: false, size: 104857600, modified: '2025-01-10T16:30:00Z' },
                { name: 'Music.mp3', isFolder: false, size: 8388608, modified: '2025-01-09T09:45:00Z' },
                { name: 'Archive.zip', isFolder: false, size: 2097152, modified: '2025-01-08T13:20:00Z' },
                { name: 'Script.js', isFolder: false, size: 4096, modified: '2025-01-07T10:10:00Z' },
                { name: 'Notes.txt', isFolder: false, size: 1024, modified: '2025-01-06T15:30:00Z' }
            ];

            this.files = mockFiles.map((file, index) => ({
                id: (index + 1).toString(),
                name: file.name,
                type: file.isFolder ? 'folder' : this.getFileType(file.name, file.isFolder),
                size: file.size,
                modified: file.modified,
                icon: this.getFileIcon(file.name, file.isFolder ? 'folder' : 'file'),
                isFolder: file.isFolder
            }));

            this.sortAndDisplayFiles();
            this.updateStatusBar();
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    displayFiles(files) {
        const filesDisplay = document.getElementById('filesDisplay');
        if (!filesDisplay) return;

        if (this.currentView === 'list' || this.currentView === 'details') {
            this.displayListView(files, filesDisplay);
        } else {
            this.displayIconView(files, filesDisplay);
        }
    }

    displayListView(files, container) {
        const html = files.map(file => `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-name-cell">
                    <i class="icon icon-${file.icon}"></i>
                    <span class="file-name">${file.name}</span>
                </div>
                <div class="file-date">${this.formatDate(file.modified)}</div>
                <div class="file-type">${file.type || ''}</div>
                <div class="file-size">${this.formatSize(file.size)}</div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindFileEvents();
    }

    displayIconView(files, container) {
        const html = files.map(file => `
            <div class="file-card" data-file-id="${file.id}">
                <div class="file-icon">
                    <i class="icon icon-${file.icon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${this.formatSize(file.size)} • ${this.formatDate(file.modified)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindFileEvents();
    }

    bindFileEvents() {
        document.querySelectorAll('.file-item, .file-card').forEach(element => {
            element.addEventListener('click', (e) => {
                const fileId = element.dataset.fileId;

                if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    if (this.selectedItems.has(fileId)) {
                        this.selectedItems.delete(fileId);
                    } else {
                        this.selectedItems.add(fileId);
                    }
                } else {
                    // Single select
                    this.selectedItems.clear();
                    this.selectedItems.add(fileId);
                }

                this.updateFileSelection();
                this.updateStatusBar();
            });

            element.addEventListener('dblclick', () => {
                const fileId = element.dataset.fileId;
                this.openFile(fileId);
            });
        });
    }

    openFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file && file.isFolder) {
            const newPath = this.currentPath.endsWith('\\')
                ? this.currentPath + file.name + '\\'
                : this.currentPath + '\\' + file.name + '\\';
            this.navigateToPath(newPath);
        } else if (file) {
            // Handle file opening - could open preview modal or download
            console.log('Opening file:', file.name);
        }
    }

    updateStatusBar() {
        const itemCount = document.getElementById('itemCount');
        const selectedCount = document.getElementById('selectedCount');
        const totalSize = document.getElementById('totalSize');
        const currentPath = document.getElementById('currentPath');

        if (itemCount) {
            itemCount.textContent = `${this.files.length} mục`;
        }

        if (selectedCount) {
            if (this.selectedItems.size > 0) {
                selectedCount.textContent = `${this.selectedItems.size} mục đã chọn`;
                selectedCount.style.display = 'inline';
            } else {
                selectedCount.style.display = 'none';
            }
        }

        if (totalSize) {
            const total = this.files.reduce((sum, file) => sum + (file.size || 0), 0);
            totalSize.textContent = this.formatSize(total);
        }

        if (currentPath) {
            const pathParts = this.currentPath.split('\\').filter(p => p);
            currentPath.textContent = pathParts[pathParts.length - 1] || 'VF';
        }
    }

    // Utility methods
    getFileIcon(fileName, fileType) {
        if (fileType === 'folder') return 'folder';

        const extension = fileName.split('.').pop().toLowerCase();

        // Image files
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
            return 'image';
        }

        // Video files
        if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
            return 'video';
        }

        // Audio files
        if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
            return 'audio';
        }

        // Document files
        if (['pdf'].includes(extension)) {
            return 'pdf';
        }

        if (['doc', 'docx'].includes(extension)) {
            return 'word';
        }

        if (['xls', 'xlsx'].includes(extension)) {
            return 'excel';
        }

        if (['ppt', 'pptx'].includes(extension)) {
            return 'powerpoint';
        }

        // Archive files
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
            return 'archive';
        }

        // Code files
        if (['js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go'].includes(extension)) {
            return 'code';
        }

        // Text files
        if (['txt', 'md', 'log'].includes(extension)) {
            return 'text';
        }

        return 'unknown';
    }

    getFileType(fileName, isFolder) {
        if (isFolder) return 'Thư mục file';

        const extension = fileName.split('.').pop().toLowerCase();

        const typeMap = {
            // Images
            'jpg': 'JPEG Image', 'jpeg': 'JPEG Image', 'png': 'PNG Image',
            'gif': 'GIF Image', 'bmp': 'Bitmap Image', 'svg': 'SVG Image',

            // Videos
            'mp4': 'MP4 Video', 'avi': 'AVI Video', 'mkv': 'MKV Video',
            'mov': 'QuickTime Video', 'wmv': 'Windows Media Video',

            // Audio
            'mp3': 'MP3 Audio', 'wav': 'WAV Audio', 'flac': 'FLAC Audio',
            'aac': 'AAC Audio', 'ogg': 'OGG Audio',

            // Documents
            'pdf': 'PDF Document', 'doc': 'Word Document', 'docx': 'Word Document',
            'xls': 'Excel Spreadsheet', 'xlsx': 'Excel Spreadsheet',
            'ppt': 'PowerPoint Presentation', 'pptx': 'PowerPoint Presentation',

            // Archives
            'zip': 'ZIP Archive', 'rar': 'RAR Archive', '7z': '7-Zip Archive',
            'tar': 'TAR Archive', 'gz': 'GZIP Archive',

            // Code
            'js': 'JavaScript File', 'html': 'HTML Document', 'css': 'CSS Stylesheet',
            'py': 'Python Script', 'java': 'Java Source', 'cpp': 'C++ Source',
            'c': 'C Source', 'php': 'PHP Script', 'rb': 'Ruby Script',

            // Text
            'txt': 'Text Document', 'md': 'Markdown Document', 'log': 'Log File'
        };

        return typeMap[extension] || 'File';
    }

    formatSize(bytes) {
        if (!bytes) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    if (window.explorer) {
        window.explorer.closeAllDropdowns();
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.explorer = new WindowsExplorer();
});
