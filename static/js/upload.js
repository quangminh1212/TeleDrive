/**
 * TeleDrive Upload Manager
 * Advanced file upload with drag-drop, progress tracking, and Google Drive-like features
 */

class TeleDriveUploadManager {
    constructor() {
        this.uploadQueue = [];
        this.activeUploads = new Map();
        this.maxConcurrentUploads = 3;
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedTypes = [
            'image/*', 'video/*', 'audio/*', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/*', 'application/zip', 'application/x-rar-compressed'
        ];
        
        this.init();
    }
    
    init() {
        this.setupDragDrop();
        this.setupFileInput();
        this.setupUploadModal();
        this.bindEvents();
        
        console.log('[UploadManager] Initialized successfully');
    }
    
    setupDragDrop() {
        const dropZones = [
            document.querySelector('.gdrive-content'),
            document.querySelector('.gdrive-files-display')
        ];
        
        dropZones.forEach(zone => {
            if (!zone) return;
            
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
        });
        
        // Prevent default drag behaviors on document
        document.addEventListener('dragover', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());
    }
    
    setupFileInput() {
        // Create hidden file input
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = true;
        this.fileInput.style.display = 'none';
        this.fileInput.accept = this.allowedTypes.join(',');
        document.body.appendChild(this.fileInput);
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input
        });
    }
    
    setupUploadModal() {
        // Create upload progress modal
        this.uploadModal = document.createElement('div');
        this.uploadModal.className = 'gdrive-upload-modal';
        this.uploadModal.innerHTML = `
            <div class="gdrive-upload-content">
                <div class="gdrive-upload-header">
                    <h3><i class="fas fa-cloud-upload-alt"></i> Đang tải lên</h3>
                    <button class="gdrive-upload-close" onclick="uploadManager.hideUploadModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="gdrive-upload-list" id="uploadList"></div>
                <div class="gdrive-upload-footer">
                    <button class="gdrive-btn-secondary" onclick="uploadManager.cancelAllUploads()">
                        Hủy tất cả
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.uploadModal);
    }
    
    bindEvents() {
        // Bind upload button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.gdrive-btn-primary, .gdrive-upload-btn, [data-action="upload"]')) {
                this.openFileDialog();
            }
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const target = e.currentTarget;
        target.classList.add('gdrive-drag-over');
        
        // Show drop indicator
        this.showDropIndicator(target);
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const target = e.currentTarget;
        target.classList.remove('gdrive-drag-over');
        
        // Hide drop indicator after delay to prevent flicker
        setTimeout(() => {
            if (!target.classList.contains('gdrive-drag-over')) {
                this.hideDropIndicator();
            }
        }, 100);
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const target = e.currentTarget;
        target.classList.remove('gdrive-drag-over');
        this.hideDropIndicator();
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }
    
    showDropIndicator(target) {
        let indicator = document.querySelector('.gdrive-drop-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'gdrive-drop-indicator';
            indicator.innerHTML = `
                <div class="gdrive-drop-content">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <h3>Thả file vào đây để tải lên</h3>
                    <p>Hỗ trợ nhiều file cùng lúc</p>
                </div>
            `;
            target.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }
    
    hideDropIndicator() {
        const indicator = document.querySelector('.gdrive-drop-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    openFileDialog() {
        this.fileInput.click();
    }
    
    handleFiles(files) {
        console.log(`[UploadManager] Processing ${files.length} files`);
        
        const validFiles = files.filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showNotification('Không có file hợp lệ để tải lên', 'warning');
            return;
        }
        
        // Add files to upload queue
        validFiles.forEach(file => {
            const uploadItem = {
                id: this.generateId(),
                file: file,
                progress: 0,
                status: 'pending', // pending, uploading, completed, error
                startTime: null,
                endTime: null
            };
            
            this.uploadQueue.push(uploadItem);
        });
        
        this.showUploadModal();
        this.processUploadQueue();
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showNotification(`File "${file.name}" quá lớn (tối đa ${this.formatFileSize(this.maxFileSize)})`, 'error');
            return false;
        }
        
        // Check file type
        const isValidType = this.allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
        });
        
        if (!isValidType) {
            this.showNotification(`Loại file "${file.name}" không được hỗ trợ`, 'error');
            return false;
        }
        
        return true;
    }
    
    processUploadQueue() {
        const pendingUploads = this.uploadQueue.filter(item => item.status === 'pending');
        const activeCount = this.activeUploads.size;
        
        if (activeCount >= this.maxConcurrentUploads || pendingUploads.length === 0) {
            return;
        }
        
        const toUpload = pendingUploads.slice(0, this.maxConcurrentUploads - activeCount);
        toUpload.forEach(item => this.uploadFile(item));
    }
    
    async uploadFile(uploadItem) {
        uploadItem.status = 'uploading';
        uploadItem.startTime = Date.now();
        this.activeUploads.set(uploadItem.id, uploadItem);
        
        this.updateUploadUI(uploadItem);
        
        try {
            const formData = new FormData();
            formData.append('file', uploadItem.file);
            formData.append('folder_path', '/'); // Current folder
            
            const response = await fetch('/api/file/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                uploadItem.status = 'completed';
                uploadItem.progress = 100;
                uploadItem.endTime = Date.now();
                
                const result = await response.json();
                uploadItem.result = result;
                
                this.showNotification(`Đã tải lên "${uploadItem.file.name}" thành công`, 'success');
                
                // Refresh file list
                this.refreshFileList();
            } else {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
        } catch (error) {
            uploadItem.status = 'error';
            uploadItem.error = error.message;
            
            this.showNotification(`Lỗi tải lên "${uploadItem.file.name}": ${error.message}`, 'error');
        }
        
        this.activeUploads.delete(uploadItem.id);
        this.updateUploadUI(uploadItem);
        
        // Process next in queue
        setTimeout(() => this.processUploadQueue(), 100);
    }
    
    showUploadModal() {
        this.uploadModal.style.display = 'flex';
        this.updateUploadList();
    }
    
    hideUploadModal() {
        this.uploadModal.style.display = 'none';
    }
    
    updateUploadList() {
        const uploadList = document.getElementById('uploadList');
        if (!uploadList) return;
        
        uploadList.innerHTML = this.uploadQueue.map(item => `
            <div class="gdrive-upload-item" data-id="${item.id}">
                <div class="gdrive-upload-icon">
                    <i class="${this.getFileIcon(item.file)}"></i>
                </div>
                <div class="gdrive-upload-info">
                    <div class="gdrive-upload-name">${item.file.name}</div>
                    <div class="gdrive-upload-meta">
                        ${this.formatFileSize(item.file.size)} • ${this.getStatusText(item)}
                    </div>
                    <div class="gdrive-upload-progress">
                        <div class="gdrive-progress-bar">
                            <div class="gdrive-progress-fill" style="width: ${item.progress}%"></div>
                        </div>
                        <span class="gdrive-progress-text">${item.progress}%</span>
                    </div>
                </div>
                <div class="gdrive-upload-actions">
                    ${item.status === 'uploading' ? 
                        `<button onclick="uploadManager.cancelUpload('${item.id}')" title="Hủy">
                            <i class="fas fa-times"></i>
                        </button>` : 
                        item.status === 'error' ?
                        `<button onclick="uploadManager.retryUpload('${item.id}')" title="Thử lại">
                            <i class="fas fa-redo"></i>
                        </button>` : ''
                    }
                </div>
            </div>
        `).join('');
    }
    
    updateUploadUI(uploadItem) {
        this.updateUploadList();
        
        // Update progress if modal is visible
        const uploadItemEl = document.querySelector(`[data-id="${uploadItem.id}"]`);
        if (uploadItemEl) {
            const progressFill = uploadItemEl.querySelector('.gdrive-progress-fill');
            const progressText = uploadItemEl.querySelector('.gdrive-progress-text');
            
            if (progressFill) progressFill.style.width = `${uploadItem.progress}%`;
            if (progressText) progressText.textContent = `${uploadItem.progress}%`;
        }
    }
    
    cancelUpload(uploadId) {
        const uploadItem = this.activeUploads.get(uploadId);
        if (uploadItem) {
            uploadItem.status = 'cancelled';
            this.activeUploads.delete(uploadId);
            this.updateUploadUI(uploadItem);
        }
    }
    
    cancelAllUploads() {
        this.activeUploads.forEach((item, id) => {
            this.cancelUpload(id);
        });
        
        this.uploadQueue = this.uploadQueue.filter(item => 
            item.status === 'completed' || item.status === 'error'
        );
        
        this.updateUploadList();
    }
    
    retryUpload(uploadId) {
        const uploadItem = this.uploadQueue.find(item => item.id === uploadId);
        if (uploadItem && uploadItem.status === 'error') {
            uploadItem.status = 'pending';
            uploadItem.progress = 0;
            uploadItem.error = null;
            this.processUploadQueue();
        }
    }
    
    getFileIcon(file) {
        const type = file.type.toLowerCase();
        
        if (type.startsWith('image/')) return 'fas fa-image';
        if (type.startsWith('video/')) return 'fas fa-video';
        if (type.startsWith('audio/')) return 'fas fa-music';
        if (type === 'application/pdf') return 'fas fa-file-pdf';
        if (type.includes('word')) return 'fas fa-file-word';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'fas fa-file-excel';
        if (type.includes('powerpoint') || type.includes('presentation')) return 'fas fa-file-powerpoint';
        if (type.startsWith('text/')) return 'fas fa-file-alt';
        if (type.includes('zip') || type.includes('rar')) return 'fas fa-file-archive';
        
        return 'fas fa-file';
    }
    
    getStatusText(uploadItem) {
        switch (uploadItem.status) {
            case 'pending': return 'Đang chờ...';
            case 'uploading': return 'Đang tải lên...';
            case 'completed': return 'Hoàn thành';
            case 'error': return 'Lỗi';
            case 'cancelled': return 'Đã hủy';
            default: return '';
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    generateId() {
        return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `gdrive-notification gdrive-notification-${type}`;
        notification.innerHTML = `
            <div class="gdrive-notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="gdrive-notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        let container = document.querySelector('.gdrive-notifications');
        if (!container) {
            container = document.createElement('div');
            container.className = 'gdrive-notifications';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    refreshFileList() {
        // Trigger file list refresh
        if (window.app && window.app.refreshFiles) {
            window.app.refreshFiles();
        } else {
            // Fallback: reload page
            setTimeout(() => location.reload(), 1000);
        }
    }
}

// Initialize upload manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.uploadManager = new TeleDriveUploadManager();
    console.log('[TeleDrive] Upload manager initialized');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeleDriveUploadManager;
}
