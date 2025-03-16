/**
 * TeleDrive - File Service
 * File này chứa các hàm quản lý file
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const telegramService = require('./telegramService');
const { getMimeType, guessFileType } = require('../utils/helpers');

// Đường dẫn đến file DB
const DB_PATH = path.join(config.STORAGE_PATH, 'db', 'files_db.json');

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
      console.error('DB không hợp lệ, đang reset');
      fs.writeFileSync(DB_PATH, JSON.stringify([]));
      return [];
    }

    return data;
  } catch (error) {
    console.error('Lỗi khi đọc DB:', error);
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
    console.error('Lỗi khi lưu DB:', error);
    return false;
  }
}

/**
 * Tạo đường dẫn an toàn cho file
 * @param {String} fileName Tên file
 * @returns {String} Đường dẫn an toàn
 */
function getSecureFilePath(fileName) {
  return fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

/**
 * Đồng bộ tất cả các file với Telegram
 * @returns {Object} Kết quả đồng bộ
 */
async function syncFiles() {
  console.log('===== BẮT ĐẦU ĐỒNG BỘ FILES =====');
  
  // Đọc danh sách file
  const filesData = readFilesDb();
  
  // Khởi tạo biến đếm
  let syncedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let newFiles = 0;
  
  // Kiểm tra xem bot có hoạt động không
  const botActive = telegramService.isBotActive();
  if (!botActive) {
    console.log('Bot không hoạt động, không thể đồng bộ');
    return {
      success: false,
      error: 'Bot không hoạt động',
      syncedCount,
      errorCount,
      skippedCount,
      newFiles
    };
  }
  
  try {
    // PHẦN 1: ĐỒNG BỘ TỪ LOCAL LÊN TELEGRAM
    console.log('===== ĐỒNG BỘ TỪ LOCAL LÊN TELEGRAM =====');
    
    // Lặp qua từng file trong DB để đồng bộ lên Telegram nếu cần
    for (const file of filesData) {
      try {
        // Kiểm tra xem file có cần đồng bộ không
        if (!file.needsSync && file.telegramFileId) {
          skippedCount++;
          continue;
        }
        
        // Kiểm tra file có tồn tại ở local không
        if (!file.localPath || !fs.existsSync(file.localPath)) {
          console.log(`File ${file.name} không tồn tại ở local, bỏ qua`);
          skippedCount++;
          continue;
        }
        
        console.log(`Đang đồng bộ file: ${file.name}`);
        
        // Gửi file lên Telegram
        const fileSize = fs.statSync(file.localPath).size;
        
        // Nếu file quá lớn thì bỏ qua
        if (fileSize > config.MAX_FILE_SIZE) {
          console.log(`File ${file.name} quá lớn (${fileSize} bytes), bỏ qua`);
          file.needsSync = false;
          skippedCount++;
          continue;
        }
        
        // Gửi file lên Telegram
        const result = await telegramService.sendFileToTelegram(file.localPath, file.name);
        
        if (result.success) {
          // Cập nhật thông tin file
          file.telegramFileId = result.fileId;
          file.telegramUrl = result.fileUrl;
          file.needsSync = false;
          file.fileStatus = 'synced';
          
          syncedCount++;
          console.log(`Đã đồng bộ thành công file lên Telegram: ${file.name}`);
        } else {
          errorCount++;
          console.error(`Lỗi khi đồng bộ file ${file.name} lên Telegram:`, result.error);
        }
      } catch (error) {
        errorCount++;
        console.error(`Lỗi khi đồng bộ file ${file.name}:`, error);
      }
    }
    
    // PHẦN 2: ĐỒNG BỘ TỪ TELEGRAM XUỐNG LOCAL
    console.log('===== ĐỒNG BỘ TỪ TELEGRAM XUỐNG LOCAL =====');
    
    try {
      // Lấy danh sách file từ chat Telegram
      const telegramFiles = await telegramService.getFilesFromChat();
      
      if (telegramFiles && telegramFiles.length > 0) {
        console.log(`Tìm thấy ${telegramFiles.length} file trên Telegram`);
        
        // Lặp qua từng file trên Telegram
        for (const telegramFile of telegramFiles) {
          try {
            // Kiểm tra xem file đã tồn tại trong DB chưa
            const existingFile = filesData.find(f => f.telegramFileId === telegramFile.fileId);
            
            if (!existingFile) {
              // Tạo đường dẫn lưu file
              const downloadDir = path.join(config.STORAGE_PATH, 'downloads');
              if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
              }
              
              // Tải file về nếu cấu hình cho phép
              if (config.AUTO_DOWNLOAD_BOT_FILES === 'true') {
                const filePath = path.join(downloadDir, telegramFile.fileName);
                
                // Tải file về
                const downloadResult = await telegramService.downloadFileFromTelegram(
                  telegramFile.fileId, filePath
                );
                
                if (downloadResult.success) {
                  // Tạo record file mới
                  const newFile = {
                    id: require('crypto').randomUUID(),
                    name: telegramFile.fileName,
                    displayName: telegramFile.fileName,
                    size: telegramFile.fileSize,
                    fileSize: telegramFile.fileSize,
                    uploadDate: new Date().toISOString(),
                    fileType: telegramFile.fileType || 'application/octet-stream',
                    telegramFileId: telegramFile.fileId,
                    telegramUrl: telegramFile.fileUrl,
                    localPath: filePath,
                    fileStatus: 'active',
                    needsSync: false,
                    isDeleted: false
                  };
                  
                  // Thêm file vào DB
                  filesData.push(newFile);
                  newFiles++;
                  
                  console.log(`Đã tải và thêm file mới từ Telegram: ${telegramFile.fileName}`);
                } else {
                  console.error(`Lỗi khi tải file ${telegramFile.fileName} từ Telegram:`, downloadResult.error);
                  errorCount++;
                }
              } else {
                // Chỉ thêm thông tin vào DB mà không tải file về
                const newFile = {
                  id: require('crypto').randomUUID(),
                  name: telegramFile.fileName,
                  displayName: telegramFile.fileName,
                  size: telegramFile.fileSize,
                  fileSize: telegramFile.fileSize,
                  uploadDate: new Date().toISOString(),
                  fileType: telegramFile.fileType || 'application/octet-stream',
                  telegramFileId: telegramFile.fileId,
                  telegramUrl: telegramFile.fileUrl,
                  fileStatus: 'telegram_only',
                  needsSync: false,
                  isDeleted: false
                };
                
                // Thêm file vào DB
                filesData.push(newFile);
                newFiles++;
                
                console.log(`Đã thêm thông tin file từ Telegram (không tải về): ${telegramFile.fileName}`);
              }
            } else {
              // File đã tồn tại, kiểm tra xem có cần cập nhật không
              if (!existingFile.localPath || !fs.existsSync(existingFile.localPath)) {
                if (config.AUTO_DOWNLOAD_BOT_FILES === 'true') {
                  // Tạo đường dẫn lưu file
                  const downloadDir = path.join(config.STORAGE_PATH, 'downloads');
                  if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                  }
                  
                  const filePath = path.join(downloadDir, existingFile.name);
                  
                  // Tải file về
                  const downloadResult = await telegramService.downloadFileFromTelegram(
                    telegramFile.fileId, filePath
                  );
                  
                  if (downloadResult.success) {
                    // Cập nhật thông tin file
                    existingFile.localPath = filePath;
                    existingFile.fileStatus = 'active';
                    syncedCount++;
                    
                    console.log(`Đã tải file từ Telegram về local: ${existingFile.name}`);
                  } else {
                    console.error(`Lỗi khi tải file ${existingFile.name} từ Telegram:`, downloadResult.error);
                    errorCount++;
                  }
                }
              } else {
                skippedCount++;
              }
            }
          } catch (error) {
            errorCount++;
            console.error(`Lỗi khi xử lý file ${telegramFile.fileName} từ Telegram:`, error);
          }
        }
      } else {
        console.log('Không tìm thấy file nào trên Telegram hoặc không thể lấy danh sách file');
      }
    } catch (error) {
      console.error('Lỗi khi đồng bộ từ Telegram xuống local:', error);
      errorCount++;
    }
    
    // Lưu lại danh sách file đã cập nhật
    saveFilesDb(filesData);
    
    console.log(`===== KẾT THÚC ĐỒNG BỘ FILES =====`);
    console.log(`Đã đồng bộ: ${syncedCount} | File mới: ${newFiles} | Lỗi: ${errorCount} | Bỏ qua: ${skippedCount}`);
    
    return {
      success: true,
      syncedCount,
      errorCount,
      skippedCount,
      newFiles
    };
  } catch (error) {
    console.error('Lỗi khi đồng bộ files:', error);
    return {
      success: false,
      error: error.message,
      syncedCount,
      errorCount,
      skippedCount,
      newFiles
    };
  }
}

