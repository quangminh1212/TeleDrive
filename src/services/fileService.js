/**
 * TeleDrive - Dịch vụ quản lý file
 * File này quản lý các thao tác với file và đồng bộ với Telegram
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/config');
const telegramService = require('./telegramService');
const { ensureDirectories, getFileType } = require('../utils/helpers');

/**
 * Đọc dữ liệu file từ database
 * @returns {Array} Danh sách các file
 */
function readFilesDb() {
  try {
    // Đường dẫn đến file cơ sở dữ liệu
    const dbPath = path.join(config.STORAGE_PATH, 'db', 'files.json');
    
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
    const files = JSON.parse(data);
    
    // Kiểm tra xem dữ liệu có phải là mảng không
    if (!Array.isArray(files)) {
      console.error('Dữ liệu file không hợp lệ. Tạo mảng mới.');
      fs.writeFileSync(dbPath, JSON.stringify([]));
      return [];
    }
    
    return files;
  } catch (error) {
    console.error('Lỗi khi đọc cơ sở dữ liệu file:', error);
    return [];
  }
}

/**
 * Lưu dữ liệu file vào database
 * @param {Array} files Danh sách các file cần lưu
 * @returns {boolean} Kết quả lưu
 */
function saveFilesDb(files) {
  try {
    // Kiểm tra xem files có phải là mảng không
    if (!Array.isArray(files)) {
      console.error('Dữ liệu file cần lưu không hợp lệ.');
      return false;
    }
    
    // Đường dẫn đến file cơ sở dữ liệu
    const dbPath = path.join(config.STORAGE_PATH, 'db', 'files.json');
    
    // Đảm bảo thư mục chứa file tồn tại
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Ghi dữ liệu vào file
    fs.writeFileSync(dbPath, JSON.stringify(files, null, 2));
    console.log(`Đã lưu ${files.length} file vào cơ sở dữ liệu.`);
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu cơ sở dữ liệu file:', error);
    return false;
  }
}

/**
 * Tạo đường dẫn an toàn cho file
 * @param {string} fileName Tên file
 * @returns {string} Đường dẫn an toàn
 */
function getSecureFilePath(fileName) {
  return crypto.createHash('md5').update(fileName + Date.now()).digest('hex');
}

/**
 * Đồng bộ files với Telegram
 * @returns {Object} Kết quả đồng bộ
 */
