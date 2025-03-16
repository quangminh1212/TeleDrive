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
  if (!req.session || !req.session.isLoggedIn) {
    return res.redirect('/login');
  }

  next();
}

// Áp dụng middleware cho tất cả các routes
router.use(checkAuth);

// Trang chủ - redirect đến dashboard
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Trang đăng nhập
router.get('/login', (req, res) => {
  // Nếu đã đăng nhập, redirect đến dashboard
  if (req.session && req.session.isLoggedIn) {
    return res.redirect('/dashboard');
  }
  
  // Render trang đăng nhập
  res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
});

// Trang dashboard
router.get('/dashboard', (req, res) => {
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
  req.session.destroy(err => {
    if (err) {
      console.error('Lỗi khi đăng xuất:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router; 