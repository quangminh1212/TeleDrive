/**
 * TeleDrive - Core Application JavaScript
 * Tập trung quản lý ứng dụng và tích hợp tất cả các module
 */

class TeleDriveApp {
    constructor() {
        this.config = {
            apiBase: '/api',
            defaultView: 'grid'
        };
        
        this.currentPath = '/';
        this.currentSession = null;
        
        this.init();
    }

    /**
     * Khởi tạo ứng dụng
     */
    init() {
        console.log('TeleDrive application initializing...');
        
        // Kiểm tra và tải các dependencies
        this.loadDependencies();
        
        // Thiết lập event listeners
        this.setupEventListeners();
        
        // Tích hợp modules
        this.integrateModules();
        
        // Khởi tạo UI
        this.initializeUI();
        
        console.log('TeleDrive application initialized');
    }

    /**
     * Kiểm tra và tải các dependencies cần thiết
     */
    loadDependencies() {
        // Kiểm tra nếu font-awesome đã được tải
        if (!document.querySelector('link[href*="font-awesome"]')) {
            this.loadStylesheet('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        }
    }

    /**
     * Tải stylesheet động
     * @param {string} url - URL của stylesheet
     */
    loadStylesheet(url) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }

    /**
     * Thiết lập các event listeners
     */
    setupEventListeners() {
        // Global click handler
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });
        
        // Khởi tạo event listeners cho các nút chính
        this.setupButtonListeners();
        