async function syncFiles() {
  try {
    console.log('===== BẮT ĐẦU ĐỒNG BỘ FILES =====');
    
    // Kiểm tra bot hoạt động
    if (!telegramService.isBotActive()) {
      console.log('Bot không hoạt động. Không thể đồng bộ files.');
      return {
        success: false,
        error: 'Bot không hoạt động',
        botToken: process.env.BOT_TOKEN ? '***' + process.env.BOT_TOKEN.slice(-8) : null,
        chatId: process.env.CHAT_ID || null
      };
    }
    
    // Đọc danh sách file từ cơ sở dữ liệu
    const files = readFilesDb();
    console.log(`Tổng số file: ${files.length}`);
    
    // Lọc các file cần đồng bộ
    const filesToSync = files.filter(file => {
      // File cần đồng bộ nếu:
      // 1. Cờ needsSync được bật
      // 2. Hoặc chưa có telegramFileId (chưa được đồng bộ)
      // 3. Và phải có đường dẫn cục bộ (localPath)
      // 4. Và file phải tồn tại trên đĩa
      
      if (!file.localPath) {
        console.log(`File ${file.name || 'Không rõ'} không có đường dẫn cục bộ. Bỏ qua.`);
        return false;
      }
      
      const needsSync = file.needsSync || !file.telegramFileId;
      
      // Kiểm tra file có tồn tại trên đĩa không
      const fileExists = fs.existsSync(file.localPath);
      
      if (!fileExists) {
        console.log(`File ${file.name} (${file.localPath}) không tồn tại trên đĩa. Bỏ qua.`);
        
        // Đánh dấu file bị xóa nếu không tồn tại
        if (!file.deleted) {
          file.deleted = true;
          file.deleteDate = new Date().toISOString();
          file.fileStatus = 'missing';
        }
        
        return false;
      }
      
      return needsSync;
    });
    
    console.log(`Số file cần đồng bộ: ${filesToSync.length}`);
    
    if (filesToSync.length === 0) {
      console.log('Không có file nào cần đồng bộ.');
      
      // Lưu lại trạng thái đã xóa (nếu có thay đổi)
      saveFilesDb(files);
      
      return {
        success: true,
        syncedCount: 0,
        totalCount: files.length,
        message: 'Không có file nào cần đồng bộ'
      };
    }
    
    // Đồng bộ từng file
    const syncResults = [];
    let syncedCount = 0;
    
    for (const file of filesToSync) {
      try {
        console.log(`Đang đồng bộ file: ${file.name}`);
        
        // Cập nhật trạng thái file
        file.fileStatus = 'syncing';
        file.syncDate = new Date().toISOString();
        
        // Gửi file lên Telegram
        const result = await telegramService.sendFileToTelegram(file.localPath, file.name);
        
        if (result.success) {
          // Cập nhật thông tin file
          file.telegramFileId = result.fileId;
          file.telegramMessageId = result.messageId;
          file.needsSync = false;
          file.fileStatus = 'synced';
          file.lastSyncDate = new Date().toISOString();
          syncedCount++;
          
          syncResults.push({
            file: file.name,
            success: true,
            telegramFileId: result.fileId
          });
          
          console.log(`Đồng bộ thành công file: ${file.name}`);
        } else {
          // Cập nhật thông tin lỗi
          file.needsSync = true;
          file.fileStatus = 'error';
          file.syncError = result.error;
          
          syncResults.push({
            file: file.name,
            success: false,
            error: result.error
          });
          
          console.error(`Lỗi khi đồng bộ file ${file.name}: ${result.error}`);
        }
      } catch (error) {
        // Cập nhật thông tin lỗi
        file.needsSync = true;
        file.fileStatus = 'error';
        file.syncError = error.message || 'Lỗi không xác định';
        
        syncResults.push({
          file: file.name,
          success: false,
          error: error.message || 'Lỗi không xác định'
        });
        
        console.error(`Lỗi khi đồng bộ file ${file.name}:`, error);
      }
    }
    
    // Lưu cập nhật vào cơ sở dữ liệu
    saveFilesDb(files);
    
    console.log(`Kết thúc đồng bộ. Đã đồng bộ thành công ${syncedCount}/${filesToSync.length} file.`);
    
    return {
      success: true,
      syncedCount,
      totalCount: filesToSync.length,
      details: syncResults
    };
  } catch (error) {
    console.error('Lỗi khi đồng bộ files:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định khi đồng bộ files'
    };
  }
}

/**
 * Đồng bộ một file cụ thể với Telegram
 * @param {Object} file Thông tin file cần đồng bộ
 * @returns {Object} Kết quả đồng bộ
 */
