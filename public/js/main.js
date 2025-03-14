/**
 * TeleDrive Main JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const filesContainer = document.getElementById('files-container');
    const loadingContainer = document.getElementById('loading-container');
    const noFilesMessage = document.getElementById('no-files-message');
    const refreshBtn = document.getElementById('refresh-btn');
    const botStatus = document.getElementById('bot-status');
    
    // Check bot status
    checkBotStatus();
    
    // Load files when the page loads
    loadFiles();
    
    // Set up auto-refresh (every 30 seconds)
    setInterval(loadFiles, 30000);
    
    // Manual refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.disabled = true;
            if (loadingContainer) loadingContainer.classList.remove('d-none');
            if (filesContainer) filesContainer.innerHTML = '';
            
            loadFiles().finally(() => {
                this.disabled = false;
            });
        });
    }
    
    // Check bot status
    async function checkBotStatus() {
        try {
            if (!botStatus) return;
            
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.botActive) {
                botStatus.className = 'alert alert-success d-inline-block';
                botStatus.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Bot đang hoạt động';
            } else {
                botStatus.className = 'alert alert-warning d-inline-block';
                botStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> Bot không hoạt động';
            }
        } catch (error) {
            console.error('Error checking bot status:', error);
            if (botStatus) {
                botStatus.className = 'alert alert-danger d-inline-block';
                botStatus.innerHTML = '<i class="bi bi-x-circle-fill me-2"></i> Không thể kiểm tra trạng thái bot';
            }
        }
    }
    
    // Load files function
    async function loadFiles() {
        try {
            if (loadingContainer) loadingContainer.classList.remove('d-none');
            if (noFilesMessage) noFilesMessage.classList.add('d-none');
            
            // Load file data from server
            const response = await fetch('/api/files');
            const files = await response.json();
            
            // Display files
            if (filesContainer) filesContainer.innerHTML = '';
            
            if (files && files.length > 0) {
                files.forEach(file => {
                    const fileCard = createFileCard(file);
                    if (filesContainer) filesContainer.appendChild(fileCard);
                });
                
                // Activate delete buttons
                document.querySelectorAll('.delete-file').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const fileId = this.getAttribute('data-id');
                        const fileName = this.getAttribute('data-name');
                        
                        // Show confirmation modal
                        const fileNameElem = document.getElementById('fileName');
                        if (fileNameElem) fileNameElem.textContent = fileName;
                        
                        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
                        modal.show();
                        
                        // Handle file deletion
                        const confirmBtn = document.getElementById('confirmDelete');
                        if (confirmBtn) {
                            confirmBtn.onclick = function() {
                                deleteFile(fileId);
                                modal.hide();
                            };
                        }
                    });
                });
            } else {
                if (noFilesMessage) noFilesMessage.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error loading files:', error);
            if (filesContainer) {
                filesContainer.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Lỗi tải danh sách file: ${error.message}
                        </div>
                    </div>
                `;
            }
        } finally {
            if (loadingContainer) loadingContainer.classList.add('d-none');
        }
    }
    
    // Create file card
    function createFileCard(file) {
        const col = document.createElement('div');
        col.className = 'col file-item';
        col.setAttribute('data-id', file.id);
        
        let fileIcon = '';
        let fileType = file.fileType || guessFileType(file.mimeType);
        
        if (fileType === 'document') {
            fileIcon = '<i class="bi bi-file-earmark-text file-icon document-icon"></i>';
        } else if (fileType === 'photo' || fileType === 'image') {
            if (file.telegramUrl) {
                fileIcon = `<img src="${file.telegramUrl}" alt="${file.name}" class="img-fluid mb-3" style="max-height: 150px; object-fit: cover;" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'bi bi-exclamation-triangle file-icon file-error\\'></i><p>Không thể tải ảnh xem trước</p>'">`;
            } else {
                fileIcon = '<i class="bi bi-image file-icon photo-icon"></i>';
            }
        } else if (fileType === 'video') {
            fileIcon = '<i class="bi bi-film file-icon video-icon"></i>';
        } else if (fileType === 'audio') {
            fileIcon = '<i class="bi bi-music-note-beamed file-icon audio-icon"></i>';
        } else {
            fileIcon = '<i class="bi bi-file-earmark file-icon"></i>';
        }
        
        // Format file size
        const fileSize = formatFileSize(file.size || 0);
        
        // Format date
        const uploadDate = new Date(file.uploadDate).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        col.innerHTML = `
            <div class="card h-100 file-card">
                <div class="card-body text-center">
                    <div class="file-thumb">
                        ${fileIcon}
                    </div>
                    <h5 class="card-title text-truncate" title="${file.name}">${file.name}</h5>
                    <p class="card-text file-details">
                        <span class="badge bg-secondary">${fileSize}</span>
                        <span class="text-muted d-block mt-1">${uploadDate}</span>
                    </p>
                    <div class="btn-group w-100 mt-3">
                        ${file.telegramUrl ? 
                            `<a href="${file.telegramUrl}" class="btn btn-sm btn-primary" target="_blank" download="${file.name}">
                                <i class="bi bi-download"></i> Tải xuống
                            </a>` : 
                            `<button class="btn btn-sm btn-secondary" disabled>
                                <i class="bi bi-exclamation-triangle"></i> Không có sẵn
                            </button>`
                        }
                        <button class="btn btn-sm btn-danger delete-file" data-id="${file.id}" data-name="${file.name}">
                            <i class="bi bi-trash"></i> Xóa
                        </button>
                    </div>
                    ${!file.telegramUrl && file.localPath ? 
                        `<p class="file-unavailable mt-2">
                            <i class="bi bi-info-circle"></i> File đang chờ upload lên Telegram
                        </p>` : ''
                    }
                </div>
            </div>
        `;
        
        return col;
    }
    
    // Delete file function
    async function deleteFile(fileId) {
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remove the file card from the UI
                const fileElement = document.querySelector(`.file-item[data-id="${fileId}"]`);
                if (fileElement) fileElement.remove();
                
                // Show success message
                showToast('File đã được xóa thành công.', 'success');
                
                // Check if there are no files left
                if (filesContainer && filesContainer.children.length === 0) {
                    if (noFilesMessage) noFilesMessage.classList.remove('d-none');
                }
            } else {
                showToast(result.error || 'Lỗi khi xóa file.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            showToast('Lỗi khi xóa file: ' + error.message, 'danger');
        }
    }
    
    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Helper function to guess file type from MIME type
    function guessFileType(mimeType) {
        if (!mimeType) return 'document';
        
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        
        return 'document';
    }
    
    // Toast notification function
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        
        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }
        
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-${type} text-white">
                    <strong class="me-auto">Thông báo</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        document.getElementById('toast-container').insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        // Auto-remove after hiding
        toastElement.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
}); 