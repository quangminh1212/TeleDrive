/**
 * TeleDrive - Web Routes
 * File này chứa các định tuyến cho web UI
 */

const express = require('express');
const path = require('path');
const config = require('../config');
const fileService = require('../services/fileService');
const authMiddleware = require('../middlewares/authMiddleware');
const telegramService = require('../services/telegramService');
const fs = require('fs');
const helpers = require('../utils/helpers');
const { log } = require('../utils/helpers');

const router = express.Router();

// Middleware kiểm tra đăng nhập
function checkAuth(req, res, next) {
  // Vô hiệu hóa kiểm tra đăng nhập do chưa cài express-session
  return next();
  
  /*
  // Cho phép truy cập vào trang đăng nhập
  if (req.path === '/login') {
    return next();
  }

  // Cho phép truy cập vào các tài nguyên tĩnh
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/css/') || 
      req.path.startsWith('/js/') || 
      req.path.startsWith('/img/')) {
    return next();
  }

  // Kiểm tra xem đã đăng nhập chưa
  if (!req.session || !req.session.authenticated) {
    return res.redirect('/login');
  }

  next();
  */
}

// Áp dụng middleware cho tất cả các routes
router.use(checkAuth);

/**
 * Trang chủ
 */
router.get('/', async (req, res) => {
  try {
    // Lấy danh sách file để hiển thị
    const files = fileService.getFiles({ 
      sortBy: 'uploadDate', 
      sortOrder: 'desc' 
    });
    
    return res.render('index', { 
      files, 
      title: 'TeleDrive - Telegram File Manager',
      active: 'home'
    });
  } catch (error) {
    log(`Lỗi khi tải trang chủ: ${error.message}`, 'error');
    return res.render('error', { 
      error: error.message || 'Lỗi khi tải trang chủ'
    });
  }
});

/**
 * Trang xem chi tiết file
 */
router.get('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = fileService.getFileById(fileId);
    
    if (!file) {
      return res.render('error', { 
        error: 'Không tìm thấy file' 
      });
    }
    
    return res.render('file-details', { 
      file, 
      title: `${file.name} - TeleDrive`,
      active: 'files'
    });
  } catch (error) {
    log(`Lỗi khi xem chi tiết file: ${error.message}`, 'error');
    return res.render('error', { 
      error: error.message || 'Lỗi khi xem chi tiết file'
    });
  }
});

/**
 * Trang tải xuống file
 */
router.get('/files/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = fileService.getFileById(fileId);
    
    if (!file) {
      return res.render('error', { 
        error: 'Không tìm thấy file' 
      });
    }
    
    // Kiểm tra xem file đã được tải về chưa
    if (!file.localPath) {
      // Hiển thị trang đang tải file
      return res.render('file-download', { 
        file, 
        title: `Đang tải ${file.name} - TeleDrive`,
        active: 'files',
        processing: true
      });
    } else {
      // Hiển thị trang tải file (link tải đã sẵn sàng)
      return res.render('file-download', { 
        file, 
        title: `Tải ${file.name} - TeleDrive`,
        active: 'files',
        processing: false
      });
    }
  } catch (error) {
    log(`Lỗi khi tải file: ${error.message}`, 'error');
    return res.render('error', { 
      error: error.message || 'Lỗi khi tải file'
    });
  }
});

/**
 * API xem trước file (nếu có thể)
 */
router.get('/files/:id/preview', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = fileService.getFileById(fileId);
    
    if (!file) {
      return res.render('error', { 
        error: 'Không tìm thấy file' 
      });
    }
    
    return res.render('file-preview', { 
      file, 
      title: `Xem trước ${file.name} - TeleDrive`,
      active: 'files'
    });
  } catch (error) {
    log(`Lỗi khi xem trước file: ${error.message}`, 'error');
    return res.render('error', { 
      error: error.message || 'Lỗi khi xem trước file'
    });
  }
});

/**
 * Trang thùng rác
 */
router.get('/trash', async (req, res) => {
  try {
    const trashFiles = fileService.getTrashFiles();
    
    return res.render('index', { 
      files: trashFiles, 
      title: 'Thùng rác - TeleDrive',
      active: 'trash',
      isTrash: true
    });
  } catch (error) {
    log(`Lỗi khi tải trang thùng rác: ${error.message}`, 'error');
    return res.render('error', { 
      error: error.message || 'Lỗi khi tải trang thùng rác'
    });
  }
});

/**
 * Trang tải file lên
 */