async function autoSyncFile(file) {
  try {
    console.log(`===== TỰ ĐỘNG ĐỒNG BỘ FILE: ${file.name} =====`);
    
    // Đảm bảo có đủ thông tin file
    if (!file || !file.localPath || !file.name) {
      return {
        success: false,
        error: 'Thông tin file không đầy đủ'
      };
    }
    
    // Kiểm tra bot hoạt động
    if (!telegramService.isBotActive()) {
      console.log('Bot không hoạt động. Không thể đồng bộ file.');
      return {
        success: false,
        error: 'Bot không hoạt động'
      };
    }
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(file.localPath)) {
      console.log(`File ${file.name} (${file.localPath}) không tồn tại. Không thể đồng bộ.`);
      return {
        success: false,
        error: 'File không tồn tại'
      };
    }
    
    // Gửi file lên Telegram
    const result = await telegramService.sendFileToTelegram(file.localPath, file.name);
    
    if (result.success) {
      // Cập nhật thông tin file
      file.telegramFileId = result.fileId;
      file.telegramMessageId = result.messageId;
      file.needsSync = false;
      file.fileStatus = 'synced';
      file.lastSyncDate = new Date().toISOString();
      
      // Cập nhật thông tin trong database
      const files = readFilesDb();
      const fileIndex = files.findIndex(f => f.id === file.id);
      
      if (fileIndex !== -1) {
        files[fileIndex] = {
          ...files[fileIndex],
          ...file
        };
        saveFilesDb(files);
      }
      
      console.log(`Đồng bộ thành công file: ${file.name}`);
      return {
        success: true,
        fileId: result.fileId,
        file: file.name
      };
    } else {
      console.error(`Lỗi khi đồng bộ file ${file.name}: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Lỗi khi tự động đồng bộ file:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Kiểm tra và sửa dữ liệu file
 * @returns {Object} Kết quả kiểm tra
 */
async function checkFiles() {
  try {
    console.log('===== KIỂM TRA VÀ SỬA DỮ LIỆU FILE =====');
    
    // Đọc danh sách file từ database
    const files = readFilesDb();
    console.log(`Tổng số file: ${files.length}`);
    
    const stats = {
      total: files.length,
      missing: 0,
      fixed: 0,
      needsSync: 0,
      telegramOnly: 0,
      localOnly: 0,
      synced: 0
    };
    
    // Kiểm tra từng file
    for (const file of files) {
      try {
        // Đảm bảo các trường cơ bản
        if (!file.id) {
          file.id = getSecureFilePath(file.name || 'unknown');
        }
        
        if (!file.uploadDate) {
          file.uploadDate = new Date().toISOString();
        }
        
        // Kiểm tra file local
        let localExists = false;
        if (file.localPath) {
          localExists = fs.existsSync(file.localPath);
          
          if (!localExists) {
            console.log(`File ${file.name} không tồn tại ở đường dẫn: ${file.localPath}`);
            file.fileStatus = file.telegramFileId ? 'telegram' : 'missing';
            stats.missing++;
          }
        }
        
        // Xác định trạng thái file
        if (file.telegramFileId && localExists) {
          file.fileStatus = 'synced';
          stats.synced++;
        } else if (file.telegramFileId && !localExists) {
          file.fileStatus = 'telegram';
          stats.telegramOnly++;
        } else if (!file.telegramFileId && localExists) {
          file.fileStatus = 'local';
          file.needsSync = true;
          stats.localOnly++;
          stats.needsSync++;
        } else {
          file.fileStatus = 'missing';
          stats.missing++;
        }
        
        // Đánh dấu các file cần đồng bộ
        if (localExists && (!file.telegramFileId || file.needsSync)) {
          file.needsSync = true;
          if (!stats.needsSync) {
            stats.needsSync++;
          }
        }
        
        stats.fixed++;
      } catch (error) {
        console.error(`Lỗi khi kiểm tra file ${file.name || 'Không rõ'}:`, error);
      }
    }
    
    // Lưu lại thay đổi vào database
    saveFilesDb(files);
    
    console.log('Kết quả kiểm tra file:', stats);
    
    return {
      success: true,
      stats,
      message: `Đã kiểm tra ${stats.total} file, sửa ${stats.fixed} file`
    };
  } catch (error) {
    console.error('Lỗi khi kiểm tra và sửa dữ liệu file:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Xóa file
 * @param {string} fileId ID của file cần xóa
 * @param {boolean} permanently Xóa vĩnh viễn hay chỉ đưa vào thùng rác
 * @returns {Object} Kết quả xóa
 */
function deleteFile(fileId, permanently = false) {
  try {
    console.log(`===== XÓA FILE ${permanently ? 'VĨNH VIỄN' : 'VÀO THÙNG RÁC'} =====`);
    
    // Đọc danh sách file từ database
    const files = readFilesDb();
    
    // Tìm file cần xóa
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
      return {
        success: false,
        error: 'File không tồn tại'
      };
    }
    
    const file = files[fileIndex];
    
    if (permanently) {
      // Xóa file khỏi đĩa nếu tồn tại
      if (file.localPath && fs.existsSync(file.localPath)) {
        fs.unlinkSync(file.localPath);
        console.log(`Đã xóa file khỏi đĩa: ${file.localPath}`);
      }
      
      // Xóa file khỏi database
      files.splice(fileIndex, 1);
      console.log(`Đã xóa file khỏi database: ${file.name}`);
    } else {
      // Đánh dấu file đã bị xóa (vào thùng rác)
      file.deleted = true;
      file.deleteDate = new Date().toISOString();
      console.log(`Đã chuyển file vào thùng rác: ${file.name}`);
    }
    
    // Lưu thay đổi vào database
    saveFilesDb(files);
    
    return {
      success: true,
      permanently,
      message: permanently 
        ? `Đã xóa vĩnh viễn file: ${file.name}` 
        : `Đã chuyển file vào thùng rác: ${file.name}`
    };
  } catch (error) {
    console.error('Lỗi khi xóa file:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Khôi phục file từ thùng rác
 * @param {string} fileId ID của file cần khôi phục
 * @returns {Object} Kết quả khôi phục
 */
function restoreFile(fileId) {
  try {
    console.log(`===== KHÔI PHỤC FILE TỪ THÙNG RÁC =====`);
    
    // Đọc danh sách file từ database
    const files = readFilesDb();
    
    // Tìm file cần khôi phục
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
      return {
        success: false,
        error: 'File không tồn tại'
      };
    }
    
    const file = files[fileIndex];
    
    // Kiểm tra xem file có ở trong thùng rác không
    if (!file.deleted) {
      return {
        success: false,
        error: 'File không ở trong thùng rác'
      };
    }
    
    // Khôi phục file từ thùng rác
    file.deleted = false;
    delete file.deleteDate;
    
    // Lưu thay đổi vào database
    saveFilesDb(files);
    
    console.log(`Đã khôi phục file từ thùng rác: ${file.name}`);
    
    return {
      success: true,
      message: `Đã khôi phục file: ${file.name}`
    };
  } catch (error) {
    console.error('Lỗi khi khôi phục file:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Làm trống thùng rác
 * @returns {Object} Kết quả làm trống thùng rác
 */
function emptyTrash() {
  try {
    console.log(`===== LÀM TRỐNG THÙNG RÁC =====`);
    
    // Đọc danh sách file từ database
    const files = readFilesDb();
    
    // Lọc ra các file đã bị xóa (trong thùng rác)
    const trashedFiles = files.filter(file => file.deleted);
    
    if (trashedFiles.length === 0) {
      return {
        success: true,
        message: 'Thùng rác trống. Không có file nào để xóa.'
      };
    }
    
    console.log(`Số file trong thùng rác: ${trashedFiles.length}`);
    
    // Xóa các file khỏi đĩa
    for (const file of trashedFiles) {
      if (file.localPath && fs.existsSync(file.localPath)) {
        try {
          fs.unlinkSync(file.localPath);
          console.log(`Đã xóa file khỏi đĩa: ${file.localPath}`);
        } catch (error) {
          console.error(`Lỗi khi xóa file ${file.localPath}:`, error);
        }
      }
    }
    
    // Lọc ra các file không bị xóa (không ở trong thùng rác)
    const remainingFiles = files.filter(file => !file.deleted);
    
    // Lưu lại danh sách file không bị xóa
    saveFilesDb(remainingFiles);
    
    console.log(`Đã xóa ${trashedFiles.length} file khỏi thùng rác.`);
    
    return {
      success: true,
      deletedCount: trashedFiles.length,
      message: `Đã xóa ${trashedFiles.length} file khỏi thùng rác.`
    };
  } catch (error) {
    console.error('Lỗi khi làm trống thùng rác:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

module.exports = {
  readFilesDb,
  saveFilesDb,
  syncFiles,
  autoSyncFile,
  checkFiles,
  deleteFile,
  restoreFile,
  emptyTrash,
  getSecureFilePath
}; 