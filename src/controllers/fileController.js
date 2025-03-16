/**
 * TeleDrive - Controller quản lý file
 * File này quản lý xử lý logic cho các route liên quan đến file
 */

const fileService = require('../services/fileService');
const telegramService = require('../services/telegramService');
const { formatBytes } = require('../utils/formatters');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

/**
 * Đồng bộ files với Telegram
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function syncFiles(req, res) {
  console.log('===== API SYNC REQUEST =====');
  
  try {
    console.log('Kiểm tra trạng thái bot trước khi đồng bộ...');
    const bot = telegramService.getBot();
    const botActive = telegramService.isBotActive();
    
    if (!bot || !botActive) {
      console.log('Bot không hoạt động, thử khởi tạo lại...');
      const { bot: newBot, botActive: newBotActive } = await telegramService.startBot();
      
      telegramService.setBot(newBot);
      telegramService.setBotActive(newBotActive);
      
      if (!newBot || !newBotActive) {
        console.log('Không thể khởi tạo bot, không thể đồng bộ');
        return res.status(500).json({
          success: false,
          error: 'Bot Telegram không hoạt động, không thể đồng bộ'
        });
      }
    }
    
    console.log('Bắt đầu đồng bộ files...');
    const result = await fileService.syncFiles();
    console.log('Kết quả đồng bộ:', result);
    
    // Đếm tổng số file và số file cần đồng bộ
    const filesData = fileService.readFilesDb();
    const stats = {
      totalFiles: filesData.length,
      syncedFiles: filesData.filter(f => f.telegramFileId).length,
      needsSync: filesData.filter(f => f.needsSync || !f.telegramFileId).length
    };
    
    return res.json({
      success: result.success,
      message: result.success 
        ? `Đã đồng bộ thành công ${result.syncedCount} files` 
        : `Lỗi đồng bộ: ${result.error}`,
      stats: stats,
      details: result
    });
  } catch (error) {
    console.error('Lỗi endpoint /api/sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Kiểm tra và sửa dữ liệu file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function checkFiles(req, res) {
  try {
    const result = await fileService.checkFiles();
    return res.json(result);
  } catch (error) {
    console.error('Lỗi endpoint /api/check-files:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Lấy danh sách file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function getFiles(req, res) {
  try {
    const filesData = fileService.readFilesDb();
    
    // Lọc theo thư mục nếu có
    const folder = req.query.folder || '';
    let files = filesData;
    
    if (folder) {
      files = filesData.filter(file => {
        const filePath = file.relativePath || '';
        return filePath.startsWith(folder);
      });
    }
    
    // Lọc theo trạng thái nếu có
    const status = req.query.status;
    if (status) {
      files = files.filter(file => file.fileStatus === status);
    }
    
    return res.json({
      success: true,
      files: files,
      total: files.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Lấy thông tin chi tiết file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function getFileDetails(req, res) {
  try {
    const fileId = req.params.id;
    const filesData = fileService.readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    return res.json({
      success: true,
      file: file
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Tải file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
async function downloadFile(req, res) {
  try {
    const fileId = req.params.id;
    const filesData = fileService.readFilesDb();
    const file = filesData.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại'
      });
    }
    
    // Kiểm tra file local
    if (file.localPath && fs.existsSync(file.localPath)) {
      // File tồn tại ở local
      return res.download(file.localPath, file.name);
    } else if (file.telegramFileId) {
      // File chỉ tồn tại trên Telegram
      try {
        const downloadUrl = await telegramService.getTelegramFileLink(file.telegramFileId);
        
        // Redirect đến URL tải file từ Telegram
        return res.redirect(downloadUrl);
      } catch (error) {
        console.error('Lỗi khi lấy link tải file từ Telegram:', error);
        return res.status(500).json({
          success: false,
          error: 'Lỗi khi lấy link tải file từ Telegram'
        });
      }
    } else {
      // File không tồn tại ở cả local và Telegram
      return res.status(404).json({
        success: false,
        error: 'File không tồn tại ở cả local và Telegram'
      });
    }
  } catch (error) {
    console.error('Lỗi khi tải file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Xem thống kê file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function getFileStats(req, res) {
  try {
    const filesData = fileService.readFilesDb();
    
    // Thống kê tổng số file và dung lượng
    const totalFiles = filesData.length;
    const totalSize = filesData.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thống kê theo loại file
    const fileTypeStats = {};
    filesData.forEach(file => {
      const fileType = file.fileType || 'unknown';
      if (!fileTypeStats[fileType]) {
        fileTypeStats[fileType] = { count: 0, size: 0 };
      }
      fileTypeStats[fileType].count++;
      fileTypeStats[fileType].size += (file.size || 0);
    });
    
    // Thống kê số lượng file trên Telegram
    const telegramFiles = filesData.filter(file => file.telegramFileId).length;
    const telegramSize = filesData
      .filter(file => file.telegramFileId)
      .reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Thống kê số lượng file cần đồng bộ
    const needSyncFiles = filesData.filter(file => file.needsSync || !file.telegramFileId).length;
    
    // Format dung lượng
    const formattedStats = {
      totalFiles,
      totalSize: formatBytes(totalSize),
      telegramFiles,
      telegramSize: formatBytes(telegramSize),
      needSyncFiles,
      fileTypeStats: Object.entries(fileTypeStats).map(([type, stats]) => ({
        type,
        count: stats.count,
        size: formatBytes(stats.size)
      }))
    };
    
    return res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê file:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Lấy trạng thái chi tiết của các file
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function getFileStatus(req, res) {
  try {
    console.log('===== KIỂM TRA TRẠNG THÁI CÁC FILE =====');
    const files = fileService.readFilesDb();
    
    // Tạo danh sách phản hồi với các thông tin quan trọng
    const filesList = files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size ? formatBytes(file.size) : 'Không rõ',
      uploadDate: file.uploadDate || 'Không rõ',
      fileStatus: file.fileStatus || 'Không rõ',
      needsSync: !!file.needsSync,
      hasTelegramId: !!file.telegramFileId,
      hasLocalPath: !!file.localPath,
      localPathExists: file.localPath ? fs.existsSync(file.localPath) : false,
      localPath: file.localPath || 'Không có'
    }));
    
    // Thống kê
    const stats = {
      total: files.length,
      local: files.filter(f => f.fileStatus === 'local').length,
      telegram: files.filter(f => f.fileStatus === 'telegram').length,
      missing: files.filter(f => f.fileStatus === 'missing').length,
      needsSync: files.filter(f => f.needsSync).length,
      synced: files.filter(f => f.telegramFileId).length
    };
    
    res.json({
      success: true,
      files: filesList,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi khi lấy trạng thái files:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi server khi lấy trạng thái files'
    });
  }
}

module.exports = {
  syncFiles,
  checkFiles,
  getFiles,
  getFileDetails,
  downloadFile,
  getFileStats,
  getFileStatus
}; 