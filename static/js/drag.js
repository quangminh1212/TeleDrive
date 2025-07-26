/**
 * TeleDrive - Drag and Drop Module
 * 
 * Cung cấp tính năng kéo thả cho file và thư mục:
 * - Kéo thả để di chuyển
 * - Kéo thả để tải file lên
 * - Kéo giữa các thư mục
 */

class DragDropManager {
    constructor(options = {}) {
        // Các options mặc định
        this.options = {
            fileSelector: '.gdrive-file-card',         // CSS selector cho các file items
            folderSelector: '.gdrive-file-card[data-is-directory="true"]', // CSS selector cho folder
            dropZoneSelector: '.gdrive-files-display',  // CSS selector cho drop zone
            uploadZoneSelector: '.gdrive-upload-zone',  // CSS selector cho upload zone
            dragActiveClass: 'drag-active',             // CSS class khi kéo
            dragOverClass: 'drag-over',                 // CSS class khi kéo qua item
            ...options
        };

        // Giữ các tham chiếu DOM
        this.elements = {
            fileItems: [],
            folderItems: [],
            dropZone: null,
            uploadZone: null
        };

        // Trạng thái kéo thả
        this.state = {
            isDragging: false,
            draggedItem: null,
            draggedFiles: [],
            targetFolder: null,
            currentPath: ''
        };

        // Bind các methods để duy trì context
        this._handleDragStart = this._handleDragStart.bind(this);
        this._handleDragOver = this._handleDragOver.bind(this);
        this._handleDragEnter = this._handleDragEnter.bind(this);
        this._handleDragLeave = this._handleDragLeave.bind(this);
        this._handleDrop = this._handleDrop.bind(this);
        this._handleDragEnd = this._handleDragEnd.bind(this);
        this._handleFileUploadDrop = this._handleFileUploadDrop.bind(this);

        // Khởi tạo
        this.init();
    }

    /**
     * Khởi tạo drag-drop manager
     */
    init() {
        // Tìm các elements trên DOM
        this._findElements();

        // Thiết lập event listeners cho các file items
        this._setupFileItemListeners();

        // Thiết lập event listeners cho drop zone
        this._setupDropZoneListeners();

        // Thiết lập event listeners cho upload zone
        this._setupUploadZoneListeners();
    }

    /**
     * Tìm tất cả các elements cần thiết trên DOM
     */
    _findElements() {
        this.elements.fileItems = document.querySelectorAll(this.options.fileSelector);
        this.elements.folderItems = document.querySelectorAll(this.options.folderSelector);
        this.elements.dropZone = document.querySelector(this.options.dropZoneSelector);
        this.elements.uploadZone = document.querySelector(this.options.uploadZoneSelector);
    }

    /**
     * Tải lại các elements khi DOM thay đổi
     */
    refresh() {
        this._removeAllListeners();
        this._findElements();
        this._setupFileItemListeners();
        this._setupDropZoneListeners();
        this._setupUploadZoneListeners();
    }

    /**
     * Xóa tất cả event listeners
     */
    _removeAllListeners() {
        // Xóa file item listeners
        if (this.elements.fileItems.length) {
            this.elements.fileItems.forEach(item => {
                item.removeEventListener('dragstart', this._handleDragStart);
                item.removeEventListener('dragend', this._handleDragEnd);
            });
        }

        // Xóa folder item listeners
        if (this.elements.folderItems.length) {
            this.elements.folderItems.forEach(folder => {
                folder.removeEventListener('dragover', this._handleDragOver);
                folder.removeEventListener('dragenter', this._handleDragEnter);
                folder.removeEventListener('dragleave', this._handleDragLeave);
                folder.removeEventListener('drop', this._handleDrop);
            });
        }

        // Xóa drop zone listeners
        if (this.elements.dropZone) {
            this.elements.dropZone.removeEventListener('dragover', this._handleDragOver);
            this.elements.dropZone.removeEventListener('drop', this._handleDrop);
        }

        // Xóa upload zone listeners
        if (this.elements.uploadZone) {
            this.elements.uploadZone.removeEventListener('dragover', this._handleDragOver);
            this.elements.uploadZone.removeEventListener('dragenter', this._handleDragEnter);
            this.elements.uploadZone.removeEventListener('dragleave', this._handleDragLeave);
            this.elements.uploadZone.removeEventListener('drop', this._handleFileUploadDrop);
        }
    }

