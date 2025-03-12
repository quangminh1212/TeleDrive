const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const logger = require('./logger');

class FileManager {
    constructor() {
        this.storagePath = process.env.STORAGE_PATH || './storage';
        this.userSessions = {}; // lưu trữ vị trí hiện tại của mỗi người dùng
    }

    // Lấy đường dẫn đầy đủ cho người dùng cụ thể
    getUserBasePath(userId) {
        return path.join(this.storagePath, 'users', userId.toString());
    }

    // Lấy đường dẫn thư mục hiện tại của người dùng
    getCurrentPath(userId) {
        if (!this.userSessions[userId]) {
            this.userSessions[userId] = '/';
        }
        
        return this.userSessions[userId];
    }

    // Đặt đường dẫn hiện tại cho người dùng
    setCurrentPath(userId, newPath) {
        this.userSessions[userId] = newPath;
        return newPath;
    }

    // Lấy đường dẫn tuyệt đối từ đường dẫn tương đối
    getAbsolutePath(userId, relativePath = '') {
        const currentPath = this.getCurrentPath(userId);
        let targetPath;

        if (relativePath.startsWith('/')) {
            // Nếu đường dẫn là đường dẫn tuyệt đối (bắt đầu bằng /)
            targetPath = relativePath;
        } else if (relativePath === '..') {
            // Di chuyển lên một cấp
            const parts = currentPath.split('/').filter(Boolean);
            if (parts.length === 0) {
                targetPath = '/';
            } else {
                parts.pop();
                targetPath = '/' + parts.join('/');
            }
        } else {
            // Đường dẫn tương đối
            if (currentPath === '/') {
                targetPath = '/' + relativePath;
            } else {
                targetPath = path.posix.join(currentPath, relativePath);
            }
        }

        // Đảm bảo đường dẫn bắt đầu bằng /
        if (!targetPath.startsWith('/')) {
            targetPath = '/' + targetPath;
        }

        // Đảm bảo đường dẫn không kết thúc bằng / trừ khi đó là thư mục gốc
        if (targetPath !== '/' && targetPath.endsWith('/')) {
            targetPath = targetPath.slice(0, -1);
        }

        const fullPath = path.join(this.getUserBasePath(userId), targetPath.slice(1));
        return { fullPath, relativePath: targetPath };
    }

    // Đảm bảo thư mục người dùng tồn tại
    ensureUserDirectory(userId) {
        const userPath = this.getUserBasePath(userId);
        fs.ensureDirSync(userPath);
        return userPath;
    }

