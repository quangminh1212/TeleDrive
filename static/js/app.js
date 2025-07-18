// TeleDrive JavaScript - Telegram Style File Manager

class TeleDriveApp {
    constructor() {
        this.currentSession = null;
        this.currentPage = 1;
        this.currentView = 'grid';
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.currentSortOrder = 'asc';
        this.searchQuery = '';
        this.files = [];
        this.filteredFiles = [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadSessions();
        this.setupMobileMenu();
    }
    
    bindEvents() {
        // Search
        const globalSearch = document.getElementById('globalSearch');
        const clearSearch = document.getElementById('clearSearch');
        
        globalSearch.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.showClearButton(this.searchQuery.length > 0);
            this.debounce(() => this.filterAndDisplayFiles(), 300)();
        });
        
        clearSearch.addEventListener('click', () => {
            globalSearch.value = '';
            this.searchQuery = '';
            this.showClearButton(false);
            this.filterAndDisplayFiles();
        });
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.updateViewButtons();
                this.displayFiles();
            });
        });
        
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
            const sessions = await response.json();
            
            this.displaySessions(sessions);
            
            // Auto-select first session
            if (sessions.length > 0) {
                this.selectSession(sessions[0].id);
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
        
        container.innerHTML = sessions.map(session => `
            <div class="session-item" data-session-id="${session.id}">
                <div class="session-date">${session.formatted_date}</div>
                <div class="session-stats">${session.total_files} files</div>
            </div>
        `).join('');
        
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
            const data = await response.json();
            
            this.files = data.files || [];
            this.displaySessionInfo(data.scan_info);
            this.filterAndDisplayFiles();
            
            // Load stats
            this.loadSessionStats(sessionId);
            
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
        
        const uploadDate = file.upload_date ? 
            new Date(file.upload_date).toLocaleDateString('vi-VN') : 'N/A';
        
        return `
            <div class="${cardClass}" data-file='${JSON.stringify(file)}'>
                <div class="file-icon ${file.file_type}">
                    <i class="${this.getFileIcon(file.file_type)}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.file_name}">${file.file_name}</div>
                    <div class="file-meta">
                        <span class="file-size">${file.size_formatted}</span>
                        <span class="file-date">${uploadDate}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-btn view-details">
                        <i class="fas fa-info-circle"></i>
                        Chi tiết
                    </button>
                    ${file.download_link ? `
                        <a href="${file.download_link}" class="file-btn primary" target="_blank">
                            <i class="fas fa-download"></i>
                            Tải
                        </a>
                    ` : ''}
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
        // View details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileCard = e.target.closest('.file-card');
                const fileData = JSON.parse(fileCard.dataset.file);
                this.showFileDetails(fileData);
            });
        });

        // File card click
        document.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.file-actions')) return;
                const fileData = JSON.parse(card.dataset.file);
                this.showFileDetails(fileData);
            });
        });
    }

    showFileDetails(file) {
        const modal = document.getElementById('fileModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const downloadBtn = document.getElementById('downloadBtn');

        modalTitle.textContent = file.file_name;

        const uploadDate = file.upload_date ?
            new Date(file.upload_date).toLocaleString('vi-VN') : 'N/A';

        modalBody.innerHTML = `
            <div class="file-detail">
                <div class="file-detail-icon">
                    <div class="file-icon ${file.file_type} large">
                        <i class="${this.getFileIcon(file.file_type)}"></i>
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
                        <span class="detail-value">${this.capitalizeFirst(file.file_type)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Kích thước:</span>
                        <span class="detail-value">${file.size_formatted}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ngày upload:</span>
                        <span class="detail-value">${uploadDate}</span>
                    </div>
                    ${file.mime_type ? `
                        <div class="detail-row">
                            <span class="detail-label">MIME type:</span>
                            <span class="detail-value">${file.mime_type}</span>
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
                        <span class="detail-value">${file.message_id}</span>
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeleDriveApp();
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
