/**
 * TeleDrive - File Preview Manager
 * 
 * Cung cấp chức năng xem trước (preview) cho nhiều định dạng file khác nhau:
 * - Hình ảnh (jpg, png, gif, webp, svg...)
 * - Video (mp4, webm...)
 * - Audio (mp3, wav, ogg...)
 * - Văn bản (txt, md, json, xml, html, css, js...)
 * - PDF
 * - Tệp Office (Word, Excel, PowerPoint)
 */

class FilePreviewManager {
    constructor(options = {}) {
        // Cấu hình mặc định
        this.config = {
            modalSelector: '.gdrive-preview-modal',  // CSS selector cho modal preview
            modalContentSelector: '.gdrive-preview-content', // CSS selector cho phần nội dung preview
            maxTextPreviewSize: 500000,  // Kích thước tối đa cho preview văn bản (~500KB)
            maxImagePreviewSize: 10000000,  // Kích thước tối đa cho preview ảnh (~10MB)
            imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
            videoExtensions: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
            audioExtensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'],
            documentExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
            textExtensions: ['txt', 'md', 'js', 'css', 'html', 'xml', 'json', 'csv', 'log', 'py', 'java', 'c', 'cpp', 'h', 'php', 'rb', 'sql'],
            officePreviewUrl: 'https://view.officeapps.live.com/op/view.aspx?src=',
            googleDocsPreviewUrl: 'https://docs.google.com/viewer?url=',
            ...options
        };
        
        // State
        this.currentFile = null;
        this.modal = null;
        
        // Khởi tạo
        this.init();
    }
    
    /**
     * Khởi tạo preview manager
     */
    init() {
        // Tạo modal preview nếu chưa tồn tại
        this.createModalIfNeeded();
        
        // Thiết lập event listeners
        this.setupEventListeners();
    }
    
