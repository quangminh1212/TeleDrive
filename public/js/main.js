/**
 * TeleDrive - Main JavaScript
 * Xử lý tất cả các tương tác phía client cho ứng dụng TeleDrive
 */

document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM chính
    const filesContainer = document.getElementById('files-container');
    const loadingContainer = document.getElementById('loading-container');
    const noFilesMessage = document.getElementById('no-files-message');
    const refreshBtn = document.getElementById('refresh-btn');
    const botStatusIcon = document.querySelector('.bot-status-icon');
    const botStatusText = document.querySelector('.bot-status-text');
    
    // Phần tử Modal và form
    const uploadForm = document.getElementById('upload-form');
    const uploadProgress = uploadForm ? document.getElementById('upload-progress') : null;
    const uploadMessage = uploadForm ? document.getElementById('upload-message') : null;
    const deleteModal = document.getElementById('deleteModal') ? new bootstrap.Modal(document.getElementById('deleteModal')) : null;
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // ID của file đang được xử lý
    let currentFileId = null;
    
    // Kiểm tra trạng thái bot
    if (botStatusIcon && botStatusText) {
        checkBotStatus();
    }
    
    // Tải danh sách file khi trang được tải
    if (filesContainer) {
        loadFiles();
        
        // Tự động làm mới danh sách file mỗi 30 giây
        setInterval(loadFiles, 30000);
    }
    
    // Xử lý sự kiện nút làm mới
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat loading-spinner me-1"></i>Đang làm mới...';
            loadFiles().finally(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Làm mới';
            });
        });
    }
    
    // Xử lý sự kiện form upload
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('file');
            const file = fileInput.files[0];
            
            if (!file) {
                showUploadMessage('Vui lòng chọn file để tải lên', 'danger');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            if (uploadProgress) {
                uploadProgress.classList.remove('d-none');
            }
            if (uploadMessage) {
                uploadMessage.classList.add('d-none');
            }
            
            // Gửi file lên server
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showUploadMessage('File đã được tải lên thành công!', 'success');
                    fileInput.value = '';
                    loadFiles(); // Làm mới danh sách file
                    
                    // Đóng modal sau 2 giây
                    setTimeout(() => {
                        const uploadModal = document.getElementById('uploadModal');
                        if (uploadModal) {
                            const modalInstance = bootstrap.Modal.getInstance(uploadModal);
                            if (modalInstance) {
                                modalInstance.hide();
                            }
                        }
                        if (uploadProgress) {
                            uploadProgress.classList.add('d-none');
                        }
                        if (uploadMessage) {
                            uploadMessage.classList.add('d-none');
                        }
                    }, 2000);
                } else {
                    showUploadMessage(data.error || 'Có lỗi xảy ra khi tải lên file', 'danger');
                }
            })
            .catch(error => {
                console.error('Lỗi:', error);
                showUploadMessage('Có lỗi xảy ra khi tải lên file', 'danger');
            });
        });
    }
    
    // Xử lý sự kiện click vào các nút xóa file
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-file-btn')) {
            const btn = e.target.closest('.delete-file-btn');
            currentFileId = btn.dataset.fileId;
            if (deleteModal) {
                deleteModal.show();
            }
        }
    });
    
    // Xử lý xác nhận xóa file
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (!currentFileId) return;
            
            // Gửi yêu cầu xóa file
            fetch(`/api/files/${currentFileId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (deleteModal) {
                    deleteModal.hide();
                }
                
                if (data.success) {
                    // Xóa phần tử khỏi DOM
                    const fileElement = document.querySelector(`.file-card[data-file-id="${currentFileId}"]`);
                    if (fileElement) {
                        const parentCol = fileElement.closest('.col-sm-6');
                        if (parentCol) parentCol.remove();
                    }
                    showToast('File đã được xóa thành công', 'success');
                    
                    // Kiểm tra nếu không còn file nào
                    if (filesContainer && filesContainer.children.length === 0 && noFilesMessage) {
                        noFilesMessage.classList.remove('d-none');
                    }
                } else {
                    showToast(data.error || 'Có lỗi xảy ra khi xóa file', 'danger');
                }
                
                currentFileId = null;
            })
            .catch(error => {
                console.error('Lỗi:', error);
                if (deleteModal) {
                    deleteModal.hide();
                }
                showToast('Có lỗi xảy ra khi xóa file', 'danger');
                currentFileId = null;
            });
        });
    }
    
    // Hàm kiểm tra trạng thái bot
    function checkBotStatus() {
        fetch('/api/status')
            .then(response => response.json())
            .then(data => {
                if (data.botActive) {
                    botStatusText.textContent = 'Bot đang hoạt động';
                    botStatusText.classList.add('text-success');
                    botStatusText.classList.remove('text-danger', 'text-warning');
                    botStatusIcon.classList.add('text-success');
                    botStatusIcon.classList.remove('text-danger', 'text-warning', 'loading-spinner');
                    botStatusIcon.classList.remove('bi-arrow-repeat');
                    botStatusIcon.classList.add('bi-check-circle');
                } else {
                    botStatusText.textContent = 'Bot không hoạt động';
                    botStatusText.classList.add('text-danger');
                    botStatusText.classList.remove('text-success', 'text-warning');
                    botStatusIcon.classList.add('text-danger');
                    botStatusIcon.classList.remove('text-success', 'text-warning', 'loading-spinner');
                    botStatusIcon.classList.remove('bi-arrow-repeat');
                    botStatusIcon.classList.add('bi-x-circle');
                }
            })
            .catch(error => {
                console.error('Lỗi kiểm tra trạng thái bot:', error);
                botStatusText.textContent = 'Không thể kiểm tra trạng thái Bot';
                botStatusText.classList.add('text-warning');
                botStatusText.classList.remove('text-success', 'text-danger');
                botStatusIcon.classList.add('text-warning');
                botStatusIcon.classList.remove('text-success', 'text-danger', 'loading-spinner');
                botStatusIcon.classList.remove('bi-arrow-repeat');
                botStatusIcon.classList.add('bi-exclamation-triangle');
            });
    }
    
    // Hàm tải danh sách file
    async function loadFiles() {
        try {
            if (loadingContainer) {
                loadingContainer.classList.remove('d-none');
            }
            if (noFilesMessage) {
                noFilesMessage.classList.add('d-none');
            }
            
            // Nếu đã có file được hiển thị và đang làm mới, không xóa file hiện tại
            if (filesContainer && filesContainer.children.length === 0) {
                filesContainer.innerHTML = '';
            }
            
            const response = await fetch('/api/files');
            const files = await response.json();
            
            // Nếu đang làm mới danh sách file, xóa file hiện tại
            if (filesContainer) {
                filesContainer.innerHTML = '';
            
                if (files.length === 0) {
                    if (noFilesMessage) {
                        noFilesMessage.classList.remove('d-none');
                    }
                } else {
                    files.forEach(file => {
                        filesContainer.appendChild(createFileCard(file));
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi tải danh sách file:', error);
            showToast('Có lỗi xảy ra khi tải danh sách file', 'danger');
        } finally {
            if (loadingContainer) {
                loadingContainer.classList.add('d-none');
            }
        }
    }
    
    // Hàm tạo card cho file
    function createFileCard(file) {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-sm-6 col-md-4 col-lg-3 mb-4';
        
        // Xác định loại file và biểu tượng
        let fileIcon = 'bi-file-earmark-text';
        let fileIconClass = 'document-icon';
        
        if (file.fileType === 'image') {
            fileIcon = 'bi-image';
            fileIconClass = 'photo-icon';
        } else if (file.fileType === 'video') {
            fileIcon = 'bi-film';
            fileIconClass = 'video-icon';
        } else if (file.fileType === 'audio') {
            fileIcon = 'bi-music-note-beamed';
            fileIconClass = 'audio-icon';
        }
        
        // Định dạng kích thước file
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        // Định dạng ngày tải lên
        const uploadDate = new Date(file.uploadDate).toLocaleString('vi-VN');
        
        // Xác định trạng thái và đường dẫn tải xuống
        let downloadPath = `/api/files/${file.id}/download`;
        let statusText = '';
        let statusClass = '';
        let downloadIcon = 'bi-download';
        let downloadBtnClass = 'btn-outline-primary';
        let downloadTooltip = 'Tải xuống file';
        
        // Tất cả các file đều có thể tải xuống bây giờ
        const downloadDisabled = false;
        
        // Hiển thị trạng thái khác nhau dựa trên fileStatus
        switch (file.fileStatus) {
            case 'local':
                statusText = '';
                break;
            case 'telegram':
                statusText = 'Lưu trữ trên Telegram';
                statusClass = 'text-info';
                downloadIcon = 'bi-telegram';
                downloadBtnClass = 'btn-outline-info';
                downloadTooltip = 'Tải từ Telegram';
                break;
            case 'missing':
                if (file.fakeTelegramId) {
                    statusText = 'File không khả dụng (mô phỏng)';
                    statusClass = 'text-warning';
                    downloadIcon = 'bi-cloud-download';
                    downloadBtnClass = 'btn-outline-warning';
                    downloadTooltip = 'Tải mô phỏng';
                } else if (file.telegramFileId) {
                    statusText = 'File không có ở local, nhưng có thể tải từ Telegram';
                    statusClass = 'text-warning';
                    downloadIcon = 'bi-telegram';
                    downloadBtnClass = 'btn-outline-info';
                    downloadTooltip = 'Tải từ Telegram';
                } else {
                    statusText = 'File không khả dụng';
                    statusClass = 'text-danger';
                }
                break;
            case 'error':
            case 'unknown':
            default:
                statusText = 'File không khả dụng';
                statusClass = 'text-danger';
                downloadIcon = 'bi-exclamation-circle';
                downloadBtnClass = 'btn-outline-danger';
                downloadTooltip = 'Tải mô phỏng';
                break;
        }
        
        colDiv.innerHTML = `
            <div class="card file-card h-100" data-file-id="${file.id}">
                <div class="card-body">
                    <div class="text-center mb-2">
                        <i class="bi ${fileIcon} fs-1 ${fileIconClass}"></i>
                    </div>
                    <h5 class="card-title text-truncate" title="${file.name}">${file.name}</h5>
                    <p class="card-text text-muted mb-1">
                        <small>${fileSizeMB} MB</small>
                    </p>
                    <p class="card-text text-muted">
                        <small>${uploadDate}</small>
                    </p>
                    ${statusText ? `<p class="card-text ${statusClass}"><small>${statusText}</small></p>` : ''}
                </div>
                <div class="card-footer bg-transparent border-top-0">
                    <div class="d-flex justify-content-between">
                        <a href="${downloadPath}" class="btn btn-sm ${downloadBtnClass}" 
                           title="${downloadTooltip}" download="${file.name}">
                            <i class="bi ${downloadIcon}"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-danger delete-file-btn" data-file-id="${file.id}" title="Xóa file">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return colDiv;
    }
    
    // Hiển thị thông báo upload
    function showUploadMessage(message, type) {
        if (!uploadMessage) return;
        
        uploadMessage.textContent = message;
        uploadMessage.className = `alert alert-${type} mt-3`;
        uploadMessage.classList.remove('d-none');
    }
    
    // Hiển thị toast thông báo
    function showToast(message, type) {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;
        
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        
        // Kiểm tra xem Bootstrap đã được tải chưa
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const toast = new bootstrap.Toast(toastEl, {
                autohide: true,
                delay: 3000
            });
            
            toast.show();
            
            // Xóa toast sau khi ẩn
            toastEl.addEventListener('hidden.bs.toast', function() {
                toastEl.remove();
            });
        } else {
            // Fallback nếu Bootstrap không có sẵn
            setTimeout(() => {
                toastEl.remove();
            }, 3000);
        }
    }
    
    // Thêm console.log để kiểm tra lỗi
    console.log('TeleDrive JS đã được tải thành công');
}); 