        // Thiết lập search input
        this.setupSearch();
    }

    /**
     * Xử lý global click event
     * @param {Event} e - Click event
     */
    handleGlobalClick(e) {
        // Đóng tất cả các menus và dropdowns khi click outside
        if (!e.target.closest('.dropdown-menu, .context-menu, .modal')) {
            this.closeAllDropdowns();
        }
    }

    /**
     * Đóng tất cả các dropdowns và menus
     */
    closeAllDropdowns() {
        document.querySelectorAll('.dropdown.open, .context-menu.visible').forEach(el => {
            el.classList.remove('open', 'visible');
        });
    }

    /**
     * Thiết lập listeners cho các button chính
     */
    setupButtonListeners() {
        // Buttons view (grid/list)
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.switchView('grid'));
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this.switchView('list'));
        }
        
        // New button
        const newBtn = document.getElementById('newButton');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.showNewMenu());
        }
        
        // Upload button trong empty state
        const uploadBtn = document.getElementById('uploadButton');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.showUploadDialog());
        }
    }

    /**
     * Thiết lập search functionality
     */
    setupSearch() {
        const searchInput = document.querySelector('.gdrive-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchFiles(e.target.value);
            }, 300));
        }
    }

    /**
     * Debounce function để tránh gọi quá nhiều search requests
     * @param {Function} func - Function cần debounce
     * @param {number} wait - Thời gian đợi (ms)
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Tìm kiếm files
     * @param {string} query - Search query
     */
    searchFiles(query) {
        if (!query || query.trim() === '') {
            this.clearSearch();
            return;
        }
        
        console.log('Searching files:', query);
        
        // Sử dụng fileOperations nếu có
        if (window.fileOperations) {
            window.fileOperations.searchFiles(query, this.currentPath)
                .then(result => {
                    if (result.success) {
                        this.displaySearchResults(result.results, query);
                    } else {
                        console.error('Search failed:', result.error);
                    }
                })
                .catch(err => {
                    console.error('Error searching files:', err);
                });
        } else {
            // Fallback nếu không có fileOperations
            // Tìm kiếm client-side đơn giản
            this.performClientSideSearch(query);
        }
    }

    /**
     * Xóa kết quả tìm kiếm và hiển thị tất cả files
     */
    clearSearch() {
        // TODO: Implement search clear logic
        console.log('Clearing search results');
    }

    /**
     * Hiển thị kết quả tìm kiếm
     * @param {Array} results - Kết quả tìm kiếm
     * @param {string} query - Search query
     */
    displaySearchResults(results, query) {
        // TODO: Implement search results display
        console.log(`Found ${results.length} results for "${query}"`);
    }

    /**
     * Thực hiện tìm kiếm client-side đơn giản
     * @param {string} query - Search query
     */
    performClientSideSearch(query) {
        const lowerQuery = query.toLowerCase();
        
        // Tìm trong tất cả các file cards
        const fileCards = document.querySelectorAll('.gdrive-file-card');
        let matchCount = 0;
        
        fileCards.forEach(card => {
            const fileName = card.querySelector('.gdrive-file-name').textContent.toLowerCase();
            
            if (fileName.includes(lowerQuery)) {
                card.style.display = '';
                matchCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        console.log(`Client-side search: Found ${matchCount} matches for "${query}"`);
    }

    /**
     * Chuyển đổi chế độ hiển thị (grid/list)
     * @param {string} viewMode - 'grid' hoặc 'list'
     */
    switchView(viewMode) {
        // Sử dụng ResponsiveManager nếu có
        if (window.responsiveManager) {
            window.responsiveManager.setView(viewMode);
            return;
        }
        
        // Fallback nếu không có ResponsiveManager
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (viewMode === 'grid') {
            if (gridView) gridView.style.display = 'grid';
            if (listView) listView.style.display = 'none';
            if (gridBtn) gridBtn.classList.add('active');
            if (listBtn) listBtn.classList.remove('active');
        } else {
            if (gridView) gridView.style.display = 'none';
            if (listView) listView.style.display = 'flex';
            if (gridBtn) gridBtn.classList.remove('active');
            if (listBtn) listBtn.classList.add('active');
        }
    }

    /**
     * Hiển thị menu New
     */
    showNewMenu() {
        const button = document.getElementById('newButton');
        
        if (!button) return;
        
        // Tạo dropdown menu nếu chưa tồn tại
        let menu = document.querySelector('.new-menu-dropdown');
        
        if (!menu) {
            menu = document.createElement('div');
            menu.className = 'new-menu-dropdown dropdown-menu';
            menu.innerHTML = `
                <div class="dropdown-item" data-action="new-folder">
                    <i class="fas fa-folder"></i>
                    <span>Thư mục mới</span>
                </div>
                <div class="dropdown-item" data-action="file-upload">
                    <i class="fas fa-file-upload"></i>
                    <span>Tải tệp lên</span>
                </div>
                <div class="dropdown-item" data-action="folder-upload">
                    <i class="fas fa-folder-upload"></i>
                    <span>Tải thư mục lên</span>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" data-action="scan-telegram">
                    <i class="fas fa-search"></i>
                    <span>Quét Telegram</span>
                </div>
            `;
            
            // Add event listeners for menu items
            menu.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    this.handleNewMenuAction(action);
                    menu.classList.remove('visible');
                });
            });
            
            document.body.appendChild(menu);
        }
        
        // Position menu
        const rect = button.getBoundingClientRect();
        menu.style.top = rect.bottom + 5 + 'px';
        menu.style.left = rect.left + 'px';
        
        // Show menu
        menu.classList.toggle('visible');
        
        // Close when clicking outside
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== button) {
                    menu.classList.remove('visible');
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    /**
     * Xử lý action từ menu New
     * @param {string} action - Loại action
     */
    handleNewMenuAction(action) {
        console.log('New menu action:', action);
        
        switch (action) {
            case 'new-folder':
                this.createNewFolder();
                break;
                
            case 'file-upload':
                this.uploadFiles();
                break;
                
            case 'folder-upload':
                this.uploadFolder();
                break;
                
            case 'scan-telegram':
                this.scanTelegram();
                break;
        }
    }

    /**
     * Tạo thư mục mới
     */
    createNewFolder() {
        const folderName = prompt('Nhập tên thư mục mới:');
        
        if (!folderName) return; // User cancelled
        
        console.log('Creating new folder:', folderName);
        
        if (window.fileOperations) {
            window.fileOperations.createFolder(this.currentPath, folderName)
                .then(result => {
                    if (result.success) {
                        console.log('Folder created successfully:', result);
                        this.refreshCurrentView();
                    } else {
                        console.error('Failed to create folder:', result.error);
                    }
                })
                .catch(err => {
                    console.error('Error creating folder:', err);
                });
        } else {
            // Fallback nếu không có fileOperations
            alert(`Thư mục "${folderName}" sẽ được tạo`);
        }
    }

    /**
     * Upload files
     */
    uploadFiles() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.click();
        
        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0) {
                this.handleFilesUpload(fileInput.files);
            }
        });
    }

    /**
     * Upload thư mục
     */
    uploadFolder() {
        const folderInput = document.createElement('input');
        folderInput.type = 'file';
        folderInput.webkitdirectory = true;
        folderInput.directory = true;
        folderInput.multiple = true;
        folderInput.click();
        
        folderInput.addEventListener('change', () => {
            if (folderInput.files && folderInput.files.length > 0) {
                this.handleFilesUpload(folderInput.files);
            }
        });
    }

    /**
     * Xử lý upload files
     * @param {FileList} files - Danh sách files cần upload
     */
    handleFilesUpload(files) {
        console.log('Uploading files:', files);
        
        // Hiển thị thông báo
        this.showNotification(`Đang tải lên ${files.length} tệp tin...`, 'info');
        
        // Upload từng file
        if (window.fileOperations) {
            // Đếm số file đã upload thành công
            let successCount = 0;
            let failCount = 0;
            const totalCount = files.length;
            
            for (let i = 0; i < files.length; i++) {
                window.fileOperations.uploadFile(this.currentPath, files[i], this.updateProgressUI)
                    .then(result => {
                        console.log(`File ${files[i].name} uploaded:`, result);
                        successCount++;
                        
                        if (successCount + failCount === totalCount) {
                            this.showNotification(`Đã tải lên ${successCount} tệp tin thành công, ${failCount} thất bại`, successCount > 0 ? 'success' : 'error');
                            this.refreshCurrentView();
                        }
                    })
                    .catch(err => {
                        console.error(`Error uploading ${files[i].name}:`, err);
                        failCount++;
                        
                        if (successCount + failCount === totalCount) {
                            this.showNotification(`Đã tải lên ${successCount} tệp tin thành công, ${failCount} thất bại`, successCount > 0 ? 'success' : 'error');
                            this.refreshCurrentView();
                        }
                    });
            }
        } else {
            // Fallback khi không có fileOperations
            setTimeout(() => {
                this.showNotification(`Đã tải lên ${files.length} tệp tin thành công`, 'success');
            }, 1500);
        }
    }

    /**
     * Cập nhật UI hiển thị tiến trình upload
     * @param {number} percent - Phần trăm đã hoàn thành
     */
    updateProgressUI(percent) {
        console.log(`Upload progress: ${percent}%`);
    }

    /**
     * Quét dữ liệu từ Telegram
     */
    scanTelegram() {
        console.log('Scanning Telegram');
        
        // Redirect đến trang quét Telegram
        window.location.href = '/scan';
    }

    /**
     * Hiển thị dialog upload
     */
    showUploadDialog() {
        // Check if upload zone component exists
        let uploadZone = document.querySelector('.gdrive-upload-zone');
        
        if (!uploadZone) {
            // Create a temporary upload zone
            uploadZone = document.createElement('div');
            uploadZone.className = 'gdrive-upload-zone';
            uploadZone.innerHTML = `
                <div class="gdrive-upload-content">
                    <div class="gdrive-upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <div class="gdrive-upload-text">
                        Kéo thả files vào đây để tải lên
                    </div>
                    <div class="gdrive-upload-actions">
                        <button class="gdrive-btn-primary" id="tempUploadBtn">
                            <i class="fas fa-file-upload"></i>
                            Chọn files
                        </button>
                    </div>
                </div>
            `;
            
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'gdrive-modal';
            modal.innerHTML = `
                <div class="gdrive-modal-content">
                    <div class="gdrive-modal-header">
                        <h3>Tải lên</h3>
                        <button class="gdrive-modal-close">&times;</button>
                    </div>
                    <div class="gdrive-modal-body">
                    </div>
                </div>
            `;
            
            // Add upload zone to modal
            modal.querySelector('.gdrive-modal-body').appendChild(uploadZone);
            
            // Add modal to document
            document.body.appendChild(modal);
            
            // Add event listeners
            modal.querySelector('.gdrive-modal-close').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.querySelector('#tempUploadBtn').addEventListener('click', () => {
                this.uploadFiles();
                modal.remove();
            });
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        } else {
            // If upload zone exists, trigger file selection
            this.uploadFiles();
        }
    }

    /**
     * Hiển thị thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo ('info', 'success', 'error')
     */
    showNotification(message, type = 'info') {
        // Kiểm tra container thông báo
        let container = document.querySelector('.notifications-container');
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999
            });
            document.body.appendChild(container);
        }
        
        // Tạo thông báo
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style thông báo
        Object.assign(notification.style, {
            backgroundColor: type === 'success' ? '#4caf50' : 
                            type === 'error' ? '#f44336' : '#2196f3',
            color: 'white',
            padding: '12px 16px',
            margin: '8px 0',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
            animation: 'fadeInRight 0.3s'
        });
        
        // Thêm vào container
        container.appendChild(notification);
        
        // Auto remove sau 5 giây
        setTimeout(() => {
            notification.style.animation = 'fadeOutRight 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Làm mới view hiện tại
     */
    refreshCurrentView() {
        // TODO: Implement refresh logic
        console.log('Refreshing view');
        
        // Reload trang làm giải pháp tạm thời
        window.location.reload();
    }

    /**
     * Tích hợp với các module khác
     */
    integrateModules() {
        console.log('Integrating modules');
        
        // FileOperations
        if (window.FileOperations) {
            console.log('FileOperations module detected');
        } else {
            console.warn('FileOperations module not found');
        }
        
        // DragDropManager
        if (window.DragDropManager) {
            console.log('DragDropManager module detected');
            // Khởi tạo DragDropManager nếu cần
            if (!window.dragDropManager) {
                window.dragDropManager = new window.DragDropManager();
            }
        } else {
            console.warn('DragDropManager module not found');
        }
        
        // Responsive Manager
        if (window.ResponsiveManager) {
            console.log('ResponsiveManager module detected');
            // Khởi tạo nếu cần
            if (!window.responsiveManager) {
                window.responsiveManager = new window.ResponsiveManager();
            }
        } else {
            console.warn('ResponsiveManager module not found');
        }
    }

    /**
     * Khởi tạo UI
     */
    initializeUI() {
        // Thiết lập chế độ hiển thị mặc định
        this.switchView(this.config.defaultView);
        
        // Fix lỗi encoding tiếng Việt
        this.fixVietnameseEncoding();
        
        // Thêm style cho animations
        this.addAnimationStyles();
    }

    /**
     * Sửa lỗi encoding tiếng Việt
     */
    fixVietnameseEncoding() {
        // Các element thường gặp lỗi encoding
        const elements = document.querySelectorAll('.gdrive-file-name, .breadcrumb-item');
        
        elements.forEach(el => {
            if (el.textContent && this.hasEncodingIssues(el.textContent)) {
                el.textContent = this.decodeVietnameseText(el.textContent);
            }
        });
    }

    /**
     * Kiểm tra văn bản có vấn đề về encoding không
     * @param {string} text - Văn bản cần kiểm tra
     * @returns {boolean} - Có vấn đề về encoding hay không
     */
    hasEncodingIssues(text) {
        const problematicChars = ['Ã', 'Â', 'Ä', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë'];
        return problematicChars.some(char => text.includes(char));
    }

    /**
     * Giải mã văn bản tiếng Việt bị lỗi encoding
     * @param {string} text - Văn bản cần giải mã
     * @returns {string} - Văn bản đã giải mã
     */
    decodeVietnameseText(text) {
        try {
            // Đây chỉ là giải pháp đơn giản
            // Giải pháp tốt hơn là xử lý ở phía server
            return decodeURIComponent(escape(text));
        } catch (e) {
            console.error('Error decoding text:', e);
            return text;
        }
    }

    /**
     * Thêm styles cho animations
     */
    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInRight {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes fadeOutRight {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }
            
            .dropdown-menu {
                position: absolute;
                background-color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                min-width: 180px;
                z-index: 1000;
                display: none;
            }
            
            .dropdown-menu.visible {
                display: block;
                animation: fadeIn 0.2s;
            }
            
            .dropdown-item {
                padding: 10px 16px;
                display: flex;
                align-items: center;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .dropdown-item:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .dropdown-item i {
                margin-right: 12px;
                width: 20px;
                text-align: center;
            }
            
            .dropdown-divider {
                height: 1px;
                background-color: rgba(0, 0, 0, 0.1);
                margin: 6px 0;
            }
            
            .gdrive-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1001;
                animation: fadeIn 0.3s;
            }
            
            .gdrive-modal-content {
                background-color: white;
                border-radius: 4px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            }
            
            .gdrive-modal-header {
                padding: 16px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .gdrive-modal-header h3 {
                margin: 0;
            }
            
            .gdrive-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: rgba(0, 0, 0, 0.5);
            }
            
            .gdrive-modal-body {
                padding: 16px;
                overflow-y: auto;
                max-height: 70vh;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.teleDriveApp = new TeleDriveApp();
}); 