router.get('/upload', (req, res) => {
  return res.render('index', { 
    title: 'Tải lên - TeleDrive',
    active: 'upload',
    showUploadForm: true
  });
});

// Trang đăng nhập
router.get('/login', (req, res) => {
  // Kiểm tra nếu user đã đăng nhập thì chuyển hướng đến dashboard
  if (req.session && (req.session.authenticated || req.session.isLoggedIn)) {
    return res.redirect('/dashboard');
  }
  
  // Nếu chưa đăng nhập, hiển thị trang login với thông báo lỗi nếu có
  const errorMessage = req.query.error || '';
  
  res.render('login', {
    title: 'Đăng nhập - TeleDrive',
    errorMessage,
    config: {
      botToken: '',
      telegramBotUsername: ''
    }
  });
});

// Trang dashboard
router.get('/dashboard', (req, res) => {
  // Vô hiệu hóa kiểm tra đăng nhập do chưa cài express-session
  /*
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!req.session || !req.session.authenticated) {
    return res.redirect('/login');
  }
  */
  
  // Chuẩn bị data để render
  const viewData = {
    user: { username: 'User' }, // req.session.telegramUser || { username: 'User' },
    useTelegram: true,
    pageTitle: 'Dashboard'
  };
  
  // Render trang dashboard với dữ liệu người dùng
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.json({
      success: true,
      data: viewData
    });
  }
  
  res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
});

// Trang quản lý file
router.get('/files', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'files.html'));
});

// Trang cài đặt
router.get('/settings', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'settings.html'));
});

// Trang chia sẻ file công khai
router.get('/share/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    // Tìm file dựa trên token chia sẻ
    const files = fileService.readFilesDb();
    const fileInfo = files.find(file => file.shareToken === token);
    
    if (!fileInfo) {
      return res.status(404).sendFile(path.join(process.cwd(), 'public', '404.html'));
    }
    
    // Kiểm tra xem link đã hết hạn chưa
    if (fileInfo.shareExpiry) {
      const expiryDate = new Date(fileInfo.shareExpiry);
      if (expiryDate < new Date()) {
        return res.status(410).sendFile(path.join(process.cwd(), 'public', 'link-expired.html'));
      }
    }
    
    // Render trang chia sẻ file
    res.sendFile(path.join(process.cwd(), 'public', 'share.html'));
  } catch (error) {
    console.error('Lỗi khi xử lý trang chia sẻ:', error);
    res.status(500).sendFile(path.join(process.cwd(), 'public', '500.html'));
  }
});

// Trang về ứng dụng
router.get('/about', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'about.html'));
});

// Đăng xuất
router.get('/logout', (req, res) => {
  /*
  req.session.destroy(err => {
    if (err) {
      console.error('Lỗi khi đăng xuất:', err);
    }
    res.redirect('/login');
  });
  */
  res.redirect('/login');
});

// Route đồng bộ thủ công
router.post('/sync', async (req, res) => {
  try {
    // Đồng bộ file từ Telegram
    const results = await telegramService.syncFiles();
    res.json({ success: true, results });
  } catch (error) {
    console.error('Lỗi khi đồng bộ:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return 'Không xác định';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

function getFileType(filename) {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop().toLowerCase();
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  const textExts = ['txt', 'md', 'html', 'css', 'js', 'json', 'xml'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (docExts.includes(ext)) return 'document';
  if (textExts.includes(ext)) return 'text';
  
  return 'other';
}

/**
 * Lấy icon cho loại file
 * @param {String} fileType Loại file
 * @returns {String} Icon class
 */
function getFileIcon(fileType) {
  if (!fileType) return 'fa-file';
  
  if (fileType.startsWith('image/') || fileType === 'image') {
    return 'fa-file-image';
  } else if (fileType.startsWith('video/') || fileType === 'video') {
    return 'fa-file-video';
  } else if (fileType.startsWith('audio/') || fileType === 'audio') {
    return 'fa-file-audio';
  } else if (fileType === 'application/pdf' || fileType === 'pdf') {
    return 'fa-file-pdf';
  } else if (fileType.includes('word') || fileType === 'document') {
    return 'fa-file-word';
  } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
    return 'fa-file-excel';
  } else if (fileType.includes('zip') || fileType.includes('compressed')) {
    return 'fa-file-archive';
  } else if (fileType.includes('text/') || fileType === 'text') {
    return 'fa-file-alt';
  } else {
    return 'fa-file';
  }
}

module.exports = router; 