    /**
     * Tạo modal preview nếu chưa tồn tại
     */
    createModalIfNeeded() {
        // Kiểm tra xem modal đã tồn tại chưa
        let modal = document.querySelector(this.config.modalSelector);
        
        if (!modal) {
            // Tạo mới modal
            modal = document.createElement('div');
            modal.className = 'gdrive-preview-modal';
            modal.innerHTML = `
                <div class="gdrive-preview-container">
                    <div class="gdrive-preview-header">
                        <div class="gdrive-preview-file-info">
                            <span class="gdrive-preview-filename"></span>
                            <span class="gdrive-preview-filesize"></span>
                        </div>
                        <div class="gdrive-preview-actions">
                            <button class="gdrive-preview-download" title="Tải xuống">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="gdrive-preview-close" title="Đóng">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="gdrive-preview-content">
                        <!-- Nội dung preview sẽ được đặt ở đây -->
                    </div>
                    <div class="gdrive-preview-footer">
                        <div class="gdrive-preview-navigation">
                            <button class="gdrive-preview-prev" title="File trước">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="gdrive-preview-next" title="File sau">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.modal = modal;
            
            // Thêm styles
            this.addStyles();
        } else {
            this.modal = modal;
        }
    }
    
    /**
     * Thiết lập event listeners cho modal preview
     */
    setupEventListeners() {
        if (!this.modal) return;
        
        // Nút đóng modal
        const closeBtn = this.modal.querySelector('.gdrive-preview-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePreview());
        }
        
        // Đóng modal khi click bên ngoài
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closePreview();
            }
        });
        
        // Phím ESC đóng modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closePreview();
            }
        });
        
        // Nút điều hướng
        const prevBtn = this.modal.querySelector('.gdrive-preview-prev');
        const nextBtn = this.modal.querySelector('.gdrive-preview-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateToPreviousFile());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateToNextFile());
        }
        
        // Phím mũi tên để điều hướng
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('active')) return;
            
            if (e.key === 'ArrowLeft') {
                this.navigateToPreviousFile();
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                this.navigateToNextFile();
                e.preventDefault();
            }
        });
        
        // Nút tải xuống
        const downloadBtn = this.modal.querySelector('.gdrive-preview-download');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadCurrentFile());
        }
    }
    
    /**
     * Hiển thị preview cho file
     * @param {Object} file - Thông tin file cần preview
     * @param {Array} siblingFiles - Danh sách các file cùng thư mục (để điều hướng)
     */
    showPreview(file, siblingFiles = []) {
        if (!file) return;
        
        this.currentFile = file;
        this.siblingFiles = siblingFiles;
        
        // Cập nhật thông tin file trong modal
        this.updateFileInfo(file);
        
        // Xóa nội dung preview cũ
        const contentContainer = this.modal.querySelector(this.config.modalContentSelector);
        if (contentContainer) {
            contentContainer.innerHTML = '';
            
            // Hiển thị loading
            const loading = document.createElement('div');
            loading.className = 'gdrive-preview-loading';
            loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            contentContainer.appendChild(loading);
        }
        
        // Hiển thị modal
        this.modal.classList.add('active');
        
        // Render preview dựa vào loại file
        this.renderPreview(file, contentContainer);
    }
    
    /**
     * Cập nhật thông tin file trong modal
     * @param {Object} file - Thông tin file
     */
    updateFileInfo(file) {
        // Cập nhật tên file
        const fileNameEl = this.modal.querySelector('.gdrive-preview-filename');
        if (fileNameEl) {
            fileNameEl.textContent = file.name || 'Không có tên';
        }
        
        // Cập nhật kích thước file
        const fileSizeEl = this.modal.querySelector('.gdrive-preview-filesize');
        if (fileSizeEl) {
            fileSizeEl.textContent = file.size_formatted || '';
        }
        
        // Cập nhật nút điều hướng (ẩn/hiện)
        this.updateNavigationButtons();
    }
    
    /**
     * Cập nhật trạng thái các nút điều hướng
     */
    updateNavigationButtons() {
        const prevBtn = this.modal.querySelector('.gdrive-preview-prev');
        const nextBtn = this.modal.querySelector('.gdrive-preview-next');
        
        if (!this.siblingFiles || this.siblingFiles.length <= 1) {
            // Nếu không có file nào khác, ẩn các nút
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            return;
        }
        
        // Hiển thị cả hai nút
        if (prevBtn) prevBtn.style.display = 'block';
        if (nextBtn) nextBtn.style.display = 'block';
    }
    
    /**
     * Render preview dựa vào loại file
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    async renderPreview(file, container) {
        if (!file || !container) return;
        
        // Xóa loading
        container.innerHTML = '';
        
        // Lấy extension file
        const extension = this.getFileExtension(file.name).toLowerCase();
        
        try {
            // Chọn loại preview dựa vào extension
            if (this.config.imageExtensions.includes(extension)) {
                await this.renderImagePreview(file, container);
            } else if (this.config.videoExtensions.includes(extension)) {
                this.renderVideoPreview(file, container);
            } else if (this.config.audioExtensions.includes(extension)) {
                this.renderAudioPreview(file, container);
            } else if (extension === 'pdf') {
                this.renderPdfPreview(file, container);
            } else if (this.config.textExtensions.includes(extension)) {
                await this.renderTextPreview(file, container);
            } else if (this.config.documentExtensions.includes(extension)) {
                this.renderDocumentPreview(file, container);
            } else {
                this.renderUnsupportedPreview(file, container);
            }
        } catch (error) {
            console.error('Error rendering preview:', error);
            this.renderErrorPreview(container, error);
        }
    }
    
    /**
     * Render preview hình ảnh
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    async renderImagePreview(file, container) {
        // Tạo element img
        const img = document.createElement('img');
        img.className = 'gdrive-preview-image';
        img.alt = file.name;
        
        // Set src từ URL file hoặc blob
        if (file.url) {
            // URL trực tiếp (có thể từ Telegram)
            img.src = file.url;
        } else if (file.path) {
            // URL local
            img.src = `/api/file/serve?path=${encodeURIComponent(file.path)}`;
        } else if (file.thumbnail_url) {
            // Thumbnail URL nếu không có URL chính
            img.src = file.thumbnail_url;
        }
        
        // Thêm image loading và error handling
        img.onload = () => {
            container.appendChild(img);
        };
        
        img.onerror = () => {
            this.renderErrorPreview(container, 'Không thể tải hình ảnh');
        };
        
        // Preload image
        const preloadImage = new Image();
        preloadImage.src = img.src;
    }
    
    /**
     * Render preview video
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    renderVideoPreview(file, container) {
        // Tạo element video
        const video = document.createElement('video');
        video.className = 'gdrive-preview-video';
        video.controls = true;
        video.autoplay = false;
        video.preload = 'auto';
        
        // Set source từ URL file
        if (file.url) {
            video.src = file.url;
        } else if (file.path) {
            video.src = `/api/file/serve?path=${encodeURIComponent(file.path)}`;
        }
        
        // Error handling
        video.addEventListener('error', () => {
            this.renderErrorPreview(container, 'Không thể tải video');
        });
        
        container.appendChild(video);
    }
    
    /**
     * Render preview audio
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    renderAudioPreview(file, container) {
        // Tạo element audio
        const audio = document.createElement('audio');
        audio.className = 'gdrive-preview-audio';
        audio.controls = true;
        audio.autoplay = false;
        
        // Set source từ URL file
        if (file.url) {
            audio.src = file.url;
        } else if (file.path) {
            audio.src = `/api/file/serve?path=${encodeURIComponent(file.path)}`;
        }
        
        // Error handling
        audio.addEventListener('error', () => {
            this.renderErrorPreview(container, 'Không thể tải file âm thanh');
        });
        
        // Wrapper để căn giữa audio player
        const audioWrapper = document.createElement('div');
        audioWrapper.className = 'gdrive-preview-audio-wrapper';
        audioWrapper.appendChild(audio);
        
        container.appendChild(audioWrapper);
    }
    
    /**
     * Render preview PDF
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    renderPdfPreview(file, container) {
        // Tạo iframe để hiển thị PDF
        const iframe = document.createElement('iframe');
        iframe.className = 'gdrive-preview-pdf';
        
        // Set source
        let pdfUrl;
        if (file.url) {
            pdfUrl = file.url;
        } else if (file.path) {
            pdfUrl = `/api/file/serve?path=${encodeURIComponent(file.path)}`;
        }
        
        // Sử dụng PDF.js viewer nếu có thể
        const pdfViewerUrl = '/static/pdfjs/web/viewer.html';
        if (document.querySelector(`link[href*="pdf.js"]`)) {
            iframe.src = `${pdfViewerUrl}?file=${encodeURIComponent(pdfUrl)}`;
        } else {
            // Fallback: sử dụng browser's built-in PDF viewer
            iframe.src = pdfUrl;
        }
        
        container.appendChild(iframe);
    }
    
    /**
     * Render preview văn bản
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    async renderTextPreview(file, container) {
        try {
            // Tạo element pre và code
            const pre = document.createElement('pre');
            pre.className = 'gdrive-preview-text';
            const code = document.createElement('code');
            
            // Xác định ngôn ngữ cho syntax highlighting
            const extension = this.getFileExtension(file.name);
            if (extension) {
                code.className = `language-${extension}`;
            }
            
            // Fetch nội dung văn bản
            let textUrl;
            if (file.url) {
                textUrl = file.url;
            } else if (file.path) {
                textUrl = `/api/file/serve?path=${encodeURIComponent(file.path)}`;
            }
            
            if (textUrl) {
                const response = await fetch(textUrl);
                if (!response.ok) {
                    throw new Error('Không thể tải nội dung file');
                }
                
                // Kiểm tra kích thước
                const contentLength = response.headers.get('Content-Length');
                if (contentLength && parseInt(contentLength) > this.config.maxTextPreviewSize) {
                    throw new Error(`File quá lớn để xem trước (${this.formatFileSize(parseInt(contentLength))})`);
                }
                
                const text = await response.text();
                code.textContent = text;
            } else {
                code.textContent = 'Không có nội dung để hiển thị';
            }
            
            pre.appendChild(code);
            container.appendChild(pre);
            
            // Apply syntax highlighting nếu có thể
            if (window.hljs) {
                window.hljs.highlightElement(code);
            }
        } catch (error) {
            this.renderErrorPreview(container, error.message);
        }
    }
    
    /**
     * Render preview cho tài liệu Office
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render preview
     */
    renderDocumentPreview(file, container) {
        // Tạo iframe để hiển thị tài liệu
        const iframe = document.createElement('iframe');
        iframe.className = 'gdrive-preview-document';
        
        // Xác định URL
        let docUrl;
        if (file.url) {
            docUrl = file.url;
        } else if (file.path) {
            const baseUrl = window.location.origin;
            docUrl = `${baseUrl}/api/file/serve?path=${encodeURIComponent(file.path)}`;
        }
        
        // Sử dụng Office Online hoặc Google Docs Viewer
        const extension = this.getFileExtension(file.name);
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
            iframe.src = `${this.config.officePreviewUrl}${encodeURIComponent(docUrl)}`;
        } else {
            iframe.src = `${this.config.googleDocsPreviewUrl}${encodeURIComponent(docUrl)}&embedded=true`;
        }
        
        container.appendChild(iframe);
    }
    
    /**
     * Render thông báo lỗi khi không thể preview
     * @param {HTMLElement} container - Container để render thông báo lỗi
     * @param {string|Error} error - Thông báo lỗi hoặc đối tượng Error
     */
    renderErrorPreview(container, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'gdrive-preview-error';
        errorDiv.innerHTML = `
            <div class="gdrive-preview-error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="gdrive-preview-error-message">
                ${errorMessage || 'Không thể hiển thị xem trước cho file này'}
            </div>
            <div class="gdrive-preview-error-help">
                Bạn có thể tải xuống để xem file này
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(errorDiv);
    }
    
    /**
     * Render thông báo khi file không được hỗ trợ để preview
     * @param {Object} file - Thông tin file
     * @param {HTMLElement} container - Container để render thông báo
     */
    renderUnsupportedPreview(file, container) {
        const extension = this.getFileExtension(file.name);
        
        const unsupportedDiv = document.createElement('div');
        unsupportedDiv.className = 'gdrive-preview-unsupported';
        unsupportedDiv.innerHTML = `
            <div class="gdrive-preview-error-icon">
                <i class="fas fa-file"></i>
            </div>
            <div class="gdrive-preview-error-message">
                Không thể xem trước định dạng file ${extension ? '.' + extension : 'này'}
            </div>
            <div class="gdrive-preview-error-help">
                Bạn có thể tải xuống để mở bằng ứng dụng hỗ trợ
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(unsupportedDiv);
    }
    
    /**
     * Đóng preview
     */
    closePreview() {
        if (this.modal) {
            this.modal.classList.remove('active');
            
            // Xóa nội dung preview để dọn bộ nhớ
            const contentContainer = this.modal.querySelector(this.config.modalContentSelector);
            if (contentContainer) {
                contentContainer.innerHTML = '';
            }
        }
    }
    
    /**
     * Điều hướng đến file trước đó
     */
    navigateToPreviousFile() {
        if (!this.siblingFiles || !this.currentFile) return;
        
        // Tìm vị trí file hiện tại
        const currentIndex = this.siblingFiles.findIndex(file => 
            file.id === this.currentFile.id || file.path === this.currentFile.path);
        
        if (currentIndex > 0) {
            // Hiển thị file trước đó
            this.showPreview(this.siblingFiles[currentIndex - 1], this.siblingFiles);
        } else {
            // Quay lại file cuối cùng (vòng tròn)
            this.showPreview(this.siblingFiles[this.siblingFiles.length - 1], this.siblingFiles);
        }
    }
    
    /**
     * Điều hướng đến file tiếp theo
     */
    navigateToNextFile() {
        if (!this.siblingFiles || !this.currentFile) return;
        
        // Tìm vị trí file hiện tại
        const currentIndex = this.siblingFiles.findIndex(file => 
            file.id === this.currentFile.id || file.path === this.currentFile.path);
        
        if (currentIndex < this.siblingFiles.length - 1) {
            // Hiển thị file tiếp theo
            this.showPreview(this.siblingFiles[currentIndex + 1], this.siblingFiles);
        } else {
            // Quay lại file đầu tiên (vòng tròn)
            this.showPreview(this.siblingFiles[0], this.siblingFiles);
        }
    }
    
    /**
     * Tải xuống file hiện tại
     */
    downloadCurrentFile() {
        if (!this.currentFile) return;
        
        // Sử dụng FileOperations nếu có
        if (window.fileOperations) {
            window.fileOperations.downloadFile(this.currentFile.path);
            return;
        }
        
        // Tạo link tải xuống
        let downloadUrl;
        if (this.currentFile.url) {
            downloadUrl = this.currentFile.url;
        } else if (this.currentFile.path) {
            downloadUrl = `/api/file/download?path=${encodeURIComponent(this.currentFile.path)}`;
        } else {
            console.error('Không tìm thấy URL để tải xuống');
            return;
        }
        
        // Tạo thẻ a và click
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = this.currentFile.name || 'download';
        a.target = '_blank';
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Dọn dẹp
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    }
    
    /**
     * Lấy phần mở rộng của file
     * @param {string} filename - Tên file
     * @returns {string} - Phần mở rộng
     */
    getFileExtension(filename) {
        if (!filename) return '';
        return filename.split('.').pop();
    }
    
    /**
     * Format kích thước file để hiển thị
     * @param {number} bytes - Kích thước file tính bằng bytes
     * @returns {string} - Chuỗi đã format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }
    
    /**
     * Thêm styles cho preview
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Preview Modal */
            .gdrive-preview-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.9);
                z-index: 1000;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .gdrive-preview-modal.active {
                display: flex;
                opacity: 1;
                align-items: center;
                justify-content: center;
            }
            
            .gdrive-preview-container {
                display: flex;
                flex-direction: column;
                width: 90%;
                height: 90%;
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                position: relative;
            }
            
            /* Preview Header */
            .gdrive-preview-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #e0e0e0;
                background-color: #f5f5f5;
            }
            
            .gdrive-preview-file-info {
                display: flex;
                flex-direction: column;
            }
            
            .gdrive-preview-filename {
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 50vw;
            }
            
            .gdrive-preview-filesize {
                font-size: 12px;
                color: #666;
            }
            
            .gdrive-preview-actions {
                display: flex;
                gap: 8px;
            }
            
            .gdrive-preview-actions button {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                background-color: transparent;
                color: #666;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .gdrive-preview-actions button:hover {
                background-color: rgba(0, 0, 0, 0.1);
                color: #333;
            }
            
            /* Preview Content */
            .gdrive-preview-content {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: auto;
                background-color: #f0f0f0;
                padding: 16px;
                position: relative;
            }
            
            /* Preview Footer */
            .gdrive-preview-footer {
                padding: 12px 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                border-top: 1px solid #e0e0e0;
                background-color: #f5f5f5;
            }
            
            .gdrive-preview-navigation {
                display: flex;
                gap: 16px;
            }
            
            .gdrive-preview-navigation button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                background-color: #e0e0e0;
                color: #333;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .gdrive-preview-navigation button:hover {
                background-color: #d0d0d0;
            }
            
            /* Preview Types */
            .gdrive-preview-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }
            
            .gdrive-preview-video {
                max-width: 100%;
                max-height: 100%;
            }
            
            .gdrive-preview-audio-wrapper {
                width: 80%;
                max-width: 500px;
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .gdrive-preview-audio {
                width: 100%;
            }
            
            .gdrive-preview-pdf,
            .gdrive-preview-document {
                width: 100%;
                height: 100%;
                border: none;
            }
            
            .gdrive-preview-text {
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: #fff;
                padding: 16px;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.5;
                white-space: pre-wrap;
                tab-size: 4;
            }
            
            /* Error and Loading States */
            .gdrive-preview-error,
            .gdrive-preview-unsupported {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 32px;
                text-align: center;
            }
            
            .gdrive-preview-error-icon {
                font-size: 48px;
                color: #f44336;
                margin-bottom: 16px;
            }
            
            .gdrive-preview-unsupported .gdrive-preview-error-icon {
                color: #ff9800;
            }
            
            .gdrive-preview-error-message {
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 8px;
            }
            
            .gdrive-preview-error-help {
                font-size: 14px;
                color: #666;
            }
            
            .gdrive-preview-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                color: #666;
            }
            
            .gdrive-preview-loading i {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Mobile Styles */
            @media (max-width: 768px) {
                .gdrive-preview-container {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                }
                
                .gdrive-preview-filename {
                    max-width: 70vw;
                }
                
                .gdrive-preview-content {
                    padding: 8px;
                }
                
                .gdrive-preview-navigation button {
                    width: 36px;
                    height: 36px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Tạo instance và xuất ra toàn cục
const filePreview = new FilePreviewManager();
window.filePreview = filePreview; 