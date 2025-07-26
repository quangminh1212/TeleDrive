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
        // Đảm bảo apiBase có dấu / ở cuối
        this.apiBase = '/api';
        if (!this.apiBase.endsWith('/')) {
            this.apiBase += '/';
        }
        this.csrfToken = this._getCsrfToken();
    }

    /**
     * Lấy CSRF token từ meta tag
     * @returns {string} CSRF token hoặc chuỗi rỗng nếu không tìm thấy
     */
    _getCsrfToken() {
        try {
            // Tìm CSRF token từ meta tag
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag && metaTag.getAttribute('content')) {
                return metaTag.getAttribute('content');
            }
            
            // Tìm từ cookie nếu không có meta tag
            const csrfCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_token=') || row.startsWith('_csrf='));
                
            if (csrfCookie) {
                return csrfCookie.split('=')[1];
            }
            
            console.warn('CSRF token không tìm thấy. Các request có thể không an toàn.');
            return '';
        } catch (error) {
            console.error('Lỗi khi lấy CSRF token:', error);
            return '';
        }
    }

    /**
     * Tạo URL đầy đủ cho API endpoint
     * @param {string} endpoint - Đường dẫn API endpoint
     * @returns {string} - URL đầy đủ
     */
    _buildApiUrl(endpoint) {
        if (!endpoint) return this.apiBase;
        
        // Loại bỏ dấu / ở đầu endpoint nếu apiBase đã có dấu / ở cuối
        if (endpoint.startsWith('/') && this.apiBase.endsWith('/')) {
            endpoint = endpoint.substring(1);
        }
        
        // Thêm dấu / nếu cả apiBase và endpoint đều không có
        if (!this.apiBase.endsWith('/') && !endpoint.startsWith('/')) {
            return `${this.apiBase}/${endpoint}`;
        }
        
        return this.apiBase + endpoint;
    }

    /**
     * Thực hiện API request
     * @param {string} endpoint - Endpoint của API
     * @param {Object} options - Tùy chọn fetch
     * @returns {Promise} - Promise với kết quả API
     */
    async _apiRequest(endpoint, options = {}) {
        // Tạo URL đầy đủ
        const apiUrl = this._buildApiUrl(endpoint);
            
        // Khởi tạo headers với content type
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Thêm CSRF token nếu có và nếu là phương thức thay đổi dữ liệu
        const method = options.method || 'GET';
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase()) && this.csrfToken) {
            headers['X-CSRFToken'] = this.csrfToken;
        }
        
        // Tạo fetchOptions với headers đã cập nhật
        const fetchOptions = { 
            credentials: 'same-origin', // Luôn gửi cookies để xác thực
            ...options,
            headers
        };
        
        try {
            const response = await fetch(apiUrl, fetchOptions);
            
            // Kiểm tra response status
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: `HTTP error ${response.status}: ${response.statusText}`
                }));
                throw new Error(errorData.error || errorData.message || 'API request failed');
            }
            
            // Parse JSON response
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error in API request to ${apiUrl}:`, error);
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
        if (!sourcePath || !destinationPath) {
            throw new Error('Thiếu thông tin đường dẫn nguồn hoặc đích');
        }
        
        return this._apiRequest('item/copy', {
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
        if (!sourcePath || !destinationPath) {
            throw new Error('Thiếu thông tin đường dẫn nguồn hoặc đích');
        }
        
        return this._apiRequest('item/move', {
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
        if (!itemPath || !newName) {
            throw new Error('Thiếu thông tin đường dẫn hoặc tên mới');
        }
        
        return this._apiRequest('item/rename', {
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
        if (!itemPath) {
            throw new Error('Thiếu thông tin đường dẫn');
        }
        
        return this._apiRequest('item/delete', {
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
        if (!parentPath || !folderName) {
            throw new Error('Thiếu thông tin đường dẫn thư mục cha hoặc tên thư mục mới');
        }
        
        return this._apiRequest('folder/create', {
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
        if (!parentPath || !fileName) {
            throw new Error('Thiếu thông tin đường dẫn thư mục cha hoặc tên file mới');
        }
        
        return this._apiRequest('file/create', {
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
        if (!itemPath) {
            throw new Error('Thiếu thông tin đường dẫn');
        }
        
        return this._apiRequest(`file/preview?path=${encodeURIComponent(itemPath)}`, {
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
        if (!parentPath || !file) {
            throw new Error('Thiếu thông tin đường dẫn thư mục cha hoặc file');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parent_path', parentPath);

        // Tạo URL đầy đủ
        const apiUrl = this._buildApiUrl('file/upload');

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('POST', apiUrl, true);
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
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        reject(new Error(errorData.error || errorData.message || `Upload failed with status ${this.status}`));
                    } catch (e) {
                        reject(new Error(`Upload failed with status ${this.status}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network error during upload'));
            };
            
            xhr.ontimeout = function() {
                reject(new Error('Upload timed out'));
            };
            
            xhr.send(formData);
        });
    }

    /**
     * Tải file từ server
     * @param {string} filePath - Đường dẫn đến file
     * @returns {Promise} - Promise kết thúc khi download bắt đầu
     */
    downloadFile(filePath) {
        return new Promise((resolve, reject) => {
            if (!filePath) {
                reject(new Error('Đường dẫn file không hợp lệ'));
                return;
            }
            
            try {
                // Tạo URL đầy đủ
                const downloadUrl = this._buildApiUrl(`file/download?path=${encodeURIComponent(filePath)}`);
                
                // Tạo thẻ a ẩn và kích hoạt click
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filePath.split('/').pop() || 'download';
                a.style.display = 'none';
                document.body.appendChild(a);
                
                // Kích hoạt click để tải xuống
                a.click();
                
                // Dọn dẹp
                setTimeout(() => {
                    document.body.removeChild(a);
                    resolve();
                }, 1000);
            } catch (error) {
                console.error('Lỗi khi tải file:', error);
                reject(error);
            }
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
        if (!query) {
            throw new Error('Từ khóa tìm kiếm là bắt buộc');
        }
        
        let url = `search?query=${encodeURIComponent(query)}`;
        
        if (path) {
            url += `&path=${encodeURIComponent(path)}`;
        }
        
        if (fileTypes && Array.isArray(fileTypes) && fileTypes.length) {
            fileTypes.forEach(type => {
                url += `&file_types=${encodeURIComponent(type)}`;
            });
        }
        
        return this._apiRequest(url, { method: 'GET' });
    }

    /**
     * Lấy thông tin hệ thống file
     * @returns {Promise} - Promise với thông tin hệ thống file
     */
    async getFileSystemInfo() {
        return this._apiRequest('system/filesystem', { method: 'GET' });
    }
    
    /**
     * Kiểm tra xem đường dẫn có hợp lệ không
     * @param {string} path - Đường dẫn cần kiểm tra
     * @returns {Promise} - Promise với kết quả kiểm tra
     */
    async validatePath(path) {
        if (!path) {
            throw new Error('Đường dẫn là bắt buộc');
        }
        
        return this._apiRequest('path/validate', {
            method: 'POST',
            body: JSON.stringify({ path })
        });
    }
    
    /**
     * Định dạng kích thước file (helper method)
     * @param {number} bytes - Kích thước tính bằng bytes
     * @returns {string} - Chuỗi đã định dạng
     */
    formatFileSize(bytes) {
        if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
    }
}

// Tạo instance mặc định để sử dụng trong ứng dụng
const fileOperations = new FileOperations();

// Xuất module
window.FileOperations = FileOperations;
window.fileOperations = fileOperations; 