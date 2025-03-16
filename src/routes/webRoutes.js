/**
 * TeleDrive - Web Routes
 * File này chứa các định tuyến cho web UI
 */

const express = require('express');
const path = require('path');
const config = require('../config/config');
const fileService = require('../services/fileService');
const authMiddleware = require('../middlewares/authMiddleware');

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

// Trang chủ - redirect đến dashboard
router.get('/', (req, res) => {
  try {
    // Đọc database
    const filesData = fileService.readFilesDb();
    
    // Định dạng dữ liệu trước khi gửi tới template
    const formattedFiles = filesData.map(file => ({
      id: file.id,
      name: file.name,
      displayName: file.displayName || file.name,
      size: file.size,
      fileSize: file.size, // Thêm fileSize để tránh lỗi file.fileSize
      formattedSize: formatBytes(file.size),
      uploadDate: file.uploadDate,
      formattedDate: formatDate(file.uploadDate),
      fileType: getFileType(file.name),
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: `/file/${file.id}`,
      fixUrl: `/api/files/${file.id}/fix`
    }));
    
    // Tính toán thống kê
    const storageInfo = {
      used: filesData.reduce((sum, f) => sum + (f.size || 0), 0),
      total: config.MAX_FILE_SIZE * 10,
      percent: (filesData.reduce((sum, f) => sum + (f.size || 0), 0) / (config.MAX_FILE_SIZE * 10)) * 100
    };
    
    // Kiểm tra file có vấn đề
    const problemFiles = filesData.filter(f => 
      !f.telegramFileId || 
      (!f.localPath && !f.telegramUrl)
    ).length;
    
    // Render trang chủ
    res.render('index', {
      title: 'TeleDrive',
      files: formattedFiles,
      botActive: true,
      storageInfo,
      problemFiles,
      error: null,
      formatBytes,
      formatDate,
      file: formattedFiles[0] || { fileSize: 0 } // Thêm trường file mặc định để tránh lỗi
    });
  } catch (error) {
    console.error('Lỗi hiển thị trang chủ:', error);
    res.status(500).render('error', {
      title: 'TeleDrive - Lỗi',
      message: 'Lỗi trong quá trình xử lý yêu cầu',
      error: {
        status: 500,
        stack: process.env.NODE_ENV === 'development' ? error.stack : ''
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

module.exports = router; 