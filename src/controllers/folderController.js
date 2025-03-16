/**
 * TeleDrive - Controller quản lý thư mục
 * File này quản lý xử lý logic cho các route liên quan đến thư mục
 */

const fileService = require('../services/fileService');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Đọc danh sách thư mục từ DB
 * @returns {Array} Danh sách thư mục
 */
function readFoldersDb() {
  try {
    // Đường dẫn đến file cơ sở dữ liệu thư mục
    const dbPath = path.join(config.STORAGE_PATH, 'db', 'folders.json');
    
    // Nếu file không tồn tại, tạo file mới với mảng rỗng
    if (!fs.existsSync(dbPath)) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(dbPath, JSON.stringify([]));
      return [];
    }
    
    // Đọc file cơ sở dữ liệu
    const data = fs.readFileSync(dbPath, 'utf8');
    const folders = JSON.parse(data);
    
    // Kiểm tra xem dữ liệu có phải là mảng không
    if (!Array.isArray(folders)) {
      console.error('Dữ liệu thư mục không hợp lệ. Tạo mảng mới.');
      fs.writeFileSync(dbPath, JSON.stringify([]));
      return [];
    }
    
    return folders;
  } catch (error) {
    console.error('Lỗi khi đọc cơ sở dữ liệu thư mục:', error);
    return [];
  }
}

/**
 * Lưu danh sách thư mục vào DB
 * @param {Array} folders Danh sách thư mục cần lưu
 * @returns {boolean} Kết quả lưu
 */
function saveFoldersDb(folders) {
  try {
    // Kiểm tra xem folders có phải là mảng không
    if (!Array.isArray(folders)) {
      console.error('Dữ liệu thư mục cần lưu không hợp lệ.');
      return false;
    }
    
    // Đường dẫn đến file cơ sở dữ liệu thư mục
    const dbPath = path.join(config.STORAGE_PATH, 'db', 'folders.json');
    
    // Đảm bảo thư mục chứa file tồn tại
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Ghi dữ liệu vào file
    fs.writeFileSync(dbPath, JSON.stringify(folders, null, 2));
    console.log(`Đã lưu ${folders.length} thư mục vào cơ sở dữ liệu.`);
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu cơ sở dữ liệu thư mục:', error);
    return false;
  }
}

/**
 * Tạo ID duy nhất cho thư mục
 * @returns {string} ID thư mục
 */
function generateFolderId() {
  return 'folder_' + Date.now() + '_' + Math.round(Math.random() * 1000000);
}