    /**
     * Thiết lập event listeners cho các file items
     */
    _setupFileItemListeners() {
        if (!this.elements.fileItems.length) return;

        this.elements.fileItems.forEach(item => {
            // Thiết lập thuộc tính draggable
            item.setAttribute('draggable', 'true');
            
            // Thêm event listeners
            item.addEventListener('dragstart', this._handleDragStart);
            item.addEventListener('dragend', this._handleDragEnd);
        });
    }

    /**
     * Thiết lập event listeners cho drop zone
     */
    _setupDropZoneListeners() {
        if (!this.elements.dropZone) return;

        this.elements.dropZone.addEventListener('dragover', this._handleDragOver);
        this.elements.dropZone.addEventListener('drop', this._handleDrop);

        // Thiết lập folder items như drop targets
        if (this.elements.folderItems.length) {
            this.elements.folderItems.forEach(folder => {
                folder.addEventListener('dragover', this._handleDragOver);
                folder.addEventListener('dragenter', this._handleDragEnter);
                folder.addEventListener('dragleave', this._handleDragLeave);
                folder.addEventListener('drop', this._handleDrop);
            });
        }
    }

    /**
     * Thiết lập event listeners cho upload zone
     */
    _setupUploadZoneListeners() {
        if (!this.elements.uploadZone) return;

        this.elements.uploadZone.addEventListener('dragover', this._handleDragOver);
        this.elements.uploadZone.addEventListener('dragenter', this._handleDragEnter);
        this.elements.uploadZone.addEventListener('dragleave', this._handleDragLeave);
        this.elements.uploadZone.addEventListener('drop', this._handleFileUploadDrop);
    }

    /**
     * Xử lý sự kiện drag start
     * @param {DragEvent} event - Sự kiện drag start
     */
    _handleDragStart(event) {
        this.state.isDragging = true;
        this.state.draggedItem = event.currentTarget;
        
        // Set data cho drag operation
        const itemId = event.currentTarget.getAttribute('data-id');
        const itemPath = event.currentTarget.getAttribute('data-path');
        const itemName = event.currentTarget.getAttribute('data-name');
        const isDirectory = event.currentTarget.getAttribute('data-is-directory') === 'true';
        
        // Set data transfer
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', itemPath);
        event.dataTransfer.setData('application/teledrive-item', JSON.stringify({
            id: itemId,
            path: itemPath,
            name: itemName,
            isDirectory: isDirectory
        }));

        // Thêm class để style item
        event.currentTarget.classList.add(this.options.dragActiveClass);
        
        // Tạo drag image tùy chỉnh
        this._createDragImage(event);
    }

    /**
     * Xử lý sự kiện drag over
     * @param {DragEvent} event - Sự kiện drag over
     */
    _handleDragOver(event) {
        // Prevent default để cho phép drop
        event.preventDefault();
        event.stopPropagation();
        
        // Set drop effect
        event.dataTransfer.dropEffect = 'move';
        
        // Nếu đang kéo qua một thư mục
        if (event.currentTarget.getAttribute('data-is-directory') === 'true') {
            this.state.targetFolder = event.currentTarget;
        }
    }

    /**
     * Xử lý sự kiện drag enter
     * @param {DragEvent} event - Sự kiện drag enter
     */
    _handleDragEnter(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Nếu element là thư mục, thêm class hiển thị vùng có thể drop
        if (event.currentTarget.getAttribute('data-is-directory') === 'true') {
            event.currentTarget.classList.add(this.options.dragOverClass);
        } else if (event.currentTarget === this.elements.uploadZone) {
            event.currentTarget.classList.add(this.options.dragOverClass);
        }
    }