    // Tạo thư mục mới
    createDirectory(userId, folderName) {
        const { fullPath: currentFullPath } = this.getAbsolutePath(userId);
        const newFolder = path.join(currentFullPath, folderName);
        
        try {
            fs.ensureDirSync(newFolder);
            logger.info(`Đã tạo thư mục: ${newFolder}`);
            return { success: true, path: newFolder };
        } catch (error) {
            logger.error(`Lỗi khi tạo thư mục ${newFolder}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Liệt kê nội dung thư mục
    listDirectory(userId, targetPath = '') {
        try {
            const { fullPath, relativePath } = this.getAbsolutePath(userId, targetPath);
            
            if (!fs.existsSync(fullPath)) {
                return { success: false, error: 'Thư mục không tồn tại' };
            }
            
            if (!fs.lstatSync(fullPath).isDirectory()) {
                return { success: false, error: 'Đường dẫn không phải là thư mục' };
            }
            
            const items = fs.readdirSync(fullPath);
            const contents = [];
            
            for (const item of items) {
                const itemPath = path.join(fullPath, item);
                const stats = fs.statSync(itemPath);
                
                contents.push({
                    name: item,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    relativePath: path.posix.join(relativePath, item)
                });
            }
            
            return { 
                success: true, 
                path: relativePath, 
                contents 
            };
        } catch (error) {
            logger.error(`Lỗi khi liệt kê thư mục: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Di chuyển đến thư mục khác
    changeDirectory(userId, targetPath) {
        try {
            const { fullPath, relativePath } = this.getAbsolutePath(userId, targetPath);
            
            if (!fs.existsSync(fullPath)) {
                return { success: false, error: 'Thư mục không tồn tại' };
            }
            
            if (!fs.lstatSync(fullPath).isDirectory()) {
                return { success: false, error: 'Đường dẫn không phải là thư mục' };
            }
            
            this.setCurrentPath(userId, relativePath);
            return { success: true, path: relativePath };
        } catch (error) {
            logger.error(`Lỗi khi thay đổi thư mục: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Lưu file từ Telegram
    async saveFile(userId, fileId, bot, fileName, fileType = 'document') {
        try {
            // Đảm bảo thư mục người dùng tồn tại
            this.ensureUserDirectory(userId);
            
            // Lấy thư mục hiện tại của người dùng
            const { fullPath: currentFullPath } = this.getAbsolutePath(userId);
            
            // Lấy thông tin file từ Telegram
            const fileInfo = await bot.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
            
            // Xác định tên file
            let finalFileName = fileName;
            if (!finalFileName) {
                // Nếu không có tên file, sử dụng tên từ đường dẫn hoặc tạo tên ngẫu nhiên
                const originalName = path.basename(fileInfo.file_path);
                finalFileName = originalName || `file_${Date.now()}`;
            }
            
            // Đường dẫn lưu file
            const filePath = path.join(currentFullPath, finalFileName);
            
            // Tải file về
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const buffer = await response.arrayBuffer();
            await fs.writeFile(filePath, Buffer.from(buffer));
            
            logger.info(`Đã lưu file: ${filePath}`);
            
            return {
                success: true,
                fileName: finalFileName,
                path: filePath,
                size: buffer.byteLength,
                mimeType: mime.lookup(filePath) || 'application/octet-stream'
            };
        } catch (error) {
            logger.error(`Lỗi khi lưu file: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Đọc và lấy thông tin file
    getFileInfo(userId, filePath) {
        try {
            const { fullPath } = this.getAbsolutePath(userId, filePath);
            
            if (!fs.existsSync(fullPath)) {
                return { success: false, error: 'File không tồn tại' };
            }
            
            if (fs.lstatSync(fullPath).isDirectory()) {
                return { success: false, error: 'Đường dẫn là thư mục, không phải file' };
            }
            
            const stats = fs.statSync(fullPath);
            
            return {
                success: true,
                name: path.basename(fullPath),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                mimeType: mime.lookup(fullPath) || 'application/octet-stream',
                path: fullPath
            };
        } catch (error) {
            logger.error(`Lỗi khi lấy thông tin file: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Lấy file để gửi qua Telegram
    getFileForSending(userId, filePath) {
        try {
            const { fullPath } = this.getAbsolutePath(userId, filePath);
            
            if (!fs.existsSync(fullPath)) {
                return { success: false, error: 'File không tồn tại' };
            }
            
            if (fs.lstatSync(fullPath).isDirectory()) {
                return { success: false, error: 'Đường dẫn là thư mục, không phải file' };
            }
            
            return {
                success: true,
                path: fullPath,
                name: path.basename(fullPath),
                stream: fs.createReadStream(fullPath)
            };
        } catch (error) {
            logger.error(`Lỗi khi lấy file để gửi: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Xóa file hoặc thư mục
    deleteItem(userId, itemPath) {
        try {
            const { fullPath } = this.getAbsolutePath(userId, itemPath);
            
            if (!fs.existsSync(fullPath)) {
                return { success: false, error: 'Đường dẫn không tồn tại' };
            }
            
            fs.removeSync(fullPath);
            logger.info(`Đã xóa: ${fullPath}`);
            
            return { success: true, path: itemPath };
        } catch (error) {
            logger.error(`Lỗi khi xóa: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Đổi tên file hoặc thư mục
    renameItem(userId, oldPath, newName) {
        try {
            const { fullPath: oldFullPath, relativePath: oldRelativePath } = this.getAbsolutePath(userId, oldPath);
            
            if (!fs.existsSync(oldFullPath)) {
                return { success: false, error: 'Đường dẫn không tồn tại' };
            }
            
            const dirName = path.dirname(oldFullPath);
            const newFullPath = path.join(dirName, newName);
            
            if (fs.existsSync(newFullPath)) {
                return { success: false, error: 'Tên mới đã tồn tại' };
            }
            
            fs.renameSync(oldFullPath, newFullPath);
            logger.info(`Đã đổi tên từ ${oldFullPath} thành ${newFullPath}`);
            
            const newRelativePath = path.posix.join(path.dirname(oldRelativePath), newName);
            
            return { 
                success: true, 
                oldPath: oldRelativePath, 
                newPath: newRelativePath 
            };
        } catch (error) {
            logger.error(`Lỗi khi đổi tên: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Tìm kiếm file hoặc thư mục
    searchItems(userId, searchTerm) {
        try {
            const userBasePath = this.getUserBasePath(userId);
            
            if (!fs.existsSync(userBasePath)) {
                return { success: false, error: 'Thư mục người dùng không tồn tại' };
            }
            
            const results = [];
            
            function searchDir(dirPath, relativeDirPath) {
                const items = fs.readdirSync(dirPath);
                
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const relativeItemPath = path.posix.join(relativeDirPath, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (item.toLowerCase().includes(searchTerm.toLowerCase())) {
                        results.push({
                            name: item,
                            isDirectory: stats.isDirectory(),
                            size: stats.size,
                            created: stats.birthtime,
                            modified: stats.mtime,
                            relativePath: relativeItemPath
                        });
                    }
                    
                    if (stats.isDirectory()) {
                        searchDir(itemPath, relativeItemPath);
                    }
                }
            }
            
            searchDir(userBasePath, '/');
            
            return { 
                success: true, 
                searchTerm, 
                results 
            };
        } catch (error) {
            logger.error(`Lỗi khi tìm kiếm: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new FileManager(); 