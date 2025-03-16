/**
 * TeleDrive - File Controller
 * File này định nghĩa các phương thức xử lý logic cho các routes liên quan đến file
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fileService = require('../services/fileService');
const telegramService = require('../services/telegramService');
const config = require('../config/config');
const { ensureDirectories, getMimeType, guessFileType } = require('../utils/helpers');

/**
 * Lấy danh sách file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function getFiles(req, res) {
  try {
    const folder = req.query.folder || '';
    const showDeleted = req.query.trash === 'true';
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Lọc file theo folder và trạng thái xóa
    let filteredFiles = files.filter(file => {
      if (showDeleted) {
        return file.isDeleted;
      } else {
        const filePath = file.relativePath || '';
        return !file.isDeleted && (folder === '' || filePath.startsWith(folder));
      }
    });
    
    // Định dạng dữ liệu trước khi trả về
    const formattedFiles = filteredFiles.map(file => ({
      id: file.id,
      name: file.originalName || file.name,
      size: file.size,
      mimeType: file.mimeType,
      fileType: file.fileType,
      relativePath: file.relativePath || '',
      uploadDate: file.uploadDate,
      lastModified: file.lastModified,
      hasTelegramCopy: !!file.telegramFileId,
      isDeleted: file.isDeleted,
      deletedAt: file.deletedAt,
      publicShareId: file.publicShareId
    }));
    
    return res.json({
      success: true,
      files: formattedFiles,
      total: formattedFiles.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Upload file mới
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function uploadFile(req, res) {
  try {
    // Kiểm tra file đã upload chưa
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file nào được upload'
      });
    }
    
    // Lấy thông tin file
    const file = req.file;
    const originalName = file.originalname;
    const tempPath = file.path;
    const fileSize = file.size;
    const mimeType = file.mimetype || getMimeType(originalName);
    const fileType = guessFileType(mimeType, originalName);
    const folder = req.body.folder || '';
    
    // Tạo tên file mới và đường dẫn lưu trữ
    const fileId = crypto.randomUUID();
    const uploadDir = path.join(config.UPLOAD_DIR, folder);
    
    // Đảm bảo thư mục tồn tại
    ensureDirectories(uploadDir);
    
    // Đường dẫn lưu trữ file
    const localPath = path.join(uploadDir, fileId + path.extname(originalName));
    
    // Di chuyển file từ thư mục tạm sang thư mục lưu trữ
    fs.renameSync(tempPath, localPath);
    
    // Tạo thông tin file mới
    const newFile = {
      id: fileId,
      originalName: originalName,
      name: originalName,
      localPath: localPath,
      relativePath: folder,
      size: fileSize,
      mimeType: mimeType,
      fileType: fileType,
      uploadDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isDeleted: false,
      needsSync: true // Đánh dấu cần đồng bộ với Telegram
    };
    
    // Đọc danh sách file hiện tại
    const files = fileService.readFilesDb();
    
    // Thêm file mới vào danh sách
    files.push(newFile);
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    // Tự động đồng bộ file với Telegram
    fileService.autoSyncFile(newFile);
    
    return res.json({
      success: true,
      message: 'Upload file thành công',
      file: {
        id: newFile.id,
        name: newFile.originalName,
        size: newFile.size,
        mimeType: newFile.mimeType,
        fileType: newFile.fileType,
        relativePath: newFile.relativePath
      }
    });
  } catch (error) {
    console.error('Lỗi khi upload file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Xem chi tiết file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function getFileDetails(req, res) {
  try {
    const fileId = req.params.fileId;
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm file theo ID
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy file'
      });
    }
    
    // Định dạng dữ liệu trước khi trả về
    const fileDetails = {
      id: file.id,
      name: file.originalName || file.name,
      size: file.size,
      mimeType: file.mimeType,
      fileType: file.fileType,
      relativePath: file.relativePath || '',
      uploadDate: file.uploadDate,
      lastModified: file.lastModified,
      hasTelegramCopy: !!file.telegramFileId,
      telegramMessageId: file.telegramMessageId,
      isDeleted: file.isDeleted,
      deletedAt: file.deletedAt,
      publicShareId: file.publicShareId,
      publicShareExpiry: file.publicShareExpiry
    };
    
    return res.json({
      success: true,
      file: fileDetails
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Download file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function downloadFile(req, res) {
  try {
    const fileId = req.params.fileId;
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm file theo ID
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy file'
      });
    }
    
    // Nếu file đã bị xóa thì không cho phép download
    if (file.isDeleted) {
      return res.status(403).json({
        success: false,
        error: 'File đã bị xóa'
      });
    }
    
    // Nếu file có bản local và tồn tại
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Thiết lập headers phù hợp
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName || file.name)}"`);
      if (file.mimeType) {
        res.setHeader('Content-Type', file.mimeType);
      }
      
      // Stream file về cho client
      const fileStream = fs.createReadStream(file.localPath);
      fileStream.pipe(res);
      return;
    }
    
    // Nếu không có bản local nhưng có bản trên Telegram
    if (file.telegramFileId) {
      try {
        // Lấy URL file từ Telegram
        const fileUrl = await telegramService.getFileLink(file.telegramFileId);
        
        // Redirect đến URL file trên Telegram
        return res.redirect(fileUrl);
      } catch (teleError) {
        console.error('Lỗi khi lấy file từ Telegram:', teleError);
        return res.status(500).json({
          success: false,
          error: 'Không thể tải file từ Telegram'
        });
      }
    }
    
    // Không tìm thấy bản nào của file
    return res.status(404).json({
      success: false,
      error: 'Không tìm thấy nội dung file'
    });
  } catch (error) {
    console.error('Lỗi khi download file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Đổi tên file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function renameFile(req, res) {
  try {
    const fileId = req.params.fileId;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tên file mới không được để trống'
      });
    }
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm file theo ID
    const fileIndex = files.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy file'
      });
    }
    
    // Cập nhật tên file
    files[fileIndex].name = newName;
    files[fileIndex].lastModified = new Date().toISOString();
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    return res.json({
      success: true,
      message: 'Đổi tên file thành công',
      file: {
        id: files[fileIndex].id,
        name: files[fileIndex].name
      }
    });
  } catch (error) {
    console.error('Lỗi khi đổi tên file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Di chuyển file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function moveFile(req, res) {
  try {
    const fileId = req.params.fileId;
    const { destinationFolder } = req.body;
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm file theo ID
    const fileIndex = files.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy file'
      });
    }
    
    const file = files[fileIndex];
    
    // Nếu file đã ở trong thư mục đích thì không cần di chuyển
    if (file.relativePath === destinationFolder) {
      return res.json({
        success: true,
        message: 'File đã ở thư mục đích',
        file: {
          id: file.id,
          name: file.name,
          relativePath: file.relativePath
        }
      });
    }
    
    // Chuẩn bị đường dẫn mới
    const newDir = path.join(config.UPLOAD_DIR, destinationFolder);
    
    // Đảm bảo thư mục đích tồn tại
    ensureDirectories(newDir);
    
    // Đường dẫn file mới
    const fileName = path.basename(file.localPath);
    const newPath = path.join(newDir, fileName);
    
    // Di chuyển file nếu tồn tại
    if (file.localPath && fs.existsSync(file.localPath)) {
      fs.renameSync(file.localPath, newPath);
    }
    
    // Cập nhật thông tin file
    files[fileIndex].localPath = newPath;
    files[fileIndex].relativePath = destinationFolder;
    files[fileIndex].lastModified = new Date().toISOString();
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    return res.json({
      success: true,
      message: 'Di chuyển file thành công',
      file: {
        id: file.id,
        name: file.name,
        relativePath: file.relativePath
      }
    });
  } catch (error) {
    console.error('Lỗi khi di chuyển file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Xóa file (chuyển vào thùng rác)
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function deleteFile(req, res) {
  try {
    const fileId = req.params.fileId;
    const permanently = req.query.permanently === 'true';
    
    // Xóa file
    const result = fileService.deleteFile(fileId, permanently);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    return res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Lỗi khi xóa file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Tạo link chia sẻ file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function shareFile(req, res) {
  try {
    const fileId = req.params.fileId;
    const { expiryDays } = req.body;
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm file theo ID
    const fileIndex = files.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy file'
      });
    }
    
    // Tạo mã chia sẻ
    const shareId = crypto.randomBytes(8).toString('hex');
    
    // Tính thời gian hết hạn
    let expiry = null;
    if (expiryDays && !isNaN(expiryDays) && expiryDays > 0) {
      expiry = new Date();
      expiry.setDate(expiry.getDate() + parseInt(expiryDays));
      expiry = expiry.toISOString();
    }
    
    // Cập nhật thông tin file
    files[fileIndex].publicShareId = shareId;
    files[fileIndex].publicShareExpiry = expiry;
    files[fileIndex].lastModified = new Date().toISOString();
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    // Tạo URL chia sẻ
    const shareUrl = `${config.BASE_URL}/public/${shareId}`;
    
    return res.json({
      success: true,
      message: 'Tạo link chia sẻ thành công',
      shareInfo: {
        shareId: shareId,
        shareUrl: shareUrl,
        expiry: expiry
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo link chia sẻ:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Hủy chia sẻ file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function unshareFile(req, res) {
  try {
    const fileId = req.params.fileId;
    
    // Đọc danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Tìm file theo ID
    const fileIndex = files.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy file'
      });
    }
    
    // Kiểm tra xem file có đang được chia sẻ không
    if (!files[fileIndex].publicShareId) {
      return res.status(400).json({
        success: false,
        error: 'File chưa được chia sẻ'
      });
    }
    
    // Hủy chia sẻ
    delete files[fileIndex].publicShareId;
    delete files[fileIndex].publicShareExpiry;
    files[fileIndex].lastModified = new Date().toISOString();
    
    // Lưu lại danh sách file
    fileService.saveFilesDb(files);
    
    return res.json({
      success: true,
      message: 'Đã hủy chia sẻ file'
    });
  } catch (error) {
    console.error('Lỗi khi hủy chia sẻ file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Lấy file từ thùng rác
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function getTrash(req, res) {
  try {
    // Lấy danh sách file từ DB
    const files = fileService.readFilesDb();
    
    // Lọc các file đã xóa
    const trashedFiles = files.filter(file => file.isDeleted);
    
    // Định dạng dữ liệu trước khi trả về
    const formattedFiles = trashedFiles.map(file => ({
      id: file.id,
      name: file.originalName || file.name,
      size: file.size,
      mimeType: file.mimeType,
      fileType: file.fileType,
      uploadDate: file.uploadDate,
      deletedAt: file.deletedAt,
      hasTelegramCopy: !!file.telegramFileId
    }));
    
    return res.json({
      success: true,
      files: formattedFiles,
      total: formattedFiles.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Khôi phục file từ thùng rác
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function restoreFile(req, res) {
  try {
    const fileId = req.params.fileId;
    
    // Khôi phục file
    const result = fileService.restoreFile(fileId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    return res.json({
      success: true,
      message: result.message,
      file: {
        id: result.file.id,
        name: result.file.originalName || result.file.name
      }
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Làm trống thùng rác
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function emptyTrash(req, res) {
  try {
    // Làm trống thùng rác
    const result = fileService.emptyTrash();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    return res.json({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Lỗi khi làm trống thùng rác:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Kiểm tra trạng thái file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function checkFiles(req, res) {
  try {
    console.log('Đang kiểm tra trạng thái các file...');
    
    // Thực hiện kiểm tra
    const result = await fileService.checkFiles();
    
    return res.json({
      success: true,
      message: 'Đã kiểm tra trạng thái file',
      result: result
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

/**
 * Đồng bộ file với Telegram
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function syncFiles(req, res) {
  try {
    console.log('Bắt đầu đồng bộ file với Telegram...');
    
    // Thực hiện đồng bộ
    const result = await fileService.syncFiles();
    
    return res.json({
      success: true,
      message: 'Đồng bộ file thành công',
      result: result
    });
  } catch (error) {
    console.error('Lỗi khi đồng bộ file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server'
    });
  }
}

module.exports = {
  getFiles,
  uploadFile,
  getFileDetails,
  downloadFile,
  renameFile,
  moveFile,
  deleteFile,
  shareFile,
  unshareFile,
  getTrash,
  restoreFile,
  emptyTrash,
  checkFiles,
  syncFiles
}; 