/**
 * TeleDrive - File Operations Module
 * 
 * Cung cấp các chức năng quản lý file nâng cao: 
 * - Sao chép
 * - Di chuyển
 * - Đổi tên
 * - Xóa
 * - Tạo thư mục
 * - Lấy thông tin chi tiết
 */

class FileOperations {
    constructor() {
        this.apiBase = '/api';
        this.csrfToken = this._getCsrfToken();
    }

    /**
     * Lấy CSRF token từ meta tag
     */
    _getCsrfToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : '';
    }

    /**
     * Thực hiện API request
     * @param {string} url - URL của API endpoint
     * @param {Object} options - Tùy chọn fetch
     * @returns {Promise} - Promise với kết quả API
     */
    async _apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken
            },
            credentials: 'same-origin'
        };

        const fetchOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${this.apiBase}${url}`, fetchOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Sao chép file hoặc thư mục
     * @param {string} sourcePath - Đường dẫn nguồn
     * @param {string} destinationPath - Đường dẫn đích
     * @param {string} newName - Tên mới (tùy chọn)
     * @returns {Promise} - Promise với kết quả sao chép
     */
    async copyItem(sourcePath, destinationPath, newName = null) {
        return this._apiRequest('/item/copy', {
            method: 'POST',
            body: JSON.stringify({
                source_path: sourcePath,
                destination_path: destinationPath,
                new_name: newName
            })
        });
    }

    /**
     * Di chuyển file hoặc thư mục
     * @param {string} sourcePath - Đường dẫn nguồn
     * @param {string} destinationPath - Đường dẫn đích
     * @param {string} newName - Tên mới (tùy chọn)
     * @returns {Promise} - Promise với kết quả di chuyển
     */
    async moveItem(sourcePath, destinationPath, newName = null) {
        return this._apiRequest('/item/move', {
            method: 'POST',
            body: JSON.stringify({
                source_path: sourcePath,
                destination_path: destinationPath,
                new_name: newName
            })
        });
    }

    /**
     * Đổi tên file hoặc thư mục
     * @param {string} itemPath - Đường dẫn đến item
     * @param {string} newName - Tên mới
     * @returns {Promise} - Promise với kết quả đổi tên
     */
    async renameItem(itemPath, newName) {
        return this._apiRequest('/item/rename', {
            method: 'POST',
            body: JSON.stringify({
                item_path: itemPath,
                new_name: newName
            })
        });
    }

    /**
     * Xóa file hoặc thư mục
     * @param {string} itemPath - Đường dẫn đến item
     * @returns {Promise} - Promise với kết quả xóa
     */
    async deleteItem(itemPath) {
        return this._apiRequest('/item/delete', {
            method: 'POST',
            body: JSON.stringify({
                item_path: itemPath
            })
        });
    }

    /**
     * Tạo thư mục mới
     * @param {string} parentPath - Đường dẫn thư mục cha
     * @param {string} folderName - Tên thư mục mới
     * @returns {Promise} - Promise với kết quả tạo thư mục
     */
    async createFolder(parentPath, folderName) {
        return this._apiRequest('/folder/create', {
            method: 'POST',
            body: JSON.stringify({
                parent_path: parentPath,
                folder_name: folderName
            })
        });
    }

    /**
     * Tạo file mới
     * @param {string} parentPath - Đường dẫn thư mục cha
     * @param {string} fileName - Tên file mới
     * @param {string} content - Nội dung file
     * @returns {Promise} - Promise với kết quả tạo file
     */
    async createFile(parentPath, fileName, content = '') {
        return this._apiRequest('/file/create', {
            method: 'POST',
            body: JSON.stringify({
                parent_path: parentPath,
                file_name: fileName,
                content: content
            })
        });
    }

    /**
     * Lấy thông tin chi tiết của file hoặc thư mục
     * @param {string} itemPath - Đường dẫn đến item
     * @returns {Promise} - Promise với thông tin chi tiết
     */
    async getItemDetails(itemPath) {
        return this._apiRequest(`/file/preview?path=${encodeURIComponent(itemPath)}`, {
            method: 'GET'
        });
    }

    /**
     * Tải file lên server
     * @param {string} parentPath - Đường dẫn thư mục cha
     * @param {File} file - File cần tải lên
     * @param {Function} progressCallback - Callback để cập nhật tiến trình
     * @returns {Promise} - Promise với kết quả tải lên
     */
    async uploadFile(parentPath, file, progressCallback = null) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parent_path', parentPath);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('POST', `${this.apiBase}/file/upload`, true);
            xhr.setRequestHeader('X-CSRFToken', this.csrfToken);
            
            xhr.upload.addEventListener('progress', (event) => {
                if (progressCallback && event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progressCallback(percentComplete, event);
                }
            });
            
            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error('Upload failed'));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network error'));
            };
            
            xhr.send(formData);
        });
    }

    /**
     * Tải file từ server
     * @param {string} filePath - Đường dẫn đến file
     */
    downloadFile(filePath) {
        // Create a hidden iframe to handle the download
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        iframe.src = `${this.apiBase}/file/download?path=${encodeURIComponent(filePath)}`;
        
        // Remove the iframe after loading
        iframe.addEventListener('load', () => {
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        });
    }

    /**
     * Tìm kiếm file và thư mục
     * @param {string} query - Chuỗi tìm kiếm
     * @param {string} path - Đường dẫn cần tìm kiếm (tùy chọn)
     * @param {Array} fileTypes - Mảng các loại file cần tìm (tùy chọn)
     * @returns {Promise} - Promise với kết quả tìm kiếm
     */
    async searchFiles(query, path = null, fileTypes = null) {
        let url = `/search?query=${encodeURIComponent(query)}`;
        
        if (path) {
            url += `&path=${encodeURIComponent(path)}`;
        }
        
        if (fileTypes && fileTypes.length) {
            fileTypes.forEach(type => {
                url += `&file_types=${encodeURIComponent(type)}`;
            });
        }
        
        return this._apiRequest(url, { method: 'GET' });
    }
}

// Tạo instance mặc định để sử dụng trong ứng dụng
const fileOperations = new FileOperations();

// Xuất module
window.FileOperations = FileOperations;
window.fileOperations = fileOperations; 