/**
 * Đồng bộ một file cụ thể với Telegram
 * @param {Object} file Thông tin file cần đồng bộ
 * @returns {Object} Kết quả đồng bộ
 */
async function autoSyncFile(file) {
  console.log(`===== TỰ ĐỘNG ĐỒNG BỘ FILE ${file.name} =====`);
  
  try {
    // Kiểm tra xem bot có hoạt động không
    const botActive = telegramService.isBotActive();
    if (!botActive) {
      console.log('Bot không hoạt động, không thể đồng bộ');
      return {
        success: false,
        error: 'Bot không hoạt động'
      };
    }
    
    // Kiểm tra file có tồn tại ở local không
    if (!file.localPath || !fs.existsSync(file.localPath)) {
      console.log(`File ${file.name} không tồn tại ở local, bỏ qua`);
      return {
        success: false,
        error: 'File không tồn tại ở local'
      };
    }
    
    // Kiểm tra kích thước file
    const fileSize = fs.statSync(file.localPath).size;
    
    // Nếu file quá lớn thì bỏ qua
    if (fileSize > config.MAX_FILE_SIZE) {
      console.log(`File ${file.name} quá lớn (${fileSize} bytes), bỏ qua`);
      return {
        success: false,
        error: 'File quá lớn'
      };
    }
    
    // Gửi file lên Telegram
    const result = await telegramService.sendFileToTelegram(file.localPath, file.name);
    
    if (result.success) {
      // Cập nhật thông tin file
      const filesData = readFilesDb();
      const fileIndex = filesData.findIndex(f => f.id === file.id);
      
      if (fileIndex !== -1) {
        filesData[fileIndex].telegramFileId = result.fileId;
        filesData[fileIndex].telegramUrl = result.fileUrl;
        filesData[fileIndex].needsSync = false;
        filesData[fileIndex].fileStatus = 'synced';
        
        // Lưu lại danh sách file đã cập nhật
        saveFilesDb(filesData);
      }
      
      console.log(`Đã đồng bộ thành công file: ${file.name}`);
      
      return {
        success: true,
        fileId: result.fileId
      };
    } else {
      console.error(`Lỗi khi đồng bộ file ${file.name}:`, result.error);
      
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error(`Lỗi khi đồng bộ file ${file.name}:`, error);
    
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
    console.log('===== KIỂM TRA VÀ SỬA DỮ LIỆU FILES =====');
    const files = readFilesDb();
    
    // Thống kê ban đầu
    const stats = {
      total: files.length,
      fixed: 0,
      missing: 0,
      local: 0,
      telegram: 0,
      needsSync: 0
    };
    
    // Kiểm tra từng file
    for (const file of files) {
      const hasLocalFile = file.localPath && fs.existsSync(file.localPath);
      
      // Kiểm tra và cập nhật trạng thái file
      if (hasLocalFile) {
        file.fileStatus = 'local';
        stats.local++;
        
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
    console.error('Lỗi khi kiểm tra và sửa dữ liệu files:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Dọn dẹp files không sử dụng
 * @returns {Object} Kết quả dọn dẹp
 */
async function cleanupFiles() {
  try {
    console.log('===== BẮT ĐẦU DỌN DẸP FILES =====');
    
    // Đọc danh sách file từ DB
    const filesData = readFilesDb();
    
    // Thống kê ban đầu
    const stats = {
      total: filesData.length,
      cleaned: 0,
      errors: 0
    };
    
    // Tạo danh sách các file đã lưu trong DB
    const dbFiles = new Set();
    filesData.forEach(file => {
      if (file.localPath) {
        dbFiles.add(file.localPath);
      }
    });
    
    // Tìm các file trong thư mục uploads không có trong DB
    const uploadsDir = path.join(config.STORAGE_PATH, 'uploads');
    
    function scanDirectory(dir) {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // Đệ quy vào thư mục con
            scanDirectory(itemPath);
          } else if (stats.isFile()) {
            // Kiểm tra xem file có trong DB không
            if (!dbFiles.has(itemPath)) {
              // Nếu không có trong DB, xóa file
              try {
                fs.unlinkSync(itemPath);
                console.log(`Đã xóa file thừa: ${itemPath}`);
                stats.cleaned++;
              } catch (error) {
                console.error(`Không thể xóa file ${itemPath}:`, error);
                stats.errors++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Lỗi khi quét thư mục ${dir}:`, error);
      }
    }
    
    // Bắt đầu quét từ thư mục uploads
    if (fs.existsSync(uploadsDir)) {
      scanDirectory(uploadsDir);
    }
    
    // Dọn dẹp thư mục temp
    const tempDir = path.join(config.STORAGE_PATH, 'temp');
    if (fs.existsSync(tempDir)) {
      try {
        const tempFiles = fs.readdirSync(tempDir);
        
        for (const file of tempFiles) {
          const filePath = path.join(tempDir, file);
          const fileStats = fs.statSync(filePath);
          
          // Xóa các file tạm đã tồn tại hơn 1 ngày
          const fileAge = Date.now() - fileStats.mtime.getTime();
          if (fileAge > 24 * 60 * 60 * 1000) {
            try {
              fs.unlinkSync(filePath);
              console.log(`Đã xóa file tạm cũ: ${filePath}`);
              stats.cleaned++;
            } catch (error) {
              console.error(`Không thể xóa file tạm ${filePath}:`, error);
              stats.errors++;
            }
          }
        }
      } catch (error) {
        console.error(`Lỗi khi dọn dẹp thư mục tạm:`, error);
      }
    }
    
    console.log(`===== KẾT THÚC DỌN DẸP FILES =====`);
    console.log(`Đã dọn dẹp: ${stats.cleaned} files | Lỗi: ${stats.errors}`);
    
    return {
      success: true,
      message: `Đã dọn dẹp ${stats.cleaned} files không sử dụng`,
      stats
    };
  } catch (error) {
    console.error('Lỗi khi dọn dẹp files:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Xóa file
 * @param {String} fileId ID của file cần xóa
 * @param {Boolean} permanently Xóa vĩnh viễn hay không
 * @returns {Object} Kết quả xóa file
 */
function deleteFile(fileId, permanently = false) {
  try {
    if (!fileId) {
      return {
        success: false,
        error: 'ID file không hợp lệ'
      };
    }
    
    // Đọc danh sách file
    const files = readFilesDb();
    
    // Tìm file cần xóa
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
      return {
        success: false,
        error: 'Không tìm thấy file'
      };
    }
    
    const fileInfo = files[fileIndex];
    
    if (permanently) {
      // Xóa file vật lý nếu tồn tại
      if (fileInfo.localPath && fs.existsSync(fileInfo.localPath)) {
        fs.unlinkSync(fileInfo.localPath);
        console.log(`Đã xóa file vật lý: ${fileInfo.localPath}`);
      }
      
      // Xóa file khỏi DB
      files.splice(fileIndex, 1);
      
      // Lưu lại danh sách file
      saveFilesDb(files);
      
      return {
        success: true,
        message: 'Đã xóa vĩnh viễn file'
      };
    } else {
      // Đánh dấu file là đã xóa
      files[fileIndex].isDeleted = true;
      files[fileIndex].deletedAt = new Date().toISOString();
      
      // Lưu lại danh sách file
      saveFilesDb(files);
      
      return {
        success: true,
        message: 'Đã chuyển file vào thùng rác'
      };
    }
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
 * @param {String} fileId ID của file cần khôi phục
 * @returns {Object} Kết quả khôi phục file
 */
function restoreFile(fileId) {
  try {
    if (!fileId) {
      return {
        success: false,
        error: 'ID file không hợp lệ'
      };
    }
    
    // Đọc danh sách file
    const files = readFilesDb();
    
    // Tìm file cần khôi phục
    const fileIndex = files.findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
      return {
        success: false,
        error: 'Không tìm thấy file'
      };
    }
    
    const fileInfo = files[fileIndex];
    
    // Kiểm tra xem file có trong thùng rác không
    if (!fileInfo.isDeleted) {
      return {
        success: false,
        error: 'File không nằm trong thùng rác'
      };
    }
    
    // Khôi phục file
    files[fileIndex].isDeleted = false;
    delete files[fileIndex].deletedAt;
    
    // Lưu lại danh sách file
    saveFilesDb(files);
    
    return {
      success: true,
      message: 'Đã khôi phục file từ thùng rác',
      file: files[fileIndex]
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
    // Đọc danh sách file
    const files = readFilesDb();
    
    // Lọc ra các file đã bị xóa
    const deletedFiles = files.filter(file => file.isDeleted);
    
    if (deletedFiles.length === 0) {
      return {
        success: true,
        message: 'Thùng rác đã trống',
        deletedCount: 0
      };
    }
    
    // Xóa các file vật lý
    for (const file of deletedFiles) {
      if (file.localPath && fs.existsSync(file.localPath)) {
        try {
          fs.unlinkSync(file.localPath);
          console.log(`Đã xóa file vật lý: ${file.localPath}`);
        } catch (error) {
          console.error(`Lỗi khi xóa file vật lý ${file.localPath}:`, error);
        }
      }
    }
    
    // Lọc bỏ các file đã bị xóa khỏi DB
    const remainingFiles = files.filter(file => !file.isDeleted);
    
    // Lưu lại danh sách file
    saveFilesDb(remainingFiles);
    
    return {
      success: true,
      message: `Đã xóa vĩnh viễn ${deletedFiles.length} file từ thùng rác`,
      deletedCount: deletedFiles.length
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
  getSecureFilePath,
  syncFiles,
  autoSyncFile,
  checkFiles,
  cleanupFiles,
  deleteFile,
  restoreFile,
  emptyTrash
}; 