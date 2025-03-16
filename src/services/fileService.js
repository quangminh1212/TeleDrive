/**
 * TeleDrive - File Service
 * Dịch vụ quản lý file lưu trữ trên Telegram
 */

const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const telegramService = require('./telegramService');
const { log, generateId, formatSize, formatDate, getMimeType, guessFileType, ensureDirectoryExists } = require('../utils/helpers');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const dbService = require('./dbService');

// Đường dẫn đến file DB
const DB_PATH = path.join(config.STORAGE_PATH, 'db', 'files_db.json');

// Ensure temp directories exist
const tempDir = path.join(__dirname, '../../temp');
const downloadsDir = path.join(tempDir, 'downloads');
ensureDirectoryExists(downloadsDir);

/**
 * Đọc dữ liệu file từ DB
 * @returns {Array} Danh sách file
 */
function readFilesDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Nếu file DB không tồn tại, tạo file mới với mảng rỗng
      fs.writeFileSync(DB_PATH, JSON.stringify([]));
      return [];
    }

    const fileContent = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      log('DB không hợp lệ, đang reset', 'error');
      fs.writeFileSync(DB_PATH, JSON.stringify([]));
      return [];
    }

    return data;
  } catch (error) {
    log(`Lỗi khi đọc DB: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Lưu dữ liệu file vào DB
 * @param {Array} files Danh sách file cần lưu
 * @returns {Boolean} Kết quả lưu
 */
function saveFilesDb(files) {
  try {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(files, null, 2));
    return true;
  } catch (error) {
    log(`Lỗi khi lưu DB: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Lấy danh sách file từ DB
 * @param {Object} options Các tùy chọn lọc
 * @returns {Array} Danh sách file
 */
function getFiles(options = {}) {
  return dbService.getFiles(options);
}

/**
 * Thêm file từ Telegram vào DB
 * @param {Object} fileInfo Thông tin file từ Telegram
 * @returns {Object} Thông tin file đã thêm
 */
async function addFileFromTelegram(fileInfo) {
  try {
    const files = readFilesDb();
    
    // Kiểm tra file đã tồn tại chưa
    const existingFile = files.find(file => file.telegramFileId === fileInfo.file_id);
    
    if (existingFile) {
      log(`File ${fileInfo.file_name} đã tồn tại trong DB`, 'warning');
      return existingFile;
    }
    
    // Tạo thông tin file mới
    const newFile = {
      id: generateId(),
      name: fileInfo.file_name,
      size: fileInfo.file_size,
      type: guessFileType(fileInfo.file_name),
      mimeType: fileInfo.mime_type || getMimeType(fileInfo.file_name),
      telegramFileId: fileInfo.file_id,
      messageId: fileInfo.message_id,
      chatId: fileInfo.chat_id,
      uploadDate: new Date(fileInfo.date).toISOString(),
      caption: fileInfo.caption || '',
      localPath: null,
      downloadDate: null,
      isDeleted: false,
      inTrash: false,
      trashDate: null
    };
    
    // Thêm vào DB
    files.push(newFile);
    saveFilesDb(files);
    
    log(`Đã thêm file ${newFile.name} vào DB`);
    return newFile;
  } catch (error) {
    log(`Lỗi khi thêm file từ Telegram: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Đồng bộ danh sách file từ Telegram
 * @param {Array} telegramFiles Danh sách file từ Telegram
 * @returns {Object} Kết quả đồng bộ
 */
async function syncFilesFromTelegram(telegramFiles) {
  try {
    const files = readFilesDb();
    const result = {
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    };
    
    // Duyệt qua từng file từ Telegram
    for (const telegramFile of telegramFiles) {
      try {
        // Tìm file trong DB
        const existingFile = files.find(file => file.telegramFileId === telegramFile.file_id);
        
        if (!existingFile) {
          // Thêm file mới
          const newFile = {
            id: generateId(),
            name: telegramFile.file_name,
            size: telegramFile.file_size,
            type: guessFileType(telegramFile.file_name),
            mimeType: telegramFile.mime_type || getMimeType(telegramFile.file_name),
            telegramFileId: telegramFile.file_id,
            messageId: telegramFile.message_id,
            chatId: telegramFile.chat_id,
            uploadDate: new Date(telegramFile.date).toISOString(),
            caption: telegramFile.caption || '',
            localPath: null,
            downloadDate: null,
            isDeleted: false,
            inTrash: false,
            trashDate: null
          };
          
          files.push(newFile);
          result.added++;
          log(`Đồng bộ: Thêm file mới ${newFile.name}`);
        } else {
          // Cập nhật thông tin file nếu cần
          let hasChanges = false;
          
          // Chỉ cập nhật một số trường
          if (existingFile.size !== telegramFile.file_size) {
            existingFile.size = telegramFile.file_size;
            hasChanges = true;
          }
          
          if (existingFile.caption !== telegramFile.caption && telegramFile.caption) {
            existingFile.caption = telegramFile.caption;
            hasChanges = true;
          }
          
          // Khôi phục file đã xóa nếu tìm thấy lại
          if (existingFile.isDeleted) {
            existingFile.isDeleted = false;
            hasChanges = true;
          }
          
          if (hasChanges) {
            result.updated++;
            log(`Đồng bộ: Cập nhật file ${existingFile.name}`);
          } else {
            result.unchanged++;
          }
        }
      } catch (error) {
        log(`Lỗi khi đồng bộ file ${telegramFile.file_name}: ${error.message}`, 'error');
        result.errors++;
      }
    }
    
    // Lưu DB sau khi đồng bộ
    saveFilesDb(files);
    
    return result;
  } catch (error) {
    log(`Lỗi khi đồng bộ file từ Telegram: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Tải file từ Telegram
 * @param {String} fileId ID của file
 * @returns {Promise<Object>} Thông tin file đã tải
 */
async function downloadFile(fileId) {
  try {
    const files = readFilesDb();
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      throw new Error(`Không tìm thấy file với ID ${fileId}`);
    }
    
    // Kiểm tra thư mục tải về
    if (!fs.existsSync(config.DOWNLOAD_DIR)) {
      fs.mkdirSync(config.DOWNLOAD_DIR, { recursive: true });
    }
    
    // Tạo đường dẫn lưu file
    const savePath = path.join(config.DOWNLOAD_DIR, file.name);
    
    // Tải file từ Telegram
    const downloadResult = await telegramService.downloadFile(file.telegramFileId, savePath);
    
    // Cập nhật thông tin file
    file.localPath = savePath;
    file.downloadDate = new Date().toISOString();
    
    // Lưu lại DB
    saveFilesDb(files);
    
    return {
      ...file,
      downloadResult
    };
  } catch (error) {
    log(`Lỗi khi tải file: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Tải lên file lên Telegram
 * @param {String} filePath Đường dẫn file cần tải lên
 * @param {String} caption Chú thích cho file
 * @returns {Promise<Object>} Thông tin file đã tải lên
 */
async function uploadFile(filePath, caption = '') {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }
    
    // Tải file lên Telegram
    const telegramFile = await telegramService.sendFile(filePath, caption);
    
    // Thêm vào DB
    const files = readFilesDb();
    const fileName = path.basename(filePath);
    
    const newFile = {
      id: generateId(),
      name: fileName,
      size: telegramFile.file_size,
      type: guessFileType(fileName),
      mimeType: telegramFile.mime_type || getMimeType(fileName),
      telegramFileId: telegramFile.file_id,
      messageId: telegramFile.message_id,
      chatId: telegramFile.chat_id,
      uploadDate: new Date().toISOString(),
      caption: caption,
      localPath: filePath,
      downloadDate: null,
      isDeleted: false,
      inTrash: false,
      trashDate: null
    };
    
    files.push(newFile);
    saveFilesDb(files);
    
    return newFile;
  } catch (error) {
    log(`Lỗi khi tải lên file: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Lấy thông tin file theo ID
 * @param {String} fileId ID của file
 * @returns {Object} Thông tin file
 */
function getFileById(fileId) {
  return dbService.getFileById(fileId);
}

/**
 * Xóa file (chuyển vào thùng rác)
 * @param {String} fileId ID của file cần xóa
 * @returns {Object} Kết quả xóa file
 */
function trashFile(fileId) {
  return dbService.moveToTrash(fileId);
}

/**
 * Xóa file vĩnh viễn
 * @param {String} fileId ID của file cần xóa
 * @returns {Object} Kết quả xóa file
 */
function deleteFilePermanently(fileId) {
  return dbService.deleteFilePermanently(fileId);
}

/**
 * Khôi phục file từ thùng rác
 * @param {String} fileId ID của file cần khôi phục
 * @returns {Object} Kết quả khôi phục file
 */
function restoreFile(fileId) {
  return dbService.restoreFromTrash(fileId);
}

/**
 * Lấy danh sách file trong thùng rác
 * @returns {Array} Danh sách file trong thùng rác
 */
function getTrashFiles() {
  return dbService.getTrashFiles();
}

/**
 * Xóa toàn bộ file trong thùng rác
 * @returns {Object} Kết quả xóa thùng rác
 */
function emptyTrash() {
  return dbService.emptyTrash();
}

/**
 * Cập nhật thông tin file
 * @param {String} fileId ID của file cần cập nhật
 * @param {Object} updateData Dữ liệu cập nhật
 * @returns {Object} Kết quả cập nhật
 */
function updateFile(fileId, updateData) {
  return dbService.updateFile(fileId, updateData);
}

/**
 * Tạo thư mục ảo (folder)
 * @param {String} folderName Tên thư mục
 * @param {String} parentFolder Thư mục cha (nếu có)
 * @returns {Object} Thông tin thư mục đã tạo
 */
function createFolder(folderName, parentFolder = null) {
  const files = readFilesDb();
  
  // Tạo thư mục ảo
  const newFolder = {
    id: generateId(),
    name: folderName,
    type: 'folder',
    isFolder: true,
    parent: parentFolder,
    createdDate: new Date().toISOString(),
    isDeleted: false,
    inTrash: false,
    trashDate: null
  };
  
  files.push(newFolder);
  saveFilesDb(files);
  
  return newFolder;
}

/**
 * Di chuyển file vào thư mục
 * @param {String} fileId ID của file cần di chuyển
 * @param {String} folderId ID của thư mục đích
 * @returns {Object} Kết quả di chuyển
 */
function moveFileToFolder(fileId, folderId) {
  const files = readFilesDb();
  const fileIndex = files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    return {
      success: false,
      error: `Không tìm thấy file với ID ${fileId}`
    };
  }
  
  // Kiểm tra thư mục tồn tại (nếu folderId không phải null)
  if (folderId) {
    const folderExists = files.some(f => f.id === folderId && f.isFolder);
    
    if (!folderExists) {
      return {
        success: false,
        error: `Không tìm thấy thư mục với ID ${folderId}`
      };
    }
  }
  
  // Cập nhật thư mục cha của file
  files[fileIndex].parent = folderId;
  
  // Lưu lại DB
  const saved = saveFilesDb(files);
  
  return {
    success: saved,
    file: files[fileIndex]
  };
}

/**
 * Determine file type based on mime type
 * @param {string} mimeType - MIME type of the file
 * @returns {string} File type category
 */
const getFileType = (mimeType) => {
  if (!mimeType) return 'other';
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.includes('word') || 
      mimeType.includes('document') || 
      mimeType.includes('text/')) return 'document';
  
  if (mimeType.includes('zip') || 
      mimeType.includes('rar') || 
      mimeType.includes('tar') || 
      mimeType.includes('compressed')) return 'archive';
  
  return 'other';
};

/**
 * Get file by Telegram message ID
 * @param {number} messageId - Telegram message ID
 * @returns {Object|null} File object or null if not found
 */
const getFileByMessageId = async (messageId) => {
  return dbService.getFileByMessageId(messageId);
};

/**
 * Save a new file to the database
 * @param {Object} fileData - File data
 * @returns {Object} Saved file object
 */
const saveFile = async (fileData) => {
  // Determine file type from mime type
  const fileType = getFileType(fileData.mimeType);
  
  // Save to database
  return dbService.saveFile({
    ...fileData,
    type: fileType
  });
};

/**
 * Clean up old files in trash
 * @param {number} days - Days to keep files in trash
 * @returns {Object} Result with count of deleted files
 */
const cleanupTrash = async (days = 30) => {
  return dbService.cleanupTrash(days);
};

/**
 * Search files by query
 * @param {Object} options - Search options
 * @returns {Object} Search results and pagination
 */
const searchFiles = async (options = {}) => {
  return dbService.searchFiles(options);
};

/**
 * Get storage statistics
 * @returns {Object} Storage stats
 */
const getStorageStats = async () => {
  return dbService.getStorageStats();
};

/**
 * Get temporary file path for downloads
 * @param {Object} file - File object
 * @returns {string} Path to temporary file
 */
const getTempFilePath = (file) => {
  const fileExt = path.extname(file.name) || '';
  const fileName = `${file.id}${fileExt}`;
  return path.join(downloadsDir, fileName);
};

/**
 * Clean up temporary downloads directory
 * @param {number} maxAge - Maximum age in minutes
 * @returns {number} Number of files deleted
 */
const cleanupTempDownloads = async (maxAge = 60) => {
  try {
    const files = await fs.readdir(downloadsDir);
    let count = 0;
    
    const now = new Date();
    
    for (const file of files) {
      const filePath = path.join(downloadsDir, file);
      const stats = await fs.stat(filePath);
      
      const fileAge = (now - stats.mtime) / (1000 * 60); // Age in minutes
      
      if (fileAge > maxAge) {
        await fs.unlink(filePath);
        count++;
        log(`Deleted old temp file: ${file} (${fileAge.toFixed(2)} minutes old)`);
      }
    }
    
    return count;
  } catch (err) {
    log(`Error cleaning up temp downloads: ${err.message}`, 'error');
    return 0;
  }
};

/**
 * Move a file to trash
 * @param {string} fileId - ID of the file to trash
 * @returns {object} Updated file object
 */
const moveToTrash = (fileId) => {
  return trashFile(fileId);
};

/**
 * Restore a file from trash
 * @param {string} fileId - ID of the file to restore
 * @returns {object} Updated file object
 */
const restoreFromTrash = (fileId) => {
  return restoreFile(fileId);
};

module.exports = {
  getFiles,
  getFileById,
  getFileByMessageId,
  saveFile,
  updateFile,
  moveToTrash,
  restoreFromTrash,
  deleteFilePermanently,
  emptyTrash,
  cleanupTrash,
  searchFiles,
  getStorageStats,
  getTempFilePath,
  cleanupTempDownloads,
  getFileType,
  createFolder,
  moveFileToFolder
}; 