    /**
     * Xử lý sự kiện drag leave
     * @param {DragEvent} event - Sự kiện drag leave
     */
    _handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Xóa class hiển thị vùng drop
        event.currentTarget.classList.remove(this.options.dragOverClass);
        
        // Nếu rời khỏi thư mục, xóa target folder
        if (event.currentTarget.getAttribute('data-is-directory') === 'true') {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                this.state.targetFolder = null;
            }
        }
    }

    /**
     * Xử lý sự kiện drop
     * @param {DragEvent} event - Sự kiện drop
     */
    _handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Xóa class hiển thị vùng drop
        if (event.currentTarget.classList.contains(this.options.dragOverClass)) {
            event.currentTarget.classList.remove(this.options.dragOverClass);
        }
        
        // Nếu không có item đang kéo, thoát
        if (!this.state.isDragging || !this.state.draggedItem) {
            return;
        }
        
        try {
            // Lấy dữ liệu từ dataTransfer
            const itemData = JSON.parse(event.dataTransfer.getData('application/teledrive-item'));
            
            // Lấy đường dẫn đích
            let targetPath = this.state.currentPath;
            
            // Nếu drop vào thư mục cụ thể
            if (event.currentTarget.getAttribute('data-is-directory') === 'true') {
                targetPath = event.currentTarget.getAttribute('data-path');
            }
            
            // Nếu không phải cùng một thư mục, thực hiện di chuyển
            if (itemData.path !== targetPath) {
                this._moveItem(itemData, targetPath);
            }
        } catch (error) {
            console.error('Error processing drop:', error);
        }
    }

    /**
     * Xử lý sự kiện kéo file từ bên ngoài và thả vào để upload
     * @param {DragEvent} event - Sự kiện drop
     */
    _handleFileUploadDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Xóa class hiển thị vùng drop
        event.currentTarget.classList.remove(this.options.dragOverClass);
        
        // Kiểm tra xem có files được thả không
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            // Lưu danh sách file cần upload
            this.state.draggedFiles = Array.from(event.dataTransfer.files);
            
            // Lấy thư mục đích
            let targetPath = this.state.currentPath;
            
            // Nếu drop vào thư mục cụ thể
            if (event.currentTarget.getAttribute('data-is-directory') === 'true') {
                targetPath = event.currentTarget.getAttribute('data-path');
            }
            
            // Upload files
            this._uploadFiles(this.state.draggedFiles, targetPath);
        }
    }

    /**
     * Xử lý sự kiện drag end
     * @param {DragEvent} event - Sự kiện drag end
     */
    _handleDragEnd(event) {
        // Xóa trạng thái kéo
        this.state.isDragging = false;
        
        // Xóa class styling
        if (this.state.draggedItem) {
            this.state.draggedItem.classList.remove(this.options.dragActiveClass);
        }
        
        // Xóa trạng thái
        this.state.draggedItem = null;
        this.state.targetFolder = null;
    }

    /**
     * Tạo hình ảnh kéo tùy chỉnh
     * @param {DragEvent} event - Sự kiện drag start
     */
    _createDragImage(event) {
        // Tạo phần tử tùy chỉnh cho drag image
        const dragImage = document.createElement('div');
        dragImage.className = 'gdrive-drag-image';
        
        // Lấy thông tin file
        const fileName = event.currentTarget.querySelector('.gdrive-file-name').textContent;
        const isDirectory = event.currentTarget.getAttribute('data-is-directory') === 'true';
        
        // Tạo icon phù hợp
        const icon = document.createElement('i');
        icon.className = isDirectory ? 'fas fa-folder' : 'fas fa-file';
        
        // Tạo label
        const label = document.createElement('span');
        label.textContent = fileName;
        
        // Thêm vào drag image
        dragImage.appendChild(icon);
        dragImage.appendChild(label);
        
        // Thêm style
        Object.assign(dragImage.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            padding: '8px 12px',
            background: 'rgba(66, 133, 244, 0.9)',
            color: 'white',
            borderRadius: '4px',
            pointerEvents: 'none',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            zIndex: '9999'
        });
        
        Object.assign(icon.style, {
            marginRight: '8px'
        });
        
        // Thêm vào body
        document.body.appendChild(dragImage);
        
        // Set drag image
        const rect = event.currentTarget.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        
        event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
        
        // Xóa sau khi drag kết thúc
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    }

    /**
     * Di chuyển file hoặc thư mục
     * @param {Object} itemData - Dữ liệu của item cần di chuyển
     * @param {string} targetPath - Đường dẫn đích
     */
    async _moveItem(itemData, targetPath) {
        try {
            // Hiển thị thông báo đang xử lý
            this._showNotification('Đang di chuyển...', 'info');
            
            // Gọi API di chuyển file
            if (window.fileOperations) {
                const result = await window.fileOperations.moveItem(
                    itemData.path,
                    targetPath
                );
                
                // Nếu thành công, làm mới giao diện
                if (result && result.success) {
                    this._showNotification('Di chuyển thành công!', 'success');
                    
                    // Sự kiện để thông báo UI cần làm mới
                    window.dispatchEvent(new CustomEvent('teledrive:filesMoved', {
                        detail: { item: itemData, targetPath }
                    }));
                } else {
                    throw new Error(result.error || 'Di chuyển thất bại');
                }
            } else {
                throw new Error('Module fileOperations không khả dụng');
            }
        } catch (error) {
            this._showNotification(`Lỗi: ${error.message}`, 'error');
            console.error('Move error:', error);
        }
    }

    /**
     * Upload files
     * @param {File[]} files - Danh sách files cần upload
     * @param {string} targetPath - Đường dẫn thư mục đích
     */
    async _uploadFiles(files, targetPath) {
        if (!files.length) return;
        
        try {
            // Hiển thị thông báo
            this._showNotification(`Đang tải lên ${files.length} file...`, 'info');
            
            // Tạo progress bar
            const progressContainer = this._createProgressBar();
            
            // Upload từng file
            const uploadPromises = files.map((file, index) => {
                return this._uploadSingleFile(file, targetPath, (progress) => {
                    // Cập nhật progress bar
                    this._updateProgressBar(progressContainer, index, files.length, progress);
                });
            });
            
            // Chờ tất cả uploads hoàn thành
            await Promise.all(uploadPromises);
            
            // Xóa progress bar
            this._removeProgressBar(progressContainer);
            
            // Hiển thị thông báo thành công
            this._showNotification('Tải lên hoàn tất!', 'success');
            
            // Kích hoạt sự kiện để làm mới UI
            window.dispatchEvent(new CustomEvent('teledrive:filesUploaded', {
                detail: { files, targetPath }
            }));
        } catch (error) {
            this._showNotification(`Lỗi tải lên: ${error.message}`, 'error');
            console.error('Upload error:', error);
        }
    }

    /**
     * Upload một file đơn lẻ
     * @param {File} file - File cần upload
     * @param {string} targetPath - Đường dẫn thư mục đích
     * @param {Function} progressCallback - Callback để cập nhật tiến trình
     * @returns {Promise} - Promise kết quả upload
     */
    async _uploadSingleFile(file, targetPath, progressCallback) {
        if (window.fileOperations) {
            return window.fileOperations.uploadFile(
                targetPath, 
                file,
                progressCallback
            );
        } else {
            throw new Error('Module fileOperations không khả dụng');
        }
    }

    /**
     * Thiết lập đường dẫn hiện tại
     * @param {string} path - Đường dẫn hiện tại
     */
    setCurrentPath(path) {
        this.state.currentPath = path;
    }

    /**
     * Hiển thị thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo: success, error, info
     */
    _showNotification(message, type = 'info') {
        // Kiểm tra xem có notification container chưa
        let container = document.querySelector('.gdrive-notifications');
        if (!container) {
            container = document.createElement('div');
            container.className = 'gdrive-notifications';
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: '9999'
            });
            document.body.appendChild(container);
        }
        
        // Tạo notification
        const notification = document.createElement('div');
        notification.className = `gdrive-notification notification-${type}`;
        
        // Thêm styles
        Object.assign(notification.style, {
            padding: '12px 20px',
            margin: '8px 0',
            backgroundColor: type === 'success' ? '#4caf50' : 
                            type === 'error' ? '#f44336' : '#2196f3',
            color: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
            width: '300px',
            animation: 'fadeInRight 0.3s ease-out forwards'
        });
        
        // Thêm nội dung
        notification.textContent = message;
        
        // Thêm vào container
        container.appendChild(notification);
        
        // Tự động xóa sau 5 giây
        setTimeout(() => {
            notification.style.animation = 'fadeOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    /**
     * Tạo thanh tiến trình upload
     * @returns {HTMLElement} - Element thanh tiến trình
     */
    _createProgressBar() {
        // Tạo container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'gdrive-upload-progress';
        
        // Style container
        Object.assign(progressContainer.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: '9999',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            padding: '16px',
            width: '300px'
        });
        
        // Tạo header
        const header = document.createElement('div');
        header.className = 'progress-header';
        header.textContent = 'Đang tải lên...';
        
        // Style header
        Object.assign(header.style, {
            fontWeight: 'bold',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between'
        });
        
        // Tạo nút đóng
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.title = 'Đóng';
        
        // Style nút đóng
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0',
            color: '#666'
        });
        
        // Thêm event listener cho nút đóng
        closeBtn.addEventListener('click', () => {
            progressContainer.remove();
        });
        
        // Thêm nút đóng vào header
        header.appendChild(closeBtn);
        
        // Tạo thanh tiến trình
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        // Style thanh tiến trình
        Object.assign(progressBar.style, {
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            overflow: 'hidden'
        });
        
        // Tạo phần tiến trình hoàn thành
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        
        // Style phần tiến trình
        Object.assign(progressFill.style, {
            height: '100%',
            width: '0%',
            backgroundColor: '#4285f4',
            transition: 'width 0.3s ease'
        });
        
        // Tạo text hiển thị tiến trình
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressText.textContent = '0%';
        
        // Style text tiến trình
        Object.assign(progressText.style, {
            marginTop: '8px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'right'
        });
        
        // Thêm vào DOM
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(header);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        document.body.appendChild(progressContainer);
        
        return progressContainer;
    }

    /**
     * Cập nhật thanh tiến trình
     * @param {HTMLElement} container - Container thanh tiến trình
     * @param {number} fileIndex - Index của file hiện tại
     * @param {number} totalFiles - Tổng số files
     * @param {number} progress - % tiến trình (0-100)
     */
    _updateProgressBar(container, fileIndex, totalFiles, progress) {
        const progressFill = container.querySelector('.progress-fill');
        const progressText = container.querySelector('.progress-text');
        
        // Tính toán tiến trình tổng thể
        const overallProgress = ((fileIndex + (progress / 100)) / totalFiles) * 100;
        
        // Cập nhật UI
        if (progressFill) {
            progressFill.style.width = `${overallProgress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(overallProgress)}% (${fileIndex + 1}/${totalFiles})`;
        }
    }

    /**
     * Xóa thanh tiến trình
     * @param {HTMLElement} container - Container thanh tiến trình
     */
    _removeProgressBar(container) {
        if (container && container.parentNode) {
            // Thêm animation trước khi xóa
            container.style.animation = 'fadeOut 0.5s ease forwards';
            
            setTimeout(() => {
                container.remove();
            }, 500);
        }
    }
}

// Tạo styles cho animations
(function createStyles() {
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
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .gdrive-file-card.drag-active {
            opacity: 0.5;
        }
        
        .gdrive-file-card.drag-over,
        .gdrive-upload-zone.drag-over {
            box-shadow: 0 0 0 2px #4285f4 !important;
            position: relative;
            z-index: 10;
        }
        
        .gdrive-file-card.drag-over::after,
        .gdrive-upload-zone.drag-over::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(66, 133, 244, 0.1);
            border-radius: inherit;
            z-index: -1;
        }
    `;
    document.head.appendChild(style);
})();

// Xuất module
window.DragDropManager = DragDropManager; 