/**
 * TeleDrive - Telegram File Scanner Web Interface
 */
function TeleDrive() {
    this.sessions = [];
    this.currentSession = null;
    this.files = [];
    this.currentFilter = 'all';
    this.currentSort = 'name';
    this.currentSortOrder = 'asc';
    this.currentView = 'grid';
    this.selectedItems = [];

    this.init();
}
TeleDrive.prototype.init = function() {
    this.bindEvents();
    this.loadSessions();
    this.setupMobileMenu();
};

TeleDrive.prototype.bindEvents = function() {
    var self = this;

    // Search functionality
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            self.searchFiles(e.target.value);
        });
    }

    // Filter buttons
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].addEventListener('click', function(e) {
            self.setFilter(e.target.dataset.filter);
        });
    }

    // Sort controls
    var sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function(e) {
            self.setSortBy(e.target.value);
        });
    }

    var sortOrderBtn = document.getElementById('sortOrder');
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', function() {
            self.toggleSortOrder();
        });
    }

    // View toggle
    var viewBtns = document.querySelectorAll('.view-btn');
    for (var i = 0; i < viewBtns.length; i++) {
        viewBtns[i].addEventListener('click', function(e) {
            self.setView(e.target.dataset.view);
        });
    }

    // Navigation buttons
    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            self.loadSessions();
        });
    }
};
TeleDrive.prototype.loadSessions = function() {
    var self = this;
    this.showLoading();

    fetch('/api/scans')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                self.sessions = result.sessions;
                self.displaySessions();
            } else {
                self.showError('Không thể tải danh sách sessions: ' + result.error);
            }
        })
        .catch(function(error) {
            console.error('Error loading sessions:', error);
            self.showError('Không thể tải danh sách sessions');
        })
        .finally(function() {
            self.hideLoading();
        });
};
TeleDrive.prototype.displaySessions = function() {
    var self = this;
    var container = document.getElementById('sessionsList');
    if (!container) return;

    if (this.sessions.length === 0) {
        container.innerHTML =
            '<div class="no-sessions">' +
                '<i class="icon icon-cloud"></i>' +
                '<p>Chưa có session nào</p>' +
            '</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < this.sessions.length; i++) {
        var session = this.sessions[i];
        html +=
            '<div class="session-item" data-session-id="' + session.session_id + '">' +
                '<div class="session-info">' +
                    '<div class="session-name">' + session.session_id + '</div>' +
                    '<div class="session-stats">' + session.file_count + ' files</div>' +
                '</div>' +
            '</div>';
    }
    container.innerHTML = html;

    // Bind click events
    var sessionItems = container.querySelectorAll('.session-item');
    for (var i = 0; i < sessionItems.length; i++) {
        sessionItems[i].addEventListener('click', function() {
            var sessionId = this.dataset.sessionId;
            self.loadSession(sessionId);
        });
    }
};
    
    async loadSession(sessionId) {
        try {
            this.showLoading();
            this.currentSession = sessionId;
            
            // Update active session
            document.querySelectorAll('.session-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-session-id="${sessionId}"]`).classList.add('active');
            
            const response = await fetch(`/api/scans/${sessionId}/files`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                this.files = result.files;
                this.filterAndDisplayFiles();
            } else {
                this.showError('Không thể tải files: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.showError('Không thể tải session');
        } finally {
            this.hideLoading();
        }
    }
    
    filterAndDisplayFiles() {
        let filteredFiles = this.files;
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            filteredFiles = filteredFiles.filter(file => 
                file.file_type === this.currentFilter
            );
        }
        
        // Apply sort
        filteredFiles.sort((a, b) => {
            let aVal, bVal;
            
            switch (this.currentSort) {
                case 'name':
                    aVal = a.file_name.toLowerCase();
                    bVal = b.file_name.toLowerCase();
                    break;
                case 'size':
                    aVal = a.file_info?.size || 0;
                    bVal = b.file_info?.size || 0;
                    break;
                case 'date':
                    aVal = new Date(a.date);
                    bVal = new Date(b.date);
                    break;
                default:
                    aVal = a.file_name.toLowerCase();
                    bVal = b.file_name.toLowerCase();
            }
            
            if (this.currentSortOrder === 'desc') {
                return aVal < bVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });
        
        this.displayFiles(filteredFiles);
    }
    
    displayFiles(files) {
        const container = document.getElementById('filesContainer');
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="welcome-screen">
                    <i class="icon icon-cloud welcome-icon"></i>
                    <h2>Chào mừng đến với TeleDrive</h2>
                    <p>Chọn một scan session từ sidebar để xem các file đã quét được</p>
                </div>
            `;
            return;
        }
        
        const filesHtml = files.map(file => this.createFileCard(file)).join('');
        container.innerHTML = `<div class="files-grid">${filesHtml}</div>`;
        
        // Bind file events
        this.bindFileEvents();
    }
    
    createFileCard(file) {
        const fileSize = this.formatFileSize(file.file_info?.size || 0);
        const fileDate = this.formatDate(file.date);
        const fileIcon = this.getFileIcon(file.file_type);
        
        return `
            <div class="file-card" data-file-id="${file.message_id}">
                <div class="file-icon ${file.file_type}">
                    <i class="icon ${fileIcon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.file_name}">${file.file_name}</div>
                    <div class="file-meta">${fileSize} • ${fileDate}</div>
                </div>
                <div class="file-actions">
                    <button class="file-btn" data-action="info">
                        <i class="icon icon-info"></i>
                        Chi tiết
                    </button>
                    <button class="file-btn" data-action="view">
                        <i class="icon icon-eye"></i>
                        Xem
                    </button>
                </div>
            </div>
        `;
    }
    
    getFileIcon(fileType) {
        const icons = {
            'document': 'icon-file-alt',
            'image': 'icon-image',
            'video': 'icon-video',
            'audio': 'icon-audio',
            'voice': 'icon-microphone',
            'archive': 'icon-archive',
            'code': 'icon-code',
            'sticker': 'icon-smile'
        };
        return icons[fileType] || 'icon-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    }
    
    bindFileEvents() {
        document.querySelectorAll('.file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const fileCard = btn.closest('.file-card');
                const fileId = fileCard.dataset.fileId;
                this.handleFileAction(action, fileId);
            });
        });
    }
    
    handleFileAction(action, fileId) {
        const file = this.files.find(f => f.message_id.toString() === fileId);
        if (!file) return;
        
        switch (action) {
            case 'info':
                this.showFileDetails(file);
                break;
            case 'view':
                this.viewFile(file);
                break;
        }
    }
    
    showFileDetails(file) {
        // Implementation for showing file details modal
        console.log('Show file details:', file);
    }
    
    viewFile(file) {
        // Implementation for viewing file
        console.log('View file:', file);
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.filterAndDisplayFiles();
    }
    
    setSortBy(sortBy) {
        this.currentSort = sortBy;
        this.filterAndDisplayFiles();
    }
    
    toggleSortOrder() {
        this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
        this.filterAndDisplayFiles();
    }
    
    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        // Update view implementation
    }
    
    searchFiles(query) {
        // Simple client-side search
        if (!query.trim()) {
            this.filterAndDisplayFiles();
            return;
        }
        
        const filteredFiles = this.files.filter(file =>
            file.file_name.toLowerCase().includes(query.toLowerCase())
        );
        this.displayFiles(filteredFiles);
    }
    
    setupMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
    }
    
TeleDrive.prototype.showLoading = function() {
    var container = document.getElementById('filesContainer');
    if (container) {
        container.innerHTML =
            '<div class="loading-screen">' +
                '<i class="icon icon-spinner"></i>' +
                '<p>Đang tải...</p>' +
            '</div>';
    }
};

TeleDrive.prototype.hideLoading = function() {
    // Loading will be hidden when content is displayed
};

TeleDrive.prototype.showError = function(message) {
    console.error(message);
    // Could implement toast notifications here
};

TeleDrive.prototype.showSuccess = function(message) {
    console.log(message);
    // Could implement toast notifications here
};

// Add missing methods as stubs
TeleDrive.prototype.loadSession = function(sessionId) {
    console.log('Loading session:', sessionId);
};

TeleDrive.prototype.setFilter = function(filter) {
    console.log('Set filter:', filter);
};

TeleDrive.prototype.setSortBy = function(sortBy) {
    console.log('Set sort by:', sortBy);
};

TeleDrive.prototype.toggleSortOrder = function() {
    console.log('Toggle sort order');
};

TeleDrive.prototype.setView = function(view) {
    console.log('Set view:', view);
};

TeleDrive.prototype.searchFiles = function(query) {
    console.log('Search files:', query);
};

TeleDrive.prototype.setupMobileMenu = function() {
    var menuToggle = document.querySelector('.mobile-menu-toggle');
    var sidebar = document.querySelector('.sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
    }
};
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.teleDrive = new TeleDrive();
});
