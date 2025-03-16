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
 * Đọc database các file
 * @returns {Array} Mảng chứa thông tin các file
 */
function readFilesDb() {
  try {
    const dbPath = config.paths.database;
    if (!fs.existsSync(dbPath)) {
      console.log(`Database không tồn tại tại ${dbPath}, tạo mới`);
      return [];
    }
    
    const data = fs.readFileSync(dbPath, 'utf8');
    const filesData = JSON.parse(data);
    
    if (!Array.isArray(filesData)) {
      console.error('Dữ liệu database không hợp lệ, yêu cầu là một mảng');
      return [];
    }
    
    return filesData;
  } catch (error) {
    console.error('Lỗi khi đọc database:', error);
    return [];
  }
}

/**
 * Lưu database các file
 * @param {Array} filesData Mảng chứa thông tin các file
 * @returns {Boolean} Kết quả lưu
 */
function saveFilesDb(filesData) {
  try {
    if (!Array.isArray(filesData)) {
      console.error('Dữ liệu cần lưu không hợp lệ, yêu cầu là một mảng');
      return false;
    }
    
    const dbPath = config.paths.database;
    // Đảm bảo thư mục cha tồn tại
    const dbDir = path.dirname(dbPath);
    ensureDirectories([dbDir]);
    
    const data = JSON.stringify(filesData, null, 2);
    fs.writeFileSync(dbPath, data, 'utf8');
    console.log(`Đã lưu database với ${filesData.length} file`);
    
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu database:', error);
    return false;
  }
}

/**
 * Đường dẫn bảo mật cho file
 * @param {String} fileName Tên file
 * @returns {String} Đường dẫn tới file
 */
function getSecureFilePath(fileName) {
  return path.join(config.paths.uploads, fileName);
}

/**
 * Đồng bộ file lên Telegram
 * @returns {Promise<Object>} Kết quả đồng bộ
 */
