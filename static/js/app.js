// TeleDrive JavaScript - Google Drive Style Local File Manager

class LocalFileManager {
    constructor() {
        this.currentPath = 'C:\\';
        this.currentPage = 1;
        this.currentView = 'grid';
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.currentSortOrder = 'asc';
        this.searchQuery = '';
        this.files = [];
        this.filteredFiles = [];
        this.drives = [];
        this.breadcrumbs = [];
        this.selectedItems = new Set();

        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadDrives();
        this.setupMobileMenu();
        this.setupAuthentication();
        this.setupContextMenu();
        this.setupDragAndDrop();
        this.setupKeyboardShortcuts();
    }
    
    bindEvents() {
        // Search
        const globalSearch = document.getElementById('globalSearch');
        const clearSearch = document.getElementById('clearSearch');

        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.showClearButton(this.searchQuery.length > 0);
                this.debounce(() => this.performSearch(), 300)();
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                globalSearch.value = '';
                this.searchQuery = '';
                this.showClearButton(false);
                this.browseDirectory(this.currentPath);
            });
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.updateViewButtons();
                this.displayFiles();
            });
        });

        // Sort and filter controls
        const sortBy = document.getElementById('sortBy');
        const sortOrder = document.getElementById('sortOrder');
        const fileTypeFilter = document.getElementById('fileTypeFilter');

        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.browseDirectory(this.currentPath);
            });
        }

        if (sortOrder) {
            sortOrder.addEventListener('click', () => {
                this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
                this.updateSortOrderButton();
                this.browseDirectory(this.currentPath);
            });
        }

        if (fileTypeFilter) {
            fileTypeFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterAndDisplayFiles();
            });
        }

        // Navigation buttons
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const upBtn = document.getElementById('upBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        if (backBtn) backBtn.addEventListener('click', () => this.navigateBack());
        if (forwardBtn) forwardBtn.addEventListener('click', () => this.navigateForward());
        if (upBtn) upBtn.addEventListener('click', () => this.navigateUp());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshCurrentDirectory());

        // Action buttons
        const newFolderBtn = document.getElementById('newFolderBtn');
        const uploadBtn = document.getElementById('uploadBtn');

        if (newFolderBtn) newFolderBtn.addEventListener('click', () => this.createNewFolder());
        if (uploadBtn) uploadBtn.addEventListener('click', () => this.triggerFileUpload());
        
        // Filter
        document.getElementById('fileTypeFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.filterAndDisplayFiles();
        });
        
        // Sort
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndDisplayFiles();
        });
        
        document.getElementById('sortOrder').addEventListener('click', (e) => {
            this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
            this.updateSortButton();
            this.filterAndDisplayFiles();
        });
        
        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayFiles();
            }
        });
        
        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredFiles.length / 20);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayFiles();
            }
        });
        
        // Modal
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('fileModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileModal') this.closeModal();
        });
        
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        document.getElementById('mobileOverlay').addEventListener('click', () => {
            this.closeSidebar();
        });
    }
    
    debounce(func, wait) {
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
    
    showClearButton(show) {
        const clearBtn = document.getElementById('clearSearch');
        clearBtn.style.display = show ? 'block' : 'none';
    }
    
    async loadSessions() {
        try {
            const response = await fetch('/api/scans');

            // Handle authentication errors
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const sessions = await response.json();

            this.displaySessions(sessions);

            // Auto-select first session
            if (sessions.length > 0) {
                this.selectSession(sessions[0].session_id);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showError('Không thể tải danh sách scan sessions');
        }
    }
    
    displaySessions(sessions) {
        const container = document.getElementById('sessionsList');
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="no-sessions">
                    <i class="fas fa-folder-open"></i>
                    <p>Chưa có scan session nào</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = sessions.map(session => {
            // Format timestamp từ 20250717_203145 thành readable format
            const timestamp = session.timestamp;
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);
            const hour = timestamp.substring(9, 11);
            const minute = timestamp.substring(11, 13);
            const formattedDate = `${day}/${month}/${year} ${hour}:${minute}`;

            return `
                <div class="session-item" data-session-id="${session.session_id}">
                    <div class="session-date">${formattedDate}</div>
                    <div class="session-stats">${session.file_count} files</div>
                </div>
            `;
        }).join('');
        
        // Bind click events
        container.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const sessionId = e.currentTarget.dataset.sessionId;
                this.selectSession(sessionId);
            });
        });
    }
    
    async selectSession(sessionId) {
        if (this.currentSession === sessionId) return;
        
        // Update UI
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-session-id="${sessionId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        this.currentSession = sessionId;
        this.currentPage = 1;
        
        // Show loading
        this.showLoading();
        
        try {
            // Load files
            const response = await fetch(`/api/files/${sessionId}`);

            // Handle authentication errors
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            this.files = data.files || [];
            this.displaySessionInfo(data.scan_info);
            this.filterAndDisplayFiles();

            // Load stats (temporarily disabled due to server issues)
            // this.loadSessionStats(sessionId);

        } catch (error) {
            console.error('Error loading session:', error);
            this.showError('Không thể tải dữ liệu session');
        }
    }
    
    displaySessionInfo(scanInfo) {
        const title = document.getElementById('sessionTitle');
        const stats = document.getElementById('sessionStats');
        
        if (scanInfo) {
            const date = new Date(scanInfo.scan_date).toLocaleString('vi-VN');
            title.textContent = `Scan Session - ${date}`;
            
            stats.innerHTML = `
                <div class="session-stat">
                    <span class="session-stat-value">${scanInfo.total_files}</span>
                    <span class="session-stat-label">Total Files</span>
                </div>
            `;
        }
    }
    
    async loadSessionStats(sessionId) {
        try {
            const response = await fetch(`/api/stats/${sessionId}`);

            // Handle authentication errors
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const stats = await response.json();

            this.updateGlobalStats(stats);
            this.updateSessionStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    updateGlobalStats(stats) {
        const globalStats = document.getElementById('globalStats');
        globalStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${stats.total_files || 0}</span>
                <span class="stat-label">Files</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.total_size_formatted || '0 B'}</span>
                <span class="stat-label">Total</span>
            </div>
        `;
    }
    
    updateSessionStats(stats) {
        const sessionStats = document.getElementById('sessionStats');
        
        const fileTypesHtml = Object.entries(stats.file_types || {})
            .map(([type, count]) => `
                <div class="session-stat">
                    <span class="session-stat-value">${count}</span>
                    <span class="session-stat-label">${this.capitalizeFirst(type)}</span>
                </div>
            `).join('');
        
        sessionStats.innerHTML = `
            <div class="session-stat">
                <span class="session-stat-value">${stats.total_files || 0}</span>
                <span class="session-stat-label">Total Files</span>
            </div>
            <div class="session-stat">
                <span class="session-stat-value">${stats.total_size_formatted || '0 B'}</span>
                <span class="session-stat-label">Total Size</span>
            </div>
            ${fileTypesHtml}
        `;
    }
    
    filterAndDisplayFiles() {
        let filtered = [...this.files];
        
        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(file => 
                file.file_name.toLowerCase().includes(query)
            );
        }
        
        // Apply type filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(file => file.file_type === this.currentFilter);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            let aVal, bVal;
            
            switch (this.currentSort) {
                case 'name':
                    aVal = a.file_name.toLowerCase();
                    bVal = b.file_name.toLowerCase();
                    break;
                case 'size':
                    aVal = a.file_size || 0;
                    bVal = b.file_size || 0;
                    break;
                case 'date':
                    aVal = new Date(a.upload_date || 0);
                    bVal = new Date(b.upload_date || 0);
                    break;
                case 'type':
                    aVal = a.file_type || '';
                    bVal = b.file_type || '';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return this.currentSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.filteredFiles = filtered;
        this.currentPage = 1;
        this.displayFiles();
    }
    
    displayFiles() {
        const container = document.getElementById('filesGrid');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const filesContainer = document.getElementById('filesContainer');
        const noResults = document.getElementById('noResults');
        
        // Hide loading
        this.hideLoading();
        
        if (!this.currentSession) {
            welcomeScreen.style.display = 'flex';
            filesContainer.style.display = 'none';
            noResults.style.display = 'none';
            return;
        }
        
        welcomeScreen.style.display = 'none';
        
        if (this.filteredFiles.length === 0) {
            filesContainer.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }
        
        filesContainer.style.display = 'block';
        noResults.style.display = 'none';
        
        // Pagination
        const perPage = 20;
        const start = (this.currentPage - 1) * perPage;
        const end = start + perPage;
        const pageFiles = this.filteredFiles.slice(start, end);
        
        // Update grid class
        container.className = `files-grid ${this.currentView === 'list' ? 'list-view' : ''}`;
        
        // Render files
        container.innerHTML = pageFiles.map(file => this.renderFileCard(file)).join('');
        
        // Bind events
        this.bindFileEvents();
        
        // Update pagination
        this.updatePagination();
    }
    
    renderFileCard(file) {
        const isListView = this.currentView === 'list';
        const cardClass = isListView ? 'file-card list-view' : 'file-card';

        // Local file structure
        const fileName = file.name || 'Unknown';
        const fileType = file.file_type || 'unknown';
        const sizeFormatted = file.size_formatted || '—';
        const modifiedDate = file.modified_formatted || 'N/A';
        const isDirectory = file.is_directory || false;

        return `
            <div class="${cardClass}" data-file='${JSON.stringify(file)}' data-path="${file.path}">
                <div class="file-icon ${fileType}">
                    <i class="${file.icon || this.getFileIcon(fileType, isDirectory)}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${fileName}">${fileName}</div>
                    <div class="file-meta">
                        <span class="file-size">${sizeFormatted}</span>
                        <span class="file-date">${modifiedDate}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${isDirectory ? `
                        <button class="file-btn primary" data-action="open">
                            <i class="fas fa-folder-open"></i>
                            Mở
                        </button>
                    ` : `
                        <button class="file-btn view-details" data-action="details">
                            <i class="fas fa-info-circle"></i>
                            Chi tiết
                        </button>
                        <button class="file-btn" data-action="preview">
                            <i class="fas fa-eye"></i>
                            Xem
                        </button>
                    `}
                    <button class="file-btn" data-action="rename">
                        <i class="fas fa-edit"></i>
                        Đổi tên
                    </button>
                    <button class="file-btn" data-action="delete">
                        <i class="fas fa-trash"></i>
                        Xóa
                    </button>
                </div>
            </div>
        `;
    }

    getFileIcon(fileType) {
        const icons = {
            document: 'fas fa-file-alt',
            photo: 'fas fa-image',
            video: 'fas fa-video',
            audio: 'fas fa-music',
            voice: 'fas fa-microphone',
            sticker: 'fas fa-smile',
            animation: 'fas fa-play-circle',
            unknown: 'fas fa-file'
        };
        return icons[fileType] || icons.unknown;
    }

    bindFileEvents() {
        // File action buttons
        document.querySelectorAll('.file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileCard = e.target.closest('.file-card');
                const fileData = JSON.parse(fileCard.dataset.file);
                const action = e.target.closest('.file-btn').dataset.action;

                this.handleFileAction(action, fileData);
            });
        });

        // File card click (double-click to open)
        document.querySelectorAll('.file-card').forEach(card => {
            let clickCount = 0;
            card.addEventListener('click', (e) => {
                if (e.target.closest('.file-actions')) return;

                clickCount++;
                setTimeout(() => {
                    if (clickCount === 1) {
                        // Single click - select
                        this.selectFile(card);
                    } else if (clickCount === 2) {
                        // Double click - open
                        const fileData = JSON.parse(card.dataset.file);
                        if (fileData.is_directory) {
                            this.browseDirectory(fileData.path);
                        } else {
                            this.openFile(fileData);
                        }
                    }
                    clickCount = 0;
                }, 300);
            });
        });
    }

    handleFileAction(action, fileData) {
        switch (action) {
            case 'open':
                if (fileData.is_directory) {
                    this.browseDirectory(fileData.path);
                } else {
                    this.openFile(fileData);
                }
                break;
            case 'details':
                this.showFileDetails(fileData);
                break;
            case 'preview':
                this.previewFile(fileData);
                break;
            case 'rename':
                this.renameFile(fileData);
                break;
            case 'delete':
                this.deleteFile(fileData);
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    selectFile(card) {
        const isSelected = card.classList.contains('selected');

        // Clear other selections if not holding Ctrl
        if (!event.ctrlKey) {
            document.querySelectorAll('.file-card.selected').forEach(c => {
                c.classList.remove('selected');
            });
            this.selectedItems.clear();
        }

        // Toggle selection
        if (isSelected) {
            card.classList.remove('selected');
            this.selectedItems.delete(card.dataset.path);
        } else {
            card.classList.add('selected');
            this.selectedItems.add(card.dataset.path);
        }
    }

    openFile(fileData) {
        if (fileData.is_directory) {
            this.browseDirectory(fileData.path);
        } else {
            // Try to open file with system default application
            window.open(`file:///${fileData.path}`, '_blank');
        }
    }

    async previewFile(fileData) {
        try {
            const response = await fetch(`/api/file/preview?path=${encodeURIComponent(fileData.path)}`);
            const result = await response.json();

            if (result.success) {
                this.showFilePreview(result.preview);
            } else {
                this.showError('Không thể xem trước file: ' + result.error);
            }
        } catch (error) {
            console.error('Error previewing file:', error);
            this.showError('Không thể xem trước file');
        }
    }

    async renameFile(fileData) {
        const newName = prompt('Nhập tên mới:', fileData.name);
        if (!newName || newName === fileData.name) return;

        try {
            const response = await fetch('/api/item/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_path: fileData.path,
                    new_name: newName
                })
            });

            const result = await response.json();
            if (result.success) {
                this.refreshCurrentDirectory();
            } else {
                this.showError('Không thể đổi tên: ' + result.error);
            }
        } catch (error) {
            console.error('Error renaming file:', error);
            this.showError('Không thể đổi tên file');
        }
    }

    async deleteFile(fileData) {
        const confirmMessage = fileData.is_directory
            ? `Bạn có chắc muốn xóa thư mục "${fileData.name}" và tất cả nội dung bên trong?`
            : `Bạn có chắc muốn xóa file "${fileData.name}"?`;

        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch('/api/item/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_path: fileData.path
                })
            });

            const result = await response.json();
            if (result.success) {
                this.refreshCurrentDirectory();
            } else {
                this.showError('Không thể xóa: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showError('Không thể xóa file');
        }
    }

    showFileDetails(file) {
        const modal = document.getElementById('fileModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const downloadBtn = document.getElementById('downloadBtn');

        modalTitle.textContent = file.file_name;

        // Truy cập đúng cấu trúc dữ liệu
        const fileInfo = file.file_info || {};
        const fileType = fileInfo.type || 'unknown';
        const sizeFormatted = fileInfo.size_formatted || 'N/A';
        const mimeType = fileInfo.mime_type;

        const uploadDate = fileInfo.upload_date ?
            new Date(fileInfo.upload_date).toLocaleString('vi-VN') : 'N/A';

        modalBody.innerHTML = `
            <div class="file-detail">
                <div class="file-detail-icon">
                    <div class="file-icon ${fileType} large">
                        <i class="${this.getFileIcon(fileType)}"></i>
                    </div>
                </div>

                <div class="file-detail-info">
                    <h4>Thông tin file</h4>
                    <div class="detail-row">
                        <span class="detail-label">Tên file:</span>
                        <span class="detail-value">${file.file_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Loại file:</span>
                        <span class="detail-value">${this.capitalizeFirst(fileType)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Kích thước:</span>
                        <span class="detail-value">${sizeFormatted}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ngày upload:</span>
                        <span class="detail-value">${uploadDate}</span>
                    </div>
                    ${mimeType ? `
                        <div class="detail-row">
                            <span class="detail-label">MIME type:</span>
                            <span class="detail-value">${mimeType}</span>
                        </div>
                    ` : ''}
                    ${file.file_info && file.file_info.dimensions ? `
                        <div class="detail-row">
                            <span class="detail-label">Kích thước:</span>
                            <span class="detail-value">${file.file_info.dimensions.width} x ${file.file_info.dimensions.height}</span>
                        </div>
                    ` : ''}
                    ${file.file_info && file.file_info.duration ? `
                        <div class="detail-row">
                            <span class="detail-label">Thời lượng:</span>
                            <span class="detail-value">${this.formatDuration(file.file_info.duration)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="message-detail-info">
                    <h4>Thông tin tin nhắn</h4>
                    <div class="detail-row">
                        <span class="detail-label">Message ID:</span>
                        <span class="detail-value">${file.message_info ? file.message_info.message_id : 'N/A'}</span>
                    </div>
                    ${file.message_info && file.message_info.message_text ? `
                        <div class="detail-row">
                            <span class="detail-label">Nội dung:</span>
                            <span class="detail-value">${file.message_info.message_text}</span>
                        </div>
                    ` : ''}
                    ${file.message_info && file.message_info.sender_id ? `
                        <div class="detail-row">
                            <span class="detail-label">Sender ID:</span>
                            <span class="detail-value">${file.message_info.sender_id}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Setup download button
        if (file.download_link) {
            downloadBtn.style.display = 'inline-flex';
            downloadBtn.onclick = () => {
                window.open(file.download_link, '_blank');
            };
        } else {
            downloadBtn.style.display = 'none';
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('fileModal');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    updateViewButtons() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === this.currentView) {
                btn.classList.add('active');
            }
        });
    }

    updateSortButton() {
        const sortBtn = document.getElementById('sortOrder');
        const icon = sortBtn.querySelector('i');

        if (this.currentSortOrder === 'asc') {
            icon.className = 'fas fa-sort-alpha-down';
            sortBtn.title = 'Sắp xếp tăng dần';
        } else {
            icon.className = 'fas fa-sort-alpha-up';
            sortBtn.title = 'Sắp xếp giảm dần';
        }
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');

        const totalPages = Math.ceil(this.filteredFiles.length / 20);

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        pageInfo.textContent = `Trang ${this.currentPage} / ${totalPages}`;

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }

    showLoading() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('filesContainer').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingScreen').style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        // You can implement a toast notification here
        console.error(message);
        alert(message);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');

        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('open');
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 &&
                    !sidebar.contains(e.target) &&
                    !mobileMenuBtn.contains(e.target) &&
                    sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            });

            // Close sidebar on window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('open');
                }
            });

            // Close sidebar when navigating on mobile
            sidebar.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && e.target.closest('.drive-item')) {
                    setTimeout(() => sidebar.classList.remove('open'), 300);
                }
            });
        }

        // Mobile responsive handling
        this.checkMobile();
        window.addEventListener('resize', () => this.checkMobile());
    }

    checkMobile() {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        if (!isMobile) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    // Authentication methods
    setupAuthentication() {
        // Setup user dropdown menu
        const userMenuToggle = document.getElementById('userMenuToggle');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (userMenuToggle && userDropdown) {
            // Toggle dropdown
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuToggle.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }

        // Setup logout functionality
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    async logout() {
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to login page
                window.location.href = '/login';
            } else {
                console.error('Logout failed:', data.message);
                // Force redirect anyway
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect on error
            window.location.href = '/login';
        }
    }
}

    // New methods for local file management
    async loadDrives() {
        try {
            const response = await fetch('/api/drives');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                this.drives = result.drives;
                this.displayDrives();
                // Load default drive
                if (this.drives.length > 0) {
                    this.browseDirectory(this.drives[0].path);
                }
            } else {
                this.showError('Không thể tải danh sách ổ đĩa: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading drives:', error);
            this.showError('Không thể tải danh sách ổ đĩa');
        }
    }

    displayDrives() {
        const container = document.getElementById('sessionsList');
        if (!container) return;

        if (this.drives.length === 0) {
            container.innerHTML = `
                <div class="no-drives">
                    <i class="fas fa-hdd"></i>
                    <p>Không tìm thấy ổ đĩa nào</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.drives.map(drive => `
            <div class="drive-item" data-path="${drive.path}">
                <div class="drive-info">
                    <div class="drive-label">
                        <i class="fas fa-hdd"></i>
                        ${drive.label}
                    </div>
                    <div class="drive-stats">
                        ${drive.free_formatted} trống / ${drive.total_formatted}
                    </div>
                </div>
                <div class="drive-usage">
                    <div class="usage-bar">
                        <div class="usage-fill" style="width: ${drive.usage_percent}%"></div>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind click events
        container.querySelectorAll('.drive-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                this.browseDirectory(path);
            });
        });
    }

    async browseDirectory(path, page = 1) {
        try {
            this.showLoading();

            const params = new URLSearchParams({
                path: path,
                page: page.toString(),
                per_page: '50',
                sort_by: this.currentSort,
                sort_order: this.currentSortOrder
            });

            const response = await fetch(`/api/browse?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                this.currentPath = result.current_path;
                this.files = result.items;
                this.currentPage = page;

                this.updateBreadcrumbs();
                this.updateNavigationButtons();
                this.filterAndDisplayFiles();
                this.updateDirectoryStats(result.stats);

                // Update active drive
                this.updateActiveDrive();

            } else {
                this.showError('Không thể truy cập thư mục: ' + result.error);
            }
        } catch (error) {
            console.error('Error browsing directory:', error);
            this.showError('Không thể truy cập thư mục');
        } finally {
            this.hideLoading();
        }
    }

    updateBreadcrumbs() {
        const breadcrumbContainer = document.getElementById('breadcrumbs');
        if (!breadcrumbContainer) return;

        const pathParts = this.currentPath.split('\\').filter(part => part);
        const breadcrumbs = [];

        // Add root
        breadcrumbs.push({
            name: 'Máy tính',
            path: '',
            isRoot: true
        });

        // Add path parts
        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath += part + '\\';
            breadcrumbs.push({
                name: part === pathParts[0] ? part : part,
                path: currentPath,
                isLast: index === pathParts.length - 1
            });
        });

        breadcrumbContainer.innerHTML = breadcrumbs.map(crumb => `
            <span class="breadcrumb-item ${crumb.isLast ? 'active' : ''}"
                  ${!crumb.isLast ? `data-path="${crumb.path}"` : ''}>
                ${crumb.isRoot ? '<i class="fas fa-home"></i>' : ''}
                ${crumb.name}
            </span>
        `).join('<i class="fas fa-chevron-right breadcrumb-separator"></i>');

        // Bind click events
        breadcrumbContainer.querySelectorAll('.breadcrumb-item:not(.active)').forEach(item => {
            item.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                if (path) {
                    this.browseDirectory(path);
                } else {
                    this.showDriveSelection();
                }
            });
        });
    }

    setupContextMenu() {
        // Create context menu element
        const contextMenu = document.createElement('div');
        contextMenu.id = 'contextMenu';
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="open">
                <i class="fas fa-folder-open"></i>
                <span>Mở</span>
            </div>
            <div class="context-menu-item" data-action="rename">
                <i class="fas fa-edit"></i>
                <span>Đổi tên</span>
            </div>
            <div class="context-menu-item" data-action="copy">
                <i class="fas fa-copy"></i>
                <span>Sao chép</span>
            </div>
            <div class="context-menu-item" data-action="cut">
                <i class="fas fa-cut"></i>
                <span>Cắt</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="delete">
                <i class="fas fa-trash"></i>
                <span>Xóa</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="properties">
                <i class="fas fa-info-circle"></i>
                <span>Thuộc tính</span>
            </div>
        `;
        document.body.appendChild(contextMenu);

        // Context menu event handlers
        let currentContextFile = null;

        // Right-click on file cards
        document.addEventListener('contextmenu', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard) {
                e.preventDefault();
                currentContextFile = JSON.parse(fileCard.dataset.file);
                this.showContextMenu(e.clientX, e.clientY, currentContextFile);
            } else if (e.target.closest('.files-grid')) {
                e.preventDefault();
                currentContextFile = null;
                this.showContextMenu(e.clientX, e.clientY, null);
            }
        });

        // Context menu item clicks
        contextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item && currentContextFile) {
                const action = item.dataset.action;
                this.handleContextAction(action, currentContextFile);
            }
            this.hideContextMenu();
        });

        // Hide context menu on click outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Hide context menu on scroll
        document.addEventListener('scroll', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(x, y, fileData) {
        const contextMenu = document.getElementById('contextMenu');

        // Update menu items based on file type
        if (fileData) {
            const openItem = contextMenu.querySelector('[data-action="open"]');
            if (fileData.is_directory) {
                openItem.innerHTML = '<i class="fas fa-folder-open"></i><span>Mở thư mục</span>';
            } else {
                openItem.innerHTML = '<i class="fas fa-external-link-alt"></i><span>Mở file</span>';
            }
        }

        // Position and show menu
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';

        // Adjust position if menu goes off screen
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.style.display = 'none';
    }

    handleContextAction(action, fileData) {
        switch (action) {
            case 'open':
                this.openFile(fileData);
                break;
            case 'rename':
                this.renameFile(fileData);
                break;
            case 'copy':
                this.copyFile(fileData);
                break;
            case 'cut':
                this.cutFile(fileData);
                break;
            case 'delete':
                this.deleteFile(fileData);
                break;
            case 'properties':
                this.showFileDetails(fileData);
                break;
        }
    }

    setupDragAndDrop() {
        let draggedFiles = [];

        // Make file cards draggable
        document.addEventListener('mousedown', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard && !e.target.closest('.file-actions')) {
                fileCard.draggable = true;
            }
        });

        // Drag start
        document.addEventListener('dragstart', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard) {
                const fileData = JSON.parse(fileCard.dataset.file);
                draggedFiles = [fileData];

                // Add visual feedback
                fileCard.classList.add('dragging');

                // Set drag data
                e.dataTransfer.setData('text/plain', JSON.stringify(draggedFiles));
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        // Drag end
        document.addEventListener('dragend', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard) {
                fileCard.classList.remove('dragging');
                fileCard.draggable = false;
            }
            draggedFiles = [];
        });

        // Drag over
        document.addEventListener('dragover', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard) {
                const fileData = JSON.parse(fileCard.dataset.file);
                if (fileData.is_directory) {
                    e.preventDefault();
                    fileCard.classList.add('drag-over');
                }
            }
        });

        // Drag leave
        document.addEventListener('dragleave', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard) {
                fileCard.classList.remove('drag-over');
            }
        });

        // Drop
        document.addEventListener('drop', (e) => {
            e.preventDefault();

            const fileCard = e.target.closest('.file-card');
            if (fileCard) {
                fileCard.classList.remove('drag-over');

                const targetFileData = JSON.parse(fileCard.dataset.file);
                if (targetFileData.is_directory && draggedFiles.length > 0) {
                    this.moveFiles(draggedFiles, targetFileData.path);
                }
            }
        });

        // File upload drag and drop
        const filesGrid = document.getElementById('filesGrid');
        if (filesGrid) {
            filesGrid.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                filesGrid.classList.add('drag-over-upload');
            });

            filesGrid.addEventListener('dragleave', (e) => {
                if (!filesGrid.contains(e.relatedTarget)) {
                    filesGrid.classList.remove('drag-over-upload');
                }
            });

            filesGrid.addEventListener('drop', (e) => {
                e.preventDefault();
                filesGrid.classList.remove('drag-over-upload');

                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    this.uploadFiles(files);
                }
            });
        }
    }

    async moveFiles(files, targetPath) {
        try {
            this.showProgressIndicator('Đang di chuyển file...');

            for (const file of files) {
                const response = await fetch('/api/item/move', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source_path: file.path,
                        destination_path: targetPath
                    })
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error);
                }
            }

            this.refreshCurrentDirectory();
            this.showSuccess('Di chuyển file thành công');
        } catch (error) {
            console.error('Error moving files:', error);
            this.showError('Không thể di chuyển file: ' + error.message);
        } finally {
            this.hideProgressIndicator();
        }
    }

    async uploadFiles(files) {
        try {
            this.showProgressIndicator('Đang tải lên file...');

            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });
            formData.append('destination', this.currentPath);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                this.refreshCurrentDirectory();
                this.showSuccess('Tải lên file thành công');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            this.showError('Không thể tải lên file: ' + error.message);
        } finally {
            this.hideProgressIndicator();
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input fields
            if (e.target.matches('input, textarea, select')) return;

            // Ctrl+R or F5 - Refresh
            if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
                e.preventDefault();
                this.refreshCurrentDirectory();
            }

            // Backspace - Go up
            if (e.key === 'Backspace') {
                e.preventDefault();
                this.navigateUp();
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
                this.hideContextMenu();
            }

            // Ctrl+C - Copy
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.copySelectedFiles();
            }

            // Ctrl+X - Cut
            if (e.ctrlKey && e.key === 'x') {
                e.preventDefault();
                this.cutSelectedFiles();
            }

            // Ctrl+V - Paste
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.pasteFiles();
            }

            // Delete - Delete selected files
            if (e.key === 'Delete') {
                e.preventDefault();
                this.deleteSelectedFiles();
            }

            // F2 - Rename
            if (e.key === 'F2') {
                e.preventDefault();
                this.renameSelectedFile();
            }

            // Ctrl+A - Select all
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAllFiles();
            }

            // Enter - Open selected file/folder
            if (e.key === 'Enter') {
                e.preventDefault();
                this.openSelectedFile();
            }
        });
    }

    copySelectedFiles() {
        const selectedFiles = this.getSelectedFiles();
        if (selectedFiles.length === 0) {
            this.showError('Không có file nào được chọn');
            return;
        }

        this.clipboard = {
            operation: 'copy',
            files: selectedFiles
        };
        this.showSuccess(`Đã sao chép ${selectedFiles.length} file`);
    }

    cutSelectedFiles() {
        const selectedFiles = this.getSelectedFiles();
        if (selectedFiles.length === 0) {
            this.showError('Không có file nào được chọn');
            return;
        }

        this.clipboard = {
            operation: 'cut',
            files: selectedFiles
        };
        this.showSuccess(`Đã cắt ${selectedFiles.length} file`);
    }

    deleteSelectedFiles() {
        const selectedFiles = this.getSelectedFiles();
        if (selectedFiles.length === 0) {
            this.showError('Không có file nào được chọn');
            return;
        }

        const confirmMessage = selectedFiles.length === 1
            ? `Bạn có chắc muốn xóa "${selectedFiles[0].name}"?`
            : `Bạn có chắc muốn xóa ${selectedFiles.length} file đã chọn?`;

        if (confirm(confirmMessage)) {
            selectedFiles.forEach(file => this.deleteFile(file));
        }
    }

    renameSelectedFile() {
        const selectedFiles = this.getSelectedFiles();
        if (selectedFiles.length !== 1) {
            this.showError('Vui lòng chọn một file để đổi tên');
            return;
        }

        this.renameFile(selectedFiles[0]);
    }

    selectAllFiles() {
        document.querySelectorAll('.file-card').forEach(card => {
            card.classList.add('selected');
            this.selectedItems.add(card.dataset.path);
        });
    }

    openSelectedFile() {
        const selectedFiles = this.getSelectedFiles();
        if (selectedFiles.length !== 1) {
            return;
        }

        this.openFile(selectedFiles[0]);
    }

    getSelectedFiles() {
        const selectedCards = document.querySelectorAll('.file-card.selected');
        return Array.from(selectedCards).map(card => JSON.parse(card.dataset.file));
    }

    async createNewFolder() {
        const folderName = prompt('Nhập tên thư mục mới:');
        if (!folderName || folderName.trim() === '') return;

        try {
            this.showProgressIndicator('Đang tạo thư mục...');

            const response = await fetch('/api/folder/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parent_path: this.currentPath,
                    folder_name: folderName.trim()
                })
            });

            const result = await response.json();
            if (result.success) {
                this.refreshCurrentDirectory();
                this.showSuccess('Tạo thư mục thành công');
            } else {
                this.showError('Không thể tạo thư mục: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            this.showError('Không thể tạo thư mục');
        } finally {
            this.hideProgressIndicator();
        }
    }

    triggerFileUpload() {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    // Initialize clipboard
    clipboard = null;

    // Navigation methods
    navigateUp() {
        if (this.currentPath && this.currentPath !== '') {
            const parentPath = this.currentPath.split('\\').slice(0, -1).join('\\');
            if (parentPath) {
                this.browseDirectory(parentPath + '\\');
            } else {
                this.showDriveSelection();
            }
        }
    }

    navigateBack() {
        // Implementation for back navigation
        console.log('Navigate back');
    }

    navigateForward() {
        // Implementation for forward navigation
        console.log('Navigate forward');
    }

    refreshCurrentDirectory() {
        if (this.currentPath) {
            this.browseDirectory(this.currentPath);
        }
    }

    showDriveSelection() {
        this.currentPath = '';
        this.files = [];
        this.displayDrives();
        this.updateBreadcrumbs();
    }

    updateNavigationButtons() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const upBtn = document.getElementById('upBtn');

        // For now, just enable/disable up button
        if (upBtn) {
            upBtn.disabled = !this.currentPath || this.currentPath === '';
        }
    }

    updateActiveDrive() {
        const driveItems = document.querySelectorAll('.drive-item');
        driveItems.forEach(item => {
            const drivePath = item.dataset.path;
            if (this.currentPath && this.currentPath.startsWith(drivePath)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateDirectoryStats(stats) {
        // Update directory statistics display
        const statsContainer = document.getElementById('directoryStats');
        if (statsContainer && stats) {
            statsContainer.innerHTML = `
                <span>${stats.total_items} mục</span>
                <span>${stats.directories} thư mục</span>
                <span>${stats.files} file</span>
            `;
        }
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.file-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    }

    updateSortOrderButton() {
        const sortOrderBtn = document.getElementById('sortOrder');
        if (sortOrderBtn) {
            const icon = sortOrderBtn.querySelector('i');
            if (this.currentSortOrder === 'asc') {
                icon.className = 'fas fa-sort-alpha-down';
            } else {
                icon.className = 'fas fa-sort-alpha-up';
            }
        }
    }

    async performSearch() {
        if (!this.searchQuery || this.searchQuery.trim() === '') {
            this.browseDirectory(this.currentPath);
            return;
        }

        try {
            this.showLoading();

            const params = new URLSearchParams({
                path: this.currentPath,
                query: this.searchQuery.trim(),
                max_results: '100'
            });

            const response = await fetch(`/api/search?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                this.files = result.results;
                this.filterAndDisplayFiles();
            } else {
                this.showError('Lỗi tìm kiếm: ' + result.error);
            }
        } catch (error) {
            console.error('Error searching:', error);
            this.showError('Không thể thực hiện tìm kiếm');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        const container = document.getElementById('filesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-screen">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Đang tải...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be hidden when files are displayed
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    showProgressIndicator(message) {
        // Create progress indicator
        const progress = document.createElement('div');
        progress.id = 'progressIndicator';
        progress.className = 'progress-indicator';
        progress.innerHTML = `
            <div class="progress-content">
                <div class="progress-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="progress-message">${message}</div>
            </div>
        `;

        document.body.appendChild(progress);
        setTimeout(() => progress.classList.add('show'), 100);
    }

    hideProgressIndicator() {
        const progress = document.getElementById('progressIndicator');
        if (progress) {
            progress.classList.remove('show');
            setTimeout(() => progress.remove(), 300);
        }
    }

    // Additional utility methods
    copyFile(fileData) {
        // Store in clipboard for paste operation
        this.clipboard = {
            operation: 'copy',
            files: [fileData]
        };
        this.showSuccess('File đã được sao chép');
    }

    cutFile(fileData) {
        // Store in clipboard for paste operation
        this.clipboard = {
            operation: 'cut',
            files: [fileData]
        };
        this.showSuccess('File đã được cắt');
    }

    async pasteFiles() {
        if (!this.clipboard || !this.clipboard.files.length) {
            this.showError('Không có file nào để dán');
            return;
        }

        try {
            this.showProgressIndicator('Đang dán file...');

            for (const file of this.clipboard.files) {
                const endpoint = this.clipboard.operation === 'copy' ? '/api/item/copy' : '/api/item/move';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source_path: file.path,
                        destination_path: this.currentPath
                    })
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error);
                }
            }

            // Clear clipboard if it was a cut operation
            if (this.clipboard.operation === 'cut') {
                this.clipboard = null;
            }

            this.refreshCurrentDirectory();
            this.showSuccess('Dán file thành công');
        } catch (error) {
            console.error('Error pasting files:', error);
            this.showError('Không thể dán file: ' + error.message);
        } finally {
            this.hideProgressIndicator();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LocalFileManager();
});

// Add CSS for file detail modal
const additionalCSS = `
.file-detail {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.file-detail-icon {
    text-align: center;
}

.file-icon.large {
    width: 80px;
    height: 80px;
    font-size: 40px;
    margin: 0 auto;
}

.file-detail-info,
.message-detail-info {
    background: var(--telegram-bg-secondary);
    padding: 20px;
    border-radius: var(--border-radius);
}

.file-detail-info h4,
.message-detail-info h4 {
    margin-bottom: 15px;
    color: var(--telegram-text);
    font-size: 16px;
    font-weight: 600;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 15px;
}

.detail-row:last-child {
    margin-bottom: 0;
}

.detail-label {
    font-weight: 500;
    color: var(--telegram-text-secondary);
    min-width: 100px;
    flex-shrink: 0;
}

.detail-value {
    color: var(--telegram-text);
    text-align: right;
    word-break: break-word;
}

@media (max-width: 768px) {
    .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
    }

    .detail-value {
        text-align: left;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
