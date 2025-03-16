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

// Route trang chủ
router.get('/', async (req, res) => {
  try {
    // Lấy danh sách file từ thư mục downloads
    const downloadDir = path.join(process.cwd(), 'downloads');
    let files = [];
    
    if (fs.existsSync(downloadDir)) {
      files = fs.readdirSync(downloadDir)
        .filter(file => !file.startsWith('.'))
        .map(file => {
          const filePath = path.join(downloadDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            name: file,
            path: `/downloads/${file}`,
            size: helpers.formatFileSize(stats.size),
            date: stats.mtime,
            isFile: stats.isFile()
          };
        })
        .filter(file => file.isFile)
        .sort((a, b) => b.date - a.date);
    }
    
    // Kiểm tra trạng thái bot
    const isBotActive = telegramService.isBotActive();
    
    // Đảm bảo chat ID đã được thiết lập
    const chatId = process.env.TELEGRAM_CHAT_ID || config.TELEGRAM_CHAT_ID || '';
    const botToken = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN || '';
    const hasBotConfig = !!botToken && !!chatId;
    
    // Render trang chủ với danh sách file
    res.render('index', {
      title: 'TeleDrive',
      files,
      isBotActive: isBotActive,
      error: null,
      hasBotConfig,
      chatId,
      config: {
        sync: config.ENABLE_AUTO_SYNC,
        interval: config.SYNC_INTERVAL
      }
    });
  } catch (error) {
    console.error('Lỗi khi hiển thị trang chủ:', error);
    
    res.render('index', {
      title: 'TeleDrive',
      files: [],
      isBotActive: false,
      error: `Lỗi: ${error.message}`,
      hasBotConfig: false,
      chatId: '',
      config: {
        sync: config.ENABLE_AUTO_SYNC,
        interval: config.SYNC_INTERVAL
      }
    });
  }
});

// Trang đăng nhập
router.get('/login', (req, res) => {
  // Vô hiệu hóa kiểm tra đăng nhập do chưa cài express-session
  /*
  // Nếu đã đăng nhập, redirect đến dashboard
  if (req.session && req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  */
  
  // Render trang đăng nhập
  res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
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

// Trang quản lý thùng rác
router.get('/trash', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'trash.html'));
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