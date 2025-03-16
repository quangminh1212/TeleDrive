/**
 * TeleDrive - Web Routes
 * File này định nghĩa các routes cho website
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fileService = require('../services/fileService');
const telegramService = require('../services/telegramService');
const { formatBytes } = require('../utils/formatters');
const config = require('../config/config');

// Middleware kiểm tra xác thực nếu cần
function checkAuth(req, res, next) {
  // Kiểm tra xác thực ở đây nếu cần
  // Ví dụ: kiểm tra token, session, v.v.
  next();
}

// Trang chủ
router.get('/', checkAuth, async (req, res) => {
  try {
    // Lấy thông tin bot
    const bot = telegramService.getBot();
    const botActive = telegramService.isBotActive();
    
    // Lấy thông tin files
    const files = fileService.readFilesDb();
    
    // Tính tổng dung lượng
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Tính số lượng file đã đồng bộ với Telegram
    const syncedFiles = files.filter(file => file.telegramFileId).length;
    
    // Tính số lượng file cần đồng bộ
    const needSyncFiles = files.filter(file => file.needsSync || !file.telegramFileId).length;
    
    // Render trang chủ
    res.render('index', {
      botStatus: {
        active: botActive,
        token: process.env.BOT_TOKEN ? '***' + process.env.BOT_TOKEN.slice(-8) : null,
        chatId: process.env.CHAT_ID
      },
      stats: {
        totalFiles: files.length,
        totalSize: formatBytes(totalSize),
        syncedFiles,
        syncedPercent: files.length ? Math.round((syncedFiles / files.length) * 100) : 0,
        needSyncFiles
      },
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Lỗi khi render trang chủ:', error);
    res.render('index', {
      error: 'Có lỗi xảy ra: ' + (error.message || 'Không rõ'),
      stats: {
        totalFiles: 0,
        totalSize: '0 Bytes',
        syncedFiles: 0,
        syncedPercent: 0,
        needSyncFiles: 0
      }
    });
  }
});

// Trang cài đặt
router.get('/settings', checkAuth, async (req, res) => {
  try {
    // Lấy thông tin cài đặt từ file .env
    const settings = {
      port: process.env.PORT || '5002',
      botToken: process.env.BOT_TOKEN || '',
      chatId: process.env.CHAT_ID || '',
      storagePath: process.env.STORAGE_PATH || process.cwd(),
      autoSync: process.env.AUTO_SYNC === 'true'
    };
    
    // Render trang cài đặt
    res.render('settings', {
      settings,
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Lỗi khi render trang cài đặt:', error);
    res.render('settings', {
      error: 'Có lỗi xảy ra: ' + (error.message || 'Không rõ'),
      settings: {}
    });
  }
});

// Cập nhật cài đặt
router.post('/settings', checkAuth, async (req, res) => {
  try {
    // Lấy thông tin cài đặt từ form
    const { port, botToken, chatId, storagePath, autoSync } = req.body;
    
    // Tạo đối tượng cập nhật
    const updates = {};
    
    // Chỉ cập nhật các giá trị đã được điền
    if (port) updates.PORT = port;
    if (botToken) updates.BOT_TOKEN = botToken;
    if (chatId) updates.CHAT_ID = chatId;
    if (storagePath) updates.STORAGE_PATH = storagePath;
    if (autoSync !== undefined) updates.AUTO_SYNC = autoSync ? 'true' : 'false';
    
    // Cập nhật biến môi trường
    const result = config.updateEnv(updates);
    
    if (result.success) {
      // Khởi động lại bot nếu token hoặc chatId thay đổi
      if (botToken || chatId) {
        await telegramService.restartBot();
      }
      
      res.redirect('/settings?message=Đã cập nhật cài đặt thành công');
    } else {
      res.redirect(`/settings?error=${encodeURIComponent(result.error || 'Không thể cập nhật cài đặt')}`);
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật cài đặt:', error);
    res.redirect(`/settings?error=${encodeURIComponent('Có lỗi xảy ra: ' + (error.message || 'Không rõ'))}`);
  }
});

// Trang thư mục
router.get('/folder/:path(*)', checkAuth, async (req, res) => {
  try {
    const folderPath = req.params.path || '';
    
    // Lấy danh sách file
    const allFiles = fileService.readFilesDb();
    
    // Lọc file trong thư mục hiện tại
    const files = allFiles.filter(file => {
      const filePath = file.relativePath || '';
      return filePath === folderPath;
    });
    
    // Tạo danh sách thư mục con
    const subfolders = [];
    allFiles.forEach(file => {
      const filePath = file.relativePath || '';
      
      // Nếu file nằm trong thư mục con của thư mục hiện tại
      if (filePath !== folderPath && (folderPath === '' || filePath.startsWith(folderPath + '/'))) {
        const remainingPath = filePath.substring(folderPath ? folderPath.length + 1 : 0);
        const parts = remainingPath.split('/');
        
        // Chỉ lấy thư mục con trực tiếp
        if (parts.length > 0) {
          const subfolder = parts[0];
          if (!subfolders.includes(subfolder)) {
            subfolders.push(subfolder);
          }
        }
      }
    });
    
    // Render trang thư mục
    res.render('folder', {
      currentPath: folderPath,
      files,
      subfolders,
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Lỗi khi render trang thư mục:', error);
    res.render('folder', {
      currentPath: req.params.path || '',
      files: [],
      subfolders: [],
      error: 'Có lỗi xảy ra: ' + (error.message || 'Không rõ')
    });
  }
});

// Trang thùng rác
router.get('/trash', checkAuth, async (req, res) => {
  try {
    // Lấy danh sách file
    const allFiles = fileService.readFilesDb();
    
    // Lọc file trong thùng rác
    const trashedFiles = allFiles.filter(file => file.deleted);
    
    // Render trang thùng rác
    res.render('trash', {
      files: trashedFiles,
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Lỗi khi render trang thùng rác:', error);
    res.render('trash', {
      files: [],
      error: 'Có lỗi xảy ra: ' + (error.message || 'Không rõ')
    });
  }
});

// Trang tìm kiếm
router.get('/search', checkAuth, async (req, res) => {
  try {
    const query = req.query.q || '';
    
    // Nếu không có từ khóa tìm kiếm
    if (!query.trim()) {
      return res.render('search', {
        query: '',
        files: [],
        message: req.query.message || null,
        error: req.query.error || null
      });
    }
    
    // Lấy danh sách file
    const allFiles = fileService.readFilesDb();
    
    // Tìm kiếm file theo tên
    const searchResults = allFiles.filter(file => {
      // Chỉ tìm kiếm file không ở trong thùng rác
      if (file.deleted) return false;
      
      // Tìm kiếm không phân biệt chữ hoa/thường
      const fileName = (file.name || '').toLowerCase();
      const searchQuery = query.toLowerCase();
      
      return fileName.includes(searchQuery);
    });
    
    // Render trang tìm kiếm
    res.render('search', {
      query,
      files: searchResults,
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Lỗi khi render trang tìm kiếm:', error);
    res.render('search', {
      query: req.query.q || '',
      files: [],
      error: 'Có lỗi xảy ra: ' + (error.message || 'Không rõ')
    });
  }
});

// Trang thống kê
router.get('/stats', checkAuth, async (req, res) => {
  try {
    // Lấy danh sách file
    const files = fileService.readFilesDb();
    
    // Tính tổng dung lượng
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Tính số lượng file đã đồng bộ với Telegram
    const syncedFiles = files.filter(file => file.telegramFileId).length;
    
    // Tính số lượng file theo loại
    const fileTypes = {};
    files.forEach(file => {
      const fileType = file.fileType || 'unknown';
      if (!fileTypes[fileType]) {
        fileTypes[fileType] = 0;
      }
      fileTypes[fileType]++;
    });
    
    // Render trang thống kê
    res.render('stats', {
      stats: {
        totalFiles: files.length,
        totalSize: formatBytes(totalSize),
        syncedFiles,
        syncedPercent: files.length ? Math.round((syncedFiles / files.length) * 100) : 0,
        fileTypes
      },
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Lỗi khi render trang thống kê:', error);
    res.render('stats', {
      stats: {
        totalFiles: 0,
        totalSize: '0 Bytes',
        syncedFiles: 0,
        syncedPercent: 0,
        fileTypes: {}
      },
      error: 'Có lỗi xảy ra: ' + (error.message || 'Không rõ')
    });
  }
});

// Trang lỗi 404
router.use((req, res) => {
  res.status(404).render('error', {
    error: 'Không tìm thấy trang',
    message: 'Trang bạn yêu cầu không tồn tại.'
  });
});

module.exports = router; 