/**
 * Lấy danh sách thư mục
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function getFolders(req, res) {
  try {
    const folders = readFoldersDb();
    
    // Lấy danh sách file để tính toán kích thước thư mục
    const files = fileService.readFilesDb();
    
    // Tính toán kích thước và số lượng file trong mỗi thư mục
    const foldersWithStats = folders.map(folder => {
      // Lọc file thuộc thư mục
      const folderFiles = files.filter(file => {
        const filePath = file.relativePath || '';
        return filePath === folder.path || filePath.startsWith(folder.path + '/');
      });
      
      // Tính tổng kích thước
      const totalSize = folderFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      
      // Trả về thư mục với thông tin bổ sung
      return {
        ...folder,
        fileCount: folderFiles.length,
        size: totalSize
      };
    });
    
    return res.json({
      success: true,
      folders: foldersWithStats,
      total: folders.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thư mục:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Tạo thư mục mới
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function createFolder(req, res) {
  try {
    const { name, parentPath } = req.body;
    
    // Kiểm tra tên thư mục
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tên thư mục không được để trống'
      });
    }
    
    // Chuẩn hóa tên thư mục (loại bỏ ký tự đặc biệt)
    const folderName = name.trim().replace(/[/\\?%*:|"<>]/g, '-');
    
    // Tạo đường dẫn thư mục
    let folderPath = folderName;
    if (parentPath && parentPath.trim() !== '') {
      folderPath = parentPath.trim() + '/' + folderName;
    }
    
    // Kiểm tra xem thư mục đã tồn tại chưa
    const folders = readFoldersDb();
    const folderExists = folders.some(folder => folder.path === folderPath);
    
    if (folderExists) {
      return res.status(400).json({
        success: false,
        error: 'Thư mục đã tồn tại'
      });
    }
    
    // Tạo thông tin thư mục mới
    const newFolder = {
      id: generateFolderId(),
      name: folderName,
      path: folderPath,
      parentPath: parentPath || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Thêm thư mục mới vào danh sách
    folders.push(newFolder);
    
    // Lưu danh sách thư mục
    saveFoldersDb(folders);
    
    // Tạo thư mục vật lý nếu cần
    const physicalPath = path.join(config.STORAGE_PATH, 'uploads', folderPath);
    if (!fs.existsSync(physicalPath)) {
      fs.mkdirSync(physicalPath, { recursive: true });
    }
    
    return res.json({
      success: true,
      folder: newFolder
    });
  } catch (error) {
    console.error('Lỗi khi tạo thư mục mới:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Đổi tên thư mục
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function renameFolder(req, res) {
  try {
    const folderId = req.params.id;
    const { newName } = req.body;
    
    // Kiểm tra tên thư mục mới
    if (!newName || newName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tên thư mục không được để trống'
      });
    }
    
    // Chuẩn hóa tên thư mục mới (loại bỏ ký tự đặc biệt)
    const folderNewName = newName.trim().replace(/[/\\?%*:|"<>]/g, '-');
    
    // Lấy danh sách thư mục
    const folders = readFoldersDb();
    
    // Tìm thư mục cần đổi tên
    const folderIndex = folders.findIndex(folder => folder.id === folderId);
    
    if (folderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Thư mục không tồn tại'
      });
    }
    
    const folder = folders[folderIndex];
    const oldPath = folder.path;
    
    // Tạo đường dẫn mới
    let newPath;
    if (folder.parentPath) {
      newPath = folder.parentPath + '/' + folderNewName;
    } else {
      newPath = folderNewName;
    }
    
    // Kiểm tra xem thư mục với tên mới đã tồn tại chưa
    const newPathExists = folders.some(f => f.path === newPath && f.id !== folderId);
    
    if (newPathExists) {
      return res.status(400).json({
        success: false,
        error: 'Thư mục với tên mới đã tồn tại'
      });
    }
    
    // Cập nhật tên và đường dẫn của thư mục
    folder.name = folderNewName;
    folder.path = newPath;
    folder.updatedAt = new Date().toISOString();
    
    // Cập nhật đường dẫn cho các thư mục con
    folders.forEach(f => {
      if (f.path.startsWith(oldPath + '/')) {
        f.path = newPath + f.path.substring(oldPath.length);
        if (f.parentPath === oldPath) {
          f.parentPath = newPath;
        } else if (f.parentPath.startsWith(oldPath + '/')) {
          f.parentPath = newPath + f.parentPath.substring(oldPath.length);
        }
        f.updatedAt = new Date().toISOString();
      }
    });
    
    // Lưu danh sách thư mục
    saveFoldersDb(folders);
    
    // Cập nhật đường dẫn tương đối của các file
    const files = fileService.readFilesDb();
    let fileUpdated = false;
    
    files.forEach(file => {
      if (file.relativePath === oldPath) {
        file.relativePath = newPath;
        fileUpdated = true;
      } else if (file.relativePath && file.relativePath.startsWith(oldPath + '/')) {
        file.relativePath = newPath + file.relativePath.substring(oldPath.length);
        fileUpdated = true;
      }
    });
    
    // Lưu danh sách file nếu có cập nhật
    if (fileUpdated) {
      fileService.saveFilesDb(files);
    }
    
    return res.json({
      success: true,
      folder: folder
    });
  } catch (error) {
    console.error('Lỗi khi đổi tên thư mục:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Xóa thư mục
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function deleteFolder(req, res) {
  try {
    const folderId = req.params.id;
    
    // Lấy danh sách thư mục
    const folders = readFoldersDb();
    
    // Tìm thư mục cần xóa
    const folderIndex = folders.findIndex(folder => folder.id === folderId);
    
    if (folderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Thư mục không tồn tại'
      });
    }
    
    const folder = folders[folderIndex];
    const folderPath = folder.path;
    
    // Kiểm tra xem thư mục có thư mục con không
    const hasSubfolders = folders.some(f => f.parentPath === folderPath);
    
    if (hasSubfolders) {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa thư mục có chứa thư mục con'
      });
    }
    
    // Lấy danh sách file trong thư mục
    const files = fileService.readFilesDb();
    const folderFiles = files.filter(file => file.relativePath === folderPath);
    
    // Kiểm tra xem thư mục có file không
    if (folderFiles.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa thư mục có chứa file'
      });
    }
    
    // Xóa thư mục khỏi danh sách
    folders.splice(folderIndex, 1);
    
    // Lưu danh sách thư mục
    saveFoldersDb(folders);
    
    return res.json({
      success: true,
      message: 'Thư mục đã được xóa thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa thư mục:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

module.exports = {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  readFoldersDb,
  saveFoldersDb
}; 