async function syncFiles() {
  console.log('===== BẮT ĐẦU ĐỒNG BỘ FILES =====');
  
  try {
    const bot = telegramService.getBot();
    const botActive = telegramService.isBotActive();
    
    if (!bot || !botActive) {
      console.log('Bot không hoạt động hoặc chưa kết nối, không thể đồng bộ files');
      return {
        success: false,
        error: 'Bot không hoạt động hoặc chưa kết nối'
      };
    }
    
    let filesData = readFilesDb();
    if (!filesData || !Array.isArray(filesData)) {
      console.log('Dữ liệu file không hợp lệ, tạo mới');
      filesData = [];
    }
    
    console.log(`Tổng số files trong database: ${filesData.length}`);
    
    // Lọc các file cần đồng bộ (chưa có fileId hoặc cần đồng bộ lại)
    const filesToSync = filesData.filter(file => {
      const needsSync = file.needsSync || !file.telegramFileId;
      const hasLocalPath = !!file.localPath;
      const fileExists = hasLocalPath && fs.existsSync(file.localPath);
      
      if (needsSync && !fileExists) {
        console.log(`File "${file.name}" cần đồng bộ nhưng không tồn tại tại đường dẫn: ${file.localPath}`);
        // Đánh dấu file là đã xóa nếu không tìm thấy
        file.deleted = true;
        file.needsSync = false;
      }
      
      return needsSync && fileExists;
    });
    
    console.log(`Tìm thấy ${filesToSync.length} file cần đồng bộ và tồn tại trên ổ đĩa`);
    
    if (filesToSync.length > 0) {
      console.log('Danh sách một số file cần đồng bộ:');
      filesToSync.slice(0, 5).forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.size} bytes)`);
        console.log(`   - Đường dẫn: ${file.localPath}`);
        console.log(`   - Trạng thái: ${file.needsSync ? 'Cần đồng bộ' : 'Chưa có fileId'}`);
        console.log(`   - Loại file: ${file.fileType}`);
      });
    } else {
      console.log('Không có file nào cần đồng bộ');
      return {
        success: true,
        syncedCount: 0,
        totalFiles: filesData.length,
        filesNeedingSync: 0
      };
    }
    
    // Đồng bộ từng file
    let syncedCount = 0;
    
    for (const file of filesToSync) {
      console.log(`Bắt đầu đồng bộ file "${file.name}"...`);
      
      try {
        // Lấy đường dẫn file
        const filePath = file.localPath;
        
        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(filePath)) {
          console.error(`File "${file.name}" không tồn tại tại đường dẫn: ${filePath}`);
          file.syncError = 'File không tồn tại';
          continue;
        }
        
        // Gửi file lên Telegram
        console.log(`Đang gửi file "${file.name}" lên Telegram...`);
        
        const result = await telegramService.sendFileToTelegram({
          path: filePath,
          name: file.name,
          type: file.fileType
        });
        
        console.log(`Đã nhận phản hồi từ Telegram cho file "${file.name}"`);
        
        // Lấy file_id dựa trên loại file
        let fileId = null;
        if (result.document) {
          fileId = result.document.file_id;
        } else if (result.photo) {
          fileId = result.photo[result.photo.length - 1].file_id;
        } else if (result.video) {
          fileId = result.video.file_id;
        } else if (result.audio) {
          fileId = result.audio.file_id;
        } else {
          throw new Error('Không thể lấy file_id từ kết quả gửi file');
        }
        
        if (!fileId) {
          throw new Error('Không nhận được file_id từ Telegram');
        }
        
        // Cập nhật thông tin file trong database
        file.telegramFileId = fileId;
        file.telegramMessageId = result.message_id;
        file.telegramChatId = config.telegram.chatId;
        file.syncedAt = new Date().toISOString();
        file.needsSync = false;
        file.syncError = null;
        file.fileStatus = 'local';
        
        syncedCount++;
        console.log(`Đã đồng bộ thành công file "${file.name}" lên Telegram`);
      } catch (error) {
        console.error(`Lỗi khi đồng bộ file "${file.name}":`, error.message);
        file.syncError = error.message;
      }
    }
    
    // Lưu lại database sau khi đồng bộ
    saveFilesDb(filesData);
    
    console.log(`===== KẾT THÚC QUÁ TRÌNH ĐỒNG BỘ =====`);
    console.log(`Đã đồng bộ thành công ${syncedCount}/${filesToSync.length} files với Telegram`);
    
    return {
      success: true,
      syncedCount: syncedCount,
      totalFiles: filesData.length,
      filesNeedingSync: filesToSync.length
    };
  } catch (error) {
    console.error('Lỗi đồng bộ files:', error);
    return {
      success: false,
      error: error.message || 'Lỗi server khi đồng bộ files'
    };
  }
}

/**
 * Đồng bộ một file cụ thể lên Telegram
 * @param {Object} file Thông tin file cần đồng bộ
 * @returns {Promise<Object>} Kết quả đồng bộ
 */
async function autoSyncFile(file) {
  try {
    if (!file || !file.localPath) {
      throw new Error('Thông tin file không hợp lệ');
    }
    
    const filePath = file.localPath;
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại tại đường dẫn: ${filePath}`);
    }
    
    // Gửi file lên Telegram
    const result = await telegramService.sendFileToTelegram({
      path: filePath,
      name: file.name,
      type: file.fileType
    });
    
    // Lấy file_id
    let fileId = null;
    if (result.document) {
      fileId = result.document.file_id;
    } else if (result.photo) {
      fileId = result.photo[result.photo.length - 1].file_id;
    } else if (result.video) {
      fileId = result.video.file_id;
    } else if (result.audio) {
      fileId = result.audio.file_id;
    } else {
      throw new Error('Không thể lấy file_id từ kết quả gửi file');
    }
    
    // Cập nhật thông tin file
    file.telegramFileId = fileId;
    file.telegramMessageId = result.message_id;
    file.telegramChatId = config.telegram.chatId;
    file.syncedAt = new Date().toISOString();
    file.needsSync = false;
    file.syncError = null;
    
    // Lưu lại database
    let filesData = readFilesDb();
    const fileIndex = filesData.findIndex(f => f.id === file.id);
    
    if (fileIndex !== -1) {
      filesData[fileIndex] = { ...filesData[fileIndex], ...file };
    } else {
      filesData.push(file);
    }
    
    saveFilesDb(filesData);
    
    return {
      success: true,
      fileId: fileId
    };
  } catch (error) {
    console.error(`Lỗi khi tự động đồng bộ file "${file.name}":`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Kiểm tra và sửa dữ liệu file
 * @returns {Promise<Object>} Kết quả kiểm tra
 */
async function checkFiles() {
  try {
    console.log('===== KIỂM TRA VÀ SỬA DỮ LIỆU FILES =====');
    const files = readFilesDb();
    
    // Thống kê ban đầu
    const stats = {
      total: files.length,
      fixed: 0,
      local: 0,
      telegram: 0,
      missing: 0,
      needsSync: 0
    };
    
    // Kiểm tra từng file
    for (const file of files) {
      // Kiểm tra file local
      const hasLocalFile = file.localPath && fs.existsSync(file.localPath);
      if (hasLocalFile) {
        stats.local++;
        file.fileStatus = 'local';
        
        // Nếu file tồn tại ở local nhưng chưa có trên Telegram, đánh dấu cần đồng bộ
        if (!file.telegramFileId) {
          file.needsSync = true;
          stats.needsSync++;
          stats.fixed++;
          console.log(`Đánh dấu file "${file.name}" cần đồng bộ lên Telegram`);
        }
      } else {
        if (file.localPath) {
          console.log(`File "${file.name}" không tồn tại tại đường dẫn: ${file.localPath}`);
        } else {
          console.log(`File "${file.name}" không có đường dẫn local`);
        }
        
        // Nếu file có trên Telegram, đánh dấu là telegram-only
        if (file.telegramFileId) {
          file.fileStatus = 'telegram';
          stats.telegram++;
        } else {
          // Nếu file không có ở cả local và Telegram, đánh dấu là missing
          file.fileStatus = 'missing';
          stats.missing++;
        }
      }
      
      // Đồng bộ ngay lập tức các file cần thiết
      if (file.needsSync && hasLocalFile) {
        console.log(`Thực hiện đồng bộ file "${file.name}" ngay lập tức`);
        try {
          await autoSyncFile(file);
          stats.fixed++;
          console.log(`Đã đồng bộ thành công file "${file.name}"`);
        } catch (error) {
          console.error(`Lỗi khi đồng bộ file "${file.name}":`, error);
        }
      }
    }
    
    // Lưu lại dữ liệu đã cập nhật
    saveFilesDb(files);
    console.log(`Đã kiểm tra và sửa ${stats.fixed} files`);
    
    return {
      success: true,
      message: `Đã kiểm tra và sửa ${stats.fixed} files`,
      stats: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Lỗi khi kiểm tra files:', error);
    return {
      success: false,
      error: error.message || 'Lỗi server khi kiểm tra files'
    };
  }
}

module.exports = {
  readFilesDb,
  saveFilesDb,
  getSecureFilePath,
  syncFiles,
  autoSyncFile,
  checkFiles
}; 