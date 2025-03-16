/**
 * TeleDrive - Main Application
 * Ứng dụng lưu trữ file dùng Telegram làm nơi lưu trữ
 */

// Imports
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');

// Imports từ modules 
const config = require('./src/config/config');
const telegramService = require('./src/services/telegramService');
const apiRoutes = require('./src/routes/apiRoutes');
const webRoutes = require('./src/routes/webRoutes');
const { ensureDirectories, log, cleanupTempDir } = require('./src/utils/helpers');

console.log('Đã đọc cấu hình từ ' + path.resolve('.env'));

try {
  // Đảm bảo các thư mục cần thiết tồn tại
  ensureDirectories();
  
  // Khởi tạo app
  const app = express();
  
  // Thiết lập view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  
  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Thiết lập session
  app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));
  
  // Thiết lập static files
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Middleware để thiết lập dữ liệu chung cho tất cả views
  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isLoggedIn = !!req.session.user;
    res.locals.isAdmin = req.session.user && req.session.user.isAdmin;
    res.locals.appName = 'TeleDrive';
    res.locals.botActive = telegramService.isBotActive();
    next();
  });
  
  // Đăng ký routes
  app.use('/api', apiRoutes);
  app.use('/', webRoutes);
  
  // Middleware xử lý lỗi 404
  app.use((req, res, next) => {
    res.status(404).render('error', {
      title: 'Không tìm thấy trang',
      message: 'Trang bạn đang tìm kiếm không tồn tại.'
    });
  });
  
  // Middleware xử lý lỗi server
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
      title: 'Lỗi máy chủ',
      message: 'Đã xảy ra lỗi trên máy chủ. Vui lòng thử lại sau.'
    });
  });
  
  // Khởi động server
  const PORT = config.PORT || 3000;
  app.listen(PORT, () => {
    log(`Server đang chạy tại http://localhost:${PORT}`);
  });
  
  // Khởi động bot Telegram
  log('Đang khởi động bot Telegram...');
  telegramService.initBot()
    .then(success => {
      if (success) {
        log('Bot Telegram đã khởi động thành công');
      } else {
        log('Không thể khởi động bot Telegram', 'error');
      }
    })
    .catch(err => {
      log(`Lỗi khi khởi động bot Telegram: ${err.message}`, 'error');
    });
  
  // Xử lý tắt ứng dụng
  process.on('SIGINT', async () => {
    log('Đang dừng ứng dụng...');
    await telegramService.stopBot();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    log('Đang dừng ứng dụng...');
    await telegramService.stopBot();
    process.exit(0);
  });
  
  // Xử lý lỗi không bắt được
  process.on('uncaughtException', (err) => {
    log(`Lỗi không bắt được: ${err.message}`, 'error');
    console.error(err);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`Lỗi promise không xử lý: ${reason}`, 'error');
    console.error(reason);
  });
  
  // Export app cho testing
  module.exports = app;
} catch (error) {
  console.error('Lỗi khi khởi động ứng dụng:', error);
} 