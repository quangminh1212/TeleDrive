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

// Đảm bảo các thư mục cần thiết tồn tại
ensureDirectories();

// Khởi tạo app
const app = express();

// Thiết lập view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Thiết lập middleware cơ bản
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Thiết lập session
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 giờ
  }
}));

// Thiết lập static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Thêm middleware cho dữ liệu chung trong tất cả view
app.use((req, res, next) => {
  // Dữ liệu chung cho tất cả view
  res.locals.user = req.session.user || null;
  res.locals.isLoggedIn = req.session.isLoggedIn || false;
  res.locals.appName = 'TeleDrive';
  res.locals.botActive = telegramService.isBotActive();
  
  next();
});

// Đăng ký routes
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// Middleware xử lý lỗi 404
app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Không tìm thấy trang',
    title: '404 - Không tìm thấy'
  });
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  log(`Lỗi server: ${err.message}`, 'error');
  
  res.status(500).render('error', { 
    error: err.message || 'Lỗi máy chủ',
    title: '500 - Lỗi máy chủ'
  });
});

// Khởi động server và bot
async function startApp() {
  try {
    // Khởi động bot Telegram
    await telegramService.initBot();
    
    // Dọn dẹp thư mục tạm
    cleanupTempDir();
    
    // Khởi động đồng bộ tự động
    if (config.AUTO_SYNC) {
      // Đồng bộ ngay khi khởi động
      telegramService.syncFilesFromTelegram().catch(err => {
        log(`Lỗi khi đồng bộ ban đầu: ${err.message}`, 'error');
      });
      
      // Thiết lập đồng bộ định kỳ
      setInterval(() => {
        telegramService.syncFilesFromTelegram().catch(err => {
          log(`Lỗi khi đồng bộ tự động: ${err.message}`, 'error');
        });
      }, config.SYNC_INTERVAL * 60 * 60 * 1000); // Đơn vị giờ -> ms
      
      log(`Đã thiết lập đồng bộ tự động mỗi ${config.SYNC_INTERVAL} giờ`);
    }
    
    // Thiết lập dọn dẹp thư mục tạm định kỳ
    if (config.CLEANUP_ENABLED) {
      setInterval(() => {
        cleanupTempDir();
      }, config.CLEANUP_INTERVAL * 60 * 60 * 1000); // Đơn vị giờ -> ms
      
      log(`Đã thiết lập dọn dẹp tự động mỗi ${config.CLEANUP_INTERVAL} giờ`);
    }
    
    // Khởi động server
    app.listen(config.PORT, () => {
      log(`Server đang chạy tại http://localhost:${config.PORT}`);
    });
  } catch (error) {
    log(`Lỗi khởi động ứng dụng: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Xử lý khi app kết thúc
process.on('SIGINT', async () => {
  log('Nhận tín hiệu kết thúc, đang dọn dẹp...');
  
  try {
    await telegramService.stopBot();
    log('Đã dừng bot Telegram');
  } catch (error) {
    log(`Lỗi khi dừng bot: ${error.message}`, 'error');
  }
  
  log('Tạm biệt!');
  process.exit(0);
});

// Kiểm tra tham số dòng lệnh
const args = process.argv.slice(2);

if (args.includes('sync')) {
  // Chỉ thực hiện đồng bộ và thoát
  telegramService.initBot().then(() => {
    return telegramService.syncFilesFromTelegram();
  }).then(result => {
    log(`Đồng bộ hoàn tất: ${result.added} file mới, ${result.updated} cập nhật, ${result.unchanged} không thay đổi`);
    process.exit(0);
  }).catch(error => {
    log(`Lỗi khi đồng bộ: ${error.message}`, 'error');
    process.exit(1);
  });
} else if (args.includes('clean')) {
  // Chỉ thực hiện dọn dẹp và thoát
  cleanupTempDir();
  log('Đã dọn dẹp thư mục tạm');
  process.exit(0);
} else {
  // Khởi động ứng dụng bình thường
  startApp();
}

// Export cho module khác sử dụng
module.exports = {
  app,
  startApp,
  cleanupTempDir
}; 